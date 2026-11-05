// POST /api/admin/login  { password }  -> sets the admin session cookie.
// DELETE /api/admin/login               -> signs out.
import { allow, body, send, fail } from '../_lib/util.js';
import { passwordMatches, startSession, endSession } from '../_lib/auth.js';
import { route } from '../_lib/handler.js';

export default route(async (req, res) => {
  if (!allow(req, res, ['POST', 'DELETE'])) return;
  if (req.method === 'DELETE') { endSession(req, res); return send(res, 200, { ok: true }); }
  const ok = passwordMatches(body(req).password);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return fail(res, 401, 'That password is not correct.');
  }
  startSession(req, res);
  send(res, 200, { ok: true });
});
