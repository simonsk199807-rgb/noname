// app.js — 交互逻辑

// ── 存储 ─────────────────────────────────────
const DAYS_KEY     = 'ftc_days';      // 每日训练记录
const DEFAULTS_KEY = 'ftc_defaults';  // 每个动作记忆的重量/组数/次数
const CHECKINS_KEY = 'ftc_checkins';  // 体重打卡

let days     = {};
let defaults = {};
let checkins = [];

function loadAll() {
  try { days     = JSON.parse(localStorage.getItem(DAYS_KEY)     || '{}'); } catch { days = {}; }
  try { defaults = JSON.parse(localStorage.getItem(DEFAULTS_KEY) || '{}'); } catch { defaults = {}; }
  try { checkins = JSON.parse(localStorage.getItem(CHECKINS_KEY) || '[]'); } catch { checkins = []; }
}
function saveDays()     { localStorage.setItem(DAYS_KEY,     JSON.stringify(days));     }
function saveDefaults() { localStorage.setItem(DEFAULTS_KEY, JSON.stringify(defaults)); }
function saveCheckins() { localStorage.setItem(CHECKINS_KEY, JSON.stringify(checkins)); }

function getDay(d) {
  if (!days[d]) days[d] = { tmpl: null, done: false, removedExs: [], addedExs: [], record: {}, lumbar: null, notes: '' };
  return days[d];
}

// ── 工具函数 ─────────────────────────────────
function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${p2(n.getMonth()+1)}-${p2(n.getDate())}`;
}
function p2(n) { return String(n).padStart(2, '0'); }
function fmtDate(ds) {
  if (!ds) return '';
  const [, m, d] = ds.split('-');
  return `${+m}月${+d}日`;
}
function wdayIdx(ds) {
  const d = new Date(ds + 'T00:00:00').getDay();
  return d === 0 ? 6 : d - 1;
}
function isDayDone(d) { return !!(days[d] && days[d].done); }

// ── 初始化 ───────────────────────────────────
function init() {
  loadAll();
  renderHeader();
  initTabs();
  renderToday();
}

// ── Header ───────────────────────────────────
function renderHeader() {
  document.getElementById('phase-chip').textContent = `Phase ${PHASE.num}`;
  document.getElementById('hdr-sub').textContent = `${PHASE.label} · 至 ${fmtDate(PHASE.endDate)}`;
  const total = SCHEDULE.filter(x => x.rec).length;
  const done  = SCHEDULE.filter(x => isDayDone(x.d)).length;
  const remaining = Math.max(0, Math.ceil((new Date(PHASE.endDate + 'T00:00:00') - new Date()) / 86400000));
  document.getElementById('hdr-stats').innerHTML = `
    <div class="stat"><span class="stat-v">${done}/${total}</span><span class="stat-l">已完成</span></div>
    <div class="stat"><span class="stat-v">${total ? Math.round(done/total*100) : 0}%</span><span class="stat-l">完成率</span></div>
    <div class="stat"><span class="stat-v">${remaining}</span><span class="stat-l">剩余天</span></div>`;
}

// ── Tabs ─────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'cal')      renderCal();
      if (btn.dataset.tab === 'progress') renderProgress();
    });
  });
}

// ── Today Tab ────────────────────────────────
function renderToday() {
  const today = todayStr();
  const sched = SCHEDULE.find(x => x.d === today);
  const day   = getDay(today);

  // 自动应用 Jeff 推荐模板（只在用户还没选的时候）
  if (!day.tmpl && sched && sched.rec) {
    day.tmpl = sched.rec;
    saveDays();
  }

  const tmpl = day.tmpl;
  let html = `<div class="today-wrap">`;

  // 日期 + 模板标题行
  html += `<div class="today-hdr">
    <div class="today-date">${fmtDate(today)} ${today === todayStr() ? '· 今日' : ''}</div>
    <div class="tmpl-row">`;

  if (tmpl && TMPLS[tmpl]) {
    const t = TMPLS[tmpl];
    html += `<span class="tmpl-badge bg-${t.color}">${t.icon} ${t.label}</span>`;
    if (sched && sched.rec === tmpl) html += `<span class="jeff-rec">⚡ Jeff 推荐</span>`;
  } else {
    html += `<span style="font-size:14px;color:var(--mu);font-weight:700;">自由日</span>`;
  }

  html += `<button class="switch-btn" onclick="openTmplPicker('${today}')">更换</button>
    </div></div>`;

  if (tmpl && TMPLS[tmpl]) {
    const t = TMPLS[tmpl];
    const removed = new Set(day.removedExs || []);
    const added   = day.addedExs || [];

    // 警告条
    if (t.warn) html += `<div class="warn-bar"><span>⚠️</span><span>${t.warn}</span></div>`;

    // 动作列表
    t.sections.forEach(sec => {
      let hasVisible = sec.exs.some(ex => !removed.has(ex.id));
      if (!hasVisible) return;
      html += `<div class="sec-hdr">
        <div class="sec-dot sec-dot-${sec.dot}"></div>
        <div class="sec-title">${sec.title}</div>
      </div>`;
      sec.exs.forEach(ex => {
        if (removed.has(ex.id)) return;
        html += buildExCard(today, ex);
      });
    });

    // 额外添加的动作
    if (added.length > 0) {
      html += `<div class="sec-hdr">
        <div class="sec-dot sec-dot-gn"></div>
        <div class="sec-title">额外动作</div>
      </div>`;
      added.forEach(exId => {
        if (EX_INFO[exId]) {
          const ex = { id: exId, type: 'str', sets: 4, reps: 10, ru: '次' };
          html += buildExCard(today, ex, true);
        }
      });
    }

    // 已移除提示
    if (removed.size > 0) {
      html += `<div class="removed-bar">
        已移除 ${removed.size} 个动作
        <button onclick="restoreAllExs('${today}')">全部恢复</button>
      </div>`;
    }

    // 底部操作
    html += `<div class="rest-note">💡 组间休息：对 Siri 说"嘿 Siri，90秒计时"</div>`;
    html += `<button class="add-ex-btn" onclick="openAddEx('${today}')">＋ 添加动作</button>`;
    html += `<button class="complete-btn${day.done ? ' done' : ''}" onclick="openCompleteSheet('${today}')">
      ${day.done ? '✓ 已完成 · 查看/修改记录' : '今日训练完成 ✓'}
    </button>`;

  } else {
    // 未选模板
    html += `<div class="no-tmpl-card">
      <div class="no-tmpl-icon">🌿</div>
      <div class="no-tmpl-text">今天没有计划训练</div>
      <div class="no-tmpl-sub">想练的话可以选择训练类型</div>
      <button class="btn-pick-tmpl" onclick="openTmplPicker('${today}')">选择训练类型</button>
    </div>`;
  }

  html += `</div>`;
  document.getElementById('today-content').innerHTML = html;
}

// ── Exercise Card ────────────────────────────
function buildExCard(d, ex, isAdded) {
  const info   = EX_INFO[ex.id] || { name: ex.id, tl: '' };
  const dflt   = defaults[ex.id] || {};
  const sets   = dflt.sets !== undefined ? dflt.sets : (ex.sets || 4);
  const reps   = dflt.reps !== undefined ? dflt.reps : (ex.reps || 10);
  const w      = dflt.w !== undefined ? dflt.w : null;

  let meta = '';
  if (ex.type === 'str') {
    meta = `${sets}组 × ${reps}${ex.ru || '次'}${w !== null ? ' · ' + w + ' kg' : ''}`;
  } else if (ex.type === 'cardio') {
    meta = [ex.durLabel, ex.hrLabel].filter(Boolean).join(' · ');
  } else {
    meta = ex.dur || (ex.sets ? `${ex.sets} × ${ex.reps || '?'} ${ex.ru || ''}` : '');
  }

  return `<div class="ex-card">
    <div class="ex-main">
      <div class="ex-name">${info.name}</div>
      <div class="ex-meta">${meta}</div>
      ${ex.note ? `<div class="ex-note">💡 ${ex.note}</div>` : ''}
    </div>
    <div class="ex-btns">
      <button class="ex-q-btn" onclick="openExModal('${ex.id}')">?</button>
      <button class="ex-rm-btn" onclick="removeEx('${d}','${ex.id}',${!!isAdded})">✕</button>
    </div>
  </div>`;
}

// ── Remove / Restore ─────────────────────────
function removeEx(d, exId, isAdded) {
  const day = getDay(d);
  if (isAdded) {
    day.addedExs = (day.addedExs || []).filter(id => id !== exId);
  } else {
    if (!day.removedExs) day.removedExs = [];
    if (!day.removedExs.includes(exId)) day.removedExs.push(exId);
  }
  saveDays();
  renderToday();
}

function restoreAllExs(d) {
  getDay(d).removedExs = [];
  saveDays();
  renderToday();
}

// ── Template Picker ──────────────────────────
function openTmplPicker(d) {
  const day = getDay(d);
  let html = `<div class="tmpl-options">`;
  Object.entries(TMPLS).forEach(([k, t]) => {
    const isCurr = day.tmpl === k;
    html += `<button class="tmpl-opt-btn${isCurr ? ' active-' + t.color : ''}" onclick="selectTmpl('${d}','${k}')">
      <span class="to-icon">${t.icon}</span>
      <div class="to-text">
        <div class="to-label">${t.label}</div>
        <div class="to-sub">${t.sub}</div>
      </div>
    </button>`;
  });
  html += `<button class="tmpl-opt-rest" onclick="selectTmpl('${d}',null)">😴 休息日 · 不训练</button>`;
  html += `</div>`;
  document.getElementById('tmpl-pick-body').innerHTML = html;
  openSheet('tmpl-ov');
}

function selectTmpl(d, tmpl) {
  const day = getDay(d);
  day.tmpl = tmpl;
  day.removedExs = [];
  day.addedExs   = [];
  saveDays();
  closeSheet('tmpl-ov');
  renderToday();
}

// ── Completion Sheet ─────────────────────────
function openCompleteSheet(d) {
  const day  = getDay(d);
  const tmpl = day.tmpl;
  if (!tmpl || !TMPLS[tmpl]) return;

  const t       = TMPLS[tmpl];
  const removed = new Set(day.removedExs || []);
  const rec     = day.record || {};

  let html = `<div class="cs-date">${fmtDate(d)} · ${t.icon} ${t.label}</div>`;

  // 力量动作
  const strExs = [];
  t.sections.forEach(sec => sec.exs.forEach(ex => {
    if (!removed.has(ex.id) && ex.type === 'str') strExs.push(ex);
  }));
  (day.addedExs || []).forEach(exId => {
    if (EX_INFO[exId]) strExs.push({ id: exId, type: 'str', sets: 4, reps: 10, ru: '次' });
  });

  if (strExs.length) {
    html += `<div class="cs-sec-title">力量训练</div>`;
    strExs.forEach(ex => {
      const info = EX_INFO[ex.id] || { name: ex.id };
      const dflt = defaults[ex.id] || {};
      const recEx = rec[ex.id] || {};
      const w    = recEx.w    !== undefined ? recEx.w    : (dflt.w    !== undefined ? dflt.w    : '');
      const sets = recEx.sets !== undefined ? recEx.sets : (dflt.sets || ex.sets || 4);
      const reps = recEx.reps !== undefined ? recEx.reps : (dflt.reps || ex.reps || 10);
      html += `<div class="cs-ex-row">
        <div class="cs-ex-name">${info.name}</div>
        <div class="cs-fields">
          <div class="cs-field">
            <input type="number" step="0.5" inputmode="decimal" value="${w}" placeholder="重量"
              class="cs-inp" onchange="updRec('${d}','${ex.id}','w',this.value)">
            <span class="cs-unit">kg</span>
          </div>
          <div class="cs-field">
            <input type="number" inputmode="numeric" value="${sets}"
              class="cs-inp cs-inp-sm" onchange="updRec('${d}','${ex.id}','sets',this.value)">
            <span class="cs-unit">组</span>
          </div>
          <div class="cs-field">
            <input type="number" inputmode="numeric" value="${reps}"
              class="cs-inp cs-inp-sm" onchange="updRec('${d}','${ex.id}','reps',this.value)">
            <span class="cs-unit">次</span>
          </div>
        </div>
      </div>`;
    });
  }

  // 有氧动作
  const cardioExs = [];
  t.sections.forEach(sec => sec.exs.forEach(ex => {
    if (!removed.has(ex.id) && ex.type === 'cardio') cardioExs.push(ex);
  }));
  if (cardioExs.length) {
    html += `<div class="cs-sec-title">有氧训练</div>`;
    cardioExs.forEach(ex => {
      const info  = EX_INFO[ex.id] || { name: ex.id };
      const recEx = rec[ex.id] || {};
      html += `<div class="cs-ex-row">
        <div class="cs-ex-name">${info.name}</div>
        <div class="cs-fields">
          <div class="cs-field">
            <input type="number" inputmode="numeric" value="${recEx.dur || ''}" placeholder="时长"
              class="cs-inp cs-inp-sm" onchange="updRec('${d}','${ex.id}','dur',this.value)">
            <span class="cs-unit">分钟</span>
          </div>
          <div class="cs-field">
            <input type="number" inputmode="numeric" value="${recEx.hr || ''}" placeholder="心率"
              class="cs-inp cs-inp-sm" onchange="updRec('${d}','${ex.id}','hr',this.value)">
            <span class="cs-unit">bpm</span>
          </div>
        </div>
      </div>`;
    });
  }

  // 腰椎状态
  html += `<div class="cs-sec-title">腰椎状态（1无感 · 10明显）</div>
  <div class="lumbar-wrap">
    <div class="lr-row" id="lr-row">
      ${[1,2,3,4,5,6,7,8,9,10].map(i => {
        const active = day.lumbar === i;
        const cls = active ? (i <= 3 ? 'al' : i <= 6 ? 'am' : 'ah') : '';
        return `<button class="lr-btn ${cls}" data-v="${i}" onclick="csSetLumbar('${d}',${i},this)">${i}</button>`;
      }).join('')}
    </div>
  </div>`;

  // 备注
  html += `<div class="cs-sec-title">训练备注</div>
  <textarea class="cs-notes" placeholder="今日感受、调整等..."
    onchange="csSetNotes('${d}',this.value)">${day.notes || ''}</textarea>`;

  html += `<button class="cs-save-btn" onclick="saveCompletion('${d}')">保存记录 ✓</button>`;

  document.getElementById('complete-body').innerHTML = html;
  openSheet('complete-ov');
}

function updRec(d, exId, field, value) {
  const day = getDay(d);
  if (!day.record) day.record = {};
  if (!day.record[exId]) day.record[exId] = {};
  day.record[exId][field] = (field === 'w') ? parseFloat(value) : parseInt(value, 10);
  saveDays();
}

function csSetLumbar(d, v, btn) {
  const day   = getDay(d);
  day.lumbar  = day.lumbar === v ? null : v;
  saveDays();
  document.querySelectorAll('#lr-row .lr-btn').forEach(b => {
    const bv = +b.dataset.v;
    b.className = 'lr-btn';
    if (day.lumbar === bv) b.classList.add(bv <= 3 ? 'al' : bv <= 6 ? 'am' : 'ah');
  });
}

function csSetNotes(d, v) {
  getDay(d).notes = v;
  saveDays();
}

function saveCompletion(d) {
  const day  = getDay(d);
  const tmpl = day.tmpl;

  // 把今日填写的值更新到 defaults（下次自动带入）
  if (tmpl && TMPLS[tmpl] && day.record) {
    TMPLS[tmpl].sections.forEach(sec => sec.exs.forEach(ex => {
      if (ex.type === 'str' && day.record[ex.id]) {
        const r = day.record[ex.id];
        defaults[ex.id] = Object.assign(defaults[ex.id] || {}, {
          w:    r.w    !== undefined ? r.w    : (defaults[ex.id] || {}).w,
          sets: r.sets !== undefined ? r.sets : (ex.sets || 4),
          reps: r.reps !== undefined ? r.reps : (ex.reps || 10),
        });
      }
    }));
    // 额外动作也更新
    (day.addedExs || []).forEach(exId => {
      if (day.record[exId]) {
        const r = day.record[exId];
        defaults[exId] = Object.assign(defaults[exId] || {}, {
          w:    r.w    !== undefined ? r.w    : (defaults[exId] || {}).w,
          sets: r.sets || 4,
          reps: r.reps || 10,
        });
      }
    });
    saveDefaults();
  }

  day.done = true;
  saveDays();
  closeSheet('complete-ov');
  renderHeader();
  renderToday();
  showToast('记录已保存 ✓');
}

// ── Exercise Info Modal ──────────────────────
function openExModal(exId) {
  const info = EX_INFO[exId];
  if (!info) return;

  let h = `<div class="m-name">${info.name}</div><div class="m-type">${info.tl}</div>`;
  h += `<div class="muscle-chips">
    ${(info.p || []).map(m => `<span class="mc-chip mc-p">${m}</span>`).join('')}
    ${(info.s || []).map(m => `<span class="mc-chip mc-s">${m}</span>`).join('')}
  </div>`;

  if (info.tech && info.tech.length) {
    h += `<div class="m-sec-title">动作要领</div><ul class="tech-ul">`;
    info.tech.forEach((t, i) => { h += `<li><span class="t-n t-ng">${i+1}</span><span>${t}</span></li>`; });
    h += `</ul>`;
  }
  if (info.err && info.err.length) {
    h += `<div class="m-sec-title">常见错误</div><ul class="err-ul">`;
    info.err.forEach((e, i) => { h += `<li><span class="t-n t-na">${i+1}</span><span>${e}</span></li>`; });
    h += `</ul>`;
  }
  if (info.warn) h += `<div class="m-warn-box">⚠️ ${info.warn}</div>`;
  if (info.videos && info.videos.length) {
    h += `<div class="m-sec-title">参考视频</div>`;
    info.videos.forEach(v => {
      h += `<a href="${v.url}" target="_blank" class="video-link-btn">▶ ${v.label}</a>`;
    });
  }

  document.getElementById('ex-modal-body').innerHTML = h;
  openSheet('ex-modal-ov');
}

// ── Add Exercise ─────────────────────────────
function openAddEx(d) {
  const day     = getDay(d);
  const removed = new Set(day.removedExs || []);
  const activeIds = new Set();

  // 收集今天已有的动作
  if (day.tmpl && TMPLS[day.tmpl]) {
    TMPLS[day.tmpl].sections.forEach(sec => sec.exs.forEach(ex => {
      if (!removed.has(ex.id)) activeIds.add(ex.id);
    }));
  }
  (day.addedExs || []).forEach(id => activeIds.add(id));

  // 所有未在今天计划中的动作
  const available = Object.entries(EX_INFO)
    .filter(([id]) => !activeIds.has(id))
    .map(([id, info]) => ({ id, name: info.name, tl: info.tl }));

  if (available.length === 0) {
    document.getElementById('add-ex-list').innerHTML = `<div class="add-ex-empty">所有动作已在计划中</div>`;
  } else {
    document.getElementById('add-ex-list').innerHTML = available.map(e =>
      `<div class="add-ex-item" onclick="addExToday('${d}','${e.id}')">
        <div class="add-ex-name">${e.name}</div>
        <div class="add-ex-tl">${e.tl}</div>
      </div>`
    ).join('');
  }
  openSheet('add-ex-ov');
}

function addExToday(d, exId) {
  const day = getDay(d);
  if (!day.addedExs) day.addedExs = [];
  if (!day.addedExs.includes(exId)) day.addedExs.push(exId);
  saveDays();
  closeSheet('add-ex-ov');
  renderToday();
}

// ── Calendar Tab ─────────────────────────────
function renderCal() {
  const today = todayStr();
  const weeks = [];
  let cur = [];

  SCHEDULE.forEach(item => {
    const idx = wdayIdx(item.d);
    if (cur.length === 0) for (let i = 0; i < idx; i++) cur.push(null);
    cur.push(item);
    if (cur.length === 7) { weeks.push(cur); cur = []; }
  });
  if (cur.length) { while (cur.length < 7) cur.push(null); weeks.push(cur); }

  let html = `<div class="cal-wrap">
    <div class="cal-wday-hdr">
      ${['一','二','三','四','五','六','日'].map(w => `<div class="wh">周${w}</div>`).join('')}
    </div>`;

  weeks.forEach(week => {
    html += `<div class="cal-week">`;
    week.forEach(item => {
      if (!item) { html += `<div class="dc empty"></div>`; return; }
      const d    = item.d;
      const done = isDayDone(d);
      const tmpl = (days[d] && days[d].tmpl) || item.rec;
      let cls = ['dc', d === today ? 'today' : '', done ? 'done-day' : '', tmpl && TMPLS[tmpl] ? 't'+tmpl : ''].filter(Boolean).join(' ');
      const [, , dy] = d.split('-');
      html += `<div class="${cls}">
        <div class="dc-num">${+dy}</div>
        ${tmpl && TMPLS[tmpl] ? `<div class="dc-badge">${TMPLS[tmpl].icon}</div>` : '<div class="dc-label">休</div>'}
        ${done ? `<span class="dc-done">✅</span>` : ''}
      </div>`;
    });
    html += `</div>`;
  });

  html += `</div>`;
  document.getElementById('cal-content').innerHTML = html;
}

// ── Progress Tab ─────────────────────────────
function renderProgress() {
  const total       = SCHEDULE.filter(x => x.rec).length;
  const done        = SCHEDULE.filter(x => isDayDone(x.d)).length;
  const rate        = total ? Math.round(done / total * 100) : 0;
  const lastCheckin = checkins.length ? checkins[checkins.length - 1] : null;

  // 热图
  const heatHtml = SCHEDULE.map(item => {
    const d    = item.d;
    const done = isDayDone(d);
    const tmpl = done ? ((days[d] && days[d].tmpl) || item.rec) : null;
    const [, , dy] = d.split('-');
    let cls = 'hm-day ';
    if (done && tmpl && TMPLS[tmpl]) cls += 'done-' + TMPLS[tmpl].color;
    else if (item.rec) cls += 'planned';
    else cls += 'rest';
    return `<div class="${cls}" title="${fmtDate(d)}">
      <span class="hm-num">${+dy}</span>
      ${done ? '<span class="hm-check">✓</span>' : ''}
    </div>`;
  }).join('');

  let html = `<div class="prog-wrap">
    <div class="prog-summary">
      <div class="ps-item"><span class="ps-v">${done}/${total}</span><span class="ps-l">完成</span></div>
      <div class="ps-item"><span class="ps-v">${rate}%</span><span class="ps-l">完成率</span></div>
      <div class="ps-item"><span class="ps-v">${lastCheckin ? lastCheckin.w || '—' : '—'}</span><span class="ps-l">体重kg</span></div>
      <div class="ps-item"><span class="ps-v">${lastCheckin ? lastCheckin.bf || '—' : '—'}</span><span class="ps-l">体脂%</span></div>
    </div>

    <div class="hm-card">
      <div class="hm-title">训练完成情况</div>
      <div class="hm-legend">
        <span class="hm-legend-dot hm-gn"></span>L类
        <span class="hm-legend-dot hm-bl"></span>U类
        <span class="hm-legend-dot hm-br"></span>AR
        <span class="hm-legend-dot hm-planned"></span>未完成
        <span class="hm-legend-dot hm-rest"></span>休息
      </div>
      <div class="hm-grid">${heatHtml}</div>
    </div>

    <div class="checkin-card">
      <div class="cc-title">📝 体重打卡</div>
      <div class="cc-grid">
        <div class="cc-field"><label>日期</label><input type="date" id="ci-date" value="${todayStr()}"></div>
        <div class="cc-field"><label>体重 (kg)</label><input type="number" step="0.1" id="ci-weight" placeholder="${lastCheckin ? lastCheckin.w || '80' : '80'}"></div>
        <div class="cc-field"><label>体脂率 (%)</label><input type="number" step="0.5" id="ci-bf"     placeholder="${lastCheckin ? lastCheckin.bf || '20' : '20'}"></div>
        <div class="cc-field"><label>腰围 (cm)</label><input type="number" step="0.5" id="ci-waist"  placeholder="${lastCheckin ? lastCheckin.waist || '85' : '85'}"></div>
      </div>
      <textarea class="cc-notes" id="ci-notes" placeholder="感受、变化、睡眠等..."></textarea>
      <button class="btn-save" onclick="saveCheckinData()">保存打卡</button>
    </div>

    <div class="history-card">
      <div class="history-hdr">📈 历史记录</div>
      ${renderCheckinHistory()}
    </div>
  </div>`;

  document.getElementById('progress-content').innerHTML = html;
}

function renderCheckinHistory() {
  if (!checkins.length) return `<div class="history-empty">还没有打卡记录<br>每周一早晨称重后填写</div>`;
  return `<table class="history-table">
    <thead><tr><th>日期</th><th>体重</th><th>体脂</th><th>腰围</th></tr></thead>
    <tbody>${[...checkins].reverse().slice(0, 12).map(c => `<tr>
      <td>${fmtDate(c.date)}</td>
      <td>${c.w || '—'} kg</td>
      <td>${c.bf || '—'} %</td>
      <td>${c.waist || '—'} cm</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function saveCheckinData() {
  const d     = document.getElementById('ci-date').value;
  const w     = document.getElementById('ci-weight').value;
  const bf    = document.getElementById('ci-bf').value;
  const waist = document.getElementById('ci-waist').value;
  const notes = document.getElementById('ci-notes').value;
  if (!d) { showToast('请选择日期'); return; }
  const idx = checkins.findIndex(x => x.date === d);
  const entry = { date: d, w, bf, waist, notes };
  if (idx >= 0) checkins[idx] = entry; else checkins.push(entry);
  saveCheckins();
  renderProgress();
  showToast('打卡已保存 ✓');
}

// ── Sheet Utils ──────────────────────────────
function openSheet(id)  { document.getElementById(id).classList.add('open'); }
function closeSheet(id) { document.getElementById(id).classList.remove('open'); }

// 点击蒙层关闭
['ex-modal-ov', 'complete-ov', 'tmpl-ov', 'add-ex-ov'].forEach(id => {
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { if (e.target === el) closeSheet(id); });
  });
});
document.getElementById('ex-modal-close').addEventListener('click', () => closeSheet('ex-modal-ov'));

// ── Toast ────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Start ────────────────────────────────────
init();
