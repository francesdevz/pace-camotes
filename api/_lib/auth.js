// Admin sign-in: one shared password (ADMIN_PASSWORD) and a signed, HttpOnly session cookie.
import crypto from 'node:crypto';

const COOKIE = 'pace_admin';
const HOURS = 12;

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) throw Object.assign(new Error('ADMIN_SESSION_SECRET must be at least 32 characters'), { code: 'not_configured' });
  return s;
}
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('base64url');

export function passwordMatches(input) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) throw Object.assign(new Error('ADMIN_PASSWORD is not set'), { code: 'not_configured' });
  const a = crypto.createHash('sha256').update(String(input ?? '')).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

function cookieAttrs(req, maxAge) {
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https') || process.env.VERCEL ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function startSession(req, res) {
  const exp = Date.now() + HOURS * 3600e3;
  const v = `${exp}.${crypto.randomBytes(9).toString('base64url')}`;
  res.setHeader('Set-Cookie', `${COOKIE}=${v}.${sign(v)}; ${cookieAttrs(req, HOURS * 3600)}`);
}

export function endSession(req, res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; ${cookieAttrs(req, 0)}`);
}

export function isAdmin(req) {
  const raw = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(COOKIE + '='));
  if (!raw) return false;
  const parts = raw.slice(COOKIE.length + 1).split('.');
  if (parts.length !== 3) return false;
  const [exp, nonce, sig] = parts;
  const expect = sign(`${exp}.${nonce}`);
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return false;
  return Number(exp) > Date.now();
}
