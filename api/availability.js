// GET /api/availability
// Public. The bookable days and times and the state of every taken hour, like the club's sheet:
//   slots["2026-11-06 18:00"] = "openplay" | "booked" | "pencil"   (missing = available)
// No names or contact details are ever returned here.
import { COURTS, TIMES, BOOKING_DAYS, FORMATS } from './_lib/config.js';
import { allow, send, clubNow, addDays } from './_lib/util.js';
import { store } from './_lib/store.js';
import { route } from './_lib/handler.js';

export default route(async (req, res) => {
  if (!allow(req, res, ['GET'])) return;
  const now = clubNow();
  const to = addDays(now.date, BOOKING_DAYS - 1);
  const rows = await store().activeBetween(now.date, to);
  const by = {};
  for (const r of rows) {
    const k = `${r.date} ${r.time}`;
    const s = (by[k] ||= { openplay: 0, booked: 0, pencil: 0 });
    if (r.kind === 'openplay' && r.status === 'approved') s.openplay++;
    else if (r.status === 'approved') s.booked++;
    else s.pencil++;
  }
  const slots = {};
  for (const [k, s] of Object.entries(by)) {
    if (s.openplay + s.booked + s.pencil < COURTS) continue; // a court is still free
    slots[k] = s.openplay ? 'openplay' : s.booked ? 'booked' : 'pencil';
  }
  send(res, 200, {
    courts: COURTS, times: TIMES, formats: FORMATS,
    today: now.date, now: now.time, days: BOOKING_DAYS, lastDay: to, slots,
  });
});
