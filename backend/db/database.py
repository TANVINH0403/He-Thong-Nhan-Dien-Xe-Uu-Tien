import sqlite3
import os
from datetime import datetime

DB_NAME = 'detections.db'

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Tạo bảng nếu chưa có
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vehicle_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_type TEXT,
            confidence REAL,
            timestamp TEXT,
            plate_id TEXT,
            image_path TEXT,
            status TEXT DEFAULT 'Chờ xử lý'
        )
    ''')
    conn.commit()
    conn.close()

def log_detection(vehicle_type, confidence, plate_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    now = datetime.now().strftime("%H:%M:%S %d/%m/%Y")
    cursor.execute("""
        INSERT INTO vehicle_logs (vehicle_type, confidence, timestamp, plate_id)
        VALUES (?, ?, ?, ?)
    """, (vehicle_type, confidence, now, plate_id))
    conn.commit()
    conn.close()

def get_recent_history(limit=50):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM vehicle_logs ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        result = []
        for row in rows:
            result.append({
                "id": row["id"],
                "type": row["vehicle_type"],
                "conf": row["confidence"],
                "time": row["timestamp"],
                "plate": row["plate_id"]
            })
        return result
    except:
        return []
    finally:
        conn.close()

def clear_history():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    try:
        # LỆNH HỦY DIỆT: Xóa sạch bảng và tạo lại
        cursor.execute("DROP TABLE IF EXISTS vehicle_logs")
        conn.commit()
        # Tạo lại bảng mới tinh
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vehicle_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vehicle_type TEXT,
                confidence REAL,
                timestamp TEXT,
                plate_id TEXT,
                image_path TEXT,
                status TEXT DEFAULT 'Chờ xử lý'
            )
        ''')
        conn.commit()
        print(f"Lỗi xóa DB: {e}")
    finally:
        conn.close()