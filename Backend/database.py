from typing import Dict, List, Optional, Tuple
from schemas import Animal, Record, SoapNotes
import threading
import os
import base64
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from fastapi import HTTPException
import json

_lock = threading.Lock()
DEV_MODE = (os.getenv("LOCAL_DEV", "0") == "1")
# Sheets 譖ｸ縺崎ｾｼ縺ｿ螟ｱ謨玲凾縺ｮ謇ｱ縺・ｼ域里螳・ 蜴ｳ譬ｼ縺ｧ縺ｪ縺・= 繝｡繝｢繝ｪ菫晏ｭ倥ｒ邯ｭ謖・ｼ・STRICT_SHEETS_WRITE = (os.getenv("STRICT_SHEETS_WRITE", "0") == "1")
# Allow overriding sheet tab names via env
ANIMALS_TAB = os.getenv("SHEETS_TAB_ANIMALS", "animals")
RECORDS_TAB = os.getenv("SHEETS_TAB_RECORDS", "records")


def _get_gcp_credentials():
    """Obtain Google credentials.
    Priority:
    1) GOOGLE_SERVICE_ACCOUNT_B64 (base64-encoded JSON)
    2) GOOGLE_APPLICATION_CREDENTIALS or local 'service_account.json' file
    """
    b64_str = os.getenv("GOOGLE_SERVICE_ACCOUNT_B64")
    if b64_str:
        data = base64.b64decode(b64_str)
        info = json.loads(data.decode("utf-8"))
        creds = Credentials.from_service_account_info(
            info,
            scopes=["https://www.googleapis.com/auth/spreadsheets"],
        )
        return creds

    # Fallback to file path
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or "service_account.json"
    if os.path.exists(cred_path):
        creds = Credentials.from_service_account_file(
            cred_path,
            scopes=["https://www.googleapis.com/auth/spreadsheets"],
        )
        return creds

    raise RuntimeError("No Google service account credentials found. Set GOOGLE_SERVICE_ACCOUNT_B64 or provide service_account.json")


def _get_sheets_service():
    if DEV_MODE:
        raise RuntimeError("LOCAL_DEV=1: Sheets service disabled")
    creds = _get_gcp_credentials()
    return build("sheets", "v4", credentials=creds)


class InMemoryDB:
    def __init__(self):
        self.animals: Dict[str, Animal] = {}

    # Animals
    def add_animal(self, animal: Animal):
        with _lock:
            self.animals[animal.id] = animal
            if DEV_MODE:
                return
                # 繧ｹ繧ｭ繝・・: 繝ｭ繝ｼ繧ｫ繝ｫ縺ｧ縺ｯSheets縺ｫ譖ｸ縺崎ｾｼ縺ｾ縺ｪ縺・                return
            try:
                service = _get_sheets_service()
                spreadsheet_id = os.getenv("SPREADSHEET_ID")
                thumb = ""
                if getattr(animal, "thumbnailUrl", None):
                    try:
                        thumb = str(animal.thumbnailUrl).split("/")[-1]
                    except Exception:
                        thumb = str(animal.thumbnailUrl)
                row = [
                    animal.microchip_number,
                    getattr(animal, "farm_id", None),
                    animal.name,
                    getattr(animal, "age", None),
                    getattr(animal, "sex", None),
                    getattr(animal, "breed", None),
                    thumb,
                ]
                service.spreadsheets().values().append(
                    spreadsheetId=spreadsheet_id,
                    range=f"{ANIMALS_TAB}!A1",
                    valueInputOption="USER_ENTERED",
                    insertDataOption="INSERT_ROWS",
                    body={"values": [row]},
                ).execute()
            except Exception as e:
                # Sheets 譖ｸ縺崎ｾｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｦ繧ゅ∵里螳壹〒縺ｯ繝｡繝｢繝ｪ菫晏ｭ倥ｒ邯ｭ謖・                print(f"Failed to write animal to Sheets: {e}")
                if STRICT_SHEETS_WRITE:
                    try:
                        del self.animals[animal.id]
                    except Exception:
                        pass
                    raise HTTPException(status_code=500, detail="Failed to save animal data to database (Sheets write error).")

    def search_animals(self, query: str):
        q = (query or "").lower()
        results = [
            a for a in self.animals.values()
            if q in a.name.lower() or (getattr(a, "farm_id", None) and q in a.farm_id.lower())
        ]
        for animal in results:
            animal.records = self.get_records_for_animal(animal.id)
        return results

    def get_animal(self, animal_id: str) -> Optional[Animal]:
        return self.animals.get(animal_id)

    # Records
    def add_record(self, record: Record):
        animal = self.get_animal(record.animalId)
        if not animal:
            raise HTTPException(status_code=404, detail=f"Animal with ID {record.animalId} not found.")
        with _lock:
            if not hasattr(animal, "records"):
                animal.records = []
            animal.records.append(record)
            if DEV_MODE:
                return
            try:
                service = _get_sheets_service()
                spreadsheet_id = os.getenv("SPREADSHEET_ID")
                row = [
                    record.animalId,
                    record.id,
                    record.visit_date,
                    record.soap.s,
                    record.soap.o,
                    record.soap.a,
                    record.soap.p,
                    ",".join(record.medication_history or []),
                    record.next_visit_date,
                    getattr(record, 'next_visit_time', None),
                    ",".join(record.images or []),
                    record.audioUrl,
                    getattr(record, 'doctor', None),
                ]
                service.spreadsheets().values().append(
                    spreadsheetId=spreadsheet_id,
                    range=f"{RECORDS_TAB}!A1",
                    valueInputOption="USER_ENTERED",
                    insertDataOption="INSERT_ROWS",
                    body={"values": [row]},
                ).execute()
            except Exception as e:
                # Sheets 譖ｸ縺崎ｾｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｦ繧ゅ∵里螳壹〒縺ｯ繝｡繝｢繝ｪ菫晏ｭ倥ｒ邯ｭ謖・                print(f"Failed to write record to Sheets: {e}")
                if STRICT_SHEETS_WRITE:
                    try:
                        animal.records.pop()
                    except Exception:
                        pass
                    raise HTTPException(status_code=500, detail="Failed to save record data to database (Sheets write error).")

    def find_record(self, record_id: str) -> Tuple[Optional[str], Optional[Record], int]:
        for animal_id, animal in self.animals.items():
            if hasattr(animal, "records") and animal.records:
                for idx, rec in enumerate(animal.records):
                    if getattr(rec, "id", None) == record_id:
                        return animal_id, rec, idx
        return None, None, -1

    def update_record_by_id(self, record_id: str, new_record: Record) -> Record:
        animal_id, old, idx = self.find_record(record_id)
        if not old:
            raise HTTPException(status_code=404, detail="Record not found")
        try:
            service = _get_sheets_service()
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
            updated = [
                new_record.animalId, new_record.id, new_record.visit_date,
                new_record.soap.s, new_record.soap.o, new_record.soap.a, new_record.soap.p,
                ",".join(new_record.medication_history or []),
                new_record.next_visit_date,
                getattr(new_record, 'next_visit_time', None),
                ",".join(new_record.images or []),
                new_record.audioUrl,
                getattr(new_record, 'doctor', None),
            ]
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"records!A{row_to_update}",
                valueInputOption="USER_ENTERED",
                body={"values": [updated]},
            ).execute()
            # in-memory update
            self.animals[animal_id].records[idx] = new_record
            return new_record
        except Exception as e:
            print(f"Failed to update record in Sheets: {e}")
            raise HTTPException(status_code=500, detail="Failed to update record data in database.")

    def delete_record_by_id(self, record_id: str) -> bool:
        animal_id, old, idx = self.find_record(record_id)
        if not old:
            raise HTTPException(status_code=404, detail="Record not found")
        try:
            service = _get_sheets_service()
            spreadsheet_id = os.getenv("SPREADSHEET_ID")
            sheet_data = service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id, range="records!B:B"
            ).execute().get("values", [])
            row_to_clear = -1
            for i, row in enumerate(sheet_data):
                if row and row[0] == record_id:
                    row_to_clear = i + 1
                    break
            if row_to_clear == -1:
                raise HTTPException(status_code=404, detail="Record not found in Google Sheets.")
            service.spreadsheets().values().clear(
                spreadsheetId=spreadsheet_id,
                range=f"{RECORDS_TAB}!A{row_to_clear}:M{row_to_clear}"
            ).execute()
            # in-memory removal
            self.animals[animal_id].records.pop(idx)
            return True
        except Exception as e:
            print(f"Failed to delete record in Sheets: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete record data in database.")

    def get_records_for_animal(self, animal_id: str):
        animal = self.animals.get(animal_id)
        if animal and hasattr(animal, "records"):
            return animal.records
        return []

    def load_from_sheets(self):
        if DEV_MODE:
            print("LOCAL_DEV=1: Skip loading data from Google Sheets. Start with empty DB.")
            self.animals = {}
            return
        print("Loading data from Google Sheets...")
        service = _get_sheets_service()
        spreadsheet_id = os.getenv("SPREADSHEET_ID")
        temp_animals: Dict[str, Animal] = {}
        # animals
        animals_data = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range=f"{ANIMALS_TAB}!A2:G"
        ).execute().get("values", [])
        print(f"animals rows: {len(animals_data)}")
        for i, row in enumerate(animals_data):
            try:
                animal_id = row[0] if len(row) > 0 else None
                if not animal_id:
                    continue
                farm_id = row[1] if len(row) > 1 else None
                name = row[2] if len(row) > 2 else None
                if not name:
                    continue
                age = None
                if len(row) > 3:
                    try:
                        age = int(row[3]) if str(row[3]).isdigit() else None
                    except Exception:
                        age = None
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
                    records=[],
                )
                temp_animals[animal.id] = animal
            except Exception:
                continue
        # records
        records_data = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range=f"{RECORDS_TAB}!A2:M"
        ).execute().get("values", [])
        print(f"records rows: {len(records_data)}")
        for row in records_data:
            try:
                if not row or not row[0]:
                    continue
                animal_id = row[0]
                if animal_id not in temp_animals:
                    continue
                soap = SoapNotes(
                    s=row[3] if len(row) > 3 else "",
                    o=row[4] if len(row) > 4 else "",
                    a=row[5] if len(row) > 5 else "",
                    p=row[6] if len(row) > 6 else "",
                )
                record = Record(
                    animalId=animal_id,
                    id=row[1],
                    visit_date=row[2],
                    soap=soap,
                    medication_history=row[7].split(",") if len(row) > 7 and row[7] else [],
                    next_visit_date=row[8] if len(row) > 8 else None,
                    next_visit_time=row[9] if len(row) > 9 else None,
                    images=row[10].split(",") if len(row) > 10 and row[10] else [],
                    audioUrl=row[11] if len(row) > 11 else None,
                )
                try:
                    if len(row) > 12 and row[12]:
                        setattr(record, 'doctor', row[12])
                except Exception:
                    pass
                temp_animals[animal_id].records.append(record)
            except Exception:
                continue
        self.animals = temp_animals
        print(f"Loaded animals: {len(self.animals)}; with records: {sum(len(getattr(a,'records',[]) or []) for a in self.animals.values())}")

    def generate_summary(self, animal_id: str) -> str:
        records = self.get_records_for_animal(animal_id)
        if not records:
            return "縺薙・蜍慕黄縺ｮ驕主悉縺ｮ險ｺ逋りｨ倬鹸縺ｯ縺ゅｊ縺ｾ縺帙ｓ"
        parts: List[str] = []
        for r in records:
            s = r.soap.s
            o = r.soap.o
            a = r.soap.a
            p = r.soap.p
            parts.append(f"{r.visit_date}: S({s}), O({o}), A({a}), P({p})")
        return "\n".join(parts)


# Default instance
DB = InMemoryDB()
