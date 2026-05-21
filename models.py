from sqlalchemy import Column, Integer, String, Float, ForeignKey, TIMESTAMP, text
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class Part(Base):
    __tablename__ = "parts"
    id = Column(Integer, primary_key=True, index=True)
    part_code = Column(String, unique=True, nullable=False)
    part_name = Column(String, nullable=False)
    vendor_name = Column(String)
    standard_weight = Column(Float, nullable=False)
    target_quantity = Column(Integer, nullable=False)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)

class Inspection(Base):
    __tablename__ = "inspections"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    part_id = Column(Integer, ForeignKey("parts.id", on_delete="CASCADE"))
    operator_id = Column(Integer, ForeignKey("users.id"))
    detected_quantity = Column(Integer, nullable=False)
    actual_weight = Column(Float, nullable=False)
    status = Column(String) # OK atau NG
    discrepancy = Column(Integer)
    image_url = Column(String)
    ai_confidence_score = Column(Float)
    process_duration = Column(Float)
    updated_by = Column(Integer, ForeignKey("users.id"))
    shift = Column(Integer)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))