# Relax and Find the Key

A browser-based quiz game for practising database normalisation. Given a relation schema and a set of functional dependencies, identify all candidate keys before the clock runs out.

## How to Play

1. Choose a difficulty level on the home screen.
2. For each question you are shown:
   - A set of attributes (e.g. A, B, C, D)
   - A list of functional dependencies (e.g. A → B C)
3. Click attributes to build a candidate key, press **Add Key** to record it, and repeat until you have found all candidate keys.
4. Press **Submit** before the 60-second timer expires.
5. Correct answers score points; the faster you answer the more points you earn.
6. After 10 questions your final score is shown and you can submit it to the leaderboard.

### Difficulty Levels

| Level  | Attributes | Candidate Keys | Score Multiplier |
|--------|-----------|----------------|-----------------|
| Easy   | 3–4       | Exactly 1      | ×1              |
| Medium | 5–6       | Exactly 2      | ×2              |
| Hard   | 6–8       | 3 or more      | ×3              |

### Scoring

Each question is worth up to `timeRemaining × multiplier` points where `timeRemaining` is the number of seconds left when you submit. Running out of time scores 0 for that question. The maximum score per game is 1800 points on Hard difficulty (60 s × ×3 × 10 questions).

### Leaderboard

The top scores for each difficulty are stored in Supabase and displayed on the leaderboard page. After a game you are prompted for a username (up to 20 characters) before your score is submitted.

## Tech Stack

| Layer        | Technology                              |
|--------------|-----------------------------------------|
| Framework    | Next.js 16 (App Router)                 |
| Language     | TypeScript                              |
| Styling      | Tailwind CSS v4                         |
| UI components| shadcn/ui (Radix primitives)            |
| Database     | Supabase (PostgreSQL)                   |
| Testing      | Vitest                                  |

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/relax-and-find-the-key.git
cd relax-and-find-the-key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create a Supabase Project

Go to [supabase.com](https://supabase.com) and create a free project. Once your project is ready, open the **SQL Editor** and run the following to create the scores table:

```sql
create table scores (
  id          bigint generated always as identity primary key,
  username    text        not null,
  score       integer     not null,
  difficulty  text        not null check (difficulty in ('easy', 'medium', 'hard')),
  created_at  timestamptz not null default now()
);
```

### 4. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in the values from your Supabase project settings (Settings > API):

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Running Tests

```bash
npm test
```

Expected output: **29 tests passing** across 3 suites (solver, generator, scoring).

## Deployment

The project is designed to be deployed on [Vercel](https://vercel.com) with a [Supabase](https://supabase.com) backend.

1. Push the repository to GitHub.
2. Import the repository in the Vercel dashboard.
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) under **Settings > Environment Variables** in Vercel.
4. Deploy. Vercel will run `npm run build` automatically on every push to the main branch.

> **Note:** The build script uses `next build --webpack` instead of the default Turbopack bundler due to a sandbox environment constraint. Turbopack requires spawning child processes to handle PostCSS, which is blocked in certain sandboxed CI environments. On Vercel's standard build runners this flag is harmless and the build will succeed. Remove it and switch back to `next build` once your target environment allows unrestricted child-process spawning.
