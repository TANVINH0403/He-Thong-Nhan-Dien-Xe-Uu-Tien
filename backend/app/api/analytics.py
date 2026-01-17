from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.db import models

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/logs")
def get_logs(db: Session = Depends(get_db)):
    return db.query(models.PriorityVehicleLog).order_by(models.PriorityVehicleLog.detected_at.desc()).all()

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    stats = db.query(
        models.PriorityVehicleLog.vehicle_type, 
        func.count(models.PriorityVehicleLog.id).label('total')
    ).group_by(models.PriorityVehicleLog.vehicle_type).all()
    return {item[0]: item[1] for item in stats}