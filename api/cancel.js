// POST /api/cancel — a guest cancels their own upcoming booking.
// Body: { id, token }. An approved booking frees its court straight away.
import { allow, body, send, fail, hashToken, sameHash, isPast, toGuest } from './_lib/util.js';
import { store } from './_lib/store.js';
import { route } from './_lib/handler.js';

export default route(async (req, res) => {
  if (!allow(req, res, ['POST'])) return;
  const { id, token } = body(req);
  if (typeof id !== 'string' || typeof token !== 'string') return fail(res, 400, 'Missing booking.');
  const s = store();
  const row = await s.byId(id).catch(() => null);
  if (!row || !sameHash(row.token_hash, hashToken(token))) return fail(res, 404, 'Booking not found.');
  if (!['pending', 'approved'].includes(row.status)) return fail(res, 409, 'This booking can no longer be cancelled.');
  if (isPast(row.date, row.time)) return fail(res, 409, 'This booking has already started.');
  const updated = await s.update(id, {
    status: 'cancelled', court: null, cancelled_by_guest: true, decided_at: new Date().toISOString(),
  }, ['pending', 'approved']);
  if (!updated) return fail(res, 409, 'This booking changed in the meantime. Refresh and try again.');
  send(res, 200, { booking: toGuest(updated) });
});
