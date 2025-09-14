import os
from typing import Optional
from pathlib import Path

from google.cloud import speech

from config import ensure_gcp_credentials


class GoogleAudioService:
    """Google Cloud Speech-to-Text API を使った音声転写サービス。

    - 同期認識 API を使用
    - 言語コードは引数 > 環境変数 SPEECH_LANGUAGE_CODE > 既定 ja-JP の順で決定
    """

    def __init__(self):
        ensure_gcp_credentials()
        self.client = speech.SpeechClient()

    def transcribe_audio(self, audio_file_path: str, language_code: Optional[str] = None) -> Optional[str]:
        try:
            with open(audio_file_path, "rb") as f:
                audio_content = f.read()
            return self._transcribe_audio_content(audio_content, audio_file_path, language_code=language_code)
        except Exception as e:
            print(f"[stt] file transcribe error: {e}")
            return None

    def transcribe_audio_data(self, audio_data: bytes, filename: str, language_code: Optional[str] = None) -> Optional[str]:
        try:
            return self._transcribe_audio_content(audio_data, filename, language_code=language_code)
        except Exception as e:
            print(f"[stt] buffer transcribe error: {e}")
            return None

    def _transcribe_audio_content(self, audio_content: bytes, filename: str, language_code: Optional[str] = None) -> Optional[str]:
        try:
            file_extension = Path(filename).suffix.lower()
            encoding = self._get_audio_encoding(file_extension)

            # 言語コード（引数 > 環境変数 > 既定 ja-JP）
            lang = (language_code or os.getenv("SPEECH_LANGUAGE_CODE") or "ja-JP").strip()

            audio = speech.RecognitionAudio(content=audio_content)
            config = speech.RecognitionConfig(
                encoding=encoding,
                sample_rate_hertz=16000,
                language_code=lang,
                model="medical",
                use_enhanced=True,
                enable_automatic_punctuation=True,
            )

            response = self.client.recognize(config=config, audio=audio)
            transcript = " ".join([res.alternatives[0].transcript for res in response.results]).strip()
            print(f"[stt] done ({lang}): {transcript[:100]}...")
            return transcript
        except Exception as e:
            print(f"[stt] recognize error: {e}")
            return None

    def _get_audio_encoding(self, file_extension: str) -> speech.RecognitionConfig.AudioEncoding:
        mapping = {
            ".wav": speech.RecognitionConfig.AudioEncoding.LINEAR16,
            ".flac": speech.RecognitionConfig.AudioEncoding.FLAC,
            ".mp3": speech.RecognitionConfig.AudioEncoding.MP3,
            ".ogg": speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
            ".webm": speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            ".m4a": speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED,
        }
        return mapping.get(file_extension, speech.RecognitionConfig.AudioEncoding.LINEAR16)

    @staticmethod
    def is_audio_file(filename: str) -> bool:
        exts = {".wav", ".flac", ".mp3", ".ogg", ".webm", ".m4a"}
        return Path(filename).suffix.lower() in exts

    def get_supported_formats(self) -> dict:
        return {
            "supported_formats": [".wav", ".flac", ".mp3", ".ogg", ".webm", ".m4a"],
            "max_duration": "~60s (sync)",
            "language_examples": ["ja-JP", "en-US"],
            "model": "medical",
        }

