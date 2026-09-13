// app.js — 交互逻辑

// ── 存储 ─────────────────────────────────────
const DAYS_KEY     = 'ftc_days';      // 每日训练记录
const DEFAULTS_KEY = 'ftc_defaults';  // 每个动作记忆的重量/组数/次数
const CHECKINS_KEY = 'ftc_checkins';  // 体重打卡
const DIET_KEY     = 'ftc_diet';      // 饮食记录
const USER_LINKS_KEY = 'ftc_user_links';          // 用户添加的动作外部链接
const USER_TEMPLATES_KEY = 'ftc_user_templates';  // 用户自定义训练模板
const POSTURE_KEY = 'ftc_posture_assessment';     // 体型体态评估
const GOALS_KEY = 'ftc_goals';                    // 阶段目标
const PHASE_NOTES_KEY = 'ftc_phase_notes';        // 阶段反馈 / 疼痛维护记录
const SPORT_PERF_KEY = 'ftc_sport_perf';          // 其他运动表现

let days     = {};
let defaults = {};
let checkins = [];
let dietData = {};  // { "YYYY-MM-DD": { meals:{...}, water:0 } }
let userLinks = {};      // { exId: [{ title, platform, url }] }
let userTemplates = {};  // { tmplId: template }
let postureData = null;
let goals = [];
let phaseNotes = [];
let sportPerf = [];
let _viewDate = null;  // null = 今日，string = 历史某天
let _dietDate = null;  // 饮食 tab 当前日期
let _editingTmplId = null;
let _pendingUpdateWorker = null;
const PRIMARY_TEMPLATE_KEYS = ['B', 'C', 'S', 'LEG', 'A'];
const LEGACY_TEMPLATE_KEYS = { L: 'A', AR: 'A' };

function loadAll() {
  try { days     = JSON.parse(localStorage.getItem(DAYS_KEY)     || '{}'); } catch { days = {}; }
  try { defaults = JSON.parse(localStorage.getItem(DEFAULTS_KEY) || '{}'); } catch { defaults = {}; }
  try { checkins = JSON.parse(localStorage.getItem(CHECKINS_KEY) || '[]'); } catch { checkins = []; }
  try { dietData = JSON.parse(localStorage.getItem(DIET_KEY)     || '{}'); } catch { dietData = {}; }
  try { userLinks = JSON.parse(localStorage.getItem(USER_LINKS_KEY) || '{}'); } catch { userLinks = {}; }
  try { userTemplates = JSON.parse(localStorage.getItem(USER_TEMPLATES_KEY) || '{}'); } catch { userTemplates = {}; }
  try { postureData = JSON.parse(localStorage.getItem(POSTURE_KEY) || 'null'); } catch { postureData = null; }
  try { goals = JSON.parse(localStorage.getItem(GOALS_KEY) || 'null') || defaultGoals(); } catch { goals = defaultGoals(); }
  try { phaseNotes = JSON.parse(localStorage.getItem(PHASE_NOTES_KEY) || '[]'); } catch { phaseNotes = []; }
  try { sportPerf = JSON.parse(localStorage.getItem(SPORT_PERF_KEY) || '[]'); } catch { sportPerf = []; }
  migrateOldTemplates();
}
function saveDays()     { localStorage.setItem(DAYS_KEY,     JSON.stringify(days));     }
function saveDefaults() { localStorage.setItem(DEFAULTS_KEY, JSON.stringify(defaults)); }
function saveCheckins() { localStorage.setItem(CHECKINS_KEY, JSON.stringify(checkins)); }
function saveDiet()     { localStorage.setItem(DIET_KEY,     JSON.stringify(dietData)); }
function saveUserLinks() { localStorage.setItem(USER_LINKS_KEY, JSON.stringify(userLinks)); }
function saveUserTemplates() { localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(userTemplates)); }
function savePosture() { localStorage.setItem(POSTURE_KEY, JSON.stringify(postureData)); }
function saveGoals() { localStorage.setItem(GOALS_KEY, JSON.stringify(goals)); }
function savePhaseNotes() { localStorage.setItem(PHASE_NOTES_KEY, JSON.stringify(phaseNotes)); }
function saveSportPerf() { localStorage.setItem(SPORT_PERF_KEY, JSON.stringify(sportPerf)); }

function getDietDay(d) {
  if (!dietData[d]) dietData[d] = { meals: {}, water: 0 };
  return dietData[d];
}
function getMeal(d, mealId) {
  const dd = getDietDay(d);
  if (!dd.meals[mealId]) dd.meals[mealId] = { note: '', cal: '' };
  return dd.meals[mealId];
}

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
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function attr(v) { return esc(v).replace(/`/g, '&#96;'); }
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
function allTemplates() { return Object.assign({}, TMPLS, userTemplates); }
function canonicalTemplateKey(id) { return LEGACY_TEMPLATE_KEYS[id] || id; }
function getTemplate(id) { return allTemplates()[canonicalTemplateKey(id)]; }
function defaultGoals() {
  return (typeof DEFAULT_GOALS !== 'undefined' ? DEFAULT_GOALS : []).map(g => Object.assign({}, g));
}
function defaultTemplateKey(id) {
  const t = userTemplates[id];
  const key = canonicalTemplateKey(id);
  return t && t.baseKey && TMPLS[t.baseKey] ? t.baseKey : (TMPLS[key] ? key : null);
}
function moduleLabel(sec) {
  return (typeof MODULE_LABELS !== 'undefined' && sec.module && MODULE_LABELS[sec.module]) ? MODULE_LABELS[sec.module] : (sec.title || '模块');
}
function cloneTemplate(t) {
  return JSON.parse(JSON.stringify(t));
}
function buildExFromInfo(exId, overrides) {
  const info = EX_INFO[exId] || {};
  const def = info.defaults || {};
  return Object.assign({
    id: exId,
    type: def.type || 'str',
    sets: def.sets || 4,
    reps: def.reps || 10,
    ru: def.unit || '次',
  }, overrides || {});
}
function getExerciseLinks(exId) {
  const info = EX_INFO[exId] || {};
  return [...(info.links || info.videos || []), ...((userLinks && userLinks[exId]) || [])];
}
function dateDiffDays(a, b) {
  return Math.ceil((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 86400000);
}
function scheduledItems() {
  return SCHEDULE.filter(x => x.rec);
}
function completedItems() {
  return scheduledItems().filter(x => isDayDone(x.d));
}
function phaseWindowLabel() {
  const official = PHASE.officialStartDate ? ` · 9月1日正式启用` : '';
  return `${fmtDate(PHASE.startDate)}-${fmtDate(PHASE.testEndDate || PHASE.endDate)} 测试${official}`;
}
function lastDoneTraining() {
  const ds = Object.keys(days).filter(d => days[d] && days[d].done).sort();
  if (!ds.length) return null;
  const d = ds[ds.length - 1];
  const t = getTemplate(days[d].tmpl);
  return { date: d, label: t ? `${t.icon} ${t.label}` : '自由训练' };
}
function cardioStats() {
  let sessions = 0;
  let minutes = 0;
  let hrs = [];
  Object.values(days).forEach(day => {
    if (!day || !day.done || !day.record) return;
    Object.entries(day.record).forEach(([exId, rec]) => {
      const info = EX_INFO[exId] || {};
      const isCardio = (info.defaults && info.defaults.type === 'cardio') || exId.includes('zone2') || exId === 'walk';
      if (!isCardio) return;
      const dur = parseFloat(rec.dur || rec.duration || 0);
      const hr = parseFloat(rec.hr || 0);
      if (dur > 0) { sessions += 1; minutes += dur; }
      if (hr > 0) hrs.push(hr);
    });
  });
  const avgHr = hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null;
  return { sessions, minutes, avgHr };
}
function moduleCompletionStats() {
  let corePlanned = 0, coreDone = 0, stretchPlanned = 0, stretchDone = 0;
  scheduledItems().forEach(item => {
    const day = days[item.d] || {};
    const t = getTemplate(day.tmpl || item.rec);
    if (!t) return;
    const hasCore = (t.sections || []).some(sec => sec.module === 'core');
    const hasStretch = (t.sections || []).some(sec => sec.module === 'stretch');
    if (hasCore) corePlanned += 1;
    if (hasStretch) stretchPlanned += 1;
    if (day.done && hasCore) coreDone += 1;
    if (day.done && hasStretch) stretchDone += 1;
  });
  return {
    core: corePlanned ? Math.round(coreDone / corePlanned * 100) : 0,
    stretch: stretchPlanned ? Math.round(stretchDone / stretchPlanned * 100) : 0,
  };
}
function linkStats() {
  const ids = Object.keys(EX_INFO || {});
  const linked = ids.filter(id => getExerciseLinks(id).length > 0).length;
  const userAdded = Object.values(userLinks || {}).reduce((sum, arr) => sum + (arr || []).length, 0);
  return { total: ids.length, linked, userAdded };
}
function latestPhaseNote() {
  if (!phaseNotes.length) return null;
  const sorted = [...phaseNotes].sort((a, b) => a.date.localeCompare(b.date));
  return sorted[sorted.length - 1];
}
function latestSport() {
  if (!sportPerf.length) return null;
  const sorted = [...sportPerf].sort((a, b) => a.date.localeCompare(b.date));
  return sorted[sorted.length - 1];
}
function migrateOldTemplates() {
  let changed = false;
  Object.entries(days).forEach(([d, day]) => {
    if (day && LEGACY_TEMPLATE_KEYS[day.tmpl]) {
      day.tmpl = LEGACY_TEMPLATE_KEYS[day.tmpl];
      changed = true;
    } else if (day && day.tmpl === 'U') {
      const sched = SCHEDULE.find(x => x.d === d);
      if (sched && sched.rec) {
        day.tmpl = sched.rec;
        changed = true;
      }
    }
  });
  if (changed) saveDays();
}

// ── 初始化 ───────────────────────────────────
function init() {
  _viewDate = null;
  loadAll();
  initThemeBySystemTime();
  renderHeader();
  initTabs();
  renderToday();
}

// 日间 07:00–18:59，夜间 19:00–06:59；系统时间变化时自动更新视觉主题。
function getSystemTheme() {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? 'day' : 'night';
}
function applyTheme(theme) {
  document.body.dataset.theme = theme;
  const color = theme === 'night' ? '#0c0d0f' : '#f5f5f7';
  const meta = document.getElementById('app-theme-color');
  if (meta) meta.setAttribute('content', color);
}
function initThemeBySystemTime() {
  let activeTheme = getSystemTheme();
  applyTheme(activeTheme);
  const refresh = () => {
    const nextTheme = getSystemTheme();
    if (nextTheme !== activeTheme) {
      activeTheme = nextTheme;
      applyTheme(activeTheme);
    }
  };
  window.setInterval(refresh, 60 * 1000);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('focus', refresh);
}

// ── Header ───────────────────────────────────
function renderHeader() {
  const now = new Date();
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
  document.querySelector('.hdr-title').textContent = '早上好，Tim';
  document.getElementById('phase-chip').textContent = `Phase ${PHASE.num}`;
  document.getElementById('hdr-sub').textContent = `星期${weekday} · ${now.getMonth() + 1}月${now.getDate()}日 · ${PHASE.label}`;
  const firstDate = SCHEDULE.length ? SCHEDULE[0].d : todayStr();
  const elapsed = Math.max(0, -dateDiffDays(firstDate, todayStr()));
  const weekEl = document.getElementById('profile-week');
  if (weekEl) weekEl.textContent = `第 ${Math.floor(elapsed / 7) + 1} 周`;
  const total = SCHEDULE.filter(x => x.rec).length;
  const done  = SCHEDULE.filter(x => isDayDone(x.d)).length;
  const remaining = Math.max(0, dateDiffDays(PHASE.testEndDate || PHASE.endDate, todayStr()));
  document.getElementById('hdr-stats').innerHTML = `
    <div class="stat"><span class="stat-v">${done}/${total}</span><span class="stat-l">已完成</span></div>
    <div class="stat"><span class="stat-v">${total ? Math.round(done/total*100) : 0}%</span><span class="stat-l">完成率</span></div>
    <div class="stat"><span class="stat-v">${remaining}</span><span class="stat-l">测试剩余</span></div>`;
}

// ── Tabs ─────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'today')    { _viewDate = null; renderToday(); }
      if (btn.dataset.tab === 'cal')      renderCal();
      if (btn.dataset.tab === 'exercises') renderExerciseLibrary();
      if (btn.dataset.tab === 'templates') renderTemplateLibrary();
      if (btn.dataset.tab === 'more')      renderProgress();
    });
  });
}

function renderExerciseLibrary() {
  const items = Object.entries(EX_INFO || {}).sort((a, b) => String(a[1].name).localeCompare(String(b[1].name), 'zh-CN'));
  document.getElementById('exercises-content').innerHTML = `<div class="library-wrap">
    <div class="section-head page-section-head"><div><span class="page-kicker">EXERCISE LIBRARY</span><h2>动作</h2></div><span>${items.length} 个动作</span></div>
    <div class="workout-list library-list">${items.map(([id, info]) => {
      const def = info.defaults || {};
      const meta = def.type === 'cardio' ? '有氧训练' : `${def.sets || 4} 组 × ${def.reps || 10} 次`;
      return `<button class="workout library-workout" onclick="openExModal('${attr(id)}')">
        <span class="workout-icon">⌁</span><span><strong class="workout-name">${esc(info.name || id)}</strong><small class="workout-meta">${esc(meta)}</small></span><span class="workout-result">查看说明 →</span>
      </button>`;
    }).join('')}</div>
  </div>`;
}

function renderTemplateLibrary() {
  const templates = [...PRIMARY_TEMPLATE_KEYS.map(k => [k, TMPLS[k]]), ...Object.entries(userTemplates)];
  const d = todayStr();
  document.getElementById('templates-content').innerHTML = `<div class="library-wrap">
    <div class="section-head page-section-head"><div><span class="page-kicker">TRAINING TEMPLATES</span><h2>模板</h2></div><span>${templates.length} 套</span></div>
    <div class="template-grid">${templates.map(([key, t]) => `<article class="template-card">
      <div class="template-card-icon">${esc(t.short || t.icon)}</div><div><h3>${esc(t.label)}</h3><p>${esc(t.sub || '训练模板')}</p></div>
      <button onclick="selectTmpl('${d}','${attr(key)}'); switchTab('today')">用于今日</button>
    </article>`).join('')}</div>
  </div>`;
}

function switchTab(tabName) {
  const button = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (button) button.click();
}

// ── Today Tab ────────────────────────────────
function renderToday(d) {
  if (d === null) _viewDate = null;
  else if (d !== undefined) _viewDate = d;
  const target  = _viewDate || todayStr();
  const isToday = target === todayStr();
  const sched   = SCHEDULE.find(x => x.d === target);
  const day     = getDay(target);

  // 自动应用推荐模板（只在用户还没选的时候）
  if (!day.tmpl && sched && sched.rec) {
    day.tmpl = sched.rec;
    saveDays();
  }

  const tmpl = day.tmpl;
  const tmplObj = getTemplate(tmpl);
  let html = `<div class="today-wrap">`;

  // 日期 + 模板标题行
  html += `<div class="today-hdr">
    <div class="today-date-row">
      ${!isToday ? `<button class="back-today-btn" onclick="renderToday(null)">← 今日</button>` : ''}
      <div class="today-date">${fmtDate(target)}${isToday ? ' · 今日' : ''}</div>
    </div>
    <div class="tmpl-row">`;

  if (tmpl && tmplObj) {
    const t = tmplObj;
    html += `<span class="tmpl-badge bg-${t.color}">${t.icon} ${esc(t.label)}</span>`;
    if (sched && sched.rec === tmpl) html += `<span class="jeff-rec">推荐模板</span>`;
    if (userTemplates[tmpl]) html += `<span class="user-tmpl-chip">我的模板</span>`;
  } else {
    html += `<span style="font-size:14px;color:var(--mu);font-weight:700;">自由日</span>`;
  }

  html += `<button class="switch-btn" onclick="openTmplPicker('${target}')">更换</button>
    </div></div>`;

  if (tmpl && tmplObj) {
    const t = tmplObj;
    const removed = new Set(day.removedExs || []);
    const added   = day.addedExs || [];
    const visibleCount = t.sections.reduce((sum, sec) => sum + sec.exs.filter(ex => !removed.has(ex.id)).length, 0) + added.length;
    const completedCount = day.done ? visibleCount : Object.keys(day.record || {}).filter(id => !removed.has(id)).length;
    const progress = visibleCount ? Math.min(100, Math.round(completedCount / visibleCount * 100)) : 0;

    html += `<section class="session-hero hero">
      <div class="session-copy">
        <div class="session-kicker hero-label">TODAY'S SESSION</div>
        <h2>${esc(t.label)}</h2>
        <p class="hero-copy">按计划完成今天的动作，保持稳定、控制和完整记录。还有 ${Math.max(0, visibleCount - completedCount)} 个动作。</p>
      </div>
      <div class="progress-ring ring" style="--progress:${progress}%"><div class="ring-value"><strong>${progress}%</strong><span>已完成</span></div></div>
    </section>
    <div class="today-metrics metrics">
      <div class="metric"><strong>${visibleCount}</strong><span>训练动作</span></div>
      <div class="metric"><strong>${t.sections.length}</strong><span>训练模块</span></div>
      <div class="metric"><strong>${day.done ? '完成' : '进行中'}</strong><span>今日状态</span></div>
    </div>`;

    html += `<div class="module-summary">
      ${(t.sections || []).map(sec => `<span>${esc(moduleLabel(sec))}</span>`).join('')}
    </div>`;
    html += `<details class="today-maintenance">
      <summary>模板维护</summary>
      <div class="today-tools">
        <button onclick="saveDayAsTemplate('${target}')">保存为我的模板</button>
        <button onclick="openTemplateEditor('${target}')">编辑模板动作</button>
        <button onclick="restoreDefaultTemplate('${target}')">恢复默认</button>
      </div>
    </details>`;
    html += `<div class="today-progress-line"><span>${visibleCount} 个动作</span><span>模块固定 · 当天可调整</span></div>`;

    html += `<div class="section-head workout-section-head"><h3>今日训练</h3><button onclick="openCompleteSheet('${target}')">查看记录 →</button></div>`;

    // 警告条
    if (t.warn) html += `<div class="warn-bar"><span>⚠️</span><span>${esc(t.warn)}</span></div>`;

    // 动作列表
    html += `<div class="workout-list">`;
    t.sections.forEach(sec => {
      let hasVisible = sec.exs.some(ex => !removed.has(ex.id));
      if (!hasVisible) return;
      html += `<div class="sec-hdr">
        <div class="sec-dot sec-dot-${sec.dot}"></div>
        <div class="sec-title"><span>${esc(moduleLabel(sec))}</span><strong>${esc(sec.title || moduleLabel(sec))}</strong></div>
      </div>`;
      sec.exs.forEach(ex => {
        if (removed.has(ex.id)) return;
        html += buildExCard(target, ex);
      });
    });

    // 额外添加的动作
    if (added.length > 0) {
      html += `<div class="sec-hdr">
        <div class="sec-dot sec-dot-gn"></div>
        <div class="sec-title"><span>自定义</span><strong>额外动作</strong></div>
      </div>`;
      added.forEach(exId => {
        if (EX_INFO[exId]) {
          const ex = buildExFromInfo(exId);
          html += buildExCard(target, ex, true);
        }
      });
    }
    html += `</div>`;

    // 已移除提示
    if (removed.size > 0) {
      html += `<div class="removed-bar">
        已移除 ${removed.size} 个动作
        <button onclick="restoreAllExs('${target}')">全部恢复</button>
      </div>`;
    }

    // 底部操作
    html += `<div class="rest-note">💡 组间休息：对 Siri 说"嘿 Siri，90秒计时"</div>`;
    html += `<button class="add-ex-btn" onclick="openAddEx('${target}')">＋ 添加动作</button>`;
    html += `<button class="complete-btn${day.done ? ' done' : ''}" onclick="openCompleteSheet('${target}')">
      ${day.done ? '✓ 已完成 · 查看/修改记录' : '今日训练完成 ✓'}
    </button>`;

  } else {
    // 未选模板
    html += `<div class="no-tmpl-card">
      <div class="no-tmpl-icon">🌿</div>
      <div class="no-tmpl-text">${isToday ? '今天' : fmtDate(target)}没有计划训练</div>
      <div class="no-tmpl-sub">想练的话可以选择训练类型</div>
      <button class="btn-pick-tmpl" onclick="openTmplPicker('${target}')">选择训练类型</button>
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
  const linkCount = getExerciseLinks(ex.id).length;
  const day = getDay(d);
  const completed = !!(day.done || (day.record && day.record[ex.id]));
  const result = completed && day.record && day.record[ex.id] && day.record[ex.id].w !== undefined
    ? `${day.record[ex.id].w} kg` : (completed ? '已记录' : '待开始');

  return `<div class="ex-card workout${completed ? ' done' : ''}" onclick="openExModal('${ex.id}')">
    <button class="workout-icon" onclick="event.stopPropagation();openCompleteSheet('${d}')">${completed ? '✓' : '＋'}</button>
    <div class="ex-main">
      <div class="ex-name workout-name">${esc(info.name)}</div>
      <div class="ex-meta workout-meta">${esc(meta)}</div>
      ${ex.note ? `<div class="ex-note">💡 ${esc(ex.note)}</div>` : ''}
    </div>
    <div class="workout-result"><strong>${esc(result)}</strong><span>${completed ? '已完成' : '—'}</span></div>
    <button class="ex-rm-btn" aria-label="移除 ${esc(info.name)}" onclick="event.stopPropagation();removeEx('${d}','${ex.id}',${!!isAdded})">移除</button>
    <div class="ex-btns">
      ${linkCount ? `<button class="ex-link-btn" onclick="openExModal('${ex.id}')">↗ ${linkCount}</button>` : ''}
      <button class="ex-q-btn" onclick="openExModal('${ex.id}')">说明</button>
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
  const templates = [
    ...PRIMARY_TEMPLATE_KEYS.map(k => [k, TMPLS[k]]),
    ...Object.entries(userTemplates),
  ];
  templates.forEach(([k, t]) => {
    const isCurr = day.tmpl === k;
    html += `<button class="tmpl-opt-btn${isCurr ? ' active-' + t.color : ''}" onclick="selectTmpl('${d}','${k}')">
      <span class="to-icon">${esc(t.short || t.icon)}</span>
      <div class="to-text">
        <div class="to-label">${esc(t.label)}${userTemplates[k] ? '<span class="mini-chip">我的</span>' : ''}</div>
        <div class="to-sub">${esc(t.sub || '')}</div>
      </div>
    </button>`;
  });
  html += `<button class="tmpl-opt-rest" onclick="selectTmpl('${d}',null)">😴 休息日 · 不训练</button>`;
  html += `</div>`;
  document.getElementById('tmpl-pick-body').innerHTML = html;
  openSheet('tmpl-ov');
}

function calendarLabelForTemplate(tmpl) {
  const t = getTemplate(tmpl);
  return t ? (t.calendarLabel || t.label) : '休息';
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
  const t = getTemplate(tmpl);
  if (!tmpl || !t) return;

  const removed = new Set(day.removedExs || []);
  const rec     = day.record || {};

  let html = `<div class="cs-date">${fmtDate(d)} · ${t.icon} ${esc(t.label)}</div>`;

  // 力量动作
  const strExs = [];
  t.sections.forEach(sec => sec.exs.forEach(ex => {
    if (!removed.has(ex.id) && ex.type === 'str') strExs.push(ex);
  }));
  (day.addedExs || []).forEach(exId => {
    if (EX_INFO[exId]) strExs.push(buildExFromInfo(exId));
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
        <div class="cs-ex-name">${esc(info.name)}</div>
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
        <div class="cs-ex-name">${esc(info.name)}</div>
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
    onchange="csSetNotes('${d}',this.value)">${esc(day.notes || '')}</textarea>`;

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
  const t = getTemplate(tmpl);

  // 把今日填写的值更新到 defaults（下次自动带入）
  if (tmpl && t && day.record) {
    t.sections.forEach(sec => sec.exs.forEach(ex => {
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
  const links = getExerciseLinks(exId);

  let h = `<div class="m-name">${esc(info.name)}</div><div class="m-type">${esc(info.tl)}</div>`;
  h += `<div class="muscle-chips">
    ${(info.p || []).map(m => `<span class="mc-chip mc-p">${esc(m)}</span>`).join('')}
    ${(info.s || []).map(m => `<span class="mc-chip mc-s">${esc(m)}</span>`).join('')}
  </div>`;

  if (info.purpose) {
    h += `<div class="purpose-box"><div class="m-sec-title">训练目的</div><div>${esc(info.purpose)}</div></div>`;
  }

  if (info.tech && info.tech.length) {
    h += `<div class="m-sec-title">动作要领</div><ul class="tech-ul">`;
    info.tech.forEach((t, i) => { h += `<li><span class="t-n t-ng">${i+1}</span><span>${esc(t)}</span></li>`; });
    h += `</ul>`;
  }
  if (info.err && info.err.length) {
    h += `<div class="m-sec-title">常见错误</div><ul class="err-ul">`;
    info.err.forEach((e, i) => { h += `<li><span class="t-n t-na">${i+1}</span><span>${esc(e)}</span></li>`; });
    h += `</ul>`;
  }
  if (info.warn) h += `<div class="m-warn-box">⚠️ ${esc(info.warn)}</div>`;

  h += `<div class="link-panel">
    <div class="link-panel-hdr">
      <div class="m-sec-title">外部链接</div>
      <button class="mini-action" onclick="toggleLinkForm()">＋ 添加</button>
    </div>
    <div id="link-list">${renderLinkList(exId, links)}</div>
    <div class="link-form" id="link-form" style="display:none">
      <input id="link-title" placeholder="标题，例如 小红书示范">
      <select id="link-platform">
        <option value="小红书">小红书</option>
        <option value="YouTube">YouTube</option>
        <option value="其他">其他</option>
      </select>
      <input id="link-url" placeholder="粘贴链接 URL">
      <button onclick="addExerciseLink('${exId}')">保存链接</button>
    </div>
  </div>`;

  document.getElementById('ex-modal-body').innerHTML = h;
  openSheet('ex-modal-ov');
}

function renderLinkList(exId, links) {
  if (!links.length) return `<div class="link-empty">还没有链接，可以把小红书或 YouTube 教程贴进来。</div>`;
  const defaultCount = ((EX_INFO[exId] && (EX_INFO[exId].links || EX_INFO[exId].videos)) || []).length;
  return links.map((v, i) => {
    const canDelete = i >= defaultCount;
    const userIdx = i - defaultCount;
    return `<div class="video-link-row">
      <a href="${attr(v.url)}" target="_blank" rel="noopener" class="video-link-btn">
        <span>${esc(v.platform || v.label || '链接')}</span>
        <strong>${esc(v.title || v.label || v.url)}</strong>
      </a>
      ${canDelete ? `<button class="link-del-btn" onclick="deleteExerciseLink('${exId}',${userIdx})">删除</button>` : ''}
    </div>`;
  }).join('');
}

function toggleLinkForm() {
  const el = document.getElementById('link-form');
  if (el) el.style.display = el.style.display === 'none' ? 'grid' : 'none';
}

function addExerciseLink(exId) {
  const title = document.getElementById('link-title').value.trim();
  const platform = document.getElementById('link-platform').value;
  const url = document.getElementById('link-url').value.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    showToast('请粘贴 http/https 链接');
    return;
  }
  if (!userLinks[exId]) userLinks[exId] = [];
  userLinks[exId].push({ title: title || platform + '教程', platform, url });
  saveUserLinks();
  openExModal(exId);
  showToast('链接已保存 ✓');
}

function deleteExerciseLink(exId, idx) {
  if (!userLinks[exId]) return;
  userLinks[exId].splice(idx, 1);
  if (!userLinks[exId].length) delete userLinks[exId];
  saveUserLinks();
  openExModal(exId);
  showToast('链接已删除');
}

// ── Add Exercise ─────────────────────────────
const EXERCISE_GROUPS = [
  { module: 'main', label: '主训练' },
  { module: 'warmup', label: '热身' },
  { module: 'core', label: '核心' },
  { module: 'cardio', label: '有氧' },
  { module: 'stretch', label: '拉伸/收尾' },
  { module: 'other', label: '其他' },
];

function exerciseModuleMap() {
  const map = new Map();
  EXERCISE_GROUPS.filter(group => group.module !== 'other').forEach(group => {
    Object.values(TMPLS || {}).forEach(template => {
      (template.sections || [])
        .filter(section => section.module === group.module)
        .forEach(section => (section.exs || []).forEach(exercise => {
          if (!map.has(exercise.id)) map.set(exercise.id, group.module);
        }));
    });
  });
  return map;
}

function groupAvailableExercises(activeIds) {
  const moduleById = exerciseModuleMap();
  const buckets = new Map(EXERCISE_GROUPS.map(group => [group.module, []]));
  Object.entries(EX_INFO || {}).forEach(([id, info]) => {
    if (activeIds.has(id)) return;
    const module = moduleById.get(id) || 'other';
    buckets.get(module).push({ id, name: info.name || id, tl: info.tl || '' });
  });
  return EXERCISE_GROUPS
    .map(group => ({ module: group.module, label: group.label, items: buckets.get(group.module) }))
    .filter(group => group.items.length);
}

function openAddEx(d) {
  const day     = getDay(d);
  const removed = new Set(day.removedExs || []);
  const activeIds = new Set();

  // 收集今天已有的动作
  const t = getTemplate(day.tmpl);
  if (day.tmpl && t) {
    t.sections.forEach(sec => sec.exs.forEach(ex => {
      if (!removed.has(ex.id)) activeIds.add(ex.id);
    }));
  }
  (day.addedExs || []).forEach(id => activeIds.add(id));

  const groups = groupAvailableExercises(activeIds);

  if (groups.length === 0) {
    document.getElementById('add-ex-list').innerHTML = `<div class="add-ex-empty">所有动作已在计划中</div>`;
  } else {
    document.getElementById('add-ex-list').innerHTML = groups.map(group => `<section class="add-ex-group">
      <div class="add-ex-group-title"><strong>${esc(group.label)}</strong><span>${group.items.length} 个</span></div>
      ${group.items.map(e => `<button class="add-ex-item" onclick="addExToday('${d}','${attr(e.id)}')">
        <span class="add-ex-name">${esc(e.name)}</span>
        <span class="add-ex-tl">${esc(e.tl)}</span>
      </button>`).join('')}
    </section>`).join('');
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

// ── User Templates ───────────────────────────
function buildVisibleTemplateForDay(d) {
  const day = getDay(d);
  const base = getTemplate(day.tmpl);
  if (!base) return null;
  const next = cloneTemplate(base);
  const removed = new Set(day.removedExs || []);
  next.sections = next.sections.map(sec => Object.assign({}, sec, {
    exs: (sec.exs || []).filter(ex => !removed.has(ex.id)),
  })).filter(sec => sec.exs.length);
  if ((day.addedExs || []).length) {
    let main = next.sections.find(sec => sec.module === 'main') || next.sections[0];
    if (!main) {
      main = { module: 'main', title: '主训练', dot: next.color || 'gn', exs: [] };
      next.sections.push(main);
    }
    day.addedExs.forEach(exId => {
      if (EX_INFO[exId] && !main.exs.some(ex => ex.id === exId)) main.exs.push(buildExFromInfo(exId));
    });
  }
  return next;
}

function saveDayAsTemplate(d) {
  const day = getDay(d);
  const baseKey = defaultTemplateKey(day.tmpl) || day.tmpl;
  const base = buildVisibleTemplateForDay(d);
  if (!base) return;
  const id = 'user_' + Date.now();
  userTemplates[id] = Object.assign(base, {
    label: '我的' + (base.label || '训练'),
    sub: (base.sub || '') + ' · 自定义',
    baseKey,
  });
  saveUserTemplates();
  day.tmpl = id;
  day.removedExs = [];
  day.addedExs = [];
  saveDays();
  renderToday();
  showToast('已保存为我的模板 ✓');
}

function ensureEditableTemplate(d) {
  const day = getDay(d);
  if (!day.tmpl || !getTemplate(day.tmpl)) return null;
  if (userTemplates[day.tmpl]) return day.tmpl;
  saveDayAsTemplate(d);
  return getDay(d).tmpl;
}

function openTemplateEditor(d) {
  const tmplId = ensureEditableTemplate(d);
  if (!tmplId) return;
  _editingTmplId = tmplId;
  renderTemplateEditor(d);
  openSheet('tmpl-edit-ov');
}

function templateExerciseIds(template) {
  return new Set((template && template.sections || []).flatMap(section =>
    (section.exs || []).map(exercise => exercise.id)
  ));
}

function availableExerciseEntries(template) {
  const used = templateExerciseIds(template);
  return Object.entries(EX_INFO).filter(([id]) => !used.has(id));
}

function renderTemplateEditor(d) {
  const t = userTemplates[_editingTmplId];
  if (!t) return;
  const available = availableExerciseEntries(t);
  let html = `<div class="tmpl-edit-note">正在编辑：${esc(t.label)}。默认模板不会被覆盖。</div>`;
  (t.sections || []).forEach((sec, si) => {
    html += `<div class="te-sec">
      <div class="te-sec-title">${esc(moduleLabel(sec))}<span>${esc(sec.title || '')}</span></div>`;
    (sec.exs || []).forEach((ex, ei) => {
      const info = EX_INFO[ex.id] || { name: ex.id, tl: '' };
      html += `<div class="te-row">
        <div><div class="te-name">${esc(info.name)}</div><div class="te-meta">${esc(info.tl)}</div></div>
        <div class="te-actions">
          <button onclick="moveTemplateEx(${si},${ei},-1,'${d}')">↑</button>
          <button onclick="moveTemplateEx(${si},${ei},1,'${d}')">↓</button>
          <button onclick="removeTemplateEx(${si},${ei},'${d}')">删</button>
        </div>
      </div>`;
    });
    html += `</div>`;
  });
  html += `<div class="te-add">${available.length ? `
    <select id="te-module">${(t.sections || []).map((sec, i) => `<option value="${i}">${esc(moduleLabel(sec))}</option>`).join('')}</select>
    <select id="te-ex">${available.map(([id, info]) => `<option value="${id}">${esc(info.name)}</option>`).join('')}</select>
    <button onclick="addTemplateEx('${d}')">添加到模板</button>` :
    `<span class="te-empty">动作库中的动作已全部加入</span>`}
  </div>
  <button class="cs-save-btn" onclick="finishTemplateEdit('${d}')">完成编辑 ✓</button>`;
  document.getElementById('tmpl-edit-body').innerHTML = html;
}

function moveTemplateEx(secIdx, exIdx, dir, d) {
  const sec = userTemplates[_editingTmplId].sections[secIdx];
  const to = exIdx + dir;
  if (!sec || to < 0 || to >= sec.exs.length) return;
  const [item] = sec.exs.splice(exIdx, 1);
  sec.exs.splice(to, 0, item);
  saveUserTemplates();
  renderTemplateEditor(d);
}

function removeTemplateEx(secIdx, exIdx, d) {
  const sec = userTemplates[_editingTmplId].sections[secIdx];
  if (!sec) return;
  sec.exs.splice(exIdx, 1);
  saveUserTemplates();
  renderTemplateEditor(d);
}

function addTemplateEx(d) {
  const secIdx = +document.getElementById('te-module').value;
  const exId = document.getElementById('te-ex').value;
  const template = userTemplates[_editingTmplId];
  const sec = template && template.sections[secIdx];
  if (!sec || !EX_INFO[exId] || templateExerciseIds(template).has(exId)) return;
  sec.exs.push(buildExFromInfo(exId));
  saveUserTemplates();
  renderTemplateEditor(d);
}

function finishTemplateEdit(d) {
  closeSheet('tmpl-edit-ov');
  renderToday(d);
  showToast('模板已更新 ✓');
}

function restoreDefaultTemplate(d) {
  const day = getDay(d);
  const fallback = defaultTemplateKey(day.tmpl) || (SCHEDULE.find(x => x.d === d) || {}).rec || null;
  day.tmpl = fallback;
  day.removedExs = [];
  day.addedExs = [];
  saveDays();
  renderToday(d);
  showToast('已恢复默认模板');
}

// ── Diet Tab ──────────────────────────────────
const MEALS = [
  { id: 'breakfast', name: '早餐', icon: '🌅', time: '06:00–10:00' },
  { id: 'lunch',     name: '午餐', icon: '☀️',  time: '11:00–14:00' },
  { id: 'dinner',    name: '晚餐', icon: '🌙', time: '17:00–21:00' },
  { id: 'snack',     name: '加餐', icon: '🍎', time: '其他时间' },
];

function moveDietDate(delta) {
  const d   = new Date(_dietDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  _dietDate = `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
  renderDiet();
}

function renderDiet() {
  if (!_dietDate) _dietDate = todayStr();
  const d      = _dietDate;
  const today  = todayStr();
  const isToday = d === today;
  const dd     = getDietDay(d);

  // 日期显示
  const [y, m, dy] = d.split('-');
  const dateLabel  = isToday ? '今天' : `${+m}月${+dy}日`;

  // 总热量
  const totalCal = MEALS.reduce((sum, meal) => {
    const cal = parseFloat(dd.meals[meal.id]?.cal || 0);
    return sum + (isNaN(cal) ? 0 : cal);
  }, 0);

  let html = `<div class="diet-wrap">
    <div class="diet-nav">
      <button class="diet-nav-btn" onclick="moveDietDate(-1)">‹</button>
      <div style="text-align:center">
        <div class="diet-nav-date">${dateLabel}</div>
        ${!isToday ? `<div class="diet-nav-today" style="font-size:10px;color:var(--mu)">${+m}月${+dy}日</div>` : ''}
      </div>
      <button class="diet-nav-btn" onclick="moveDietDate(1)">›</button>
    </div>

    <div class="diet-body">
      <div class="diet-summary">
        <div class="diet-sum-item">
          <div class="diet-sum-v highlight">${totalCal > 0 ? totalCal : '—'}</div>
          <div class="diet-sum-l">总热量kcal</div>
        </div>
        <div class="diet-sum-item">
          <div class="diet-sum-v">${dd.water || 0}</div>
          <div class="diet-sum-l">饮水杯</div>
        </div>
        <div class="diet-sum-item">
          <div class="diet-sum-v">${MEALS.filter(m => dd.meals[m.id]?.note || dd.meals[m.id]?.cal).length}</div>
          <div class="diet-sum-l">已记餐次</div>
        </div>
      </div>

      <div class="diet-ai-tip">💡 拍照记录食物：本轮先保留文字与热量记录，照片入口后续单独做。</div>`;

  // 餐次卡片
  MEALS.forEach(meal => {
    const data = dd.meals[meal.id] || {};
    html += `<div class="meal-card">
      <div class="meal-hdr">
        <div class="meal-hdr-left">
          <span class="meal-icon">${meal.icon}</span>
          <div>
            <div class="meal-name">${meal.name}</div>
            <div class="meal-time">${meal.time}</div>
          </div>
        </div>
        <span class="meal-cal-badge">${data.cal ? data.cal + ' kcal' : '— kcal'}</span>
      </div>
      <div class="meal-body">
        <textarea class="meal-note-inp" placeholder="吃了什么？（可以不填，拍照即可）"
          onchange="updMeal('${d}','${meal.id}','note',this.value)">${data.note || ''}</textarea>
        <div class="meal-cal-row">
          <label>预估热量</label>
          <input type="number" inputmode="numeric" class="meal-cal-inp"
            value="${data.cal || ''}" placeholder="0"
            onchange="updMeal('${d}','${meal.id}','cal',this.value)">
          <span style="font-size:12px;color:var(--mu)">kcal</span>
        </div>
      </div>
    </div>`;
  });

  // 饮水
  html += `<div class="water-card">
    <div class="water-title">💧 今日饮水</div>
    <div class="water-cups" id="water-cups">
      ${[1,2,3,4,5,6,7,8].map(i => `
        <div class="water-cup${(dd.water || 0) >= i ? ' filled' : ''}"
          onclick="toggleWater('${d}',${i})">💧</div>`).join('')}
    </div>
    <div class="water-note">每杯 250ml · 目标 8 杯（2000ml）· 已喝 ${(dd.water || 0) * 250}ml</div>
  </div>

  </div></div>`;

  document.getElementById('diet-content').innerHTML = html;
}

function updMeal(d, mealId, field, value) {
  const m = getMeal(d, mealId);
  m[field] = value;
  saveDiet();
  // 更新汇总数字（不整体重渲染，避免失焦）
  const dd = getDietDay(d);
  const totalCal = MEALS.reduce((sum, meal) => {
    const cal = parseFloat(dd.meals[meal.id]?.cal || 0);
    return sum + (isNaN(cal) ? 0 : cal);
  }, 0);
  const sumEl = document.querySelector('.diet-sum-v.highlight');
  if (sumEl) sumEl.textContent = totalCal > 0 ? totalCal : '—';
  const badgeEls = document.querySelectorAll('.meal-cal-badge');
  const mealIdx = MEALS.findIndex(m => m.id === mealId);
  if (mealIdx >= 0 && badgeEls[mealIdx]) {
    badgeEls[mealIdx].textContent = value ? value + ' kcal' : '— kcal';
  }
}

function toggleWater(d, cups) {
  const dd = getDietDay(d);
  dd.water = (dd.water || 0) === cups ? cups - 1 : cups;
  saveDiet();
  // 更新水杯显示
  document.querySelectorAll('.water-cup').forEach((el, i) => {
    el.classList.toggle('filled', i < dd.water);
  });
  document.querySelector('.water-note').textContent =
    `每杯 250ml · 目标 8 杯（2000ml）· 已喝 ${dd.water * 250}ml`;
  const sumEl = document.querySelectorAll('.diet-sum-v')[1];
  if (sumEl) sumEl.textContent = dd.water || 0;
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
      const t = getTemplate(tmpl);
      const baseKey = defaultTemplateKey(tmpl) || tmpl;
      let cls = ['dc', d === today ? 'today' : '', done ? 'done-day' : '', t ? 't'+baseKey : ''].filter(Boolean).join(' ');
      const [, , dy] = d.split('-');
      html += `<div class="${cls}" onclick="goToDay('${d}')">
        <div class="dc-num">${+dy}</div>
        <div class="dc-module">${esc(calendarLabelForTemplate(tmpl))}</div>
        ${done ? `<span class="dc-done">✅</span>` : ''}
      </div>`;
    });
    html += `</div>`;
  });

  html += `</div>`;
  document.getElementById('cal-content').innerHTML = html;
}

function goToDay(d) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelector('.tab[data-tab="today"]').classList.add('active');
  document.getElementById('tab-today').classList.add('active');
  renderToday(d);
}

// ── Progress Tab ─────────────────────────────
function renderProgress() {
  const total       = SCHEDULE.filter(x => x.rec).length;
  const done        = SCHEDULE.filter(x => isDayDone(x.d)).length;
  const rate        = total ? Math.round(done / total * 100) : 0;
  const lastCheckin = checkins.length ? checkins[checkins.length - 1] : null;
  const lastTraining = lastDoneTraining();
  const cardio = cardioStats();
  const moduleStats = moduleCompletionStats();
  const links = linkStats();
  const lastPain = latestPhaseNote();
  const lastSport = latestSport();
  const nextEvalDays = Math.max(0, dateDiffDays(PHASE.testEndDate || PHASE.endDate, todayStr()));

  // 热图
  const heatHtml = SCHEDULE.map(item => {
    const d    = item.d;
    const done = isDayDone(d);
    const tmpl = done ? ((days[d] && days[d].tmpl) || item.rec) : null;
    const t = getTemplate(tmpl);
    const [, , dy] = d.split('-');
    let cls = 'hm-day ';
    if (done && t) cls += 'done-' + t.color;
    else if (item.rec) cls += 'planned';
    else cls += 'rest';
    return `<div class="${cls}" title="${fmtDate(d)}">
      <span class="hm-num">${+dy}</span>
      ${done ? '<span class="hm-check">✓</span>' : ''}
    </div>`;
  }).join('');

  let html = `<div class="prog-wrap">
    <div class="data-hero">
      <div>
        <div class="data-kicker">Phase ${PHASE.num} 数据底座</div>
        <div class="data-title">${esc(PHASE.label)}</div>
        <div class="data-sub">${esc(PHASE.focus || '训练与身体状态统一记录')} · 周复盘在 Codex 对话中完成</div>
      </div>
      <div class="data-date">
        <span>${fmtDate(PHASE.testEndDate || PHASE.endDate)}</span>
        <small>下次评估</small>
      </div>
    </div>

    <div class="prog-summary">
      <div class="ps-item"><span class="ps-v">${done}/${total}</span><span class="ps-l">完成</span></div>
      <div class="ps-item"><span class="ps-v">${rate}%</span><span class="ps-l">完成率</span></div>
      <div class="ps-item"><span class="ps-v">${lastCheckin ? lastCheckin.w || '—' : '—'}</span><span class="ps-l">体重kg</span></div>
      <div class="ps-item"><span class="ps-v">${lastCheckin ? lastCheckin.bf || '—' : '—'}</span><span class="ps-l">体脂%</span></div>
    </div>

    <div class="goal-card">
      <div class="section-head">
        <div>
          <div class="hm-title">目标与计划</div>
          <div class="muted-line">可衡量指标优先，力量外观目标暂不作为核心 KPI。</div>
        </div>
        <button class="mini-action" onclick="resetGoals()">恢复默认</button>
      </div>
      <div class="goal-list">
        ${goals.map((g, i) => `<div class="goal-row">
          <div class="goal-name">${esc(g.name)}</div>
          <div class="goal-target">${esc(g.target)}</div>
          <div class="goal-metric">${esc(g.metric)} · ${esc(g.cadence || '')}</div>
          <button onclick="editGoal(${i})">编辑</button>
        </div>`).join('')}
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric-card"><span>${lastTraining ? `${fmtDate(lastTraining.date)} ${esc(lastTraining.label)}` : '—'}</span><small>最近训练</small></div>
      <div class="metric-card"><span>${cardio.minutes || 0} 分钟</span><small>Zone 2 / 有氧记录</small></div>
      <div class="metric-card"><span>${cardio.avgHr ? cardio.avgHr + ' bpm' : '—'}</span><small>平均有氧心率</small></div>
      <div class="metric-card"><span>${moduleStats.core}% / ${moduleStats.stretch}%</span><small>核心 / 拉伸完成率</small></div>
      <div class="metric-card"><span>${lastPain ? painSummary(lastPain) : '—'}</span><small>疼痛维护</small></div>
      <div class="metric-card"><span>${lastSport ? `${fmtDate(lastSport.date)} ${esc(lastSport.type)}` : '—'}</span><small>最近其他运动</small></div>
    </div>

    <div class="hm-card">
      <div class="hm-title">训练完成情况</div>
      <div class="hm-legend">
        <span class="hm-legend-dot hm-gn"></span>L有氧
        <span class="hm-legend-dot hm-bl"></span>B背
        <span class="hm-legend-dot hm-rd"></span>C胸
        <span class="hm-legend-dot hm-am"></span>S肩
        <span class="hm-legend-dot hm-br"></span>AR
        <span class="hm-legend-dot hm-planned"></span>未完成
        <span class="hm-legend-dot hm-rest"></span>休息
      </div>
      <div class="hm-grid">${heatHtml}</div>
    </div>

    ${renderPhaseNoteCard(nextEvalDays)}
    ${renderSportPerfCard()}

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

    ${renderPostureAssessment()}

    ${renderBackupCard(links)}


    <div class="history-card">
      <div class="history-hdr">📈 历史记录</div>
      ${renderCheckinHistory()}
    </div>
  </div>`;

  document.getElementById('progress-content').innerHTML = html;
}

function renderPostureAssessment() {
  const p = postureData || {};
  const last = p.date ? `上次评估：${fmtDate(p.date)}` : '还没有记录';
  return `<div class="posture-card">
    <div class="posture-hdr">
      <div>
        <div class="cc-title">体态评估</div>
        <div class="posture-sub">${esc(last)} · 用于调整训练，不替代医疗诊断</div>
      </div>
      <button class="mini-action" onclick="savePostureData()">保存</button>
    </div>
    <div class="posture-grid">
      <label>肩/圆肩<input id="pa-shoulder" value="${attr(p.shoulder || '')}" placeholder="例：右肩卡顿、圆肩轻微"></label>
      <label>骨盆/髋<input id="pa-hip" value="${attr(p.hip || '')}" placeholder="例：左髋紧、久坐后酸"></label>
      <label>膝/下肢<input id="pa-knee" value="${attr(p.knee || '')}" placeholder="例：右膝内侧屈膝酸"></label>
      <label>右肘/前臂<input id="pa-elbow" value="${attr(p.elbow || '')}" placeholder="例：推胸时右肘发紧"></label>
    </div>
    <textarea id="pa-notes" class="cc-notes posture-notes" placeholder="照片观察、站姿、左右差异、训练中发现的问题...">${esc(p.notes || '')}</textarea>
    <div class="posture-actions">
      <span>建议动作：腕伸/屈肌拉伸、前臂旋前旋后、90/90髋转换、终末伸膝。</span>
    </div>
  </div>`;
}

function painSummary(note) {
  if (!note || !note.pain) return '—';
  const p = note.pain;
  return `腰${p.lumbar || '—'} 肩${p.shoulder || '—'} 膝${p.knee || '—'} 肘${p.elbow || '—'}`;
}

function renderPhaseNoteCard(nextEvalDays) {
  const last = latestPhaseNote();
  return `<div class="phase-card">
    <div class="section-head">
      <div>
        <div class="hm-title">疼痛维护与阶段反馈</div>
        <div class="muted-line">距离 7月15日测试评估还有 ${nextEvalDays} 天；这里记录训练后或每周的关节状态。</div>
      </div>
    </div>
    <div class="pain-grid">
      <label>日期<input type="date" id="pn-date" value="${todayStr()}"></label>
      <label>腰髋<input type="number" min="1" max="10" id="pn-lumbar" placeholder="1-10"></label>
      <label>右肩<input type="number" min="1" max="10" id="pn-shoulder" placeholder="1-10"></label>
      <label>右膝<input type="number" min="1" max="10" id="pn-knee" placeholder="1-10"></label>
      <label>右肘<input type="number" min="1" max="10" id="pn-elbow" placeholder="1-10"></label>
    </div>
    <textarea id="pn-note" class="cc-notes" placeholder="触发动作、疼痛变化、需要降级的动作、恢复感..."></textarea>
    <button class="btn-save" onclick="savePhaseNote()">保存维护记录</button>
    <div class="mini-history">${last ? `上次：${fmtDate(last.date)} · ${painSummary(last)} · ${esc(last.note || '无备注')}` : '还没有阶段维护记录'}</div>
  </div>`;
}

function savePhaseNote() {
  const d = document.getElementById('pn-date').value || todayStr();
  const entry = {
    date: d,
    pain: {
      lumbar: document.getElementById('pn-lumbar').value,
      shoulder: document.getElementById('pn-shoulder').value,
      knee: document.getElementById('pn-knee').value,
      elbow: document.getElementById('pn-elbow').value,
    },
    note: document.getElementById('pn-note').value.trim(),
  };
  phaseNotes.push(entry);
  savePhaseNotes();
  renderProgress();
  showToast('阶段维护记录已保存 ✓');
}

function renderSportPerfCard() {
  const last = latestSport();
  return `<div class="sport-card">
    <div class="section-head">
      <div>
        <div class="hm-title">其他运动表现</div>
        <div class="muted-line">徒步、游泳、羽毛球、骑行先记录基线，9月后纳入正式评估。</div>
      </div>
    </div>
    <div class="sport-grid">
      <label>日期<input type="date" id="sp-date" value="${todayStr()}"></label>
      <label>类型<select id="sp-type">
        <option value="徒步">徒步</option>
        <option value="游泳">游泳</option>
        <option value="羽毛球">羽毛球</option>
        <option value="骑行">骑行</option>
        <option value="其他">其他</option>
      </select></label>
      <label>时长<input type="number" id="sp-dur" placeholder="分钟"></label>
      <label>距离<input type="number" step="0.1" id="sp-dist" placeholder="km"></label>
      <label>均心率<input type="number" id="sp-hr" placeholder="bpm"></label>
      <label>疲劳<input type="number" min="1" max="10" id="sp-fatigue" placeholder="1-10"></label>
    </div>
    <textarea id="sp-note" class="cc-notes" placeholder="表现、疼痛、第二天恢复、装备或场地备注..."></textarea>
    <button class="btn-save" onclick="saveSportPerfData()">保存运动表现</button>
    <div class="mini-history">${last ? `上次：${fmtDate(last.date)} · ${esc(last.type)} · ${last.duration || '—'}分钟 · 疲劳${last.fatigue || '—'}` : '还没有其他运动记录'}</div>
  </div>`;
}

function saveSportPerfData() {
  const entry = {
    date: document.getElementById('sp-date').value || todayStr(),
    type: document.getElementById('sp-type').value,
    duration: document.getElementById('sp-dur').value,
    distance: document.getElementById('sp-dist').value,
    avgHr: document.getElementById('sp-hr').value,
    fatigue: document.getElementById('sp-fatigue').value,
    note: document.getElementById('sp-note').value.trim(),
  };
  sportPerf.push(entry);
  saveSportPerf();
  renderProgress();
  showToast('运动表现已保存 ✓');
}

function editGoal(idx) {
  const g = goals[idx];
  if (!g) return;
  const target = prompt('目标描述', g.target || '');
  if (target === null) return;
  const metric = prompt('衡量指标', g.metric || '');
  if (metric === null) return;
  goals[idx] = Object.assign({}, g, { target: target.trim(), metric: metric.trim() });
  saveGoals();
  renderProgress();
  showToast('目标已更新 ✓');
}

function resetGoals() {
  goals = defaultGoals();
  saveGoals();
  renderProgress();
  showToast('已恢复默认目标');
}

function renderBackupCard(links) {
  const payload = buildBackupPayload();
  const itemCount = Object.keys(payload.data).length;
  return `<div class="backup-card">
    <div class="section-head">
      <div>
        <div class="hm-title">发布更新与数据备份</div>
        <div class="muted-line">版本 ${esc(appVersion())} · 固定网址同步功能和模板；个人记录仍按设备本地保存。</div>
      </div>
    </div>
    <div class="backup-stats">
      <span>${itemCount} 类数据</span>
      <span>${links.linked}/${links.total} 个动作有链接</span>
      <span>${links.userAdded} 条自定义链接</span>
    </div>
    <div class="sync-note">
      <strong>同步边界</strong>
      <span>Jeff 接收入口：电脑启动本地服务后打开 http://127.0.0.1:8787。手机或其他网址请先导出 JSON，传到电脑后在该入口点击“导入 JSON 给 Jeff”，不会覆盖电脑浏览器记录。localhost 只指当前设备，不能从手机连接电脑。不同网址的浏览器记录独立，首次请导入已有备份。</span>
      <span>代码、模板、动作库：发布到同一网址后，电脑和手机刷新即可更新。</span>
      <span>训练记录、外部链接、我的模板：暂存在本机浏览器，跨设备请导出/导入 JSON。</span>
    </div>
    <div class="backup-actions">
      <button onclick="checkAppUpdate()">检查更新</button>
      <button id="reload-update-btn" class="hidden" onclick="applyAppUpdate()">重新加载新版</button>
      <button onclick="syncToJeff()">同步给 Jeff</button>
      <button onclick="document.getElementById('jeff-file').click()">导入 JSON 给 Jeff</button>
      <input id="jeff-file" type="file" accept="application/json,.json" style="display:none" onchange="importJsonToJeff(this.files && this.files[0]); this.value=''">
      <button onclick="exportBackup()">导出备份</button>
      <button onclick="document.getElementById('backup-file').click()">导入备份</button>
      <input id="backup-file" type="file" accept="application/json,.json" style="display:none" onchange="importBackup(this.files && this.files[0])">
    </div>
  </div>`;
}

function appVersion() {
  return typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'local';
}

window.onAppUpdateReady = function(worker) {
  _pendingUpdateWorker = worker;
  const btn = document.getElementById('reload-update-btn');
  if (btn) btn.classList.remove('hidden');
  showToast('新版已准备好');
};

function checkAppUpdate() {
  if (!navigator.serviceWorker || !window.ftcSwReg) {
    showToast('当前浏览器没有启用更新服务');
    return;
  }
  window.ftcSwReg.update().then(() => {
    if (_pendingUpdateWorker) {
      const btn = document.getElementById('reload-update-btn');
      if (btn) btn.classList.remove('hidden');
      showToast('发现新版，可重新加载');
    } else {
      showToast('已检查更新');
    }
  }).catch(() => showToast('检查更新失败'));
}

function applyAppUpdate() {
  if (_pendingUpdateWorker) {
    _pendingUpdateWorker.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
}

function buildBackupPayload() {
  return {
    app: 'fitness_app',
    version: 1,
    appVersion: appVersion(),
    exportedAt: new Date().toISOString(),
    phase: PHASE,
    data: {
      [DAYS_KEY]: days,
      [DEFAULTS_KEY]: defaults,
      [CHECKINS_KEY]: checkins,
      [DIET_KEY]: dietData,
      [USER_LINKS_KEY]: userLinks,
      [USER_TEMPLATES_KEY]: userTemplates,
      [POSTURE_KEY]: postureData,
      [GOALS_KEY]: goals,
      [PHASE_NOTES_KEY]: phaseNotes,
      [SPORT_PERF_KEY]: sportPerf,
    },
  };
}

async function syncToJeff(payload = buildBackupPayload()) {
  if (!['http://127.0.0.1:8787', 'http://localhost:8787'].includes(location.origin)) {
    showToast('请导出 JSON，传到电脑后在本地 Jeff 入口导入');
    return;
  }
  try {
    const response = await fetch('/api/fitness/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error('sync_failed');
    showToast('已同步给 Jeff ✓');
  } catch (error) {
    showToast('同步失败：请确认本地服务已启动，且文件为 Fitness 导出备份');
  }
}

async function importJsonToJeff(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    showToast('导入失败：文件超过 10 MB');
    return;
  }
  try {
    await syncToJeff(JSON.parse(await file.text()));
  } catch (error) {
    showToast('导入失败：JSON 无法读取');
  }
}

function exportBackup() {
  const payload = buildBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fitness-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('备份已导出');
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const data = payload.data || payload;
      const keys = [DAYS_KEY, DEFAULTS_KEY, CHECKINS_KEY, DIET_KEY, USER_LINKS_KEY, USER_TEMPLATES_KEY, POSTURE_KEY, GOALS_KEY, PHASE_NOTES_KEY, SPORT_PERF_KEY];
      keys.forEach(k => {
        if (data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k]));
      });
      loadAll();
      renderHeader();
      renderProgress();
      showToast('备份已导入 ✓');
    } catch (e) {
      showToast('导入失败：JSON 无法读取');
    }
  };
  reader.readAsText(file);
}

function savePostureData() {
  postureData = {
    date: todayStr(),
    shoulder: document.getElementById('pa-shoulder').value.trim(),
    hip: document.getElementById('pa-hip').value.trim(),
    knee: document.getElementById('pa-knee').value.trim(),
    elbow: document.getElementById('pa-elbow').value.trim(),
    notes: document.getElementById('pa-notes').value.trim(),
  };
  savePosture();
  renderProgress();
  showToast('体态评估已保存 ✓');
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
['ex-modal-ov', 'complete-ov', 'tmpl-ov', 'add-ex-ov', 'tmpl-edit-ov'].forEach(id => {
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
