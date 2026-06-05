# ChefMate Backend

NestJS 11 API backed by Supabase (PostgreSQL + Auth). Package manager: **pnpm**.

## Dev commands

```bash
pnpm start:dev          # watch mode (port 3000)
pnpm build              # compile to dist/
pnpm test               # unit tests (Jest)
pnpm test:e2e           # end-to-end tests
pnpm test:cov           # coverage report
pnpm lint               # ESLint + auto-fix
pnpm format             # Prettier
```

Supabase local stack:
```bash
supabase start          # starts local Postgres, Auth, Studio (port 54323)
supabase stop
supabase db reset       # re-run migrations + seed
supabase migration new <name>
```

## Architecture

Follow a **pragmatic ports-and-adapters** (hexagonal) layout. Every domain lives under `src/<feature>/` and is split into three layers:

```
src/
  shared/
    infrastructure/
      supabase/
        supabase.module.ts        # @Global() — imported once in AppModule
        supabase.service.ts       # wraps the Supabase JS client
      guards/
        auth.guard.ts             # JWT guard shared across features
      filters/                    # global exception filters
      interceptors/               # global interceptors
    domain/                       # shared value objects / base types (if needed)
  <feature>/
    domain/
      <feature>.entity.ts                      # pure domain model — no framework deps
      <feature>.repository.ts                  # PORT: abstract class defining the contract
    application/
      <feature>.service.ts                     # use cases — imports domain only
      dto/                                     # input/output contracts (class-validator + Swagger)
    infrastructure/
      supabase-<feature>.repository.ts         # ADAPTER: implements the repository port
      <feature>.controller.ts                  # HTTP adapter (NestJS decorators live here)
    <feature>.module.ts                        # wires ports to adapters via DI
```

`shared/` is the only place for cross-cutting infrastructure. Never put shared concerns directly inside a feature folder.

### Layer rules

- **`domain/`** — zero NestJS or Supabase imports. Plain TypeScript classes and abstract repository contracts.
- **`application/`** — imports from `domain/` only. Owns all business logic and orchestrates use cases via the repository port.
- **`infrastructure/`** — the only layer allowed to import NestJS decorators, Supabase client, or other external libs. Contains HTTP controllers and repository adapters.
- **`<feature>.module.ts`** — binds each port to its adapter:
  ```ts
  { provide: FeatureRepository, useClass: SupabaseFeatureRepository }
  ```

### Key principles

- **Controllers** handle HTTP only — validate input, call the service, return the response.
- **Services** own all business logic; they depend on repository ports, never on concrete adapters.
- **Modules** declare their own providers and import only what they need.
- Use `@nestjs/config` + `.env` for all configuration. Never hardcode secrets.

## Code conventions

- Strict TypeScript: no `any`, no `@ts-ignore`.
- DTOs must use `class-validator` decorators for request validation; always pipe `ValidationPipe` globally.
- Use `@nestjs/swagger` decorators on DTOs and controllers so Swagger stays in sync.
- One class per file; file names in kebab-case matching the class name.
- Exports: named only (no default exports).
- Error handling: throw NestJS built-in `HttpException` subclasses (`NotFoundException`, `BadRequestException`, etc.); do not return error objects from controllers.

## Supabase integration

- Access Supabase via the `@supabase/supabase-js` client wrapped in `src/shared/infrastructure/supabase/supabase.service.ts`. Import `SupabaseModule` in `AppModule` only — it is `@Global()` so feature modules do not need to re-import it.
- The backend uses the service-role key and owns all authorization in the NestJS service layer. Feature services must enforce access control explicitly; do not rely on Supabase RLS as a primary guard.
- Migrations live in `supabase/migrations/`. Always generate them with `supabase migration new` rather than editing manually.
- Seed data goes in `supabase/seed.sql`.
- Never commit the service role key; load it from env (`SUPABASE_SERVICE_ROLE_KEY`).

## Testing

Every source file must have a companion test file co-located in the same directory:

```
src/shared/infrastructure/supabase/supabase.service.ts   → supabase.service.test.ts
src/users/domain/user.entity.ts                          → user.entity.test.ts
src/users/application/users.service.ts                   → users.service.test.ts
src/users/infrastructure/users.controller.ts             → users.controller.test.ts
src/users/infrastructure/supabase-users.repository.ts    → supabase-users.repository.test.ts
```

- **Never create or modify a source file without also creating/updating its `.test.ts` counterpart.**
- Unit tests for **services**: mock the repository port (inject a fake implementing the abstract class).
- Unit tests for **controllers**: mock the service.
- Unit tests for **repository adapters**: mock the Supabase client.
- E2e tests: use a real local Supabase instance (`supabase start` before running `pnpm test:e2e`). E2e specs live under `test/` with the `.e2e-spec.ts` suffix.
- Aim for branch coverage on service methods; skip trivial pass-through controller tests.

## Security checklist

- All routes that require authentication must use a JWT guard (`@UseGuards(AuthGuard)`).
- Validate every incoming DTO with `class-validator`; reject unknown properties (`whitelist: true, forbidNonWhitelisted: true`).
- Never log request bodies or JWT tokens.
- Rate-limit public endpoints (e.g., auth) with `@nestjs/throttler`.
- Keep `CORS` origins explicit; never use `origin: '*'` in production.
