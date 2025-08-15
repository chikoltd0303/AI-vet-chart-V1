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
        # レコードは動物に紐付けて管理する方がシンプル
        # self.records: Dict[str, Record] = {} # <- この管理はやめる

    def _get_gcp_credentials(self):
        """環境変数からサービスアカウントの資格情報を作成"""
        b64_str = os.getenv("GOOGLE_SERVICE_ACCOUNT_B64")
        if not b64_str:
            raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_B64 not set")

        data = base64.b64decode(b64_str)
        info = json.loads(data.decode("utf-8"))
        
        # ★★★【変更点 1】: スコープを読み書き可能に変更 ★★★
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
            # メモリに追加
            self.animals[animal.id] = animal
            print(f"インメモリに動物データを追加: {animal.name}")

            # ★★★【変更点 2】: Google Sheetsへの書き込み処理を追加 ★★★
            try:
                service = self._get_sheets_service()
                spreadsheet_id = os.getenv("SPREADSHEET_ID")
                
                # スプレッドシートに追加する行データを作成
                # スプレッドシートの列順に合わせる:
                # microchip_number, owner, name, age, sex, breed, thumbnailUrl
                row_data = [
                    animal.microchip_number,
                    animal.owner,
                    animal.name,
                    animal.age,
                    animal.sex,
                    animal.breed,
                    animal.thumbnailUrl
                ]

                # 'animals'シートの末尾に行を追加
                service.spreadsheets().values().append(
                    spreadsheetId=spreadsheet_id,
                    range="animals!A1",
                    valueInputOption="USER_ENTERED",
                    insertDataOption="INSERT_ROWS",
                    body={"values": [row_data]}
                ).execute()
                print(f"Google Sheetsに動物データを追加しました: {animal.name}")

            except Exception as e:
                # エラーが起きたらメモリからも削除して整合性を保つ
                del self.animals[animal.id]
                print(f"Google Sheetsへの動物データ書き込みでエラー: {e}")
                raise HTTPException(status_code=500, detail="Failed to save animal data to database.")

    def get_animal(self, animal_id: str):
        # レコードを動物オブジェクトに紐付ける
        animal = self.animals.get(animal_id)
        if animal:
             # この動物に関連するレコードを検索して追加
             animal.records = self.get_records_for_animal(animal_id)
        return animal

    def search_animals(self, query: str):
        q = query.lower()
        # 検索結果にもレコードを紐づける
        results = [a for a in self.animals.values() if q in a.name.lower() or (a.owner and q in a.owner.lower())]
        for animal in results:
            animal.records = self.get_records_for_animal(animal.id)
        return results

    def add_record(self, record: Record):
        """新しい診療記録をメモリとGoogle Sheetsに追加する"""
        animal = self.get_animal(record.animalId)
        if not animal:
            raise HTTPException(status_code=404, detail=f"Animal with ID {record.animalId} not found.")

        with _lock:
            # メモリに追加 (Animalオブジェクトのrecordsリストに追加)
            if not hasattr(animal, 'records'):
                animal.records = []
            animal.records.append(record)
            print(f"インメモリに記録データを追加: {record.id}")

            # ★★★【変更点 3】: Google Sheetsへの書き込み処理を追加 ★★★
            try:
                service = self._get_sheets_service()
                spreadsheet_id = os.getenv("SPREADSHEET_ID")

                # スプレッドシートに追加する行データを作成
                row_data = [
                    record.animalId,
                    record.id,
                    record.visit_date, # visit_dateはRecordモデルに追加する必要があるかも
                    record.soap.s,
                    record.soap.o,
                    record.soap.a,
                    record.soap.p,
                    ",".join(record.medication_history or []),
                    record.next_visit_date,
                    ",".join(record.images or []),
                    record.audioUrl
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
                animal.records.pop() # エラーが起きたらメモリからも削除
                print(f"Google Sheetsへの記録データ書き込みでエラー: {e}")
                raise HTTPException(status_code=500, detail="Failed to save record data to database.")


    def update_record(self, animal_id: str, record_id: str, record: Record):
        """★★★【変更点 4】: 記録の更新メソッドを新規追加 ★★★"""
        animal = self.get_animal(animal_id)
        if not animal:
            raise HTTPException(status_code=404, detail=f"Animal with ID {animal_id} not found.")

        with _lock:
            try:
                service = self._get_sheets_service()
                spreadsheet_id = os.getenv("SPREADSHEET_ID")
                
                # まず、更新対象の行が何行目にあるか探す (B列のrecord_idで検索)
                sheet_data = service.spreadsheets().values().get(
                    spreadsheetId=spreadsheet_id, range="records!B:B"
                ).execute().get("values", [])
                
                row_to_update = -1
                for i, row in enumerate(sheet_data):
                    if row and row[0] == record_id:
                        row_to_update = i + 1 # 1-based index
                        break
                
                if row_to_update == -1:
                    raise HTTPException(status_code=404, detail="Record not found in Google Sheets.")

                # 更新後の行データを作成
                updated_row_data = [
                    record.animalId, record.id, record.visit_date,
                    record.soap.s, record.soap.o, record.soap.a, record.soap.p,
                    ",".join(record.medication_history or []),
                    record.next_visit_date, ",".join(record.images or []), record.audioUrl
                ]

                # 特定の行を更新
                service.spreadsheets().values().update(
                    spreadsheetId=spreadsheet_id,
                    range=f"records!A{row_to_update}",
                    valueInputOption="USER_ENTERED",
                    body={"values": [updated_row_data]}
                ).execute()
                print(f"Google Sheetsの記録データを更新しました: {record_id}")
                
                # メモリ上のデータも更新
                for i, r in enumerate(animal.records):
                    if r.id == record_id:
                        animal.records[i] = record
                        break

            except Exception as e:
                print(f"Google Sheetsの記録データ更新でエラー: {e}")
                raise HTTPException(status_code=500, detail="Failed to update record data in database.")

    def get_records_for_animal(self, animal_id: str):
        # このメソッドはロード時にのみ使われるように変更
        # リアルタイムの取得はanimal.recordsから行う
        animal = self.animals.get(animal_id)
        if animal and hasattr(animal, 'records'):
            return animal.records
        return []

    def load_from_sheets(self):
        """Googleスプレッドシートからデータを読み込み、関連付けを行う"""
        print("Google Sheetsからデータを読み込み中...")
        service = self._get_sheets_service()
        spreadsheet_id = os.getenv("SPREADSHEET_ID")

        # 動物データを読み込み
        animals_data = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range="animals!A2:G"
        ).execute().get("values", [])
        
        temp_animals = {}
        for row in animals_data:
            if not row or not row[0]: continue
            animal = Animal(
                id=row[0], microchip_number=row[0], owner=row[1], name=row[2],
                age=int(row[3]) if len(row) > 3 and row[3] else None,
                sex=row[4] if len(row) > 4 else None,
                breed=row[5] if len(row) > 5 else None,
                thumbnailUrl=row[6] if len(row) > 6 else None,
                records=[] # 初期化
            )
            temp_animals[animal.id] = animal
        
        # 記録データを読み込み
        records_data = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range="records!A2:K"
        ).execute().get("values", [])

        for row in records_data:
            if not row or not row[0]: continue
            animal_id = row[0]
            if animal_id in temp_animals:
                record = Record(
                    animalId=animal_id, id=row[1], visit_date=row[2],
                    soap=SoapNotes(s=row[3], o=row[4], a=row[5], p=row[6]),
                    medication_history=row[7].split(",") if len(row) > 7 and row[7] else [],
                    next_visit_date=row[8] if len(row) > 8 else None,
                    images=row[9].split(",") if len(row) > 9 and row[9] else [],
                    audioUrl=row[10] if len(row) > 10 else None
                )
                temp_animals[animal_id].records.append(record)
        
        self.animals = temp_animals
        print(f"読み込み完了: {len(self.animals)}匹の動物データを関連付けました")


# デフォルトインスタンス
DB = InMemoryDB()