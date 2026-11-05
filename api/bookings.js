// POST /api/bookings  — a guest requests a court.
// Body: { name, phone, format, date, time, note, website (honeypot, must be empty) }
// Returns { booking, token }. The browser keeps the token so the guest can check status or cancel.
import { COURTS, TIMES, BOOKING_DAYS, FORMATS, MAX_ACTIVE_PER_CONTACT } from './_lib/config.js';
import { allow, body, clean, send, fail, clubNow, addDays, isDate, isPast, newToken, hashToken, toGuest } from './_lib/util.js';
import { store } from './_lib/store.js';
import { route } from './_lib/handler.js';

export default route(async (req, res) => {
  if (!allow(req, res, ['POST'])) return;
  const b = body(req);

  // Bots fill every field, people never see this one.
  if (clean(b.website, 200)) return send(res, 200, { booking: null, token: null });

  const name = clean(b.name, 80);
  const phone = clean(b.phone, 80);
  const format = FORMATS.includes(b.format) ? b.format : FORMATS[0];
  const note = clean(b.note, 200);
  const date = String(b.date || '');
  const time = String(b.time || '');

  if (!name) return fail(res, 400, 'Add your name so the club knows who is coming.');
  if (!phone) return fail(res, 400, 'Add a mobile number or Messenger name so the club can reach you.');
  if (!isDate(date) || !TIMES.includes(time)) return fail(res, 400, 'Pick a day and a time from the list.');

  const now = clubNow();
  if (date > addDays(now.date, BOOKING_DAYS - 1)) return fail(res, 400, `Bookings open ${BOOKING_DAYS} days ahead. Pick an earlier day.`);
  if (isPast(date, time)) return fail(res, 400, 'That time has already passed. Pick a later time.');

  const s = store();
  const active = await s.activeAt(date, time);
  if (active.length >= COURTS) {
    const op = active.some((r) => r.kind === 'openplay' && r.status === 'approved');
    return fail(res, 409, op ? 'That hour is Open Play. Just drop in, no booking needed.' : 'That hour was just taken. Pick another time.');
  }

  const held = await s.countActiveForContact(phone, now.date);
  if (held >= MAX_ACTIVE_PER_CONTACT) {
    return fail(res, 429, `You already have ${held} upcoming bookings. Message the club on Messenger to book more.`);
  }

  const token = newToken();
  const row = await s.insert({
    name, phone, format, note, date, time,
    source: 'Website', status: 'pending', token_hash: hashToken(token),
  });
  send(res, 201, { booking: toGuest(row), token });
});
