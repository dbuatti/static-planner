# Static Planner — Project Rules

## File layout
- `index.html` is the single source of truth for the planner app (all HTML, CSS, and JS inline).
- `page.html` is a duplicate of `index.html`. **After every edit, sync it**: `cp index.html page.html`.
- `index (BACKUP).html` is a pre-existing backup — never touch it.

## How time is counted (this is the user's model)
- Meals (`Lunch`/`Dinner`/`Breakfast`/`Meal`) and `FREE DAY` / free blocks are **excluded** from totals.
- FNH meetups/catchups, teaching/coaching, tasks, travel **count**.
- The day-panel category bar and the week summary already implement this (`eventCategory`, `cat.id === 'meal'`, `cat.id === 'free'`). Do not "fix" a day total by including meals — the app is correct; a naive sum that includes meals will look heavier than the app.

## Week planning conventions
- The weekly discretionary cap is ~6h on top of booked appointments. Appointments are fixed and never changed.
- Tasks/anchors should be scheduled between **10am–4pm** where the day has room; splitting/not-back-to-back is fine. Tasks start **no earlier than 10am** unless the day genuinely can't fit them otherwise (e.g. an errand that closes, or a morning-only commitment).
- Daily anchors (when requested): 15m room clean, 15m journal — the incremental path toward the weekly goals (clean room, house vacuumed).
- **Daily coffee corner**: each day gets a ~10:00–11:00 coffee corner (@Little Quarter) for admin tasks — a `☕ Coffee` anchor (`tickable:false, coffee:true`) followed by that day's admin tasks marked `coffee:true`. If 10–11 is already booked (e.g. Mastery), anchor the corner to that day's main admin block instead.
- **Transaction cadence**: transactions are caught up to 29 Jul. Update transactions **every Sunday** (that's the recurring transaction task; the Sunday money date handles it). **Thursday** is the **allowance transfer** day (dynamic Thu rule adds "💰 Allowance transfer" 11–11:30). No daily transaction-anchor tasks.
- When the user asks for a "week plan", pull tasks from the **Tasks page** (`#tab-lookin`, Eisenhower matrix) and the Strategy cards — not invented tasks.
- Blood test is a **walk-in on Mon 17 Aug 8–9am**, not a "book it" task. It is due 4 weeks from 20 Jul, so it must stay on/after 17 Aug.

## Tasks page = Eisenhower matrix (sections, in order)
1. 🔴 **DO FIRST** — Urgent & Important (Bali payment, deposit gig cash, ING card, stop MOISES)
2. 🟠 **SCHEDULE** — Important, Not Urgent
3. 🔵 **QUICK WINS** — Urgent, Less Important
4. ⚪ **WHEN TIME** — Not Urgent, Less Important
5. ⏳ **WAITING** — Awaiting reply
- Moving a task to DO FIRST means moving its `<div class="tc tickable">` block into that section (and removing it from its old section).

## Tick / checkbox system
- Tickable items use `class="tc tickable"` with `data-tickid` (auto-assigned from `_tickId` for day events; the Tasks page uses its own `tick-` localStorage keys).
- Completed tasks on the Tasks page can be removed when the user says they've completed them.

## Print
- Print bar (`🖨 Print`) supports single-day portrait printing (one day per page) and multi-day landscape (one day per page) via `body.print-single` / `body.print-2up`. The user prints a single day the night before — that workflow is already supported.

## End-of-day review
- Trigger: either the tick data shows an unfinished day AND/OR the user says something like "end of day, here's what I completed" — run a review of that day's tasks.
- Identify which tasks were **not** completed.
- For each unfinished task, assess whether it should be **pushed forward** to a later day.
- Recurring tasks naturally return later in the week on their own — **do not** move recurring tasks to a future day, since they'll occur again anyway. This includes the daily 15m anchors (transaction work / room clean / journal), FNH recurring blocks, and any task that will re-appear without me moving it.
- For non-recurring unfinished tasks, **move them myself**: find the next sensible open slot in the coming days (respecting the 10am–4pm and ~6h-cap conventions) and relocate them there, then tell the user where they landed.

## Commit policy
- At the end of every session, commit all changes (index.html, page.html, and any others intended) and push to origin/main. Brief, accurate message matching repo style.

## Validation
- After any JS/DAYS edit, verify the inline script parses:
  `node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);new Function(m[1]);console.log('PARSE OK')"`
- To sum DAYS data in node, extract `var DAYS = [ ... ];` by bracket-matching from `src.indexOf('var DAYS = [')`.

## AI Edit Protocol (text-triggered agent edits)
- This repo has hooks in `.githooks/` (enabled via `core.hooksPath`). A pre-commit hook runs `tools/validate.sh` and **blocks any commit that leaves `index.html` unparseable**; a post-commit hook appends every commit to `~/.imessage-agent/edit_log.txt` for audit/recovery.
- When the agent edits `index.html` on your instruction, it MUST follow this order, in one batch:
  1. Edit the target day's `events` array (or Tasks page section) in `index.html`.
  2. Sync the duplicate: `cp index.html page.html`.
  3. Stage both: `git add index.html page.html`.
  4. Commit with a short, concrete message matching repo style (what changed, where).
  5. Push to `origin/main`.
- Never commit without running 1–4 together; the prepare-commit-validation and audit depend on it.
- If a commit is blocked by the hook (index.html doesn't parse), fix the broken edit first — do not force-past the guard.
- If a bad edit slips through and needs reverting: `git revert <sha>` (or restore the commit's pre-edit version) and tell the user where it landed.

## Backend & tick sync (architecture)
- **planner-api** (`dbuatti/planner-api`, private): Cloudflare Worker over Neon Postgres. **Canonical URL `https://planner-api.daniele-buatti.workers.dev`** (with hyphen — the no-hyphen `danielebuatti.workers.dev` does NOT resolve in DNS and returns HTTP:000/NXDOMAIN). Endpoints: `GET /health`, `GET /tasks?day=`, `POST /tasks` (upsert), `POST /tasks/done {day,startMin,done}`, `DELETE /tasks`. CORS `*`. wrangler.toml has no custom routes → serve only on `*.workers.dev`.
- **Neon** (`ep-mute-forest-a72jfml4-pooler.ap-southeast-2.aws.neon.tech/neondb`): `tasks` (id, day, start_min, duration, text, done, created_at, updated_at, **done_changed_at**) — `done_changed_at` stamps only on real done flips (no loops). Plus `memory` + `schema_migrations`. Conn string only in `~/.imessage-agent/.env` (Mini, chmod 600), never in git.
- **Tick hook** in `index.html` (`syncTickToBackend`, ~line 6483): on day-panel tick/untick, `POST /tasks/done` with `day` (from `DAY_DATES[panelId]`), `startMin` (from chip `.tt` via `toMin(timeRange().start)`), `text` (`.tl`). No-op if no row yet. Uses the correct hyphenated URL.
- **tick_rename.py** (Mini, `~/.imessage-agent/`, src in `dbuatti/planner-mini`): polls Neon for `done_changed_at > watermark`, osascript-renames the matching iCloud Tasks event with a green `✅ ` prefix (or strips it) using a temp `.scpt` + `delta`-comparison AppleScript body (NOT `osascript -e`). Also strips the legacy black `✔` prefix so pre-switch events transition cleanly. String-match gotchas solved: (1) astral emoji in task text (`🚿` = U+1F6BF) must be stripped from the AppleScript `contains` clause or matching silently fails → `plain = re.sub(r'[^\x00-\x7F]+',' ',text)`; (2) always `rm -rf __pycache__` on the Mini after scp, else Python imports stale `.pyc` with old logic. Runs via launchd `daniele.tick-rename.plist` every 180s. **Verified live both ways** (tick adds `✅`, untick strips it, watermark advances idempotently).
- **planner_push.py** (Mini, `~/.imessage-agent/`, src in `dbuatti/planner-mini`): mirrors planner `tickable` todos into the iCloud Tasks calendar + Neon rows, **add-only + idempotent** (never prunes, protects hand-made Tasks entries). Scope = chores/errands/admin/study/journal via **flag-based** `_in_scope(piece, txt)` — excludes `fnh:true` / `teaching:true` / meal / free + obvious people/health text. Writes via osascript create (`ensure_cal_event`) + psycopg2 `ON CONFLICT DO NOTHING` (preserves done/done_changed_at). **Escaping gotcha**: AppleScript `summary` must escape backslashes (`text.replace('\\','\\\\').replace('"',"'")`) or apostrophe-text like `Heymin\'s` breaks the `.scpt`. Run manually (`python3 planner_push.py --dry-run` for a safe preview; no `--dry-run` creates real events). **In launchd daily** (`daniele.planner-push.plist`, 00:10, via `run_planner_push.sh`) — add-only, so it also **self-heals calendar events that were deleted** (re-adds from planner), which is a caveat for the future delete-in-calendar → delete-in-planner feature.
- **memory.py** (Mini, `~/.imessage-agent/`, src in `dbuatti/planner-mini`): Neon `memory` diary (kinds `commitment`/`context`/`decision`/`daily`, cols id/kind/day/note/created_at). CLI: `python3 memory.py add <kind> [YYYY-MM-DD] <note...>` / `recent [N]` / `today [N]`. `imessage_agent.py` reads it fail-soft into `ask()` context (**"Longer-term memory (Neon):"** block) and writes a `daily` entry after replies containing an action word (`committed|pushed|moved|scheduled|booked|created|added|done`) so routine chit-chat doesn't flood the diary. Runnable by opencode/CLI for context.
- **planner_prune.py** (Mini, `~/.imessage-agent/`, src in `dbuatti/planner-mini`): **delete-sync** — deletes an iCloud Tasks event → removes the todo from the planner. Nightly **23:55** (`daniele.planner-prune.plist`), before the 00:10 push so the add-only push can't self-heal it back. Only touches in-scope tickable todos that the push actually created (Neon row for exact day/start_min/text must exist) whose Tasks event is missing (time-window + fuzzy text match; ✅/✔ prefix irrelevant). Never touches meals/free/fnh/teaching. **Offline-wipe guard**: aborts if the calendar DB read fails or returns zero Tasks events in the 31-day window. `--dry-run` previews. Removes the event line from `index.html` DAYS (day `sub:`/`focus:` header text is left untouched), drops the Neon row, then `cp` + node-parse check + commit/push. **Live-verified**: deleting a pushed event → todo removed from planner, Neon row dropped, next push does NOT recreate. Note: hand-made Tasks entries (no Neon row) are never pruned.
- **Repos**: `static-planner` (app), `planner-api` (worker), `planner-mini` (Mini daemon/sync/schema scripts). All three pushed to GitHub (private for api/mini).

## Tone
- August theme is "back to basics" — quiet, one thing at a time, not for show. Keep additions small, honest, and non-showy.
