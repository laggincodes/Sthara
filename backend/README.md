# 3D Cadastral Intelligence — Backend Service

The backend service for **3D Cadastral Intelligence**, providing deterministic computational geometry, coordinate reference system (CRS) projections, 3D polyhedral extrusion, cadastral boundary validation, and Prototype 3D-ULPIN generation.

---

## 1. System Requirements
- **Python**: `3.11+` (Verified on Python `3.13.14`)
- **Framework**: FastAPI with ASGI Uvicorn server
- **Data Validation**: Pydantic v2 & Pydantic Settings

---

## 2. Directory Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                   # FastAPI initialization, CORS, exception handlers
│   ├── api/
│   │   ├── __init__.py
│   │   ├── api_router.py         # Aggregated v1 route handler
│   │   └── routes/
│   │       ├── health.py         # Functional health check endpoint
│   │       ├── datasets.py       # (Phase 3) Ingestion placeholder
│   │       ├── parcels.py        # (Phase 4) Parcel retrieval placeholder
│   │       ├── volumes.py        # (Phase 5/6) 3D model & pipeline placeholder
│   │       ├── validation.py     # (Phase 7) Clash validation placeholder
│   │       ├── ulpin.py          # (Phase 8) 3D-ULPIN generator placeholder
│   │       └── ai_advisor.py     # (Phase 10) Auxiliary Gemini advisor placeholder
│   ├── core/
│   │   ├── config.py             # Environment configuration (Pydantic Settings)
│   │   └── logging.py            # Structured standard logging
│   ├── models/                   # Internal domain models
│   ├── schemas/                  # Request/response schemas & standard envelopes
│   ├── services/                 # Pure domain business logic (future phases)
│   └── utils/                    # Geometry & projection helpers (future phases)
├── tests/
│   ├── conftest.py               # TestClient fixture
│   └── test_health.py            # Health & route structure unit tests
├── requirements.txt              # Lean foundation dependencies
└── README.md
```

---

## 3. Local Setup & Virtual Environment

### 3.1 Create Virtual Environment
```bash
cd backend
python -m venv .venv
```

### 3.2 Activate Virtual Environment
- **Windows (PowerShell)**:
  ```powershell
  .\.venv\Scripts\activate
  ```
- **Linux / macOS**:
  ```bash
  source .venv/bin/activate
  ```

### 3.3 Install Foundation Dependencies
```bash
pip install -r requirements.txt
```

---

## 4. Running the Server

### 4.1 Development Mode (with Auto-Reload)
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 4.2 Production / Foundation Startup
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 5. API Endpoints & Interactive Documentation
Once started, the backend exposes:
- **Health Check**: [`http://127.0.0.1:8000/api/v1/health`](http://127.0.0.1:8000/api/v1/health)
- **Interactive Swagger UI**: [`http://127.0.0.1:8000/api/v1/docs`](http://127.0.0.1:8000/api/v1/docs)
- **ReDoc Documentation**: [`http://127.0.0.1:8000/api/v1/redoc`](http://127.0.0.1:8000/api/v1/redoc)
- **OpenAPI JSON Schema**: [`http://127.0.0.1:8000/api/v1/openapi.json`](http://127.0.0.1:8000/api/v1/openapi.json)

### Example Health Response:
```json
{
  "status": "ok",
  "service": "3D Cadastral Intelligence API"
}
```

---

## 6. Running Tests
Run the test suite using pytest inside the virtual environment:
```bash
pytest -v
```
