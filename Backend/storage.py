import os
import uuid
from typing import Tuple, Optional
from pathlib import Path

# ファイルアップロード用のディレクトリ
UPLOAD_DIR = "uploads"
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")
GCS_BASE_URL = os.getenv("GCS_BASE_URL")  # 例: https://storage.googleapis.com/<bucket>

def ensure_upload_dir():
    """アップロードディレクトリが存在することを確認"""
    Path(UPLOAD_DIR).mkdir(exist_ok=True)

def _save_file_local(data: bytes, filename: str) -> Tuple[str, str]:
    """
    ファイルをローカルのuploadsディレクトリに保存し、URLとキーを返す
    
    Args:
        data: ファイルのバイナリデータ
        filename: 元のファイル名
        
    Returns:
        Tuple[str, str]: (URL, key) のタプル
    """
    ensure_upload_dir()
    
    # 一意のファイル名を生成
    file_extension = Path(filename).suffix
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    
    # ファイルパス
    file_path = Path(UPLOAD_DIR) / unique_filename
    
    # ファイルを保存
    with open(file_path, 'wb') as f:
        f.write(data)
    
    # URLとキーを返す
    url = f"/uploads/{unique_filename}"
    key = unique_filename
    
    return url, key

def _save_file_gcs(data: bytes, filename: str) -> Optional[Tuple[str, str]]:
    """GCS に保存（利用可能な場合）。利用不可なら None を返す。"""
    try:
        from google.cloud import storage  # type: ignore
    except Exception:
        return None
    bucket_name = GCS_BUCKET_NAME
    if not bucket_name:
        return None
    client = storage.Client()  # 認証は GOOGLE_APPLICATION_CREDENTIALS 等に依存
    bucket = client.bucket(bucket_name)
    ext = Path(filename).suffix
    key = f"uploads/{uuid.uuid4().hex}{ext}"
    blob = bucket.blob(key)
    blob.upload_from_string(data)
    # URL 生成
    if GCS_BASE_URL:
        url = f"{GCS_BASE_URL}/{key}"
    else:
        url = blob.public_url
    return url, key

def save_file(data: bytes, filename: str) -> Tuple[str, str]:
    """環境に応じて GCS or ローカルに保存。"""
    g = _save_file_gcs(data, filename)
    if g is not None:
        return g
    return _save_file_local(data, filename)

def delete_file(key: str) -> bool:
    """
    ファイルを削除する
    
    Args:
        key: ファイルのキー（ファイル名）
        
    Returns:
        bool: 削除が成功したかどうか
    """
    try:
        file_path = Path(UPLOAD_DIR) / key
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    except Exception as e:
        print(f"ファイル削除エラー: {e}")
        return False

def get_file_url(key: str) -> str:
    """
    ファイルキーからURLを生成する
    
    Args:
        key: ファイルのキー
        
    Returns:
        str: ファイルのURL
    """
    return f"/uploads/{key}"
