from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Tên file database sẽ được tạo ngay trong thư mục app
SQLALCHEMY_DATABASE_URL = "sqlite:///./vehicle_detection.db"

# Khởi tạo engine (SQLite cần check_same_thread=False để chạy với FastAPI)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Hàm để lấy session làm việc (Dependency injection)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()