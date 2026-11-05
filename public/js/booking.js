/* PACE Camotes · public court booking
   Week calendar like the club's sheet: tap an open hour, send the request.
   Talks to /api/availability, /api/bookings, /api/my-bookings and /api/cancel.
   The guest's requests are remembered in this browser (id + private token). */
(function () {
  var C = window.PaceCal;
  var LABEL = { pending: 'Pencil booked', approved: 'Booked', declined: 'Declined', cancelled: 'Cancelled' };
  var KEY = 'pace-bookings';
  var WEEK = 7;

  function $(id) { return document.getElementById(id); }
  var esc = C.esc;
  function nice(s) { return C.parse(s).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }); }
  function longDate(s) { return C.parse(s).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }); }
  function pill(s) { return '<span class="pill ' + s + '">' + LABEL[s] + '</span>'; }
  function nowHM() { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()); }

  function loadSaved() { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function saveSaved(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-30))); } catch (e) { /* private mode */ } }

  async function api(path, opts) {
    var res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
    var data = {};
    try { data = await res.json(); } catch (e) { /* empty */ }
    if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
    return data;
  }

  var S = { cfg: null, slots: {}, offset: 0, sel: null, busy: false, mine: [] };
  function setNote(msg, kind) { var n = $('note'); n.className = 'note' + (kind ? ' ' + kind : ''); n.textContent = msg; }
  function isPast(date, time) { return S.cfg && (date < S.cfg.today || (date === S.cfg.today && time <= nowHM())); }

  function weekDays() {
    var start = C.addDays(S.cfg.today, S.offset), out = [];
    for (var i = 0; i < WEEK; i++) { var d = C.addDays(start, i); if (d <= S.cfg.lastDay) out.push(d); }
    return out;
  }

  function render() {
    if (!S.cfg) return;
    var days = weekDays();
    $('calWeek').textContent = nice(days[0]) + ' – ' + nice(days[days.length - 1]);
    $('calPrev').disabled = S.offset === 0;
    $('calNext').disabled = C.addDays(S.cfg.today, S.offset + WEEK) > S.cfg.lastDay;
    var mineAt = {};
    S.mine.forEach(function (m) { if (m.status === 'pending' || m.status === 'approved') mineAt[m.date + ' ' + m.time] = m.status; });
    C.render($('cal'), {
      days: days, times: S.cfg.times, today: S.cfg.today,
      cell: function (d, t) {
        var k = d + ' ' + t, st = S.slots[k], mine = mineAt[k];
        if (mine) return { state: mine === 'approved' ? 'mine-booked' : 'mine', text: 'Yours', short: 'You', aria: 'Your ' + LABEL[mine].toLowerCase() + ' hour, ' + C.label(t) };
        if (isPast(d, t)) return { state: 'past' };
        if (st === 'openplay') return { state: 'openplay', text: 'Open Play', short: 'OP', click: function () { setNote('That hour is Open Play. No booking needed, just drop in.', 'ok'); }, aria: 'Open Play, ' + C.label(t) + ', drop in' };
        if (st === 'booked') return { state: 'booked', text: 'Booked', short: 'BK' };
        if (st === 'pencil') return { state: 'pencil', text: 'Pencil', short: 'PB' };
        var selected = S.sel && S.sel.date === d && S.sel.time === t;
        return { state: selected ? 'selected' : 'open', text: selected ? '✓' : '', click: function () { S.sel = { date: d, time: t }; setNote('Add your details and send the request.'); render(); if (innerWidth < 1100) $('bName').focus({ preventScroll: false }); } };
      },
    });
    if (S.sel) { $('summary').textContent = nice(S.sel.date) + ' · ' + C.clock(S.sel.time); $('summarySub').textContent = longDate(S.sel.date) + ', ' + C.label(S.sel.time); }
    else { $('summary').textContent = 'Pick an open hour'; $('summarySub').textContent = 'Tap a white cell on the calendar.'; }
    renderMine();
  }

  function renderMine() {
    var list = S.mine.slice().sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });
    $('mineWrap').hidden = !list.length;
    var ul = $('mineList'); ul.innerHTML = '';
    list.slice(0, 8).forEach(function (m) {
      var li = document.createElement('li');
      var canCancel = (m.status === 'pending' || m.status === 'approved') && !isPast(m.date, m.time);
      li.innerHTML = '<span class="when">' + esc(nice(m.date)) + ' · ' + esc(C.clock(m.time)) + '<small>' + esc(m.format) + (S.cfg && S.cfg.courts > 1 && m.status === 'approved' && m.court ? ' · Court ' + esc(m.court) : '') + '</small></span>' + pill(m.status) + (canCancel ? '<button class="linkbtn" type="button">Cancel</button>' : '');
      if (canCancel) li.querySelector('button').onclick = function () { cancel(m.id, this); };
      ul.appendChild(li);
    });
  }

  async function loadAvailability() {
    try {
      var cfg = await api('/api/availability');
      S.cfg = cfg; S.slots = cfg.slots || {};
      if (S.sel && (S.slots[S.sel.date + ' ' + S.sel.time] || isPast(S.sel.date, S.sel.time))) { S.sel = null; setNote('The hour you picked was just taken. Pick another.', 'err'); }
      $('availNote').textContent = 'Live availability';
      var sel = $('bFormat');
      if (cfg.formats && sel.options.length !== cfg.formats.length) sel.innerHTML = cfg.formats.map(function (f) { return '<option>' + esc(f) + '</option>'; }).join('');
    } catch (e) {
      $('availNote').textContent = 'Availability unavailable';
      if (!S.cfg) { $('cal').innerHTML = '<p class="note" style="padding:24px;color:#57536A">The calendar is not reachable right now. Message PACE Camotes on Messenger to book.</p>'; $('calWeek').textContent = ''; }
    }
    render();
  }

  async function loadMine() {
    var saved = loadSaved();
    if (!saved.length) { S.mine = []; render(); return; }
    try {
      var r = await api('/api/my-bookings', { method: 'POST', body: JSON.stringify({ items: saved }) });
      S.mine = r.bookings;
      var known = {}; r.bookings.forEach(function (b) { known[b.id] = 1; });
      saveSaved(saved.filter(function (x) { return known[x.id]; }));
    } catch (e) { /* keep what we have */ }
    render();
  }

  async function submit(e) {
    e.preventDefault();
    if (S.busy) return;
    var name = $('bName').value.trim(), phone = $('bPhone').value.trim();
    if (!S.cfg) { setNote('Online booking is not reachable right now. Message PACE Camotes on Messenger to book.', 'err'); return; }
    if (!S.sel) { setNote('Pick an open hour on the calendar first.', 'err'); return; }
    if (!name) { setNote('Add your name so the club knows who is coming.', 'err'); $('bName').focus(); return; }
    if (!phone) { setNote('Add a mobile number or Messenger name so the club can reach you.', 'err'); $('bPhone').focus(); return; }
    var date = S.sel.date, time = S.sel.time;
    S.busy = true; $('bSubmit').disabled = true; setNote('Sending your request…');
    try {
      var r = await api('/api/bookings', { method: 'POST', body: JSON.stringify({
        name: name, phone: phone, format: $('bFormat').value, note: $('bNote').value.trim(),
        date: date, time: time, website: $('bWebsite').value,
      }) });
      if (r.booking) {
        var saved = loadSaved(); saved.push({ id: r.booking.id, token: r.token }); saveSaved(saved);
        S.mine.push(r.booking);
        S.slots[date + ' ' + time] = 'pencil';
      }
      S.sel = null; $('bNote').value = '';
      setNote('Pencil booked: ' + nice(date) + ', ' + C.label(time) + '. The club will confirm it. Check back here for the status.', 'ok');
    } catch (err) {
      setNote(err.message || 'Your request could not be sent. Try again.', 'err');
      if (err.status === 409) { S.sel = null; loadAvailability(); }
    } finally {
      S.busy = false; $('bSubmit').disabled = false; render();
    }
  }

  async function cancel(id, btn) {
    var saved = loadSaved().filter(function (x) { return x.id === id; })[0];
    if (!saved) return;
    btn.disabled = true;
    try {
      var r = await api('/api/cancel', { method: 'POST', body: JSON.stringify(saved) });
      S.mine = S.mine.map(function (m) { return m.id === id ? r.booking : m; });
      toast('Booking cancelled');
      loadAvailability();
    } catch (e) { btn.disabled = false; toast(e.message || 'Could not cancel. Try again.'); }
  }

  var toastT;
  function toast(msg) { var t = $('toast'); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2600); }

  $('calLegend').innerHTML = C.legend();
  $('calPrev').onclick = function () { S.offset = Math.max(0, S.offset - WEEK); render(); };
  $('calNext').onclick = function () { S.offset += WEEK; render(); };
  $('bookForm').addEventListener('submit', submit);
  loadAvailability();
  loadMine();
  setInterval(function () { if (!document.hidden) { loadAvailability(); loadMine(); } }, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { loadAvailability(); loadMine(); } });
})();
