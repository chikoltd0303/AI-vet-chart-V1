import os
import base64
from dotenv import load_dotenv
from typing import Optional


# Load .env once at import
load_dotenv()


def write_service_account_file_if_needed() -> None:
    """Create service_account.json from GOOGLE_SERVICE_ACCOUNT_B64 if present.

    Idempotent: does nothing if file already exists or env not set.
    """
    b64 = os.getenv("GOOGLE_SERVICE_ACCOUNT_B64")
    if not b64:
        return
    if os.path.exists("service_account.json"):
        return
    try:
        data = base64.b64decode(b64)
        with open("service_account.json", "wb") as f:
            f.write(data)
        print("[config] service_account.json を作成しました")
    except Exception as e:
        print(f"[config] service_account.json の作成に失敗: {e}")


def ensure_gcp_credentials() -> None:
    """Ensure GOOGLE_APPLICATION_CREDENTIALS points to a usable file.

    Priority:
      - Use service_account.json if present or derivable from B64 env.
      - Respect existing GOOGLE_APPLICATION_CREDENTIALS if already set.
    """
    # Respect explicit setting
    if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        return

    # Try to materialize from B64
    write_service_account_file_if_needed()

    if os.path.exists("service_account.json"):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "service_account.json"
    else:
        print("[config] service_account.json が見つかりません。GCP認証が失敗する可能性があります。")


def get_gemini_api_key() -> Optional[str]:
    """Return Gemini API key from env (two supported names)."""
    return os.getenv("GOOGLE_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")


def init_env() -> None:
    """Initialize environment for the backend process."""
    ensure_gcp_credentials()
