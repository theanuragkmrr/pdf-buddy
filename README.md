# PDF Buddy

A self-hosted PDF toolkit — merge, split, compress, convert, protect and more — created by Anurag Kumar. Spring Boot + Apache PDFBox backend, React + TypeScript + Vite frontend.

```
pdf-buddy/
  frontend/   React app — see frontend/ARCHITECTURE.md
  backend/    Spring Boot API — see backend/ARCHITECTURE.md
```

## Run locally

```bash
# backend — localhost:8080
cd backend && mvn spring-boot:run

# frontend — localhost:5173
cd frontend && npm install && npm run dev
```

## Deploying

The backend is a Docker-based Spring Boot service; the frontend is a static Vite build. They deploy to two different places and need to be pointed at each other.

### 1. Backend → Render

1. On [render.com](https://render.com), sign in with GitHub and create a **New Web Service** from this repo.
2. Set the service's root directory to `backend/`. Render will detect `render.yaml` and `Dockerfile` automatically (Docker runtime, health check at `/actuator/health`, free plan).
3. Deploy. Note the resulting URL, e.g. `https://pdf-buddy-backend.onrender.com`.
4. **Note:** Render's free plan spins the service down after inactivity — the first request after idling takes a few extra seconds (cold start). That's expected, not a bug.

### 2. Frontend → Vercel

1. On [vercel.com](https://vercel.com), sign in with GitHub and import this repo.
2. Set the project's root directory to `frontend/`. Vercel auto-detects Vite — no build config needed.
3. Add an environment variable: `VITE_API_BASE_URL` = `https://<your-render-backend-url>/api` (the URL from step 1, with `/api` appended).
4. Deploy. Note the resulting URL, e.g. `https://pdf-buddy.vercel.app`.

### 3. Close the loop — update backend CORS

The backend only accepts requests from origins listed in `APP_CORS_ALLOWED_ORIGINS`. Go back to the Render service's environment variables and set:

```
APP_CORS_ALLOWED_ORIGINS=https://<your-vercel-frontend-url>
```

Redeploy the backend. Without this step, the frontend will load but every tool will fail with a CORS error in the browser console.
