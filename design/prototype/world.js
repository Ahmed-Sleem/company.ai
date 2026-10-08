/* =====================================================================================
   world.js — the studio floor plan (the "world" tab) for the design prototype.
   -------------------------------------------------------------------------------------
   Loaded by company-os.html next to graph.js, through build-prototype.py. It adds exactly
   three things and touches nothing else:

     · window.worldView()  — the view the demo's own `render()` shows for ui.view === 'world'
                             (build-prototype.py adds the nav entry and the views-map entry);
     · nothing at all outside a browser: `verify.mjs` renders the view headlessly, so the
       module must be safe to evaluate with no document;
     · the maths it moves with comes from `world-lib.js` — the SAME camera, plan, furniture
       paths and seating rule the app uses (`apps/web/src/world/*.ts`, bundled by
       `scripts/build-world-lib.mjs`). This file is only the drawing and the gestures.

   Why the module calls the lib at use time rather than at load time: the engine checks in
   verify.mjs evaluate this file on its own, without world-lib.js present. Everything the lib
   provides is therefore read through `L()` inside a function, never at module scope.
   ===================================================================================== */
(function () {
  'use strict';

  var W = typeof window !== 'undefined' ? window : null;
  var IS_BROWSER = !!W && typeof document !== 'undefined';
  var D = IS_BROWSER ? document : null;

  function L() { return W && W.WORLD_LIB; }
  function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
  function qs(sel) { return D ? D.querySelector(sel) : null; }
  function gt(en, ar) { return (safe(function () { return pref.lang; }, 'en') === 'ar') ? ar : en; }

  /* ---- the words this view adds, in the demo's two languages ---------------------------------- */
  var ROOM_WORDS = {
    exec: ['Executive Wing', 'الجناح التنفيذي'],
    eng: ['AI Core & Engineering Lab', 'مركز الذكاء ومختبر الهندسة'],
    board: ['Boardroom', 'قاعة الاجتماعات'],
    design: ['Design & Product Atelier', 'استوديو التصميم والمنتج'],
    ops: ['Operations & Growth', 'العمليات والنمو'],
    lounge: ['Breakroom & Lounge', 'غرفة الراحة'],
  };
  function roomWord(id) {
    var pair = ROOM_WORDS[id] || ['Studio', 'الاستوديو'];
    return gt(pair[0], pair[1]);
  }

  function copy() {
    return {
      head: gt('The whole studio at once.', 'الاستوديو كله في نظرة واحدة.'),
      note: gt('Where everyone sits, and what they are carrying.', 'أين يجلس كل شخص، وما يحمله من عمل.'),
      wholePlan: gt('Whole plan', 'المخطط كامل'),
      canvas: gt('Studio floor plan', 'مخطط أرضية الاستوديو'),
      hint: gt('Drag to move · wheel to zoom · arrows or + and − · 0 to fit', 'اسحب للتحريك · عجلة الفأرة للتقريب · الأسهم أو + و − · 0 للاحتواء'),
      zoomIn: gt('Zoom in', 'تقريب'),
      zoomOut: gt('Zoom out', 'تبعيد'),
      emptyDesk: gt('Empty desk', 'مكتب فارغ'),
      sitsIn: gt('Sits in', 'يجلس في'),
      status: gt('Status', 'الحالة'),
      staff: gt('Staff', 'الفريق'),
      workingNow: gt('Working now', 'يعمل الآن'),
      activeTasks: gt('Active tasks', 'مهام جارية'),
      close: gt('Close', 'إغلاق'),
      noTasks: gt('Nothing on this desk right now.', 'لا شيء على هذا المكتب الآن.'),
      tasks: gt('Tasks', 'المهام'),
      summary: gt('{people} people at desks, {rooms} rooms, {furniture} pieces of furniture.', '{people} أشخاص على المكاتب، و{rooms} غرف، و{furniture} قطعة أثاث.'),
      working: gt('Working', 'يعمل'),
      blocked: gt('Needs attention', 'يحتاج انتباهًا'),
      idle: gt('Idle', 'غير مشغول'),
    };
  }

  /* ---- who sits where ------------------------------------------------------------------------
     The demo names its departments in the owner's words ("Go to market"); the plan names its
     desk clusters in its own ("Operations"). This is the only place the two vocabularies meet,
     and it is written out rather than guessed at, so a new department fails visibly (it seats
     by theme, then anywhere) instead of silently landing in the wrong room. */
  var DEPT_OF_PLAN = {
    engineering: 'Engineering', models: 'Engineering', platform: 'Engineering',
    design: 'Design', product: 'Design',
    operations: 'Operations', growth: 'Operations', 'go to market': 'Operations', finance: 'Operations',
    executive: 'Executive', leadership: 'Executive', founders: 'Executive',
  };
  function planDept(dept) {
    var key = String(dept == null ? '' : dept).toLowerCase();
    for (var word in DEPT_OF_PLAN) { if (key.indexOf(word) > -1) return DEPT_OF_PLAN[word]; }
    return dept;
  }
  var STATUS_CLASS = { working: 'working', error: 'blocked', paused: 'idle', idle: 'idle' };

  function hasData() {
    return safe(function () { return !!(data && data.agents && data.agents.length); }, false);
  }

  function seats() {
    var lib = L();
    if (!lib || !hasData()) return [];
    var plan = lib.defaultPlan();
    var agents = data.agents.map(function (a) {
      return { id: a.id, department: planDept(a.dept), row: a };
    });
    var tasks = (data.tasks || []).map(function (task) {
      return { ownerAgentId: task.owner, stage: task.stage, row: task };
    });
    return lib.seatAgents(plan, agents, tasks);
  }

  /* ---- the view ------------------------------------------------------------------------------ */
  function outerHead() {
    var c = copy();
    return safe(function () { return head(c.head, c.note); }, '');
  }

  function worldView() {
    var base = outerHead();
    if (typeof ui !== 'undefined' && ui.state !== 'default') {
      return base + safe(function () { return stateBlock(ui.state); }, '');
    }
    if (!hasData()) return base + safe(function () { return stateBlock('empty'); }, '');
    if (IS_BROWSER) queueInit();
    return base + worldShell();
  }

  function worldShell() {
    var lib = L();
    if (!lib) return '';
    var c = copy();
    var seatList = seats();
    var room = safe(function () { return data.company; }, '') || '';
    return '' +
      '<div class="world">' +
        '<div class="world-hud" role="toolbar" aria-label="' + esc(c.canvas) + '">' +
          '<button type="button" class="btn small" data-w="fit" aria-pressed="true">' + icon('grid') + ' <span>' + esc(c.wholePlan) + '</span></button>' +
          lib.DEFAULT_LAYOUT.rooms.map(function (each) {
            return '<button type="button" class="btn small" data-w="room" data-room="' + esc(each.id) + '" aria-pressed="false">' + esc(roomWord(each.id)) + '</button>';
          }).join('') +
          '<span class="grow"></span>' +
          '<button type="button" class="btn ghost iconbtn" data-w="zoom-out" aria-label="' + esc(c.zoomOut) + '">−</button>' +
          '<span class="world-scale" data-w="scale">100%</span>' +
          '<button type="button" class="btn ghost iconbtn" data-w="zoom-in" aria-label="' + esc(c.zoomIn) + '">+</button>' +
        '</div>' +
        '<div class="world-viewport" id="world-viewport" tabindex="0" role="application" aria-label="' + esc(c.canvas) + '" data-w="viewport">' +
          '<div class="world-canvas" id="world-canvas" style="inline-size:' + num(lib.WORLD.w) + 'px;block-size:' + num(lib.WORLD.h) + 'px">' +
            roomsMarkup(lib) + propsMarkup(lib) + desksMarkup(seatList) +
            '<p class="sr-only" data-w="summary">' + esc(summaryText(seatList, lib)) + '</p>' +
          '</div>' +
          '<aside class="world-drawer panel" id="world-drawer" hidden aria-live="polite"></aside>' +
          '<div class="world-stats">' + statsMarkup(seatList) + '</div>' +
        '</div>' +
        '<p class="world-hint muted">' + esc(c.hint) + '</p>' +
      '</div>' +
      (room ? '' : '');
  }

  function roomsMarkup(lib) {
    return lib.DEFAULT_LAYOUT.rooms.map(function (each) {
      return '<section class="room room-' + esc(each.theme) + '" data-room-box="' + esc(each.id) + '" aria-label="' + esc(roomWord(each.id)) + '"' +
        ' style="inset-inline-start:' + num(each.x) + 'px;inset-block-start:' + num(each.y) + 'px;inline-size:' + num(each.w) + 'px;block-size:' + num(each.h) + 'px">' +
        '<header class="room-head"><strong>' + esc(roomWord(each.id)) + '</strong>' +
        (each.sub ? '<small>' + esc(each.sub) + '</small>' : '') + '</header></section>';
    }).join('');
  }

  function propsMarkup(lib) {
    return lib.DEFAULT_LAYOUT.props.map(function (prop) {
      var shape = lib.shapeFor(prop.type);
      var label = safe(function () { var s = lib.sprite(prop.type); return s && s.l ? s.l : prop.label; }, prop.label);
      return '<span class="prop prop-' + esc(shape) + '" data-prop="' + esc(prop.id) + '" title="' + esc(label) + '"' +
        ' style="inset-inline-start:' + num(prop.x) + 'px;inset-block-start:' + num(prop.y) + 'px;inline-size:' + num(prop.w) + 'px;block-size:' + num(prop.h) + 'px">' +
        '<svg class="prop-art prop-art-' + esc(shape) + '" viewBox="0 0 ' + num(lib.PROP_GRID) + ' ' + num(lib.PROP_GRID) + '" aria-hidden="true" focusable="false" preserveAspectRatio="none">' +
        '<path d="' + esc(lib.PROP_PATHS[shape]) + '"/></svg></span>';
    }).join('');
  }

  function desksMarkup(seatList) {
    var c = copy();
    return seatList.map(function (seat) {
      var person = seat.agent && seat.agent.row;
      var style = 'inset-inline-start:' + num(seat.desk.x) + 'px;inset-block-start:' + num(seat.desk.y) +
        'px;inline-size:' + num(seat.desk.w) + 'px;block-size:' + num(seat.desk.h) + 'px';
      if (!person) {
        return '<button type="button" class="desk desk-empty" data-desk="' + esc(seat.desk.id) + '" style="' + style + '">' +
          '<span class="desk-name muted">' + esc(c.emptyDesk) + '</span></button>';
      }
      var status = STATUS_CLASS[person.status] || 'idle';
      var name = safe(function () { return tr(person.name); }, person.id);
      return '<button type="button" class="desk" data-desk="' + esc(seat.desk.id) + '" data-agent="' + esc(person.id) + '" style="' + style + '">' +
        safe(function () { return avatar(person.avatar, 'sm'); }, '') +
        '<span class="desk-name">' + esc(name) + '</span>' +
        '<span class="desk-status desk-status-' + esc(status) + '" aria-hidden="true"></span>' +
        (seat.tasks.length ? '<span class="desk-count">' + num(seat.tasks.length) + '</span>' : '') +
        '</button>';
    }).join('');
  }

  function statsMarkup(seatList) {
    var c = copy();
    var people = seatList.filter(function (s) { return s.agent; });
    var working = seatList.filter(function (s) { return s.working; }).length;
    var active = safe(function () {
      return (data.tasks || []).filter(function (t) { return t.stage === 'progress' || t.stage === 'review'; }).length;
    }, 0);
    return stat(c.staff, num(people.length), '', '') +
      stat(c.workingNow, num(working), '', '') +
      stat(c.activeTasks, num(active), '', '');
  }

  function summaryText(seatList, lib) {
    var c = copy();
    return c.summary
      .replace('{people}', String(seatList.filter(function (s) { return s.agent; }).length))
      .replace('{rooms}', String(lib.DEFAULT_LAYOUT.rooms.length))
      .replace('{furniture}', String(lib.DEFAULT_LAYOUT.props.length));
  }

  /* ---- the camera ----------------------------------------------------------------------------
     One camera, one target. Gestures that must feel 1:1 (drag, pinch) move both; everything the
     user presses (fit, a room, +, −, the keyboard) moves the *target* only, and the frame loop
     walks the camera toward it with the app's `ease()` — a wheel flick or a room jump becomes one
     continuous movement instead of a jump. Under `prefers-reduced-motion` the two are the same
     thing, and nothing animates. */
  var V = { camera: { scale: 1, x: 0, y: 0 }, target: { scale: 1, x: 0, y: 0 } };
  var WIRED = false, raf = 0, room = null, selected = null;
  var panning = null, pinching = null, pointers = {}, inertia = { vx: 0, vy: 0 }, lastMove = 0;

  function reduced() { return !!safe(function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }, false); }
  function viewport() { return qs('#world-viewport'); }
  function box() {
    var el = viewport();
    if (!el) return { width: 960, height: 640, left: 0, top: 0 };
    var r = el.getBoundingClientRect();
    return { width: r.width, height: r.height, left: r.left, top: r.top };
  }

  function paint() {
    var canvas = qs('#world-canvas');
    if (canvas) canvas.style.transform = L().cameraTransform(V.camera);
    var readout = qs('[data-w="scale"]');
    if (readout) readout.textContent = Math.round(V.camera.scale * 100) + '%';
    var list = document.querySelectorAll('[data-w="room"]');
    for (var i = 0; i < list.length; i++) {
      list[i].setAttribute('aria-pressed', list[i].getAttribute('data-room') === room ? 'true' : 'false');
    }
  }

  /** Move the camera now (gestures: a drag, a pinch) — and keep the target with it. */
  function place(next) {
    var b = box();
    V.camera = L().clampCamera(next, b.width, b.height);
    V.target = V.camera;
    paint();
  }

  /** Aim the camera (controls: wheel, buttons, rooms, keys) — the frame loop does the travelling. */
  function aim(next) {
    var b = box();
    V.target = L().clampCameraForZoom(next, b.width, b.height);
    if (reduced()) { V.camera = V.target; paint(); return; }
    run();
  }

  function run() { if (!raf && IS_BROWSER) raf = requestAnimationFrame(frame); }

  function frame() {
    raf = 0;
    if (!viewport()) { inertia.vx = 0; inertia.vy = 0; return; }   /* the view was left */
    var moving = false;

    if (!reduced() && (inertia.vx || inertia.vy)) {
      var b = box();
      var next = L().panBy(V.camera, inertia.vx, inertia.vy);
      var before = V.camera;
      V.camera = L().clampCamera(next, b.width, b.height);
      V.target = V.camera;
      inertia.vx *= 0.92; inertia.vy *= 0.92;
      if (Math.abs(inertia.vx) < 0.05) inertia.vx = 0;
      if (Math.abs(inertia.vy) < 0.05) inertia.vy = 0;
      if (V.camera.x === before.x && V.camera.y === before.y) { inertia.vx = 0; inertia.vy = 0; }  /* hit the edge */
      moving = true;
    }

    if (!panning && !pinching && V.camera !== V.target) {
      V.camera = reduced() ? V.target : L().ease(V.camera, V.target);
      moving = true;
    }

    paint();
    if (moving) run();
  }

  function fit() {
    var b = box();
    room = null;
    aim(L().fitCamera(b.width, b.height));
  }

  function showRoom(next) {
    var b = box();
    room = next ? next.id : null;
    var scale = Math.min(2, Math.max(1, Math.min(b.width / (next.w * 1.4), b.height / (next.h * 1.4))));
    aim(L().centreOn({ scale: scale, x: 0, y: 0 }, next.x + next.w / 2, next.y + next.h / 2, b.width, b.height));
  }

  function zoomBy(factor) {
    var b = box();
    aim(L().zoomByCentre(V.target, factor, b.width, b.height));
  }

  /* ---- the drawer: one person's day ----------------------------------------------------------- */
  function openDesk(seat) {
    var c = copy();
    var person = seat.agent && seat.agent.row;
    if (!person) { closeDrawer(); return; }
    selected = seat.desk.id;
    var status = STATUS_CLASS[person.status] || 'idle';
    var statusWord = status === 'working' ? c.working : status === 'blocked' ? c.blocked : c.idle;
    var mine = seat.tasks.map(function (t) { return t.row; });
    var html = '' +
      '<div class="drawer-head">' +
        safe(function () { return avatar(person.avatar); }, '') +
        '<div><h3>' + esc(safe(function () { return tr(person.name); }, person.id)) + '</h3>' +
        '<p class="muted">' + esc(safe(function () { return tr(person.role); }, '')) +
        (person.dept ? ' · ' + esc(person.dept) : '') + '</p></div>' +
        '<button type="button" class="btn small iconbtn" data-w="close-drawer" aria-label="' + esc(c.close) + '">' + icon('close') + '</button>' +
      '</div>' +
      '<dl class="drawer-facts">' +
        '<div><dt>' + esc(c.status) + '</dt><dd>' + esc(statusWord) + '</dd></div>' +
        '<div><dt>' + esc(c.sitsIn) + '</dt><dd>' + esc(roomWord(seat.desk.room || seatRoom(seat.desk))) + '</dd></div>' +
      '</dl>' +
      '<h4>' + esc(c.tasks) + '</h4>' +
      (mine.length
        ? '<ul class="drawer-tasks">' + mine.map(function (task) {
            return '<li><span class="task-id">' + esc(task.id) + '</span><span>' + esc(safe(function () { return tr(task.title); }, task.id)) + '</span>' +
              '<span class="meter grow" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + num(task.progress) + '" aria-label="' + esc(task.id) + '">' +
              '<span style="width:' + num(task.progress) + '%"></span></span></li>';
          }).join('') + '</ul>'
        : '<p class="muted">' + esc(c.noTasks) + '</p>');

    var drawer = qs('#world-drawer');
    if (drawer) { drawer.innerHTML = html; drawer.hidden = false; }
    var list = document.querySelectorAll('[data-desk]');
    for (var i = 0; i < list.length; i++) {
      list[i].classList.toggle('desk-selected', list[i].getAttribute('data-desk') === selected);
    }
  }

  function seatRoom(desk) {
    var lib = L();
    if (!lib) return '';
    var found = lib.roomAt(lib.DEFAULT_LAYOUT, desk.x + desk.w / 2, desk.y + desk.h / 2);
    return found ? found.id : 'lounge';
  }

  function closeDrawer() {
    selected = null;
    var drawer = qs('#world-drawer');
    if (drawer) { drawer.hidden = true; drawer.innerHTML = ''; }
    var list = document.querySelectorAll('[data-desk]');
    for (var i = 0; i < list.length; i++) list[i].classList.remove('desk-selected');
  }

  /* ---- wiring --------------------------------------------------------------------------------- */
  function wire() {
    var el = viewport();
    if (!el || WIRED) return;
    WIRED = true;

    el.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var b = box();
      var factor = L().wheelFactor(ev.deltaY, ev.deltaMode, ev.ctrlKey);
      aim(L().zoomBy(V.target, factor, ev.clientX - b.left, ev.clientY - b.top));
    }, { passive: false });

    el.addEventListener('dblclick', function (ev) {
      var b = box();
      var factor = ev.shiftKey ? 1 / 1.6 : 1.6;
      aim(L().zoomBy(V.target, factor, ev.clientX - b.left, ev.clientY - b.top));
    });

    el.addEventListener('pointerdown', function (ev) {
      var onDesk = safe(function () { return !!ev.target.closest('.desk, .world-drawer'); }, false);
      var onHud = safe(function () { return !!ev.target.closest('[data-w]'); }, false);
      if (onDesk || onHud) return;                     /* desks click, controls act — neither pans */
      pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      inertia.vx = 0; inertia.vy = 0;
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var a = pointers[ids[0]], b2 = pointers[ids[1]];
        pinching = {
          dist: Math.max(1, Math.hypot(b2.x - a.x, b2.y - a.y)),
          mid: { x: (a.x + b2.x) / 2, y: (a.y + b2.y) / 2 },
          camera: { scale: V.camera.scale, x: V.camera.x, y: V.camera.y },
        };
        panning = null;
        el.setPointerCapture(ev.pointerId);
        return;
      }
      panning = { x: ev.clientX, y: ev.clientY, lastX: ev.clientX, lastY: ev.clientY, camera: { scale: V.camera.scale, x: V.camera.x, y: V.camera.y }, id: ev.pointerId };
      lastMove = 0;
      el.setPointerCapture(ev.pointerId);
      el.style.cursor = 'grabbing';
    });

    el.addEventListener('pointermove', function (ev) {
      if (!pointers[ev.pointerId]) return;
      pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var b = box();

      if (pinching && Object.keys(pointers).length >= 2) {
        var ids = Object.keys(pointers);
        var a = pointers[ids[0]], b2 = pointers[ids[1]];
        var dist = Math.max(1, Math.hypot(b2.x - a.x, b2.y - a.y));
        var mid = { x: (a.x + b2.x) / 2, y: (a.y + b2.y) / 2 };
        var scaled = L().zoomAbout(pinching.camera, pinching.camera.scale * (dist / pinching.dist), mid.x - b.left, mid.y - b.top);
        place(L().panBy(scaled, mid.x - pinching.mid.x, mid.y - pinching.mid.y));
        return;
      }

      if (!panning) return;
      var now = safe(function () { return ev.timeStamp; }, Date.now());
      var dx = ev.clientX - panning.x, dy = ev.clientY - panning.y;
      if (lastMove) {
        var dt = Math.max(1, now - lastMove);
        inertia.vx = (ev.clientX - panning.lastX) / dt * 12;    /* px per frame at ~60fps */
        inertia.vy = (ev.clientY - panning.lastY) / dt * 12;
      }
      panning.lastX = ev.clientX; panning.lastY = ev.clientY; lastMove = now;
      place(L().panBy(panning.camera, dx, dy));
    });

    function release(ev) {
      if (!pointers[ev.pointerId]) return;
      delete pointers[ev.pointerId];
      var left = Object.keys(pointers).length;
      if (left < 2) pinching = null;
      if (left === 1) {                                  /* pinch → drag: restart the pan from here */
        var id = Object.keys(pointers)[0];
        panning = { x: pointers[id].x, y: pointers[id].y, camera: { scale: V.camera.scale, x: V.camera.x, y: V.camera.y }, id: id, lastX: pointers[id].x, lastY: pointers[id].y };
        lastMove = 0;
        return;
      }
      if (left === 0) {
        panning = null;
        el.style.cursor = '';
        if (!reduced() && (Math.abs(inertia.vx) > 0.6 || Math.abs(inertia.vy) > 0.6)) run();
        else { inertia.vx = 0; inertia.vy = 0; }
      }
    }
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);

    el.addEventListener('click', function (ev) {
      if (safe(function () { return !!ev.target.closest('[data-w="close-drawer"]'); }, false)) { closeDrawer(); return; }
      var desk = safe(function () { return ev.target.closest('.desk'); }, null);
      if (desk) {
        var id = desk.getAttribute('data-desk');
        var found = seats().filter(function (s) { return s.desk.id === id; })[0];
        if (found) openDesk(found);
        return;
      }
      if (!safe(function () { return !!ev.target.closest('.world-drawer'); }, false)) closeDrawer();
    });

    el.addEventListener('keydown', function (ev) {
      var b = box();
      var step = 60;
      var actions = {
        ArrowLeft: function () { aim(L().panBy(V.target, step, 0)); },
        ArrowRight: function () { aim(L().panBy(V.target, -step, 0)); },
        ArrowUp: function () { aim(L().panBy(V.target, 0, step)); },
        ArrowDown: function () { aim(L().panBy(V.target, 0, -step)); },
        '+': function () { aim(L().zoomAbout(V.target, L().nextRung(V.target.scale, 1), b.width / 2, b.height / 2)); },
        '=': function () { aim(L().zoomAbout(V.target, L().nextRung(V.target.scale, 1), b.width / 2, b.height / 2)); },
        '-': function () { aim(L().zoomAbout(V.target, L().nextRung(V.target.scale, -1), b.width / 2, b.height / 2)); },
        '0': function () { fit(); },
        Escape: function () { closeDrawer(); },
      };
      var action = actions[ev.key];
      if (action) { ev.preventDefault(); action(); }
    });

    /* The toolbar is a sibling of the viewport, so it gets its own listener — and it stays alive
       while the plan is re-rendered underneath. */
    var hud = document.querySelector('.world-hud');
    if (hud) {
      hud.addEventListener('click', function (ev) {
        var control = safe(function () { return ev.target.closest('[data-w]'); }, null);
        if (!control) return;
        var action = control.getAttribute('data-w');
        var lib = L();
        if (action === 'fit') return fit();
        if (action === 'zoom-in') return zoomBy(1.5);
        if (action === 'zoom-out') return zoomBy(1 / 1.5);
        if (action === 'room') {
          var id = control.getAttribute('data-room');
          var found = lib.DEFAULT_LAYOUT.rooms.filter(function (r) { return r.id === id; })[0];
          if (found) showRoom(found);
          return;
        }
      });
    }

    /* A window listener outlives the view, so the previous one is removed before a new one is
       added — visiting the tab ten times must not leave ten handlers behind. */
    if (W.__worldResize) window.removeEventListener('resize', W.__worldResize);
    W.__worldResize = function () {
      if (!viewport()) return;
      if (room === null) { var b = box(); aim(L().fitCamera(b.width, b.height)); } else paint();
    };
    window.addEventListener('resize', W.__worldResize);
  }

  function queueInit() {
    var tries = 0;
    (function attempt() {
      if (!qs('#world-viewport')) { if (tries++ < 8) requestAnimationFrame(attempt); return; }
      WIRED = false;                 /* the demo re-renders #main on every navigation */
      pointers = {}; panning = null; pinching = null; inertia = { vx: 0, vy: 0 };
      wire();
      var b = box();
      var fitted = L().fitCamera(b.width, b.height);
      V.camera = fitted; V.target = fitted; room = null;
      paint();
      if (typeof ResizeObserver !== 'undefined') {
        if (W.__worldObserver) W.__worldObserver.disconnect();
        W.__worldObserver = new ResizeObserver(function () {
          if (!viewport()) { W.__worldObserver.disconnect(); return; }
          if (room === null) { var bx = box(); aim(L().fitCamera(bx.width, bx.height)); }
        });
        W.__worldObserver.observe(qs('#world-viewport'));
      }
    })();
  }

  /* ---- boot ----------------------------------------------------------------------------------- */
  if (IS_BROWSER) {
    W.worldView = worldView;
  } else {
    W.worldView = worldView;         /* the module-level surface is the same headless: verify.mjs
                                        renders the view in a bare VM to check both languages and
                                        all five data states, with no DOM at all */
    W.__world = { seats: seats, copy: copy, planDept: planDept, ROOM_WORDS: ROOM_WORDS };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { worldView: worldView };
})();
