import os
import base64
import json
import pytz
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, Dict, List, Union

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from pydantic import BaseModel, Field

class GenericCalendarProvider(str, Enum):
    GOOGLE_CALENDAR = "google_calendar"

class CalendarEvent(BaseModel):
    title: str = Field(..., description="イベントのタイトル")
    start_date: str = Field(..., description="イベントの開始日時（ISO 8601形式、YYYY-MM-DD HH:MM形式、またはYYYY-MM-DD形式）")
    end_date: Optional[str] = Field(None, description="イベントの終了日時。指定しない場合はduration_minutesが使用されます")
    description: Optional[str] = Field(None, description="イベントの詳細な説明")
    duration_minutes: int = Field(60, description="イベントの長さ（分）。end_dateが指定されていない場合に使用")

def _get_gcp_credentials() -> Credentials:
    """環境変数からサービスアカウントの資格情報を作成"""
    b64_str = os.getenv("GOOGLE_SERVICE_ACCOUNT_B64")
    if not b64_str:
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_B64 environment variable not set")

    try:
        data = base64.b64decode(b64_str)
        info = json.loads(data.decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as e:
        raise RuntimeError(f"Failed to decode GOOGLE_SERVICE_ACCOUNT_B64: {e}")
    
    creds = Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/calendar"]
    )
    return creds

def _get_calendar_service():
    """Google Calendar APIサービスを構築して返す"""
    creds = _get_gcp_credentials()
    return build("calendar", "v3", credentials=creds)

def _parse_datetime(date_str: str) -> datetime:
    """日時文字列を解析してdatetimeオブジェクトを返す"""
    jst = pytz.timezone('Asia/Tokyo')
    
    try:
        if "T" in date_str:
            # ISO形式: 2025-08-07T15:00:00 or 2025-08-07T15:00
            dt = datetime.fromisoformat(date_str.replace("T", " "))
        elif " " in date_str:
            # スペース区切り: 2025-08-07 15:00
            dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M")
        else:
            # 日付のみ: 2025-08-07（デフォルト時間を10:00に設定）
            dt = datetime.strptime(f"{date_str} 10:00", "%Y-%m-%d %H:%M")
        
        # タイムゾーンがなければJSTとして扱う
        if dt.tzinfo is None:
            dt = jst.localize(dt)
            
        return dt
    except ValueError as e:
        raise ValueError(f"Invalid date format '{date_str}': {e}")

def create_calendar_event(
    title: str,
    start_date: str,
    description: Optional[str] = None,
    provider: GenericCalendarProvider = GenericCalendarProvider.GOOGLE_CALENDAR,
    duration_minutes: int = 60,
    end_date: Optional[str] = None
) -> Dict[str, Union[str, bool]]:
    """
    カレンダーイベントを作成する
    
    Args:
        title: イベントのタイトル
        start_date: 開始日時（ISO形式、YYYY-MM-DD HH:MM形式、またはYYYY-MM-DD形式）
        description: イベントの説明
        provider: カレンダープロバイダー
        duration_minutes: イベントの長さ（分）。end_dateが指定されていない場合に使用
        end_date: 終了日時。指定されない場合はstart_date + duration_minutesが使用される
    
    Returns:
        Dict: 作成結果の情報
    """
    if provider != GenericCalendarProvider.GOOGLE_CALENDAR:
        return {
            "status": "error", 
            "message": f"Unsupported calendar provider: {provider}",
            "success": False
        }
    
    try:
        service = _get_calendar_service()
        
        # 開始日時の解析
        start_datetime = _parse_datetime(start_date)
        
        # 終了日時の設定
        if end_date:
            end_datetime = _parse_datetime(end_date)
        else:
            end_datetime = start_datetime + timedelta(minutes=duration_minutes)
        
        # カレンダーIDの取得
        calendar_id = os.getenv("GOOGLE_CALENDAR_ID", "primary")
        
        # イベントの作成
        event = {
            'summary': title,
            'description': description or "",
            'start': {
                'dateTime': start_datetime.isoformat(),
                'timeZone': 'Asia/Tokyo',
            },
            'end': {
                'dateTime': end_datetime.isoformat(),
                'timeZone': 'Asia/Tokyo',
            },
        }
        
        # プライマリまたは指定されたカレンダーにイベントを作成
        created_event = service.events().insert(calendarId=calendar_id, body=event).execute()
        
        return {
            "status": "success",
            "message": "Calendar event created successfully",
            "event_id": created_event.get('id'),
            "html_link": created_event.get('htmlLink'),
            "success": True
        }
        
    except HttpError as error:
        error_msg = f"Google Calendar API error: {error}"
        print(error_msg)
        return {"status": "error", "message": error_msg, "success": False}
    except ValueError as error:
        error_msg = f"Date parsing error: {error}"
        print(error_msg)
        return {"status": "error", "message": error_msg, "success": False}
    except RuntimeError as error:
        error_msg = f"Credential error: {error}"
        print(error_msg)
        return {"status": "error", "message": error_msg, "success": False}
    except Exception as error:
        error_msg = f"Unexpected error: {error}"
        print(error_msg)
        return {"status": "error", "message": error_msg, "success": False}

def list_upcoming_events(max_results: int = 10) -> List[Dict]:
    """
    今後の予定を取得する
    
    Args:
        max_results: 取得する最大件数
    
    Returns:
        List[Dict]: イベントのリスト
    """
    try:
        service = _get_calendar_service()
        calendar_id = os.getenv("GOOGLE_CALENDAR_ID", "primary")
        
        # 現在時刻からの今後の予定を取得
        now = datetime.utcnow().isoformat() + 'Z'
        
        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=now,
            maxResults=max_results,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        if not events:
            print('今後の予定はありません。')
            return []
        
        return events
        
    except Exception as error:
        print(f"予定取得エラー: {error}")
        return []

# Pydanticモデルを使用した関数
def create_calendar_event_with_model(event: CalendarEvent) -> Dict[str, Union[str, bool]]:
    """
    Pydanticモデルを使用してカレンダーイベントを作成する
    
    Args:
        event: CalendarEventモデル
    
    Returns:
        Dict: 作成結果の情報
    """
    return create_calendar_event(
        title=event.title,
        start_date=event.start_date,
        description=event.description,
        duration_minutes=event.duration_minutes,
        end_date=event.end_date
    )