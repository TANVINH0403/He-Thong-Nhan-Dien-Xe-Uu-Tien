import sqlite3
import os
from datetime import datetime

DB_NAME = 'detections.db'

def init_db():
    """Khởi tạo database và bảng history nếu chưa có"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_type TEXT,
            confidence REAL,
            timestamp TEXT,
            image_path TEXT,
            status TEXT DEFAULT 'Chờ xử lý'
        )
    ''')
    conn.commit()
    conn.close()
    print("✅ Database initialized!")

def log_detection(vehicle_type, confidence, image_path):
    """Lưu thông tin xe phát hiện vào DB"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    now = datetime.now().strftime("%H:%M:%S %d-%m-%Y")

    cursor.execute("""
        INSERT INTO history (vehicle_type, confidence, timestamp, image_path)
        VALUES (?, ?, ?, ?)
    """, (vehicle_type, confidence, now, image_path))

    conn.commit()
    conn.close()
    return now

def get_recent_history(limit=10):
    """Lấy danh sách xe vừa phát hiện để hiển thị lên Web"""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM history ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]