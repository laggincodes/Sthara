# STHARA Deployment & Environment Variable Guide

This guide provides clean, production-ready instructions for deploying **STHARA** to **Vercel** (Next.js Frontend) and a cloud hosting platform (FastAPI Backend, e.g., Render, Railway, Fly.io, or AWS).

---

## 1. Architecture & Connection Overview

STHARA consists of two decoupled components:
- **Frontend**: Next.js 16 (React 19, MapLibre GL, Three.js) deployed to **Vercel**.
- **Backend**: FastAPI (Python 3.13, Shapely, Trimesh) deployed to a **Python cloud container platform** (e.g., Render / Railway / Fly.io).

```
┌──────────────────────────────────────┐               ┌──────────────────────────────────────┐
│       Vercel Frontend Deployment     │               │       FastAPI Backend Deployment     │
│       https://<VERCEL-DOMAIN>        │ ────────────> │     https://<BACKEND-DOMAIN>/api/v1  │
│                                      │   HTTPS API   │                                      │
│  (NEXT_PUBLIC_API_URL configured)    │ <──────────── │  (ALLOWED_ORIGINS / CORS configured) │
└──────────────────────────────────────┘               └──────────────────────────────────────┘
```

---

## 2. Environment Variables Summary

### A. Frontend / Vercel Environment Variables

Set these in **Vercel Project Settings → Environment Variables**:

| Variable Name | Required | Example Production Value | Purpose |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | **Yes** | `https://<DEPLOYED-BACKEND-URL>/api/v1` | Base API URL used by the frontend client to connect to FastAPI backend endpoints. |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | `https://<VERCEL-FRONTEND-DOMAIN>` | Public canonical URL used for OpenGraph metadata and site links. |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Optional | `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json` | Vector tile style URL for MapLibre 2D GIS map view. Defaults to CartoDB Dark Matter if omitted. |

> [!IMPORTANT]
> **Vercel Root Directory**: Set the **Root Directory** in Vercel project settings to `frontend` so Vercel builds the Next.js app correctly.

---

### B. Backend Deployment Environment Variables

Set these in your **Backend Hosting Platform Environment Settings** (e.g., Render / Railway Dashboard):

| Variable Name | Required | Example Production Value | Purpose |
| :--- | :---: | :--- | :--- |
| `ENVIRONMENT` | **Yes** | `production` | Enables production mode and disables internal debug logging. |
| `ALLOWED_ORIGINS` | **Yes** | `https://<VERCEL-FRONTEND-DOMAIN>,http://localhost:3000` | Comma-separated list of allowed origins permitted to access FastAPI via CORS. |
| `FRONTEND_URL` | Optional | `https://<VERCEL-FRONTEND-DOMAIN>` | Base URL reference of the frontend application. |
| `LOG_LEVEL` | Optional | `INFO` | Logging verbosity level (`INFO`, `WARNING`, `ERROR`). |
| `PORT` | Auto | `8000` | Process binding port. Managed automatically by platforms like Render/Railway (`$PORT`). |

> [!CAUTION]
> **Do NOT use wildcard `ALLOWED_ORIGINS=*` in production.** Always restrict CORS allowed origins strictly to your deployed Vercel domain and necessary local testing domains.

---

## 3. Step-by-Step Deployment Workflow

### Step 1: Deploy the FastAPI Backend First

1. Connect your repository to your Python hosting provider (e.g., [Render](https://render.com), [Railway](https://railway.app), or [Fly.io](https://fly.io)).
2. Set the **Root Directory** to `backend/`.
3. Set the **Build Command**:
   ```bash
   pip install -r requirements.txt
   ```
4. Set the **Start Command**:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Configure Environment Variables in the backend dashboard:
   - `ENVIRONMENT=production`
   - `LOG_LEVEL=INFO`
   - Leave `ALLOWED_ORIGINS` temporarily blank or set to `http://localhost:3000` (you will update it after deploying the frontend in Step 2).
6. Deploy the backend and copy your assigned HTTPS URL (e.g., `https://sthara-api.onrender.com`).

---

### Step 2: Deploy the Next.js Frontend to Vercel

1. Import your GitHub repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://sthara-api.onrender.com/api/v1` *(Replace with your deployed backend URL from Step 1)*
   - `NEXT_PUBLIC_SITE_URL` = `https://sthara.vercel.app` *(Replace with your Vercel deployment URL)*
4. Click **Deploy**.
5. Once deployment completes, copy your live Vercel domain (e.g., `https://sthara.vercel.app`).

---

### Step 3: Update Backend CORS Settings

1. Return to your FastAPI backend hosting dashboard (e.g., Render / Railway).
2. Update the `ALLOWED_ORIGINS` variable:
   ```env
   ALLOWED_ORIGINS=https://sthara.vercel.app,http://localhost:3000
   ```
   *(Replace `https://sthara.vercel.app` with your actual Vercel domain from Step 2)*.
3. Save environment variables (the backend will automatically reload with active CORS protection).

---

## 4. Local Development Setup

To run the full stack locally without affecting production settings:

1. **Frontend**:
   ```bash
   cd frontend
   cp .env.example .env.local
   npm run dev
   ```
   *`.env.local` defaults to `http://localhost:8000/api/v1`*.

2. **Backend**:
   ```bash
   cd backend
   cp .env.example .env
   .venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *`.env` defaults `ALLOWED_ORIGINS` to `http://localhost:3000,http://127.0.0.1:3000`*.

---

## 5. Security & Verification Checklist

- [x] All `.env` and `.env.*.local` files are ignored in `.gitignore`.
- [x] `.env.example` templates contain ZERO production secrets or credentials.
- [x] No hardcoded `localhost` URLs exist in production component links (`cadastreApi` used dynamically).
- [x] CORS configuration avoids wildcard `*` origins in production.
- [x] Internal backend runner host/port variables (`HOST`/`PORT`) are excluded from Vercel frontend settings.
