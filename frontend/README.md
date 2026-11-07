# PDS PDF Tools — Frontend

A PDF toolkit with a playful, colorful look, created by Anurag Kumar. React + TypeScript + Vite + Tailwind v4, talking to a Spring Boot backend (`../pds-project-backend`).

14 tools, all working end-to-end: merge, split, compress, rotate, PDF↔images, images→PDF, PDF↔Word, protect/unlock, watermark, delete/extract pages, page numbers, and PDF info.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full system design, diagrams, and the reasoning behind the config-driven tool system.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Needs the backend running too — see `../pds-project-backend`, default port 8080.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — type-check + production build
- `npm run lint` — oxlint
- `npm run preview` — preview the production build
