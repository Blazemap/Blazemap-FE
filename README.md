# Blazemap Frontend

The React web application for Blazemap, a forest and land fire awareness and human-review platform focused on Kalimantan, Indonesia. Website: [blazemap.my.id](https://blazemap.my.id/). Source code: [Blazemap-FE](https://github.com/Blazemap/Blazemap-FE).

## What it does

- Public information pages and email or Google sign-in.
- Citizen dashboard for reports, follow-ups, notifications, map context, and published information.
- Restricted monitoring workspace for authorized administrators to review reports and cases, track assignments and operational conditions, and manage publications.

A citizen observation, satellite hotspot, or AI output is not a confirmed fire. Verification and publication require authorized human review.

## Technology stack

| Area | Technology |
| --- | --- |
| Application | React 19, TypeScript, Vite 8 |
| Routing and data | React Router 7, TanStack Query 5, Axios |
| UI and content | Tailwind CSS 4, Radix UI, TipTap, Lucide |
| Maps and motion | MapLibre GL, Framer Motion, Lenis |
| Container | Node.js 24 build stage, unprivileged nginx runtime |

## Installation and local development

Prerequisites: Node.js 24, npm, and a configured [Blazemap backend](https://github.com/Blazemap/Blazemap-BE) for sign-in and application data.

```bash
npm ci
```

Copy `.env.example` to `.env.local` and set the backend address before running the app:

```dotenv
VITE_API_URL=
VITE_AUTH_URL=http://localhost:3000
VITE_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/positron
```

`VITE_AUTH_URL` points to the backend origin for authentication and defaults to the local backend example above. Application API calls use `VITE_API_URL` when set, otherwise `VITE_AUTH_URL`. Keep both origins consistent with the backend's trusted frontend origin and cookie configuration. Never put API keys or server secrets in `VITE_*` variables: Vite exposes them in browser assets. The map style URL must use HTTPS.

```bash
npm run dev
```

Vite proxies `/api` to `http://localhost:3000` during local development. Run the backend separately; its migrations and configuration are described in the backend README.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Check frontend source with ESLint |
| `npm run typecheck` | Check TypeScript |
| `npm run build` | Typecheck and build static assets in `dist/` |
| `npm run preview` | Preview a built frontend locally |

## Technical documentation

- `src/main.tsx` and `src/App.tsx` initialize React, routing, and shared providers.
- `src/config/routes.ts` defines public pages, authentication, the citizen dashboard, and the protected `/monitoring` workspace. The dashboard loader enforces authenticated access and restricts monitoring to administrators.
- `src/api/`, `src/hooks/`, and `src/config/api-client.ts` organize network calls, data hooks, and credentialed requests to the backend. Auth/session requests use the authentication origin separately.
- `src/pages/monitoring/` contains reports, cases, teams, equipment, assignments, access/water, and user-management views. `src/pages/dashboard/` contains the citizen and shared dashboard experience.
- The backend serves the reference-only Swagger UI at `/api/docs` and its OpenAPI document at `/api/openapi.json` on the backend origin. API permissions and data contracts are enforced there, not in the browser.

### Container build

`Dockerfile` requires a nonempty `VITE_AUTH_URL` build argument, compiles `dist/`, and serves it from unprivileged nginx on port 8080. `nginx.conf.template` provides SPA fallback and `/health`, but does not proxy `/api`; configure reachable backend and auth origins for the deployed frontend. No backend migration is performed by this image.

## Related repositories

[Organization](https://github.com/Blazemap) · [Backend](https://github.com/Blazemap/Blazemap-BE) · [AI service](https://github.com/Blazemap/Blazemap-AI)
