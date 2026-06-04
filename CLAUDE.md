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

Follow NestJS feature-module structure. Every domain lives under `src/<feature>/`:

```
src/
  <feature>/
    <feature>.module.ts
    <feature>.controller.ts
    <feature>.service.ts
    <feature>.controller.spec.ts
    <feature>.service.spec.ts
    dto/
    entities/
```

- **Controllers** handle HTTP only — no business logic.
- **Services** own all business logic and database access.
- **Modules** declare their own providers; import only what they need.
- Use `@nestjs/config` + `.env` for all configuration. Never hardcode secrets.

## Code conventions

- Strict TypeScript: no `any`, no `@ts-ignore`.
- DTOs must use `class-validator` decorators for request validation; always pipe `ValidationPipe` globally.
- Use `@nestjs/swagger` decorators on DTOs and controllers so Swagger stays in sync.
- One class per file; file names in kebab-case matching the class name.
- Exports: named only (no default exports).
- Error handling: throw NestJS built-in `HttpException` subclasses (`NotFoundException`, `BadRequestException`, etc.); do not return error objects from controllers.

## Supabase integration

- Access Supabase via the `@supabase/supabase-js` client wrapped in an injectable `SupabaseService`.
- Use Row-Level Security (RLS) policies for authorization — do not replicate access logic in the NestJS layer.
- Migrations live in `supabase/migrations/`. Always generate them with `supabase migration new` rather than editing manually.
- Seed data goes in `supabase/seed.sql`.
- Never commit the service role key; load it from env (`SUPABASE_SERVICE_ROLE_KEY`).

## Testing

Every source file must have a companion test file in the same directory:

```
src/users/users.service.ts       → src/users/users.service.test.ts
src/users/users.controller.ts    → src/users/users.controller.test.ts
```

- **Never create or modify a source file without also creating/updating its `.test.ts` counterpart.**
- Unit tests: mock the service layer when testing controllers; mock the Supabase client when testing services.
- E2e tests: use a real local Supabase instance (`supabase start` before running `pnpm test:e2e`). E2e specs live under `test/` with the `.e2e-spec.ts` suffix.
- Aim for branch coverage on service methods; skip trivial pass-through controller tests.

## Security checklist

- All routes that require authentication must use a JWT guard (`@UseGuards(AuthGuard)`).
- Validate every incoming DTO with `class-validator`; reject unknown properties (`whitelist: true, forbidNonWhitelisted: true`).
- Never log request bodies or JWT tokens.
- Rate-limit public endpoints (e.g., auth) with `@nestjs/throttler`.
- Keep `CORS` origins explicit; never use `origin: '*'` in production.
