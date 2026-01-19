import torch
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from inference_sdk import InferenceHTTPClient
# Fix lỗi Torch 2.6
from ultralytics.nn.tasks import DetectionModel
import torch.serialization
torch.serialization.add_safe_globals([DetectionModel, torch.nn.modules.container.Sequential])
orig_load = torch.load


from app.api import detections, analytics, sse
from app.db import models
from app.db.database import engine

# Khởi tạo DB bảng
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vehicle Priority System")


# infer on a local image

# Cho phép Frontend truy cập (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Hoặc địa chỉ cụ thể của React (http://localhost:3000)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Cấu hình Static Files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Kết nối Router
app.include_router(detections.router)
app.include_router(analytics.router)
app.include_router(sse.router)

@app.get("/")
def home():
    return {"message": "API is running in Modular mode!"}