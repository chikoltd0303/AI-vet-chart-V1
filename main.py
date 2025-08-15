from dotenv import load_dotenv

load_dotenv()

import os
import base64
import uuid
from typing import List
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import DB


DB.load_from_sheets()



def write_service_account_file():
    """
    If GOOGLE_SERVICE_ACCOUNT_B64 env var is set, decode and write to service_account.json.
    Keep secrets out of repos in production.
    """
    b64_str = os.getenv("GOOGLE_SERVICE_ACCOUNT_B64")
    if b64_str and not os.path.exists("service_account.json"):
        try:
            data = base64.b64decode(b64_str)
            with open("service_account.json", "wb") as fh:
                fh.write(data)
            print("Wrote service_account.json from env var")
        except Exception as e:
            print("Failed to write service account:", e)

# attempt to write service account if provided
write_service_account_file()

# --- FastAPI app and endpoints ---
from schemas import Animal, Record, UploadResponse, SoapNotes
from storage import save_file
from ai_service import generate_soap_from_audio


app = FastAPI(title="AI Vet Chart Backend (extended)")

# Allow CORS for local frontend during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/animals")
async def list_animals(query: str = ""):
    if not query:
        # return all as list
        return list(DB.animals.values())
    return DB.search_animals(query)

@app.get("/api/animals/{animal_id}")
async def get_animal(animal_id: str):
    print(f"Looking for animal with ID: {animal_id}")  # デバッグログ追加
    a = DB.get_animal(animal_id)
    if not a:
        print(f"Animal not found with ID: {animal_id}")  # デバッグログ追加
        print(f"Available animals: {list(DB.animals.keys())}")  # デバッグログ追加
        raise HTTPException(status_code=404, detail="Animal not found")
    return a

@app.post("/api/animals")
async def create_animal(
    microchip_number: str = Form(...),  # microchip_numberを追加
    name: str = Form(...),
    age: int = Form(None),
    sex: str = Form(None),
    breed: str = Form(None),
    owner: str = Form(None),
    file: UploadFile = File(None),
):
    print(f"Creating animal with microchip_number: {microchip_number}")  # デバッグログ追加
    
    thumbnail_url = None
    if file:
        data = await file.read()
        url, key = save_file(data, filename=f"animal_{microchip_number}_{file.filename}")
        thumbnail_url = url
    
    animal = Animal(
        id=microchip_number,  # microchip_numberをIDとして使用
        microchip_number=microchip_number,  # microchip_numberフィールドも設定
        name=name,
        age=age,
        sex=sex,
        breed=breed,
        thumbnailUrl=thumbnail_url,
        owner=owner,
    )
    
    print(f"動物データを追加しました: {name} (ID: {microchip_number})")  # ログ改善
    DB.add_animal(animal)
    
    # 保存後すぐに確認
    saved_animal = DB.get_animal(microchip_number)
    print(f"保存確認: {saved_animal is not None}")  # デバッグログ追加
    
    return animal

@app.post("/api/uploads/images")
async def upload_image(file: UploadFile = File(...)):
    data = await file.read()
    url, key = save_file(data, filename=f"img_{uuid.uuid4().hex}_{file.filename}")
    return UploadResponse(url=url, key=key)

@app.post("/api/records")
async def create_record(
    animalId: str = Form(...),
    soap_json: str = Form(None),
    audio: UploadFile = File(None),
    images: List[UploadFile] = File(None),
):
    # parse soap_json if provided
    import json
    soap = None
    if soap_json:
        try:
            soap_dict = json.loads(soap_json)
            soap = SoapNotes(**soap_dict)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid soap_json: {e}")
    # save images
    image_urls = []
    if images:
        for f in images:
            data = await f.read()
            url, key = save_file(data, filename=f"rec_{uuid.uuid4().hex}_{f.filename}")
            image_urls.append(url)
    audio_url = None
    if audio:
        data = await audio.read()
        audio_url, key = save_file(data, filename=f"audio_{uuid.uuid4().hex}_{audio.filename}")
        # mock AI generate SOAP if not provided
        if not soap:
            # In a real setup, you'd run ASR -> LLM. Here we call the mock with file path.
            soap = generate_soap_from_audio(audio_url, transcribed_text=None)
    # create record
    record_id = uuid.uuid4().hex
    if not soap:
        soap = SoapNotes()
    record = Record(id=record_id, animalId=animalId, soap=soap, images=image_urls, audioUrl=audio_url)
    # store in DB
    DB.add_record(record)
    return record

@app.get("/health")
async def health():
    return JSONResponse({"status": "ok"})

@app.put("/api/records/{record_id}")
async def update_record(
    record_id: str,
    animalId: str = Form(...),
    soap_json: str = Form(None),
    images: List[UploadFile] = File(None),
):
    # 既存のレコードを更新する処理の実装
    import json
    soap = None
    if soap_json:
        try:
            soap_dict = json.loads(soap_json)
            soap = SoapNotes(**soap_dict)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid soap_json: {e}")
    
    # 既存のレコードを取得
    existing_record = None
    animal = DB.get_animal(animalId)
    if animal and hasattr(animal, 'records'):
        for record in animal.records:
            if record.id == record_id:
                existing_record = record
                break
    
    if not existing_record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # 画像処理
    image_urls = []
    if images:
        for f in images:
            data = await f.read()
            url, key = save_file(data, filename=f"rec_{uuid.uuid4().hex}_{f.filename}")
            image_urls.append(url)
    
    # レコードを更新
    updated_record = Record(
        id=record_id,
        animalId=animalId,
        soap=soap or existing_record.soap,
        images=image_urls or existing_record.images,
        audioUrl=existing_record.audioUrl,  # 音声は変更しない
    )
    
    # データベースで更新
    DB.update_record(animalId, record_id, updated_record)
    
    return updated_record

# デバッグ用エンドポイント（開発時のみ）
@app.get("/debug/animals")
async def debug_animals():
    return {
        "all_animals": list(DB.animals.keys()),
        "animal_data": {k: {"name": v.name, "id": v.id} for k, v in DB.animals.items()}
    }