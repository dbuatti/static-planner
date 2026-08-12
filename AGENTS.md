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

## Validation
- After any JS/DAYS edit, verify the inline script parses:
  `node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);new Function(m[1]);console.log('PARSE OK')"`
- To sum DAYS data in node, extract `var DAYS = [ ... ];` by bracket-matching from `src.indexOf('var DAYS = [')`.

## Tone
- August theme is "back to basics" — quiet, one thing at a time, not for show. Keep additions small, honest, and non-showy.
