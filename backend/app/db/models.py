from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from .database import Base

class PriorityVehicleLog(Base):
    __tablename__ = "priority_logs"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_type = Column(String)     # AMBULANCE, FIRE TRUCK...
    confidence = Column(Float)        # Độ tin cậy (%)
    image_path = Column(String)       # Đường dẫn ảnh chụp trong thư mục static/snapshots/
    bbox = Column(String)             # Lưu tọa độ [x1, y1, x2, y2] dưới dạng string
    detected_at = Column(DateTime, default=datetime.now) # Thời gian phát hiện