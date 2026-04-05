# MTG Commander Tracker

Track Magic: The Gathering Commander games, decks, and player stats.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL on Neon
- **ORM**: Prisma 7 with Neon serverless adapter
- **Auth**: NextAuth 4 (credentials provider, JWT sessions)
- **Styling**: Tailwind CSS v4 with 6 custom themes
- **Hosting**: Vercel
- **Tests**: Jest + ts-jest (unit), Playwright-ready e2e

## Getting Started

### Prerequisites

- Node.js 20+
- A Neon PostgreSQL database (or any Postgres)

### Environment Setup

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `POSTGRES_URL` — Neon pooled connection string
- `POSTGRES_PRISMA_URL` — Neon connection string with `connect_timeout`
- `DATABASE_URL` — fallback connection string
- `NEXTAUTH_SECRET` — random string for JWT signing (min 32 chars)
- `NEXTAUTH_URL` — your app URL (e.g. `http://localhost:3000`)

### Install & Run

```bash
npm install
npx prisma generate
npx prisma db push        # sync schema to database
npm run dev                # start dev server at localhost:3000
```

### First User

Register at `/sign-up-here`. To make yourself admin, update the database directly:

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'your@email.com';
```

## Database (Prisma 7)

**Important**: This project uses Prisma 7, which differs significantly from earlier versions.

- The schema is at `prisma/schema.prisma`
- Connection URL is configured in `prisma.config.ts` (NOT in the schema)
- The client requires the `PrismaNeon` adapter — see `src/lib/prisma.ts`
- **Do not add `url = env(...)` to the `datasource` block** — Prisma 7 will reject it

### Common Commands

```bash
npx prisma generate        # regenerate client after schema changes
npx prisma db push         # apply schema changes to database
npx prisma studio          # visual database browser
```

### Standalone Scripts

Scripts that use Prisma must configure the adapter manually. See `src/scripts/backfill-last-played.ts` for the pattern:

```bash
npx tsx src/scripts/backfill-last-played.ts
```

## Testing

```bash
npm test                   # run unit tests (API routes)
npm test -- --coverage     # with coverage report
npm run test:e2e           # e2e tests (requires running dev server)
npm run test:all           # all tests
```

Coverage threshold is 70% on all metrics (statements, branches, functions, lines). Currently at 95%+.

### Test Structure

- `src/__tests__/api-*.test.ts` — API route unit tests (mocked Prisma + auth)
- `src/__tests__/e2e/` — end-to-end tests against running server

## Project Structure

```
src/
  app/
    (app)/                 # Authenticated pages (wrapped by NavBar + auth check)
      dashboard/           # User dashboard with stats
      decks/               # Deck CRUD (list, new, [id]/edit)
      games/               # Game history + logging (list, new)
      leaderboard/         # Player rankings
      players/             # Player profiles ([id], [id]/decks/[deckId])
      admin/               # Admin panel (users, decks management)
    (auth)/                # Public auth pages (login, sign-up)
    api/                   # API routes
      admin/               # Admin-only endpoints
      cards/               # Scryfall proxy for card search
      decks/               # Deck CRUD
      games/               # Game logging + history
      health/              # Database health check
      leaderboard/         # Leaderboard data
      players/             # Public player profiles + deck views
      register/            # User registration
      stats/               # Dashboard stats
      theme/               # Theme preference (GET/PUT)
      users/               # User list with decks (for game logging)
  components/
    NavBar.tsx             # Main navigation with theme switcher
    ColorPips.tsx          # MTG color identity display
    CommanderSearch.tsx    # Card autocomplete via Scryfall
    Providers.tsx          # Session + theme context wrapper
  lib/
    auth.ts               # NextAuth configuration
    auth-helpers.ts       # Session/role utilities
    prisma.ts             # Prisma client with Neon adapter
    theme.tsx             # Theme context (syncs to DB per user)
    deck-stats.ts         # Shared deck stats calculation
  scripts/
    backfill-last-played.ts  # One-time migration script
  generated/prisma/       # Generated Prisma client (gitignored)
prisma/
  schema.prisma           # Database schema
prisma.config.ts          # Prisma 7 config (connection URL)
```

## Features

### Decks
- Create/edit decks with commander search (Scryfall API)
- Partner/second commander support
- Color identity, bracket (1-5), EDHP score, decklist
- MTG color gradients on deck cards

### Games
- Log 2-4 player games with deck selection
- Win labels: Nice Win, Big Win!, Easy Win (based on bracket/EDHP diff)
- Notes and asterisk marking
- Sorted by date + creation time

### Stats
- Per-deck win rates (overall + by player count: 2/3/4)
- Dashboard sorted by last played
- Per-user stats on player profiles

### Themes
Six themes persisted per-user in the database:
- **Default** — clean light theme
- **Old School** — gold/leather arcane fantasy (Cinzel + Philosopher fonts)
- **Synth** — aqua/pink/purple flowing gradients
- **Cyber** — neon cyan cyberpunk with scanlines
- **Flame** — synthwave sunset palette
- **Chris** — stark black & white

### Pagination
Games, leaderboard, and players lists support pagination with 20/50/100 per page.

## API Conventions

- All authenticated endpoints check `getCurrentUserId()` and return 401 if null
- Admin endpoints check `isAdmin()` and return 403 if not admin
- Paginated endpoints accept `?page=1&perPage=20` and return:
  ```json
  { "items": [...], "total": 100, "page": 1, "perPage": 20, "totalPages": 5 }
  ```
- All mutations have try-catch with JSON parse error handling (400) and DB error handling (500)
- Game creation uses a Prisma `$transaction` for atomicity

## Deployment

Deployed on Vercel. Pushes to any branch trigger a deployment.

```bash
git push                   # triggers Vercel deploy
vercel ls                  # check deployment status
vercel logs                # view runtime logs
```

CI runs on all pushes via GitHub Actions (`.github/workflows/ci.yml`): install, generate, lint, test, build.

## Timezone

All date displays use Pacific time (`America/Los_Angeles`).
