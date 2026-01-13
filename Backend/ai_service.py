import os
import google.generativeai as genai
from schemas import SoapNotes
import json
import re

# 環境変数からAPIキーを設定（GEMINI_API_KEY もフォールバック）
GOOGLE_API_KEY = (
    os.getenv("GOOGLE_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
)

# モジュール読み込み時点では例外を投げず、初期化時に厳格チェック
if GOOGLE_API_KEY:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
    except Exception:
        pass

class GoogleAIService:
    """
    Google Gemini APIを使用して、テキストからSOAPノートを生成するサービスクラス。
    """
    def __init__(self, audio_service=None):
        """
        AIサービスを初期化し、Geminiモデルと生成設定を構成します。
        """
        # キーの存在を厳格チェック（GOOGLE_GEMINI_API_KEY / GEMINI_API_KEY）
        api_key = os.getenv("GOOGLE_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "Gemini API key not set. Please set GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY."
            )
        genai.configure(api_key=api_key)
        # JSONモードを有効にするための設定
        self.generation_config = {
            "response_mime_type": "application/json",
        }
        self.model = genai.GenerativeModel(
            'gemini-2.5-flash-lite',
            generation_config=self.generation_config
        )

    def _safe_get_response_text(self, response) -> str:
        """Geminiレスポンスからテキストを安全に取り出す。

        safety block などで response.text が ValueError を投げるケースを避ける。
        """
        if response is None:
            return ""
        response_text: str = ""
        try:
            text = response.text  # type: ignore[attr-defined]
            if text:
                return text.strip()
        except Exception as e:
            print(f"[gemini] response.text 取得失敗: {e}")

        try:
            candidates = getattr(response, "candidates", []) or []
            for cand in candidates:
                content = getattr(cand, "content", None)
                parts = getattr(content, "parts", None) or []
                texts = [getattr(p, "text", "") for p in parts if getattr(p, "text", None)]
                merged = "\n".join([t for t in texts if t]).strip()
                if merged:
                    return merged
        except Exception as e:
            print(f"[gemini] candidates 抽出失敗: {e}")

        return ""

    def generate_soap_from_text(self, transcribed_text: str) -> SoapNotes:
        """
        テキストからSOAPノートを生成します。
        
        Args:
            transcribed_text: 文字起こしされた診療情報テキスト。
        
        Returns:
            Pydanticモデル `SoapNotes` のインスタンス。
        """
        # ★★★ デバッグログ追加 ★★★
        print(f"=== SOAP生成開始 ===")
        print(f"入力テキスト: '{transcribed_text}'")
        print(f"入力テキスト長: {len(transcribed_text)} 文字")
        
        # 入力テキストが空の場合の処理
        if not transcribed_text or not transcribed_text.strip():
            print("❌ 入力テキストが空です")
            return SoapNotes(s="入力テキストが空です", o="", a="", p="")
        
        prompt = f"""
            あなたは優秀な大動物の獣医師です。
            以下の患者に関する情報をもとに、SOAP形式の診療ノートを作成してください。

            S (Subjective: 主観的情報): 飼い主からの訴えや問診内容。
            O (Objective: 客観的情報): 獣医師が行った視診、触診、聴診、検査結果など。
            A (Assessment: 評価・診断): SとOの情報から導き出される診断や問題点。
            P (Plan: 治療計画): 今後の治療方針、処方、次回の来院指示など。

            --- 診療情報 ---
            {transcribed_text}
            ---

            出力は必ず以下のキーを持つJSONオブジェクトのみとしてください。
            {{
                "s": "ここに主観的情報を記入",
                "o": "ここに客観的情報を記入", 
                "a": "ここに評価・診断を記入",
                "p": "ここに治療計画を記入"
            }}
            """
        
        print(f"=== 送信するプロンプト ===")
        print(prompt)
        print("========================")
        
        try:
            print("🔄 Gemini API呼び出し中...")
            response = self.model.generate_content(prompt)
            
            print(f"✅ Gemini APIレスポンス受信")
            response_text = self._safe_get_response_text(response)
            feedback = getattr(response, "prompt_feedback", None)
            block_reason = getattr(feedback, "block_reason", None)
            if block_reason and str(block_reason) != "BLOCK_NONE":
                raise ValueError(f"Geminiが応答をブロックしました: {block_reason}")

            print(f"生レスポンス: '{response_text}'")
            print(f"レスポンス長: {len(response_text)} 文字")
            
            if not response_text:
                raise ValueError("Geminiから空の応答が返されました")
            
            print(f"=== JSONパース試行 ===")
            soap_dict = json.loads(response_text)
            print(f"パース成功: {soap_dict}")
            
            # Pydanticモデルにデータをロードして検証
            soap_notes = SoapNotes(**soap_dict)
            print(f"✅ SoapNotes作成成功: {soap_notes}")
            
            return soap_notes
                        
        except (json.JSONDecodeError, TypeError, ValueError) as e:
            print(f"❌ JSONパースまたはデータ検証エラー: {e}")
            print(f"Geminiからの生の応答: '{response_text}'")
            
            # エラー時もログを残して、デバッグ情報付きで返す
            return SoapNotes(
                s=f"JSONパースエラー: {str(e)}. 元テキスト: {transcribed_text[:100]}...",
                o=f"生レスポンス: {response_text[:200]}...",
                a="データ検証に失敗しました",
                p="再度お試しください"
            )
        except Exception as e:
            print(f"❌ SOAP生成中に予期せぬエラーが発生: {e}")
            import traceback
            traceback.print_exc()
            
            return SoapNotes(
                s=f"予期せぬエラー: {str(e)}. 元テキスト: {transcribed_text[:100]}...",
                o="",
                a="システムエラーが発生しました",
                p="しばらくしてから再度お試しください"
            )

# --- Simple translation support ---
    def translate_text(self, text: str, target_lang: str = "en") -> str:
        """Translate text to target_lang using Gemini. Returns original on error."""
        if not text:
            return text
        try:
            prompt = (
                "You are a professional translator. Translate the following text "
                f"into {target_lang}. Return only the translated text without any extra commentary or quotes.\n\n"
                f"TEXT:\n{text}"
            )
            resp = self.model.generate_content(prompt)
            out = self._safe_get_response_text(resp)
            return out or text
        except Exception as e:
            print(f"[translate] failed: {e}")
            return text

# サービスインスタンスを返す関数を定義
_ai_service_instance = None
def get_ai_service() -> GoogleAIService:
    """
    シングルトンとしてGoogleAIServiceのインスタンスを返します。
    """
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = GoogleAIService()
    return _ai_service_instance

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
