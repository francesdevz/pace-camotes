/* PACE Camotes · admin dashboard (/admin)
   Signs in with the admin password, then lists, approves, declines and adds bookings
   through /api/admin/*. Refreshes every 20 seconds so new website requests appear on their own. */
(function () {
  var LABEL = { pending: 'Pencil booked', approved: 'Booked', declined: 'Declined', cancelled: 'Cancelled' };
  var C = window.PaceCal;
  var REFRESH_MS = 20000;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  function nice(s, long) { return parse(s).toLocaleDateString('en-PH', long ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' }); }
  function ago(iso) { if (!iso) return ''; var m = Math.round((Date.now() - Date.parse(iso)) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; var h = Math.round(m / 60); if (h < 24) return h + ' h ago'; var d = Math.round(h / 24); return d + (d === 1 ? ' day' : ' days') + ' ago'; }
  function pill(s) { return '<span class="pill ' + s + '">' + LABEL[s] + '</span>'; }
  function pillX(x) { return x.kind === 'openplay' && x.status === 'approved' ? '<span class="pill openplay">Open Play</span>' : pill(x.status); }
  function court(x) { return S.courts > 1 && x.status === 'approved' && x.court ? ' · Court ' + x.court : ''; }
  function nowHM() { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()); }

  var S = { list: [], courts: 2, times: [], today: ymd(new Date()), weekStart: null, tab: 'pending', when: 'upcoming', q: '', openId: null, timer: null, busy: false };
  function isPast(date, time) { return date < S.today || (date === S.today && time <= nowHM()); }

  var toastT;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2800); }
  function alertBar(msg) { var a = $('adAlert'); a.hidden = !msg; a.textContent = msg || ''; }

  async function api(path, opts) {
    var res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' }, opts || {}));
    var data = {};
    try { data = await res.json(); } catch (e) { /* empty */ }
    if (res.status === 401 && path.indexOf('/login') < 0) { showLogin($('admin').hidden ? '' : 'Your session ended. Sign in again.'); throw Object.assign(new Error('Signed out'), { status: 401, quiet: true }); }
    if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
    return data;
  }

  /* ---------- sign in / out ---------- */
  function showLogin(msg) {
    clearInterval(S.timer);
    $('admin').hidden = true; $('login').hidden = false; $('logoutBtn').hidden = true;
    $('loginMsg').className = 'note' + (msg ? ' err' : ''); $('loginMsg').textContent = msg || '';
    setTimeout(function () { $('pw').focus(); }, 50);
  }
  function showDashboard() {
    $('login').hidden = true; $('admin').hidden = false; $('logoutBtn').hidden = false;
    clearInterval(S.timer);
    S.timer = setInterval(function () { if (!document.hidden) load(true); }, REFRESH_MS);
  }
  $('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = $('loginBtn'); btn.disabled = true; $('loginMsg').className = 'note'; $('loginMsg').textContent = 'Signing in…';
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('pw').value }) });
      $('pw').value = '';
      await load();
    } catch (err) { $('loginMsg').className = 'note err'; $('loginMsg').textContent = err.message; }
    btn.disabled = false;
  });
  $('logoutBtn').onclick = async function () {
    try { await api('/api/admin/login', { method: 'DELETE' }); } catch (e) { /* ignore */ }
    showLogin('');
  };

  /* ---------- data ---------- */
  async function load(quiet) {
    try {
      var r = await api('/api/admin/bookings');
      S.list = r.bookings; S.courts = r.courts; S.times = r.times; S.today = r.today;
      if (!S.weekStart) S.weekStart = r.today;
      fillTimes(r.times, r.formats);
      alertBar('');
      if ($('admin').hidden) showDashboard();
      render();
    } catch (err) {
      if (err.quiet) return;
      if ($('admin').hidden && err.status !== 401) { showLogin(err.message); return; }
      if (!quiet || err.status >= 500) alertBar(err.message + ' Showing the last loaded bookings.');
    }
  }
  var filled = false;
  function fillTimes(times, formats) {
    if (filled) return; filled = true;
    $('mTime').innerHTML = times.map(function (t) { return '<option value="' + esc(t) + '">' + esc(C.label(t)) + '</option>'; }).join('');
    if (formats) $('mFormat').innerHTML = formats.map(function (f) { return '<option>' + esc(f) + '</option>'; }).join('');
  }
  function replace(b) { S.list = S.list.map(function (x) { return x.id === b.id ? b : x; }); if (!S.list.some(function (x) { return x.id === b.id; })) S.list.push(b); }
  function approvedAt(date, time, exceptId) { return S.list.filter(function (x) { return x.id !== exceptId && x.status === 'approved' && x.date === date && x.time === time; }); }

  function filtered(useTab) {
    var t = S.today, q = S.q.toLowerCase();
    return S.list.filter(function (x) {
      if (S.when === 'upcoming' && x.date < t) return false;
      if (S.when === 'today' && x.date !== t) return false;
      if (S.when === 'past' && x.date >= t) return false;
      if (q && (x.name + ' ' + x.phone + ' ' + (x.note || '') + ' ' + (x.staffNote || '')).toLowerCase().indexOf(q) < 0) return false;
      if (useTab && S.tab !== 'all' && x.status !== S.tab) return false;
      return true;
    }).sort(function (a, b) { var k = (a.date + a.time).localeCompare(b.date + b.time); return S.when === 'past' ? -k : k; });
  }

  /* ---------- render ---------- */
  function render() {
    var all = S.list, t = S.today;
    $('adToday').textContent = nice(t, true);
    var up = all.filter(function (x) { return x.date >= t; });
    var pend = up.filter(function (x) { return x.status === 'pending'; });
    $('kPending').textContent = pend.length;
    $('kPendingSub').textContent = pend.length ? 'oldest ' + ago(pend.map(function (x) { return x.createdAt; }).sort()[0]) : 'all caught up';
    $('kApproved').textContent = up.filter(function (x) { return x.status === 'approved'; }).length;
    var used = all.filter(function (x) { return x.date === t && x.status === 'approved'; }).length, cap = S.courts * S.times.length || 1;
    $('kToday').textContent = used + ' / ' + cap;
    $('kTodayBar').style.width = Math.min(100, Math.round(used / cap * 100)) + '%';
    var wk = Date.now() - 7 * 864e5, week = all.filter(function (x) { return Date.parse(x.createdAt) >= wk; });
    $('kWeek').textContent = week.length;
    $('kWeekSub').textContent = week.filter(function (x) { return x.source === 'Website'; }).length + ' from the website';

    var base = filtered(false), counts = { all: base.length, pending: 0, approved: 0, declined: 0, cancelled: 0 };
    base.forEach(function (x) { counts[x.status]++; });
    var tabs = $('tabs'); tabs.innerHTML = '';
    ['pending', 'approved', 'declined', 'cancelled', 'all'].forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(S.tab === k)); b.innerHTML = (k === 'all' ? 'All' : LABEL[k]) + ' <span>' + counts[k] + '</span>';
      b.onclick = function () { S.tab = k; render(); }; tabs.appendChild(b);
    });

    var rows = filtered(true), tb = $('rows'); tb.innerHTML = '';
    rows.forEach(function (x) {
      var tr = document.createElement('tr'); tr.className = 'row-l'; tr.tabIndex = 0;
      var full = approvedAt(x.date, x.time, x.id).length >= S.courts, flag = '';
      if (x.status === 'pending' && full) flag = '<span class="flag">Hour is already booked</span>';
      else if (x.status === 'pending') {
        var others = all.filter(function (y) { return y.id !== x.id && y.status === 'pending' && y.date === x.date && y.time === x.time; }).length;
        if (others) flag = '<span class="flag">' + others + ' other request' + (others > 1 ? 's' : '') + ' for this hour</span>';
      }
      if (x.status === 'cancelled' && x.cancelledByGuest) flag = '<span class="flag" style="color:var(--grey)">Cancelled by guest</span>';
      tr.innerHTML = '<td class="when">' + esc(nice(x.date)) + '<small>' + esc(C.label(x.time)) + esc(court(x)) + '</small></td>' +
        '<td class="guest"><b>' + esc(x.name) + '</b><small>' + esc(x.phone || 'No contact') + '</small>' + flag + '</td>' +
        '<td>' + esc(x.format) + '</td>' +
        '<td>' + esc(x.source) + '<small style="display:block;color:var(--dim);font-size:12px;margin-top:3px">' + esc(ago(x.createdAt)) + '</small></td>' +
        '<td>' + pillX(x) + '</td>' +
        '<td class="r"><div class="acts">' + actionsHtml(x, full) + '</div></td>';
      tr.onclick = function (e) { if (e.target.closest('button')) return; openDrawer(x.id); };
      tr.onkeydown = function (e) { if (e.key === 'Enter' && e.target === tr) openDrawer(x.id); };
      bindActions(tr, x);
      tb.appendChild(tr);
    });
    var empty = $('empty'); empty.hidden = rows.length > 0;
    if (!rows.length) empty.textContent = all.length ? 'No ' + (S.tab === 'all' ? '' : LABEL[S.tab].toLowerCase() + ' ') + 'bookings for these filters.' : 'No bookings yet. Website requests appear here on their own, or add one with New booking.';
    renderCal();
    if (S.openId) renderDrawer();
  }

  function actionsHtml(x, full) {
    if (x.status === 'pending') return '<button class="act ok" data-a="approve"' + (full ? ' disabled title="This hour is already booked"' : '') + '>Confirm</button><button class="act no" data-a="decline">Decline</button>';
    if (x.status === 'approved') return isPast(x.date, x.time) ? '' : '<button class="act no" data-a="cancel">Cancel</button>';
    if (x.cancelledByGuest) return '';
    return '<button class="act" data-a="reopen">Reopen</button>';
  }
  function bindActions(root, x) {
    root.querySelectorAll('[data-a]').forEach(function (btn) { btn.onclick = function (e) { e.stopPropagation(); act(btn.getAttribute('data-a'), x, btn); }; });
  }

  async function act(a, x, btn) {
    if (btn) btn.disabled = true;
    try {
      if (a === 'delete') {
        await api('/api/admin/bookings?id=' + encodeURIComponent(x.id), { method: 'DELETE' });
        S.list = S.list.filter(function (y) { return y.id !== x.id; }); closeDrawer(); toast('Booking deleted');
      } else {
        var r = await api('/api/admin/bookings', { method: 'PATCH', body: JSON.stringify({ id: x.id, action: a }) });
        replace(r.booking);
        toast(a === 'approve' ? 'Booked' + court(r.booking) : a === 'decline' ? 'Declined' : a === 'cancel' ? 'Booking cancelled' : 'Moved back to pending');
      }
      render();
    } catch (err) {
      if (btn) btn.disabled = false;
      if (!err.quiet) { toast(err.message); if (err.status === 409) load(true); }
    }
  }

  function renderCal() {
    var start = S.weekStart || S.today, days = [];
    for (var i = 0; i < 7; i++) days.push(C.addDays(start, i));
    $('calWeek').textContent = nice(days[0]) + ' – ' + nice(days[6]);
    var at = {};
    S.list.forEach(function (x) { if (x.status === 'pending' || x.status === 'approved') (at[x.date + ' ' + x.time] = at[x.date + ' ' + x.time] || []).push(x); });
    C.render($('cal'), {
      days: days, times: S.times, today: S.today,
      cell: function (d, t) {
        var list = (at[d + ' ' + t] || []).sort(function (a, b) { return (b.status === 'approved') - (a.status === 'approved'); });
        var add = function () { openModal(d, t); };
        if (!list.length) return { state: 'open', click: add, aria: 'Add a booking, ' + nice(d) + ', ' + C.label(t) };
        return {
          state: 'busy',
          items: list.map(function (x) {
            var st = x.kind === 'openplay' && x.status === 'approved' ? 'openplay' : x.status === 'approved' ? 'booked' : 'pencil';
            var initials = x.kind === 'openplay' ? 'OP' : x.name.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 3);
            return { state: st, text: x.kind === 'openplay' ? 'Open Play' : x.name, short: initials, title: x.name + ' · ' + LABEL[x.status] + ' · ' + C.label(t), click: function () { openDrawer(x.id); } };
          }),
          addClick: list.filter(function (x) { return x.status === 'approved'; }).length < S.courts && list.length < S.courts ? add : null,
        };
      },
    });
  }

  /* ---------- drawer ---------- */
  function openDrawer(id) { S.openId = id; $('drawer').hidden = false; $('scrim').hidden = false; renderDrawer(); $('drClose').focus(); }
  function closeDrawer() { S.openId = null; $('drawer').hidden = true; $('scrim').hidden = true; }
  function renderDrawer() {
    var x = S.list.filter(function (y) { return y.id === S.openId; })[0];
    if (!x) { closeDrawer(); return; }
    var body = $('drBody'), prev = $('drNote');
    var note = (prev && body.getAttribute('data-id') === x.id) ? prev.value : (x.staffNote || '');
    body.setAttribute('data-id', x.id);
    var full = approvedAt(x.date, x.time, x.id).length >= S.courts;
    body.innerHTML = '<h2 class="dr-title">' + esc(x.name) + '</h2>' + pillX(x) +
      '<dl class="dr-list">' +
      '<div><dt>Date</dt><dd>' + esc(nice(x.date, true)) + '</dd></div>' +
      '<div><dt>Time</dt><dd>' + esc(C.label(x.time)) + esc(court(x)) + '</dd></div>' +
      '<div><dt>Contact</dt><dd>' + esc(x.phone || '–') + '</dd></div>' +
      '<div><dt>Format</dt><dd>' + esc(x.format) + '</dd></div>' +
      '<div><dt>Guest note</dt><dd>' + esc(x.note || '–') + '</dd></div>' +
      '<div><dt>Source</dt><dd>' + esc(x.source) + '</dd></div>' +
      '<div><dt>Requested</dt><dd>' + esc(new Date(x.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })) + '</dd></div>' +
      (x.decidedAt ? '<div><dt>Last change</dt><dd>' + esc(LABEL[x.status]) + (x.cancelledByGuest ? ' by the guest' : '') + ', ' + esc(ago(x.decidedAt)) + '</dd></div>' : '') +
      '</dl><div class="dr-acts">' + actionsHtml(x, full) + (x.source !== 'Website' ? '<button class="act no" data-a="delete">Delete</button>' : '') + '</div>' +
      '<div class="dr-note"><label class="label" for="drNote">Staff note · only admins see this</label><textarea id="drNote" maxlength="1000" placeholder="Paid in cash, bringing own paddles…" style="margin-top:10px">' + esc(note) + '</textarea><button class="act" type="button" id="drNoteSave">Save note</button></div>';
    bindActions(body, x);
    $('drNoteSave').onclick = async function () {
      var btn = this; btn.disabled = true;
      try {
        var r = await api('/api/admin/bookings', { method: 'PATCH', body: JSON.stringify({ id: x.id, staffNote: $('drNote').value }) });
        replace(r.booking); body.removeAttribute('data-id'); toast('Note saved'); render();
      } catch (err) { if (!err.quiet) toast(err.message); }
      btn.disabled = false;
    };
  }
  $('drClose').onclick = closeDrawer; $('scrim').onclick = closeDrawer;
  addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!$('modal').hidden) closeModal(); else if (!$('drawer').hidden) closeDrawer(); } });

  /* ---------- new booking ---------- */
  function syncKind() {
    var op = $('mKind').value === 'openplay';
    document.querySelectorAll('#mForm .bk-only').forEach(function (f) { f.hidden = op; });
    $('mName').placeholder = op ? 'Open Play' : 'Guest or group name';
  }
  function openModal(date, time) {
    $('mDate').value = date || S.weekStart || S.today;
    if (time) $('mTime').value = time;
    $('mMsg').textContent = ''; syncKind(); $('modal').hidden = false; $('mName').focus();
  }
  function closeModal() { $('modal').hidden = true; }
  $('mKind').onchange = syncKind;
  $('newBtn').onclick = function () { openModal(); }; $('mClose').onclick = closeModal;
  $('modal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
  $('mForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var msg = $('mMsg'); msg.className = 'note';
    var kind = $('mKind').value;
    var payload = { kind: kind, hours: +$('mHours').value, date: $('mDate').value, time: $('mTime').value, name: $('mName').value.trim(), phone: $('mPhone').value.trim(), format: $('mFormat').value, source: $('mSource').value, status: $('mStatus').value, note: $('mNote').value.trim() };
    if (!payload.date || (!payload.name && kind !== 'openplay')) { msg.className = 'note err'; msg.textContent = 'Add a date and a name.'; return; }
    $('mSave').disabled = true;
    try {
      var r = await api('/api/admin/bookings', { method: 'POST', body: JSON.stringify(payload) });
      (r.bookings || [r.booking]).forEach(replace);
      closeModal(); $('mForm').reset(); syncKind();
      if (payload.date < S.weekStart || payload.date > C.addDays(S.weekStart, 6)) S.weekStart = payload.date;
      toast(r.warning || (kind === 'openplay' ? 'Open Play added' : 'Booking saved')); render();
    } catch (err) { if (!err.quiet) { msg.className = 'note err'; msg.textContent = err.message; } }
    $('mSave').disabled = false;
  });

  /* ---------- filters ---------- */
  $('fWhen').onchange = function () { S.when = this.value; render(); };
  $('fQ').oninput = function () { S.q = this.value; render(); };
  $('calPrev').onclick = function () { S.weekStart = addDays(S.weekStart || S.today, -7); render(); };
  $('calNext').onclick = function () { S.weekStart = addDays(S.weekStart || S.today, 7); render(); };
  $('calToday').onclick = function () { S.weekStart = S.today; render(); };
  $('calLegend').innerHTML = C.legend();

  /* ---------- export ---------- */
  $('exportBtn').onclick = function () {
    var cols = ['Date', 'Time', 'Court', 'Name', 'Contact', 'Format', 'Source', 'Status', 'Guest note', 'Staff note', 'Requested at'];
    var q = function (v) { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var csv = [cols.join(',')].concat(filtered(true).map(function (x) {
      return [x.date, C.label(x.time), x.status === 'approved' ? x.court : '', x.name, x.phone, x.format, x.source, x.kind === 'openplay' ? 'Open Play' : LABEL[x.status], x.note, x.staffNote, x.createdAt].map(q).join(',');
    })).join('\n');
    var url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'pace-bookings-' + S.today + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };

  document.addEventListener('visibilitychange', function () { if (!document.hidden && !$('admin').hidden) load(true); });

  // Already signed in? The bookings call answers 401 if not, which shows the sign-in form.
  load();
})();
