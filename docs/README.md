# 📚 Documentación de Shift Log

Documentación completa del proyecto en español.

---

## Índice

| Documento | Descripción |
|---|---|
| [Arquitectura y Stack Tecnológico](arquitectura.md) | Justificación de cada tecnología elegida, diagrama de arquitectura, y decisiones de diseño |
| [Esquema de Base de Datos](base_de_datos.md) | Tablas, relaciones, tipos de datos, y queries de ejemplo |
| [Referencia de API](api_reference.md) | Todos los endpoints disponibles con ejemplos de request/response |
| [Guía de Carga de Datos](carga_de_datos.md) | Cómo poblar manualmente la base de datos (Python, UI o SQL) con las materias fijas del semestre |
| [Guía de Instalación y Uso](instalacion_y_uso.md) | Requisitos previos, instalación paso a paso, y primeros pasos |
| [Lógica Conversacional](logica_conversacional.md) | Cómo funciona el system prompt, el parsing de intenciones, y el flujo completo |

---

## Inicio rápido

```bash
# Instalar
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Correr
ollama serve          # en una terminal
cd backend && python main.py  # en otra terminal

# Abrir
open http://127.0.0.1:8000
```
