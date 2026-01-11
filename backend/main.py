import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.upload import router as upload_router
from api.process import router as process_router
from api.websocket import router as ws_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/videos")
app.include_router(process_router, prefix="/videos")
app.include_router(ws_router)

@app.get("/")
def health():
    return {"status": "ok"}
