import os
import base64
import tempfile
from typing import Optional
from pathlib import Path
from google.cloud import speech
import json

class GoogleAudioService:
    """Google Cloud Speech-to-Text APIを使用した音声処理サービス"""
    
    def __init__(self):
        # サービスアカウントキーファイルを環境変数から作成
        self._setup_google_credentials()
        self.client = speech.SpeechClient()
    
    def _setup_google_credentials(self):
        """環境変数からGoogle認証情報を設定"""
        # 既存のservice_account.json作成ロジックを流用
        b64_str = os.getenv("GOOGLE_SERVICE_ACCOUNT_B64")
        if b64_str and not os.path.exists("service_account.json"):
            try:
                data = base64.b64decode(b64_str)
                with open("service_account.json", "wb") as fh:
                    fh.write(data)
                print("Google認証情報を設定しました")
                
                # 環境変数も設定
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "service_account.json"
            except Exception as e:
                print(f"Google認証情報設定エラー: {e}")
    
    def transcribe_audio(self, audio_file_path: str) -> Optional[str]:
        """
        音声ファイルをテキストに変換（Google Cloud Speech-to-Text API使用）
        """
        try:
            # 音声ファイルを読み込み
            with open(audio_file_path, "rb") as audio_file:
                audio_content = audio_file.read()
            
            return self._transcribe_audio_content(audio_content, audio_file_path)
            
        except Exception as e:
            print(f"音声転写エラー: {e}")
            return None
    
    def transcribe_audio_data(self, audio_data: bytes, filename: str) -> Optional[str]:
        """
        音声データ（バイト）を直接テキストに変換
        """
        try:
            return self._transcribe_audio_content(audio_data, filename)
        except Exception as e:
            print(f"音声データ転写エラー: {e}")
            return None
    
    def _transcribe_audio_content(self, audio_content: bytes, filename: str) -> Optional[str]:
        """
        音声コンテンツを転写する内部メソッド
        """
        try:
            # 音声ファイル形式を推定
            file_extension = Path(filename).suffix.lower()
            encoding = self._get_audio_encoding(file_extension)
            
            # 音声設定
            audio = speech.RecognitionAudio(content=audio_content)
            config = speech.RecognitionConfig(
                encoding=encoding,
                sample_rate_hertz=16000,  # 一般的な設定、必要に応じて調整
                language_code="ja-JP",    # 日本語
                model="medical",          # 医療用モデル（利用可能な場合）
                use_enhanced=True,        # 拡張モデルを使用
                enable_automatic_punctuation=True,  # 自動句読点
            )
            
            # 転写実行
            response = self.client.recognize(config=config, audio=audio)
            
            # 結果を統合
            transcript = ""
            for result in response.results:
                transcript += result.alternatives[0].transcript + " "
            
            transcript = transcript.strip()
            print(f"音声転写完了: {transcript[:100]}...")
            return transcript
            
        except Exception as e:
            print(f"Google Speech-to-Text API エラー: {e}")
            # 長い音声ファイルの場合は非同期処理を試行
            return self._try_long_running_recognize(audio_content, filename)
    
    def _get_audio_encoding(self, file_extension: str) -> speech.RecognitionConfig.AudioEncoding:
        """ファイル拡張子から音声エンコーディングを推定"""
        encoding_map = {
            '.wav': speech.RecognitionConfig.AudioEncoding.LINEAR16,
            '.flac': speech.RecognitionConfig.AudioEncoding.FLAC,
            '.mp3': speech.RecognitionConfig.AudioEncoding.MP3,
            '.ogg': speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
            '.webm': speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        }
        
        return encoding_map.get(file_extension, speech.RecognitionConfig.AudioEncoding.LINEAR16)
    
    def _try_long_running_recognize(self, audio_content: bytes, filename: str) -> Optional[str]:
        """
        長い音声ファイル用の非同期処理
        """
        try:
            # Cloud Storageを使用しない簡易版
            # 実際の本格運用では音声をCloud Storageにアップロードして処理
            print("音声が長すぎる可能性があります。短い音声ファイルを使用してください。")
            return None
            
        except Exception as e:
            print(f"長時間音声処理エラー: {e}")
            return None
    
    @staticmethod
    def is_audio_file(filename: str) -> bool:
        """
        サポートされている音声ファイル形式かチェック
        """
        audio_extensions = {'.wav', '.flac', '.mp3', '.ogg', '.webm'}
        return Path(filename).suffix.lower() in audio_extensions
    
    def get_supported_formats(self) -> dict:
        """サポート形式の情報を返す"""
        return {
            "supported_formats": [".wav", ".flac", ".mp3", ".ogg", ".webm"],
            "max_duration": "60秒（同期処理）",
            "language": "ja-JP (日本語)",
            "model": "医療用拡張モデル対応"
        }