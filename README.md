# Workflow Orchestration Platform — MVP / POC

A multi-tenant SaaS workflow orchestration platform for lending companies (NBFCs). Two surfaces:

1. **Platform app** (`apps/platform`) — a Next.js admin builder where NBFC admins visually construct state‑machine workflows (React Flow canvas) and configure their brand theme, then preview and publish.
2. **SDK** (`packages/*`) — TypeScript packages a lender embeds in their own web app to run the workflow for borrowers.

The backend is **mocked with MSW** (Mock Service Worker) — no real Java backend is required for the POC.

---

## Architecture

```
workflow-platform/
├── apps/
│   └── platform/        # Next.js 14 admin builder (React Flow, Zustand+zundo, react-query)
├── packages/
│   ├── core/            # @platform/core — vanilla TS FlowEngine (zero DOM, zero React)
│   ├── ui/              # @platform/ui — headless components, themed via CSS custom properties
│   ├── react/           # @platform/react — React adapter (FlowProvider, FlowRenderer)
│   └── tsconfig/        # @platform/tsconfig — shared strict TS config
├── turbo.json           # Turborepo pipeline
└── package.json         # Yarn workspaces root
```

**SDK layering:** `core` (engine + types, no UI) → `ui` (headless, CSS‑variable themed) → `react` (binds the engine to React + renders `ui`). The engine applies "core" theme tokens synchronously from the session token (zero‑FOUC) then resolves the full theme in parallel with session bootstrap.

---

## Prerequisites

- **Node** ≥ 20 (developed on 22.11)
- **Yarn** Classic (1.22.x) — this repo uses Yarn workspaces

---

## Getting started

```bash
yarn install            # install all workspaces
yarn build              # build the 3 SDK packages + the Next app
yarn dev                # turbo: next dev (:3000) + tsup --watch for packages
```

Then open **http://localhost:3000**.

> If port 3000 is busy, edit the `dev` script in `apps/platform/package.json` (`next dev -p <port>`).

Other scripts: `yarn typecheck`, `yarn test`, `yarn lint`.

---

## The happy path (end‑to‑end demo)

1. **Sign in** — any email works (mock auth, no password).
2. **Dashboard** — a seeded "Personal Loan KYC" workflow is published. Click **+ New workflow** or open an existing one.
3. **Builder**
   - **Drag** nodes from the left palette onto the canvas (or click to add). Connect them by dragging between handles.
   - Select a node to edit it in the **Inspector** (form fields, OTP channel, API config, condition rules…).
   - Switch to the **Theme** tab to edit brand colours, typography, radius, spacing.
   - Click **Preview** — the right panel renders the **real SDK** against the mock backend, themed live. Edit the theme and watch it update.
   - **Undo/redo** (toolbar) is wired to the graph + theme history.
   - **Save** (draft) and **Publish**.
4. **Embed demo** — from a published workflow card click **Embed demo** (`/embed-demo?flow=<id>`). This page simulates a *lender's own website* embedding `@platform/react`; a borrower completes KYC → OTP → decision, and the host app receives the outcome.

---

## Deviations from the original build spec

The spec was written for a slightly different toolchain; these changes were made deliberately to keep the POC self‑contained and runnable. (The SDK package source matches the spec verbatim except for the strict‑mode fixes noted below.)

| Spec | This repo | Why |
|------|-----------|-----|
| pnpm workspaces (`pnpm-workspace.yaml`, `workspace:*`) | **Yarn** workspaces (`workspaces` field, `*`) | Requested; Yarn v1 doesn't support the `workspace:` protocol. |
| Next.js 15 | **Next.js 14** + React 18 | Next 15 needs React 19; the SDK declares React 18 peers and `reactflow` v11 targets React 18. Avoids peer/runtime conflicts. |
| `@clerk/nextjs` auth | **Mock auth** (`AuthProvider`, localStorage) | Clerk needs real API keys and would crash offline — wrong for a self‑contained POC. Shape mirrors a real provider so it's swappable. |
| `turbo.json` `pipeline` key | `tasks` key | Turborepo 2.x renamed `pipeline` → `tasks`. |

**Strict‑mode fixes in `packages/core`** (required to compile under the spec's own `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`):
- `FlowEngineEvents` changed from `interface` to `type` (so it satisfies the `EventEmitter`'s `Record<string, unknown>` constraint).
- `mergeTheme` and the API client build objects conditionally instead of assigning `undefined` to optional properties.

**Other notes**
- `.yarnrc` sets `ignore-engines true` — a scaffold‑only transitive dep of the MSW CLI wants Node ≥ 22.13; it doesn't affect runtime.
- The builder **Preview** and **Embed demo** run a representative KYC → OTP → decision flow defined in the MSW handlers, themed by the workflow. Interpreting an arbitrary canvas graph into runtime steps is out of scope for the POC.

---

## Tech

Turborepo · Yarn workspaces · TypeScript (strict) · tsup · Vitest · Next.js 14 (App Router) · React Flow · Zustand + zundo (undo/redo) + Immer · TanStack Query · MSW · Tailwind (admin chrome only — the SDK uses CSS custom properties).
