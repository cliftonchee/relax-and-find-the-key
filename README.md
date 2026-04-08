# Relax and Find the Key

A browser-based quiz game for practising database normalisation. Given a relation schema and a set of functional dependencies, identify all candidate keys before the clock runs out.

## How to Play

1. Choose a difficulty level on the home screen.
2. For each question you are shown:
   - A set of attributes (e.g. A, B, C, D)
   - A list of functional dependencies (e.g. A → B C)
3. Click attributes to build a candidate key, press **Add Key** to record it, and repeat until you have found all candidate keys.
4. Press **Submit** before the timer expires (time varies by difficulty—see table below).
5. Correct answers score points; the faster you answer the more points you earn.
6. After 10 questions your final score is shown and you can submit it to the leaderboard.

### Difficulty Levels

| Level  | Attributes | Candidate Keys | Time per Question | Score Multiplier |
|--------|-----------|----------------|-------------------|-----------------|
| Easy   | 3–4       | Exactly 1      | 60 seconds        | ×1              |
| Medium | 5–6       | Up to 2      | 90 seconds        | ×2              |
| Hard   | 6–8       | 2 or more      | 120 seconds       | ×3              |

### How Problems Are Generated

Each problem is algorithmically generated to match a specific difficulty level using both **quantitative** and **qualitative** criteria.

#### Generation Algorithm

1. **Configuration**: Load quantitative constraints (attribute/FD/key count ranges) and qualitative profile (semantic metrics)
2. **Random Generation** (up to 1000 attempts per problem):
   - Generate random attributes within the difficulty range
   - Generate random functional dependencies, biased by difficulty:
     - **Easy**: Single-attribute LHS only, RHS completely disjoint from LHS
     - **Medium**: Mix of single and composite LHS
     - **Hard**: Larger LHS allowed, RHS may overlap with LHS (~20% chance)
   - Compute candidate keys using the closure algorithm
   - Validate against **quantitative gates** (key count within range)
   - Validate against **qualitative gates** (difficulty metrics)
3. **Fallback**: If generation exhausts attempts, return a deterministically-constructed valid problem

#### Difficulty Metrics

Problems are characterized by seven semantic metrics that determine difficulty:

| Metric | Easy | Medium | Hard |
|--------|------|--------|------|
| **Chain Depth*** | 1–2 | 2–3 | 3–8 |
| **Redundant FDs** | 0 | 0–1 | 1–8 |
| **Composite Keys** | 0% | 30–100% | 50–100% |
| **Partial Dependency** | No | Yes | Yes |
| **Non-Trivial FDs** | ≥80% | ≥60% | ≥40% |
| **Avg LHS Size** | 1.0–1.3 | 1.0–1.8 | 1.4–8 |
| **Equivalence Attrs** | 0 | 0–2 | 2–8 |

*Chain Depth = rounds of FD application needed to derive all consequences. Cycles (A↔B) count as one step after both attributes appear.

#### Metric Definitions

- **Chain Depth**: How many iterative rounds of FD application are needed to derive all consequences from a starting attribute set. Higher values require more intermediate reasoning steps. Cycles are handled correctly—once both sides appear in the closure, applying the cycle no longer adds new attributes.

- **Redundant FDs**: Count of FDs that could be omitted without changing the candidate keys (i.e., FDs implied by others). Easy requires zero redundancy; hard tolerates multiple redundant FDs as a recognition challenge.

- **Composite Keys**: Percentage of candidate keys with more than one attribute. Composite keys require understanding key *minimality*; all-singleton keys are simpler.

- **Partial Dependency**: Whether non-key attributes depend on *proper subsets* of composite candidate keys. Tests 2NF understanding (violation signals partial dependency).

- **Non-Trivial FDs**: Percentage of FDs where RHS has zero overlap with LHS (completely non-trivial). Easy avoids semi-trivial FDs; hard allows them, requiring students to recognize which attributes truly derive from the LHS.

- **Avg LHS Size**: Average number of attributes on the left side of FDs. Larger composite-LHS FDs are harder to reason about.

- **Equivalence Attributes**: Count of attributes in mutual-determination cycles (if A→B and B→A, both A and B contribute to this count). Cycles create multiple interchangeable key components; hard problems require recognizing these symmetric relationships.

### Scoring

Each question is worth up to `timeRemaining × multiplier` points where `timeRemaining` is the number of seconds left when you submit. Running out of time scores 0 for that question. The maximum score per game is 3600 points on Hard difficulty (120 s × ×3 × 10 questions).

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
