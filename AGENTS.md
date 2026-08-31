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
- **Calendar-add routing in `imessage_agent.py`** (Mini, src in `dbuatti/planner-mini`): `tick()` for `kind=="calendar"` calls `_parse_targets(body)`; **if it returns `[]` → `ask(body, mode="calendar")` (LLM conversational, to gather details when a date/time is missing), else `parse_calendar(body)` (deterministic).** Single-line bookings ("book a haircut on Friday 11 December 2026 at 4:30pm", "plan lunch with Sam Tuesday 12:30pm") now route **deterministically** via `_parse_one_event` → `write_planner_event` (planner-first) — the exact parser was hardened with title-cleaning so booking phrasings produce clean titles ("Book a haircut on... 2026 at" → "Haircut") instead of garbage. Only genuinely vague requests with no date/time ("add my recitals", "book a haircut" with no day) fall back to the LLM to ask for details. Parser hardening in `_parse_one_event`: won't steal a digit that's part of a time ("Sep 10am"/"Oct 7:30"), prefers an explicit-meridiem time over a bare day number, values day-before-month ("7 October 2-4pm" => 7 Oct), strips bare years + booking verbs + dangling on/at from titles. Multi-line "Add these to my calendar / <title> / <dated lines>" stays deterministic (shared title).
- **Repos**: `static-planner` (app), `planner-api` (worker), `planner-mini` (Mini daemon/sync/schema scripts). All three pushed to GitHub (private for api/mini).

## TOWN (separate iMessage identity)
- **Purpose**: TOWN (the assistant) now messages Daniele as a **distinct sender** ("Daniele TOWN"), not a self-chat. This required a separate iMessage identity — free + no-SIM + no new hardware.
- **Identity**: a second Apple ID (**`danielebuattitown@gmail.com`**) that uses its **email** as the iMessage address (Apple's blue-bubble phone numbers are SIM-only; virtual/VoIP numbers can't activate iMessage, and sign-in needs a real +61 phone only for 2FA codes).
- **Hosting — a second macOS user is mandatory**: one macOS user = one iMessage/Apple ID. So TOWN lives as the **`danieletown` user** on the Mac Mini (fast-user-switched alongside `danielebuatti`; Daniele stays logged in). TOWN has its own `~/Library/Messages/chat.db` and its own iCloud (`MobileMeAccounts` = `danielebuattitown@gmail.com`).
- **TOWN daemon** (`imessage_agent_town.py`, src in `dbuatti/planner-mini`, deployed as `~/.imessage-agent/imessage_agent.py` under `danieletown`):
  - Watches only **TOWN's** thread `iMessage;-;+61424174067` and only **incoming** rows (`is_from_me = 0`) — TOWN's own replies land back in the same chat.db as `is_from_me = 1` and must be ignored to avoid an echo loop.
  - `PLANNER = "/Users/danielebuatti/static-planner"` (the same planner — TOWN serves Daniele's planner, which lives in Daniele's home). Git "dubious ownership" for that repo is whitelisted via `git config --global --add safe.directory` for `danieletown`.
  - Sends via BlueBubbles at `localhost:1234` with password `dbtown123`.
  - Runs under launchd `danieletown.imessage-agent` (gui/504) via `~/.imessage-agent/run.sh`.
- **BlueBubbles under TOWN** must use the **Private API send mode** (`enable_private_api=1`, `enable_ft_private_api=1`, `default_send_mode=private_api` in `~/Library/Application Support/bluebubbles-server/config.db`). Native osascript and BlueBubbles' default AppleScript send both **hang** in a background/non-foreground session (Apple Events need GUI/accessibility access); the Private API is what lets TOWN send while Daniele is the active console user. "Adding await" in `bluebubbles-server/main.log` = send stuck waiting on the AppleScript path.
- **Port/process ownership**: BlueBubbles owns `localhost:1234`. Daniele's old BlueBubbles + `daniele.imessage-agent` daemon are **stopped/booted-out** on the Mini (TOWN owns the port and identity now). Daniele's daemon can be restarted from `~/Desktop/town-work/planner-mini/imessage_agent.py` if needed, but not while TOWN's BlueBubbles is running on 1234.
- **Identity/tick conventions**: TOWN shares the SAME Neon planner/backend, memory diary, calendar, and tick hooks as Daniele's stack — only the iMessage send/receive path is TOWN-specific. Operator messages to the assistant go to `+61424174067` as before; replies now appear from TOWN.

### TOWN calendar-add & planner writes (TOWN must NOT rely on osascript)
TOWN runs in a background (non-GUI) session under `danieletown`, so osascript to Calendar.app **hangs** and (when it does run) targets TOWN's own empty iCloud calendars. Therefore TOWN writes **planner-first**: the shared `DAYS` array in `index.html` is the real source of truth, and the git commit/push of that file is the success condition. osascript is only a best-effort fallback, never a hard dependency.
- **Routes**: single-line natural-language bookings ("book / plan / schedule a … on <day> <time>") and clean multi-line "Add these to my calendar / <title> / <dated lines>" **both route deterministically** through `parse_calendar()` → `write_planner_event()` (planner-first). `_parse_targets` returns `[]` only for genuinely vague requests with no date/time ("add my recitals", "book a haircut" with no day), which then → `ask(body, mode="calendar")` → LLM asks for the details — that LLM path runs `cal_add.py` (via `CAL_HELP`, derived from the daemon's own dir) but is a last resort, not the primary path.
- **DAY-array creation**: `write_planner_event()` (daemon `imessage_agent.py` ~line 1101 and `cal_add.py` ~line 303) and `_shift_planner_event()` (daemon ~line 1479) now **create a minimal day entry** (`id:'mon7dec'` style, `dateISO`, `dow`, `date`, `week`, empty `events:[]`) if the target date isn't already a `var DAYS = [...]` key, then re-search. `orig_arr_len` is tracked so the closing `]` is found reliably. This fixed the "refused: date not in planner" failure for out-of-range dates.
- **`_is_town()` / `cal_db_path()`**: when the caller isn't Daniele, calendar-DB reads (Daniele's `~/Library/Calendars/Calendar.sqlitedb` is permission-denied cross-user) are skipped and the iCloud `verify_icloud` gate is disabled; conflict checks fall back to planner-only.
- **Verified live end-to-end**: single-line booking ("Book a haircut on Friday 11 Dec 2026 at 4:30pm") → deterministic `parse_calendar()` → planner DAYS day created → `git commit`(rc=0) → `git push`(rc=0) → PARSE OK → reply "Added to General: 11 Dec 16:30 — haircut (on planner)". Test events are removed afterwards.

### TOWN GitHub push setup (deploy key + shared-repo permissions)
TOWN pushes the shared planner autonomously, so it needs its own GitHub credentials and write permissions to Daniele's checkout.
- **Deploy key**: ed25519 at `/Users/danieletown/.ssh/town_deploy_ed25519`, registered as a **write deploy key** on `dbuatti/static-planner` (ID `161809150`). `~/.ssh/config` sets `Host github.com → IdentityFile ~/.ssh/town_deploy_ed25519, IdentitiesOnly yes`; `github.com` added to `~/.ssh/known_hosts`. `ssh -T git@github.com` → "Hi dbuatti/static-planner! You've successfully authenticated". Remote is already `git@github.com:dbuatti/static-planner.git`.
- **One key ≠ two repos**: GitHub won't let a deploy key live on two repos. `planner-mini` has its **own** key at `/Users/danieletown/.ssh/town_deploy_mini` (registered as write deploy key `161810025` on `dbuatti/planner-mini`). TOWN's `~/.ssh/config` has two aliases: `Host github.com` → `town_deploy_ed25519` (static-planner) and `Host github-mini` → `town_deploy_mini` (planner-mini, use `git@github-mini:dbuatti/planner-mini.git`). Both `IdentitiesOnly yes`.
- **Filesystem permissions**: TOWN writes `index.html`/`page.html` which live in Daniele's home. The repo + `.git` must be group-writable and the files `-rw-rw-r--` (set via `chmod -R g+w .git/ && chmod g+w index.html page.html && chmod g+s . .git`, and **`git config core.sharedRepository group`** so git keeps group-write on files it creates — otherwise any Daniele-side `git reset --hard`/checkout/commit reverts files to `-rw-r--r--` and TOWN's next write hits `PermissionError(13)`).
- **Permission gotcha + auto-heal**: every `git reset --hard`/`git checkout <commit> -- <file>`/fresh clone regenerates `index.html`/`page.html`/`.git/index` as `-rw-r--r--`. The repo's `.githooks/post-checkout` and `.githooks/post-commit` hooks now **re-apply `chmod g+w index.html page.html` automatically** on every checkout/commit (best-effort; only the file owner can chmod, so a checkout run *as danieletown* can't, but most are run as danielebuatti). Do NOT re-add `g+w` manually unless a hook wasn't in place at the time.
- **Cleanup convention**: TOWN test writes are committed and pushed, then the test event is removed afterwards (revert the commit or checkout the prior `index.html`/`page.html` as the file owner, then commit+push) so the planner stays clean of test artifacts while proving the loop.

## Tone
- August theme is "back to basics" — quiet, one thing at a time, not for show. Keep additions small, honest, and non-showy.
