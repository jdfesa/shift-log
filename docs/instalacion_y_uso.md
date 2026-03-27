# Guía de Instalación y Uso

## Requisitos previos

| Requisito | Versión mínima | Para qué |
|---|---|---|
| **Python** | 3.10+ | Backend (FastAPI, SQLite) |
| **Ollama** | Última | Motor de LLM local |
| **Navegador web** | Cualquiera moderno | Frontend |

### Verificar Python

```bash
python3 --version
# Python 3.10.x o superior
```

### Instalar Ollama

Descargar desde [ollama.com](https://ollama.com) e instalar siguiendo las instrucciones del sistema operativo.

Verificar que esté instalado:

```bash
ollama --version
```

---

## Instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/jdfesa/shift-log.git
cd shift-log
```

### 2. Crear entorno virtual

```bash
python3 -m venv venv
source venv/bin/activate
```

> **Nota:** Cada vez que abras una terminal nueva, tenés que activar el entorno virtual con `source venv/bin/activate`.

### 3. Instalar dependencias

```bash
pip install -r backend/requirements.txt
```

**Dependencias instaladas:**

| Paquete | Uso |
|---|---|
| `fastapi` | Framework web (API) |
| `uvicorn` | Servidor ASGI |
| `pydantic` | Validación de datos |
| `httpx` | Cliente HTTP async (para Ollama) |
| `python-multipart` | Soporte para form data |

### 4. Descargar un modelo de Ollama

```bash
# Recomendado para uso general (3.8B, ~3 GB RAM):
ollama pull phi3:mini

# Alternativa ultra liviana (2B, ~2 GB RAM):
ollama pull gemma2:2b

# Alternativa más capaz (7B, ~5 GB RAM):
ollama pull mistral
```

### 5. Iniciar Ollama

En una terminal separada:

```bash
ollama serve
```

> **Nota:** Si Ollama ya está corriendo como servicio del sistema, este paso no es necesario.

### 6. Iniciar Shift Log

```bash
cd backend
python main.py
```

Deberías ver:

```
Base de datos inicializada correctamente.
🚀 Shift Log corriendo en http://127.0.0.1:8000
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 7. Abrir en el navegador

Ir a **http://127.0.0.1:8000**

---

## Configuración

El archivo `backend/config.py` contiene toda la configuración. También se puede configurar mediante variables de entorno:

| Variable | Default | Descripción |
|---|---|---|
| `SHIFT_LOG_HOST` | `127.0.0.1` | Host del servidor. Cambiar a `0.0.0.0` para acceso en red |
| `SHIFT_LOG_PORT` | `8000` | Puerto del servidor |
| `OLLAMA_URL` | `http://localhost:11434` | URL del servidor Ollama |
| `OLLAMA_MODEL` | `phi3:mini` | Modelo a utilizar |

**Cambiar el modelo:**

```bash
# Variable de entorno
OLLAMA_MODEL=mistral python main.py

# O editar config.py directamente
```

---

## Primeros pasos: Cargar datos del semestre

Antes de usar el chat, hay que cargar las materias y horarios. Hay dos formas:

### Opción 1: Swagger UI (recomendado)

1. Ir a **http://127.0.0.1:8000/docs**
2. Expandir `POST /api/materias` → "Try it out"
3. Pegar el JSON de la materia y ejecutar
4. Repetir con `POST /api/horarios` para cada bloque horario

### Opción 2: curl

```bash
# Crear una materia
curl -X POST http://127.0.0.1:8000/api/materias \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Algoritmos y Estructuras de Datos", "institucion": "UNSa", "anio": 2026, "cuatrimestre": 1}'

# Agregar horario
curl -X POST http://127.0.0.1:8000/api/horarios \
  -H "Content-Type: application/json" \
  -d '{"materia_id": 1, "dia": "lunes", "hora_inicio": "08:00", "hora_fin": "10:00", "aula": "Aula 3B", "tipo": "teoria"}'

# Crear una tarea
curl -X POST http://127.0.0.1:8000/api/tareas \
  -H "Content-Type: application/json" \
  -d '{"titulo": "TP2 - Listas enlazadas", "tipo": "tp", "fecha_limite": "2026-04-15", "prioridad": "alta"}'
```

---

## Uso del chat

Una vez cargados los datos, simplemente escribí en el chat:

### Consultar horarios

```
¿Qué clases tengo hoy?
¿Qué tengo los lunes?
Mostrame mis horarios
```

### Consultar tareas

```
¿Qué tengo pendiente?
¿Qué tareas tengo esta semana?
¿Tengo algo atrasado?
¿Qué TPs tengo de Algoritmos?
```

### Crear tareas

```
Agregar TP3 de Redes para el 2026-04-20
Tengo parcial de Algebra el 15 de abril
Recordatorio: renovar libreta
```

### Actualizar estados

```
Terminé el TP2 de Algoritmos
Empecé a estudiar para el parcial de Redes
El TP1 de Programación ya lo entregué
```

### Eliminar tareas

```
Borrar el recordatorio de renovar libreta
Eliminá el TP3 de Redes
```

---

## Acceso desde el celular

### Paso 1: Cambiar el host

Editar `backend/config.py`:

```python
HOST = "0.0.0.0"  # Antes: "127.0.0.1"
```

O usar variable de entorno:

```bash
SHIFT_LOG_HOST=0.0.0.0 python main.py
```

### Paso 2: Encontrar la IP local

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I
```

### Paso 3: Abrir en el celular

Desde el navegador del celular (conectado a la misma WiFi):

```
http://192.168.1.XXX:8000
```

Reemplazar `XXX` con el último octeto de tu IP.

---

## Solución de problemas

| Problema | Solución |
|---|---|
| "No se pudo conectar con Ollama" | Verificar que `ollama serve` esté corriendo |
| "No se pudo interpretar la respuesta" | El modelo puede no soportar bien español. Probar con `mistral` |
| Error 422 al crear materia | Revisar que todos los campos requeridos estén en el JSON |
| La base de datos no se crea | Verificar permisos de escritura en la carpeta `data/` |
| El celular no puede acceder | Verificar que `HOST = "0.0.0.0"` y que ambos dispositivos estén en la misma WiFi |
