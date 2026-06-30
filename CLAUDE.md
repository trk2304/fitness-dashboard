# CLAUDE.md — Health & Fitness Dashboard

Personal daily health tracker. **Single user** (the owner), private, behind a login. Also a **portfolio piece**, so build it for real: clean code, proper auth, deployed.

## Stack (decided — do not substitute)
- **Vue 3 + Vite** (JavaScript, not TypeScript)
- **Tailwind CSS v4** via the official `@tailwindcss/vite` plugin
- **Supabase** (Postgres + Auth + Row Level Security) as the backend
- **Chart.js** via `vue-chartjs` for charts
- **Netlify** hosting, auto-deploy from GitHub

One-line rationale: this is a private, interactive *app*, not a static content *site* — so Vue (built for client interactivity) + a real database, over a static-site generator like Astro.

## CRITICAL setup gotcha — Tailwind v4
Use the **v4 plugin flow**, NOT the legacy v3 PostCSS flow.
- Install `tailwindcss` + `@tailwindcss/vite`
- Add `tailwindcss()` to the `vite.config.js` plugins array (alongside `vue()`)
- One line in the main CSS: `@import "tailwindcss";`
- Do **NOT** create `postcss.config.js` or `tailwind.config.js`, do **NOT** install `autoprefixer`, do **NOT** use `@tailwind base/components/utilities` directives. Those are v3 patterns and will error or silently do nothing in v4.

## Architecture
- **One long scrolling dashboard** (Notion-style), single page.
- Same blocks on every device; CSS reflows them by width (Tailwind breakpoint prefixes, e.g. `md:grid-cols-4`).
- Scrolling dashboard blocks, by **importance**, identical across devices:
  1. Today's status cards — steps/cal/protein vs goal, workout streak ("the score")
  2. Weight trend — line chart
  3. Daily steps — bar chart
  4. Food swaps — list
  5. Journal — posts
- **Quick entry + Goals editor live in a modal**, not the scroll: opened by a
  "＋ Log today" button in the **sticky nav** header, both stacked in one box over
  a shaded overlay (reusable `Modal.vue`). Logging there updates the dashboard
  cards/charts live behind it (shared `useDailyLog` cache).
- **Review-first, all devices** (revised from the original entry-first plan, 2026-06-30): the owner wants to *see how today is tracking throughout the day*, so the daily score sits on top and entry lives just below it. Entry stays reachable, not dominant.
- **Gamification is a primary design goal.** The owner is motivated by the daily score and by seeing the same data rendered *multiple ways* (today's stat cards, weight line chart, step bar chart, streak). Favor feedback that makes progress feel visible and rewarding — progress bars, streaks, goal-vs-actual color states (green = good, red = over a ceiling). Goal direction matters: floors (steps, protein) reward reaching/beating; ceilings (calories) reward staying at/under.

## Design system — "Momentum" (light + dark)
- **Tokens** live in `src/style.css` via Tailwind v4 `@theme`: `--font-display` (Bricolage Grotesque, used for headings/numbers via `font-display`), `--font-sans` (Inter, body); brand `--color-brand` #6366f1 (`brand`), `--color-brand-strong`, `--color-brand-soft` (#818cf8, brighter for dark); `--color-canvas` (light bg), `--color-night` (dark bg), `--color-surf-dark` (dark card). Fonts loaded via `<link>` in `index.html`.
- **Signature:** the workout streak rendered as a violet→cyan gradient "score" card (`StatusCards.vue`). Brand color = violet/indigo; semantic green=good / red=over-ceiling is preserved separately. Cards: `rounded-2xl bg-white ring-1 ring-slate-100` (light) / `dark:bg-surf-dark dark:ring-white/10`.
- **Dark mode:** class-based — `@custom-variant dark (&:where(.dark,.dark *))` + a `.dark` class on `<html>`. An anti-FOUC inline script in `index.html` sets it pre-paint from `localStorage('theme')` / system pref; `useTheme.js` mirrors + toggles it (sun/moon button in nav). **Chart.js colors aren't CSS** — WeightChart/StepsChart take `isDark` and switch tick/grid/series colors in computed options.

## Data model (already built in Supabase)
Four tables. Convention: every table has `created_at timestamptz default now()` and a `user_id` auto-stamped via `default auth.uid()` (except `goals`, see below).

**`goals`** — current targets, exactly ONE row per user
- `id uuid pk references auth.users(id) on delete cascade` — PK *is* the user id, which structurally guarantees one row per user
- `step_goal int`, `calorie_goal int`, `protein_goal int`

**`daily_log`** — one row per day (the core table)
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`
- `entry_date date not null default current_date`
- `weight_lbs numeric`, `steps int`, `calories int`, `protein_g int` (all nullable)
- `workout_done boolean not null default false`
- `step_goal int`, `calorie_goal int`, `protein_goal int` — **frozen snapshot** of goals at save time
- `created_at timestamptz not null default now()`
- `unique (user_id, entry_date)` — one entry per day per user

**`journal`** — `id`, `user_id`, `entry_date`, `title text`, `content text`, `created_at`

**`food_swaps`** — `id`, `user_id`, `from_item text`, `to_item text`, `note text`, `created_at` (NO date — it's a standing list, not a daily log)

### Locked modeling decisions (do NOT "fix" these)
- Goal snapshots on `daily_log` are **intentional, not redundant**: `goals` = "aiming for now"; the daily snapshot = "aimed for then". Goals drop as weight drops, and past days must keep the bar they were judged against.
- Streak is **computed at read time** from `workout_done` — never stored as a counter (counters drift out of sync with reality).
- The frontend **never sends `user_id`** — `default auth.uid()` stamps the owner from the verified login. The app sends only the actual data.
- Units live in column names (`weight_lbs`, `protein_g`). Strings use `text`, not `varchar(n)`.

## Security (already applied)
- **RLS enabled** on all four tables. (Enabling RLS is a *separate step* from writing policies — both are required; policies do nothing until RLS is enabled.)
- Policy on each table: `for all using (auth.uid() = user_id) with check (auth.uid() = user_id)` — `goals` uses `auth.uid() = id`. `using` filters rows coming out (read/update/delete); `with check` gates rows going in (insert/update).
- Grants: `select, insert, update, delete` to the `authenticated` role on each table.
- **Never commit `.env`.** The Supabase **anon key is public-safe** (RLS is what protects data). The **service_role key must never touch the frontend.**

## Build sequence (current position: about to scaffold)
1. **Scaffold** — Vite + Vue + Tailwind v4 + `@supabase/supabase-js`, `git init`, then create the GitHub repo and push the working scaffold as commit #1.  ← NEXT
2. **Connect + read test** — wire up `supabase-js`, run a throwaway `select` from `daily_log`. An empty result with no error proves both the connection and that RLS is working.
3. **Auth** — email/password sign-up + login. Creates the real user, so `auth.uid()` becomes live and the data layer comes alive.
4. **First vertical slice** — the `log today` form writes one real `daily_log` row, reads it back, and renders it. Prove the whole stack end-to-end before building breadth.

Why this order: RLS + the `not null` on `user_id` make writes impossible until a user is logged in, so **auth must precede the entry form**. A *read* test can run pre-auth (empty = success), which is why step 2 is safe before step 3.

## Working style with the owner
- Returning developer (solid HTML/CSS/JS/PHP/MySQL/Python/Vue background, knocking off rust). Learning is a primary goal alongside shipping.
- **Explain reasoning before implementing.** Pair technical terms with plain-language analogies.
- Prefer **structural guarantees** (DB constraints, sensible defaults) over "remember to be careful" code.
- He reviews output critically — surface your decisions and trade-offs, don't just dump code.
- Keep operational docs **lean**: signal over prose.
