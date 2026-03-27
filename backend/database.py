import sqlite3
import os

DATABASE_URL = os.path.join(os.path.dirname(__file__), "..", "data", "shift_log.db")

def init_db():
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()

    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    cursor.executescript('''
        CREATE TABLE IF NOT EXISTS materias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            institucion TEXT NOT NULL,
            anio INTEGER,
            cuatrimestre INTEGER,
            created_at DATETIME DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS horarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            materia_id INTEGER NOT NULL,
            dia TEXT NOT NULL,
            hora_inicio TEXT NOT NULL,
            hora_fin TEXT NOT NULL,
            aula TEXT,
            tipo TEXT DEFAULT 'teoria',
            FOREIGN KEY (materia_id) REFERENCES materias(id)
        );

        CREATE TABLE IF NOT EXISTS tareas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            materia_id INTEGER,
            titulo TEXT NOT NULL,
            tipo TEXT NOT NULL,
            estado TEXT DEFAULT 'pendiente',
            fecha_limite DATE,
            descripcion TEXT,
            prioridad TEXT DEFAULT 'media',
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (materia_id) REFERENCES materias(id)
        );
    ''')

    conn.commit()
    conn.close()
    print("Base de datos inicializada correctamente.")

def get_db_connection():
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    return conn

if __name__ == "__main__":
    init_db()
