import gspread
from google.oauth2.service_account import Credentials
import os

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SHEET_NAME = os.getenv("SHEET_NAME", "items")
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID")

credentials = Credentials.from_service_account_file(
    "service_account.json",
    scopes=SCOPES
)
gc = gspread.authorize(credentials)
sheet = gc.open_by_key(SPREADSHEET_ID).worksheet(SHEET_NAME)

def get_all_items():
    return sheet.get_all_records()

def add_item(name: str):
    sheet.append_row([name])
    return {"message": f"'{name}' を追加しました"}
