import os
from uuid import uuid4
from pathlib import Path
from typing import Tuple

UPLOAD_ROOT = Path(__file__).parent / "uploads"
UPLOAD_ROOT.mkdir(exist_ok=True)

def save_file(file_bytes: bytes, filename: str = None) -> Tuple[str, str]:
    """Save bytes to uploads/ and return (url, key).
    URL is a file:// path suitable for local testing.
    """
    key = filename or f"{uuid4().hex}"
    path = UPLOAD_ROOT / key
    with open(path, "wb") as fh:
        fh.write(file_bytes)
    url = f"file://{str(path.resolve())}"
    return url, str(path.name)
