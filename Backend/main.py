from dotenv import load_dotenv
import os
import base64
import uuid
import json
from pathlib import Path
from datetime import datetime
from typing import List
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import json

# ローカルのモジュールをインポート
from database import DB
from Calendar import create_calendar_event, GenericCalendarProvider
from schemas import Animal, Record, UploadResponse, SoapNotes, AnimalDetailData
from storage import save_file
from audio_service import GoogleAudioService
from ai_service import GoogleAIService

# --- アプリケーションの初期設定と認証 ---

# .envファイルをロード
load_dotenv()

def write_service_account_file():
    """
    If GOOGLE_SERVICE_ACCOUNT_B64 env var is set, decode and write to service_account.json.
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

# サービスアカウントキーファイルを書き出す
write_service_account_file()

# Google Cloudの認証情報を環境変数に設定
if os.path.exists("service_account.json"):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "service_account.json"
    print("GOOGLE_APPLICATION_CREDENTIALS environment variable is set.")
else:
    print("service_account.json was not found. Authentication may fail.")

# Google API サービスインスタンスを作成
# グローバル変数として定義
google_audio_service: GoogleAudioService = None
google_ai_service: GoogleAIService = None

# データベースの初期化
try:
    DB.load_from_sheets()
except Exception as e:
    print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    print("FATAL ERROR: Failed to load data from sheets.")
    import traceback
    traceback.print_exc()
    print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")

# 環境変数をプリントして確認 (デバッグ用)
print(f"GOOGLE_SERVICE_ACCOUNT_B64 is set: {bool(os.getenv('GOOGLE_SERVICE_ACCOUNT_B64'))}")
print(f"GOOGLE_GEMINI_API_KEY is set: {bool(os.getenv('GOOGLE_GEMINI_API_KEY'))}")
print(f"SPREADSHEET_ID is set: {bool(os.getenv('SPREADSHEET_ID'))}")


# --- FastAPI アプリケーションとエンドポイント ---

app = FastAPI(title="AI Vet Chart Backend (Google Cloud APIs)")

# アプリケーション起動時にサービスを初期化
@app.on_event("startup")
async def startup_event():
    global google_audio_service, google_ai_service
    # 認証が完了した後にインスタンスを作成
    google_audio_service = GoogleAudioService()
    # ここでaudio_serviceを渡す
    google_ai_service = GoogleAIService(audio_service=google_audio_service)
    print("Google Audio and AI services initialized on startup.")

# uploadsフォルダを静的ファイルとして公開
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS設定
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "https://*.codespaces.github.dev",
]

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
        return list(DB.animals.values())
    return DB.search_animals(query)


@app.get("/api/animals/{animal_id}", response_model=AnimalDetailData)
async def get_animal(animal_id: str):
    """個別の動物の詳細を取得"""
    animal = DB.get_animal(animal_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")
    
    records = DB.get_records_for_animal(animal_id)
    summary = DB.generate_summary(animal_id)

    return {
        "animal": animal,
        "records": records,
        "summary": summary
    }


@app.post("/api/animals")
async def create_animal(
    microchip_number: str = Form(...),
    name: str = Form(...),
    age: int = Form(None),
    sex: str = Form(None),
    breed: str = Form(None),
    owner: str = Form(None),
    user_id: str = Form("guest"),   # 👈 追加
    file: UploadFile = File(None),
):
    thumbnail_url = None
    if file:
        data = await file.read()
        url, key = save_file(data, filename=f"animal_{microchip_number}_{file.filename}")
        thumbnail_url = url
    
    animal = Animal(
        id=microchip_number,
        microchip_number=microchip_number,
        name=name,
        age=age,
        sex=sex,
        breed=breed,
        thumbnailUrl=thumbnail_url,
        owner=owner,
    )
    
    DB.add_animal(animal, user_id=user_id)   # 👈 user_id を渡す
    return animal


@app.post("/api/uploads/images")
async def upload_image(file: UploadFile = File(...)):
    data = await file.read()
    url, key = save_file(data, filename=f"img_{uuid.uuid4().hex}_{file.filename}")
    return UploadResponse(url=url, key=key)


@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """音声ファイルをテキストに変換するエンドポイント（Google Speech-to-Text使用）"""
    try:
        if google_audio_service is None:
            raise HTTPException(status_code=500, detail="Audio service not initialized")

        if not audio.filename:
            raise HTTPException(status_code=400, detail="音声ファイルが選択されていません")

        if not google_audio_service.is_audio_file(audio.filename):
            # 拡張性のため、サポートされている形式をリストで取得
            supported_formats = google_audio_service.get_supported_formats()
            if isinstance(supported_formats, dict):
                formats = supported_formats.get("supported_formats", [])
            else:
                formats = supported_formats
            
            raise HTTPException(
                status_code=400, 
                detail=f"サポートされていないファイル形式です。対応形式: {', '.join(formats)}"
            )
        
        # ファイル形式の確認（backend_fixes.pyからの追加）
        audio_extensions = ['.wav', '.mp3', '.ogg', '.webm', '.flac', '.m4a', '.mp4']
        file_extension = Path(audio.filename).suffix.lower()
        
        if file_extension not in audio_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"サポートされていないファイル形式です。対応形式: {', '.join(audio_extensions)}"
            )
        
        audio_data = await audio.read()
        
        if len(audio_data) > 25 * 1024 * 1024:  # backend_fixes.pyに合わせて25MB制限に変更
            raise HTTPException(
                status_code=400, 
                detail="ファイルサイズは25MB以下にしてください。"
            )
        
        transcribed_text = google_audio_service.transcribe_audio_data(audio_data, audio.filename)
        
        if not transcribed_text:
            raise HTTPException(status_code=500, detail="音声の転写に失敗しました")
        
        return {
            "transcription": transcribed_text,  # backend_fixes.pyの形式に合わせる
            "transcribed_text": transcribed_text,  # 既存のコードとの互換性のため
            "filename": audio.filename,
            "file_size": len(audio_data),  # backend_fixes.pyからの追加
            "status": "success",
            "service": "google_speech_to_text"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"音声転写エラー: {e}")
        raise HTTPException(status_code=500, detail="音声ファイルの処理中にエラーが発生しました")


@app.post("/api/generateSoap")
async def generate_soap_endpoint(audio: UploadFile = File(None), transcribed_text: str = Form(None)):
    """音声またはテキストを元にSOAPノートを生成するエンドポイント（Google APIs使用）"""
    try:
        if google_ai_service is None or google_audio_service is None:
             raise HTTPException(status_code=500, detail="AI services not initialized")
        
        if audio:
            if not google_audio_service.is_audio_file(audio.filename):
                raise HTTPException(status_code=400, detail="サポートされていないファイル形式です")
            
            audio_data = await audio.read()
            if len(audio_data) > 25 * 1024 * 1024:  # backend_fixes.pyに合わせて25MB制限
                raise HTTPException(status_code=400, detail="音声ファイルが大きすぎます")
            
            # audio_urlはS3/GCSに保存されたURLを想定
            audio_url, _ = save_file(audio_data, filename=f"audio_{uuid.uuid4().hex}_{audio.filename}")
            
            # 内部で音声転写とAI要約を実行
            soap_notes = google_ai_service.generate_soap_from_audio(audio_url, transcribed_text)
            
            return {
                "soap_notes": soap_notes.model_dump(),
                "audio_url": audio_url,
                "source": "audio",
                "status": "success",
                "service": "google_apis"
            }
        
        elif transcribed_text:
            soap_notes = google_ai_service.generate_soap_from_text(transcribed_text)
            
            return {
                "soap_notes": soap_notes.model_dump(),
                "source": "text",
                "status": "success",
                "service": "google_gemini"
            }
        
        else:
            raise HTTPException(status_code=400, detail="音声ファイルまたはテキストのいずれかが必要です")
    except Exception as e:
        print(f"SOAP生成エラー: {e}")
        raise HTTPException(status_code=500, detail="SOAP生成中にエラーが発生しました")


@app.post("/api/generateSoapFromText")
async def generate_soap_from_text_endpoint(text: str = Form(...)):
    """テキストからSOAPノートを生成するエンドポイント（Google Gemini使用）"""
    try:
        if google_ai_service is None:
            raise HTTPException(status_code=500, detail="AI service not initialized")
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="テキストが入力されていません")
        
        soap_notes = google_ai_service.generate_soap_from_text(text)
        
        return {
            "soap_notes": soap_notes.model_dump(),
            "original_text": text,
            "status": "success",
            "service": "google_gemini"
        }
    except Exception as e:
        print(f"テキストからのSOAP生成エラー: {e}")
        raise HTTPException(status_code=500, detail="SOAP生成中にエラーが発生しました")


@app.post("/api/generateSummary")
async def generate_summary(request: dict):
    """
    動物の診療記録からAIサマリーを生成するエンドポイント
    """
    try:
        if google_ai_service is None:
            raise HTTPException(status_code=500, detail="AI service not initialized")
        
        microchip = request.get('microchip_number')
        if not microchip:
            raise HTTPException(status_code=400, detail="マイクロチップ番号が必要です")
        
        # 動物データの取得
        animal = DB.get_animal(microchip)
        if not animal:
            raise HTTPException(status_code=404, detail="指定された動物が見つかりません")
        
        records = DB.get_records_for_animal(microchip)
        
        if not records:
            return {"summary": f"{animal.name}の診療記録はまだありません。"}
        
        # 診療記録を整理（最新5件）
        recent_records = sorted(records, key=lambda x: x.date if hasattr(x, 'date') else '', reverse=True)[:5]
        
        # プロンプトを作成
        records_text = ""
        for i, record in enumerate(recent_records, 1):
            # recordの日付フォーマットを調整
            record_date = getattr(record, 'date', 'Unknown')
            if hasattr(record_date, 'isoformat'):
                record_date = record_date.isoformat()[:10]
            elif isinstance(record_date, str) and len(record_date) >= 10:
                record_date = record_date[:10]
            
            records_text += f"\n=== 診療記録 {i} ({record_date}) ===\n"
            soap = record.soap
            records_text += f"S: {getattr(soap, 's', getattr(soap, 'subjective', ''))}\n"
            records_text += f"O: {getattr(soap, 'o', getattr(soap, 'objective', ''))}\n"
            records_text += f"A: {getattr(soap, 'a', getattr(soap, 'assessment', ''))}\n"
            records_text += f"P: {getattr(soap, 'p', getattr(soap, 'plan', ''))}\n"
        
        prompt = f"""
        あなたは優秀な獣医師です。以下の診療情報を分析し、飼い主と他の獣医師がすぐに状況を把握できるよう、重要なポイントを箇条書きで3点に要約してください。

        # 動物情報
        - 名前: {animal.name}
        - 品種: {getattr(animal, 'breed', 'Unknown')}
        - 性別: {getattr(animal, 'sex', 'Unknown')}
        - 年齢: {getattr(animal, 'age', 'Unknown')}

        # 指示
        - 現在の最も重要な健康課題を1点挙げてください。(1-2行)
        - これまでの主要な治療や検査を1点挙げてください。(1-2行)
        - 今後最も注意すべきことを1点挙げてください。(1行)
        - 全体は80文字以内にまとめてください。

        例：
        ・右後肢の跛行が続いており、跛行スコアは3/5です。
        ・X線検査の結果、関節炎と診断し、抗炎症薬を投与中です。
        ・体重管理を継続し、激しい運動は避けるようにしてください。
        """
        
        print(f"=== サマリー生成開始 ===")
        print(f"動物: {animal.name} ({microchip})")
        print(f"記録件数: {len(records)}")
        
        # Google Gemini APIを使用してサマリー生成
        summary = google_ai_service.generate_summary_from_text(prompt)
        
        print(f"✅ サマリー生成完了: {len(summary)}文字")
        
        return {
            "summary": summary,
            "records_count": len(records),
            "animal_name": animal.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"サマリー生成エラー: {e}")
        raise HTTPException(status_code=500, detail="サマリーの生成中にエラーが発生しました")


@app.post("/api/records")
async def create_record(
    animalId: str = Form(...),
    soap_json: str = Form(None),
    audio: UploadFile = File(None),
    images: List[UploadFile] = File(None),
    auto_transcribe: bool = Form(False),
    # backend_fixes.pyからの追加パラメータ
    microchip: str = Form(None),
    soap_s: str = Form(""),
    soap_o: str = Form(""),
    soap_a: str = Form(""),
    soap_p: str = Form(""),
    next_visit_date: str = Form(None),
    next_visit_time: str = Form(None),
    image_base64s: List[str] = Form([]),
    image_names: List[str] = Form([]),
    user_id: str = Form("guest"),   # 👈 追加
):
    """診療記録を作成（Google APIs使用、backend_fixes.pyの改善を統合）"""
    try:
        print(f"=== 画像処理デバッグ ===")
        print(f"images パラメータ: {images}")
        print(f"image_base64s: {len(image_base64s) if image_base64s else 0}件")
        print(f"image_names: {len(image_names) if image_names else 0}件")

        if google_audio_service is None or google_ai_service is None:
            raise HTTPException(status_code=500, detail="Services not initialized")
        
        # マイクロチップ番号の取得（animalIdまたはmicrochipパラメータから）
        target_id = microchip if microchip else animalId
        
        # 既存の動物データ取得
        animal = DB.get_animal(target_id)
        if not animal:
            raise HTTPException(status_code=404, detail="指定されたマイクロチップ番号の動物が見つかりません")
        
        # SOAP記録の処理
        soap = None
        if soap_json:
            try:
                soap_dict = json.loads(soap_json)
                soap = SoapNotes(**soap_dict)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid soap_json: {e}")
        elif soap_s or soap_o or soap_a or soap_p:
            # backend_fixes.pyスタイルのSOAPデータから作成
            soap = SoapNotes(
                subjective=soap_s,
                objective=soap_o,
                assessment=soap_a,
                plan=soap_p
            )

        # 画像処理 - Base64データまたはアップロードファイルから（backend_fixes.pyから統合）
        image_urls = []
        processed_images = []
        
        # Base64データから画像を処理
        if image_base64s and image_names:
            for base64_data, name in zip(image_base64s, image_names):
                if base64_data:
                    processed_images.append({
                        'name': name,
                        'data': base64_data,
                        'size': len(base64_data)
                    })
                    # Base64データをファイルとして保存（必要に応じて）
                    try:
                        image_data = base64.b64decode(base64_data.split(',')[1] if ',' in base64_data else base64_data)
                        url, key = save_file(image_data, filename=f"b64_{uuid.uuid4().hex}_{name}")
                        image_urls.append(url)
                    except Exception as e:
                        print(f"Base64画像の処理エラー: {e}")
        
        # アップロードファイルから画像を処理
        if images:
            for image_file in images:
                if image_file.filename:
                    image_content = await image_file.read()
                    base64_data = base64.b64encode(image_content).decode('utf-8')
                    mime_type = image_file.content_type or 'image/jpeg'
                    
                    processed_images.append({
                        'name': image_file.filename,
                        'data': f'data:{mime_type};base64,{base64_data}',
                        'size': len(image_content)
                    })
                    
                    url, key = save_file(image_content, filename=f"rec_{uuid.uuid4().hex}_{image_file.filename}")
                    image_urls.append(url)

        audio_url = None
        transcribed_text = None
        print(f"処理完了 - image_urls: {len(image_urls)}個")
        print(f"image_urls内容: {image_urls}")
        
        if audio:
            data = await audio.read()
            if len(data) > 25 * 1024 * 1024:  # backend_fixes.pyに合わせて25MB制限
                raise HTTPException(status_code=400, detail="音声ファイルが大きすぎます。25MB以下にしてください。")
            
            audio_url, key = save_file(data, filename=f"audio_{uuid.uuid4().hex}_{audio.filename}")
            
            if auto_transcribe and not soap:
                print("Google APIs使用 - 音声の自動転写とAI要約を実行中...")
                transcribed_text = google_audio_service.transcribe_audio_data(data, audio.filename)
                
                if transcribed_text:
                    soap = google_ai_service.generate_soap_from_text(transcribed_text)
                    print(f"Google Gemini AI要約完了: {soap}")
                else:
                    print("Google Speech-to-Text による音声転写に失敗しました")

        record_id = uuid.uuid4().hex
        if not soap:
            soap = SoapNotes()

        # 診療記録作成
        record = Record(
            id=record_id, 
            animalId=target_id, 
            soap=soap, 
            images=image_urls, 
            audioUrl=audio_url
        )

        # 次回予約日時の設定（backend_fixes.pyから追加）
        if next_visit_date:
            record.next_visit_date = next_visit_date
        if next_visit_time:
            record.next_visit_time = next_visit_time

        DB.add_record(record, user_id=user_id)   # 👈 user_id を渡す

        
        return {
            "record": record,
            "transcribed_text": transcribed_text,
            "auto_transcribe": auto_transcribe,
            "processed_images": processed_images,  # backend_fixes.pyの形式
            "record_id": record_id,  # backend_fixes.pyの形式
            "message": "記録が正常に保存されました",  # backend_fixes.pyの形式
            "status": "success",
            "api_used": "google_cloud_apis",
            "user_id": user_id,  # 👈 応答にも含めるとデバッグしやすい
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"記録作成エラー: {e}")
        raise HTTPException(status_code=500, detail=f"記録の保存中にエラーが発生しました: {str(e)}")


@app.post("/api/addRecord", response_model=UploadResponse)
def add_record_endpoint(record: Record):
    """
    新しい診療記録をメモリとGoogle Sheetsに追加し、
    次回の予定があればカレンダーにイベントを作成するエンドポイント
    """
    try:
        soap_data = record.soap.model_dump()
        description_text = (
            f"S: {soap_data.get('subjective', 'データなし')}\n"
            f"O: {soap_data.get('objective', 'データなし')}\n"
            f"A: {soap_data.get('assessment', 'データなし')}\n"
            f"P: {soap_data.get('plan', 'データなし')}"
        )

        animal = DB.get_animal(record.animalId)
        animal_name = animal.name if animal else "不明な動物"

        DB.add_record(record)
        
        if hasattr(record, 'next_visit_date') and record.next_visit_date:
            print(f"次回の診療予定をGoogleカレンダーに登録します: {record.next_visit_date}")
            create_calendar_event(
                title=f"{animal_name}の次回診療",
                start_date=record.next_visit_date,
                description=f"動物名: {animal_name}\n診療記録:\n{description_text}",
                provider=GenericCalendarProvider.GOOGLE_CALENDAR
            )
        
        return UploadResponse(message="Record uploaded successfully.")
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")


@app.get("/health")
async def health():
    return JSONResponse({"status": "ok", "apis": "google_cloud"})


@app.get("/debug/animals")
async def debug_animals():
    return {
        "all_animals": list(DB.animals.keys()),
        "animal_data": {k: {"name": v.name, "id": v.id} for k, v in DB.animals.items()}
    }


@app.get("/api/debug/google-apis")
async def debug_google_apis():
    """Google APIs設定状況を確認"""
    return {
        "google_service_account": bool(os.getenv('GOOGLE_SERVICE_ACCOUNT_B64')),
        "gemini_api_key": bool(os.getenv('GOOGLE_GEMINI_API_KEY')),
        "spreadsheet_id": bool(os.getenv('SPREADSHEET_ID')),
        "service_account_file": os.path.exists("service_account.json"),
        "supported_audio_formats": google_audio_service.get_supported_formats() if google_audio_service else [],
        "services": {
            "speech_to_text": "Google Cloud Speech-to-Text",
            "ai_summarization": "Google Gemini 1.5 Flash (無料版)",
            "data_storage": "Google Sheets"
        }
    }


@app.get("/api/debug/audio-formats")
async def get_supported_audio_formats():
    """サポートされている音声形式を返す（Google Cloud Speech-to-Text）"""
    if google_audio_service is None:
        raise HTTPException(status_code=500, detail="Audio service not initialized")
        
    formats_info = google_audio_service.get_supported_formats()
    return {
        "supported_formats": formats_info.get("supported_formats", []) if isinstance(formats_info, dict) else formats_info,
        "max_file_size": "25MB",  # backend_fixes.pyに合わせて更新
        "language": "ja-JP (日本語)",
        "service": "Google Cloud Speech-to-Text",
        "model": "医療用拡張モデル対応"
    }




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)