import os
import uuid
from typing import Tuple
from pathlib import Path

# ファイルアップロード用のディレクトリ
UPLOAD_DIR = "uploads"

def ensure_upload_dir():
    """アップロードディレクトリが存在することを確認"""
    Path(UPLOAD_DIR).mkdir(exist_ok=True)

def save_file(data: bytes, filename: str) -> Tuple[str, str]:
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