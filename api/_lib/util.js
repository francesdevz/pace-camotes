import crypto from 'node:crypto';
import { TIMEZONE } from './config.js';

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
export const fail = (res, status, message) => send(res, status, { error: message });

export function allow(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader('Allow', methods.join(', '));
  fail(res, 405, 'Method not allowed');
  return false;
}

// Vercel parses JSON bodies; this also covers a raw string or a missing body.
export function body(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') { try { return JSON.parse(b); } catch { return {}; } }
  return typeof b === 'object' ? b : {};
}

export function clean(v, max) {
  return String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

// "Today" and "now" in the club's timezone, as YYYY-MM-DD and HH:MM.
export function clubNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));

export function isPast(date, time) {
  const now = clubNow();
  return date < now.date || (date === now.date && time <= now.time);
}

export const newToken = () => crypto.randomBytes(24).toString('base64url');
export const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

export function sameHash(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Shape sent to the admin dashboard.
export function toAdmin(r) {
  return {
    id: r.id, kind: r.kind || 'booking', name: r.name, phone: r.phone, format: r.format, date: r.date, time: r.time,
    note: r.note, source: r.source, status: r.status, court: r.court,
    cancelledByGuest: r.cancelled_by_guest, staffNote: r.staff_note,
    createdAt: r.created_at, decidedAt: r.decided_at,
  };
}

// Shape sent back to the guest who made the booking (no staff notes).
export function toGuest(r) {
  return { id: r.id, format: r.format, date: r.date, time: r.time, status: r.status, court: r.court, createdAt: r.created_at };
}
