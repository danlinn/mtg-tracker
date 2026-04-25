@AGENTS.md

# Project-Specific Rules

## Prisma 7 (NOT Prisma 5/6)
- **No `url` in schema.prisma** — connection URL lives in `prisma.config.ts`, NOT in the schema's `datasource` block. Adding `url = env("DATABASE_URL")` to the schema will cause a build error.
- **Migrations**: Use `npx prisma db push` for schema changes. `prisma migrate dev` requires the URL in `prisma.config.ts` and has drift issues with this project.
- **NEVER use `--accept-data-loss`** with `prisma db push`. This flag silently drops columns and recreates tables. It previously wiped all game data in production. If `db push` warns about data loss, stop and fix the schema diff manually.
- **Client instantiation**: Requires a Neon adapter. See `src/lib/prisma.ts` for the pattern. Never use `new PrismaClient()` without the adapter.
- **Scripts**: Any standalone script that uses Prisma must load `.env.local` via dotenv AND use the `PrismaNeon` adapter. See `src/scripts/backfill-last-played.ts` for the pattern.
- **Generate**: After schema changes, run `npx prisma generate` to update the client.

## Pre-push Checklist
1. `npm test` — all tests must pass
2. `npx next build` — build must succeed
3. After `git push`, check `vercel ls` to confirm deployment is "Ready"

## Git Workflow
- The default branch is `main`. **Always develop on a feature branch** and
  open a PR to merge into `main`. PRs auto-merge when CI passes.
- `prisma db push` is a **local** operation run before pushing schema
  changes. It is intentionally not part of the Vercel build command.

## API Response Patterns
- Paginated list endpoints return `{ items, total, page, perPage, totalPages }` (where `items` is named contextually: `games`, `decks`, `entries`)
- All mutation endpoints have try-catch with proper error responses
- Auth check: `getCurrentUserId()` returns null if not authenticated -> return 401

## Playgroup Scoping (IMPORTANT)
Every query that returns games, players, or stats MUST go through the playgroup
helpers in `src/lib/playgroup.ts`. Never write a bare `prisma.game.findMany` or
`prisma.gamePlayer.findMany` in a user-facing endpoint.

Use these helpers:
- `buildGameWhere(userId)` — returns Prisma `where` for games (specific group or user's groups + unassigned)
- `buildGamePlayerWhere(userId)` — same, nested under `game` key for GamePlayer
- `getActivePlaygroupId()` — returns the active playgroup from cookie, or null for "All Groups"
- `getPlaygroupIdsForUser(userId)` — user's playgroup memberships

**Scope-relevant tables:** Game, GamePlayer, and User listings (via playgroupMembers).
**NOT scope-relevant:** Deck (user-owned), admin routes, register/verify/theme/health.

When adding a new endpoint that reads games/stats/players, grep for `buildGameWhere`
in similar endpoints and follow the same pattern. The cookie-based active playgroup
context flows automatically — never pass playgroup IDs around manually.

## Timezone
- All date displays use `America/Los_Angeles` (Pacific time)

## Database Backups
Automated via `.github/workflows/db-backup.yml`:
- Runs **daily at 11:00 UTC** (4am Pacific)
- Runs **on every push to `main` that changes `prisma/schema.prisma`**
- Can be triggered **manually** via GitHub Actions → "DB Backup" → "Run workflow"

Requires a GitHub repo secret named `DATABASE_URL` pointing at the production
Neon DB (use `NEON_DATABASE_URL_UNPOOLED` from the Vercel env — schema dumps
should go through the unpooled connection).

Backups are stored as GitHub Actions artifacts with **90-day retention**.
Download with `gh run download <run-id>`.

Restore: `DATABASE_URL=... ./scripts/restore-db.sh path/to/backup.sql.gz`
(prompts for confirmation — uses `pg_dump --clean --if-exists`, so it drops
and reloads every table).

Before any risky schema change, manually trigger the workflow to grab a
fresh snapshot.
