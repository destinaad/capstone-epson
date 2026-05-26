import os

os.environ["QT_QPA_PLATFORM"] = "offscreen"

import hmac
import time
from typing import Optional
from uuid import UUID

import bcrypt
import cv2
import numpy as np
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from ultralytics import YOLO

import models
import schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "ml_models", "best")

_yolo_model: Optional[YOLO] = None


def _model_weights_ready() -> bool:
    return os.path.isdir(MODEL_DIR) and os.path.isfile(
        os.path.join(MODEL_DIR, "data.pkl")
    )


def get_yolo_model() -> YOLO:
    global _yolo_model
    if _yolo_model is None:
        if not _model_weights_ready():
            raise HTTPException(
                status_code=503,
                detail=(
                    f"YOLO weights not found at {MODEL_DIR}. "
                    "Place the ComVis model directory (data.pkl, version, .data/, etc.) in ml_models/best/."
                ),
            )
        _yolo_model = YOLO(MODEL_DIR)
    return _yolo_model


app = FastAPI(title="Epson QC System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.post(
    "/inspections/scan",
    response_model=schemas.InspectionResponse,
    tags=["Live AI Scan"],
)
async def scan_inspection_live(
    file: UploadFile = File(...),
    part_id: int = 1,
    operator_id: int = 1,
    shift: int = 1,
    actual_weight: float = 40.5,
    db: Session = Depends(get_db),
):
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File yang diunggah harus berupa gambar!",
        )

    part = db.query(models.Part).filter(models.Part.id == part_id).first()
    if not part:
        raise HTTPException(
            status_code=404,
            detail="Part ID tidak ditemukan di database.",
        )

    try:
        start_time = time.time()

        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(
                status_code=400,
                detail="Gambar tidak dapat dibaca. Pastikan file berformat JPEG/PNG.",
            )

        yolo = get_yolo_model()
        results = yolo(img)
        result = results[0]

        detected_quantity = len(result.boxes)
        confidences = (
            result.boxes.conf.tolist() if detected_quantity > 0 else [0.0]
        )
        ai_confidence_score = float(np.mean(confidences) * 100)
        process_duration = float(time.time() - start_time)

        discrepancy = detected_quantity - part.target_quantity
        status = "OK" if discrepancy == 0 else "NG"

        new_inspection = models.Inspection(
            part_id=part_id,
            operator_id=operator_id,
            detected_quantity=detected_quantity,
            actual_weight=actual_weight,
            image_url=None,
            ai_confidence_score=ai_confidence_score,
            process_duration=process_duration,
            shift=shift,
            status=status,
            discrepancy=discrepancy,
        )

        db.add(new_inspection)
        db.commit()
        db.refresh(new_inspection)
        return new_inspection

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Gagal memproses gambar AI: {str(e)}",
        )


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
