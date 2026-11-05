/* PACE Camotes · week calendar grid, laid out like the club's booking sheet:
   dates across the top, hourly slots down the side, cells colored
   Available · Open Play · Booked · Pencil Booked. Used by the booking page and the dashboard. */
(function () {
  var DAYN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // "09:00" -> "9:00AM", "00:00" -> "12:00MN", "12:00" -> "12:00PM"
  function clock(hm) {
    var h = +hm.slice(0, 2), m = hm.slice(3, 5);
    if (h === 0 || h === 24) return '12:' + m + 'MN';
    return (h % 12 || 12) + ':' + m + (h < 12 ? 'AM' : 'PM');
  }
  function next(hm) { var h = (+hm.slice(0, 2) + 1) % 24; return pad(h) + hm.slice(2); }
  function label(hm) { return clock(hm) + ' – ' + clock(next(hm)); }
  function short(hm) { var h = +hm.slice(0, 2); return (h % 12 || 12) + (h < 12 ? 'am' : 'pm'); }

  function txt(full, sh) {
    if (!full) return '';
    return sh == null ? '<span>' + esc(full) + '</span>' : '<span class="full">' + esc(full) + '</span><span class="sh">' + esc(sh) + '</span>';
  }
  var STATE_TEXT = { open: 'Available', openplay: 'Open Play', booked: 'Booked', pencil: 'Pencil booked', past: 'Past', mine: 'Your request', selected: 'Selected' };

  /* opts: {
       days: ["YYYY-MM-DD", …], times: ["09:00", …], today: "YYYY-MM-DD",
       cell(date, time) -> { state, items:[{state, text, id}], text, title, click: fn|null }
     } */
  function render(el, opts) {
    var h = '<table class="cal"><thead><tr><th class="cal-corner" scope="col"><span>Time</span></th>';
    opts.days.forEach(function (d) {
      var dt = parse(d), isToday = d === opts.today;
      h += '<th scope="col" class="' + (isToday ? 'is-today' : '') + '"><b>' + (dt.getMonth() + 1) + '/' + dt.getDate() + '</b><span>' + (isToday ? 'TODAY' : DAYN[dt.getDay()]) + '</span></th>';
    });
    h += '</tr></thead><tbody>';
    var handlers = [];
    opts.times.forEach(function (t) {
      h += '<tr><th scope="row" class="cal-time"><span class="full">' + esc(label(t)) + '</span><span class="sh">' + esc(short(t)) + '</span></th>';
      opts.days.forEach(function (d) {
        var c = opts.cell(d, t) || { state: 'open' };
        var name = (STATE_TEXT[c.state] || '') + ', ' + label(t) + ', ' + parse(d).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });
        h += '<td class="cal-c st-' + c.state + '">';
        if (c.items && c.items.length) {
          h += '<div class="cal-stack">';
          c.items.forEach(function (it) {
            var i = handlers.push(it.click || null) - 1;
            h += '<button type="button" class="cal-chip st-' + it.state + '" data-h="' + i + '" title="' + esc(it.title || it.text) + '">' + txt(it.text, it.short) + '</button>';
          });
          if (c.addClick) { var j = handlers.push(c.addClick) - 1; h += '<button type="button" class="cal-add" data-h="' + j + '" aria-label="Add booking, ' + esc(name) + '">+</button>'; }
          h += '</div>';
        } else if (c.click) {
          var k = handlers.push(c.click) - 1;
          h += '<button type="button" class="cal-btn" data-h="' + k + '" aria-label="' + esc(c.aria || name) + '" aria-pressed="' + (c.state === 'selected') + '">' + txt(c.text, c.short) + '</button>';
        } else {
          h += '<span class="cal-txt" aria-label="' + esc(name) + '">' + txt(c.text, c.short) + '</span>';
        }
        h += '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
    el.querySelectorAll('[data-h]').forEach(function (b) {
      var fn = handlers[+b.getAttribute('data-h')];
      if (fn) b.addEventListener('click', fn); else b.disabled = true;
    });
  }

  function legend() {
    return '<ul class="cal-legend" aria-label="Legend">' +
      '<li><i class="st-open"></i>Available</li><li><i class="st-openplay"></i>Open Play</li>' +
      '<li><i class="st-booked"></i>Booked</li><li><i class="st-pencil"></i>Pencil booked</li></ul>';
  }

  window.PaceCal = { render: render, legend: legend, label: label, clock: clock, short: short, addDays: addDays, parse: parse, ymd: ymd, esc: esc };
})();
