# Tyralife

En Trello-liknande Life Plan-app. Desktop-fokuserad, inline-edit, drag-and-drop, dark/light mode.

## Tech stack

(Anpassad till samma versioner som `magda` och `tankbar-benchscore-bb`.)

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **React 19.2**
- **Tailwind CSS 4** (CSS-baserad config via `@theme`)
- **Prisma 6** + **Postgres** (Vercel Postgres / Neon / Supabase)
- **Auth.js v5** (NextAuth) med Prisma-adapter — magic link (Resend) + Google
- **@dnd-kit** för drag-and-drop (touch / mus / tangentbord)
- **Framer Motion** för layout-animationer (tasks som glider till toppen)
- **canvas-confetti** för fyrverkeri vid avbockad subkategori
- **next-themes** för dark/light mode
- **TanStack Query** för server state, **Zustand** för UI state

## Datamodell

```
User
 └─ Board                       (en livsplan)
     └─ Section (vertikal kolumn, dnd horisontellt)
         └─ Subcategory (dnd vertikalt, tar med tasks)
             └─ Task (dnd vertikalt, checkbox, completed flyttar till topp)
```

Alla `order`-fält är `Float` så vi kan göra fraktionell omsortering utan att skriva om hela listan (lexorank-stil — se `lib/ordering.ts`).

## Kom igång

```bash
# 1. Installera deps
npm install

# 2. Sätt upp .env (kopiera .env.example och fyll i)
cp .env.example .env
# Generera AUTH_SECRET:
openssl rand -base64 32

# 3. Skapa databas
npm run db:push       # eller: npm run db:migrate
npm run db:seed       # demo-data (skapar user demo@tyra.life)

# 4. Kör dev-server
npm run dev
```

## Deploy

1. Skapa Vercel-projekt, koppla repo
2. Lägg till en Postgres-databas i Vercel (Storage > Create) — den sätter `DATABASE_URL` automatiskt
3. Lägg till env-variabler: `AUTH_SECRET`, `AUTH_URL`, `AUTH_RESEND_KEY`, `EMAIL_FROM`
4. Deploy — `npm run build` kör `generate-version.js` + `prisma generate` + `next build`
5. Vid första deployen: kör `npx prisma db push` mot prod-DB lokalt

## Versionshantering & cache buster

Samma mönster som `magda` och `tankbar-benchscore-bb`:

- `scripts/generate-version.js` skapar `public/version.json` vid varje build/dev med:
  - `version` (semver från `package.json`)
  - `commitHash` (kort git-SHA)
  - `buildTime` (ISO-tid)
- `/version.json` serveras med `Cache-Control: no-store` (se `next.config.mjs`)
- `components/version-watcher.tsx` pollar var 60:e sekund — om `commitHash` ändrats visas en "ladda om"-prompt
- `/_next/static/*` cachas immutable i 1 år (Next hashar filnamnen)

### Bumpa version

```bash
npm run release:patch    # 0.1.0 → 0.1.1
npm run release:minor    # 0.1.0 → 0.2.0
npm run release:major    # 0.1.0 → 1.0.0
```

## Arkitektur

```
app/
├── api/                    # Route handlers (CRUD + reorder)
│   ├── auth/[...nextauth]/
│   ├── boards/
│   ├── sections/           # POST + /[id] + /reorder
│   ├── subcategories/
│   └── tasks/
├── board/[id]/page.tsx     # Hämtar board server-side, skickar till BoardView
├── signin/page.tsx         # Magic link + Google login
├── layout.tsx
└── page.tsx                # Redirect till första boarden

lib/
├── auth.ts                 # Full auth setup (Node runtime)
├── auth.config.ts          # Edge-säker config (för proxy/middleware)
├── prisma.ts               # PrismaClient singleton
├── api.ts                  # API helpers (requireUser, owner checks)
├── api-client.ts           # Klient-fetch wrappers
├── board-store.ts          # Zustand store med optimistic mutations
├── ordering.ts             # Fraktionell ordering (computeOrder)
├── types.ts                # Delade typer
├── utils.ts                # cn() classname helper
└── version.ts              # APP_VERSION från package.json

components/
├── board/
│   ├── board-view.tsx          # Top-level klient (DnD för sektioner)
│   ├── section-column.tsx      # Vertikal kolumn (DnD för subkategorier)
│   ├── subcategory-card.tsx    # Subkategori (DnD för tasks + confetti)
│   ├── task-item.tsx           # Task (checkbox, inline-edit)
│   ├── inline-edit.tsx         # Återanvändbar inline-edit
│   └── use-horizontal-scroll.ts # Mushjul → horisontell scroll
├── providers.tsx           # ThemeProvider + QueryClient + VersionWatcher
├── theme-toggle.tsx        # Light/Dark/System cycle
└── version-watcher.tsx     # Pollar /version.json

prisma/
├── schema.prisma
└── seed.ts                 # 6 sektioner, ~13 subkategorier, ~25 tasks

scripts/
└── generate-version.js     # Genererar public/version.json
```

## Skript

| Kommando | Vad det gör |
|---|---|
| `npm run dev` | Dev-server på :3000 (kör generate-version först) |
| `npm run build` | generate-version + prisma generate + next build |
| `npm run type-check` | tsc --noEmit |
| `npm run db:push` | Synka schema till DB (ingen migration-fil) |
| `npm run db:migrate` | Skapa migration-fil och köra den |
| `npm run db:seed` | Seeda demo-data |
| `npm run db:studio` | Öppna Prisma Studio |
| `npm run db:reset` | Nolla DB + kör migrations + seed |
| `npm run release:patch\|minor\|major` | Bumpa version + regenerera version.json |

## UX-noteringar

- **Inline edit**: klicka på titel/beskrivning för att redigera. Enter sparar, Escape avbryter, blur sparar.
- **Drag & drop**: GripVertical-handen syns vid hover. Pekare/touch (200ms delay)/tangentbord stöds.
- **Horisontell scroll**: mushjul (vertikal scroll konverteras), pil-vänster/höger, Home/End, touch-swipe, scroll-snap till kolumner.
- **Tasks**: completed flyter till toppen i listan. När en subkategori är 100% klar — fyrverkeri inom kortet.
- **Tema**: cykla light → dark → system via knappen uppe till höger. `prefers-color-scheme` styr "system".
