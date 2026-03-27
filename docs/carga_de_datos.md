# Guía de Carga de Datos Manuales

Como la base de datos es el "corazón" de Shift Log, la aplicación no sabrá qué responderte sobre tus horarios o tareas si primero no le enseñás cuáles son tus materias y a qué hora cursas. 

Existen tres formas recomendadas de poblar la base de datos ubicada en `data/shift_log.db`.

---

## 1. Vía Interfaz Web de la API (Recomendado)

FastAPI genera automáticamente una interfaz amigable (Swagger UI) para interactuar con la base de datos sin tocar código.

1. Asegurate de que el servidor esté corriendo (`python main.py`).
2. Abrí tu navegador en [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).
3. **Paso A: Crear la Materia**
   - Buscá el recuadro `POST /api/materias`.
   - Hacé clic en **"Try it out"**.
   - Editá el JSON con los datos de tu materia:
     ```json
     {
       "nombre": "Diseño de Interfaces",
       "institucion": "IES 6023",
       "anio": 3,
       "cuatrimestre": 1
     }
     ```
   - Hacé clic en **"Execute"**. En la respuesta, anotá el `"id"` que se generó (ejemplo: `id: 5`).
4. **Paso B: Asignarle un Horario**
   - Buscá el recuadro `POST /api/horarios`.
   - Hacé clic en **"Try it out"**.
   - Ingresá el `materia_id` que anotaste en el paso anterior y los horarios:
     ```json
     {
       "materia_id": 5,
       "dia": "lunes",
       "hora_inicio": "19:10",
       "hora_fin": "21:10",
       "aula": "Aula 2",
       "tipo": "teoria"
     }
     ```
   - Hacé clic en **"Execute"**. ¡Listo! Ya podés preguntarle al chat por esa materia.

---

## 2. Vía Script de Python

Si tenés muchas materias que cargar, es más rápido automatizarlo con un pequeño script. Podés crear un archivo llamado `cargar_cronograma.py` en la carpeta `backend/` con el siguiente código base:

```python
import sqlite3

# Conectar a la base de datos local
conn = sqlite3.connect('../data/shift_log.db')
cursor = conn.cursor()

# 1. Insertar la Materia
cursor.execute(
    "INSERT INTO materias (nombre, institucion, anio, cuatrimestre) VALUES (?, ?, ?, ?)",
    ("Programación Móvil", "IES 6023", 3, 1)
)
# Obtener el ID que se le asignó automáticamente a esta materia
materia_id = cursor.lastrowid

# 2. Insertar los Horarios (ej: cursamos esta materia martes y jueves)
dias_de_cursada = ["martes", "jueves"]

for dia in dias_de_cursada:
    cursor.execute(
        "INSERT INTO horarios (materia_id, dia, hora_inicio, hora_fin, aula, tipo) VALUES (?, ?, ?, ?, ?, ?)",
        (materia_id, dia, "21:10", "23:10", "Aula Virtual", "practica")
    )

conn.commit()
conn.close()
print("¡Cronograma cargado con éxito!")
```

Ejecutalo con `python cargar_cronograma.py` y los datos quedarán fijos en el sistema.

---

## 3. Vía Gestor Gráfico (DB Browser / DBeaver)

Si preferís trabajar con los datos como si fueran un archivo de Excel interactivo, podés editar la base de datos directamente usando un gestor de SQLite.

1. Descargá e instalá [DB Browser for SQLite](https://sqlitebrowser.org/).
2. Abrí la aplicación y tocá en **"Abrir base de datos"**.
3. Navegá hasta la carpeta de tu proyecto y seleccioná el archivo `data/shift_log.db`.
4. Ve a la pestaña **"Hoja de Datos"** (Browse Data).
5. Seleccioná la tabla `materias` y usá el botón de "Nueva fila" para agregar tus materias.
6. Hacé lo mismo en la tabla `horarios`, recordando poner en la columna `materia_id` el ID correspondiente a la materia que creaste.
7. Al terminar, hacé clic en **"Escribir cambios"** (Write Changes) en la barra superior para guardar permanentemente.
