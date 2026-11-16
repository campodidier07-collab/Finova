# Finova — Gestión de Finanzas Personales

Software web responsive para el control claro, organizado y auditable de finanzas personales: libro mayor cronológico (`balance_before` / `balance_after`), múltiples cuentas, transferencias, suscripciones, deudas, comprobantes con cámara, reportes semanales/mensuales y exportación ejecutiva a Excel (`.xlsx`).

## Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Shadcn UI + Font Awesome + Recharts + PWA (`manifest.webmanifest`)
- **Backend**: Django 5 + Django REST Framework + SimpleJWT + Celery + Redis + `openpyxl`
- **Base de datos**: PostgreSQL 16 (SQLite opcional en desarrollo local)

## Desarrollo local
1. Levantar PostgreSQL y Redis (opcional si usas `USE_SQLITE=True`):
   ```bash
   docker compose up -d
   ```
2. Configurar variables de entorno copiando `.env.example` a `.env`.
3. Backend:
   ```bash
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py seed_categories
   python manage.py runserver 8000
   ```
4. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Despliegue a Producción (para usar desde celular con HTTPS)
1. **Backend (Railway / Render)**:
   - Apuntar el servicio a la carpeta `backend/` (usa `backend/Dockerfile` + `backend/entrypoint.sh`).
   - Agregar servicio **PostgreSQL** (`DATABASE_URL`) y opcionalmente **Redis** (`CELERY_BROKER_URL`).
   - Configurar variables:
     - `DJANGO_SECRET_KEY`: clave secreta aleatoria larga
     - `DJANGO_DEBUG=False`
     - `DJANGO_ALLOWED_HOSTS=tu-backend.up.railway.app`
     - `CORS_ALLOWED_ORIGINS=https://tu-app.vercel.app`
     - `CSRF_TRUSTED_ORIGINS=https://tu-app.vercel.app,https://tu-backend.up.railway.app`
2. **Frontend (Vercel / Netlify)**:
   - Apuntar el proyecto a la carpeta `frontend/` (`npm run build` → `dist/`).
   - Variable de entorno: `VITE_API_URL=https://tu-backend.up.railway.app/api`.
3. **Instalar en celular**:
   - Abrir la URL HTTPS de Vercel/Netlify en Chrome (Android) o Safari (iOS) y seleccionar **"Agregar a pantalla de inicio"**.
