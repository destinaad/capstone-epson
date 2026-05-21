from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class InspectionCreate(BaseModel):
    part_id: int
    operator_id: int
    detected_quantity: int
    actual_weight: float
    image_url: Optional[str] = None
    ai_confidence_score: Optional[float] = None
    process_duration: Optional[float] = None
    shift: int


class InspectionResponse(BaseModel):
    id: UUID
    status: str
    discrepancy: int
    created_at: datetime

    class Config:
        from_attributes = True


class InspectionListItem(BaseModel):
    id: UUID
    part_id: Optional[int] = None
    operator_id: Optional[int] = None
    detected_quantity: int
    actual_weight: float
    status: Optional[str] = None
    discrepancy: Optional[int] = None
    image_url: Optional[str] = None
    ai_confidence_score: Optional[float] = None
    process_duration: Optional[float] = None
    updated_by: Optional[int] = None
    shift: Optional[int] = None
    created_at: datetime
    target_quantity: Optional[int] = None

    class Config:
        from_attributes = True


class InspectionUpdate(BaseModel):
    detected_quantity: Optional[int] = None
    actual_weight: Optional[float] = None
    status: Optional[str] = None
    updated_by: Optional[int] = None


class PartOut(BaseModel):
    id: int
    part_code: str
    part_name: str
    standard_weight: float
    target_quantity: int

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    user: UserOut
