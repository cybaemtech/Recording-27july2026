# Cloud Session Recorder

Enterprise SaaS admin dashboard for monitoring employee desktop recording sessions from an Electron agent. IT admins manage users, devices, sessions, and recordings across an organization.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/dashboard run dev` — run the React dashboard (served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Login credentials (dev seed)

- Email: `admin` / Password: `admin123` (admin)
- Email: `sarah.chen@acmecorp.com` / Password: `password123` (manager)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Shadcn UI, wouter, TanStack Query, Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Drizzle table definitions (users, devices, sessions, recordings, audit_logs)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, dashboard, sessions, users, devices)
- `artifacts/dashboard/src/` — React frontend (pages: login, dashboard, sessions, users, devices, storage, reports, settings)
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — Generated Zod schemas for server validation (do not edit)

## Architecture decisions

- OpenAPI-first: spec lives in `lib/api-spec/openapi.yaml`, all types generated from it via Orval — never hand-write API types
- Auth is placeholder (base64 token) — designed to be swapped for JWT in Phase 2 when Electron agent integration begins
- `recording_size_bytes` uses PostgreSQL `integer` (max ~2.1GB) — upgrade to `bigint` when Electron agent sends real file sizes
- Cloud storage integration is architecturally planned but not implemented — placeholder page at `/storage`
- Seed data uses `email = 'admin'` as a shorthand username for the admin user — change for production

## Product

- **Dashboard** — 6 stat cards (total/online users, active/today's sessions, storage used, failed uploads), recent sessions table, activity line chart, storage-by-OS chart
- **Sessions** — Paginated table with upload/recording status badges, filter by status/user, delete action, click through to detail page
- **Users** — Paginated list with search, detail page with device and session counts
- **Devices** — Paginated list filterable by OS (Windows/macOS/Linux), detail page
- **Reports** — Activity over time + storage breakdown charts
- **Storage/Settings** — Placeholder pages ready for Phase 2

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After OpenAPI spec changes, always run `pnpm --filter @workspace/api-spec run codegen` before checking frontend/backend code
- `recording_size_bytes` integer overflow: keep seed values under 2,147,483,647 (2GB) until column is migrated to bigint
- The `LoginBody` Zod schema in api-zod includes the email field — do not add `format: email` to the spec (Orval generates `zod.email()` which is invalid in Zod v4)
- Schema names must be entity-shaped (e.g. `AuthResponse`), not operation-shaped (e.g. `LoginResponse`) to avoid Orval TS2308 collisions

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
