from dotenv import load_dotenv
import os
import base64
import uuid
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from database import DB
from schemas import Animal, Record, UploadResponse, SoapNotes, AnimalDetailData
from storage import save_file
from audio_service import GoogleAudioService
from ai_service import GoogleAIService
from config import init_env, get_gemini_api_key
import json as _json

# .env を読み込み + 基本環境を初期化
load_dotenv()
init_env()

# Google サービスは起動時に初期化
google_audio_service: Optional[GoogleAudioService] = None
google_ai_service: Optional[GoogleAIService] = None

# DB 初期ロード（失敗しても起動は続行）
try:
    DB.load_from_sheets()
except Exception:
    print("Google Sheets からの初期データ読み込みに失敗しました")
    import traceback
    traceback.print_exc()

app = FastAPI(title="AI Vet Chart Backend")

# CORS 設定（環境変数で上書き可）
default_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]
env_origins = os.getenv("CORS_ALLOW_ORIGINS")
origins = [o.strip() for o in env_origins.split(",") if o.strip()] if env_origins else default_origins
origin_regex = os.getenv("CORS_ALLOW_ORIGIN_REGEX") or r"^https://.*\.app\.github\.dev$"
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静的ファイル（画像など）
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/health")
async def health():
    return JSONResponse({
        "status": "ok",
        "apis": "google_cloud",
        "gemini_key": bool(get_gemini_api_key()),
    })

DEBUG_ENDPOINTS = os.getenv("ENABLE_DEBUG_ENDPOINTS", "1") == "1"

if DEBUG_ENDPOINTS:
    @app.get("/api/debug/google-apis")
    async def debug_google_apis():
        """Google APIs 設定状況の確認用。認証やクォータ設定のトラブルシュートに使用。"""
        spreadsheet_id = os.getenv("SPREADSHEET_ID")
        animals_tab = os.getenv("SHEETS_TAB_ANIMALS", "animals")
        records_tab = os.getenv("SHEETS_TAB_RECORDS", "records")
        using_b64 = bool(os.getenv("GOOGLE_SERVICE_ACCOUNT_B64"))
        gac = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        service_account_file_exists = os.path.exists("service_account.json")
        client_email = None
        try:
            b64 = os.getenv("GOOGLE_SERVICE_ACCOUNT_B64")
            if b64:
                data = base64.b64decode(b64)
                info = _json.loads(data.decode("utf-8"))
                client_email = info.get("client_email")
        except Exception:
            client_email = None
        return {
            "spreadsheet_id_present": bool(spreadsheet_id),
            "spreadsheet_id_preview": (spreadsheet_id[:6] + "..." + spreadsheet_id[-4:]) if spreadsheet_id else None,
            "tabs": {"animals": animals_tab, "records": records_tab},
            "gemini_key_present": bool(get_gemini_api_key()),
            "gcp": {
                "using_b64": using_b64,
                "gac_env_set": bool(gac),
                "service_account_json_exists": service_account_file_exists,
                "service_account_client_email": client_email,
            },
        }

if DEBUG_ENDPOINTS:
    @app.get("/api/debug/reload-sheets")
    async def reload_sheets_get():
        """Google Sheets からデータを再読込（GET）。"""
        try:
            DB.load_from_sheets()
            animal_ids = list(DB.animals.keys())
            preview = animal_ids[:5]
            return {"ok": True, "animals_count": len(animal_ids), "animals_preview": preview}
        except Exception as e:
            return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})

    @app.post("/api/debug/reload-sheets")
    async def reload_sheets_post():
        """Google Sheets からデータを再読込（POST）。"""
        try:
            DB.load_from_sheets()
            animal_ids = list(DB.animals.keys())
            preview = animal_ids[:5]
            return {"ok": True, "animals_count": len(animal_ids), "animals_preview": preview}
        except Exception as e:
            return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})
@app.on_event("startup")
async def on_startup():
    global google_audio_service, google_ai_service
    google_audio_service = GoogleAudioService()
    google_ai_service = GoogleAIService(audio_service=google_audio_service)
    print("Google Audio / AI services initialized")

# 動物一覧・検索（簡易フィルタ対応）
@app.get("/api/animals")
async def list_animals(
    query: str = "",
    microchip_number: str = None,
    farm_id: str = None,
    breed: str = None,
    sex: str = None,
):
    animals = list(DB.animals.values()) if not query else DB.search_animals(query)
    def match(a: Animal) -> bool:
        if microchip_number and a.microchip_number != microchip_number: return False
        if farm_id and getattr(a, "farm_id", None) and farm_id not in a.farm_id: return False
        if breed and getattr(a, "breed", None) and breed != a.breed: return False
        if sex and getattr(a, "sex", None) and sex != a.sex: return False
        return True
    return [a for a in animals if match(a)]

@app.get("/api/animals/{animal_id}", response_model=AnimalDetailData)
async def get_animal(animal_id: str):
    animal = DB.get_animal(animal_id)
    if not animal:
        raise HTTPException(status_code=404, detail="動物が見つかりません")
    records = DB.get_records_for_animal(animal_id)
    summary = DB.generate_summary(animal_id)
    return {"animal": animal, "records": records, "summary": summary}

@app.post("/api/animals")
async def create_animal(
    microchip_number: str = Form(...),
    name: str = Form(...),
    age: int = Form(None),
    sex: str = Form(None),
    breed: str = Form(None),
    owner: str = Form(None),
    farm_id: str = Form(None),
    file: UploadFile = File(None),
):
    thumbnail_url = None
    if file is not None:
        data = await file.read()
        url, _ = save_file(data, filename=f"animal_{microchip_number}_{file.filename}")
        thumbnail_url = url
    animal = Animal(
        id=microchip_number,
        microchip_number=microchip_number,
        name=name,
        age=age,
        sex=sex,
        breed=breed,
        farm_id=farm_id or owner,
        thumbnailUrl=thumbnail_url,
        records=[],
    )
    DB.add_animal(animal)
    return animal

@app.post("/api/uploads/images")
async def upload_image(file: UploadFile = File(...)):
    data = await file.read()
    url, key = save_file(data, filename=f"img_{uuid.uuid4().hex}_{file.filename}")
    return UploadResponse(url=url, key=key)

@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    if google_audio_service is None:
        raise HTTPException(status_code=500, detail="音声サービスが初期化されていません")
    if not audio or not audio.filename:
        raise HTTPException(status_code=400, detail="音声ファイルが選択されていません")
    audio_data = await audio.read()
    if len(audio_data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="ファイルサイズは25MB以下にしてください")
    text = google_audio_service.transcribe_audio_data(audio_data, audio.filename)
    if not text:
        raise HTTPException(status_code=500, detail="音声の書き起こしに失敗しました")
    return {
        "transcription": text,
        "transcribed_text": text,
        "filename": audio.filename,
        "file_size": len(audio_data),
        "status": "success",
        "service": "google_speech_to_text",
    }

@app.post("/api/generateSoap")
async def generate_soap_endpoint(audio: UploadFile = File(None), transcribed_text: str = Form(None)):
    if google_ai_service is None:
        raise HTTPException(status_code=500, detail="AIサービスが初期化されていません")
    text = transcribed_text
    if not text and audio is not None:
        if google_audio_service is None:
            raise HTTPException(status_code=500, detail="音声サービスが初期化されていません")
        data = await audio.read()
        if len(data) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="ファイルサイズは25MB以下にしてください")
        text = google_audio_service.transcribe_audio_data(data, audio.filename)
    if not text:
        raise HTTPException(status_code=400, detail="テキストが指定されていません")
    soap_notes = google_ai_service.generate_soap_from_text(text)
    return {
        "soap_notes": soap_notes.model_dump(),
        "original_text": text,
        "status": "success",
        "service": "google_gemini",
    }

@app.post("/api/records")
async def create_record(
    animalId: str = Form(...),
    soap_json: str = Form(None),
    audio: UploadFile = File(None),
    images: List[UploadFile] = File(None),
    auto_transcribe: bool = Form(False),
    soap_s: str = Form(""),
    soap_o: str = Form(""),
    soap_a: str = Form(""),
    soap_p: str = Form(""),
    next_visit_date: str = Form(None),
    next_visit_time: str = Form(None),
    doctor: str = Form(None),
):
    animal = DB.get_animal(animalId)
    if not animal:
        raise HTTPException(status_code=404, detail="動物が見つかりません")
    soap: Optional[SoapNotes] = None
    if soap_json:
        try:
            soap_dict = _json.loads(soap_json)
            soap = SoapNotes(**soap_dict)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"soap_json が不正です: {e}")
    elif any([soap_s, soap_o, soap_a, soap_p]):
        soap = SoapNotes(s=soap_s, o=soap_o, a=soap_a, p=soap_p)
    else:
        soap = SoapNotes()
    image_urls: List[str] = []
    if images:
        for img in images:
            if img and img.filename:
                content = await img.read()
                url, _ = save_file(content, filename=f"rec_{uuid.uuid4().hex}_{img.filename}")
                image_urls.append(url)
    audio_url = None
    transcribed = None
    if audio is not None:
        data = await audio.read()
        if len(data) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="ファイルサイズは25MB以下にしてください")
        audio_url, _ = save_file(data, filename=f"audio_{uuid.uuid4().hex}_{audio.filename}")
        if auto_transcribe and google_audio_service is not None and not soap:
            transcribed = google_audio_service.transcribe_audio_data(data, audio.filename)
            if transcribed:
                soap = google_ai_service.generate_soap_from_text(transcribed)
    record = Record(
        id=uuid.uuid4().hex,
        animalId=animalId,
        soap=soap,
        images=image_urls,
        audioUrl=audio_url,
    )
    if next_visit_date:
        record.next_visit_date = next_visit_date
    if next_visit_time:
        record.next_visit_time = next_visit_time
    if doctor:
        record.doctor = doctor
    DB.add_record(record)
    return {
        "record": record,
        "transcribed_text": transcribed,
        "auto_transcribe": auto_transcribe,
        "processed_images": [],
        "record_id": record.id,
        "message": "記録が正常に保存されました",
        "status": "success",
        "api_used": "google_cloud_apis",
    }

# 互換API: テキストからSOAP生成（Frontend互換）
@app.post("/api/generateSoapFromText")
async def generate_soap_from_text_compat(text: str = Form(None), transcribed_text: str = Form(None)):
    if google_ai_service is None:
        raise HTTPException(status_code=500, detail="AI service not initialized")
    t = transcribed_text or text
    if not t:
        raise HTTPException(status_code=400, detail="text is required")
    soap_notes = google_ai_service.generate_soap_from_text(t)
    return {
        "soap_notes": soap_notes.model_dump(),
        "original_text": t,
        "status": "success",
        "service": "google_gemini",
    }


# 予定一覧（レコードの next_visit_date から集計）
@app.get("/api/appointments")
async def get_appointments(date: str = None):
    items = []
    for animal in DB.animals.values():
        records = DB.get_records_for_animal(animal.id)
        if not records:
            continue
        for r in records:
            nxt = getattr(r, "next_visit_date", None)
            if not nxt:
                continue
            d = None
            t = getattr(r, "next_visit_time", None)
            if isinstance(nxt, str):
                if "T" in nxt:
                    d, tpart = nxt.split("T", 1)
                    if not t:
                        t = tpart[:5]
                else:
                    d = nxt
            if not d:
                try:
                    d = str(nxt)[:10]
                except Exception:
                    continue
            if date and d != date:
                continue
            items.append({
                "id": f"{animal.id}-{getattr(r, 'id', '')}",
                "microchip_number": animal.id,
                "animal_name": getattr(animal, "name", ""),
                "farm_id": getattr(animal, "farm_id", None),
                "date": d,
                "time": t or "",
                "description": None,
                "summary": getattr(getattr(r, 'soap', None), 'a', None),
                "status": "scheduled",
                "doctor": getattr(r, 'doctor', None),
            })
    return items
