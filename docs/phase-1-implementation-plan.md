# Phase 1 — Authentication & Multi-tenancy: Implementation Plan

## Overview

Client-side authentication is handled entirely by Supabase Auth. The backend treats the
resulting JWT as a signed, self-contained credential and **validates it locally** — no Supabase
API call per request. Org, branch, and role context are embedded in the JWT as custom claims,
injected server-side at login time via a Supabase PostgreSQL function hook.

**Current status:** Phase 0 complete. `@nestjs/jwt` is wired and `JwtModule` is registered
globally using `SUPABASE_JWT_SECRET`.

---

## Part 1 — Database Migrations

**Status: ✅ Done**

Migrations must be created and applied in FK dependency order using `supabase migration new <name>`.
Never edit a migration file after it has been applied.

### Migration 1 — `create_organizations`

No FK dependencies; created first.

| Column | Type | Constraints | Justification |
|--------|------|-------------|---------------|
| `id` | `uuid` | PK, `gen_random_uuid()` | Stable surrogate key for all FK references and URLs — never exposed as a business identifier |
| `tax_id` | `text` | NOT NULL, UNIQUE | Legal identity of the org; the deduplication key (analogous to email in `auth.users`); immutable after creation — the service layer does not allow updates to this field |
| `name` | `text` | NOT NULL | Human-readable display name of the restaurant or chain |
| `slug` | `text` | NOT NULL, UNIQUE | URL-safe routing handle — tax IDs contain characters unsafe for URLs and must not appear in API paths or logs |
| `created_at` | `timestamptz` | NOT NULL, `now()` | Audit — when the org was registered |
| `updated_at` | `timestamptz` | NOT NULL, `now()` | Audit — tracks `name` and `slug` changes; drives cache invalidation |

### Migration 2 — `create_branches`

Depends on `organizations`.

| Column | Type | Constraints | Justification |
|--------|------|-------------|---------------|
| `id` | `uuid` | PK, `gen_random_uuid()` | Stable surrogate key |
| `org_id` | `uuid` | NOT NULL, FK → `organizations(id)` ON DELETE CASCADE | Every branch belongs to exactly one org; cascade keeps the DB consistent if the org is deleted |
| `code` | `integer` | NOT NULL, `CHECK (code > 0)`, UNIQUE(`org_id`, `code`) | Invoicing identifier scoped to the org — unique within the org, not globally; positive integer stored in the DB, formatted as `001`/`002` by the frontend; immutable after creation |
| `name` | `text` | NOT NULL | Branch display name (e.g., "Downtown", "Airport Terminal 2") |
| `address` | `text` | NULL | Physical location; nullable — a branch can be created before the address is confirmed |
| `created_at` | `timestamptz` | NOT NULL, `now()` | Audit |
| `updated_at` | `timestamptz` | NOT NULL, `now()` | Audit — tracks `name` and `address` changes |

### Migration 3 — `create_profiles`

Depends on `auth.users`, which Supabase provides out of the box.

| Column | Type | Constraints | Justification |
|--------|------|-------------|---------------|
| `id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE | 1:1 extension of the Supabase auth user; cascade mirrors auth user deletion |
| `first_name` | `text` | NULL | Given name; nullable because the profile row is created automatically at invite acceptance before the user has filled in their details |
| `last_name` | `text` | NULL | Family name; nullable for the same reason; kept separate from `first_name` to enable personalized messaging ("Hi, María") and formal addressing |
| `avatar_url` | `text` | NULL | Profile picture URL; nullable — populated only after an upload |
| `created_at` | `timestamptz` | NOT NULL, `now()` | Audit |
| `updated_at` | `timestamptz` | NOT NULL, `now()` | Audit — tracks profile edits via `PATCH /users/me` |

### Migration 4 — `create_memberships`

Depends on `auth.users`, `organizations`, and `branches`.

| Column | Type | Constraints | Justification |
|--------|------|-------------|---------------|
| `id` | `uuid` | PK, `gen_random_uuid()` | Surrogate key — makes the record directly addressable for `DELETE /organizations/:orgId/members/:userId` |
| `user_id` | `uuid` | NOT NULL, UNIQUE, FK → `auth.users(id)` ON DELETE CASCADE | One membership per user enforces the one-org-per-user policy at DB level; cascade removes the membership when the auth user is deleted |
| `org_id` | `uuid` | NOT NULL, FK → `organizations(id)` ON DELETE CASCADE | The org this membership belongs to; cascade removes all memberships on org deletion |
| `branch_id` | `uuid` | NULL, FK → `branches(id)` ON DELETE SET NULL | `NULL` = org-level access (owner, admin); non-null = branch-scoped access (chef, waiter, cashier); `SET NULL` on branch deletion keeps the user as an org member rather than removing them |
| `role` | `text` | NOT NULL | Validated in the business layer against the `MembershipRole` union type; stored as plain `text` (not a DB enum) so future custom roles require no schema migration |
| `created_at` | `timestamptz` | NOT NULL, `now()` | Audit — when the user was invited |
| `updated_at` | `timestamptz` | NOT NULL, `now()` | Audit — tracks role promotions and demotions |

### Default roles and semantics

Defined as a TypeScript union type in the domain layer — the DB column is plain `text`:

```ts
export type MembershipRole = 'owner' | 'admin' | 'chef' | 'waiter' | 'cashier';
```

| Role | Scope | Description |
|------|-------|-------------|
| `owner` | Org-level (`branch_id = NULL`) | Full control; transfers ownership; cannot be removed by admin |
| `admin` | Org-level (`branch_id = NULL`) | Manages org settings, branches, and members |
| `chef` | Branch-scoped | Manages recipes and ingredients for the assigned branch |
| `waiter` | Branch-scoped | Takes and manages orders for the assigned branch |
| `cashier` | Branch-scoped | Handles payment and invoice operations for the assigned branch |

Role-access rules are enforced in the NestJS service layer. The `branch_id = NULL` expectation
for owner and admin is a convention enforced by the service, not a DB constraint, keeping the
schema flexible for future role extensions.

**Future custom roles:** when needed, introduce a `roles` table with `org_id nullable` (null =
system role, non-null = org-defined). Migrate `memberships.role` from `text` to a FK on
`roles(id)` and backfill the four system roles. The text column makes this migration
straightforward with no enum teardown.

### After all migrations

```bash
pnpm gen:types   # regenerates src/shared/infrastructure/supabase/database.types.ts
```

### Seed file — `supabase/seed.sql`

The file `supabase/seed.sql` is referenced in `config.toml` but does not exist yet. Create it
with representative local-dev data:

- 1 organization (with `tax_id`, `slug`)
- 2 branches under that org (`code` 1 and 2)
- 5 auth users — one per default role — inserted into `auth.users`
- 5 corresponding `profiles` rows
- 5 `memberships` rows: owner and admin with `branch_id = NULL`, chef/waiter/cashier scoped to branch 1

---

## Part 2 — Supabase Custom Claims Hook

**Scope: Supabase (not NestJS backend)**
**Status: ✅ Done**

A PostgreSQL function runs after every successful login and token refresh. It reads the user's
membership record and adds `org_id`, `branch_id`, and `role` to `app_metadata`. Because this
runs server-side inside Supabase, the client cannot forge or modify these claims — tampering
invalidates the JWT signature.

### Hook function

Create `supabase/functions/custom-claims/index.ts`:

```ts
// Called by Supabase on every login / token refresh.
// Reads memberships for the authenticated user and returns
// { org_id, branch_id, role } to be merged into app_metadata.
```

The function queries `memberships` by `user_id` and returns:

```json
{
  "app_metadata": {
    "org_id": "<org_uuid>",
    "branch_id": "<branch_uuid or null>",
    "role": "chef"
  }
}
```

If no membership row exists (new user not yet invited to any org), the hook returns empty
`app_metadata`. The `AuthGuard` will return `403` since required claims are absent.

### Hook registration

Register in `supabase/config.toml`:

```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

### Staleness tradeoff

Claims are baked at token issuance. If a user's role or branch changes, the old token remains
valid until expiry. Mitigation: keep access token TTL short (15 min) and rely on the refresh
flow to re-mint claims. Supabase's default TTL in `config.toml` is 3600 s — shorten it before
going to production.

---

## Part 3 — Backend: AuthGuard & Decorators

**Scope: NestJS backend only**
**Status: ❌ Not started — fully independent of the DB; can be built in parallel with Part 1**

### New files

```
src/shared/
  domain/
    user-context.ts
  infrastructure/
    guards/
      auth.guard.ts
      auth.guard.test.ts
    decorators/
      current-user.decorator.ts
      current-user.decorator.test.ts
      public.decorator.ts
      public.decorator.test.ts
```

### `user-context.ts`

Pure TypeScript — zero NestJS or Supabase imports:

```ts
export type MembershipRole = 'owner' | 'admin' | 'chef' | 'waiter' | 'cashier';

export interface UserContext {
  userId: string;
  email: string;
  orgId: string;
  branchId: string | null;  // null = org-level role (owner / admin)
  role: MembershipRole;
}
```

### `auth.guard.ts` logic

1. Check for `IS_PUBLIC_KEY` reflector metadata (set by `@Public()`). If present, allow immediately — covers `GET /health` and future auth callbacks.
2. Extract `Authorization: Bearer <token>` header. Return `401` if missing.
3. Verify JWT signature locally via `JwtService.verify()` using `SUPABASE_JWT_SECRET`. Return `401` on invalid signature or expiry.
4. Read `sub`, `email`, `app_metadata.org_id`, `app_metadata.role` from the decoded payload. Return `403` if any required claim is absent. `app_metadata.branch_id` is optional — absent or `null` means org-level access.
5. Validate that `app_metadata.role` is a known `MembershipRole` value. Return `403` if unrecognized.
6. Build and attach a `UserContext` to `request.user`.
7. Return `true`.

No Supabase client call. No database query. Dependencies: `JwtService` + `Reflector`.

### `current-user.decorator.ts`

```ts
export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext): UserContext =>
    ctx.switchToHttp().getRequest().user,
);
```

### `public.decorator.ts`

```ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### `AppModule` registration

Replace the current single `APP_GUARD` with two guards in priority order:

```ts
providers: [
  { provide: APP_GUARD, useClass: AuthGuard },     // runs first — validates JWT
  { provide: APP_GUARD, useClass: ThrottlerGuard },
  AppConfig,
],
```

Mark the health controller with `@Public()`:

```ts
@Public()
@Controller('health')
export class HealthController { ... }
```

### Throttle overrides for write/invite routes

```ts
@Throttle({ default: { ttl: 60_000, limit: 10 } })
@Post()
create(...) { ... }
```

---

## Part 4 — Feature Modules

**Status: ❌ Not started — depends on Parts 1, 2, and 3**

Each module follows the hexagonal layout: `domain/` → `application/` → `infrastructure/`.
All services receive `UserContext` via `@CurrentUser()` and must scope every query to
`userContext.orgId` (and `userContext.branchId` where applicable). Never trust client-supplied
IDs for scoping.

### `UsersModule`
- `GET /users/me` — return profile joined with membership (role, org, branch)
- `PATCH /users/me` — update `first_name`, `last_name`, `avatar_url` in `profiles`

### `OrganizationsModule`
- `POST /organizations` — create org + auto-assign `owner` membership to the caller; requires `tax_id` and `slug`
- `GET /organizations/:id` — scoped to caller's `org_id`
- `PATCH /organizations/:id` — update `name` and `slug` only; `tax_id` is immutable (owner/admin)

### `BranchesModule`
- `POST /organizations/:orgId/branches` — requires `code`; owner/admin only
- `GET /organizations/:orgId/branches` — scoped to caller's org
- `PATCH /organizations/:orgId/branches/:id` — update `name` and `address` only; `code` is immutable (owner/admin)

### `MembershipsModule`
- `POST /organizations/:orgId/members` — invite user by email; assigns role and optional `branch_id` (owner/admin)
- `PATCH /organizations/:orgId/members/:userId` — change role or branch assignment (owner/admin)
- `DELETE /organizations/:orgId/members/:userId` — remove member (owner/admin)

---

## Part 5 — Frontend (out of scope for this repo)

**Status: ❌ Not started — unblocked once Part 3 is deployed**

1. Initialize Supabase JS client with project URL and anon key.
2. Call `supabase.auth.signInWithPassword(...)`. Supabase returns an `access_token` with custom claims already injected.
3. Attach to every API request: `Authorization: Bearer <access_token>`.
4. On `401`, call `supabase.auth.refreshSession()` to re-mint claims, then retry.

---

## Implementation order

| # | Task | Scope | Status |
|---|------|-------|--------|
| 1 | `supabase migration new create_organizations` — write + apply | Supabase | ✅ Done |
| 2 | `supabase migration new create_branches` — write + apply | Supabase | ✅ Done |
| 3 | `supabase migration new create_profiles` — write + apply | Supabase | ✅ Done |
| 4 | `supabase migration new create_memberships` — write + apply | Supabase | ✅ Done |
| 5 | `pnpm gen:types` — regenerate `database.types.ts` | Backend | ✅ Done |
| 6 | Create `supabase/seed.sql` with one org, two branches, five users (one per role) | Supabase | ✅ Done |
| 7 | Create `MembershipRole` type + `UserContext` interface | Backend — `shared/domain` | ✅ Done |
| 8 | Create `AuthGuard` + tests | Backend — `shared/infrastructure/guards` | ✅ Done |
| 9 | Create `@CurrentUser()` decorator + tests | Backend — `shared/infrastructure/decorators` | ✅ Done |
| 10 | Create `@Public()` decorator + tests | Backend — `shared/infrastructure/decorators` | ✅ Done |
| 11 | Register `AuthGuard` as `APP_GUARD`; mark `HealthController` `@Public()` | Backend — `AppModule` | ✅ Done |
| 12 | Write + register custom claims Edge Function | Supabase | ✅ Done |
| 13 | `UsersModule` (domain → application → infrastructure) | Backend | ✅ Done |
| 14 | `OrganizationsModule` | Backend | ✅ Done |
| 14b | `OnboardingModule` — `POST /onboarding` (org + branch + membership in one call) | Backend | ✅ Done |
| 15 | `BranchesModule` | Backend | ❌ Todo |
| 16 | `MembershipsModule` | Backend | ❌ Todo |

**Steps 7–11** are fully independent of the DB and can run in parallel with steps 1–6.
**Step 12** requires steps 1–4 (the hook queries `memberships`, which must exist).
**Steps 13–16** require both the DB (steps 1–5) and the guard (steps 7–11).
