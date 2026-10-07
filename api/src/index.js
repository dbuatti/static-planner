/**
 * planner-api — thin serverless API over Neon Postgres (HTTP transport).
 *
 * Uses the Neon HTTP (fetch) driver, which is reliable on Cloudflare
 * Workers edge (no WebSocket compatibility requirements).
 *
 * Endpoints:
 *   GET  /health                  -> { ok:true }
 *   GET  /tasks?day=YYYY-MM-DD    -> list tasks for a day
 *   POST /tasks/done              -> {day,startMin,done,text?,duration?}
 *                                    upserts: a tick before planner_push ran
 *                                    still creates the row (never lost)
 *   POST /tasks                   -> upsert {day,startMin,duration?,text}
 *   DELETE /tasks?day=&startMin=  -> remove a task
 */

import { neon } from '@neondatabase/serverless';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}
function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// Token-overlap similarity (mirrors planner_push _same_event: >=0.55 and at
// least one shared token) used to pick the right row when several tasks share
// a start_min.
const STOP = new Set(['a', 'an', 'the', 'for', 'and', 'or', 'to', 'of', 'with', 'at', 'on', 'in', 'from']);
function toks(s) {
  return new Set(String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(x => x && !STOP.has(x)));
}
function similar(a, b) {
  const ta = toks(a), tb = toks(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}
function bestSimilar(cands, text) {
  let best = null, bs = 0;
  for (const c of cands) {
    const s = similar(c.text, text);
    if (s > bs) { bs = s; best = c; }
  }
  return bs >= 0.55 ? best : null;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    if (request.method === 'GET' && path === '/health') {
      return json({ ok: true, hasDb: !!env.DATABASE_URL });
    }

    if (!env.DATABASE_URL) {
      return err('DATABASE_URL not configured', 500);
    }
    // neon() uses the HTTP (fetch) transport by default — stable on Workers.
    const sql = neon(env.DATABASE_URL);

    try {
      if (request.method === 'GET' && path === '/tasks') {
        const day = url.searchParams.get('day');
        if (!day) return err('missing day');
        const rows = await sql`
          SELECT id, day, start_min, duration, text, done, done_changed_at
          FROM tasks WHERE day = ${day} ORDER BY start_min`;
        return json({ ok: true, tasks: rows });
      }

      if (request.method === 'POST' && path === '/tasks/done') {
        const b = await request.json();
        const { day, startMin, done, text } = b;
        if (!day || startMin === undefined || done === undefined) return err('need day, startMin, done');
        const d = !!done;
        // Find the row this tick belongs to: exact text, else token overlap
        // (>=0.55, same rule as planner_push _same_event) so two tasks sharing
        // a start time don't flip each other.
        const cands = await sql`
          SELECT id, text FROM tasks WHERE day = ${day} AND start_min = ${startMin}`;
        let target = null;
        if (cands.length) {
          target = text ? (cands.find(c => c.text === text) || bestSimilar(cands, text))
                        : cands[0];
        }
        if (target) {
          // Stamp done_changed_at only when `done` actually flips, so the Mini
          // poll job sees change events and never re-processes the same state.
          await sql`
            UPDATE tasks
            SET done = ${d},
                done_changed_at = CASE WHEN done IS DISTINCT FROM ${d} THEN now() ELSE done_changed_at END,
                updated_at = now()
            WHERE id = ${target.id}`;
          return json({ ok: true, action: 'update', id: target.id });
        }
        if (!text) return json({ ok: true, action: 'noop' });
        // No row yet (tick before planner_push ran, or the task text changed):
        // upsert so the flip is never silently lost. done_changed_at is always
        // stamped on insert so tick_rename picks the tick up immediately.
        const dur = Number(b.duration) > 0 ? Number(b.duration) : 30;
        const rows = await sql`
          INSERT INTO tasks (day, start_min, duration, text, done, done_changed_at)
          VALUES (${day}, ${startMin}, ${dur}, ${text}, ${d}, now())
          ON CONFLICT (day, start_min, text)
          DO UPDATE SET done = EXCLUDED.done,
            done_changed_at = CASE WHEN tasks.done IS DISTINCT FROM EXCLUDED.done
              THEN now() ELSE tasks.done_changed_at END,
            updated_at = now()
          RETURNING id`;
        return json({ ok: true, action: 'insert', id: rows[0] && rows[0].id });
      }

      if (request.method === 'POST' && path === '/tasks') {
        const b = await request.json();
        const { day, startMin, text } = b;
        if (!day || startMin === undefined || !text) return err('need day, startMin, text');
        const dur = b.duration || 30;
        await sql`
          INSERT INTO tasks (day, start_min, duration, text)
          VALUES (${day}, ${startMin}, ${dur}, ${text})
          ON CONFLICT (day, start_min, text)
          DO UPDATE SET text = EXCLUDED.text, updated_at = now()`;
        return json({ ok: true });
      }

      if (request.method === 'DELETE' && path === '/tasks') {
        const day = url.searchParams.get('day');
        const sm = url.searchParams.get('startMin');
        if (!day || sm === undefined) return err('need day, startMin');
        await sql`DELETE FROM tasks WHERE day = ${day} AND start_min = ${sm}`;
        return json({ ok: true });
      }

      return err('not found', 404);
    } catch (e) {
      return err(String((e && e.message) || e), 500);
    }
  },
};
