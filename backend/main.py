from fastapi import FastAPI
from api.upload import router as upload_router
from api.websocket import router as ws_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Emergency Vehicle Detection Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(ws_router)

@app.get("/")
def root():
    return {"message": "Backend is running"}
