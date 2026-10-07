/**
 * planner-api — thin serverless API over Neon Postgres (HTTP transport).
 *
 * Uses the Neon HTTP (fetch) driver, which is reliable on Cloudflare
 * Workers edge (no WebSocket compatibility requirements).
 *
 * Endpoints:
 *   GET  /health                  -> { ok:true }
 *   GET  /tasks?day=YYYY-MM-DD    -> list tasks for a day
 *   POST /tasks/done              -> {day,startMin,done}
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
        const { day, startMin, done } = b;
        if (!day || startMin === undefined || done === undefined) return err('need day, startMin, done');
        const d = !!done;
        // Stamp done_changed_at only when `done` actually flips, so the Mini
        // poll job sees change events and never re-processes the same state.
        await sql`
          UPDATE tasks
          SET done = ${d},
              done_changed_at = CASE WHEN done IS DISTINCT FROM ${d} THEN now() ELSE done_changed_at END,
              updated_at = now()
          WHERE day = ${day} AND start_min = ${startMin}`;
        return json({ ok: true });
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
