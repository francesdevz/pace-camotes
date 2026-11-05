// Admin only (session cookie required).
// GET    /api/admin/bookings?from=YYYY-MM-DD   -> all bookings from that date (default: 90 days ago)
// POST   /api/admin/bookings                   -> staff adds a booking or Open Play block
//                                                 { kind, name, phone, format, date, time, hours, note, source, status }
// PATCH  /api/admin/bookings                   -> { id, action: approve|decline|cancel|reopen } or { id, staffNote }
// DELETE /api/admin/bookings?id=…              -> deletes a booking that staff entered
import { COURTS, TIMES, FORMATS, SOURCES, KINDS } from '../_lib/config.js';
import { allow, body, clean, send, fail, clubNow, addDays, isDate, newToken, hashToken, toAdmin } from '../_lib/util.js';
import { isAdmin } from '../_lib/auth.js';
import { store } from '../_lib/store.js';
import { route } from '../_lib/handler.js';

// Gives the booking the first free court. The database's unique index is the real guard:
// if two admins approve at once, the loser gets a clash and tries the next court.
async function approve(s, row) {
  const taken = new Set((await s.approvedAt(row.date, row.time)).filter((r) => r.id !== row.id).map((r) => r.court));
  for (let court = 1; court <= COURTS; court++) {
    if (taken.has(court)) continue;
    try {
      const u = await s.update(row.id, { status: 'approved', court, decided_at: new Date().toISOString() }, ['pending']);
      return u ? { row: u } : { error: [409, 'This booking changed in the meantime. Refresh and try again.'] };
    } catch (e) {
      if (e.code === '23505') continue;
      throw e;
    }
  }
  return { error: [409, `All ${COURTS} courts are already booked at ${row.time}.`] };
}

export default route(async (req, res) => {
  if (!allow(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) return;
  if (!isAdmin(req)) return fail(res, 401, 'Please sign in again.');
  const s = store();

  if (req.method === 'GET') {
    const q = req.query || {};
    const from = isDate(q.from) ? q.from : addDays(clubNow().date, -90);
    const rows = await s.listFrom(from);
    return send(res, 200, { bookings: rows.map(toAdmin), courts: COURTS, times: TIMES, formats: FORMATS, today: clubNow().date });
  }

  if (req.method === 'POST') {
    // Staff add a booking or an Open Play block, for one or more consecutive hours.
    const b = body(req);
    const kind = KINDS.includes(b.kind) ? b.kind : 'booking';
    const name = clean(b.name, 80) || (kind === 'openplay' ? 'Open Play' : '');
    const date = String(b.date || ''), time = String(b.time || '');
    const hours = Math.max(1, Math.min(8, Number(b.hours) || 1));
    if (!name) return fail(res, 400, 'Add a name.');
    if (!isDate(date) || !TIMES.includes(time)) return fail(res, 400, 'Pick a valid date and time.');
    const start = TIMES.indexOf(time);
    const slots = TIMES.slice(start, start + hours);
    const created = [], warnings = [];
    for (const t of slots) {
      const row = await s.insert({
        kind, name, date, time: t,
        phone: clean(b.phone, 80), note: clean(b.note, 200),
        format: kind === 'openplay' ? 'Open play' : FORMATS.includes(b.format) ? b.format : FORMATS[0],
        source: kind === 'openplay' ? 'Staff' : SOURCES.includes(b.source) && b.source !== 'Website' ? b.source : 'Messenger',
        status: 'pending', token_hash: hashToken(newToken()),
      });
      if (kind === 'openplay' || b.status === 'approved') {
        const r = await approve(s, row);
        if (r.error) { warnings.push(`${t} kept as pencil booked (court already taken)`); created.push(row); continue; }
        created.push(r.row);
      } else created.push(row);
    }
    return send(res, 201, {
      bookings: created.map(toAdmin), booking: toAdmin(created[0]),
      warning: warnings.length ? warnings.join('; ') + '.' : undefined,
    });
  }

  if (req.method === 'PATCH') {
    const b = body(req);
    const row = typeof b.id === 'string' ? await s.byId(b.id).catch(() => null) : null;
    if (!row) return fail(res, 404, 'Booking not found.');

    if (typeof b.staffNote === 'string') {
      const u = await s.update(row.id, { staff_note: clean(b.staffNote, 1000) });
      return send(res, 200, { booking: toAdmin(u) });
    }

    const now = new Date().toISOString();
    let u;
    switch (b.action) {
      case 'approve': {
        if (row.status !== 'pending') return fail(res, 409, 'Only pending bookings can be approved.');
        const r = await approve(s, row);
        if (r.error) return fail(res, ...r.error);
        u = r.row; break;
      }
      case 'decline':
        u = await s.update(row.id, { status: 'declined', court: null, decided_at: now }, ['pending']); break;
      case 'cancel':
        u = await s.update(row.id, { status: 'cancelled', court: null, decided_at: now }, ['approved', 'pending']); break;
      case 'reopen':
        if (row.cancelled_by_guest) return fail(res, 409, 'The guest cancelled this booking. Add a new booking instead.');
        u = await s.update(row.id, { status: 'pending', court: null, decided_at: now }, ['declined', 'cancelled']); break;
      default:
        return fail(res, 400, 'Unknown action.');
    }
    if (!u) return fail(res, 409, 'This booking changed in the meantime. Refresh and try again.');
    return send(res, 200, { booking: toAdmin(u) });
  }

  // DELETE
  const id = (req.query || {}).id;
  const row = typeof id === 'string' ? await s.byId(id).catch(() => null) : null;
  if (!row) return fail(res, 404, 'Booking not found.');
  if (row.source === 'Website') return fail(res, 409, 'Website requests are kept for your records. Decline or cancel it instead.');
  await s.remove(row.id);
  send(res, 200, { ok: true });
});
