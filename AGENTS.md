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
- Tasks/anchors should be scheduled between **10am–4pm** where the day has room; splitting/not-back-to-back is fine.
- Daily anchors (when requested): 15m transaction work, 15m room clean, 15m journal — these are the incremental path toward the weekly goals (clean room, updated money transaction sheet).
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

## Validation
- After any JS/DAYS edit, verify the inline script parses:
  `node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);new Function(m[1]);console.log('PARSE OK')"`
- To sum DAYS data in node, extract `var DAYS = [ ... ];` by bracket-matching from `src.indexOf('var DAYS = [')`.

## Tone
- August theme is "back to basics" — quiet, one thing at a time, not for show. Keep additions small, honest, and non-showy.
