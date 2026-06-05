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

## Phase 0 — Infrastructure hardening

> Goal: every subsequent phase ships on a solid, production-ready base.

### Tasks
- [ ] Add `@nestjs/swagger` and expose Swagger UI at `/api/docs`
- [ ] Configure CORS with explicit origin list (web + mobile domains)
- [ ] Add `@nestjs/throttler` for global rate limiting (stricter on auth endpoints)
- [ ] Add a global `HttpExceptionFilter` to normalize all error responses
- [ ] Add a global `LoggingInterceptor` (request method, path, status, duration — no bodies or tokens)
- [ ] Replace the `GET /` hello-world with a proper health check (`GET /health`)
- [ ] Wire `@nestjs/jwt` (needed by Phase 1)
- [ ] Add `generate:types` script to `package.json` (`supabase gen types typescript`)

**Deliverable:** running `pnpm start:dev` serves `GET /health` and `GET /api/docs` with zero warnings.

---

## Phase 1 — Authentication & Multi-tenancy

> Goal: every protected route knows who the caller is, which org they belong to, and which branch they are acting on.

### Database migrations

| Migration | Tables |
|-----------|--------|
| `create_profiles` | `profiles (id → auth.users, full_name, avatar_url, created_at)` |
| `create_organizations` | `organizations (id, name, slug, created_at)` |
| `create_branches` | `branches (id, org_id → organizations, name, address, created_at)` |
| `create_memberships` | `memberships (user_id → auth.users, org_id, branch_id, role: enum[owner, admin, chef, viewer], created_at)` |

### Backend

- **Supabase Edge Function hook**: embed `org_id`, `branch_id`, `role` as custom JWT claims (see `docs/auth-implementation-plan.md`)
- **`AuthGuard`**: extract Bearer token, call `supabase.auth.getUser()`, inject `UserContext` into request
- **`@CurrentUser()`** decorator: pulls `UserContext` from the request
- **`@Public()`** decorator: marks routes that skip the guard
- **`UsersModule`**
  - `GET /users/me` — return profile + membership summary
  - `PATCH /users/me` — update profile fields
- **`OrganizationsModule`**
  - `POST /organizations` — create org (owner role auto-assigned)
  - `GET /organizations/:id`
  - `PATCH /organizations/:id` (owner/admin only)
- **`BranchesModule`**
  - `POST /organizations/:orgId/branches`
  - `GET /organizations/:orgId/branches`
  - `PATCH /organizations/:orgId/branches/:id`
- **`MembershipsModule`**
  - `POST /organizations/:orgId/members` — invite user by email
  - `DELETE /organizations/:orgId/members/:userId` — remove member

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
- Use `@nestjs/throttler` with tighter limits on auth and write endpoints
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
~1 week      ~2 weeks    ~2 weeks    ~3 weeks
```

Each phase ends with a working, independently testable slice of the API. Phases 2 and 3 can partially overlap once Phase 1's auth infrastructure is stable.
