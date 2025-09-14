from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date

# 順番が重要なので、利用されるモデルを先に定義します

class SoapNotes(BaseModel):
    # database.pyのコードと合わせるため、s,o,a,pという名前にします
    # こちらの方が入力も楽になります
    s: str = ""
    o: str = ""
    a: str = ""
    p: str = ""

    class Config:
        allow_population_by_field_name = True # alias名でもデータを受け取れるようにする

class Record(BaseModel):
    id: str
    animalId: str
    soap: SoapNotes
    images: List[str] = []
    audioUrl: Optional[str] = None
    # medications: 構造化された投薬情報
    class MedicationEntry(BaseModel):
        name: str
        dose: Optional[str] = None
        route: Optional[str] = None

    medications: Optional[List[MedicationEntry]] = []
    
    # ★ 以下の不足していたフィールドを追加
    visit_date: str = Field(default_factory=lambda: date.today().isoformat())
    medication_history: List[str] = []
    next_visit_date: Optional[str] = None
    next_visit_time: Optional[str] = None
    doctor: Optional[str] = None
    # NOSAI オプション点数
    nosai_points: Optional[int] = None
    # 外部受付連携用（将来拡張）
    external_case_id: Optional[str] = None
    external_ref_url: Optional[str] = None
    
    # createdAtはFastAPIから返却する際に使われる想定
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class Animal(BaseModel):
    id: str
    name: str
    
    microchip_number: str
    
    # ownerをfarm_idに変更
    farm_id: Optional[str] = None
    
    age: Optional[int] = None
    sex: Optional[str] = None
    breed: Optional[str] = None
    thumbnailUrl: Optional[str] = None

    # recordsはそのまま
    records: List['Record'] = []

class Appointment(BaseModel):
    """予約情報のモデル"""
    id: str
    microchip_number: str
    animal_name: str
    farm_id: Optional[str] = None
    date: str
    time: str
    description: Optional[str] = None
    doctor: Optional[str] = None

class UploadResponse(BaseModel):
    url: Optional[str] = None
    key: Optional[str] = None
    message: Optional[str] = None

# Animalモデルが自身の定義内で'Record'を参照しているため、
# モデル定義の解決を行うために必要です。
Animal.update_forward_refs()

# FastAPIのGET /api/animals/{animal_id}エンドポイントのレスポンスモデル
# このレスポンスは、動物の詳細、診療記録、AIによるサマリーを含む
class AnimalDetailData(BaseModel):
    animal: Animal
    records: List[Record]
    summary: str
