import hmac
from typing import Optional
from uuid import UUID

import bcrypt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Epson QC System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Mengizinkan semua domain
    allow_credentials=True,
    allow_methods=["*"],  # Mengizinkan semua metode 
    allow_headers=["*"],  # Mengizinkan semua jenis headers
)


def verify_password(plain: str, stored_hash: str) -> bool:
    if stored_hash.startswith("$2"):
        try:
            return bcrypt.checkpw(
                plain.encode("utf-8"),
                stored_hash.encode("utf-8"),
            )
        except ValueError:
            return False
    return hmac.compare_digest(plain, stored_hash)


def inspection_to_list_item(
    insp: models.Inspection, target_quantity: Optional[int]
) -> schemas.InspectionListItem:
    return schemas.InspectionListItem(
        id=insp.id,
        part_id=insp.part_id,
        operator_id=insp.operator_id,
        detected_quantity=insp.detected_quantity,
        actual_weight=insp.actual_weight,
        status=insp.status,
        discrepancy=insp.discrepancy,
        image_url=insp.image_url,
        ai_confidence_score=insp.ai_confidence_score,
        process_duration=insp.process_duration,
        updated_by=insp.updated_by,
        shift=insp.shift,
        created_at=insp.created_at,
        target_quantity=target_quantity,
    )


@app.post("/auth/login", response_model=schemas.LoginResponse)
def login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(models.User.username == body.username)
        .first()
    )
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return schemas.LoginResponse(
        user=schemas.UserOut(
            id=user.id, username=user.username, role=user.role
        )
    )


@app.get("/parts/", response_model=list[schemas.PartOut])
def list_parts(db: Session = Depends(get_db)):
    return db.query(models.Part).order_by(models.Part.id).all()


@app.get("/inspections/", response_model=list[schemas.InspectionListItem])
def list_inspections(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Inspection, models.Part.target_quantity)
        .outerjoin(models.Part, models.Inspection.part_id == models.Part.id)
        .order_by(models.Inspection.created_at.desc())
        .all()
    )
    return [
        inspection_to_list_item(insp, tq) for insp, tq in rows
    ]


@app.post("/inspections/", response_model=schemas.InspectionResponse)
def create_inspection(
    data: schemas.InspectionCreate, db: Session = Depends(get_db)
):
    part = db.query(models.Part).filter(models.Part.id == data.part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part tidak ditemukan")

    discrepancy = data.detected_quantity - part.target_quantity
    status = "OK" if discrepancy == 0 else "NG"

    payload = data.dict() if hasattr(data, "dict") else data.model_dump()
    new_inspection = models.Inspection(
        **payload,
        status=status,
        discrepancy=discrepancy,
    )

    db.add(new_inspection)
    db.commit()
    db.refresh(new_inspection)
    return new_inspection


@app.patch(
    "/inspections/{inspection_id}",
    response_model=schemas.InspectionListItem,
)
def update_inspection(
    inspection_id: UUID,
    body: schemas.InspectionUpdate,
    db: Session = Depends(get_db),
):
    insp = (
        db.query(models.Inspection)
        .filter(models.Inspection.id == inspection_id)
        .first()
    )
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")

    if body.detected_quantity is not None:
        insp.detected_quantity = body.detected_quantity
    if body.actual_weight is not None:
        insp.actual_weight = body.actual_weight
    if body.status is not None:
        insp.status = body.status
    if body.updated_by is not None:
        insp.updated_by = body.updated_by

    part = (
        db.query(models.Part).filter(models.Part.id == insp.part_id).first()
        if insp.part_id
        else None
    )
    if part:
        insp.discrepancy = insp.detected_quantity - part.target_quantity
        if body.status is None and body.detected_quantity is not None:
            insp.status = "OK" if insp.discrepancy == 0 else "NG"

    db.commit()
    db.refresh(insp)
    tq = part.target_quantity if part else None
    return inspection_to_list_item(insp, tq)
