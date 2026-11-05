// POST /api/my-bookings — a guest checks the status of the requests saved in their browser.
// Body: { items: [{ id, token }] }   Only bookings whose token matches are returned.
import { allow, body, send, hashToken, sameHash, toGuest } from './_lib/util.js';
import { store } from './_lib/store.js';
import { route } from './_lib/handler.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default route(async (req, res) => {
  if (!allow(req, res, ['POST'])) return;
  const items = (Array.isArray(body(req).items) ? body(req).items : [])
    .filter((x) => x && UUID.test(String(x.id)) && typeof x.token === 'string')
    .slice(0, 30);
  const tokens = Object.fromEntries(items.map((x) => [x.id, x.token]));
  const rows = await store().byIds(Object.keys(tokens));
  const mine = rows.filter((r) => sameHash(r.token_hash, hashToken(tokens[r.id])));
  send(res, 200, { bookings: mine.map(toGuest) });
});
