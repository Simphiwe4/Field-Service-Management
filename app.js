/* ==========================================================================
   Thrive Automation FSM — modern interactive rebuild
   A self-contained, dependency-free demo application.
   ========================================================================== */
(function () {
  'use strict';

  /* ================================================================ config */
  var APP_VERSION = '1.0.0';
  var STATE_KEY = 'thrive-automation-fsm-demo-state-v1';
  var THEME_KEY = 'thrive-automation-fsm-demo-theme';

  var PAGES = {
    dashboard:  { title: 'Dashboard',      crumb: 'Workspace',    icon: 'grid',         render: renderDashboard },
    workorders: { title: 'Work Orders',    crumb: 'Operations',   icon: 'clipboard',    render: renderWorkOrders },
    dispatch:   { title: 'Dispatch',       crumb: 'Operations',   icon: 'route',        render: renderDispatch },
    inventory:  { title: 'Inventory',      crumb: 'Operations',   icon: 'box',          render: renderInventory },
    timesheets: { title: 'Timesheets',     crumb: 'Operations',   icon: 'clock',        render: renderTimesheets },
    projects:   { title: 'Projects',       crumb: 'Operations',   icon: 'folder',       render: renderProjects },
    checklists: { title: 'Checklists',     crumb: 'Operations',   icon: 'check-square', render: renderChecklists },
    sites:      { title: 'Sites & Assets', crumb: 'Resources',    icon: 'map-pin',      render: renderSites },
    hr:         { title: 'HR & Leave',     crumb: 'Resources',    icon: 'users',        render: renderHR },
    admin:      { title: 'Configuration',  crumb: 'Administration', icon: 'settings',   render: renderAdmin }
  };

  var NAV = [
    { label: 'Workspace', items: ['dashboard'] },
    { label: 'Operations', items: ['workorders', 'dispatch', 'inventory', 'timesheets', 'projects', 'checklists'] },
    { label: 'Resources', items: ['sites', 'hr'] },
    { label: 'Administration', items: ['admin'] }
  ];

  var STATUS_ORDER = { 'New': 0, 'Assigned': 1, 'In Progress': 2, 'On Hold': 3, 'Completed': 4, 'Cancelled': 5 };
  var PRIORITY_ORDER = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* =============================================================== helpers */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function localKey(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }
  function todayISO() { return localKey(new Date()); }
  function parseISO(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      var p = value.split('-');
      return new Date(+p[0], +p[1] - 1, +p[2]);
    }
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  function fmtDate(value, style) {
    var d = parseISO(value);
    if (!d) return '—';
    var m = MONTHS[d.getMonth()];
    var day = d.getDate();
    if (style === 'long') return WEEKDAYS[d.getDay()] + ', ' + MONTHS_LONG[d.getMonth()] + ' ' + day + ', ' + d.getFullYear();
    if (style === 'full') return WEEKDAYS[d.getDay()] + ', ' + m + ' ' + day;
    if (style === 'weekday') return WEEKDAYS[d.getDay()];
    if (style === 'day') return String(day);
    if (style === 'month') return m + ' ' + d.getFullYear();
    if (style === 'year') return m + ' ' + day + ', ' + d.getFullYear();
    return m + ' ' + day;
  }
  function fmtTime(value) {
    var d = parseISO(value);
    if (!d) return '—';
    var h = d.getHours(), m = d.getMinutes();
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + pad2(m) + ' ' + ap;
  }
  function fmtDateTime(value) {
    var d = parseISO(value);
    if (!d) return '—';
    return fmtDate(value) + ' · ' + fmtTime(value);
  }
  function relativeTime(value) {
    var d = parseISO(value);
    if (!d) return '';
    var diff = Date.now() - d.getTime();
    var mins = Math.round(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + ' min ago';
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    var days = Math.round(hours / 24);
    if (days < 7) return days + (days === 1 ? ' day ago' : ' days ago');
    return fmtDate(value);
  }
  function relativeDue(value) {
    var d = parseISO(value);
    if (!d) return '';
    var t = parseISO(todayISO());
    var diff = Math.round((d.getTime() - t.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff < 0) return Math.abs(diff) + 'd overdue';
    return 'in ' + diff + 'd';
  }
  function isToday(value) { return value && String(value).slice(0, 10) === todayISO(); }
  function startOfWeekISO(offsetWeeks) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    var dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow + (offsetWeeks || 0) * 7);
    return localKey(d);
  }
  function addDays(isoDate, n) {
    var d = parseISO(isoDate);
    d.setDate(d.getDate() + n);
    return localKey(d);
  }
  function weekDays(startISO) {
    var out = [];
    for (var i = 0; i < 7; i++) out.push(addDays(startISO, i));
    return out;
  }
  function weekLabel(startISO) {
    var s = parseISO(startISO), e = parseISO(addDays(startISO, 6));
    if (s.getMonth() === e.getMonth()) {
      return MONTHS[s.getMonth()] + ' ' + s.getDate() + ' – ' + e.getDate() + ', ' + e.getFullYear();
    }
    return fmtDate(startISO) + ' – ' + fmtDate(addDays(startISO, 6)) + ', ' + e.getFullYear();
  }
  function fmtNum(n) { return new Intl.NumberFormat('en-US').format(Math.round(n || 0)); }
  function fmtMoney(n, decimals) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0
    }).format(n || 0);
  }
  function fmtHours(n) {
    var v = Math.round((n || 0) * 10) / 10;
    return (Number.isInteger(v) ? v : v.toFixed(1)) + 'h';
  }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function sum(list, fn) { return list.reduce(function (a, b) { return a + (fn ? fn(b) : b); }, 0); }
  function initials(name) {
    return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase();
  }
  function slug(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }
  function haversineKm(a, b) {
    if (!a || !b) return 0;
    var R = 6371, toRad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toRad;
    var dLon = (b.lng - a.lng) * toRad;
    var lat1 = a.lat * toRad, lat2 = b.lat * toRad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function nextId(prefix, list, width) {
    var max = 0;
    (list || []).forEach(function (item) {
      var m = String(item.id || '').match(/(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    var n = max + 1;
    return prefix + '-' + String(n).padStart(width || 4, '0');
  }
  function options(values, current, valueKey, labelKey) {
    return values.map(function (v) {
      var value = valueKey ? v[valueKey] : v;
      var label = labelKey ? v[labelKey] : v;
      return '<option value="' + esc(value) + '"' + (String(value) === String(current) ? ' selected' : '') + '>' + esc(label) + '</option>';
    }).join('');
  }
  function selectedAttr(a, b) { return String(a) === String(b) ? ' selected' : ''; }

  /* ============================================================ local store */
  function loadState() {
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed._version === 1 && Array.isArray(parsed.workOrders)) return parsed;
      }
    } catch (e) { /* ignore corrupt storage */ }
    return clone(window.FSM_SEED);
  }
  function saveState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }
  function hasStoredState() {
    try { return !!localStorage.getItem(STATE_KEY); } catch (e) { return false; }
  }

  var state = loadState();
  var theme = 'light';
  try { theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { theme = 'light'; }
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');

  /* ============================================================== UI state */
  var ui = {
    page: 'dashboard',
    theme: theme,
    sidebarOpen: false,
    modal: null,
    drawer: null,
    palette: { open: false, query: '', index: 0 },
    popover: null,
    wo: { query: '', status: 'all', priority: 'all', tech: 'all', view: 'list', dayOffset: 0 },
    dispatch: {
      techId: 'T-01', date: todayISO(),
      stops: initialRouteStops('T-01', todayISO()),
      savedRouteId: (state.savedRoutes.find(function (r) { return r.techId === 'T-01' && r.date === todayISO(); }) || {}).id || null,
      dirty: false
    },
    inventory: { tab: 'items', query: '', category: 'all', warehouse: 'all' },
    timesheets: { tab: 'mine', techId: 'T-01', weekOffset: 0 },
    projects: { query: '' },
    checklists: { tab: 'instances', query: '' },
    sites: { tab: 'sites', query: '', type: 'all', assetStatus: 'all' },
    hr: { tab: 'requests' },
    admin: { tab: 'team' }
  };

  /* ============================================================== lookups */
  function techById(id) { return state.technicians.find(function (t) { return t.id === id; }); }
  function siteById(id) { return state.sites.find(function (s) { return s.id === id; }); }
  function woById(id) { return state.workOrders.find(function (w) { return w.id === id; }); }
  function itemById(id) { return state.inventory.find(function (i) { return i.id === id; }); }
  function warehouseById(id) { return state.warehouses.find(function (w) { return w.id === id; }); }
  function projectById(id) { return state.projects.find(function (p) { return p.id === id; }); }
  function checklistById(id) { return state.checklists.find(function (c) { return c.id === id; }); }
  function templateById(id) { return state.checklistTemplates.find(function (t) { return t.id === id; }); }
  function woTemplateById(id) { return state.workOrderTemplates.find(function (t) { return t.id === id; }); }
  function tsById(id) { return state.timesheets.find(function (t) { return t.id === id; }); }
  function leaveById(id) { return state.leaveRequests.find(function (l) { return l.id === id; }); }
  function routeById(id) { return state.savedRoutes.find(function (r) { return r.id === id; }); }

  function openWorkOrders() {
    return state.workOrders.filter(function (w) { return w.status !== 'Completed' && w.status !== 'Cancelled'; });
  }
  function lowStockItems() {
    return state.inventory.filter(function (i) { return i.onHand <= i.reorderLevel; });
  }
  function overdueWOs() {
    var today = todayISO();
    return openWorkOrders().filter(function (w) { return w.due && w.due < today; });
  }
  function isOverdue(w) {
    return w && w.due && w.due < todayISO() && w.status !== 'Completed' && w.status !== 'Cancelled';
  }
  function onTimeRate() {
    var done = state.workOrders.filter(function (w) { return w.status === 'Completed' && w.completedAt; });
    if (!done.length) return 100;
    var onTime = done.filter(function (w) { return w.completedAt <= w.due; }).length;
    return Math.round((onTime / done.length) * 100);
  }
  function completedThisWeek() {
    var ws = startOfWeekISO(0);
    return state.workOrders.filter(function (w) {
      return w.status === 'Completed' && w.completedAt && w.completedAt >= ws;
    }).length;
  }
  function completedLast7() {
    var from = addDays(todayISO(), -6);
    return state.workOrders.filter(function (w) {
      return w.status === 'Completed' && w.completedAt && w.completedAt >= from;
    }).length;
  }
  function openWOsForTech(techId) {
    return openWorkOrders().filter(function (w) { return w.techId === techId; });
  }
  function tsFor(techId, weekStart) {
    return state.timesheets.find(function (t) { return t.techId === techId && t.weekStart === weekStart; });
  }
  function ensureTimesheet(techId, weekStart) {
    var ts = tsFor(techId, weekStart);
    if (ts) return ts;
    ts = {
      id: nextId('TS', state.timesheets, 3), techId: techId, weekStart: weekStart,
      status: 'Draft', submittedAt: null, approvedBy: null, entries: []
    };
    state.timesheets.push(ts);
    return ts;
  }
  function tsHours(ts) { return ts ? sum(ts.entries || [], function (e) { return Number(e.hours) || 0; }) : 0; }
  function tsBillable(ts) {
    return ts ? sum((ts.entries || []).filter(function (e) { return e.billable; }), function (e) { return Number(e.hours) || 0; }) : 0;
  }
  function checklistProgress(c) {
    if (!c || !c.items || !c.items.length) return 0;
    return Math.round((c.items.filter(function (i) { return i.done; }).length / c.items.length) * 100);
  }
  function projectProgress(p) {
    if (!p || !p.milestones || !p.milestones.length) return p ? p.progress || 0 : 0;
    return Math.round(sum(p.milestones, function (m) { return Number(m.progress) || 0; }) / p.milestones.length);
  }
  function projectSpentPct(p) { return p.budget ? clamp(Math.round((p.spent / p.budget) * 100), 0, 999) : 0; }

  function defaultRouteStops(techId, date) {
    var route = state.savedRoutes.find(function (r) { return r.techId === techId && r.date === date; });
    if (route) return route.stops.slice();
    return state.workOrders.filter(function (w) {
      return w.techId === techId && w.scheduled && scheduledDateKey(w) === date &&
        w.status !== 'Completed' && w.status !== 'Cancelled';
    }).sort(function (a, b) { return new Date(a.scheduled) - new Date(b.scheduled); }).map(function (w) { return w.id; });
  }
  function initialRouteStops(techId, date) {
    return defaultRouteStops(techId, date);
  }

  /* ================================================================ toasts */
  function showToast(title, message, type) {
    var root = $('#toastRoot');
    if (!root) return;
    var existing = root.querySelectorAll('.toast:not(.leaving)');
    if (existing.length >= 4) existing[0].remove();
    type = type || 'success';
    var iconName = type === 'error' ? 'alert' : type === 'warn' ? 'alert' : type === 'info' ? 'bell' : 'check';
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML =
      '<div class="toast-icon">' + icon(iconName) + '</div>' +
      '<div class="toast-body"><div class="toast-title">' + esc(title) + '</div>' +
      (message ? '<div class="toast-msg">' + esc(message) + '</div>' : '') + '</div>' +
      '<button class="toast-close" data-action="toast-close" aria-label="Dismiss">' + icon('x') + '</button>';
    root.appendChild(el);
    setTimeout(function () {
      if (!el.parentNode) return;
      el.classList.add('leaving');
      setTimeout(function () { el.remove(); }, 220);
    }, 4200);
  }
  function closeToast(btn) {
    var el = btn.closest('.toast');
    if (!el) return;
    el.classList.add('leaving');
    setTimeout(function () { el.remove(); }, 220);
  }

  /* ============================================================== mutation */
  function logActivity(text, type, by) {
    state.activity.unshift({
      id: 'AC-' + Date.now(),
      at: new Date().toISOString(),
      type: type || 'work',
      text: text,
      by: by || 'Alex Morgan'
    });
    state.activity = state.activity.slice(0, 40);
  }
  function pushNotification(title, text, type, target) {
    state.notifications.unshift({
      id: 'N-' + Date.now(),
      title: title, text: text, time: new Date().toISOString(),
      read: false, type: type || 'work', target: target || ''
    });
    state.notifications = state.notifications.slice(0, 30);
  }
  function touch() { saveState(); }
  function applyMovementStock(m) {
    var it = itemById(m.itemId);
    if (!it) return;
    if (m.type === 'Receipt') it.onHand += Number(m.qty) || 0;
    if (m.type === 'Issue') it.onHand = Math.max(0, it.onHand - (Number(m.qty) || 0));
  }

  /* ============================================================== routing */
  function pageFromHash() {
    var h = location.hash.replace(/^#\/?/, '').split('?')[0];
    return PAGES[h] ? h : 'dashboard';
  }
  function route() {
    var page = pageFromHash();
    ui.page = page;
    ui.sidebarOpen = false;
    ui.popover = null;
    ui.modal = null;
    ui.drawer = null;
    ui.palette.open = false;
    document.body.classList.remove('sidebar-open');
    renderChrome();
    renderView();
    renderOverlay();
    window.scrollTo(0, 0);
  }
  function go(page) {
    if (ui.page === page) { renderView(); return; }
    location.hash = '#/' + page;
  }

  function renderChrome() {
    renderSidebar();
    renderTopbar();
    document.title = 'Thrive Automation FSM · ' + PAGES[ui.page].title;
  }

  function renderSidebar() {
    var openCount = openWorkOrders().length;
    var lowCount = lowStockItems().length;
    var badgeFor = {
      workorders: { value: openCount, cls: '' },
      inventory: lowCount ? { value: lowCount, cls: 'warm' } : null,
      dispatch: { value: ui.dispatch.stops.length, cls: '' }
    };
    var navHTML = NAV.map(function (group) {
      return '<div class="nav-section">' +
        '<div class="nav-label">' + group.label + '</div>' +
        group.items.map(function (id) {
          var p = PAGES[id];
          var badge = badgeFor[id];
          return '<a class="nav-item' + (ui.page === id ? ' active' : '') + '" href="#/' + id + '"' +
            (ui.page === id ? ' aria-current="page"' : '') + '>' +
            icon(p.icon) + '<span>' + p.title + '</span>' +
            (badge ? '<span class="nav-badge ' + badge.cls + '">' + badge.value + '</span>' : '') +
            '</a>';
        }).join('') +
        '</div>';
    }).join('');

    var totalTechs = state.technicians.length;
    var available = state.technicians.filter(function (t) { return t.status !== 'On Leave'; }).length;
    var coverage = Math.round((available / totalTechs) * 100);

    $('#sidebar').innerHTML =
      '<div class="sidebar-inner">' +
        '<div class="brand">' +
          '<div class="brand-mark">' +
            '<svg viewBox="0 0 32 32" aria-hidden="true">' +
              '<path d="M16 4.4l9.8 9.8h-5.9v13.4h-7.8V14.2H6.2z" fill="#fff" opacity=".97"/>' +
            '</svg>' +
          '</div>' +
          '<div class="brand-text">' +
            '<div class="brand-name">Thrive Automation <span>FSM</span></div>' +
            '<div class="brand-tag">Field service</div>' +
          '</div>' +
        '</div>' +
        '<div class="nav-scroll">' + navHTML + '</div>' +
        '<div class="sidebar-footer">' +
          '<div class="health-card">' +
            '<div class="health-head"><span class="health-title">Crew coverage</span><span class="health-pct">' + coverage + '%</span></div>' +
            '<div class="health-track"><div class="health-fill" style="width:' + coverage + '%"></div></div>' +
            '<div class="health-foot"><span>' + available + ' of ' + totalTechs + ' available</span><span>' + openCount + ' open WOs</span></div>' +
          '</div>' +
          '<a class="sidebar-user" href="#/admin" aria-label="Open configuration">' +
            '<span class="avatar" style="background:' + (techById('T-01') ? techById('T-01').color : '#2563eb') + '">AM</span>' +
            '<span><span class="su-name">Alex Morgan</span><span class="su-role">Lead Field Engineer</span></span>' +
            icon('chevron-right') +
          '</a>' +
        '</div>' +
      '</div>';
  }

  function notificationsPopover() {
    var unread = state.notifications.filter(function (n) { return !n.read; }).length;
    var items = state.notifications.length ? state.notifications.map(function (n) {
      var iconMap = { critical: 'alert', inventory: 'box', timesheet: 'clock', checklist: 'check-square', work: 'clipboard' };
      var cls = n.type === 'critical' ? 'background:var(--rose-soft);color:var(--rose)' :
        n.type === 'inventory' ? 'background:var(--amber-soft);color:var(--amber)' :
        n.type === 'timesheet' ? 'background:var(--violet-soft);color:var(--violet)' :
        n.type === 'checklist' ? 'background:var(--teal-soft);color:var(--teal)' :
        'background:var(--primary-soft);color:var(--primary)';
      return '<button class="notif-item' + (n.read ? '' : ' unread') + '" data-action="notification-open" data-id="' + esc(n.id) + '">' +
        '<span class="notif-icon" style="' + cls + '">' + icon(iconMap[n.type] || 'bell') + '</span>' +
        '<span><span class="notif-title">' + esc(n.title) + '</span>' +
        '<span class="notif-text">' + esc(n.text) + '</span>' +
        '<span class="notif-time">' + relativeTime(n.time) + '</span></span>' +
        '</button>';
    }).join('') : '<div class="empty" style="padding:28px 16px"><p>You are all caught up.</p></div>';
    return '<div class="popover" role="dialog" aria-label="Notifications">' +
      '<div class="popover-head"><h4>Notifications' + (unread ? ' · ' + unread + ' new' : '') + '</h4>' +
      '<button class="link-btn" data-action="mark-all-read">Mark all read</button></div>' +
      '<div class="popover-body">' + items + '</div></div>';
  }

  function profilePopover() {
    return '<div class="popover profile-pop" role="menu">' +
      '<div class="profile-top"><span class="avatar avatar-lg" style="background:#2563eb">AM</span>' +
      '<div><div class="name">Alex Morgan</div><div class="mail">alex.morgan@thriveautomation.example</div></div></div>' +
      '<div class="popover-menu">' +
        '<a href="#/admin">' + icon('user') + 'Profile & team</a>' +
        '<button data-action="toggle-theme">' + icon(ui.theme === 'dark' ? 'sun' : 'moon') + (ui.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') + '</button>' +
        '<button data-action="open-about">' + icon('command') + 'About this rebuild</button>' +
        '<div class="popover-sep"></div>' +
        '<button data-action="reset-demo" class="danger">' + icon('refresh') + 'Reset demo data</button>' +
      '</div>' +
      '<div class="popover-foot">Demo workspace · signed in as manager</div>' +
    '</div>';
  }

  function renderTopbar() {
    var unread = state.notifications.some(function (n) { return !n.read; });
    var themeIcon = ui.theme === 'dark' ? 'sun' : 'moon';
    $('#topbar').innerHTML =
      '<button class="icon-btn mobile-menu" data-action="toggle-sidebar" aria-label="Open navigation">' + icon('menu') + '</button>' +
      '<div class="page-context"><div class="crumb">' + PAGES[ui.page].crumb + '</div><h2>' + PAGES[ui.page].title + '</h2></div>' +
      '<div class="topbar-right">' +
        '<button class="search-trigger" data-action="open-palette" aria-label="Search">' + icon('search') +
          '<span>Search work orders, sites, inventory…</span><kbd>Ctrl K</kbd></button>' +
        '<div class="popover-anchor">' +
          '<button class="icon-btn' + (ui.popover === 'notifications' ? ' active' : '') + '" data-action="toggle-notifications" aria-label="Notifications">' +
            icon('bell') + (unread ? '<span class="notif-dot"></span>' : '') + '</button>' +
          (ui.popover === 'notifications' ? notificationsPopover() : '') +
        '</div>' +
        '<button class="icon-btn" data-action="toggle-theme" aria-label="Toggle dark mode">' + icon(themeIcon) + '</button>' +
        '<div class="popover-anchor">' +
          '<button class="avatar-btn" data-action="toggle-profile" aria-label="Account menu"><span class="avatar" style="background:#2563eb">AM</span></button>' +
          (ui.popover === 'profile' ? profilePopover() : '') +
        '</div>' +
      '</div>';
  }

  function renderView() {
    var page = PAGES[ui.page] || PAGES.dashboard;
    var html = page.render();
    var view = $('#view');
    view.innerHTML = html;
    view.scrollTop = 0;
  }
  function refreshView() { renderView(); }
  function refreshAll() { renderChrome(); renderView(); }

  /* ======================================================== shared partials */
  function avatarHTML(person, size) {
    if (!person) return '<span class="avatar avatar-sm" style="background:var(--slate)">?</span>';
    return '<span class="avatar ' + (size || 'avatar-sm') + '" style="background:' + person.color + '">' + esc(person.initials || initials(person.name)) + '</span>';
  }
  function personCell(person, sub) {
    if (!person) return '<span class="chip chip--ghost">Unassigned</span>';
    return '<span class="cell-user">' + avatarHTML(person) + '<span><span class="name">' + esc(person.name) + '</span>' +
      (sub ? '<span class="cell-sub">' + esc(sub) + '</span>' : '') + '</span></span>';
  }
  function statusChip(status, withDot) {
    return '<span class="chip chip--' + slug(status) + '">' +
      (withDot === false ? '' : '<i class="dot"></i>') + esc(status) + '</span>';
  }
  function priorityTag(priority) {
    return '<span class="prio prio--' + slug(priority) + '"><i class="pdot"></i>' + esc(priority) + '</span>';
  }
  function typeChip(type) { return '<span class="chip chip--type">' + esc(type) + '</span>'; }
  function dueCell(w) {
    var over = isOverdue(w);
    return '<span class="' + (over ? 'bold' : '') + '" style="' + (over ? 'color:var(--rose)' : '') + '">' + fmtDate(w.due) + '</span>' +
      '<div class="cell-sub" style="' + (over ? 'color:var(--rose)' : '') + '">' + relativeDue(w.due) + '</div>';
  }
  function pageHead(opts) {
    return '<div class="page-head">' +
      '<div class="page-head-main">' +
        (opts.eyebrow ? '<div class="page-eyebrow">' + (opts.icon ? icon(opts.icon) : '') + esc(opts.eyebrow) + '</div>' : '') +
        '<h1>' + opts.title + '</h1>' +
        (opts.sub ? '<p class="page-sub">' + opts.sub + '</p>' : '') +
        (opts.meta ? '<div class="page-meta">' + opts.meta + '</div>' : '') +
      '</div>' +
      (opts.actions ? '<div class="page-actions">' + opts.actions + '</div>' : '') +
    '</div>';
  }
  function miniKpi(iconName, value, label, color, tint) {
    return '<div class="mini-kpi">' +
      '<span class="ic" style="--color:' + color + ';--tint:' + tint + '">' + icon(iconName) + '</span>' +
      '<span><span class="v">' + value + '</span><span class="l">' + label + '</span></span>' +
    '</div>';
  }
  function emptyState(iconName, title, text, actionHTML) {
    return '<div class="empty"><div class="empty-icon">' + icon(iconName) + '</div>' +
      '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (actionHTML || '') + '</div>';
  }
  function progressBar(pct, cls) {
    return '<div class="progress ' + (cls || '') + '"><span style="width:' + clamp(pct, 0, 100) + '%"></span></div>';
  }
  function getInitialsColor(seed) {
    var colors = ['#2563eb', '#0d9488', '#7c3aed', '#db2777', '#d97706', '#0891b2', '#4f46e5', '#65a30d'];
    var n = 0;
    for (var i = 0; i < seed.length; i++) n += seed.charCodeAt(i);
    return colors[n % colors.length];
  }

  /* ============================================================== overlays */
  function renderOverlay() {
    var root = $('#overlayRoot');
    var html = '';
    if (ui.modal) html += modalShell();
    if (ui.drawer) html += drawerShell();
    if (ui.palette.open) html += paletteShell();
    root.innerHTML = html;
    var active = !!(ui.modal || ui.drawer || ui.palette.open);
    document.body.classList.toggle('overlay-open', active);
    if (ui.palette.open) {
      setTimeout(function () {
        var input = $('#paletteInput');
        if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
      }, 30);
    } else if (ui.modal) {
      setTimeout(function () {
        var first = $('.modal input:not([type=hidden]):not([readonly]), .modal select, .modal textarea');
        if (first) first.focus();
      }, 40);
    }
  }
  function openModal(type, id, payload) {
    ui.drawer = null;
    ui.palette.open = false;
    ui.popover = null;
    ui.modal = { type: type, id: id || null, payload: payload || null };
    renderChrome();
    renderOverlay();
  }
  function closeModal() {
    ui.modal = null;
    renderOverlay();
  }
  function openDrawer(type, id, tab) {
    ui.modal = null;
    ui.palette.open = false;
    ui.popover = null;
    ui.drawer = { type: type, id: id, tab: tab || 'overview' };
    renderChrome();
    renderOverlay();
  }
  function closeDrawer() {
    ui.drawer = null;
    renderOverlay();
  }
  function openPalette() {
    ui.palette = { open: true, query: '', index: 0 };
    ui.popover = null;
    ui.modal = null;
    ui.drawer = null;
    renderChrome();
    renderOverlay();
  }
  function closePalette() {
    ui.palette = { open: false, query: '', index: 0 };
    renderOverlay();
  }

  function modalShell() {
    var m = ui.modal;
    var meta = modalMeta(m);
    if (!meta) { return ''; }
    var bodyCls = meta.size === 'lg' ? ' modal-lg' : meta.size === 'sm' ? ' modal-sm' : '';
    return '<div class="modal-backdrop" data-action="close-modal"></div>' +
      '<div class="modal' + bodyCls + '" role="dialog" aria-modal="true" aria-label="' + esc(meta.title) + '">' +
        '<div class="modal-head">' +
          '<div class="modal-head-icon">' + icon(meta.icon || 'clipboard') + '</div>' +
          '<div><h3>' + esc(meta.title) + '</h3>' + (meta.sub ? '<div class="sub">' + esc(meta.sub) + '</div>' : '') + '</div>' +
          '<button class="modal-close" data-action="close-modal" aria-label="Close">' + icon('x') + '</button>' +
        '</div>' +
        '<div class="modal-body">' + meta.body + '</div>' +
        (meta.foot ? '<div class="modal-foot">' + meta.foot + '</div>' : '') +
      '</div>';
  }

  function drawerShell() {
    var d = ui.drawer;
    if (d.type === 'wo') {
      var w = woById(d.id);
      if (!w) return '';
      return '<div class="drawer-backdrop" data-action="close-drawer"></div>' +
        '<aside class="drawer" role="dialog" aria-modal="true" aria-label="Work order details">' + workOrderDrawer(w, d.tab) + '</aside>';
    }
    if (d.type === 'project') {
      var p = projectById(d.id);
      if (!p) return '';
      return '<div class="drawer-backdrop" data-action="close-drawer"></div>' +
        '<aside class="drawer" role="dialog" aria-modal="true" aria-label="Project details">' + projectDrawer(p) + '</aside>';
    }
    if (d.type === 'checklist') {
      var c = checklistById(d.id);
      if (!c) return '';
      return '<div class="drawer-backdrop" data-action="close-drawer"></div>' +
        '<aside class="drawer" role="dialog" aria-modal="true" aria-label="Checklist details">' + checklistDrawer(c) + '</aside>';
    }
    return '';
  }

  /* ============================================================== palette */
  function searchAll(query) {
    var q = query.trim().toLowerCase();
    if (!q) return [];
    var results = [];
    state.workOrders.forEach(function (w) {
      var hay = [w.id, w.title, w.company, (siteById(w.siteId) || {}).name, w.status, w.priority].join(' ').toLowerCase();
      if (hay.indexOf(q) !== -1) {
        results.push({ type: 'wo', id: w.id, title: w.id + ' · ' + w.title, sub: (siteById(w.siteId) || {}).name + ' · ' + w.status, icon: 'clipboard', hint: 'Work order' });
      }
    });
    state.inventory.forEach(function (i) {
      var hay = [i.sku, i.name, i.category].join(' ').toLowerCase();
      if (hay.indexOf(q) !== -1) results.push({ type: 'item', id: i.id, title: i.name, sub: i.sku + ' · ' + i.onHand + ' on hand', icon: 'box', hint: 'Inventory' });
    });
    state.sites.forEach(function (s) {
      var hay = [s.name, s.company, s.city, s.address].join(' ').toLowerCase();
      if (hay.indexOf(q) !== -1) results.push({ type: 'site', id: s.id, title: s.name, sub: s.company + ' · ' + s.city, icon: 'map-pin', hint: 'Site' });
    });
    state.projects.forEach(function (p) {
      var hay = [p.name, p.company, p.status].join(' ').toLowerCase();
      if (hay.indexOf(q) !== -1) results.push({ type: 'project', id: p.id, title: p.name, sub: p.company + ' · ' + p.status, icon: 'folder', hint: 'Project' });
    });
    state.technicians.forEach(function (t) {
      var hay = [t.name, t.role, t.group].join(' ').toLowerCase();
      if (hay.indexOf(q) !== -1) results.push({ type: 'tech', id: t.id, title: t.name, sub: t.role + ' · ' + t.group, icon: 'user', hint: 'Technician' });
    });
    state.checklists.forEach(function (c) {
      var hay = [c.name, (siteById(c.siteId) || {}).name, c.status].join(' ').toLowerCase();
      if (hay.indexOf(q) !== -1) results.push({ type: 'checklist', id: c.id, title: c.name, sub: (siteById(c.siteId) || {}).name + ' · ' + c.status, icon: 'check-square', hint: 'Checklist' });
    });
    PAGES && Object.keys(PAGES).forEach(function (key) {
      if (PAGES[key].title.toLowerCase().indexOf(q) !== -1) {
        results.push({ type: 'page', id: key, title: PAGES[key].title, sub: PAGES[key].crumb + ' · Open page', icon: PAGES[key].icon, hint: 'Navigate' });
      }
    });
    return results.slice(0, 24);
  }

  function paletteShell() {
    return '<div class="palette-backdrop" data-action="close-palette"></div>' +
      '<div class="palette" role="dialog" aria-modal="true" aria-label="Search">' +
        '<div class="palette-search">' + icon('search') +
          '<input id="paletteInput" type="text" placeholder="Search work orders, inventory, sites, projects…" autocomplete="off" value="' + esc(ui.palette.query) + '" data-search="palette">' +
          '<kbd>ESC</kbd>' +
        '</div>' +
        '<div class="palette-results" id="paletteResults">' + paletteResultsHTML() + '</div>' +
        '<div class="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>' +
      '</div>';
  }

  function paletteResultsHTML() {
    var results = searchAll(ui.palette.query);
    if (!ui.palette.query.trim()) {
      var quick = [
        { type: 'page', id: 'workorders', title: 'Work Orders', sub: 'Operations', icon: 'clipboard' },
        { type: 'page', id: 'dispatch', title: 'Dispatch', sub: 'Operations', icon: 'route' },
        { type: 'page', id: 'inventory', title: 'Inventory', sub: 'Operations', icon: 'box' },
        { type: 'page', id: 'timesheets', title: 'Timesheets', sub: 'Operations', icon: 'clock' },
        { type: 'page', id: 'projects', title: 'Projects', sub: 'Operations', icon: 'folder' },
        { type: 'page', id: 'checklists', title: 'Checklists', sub: 'Operations', icon: 'check-square' }
      ];
      return '<div class="palette-group"><div class="palette-group-label">Quick navigation</div>' +
        quick.map(function (r, i) { return paletteItemHTML(r, i, i); }).join('') + '</div>';
    }
    if (!results.length) {
      return '<div class="palette-empty">' + icon('search') + 'No matches for “' + esc(ui.palette.query) + '”.</div>';
    }
    var groups = {};
    results.forEach(function (r) {
      var label = { wo: 'Work orders', item: 'Inventory', site: 'Sites', project: 'Projects', tech: 'Technicians', checklist: 'Checklists', page: 'Pages' }[r.type];
      (groups[label] = groups[label] || []).push(r);
    });
    var idx = 0;
    return Object.keys(groups).map(function (label) {
      return '<div class="palette-group"><div class="palette-group-label">' + label + '</div>' +
        groups[label].map(function (r) { var i = idx++; return paletteItemHTML(r, i, ui.palette.index); }).join('') + '</div>';
    }).join('');
  }
  function paletteItemHTML(r, index, activeIndex) {
    return '<button class="palette-item' + (index === activeIndex ? ' active' : '') + '" data-action="palette-open" data-type="' + esc(r.type) + '" data-id="' + esc(r.id) + '" data-index="' + index + '">' +
      '<span class="ic">' + icon(r.icon) + '</span>' +
      '<span class="tx"><span class="t1">' + esc(r.title) + '</span><span class="t2">' + esc(r.sub) + '</span></span>' +
      (r.hint ? '<span class="hint">' + esc(r.hint) + '</span>' : '') +
    '</button>';
  }
  function paletteFlat() {
    if (!ui.palette.query.trim()) {
      return [
        { type: 'page', id: 'workorders' }, { type: 'page', id: 'dispatch' }, { type: 'page', id: 'inventory' },
        { type: 'page', id: 'timesheets' }, { type: 'page', id: 'projects' }, { type: 'page', id: 'checklists' }
      ];
    }
    return searchAll(ui.palette.query);
  }
  function updatePaletteResults() {
    var box = $('#paletteResults');
    if (box) box.innerHTML = paletteResultsHTML();
  }

  /* ======================================================== shared actions */
  function setTheme(next) {
    ui.theme = next;
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
    renderChrome();
  }
  function toggleTheme() { setTheme(ui.theme === 'dark' ? 'light' : 'dark'); }

  function resetDemo() {
    state = clone(window.FSM_SEED);
    saveState();
    var resetRoute = state.savedRoutes.find(function (r) { return r.techId === 'T-01' && r.date === todayISO(); });
    ui.dispatch = { techId: 'T-01', date: todayISO(), stops: initialRouteStops('T-01', todayISO()), savedRouteId: resetRoute ? resetRoute.id : null, dirty: false };
    ui.timesheets.weekOffset = 0;
    ui.timesheets.techId = 'T-01';
    ui.modal = null;
    ui.drawer = null;
    ui.palette.open = false;
    ui.popover = null;
    renderChrome();
    renderView();
    renderOverlay();
    showToast('Demo data restored', 'All records were reset to the original demo dataset.', 'success');
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'thrive-automation-fsm-demo-' + todayISO() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast('Export ready', 'The demo dataset was downloaded as JSON.', 'info');
  }

  function navigateToSearchResult(type, id) {
    ui.palette.open = false;
    ui.popover = null;
    if (type === 'page') { closePalette(); setPage(id); return; }
    if (type === 'wo') { closePalette(); setPage('workorders'); openDrawer('wo', id); return; }
    if (type === 'item') {
      closePalette();
      var foundItem = itemById(id);
      setPage('inventory');
      ui.inventory.tab = 'items';
      ui.inventory.query = foundItem ? foundItem.sku : '';
      renderView();
      if (foundItem) openModal('item-adjust', id);
      return;
    }
    if (type === 'site') { closePalette(); setPage('sites'); ui.sites.tab = 'sites'; renderView(); openModal('site-detail', id); return; }
    if (type === 'project') { closePalette(); setPage('projects'); renderView(); openDrawer('project', id); return; }
    if (type === 'tech') { closePalette(); setPage('admin'); ui.admin.tab = 'team'; renderView(); openModal('tech-edit', id); return; }
    if (type === 'checklist') { closePalette(); setPage('checklists'); renderView(); openDrawer('checklist', id); return; }
  }

  /* ============================================================ date helpers */
  function scheduledDateKey(w) { return w.scheduled ? localKey(parseISO(w.scheduled)) : null; }
  function timePosition(scheduled) {
    var d = parseISO(scheduled);
    if (!d) return { left: 0, width: 20 };
    var start = 8, end = 18;
    var hour = d.getHours() + d.getMinutes() / 60;
    var left = clamp(((hour - start) / (end - start)) * 100, 0, 95);
    return { left: left };
  }
  function workOrderColor(w) {
    if (w.priority === 'Critical') return { color: 'var(--rose)', bg: 'var(--rose-soft)' };
    if (w.priority === 'High') return { color: 'var(--amber)', bg: 'var(--amber-soft)' };
    if (w.status === 'Completed') return { color: 'var(--green)', bg: 'var(--green-soft)' };
    if (w.status === 'In Progress') return { color: 'var(--teal)', bg: 'var(--teal-soft)' };
    return { color: 'var(--primary)', bg: 'var(--primary-soft)' };
  }

  /* chart data */
  function volumeSeries() {
    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      var key = localKey(d);
      days.push({
        key: key,
        label: WEEKDAYS[d.getDay()],
        created: state.workOrders.filter(function (w) { return w.created === key; }).length,
        completed: state.workOrders.filter(function (w) { return w.completedAt === key; }).length
      });
    }
    return days;
  }
  function statusCounts() {
    var map = { 'New': 0, 'Assigned': 0, 'In Progress': 0, 'On Hold': 0, 'Completed': 0 };
    state.workOrders.forEach(function (w) { if (map[w.status] != null) map[w.status]++; });
    return map;
  }

  /* ================================================================= PAGES */
  /* ============================================================== map view */
  function renderMap(stops) {
    var svgW = 640, svgH = 380;
    var pts = (stops || []).map(function (w) {
      var s = siteById(w.siteId);
      return { w: w, site: s };
    }).filter(function (p) { return p.site; });

    var staticMap =
      '<path class="map-water" d="M480 0 C 520 70 596 108 640 178 L640 380 L548 380 C 508 304 476 236 476 154 Z"/>' +
      '<rect class="map-park" x="64" y="268" width="116" height="78" rx="14"/>' +
      '<rect class="map-park" x="430" y="34" width="96" height="68" rx="12"/>' +
      '<path class="map-road" d="M-20 116 C 110 86 206 142 334 108 S 524 42 660 86"/>' +
      '<path class="map-road" d="M-20 268 C 120 242 232 286 352 258 S 542 212 660 246"/>' +
      '<path class="map-road minor" d="M92 -20 C 124 76 106 186 138 400"/>' +
      '<path class="map-road minor" d="M268 -20 C 296 104 276 210 306 400"/>' +
      '<path class="map-road minor" d="M434 -20 C 410 94 462 214 438 400"/>' +
      '<path class="map-road minor" d="M-20 190 C 118 170 260 196 660 170"/>' +
      '<path class="map-road minor" d="M180 0 C 196 120 170 250 196 380"/>';

    var route = '', pins = '';
    if (pts.length) {
      var lats = pts.map(function (p) { return p.site.lat; });
      var lngs = pts.map(function (p) { return p.site.lng; });
      var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
      var minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);
      if (maxLat - minLat < 0.004) { minLat -= 0.002; maxLat += 0.002; }
      if (maxLng - minLng < 0.004) { minLng -= 0.002; maxLng += 0.002; }
      var coords = pts.map(function (p) {
        var x = 74 + ((p.site.lng - minLng) / (maxLng - minLng)) * 486;
        var y = 322 - ((p.site.lat - minLat) / (maxLat - minLat)) * 246;
        return { x: x, y: y, p: p };
      });
      var seenPins = {};
      coords.forEach(function (c) {
        var key = c.x.toFixed(0) + ',' + c.y.toFixed(0);
        var n = seenPins[key] || 0;
        seenPins[key] = n + 1;
        if (n > 0) {
          var angle = -0.9 + n * 1.9;
          var radius = 15 * Math.ceil(n / 2);
          c.x += Math.cos(angle) * radius;
          c.y += Math.sin(angle) * radius;
        }
      });
      route = '<path class="map-route-line" d="M' + coords.map(function (c) { return c.x.toFixed(1) + ' ' + c.y.toFixed(1); }).join(' L ') + '"/>';
      pins = coords.map(function (c, i) {
        var isLast = i === coords.length - 1;
        var color = isLast ? '#16a34a' : '#2563eb';
        return '<g class="map-pin">' +
          '<title>' + esc(c.p.w.id + ' · ' + c.p.w.title) + '</title>' +
          (isLast ? '<circle cx="' + c.x + '" cy="' + c.y + '" r="15" fill="' + color + '" opacity=".14"/>' : '') +
          '<circle class="ring" cx="' + c.x + '" cy="' + c.y + '" r="10" style="stroke:' + color + '"/>' +
          '<text x="' + c.x + '" y="' + c.y + '" style="fill:' + color + '">' + (i + 1) + '</text>' +
        '</g>';
      }).join('');
    }

    return '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Route map">' +
      staticMap + route + pins +
      (pts.length ? '' : '<text x="320" y="190" text-anchor="middle" fill="#8090a8" font-size="13">No stops on this route yet</text>') +
    '</svg>';
  }

  function fmtDuration(mins) {
    mins = Math.round(mins || 0);
    var h = Math.floor(mins / 60), m = mins % 60;
    if (h && m) return h + 'h ' + m + 'm';
    if (h) return h + 'h';
    return m + 'm';
  }

  function routeMetrics(stops) {
    var km = 0;
    for (var i = 1; i < stops.length; i++) {
      var a = siteById(stops[i - 1].siteId), b = siteById(stops[i].siteId);
      km += haversineKm(a, b);
    }
    return { km: km, mins: (km / 32) * 60 + stops.length * 20 };
  }
  function dispatchStops() {
    return ui.dispatch.stops.map(function (id) { return woById(id); }).filter(Boolean);
  }

  /* ============================================================ dashboard */
  function volumeChartHTML(series) {
    var W = 720, H = 236;
    var padL = 34, padR = 14, padT = 16, padB = 28;
    var chartW = W - padL - padR, chartH = H - padT - padB;
    var max = Math.max(4, Math.max.apply(null, series.map(function (d) { return Math.max(d.created, d.completed); }))) + 1;
    var slot = chartW / series.length;
    var barW = Math.min(30, slot * 0.46);
    var grid = '', bars = '', line = '', dots = '', labels = '';

    for (var g = 0; g <= 4; g++) {
      var gy = padT + (chartH / 4) * g;
      var val = Math.round(max - (max / 4) * g);
      grid += '<line class="chart-grid-line" x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '"/>' +
        '<text class="chart-axis-label" x="' + (padL - 8) + '" y="' + (gy + 3) + '" text-anchor="end">' + val + '</text>';
    }

    var points = [];
    series.forEach(function (d, i) {
      var x = padL + slot * i + slot / 2;
      var bh = (d.created / max) * chartH;
      var by = padT + chartH - bh;
      bars += '<rect class="chart-bar" x="' + (x - barW / 2) + '" y="' + by + '" width="' + barW + '" height="' + Math.max(2, bh) + '" rx="5"><title>' + d.label + ': ' + d.created + ' created</title></rect>';
      var cy = padT + chartH - (d.completed / max) * chartH;
      points.push({ x: x, y: cy });
      labels += '<text class="chart-axis-label" x="' + x + '" y="' + (H - 9) + '" text-anchor="middle">' + d.label + '</text>';
    });
    points.forEach(function (p, i) {
      line += (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' ';
      dots += '<circle class="chart-dot" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.5"><title>' + series[i].label + ': ' + series[i].completed + ' completed</title></circle>';
    });

    return '<div class="chart-area"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#93c5fd"/></linearGradient></defs>' +
      grid + bars + '<path class="chart-line" d="' + line + '"/>' + dots + labels +
    '</svg></div>';
  }

  function renderDashboard() {
    var open = openWorkOrders();
    var inProgress = open.filter(function (w) { return w.status === 'In Progress'; }).length;
    var unassigned = open.filter(function (w) { return !w.techId; }).length;
    var overdue = overdueWOs();
    var completed = completedLast7();
    var onTime = onTimeRate();
    var low = lowStockItems();
    var outOfStock = state.inventory.filter(function (i) { return i.onHand === 0; }).length;
    var statuses = statusCounts();
    var totalWOs = state.workOrders.length;
    var series = volumeSeries();
    var routeStops = state.savedRoutes.find(function (r) { return r.techId === 'T-01' && r.date === todayISO(); });
    var stops = (routeStops ? routeStops.stops : defaultRouteStops('T-01', todayISO())).map(function (id) { return woById(id); }).filter(Boolean);
    var metrics = routeMetrics(stops);
    var highPrio = open.filter(function (w) { return w.priority === 'Critical' || w.priority === 'High'; })
      .sort(function (a, b) {
        return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) || (a.due < b.due ? -1 : 1);
      }).slice(0, 5);
    var techs = state.technicians.slice().sort(function (a, b) { return b.utilization - a.utilization; });
    var maxLoad = Math.max.apply(null, techs.map(function (t) { return openWOsForTech(t.id).length; })) || 1;

    var now = new Date();
    var hour = now.getHours();
    var greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    var statCards =
      statCard('clipboard', open.length, 'Open work orders', 'primary', primaryTint(),
        '<span class="stat-trend flat">Live</span>',
        inProgress + ' in progress · ' + unassigned + ' unassigned') +
      statCard('check-square', completed, 'Completed · last 7 days', 'green', 'var(--green-soft)',
        '<span class="stat-trend"><svg class="icon"><use href="#i-trending-up"></use></svg>On track</span>',
        'Closed work · all sites') +
      statCard('target', onTime + '%', 'On-time completion', 'teal', 'var(--teal-soft)',
        '<span class="stat-trend ' + (onTime >= 90 ? '' : 'down') + '">' + (onTime >= 90 ? 'On target' : 'Below target') + '</span>',
        'SLA target 90% · ' + (overdue.length ? overdue.length + ' overdue now' : 'no overdue work') ) +
      statCard('box', low.length, 'Low stock alerts', 'rose', 'var(--rose-soft)',
        outOfStock
          ? '<span class="stat-trend down"><svg class="icon"><use href="#i-alert"></use></svg>' + outOfStock + ' out</span>'
          : '<span class="stat-trend flat">0 out</span>',
        'Below reorder point · ' + (low.length ? 'action needed' : 'all stocked'));

    var donutTotal = totalWOs || 1;
    var segs = [
      { name: 'New', n: statuses['New'], color: 'var(--primary)', swatch: 'var(--primary)' },
      { name: 'Assigned', n: statuses['Assigned'], color: 'var(--violet)', swatch: 'var(--violet)' },
      { name: 'In Progress', n: statuses['In Progress'], color: 'var(--amber)', swatch: 'var(--amber)' },
      { name: 'On Hold', n: statuses['On Hold'], color: 'var(--slate)', swatch: 'var(--slate)' },
      { name: 'Completed', n: statuses['Completed'], color: 'var(--green)', swatch: 'var(--green)' }
    ];
    var cum = 0;
    var donutStyle = segs.map(function (s, i) { cum += (s.n / donutTotal) * 100; return '--s' + (i + 1) + ':' + cum.toFixed(1) + '%'; }).join(';');
    var donutLegend = segs.map(function (s) {
      return '<div class="donut-row"><span class="swatch" style="background:' + s.swatch + '"></span>' +
        '<span class="name">' + s.name + '</span><span class="val">' + s.n + '</span>' +
        '<span class="pct">' + Math.round((s.n / donutTotal) * 100) + '%</span></div>';
    }).join('');

    var highPrioHTML = highPrio.length ? highPrio.map(function (w) {
      var s = siteById(w.siteId) || {};
      return '<div class="hp-item" data-action="open-wo" data-id="' + w.id + '">' +
        '<span class="hp-prio ' + slug(w.priority) + '"></span>' +
        '<span class="hp-body"><span class="hp-title">' + esc(w.title) + '</span>' +
        '<span class="hp-sub">' + esc(w.id) + ' · ' + esc(s.name || '') + ' · ' + esc((techById(w.techId) || {}).name || 'Unassigned') + '</span></span>' +
        '<span class="hp-meta"><span class="due' + (isOverdue(w) ? ' over' : '') + '">' + relativeDue(w.due) + '</span>' +
        '<span class="site">' + esc(w.priority) + '</span></span>' +
      '</div>';
    }).join('') : emptyState('shield', 'No high-priority work', 'Critical and high-priority work orders will appear here.');

    var workloadHTML = techs.map(function (t) {
      var count = openWOsForTech(t.id).length;
      return '<div class="workload-row">' + avatarHTML(t) +
        '<div class="workload-info"><div class="workload-name">' + esc(t.name.split(' ')[0] + ' ' + t.name.split(' ')[1]) +
          '<span>' + count + ' open</span></div>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + t.utilization + '%;--bar-color:' + t.color + '"></div></div></div>' +
        '<div class="workload-pct">' + t.utilization + '%</div></div>';
    }).join('');

    var activityHTML = state.activity.slice(0, 6).map(function (a) {
      var ic = { work: 'wrench', status: 'refresh', inventory: 'box', leave: 'users', project: 'folder', checklist: 'check-square' }[a.type] || 'bell';
      var col = { work: 'var(--primary)', status: 'var(--amber)', inventory: 'var(--teal)', leave: 'var(--violet)', project: 'var(--violet)', checklist: 'var(--green)' }[a.type] || 'var(--primary)';
      var tint = { work: 'var(--primary-soft)', status: 'var(--amber-soft)', inventory: 'var(--teal-soft)', leave: 'var(--violet-soft)', project: 'var(--violet-soft)', checklist: 'var(--green-soft)' }[a.type] || 'var(--primary-soft)';
      return '<div class="activity-item"><span class="activity-icon" style="--color:' + col + ';--tint:' + tint + '">' + icon(ic) + '</span>' +
        '<div class="activity-body"><div class="activity-text">' + a.text + '</div>' +
        '<div class="activity-time">' + relativeTime(a.at) + '</div></div></div>';
    }).join('');

    return pageHead({
      eyebrow: 'Overview', icon: 'grid',
      title: 'Service overview',
      sub: 'A live picture of field operations, technician capacity and inventory health.',
      meta: '<span><i class="live-dot"></i> Updated just now</span><span>' + icon('calendar') + fmtDate(todayISO(), 'long') + '</span>',
      actions: '<button class="btn" data-action="go-dispatch">' + icon('route') + 'Plan today\'s route</button>' +
        '<button class="btn btn-primary" data-action="new-wo">' + icon('plus') + 'New work order</button>'
    }) +
    '<div class="hero-strip">' +
      '<div class="hero-icon">' + icon('wrench') + '</div>' +
      '<div class="hero-text"><h3>' + greet + ', Alex</h3>' +
        '<p>' + (open.length ? open.length + ' open work orders across ' + state.sites.length + ' sites. ' : 'No open work orders right now. ') +
        (overdue.length ? '<strong>' + overdue.length + ' overdue</strong> need attention' : 'Nothing is overdue') +
        (highPrio.length ? ' and ' + highPrio.length + ' high-priority jobs are active.' : '.') + '</p></div>' +
      '<div class="hero-actions">' +
        '<button class="btn" data-action="go-dispatch">' + icon('calendar') + fmtDate(todayISO()) + '</button>' +
        '<button class="btn" data-action="new-wo">' + icon('plus') + 'Create</button>' +
      '</div>' +
    '</div>' +
    '<div class="stats-grid">' + statCards + '</div>' +
    '<div class="grid grid-dash dash-row">' +
      '<div class="card span-2"><div class="card-head"><div><div class="card-title">Work order volume</div>' +
        '<div class="card-sub">Created vs completed · last 7 days</div></div>' +
        '<div class="card-actions"><div class="segmented"><button class="active">7D</button><button data-action="noop">30D</button></div></div></div>' +
        '<div class="card-body">' + volumeChartHTML(series) +
        '<div class="chart-legend"><span class="legend-item"><span class="legend-swatch"></span>Created</span>' +
        '<span class="legend-item"><span class="legend-swatch teal"></span>Completed</span></div></div></div>' +
      '<div class="card"><div class="card-head tight"><div><div class="card-title">Work order status</div>' +
        '<div class="card-sub">' + totalWOs + ' total work orders</div></div></div>' +
        '<div class="card-body"><div class="donut-wrap"><div class="donut" style="' + donutStyle + '">' +
        '<div class="donut-center"><div class="donut-value">' + totalWOs + '</div><div class="donut-label">Total</div></div></div>' +
        '<div class="donut-legend">' + donutLegend + '</div></div></div></div>' +
    '</div>' +
    '<div class="grid grid-dash dash-row">' +
      '<div class="card span-2"><div class="card-head tight"><div><div class="card-title">High-priority work</div>' +
        '<div class="card-sub">Critical and high priority open jobs</div></div><div class="card-actions"><a class="link-btn" href="#/workorders">View all</a></div></div>' +
        '<div class="card-body"><div class="high-prio-list">' + highPrioHTML + '</div></div></div>' +
      '<div class="card"><div class="card-head tight"><div><div class="card-title">Technician workload</div>' +
        '<div class="card-sub">Utilization today</div></div></div><div class="card-body"><div class="workload">' + workloadHTML + '</div></div></div>' +
    '</div>' +
    '<div class="grid grid-dash dash-row">' +
      '<div class="card span-2"><div class="card-head tight"><div><div class="card-title">Today\'s route</div>' +
        '<div class="card-sub">North Metro · Alex Morgan</div></div>' +
        '<div class="card-actions"><button class="btn btn-sm" data-action="go-dispatch">' + icon('route') + 'Open dispatch</button></div></div>' +
        '<div class="card-body flush"><div class="dash-map"><div class="map-canvas">' + renderMap(stops) +
          '<div class="map-badge">' + stops.length + ' stops · ' + metrics.km.toFixed(1) + ' km</div>' +
          '<div class="map-legend"><span><i style="background:#2563eb"></i>Planned stop</span><span><i style="background:#16a34a"></i>Final stop</span><span><i style="background:#e11d48"></i>Live traffic</span></div>' +
        '</div></div>' +
        '<div class="map-mini-legend"><span class="stops">' + icon('map-pin') + stops.length + ' stops</span>' +
        '<span>' + fmtDuration(metrics.mins) + ' drive + service</span></div></div></div>' +
      '<div class="card"><div class="card-head tight"><div><div class="card-title">Recent activity</div>' +
        '<div class="card-sub">Across your team</div></div></div><div class="card-body"><div class="activity-list">' + activityHTML + '</div></div></div>' +
    '</div>';
  }

  function primaryTint() { return 'var(--primary-soft)'; }
  function statCard(iconName, value, label, color, tint, trendHTML, foot) {
    return '<div class="stat-card" style="--stat-color:var(--' + color + ');--stat-tint:' + tint + '">' +
      '<div class="stat-top"><span class="stat-icon" style="--stat-color:var(--' + color + ');--stat-tint:' + tint + '">' + icon(iconName) + '</span>' + trendHTML + '</div>' +
      '<div class="stat-value">' + value + '</div>' +
      '<div class="stat-label">' + label + '</div>' +
      '<div class="stat-foot">' + icon('trending-up') + foot + '</div>' +
    '</div>';
  }

  /* =========================================================== work orders */
  function filteredWOs() {
    var q = ui.wo.query.trim().toLowerCase();
    var list = state.workOrders.filter(function (w) {
      if (ui.wo.status !== 'all' && w.status !== ui.wo.status) return false;
      if (ui.wo.priority !== 'all' && w.priority !== ui.wo.priority) return false;
      if (ui.wo.tech === 'unassigned' && w.techId) return false;
      if (ui.wo.tech !== 'all' && ui.wo.tech !== 'unassigned' && w.techId !== ui.wo.tech) return false;
      if (q) {
        var s = siteById(w.siteId) || {};
        var t = techById(w.techId) || {};
        var hay = (w.id + ' ' + w.title + ' ' + w.company + ' ' + (s.name || '') + ' ' + (t.name || '') + ' ' + w.type + ' ' + w.status + ' ' + w.priority).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    list.sort(function (a, b) {
      var s = (STATUS_ORDER[a.status] || 0) - (STATUS_ORDER[b.status] || 0);
      if (s) return s;
      var p = (PRIORITY_ORDER[a.priority] || 9) - (PRIORITY_ORDER[b.priority] || 9);
      if (p) return p;
      return String(a.due).localeCompare(String(b.due));
    });
    return list;
  }

  function woTableRows(list) {
    if (!list.length) {
      return '<tr><td colspan="8"><div class="table-empty">' + icon('search') +
        '<strong>No work orders match these filters</strong>Try a different search term or clear the filters.</div></td></tr>';
    }
    return list.map(function (w) {
      var s = siteById(w.siteId) || {};
      var t = techById(w.techId);
      return '<tr class="clickable" data-action="open-wo" data-id="' + w.id + '">' +
        '<td><div class="cell-id">' + w.id + '</div><div class="cell-main">' + esc(w.title) + '</div>' +
          '<div class="cell-sub">' + esc(w.company) + '</div></td>' +
        '<td>' + statusChip(w.status) + '</td>' +
        '<td>' + priorityTag(w.priority) + '</td>' +
        '<td>' + personCell(t) + '</td>' +
        '<td><div class="cell-main" style="font-weight:500">' + esc(s.name || '—') + '</div><div class="cell-sub">' + esc(s.city || '') + '</div></td>' +
        '<td>' + dueCell(w) + '</td>' +
        '<td>' + typeChip(w.type) + '</td>' +
        '<td class="actions-cell"><button class="btn btn-ghost btn-icon" data-action="open-wo" data-id="' + w.id + '" aria-label="Open work order">' + icon('chevron-right') + '</button></td>' +
      '</tr>';
    }).join('');
  }

  function boardHTML(list) {
    var cols = ['New', 'Assigned', 'In Progress', 'On Hold', 'Completed'];
    var dots = { 'New': 'var(--primary)', 'Assigned': 'var(--violet)', 'In Progress': 'var(--amber)', 'On Hold': 'var(--slate)', 'Completed': 'var(--green)' };
    return '<div class="kanban">' + cols.map(function (status) {
      var items = list.filter(function (w) { return w.status === status; });
      return '<div class="kanban-col" data-drop-status="' + status + '">' +
        '<div class="kanban-head"><span class="dot" style="background:' + dots[status] + '"></span><h3>' + status + '</h3>' +
        '<span class="count">' + items.length + '</span></div>' +
        '<div class="kanban-cards">' + (items.length ? items.map(function (w) {
          var s = siteById(w.siteId) || {};
          return '<div class="kanban-card" draggable="true" data-drag="wo" data-id="' + w.id + '">' +
            '<div class="wo-id">' + w.id + ' · ' + esc(w.priority) + '</div>' +
            '<div class="wo-title">' + esc(w.title) + '</div>' +
            '<div class="wo-site">' + icon('map-pin') + esc(s.name || '') + '</div>' +
            '<div class="wo-foot">' + (techById(w.techId) ? avatarHTML(techById(w.techId)) : '<span class="chip chip--ghost">Unassigned</span>') +
            '<span class="wo-date">' + icon('calendar') + fmtDate(w.due) + '</span></div>' +
          '</div>';
        }).join('') : '<div class="kanban-empty">Drop work orders here</div>') + '</div></div>';
    }).join('') + '</div>';
  }

  function scheduleHTML(list) {
    var date = addDays(todayISO(), ui.wo.dayOffset);
    var dayOffsets = [-1, 0, 1, 2, 3, 4, 5];
    var pills = dayOffsets.map(function (off) {
      var d = addDays(todayISO(), off);
      return '<button class="sch-day' + (ui.wo.dayOffset === off ? ' active' : '') + '" data-action="wo-day" data-offset="' + off + '">' +
        '<span>' + fmtDate(d, 'weekday') + '</span><small>' + fmtDate(d, 'day') + '</small></button>';
    }).join('');
    var now = new Date();
    var nowPct = clamp(((now.getHours() + now.getMinutes() / 60 - 8) / 10) * 100, 0, 100);
    var isCurrentDay = date === todayISO();

    var rows = state.technicians.map(function (t) {
      var jobs = state.workOrders.filter(function (w) {
        return w.techId === t.id && scheduledDateKey(w) === date && w.status !== 'Cancelled';
      }).sort(function (a, b) { return new Date(a.scheduled) - new Date(b.scheduled); });
      var blocks = jobs.map(function (w) {
        var pos = timePosition(w.scheduled);
        var width = clamp(((w.estimate || 1.5) / 10) * 100, 9, 26);
        var col = workOrderColor(w);
        return '<button class="sch-block" data-action="open-wo" data-id="' + w.id + '" style="left:' + pos.left + '%;width:' + width + '%;--block-color:' + col.color + ';--block-bg:' + col.bg + '">' +
          '<span class="t">' + esc(w.title) + '</span>' +
          '<span class="id">' + w.id + ' · ' + fmtTime(w.scheduled) + '</span>' +
          '<span class="site">' + esc((siteById(w.siteId) || {}).name || '') + '</span>' +
        '</button>';
      }).join('');
      return '<div class="sch-row">' +
        '<div class="sch-tech">' + avatarHTML(t) + '<div><div class="name">' + esc(t.name) + '</div><div class="role">' + esc(t.group) + '</div></div></div>' +
        '<div class="sch-lane">' + blocks + (isCurrentDay ? '<span class="sch-now" style="left:' + nowPct + '%"></span>' : '') + '</div>' +
      '</div>';
    }).join('');

    return '<div class="schedule"><div class="sch-top">' +
      '<button class="btn btn-sm" data-action="wo-day" data-offset="' + (ui.wo.dayOffset - 1) + '">' + icon('chevron-left') + '</button>' +
      '<div class="bold" style="font-size:13px">' + fmtDate(date, 'long') + '</div>' +
      '<button class="btn btn-sm" data-action="wo-day" data-offset="' + (ui.wo.dayOffset + 1) + '">' + icon('chevron-right') + '</button>' +
      '<div class="sch-days">' + pills + '</div>' +
    '</div><div class="schedule-scroll"><div class="schedule-grid">' +
      '<div class="sch-head-row"><div class="sch-head-tech">Technician</div><div class="sch-hours">' +
        ['8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM'].map(function (h) { return '<span>' + h + '</span>'; }).join('') +
      '</div></div>' + rows +
    '</div></div></div>';
  }

  function renderWorkOrders() {
    var list = filteredWOs();
    var open = openWorkOrders();
    var inProgress = open.filter(function (w) { return w.status === 'In Progress'; }).length;
    var overdue = overdueWOs().length;
    var unassigned = open.filter(function (w) { return !w.techId; }).length;
    var filteredCount = list.length;

    return pageHead({
      eyebrow: 'Operations', icon: 'clipboard',
      title: 'Work orders',
      sub: 'Create, assign, schedule and track corrective and preventive field work.',
      meta: '<span>' + icon('clipboard') + open.length + ' open</span><span>' + icon('clock') + inProgress + ' in progress</span><span>' + icon('alert') + overdue + ' overdue</span>',
      actions: '<button class="btn" data-action="export-data">' + icon('download') + 'Export</button>' +
        '<button class="btn btn-primary" data-action="new-wo">' + icon('plus') + 'New work order</button>'
    }) +
    '<div class="inv-kpis">' +
      miniKpi('clipboard', open.length, 'Open work orders', 'var(--primary)', 'var(--primary-soft)') +
      miniKpi('wrench', inProgress, 'In progress', 'var(--amber)', 'var(--amber-soft)') +
      miniKpi('alert', overdue, 'Overdue', 'var(--rose)', 'var(--rose-soft)') +
      miniKpi('user', unassigned, 'Unassigned', 'var(--violet)', 'var(--violet-soft)') +
    '</div>' +
    '<div class="toolbar">' +
      '<div class="view-toggle" role="group" aria-label="View">' +
        '<button class="' + (ui.wo.view === 'list' ? 'active' : '') + '" data-action="wo-view" data-view="list" aria-label="List view">' + icon('clipboard') + '</button>' +
        '<button class="' + (ui.wo.view === 'board' ? 'active' : '') + '" data-action="wo-view" data-view="board" aria-label="Board view">' + icon('grid') + '</button>' +
        '<button class="' + (ui.wo.view === 'schedule' ? 'active' : '') + '" data-action="wo-view" data-view="schedule" aria-label="Schedule view">' + icon('calendar') + '</button>' +
      '</div>' +
      '<div class="search-field">' + icon('search') +
        '<input class="input input-sm" type="search" placeholder="Search work orders…" value="' + esc(ui.wo.query) + '" data-search="wo" aria-label="Search work orders">' +
      '</div>' +
      '<div class="filters">' +
        '<select class="select select-sm" data-filter="wo-status" aria-label="Filter by status">' +
          '<option value="all"' + selectedAttr('all', ui.wo.status) + '>All statuses</option>' +
          options(['New', 'Assigned', 'In Progress', 'On Hold', 'Completed', 'Cancelled'], ui.wo.status) +
        '</select>' +
        '<select class="select select-sm" data-filter="wo-priority" aria-label="Filter by priority">' +
          '<option value="all"' + selectedAttr('all', ui.wo.priority) + '>All priorities</option>' +
          options(['Critical', 'High', 'Medium', 'Low'], ui.wo.priority) +
        '</select>' +
        '<select class="select select-sm" data-filter="wo-tech" aria-label="Filter by technician">' +
          '<option value="all"' + selectedAttr('all', ui.wo.tech) + '>All technicians</option>' +
          '<option value="unassigned"' + selectedAttr('unassigned', ui.wo.tech) + '>Unassigned</option>' +
          options(state.technicians, ui.wo.tech, 'id', 'name') +
        '</select>' +
        (hasWOFilters() ? '<button class="btn btn-ghost btn-sm" data-action="clear-wo-filters">' + icon('x') + 'Clear</button>' : '') +
      '</div>' +
      '<div class="spacer"></div>' +
      '<span class="result-count"><strong>' + filteredCount + '</strong> of ' + state.workOrders.length + ' work orders</span>' +
    '</div>' +
    (ui.wo.view === 'list'
      ? '<div class="card"><div class="table-wrap"><table class="table"><thead><tr>' +
          '<th>Work order</th><th>Status</th><th>Priority</th><th>Technician</th><th>Site</th><th>Due</th><th>Type</th><th></th>' +
        '</tr></thead><tbody>' + woTableRows(list) + '</tbody></table></div></div>'
      : ui.wo.view === 'board'
        ? boardHTML(list)
        : scheduleHTML(list));
  }

  function hasWOFilters() {
    return ui.wo.query || ui.wo.status !== 'all' || ui.wo.priority !== 'all' || ui.wo.tech !== 'all';
  }

  /* ============================================================== dispatch */
  function renderDispatch() {
    var stops = dispatchStops();
    var metrics = routeMetrics(stops);
    var candidateWOs = openWorkOrders().filter(function (w) { return ui.dispatch.stops.indexOf(w.id) === -1; });
    var tech = techById(ui.dispatch.techId);
    var unassigned = openWorkOrders().filter(function (w) { return !w.techId; }).length;

    var stopsHTML = stops.length ? stops.map(function (w, i) {
      var prev = i > 0 ? siteById(stops[i - 1].siteId) : null;
      var s = siteById(w.siteId) || {};
      var leg = prev ? haversineKm(prev, s) : 0;
      return '<div class="route-stop" draggable="true" data-drag="route" data-id="' + w.id + '" data-drop-route="' + w.id + '">' +
        '<span class="route-order">' + (i + 1) + '</span>' +
        '<span class="route-stop-info"><span class="t">' + esc(w.title) + '</span>' +
          '<span class="s">' + esc(s.name || '') + ' · ' + w.id + ' · ' + (w.scheduled ? fmtTime(w.scheduled) : 'Unscheduled') + '</span>' +
          (i === 0 ? '<span class="leg">Start of route</span>' :
            leg >= 0.05 ? '<span class="leg">' + leg.toFixed(1) + ' km from previous stop</span>' :
            '<span class="leg">Same site as previous stop</span>') +
        '</span>' +
        '<span class="route-stop-actions">' +
          '<button data-action="route-move" data-id="' + w.id + '" data-dir="-1" aria-label="Move up">' + icon('arrow-up') + '</button>' +
          '<button data-action="route-move" data-id="' + w.id + '" data-dir="1" aria-label="Move down">' + icon('arrow-down') + '</button>' +
          '<button data-action="route-remove" data-id="' + w.id + '" aria-label="Remove stop">' + icon('x') + '</button>' +
        '</span>' +
      '</div>';
    }).join('') : '<div class="route-empty">' + icon('route') + '<div class="mt-8">No stops yet. Add a work order below to start planning.</div></div>';

    var routeSelect = candidateWOs.length
      ? '<select class="select" id="addStopSelect">' + candidateWOs.map(function (w) {
          return '<option value="' + w.id + '">' + w.id + ' · ' + esc(w.title.slice(0, 34)) + '</option>';
        }).join('') + '</select><button class="btn btn-primary btn-sm" data-action="route-add">' + icon('plus') + 'Add</button>'
      : '<div class="status-note" style="padding:4px 0">All open work orders are already on the route.</div>';

    var savedHTML = state.savedRoutes.map(function (r) {
      var t = techById(r.techId) || {};
      var s = r.stops.map(function (id) { return woById(id); }).filter(Boolean);
      var m = routeMetrics(s);
      return '<tr>' +
        '<td><div class="cell-main">' + esc(r.name) + '</div><div class="cell-sub">' + esc(r.id) + '</div></td>' +
        '<td>' + personCell(t) + '</td>' +
        '<td>' + fmtDate(r.date) + '</td>' +
        '<td class="num">' + s.length + '</td>' +
        '<td class="num">' + m.km.toFixed(1) + ' km</td>' +
        '<td class="num">' + fmtDuration(m.mins) + '</td>' +
        '<td>' + statusChip(r.status) + '</td>' +
        '<td class="actions-cell"><button class="btn btn-sm" data-action="load-route" data-id="' + r.id + '">' + icon('play') + 'Load</button> ' +
          '<button class="btn btn-ghost btn-icon" data-action="delete-route" data-id="' + r.id + '" aria-label="Delete route">' + icon('trash') + '</button></td>' +
      '</tr>';
    }).join('');

    return pageHead({
      eyebrow: 'Operations', icon: 'route',
      title: 'Dispatch & route planning',
      sub: 'Sequence stops, balance technician load and optimize drive time for the day.',
      meta: '<span>' + icon('calendar') + fmtDate(ui.dispatch.date, 'long') + '</span><span>' + icon('user') + (tech ? tech.name : 'Unassigned') + '</span>',
      actions: '<button class="btn" data-action="optimize-route">' + icon('zap') + 'Optimize</button>' +
        '<button class="btn btn-primary" data-action="save-route">' + icon('check') + 'Save route</button>'
    }) +
    '<div class="dispatch-top">' +
      miniKpi('map-pin', stops.length, 'Stops on route', 'var(--primary)', 'var(--primary-soft)') +
      miniKpi('truck', metrics.km.toFixed(1) + ' km', 'Total distance', 'var(--teal)', 'var(--teal-soft)') +
      miniKpi('clock', fmtDuration(metrics.mins), 'Drive + service', 'var(--violet)', 'var(--violet-soft)') +
      miniKpi('user', unassigned, 'Unassigned work', 'var(--amber)', 'var(--amber-soft)') +
    '</div>' +
    '<div class="dispatch-grid">' +
      '<div class="route-panel">' +
        '<div class="route-head">' +
          '<div class="route-head-top"><div><h3>Route plan</h3><div class="route-meta">' + esc(ui.dispatch.savedRouteId ? (routeById(ui.dispatch.savedRouteId) || {}).name || 'Saved route' : 'Working route') + ' · ' + (ui.dispatch.dirty ? 'Unsaved changes' : 'Up to date') + '</div></div>' +
          '<span class="chip chip--' + (ui.dispatch.dirty ? 'pending' : 'active') + '">' + (ui.dispatch.dirty ? 'Draft' : 'Ready') + '</span></div>' +
          '<div class="route-controls">' +
            '<div class="field"><label>Technician</label><select class="select select-sm" data-change="dispatch-tech">' +
              options(state.technicians, ui.dispatch.techId, 'id', 'name') + '</select></div>' +
            '<div class="field"><label>Date</label><input class="input input-sm" type="date" value="' + ui.dispatch.date + '" data-change="dispatch-date"></div>' +
          '</div>' +
        '</div>' +
        '<div class="route-summary">' +
          '<div class="route-metric"><div class="v">' + stops.length + '</div><div class="l">Stops</div></div>' +
          '<div class="route-metric"><div class="v">' + metrics.km.toFixed(1) + '</div><div class="l">Km</div></div>' +
          '<div class="route-metric"><div class="v">' + fmtDuration(metrics.mins) + '</div><div class="l">Est. time</div></div>' +
        '</div>' +
        '<div class="route-list">' + stopsHTML + '</div>' +
        '<div class="route-add">' + routeSelect + '</div>' +
      '</div>' +
      '<div class="map-panel">' +
        '<div class="map-head"><h3>' + (tech ? esc(tech.name) + '\'s route' : 'Route map') + '</h3>' +
          '<span class="chip chip--' + (stops.length ? 'active' : 'draft') + '">' + (stops.length ? stops.length + ' stops' : 'No stops') + '</span></div>' +
        '<div class="map-canvas">' + renderMap(stops) +
          '<div class="map-badge">' + metrics.km.toFixed(1) + ' km · ' + fmtDuration(metrics.mins) + '</div>' +
          '<div class="map-legend"><span><i style="background:#2563eb"></i>Planned stop</span><span><i style="background:#16a34a"></i>Final stop</span><span><i style="background:#94a3b8"></i>Drag to reorder</span></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="card saved-routes"><div class="card-head tight"><div><div class="card-title">Saved routes</div>' +
      '<div class="card-sub">Reusable route plans across teams and days</div></div>' +
      '<div class="card-actions"><button class="btn btn-sm" data-action="new-route">' + icon('plus') + 'New route</button></div></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Route</th><th>Technician</th><th>Date</th><th class="num">Stops</th><th class="num">Distance</th><th class="num">Duration</th><th>Status</th><th></th></tr></thead><tbody>' +
      (savedHTML || '<tr><td colspan="8"><div class="table-empty"><strong>No saved routes yet</strong>Build a route and save it to reuse later.</div></td></tr>') +
      '</tbody></table></div></div>';
  }
  /* ============================================================= inventory */
  function stockState(item) {
    if (item.onHand <= 0) return { label: 'Out of stock', cls: 'cancelled', fill: 'out' };
    if (item.onHand <= item.reorderLevel) return { label: 'Low stock', cls: 'pending', fill: 'low' };
    return { label: 'In stock', cls: 'completed', fill: '' };
  }
  function stockCell(item) {
    var st = stockState(item);
    var ratio = clamp((item.onHand / Math.max(1, item.reorderLevel * 2)) * 100, 0, 100);
    return '<div class="stock-cell"><span class="stock-num ' + st.fill + '">' + item.onHand + '</span>' +
      '<span class="stock-track"><span class="stock-fill ' + st.fill + '" style="width:' + ratio + '%"></span></span></div>';
  }
  function movementIcon(type) {
    return { Receipt: 'download', Issue: 'send', Transfer: 'truck', Adjustment: 'sliders' }[type] || 'box';
  }
  function movementRoute(m) {
    var from = m.fromWarehouseId ? (warehouseById(m.fromWarehouseId) || {}).name : (m.type === 'Receipt' ? 'Supplier' : '—');
    var to = m.toWarehouseId ? (warehouseById(m.toWarehouseId) || {}).name : (m.type === 'Issue' ? 'Job site' : '—');
    return '<span class="movement-type">' + icon(movementIcon(m.type)) + esc(m.type) + '</span>' +
      '<div class="cell-sub">' + esc(from) + ' → ' + esc(to) + '</div>';
  }

  function renderInventory() {
    var low = lowStockItems();
    var out = state.inventory.filter(function (i) { return i.onHand === 0; });
    var value = sum(state.inventory, function (i) { return i.onHand * i.unitCost; });
    var openMoves = state.movements.filter(function (m) { return m.status !== 'Completed'; });
    var categories = Array.from(new Set(state.inventory.map(function (i) { return i.category; }))).sort();

    var tabs = '<div class="tabs">' +
      tabButton('items', 'Inventory items', state.inventory.length) +
      tabButton('movements', 'Movement orders', state.movements.length) +
      tabButton('replenishment', 'Replenishment', low.length) +
    '</div>';

    var content = '';
    if (ui.inventory.tab === 'items') {
      var q = ui.inventory.query.trim().toLowerCase();
      var list = state.inventory.filter(function (i) {
        if (ui.inventory.category !== 'all' && i.category !== ui.inventory.category) return false;
        if (ui.inventory.warehouse !== 'all' && i.warehouseId !== ui.inventory.warehouse) return false;
        if (q && (i.name + ' ' + i.sku + ' ' + i.category).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      var rows = list.map(function (i) {
        var st = stockState(i);
        var wh = warehouseById(i.warehouseId) || {};
        return '<tr class="clickable" data-action="item-adjust" data-id="' + i.id + '">' +
          '<td><div class="cell-main">' + esc(i.name) + '</div><div class="cell-sub">' + esc(i.sku) + '</div></td>' +
          '<td>' + '<span class="chip chip--soft">' + esc(i.category) + '</span></td>' +
          '<td><div class="cell-main" style="font-weight:500">' + esc(wh.name || '—') + '</div><div class="cell-sub">Bin ' + esc(i.bin) + '</div></td>' +
          '<td>' + stockCell(i) + '</td>' +
          '<td class="num">' + i.reorderLevel + '</td>' +
          '<td class="num">' + fmtMoney(i.unitCost, true) + '</td>' +
          '<td class="num">' + fmtMoney(i.onHand * i.unitCost) + '</td>' +
          '<td><span class="chip chip--' + st.cls + '">' + st.label + '</span></td>' +
          '<td class="actions-cell"><button class="btn btn-sm" data-action="item-adjust" data-id="' + i.id + '">' + icon('sliders') + 'Adjust</button></td>' +
        '</tr>';
      }).join('');
      content = '<div class="toolbar"><div class="search-field">' + icon('search') +
        '<input class="input input-sm" type="search" placeholder="Search items or SKU…" value="' + esc(ui.inventory.query) + '" data-search="inv" aria-label="Search inventory"></div>' +
        '<div class="filters"><select class="select select-sm" data-filter="inv-category"><option value="all"' + selectedAttr('all', ui.inventory.category) + '>All categories</option>' + options(categories, ui.inventory.category) + '</select>' +
        '<select class="select select-sm" data-filter="inv-warehouse"><option value="all"' + selectedAttr('all', ui.inventory.warehouse) + '>All warehouses</option>' + options(state.warehouses, ui.inventory.warehouse, 'id', 'name') + '</select></div>' +
        '<div class="spacer"></div><span class="result-count"><strong>' + list.length + '</strong> of ' + state.inventory.length + ' items</span></div>' +
        '<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Category</th><th>Location</th><th>On hand</th><th class="num">Reorder at</th><th class="num">Unit cost</th><th class="num">Value</th><th>Status</th><th></th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="9"><div class="table-empty"><strong>No items match</strong>Try another search or filter.</div></td></tr>') +
        '</tbody></table></div></div>';
    } else if (ui.inventory.tab === 'movements') {
      content = '<div class="card"><div class="card-head tight"><div><div class="card-title">Movement orders</div>' +
        '<div class="card-sub">Receipts, transfers and issues across warehouses</div></div>' +
        '<div class="card-actions"><button class="btn btn-sm btn-primary" data-action="new-movement">' + icon('plus') + 'New movement</button></div></div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Type & route</th><th>Item</th><th class="num">Qty</th><th>Date</th><th>Requested by</th><th>Status</th><th></th></tr></thead><tbody>' +
        (state.movements.length ? state.movements.map(function (m) {
          var it = itemById(m.itemId) || {};
          var done = m.status === 'Completed';
          return '<tr>' +
            '<td><div class="cell-id">' + m.id + '</div><div class="cell-sub">' + esc(m.note || '') + '</div></td>' +
            '<td>' + movementRoute(m) + '</td>' +
            '<td><div class="cell-main" style="font-weight:500">' + esc(it.name || '—') + '</div><div class="cell-sub">' + esc(it.sku || '') + '</div></td>' +
            '<td class="num bold">' + m.qty + '</td>' +
            '<td>' + fmtDate(m.date) + '</td>' +
            '<td>' + esc(m.requestedBy) + '</td>' +
            '<td>' + statusChip(m.status) + '</td>' +
            '<td class="actions-cell">' + (done ? '<span class="muted text-xs">Applied</span>' : '<button class="btn btn-sm" data-action="complete-movement" data-id="' + m.id + '">' + icon('check') + 'Complete</button>') + '</td>' +
          '</tr>';
        }).join('') : '<tr><td colspan="8"><div class="table-empty"><strong>No movement orders</strong>Receipts and transfers will appear here.</div></td></tr>') +
        '</tbody></table></div></div>';
    } else {
      var cards = low.length ? low.map(function (i) {
        var need = Math.max(i.reorderLevel * 2 - i.onHand, 1);
        var wh = warehouseById(i.warehouseId) || {};
        return '<div class="replenish-card">' +
          '<div class="top"><div><h4>' + esc(i.name) + '</h4><div class="sku">' + esc(i.sku) + ' · ' + esc(wh.name || '') + '</div></div>' +
            '<span class="chip chip--pending">' + (i.onHand === 0 ? 'Out' : 'Low') + '</span></div>' +
          '<div class="need">' + need + ' <small>units suggested</small></div>' +
          '<div class="meta"><span>On hand: ' + i.onHand + '</span><span>Reorder at: ' + i.reorderLevel + '</span></div>' +
          '<button class="btn btn-sm btn-primary w-full mt-12" data-action="create-replenishment" data-id="' + i.id + '">' + icon('plus') + 'Create replenishment</button>' +
        '</div>';
      }).join('') : emptyState('check-square', 'Everything is stocked', 'No inventory items are below their reorder point.');
      content = '<div class="callout" style="margin-bottom:14px">' + icon('alert') +
        '<div><strong>' + low.length + ' item' + (low.length === 1 ? '' : 's') + '</strong> below reorder point. Replenishment suggestions order to twice the reorder level and create a draft receipt.</div></div>' +
        '<div class="replenish-grid">' + cards + '</div>';
    }

    return pageHead({
      eyebrow: 'Operations', icon: 'box',
      title: 'Inventory',
      sub: 'Track stock levels, movement orders and replenishment across every warehouse.',
      meta: '<span>' + icon('box') + state.inventory.length + ' SKUs</span><span>' + icon('layers') + state.warehouses.length + ' warehouses</span><span>' + icon('alert') + low.length + ' low stock</span>',
      actions: '<button class="btn" data-action="new-movement">' + icon('truck') + 'Movement order</button>' +
        '<button class="btn btn-primary" data-action="new-item">' + icon('plus') + 'New item</button>'
    }) +
    '<div class="inv-kpis">' +
      miniKpi('box', fmtMoney(value), 'Total stock value', 'var(--primary)', 'var(--primary-soft)') +
      miniKpi('alert', low.length, 'Low stock items', 'var(--amber)', 'var(--amber-soft)') +
      miniKpi('x', out.length, 'Out of stock', 'var(--rose)', 'var(--rose-soft)') +
      miniKpi('truck', openMoves.length, 'Open movements', 'var(--violet)', 'var(--violet-soft)') +
    '</div>' + tabs + content;
  }

  function tabButton(key, label, count) {
    var active = ui.page === 'inventory' ? ui.inventory.tab === key :
      ui.page === 'timesheets' ? ui.timesheets.tab === key :
      ui.page === 'checklists' ? ui.checklists.tab === key :
      ui.page === 'sites' ? ui.sites.tab === key :
      ui.page === 'admin' ? ui.admin.tab === key : false;
    var action = ui.page === 'inventory' ? 'inv-tab' : ui.page === 'timesheets' ? 'ts-tab' :
      ui.page === 'checklists' ? 'chk-tab' : ui.page === 'sites' ? 'site-tab' : 'admin-tab';
    return '<button class="tab' + (active ? ' active' : '') + '" data-action="' + action + '" data-tab="' + key + '">' +
      label + (count != null ? '<span class="count">' + count + '</span>' : '') + '</button>';
  }

  /* ============================================================= timesheets */
  function renderTimesheets() {
    var weekStart = startOfWeekISO(ui.timesheets.weekOffset);
    var ts = tsFor(ui.timesheets.techId, weekStart);
    var entries = ts ? ts.entries : [];
    var total = tsHours(ts), billable = tsBillable(ts);
    var tech = techById(ui.timesheets.techId);
    var submitted = state.timesheets.filter(function (t) { return t.status === 'Submitted'; });
    var days = weekDays(weekStart);

    var tabs = '<div class="tabs">' +
      '<button class="tab' + (ui.timesheets.tab === 'mine' ? ' active' : '') + '" data-action="ts-tab" data-tab="mine">My timesheet</button>' +
      '<button class="tab' + (ui.timesheets.tab === 'approvals' ? ' active' : '') + '" data-action="ts-tab" data-tab="approvals">Approvals<span class="count">' + submitted.length + '</span></button>' +
    '</div>';

    var content;
    if (ui.timesheets.tab === 'approvals') {
      var rows = state.timesheets.filter(function (t) { return t.status !== 'Draft'; }).sort(function (a, b) {
        return String(b.weekStart).localeCompare(String(a.weekStart));
      }).map(function (t) {
        var tch = techById(t.techId) || {};
        var hours = tsHours(t);
        return '<tr class="approval-row">' +
          '<td>' + personCell(tch, tch.group) + '</td>' +
          '<td>' + weekLabel(t.weekStart) + '</td>' +
          '<td class="num bold">' + fmtHours(hours) + '</td>' +
          '<td class="num">' + fmtHours(tsBillable(t)) + '</td>' +
          '<td>' + (t.submittedAt ? fmtDateTime(t.submittedAt) : '—') + '</td>' +
          '<td>' + statusChip(t.status) + '</td>' +
          '<td class="actions-cell">' +
            '<button class="btn btn-sm" data-action="ts-detail" data-id="' + t.id + '">' + icon('eye') + 'View</button> ' +
            (t.status === 'Submitted' ? '<button class="btn btn-sm btn-primary" data-action="approve-ts" data-id="' + t.id + '">' + icon('check') + 'Approve</button> ' +
              '<button class="btn btn-sm" data-action="reject-ts" data-id="' + t.id + '">' + icon('x') + 'Reject</button>' : '') +
          '</td>' +
        '</tr>';
      }).join('');
      content = '<div class="card"><div class="card-head tight"><div><div class="card-title">Timesheet approvals</div>' +
        '<div class="card-sub">Submitted weeks waiting for manager review</div></div>' +
        '<div class="card-actions"><span class="chip chip--pending">' + submitted.length + ' pending</span></div></div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Technician</th><th>Week</th><th class="num">Total</th><th class="num">Billable</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="7"><div class="table-empty"><strong>No timesheets to review</strong>Submitted timesheets will appear here.</div></td></tr>') +
        '</tbody></table></div></div>';
    } else {
      var dayCards = days.map(function (d) {
        var hrs = sum(entries.filter(function (e) { return e.date === d; }), function (e) { return Number(e.hours) || 0; });
        var maxH = Math.max.apply(null, days.map(function (day) {
          return sum(entries.filter(function (e) { return e.date === day; }), function (e) { return Number(e.hours) || 0; });
        })) || 1;
        return '<div class="ts-day-card' + (d === todayISO() ? ' today' : '') + '">' +
          '<div class="d">' + fmtDate(d, 'weekday') + '</div>' +
          '<div class="n">' + fmtDate(d, 'day') + '</div>' +
          '<div class="h' + (hrs ? '' : ' zero') + '">' + (hrs ? fmtHours(hrs) : '—') + '</div>' +
          '<div class="mini"><span style="width:' + (hrs / maxH) * 100 + '%"></span></div>' +
          '<div class="date">' + fmtDate(d) + '</div>' +
        '</div>';
      }).join('');

      var entryRows = entries.map(function (e) {
        var wo = e.woId ? woById(e.woId) : null;
        var pr = e.projectId ? projectById(e.projectId) : null;
        var desc = wo ? '<div class="cell-main" style="font-weight:500">' + esc(wo.title) + '</div><div class="cell-sub">' + esc(e.woId) + '</div>' :
          pr ? '<div class="cell-main" style="font-weight:500">' + esc(pr.name) + '</div><div class="cell-sub">Project</div>' :
          '<span class="muted">—</span>';
        var locked = ts && ts.status !== 'Draft';
        return '<tr>' +
          '<td><div class="cell-main" style="font-weight:500">' + fmtDate(e.date, 'full') + '</div><div class="cell-sub">' + fmtDate(e.date) + '</div></td>' +
          '<td>' + desc + '</td>' +
          '<td><span class="chip chip--soft">' + esc(e.type) + '</span></td>' +
          '<td class="num bold">' + fmtHours(e.hours) + '</td>' +
          '<td>' + (e.billable ? '<span class="chip chip--completed">Billable</span>' : '<span class="chip chip--ghost">Non-billable</span>') + '</td>' +
          '<td class="cell-muted">' + esc(e.note || '') + '</td>' +
          '<td class="actions-cell">' + (locked ? '' :
            '<button class="btn btn-ghost btn-icon" data-action="edit-entry" data-id="' + e.id + '" aria-label="Edit entry">' + icon('edit') + '</button>' +
            '<button class="btn btn-ghost btn-icon" data-action="delete-entry" data-id="' + e.id + '" aria-label="Delete entry">' + icon('trash') + '</button>') + '</td>' +
        '</tr>';
      }).join('');

      var statusCallout = '';
      if (ts && ts.status === 'Submitted') statusCallout = '<div class="callout" style="margin-bottom:14px">' + icon('clock') +
        '<div>This week was <strong>submitted ' + relativeTime(ts.submittedAt) + '</strong> and is waiting for approval. Entries are locked.</div></div>';
      if (ts && ts.status === 'Approved') statusCallout = '<div class="callout" style="margin-bottom:14px;background:var(--green-soft);border-color:color-mix(in srgb,var(--green) 20%,transparent)">' + icon('check') +
        '<div>Approved by <strong>' + esc(ts.approvedBy || 'manager') + '</strong>. This week is locked and ready for billing.</div></div>';

      content = statusCallout +
        '<div class="ts-summary">' +
          miniKpi('clock', fmtHours(total), 'Total hours', 'var(--primary)', 'var(--primary-soft)') +
          miniKpi('check-square', fmtHours(billable), 'Billable hours', 'var(--green)', 'var(--green-soft)') +
          miniKpi('clipboard', entries.length, 'Entries', 'var(--violet)', 'var(--violet-soft)') +
          miniKpi('target', Math.round(total ? (billable / total) * 100 : 0) + '%', 'Billable ratio', 'var(--teal)', 'var(--teal-soft)') +
        '</div>' +
        '<div class="card" style="margin-bottom:14px"><div class="card-head tight"><div><div class="card-title">Week at a glance</div>' +
          '<div class="card-sub">' + weekLabel(weekStart) + '</div></div>' +
          '<div class="card-actions">' + (ts ? statusChip(ts.status) : '<span class="chip chip--draft">No entries</span>') + '</div></div>' +
          '<div class="card-body"><div class="ts-week-strip">' + dayCards + '</div></div></div>' +
        '<div class="card"><div class="card-head tight"><div><div class="card-title">Time entries</div>' +
          '<div class="card-sub">' + (tech ? esc(tech.name) : '') + ' · ' + weekLabel(weekStart) + '</div></div>' +
          '<div class="card-actions">' +
            (!ts || ts.status === 'Draft' ? '<button class="btn btn-sm" data-action="add-entry">' + icon('plus') + 'Add entry</button>' : '') +
            (ts && ts.status === 'Draft' && entries.length ? '<button class="btn btn-sm btn-primary" data-action="submit-ts">' + icon('send') + 'Submit week</button>' : '') +
          '</div></div>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Work / project</th><th>Type</th><th class="num">Hours</th><th>Billable</th><th>Note</th><th></th></tr></thead><tbody>' +
          (entryRows || '<tr><td colspan="7"><div class="table-empty">' + icon('clock') + '<strong>No time logged this week</strong>Add an entry to start your timesheet.</div></td></tr>') +
          '</tbody></table></div>' +
          (entries.length ? '<div class="card-foot"><span class="status-note">' + entries.length + ' entries</span><span class="status-note" style="margin-left:auto"><strong style="color:var(--text)">' + fmtHours(total) + '</strong> total · <strong style="color:var(--text)">' + fmtHours(billable) + '</strong> billable</span></div>' : '') +
        '</div>';
    }

    return pageHead({
      eyebrow: 'Operations', icon: 'clock',
      title: 'Timesheets',
      sub: 'Log billable and non-billable time, submit weekly sheets and approve your team.',
      meta: '<span>' + icon('user') + (tech ? esc(tech.name) : '') + '</span><span>' + icon('calendar') + weekLabel(weekStart) + '</span>',
      actions: '<div class="week-nav"><button data-action="ts-week" data-dir="-1" aria-label="Previous week">' + icon('chevron-left') + '</button>' +
        '<span class="week-label">' + weekLabel(weekStart) + '</span>' +
        '<button data-action="ts-week" data-dir="1" aria-label="Next week">' + icon('chevron-right') + '</button></div>'
    }) +
    '<div class="ts-toolbar">' +
      '<div class="field"><label>Technician</label><select class="select select-sm" data-change="ts-tech">' + options(state.technicians, ui.timesheets.techId, 'id', 'name') + '</select></div>' +
      '<div class="field"><label>Week</label><button class="btn btn-sm" data-action="ts-this-week">' + icon('calendar') + 'This week</button></div>' +
      '<div class="spacer" style="flex:1"></div>' +
      (ts ? statusChip(ts.status) : '<span class="chip chip--draft">Draft</span>') +
      '<span class="status-note">' + fmtHours(total) + ' logged</span>' +
    '</div>' + tabs + content;
  }

  /* ============================================================== projects */
  function projectStatusTint(status) {
    if (status === 'Active') return { color: 'var(--green)', tint: 'var(--green-soft)', progress: 'green' };
    if (status === 'On Hold') return { color: 'var(--amber)', tint: 'var(--amber-soft)', progress: 'amber' };
    if (status === 'Completed') return { color: 'var(--teal)', tint: 'var(--teal-soft)', progress: 'green' };
    return { color: 'var(--violet)', tint: 'var(--violet-soft)', progress: 'violet' };
  }

  function renderProjects() {
    var active = state.projects.filter(function (p) { return p.status === 'Active'; });
    var budget = sum(state.projects, function (p) { return p.budget; });
    var spent = sum(state.projects, function (p) { return p.spent; });
    var avg = state.projects.length ? Math.round(sum(state.projects, function (p) { return projectProgress(p); }) / state.projects.length) : 0;

    var cards = state.projects.map(function (p) {
      var tint = projectStatusTint(p.status);
      var prog = projectProgress(p);
      var spentPct = projectSpentPct(p);
      var manager = state.technicians.find(function (t) { return t.name === p.manager; });
      return '<div class="project-card" data-action="open-project" data-id="' + p.id + '">' +
        '<div class="top"><span class="project-icon" style="--color:' + tint.color + ';--tint:' + tint.tint + '">' + icon('folder') + '</span>' +
          '<div style="min-width:0;flex:1"><h3>' + esc(p.name) + '</h3><div class="co">' + esc(p.company) + ' · ' + esc(p.id) + '</div></div>' +
          statusChip(p.status, false) + '</div>' +
        '<div class="desc">' + esc(p.description) + '</div>' +
        '<div class="project-progress"><div class="row"><span>Overall progress</span><strong>' + prog + '%</strong></div>' + progressBar(prog, tint.progress) + '</div>' +
        '<div class="foot"><div><div class="k">Budget used</div><div class="v">' + fmtMoney(p.spent) + ' <span class="muted" style="font-weight:400">/ ' + fmtMoney(p.budget) + '</span></div></div>' +
          '<div class="right"><div class="k">Milestones</div><div class="v">' + p.milestones.filter(function (m) { return m.status === 'Completed'; }).length + ' / ' + p.milestones.length + '</div></div>' +
          '<div class="avatar-stack">' + (manager ? avatarHTML(manager) : '') + '</div></div>' +
        '<div class="progress-cell mt-12"><div class="row"><span>Budget</span><span>' + spentPct + '%</span></div>' + progressBar(spentPct, spentPct > 90 ? 'amber' : '') + '</div>' +
      '</div>';
    }).join('');

    return pageHead({
      eyebrow: 'Operations', icon: 'folder',
      title: 'Projects',
      sub: 'Deliver multi-visit projects with milestones, budgets and tracked hours.',
      meta: '<span>' + icon('folder') + state.projects.length + ' projects</span><span>' + icon('target') + active.length + ' active</span>',
      actions: '<button class="btn btn-primary" data-action="new-project">' + icon('plus') + 'New project</button>'
    }) +
    '<div class="inv-kpis">' +
      miniKpi('folder', active.length, 'Active projects', 'var(--green)', 'var(--green-soft)') +
      miniKpi('briefcase', fmtMoney(budget), 'Total budget', 'var(--primary)', 'var(--primary-soft)') +
      miniKpi('trending-up', fmtMoney(spent), 'Committed spend', 'var(--violet)', 'var(--violet-soft)') +
      miniKpi('target', avg + '%', 'Average progress', 'var(--teal)', 'var(--teal-soft)') +
    '</div>' +
    '<div class="project-grid">' + cards + '</div>';
  }

  function projectDrawer(p) {
    var tint = projectStatusTint(p.status);
    var prog = projectProgress(p);
    var manager = state.technicians.find(function (t) { return t.name === p.manager; });
    var ms = p.milestones.map(function (m) {
      var cls = m.status === 'Completed' ? 'done' : m.status === 'In Progress' ? 'active' : '';
      var next = m.status === 'Completed' ? 'Reopen' : m.status === 'In Progress' ? 'Mark complete' : 'Start';
      return '<div class="milestone ' + cls + '">' +
        '<span class="milestone-dot">' + icon(m.status === 'Completed' ? 'check' : m.status === 'In Progress' ? 'play' : 'flag') + '</span>' +
        '<div class="milestone-body"><div class="milestone-top"><span class="milestone-name">' + esc(m.name) + '</span>' +
          '<span class="chip chip--soft">' + esc(m.status) + '</span><span class="milestone-date">' + fmtDate(m.due) + '</span></div>' +
          progressBar(m.progress, m.status === 'Completed' ? 'green' : '') +
          '<div class="ms-actions"><button class="btn btn-sm" data-action="milestone-cycle" data-project="' + p.id + '" data-id="' + m.id + '">' + icon('refresh') + next + '</button>' +
          '<span class="text-xs muted">' + m.progress + '% complete</span></div></div>' +
      '</div>';
    }).join('');
    return '<div class="drawer-head"><div class="drawer-top"><div><div class="drawer-id">' + esc(p.id) + ' · Project</div>' +
      '<div class="drawer-title">' + esc(p.name) + '</div>' +
      '<div class="drawer-sub">' + statusChip(p.status, false) + '<span>' + esc(p.company) + '</span></div></div>' +
      '<div class="drawer-head-actions"><button class="btn btn-sm" data-action="edit-project" data-id="' + p.id + '">' + icon('edit') + 'Edit</button>' +
      '<button class="icon-btn" data-action="close-drawer" aria-label="Close">' + icon('x') + '</button></div></div></div>' +
    '<div class="drawer-body">' +
      '<div class="drawer-section"><div class="section-label">' + icon('folder') + 'Overview</div>' +
        '<div class="desc-box">' + esc(p.description) + '</div></div>' +
      '<div class="drawer-section"><div class="section-label">' + icon('target') + 'Delivery</div>' +
        '<div class="detail-grid">' +
          '<div class="detail-item"><div class="k">Overall progress</div><div class="v">' + prog + '%</div></div>' +
          '<div class="detail-item"><div class="k">Project manager</div><div class="v">' + (manager ? personCell(manager) : esc(p.manager)) + '</div></div>' +
          '<div class="detail-item"><div class="k">Timeline</div><div class="v">' + fmtDate(p.start) + ' – ' + fmtDate(p.end) + '</div></div>' +
          '<div class="detail-item"><div class="k">Hours</div><div class="v">' + fmtNum(p.hoursLogged) + ' / ' + fmtNum(p.hoursPlanned) + ' logged</div></div>' +
          '<div class="detail-item"><div class="k">Budget</div><div class="v">' + fmtMoney(p.spent) + ' of ' + fmtMoney(p.budget) + '</div></div>' +
          '<div class="detail-item"><div class="k">Budget used</div><div class="v">' + projectSpentPct(p) + '%</div></div>' +
        '</div><div class="mt-12">' + progressBar(prog, tint.progress) + '</div></div>' +
      '<div class="drawer-section"><div class="section-label">' + icon('flag') + 'Milestones</div>' +
        '<div class="milestones">' + (ms || '<div class="empty-mini">No milestones defined.</div>') + '</div>' +
        '<button class="btn btn-sm mt-12" data-action="new-milestone" data-id="' + p.id + '">' + icon('plus') + 'Add milestone</button></div>' +
    '</div>';
  }
  /* ============================================================ checklists */
  function renderChecklists() {
    var instancesDone = state.checklists.filter(function (c) { return checklistProgress(c) === 100; }).length;
    var avg = state.checklists.length ? Math.round(sum(state.checklists, checklistProgress) / state.checklists.length) : 0;
    var tabs = '<div class="tabs">' +
      '<button class="tab' + (ui.checklists.tab === 'instances' ? ' active' : '') + '" data-action="chk-tab" data-tab="instances">Instances<span class="count">' + state.checklists.length + '</span></button>' +
      '<button class="tab' + (ui.checklists.tab === 'templates' ? ' active' : '') + '" data-action="chk-tab" data-tab="templates">Templates<span class="count">' + state.checklistTemplates.length + '</span></button>' +
    '</div>';

    var content;
    if (ui.checklists.tab === 'instances') {
      var q = ui.checklists.query.trim().toLowerCase();
      var list = state.checklists.filter(function (c) {
        if (!q) return true;
        return (c.name + ' ' + (siteById(c.siteId) || {}).name + ' ' + (techById(c.assigneeId) || {}).name).toLowerCase().indexOf(q) !== -1;
      });
      var cards = list.map(function (c) {
        var prog = checklistProgress(c);
        var site = siteById(c.siteId) || {};
        var assignee = techById(c.assigneeId);
        var tpl = templateById(c.templateId) || {};
        var done = c.items.filter(function (i) { return i.done; }).length;
        return '<div class="checklist-card" data-action="open-checklist" data-id="' + c.id + '">' +
          '<div class="top"><span class="checklist-icon">' + icon('check-square') + '</span>' +
            '<div style="min-width:0;flex:1"><h3>' + esc(c.name) + '</h3><div class="site">' + esc(site.name || '') + ' · ' + esc(c.id) + '</div></div>' +
            statusChip(c.status, false) + '</div>' +
          '<div class="meta"><span>' + icon('user') + (assignee ? esc(assignee.name) : 'Unassigned') + '</span>' +
            '<span>' + icon('calendar') + fmtDate(c.due) + '</span><span>' + icon('clipboard') + esc(tpl.name || 'Custom') + '</span></div>' +
          '<div class="prog-row">' + progressBar(prog, prog === 100 ? 'green' : '') + '<span class="pct">' + prog + '%</span></div>' +
          '<div class="foot"><span class="status-note">' + done + ' of ' + c.items.length + ' items done</span>' +
            '<span class="link-btn">Open checklist</span></div>' +
        '</div>';
      }).join('');
      content = '<div class="toolbar"><div class="search-field">' + icon('search') +
        '<input class="input input-sm" type="search" placeholder="Search checklists…" value="' + esc(ui.checklists.query) + '" data-search="chk" aria-label="Search checklists"></div>' +
        '<div class="spacer"></div><span class="result-count"><strong>' + list.length + '</strong> of ' + state.checklists.length + ' checklists</span></div>' +
        (cards ? '<div class="checklist-grid">' + cards + '</div>' :
          emptyState('check-square', 'No checklists found', 'Try another search or create a new checklist instance.', '<button class="btn btn-primary" data-action="new-checklist">' + icon('plus') + 'New checklist</button>'));
    } else {
      var tcards = state.checklistTemplates.map(function (t) {
        return '<div class="checklist-card">' +
          '<div class="top"><span class="checklist-icon">' + icon('layers') + '</span>' +
            '<div style="min-width:0;flex:1"><h3>' + esc(t.name) + '</h3><div class="site">' + esc(t.region) + ' region · ' + esc(t.id) + '</div></div>' +
            '<span class="chip chip--ghost">' + t.items.length + ' items</span></div>' +
          '<div class="desc" style="font-size:11.5px;color:var(--text-2);line-height:1.5;margin-top:10px">' + esc(t.description) + '</div>' +
          '<div class="foot"><button class="link-btn" data-action="open-template" data-id="' + t.id + '">View template</button>' +
            '<button class="btn btn-sm" data-action="new-checklist" data-id="' + t.id + '">' + icon('plus') + 'Use template</button></div>' +
        '</div>';
      }).join('');
      content = '<div class="checklist-grid">' + tcards + '</div>';
    }

    return pageHead({
      eyebrow: 'Operations', icon: 'check-square',
      title: 'Checklists',
      sub: 'Run safety, service and compliance checklists in the field with full progress tracking.',
      meta: '<span>' + icon('check-square') + instancesDone + ' completed</span><span>' + icon('layers') + state.checklistTemplates.length + ' templates</span><span>' + icon('trending-up') + avg + '% average completion</span>',
      actions: '<button class="btn" data-action="new-template">' + icon('layers') + 'New template</button>' +
        '<button class="btn btn-primary" data-action="new-checklist">' + icon('plus') + 'New checklist</button>'
    }) + tabs + content;
  }

  function checklistDrawer(c) {
    var prog = checklistProgress(c);
    var site = siteById(c.siteId) || {};
    var assignee = techById(c.assigneeId);
    var wo = c.woId ? woById(c.woId) : null;
    var tpl = templateById(c.templateId) || {};
    var items = c.items.map(function (item, i) {
      return '<div class="check-item' + (item.done ? ' checked' : '') + '" data-action="toggle-chk" data-id="' + c.id + '" data-index="' + i + '">' +
        '<span class="check-box">' + (item.done ? icon('check') : '') + '</span>' +
        '<span class="check-text">' + esc(item.label) + '</span></div>';
    }).join('');
    return '<div class="drawer-head"><div class="drawer-top"><div><div class="drawer-id">' + esc(c.id) + ' · Checklist</div>' +
      '<div class="drawer-title">' + esc(c.name) + '</div>' +
      '<div class="drawer-sub">' + statusChip(c.status, false) + '<span>' + esc(site.name || '') + '</span><span>Due ' + fmtDate(c.due) + '</span></div></div>' +
      '<div class="drawer-head-actions"><button class="icon-btn" data-action="close-drawer" aria-label="Close">' + icon('x') + '</button></div></div></div>' +
    '<div class="drawer-body">' +
      '<div class="drawer-section"><div class="section-label">' + icon('trending-up') + 'Progress</div>' +
        '<div class="progress-cell"><div class="row"><span>' + c.items.filter(function (i) { return i.done; }).length + ' of ' + c.items.length + ' complete</span><strong>' + prog + '%</strong></div>' +
        progressBar(prog, prog === 100 ? 'green' : '') + '</div></div>' +
      '<div class="drawer-section"><div class="section-label">' + icon('info') + 'Details</div>' +
        '<div class="detail-grid">' +
          '<div class="detail-item"><div class="k">Assignee</div><div class="v">' + (assignee ? personCell(assignee) : 'Unassigned') + '</div></div>' +
          '<div class="detail-item"><div class="k">Due</div><div class="v">' + fmtDate(c.due, 'long') + '</div></div>' +
          '<div class="detail-item"><div class="k">Template</div><div class="v">' + esc(tpl.name || 'Custom') + '</div></div>' +
          '<div class="detail-item"><div class="k">Work order</div><div class="v">' + (wo ? '<button class="link-btn" data-action="open-wo" data-id="' + wo.id + '">' + wo.id + '</button>' : '—') + '</div></div>' +
        '</div></div>' +
      '<div class="drawer-section"><div class="section-label">' + icon('check-square') + 'Checklist items</div>' +
        '<div class="check-items">' + items + '</div>' +
        '<div class="inline-flex mt-12">' +
          '<button class="btn btn-sm" data-action="complete-chk" data-id="' + c.id + '">' + icon('check') + 'Mark all complete</button>' +
          (prog === 100 ? '<button class="btn btn-sm" data-action="reset-chk" data-id="' + c.id + '">' + icon('refresh') + 'Reset</button>' : '') +
        '</div></div>' +
    '</div>';
  }

  /* ============================================================= sites/assets */
  function assetStatusChip(status) {
    var cls = status === 'Operational' ? 'completed' : status === 'Fault' ? 'cancelled' : 'pending';
    return '<span class="chip chip--' + cls + '">' + esc(status) + '</span>';
  }
  function siteOpenWOs(siteId) {
    return openWorkOrders().filter(function (w) { return w.siteId === siteId; });
  }
  function siteAssets(siteId) {
    return state.assets.filter(function (a) { return a.siteId === siteId; });
  }

  function renderSites() {
    var tabs = '<div class="tabs">' +
      '<button class="tab' + (ui.sites.tab === 'sites' ? ' active' : '') + '" data-action="site-tab" data-tab="sites">Sites<span class="count">' + state.sites.length + '</span></button>' +
      '<button class="tab' + (ui.sites.tab === 'assets' ? ' active' : '') + '" data-action="site-tab" data-tab="assets">Assets<span class="count">' + state.assets.length + '</span></button>' +
    '</div>';

    var content;
    if (ui.sites.tab === 'sites') {
      var q = ui.sites.query.trim().toLowerCase();
      var types = Array.from(new Set(state.sites.map(function (s) { return s.type; }))).sort();
      var list = state.sites.filter(function (s) {
        if (ui.sites.type !== 'all' && s.type !== ui.sites.type) return false;
        if (q && (s.name + ' ' + s.company + ' ' + s.city + ' ' + s.address).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      var cards = list.map(function (s) {
        return '<div class="site-card" data-action="open-site" data-id="' + s.id + '">' +
          '<div class="top"><span class="site-icon">' + icon('map-pin') + '</span>' +
            '<div style="min-width:0;flex:1"><h3>' + esc(s.name) + '</h3><div class="addr">' + esc(s.address) + ', ' + esc(s.city) + ' ' + esc(s.region) + '</div></div>' +
            '<span class="chip chip--soft">' + esc(s.type) + '</span></div>' +
          '<div class="metrics"><div class="metric"><div class="v">' + siteAssets(s.id).length + '</div><div class="l">Assets</div></div>' +
            '<div class="metric"><div class="v">' + siteOpenWOs(s.id).length + '</div><div class="l">Open WOs</div></div>' +
            '<div class="metric"><div class="v">' + esc(s.company.split(' ')[0]) + '</div><div class="l">Account</div></div></div>' +
          '<div class="contact">' + icon('user') + esc(s.contact) + ' · ' + icon('phone') + esc(s.phone) + '</div>' +
        '</div>';
      }).join('');
      content = '<div class="toolbar"><div class="search-field">' + icon('search') +
        '<input class="input input-sm" type="search" placeholder="Search sites…" value="' + esc(ui.sites.query) + '" data-search="sites" aria-label="Search sites"></div>' +
        '<div class="filters"><select class="select select-sm" data-filter="site-type"><option value="all"' + selectedAttr('all', ui.sites.type) + '>All site types</option>' + options(types, ui.sites.type) + '</select></div>' +
        '<div class="spacer"></div><span class="result-count"><strong>' + list.length + '</strong> of ' + state.sites.length + ' sites</span></div>' +
        (cards ? '<div class="site-grid">' + cards + '</div>' : emptyState('map-pin', 'No sites found', 'Try another search or site type.'));
    } else {
      var aq = ui.sites.query.trim().toLowerCase();
      var alist = state.assets.filter(function (a) {
        if (ui.sites.assetStatus !== 'all' && a.status !== ui.sites.assetStatus) return false;
        var s = siteById(a.siteId) || {};
        if (aq && (a.name + ' ' + a.type + ' ' + a.serial + ' ' + (s.name || '')).toLowerCase().indexOf(aq) === -1) return false;
        return true;
      });
      var rows = alist.map(function (a) {
        var s = siteById(a.siteId) || {};
        return '<tr class="clickable" data-action="open-asset" data-id="' + a.id + '">' +
          '<td><div class="cell-main">' + esc(a.name) + '</div><div class="cell-sub">' + esc(a.serial) + '</div></td>' +
          '<td><span class="chip chip--soft">' + esc(a.type) + '</span></td>' +
          '<td><div class="cell-main" style="font-weight:500">' + esc(s.name || '—') + '</div><div class="cell-sub">' + esc(s.city || '') + '</div></td>' +
          '<td>' + assetStatusChip(a.status) + '</td>' +
          '<td>' + fmtDate(a.installed) + '</td>' +
          '<td>' + fmtDate(a.warranty) + '</td>' +
          '<td class="actions-cell"><button class="btn btn-ghost btn-icon" data-action="open-asset" data-id="' + a.id + '" aria-label="View asset">' + icon('chevron-right') + '</button></td>' +
        '</tr>';
      }).join('');
      content = '<div class="toolbar"><div class="search-field">' + icon('search') +
        '<input class="input input-sm" type="search" placeholder="Search assets, serial or site…" value="' + esc(ui.sites.query) + '" data-search="assets" aria-label="Search assets"></div>' +
        '<div class="filters"><select class="select select-sm" data-filter="asset-status"><option value="all"' + selectedAttr('all', ui.sites.assetStatus) + '>All statuses</option>' + options(['Operational', 'Needs Attention', 'Maintenance Due', 'Fault'], ui.sites.assetStatus) + '</select></div>' +
        '<div class="spacer"></div><span class="result-count"><strong>' + alist.length + '</strong> of ' + state.assets.length + ' assets</span></div>' +
        '<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Asset</th><th>Type</th><th>Site</th><th>Status</th><th>Installed</th><th>Warranty</th><th></th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="7"><div class="table-empty"><strong>No assets found</strong>Try another search.</div></td></tr>') +
        '</tbody></table></div></div>';
    }

    return pageHead({
      eyebrow: 'Resources', icon: 'map-pin',
      title: 'Sites & assets',
      sub: 'Every customer site, contact and maintainable asset in one register.',
      meta: '<span>' + icon('map-pin') + state.sites.length + ' sites</span><span>' + icon('box') + state.assets.length + ' assets</span><span>' + icon('alert') + state.assets.filter(function (a) { return a.status === 'Fault'; }).length + ' faults</span>',
      actions: '<button class="btn" data-action="new-asset">' + icon('box') + 'New asset</button>' +
        '<button class="btn btn-primary" data-action="new-site">' + icon('plus') + 'New site</button>'
    }) + tabs + content;
  }

  /* =================================================================== HR */
  function leaveTypeBalanceColor(type) {
    return { Annual: '', Sick: 'sick', Study: 'study', 'Family Responsibility': 'family' }[type] || '';
  }
  function leaveEntitlement(type) {
    return { Annual: 20, Sick: 10, Study: 5, 'Family Responsibility': 3 }[type] || 0;
  }
  function approvedDaysFor(techId, type) {
    return sum(state.leaveRequests.filter(function (l) {
      return l.techId === techId && l.type === type && l.status === 'Approved';
    }), function (l) { return Number(l.days) || 0; });
  }

  function renderHR() {
    var pending = state.leaveRequests.filter(function (l) { return l.status === 'Pending'; });
    var today = todayISO();
    var onLeave = state.leaveRequests.filter(function (l) {
      return l.status === 'Approved' && l.start <= today && l.end >= today;
    });
    var approved = state.leaveRequests.filter(function (l) { return l.status === 'Approved'; });

    var balances = state.technicians.map(function (t) {
      var rows = ['Annual', 'Sick', 'Study', 'Family Responsibility'].map(function (type) {
        var ent = leaveEntitlement(type);
        var used = approvedDaysFor(t.id, type);
        var remaining = Math.max(0, ent - used);
        return '<div class="balance-row"><span>' + esc(type.split(' ')[0]) + '</span>' +
          '<span class="bar"><span class="' + leaveTypeBalanceColor(type) + '" style="width:' + clamp((remaining / ent) * 100, 0, 100) + '%"></span></span>' +
          '<b>' + remaining + '</b></div>';
      }).join('');
      return '<div class="balance-card"><div class="balance-top">' + avatarHTML(t, 'avatar') +
        '<div style="min-width:0"><div class="name">' + esc(t.name) + '</div><div class="role">' + esc(t.group) + '</div></div></div>' +
        '<div class="balance-rows">' + rows + '</div></div>';
    }).join('');

    var statusActions = function (l) {
      if (l.status !== 'Pending') return '<span class="muted text-xs">' + (l.status === 'Approved' ? 'Approved by ' + esc(l.approver || 'manager') : 'Closed') + '</span>';
      return '<button class="btn btn-sm btn-primary" data-action="approve-leave" data-id="' + l.id + '">' + icon('check') + 'Approve</button> ' +
        '<button class="btn btn-sm" data-action="reject-leave" data-id="' + l.id + '">' + icon('x') + 'Reject</button>';
    };

    var rows = state.leaveRequests.slice().sort(function (a, b) {
      return String(a.start).localeCompare(String(b.start));
    }).map(function (l) {
      var t = techById(l.techId) || {};
      return '<tr>' +
        '<td><div class="cell-id">' + l.id + '</div><div class="cell-sub">' + esc(l.reason) + '</div></td>' +
        '<td>' + personCell(t, t.group) + '</td>' +
        '<td><span class="chip chip--soft">' + esc(l.type) + '</span></td>' +
        '<td><div class="cell-main" style="font-weight:500">' + fmtDate(l.start) + ' – ' + fmtDate(l.end) + '</div><div class="cell-sub">' + l.days + ' day' + (l.days === 1 ? '' : 's') + '</div></td>' +
        '<td>' + statusChip(l.status) + '</td>' +
        '<td class="actions-cell">' + statusActions(l) + '</td>' +
      '</tr>';
    }).join('');

    return pageHead({
      eyebrow: 'Resources', icon: 'users',
      title: 'HR & leave',
      sub: 'Manage leave requests, approvals and available balances for the field team.',
      meta: '<span>' + icon('users') + state.technicians.length + ' technicians</span><span>' + icon('clock') + pending.length + ' pending approvals</span>',
      actions: '<button class="btn btn-primary" data-action="new-leave">' + icon('plus') + 'New leave request</button>'
    }) +
    '<div class="inv-kpis">' +
      miniKpi('clock', pending.length, 'Pending requests', 'var(--amber)', 'var(--amber-soft)') +
      miniKpi('user', onLeave.length, 'On leave today', 'var(--violet)', 'var(--violet-soft)') +
      miniKpi('check-square', approved.length, 'Approved requests', 'var(--green)', 'var(--green-soft)') +
      miniKpi('users', state.technicians.length, 'Team members', 'var(--primary)', 'var(--primary-soft)') +
    '</div>' +
    '<div class="card" style="margin-bottom:16px"><div class="card-head tight"><div><div class="card-title">Leave balances</div>' +
      '<div class="card-sub">Remaining days available this year</div></div></div>' +
      '<div class="card-body"><div class="balance-grid">' + balances + '</div></div></div>' +
    '<div class="card"><div class="card-head tight"><div><div class="card-title">Leave requests</div>' +
      '<div class="card-sub">Pending, approved and closed requests</div></div>' +
      '<div class="card-actions"><span class="chip chip--pending">' + pending.length + ' awaiting review</span></div></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Request</th><th>Technician</th><th>Type</th><th>Dates</th><th>Status</th><th></th></tr></thead><tbody>' +
      rows + '</tbody></table></div></div>';
  }

  /* ================================================================ admin */
  function renderAdmin() {
    var tabs = '<div class="tabs">' +
      '<button class="tab' + (ui.admin.tab === 'team' ? ' active' : '') + '" data-action="admin-tab" data-tab="team">Team<span class="count">' + state.technicians.length + '</span></button>' +
      '<button class="tab' + (ui.admin.tab === 'groups' ? ' active' : '') + '" data-action="admin-tab" data-tab="groups">Support groups<span class="count">' + state.supportGroups.length + '</span></button>' +
      '<button class="tab' + (ui.admin.tab === 'templates' ? ' active' : '') + '" data-action="admin-tab" data-tab="templates">Work order templates<span class="count">' + state.workOrderTemplates.length + '</span></button>' +
      '<button class="tab' + (ui.admin.tab === 'settings' ? ' active' : '') + '" data-action="admin-tab" data-tab="settings">Settings</button>' +
    '</div>';

    var content;
    if (ui.admin.tab === 'team') {
      var cards = state.technicians.map(function (t) {
        var open = openWOsForTech(t.id).length;
        return '<div class="team-card"><div class="team-top">' + avatarHTML(t, 'avatar-lg') +
          '<div class="info"><div class="name">' + esc(t.name) + '</div><div class="role">' + esc(t.role) + '</div></div>' +
          '<button class="btn btn-ghost btn-icon" data-action="edit-tech" data-id="' + t.id + '" aria-label="Edit technician">' + icon('edit') + '</button></div>' +
          '<div class="team-meta">' + statusChip(t.status, false) + '<span class="chip chip--soft">' + esc(t.group) + '</span>' +
            t.skills.slice(0, 2).map(function (s) { return '<span class="chip chip--ghost">' + esc(s) + '</span>'; }).join('') + '</div>' +
          '<div class="team-foot"><span class="util"><span class="bar"><span style="width:' + t.utilization + '%"></span></span>' + t.utilization + '% utilized</span>' +
            '<span class="status-note">' + open + ' open WO' + (open === 1 ? '' : 's') + '</span></div></div>';
      }).join('');
      content = '<div class="project-grid">' + cards + '</div>';
    } else if (ui.admin.tab === 'groups') {
      var groups = state.supportGroups.map(function (g) {
        var open = openWorkOrders().filter(function (w) {
          var t = techById(w.techId);
          return t && t.group === g.name;
        }).length;
        var members = state.technicians.filter(function (t) { return t.group === g.name; }).length;
        return '<div class="group-card" style="--group-color:' + g.color + '">' +
          '<h4>' + esc(g.name) + '</h4><div class="manager">Manager · ' + esc(g.manager) + '</div>' +
          '<div class="group-meta"><div><div class="v">' + members + '</div><div class="l">Members</div></div>' +
            '<div><div class="v">' + open + '</div><div class="l">Open WOs</div></div>' +
            '<div><div class="v">' + esc(g.region) + '</div><div class="l">Region</div></div></div>' +
        '</div>';
      }).join('');
      content = '<div class="callout" style="margin-bottom:14px">' + icon('users') +
        '<div>Support groups route work to the right team and drive assignment rules. Group membership is derived from technician profiles.</div></div>' +
        '<div class="group-grid">' + groups + '</div>';
    } else if (ui.admin.tab === 'templates') {
      var rows = state.workOrderTemplates.map(function (t) {
        return '<tr>' +
          '<td><div class="cell-main">' + esc(t.name) + '</div><div class="cell-sub">' + esc(t.id) + ' · ' + esc(t.category) + '</div></td>' +
          '<td><span class="chip chip--soft">' + esc(t.category) + '</span></td>' +
          '<td class="num">' + fmtHours(t.duration) + '</td>' +
          '<td class="num">' + t.tasks.length + '</td>' +
          '<td class="cell-muted">' + esc(t.description) + '</td>' +
          '<td class="actions-cell"><button class="btn btn-sm" data-action="view-wo-template" data-id="' + t.id + '">' + icon('eye') + 'View</button> ' +
            '<button class="btn btn-sm" data-action="new-wo" data-id="' + t.id + '">' + icon('plus') + 'Use</button></td>' +
        '</tr>';
      }).join('');
      content = '<div class="card"><div class="card-head tight"><div><div class="card-title">Work order templates</div>' +
        '<div class="card-sub">Reusable task sets, durations and categories</div></div>' +
        '<div class="card-actions"><button class="btn btn-sm btn-primary" data-action="new-wo-template">' + icon('plus') + 'New template</button></div></div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Template</th><th>Category</th><th class="num">Duration</th><th class="num">Tasks</th><th>Description</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    } else {
      content = '<div class="settings-grid">' +
        '<div class="card"><div class="card-head tight"><div><div class="card-title">Appearance</div>' +
          '<div class="card-sub">Light and dark themes</div></div></div><div class="card-body">' +
          '<div class="setting-row"><div><div class="t">Colour theme</div><div class="d">Switch the entire workspace between light and dark.</div></div>' +
            '<div class="segmented"><button class="' + (ui.theme === 'light' ? 'active' : '') + '" data-action="set-theme" data-theme="light">' + icon('sun') + 'Light</button>' +
            '<button class="' + (ui.theme === 'dark' ? 'active' : '') + '" data-action="set-theme" data-theme="dark">' + icon('moon') + 'Dark</button></div></div>' +
          '<div class="setting-row"><div><div class="t">Density</div><div class="d">Comfortable spacing is used throughout this rebuild.</div></div><span class="chip chip--soft">Comfortable</span></div>' +
        '</div></div>' +
        '<div class="card"><div class="card-head tight"><div><div class="card-title">Demo data</div>' +
          '<div class="card-sub">Everything is stored locally in your browser</div></div></div><div class="card-body">' +
          '<div class="setting-row"><div><div class="t">Reset workspace</div><div class="d">Restore all demo records to their original state.</div></div>' +
            '<button class="btn btn-sm btn-danger" data-action="reset-demo">' + icon('refresh') + 'Reset</button></div>' +
          '<div class="setting-row"><div><div class="t">Export dataset</div><div class="d">Download the current state as a JSON file.</div></div>' +
            '<button class="btn btn-sm" data-action="export-data">' + icon('download') + 'Export</button></div>' +
          '<div class="callout mt-12">' + icon('info') + '<div>Demo data persists in <strong>localStorage</strong>. Clearing site data restores the original dataset on reload.</div></div>' +
        '</div></div>' +
        '<div class="card"><div class="card-head tight"><div><div class="card-title">Workspace</div>' +
          '<div class="card-sub">Environment details</div></div></div><div class="card-body">' +
          '<div class="setting-row"><div><div class="t">Support company</div><div class="d">Thrive Automation Services</div></div><span class="chip chip--soft">Demo</span></div>' +
          '<div class="setting-row"><div><div class="t">Bundle version</div><div class="d">Rebuilt from Thrive Automation FSM 26.4.00</div></div><span class="chip chip--soft">v1.0.0</span></div>' +
          '<div class="setting-row"><div><div class="t">Records</div><div class="d">' + state.workOrders.length + ' work orders · ' + state.inventory.length + ' items · ' + state.sites.length + ' sites</div></div><span class="chip chip--soft">' + state.technicians.length + ' techs</span></div>' +
        '</div></div>' +
        '<div class="card"><div class="card-head tight"><div><div class="card-title">About this rebuild</div>' +
          '<div class="card-sub">Modern UI, same field service workflows</div></div></div><div class="card-body">' +
          '<div class="desc-box">A modern, responsive rebuild of the Thrive Automation FSM application. It covers work orders, dispatch and route planning, inventory, timesheets, projects, checklists, sites and assets, HR leave and configuration — with a complete demo dataset so every workflow can be tested without a server.</div>' +
          '<div class="inline-flex mt-12">' + icon('shield') + '<span class="text-xs muted">No backend required · all interactions are local</span></div>' +
        '</div></div>' +
      '</div>';
    }

    return pageHead({
      eyebrow: 'Administration', icon: 'settings',
      title: 'Configuration',
      sub: 'Manage technicians, support groups, work order templates and workspace preferences.',
      meta: '<span>' + icon('users') + state.technicians.length + ' technicians</span><span>' + icon('layers') + state.supportGroups.length + ' groups</span><span>' + icon('clipboard') + state.workOrderTemplates.length + ' templates</span>',
      actions: '<button class="btn" data-action="export-data">' + icon('download') + 'Export</button>' +
        '<button class="btn btn-primary" data-action="new-tech">' + icon('plus') + 'New technician</button>'
    }) + tabs + content;
  }
  /* ======================================================== drawer content */
  function workOrderDrawer(w, tab) {
    var site = siteById(w.siteId) || {};
    var tech = techById(w.techId);
    var doneTasks = w.tasks.filter(function (t) { return t.done; }).length;
    var taskPct = w.tasks.length ? Math.round((doneTasks / w.tasks.length) * 100) : 0;
    tab = tab || 'overview';

    var tabsHTML = ['overview', 'tasks', 'parts', 'activity'].map(function (t) {
      var labels = { overview: 'Overview', tasks: 'Tasks', parts: 'Parts', activity: 'Activity' };
      var count = t === 'tasks' ? w.tasks.length : t === 'parts' ? w.parts.length : null;
      return '<button class="tab' + (tab === t ? ' active' : '') + '" data-action="drawer-tab" data-tab="' + t + '">' +
        labels[t] + (count != null ? '<span class="count">' + count + '</span>' : '') + '</button>';
    }).join('');

    var body = '';
    if (tab === 'overview') {
      body = '<div class="drawer-section"><div class="section-label">' + icon('refresh') + 'Status</div>' +
        '<div class="status-control">' +
          '<select class="select select-sm" style="width:auto" data-change="wo-status" data-id="' + w.id + '">' +
            options(['New', 'Assigned', 'In Progress', 'On Hold', 'Completed', 'Cancelled'], w.status) + '</select>' +
          (w.status !== 'Completed' ? '<button class="btn btn-sm btn-primary" data-action="complete-wo" data-id="' + w.id + '">' + icon('check') + 'Mark complete</button>' : '') +
          '<button class="btn btn-sm" data-action="edit-wo" data-id="' + w.id + '">' + icon('edit') + 'Edit</button>' +
        '</div>' +
        (w.holdReason ? '<div class="callout warn mt-12">' + icon('alert') + '<div><strong>On hold:</strong> ' + esc(w.holdReason) + '</div></div>' : '') +
      '</div>' +
      '<div class="drawer-section"><div class="section-label">' + icon('info') + 'Details</div>' +
        '<div class="detail-grid">' +
          '<div class="detail-item"><div class="k">Priority</div><div class="v">' + priorityTag(w.priority) + '</div></div>' +
          '<div class="detail-item"><div class="k">Type</div><div class="v">' + esc(w.type) + '</div></div>' +
          '<div class="detail-item"><div class="k">Technician</div><div class="v">' + (tech ? personCell(tech) : '<span class="chip chip--ghost">Unassigned</span>') + '</div></div>' +
          '<div class="detail-item"><div class="k">Site</div><div class="v">' + esc(site.name || '—') + '</div></div>' +
          '<div class="detail-item"><div class="k">Due</div><div class="v" style="' + (isOverdue(w) ? 'color:var(--rose)' : '') + '">' + fmtDate(w.due, 'long') + '</div></div>' +
          '<div class="detail-item"><div class="k">Scheduled</div><div class="v">' + (w.scheduled ? fmtDateTime(w.scheduled) : 'Not scheduled') + '</div></div>' +
          '<div class="detail-item"><div class="k">Estimate</div><div class="v">' + fmtHours(w.estimate) + '</div></div>' +
          '<div class="detail-item"><div class="k">Logged</div><div class="v">' + fmtHours(w.actual || 0) + '</div></div>' +
          '<div class="detail-item"><div class="k">Template</div><div class="v">' + esc(w.template || 'Custom') + '</div></div>' +
          '<div class="detail-item"><div class="k">Billing</div><div class="v">' + (w.billable ? 'Billable' : 'Non-billable') + '</div></div>' +
        '</div></div>' +
        '<div class="drawer-section"><div class="section-label">' + icon('clipboard') + 'Description</div>' +
          '<div class="desc-box">' + esc(w.description || 'No description provided.') + '</div></div>';
    } else if (tab === 'tasks') {
      body = '<div class="drawer-section"><div class="section-label">' + icon('check-square') + 'Task progress</div>' +
        '<div class="progress-cell"><div class="row"><span>' + doneTasks + ' of ' + w.tasks.length + ' complete</span><strong>' + taskPct + '%</strong></div>' +
        progressBar(taskPct, taskPct === 100 ? 'green' : '') + '</div></div>' +
        '<div class="drawer-section">' + (w.tasks.length ? w.tasks.map(function (t) {
          return '<div class="task-row' + (t.done ? ' done' : '') + '">' +
            '<button class="task-check" data-action="toggle-task" data-wo="' + w.id + '" data-task="' + t.id + '" aria-label="Toggle task">' + (t.done ? icon('check') : '') + '</button>' +
            '<span class="task-label">' + esc(t.label) + '</span></div>';
        }).join('') : '<div class="empty-mini">No tasks defined for this work order.</div>') + '</div>';
    } else if (tab === 'parts') {
      body = '<div class="drawer-section"><div class="section-label">' + icon('box') + 'Parts & materials</div>' +
        (w.parts.length ? w.parts.map(function (p) {
          var it = itemById(p.itemId);
          if (!it) return '';
          var st = stockState(it);
          return '<div class="part-row"><span class="part-icon">' + icon('box') + '</span>' +
            '<span><span class="part-name">' + esc(it.name) + '</span><span class="part-sku">' + esc(it.sku) + ' · ' + esc(st.label) + '</span></span>' +
            '<span class="part-qty">× ' + p.qty + '</span></div>';
        }).join('') : '<div class="empty-mini">No parts requested for this work order.</div>') +
        '<button class="btn btn-sm mt-12" data-action="edit-wo" data-id="' + w.id + '">' + icon('edit') + 'Edit work order</button></div>';
    } else {
      var timeline = w.history.slice().reverse();
      body = '<div class="drawer-section"><div class="section-label">' + icon('clock') + 'Activity timeline</div>' +
        '<div class="timeline">' + (timeline.length ? timeline.map(function (h) {
          return '<div class="tl-item"><span class="tl-dot"></span><div><div class="tl-text">' + esc(h.text) + '</div>' +
            '<div class="tl-meta">' + esc(h.by) + ' · ' + relativeTime(h.at) + '</div></div></div>';
        }).join('') : '<div class="empty-mini">No activity recorded.</div>') + '</div></div>';
    }

    return '<div class="drawer-head"><div class="drawer-top"><div><div class="drawer-id">' + w.id + ' · ' + esc(w.type) + '</div>' +
      '<div class="drawer-title">' + esc(w.title) + '</div>' +
      '<div class="drawer-sub">' + statusChip(w.status) + priorityTag(w.priority) + '<span>' + esc(site.name || '') + '</span><span>' + relativeDue(w.due) + '</span></div></div>' +
      '<div class="drawer-head-actions"><button class="icon-btn" data-action="close-drawer" aria-label="Close">' + icon('x') + '</button></div></div>' +
      '<div class="drawer-tabs">' + tabsHTML + '</div></div>' +
      '<div class="drawer-body">' + body + '</div>';
  }

  /* ============================================================ modal meta */
  function modalMeta(m) {
    var type = m.type;
    var id = m.id;
    var payload = m.payload || {};

    if (type === 'wo-new' || type === 'wo-edit') {
      var w = id ? woById(id) : null;
      var preSite = payload.siteId || null;
      var preTemplate = payload.templateId || null;
      return {
        title: w ? 'Edit work order' : 'New work order',
        sub: w ? w.id : 'Create a corrective, preventive or inspection job',
        icon: 'clipboard',
        body: woFormHTML(w, preSite, preTemplate),
        foot: '<span class="form-actions-info left">' + icon('shield') + 'Demo workspace · changes stay in your browser</span>' +
          '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="woForm">' + (w ? 'Save changes' : 'Create work order') + '</button>'
      };
    }

    if (type === 'item-adjust') {
      var item = itemById(id);
      if (!item) return null;
      var wh = warehouseById(item.warehouseId) || {};
      var st = stockState(item);
      return {
        title: 'Adjust stock',
        sub: item.name + ' · ' + item.sku,
        icon: 'sliders',
        size: 'sm',
        body: '<form id="adjustForm" data-form="item-adjust" data-id="' + item.id + '">' +
          '<div class="callout">' + icon('box') + '<div><strong>' + item.onHand + ' on hand</strong> at ' + esc(wh.name || '') +
          ' · bin ' + esc(item.bin) + ' · reorder at ' + item.reorderLevel + '</div></div>' +
          '<div class="form-grid mt-16">' +
            selectField('op', 'Operation', [{ v: 'add', l: 'Add stock' }, { v: 'remove', l: 'Remove stock' }], 'add', 'v', 'l', true) +
            numberField('qty', 'Quantity', 1, '1') +
            inputField('reason', 'Reason', '', 'text', true, 'placeholder="Cycle count, damaged, issued to job…"') +
          '</div></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="adjustForm">Apply adjustment</button>'
      };
    }

    if (type === 'new-item') {
      var cats = Array.from(new Set(state.inventory.map(function (i) { return i.category; }))).sort();
      return {
        title: 'New inventory item',
        sub: 'Add a stocked part or material',
        icon: 'box',
        body: '<form id="itemForm" data-form="item-new"><div class="form-grid">' +
          inputField('name', 'Item name', '', 'text', true) +
          inputField('sku', 'SKU', '', 'text') +
          selectField('category', 'Category', cats, cats[0]) +
          selectField('warehouseId', 'Warehouse', state.warehouses, 'W-01', 'id', 'name') +
          inputField('bin', 'Bin location', '', 'text') +
          numberField('onHand', 'Opening quantity', 0, '1') +
          numberField('reorderLevel', 'Reorder point', 5, '1') +
          numberField('unitCost', 'Unit cost (USD)', 0, '0.01') +
          inputField('unit', 'Unit of measure', 'ea', 'text') +
        '</div></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="itemForm">Add item</button>'
      };
    }

    if (type === 'movement-new') {
      return {
        title: 'New movement order',
        sub: 'Receipt, transfer or issue stock',
        icon: 'truck',
        body: '<form id="movementForm" data-form="movement-new"><div class="form-grid">' +
          selectField('type', 'Movement type', ['Receipt', 'Transfer', 'Issue'], 'Transfer') +
          selectField('itemId', 'Item', state.inventory, state.inventory[0].id, 'id', 'name') +
          numberField('qty', 'Quantity', 1, '1') +
          selectField('status', 'Status', ['Draft', 'In Transit', 'Completed'], 'Draft') +
          fieldWrap('From warehouse', '<select class="select" name="fromWarehouseId"><option value="">—</option>' + options(state.warehouses, '', 'id', 'name') + '</select>') +
          fieldWrap('To warehouse', '<select class="select" name="toWarehouseId"><option value="">—</option>' + options(state.warehouses, '', 'id', 'name') + '</select>') +
          inputField('requestedBy', 'Requested by', 'Alex Morgan', 'text', false) +
          inputField('note', 'Reference / note', '', 'text', true, 'placeholder="PO number, work order or reason"') +
        '</div></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="movementForm">Create movement</button>'
      };
    }

    if (type === 'ts-entry') {
      var ts = tsById(payload.tsId);
      var entry = payload.entryId && ts ? ts.entries.find(function (e) { return e.id === payload.entryId; }) : null;
      var weekStart = ts ? ts.weekStart : startOfWeekISO(ui.timesheets.weekOffset);
      var wos = state.workOrders.filter(function (x) { return x.status !== 'Cancelled'; });
      return {
        title: entry ? 'Edit time entry' : 'Add time entry',
        sub: ts ? weekLabel(ts.weekStart) : '',
        icon: 'clock',
        body: '<form id="tsEntryForm" data-form="ts-entry" data-ts="' + (ts ? ts.id : '') + '" data-entry="' + (entry ? entry.id : '') + '"><div class="form-grid">' +
          inputField('date', 'Date', entry ? entry.date : weekStart, 'date', false, 'min="' + weekStart + '" max="' + addDays(weekStart, 6) + '"') +
          selectField('type', 'Entry type', ['Regular', 'Overtime', 'Travel', 'Training'], entry ? entry.type : 'Regular') +
          fieldWrap('Work order', '<select class="select" name="woId"><option value="">No work order</option>' +
            wos.map(function (x) { return '<option value="' + x.id + '"' + selectedAttr(entry ? entry.woId : '', x.id) + '>' + x.id + ' · ' + esc(x.title) + '</option>'; }).join('') + '</select>', true) +
          fieldWrap('Project', '<select class="select" name="projectId"><option value="">No project</option>' +
            state.projects.map(function (p) { return '<option value="' + p.id + '"' + selectedAttr(entry ? entry.projectId : '', p.id) + '>' + esc(p.name) + '</option>'; }).join('') + '</select>', true) +
          numberField('hours', 'Hours', entry ? entry.hours : 1, '0.25') +
          fieldWrap('Billing', '<label class="checkbox"><input type="checkbox" name="billable"' + (!entry || entry.billable ? ' checked' : '') + '> Billable hours</label>') +
          textareaField('note', 'Note', entry ? entry.note : '', true, 2) +
        '</div></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="tsEntryForm">' + (entry ? 'Save entry' : 'Add entry') + '</button>'
      };
    }

    if (type === 'ts-detail') {
      var tsheet = tsById(id);
      if (!tsheet) return null;
      var tch = techById(tsheet.techId) || {};
      var hours = tsHours(tsheet);
      var rows = tsheet.entries.map(function (e) {
        var wo = e.woId ? woById(e.woId) : null;
        var pr = e.projectId ? projectById(e.projectId) : null;
        return '<tr><td>' + fmtDate(e.date, 'full') + '</td>' +
          '<td>' + esc(wo ? wo.title : pr ? pr.name : '—') + '</td>' +
          '<td><span class="chip chip--soft">' + esc(e.type) + '</span></td>' +
          '<td class="num bold">' + fmtHours(e.hours) + '</td>' +
          '<td>' + (e.billable ? 'Yes' : 'No') + '</td>' +
          '<td class="cell-muted">' + esc(e.note || '') + '</td></tr>';
      }).join('');
      return {
        title: 'Timesheet ' + tsheet.id,
        sub: tch.name + ' · ' + weekLabel(tsheet.weekStart),
        icon: 'clock',
        size: 'lg',
        body: '<div class="detail-grid mb-0" style="margin-bottom:14px">' +
          '<div class="detail-item"><div class="k">Status</div><div class="v">' + statusChip(tsheet.status) + '</div></div>' +
          '<div class="detail-item"><div class="k">Total hours</div><div class="v">' + fmtHours(hours) + '</div></div>' +
          '<div class="detail-item"><div class="k">Billable</div><div class="v">' + fmtHours(tsBillable(tsheet)) + '</div></div>' +
          '<div class="detail-item"><div class="k">Submitted</div><div class="v">' + (tsheet.submittedAt ? fmtDateTime(tsheet.submittedAt) : 'Not submitted') + '</div></div>' +
        '</div><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Work / project</th><th>Type</th><th class="num">Hours</th><th>Billable</th><th>Note</th></tr></thead><tbody>' + rows + '</tbody></table></div>',
        foot: (tsheet.status === 'Submitted'
          ? '<button class="btn btn-danger" data-action="reject-ts" data-id="' + tsheet.id + '">' + icon('x') + 'Return</button>' +
            '<button class="btn btn-primary" data-action="approve-ts" data-id="' + tsheet.id + '">' + icon('check') + 'Approve timesheet</button>'
          : '<button class="btn" data-action="close-modal">Close</button>')
      };
    }

    if (type === 'project-new' || type === 'project-edit') {
      var p = id ? projectById(id) : null;
      return {
        title: p ? 'Edit project' : 'New project',
        sub: p ? p.id : 'Create a multi-visit delivery project',
        icon: 'folder',
        body: '<form id="projectForm" data-form="project" data-id="' + (p ? p.id : '') + '"><div class="form-grid">' +
          inputField('name', 'Project name', p ? p.name : '', 'text', true) +
          selectField('company', 'Customer', state.companies, p ? p.company : 'Harborview Health') +
          selectField('status', 'Status', ['Planning', 'Active', 'On Hold', 'Completed'], p ? p.status : 'Planning') +
          selectField('manager', 'Project manager', state.technicians, p ? p.manager : 'Daniel Kim', 'name', 'name') +
          dateField('start', 'Start date', p ? p.start : todayISO()) +
          dateField('end', 'Target end date', p ? p.end : addDays(todayISO(), 60)) +
          numberField('budget', 'Budget (USD)', p ? p.budget : 50000, '1000') +
          numberField('hoursPlanned', 'Planned hours', p ? p.hoursPlanned : 100, '1') +
          textareaField('description', 'Description', p ? p.description : '', true, 4) +
        '</div></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="projectForm">' + (p ? 'Save project' : 'Create project') + '</button>'
      };
    }

    if (type === 'new-milestone') {
      return {
        title: 'Add milestone',
        sub: projectById(payload.projectId) ? projectById(payload.projectId).name : '',
        icon: 'flag',
        size: 'sm',
        body: '<form id="milestoneForm" data-form="milestone" data-id="' + (payload.projectId || '') + '"><div class="form-grid">' +
          inputField('name', 'Milestone name', '', 'text', true) +
          dateField('due', 'Target date', addDays(todayISO(), 14)) +
        '</div></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="milestoneForm">Add milestone</button>'
      };
    }

    if (type === 'checklist-new') {
      var tpl = payload.templateId ? templateById(payload.templateId) : state.checklistTemplates[0];
      return {
        title: 'New checklist',
        sub: 'Create a checklist instance from a template',
        icon: 'check-square',
        body: '<form id="checklistForm" data-form="checklist"><div class="form-grid">' +
          selectField('templateId', 'Template', state.checklistTemplates, tpl ? tpl.id : '', 'id', 'name', true) +
          inputField('name', 'Checklist name', '', 'text', true, 'placeholder="Defaults to the template name"') +
          selectField('siteId', 'Site', state.sites, state.sites[0].id, 'id', 'name') +
          selectField('assigneeId', 'Assignee', state.technicians, 'T-01', 'id', 'name') +
          dateField('due', 'Due date', addDays(todayISO(), 1)) +
        '</div></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="checklistForm">Create checklist</button>'
      };
    }

    if (type === 'template-new') {
      return {
        title: 'New checklist template',
        sub: 'Reusable checklist definition',
        icon: 'layers',
        body: '<form id="templateForm" data-form="checklist-template"><div class="form-grid">' +
          inputField('name', 'Template name', '', 'text', true) +
          selectField('region', 'Region', ['All', 'North', 'South', 'East', 'West'], 'All') +
          textareaField('description', 'Description', '', true, 2) +
          textareaField('items', 'Checklist items', '', true, 7) +
        '</div><span class="hint">Enter one checklist item per line.</span></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="templateForm">Create template</button>'
      };
    }

    if (type === 'open-template') {
      var ct = templateById(id);
      if (!ct) return null;
      return {
        title: ct.name,
        sub: ct.region + ' region · ' + ct.items.length + ' items',
        icon: 'layers',
        body: '<div class="desc-box">' + esc(ct.description) + '</div>' +
          '<div class="check-items mt-16">' + ct.items.map(function (x, i) {
            return '<div class="check-item"><span class="check-box" style="border-color:var(--border-strong)">' + (i + 1) + '</span><span class="check-text">' + esc(x) + '</span></div>';
          }).join('') + '</div>',
        foot: '<button class="btn" data-action="close-modal">Close</button>' +
          '<button class="btn btn-primary" data-action="new-checklist" data-id="' + ct.id + '">' + icon('plus') + 'Use template</button>'
      };
    }

    if (type === 'new-site') {
      var types = Array.from(new Set(state.sites.map(function (s) { return s.type; }))).sort();
      return {
        title: 'New site',
        sub: 'Add a customer location',
        icon: 'map-pin',
        body: '<form id="siteForm" data-form="site"><div class="form-grid">' +
          inputField('name', 'Site name', '', 'text', true) +
          selectField('type', 'Site type', types.length ? types : ['Commercial'], 'Commercial') +
          selectField('company', 'Customer', state.companies, 'Harborview Health') +
          inputField('contact', 'Primary contact', '', 'text') +
          inputField('phone', 'Phone', '', 'text') +
          inputField('address', 'Address', '', 'text', true) +
          inputField('city', 'City', 'Seattle', 'text') +
          inputField('region', 'State / region', 'WA', 'text') +
          inputField('zip', 'Postal code', '', 'text') +
          inputField('lat', 'Latitude', '47.6062', 'number', false, 'step="0.0001"') +
          inputField('lng', 'Longitude', '-122.3321', 'number', false, 'step="0.0001"') +
        '</div></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="siteForm">Create site</button>'
      };
    }

    if (type === 'site-detail') {
      var s = siteById(id);
      if (!s) return null;
      var sAssets = siteAssets(id);
      var sWOs = siteOpenWOs(id);
      return {
        title: s.name,
        sub: s.company + ' · ' + s.id,
        icon: 'map-pin',
        size: 'lg',
        body: '<div class="callout">' + icon('map-pin') + '<div><strong>' + esc(s.address) + '</strong><br>' + esc(s.city) + ', ' + esc(s.region) + ' ' + esc(s.zip) + '</div></div>' +
          '<div class="detail-grid mt-16">' +
            '<div class="detail-item"><div class="k">Site type</div><div class="v">' + esc(s.type) + '</div></div>' +
            '<div class="detail-item"><div class="k">Customer</div><div class="v">' + esc(s.company) + '</div></div>' +
            '<div class="detail-item"><div class="k">Contact</div><div class="v">' + esc(s.contact) + '</div></div>' +
            '<div class="detail-item"><div class="k">Phone</div><div class="v">' + esc(s.phone) + '</div></div>' +
            '<div class="detail-item"><div class="k">Assets</div><div class="v">' + sAssets.length + '</div></div>' +
            '<div class="detail-item"><div class="k">Open work orders</div><div class="v">' + sWOs.length + '</div></div>' +
          '</div>' +
          '<div class="drawer-section mt-20"><div class="section-label">' + icon('box') + 'Assets at this site</div>' +
            (sAssets.length ? sAssets.map(function (a) {
              return '<div class="part-row"><span class="part-icon">' + icon('box') + '</span><span><span class="part-name">' + esc(a.name) + '</span><span class="part-sku">' + esc(a.serial) + ' · ' + esc(a.type) + '</span></span>' + assetStatusChip(a.status) + '</div>';
            }).join('') : '<div class="empty-mini">No assets registered.</div>') + '</div>' +
          '<div class="drawer-section"><div class="section-label">' + icon('clipboard') + 'Open work orders</div>' +
            (sWOs.length ? sWOs.map(function (x) {
              return '<div class="hp-item" data-action="open-wo" data-id="' + x.id + '"><span class="hp-prio ' + slug(x.priority) + '"></span>' +
                '<span class="hp-body"><span class="hp-title">' + esc(x.title) + '</span><span class="hp-sub">' + x.id + ' · ' + esc(x.status) + '</span></span>' +
                '<span class="hp-meta"><span class="due">' + relativeDue(x.due) + '</span></span></div>';
            }).join('') : '<div class="empty-mini">No open work orders at this site.</div>') + '</div>',
        foot: '<button class="btn" data-action="close-modal">Close</button>' +
          '<button class="btn btn-primary" data-action="new-wo" data-site="' + s.id + '">' + icon('plus') + 'Work order at this site</button>'
      };
    }

    if (type === 'new-asset') {
      return {
        title: 'New asset',
        sub: 'Register a maintainable asset',
        icon: 'box',
        body: '<form id="assetForm" data-form="asset"><div class="form-grid">' +
          inputField('name', 'Asset name', '', 'text', true) +
          inputField('type', 'Asset type', 'HVAC', 'text') +
          selectField('siteId', 'Site', state.sites, ui.sites.tab === 'assets' ? state.sites[0].id : state.sites[0].id, 'id', 'name') +
          inputField('serial', 'Serial number', '', 'text') +
          selectField('status', 'Status', ['Operational', 'Needs Attention', 'Maintenance Due', 'Fault'], 'Operational') +
          dateField('installed', 'Installed', todayISO()) +
          dateField('warranty', 'Warranty end', addDays(todayISO(), 1095)) +
        '</div></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="assetForm">Add asset</button>'
      };
    }

    if (type === 'asset-detail') {
      var asset = state.assets.find(function (a) { return a.id === id; });
      if (!asset) return null;
      var as = siteById(asset.siteId) || {};
      return {
        title: asset.name,
        sub: asset.type + ' · ' + asset.serial,
        icon: 'box',
        body: '<div class="detail-grid">' +
          '<div class="detail-item"><div class="k">Status</div><div class="v">' + assetStatusChip(asset.status) + '</div></div>' +
          '<div class="detail-item"><div class="k">Lifecycle</div><div class="v">' + esc(asset.lifecycle) + '</div></div>' +
          '<div class="detail-item"><div class="k">Site</div><div class="v">' + esc(as.name || '—') + '</div></div>' +
          '<div class="detail-item"><div class="k">Type</div><div class="v">' + esc(asset.type) + '</div></div>' +
          '<div class="detail-item"><div class="k">Serial</div><div class="v">' + esc(asset.serial) + '</div></div>' +
          '<div class="detail-item"><div class="k">Installed</div><div class="v">' + fmtDate(asset.installed, 'long') + '</div></div>' +
          '<div class="detail-item"><div class="k">Warranty ends</div><div class="v">' + fmtDate(asset.warranty, 'long') + '</div></div>' +
          '<div class="detail-item"><div class="k">Open work orders</div><div class="v">' + siteOpenWOs(asset.siteId).length + '</div></div>' +
        '</div>',
        foot: '<button class="btn" data-action="close-modal">Close</button>' +
          '<button class="btn btn-primary" data-action="new-wo" data-site="' + asset.siteId + '">' + icon('plus') + 'Create work order</button>'
      };
    }

    if (type === 'new-leave') {
      return {
        title: 'New leave request',
        sub: 'Submit a request for approval',
        icon: 'users',
        body: '<form id="leaveForm" data-form="leave"><div class="form-grid">' +
          selectField('techId', 'Technician', state.technicians, 'T-01', 'id', 'name', true) +
          selectField('type', 'Leave type', ['Annual', 'Sick', 'Study', 'Family Responsibility'], 'Annual') +
          selectField('approver', 'Approver', state.technicians, 'T-05', 'name', 'name') +
          dateField('start', 'Start date', addDays(todayISO(), 7)) +
          dateField('end', 'End date', addDays(todayISO(), 9)) +
          textareaField('reason', 'Reason', '', true, 3) +
        '</div><span class="hint">Days are calculated automatically from the date range.</span></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="leaveForm">Submit request</button>'
      };
    }

    if (type === 'tech-new' || type === 'tech-edit') {
      var t = id ? techById(id) : null;
      return {
        title: t ? 'Edit technician' : 'New technician',
        sub: t ? t.id : 'Add a field team member',
        icon: 'user',
        body: '<form id="techForm" data-form="tech" data-id="' + (t ? t.id : '') + '"><div class="form-grid">' +
          inputField('name', 'Full name', t ? t.name : '', 'text', true) +
          inputField('role', 'Role', t ? t.role : 'Field Engineer', 'text') +
          selectField('group', 'Support group', state.supportGroups, t ? t.group : 'North Metro', 'name', 'name') +
          selectField('status', 'Status', ['Available', 'On Route', 'Busy', 'On Leave'], t ? t.status : 'Available') +
          inputField('phone', 'Phone', t ? t.phone : '', 'text') +
          inputField('email', 'Email', t ? t.email : '', 'email') +
          inputField('skills', 'Skills (comma separated)', t ? t.skills.join(', ') : 'HVAC, Electrical', 'text', true) +
        '</div></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="techForm">' + (t ? 'Save technician' : 'Add technician') + '</button>'
      };
    }

    if (type === 'new-wo-template') {
      return {
        title: 'New work order template',
        sub: 'Reusable task set and duration',
        icon: 'layers',
        body: '<form id="woTemplateForm" data-form="wo-template"><div class="form-grid">' +
          inputField('name', 'Template name', '', 'text', true) +
          inputField('category', 'Category', 'HVAC', 'text') +
          numberField('duration', 'Standard duration (hours)', 2, '0.25') +
          textareaField('description', 'Description', '', true, 2) +
          textareaField('tasks', 'Tasks', '', true, 6) +
        '</div><span class="hint">Enter one task per line.</span></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="woTemplateForm">Create template</button>'
      };
    }

    if (type === 'view-wo-template') {
      var wt = woTemplateById(id);
      if (!wt) return null;
      return {
        title: wt.name,
        sub: wt.category + ' · ' + fmtHours(wt.duration),
        icon: 'layers',
        body: '<div class="desc-box">' + esc(wt.description) + '</div>' +
          '<div class="drawer-section mt-16"><div class="section-label">' + icon('check-square') + 'Standard tasks</div>' +
          wt.tasks.map(function (x, i) {
            return '<div class="task-row"><span class="task-check">' + (i + 1) + '</span><span class="task-label">' + esc(x) + '</span></div>';
          }).join('') + '</div>',
        foot: '<button class="btn" data-action="close-modal">Close</button>' +
          '<button class="btn btn-primary" data-action="new-wo" data-id="' + wt.id + '">' + icon('plus') + 'Create work order</button>'
      };
    }

    if (type === 'route-new') {
      return {
        title: 'New route',
        sub: 'Save a reusable route plan',
        icon: 'route',
        body: '<form id="routeForm" data-form="route"><div class="form-grid">' +
          inputField('name', 'Route name', '', 'text', true) +
          selectField('techId', 'Technician', state.technicians, ui.dispatch.techId, 'id', 'name') +
          dateField('date', 'Date', ui.dispatch.date) +
        '</div><div class="callout mt-16">' + icon('info') + '<div>' + (ui.dispatch.stops.length ? ui.dispatch.stops.length + ' stops from the current working route will be saved.' : 'No stops in the current plan — stops already assigned to the technician on that date will be used.') + '</div></div></form>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-primary" type="submit" form="routeForm">Save route</button>'
      };
    }

    if (type === 'confirm-reset') {
      return {
        title: 'Reset demo data?',
        sub: 'This cannot be undone',
        icon: 'alert',
        size: 'sm',
        body: '<div class="callout warn">' + icon('alert') + '<div>All work orders, inventory, timesheets, projects, checklists and other demo records will return to their original seeded state.</div></div>' +
          '<p class="text-sm muted mt-12">Theme preference will be kept.</p>',
        foot: '<button class="btn" data-action="close-modal">Cancel</button>' +
          '<button class="btn btn-danger" data-action="confirm-reset">' + icon('refresh') + 'Reset everything</button>'
      };
    }

    if (type === 'about') {
      return {
        title: 'About this rebuild',
        sub: 'Thrive Automation FSM · modern UI',
        icon: 'command',
        body: '<div class="desc-box">A modern, responsive rebuild of the Thrive Automation FSM field service application. The same operational workflows — work orders, dispatch, inventory, timesheets, projects, checklists, sites and assets, HR leave and configuration — presented with a refreshed interface.</div>' +
          '<div class="detail-grid mt-16">' +
            '<div class="detail-item"><div class="k">Application</div><div class="v">Thrive Automation FSM</div></div>' +
            '<div class="detail-item"><div class="k">UI version</div><div class="v">1.0.0</div></div>' +
            '<div class="detail-item"><div class="k">Source bundle</div><div class="v">26.4.00</div></div>' +
            '<div class="detail-item"><div class="k">Data</div><div class="v">Local demo dataset</div></div>' +
          '</div>' +
          '<div class="callout mt-16">' + icon('shield') + '<div>Everything runs locally in the browser. No server, account or network connection is required.</div></div>',
        foot: '<button class="btn btn-primary" data-action="close-modal">Close</button>'
      };
    }

    return null;
  }

  /* ================================================================ forms */
  function fieldWrap(label, inner, full, hint) {
    return '<div class="form-field' + (full ? ' full' : '') + '"><label>' + label + '</label>' + inner +
      (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
  }
  function inputField(name, label, value, type, full, attrs) {
    return fieldWrap(label, '<input class="input" id="f-' + name + '" name="' + name + '" type="' + (type || 'text') + '" value="' + esc(value == null ? '' : value) + '" ' + (attrs || '') + '>', full);
  }
  function numberField(name, label, value, step, full) {
    return inputField(name, label, value, 'number', full, 'step="' + (step || '0.25') + '" min="0"');
  }
  function dateField(name, label, value, type, full) {
    return inputField(name, label, value, type || 'date', full);
  }
  function textareaField(name, label, value, full, rows) {
    return fieldWrap(label, '<textarea class="textarea" id="f-' + name + '" name="' + name + '" rows="' + (rows || 3) + '">' + esc(value || '') + '</textarea>', full);
  }
  function selectField(name, label, values, current, valueKey, labelKey, full) {
    return fieldWrap(label, '<select class="select" id="f-' + name + '" name="' + name + '">' + options(values, current, valueKey, labelKey) + '</select>', full);
  }
  function woFormHTML(w, preSite, preTemplate) {
    var editing = !!w;
    var siteId = w ? w.siteId : (preSite || state.sites[0].id);
    var templateId = w ? (w.templateId || '') : (preTemplate || '');
    var scheduled = w && w.scheduled ? toLocalInput(w.scheduled) : '';
    var cats = Array.from(new Set(state.workOrderTemplates.map(function (t) { return t.category; })
      .concat(state.workOrders.map(function (x) { return x.category; }))
      .concat(['General']))).sort();
    return '<form id="woForm" data-form="wo" data-id="' + (w ? w.id : '') + '"><div class="form-grid">' +
      inputField('title', 'Work order title', w ? w.title : '', 'text', true) +
      selectField('siteId', 'Site', state.sites, siteId, 'id', 'name') +
      selectField('type', 'Work type', ['Corrective', 'Preventive', 'Installation', 'Inspection', 'Safety'], w ? w.type : 'Corrective') +
      selectField('priority', 'Priority', ['Critical', 'High', 'Medium', 'Low'], w ? w.priority : 'Medium') +
      fieldWrap('Technician', '<select class="select" id="f-techId" name="techId"><option value="">Unassigned</option>' +
        state.technicians.map(function (t) { return '<option value="' + t.id + '"' + selectedAttr(w ? w.techId : '', t.id) + '>' + esc(t.name) + '</option>'; }).join('') + '</select>') +
      dateField('due', 'Due date', w ? w.due : todayISO()) +
      dateField('scheduled', 'Scheduled start', scheduled, 'datetime-local') +
      numberField('estimate', 'Estimated hours', w ? w.estimate : 1.5, '0.25') +
      fieldWrap('Template', '<select class="select" id="f-templateId" name="templateId"><option value="">No template</option>' +
        state.workOrderTemplates.map(function (t) { return '<option value="' + t.id + '"' + selectedAttr(templateId, t.id) + '>' + esc(t.name) + '</option>'; }).join('') + '</select>') +
      selectField('category', 'Category', cats, w ? w.category : 'HVAC') +
      fieldWrap('Billing', '<label class="checkbox"><input type="checkbox" name="billable"' + (!w || w.billable ? ' checked' : '') + '> Billable work</label>') +
      textareaField('description', 'Description', w ? w.description : '', true, 4) +
    '</div></form>';
  }
  function toLocalInput(iso) {
    var d = parseISO(iso);
    if (!d) return '';
    return localKey(d) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  /* ============================================================ operations */
  function setWOStatus(w, status) {
    if (!w || w.status === status) return;
    var old = w.status;
    w.status = status;
    if (status === 'Completed') {
      w.completedAt = todayISO();
      if (!w.actual) w.actual = w.estimate || 0;
    } else {
      w.completedAt = null;
    }
    w.history.unshift({
      at: new Date().toISOString(), by: 'Alex Morgan',
      text: 'Status changed from ' + old + ' to ' + status + '.'
    });
    logActivity('Alex Morgan moved <strong>' + w.id + '</strong> to ' + status + '.', 'status');
    if (status === 'Completed') {
      pushNotification('Work order completed', w.id + ' · ' + w.title + ' was completed.', 'work', w.id);
    }
    touch();
  }

  function optimizeStops(stops) {
    if (stops.length < 3) return stops.slice();
    var tech = techById(ui.dispatch.techId);
    var origin = tech && tech.base ? tech.base : siteById(stops[0].siteId);
    var remaining = stops.slice();
    var ordered = [];
    var current = origin;
    while (remaining.length) {
      var bestIdx = 0, bestDist = Infinity;
      remaining.forEach(function (w, i) {
        var d = haversineKm(current, siteById(w.siteId));
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
      var next = remaining.splice(bestIdx, 1)[0];
      ordered.push(next);
      current = siteById(next.siteId);
    }
    return ordered;
  }

  function recomputeChecklistStatus(c) {
    var done = c.items.filter(function (i) { return i.done; }).length;
    c.status = done === c.items.length ? 'Completed' : done === 0 ? 'Not Started' : 'In Progress';
  }
  function recomputeProjectProgress(p) {
    p.progress = projectProgress(p);
    if (p.progress === 100) p.status = 'Completed';
    else if (p.status === 'Completed') p.status = 'Active';
  }
  function recomputeTechLeaveStatus(techId) {
    var t = techById(techId);
    if (!t) return;
    var today = todayISO();
    var onLeave = state.leaveRequests.some(function (l) {
      return l.techId === techId && l.status === 'Approved' && l.start <= today && l.end >= today;
    });
    if (onLeave) t.status = 'On Leave';
    else if (t.status === 'On Leave') t.status = 'Available';
  }

  function setPage(page) {
    if (!PAGES[page]) return;
    ui.page = page;
    if (location.hash !== '#/' + page) {
      try { history.replaceState(null, '', '#/' + page); } catch (e) { location.hash = '#/' + page; }
    }
    renderChrome();
    renderView();
  }

  function openNotification(id) {
    var n = state.notifications.find(function (x) { return x.id === id; });
    if (!n) return;
    n.read = true;
    saveState();
    ui.popover = null;
    var target = n.target || '';
    if (target.indexOf('WO-') === 0) {
      setPage('workorders'); openDrawer('wo', target);
    } else if (target.indexOf('I-') === 0) {
      setPage('inventory'); ui.inventory.tab = 'items'; renderView(); openModal('item-adjust', target);
    } else if (target.indexOf('TS-') === 0) {
      setPage('timesheets'); ui.timesheets.tab = 'approvals'; renderView(); openModal('ts-detail', target);
    } else if (target.indexOf('CHK-') === 0) {
      setPage('checklists'); openDrawer('checklist', target);
    } else if (target.indexOf('LV-') === 0) {
      setPage('hr'); renderView();
    } else {
      renderChrome(); renderView(); renderOverlay();
    }
  }

  function validateForm(form, names) {
    var ok = true;
    $$('.form-field.invalid', form).forEach(function (f) { f.classList.remove('invalid'); });
    names.forEach(function (name) {
      var el = form.elements[name];
      if (!el) return;
      var field = el.closest('.form-field');
      if (!String(el.value || '').trim()) {
        ok = false;
        if (field) field.classList.add('invalid');
      }
    });
    if (!ok) {
      showToast('Missing information', 'Please complete the highlighted required fields.', 'error');
      var first = $('.form-field.invalid input, .form-field.invalid select, .form-field.invalid textarea', form);
      if (first) first.focus();
    }
    return ok;
  }
  function formData(form) {
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    return data;
  }

  /* ============================================================ form submit */
  function handleForm(form) {
    var type = form.dataset.form;
    var data = formData(form);
    var nowIso = new Date().toISOString();

    if (type === 'wo') {
      if (!validateForm(form, ['title', 'siteId', 'due'])) return;
      var editId = form.dataset.id;
      var site = siteById(data.siteId) || state.sites[0];
      var template = data.templateId ? woTemplateById(data.templateId) : null;
      var scheduled = data.scheduled ? new Date(data.scheduled).toISOString() : null;
      if (editId) {
        var w = woById(editId);
        if (!w) return;
        var oldTech = w.techId;
        w.title = data.title.trim();
        w.siteId = data.siteId;
        w.company = site.company;
        w.type = data.type;
        w.priority = data.priority;
        w.techId = data.techId || null;
        w.due = data.due;
        w.scheduled = scheduled;
        w.estimate = parseFloat(data.estimate) || 1.5;
        w.category = data.category;
        w.billable = form.elements.billable.checked;
        w.description = data.description.trim();
        w.templateId = template ? template.id : null;
        w.template = template ? template.name : (w.template || 'Custom');
        if (oldTech !== w.techId) {
          w.history.unshift({ at: nowIso, by: 'Alex Morgan', text: w.techId ? 'Reassigned to ' + (techById(w.techId) || {}).name + '.' : 'Technician unassigned.' });
          if (w.status === 'New' && w.techId) w.status = 'Assigned';
        }
        w.history.unshift({ at: nowIso, by: 'Alex Morgan', text: 'Work order details updated.' });
        logActivity('Alex Morgan updated <strong>' + w.id + '</strong> — ' + esc(w.title) + '.', 'work');
        touch();
        refreshView();
        openDrawer('wo', w.id);
        showToast('Work order updated', w.id + ' was saved successfully.', 'success');
      } else {
        var tasks = template ? template.tasks.map(function (label, i) { return { id: 'TK-' + (i + 1), label: label, done: false }; }) : [];
        var newWO = {
          id: nextId('WO', state.workOrders, 4),
          title: data.title.trim(),
          siteId: data.siteId,
          company: site.company,
          type: data.type,
          priority: data.priority,
          status: data.techId ? 'Assigned' : 'New',
          techId: data.techId || null,
          created: todayISO(),
          due: data.due,
          scheduled: scheduled,
          estimate: parseFloat(data.estimate) || 1.5,
          actual: 0,
          templateId: template ? template.id : null,
          template: template ? template.name : 'Custom',
          category: data.category,
          billable: form.elements.billable.checked,
          description: data.description.trim(),
          tasks: tasks,
          parts: [],
          history: [{ at: nowIso, by: 'Alex Morgan', text: 'Work order created.' }].concat(
            data.techId ? [{ at: nowIso, by: 'Alex Morgan', text: 'Assigned to ' + (techById(data.techId) || {}).name + '.' }] : []
          )
        };
        state.workOrders.unshift(newWO);
        logActivity('Alex Morgan created <strong>' + newWO.id + '</strong> — ' + esc(newWO.title) + '.', 'work');
        if (newWO.priority === 'Critical' || newWO.priority === 'High') {
          pushNotification('New ' + newWO.priority.toLowerCase() + ' work order', newWO.id + ' · ' + newWO.title + ' at ' + site.name + '.', 'critical', newWO.id);
        }
        touch();
        closeModal();
        refreshAll();
        showToast('Work order created', newWO.id + ' is ready for dispatch.', 'success');
      }
      return;
    }

    if (type === 'item-adjust') {
      var it = itemById(form.dataset.id);
      if (!it) return;
      var qty = parseFloat(data.qty) || 0;
      if (qty <= 0) { showToast('Invalid quantity', 'Enter a quantity greater than zero.', 'error'); return; }
      var delta = data.op === 'remove' ? -qty : qty;
      it.onHand = Math.max(0, it.onHand + delta);
      state.movements.unshift({
        id: nextId('IMO', state.movements, 4), type: 'Adjustment', itemId: it.id, qty: qty,
        fromWarehouseId: null, toWarehouseId: null, status: 'Completed', date: todayISO(),
        requestedBy: 'Alex Morgan', note: data.reason || 'Manual stock adjustment'
      });
      logActivity('Alex Morgan adjusted <strong>' + esc(it.name) + '</strong> by ' + (delta > 0 ? '+' : '') + delta + '.', 'inventory');
      if (it.onHand <= it.reorderLevel) {
        pushNotification('Low stock alert', it.name + ' is at ' + it.onHand + ' on hand (reorder at ' + it.reorderLevel + ').', 'inventory', it.id);
      }
      touch();
      closeModal();
      refreshAll();
      showToast('Stock adjusted', it.name + ' now has ' + it.onHand + ' on hand.', 'success');
      return;
    }

    if (type === 'item-new') {
      if (!validateForm(form, ['name', 'sku', 'category', 'warehouseId'])) return;
      var newItem = {
        id: nextId('I', state.inventory, 2), name: data.name.trim(), sku: data.sku.trim().toUpperCase(),
        category: data.category, warehouseId: data.warehouseId, bin: data.bin.trim() || '—',
        onHand: Math.max(0, parseFloat(data.onHand) || 0), reorderLevel: Math.max(0, parseFloat(data.reorderLevel) || 0),
        unitCost: Math.max(0, parseFloat(data.unitCost) || 0), unit: data.unit || 'ea'
      };
      state.inventory.push(newItem);
      logActivity('Alex Morgan added inventory item <strong>' + esc(newItem.name) + '</strong>.', 'inventory');
      touch();
      closeModal();
      refreshAll();
      showToast('Item added', newItem.name + ' is now in inventory.', 'success');
      return;
    }

    if (type === 'movement-new') {
      if (!validateForm(form, ['itemId', 'qty'])) return;
      var mQty = parseFloat(data.qty) || 0;
      if (mQty <= 0) { showToast('Invalid quantity', 'Enter a quantity greater than zero.', 'error'); return; }
      var movement = {
        id: nextId('IMO', state.movements, 4), type: data.type, itemId: data.itemId, qty: mQty,
        fromWarehouseId: data.fromWarehouseId || null, toWarehouseId: data.toWarehouseId || null,
        status: data.status, date: todayISO(), requestedBy: data.requestedBy || 'Alex Morgan',
        note: data.note.trim()
      };
      state.movements.unshift(movement);
      if (movement.status === 'Completed') applyMovementStock(movement);
      logActivity('Alex Morgan created movement <strong>' + movement.id + '</strong> (' + movement.type + ').', 'inventory');
      touch();
      closeModal();
      refreshAll();
      showToast('Movement created', movement.id + ' was created with status ' + movement.status + '.', 'success');
      return;
    }

    if (type === 'ts-entry') {
      var ts = tsById(form.dataset.ts);
      if (!ts) return;
      if (ts.status !== 'Draft') { showToast('Timesheet locked', 'Submitted or approved timesheets cannot be edited.', 'warn'); return; }
      if (!validateForm(form, ['date', 'hours'])) return;
      var hours = parseFloat(data.hours) || 0;
      if (hours <= 0) { showToast('Invalid hours', 'Enter hours greater than zero.', 'error'); return; }
      var woId = data.woId || null;
      var projectId = data.projectId || null;
      if (woId && projectId) projectId = null;
      var entry = form.dataset.entry ? ts.entries.find(function (e) { return e.id === form.dataset.entry; }) : null;
      var entryValues = {
        date: data.date, woId: woId, projectId: projectId, type: data.type, hours: hours,
        billable: form.elements.billable.checked, note: data.note.trim()
      };
      if (entry) Object.assign(entry, entryValues);
      else {
        entryValues.id = nextId('TE', ts.entries, 1);
        ts.entries.push(entryValues);
      }
      touch();
      closeModal();
      refreshAll();
      showToast(entry ? 'Entry updated' : 'Time entry added', fmtHours(hours) + ' logged for ' + fmtDate(data.date) + '.', 'success');
      return;
    }

    if (type === 'project') {
      if (!validateForm(form, ['name', 'start', 'end'])) return;
      if (data.end < data.start) { showToast('Invalid dates', 'The target end date must be after the start date.', 'error'); return; }
      var pEdit = form.dataset.id;
      if (pEdit) {
        var project = projectById(pEdit);
        if (!project) return;
        project.name = data.name.trim();
        project.company = data.company;
        project.status = data.status;
        project.manager = data.manager;
        project.start = data.start;
        project.end = data.end;
        project.budget = parseFloat(data.budget) || 0;
        project.hoursPlanned = parseFloat(data.hoursPlanned) || 0;
        project.description = data.description.trim();
        recomputeProjectProgress(project);
        logActivity('Alex Morgan updated project <strong>' + esc(project.name) + '</strong>.', 'project');
        touch();
        refreshView();
        openDrawer('project', project.id);
        showToast('Project updated', project.name + ' was saved.', 'success');
      } else {
        var newProject = {
          id: nextId('P', state.projects, 3), name: data.name.trim(), company: data.company,
          status: data.status, start: data.start, end: data.end,
          budget: parseFloat(data.budget) || 0, spent: 0,
          hoursPlanned: parseFloat(data.hoursPlanned) || 0, hoursLogged: 0,
          progress: 0, manager: data.manager, description: data.description.trim(), milestones: []
        };
        state.projects.unshift(newProject);
        logActivity('Alex Morgan created project <strong>' + esc(newProject.name) + '</strong>.', 'project');
        touch();
        closeModal();
        refreshAll();
        showToast('Project created', newProject.name + ' is ready for planning.', 'success');
      }
      return;
    }

    if (type === 'milestone') {
      if (!validateForm(form, ['name', 'due'])) return;
      var proj = projectById(form.dataset.id);
      if (!proj) return;
      proj.milestones.push({ id: 'M-' + Date.now(), name: data.name.trim(), due: data.due, status: 'Planned', progress: 0 });
      recomputeProjectProgress(proj);
      logActivity('Alex Morgan added milestone <strong>' + esc(data.name) + '</strong> to ' + esc(proj.name) + '.', 'project');
      touch();
      refreshView();
      openDrawer('project', proj.id);
      showToast('Milestone added', data.name + ' was added to the project.', 'success');
      return;
    }

    if (type === 'checklist') {
      if (!validateForm(form, ['templateId', 'siteId', 'assigneeId', 'due'])) return;
      var ct = templateById(data.templateId);
      if (!ct) return;
      var newCheck = {
        id: nextId('CHK', state.checklists, 3),
        name: data.name.trim() || ct.name,
        templateId: ct.id, siteId: data.siteId, woId: null,
        assigneeId: data.assigneeId, due: data.due, status: 'Not Started',
        items: ct.items.map(function (label) { return { label: label, done: false }; })
      };
      state.checklists.unshift(newCheck);
      logActivity('Alex Morgan created checklist <strong>' + esc(newCheck.name) + '</strong>.', 'checklist');
      touch();
      closeModal();
      refreshAll();
      showToast('Checklist created', newCheck.name + ' was assigned to ' + (techById(data.assigneeId) || {}).name + '.', 'success');
      return;
    }

    if (type === 'checklist-template') {
      if (!validateForm(form, ['name', 'items'])) return;
      var lines = data.items.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (!lines.length) { showToast('No checklist items', 'Add at least one item, one per line.', 'error'); return; }
      var newTemplate = {
        id: nextId('CT', state.checklistTemplates, 2), name: data.name.trim(), region: data.region,
        description: data.description.trim(), items: lines
      };
      state.checklistTemplates.push(newTemplate);
      logActivity('Alex Morgan created checklist template <strong>' + esc(newTemplate.name) + '</strong>.', 'checklist');
      touch();
      closeModal();
      refreshAll();
      showToast('Template created', newTemplate.name + ' is ready to use.', 'success');
      return;
    }

    if (type === 'site') {
      if (!validateForm(form, ['name', 'address', 'city', 'contact'])) return;
      var newSite = {
        id: nextId('S', state.sites, 2), name: data.name.trim(), address: data.address.trim(),
        city: data.city.trim(), region: data.region.trim() || 'WA', zip: data.zip.trim(),
        company: data.company, contact: data.contact.trim(), phone: data.phone.trim(), type: data.type,
        lat: parseFloat(data.lat) || 47.6062, lng: parseFloat(data.lng) || -122.3321, assetCount: 0
      };
      state.sites.push(newSite);
      logActivity('Alex Morgan created site <strong>' + esc(newSite.name) + '</strong>.', 'site');
      touch();
      closeModal();
      refreshAll();
      showToast('Site created', newSite.name + ' was added to the site register.', 'success');
      return;
    }

    if (type === 'asset') {
      if (!validateForm(form, ['name', 'siteId', 'serial'])) return;
      var newAsset = {
        id: nextId('A', state.assets, 2), name: data.name.trim(), type: data.type.trim() || 'General',
        siteId: data.siteId, serial: data.serial.trim(), status: data.status,
        lifecycle: 'In Service', installed: data.installed, warranty: data.warranty
      };
      state.assets.push(newAsset);
      var assetSite = siteById(data.siteId);
      if (assetSite) assetSite.assetCount = (assetSite.assetCount || 0) + 1;
      logActivity('Alex Morgan registered asset <strong>' + esc(newAsset.name) + '</strong>.', 'site');
      touch();
      closeModal();
      refreshAll();
      showToast('Asset added', newAsset.name + ' was registered.', 'success');
      return;
    }

    if (type === 'leave') {
      if (!validateForm(form, ['techId', 'start', 'end', 'reason'])) return;
      if (data.end < data.start) { showToast('Invalid dates', 'The end date must be on or after the start date.', 'error'); return; }
      var days = Math.round((parseISO(data.end) - parseISO(data.start)) / 86400000) + 1;
      var leave = {
        id: nextId('LV', state.leaveRequests, 3), techId: data.techId, type: data.type,
        start: data.start, end: data.end, days: days, status: 'Pending',
        reason: data.reason.trim(), requested: todayISO(), approver: data.approver
      };
      state.leaveRequests.unshift(leave);
      pushNotification('Leave request submitted', (techById(data.techId) || {}).name + ' requested ' + days + ' day' + (days === 1 ? '' : 's') + ' of ' + data.type.toLowerCase() + ' leave.', 'leave', leave.id);
      logActivity('Alex Morgan submitted leave request <strong>' + leave.id + '</strong>.', 'leave');
      touch();
      closeModal();
      refreshAll();
      showToast('Leave request submitted', days + ' day' + (days === 1 ? '' : 's') + ' requested for ' + (techById(data.techId) || {}).name + '.', 'success');
      return;
    }

    if (type === 'tech') {
      if (!validateForm(form, ['name'])) return;
      var techEdit = form.dataset.id;
      var skills = data.skills.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (techEdit) {
        var tech = techById(techEdit);
        if (!tech) return;
        var previousName = tech.name;
        tech.name = data.name.trim();
        tech.initials = initials(tech.name);
        tech.role = data.role.trim() || tech.role;
        tech.group = data.group;
        tech.status = data.status;
        tech.phone = data.phone.trim();
        tech.email = data.email.trim();
        tech.skills = skills;
        if (previousName !== tech.name) {
          state.projects.forEach(function (pr) { if (pr.manager === previousName) pr.manager = tech.name; });
          state.supportGroups.forEach(function (g) { if (g.manager === previousName) g.manager = tech.name; });
        }
        logActivity('Alex Morgan updated technician <strong>' + esc(tech.name) + '</strong>.', 'team');
        touch();
        closeModal();
        refreshAll();
        showToast('Technician updated', tech.name + ' was saved.', 'success');
      } else {
        var newTech = {
          id: nextId('T', state.technicians, 2), name: data.name.trim(), initials: initials(data.name),
          role: data.role.trim() || 'Field Engineer', group: data.group, status: data.status,
          utilization: 50, color: getInitialsColor(data.name), phone: data.phone.trim(), email: data.email.trim(),
          skills: skills, base: { lat: 47.6062, lng: -122.3321 }
        };
        state.technicians.push(newTech);
        logActivity('Alex Morgan added technician <strong>' + esc(newTech.name) + '</strong>.', 'team');
        touch();
        closeModal();
        refreshAll();
        showToast('Technician added', newTech.name + ' joined the field team.', 'success');
      }
      return;
    }

    if (type === 'wo-template') {
      if (!validateForm(form, ['name', 'tasks'])) return;
      var tasksLines = data.tasks.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (!tasksLines.length) { showToast('No tasks', 'Add at least one task, one per line.', 'error'); return; }
      var woTemplate = {
        id: nextId('WT', state.workOrderTemplates, 2), name: data.name.trim(), category: data.category.trim() || 'General',
        duration: parseFloat(data.duration) || 1.5, description: data.description.trim(), tasks: tasksLines
      };
      state.workOrderTemplates.push(woTemplate);
      logActivity('Alex Morgan created work order template <strong>' + esc(woTemplate.name) + '</strong>.', 'work');
      touch();
      closeModal();
      refreshAll();
      showToast('Template created', woTemplate.name + ' is ready to use.', 'success');
      return;
    }

    if (type === 'route') {
      if (!validateForm(form, ['name', 'techId', 'date'])) return;
      var routeStops = (ui.dispatch.techId === data.techId && ui.dispatch.date === data.date && ui.dispatch.stops.length)
        ? ui.dispatch.stops.slice()
        : defaultRouteStops(data.techId, data.date);
      var routeWOs = routeStops.map(function (wid) { return woById(wid); }).filter(Boolean);
      var routeMetricsValue = routeMetrics(routeWOs);
      var newRoute = {
        id: nextId('RT', state.savedRoutes, 4), name: data.name.trim(), techId: data.techId, date: data.date,
        stops: routeStops, status: 'Planned', distanceKm: +routeMetricsValue.km.toFixed(1), durationMin: Math.round(routeMetricsValue.mins)
      };
      state.savedRoutes.push(newRoute);
      ui.dispatch = { techId: data.techId, date: data.date, stops: routeStops.slice(), savedRouteId: newRoute.id, dirty: false };
      logActivity('Alex Morgan saved route <strong>' + esc(newRoute.name) + '</strong>.', 'work');
      touch();
      closeModal();
      refreshAll();
      showToast('Route saved', newRoute.name + ' · ' + routeStops.length + ' stops.', 'success');
      return;
    }
  }

  /* ============================================================ review flows */
  function reviewTimesheet(id, approve) {
    var ts = tsById(id);
    if (!ts) return;
    var tech = techById(ts.techId) || {};
    if (approve) {
      ts.status = 'Approved';
      ts.approvedBy = 'Alex Morgan';
    } else {
      ts.status = 'Draft';
      ts.submittedAt = null;
      ts.approvedBy = null;
    }
    if (ui.modal) closeModal();
    pushNotification(
      approve ? 'Timesheet approved' : 'Timesheet returned',
      ts.id + ' · ' + tech.name + ' — ' + weekLabel(ts.weekStart),
      'timesheet', ts.id
    );
    logActivity('Alex Morgan ' + (approve ? 'approved' : 'returned') + ' timesheet <strong>' + ts.id + '</strong> for ' + esc(tech.name || 'technician') + '.', 'timesheet');
    touch();
    refreshAll();
    showToast(approve ? 'Timesheet approved' : 'Timesheet returned', approve ? ts.id + ' is approved and ready for billing.' : ts.id + ' was returned to the technician.', approve ? 'success' : 'warn');
  }

  function reviewLeave(id, approve) {
    var leave = leaveById(id);
    if (!leave) return;
    var tech = techById(leave.techId) || {};
    leave.status = approve ? 'Approved' : 'Rejected';
    leave.approver = 'Alex Morgan';
    recomputeTechLeaveStatus(leave.techId);
    pushNotification(
      approve ? 'Leave approved' : 'Leave rejected',
      tech.name + ' — ' + leave.days + ' day' + (leave.days === 1 ? '' : 's') + ' of ' + leave.type.toLowerCase() + ' leave.',
      'leave', leave.id
    );
    logActivity('Alex Morgan ' + (approve ? 'approved' : 'rejected') + ' leave <strong>' + leave.id + '</strong> for ' + esc(tech.name || 'technician') + '.', 'leave');
    touch();
    refreshAll();
    showToast(approve ? 'Leave approved' : 'Leave rejected', leave.id + ' has been ' + leave.status.toLowerCase() + '.', approve ? 'success' : 'warn');
  }

  /* ============================================================ action switch */
  function handleAction(action, id, el, event) {
    var data = el ? el.dataset : {};

    switch (action) {
      case 'toast-close': closeToast(el); break;
      case 'toggle-sidebar':
        ui.sidebarOpen = !ui.sidebarOpen;
        document.body.classList.toggle('sidebar-open', ui.sidebarOpen);
        break;
      case 'open-palette': openPalette(); break;
      case 'close-palette': closePalette(); break;
      case 'palette-open': navigateToSearchResult(data.type, data.id); break;
      case 'toggle-notifications':
        ui.popover = ui.popover === 'notifications' ? null : 'notifications';
        renderChrome();
        break;
      case 'toggle-profile':
        ui.popover = ui.popover === 'profile' ? null : 'profile';
        renderChrome();
        break;
      case 'mark-all-read':
        state.notifications.forEach(function (n) { n.read = true; });
        touch();
        renderChrome();
        break;
      case 'notification-open': openNotification(id); break;
      case 'toggle-theme':
        ui.popover = null;
        toggleTheme();
        renderView();
        break;
      case 'set-theme':
        setTheme(data.theme);
        renderView();
        break;
      case 'open-about': openModal('about'); break;
      case 'reset-demo': openModal('confirm-reset'); break;
      case 'confirm-reset': resetDemo(); break;
      case 'export-data': exportData(); break;
      case 'noop': showToast('Demo view', 'The 30-day range is not generated in this demo dataset.', 'info'); break;
      case 'close-modal': closeModal(); break;
      case 'close-drawer': closeDrawer(); break;

      case 'new-wo': openModal('wo-new', null, { siteId: data.site || null, templateId: data.id || null }); break;
      case 'edit-wo': openModal('wo-edit', id); break;
      case 'open-wo': openDrawer('wo', id); break;
      case 'complete-wo':
        var completeWO = woById(id);
        if (completeWO) {
          setWOStatus(completeWO, 'Completed');
          refreshAll();
          renderOverlay();
          showToast('Work order completed', completeWO.id + ' was marked complete.', 'success');
        }
        break;
      case 'drawer-tab':
        if (ui.drawer) { ui.drawer.tab = data.tab; renderOverlay(); }
        break;
      case 'toggle-task':
        var taskWO = woById(data.wo);
        if (taskWO) {
          var task = taskWO.tasks.find(function (t) { return t.id === data.task; });
          if (task) {
            task.done = !task.done;
            touch();
            refreshView();
            renderOverlay();
          }
        }
        break;
      case 'wo-view': ui.wo.view = data.view; renderView(); break;
      case 'wo-day': ui.wo.dayOffset = parseInt(data.offset, 10) || 0; renderView(); break;
      case 'clear-wo-filters':
        ui.wo.query = ''; ui.wo.status = 'all'; ui.wo.priority = 'all'; ui.wo.tech = 'all';
        renderView();
        break;
      case 'go-dispatch': go('dispatch'); break;

      case 'route-move':
        var moveIdx = ui.dispatch.stops.indexOf(id);
        var nextIdx = moveIdx + parseInt(data.dir, 10);
        if (moveIdx !== -1 && nextIdx >= 0 && nextIdx < ui.dispatch.stops.length) {
          var moving = ui.dispatch.stops.splice(moveIdx, 1)[0];
          ui.dispatch.stops.splice(nextIdx, 0, moving);
          ui.dispatch.dirty = true;
          renderView();
        }
        break;
      case 'route-remove':
        var removeIdx = ui.dispatch.stops.indexOf(id);
        if (removeIdx !== -1) {
          ui.dispatch.stops.splice(removeIdx, 1);
          ui.dispatch.dirty = true;
          renderView();
          showToast('Stop removed', id + ' was removed from the route.', 'info');
        }
        break;
      case 'route-add':
        var addSelect = $('#addStopSelect');
        if (addSelect && addSelect.value) {
          ui.dispatch.stops.push(addSelect.value);
          ui.dispatch.dirty = true;
          renderView();
          showToast('Stop added', addSelect.value + ' was added to the route.', 'success');
        }
        break;
      case 'optimize-route':
        var currentStops = dispatchStops();
        if (currentStops.length < 3) { showToast('Not enough stops', 'Add at least three stops before optimizing.', 'info'); break; }
        var beforeKm = routeMetrics(currentStops).km;
        var optimized = optimizeStops(currentStops);
        var afterKm = routeMetrics(optimized).km;
        var orderChanged = optimized.map(function (w) { return w.id; }).join(',') !== currentStops.map(function (w) { return w.id; }).join(',');
        ui.dispatch.stops = optimized.map(function (w) { return w.id; });
        ui.dispatch.dirty = true;
        renderView();
        if (beforeKm - afterKm > 0.05) {
          showToast('Route optimized', 'Saved ' + (beforeKm - afterKm).toFixed(1) + ' km · ' + Math.round(((beforeKm - afterKm) / 32) * 60) + ' min of driving.', 'success');
        } else if (orderChanged) {
          showToast('Route resequenced', 'Stops were reordered; travel distance is already near-optimal.', 'info');
        } else {
          showToast('Route already efficient', 'The current stop order is already near-optimal.', 'info');
        }
        break;
      case 'save-route':
        var saveStops = dispatchStops();
        if (!saveStops.length) { showToast('Nothing to save', 'Add at least one stop to the route.', 'error'); break; }
        var saveMetrics = routeMetrics(saveStops);
        var route = ui.dispatch.savedRouteId ? routeById(ui.dispatch.savedRouteId) : null;
        if (route) {
          route.techId = ui.dispatch.techId;
          route.date = ui.dispatch.date;
          route.stops = ui.dispatch.stops.slice();
          route.distanceKm = +saveMetrics.km.toFixed(1);
          route.durationMin = Math.round(saveMetrics.mins);
          route.status = 'Planned';
        } else {
          var techForRoute = techById(ui.dispatch.techId) || {};
          route = {
            id: nextId('RT', state.savedRoutes, 4),
            name: (techForRoute.group || 'Route') + ' · ' + fmtDate(ui.dispatch.date),
            techId: ui.dispatch.techId, date: ui.dispatch.date,
            stops: ui.dispatch.stops.slice(), status: 'Planned',
            distanceKm: +saveMetrics.km.toFixed(1), durationMin: Math.round(saveMetrics.mins)
          };
          state.savedRoutes.push(route);
          ui.dispatch.savedRouteId = route.id;
        }
        ui.dispatch.dirty = false;
        touch();
        renderChrome();
        renderView();
        showToast('Route saved', route.name + ' · ' + saveStops.length + ' stops.', 'success');
        break;
      case 'load-route':
        var loadedRoute = routeById(id);
        if (loadedRoute) {
          ui.dispatch = {
            techId: loadedRoute.techId, date: loadedRoute.date,
            stops: loadedRoute.stops.slice(), savedRouteId: loadedRoute.id, dirty: false
          };
          renderView();
          showToast('Route loaded', loadedRoute.name + ' is now the working route.', 'info');
        }
        break;
      case 'delete-route':
        var delIdx = state.savedRoutes.findIndex(function (r) { return r.id === id; });
        if (delIdx !== -1) {
          var deletedName = state.savedRoutes[delIdx].name;
          state.savedRoutes.splice(delIdx, 1);
          if (ui.dispatch.savedRouteId === id) ui.dispatch.savedRouteId = null;
          touch();
          renderView();
          showToast('Route deleted', deletedName + ' was removed.', 'info');
        }
        break;
      case 'new-route': openModal('route-new'); break;

      case 'inv-tab': ui.inventory.tab = data.tab; renderView(); break;
      case 'item-adjust': openModal('item-adjust', id); break;
      case 'new-item': openModal('new-item'); break;
      case 'new-movement': openModal('movement-new'); break;
      case 'complete-movement':
        var movement = state.movements.find(function (m) { return m.id === id; });
        if (movement && movement.status !== 'Completed') {
          movement.status = 'Completed';
          applyMovementStock(movement);
          var movedItem = itemById(movement.itemId);
          if (movedItem && movedItem.onHand <= movedItem.reorderLevel) {
            pushNotification('Low stock alert', movedItem.name + ' is at ' + movedItem.onHand + ' on hand.', 'inventory', movedItem.id);
          }
          logActivity('Alex Morgan completed movement <strong>' + movement.id + '</strong>.', 'inventory');
          touch();
          refreshAll();
          showToast('Movement completed', movement.id + ' was applied to stock.', 'success');
        }
        break;
      case 'create-replenishment':
        var replenishItem = itemById(id);
        if (replenishItem) {
          var replenishQty = Math.max(replenishItem.reorderLevel * 2 - replenishItem.onHand, 1);
          var replenishMovement = {
            id: nextId('IMO', state.movements, 4), type: 'Receipt', itemId: replenishItem.id, qty: replenishQty,
            fromWarehouseId: null, toWarehouseId: replenishItem.warehouseId, status: 'Draft', date: todayISO(),
            requestedBy: 'Alex Morgan', note: 'Replenishment suggestion'
          };
          state.movements.unshift(replenishMovement);
          logActivity('Alex Morgan created replenishment <strong>' + replenishMovement.id + '</strong> for ' + esc(replenishItem.name) + '.', 'inventory');
          touch();
          refreshView();
          showToast('Replenishment created', replenishMovement.id + ' · ' + replenishQty + ' × ' + replenishItem.name + '.', 'success');
        }
        break;

      case 'ts-tab': ui.timesheets.tab = data.tab; renderView(); break;
      case 'ts-week': ui.timesheets.weekOffset += parseInt(data.dir, 10) || 0; renderView(); break;
      case 'ts-this-week': ui.timesheets.weekOffset = 0; renderView(); break;
      case 'add-entry':
        var addTS = ensureTimesheet(ui.timesheets.techId, startOfWeekISO(ui.timesheets.weekOffset));
        touch();
        openModal('ts-entry', null, { tsId: addTS.id });
        break;
      case 'edit-entry':
        var foundTS = null, foundEntry = null;
        state.timesheets.forEach(function (t) {
          t.entries.forEach(function (en) { if (en.id === id) { foundTS = t; foundEntry = en; } });
        });
        if (foundTS && foundEntry) openModal('ts-entry', null, { tsId: foundTS.id, entryId: foundEntry.id });
        break;
      case 'delete-entry':
        var delTS = null, delEntryIdx = -1;
        state.timesheets.forEach(function (t) {
          t.entries.forEach(function (en, i) { if (en.id === id) { delTS = t; delEntryIdx = i; } });
        });
        if (delTS && delEntryIdx !== -1) {
          delTS.entries.splice(delEntryIdx, 1);
          touch();
          refreshAll();
          showToast('Entry removed', 'The time entry was deleted.', 'info');
        }
        break;
      case 'submit-ts':
        var submitTS = tsFor(ui.timesheets.techId, startOfWeekISO(ui.timesheets.weekOffset));
        if (!submitTS || !submitTS.entries.length) { showToast('Nothing to submit', 'Add at least one time entry first.', 'error'); break; }
        submitTS.status = 'Submitted';
        submitTS.submittedAt = new Date().toISOString();
        var submitTech = techById(ui.timesheets.techId) || {};
        pushNotification('Timesheet submitted', submitTech.name + ' submitted ' + submitTS.id + ' for approval.', 'timesheet', submitTS.id);
        logActivity('Alex Morgan submitted timesheet <strong>' + submitTS.id + '</strong> for ' + esc(submitTech.name || 'technician') + '.', 'timesheet');
        touch();
        refreshAll();
        showToast('Timesheet submitted', submitTS.id + ' was sent for approval.', 'success');
        break;
      case 'ts-detail': openModal('ts-detail', id); break;
      case 'approve-ts': reviewTimesheet(id, true); break;
      case 'reject-ts': reviewTimesheet(id, false); break;

      case 'open-project': openDrawer('project', id); break;
      case 'new-project': openModal('project-new'); break;
      case 'edit-project': openModal('project-edit', id); break;
      case 'milestone-cycle':
        var milestoneProject = projectById(data.project);
        if (!milestoneProject) break;
        var milestone = milestoneProject.milestones.find(function (m) { return m.id === id; });
        if (!milestone) break;
        if (milestone.status === 'Completed') { milestone.status = 'Planned'; milestone.progress = 0; }
        else if (milestone.status === 'In Progress') { milestone.status = 'Completed'; milestone.progress = 100; }
        else { milestone.status = 'In Progress'; milestone.progress = Math.max(milestone.progress || 0, 50); }
        recomputeProjectProgress(milestoneProject);
        logActivity('Alex Morgan moved milestone <strong>' + esc(milestone.name) + '</strong> to ' + milestone.status + '.', 'project');
        touch();
        refreshView();
        renderOverlay();
        showToast('Milestone updated', milestone.name + ' is now ' + milestone.status + '.', 'success');
        break;
      case 'new-milestone': openModal('new-milestone', null, { projectId: id }); break;

      case 'chk-tab': ui.checklists.tab = data.tab; renderView(); break;
      case 'open-checklist': openDrawer('checklist', id); break;
      case 'new-checklist': openModal('checklist-new', null, { templateId: data.id || null }); break;
      case 'open-template': openModal('open-template', id); break;
      case 'new-template': openModal('template-new'); break;
      case 'toggle-chk':
        var check = checklistById(id);
        if (check) {
          var chkIdx = parseInt(data.index, 10);
          var wasComplete = checklistProgress(check) === 100;
          if (check.items[chkIdx]) {
            check.items[chkIdx].done = !check.items[chkIdx].done;
            recomputeChecklistStatus(check);
            if (!wasComplete && check.status === 'Completed') {
              pushNotification('Checklist completed', check.name + ' was completed by Alex Morgan.', 'checklist', check.id);
              logActivity('Alex Morgan completed checklist <strong>' + esc(check.name) + '</strong>.', 'checklist');
            }
            touch();
            renderView();
            renderOverlay();
          }
        }
        break;
      case 'complete-chk':
        var doneCheck = checklistById(id);
        if (doneCheck) {
          doneCheck.items.forEach(function (i) { i.done = true; });
          doneCheck.status = 'Completed';
          pushNotification('Checklist completed', doneCheck.name + ' was completed by Alex Morgan.', 'checklist', doneCheck.id);
          logActivity('Alex Morgan completed checklist <strong>' + esc(doneCheck.name) + '</strong>.', 'checklist');
          touch();
          renderView();
          renderOverlay();
          showToast('Checklist completed', doneCheck.name + ' is marked complete.', 'success');
        }
        break;
      case 'reset-chk':
        var resetCheck = checklistById(id);
        if (resetCheck) {
          resetCheck.items.forEach(function (i) { i.done = false; });
          resetCheck.status = 'Not Started';
          touch();
          renderView();
          renderOverlay();
          showToast('Checklist reset', 'All items were reset.', 'info');
        }
        break;

      case 'site-tab': ui.sites.tab = data.tab; renderView(); break;
      case 'open-site': openModal('site-detail', id); break;
      case 'new-site': openModal('new-site'); break;
      case 'open-asset': openModal('asset-detail', id); break;
      case 'new-asset': openModal('new-asset'); break;

      case 'new-leave': openModal('new-leave'); break;
      case 'approve-leave': reviewLeave(id, true); break;
      case 'reject-leave': reviewLeave(id, false); break;

      case 'admin-tab': ui.admin.tab = data.tab; renderView(); break;
      case 'new-tech': openModal('tech-new'); break;
      case 'edit-tech': openModal('tech-edit', id); break;
      case 'view-wo-template': openModal('view-wo-template', id); break;
      case 'new-wo-template': openModal('new-wo-template'); break;

      default: break;
    }
  }

  /* ============================================================ change/input */
  function onChange(event) {
    var t = event.target;
    var change = t.dataset.change;

    if (t.dataset.filter) {
      var filter = t.dataset.filter;
      if (filter === 'wo-status') ui.wo.status = t.value;
      else if (filter === 'wo-priority') ui.wo.priority = t.value;
      else if (filter === 'wo-tech') ui.wo.tech = t.value;
      else if (filter === 'inv-category') ui.inventory.category = t.value;
      else if (filter === 'inv-warehouse') ui.inventory.warehouse = t.value;
      else if (filter === 'site-type') ui.sites.type = t.value;
      else if (filter === 'asset-status') ui.sites.assetStatus = t.value;
      renderView();
      return;
    }

    if (t.id === 'f-templateId') {
      var wt = woTemplateById(t.value);
      var catEl = $('#f-category');
      var estEl = $('#f-estimate');
      if (wt) {
        if (catEl) catEl.value = wt.category;
        if (estEl) estEl.value = wt.duration;
      }
      return;
    }

    if (change === 'dispatch-tech') {
      ui.dispatch.techId = t.value;
      ui.dispatch.stops = defaultRouteStops(t.value, ui.dispatch.date);
      var matching = state.savedRoutes.find(function (r) { return r.techId === t.value && r.date === ui.dispatch.date; });
      ui.dispatch.savedRouteId = matching ? matching.id : null;
      ui.dispatch.dirty = false;
      renderView();
      return;
    }
    if (change === 'dispatch-date') {
      ui.dispatch.date = t.value;
      ui.dispatch.stops = defaultRouteStops(ui.dispatch.techId, t.value);
      var matchingDate = state.savedRoutes.find(function (r) { return r.techId === ui.dispatch.techId && r.date === t.value; });
      ui.dispatch.savedRouteId = matchingDate ? matchingDate.id : null;
      ui.dispatch.dirty = false;
      renderView();
      return;
    }
    if (change === 'ts-tech') { ui.timesheets.techId = t.value; renderView(); return; }
    if (change === 'wo-status') {
      var w = woById(t.dataset.id);
      if (w) {
        setWOStatus(w, t.value);
        refreshAll();
        renderOverlay();
        showToast('Status updated', w.id + ' is now ' + w.status + '.', 'success');
      }
      return;
    }
  }

  function onInput(event) {
    var t = event.target;
    var key = t.dataset.search;
    if (!key) return;
    if (key === 'palette') {
      ui.palette.query = t.value;
      ui.palette.index = 0;
      updatePaletteResults();
      return;
    }
    var pos = t.selectionStart;
    if (key === 'wo') ui.wo.query = t.value;
    else if (key === 'inv') ui.inventory.query = t.value;
    else if (key === 'chk') ui.checklists.query = t.value;
    else if (key === 'sites' || key === 'assets') ui.sites.query = t.value;
    renderView();
    var el = $('[data-search="' + key + '"]');
    if (el) {
      el.focus();
      try { el.setSelectionRange(pos, pos); } catch (e) { /* type=search supports this */ }
    }
  }

  function switchPalette(delta) {
    var items = paletteFlat();
    if (!items.length) return;
    ui.palette.index = clamp(ui.palette.index + delta, 0, items.length - 1);
    $$('#paletteResults .palette-item').forEach(function (node, i) {
      node.classList.toggle('active', i === ui.palette.index);
    });
    var active = $('#paletteResults .palette-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function onKeydown(event) {
    var key = event.key;
    if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'k') {
      event.preventDefault();
      if (ui.palette.open) closePalette(); else openPalette();
      return;
    }
    if (key === 'Escape') {
      if (ui.palette.open) { closePalette(); return; }
      if (ui.modal) { closeModal(); return; }
      if (ui.drawer) { closeDrawer(); return; }
      if (ui.popover) { ui.popover = null; renderChrome(); return; }
      if (ui.sidebarOpen) { ui.sidebarOpen = false; document.body.classList.remove('sidebar-open'); return; }
      return;
    }
    if (ui.palette.open) {
      if (key === 'ArrowDown') { event.preventDefault(); switchPalette(1); return; }
      if (key === 'ArrowUp') { event.preventDefault(); switchPalette(-1); return; }
      if (key === 'Enter') {
        event.preventDefault();
        var result = paletteFlat()[ui.palette.index];
        if (result) navigateToSearchResult(result.type, result.id);
        return;
      }
    }
    if ((event.ctrlKey || event.metaKey) && key === 'Enter' && ui.modal) {
      var form = $('.modal form[data-form]');
      if (form) { event.preventDefault(); form.requestSubmit(); }
    }
  }

  /* ============================================================== drag/drop */
  var draggedId = null;
  var draggedType = null;

  function onDragStart(event) {
    var el = event.target.closest('[data-drag]');
    if (!el) return;
    draggedId = el.dataset.id;
    draggedType = el.dataset.drag;
    try {
      event.dataTransfer.setData('text/plain', draggedId);
      event.dataTransfer.effectAllowed = 'move';
    } catch (e) { /* some browsers restrict dataTransfer */ }
    el.classList.add('dragging');
  }
  function onDragEnd() {
    $$('.dragging').forEach(function (el) { el.classList.remove('dragging'); });
    $$('.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
    draggedId = null;
    draggedType = null;
  }
  function onDragOver(event) {
    var zone = event.target.closest('[data-drop-status],[data-drop-route]');
    if (!zone) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    $$('.drag-over').forEach(function (el) { if (el !== zone) el.classList.remove('drag-over'); });
    zone.classList.add('drag-over');
  }
  function onDragLeave(event) {
    var zone = event.target.closest('[data-drop-status],[data-drop-route]');
    if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove('drag-over');
  }
  function onDrop(event) {
    if (!draggedId) return;
    var statusZone = event.target.closest('[data-drop-status]');
    var routeZone = event.target.closest('[data-drop-route]');

    if (statusZone && draggedType === 'wo') {
      event.preventDefault();
      var w = woById(draggedId);
      var newStatus = statusZone.dataset.dropStatus;
      if (w && w.status !== newStatus) {
        setWOStatus(w, newStatus);
        refreshAll();
        showToast('Work order moved', w.id + ' is now ' + newStatus + '.', 'success');
      }
    } else if (routeZone && draggedType === 'route') {
      event.preventDefault();
      var targetId = routeZone.dataset.dropRoute;
      if (targetId && targetId !== draggedId) {
        var from = ui.dispatch.stops.indexOf(draggedId);
        if (from !== -1) {
          ui.dispatch.stops.splice(from, 1);
          var to = ui.dispatch.stops.indexOf(targetId);
          if (to === -1) to = ui.dispatch.stops.length;
          ui.dispatch.stops.splice(to, 0, draggedId);
          ui.dispatch.dirty = true;
          renderView();
        }
      }
    }
    onDragEnd();
  }

  /* ================================================================ wiring */
  function onDocumentClick(event) {
    var actionEl = event.target.closest('[data-action]');
    if (actionEl) {
      handleAction(actionEl.dataset.action, actionEl.dataset.id, actionEl, event);
    }
    if (ui.popover && !event.target.closest('.popover-anchor')) {
      ui.popover = null;
      renderChrome();
    }
  }

  function onDocumentSubmit(event) {
    var form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    handleForm(form);
  }

  function init() {
    if (!location.hash) {
      try { history.replaceState(null, '', '#/dashboard'); } catch (e) { location.hash = '#/dashboard'; }
    }
    if (!hasStoredState()) saveState();
    ui.page = pageFromHash();
    renderChrome();
    renderView();
    renderOverlay();
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('submit', onDocumentSubmit);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('dragend', onDragEnd);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('drop', onDrop);
    window.addEventListener('hashchange', route);
  }

  init();
})();
