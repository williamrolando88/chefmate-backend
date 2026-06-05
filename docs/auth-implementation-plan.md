# Auth Implementation Plan

## Overview

Client-side authentication is handled entirely by Supabase Auth. The backend treats the
resulting JWT as a signed, self-contained credential and validates it locally — no Supabase
API call per request. Org and branch membership are embedded in the JWT as custom claims,
injected server-side at login time via a Supabase Edge Function hook.

---

## Part 1 — Supabase Hook: Custom Claims Injection

**Scope: Supabase (not NestJS backend, not frontend)**

A PostgreSQL hook (or Edge Function) runs after every successful login and adds `org_id` and
`branch_id` to the token's `app_metadata`. Because this runs server-side inside Supabase, the
client cannot forge or modify these claims — any tampering invalidates the JWT signature.

### Steps

1. Create the supporting tables (done as part of the DB setup milestone, not this plan):
   - `organizations(id, name, ...)`
   - `branches(id, org_id, name, ...)`
   - `user_memberships(user_id, org_id, branch_id, role, ...)` — links a Supabase auth user
     to an org and branch.

2. Create a Supabase Edge Function `supabase/functions/custom-claims/index.ts`:
   ```ts
   // Triggered by the auth hook on every token refresh/login.
   // Queries user_memberships and returns { org_id, branch_id }
   // which Supabase merges into app_metadata before signing the JWT.
   ```

3. Register the hook in `supabase/config.toml`:
   ```toml
   [auth.hook.custom_access_token]
   enabled = true
   uri = "pg-functions://postgres/public/custom_access_token_hook"
   ```
   (Alternatively use the Supabase dashboard hook registration.)

4. The resulting JWT payload will include:
   ```json
   {
     "sub": "<user_uuid>",
     "email": "user@example.com",
     "app_metadata": {
       "org_id": "<org_uuid>",
       "branch_id": "<branch_uuid>"
     }
   }
   ```

### Staleness tradeoff

Claims are baked at token issuance. If a user's org/branch changes, the old token remains
valid until expiry. Mitigation: keep access token TTL short (15 min) and rely on the refresh
flow to re-mint claims. For immediate revocation needs, a token blocklist table can be added
to the guard lookup later.

---

## Part 2 — Backend: AuthGuard

**Scope: NestJS backend only**

### New files

```
src/shared/
  domain/
    user-context.ts                           # value type for the decoded JWT payload
  infrastructure/
    guards/
      auth.guard.ts                           # JWT validation + claims extraction
      auth.guard.test.ts
    decorators/
      current-user.decorator.ts               # @CurrentUser() param decorator
      current-user.decorator.test.ts
```

### `user-context.ts`

Pure TypeScript interface, zero framework dependencies:

```ts
export interface UserContext {
  userId: string;
  email: string;
  orgId: string;
  branchId: string;
}
```

### `auth.guard.ts` logic

1. Extract the `Authorization: Bearer <token>` header. Return `401` if missing.
2. Verify the JWT signature locally using `SUPABASE_JWT_SECRET` from env (via `@nestjs/jwt`
   or the `jsonwebtoken` package). Return `401` on invalid signature or expiry.
3. Read `sub`, `email`, `app_metadata.org_id`, `app_metadata.branch_id` from the decoded
   payload. Return `403` if any required claim is absent.
4. Attach a `UserContext` object to `request.user`.
5. Return `true` to allow the request through.

No Supabase client call. No database query. The guard depends only on `JwtService` (or raw
`jsonwebtoken`) and `ConfigService`.

### `current-user.decorator.ts`

```ts
export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext): UserContext =>
    ctx.switchToHttp().getRequest().user,
);
```

### Registration

Apply `AuthGuard` globally in `AppModule` via `APP_GUARD` so every route is protected by
default. Expose a `@Public()` decorator for routes that opt out (e.g., health check).

### Dependencies to install

```bash
pnpm add @nestjs/jwt jsonwebtoken
pnpm add -D @types/jsonwebtoken
```

---

## Part 3 — Frontend

**Scope: client application (not this repo)**

1. Initialize the Supabase JS client with the project URL and anon key.
2. Call `supabase.auth.signInWithPassword(...)` (or OAuth). Supabase returns an
   `access_token` (the JWT with custom claims already injected by the hook).
3. Store the token (memory preferred; `localStorage` only if necessary).
4. Attach to every API request:
   ```
   Authorization: Bearer <access_token>
   ```
5. On `401` response from the backend, call `supabase.auth.refreshSession()` to get a new
   access token (re-triggers the hook, refreshing org/branch claims), then retry the request.

---

## Implementation order

| # | Task | Scope |
|---|------|-------|
| 1 | Install `@nestjs/jwt`, `jsonwebtoken` | Backend |
| 2 | Create `UserContext` interface | Backend — domain |
| 3 | Create `AuthGuard` + tests | Backend — infrastructure |
| 4 | Create `@CurrentUser()` decorator + tests | Backend — infrastructure |
| 5 | Register guard globally; add `@Public()` decorator | Backend — AppModule |
| 6 | Create DB tables (`organizations`, `branches`, `user_memberships`) | Supabase migration |
| 7 | Write and deploy custom claims Edge Function | Supabase |
| 8 | Register the auth hook in Supabase | Supabase |
| 9 | Wire frontend auth flow + token forwarding | Frontend |

Steps 1–5 are fully independent of the DB and can be done right now on this branch.
Steps 6–8 depend on the DB setup milestone.
Step 9 is unblocked once the backend guard is deployed.
