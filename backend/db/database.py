import sqlite3
from datetime import datetime

def init_db():
    conn = sqlite3.connect('detections.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history 
        (id INTEGER PRIMARY KEY AUTOINCREMENT, 
         vehicle_type TEXT, 
         timestamp TEXT)
    ''')
    conn.commit()
    conn.close()

def log_detection(vehicle_type):
    conn = sqlite3.connect('detections.db')
    cursor = conn.cursor()
    now = datetime.now().strftime("%H:%M:%S %d-%m-%Y")
    cursor.execute("INSERT INTO history (vehicle_type, timestamp) VALUES (?, ?)", 
                   (vehicle_type, now))
    conn.commit()
    conn.close()
    return now