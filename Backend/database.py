# Backend/database.py
from typing import Dict, List
from schemas import Animal, Record, SoapNotes
import threading
import os
import base64
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from fastapi import HTTPException
import json

_lock = threading.Lock()

class InMemoryDB:
    def __init__(self):
        self.animals: Dict[str, Animal] = {}

    def _get_gcp_credentials(self):
        """環境変数からサービスアカウントの資格情報を作成"""
        b64_str = os.getenv("GOOGLE_SERVICE_ACCOUNT_B64")
        if not b64_str:
            raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_B64 not set")

        data = base64.b64decode(b64_str)
        info = json.loads(data.decode("utf-8"))
        
        creds = Credentials.from_service_account_info(
            info, scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        return creds

    def _get_sheets_service(self):
        """Google Sheets APIサービスを構築して返す"""
        creds = self._get_gcp_credentials()
        return build("sheets", "v4", credentials=creds)

    def add_animal(self, animal: Animal):
        """新しい動物データをメモリとGoogle Sheetsに追加する"""
        with _lock:
            self.animals[animal.id] = animal
            print(f"インメモリに動物データを追加: {animal.name}")

            try:
                service = self._get_sheets_service()
                spreadsheet_id = os.getenv("SPREADSHEET_ID")
                
                # スプレッドシートに追加する行データを作成
                # スプレッドシートの列順に合わせる:
                # microchip_number, farm_id, name, age, sex, breed, thumbnailUrl
                row_data = [
                    animal.microchip_number,
                    # ここを animal.farm_id に修正
                    # animal.owner を animal.farm_id に変更することで、フロントエンドとバックエンドのデータスキーマが一致します。
                    animal.farm_id, 
                    animal.name,
                    animal.age,
                    animal.sex,
                    animal.breed,
                    animal.thumbnailUrl.split('/')[-1], # URLからファイル名のみを抽出して保存
                    user_id   # 👈 ここを追加
                ]

                service.spreadsheets().values().append(
                    spreadsheetId=spreadsheet_id,
                    range="animals!A1",
                    valueInputOption="USER_ENTERED",
                    insertDataOption="INSERT_ROWS",
                    body={"values": [row_data]}
                ).execute()
                print(f"Google Sheetsに動物データを追加しました: {animal.name}")

            except Exception as e:
                del self.animals[animal.id]
                print(f"Google Sheetsへの動物データ書き込みでエラー: {e}")
                raise HTTPException(status_code=500, detail="Failed to save animal data to database.")

    def search_animals(self, query: str):
        q = query.lower()
        # a.ownerをa.farm_idに修正
        results = [a for a in self.animals.values() if q in a.name.lower() or (a.farm_id and q in a.farm_id.lower())]
        for animal in results:
            animal.records = self.get_records_for_animal(animal.id)
        return results
    # ここに新しいメソッドを追加
    def get_animal(self, animal_id: str) -> Animal | None:
        """指定されたanimal_idを持つ動物を取得する"""
        return self.animals.get(animal_id)

    def add_record(self, record: Record, user_id: str = "guest"):
            """新しい診療記録をメモリとGoogle Sheetsに追加する"""
            animal = self.get_animal(record.animalId)
            if not animal:
                raise HTTPException(status_code=404, detail=f"Animal with ID {record.animalId} not found.")

            with _lock:
                if not hasattr(animal, 'records'):
                    animal.records = []
                animal.records.append(record)
                print(f"インメモリに記録データを追加: {record.id}")

                try:
                    service = self._get_sheets_service()
                    spreadsheet_id = os.getenv("SPREADSHEET_ID")
                    
                    row_data = [
                        record.animalId,
                        record.id,
                        record.visit_date,
                        record.soap.s,
                        record.soap.o,
                        record.soap.a,
                        record.soap.p,
                        ",".join(record.medication_history or []),
                        record.next_visit_date,
                        ",".join(record.images or []),
                        record.audioUrl,
                        user_id
                    ]

                    service.spreadsheets().values().append(
                        spreadsheetId=spreadsheet_id,
                        range="records!A1",
                        valueInputOption="USER_ENTERED",
                        insertDataOption="INSERT_ROWS",
                        body={"values": [row_data]}
                    ).execute()
                    print(f"Google Sheetsに記録データを追加しました: {record.id}")

                except Exception as e:
                    animal.records.pop()
                    print(f"Google Sheetsへの記録データ書き込みでエラー: {e}")
                    raise HTTPException(status_code=500, detail="Failed to save record data to database.")

    def update_record(self, animal_id: str, record_id: str, record: Record):
        """記録の更新メソッド"""
        animal = self.get_animal(animal_id)
        if not animal:
            raise HTTPException(status_code=404, detail=f"Animal with ID {animal_id} not found.")

        with _lock:
            try:
                service = self._get_sheets_service()
                spreadsheet_id = os.getenv("SPREADSHEET_ID")
                
                sheet_data = service.spreadsheets().values().get(
                    spreadsheetId=spreadsheet_id, range="records!B:B"
                ).execute().get("values", [])
                
                row_to_update = -1
                for i, row in enumerate(sheet_data):
                    if row and row[0] == record_id:
                        row_to_update = i + 1
                        break
                
                if row_to_update == -1:
                    raise HTTPException(status_code=404, detail="Record not found in Google Sheets.")

                updated_row_data = [
                    record.animalId, record.id, record.visit_date,
                    record.soap.s, record.soap.o, record.soap.a, record.soap.p,
                    ",".join(record.medication_history or []),
                    record.next_visit_date, ",".join(record.images or []), record.audioUrl
                ]

                service.spreadsheets().values().update(
                    spreadsheetId=spreadsheet_id,
                    range=f"records!A{row_to_update}",
                    valueInputOption="USER_ENTERED",
                    body={"values": [updated_row_data]}
                ).execute()
                print(f"Google Sheetsの記録データを更新しました: {record_id}")
                
                for i, r in enumerate(animal.records):
                    if r.id == record_id:
                        animal.records[i] = record
                        break

            except Exception as e:
                print(f"Google Sheetsの記録データ更新でエラー: {e}")
                raise HTTPException(status_code=500, detail="Failed to update record data in database.")

    def get_records_for_animal(self, animal_id: str):
        animal = self.animals.get(animal_id)
        if animal and hasattr(animal, 'records'):
            return animal.records
        return []

    def load_from_sheets(self):
        """Googleスプレッドシートからデータを読み込み、関連付けを行う"""
        print("Google Sheetsからデータを読み込み中...")
        service = self._get_sheets_service()
        spreadsheet_id = os.getenv("SPREADSHEET_ID")
        temp_animals = {}
        
        try:
            # 動物データを読み込み
            animals_data = service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id, range="animals!A2:G"
            ).execute().get("values", [])
            
            print(f"animalsシートから {len(animals_data)} 行のデータを取得しました。")
            
            for i, row in enumerate(animals_data):
                try:
                    # 行の長さが足りない場合に備え、安全にデータを取得
                    animal_id = row[0] if len(row) > 0 else None
                    
                    # A列(animalID)が空の行はスキップ
                    if not animal_id: 
                        print(f"警告: animalsシートの行 {i+2} の animalID が空です。スキップします。")
                        continue
                    
                    farm_id = row[1] if len(row) > 1 else None
                    name = row[2] if len(row) > 2 else None

                    # nameが必須なので、nameがなければスキップ
                    if not name:
                        print(f"警告: animalID {animal_id} のデータに名前がありません。スキップします。")
                        continue

                    # ageの型変換でエラーが発生する可能性を考慮
                    age = int(row[3]) if len(row) > 3 and row[3].isdigit() else None
                    sex = row[4] if len(row) > 4 else None
                    breed = row[5] if len(row) > 5 else None
                    thumbnailUrl = row[6] if len(row) > 6 else None
                    
                    animal = Animal(
                        id=animal_id,
                        microchip_number=animal_id,
                        farm_id=farm_id,
                        name=name,
                        age=age,
                        sex=sex,
                        breed=breed,
                        thumbnailUrl=thumbnailUrl,
                        records=[]
                    )
                    temp_animals[animal.id] = animal
                
                except Exception as e:
                    print(f"エラー: animalsシートの行 {i+2} の処理中にエラーが発生しました: {e}")
                    continue

            # 記録データを読み込み
            records_data = service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id, range="records!A2:K"
            ).execute().get("values", [])
            
            print(f"recordsシートから {len(records_data)} 行のデータを取得しました。")

            for i, row in enumerate(records_data):
                try:
                    if not row or not row[0]: 
                        print(f"警告: recordsシートの行 {i+2} の animalId が空です。スキップします。")
                        continue
                    
                    animal_id = row[0]
                    if animal_id in temp_animals:
                        # SOAPNotesのデータが空の場合を考慮
                        soap = SoapNotes(
                            s=row[3] if len(row) > 3 else "",
                            o=row[4] if len(row) > 4 else "",
                            a=row[5] if len(row) > 5 else "",
                            p=row[6] if len(row) > 6 else ""
                        )
                        
                        record = Record(
                            animalId=animal_id,
                            id=row[1],
                            visit_date=row[2],
                            soap=soap,
                            medication_history=row[7].split(",") if len(row) > 7 and row[7] else [],
                            next_visit_date=row[8] if len(row) > 8 else None,
                            images=row[9].split(",") if len(row) > 9 and row[9] else [],
                            audioUrl=row[10] if len(row) > 10 else None
                        )
                        temp_animals[animal_id].records.append(record)
                    else:
                        print(f"警告: recordsシートの行 {i+2} の animalId ({animal_id}) が animalsシートに存在しません。")
                
                except Exception as e:
                    print(f"エラー: recordsシートの行 {i+2} の処理中にエラーが発生しました: {e}")
                    continue

            self.animals = temp_animals
            print(f"読み込み完了: {len(self.animals)}匹の動物データを関連付けました")

        except Exception as e:
            print(f"致命的なエラー: Google Sheetsからのデータ読み込みに失敗しました: {e}")
            self.animals = {}
            print("インメモリDBは空の状態で起動します。")

    def generate_summary(self, animal_id: str) -> str:
        """動物の診療記録を元にAIがサマリーを生成する（モック）"""
        records = self.get_records_for_animal(animal_id)
        if not records:
            return "この動物の過去の診療記録はありません。"
        
        summary_parts = []
        for record in records:
            soap_data = record.soap.model_dump()
            s = soap_data.get('s', 'データなし')
            o = soap_data.get('o', 'データなし')
            a = soap_data.get('a', 'データなし')
            p = soap_data.get('p', 'データなし')
            
            summary_parts.append(
                f"{record.visit_date}の記録: S({s}), O({o}), A({a}), P({p})"
            )
        
        full_summary = "\n".join(summary_parts)
        
        return f"過去の記録から以下の点が確認できます:\n{full_summary}"

# デフォルトインスタンス
DB = InMemoryDB()