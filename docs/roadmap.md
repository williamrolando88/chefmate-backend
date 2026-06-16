# ChefMate Backend — Development Roadmap

Multi-tenant restaurant management API built on NestJS 11 + Supabase. Serves both web and mobile clients.

---

## Current baseline

| Item | Status |
|------|--------|
| NestJS 11 scaffold (pnpm) | ✅ Done |
| SupabaseModule + ConfigModule (global) | ✅ Done |
| Global ValidationPipe (whitelist, forbidNonWhitelisted) | ✅ Done |
| SupabaseService (JS client wrapper) | ✅ Done |
| Database migrations | ❌ None yet |
| Feature modules | ❌ None yet |

---

## Phase 0 — Infrastructure hardening ✅ Complete

> Goal: every subsequent phase ships on a solid, production-ready base.

### Tasks
- [x] Add `@nestjs/swagger` and expose Swagger UI at `/api/docs`
- [x] Configure CORS with explicit origin list (web + mobile domains)
- [x] Add `@nestjs/throttler` for global rate limiting (per-route `@Throttle()` overrides applied in Phase 1 when write/invite routes exist)
- [x] Add a global `HttpExceptionFilter` to normalize all error responses
- [x] Add a global `LoggingInterceptor` (request method, path, status, duration — no bodies or tokens)
- [x] Replace the `GET /` hello-world with a proper health check (`GET /health`)
- [x] Wire `@nestjs/jwt` configured to verify Supabase-issued JWTs using `SUPABASE_JWT_SECRET`
- [x] Add `generate:types` script to `package.json` (`supabase gen types typescript`)

**Deliverable:** running `pnpm start:dev` serves `GET /health` and `GET /api/docs` with zero warnings. ✅

### Implementation notes
- CORS origins and PORT are managed through `AppConfig` (`src/shared/infrastructure/config/app-config.ts`).
- `JwtModule` is registered globally and only **verifies** tokens — the backend never issues JWTs (Supabase does). `SUPABASE_JWT_SECRET` must match Supabase dashboard → Settings → API → JWT Secret.
- Global throttle is a flat 100 req / 60 s. Tighter limits on write/invite endpoints will be applied via `@Throttle()` overrides in Phase 1.

---

## Phase 1 — Authentication & Multi-tenancy 🔜 Next

> Goal: every protected route knows who the caller is, which org they belong to, and which branch they are acting on.

See `docs/phase-1-implementation-plan.md` for the full step-by-step plan.

### Database migrations

Migrations must be created and applied in this order due to FK dependencies:

| Order | Migration name | Key columns |
|-------|----------------|-------------|
| 1 | `create_organizations` | `id uuid PK`, `tax_id text NN UNIQUE`, `name text NN`, `slug text NN UNIQUE`, `created_at`, `updated_at` |
| 2 | `create_branches` | `id uuid PK`, `org_id → organizations CASCADE`, `code integer NN CHECK(>0) UNIQUE(org_id,code)`, `name text NN`, `address text NULL`, `created_at`, `updated_at` |
| 3 | `create_profiles` | `id uuid PK → auth.users CASCADE`, `first_name text NULL`, `last_name text NULL`, `avatar_url text NULL`, `created_at`, `updated_at` |
| 4 | `create_memberships` | `id uuid PK`, `user_id → auth.users CASCADE UNIQUE`, `org_id → organizations CASCADE`, `branch_id → branches SET NULL NULL`, `role text NN`, `created_at`, `updated_at` |

**Schema decisions:**
- `tax_id` is the deduplication key for organizations — globally unique, NOT NULL, and immutable after creation (enforced in service layer). Analogous to email uniqueness in `auth.users`.
- `branches.code` is the invoicing identifier scoped to the org — unique within the org, NOT NULL, positive integer, immutable after creation. The frontend formats it as `001`, `002`, etc.
- `branch_id` is nullable in `memberships`: `NULL` = org-level access (owner, admin); non-null = branch-scoped (chef, waiter, cashier).
- `user_id` has a `UNIQUE` constraint in `memberships`: one user belongs to exactly one organization. Email uniqueness is enforced natively by Supabase Auth.
- `role` is `text NOT NULL` — validated in the business layer, not via a DB enum, to allow future custom roles without schema changes.
- `ON DELETE SET NULL` on `memberships.branch_id`: deleting a branch downgrades the user to org-level access rather than deleting the membership.
- `updated_at` on all tables — driven by a trigger or manual update in the migration.

### Default roles

`owner` · `admin` · `chef` · `waiter` · `cashier`

Defined as a TypeScript union type in the domain layer. The DB column is plain `text` to allow future org-defined custom roles without a migration.

### Backend

- **Supabase Edge Function hook**: on every login/token refresh, queries `memberships` and embeds `org_id`, `branch_id` (nullable), and `role` as custom claims in `app_metadata`
- **`AuthGuard`**: verifies Bearer JWT locally using `JwtService` (no Supabase API call per request), extracts claims, attaches `UserContext` to the request
- **`@CurrentUser()`** decorator: pulls `UserContext` from the request
- **`@Public()`** decorator: marks routes that skip the guard (health check, future auth callbacks)
- **`UsersModule`**
  - `GET /users/me` — return profile + membership summary
  - `PATCH /users/me` — update `first_name`, `last_name`, `avatar_url`
- **`OrganizationsModule`**
  - `POST /organizations` — create org + auto-assign `owner` membership to caller
  - `GET /organizations/:id`
  - `PATCH /organizations/:id` — update `name`, `slug` only; `tax_id` is immutable (owner/admin)
- **`BranchesModule`**
  - `POST /organizations/:orgId/branches`
  - `GET /organizations/:orgId/branches`
  - `PATCH /organizations/:orgId/branches/:id` — update `name`, `address` only; `code` is immutable (owner/admin)
- **`MembershipsModule`**
  - `POST /organizations/:orgId/members` — invite user by email (owner/admin)
  - `PATCH /organizations/:orgId/members/:userId` — change role (owner/admin)
  - `DELETE /organizations/:orgId/members/:userId` — remove member (owner/admin)

**Deliverable:** all routes protected by default; role-based access enforced in service layer; Swagger shows auth headers.

---

## Phase 2 — Recipes & Ingredients

> Goal: chefs can manage the ingredient catalog and a library of recipes with cost and scaling support.

### Database migrations

| Migration | Tables |
|-----------|--------|
| `create_ingredient_categories` | `ingredient_categories (id, org_id, name)` |
| `create_ingredients` | `ingredients (id, org_id, category_id, name, unit, cost_per_unit, created_by)` |
| `create_recipes` | `recipes (id, org_id, branch_id nullable, name, description, yield_quantity, yield_unit, created_by, created_at)` |
| `create_recipe_ingredients` | `recipe_ingredients (recipe_id, ingredient_id, quantity, unit)` |

### Backend

- **`IngredientsModule`**
  - Full CRUD scoped to `org_id` from JWT
  - `GET /ingredients?category=` — filterable list
- **`RecipesModule`**
  - Full CRUD scoped to org (optionally narrowed to a branch)
  - `GET /recipes/:id` — includes nested ingredient list
  - `GET /recipes/:id/scale?targetYield=` — returns scaled ingredient quantities (computed, no DB write)
  - `GET /recipes/:id/cost` — returns total cost per batch (computed from `cost_per_unit × quantity`)

**Deliverable:** a chef can maintain a full ingredient catalog and recipe library with accurate cost and scaling.

---

## Phase 3 — Orders & Production

> Goal: kitchen staff can create production orders, execute them, and the system tracks inventory automatically.

### Database migrations

| Migration | Tables |
|-----------|--------|
| `create_orders` | `orders (id, branch_id, status: enum[draft, confirmed, in_production, completed, cancelled], due_date, created_by, created_at)` |
| `create_order_items` | `order_items (order_id, recipe_id, quantity)` |
| `create_production_runs` | `production_runs (id, order_id, started_by, started_at, completed_at, notes)` |
| `create_inventory` | `inventory (id, branch_id, ingredient_id, quantity_on_hand, updated_at)` |
| `create_inventory_transactions` | `inventory_transactions (id, ingredient_id, branch_id, delta, reason: enum[production, adjustment, receiving], reference_id, created_by, created_at)` |

### Backend

- **`OrdersModule`**
  - `POST /branches/:branchId/orders` — create draft order with items
  - `GET /branches/:branchId/orders` — filterable by status/date
  - `PATCH /orders/:id` — update items or confirm order
  - `DELETE /orders/:id` — cancel (draft/confirmed only)
- **`ProductionModule`**
  - `POST /orders/:orderId/production` — start production run (status → `in_production`)
  - `PATCH /production/:id/complete` — mark complete; deducts ingredients from inventory via `inventory_transactions`
- **`InventoryModule`**
  - `GET /branches/:branchId/inventory` — current stock levels
  - `POST /branches/:branchId/inventory/adjust` — manual adjustment with reason
  - `GET /branches/:branchId/inventory/transactions` — audit log

**Deliverable:** full kitchen workflow — order → produce → inventory automatically updated.

---

## Cross-cutting guidelines (apply throughout all phases)

### Architecture
- Follow the hexagonal layout in `CLAUDE.md` without exception: `domain/` → `application/` → `infrastructure/`
- Every service depends on a repository *port* (abstract class), never on a concrete adapter
- Modules declare their own providers; cross-feature dependencies go through exposed service methods, not direct repository access

### Security
- All routes require `AuthGuard` by default; use `@Public()` only for auth callbacks and health checks
- Enforce `org_id` / `branch_id` scoping in every service method — never trust client-supplied IDs for scoping
- Use `@nestjs/throttler` with tighter limits on write and invite endpoints
- Never log request bodies or JWT payloads

### Testing
- Every source file has a co-located `.test.ts` (see `CLAUDE.md`)
- Services: mock the repository port
- Controllers: mock the service
- Repository adapters: mock the Supabase client
- E2e suite (`test/*.e2e-spec.ts`) runs against `supabase start` local stack

### API design
- Consistent error shape via the global `HttpExceptionFilter`
- Pagination on all list endpoints (`?page=&limit=`, default limit 20)
- All timestamps in ISO 8601 / UTC
- Swagger kept in sync via `@nestjs/swagger` decorators on every DTO and controller

### Database
- Every schema change goes through `supabase migration new <name>` — never edit migration files after they run
- Regenerate `database.types.ts` with `pnpm gen:types` after each migration
- Seed file (`supabase/seed.sql`) maintained with representative data for local dev

---

## Suggested delivery order

```
Phase 0  →  Phase 1  →  Phase 2  →  Phase 3
✅ Done     ~2 weeks    ~2 weeks    ~3 weeks
```

Each phase ends with a working, independently testable slice of the API. Phases 2 and 3 can partially overlap once Phase 1's auth infrastructure is stable.
