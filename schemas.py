from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date

# 順番が重要なので、利用されるモデルを先に定義します

class SoapNotes(BaseModel):
    # database.pyのコードと合わせるため、s,o,a,pという名前にします
    # こちらの方が入力も楽になります
    s: Optional[str] = Field("", alias="subjective")
    o: Optional[str] = Field("", alias="objective")
    a: Optional[str] = Field("", alias="assessment")
    p: Optional[str] = Field("", alias="plan")

    class Config:
        allow_population_by_field_name = True # alias名でもデータを受け取れるようにする

class Record(BaseModel):
    id: str
    animalId: str
    soap: SoapNotes
    images: List[str] = []
    audioUrl: Optional[str] = None
    
    # ★ 以下の不足していたフィールドを追加
    visit_date: str = Field(default_factory=lambda: date.today().isoformat())
    medication_history: List[str] = []
    next_visit_date: Optional[str] = None
    
    # createdAtはFastAPIから返却する際に使われる想定
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class Animal(BaseModel):
    id: str
    name: str
    
    # ★ main.pyとの整合性のために追加
    microchip_number: str
    
    age: Optional[int] = None
    sex: Optional[str] = None
    breed: Optional[str] = None
    thumbnailUrl: Optional[str] = None
    owner: Optional[str] = None

    # ★ クラッシュの原因を修正
    records: List['Record'] = [] # Recordモデルのリストとして定義

class UploadResponse(BaseModel):
    url: str
    key: str

# Animalモデルが自身の定義内で'Record'を参照しているため、
# モデル定義の解決を行うために必要です。
Animal.update_forward_refs()