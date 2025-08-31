import os
import google.generativeai as genai
from schemas import SoapNotes
import json
import re

# 環境変数からAPIキーを設定
GOOGLE_API_KEY = os.getenv("GOOGLE_GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_GEMINI_API_KEY environment variable not set.")
genai.configure(api_key=GOOGLE_API_KEY)

class GoogleAIService:
    """
    Google Gemini APIを使用して、テキストからSOAPノートを生成するサービスクラス。
    """
    def __init__(self, audio_service=None):
        """
        AIサービスを初期化し、Geminiモデルと生成設定を構成します。
        """
        # JSONモードを有効にするための設定
        self.generation_config = {
            "response_mime_type": "application/json",
        }
        self.model = genai.GenerativeModel(
            'gemini-1.5-flash-latest',
            generation_config=self.generation_config
        )

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
            print(f"生レスポンス: '{response.text}'")
            print(f"レスポンス長: {len(response.text)} 文字")
            
            # JSONモードを使用しているため、レスポンスは直接JSON文字列になる
            response_text = response.text.strip()
            
            print(f"=== JSONパース試行 ===")
            soap_dict = json.loads(response_text)
            print(f"パース成功: {soap_dict}")
            
            # Pydanticモデルにデータをロードして検証
            soap_notes = SoapNotes(**soap_dict)
            print(f"✅ SoapNotes作成成功: {soap_notes}")
            
            return soap_notes
                        
        except (json.JSONDecodeError, TypeError, ValueError) as e:
            print(f"❌ JSONパースまたはデータ検証エラー: {e}")
            print(f"Geminiからの生の応答: '{response.text if 'response' in locals() else 'N/A'}'")
            
            # エラー時もログを残して、デバッグ情報付きで返す
            return SoapNotes(
                s=f"JSONパースエラー: {str(e)}. 元テキスト: {transcribed_text[:100]}...",
                o=f"生レスポンス: {response.text[:200] if 'response' in locals() else 'N/A'}...",
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