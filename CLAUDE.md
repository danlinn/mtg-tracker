@AGENTS.md

# Project-Specific Rules

## Prisma 7 (NOT Prisma 5/6)
- **No `url` in schema.prisma** — connection URL lives in `prisma.config.ts`, NOT in the schema's `datasource` block. Adding `url = env("DATABASE_URL")` to the schema will cause a build error.
- **Migrations**: Use `npx prisma db push` for schema changes. `prisma migrate dev` requires the URL in `prisma.config.ts` and has drift issues with this project.
- **Client instantiation**: Requires a Neon adapter. See `src/lib/prisma.ts` for the pattern. Never use `new PrismaClient()` without the adapter.
- **Scripts**: Any standalone script that uses Prisma must load `.env.local` via dotenv AND use the `PrismaNeon` adapter. See `src/scripts/backfill-last-played.ts` for the pattern.
- **Generate**: After schema changes, run `npx prisma generate` to update the client.

## Pre-push Checklist
1. `npm test` — all tests must pass
2. `npx next build` — build must succeed
3. After `git push`, check `vercel ls` to confirm deployment is "Ready"

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
