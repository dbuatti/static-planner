// ── GUARDED STORAGE ──────────────────────────────────────────
// localStorage throws in private mode, with cookies disabled, or on a
// corrupt profile. Every read/write below goes through these wrappers so the
// planner still renders when storage is unavailable.
var LS = {
  get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del: function (k) { try { localStorage.removeItem(k); return true; } catch (e) { return false; } }
};
// ── TABS ──
function showTab(tab) {
  document.querySelectorAll('.tab-pane').forEach(function(el) {
    el.style.display = 'none';
    el.classList.remove('active');
  });
  var target = document.getElementById('tab-' + tab);
  if (target) {
    target.style.display = 'block';
    target.classList.add('active');
  }
  document.querySelectorAll('.tab-btn').forEach(function(b) {
    var isActive = (b.getAttribute('onclick') || '').includes("'" + tab + "'");
    var ddParent = b.closest('.tab-dropdown');
    if (ddParent) {
      var ddId = ddParent.getAttribute('data-dd');
      var ddPanel = ddId ? document.getElementById(ddId) : null;
      var ddItem = ddPanel ? ddPanel.querySelector('.tab-dd-item[onclick*="' + tab + '"]') : null;
      if (ddItem) isActive = true;
    }
    b.classList.toggle('active', isActive);
  });
  document.querySelectorAll('.tab-dd-item').forEach(function(item) {
    item.classList.toggle('active', (item.getAttribute('onclick') || '').includes("'" + tab + "'"));
  });
  closeDropdowns();
  toggleMore(false);
  syncMobileNav(tab);
  setMobileTitle(tab);
  if (tab === 'timeline') {
    renderTimeline();
    var todayStr = localDateStr(new Date());
    var todayCol = document.querySelector('.tl-col[data-date="'+todayStr+'"]');
    if (todayCol) setTimeout(function(){ todayCol.scrollIntoView({block:'nearest', behavior:'smooth', inline:'center'}); }, 50);
  }
  if (tab === 'archive') {
    renderArchive();
  }
  if (tab === 'budget') {
    setTimeout(function() { renderSavingsChart(parseInt(document.getElementById('savings-slider').value) || 1200); }, 50);
  }
}
var switchTab = showTab;

// ── MOBILE APP SHELL (top bar title, bottom nav, more sheet, search) ──
var M_TITLES = { plan:'Daily Plan', lookin:'Tasks', timeline:'Timeline', archive:'Archive', ov:'Overview', strat:'Strategic Foundation', plan75:'$70K Plan', budget:'Financial Plan', forecast:'Business Forecast', mindful:'Mindfulness', dreams:'Dreams', gifts:'Gifts', snap:'Daily Snap', videos:'Videos', research:'Books & Research', lookinto:'Look Into' };
function setMobileTitle(tab) {
  var el = document.getElementById('m-topbar-title');
  if (el) el.textContent = M_TITLES[tab] || tab;
}
function syncMobileNav(tab) {
  var map = { plan:'plan', lookin:'tasks', timeline:'timeline', archive:'more', ov:'plan' };
  var active = map[tab] || 'more';
  document.querySelectorAll('.mn-btn').forEach(function(b) {
    b.classList.toggle('active', (b.getAttribute('data-tab') || '') === active);
  });
}
function toggleMore(open) {
  var sheet = document.getElementById('m-more');
  var overlay = document.getElementById('m-more-overlay');
  if (sheet) sheet.classList.toggle('open', !!open);
  if (overlay) overlay.classList.toggle('open', !!open);
}
function mMore(tab) { toggleMore(false); switchTab(tab); }
function mMoreAction(fn) { toggleMore(false); fn(); }
function toggleSearch(force) {
  var row = document.getElementById('m-search-row');
  if (!row) return;
  var show = (typeof force === 'boolean') ? force : (row.style.display === 'none');
  row.style.display = show ? 'flex' : 'none';
  if (show) { var i = document.getElementById('global-search-m'); if (i) i.focus(); }
  else clearSearch();
}

function closeDropdowns() {
  document.querySelectorAll('.tab-dropdown.open').forEach(function(dd) { setDDOpen(dd, false); });
}

// Tap-to-open dropdowns on touch devices (hover doesn't exist on mobile)
function setDDOpen(dd, open) {
  dd.classList.toggle('open', open);
  var id = dd.getAttribute('data-dd');
  var c = id ? document.getElementById(id) : null;
  if (!c) return;
  if (open) {
    var btn = dd.querySelector('.tab-btn');
    var r = btn ? btn.getBoundingClientRect() : null;
    if (window.innerWidth <= 768) {
      c.style.left = '0';
      c.style.right = '0';
      c.style.top = '40px';
      c.style.maxHeight = 'calc(100vh - 40px)';
    } else {
      c.style.left = (r ? r.left : 0) + 'px';
      c.style.top = (r ? r.bottom : 40) + 'px';
      c.style.right = 'auto';
      c.style.maxHeight = '';
    }
    c.style.display = 'block';
  } else {
    c.style.display = 'none';
  }
}
document.addEventListener('click', function(e) {
  var item = e.target.closest('.tab-dd-item');
  var dd = e.target.closest('.tab-dropdown');
  if (!dd && item) {
    var panel = item.closest('.tab-dd-content');
    if (panel) dd = document.querySelector('.tab-dropdown[data-dd="' + panel.id + '"]');
  }
  var others = document.querySelectorAll('.tab-dropdown.open');
  for (var i = 0; i < others.length; i++) {
    if (others[i] !== dd) setDDOpen(others[i], false);
  }
  if (dd) {
    e.stopPropagation();
    if (item) {
      setDDOpen(dd, false);
    } else {
      setDDOpen(dd, !dd.classList.contains('open'));
    }
  }
});
var ddHoverTimer = null;
function ddCloseLater() {
  ddHoverTimer = setTimeout(function() {
    document.querySelectorAll('.tab-dropdown.open').forEach(function(d) { setDDOpen(d, false); });
  }, 120);
}
document.querySelectorAll('.tab-dropdown, .tab-dd-content').forEach(function(el) {
  el.addEventListener('mouseenter', function() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    clearTimeout(ddHoverTimer);
    var dd = el.classList.contains('tab-dropdown') ? el : document.querySelector('.tab-dropdown[data-dd="' + el.id + '"]');
    if (dd) setDDOpen(dd, true);
  });
  el.addEventListener('mouseleave', ddCloseLater);
});

// ── DAY DATA ──
;
;

// ── RECURRING FNH EVENTS ── (moved to assets/js/recurring.js, shared with index.html)

// ── HELPERS ──
function dayLabel(id) {
  var d = DAYS.find(function(x){return x.id===id;});
  if (!d) return id;
  var parts = d.date.split(' ');
  return parts[0].substring(0,2)+' '+parts[1];
}

function weekStart(d) {
  var date = new Date(d.dateISO + 'T00:00:00');
  var day = date.getDay();
  var diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[date.getMonth()]+' '+date.getDate();
}

function toMin(s) { var p=s.split(':'); return parseInt(p[0])*60+parseInt(p[1]); }

function minToTime(m) { var h=Math.floor(m/60); var mi=m%60; return h+':'+(mi<10?'0':'')+mi; }

function localDateStr(d) {
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function fmtDur(m) {
  if (m >= 60) { var h=Math.floor(m/60); return h+'h '+(m%60?m%60+'m':''); }
  return m+'m';
}
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function timeRange(t) { var p=t.trim().split(/[–\-]/); return {start:p[0].trim(), end:p.length>1?p[1].trim():p[0].trim()}; }

function getPeriod(t) { var h=toMin(timeRange(t).start); if(h<720) return 'MORNING'; if(h<1080) return 'AFTERNOON'; return 'EVENING'; }

var CATEGORIES = [
  {id:'coffee',   label:'Coffee',   color:'#E8A26A', test:function(ev){return ev.coffee;}},
  {id:'teaching', label:'Teaching', color:'#A67CB8', test:function(ev){return ev.teaching;}},
  {id:'perf',     label:'Performance', color:'#DAA520', test:function(ev){return ev.perf;}},
  {id:'fnh',     label:'FNH',      color:'#1D9E75', test:function(ev){return /FNH|Psycholog|GP|Doctor|Psychology/i.test(ev.text);}},
  {id:'mtt',      label:'MTT',      color:'#3D4A5C', test:function(ev){return /MTT/i.test(ev.text);}},
  {id:'admin',    label:'Admin',    color:'#5A8BC0', test:function(ev){return /Reply|Pay |Order |Confirm|Download|Facebook|Pay rego|Post|Social media/i.test(ev.text);}},
  {id:'chore',    label:'Chores',   color:'#C98A4A', test:function(ev){return /Laundry|Vacuum|Tidy|Fold|Wash/i.test(ev.text);}},
  {id:'errand',   label:'Errands',  color:'#D4A07A', test:function(ev){return /Collect|Grocery|Shopping|medication/i.test(ev.text);}},
  {id:'practice', label:'Practice', color:'#35AFA0', test:function(ev){return /Elly|Piano improv|Pack keyboard|Piano practice/i.test(ev.text);}},
  {id:'reflect',  label:'Reflect',  color:'#C878A8', test:function(ev){return /Reflect/i.test(ev.text);}},
  {id:'travel',   label:'Travel',   color:'#C8A04A', test:function(ev){return /Travel|Flight/i.test(ev.text);}},
  {id:'meal',     label:'Meals',    color:'#A8A8A8', test:function(ev){return /Lunch|Dinner|Breakfast|Meal/i.test(ev.text);}},
  {id:'social',   label:'Social',   color:'#C878A8', test:function(ev){return /Potluck|Birthday|Catch|Hang|Friend|Visit/i.test(ev.text);}},
  {id:'buffer',   label:'Buffer',   color:'#C8C8C4', test:function(ev){return ev.buffer || /Buffer/i.test(ev.text);}},
  {id:'free',     label:'Free',     color:'#D8D6CF', test:function(ev){return /FREE DAY|DAY OFF|SYDNEY|FREE|day off/i.test(ev.text);}}
];

function eventCategory(ev) {
  for (var i=0;i<CATEGORIES.length;i++) { if (CATEGORIES[i].test(ev)) return CATEGORIES[i]; }
  return {id:'other', label:'Other', color:'#BDC3C7', test:function(){}};
}

function calcDur(ev) {
  if (ev.dur) return ev.dur;
  var r=timeRange(ev.time);
  return toMin(r.end)-toMin(r.start);
}

// ── AUTO-GENERATE LOOKUPS ──
// Rebuilt after populateRecurring() so dynamic days are in VS / print / search.
var VS = [];
var ALL_PRINT_DAYS = [];
var DAY_DATES = {};
function buildLookups() {
  VS = ['ov'];
  ALL_PRINT_DAYS = [];
  DAY_DATES = {};
  DAYS.forEach(function(d) {
    VS.push(d.id);
    ALL_PRINT_DAYS.push({id:d.id, label:dayLabel(d.id)});
    DAY_DATES[d.id] = d.dateISO;
  });
}
buildLookups();

// ── BUILD EVENTS WITH FREE TIME ──
function findFreeSlots(evs) {
  // Check if the day has a full-day event (FREE DAY, DAY OFF, SYDNEY)
  var hasFullDay = false;
  evs.forEach(function(ev) {
    if (eventCategory(ev).id === 'free' && ev.endMin - ev.startMin >= 600) hasFullDay = true;
  });
  if (hasFullDay) return [];

  var merged = [];
  evs.forEach(function(ev) {
    if (merged.length && ev.startMin < merged[merged.length-1].endMin) {
      if (ev.endMin > merged[merged.length-1].endMin) merged[merged.length-1].endMin = ev.endMin;
    } else {
      merged.push({startMin: ev.startMin, endMin: ev.endMin});
    }
  });
  var DAY_START = 7*60, DAY_END = 18*60;
  var slots = [], cursor = DAY_START;
  function addSlot(gap, s, e) {
    if (gap >= 180) slots.push(createFree(s, e, 'free-3h'));
    else if (gap >= 120) slots.push(createFree(s, e, 'free-2h'));
    else if (gap >= 60) slots.push(createFree(s, e, 'free-1h'));
  }
  merged.forEach(function(m) {
    addSlot(m.startMin - cursor, cursor, m.startMin);
    cursor = Math.max(cursor, m.endMin);
  });
  addSlot(DAY_END - cursor, cursor, DAY_END);
  return slots;
}

function buildEvents(d) {
  var evs = (d.events||[]).map(function(e) {
    var r=timeRange(e.time);
    var ev = {
      time:e.time, text:e.text, desc:e.desc||'', link:e.link||null,
      startMin:toMin(r.start), endMin:toMin(r.end),
      dur:calcDur(e),
      buffer:e.buffer!==undefined?e.buffer:e.text.startsWith('🔒'),
      meal:/Lunch|Dinner|Breakfast|Meal/i.test(e.text),
      tickable:e.tickable!==false && !/Lunch|Dinner|Breakfast|Meal/i.test(e.text),
      done:e.done===true,
      archived:e.archived===true,
      teaching:e.teaching===true,
      perf:e.perf===true,
      coffee:e.coffee===true,
      study:e.study===true,
      banner:e.banner===true,
      dashboard:e.dashboard===true,
      home:e.home===true||/🧹|🧽|🧺|Laundry|Vacuum|Dishwasher|Clean kitchen|Kitchen clean|Tidy the house/i.test(e.text),
      fnh:e.fnh===true
    };
    return ev;
  });
  var hasDinner = evs.some(function(ev){ return /Dinner|🍽/i.test(ev.text) && !/Reply|reschedule/i.test(ev.text); });
  if (!hasDinner) {
    var busy = evs.some(function(ev){
      var fullDay = eventCategory(ev).id === 'free' && ev.endMin - ev.startMin >= 600;
      if (fullDay) return false;
      return ev.startMin < 1200 && ev.endMin > 1080;
    });
    if (!busy) {
      evs.push({time:'18:00–20:00', text:'🍽️ Dinner', startMin:1080, endMin:1200, dur:120,
        buffer:false, meal:true, tickable:false, done:false, teaching:false, perf:false, coffee:false, home:false, fnh:false});
    }
  }
  evs.sort(function(a,b){return a.startMin-b.startMin;});

  var freeSlots = findFreeSlots(evs);
  var all = [], fi = 0;
  for (var i = 0; i < evs.length; i++) {
    while (fi < freeSlots.length && freeSlots[fi].startMin < evs[i].startMin) all.push(freeSlots[fi++]);
    all.push(evs[i]);
  }
  while (fi < freeSlots.length) all.push(freeSlots[fi++]);
  return all;
}

function createFree(s, e, cls) {
  var text = cls === 'free-3h' ? '🟢 3h free'
           : cls === 'free-2h' ? '🟡 2h free'
           : '🟠 1h free';
  return {
    time:minToTime(s)+'–'+minToTime(e),
    text:text,
    dur:e-s, startMin:s, endMin:e,
    buffer:false, tickable:false, free:true, freeCls:cls
  };
}

// ── RENDER DAYS ──

function renderDays() {
  var c = document.getElementById('day-panels-container');
  if (!c) return;
  c.innerHTML = '';
  var cutoff = '2026-07-27';
  DAYS.forEach(function(d, i) {
    if (d.dateISO < cutoff) return;
    var prevId=i>0?DAYS[i-1].id:'ov', nextId=i<DAYS.length-1?DAYS[i+1].id:'ov';
    var prevLabel=prevId==='ov'?'Overview':dayLabel(prevId);
    var nextLabel=nextId==='ov'?'Overview':dayLabel(nextId);
    var allEvs = buildEvents(d);
    var activeEvs = [], completedEvs = [];
    var archDone = 0, archTotal = 0;
    allEvs.forEach(function(ev) {
      if (ev.tickable) ev._tickId = Helpers.stableTickId(d.id, ev);
      if (ev.archived) {
        archTotal++;
        if (ev.done || LS.get('tick-'+ev._tickId) === '1') archDone++;
        return;
      }
      if (ev.tickable && (ev.done || LS.get('tick-'+ev._tickId) === '1')) {
        ev._completed = true;
        completedEvs.push(ev);
      } else {
        activeEvs.push(ev);
      }
    });
    var freeSlots = findFreeSlots(activeEvs);
    var h = '<div id="view-'+d.id+'" class="day-panel'+(/^Sat|^Sun/.test(d.dow)?' weekend':'')+'">';
    // Hero card: header + focus + next up + category bar in one premium card
    h += '<div class="dh-hero">';
    h += '<div class="dh-top has-nav">';
    h += '<div class="dh-left">';
    h += '<button class="nb-arrow" onclick="go(\''+prevId+'\')" title="'+prevLabel+'">←</button>';
    h += '<span class="dh-title"><span class="dh-dow">'+d.dow+'</span> <span class="dh-date">'+d.date+'</span></span>';
    h += '</div>';
    h += '<div class="dh-center"></div>';
    h += '<div class="dh-right">';
    var doneN = completedEvs.length + archDone;
    var totalN = doneN + activeEvs.filter(function(ev){return ev.tickable;}).length + (archTotal - archDone);
    if (totalN > 0) h += '<div class="dh-progress" id="dp-'+d.id+'">'+doneN+'/'+totalN+' done</div>';
    h += '<button class="nb-copy" onclick="copyCompleted(\''+d.id+'\')" title="Copy completed tasks"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>';
    h += '<button class="nb-arrow" onclick="go(\''+nextId+'\')" title="'+nextLabel+'">→</button>';
    h += '</div>';
    h += '</div>';
    h += '<div class="dh-focus">'+esc(d.focus)+'</div>';
    h += '<div class="nextup" id="nextup-'+d.id+'"></div>';
    // Category bar — hide on days with no real events
    var catTotals = {};
    activeEvs.forEach(function(ev) {
      if (ev.free || ev.banner || ev.dashboard) return;
      if (ev.study && !ev.tickable) return;
      var cat = eventCategory(ev);
      if (cat.id === 'meal' || cat.id === 'free') return;
      var dur = ev.dur || 0;
      if (dur < 5) return;
      catTotals[cat.id] = catTotals[cat.id] || {label:cat.label, color:cat.color, mins:0};
      catTotals[cat.id].mins += dur;
    });
    var catIds = Object.keys(catTotals);
    if (catIds.length > 0) {
      var totalMins = 0;
      catIds.forEach(function(id){totalMins += catTotals[id].mins;});
      catIds.sort(function(a,b){return catTotals[b].mins - catTotals[a].mins;});
      h += '<div class="cat-bar-wrap">';
      h += '<div class="cat-bar">';
      catIds.forEach(function(id) {
        var c = catTotals[id];
        var pct = (c.mins / totalMins * 100).toFixed(1);
        h += '<div class="cat-bar-seg" style="width:'+pct+'%;background:'+c.color+';" data-tip="'+c.label+': '+fmtDur(c.mins)+'" data-tip-color="'+c.color+'"></div>';
      });
      h += '</div>';
      h += '<div class="cat-legend">';
      h += '<span class="cat-total">'+fmtDur(totalMins)+' total</span>';
      catIds.forEach(function(id) {
        var c = catTotals[id];
        h += '<span class="cat-legend-item"><span class="cat-dot" style="background:'+c.color+';"></span>'+c.label+' <span class="cat-time">'+fmtDur(c.mins)+'</span></span>';
      });
      h += '</div></div>';
    }
    // Daily Compass + Morning Chain — unified card
    h += '<div class="compass-card" id="compass-'+d.id+'" style="margin:16px 0 0;padding:0;">';
    // Compass section (collapsible)
    h += '<button class="compass-toggle" onclick="toggleCompass()"><span class="hero-label"><span>🧭 Compass</span></span><span class="compass-caret">▶</span></button>';
    h += '<div class="compass-body">';
    h += '<div style="display:flex;gap:8px;margin-bottom:10px;">';
    h += '<div style="flex:1;padding:6px 0 6px 10px;border-left:3px solid var(--pl-C0392B);"><div style="font-size:8px;color:var(--pl-C0392B);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">The Work</div><div style="font-size:9px;color:var(--pl-5F5E5A);margin-top:3px;line-height:1.3;">Deepen FNH craft</div></div>';
    h += '<div style="flex:1;padding:6px 0 6px 10px;border-left:3px solid var(--pl-C98A4A);"><div style="font-size:8px;color:var(--pl-C98A4A);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">The Practices</div><div style="font-size:9px;color:var(--pl-5F5E5A);margin-top:3px;line-height:1.3;">Teach · Refer · Pause</div></div>';
    h += '</div>';
    // Four Gifts
    h += '<div class="gift-row" style="display:flex;gap:0;margin-bottom:4px;flex-wrap:wrap;">';
    h += '<div class="gift-cell" style="flex:1 1 22%;min-width:88px;padding:6px 4px;text-align:center;"><div style="font-size:12px;">🎯</div><div style="font-size:8px;color:var(--pl-C0392B);font-weight:700;margin-top:2px;">Competence</div><div style="font-size:7px;color:var(--pl-8A8880);margin-top:1px;">20 min craft</div></div>';
    h += '<div class="gift-cell" style="flex:1 1 22%;min-width:88px;padding:6px 4px;text-align:center;"><div style="font-size:12px;">✨</div><div style="font-size:8px;color:var(--pl-C98A4A);font-weight:700;margin-top:2px;">Style</div><div style="font-size:7px;color:var(--pl-8A8880);margin-top:1px;">Yours alone</div></div>';
    h += '<div class="gift-cell" style="flex:1 1 22%;min-width:88px;padding:6px 4px;text-align:center;"><div style="font-size:12px;">💎</div><div style="font-size:8px;color:var(--pl-C878A8);font-weight:700;margin-top:2px;">Commitment</div><div style="font-size:7px;color:var(--pl-8A8880);margin-top:1px;">Whole-hearted</div></div>';
    h += '<div class="gift-cell" style="flex:1 1 22%;min-width:88px;padding:6px 4px;text-align:center;"><div style="font-size:12px;">🎵</div><div style="font-size:8px;color:var(--pl-1D9E75);font-weight:700;margin-top:2px;">Lightness</div><div style="font-size:7px;color:var(--pl-8A8880);margin-top:1px;">Pure enjoyment</div></div>';
    h += '</div>';
    h += '</div>'; // close compass-body
    // Morning Chain — horizontal flow
    h += '<div>';
    h += '<div class="hero-label" style="margin:16px 0 10px;"><span>📸 Morning Chain · ~10 min</span></div>';
    h += '<div class="chain-flow-h" id="chain-flow-'+d.id+'">';
    h += '<div class="chain-progress" id="chain-progress-'+d.id+'"></div>';
    var chainItems = [
      {i:0, icon:'🫁', label:'Inhale', desc:'3 rounds', color:'#1D9E75'},
      {i:1, icon:'🏃', label:'<a href="https://www.youtube.com/watch?v=PwJCJToQmps" target="_blank" onclick="event.stopPropagation()" style="color:inherit;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px;">Nitro</a> + pushups', desc:'Open habits app', color:'#C98A4A'},
      {i:2, icon:'🦶', label:'Be still', desc:'Open habits app', color:'#5A8BC0'},
      {i:3, icon:'🚿', label:'Shower', desc:'Quick rinse', color:'#5B8BD4'},
      {i:4, icon:'🛏', label:'Make bed', desc:'Quick tidy', color:'#8E7CC3'},
      {i:5, icon:'🍳', label:'Breakfast + 💊', desc:'Lexapro w/ food', color:'#D4A07A'},
      {i:6, icon:'🪥', label:'Brush teeth', desc:'After food', color:'#A8A8A8'},
      {i:7, icon:'🚶', label:'Walk', desc:'Get moving', color:'#27AE60'},
      {i:8, icon:'☕', label:'Coffee', desc:'Grab one out', color:'#8B6914'},
      {i:9, icon:'📓', label:'Journal', desc:'Write it out', color:'#7D6B5D'}
    ];
    chainItems.forEach(function(step, idx) {
      if (idx > 0) h += '<div class="chain-arrow-h"></div>';
      h += '<div class="chain-step" tabindex="0" role="button" aria-label="'+step.label.replace(/<[^>]*>/g,'')+' habit" onclick="toggleChain(this,\''+d.id+'-chain-'+step.i+'\')" data-chain="'+d.id+'-chain-'+step.i+'" style="--cc:'+step.color+';">';
      h += '<span class="chain-emoji">'+step.icon+'</span>';
      h += '<span class="chain-label">'+step.label+'</span>';
      h += '<span class="chain-check">✓</span>';
      h += '</div>';
    });
    h += '</div>';
    h += '<div id="chain-status-'+d.id+'" style="font-size:8px;color:var(--pl-9A9080);margin-top:4px;">0 of 10 done</div>';
    h += '</div>';
    // Evening Wind-Down — horizontal flow
    h += '<div style="margin:16px 0 0;">';
    h += '<div class="hero-label" style="margin:0 0 10px;"><span>🌙 Evening Wind-Down · ~9:30pm · lights out 10pm</span></div>';
    h += '<div class="chain-flow-h" id="chain-flow-'+d.id+'-pm">';
    h += '<div class="chain-progress" id="chain-progress-'+d.id+'-pm"></div>';
    var pmItems = [
      {i:0, icon:'🍽', label:'Dinner + clean up', desc:'No screens', color:'#6B5B95'},
      {i:1, icon:'🔆', label:'Dim lights', desc:'~30 min before', color:'#5B8BD4'},
      {i:2, icon:'📵', label:'Phone out of room', desc:'On charger', color:'#C878A8'},
      {i:3, icon:'🚿', label:'Warm shower', desc:'Rinse the day', color:'#5A8BC0'},
      {i:4, icon:'📓', label:'Journal 3 lines', desc:'Win · hard · tomorrow', color:'#8E7CC3'},
      {i:5, icon:'🛌', label:'Bed by 10pm', desc:'Lights out', color:'#D4A07A'}
    ];
    pmItems.forEach(function(step, idx) {
      if (idx > 0) h += '<div class="chain-arrow-h"></div>';
      h += '<div class="chain-step" tabindex="0" role="button" aria-label="'+step.label.replace(/<[^>]*>/g,'')+' habit" onclick="toggleChain(this,\''+d.id+'-pm-chain-'+step.i+'\')" data-chain="'+d.id+'-pm-chain-'+step.i+'" style="--cc:'+step.color+';">';
      h += '<span class="chain-emoji">'+step.icon+'</span>';
      h += '<span class="chain-label">'+step.label+'</span>';
      h += '<span class="chain-check">✓</span>';
      h += '</div>';
    });
    h += '</div>';
    h += '<div id="chain-status-'+d.id+'-pm" style="font-size:8px;color:var(--pl-9A9080);margin-top:4px;">0 of 6 done</div>';
    h += '</div>'; // close pm wrapper
    h += '</div>'; // close compass-card
    h += '</div>'; // close dh-hero
    h += '<div class="goal-banner">';
    h += '<div class="goal-banner-inner">';
    h += '<div class="goal-banner-item"><span class="label wish">🌍 Wish:</span> <span class="text">A world where everyone has the nervous system safety to express their unique self.</span></div>';
    h += '<div class="goal-banner-item"><span class="label fiveyear">🎯 5-Year:</span> <span class="text">A full-time FNH + voice practice at $100K+, helping performers and overthinkers — using all of me.</span></div>';
    h += '</div></div>';
    var dotType = d.dot.replace('dc-','');
    var lastPeriod = '';
    var inCoffee = false;
    var inHome = false;
    var inStudy = false;
    var inFnh = false;
    var inTeaching = false;
    var dashDone = false;
    var prevEndMin = null;
    var cornerStartMin = null;
    var prevCornerType = null;
    var merged = activeEvs.concat(freeSlots);
    merged.sort(function(a,b){return a.startMin-b.startMin;});
    merged.forEach(function(ev) {
      var evEnd = ev.endMin || ev.startMin;
      if (ev.dashboard) {
        if (dashDone) return;
        dashDone = true;
        h += '<div class="dash-card"><div class="dash-head"><div class="dash-title">🎯 Focuses this week</div><div class="dash-tag">Same for Sat + Sun</div></div><div class="dash-body">';
        h += '<div class="dash-item dash-hot"><span class="dash-flag">🏋️</span><span><b>Cancel gym membership</b> — follow through, don\'t let the weekend slide</span></div>';
        h += '<div class="dash-item"><span class="dash-flag">🎹</span><span><b>Piano practise</b> — keep it in the day, even 15 min</span></div>';
        h += '<div class="dash-item"><span class="dash-flag">🚶</span><span><b>Walks / exercise</b> — move daily</span></div>';
        h += '<div class="dash-item dash-hot"><span class="dash-flag">🧘</span><span><b>HUMM open house</b> — Sat 15 + Sun 16 Aug · free guided walk-through · 10 / 12 / 2 / 4pm · St Kilda · try to book a slot</span></div>';
        h += '<div class="dash-item"><span class="dash-flag">🏠</span><span><b>2 housemate viewings Sun</b> — times TBC</span></div>';
        h += '<div class="dash-item"><span class="dash-flag">👯</span><span><b>Aaron may come Sat</b> — pending</span></div>';
        h += '<div class="dash-item"><span class="dash-flag">📚</span><span><b>Study</b> — any time you can find this weekend helps, even a short block</span></div>';
        h += '</div></div>';
        return;
      }
      var isDayOff = !ev.free && eventCategory(ev).id === 'free';
      if (isDayOff) {
        h += '<div class="day-off-banner"><span class="day-off-tl">'+esc(ev.text)+'</span><span class="day-off-sub">'+esc(ev.time)+'</span></div>';
        return;
      }
      var wasInCorner = inCoffee || inHome || inStudy || inFnh || inTeaching;
      prevCornerType = wasInCorner ? (inCoffee ? 'coffee' : inHome ? 'home' : inStudy ? 'study' : inFnh ? 'fnh' : 'teaching') : null;
      var cornerEndMin = null;
      var cornerClosed = false;
      if (!ev.coffee && inCoffee) { cornerEndMin = prevEndMin; cornerClosed = true; h += '</div>'; inCoffee = false; }
      if (!ev.home && inHome) { cornerEndMin = prevEndMin; cornerClosed = true; h += '</div>'; inHome = false; }
      if (!ev.study && inStudy) { cornerEndMin = prevEndMin; cornerClosed = true; h += '</div>'; inStudy = false; }
      if (!ev.fnh && inFnh) { cornerEndMin = prevEndMin; cornerClosed = true; h += '</div>'; inFnh = false; }
      if (!ev.teaching && inTeaching) { cornerEndMin = prevEndMin; cornerClosed = true; h += '</div>'; inTeaching = false; }
      if (wasInCorner && cornerEndMin !== null && ev.startMin > cornerEndMin && !ev.free && !ev.meal && !ev.banner && !ev.dashboard) {
        var gap = ev.startMin - cornerEndMin;
        if (gap >= 10 && gap < 60) {
          var gM = gap%60;
          h += '<div class="gap-row"><span class="gap-label">'+gM+' min free</span></div>';
        }
      }
      if (cornerClosed && prevCornerType && cornerStartMin !== null) {
        h = h.replace(/(<span class="corner-time-range">)([^<]*)(<\/span>)/, '$1'+minToTime(cornerStartMin)+'–'+minToTime(prevEndMin)+' <span class="corner-dur">'+fmtDur(prevEndMin - cornerStartMin)+'<\/span>$3');
        cornerStartMin = null;
      }
      if (ev.coffee && !inCoffee) {
        if (inHome) { h += '</div>'; inHome = false; }
        if (inStudy) { h += '</div>'; inStudy = false; }
        if (inFnh) { h += '</div>'; inFnh = false; }
        if (inTeaching) { h += '</div>'; inTeaching = false; }
        h += '<div class="coffee-corner"><div class="coffee-head"><span class="coffee-title">'+esc(ev.text)+' <span class="coffee-dur">'+fmtDur(ev.dur)+'</span></span><span class="coffee-time"><span class="corner-time-range">'+esc(ev.time)+'</span></span></div><div class="coffee-sub">sip + tick things off</div>';
        cornerStartMin = ev.startMin;
        inCoffee = true;
        return;
      }
      if (ev.home && !inHome) {
        if (inCoffee) { h += '</div>'; inCoffee = false; }
        if (inStudy) { h += '</div>'; inStudy = false; }
        if (inFnh) { h += '</div>'; inFnh = false; }
        if (inTeaching) { h += '</div>'; inTeaching = false; }
        h += '<div class="home-corner"><div class="home-head"><span class="home-icon">🏠</span> Home Corner <span class="home-sub">chores + house bits</span><span class="home-time"><span class="corner-time-range">'+esc(ev.time)+'</span></span></div>';
        cornerStartMin = ev.startMin;
        inHome = true;
      }
      if (ev.study && !inStudy) {
        if (inHome) { h += '</div>'; inHome = false; }
        if (inCoffee) { h += '</div>'; inCoffee = false; }
        if (inFnh) { h += '</div>'; inFnh = false; }
        if (inTeaching) { h += '</div>'; inTeaching = false; }
        h += '<div class="study-corner"><div class="study-head"><span class="study-title">'+esc(ev.text)+' <span class="study-dur">'+fmtDur(ev.dur)+'</span></span><span class="study-time"><span class="corner-time-range">'+esc(ev.time)+'</span></span></div><div class="study-sub">watch · Kajabi · worksheets</div>';
        cornerStartMin = ev.startMin;
        inStudy = true;
        return;
      }
      if (ev.fnh && !inFnh) {
        if (inCoffee) { h += '</div>'; inCoffee = false; }
        if (inHome) { h += '</div>'; inHome = false; }
        if (inStudy) { h += '</div>'; inStudy = false; }
        if (inTeaching) { h += '</div>'; inTeaching = false; }
        h += '<div class="fnh-corner"><div class="fnh-head"><span class="fnh-icon">🧠</span> FNH <span class="fnh-sub">assessments + catch-ups</span><span class="fnh-time"><span class="corner-time-range">'+esc(ev.time)+'</span></span></div>';
        cornerStartMin = ev.startMin;
        inFnh = true;
      }
      if (ev.teaching && !inTeaching) {
        if (inCoffee) { h += '</div>'; inCoffee = false; }
        if (inHome) { h += '</div>'; inHome = false; }
        if (inStudy) { h += '</div>'; inStudy = false; }
        if (inFnh) { h += '</div>'; inFnh = false; }
        h += '<div class="teaching-corner"><div class="teaching-head"><span class="teaching-icon">🎵</span> Teaching <span class="teaching-sub">voice + piano lessons</span></div>';
        cornerStartMin = ev.startMin;
        inTeaching = true;
      }
      if (ev.meal) {
        var period = getPeriod(ev.time);
        if (period !== lastPeriod) { h += '<div class="sl">'+period+'</div>'; lastPeriod = period; }
        h += '<div class="meal-corner"><div class="meal-head"><span class="meal-title">'+esc(ev.text)+' <span class="meal-dur">'+fmtDur(ev.dur)+'</span></span><span class="meal-time">'+esc(ev.time)+'</span></div></div>';
        return;
      }
      if (ev.banner) {
        var stars = '';
        for (var s = 0; s < 48; s++) {
          stars += '<span class="bb-star" style="left:'+(Math.random()*100).toFixed(1)+'%;top:'+(Math.random()*72).toFixed(1)+'%;width:'+(Math.random()*2+1).toFixed(1)+'px;height:'+(Math.random()*2+1).toFixed(1)+'px;animation-delay:'+(Math.random()*4).toFixed(2)+'s;animation-duration:'+(2.5+Math.random()*3).toFixed(2)+'s;"></span>';
        }
        h += '<div class="bali-banner"><div class="bb-sky">'+stars+'<span class="bb-moon">🌙</span><span class="bb-bigstar">⭐</span></div>';
        h += '<div class="bb-title">Bali · Sep 6 – Oct 6</div>';
        h += '<div class="bb-cta">Flights booked ✓</div>';
        h += '<div class="bb-sub">Batik Air · out OD 178 6 Sep · back OD 177 5 Oct</div>';
        h += '</div>';
        return;
      }
      prevEndMin = evEnd;
      var evColor = eventCategory(ev).color;
      var period = getPeriod(ev.time);
      if (period !== lastPeriod) { h += '<div class="sl">'+period+'</div>'; lastPeriod = period; }
      var cls = 'tc'+(ev.tickable?' tickable':'')+(ev.buffer?' buffer':'')+(ev.free?' free '+ev.freeCls:'')+(ev.teaching?' teaching':'')+(ev.fnh?' fnh':'');
      cls += ' dot-'+dotType;
      var did = ev.tickable ? ' data-tickid="'+ev._tickId+'"' : '';
      var dataLive = ev.free ? ' data-s="'+ev.startMin+'" data-e="'+ev.endMin+'"' : '';
      var inlineStyle = ev.free ? '' : ' style="border-left:3px solid '+evColor+'"';
      h += '<div class="'+cls+'"'+did+dataLive+inlineStyle+'>';
      if (ev.tickable || ev.free) h += '<div class="chk"></div>';
      h += '<div class="tt">'+esc(ev.time)+'</div><div class="tb" style="flex:1;"><div class="tl">'+(ev.link?'<a href="'+esc(ev.link)+'" target="_blank" onclick="event.stopPropagation()">'+esc(ev.text)+'</a>':esc(ev.text));
      if (ev.dur>=30 && !ev.free) h += ' <span class="dur">'+fmtDur(ev.dur)+'</span>';
      h += '</div>';
      if (ev.desc) h += '<div class="dsub" title="'+esc(ev.desc)+'">'+esc(ev.desc)+'</div>';
      h += '</div></div>';
    });
    if (inCoffee) h += '</div>';
    if (inHome) h += '</div>';
    if (inStudy) h += '</div>';
    if (inFnh) h += '</div>';
    if (inTeaching) h += '</div>';
    if (completedEvs.length) {
      var allDone = doneN === totalN;
      h += '<details class="done-fold"'+(allDone?' open':'')+'>';
      h += '<summary>✓ Completed <span class="done-count">('+completedEvs.length+')</span></summary>';
      h += '<div class="done-list">';
      completedEvs.forEach(function(ev) {
        var cls = 'tc tickable ticked';
        var did = ' data-tickid="'+ev._tickId+'"';
        h += '<div class="'+cls+'"'+did+' style="opacity:0.5;">';
        h += '<div class="chk">✓</div>';
        h += '<div class="tt">'+esc(ev.time)+'</div><div class="tb" style="flex:1;"><div class="tl" style="text-decoration:line-through;color:var(--pl-888888);">'+(ev.link?'<a href="'+esc(ev.link)+'" target="_blank" onclick="event.stopPropagation()">'+esc(ev.text)+'</a>':esc(ev.text))+'</div></div></div>';
      });
      h += '</div></details>';
    }
    h += '<div class="now-line"></div>';
    h += '</div>';
    c.innerHTML += h;
  });
  restoreTicks();
  applyHeight();
  markBuffers();
}

function applyHeight() {
  document.querySelectorAll('.tc').forEach(function(tc) {
    var m = null;
    var durEl = tc.querySelector('.dur');
    if (durEl) {
      var txt = durEl.textContent;
      var hMatch = txt.match(/(\d+)h/);
      var mMatch = txt.match(/(\d+)m/);
      if (hMatch) m = parseInt(hMatch[1]) * 60;
      if (mMatch) m = (m || 0) + parseInt(mMatch[1]);
    }
    if (!m) {
      var tt = tc.querySelector('.tt');
      if (tt) {
        var parts = tt.textContent.trim().split(/[–\-]/);
        if (parts.length === 2) {
          var s=parts[0].trim().split(':'), e=parts[1].trim().split(':');
          if (s.length===2&&e.length===2) m=(parseInt(e[0])*60+parseInt(e[1]))-(parseInt(s[0])*60+parseInt(s[1]));
        }
      }
    }
    if (m && m >= 60) tc.style.minHeight = Math.max(36, Math.min(72, Math.round(m * 0.5))) + 'px';
  });
}

function markBuffers() {
  document.querySelectorAll('.tc .tl').forEach(function(tl) {
    if (tl.textContent.trim().startsWith('🔒')) tl.closest('.tc').classList.add('buffer');
  });
}

// ── SIDEBAR RENDERER ──
function dayHeat(d) {
  var total = 0;
  (d.events||[]).forEach(function(e) {
    var c = eventCategory(e);
    if (c.id === 'free' || c.id === 'meal') return;
    total += calcDur(e);
  });
  if (total >= 480) return ' red-day';
  if (total >= 240) return ' warn-day';
  return '';
}

// ── SIDEBAR ──
// Sidebar lists the current week onward (old dates age out automatically).
function sidebarCutoffISO() {
  var now = new Date(); now.setHours(0,0,0,0);
  var d = new Date(now);
  var day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); // Monday of this week
  return localDateStr(d);
}
// Recurring auto-generated cadence events — never "day content" for the
// sidebar / week-summaries / Overview. Real planned days have authored events
// beyond these (flights, bookings, rehearsals, sessions with people, etc.).
var RECUR_PATTERNS = [
  /Sleep by 10pm/i,
  /Weekly Q\s*&?\s*A/i,
  /Allowance transfer/i,
  /Financial Weekly/i,
  /money date/i,
  /FNH Mastery/i,
  /FNH MASTERY CATCH UP/i
];
function isRecurring(e) {
  return RECUR_PATTERNS.some(function(r) { return r.test(e.text); });
}
// A day "has content" if it has any event that isn't generated cadence.
function hasDayContent(d) {
  return (d.events || []).some(function(e) { return !isRecurring(e); });
}
function planRangeLabel() {
  var cutoff = sidebarCutoffISO();
  var first = null;
  for (var i = 0; i < DAYS.length; i++) {
    if (DAYS[i].dateISO >= cutoff) { first = DAYS[i]; break; }
  }
  var last = DAYS[DAYS.length - 1];
  var a = first ? weekStart(first) : weekStart(last);
  var l = new Date(last.dateISO + 'T00:00:00');
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return a + ' → ' + months[l.getMonth()] + ' ' + l.getFullYear();
}

function renderSidebar() {
  var s = document.getElementById('sidebar-container');
  if (!s) return;
  var range = planRangeLabel();
  var h = '<div class="sidebar-header"><div class="sidebar-title">'+range+'</div><div class="sidebar-sub">'+new Date().toLocaleDateString('en-AU', {day:'numeric', month:'short'})+'</div></div>';
  h += '<div class="week-label">Overview</div>';
  h += '<button class="day-btn active" onclick="go(\'ov\')"><div class="dbdot dc-mixed"></div><div><div class="dbn">Full plan</div><div class="dbs">'+range+'</div></div></button>';
  var lastWeek = '';
  var weekIdx = 0;
  var cutoff = sidebarCutoffISO();
  DAYS.forEach(function(d) {
    if (d.dateISO < cutoff) return;
    if (!hasDayContent(d)) return;
    var ws = weekStart(d);
    if (ws !== lastWeek) {
      h += '<div class="week-label" onclick="go(\'week-'+weekIdx+'\')" style="cursor:pointer;">Week of '+ws+' <span style="font-size:8px;color:var(--pl-CCCCCC);">→</span></div>';
      lastWeek = ws;
      weekIdx++;
    }
    var we = /^Sat|^Sun/.test(d.dow) ? ' weekend' : '';
    h += '<button class="day-btn'+dayHeat(d)+we+'" onclick="go(\''+d.id+'\')"><div class="dbdot '+d.dot+'"></div><div><div class="dbn">'+dayLabel(d.id)+'</div><div class="dbs">'+esc(d.sub)+'</div></div></button>';
  });
  s.innerHTML = h;
}

// ── SIDEBAR WEEK SUMMARY ──
function renderWeekSummary(idx) {
  var cutoff = sidebarCutoffISO();
  var weekDays = [], lastW = '', wIdx = -1;
  DAYS.forEach(function(d) {
    if (d.dateISO < cutoff) return;
    if (!hasDayContent(d)) return;
    var ws = weekStart(d);
    if (ws !== lastW) { wIdx++; lastW = ws; }
    if (wIdx === idx) weekDays.push(d);
  });
  if (!weekDays.length) return;
  var c = document.getElementById('week-summary-container');
  if (!c) return;
  var DOT_COLORS = {music:'var(--pl-5A8BC0)',kine:'var(--pl-1D9E75)',rest:'var(--pl-C8B070)'};
  var h = '<div style="padding:24px 20px;max-width:640px;margin:0 auto;">';

  // Prev / next week navigation (sidebar is hidden on mobile)
  var totalWeeks = 0;
  (function() {
    var lastW2 = '', w2 = -1;
    DAYS.forEach(function(d) {
      if (d.dateISO < cutoff) return;
      var ws2 = weekStart(d);
      if (ws2 !== lastW2) { w2++; lastW2 = ws2; }
    });
    totalWeeks = w2 + 1;
  })();
  h += '<div style="display:flex;gap:8px;margin-bottom:12px;justify-content:center;">';
  h += '<button class="nb" onclick="go(\'week-'+(idx-1)+'\')" style="'+(idx<=0?'visibility:hidden;':'')+'">← Prev</button>';
  h += '<button class="nb" onclick="go(\'week-'+(idx+1)+'\')" style="'+(idx>=totalWeeks-1?'visibility:hidden;':'')+'">Next →</button>';
  h += '</div>';

  // Compute week totals (excluding day-off events)
  var weekTotal = 0, weekCats = {}, weekCount = 0;
  weekDays.forEach(function(d) {
    var evs = buildEvents(d);
    evs.forEach(function(ev) {
      var cat = eventCategory(ev);
      if (cat.id === 'free' || cat.id === 'meal') return;
      var dur = ev.dur || 0;
      if (dur < 5) return;
      weekTotal += dur;
      weekCount++;
      var col = cat.color;
      var label = cat.label;
      if (!weekCats[col]) weekCats[col] = {total:0, items:[], label:label};
      weekCats[col].total += dur;
      weekCats[col].items.push({text:ev.text, time:ev.time, date:d.date, dur:fmtDur(dur)});
    });
  });

  // Header with serif font
  h += '<div style="text-align:center;margin-bottom:24px;padding:20px;background:linear-gradient(135deg,var(--pl-F8F4FF),var(--pl-FEF4F0));border-radius:12px;">';
  h += '<div style="font-size:24px;font-weight:400;font-family:Georgia,\'Times New Roman\',serif;color:var(--pl-1A1A18);letter-spacing:-0.01em;">Week of '+weekStart(weekDays[0])+'</div>';
  h += '<div style="font-size:11px;color:var(--pl-8A8880);margin-top:4px;font-family:Georgia,\'Times New Roman\',serif;font-style:italic;">'+weekDays.length+' days &middot; '+weekCount+' sessions</div>';
  h += '</div>';

  // Weekly goal — one clear win by end of week
  h += '<div style="background:var(--pl-F2FAF5);border:1px solid var(--pl-DCEBE2);border-left:3px solid var(--pl-1D9E75);border-radius:10px;padding:14px 16px;margin-bottom:20px;">';
  h += '<div style="font-size:9px;color:var(--pl-1D9E75);font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">🎯 Goal by end of week</div>';
  h += '<div style="font-size:12px;color:var(--pl-1A1A18);line-height:1.5;">A clear, calm week — one thing at a time.</div>';
  h += '</div>';

  // Metrics cards
  var weekTotalMins = weekTotal;
  var weekHours = Math.floor(weekTotalMins / 60);
  var weekMins = weekTotalMins % 60;
  // Count day-off days
  var dayOffDays = 0;
  weekDays.forEach(function(d) {
    (d.events||[]).forEach(function(e) {
      if (eventCategory(e).id === 'free' && /^\d/.test(e.time)) dayOffDays++;
    });
  });
  var workDays = weekDays.length - dayOffDays;
  var totalDayMins = workDays * (11 * 60) + dayOffDays * (12 * 60);
  var freeMins = Math.max(0, totalDayMins - weekTotalMins);

  // Count meal time
  var mealMins = 0;
  weekDays.forEach(function(d) {
    var evs = buildEvents(d);
    evs.forEach(function(ev) {
      if (/Lunch|Dinner|Breakfast|Meal/i.test(ev.text)) mealMins += ev.dur || 0;
    });
  });

  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;">';
  h += '<div style="background:var(--pl-F5F5F3);border-radius:8px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:400;font-family:Georgia,\'Times New Roman\',serif;color:var(--pl-1A1A18);">'+weekHours+'<span style="font-size:13px;color:var(--pl-8A8880);">h</span>'+(weekMins?' <span style="font-size:13px;color:var(--pl-8A8880);">'+weekMins+'m</span>':'')+'</div><div style="font-size:9px;color:var(--pl-8A8880);text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">Worked</div></div>';
  h += '<div style="background:linear-gradient(135deg,var(--pl-FFF9E6),var(--pl-FFE8F7),var(--pl-E8F4FF));border-radius:8px;padding:12px;text-align:center;position:relative;overflow:hidden;"><div style="font-size:22px;font-weight:400;font-family:Georgia,\'Times New Roman\',serif;color:var(--pl-F39C12);">'+dayOffDays+'</div><div style="font-size:9px;color:var(--pl-8A8880);text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">Free Days</div><div style="position:absolute;top:2px;right:6px;font-size:10px;">✨</div></div>';
  h += '<div style="background:var(--pl-F8F2E8);border-radius:8px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:400;font-family:Georgia,\'Times New Roman\',serif;color:var(--pl-C98A4A);">'+Math.floor(mealMins/60)+'<span style="font-size:13px;color:var(--pl-8A8880);">h</span></div><div style="font-size:9px;color:var(--pl-8A8880);text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">Meals</div></div>';
  h += '<div style="background:var(--pl-EEF4FA);border-radius:8px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:400;font-family:Georgia,\'Times New Roman\',serif;color:var(--pl-5A8BC0);">'+weekCount+'</div><div style="font-size:9px;color:var(--pl-8A8880);text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">Sessions</div></div>';
  h += '</div>';

  // Category breakdown
  var catKeys = Object.keys(weekCats);
  if (catKeys.length) {
    h += '<div style="font-size:9px;color:var(--pl-8A8880);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Category breakdown</div>';
    h += '<div style="display:flex;height:14px;border-radius:5px;overflow:hidden;background:var(--pl-EEEEEE);margin-bottom:12px;">';
    catKeys.forEach(function(c) {
      var cat = weekCats[c];
      var pct = (cat.total / weekTotal) * 100;
      var tip = cat.items.map(function(i){ return i.text+' ('+i.date+' '+i.time+', '+i.dur+')'; }).join('\n');
      h += '<div data-tip="'+esc(tip)+'" data-tip-color="'+c+'" style="width:'+pct.toFixed(1)+'%;background:'+c+';min-width:3px;cursor:pointer;"></div>';
    });
    h += '</div>';
    h += '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:10px;color:var(--pl-5F5E5A);margin-bottom:20px;">';
    catKeys.forEach(function(c) {
      var cat = weekCats[c];
      h += '<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+c+';margin-right:4px;vertical-align:middle;"></span>'+cat.label+' <strong>'+fmtDur(cat.total)+'</strong></span>';
    });
    h += '</div>';
  }

  // Day cards with serif day names
  h += '<div style="font-size:9px;color:var(--pl-8A8880);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Daily breakdown</div>';
  weekDays.forEach(function(d) {
    var evs = buildEvents(d);
    var total = 0, cats = {}, dayLabels = {};
    var isFreeDay = false;
    evs.forEach(function(ev) {
      var cat = eventCategory(ev);
      if (cat.id === 'free' && ev.dur >= 600) isFreeDay = true;
      if (cat.id === 'free' || cat.id === 'meal') return;
      var dur = ev.dur || 0;
      if (dur < 5) return;
      total += dur;
      var col = cat.color;
      cats[col] = (cats[col] || 0) + dur;
      if (!dayLabels[col]) dayLabels[col] = [];
      dayLabels[col].push(ev.text + ' ' + ev.time + ' (' + fmtDur(dur) + ')');
    });
    var mainCol = DOT_COLORS[d.dot.replace('dc-','')] || 'var(--pl-D3D1C7)';
    var allDayEvs = buildEvents(d);
    var dayTip = [];
    allDayEvs.forEach(function(ev) {
      if (ev.free) return;
      if (eventCategory(ev).id === 'meal') return;
      var cat = eventCategory(ev);
      dayTip.push(cat.label + ': ' + ev.text + ' ' + ev.time);
    });
    var cardClass = isFreeDay ? 'tc free-day-card' : 'tc';
    var cardStyle = isFreeDay ? 'cursor:pointer;margin-bottom:6px;border-radius:8px;' : 'cursor:pointer;margin-bottom:6px;border-radius:8px;border-left:3px solid '+mainCol+';';
    h += '<div class="'+cardClass+'" style="'+cardStyle+'" data-tip="'+esc(dayTip.join('\n'))+'" data-tip-color="'+(isFreeDay?'var(--pl-FECA57)':mainCol)+'" onclick="go(\''+d.id+'\')"><div class="tb" style="flex:1;">';
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">';
    h += '<span style="font-size:12px;font-weight:500;font-family:Georgia,\'Times New Roman\',serif;color:var(--pl-1A1A18);">'+d.dow+' '+d.date.split(' ')[0]+'</span>';
    h += '<span style="font-size:11px;font-weight:400;color:var(--pl-8A8880);">'+fmtDur(total)+'</span>';
    h += '</div>';
    h += '<div style="display:flex;height:10px;border-radius:4px;overflow:hidden;background:var(--pl-EEEEEE);">';
    var colKeys = Object.keys(cats);
    colKeys.forEach(function(c) {
      var pct = (cats[c] / total) * 100;
      var tip = (dayLabels[c]||[]).join('\n');
      h += '<div data-tip="'+esc(tip)+'" data-tip-color="'+c+'" style="width:'+pct.toFixed(1)+'%;background:'+c+';min-width:3px;cursor:pointer;"></div>';
    });
    if (!colKeys.length) h += '<div style="width:100%;background:var(--pl-EEEEEE);"></div>';
    h += '</div></div></div>';
  });
  h += '</div>';
  c.innerHTML = h;
}

// ── OVERVIEW RENDERER ──
function renderOverview() {
  var c = document.getElementById('ov-container');
  if (!c) return;
  var h = '<div style="display:flex;gap:8px;margin:12px 0 6px;flex-wrap:wrap;">';
  h += '<span style="background:var(--pl-E8EEF8);color:var(--pl-304080);border:1px solid var(--pl-B0C4E8);font-size:10px;padding:2px 8px;border-radius:20px;">🎭 MTT (Be You Group)</span>';
  h += '<span style="background:var(--pl-FEF3DC);color:var(--pl-A07020);border:1px solid var(--pl-E8D090);font-size:10px;padding:2px 8px;border-radius:20px;">🐾 Paw Patrol</span>';
  h += '<span style="background:var(--pl-F5EEF8);color:var(--pl-6B3FA0);border:1px solid var(--pl-D4B8E8);font-size:10px;padding:2px 8px;border-radius:20px;">🩺 FNH</span>';
  h += '</div>';
  var lastMonth = '';
  var cutoff = sidebarCutoffISO();
  DAYS.forEach(function(d) {
    if (d.dateISO < cutoff) return;
    // Skip days whose only events are recurring cadence (sleep/Q&A/money/Mastery).
    var real = (d.events || []).filter(function(e) { return !isRecurring(e); });
    if (!real.length) return;
    var month = d.date.split(' ')[1] || d.date.split(' ')[0];
    if (month !== lastMonth) {
      h += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:var(--pl-9A9080);margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--pl-E8E6DF);">'+month+'</div>';
      lastMonth = month;
    }
    var mainColor = d.dot === 'dc-music' ? 'var(--pl-304080)' : d.dot === 'dc-kine' ? 'var(--pl-6B3FA0)' : 'var(--pl-A07020)';
    var bgColor = d.dot === 'dc-music' ? 'var(--pl-F5F7FC)' : d.dot === 'dc-kine' ? 'var(--pl-F5EEF8)' : 'var(--pl-FEFCF0)';
    h += '<div class="oc" onclick="go(\''+d.id+'\')" style="border-left:3px solid '+mainColor+';background:'+bgColor+';margin-bottom:6px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:box-shadow 0.15s;" onmouseenter="this.style.boxShadow=\'0 1px 4px rgba(0,0,0,0.08)\'" onmouseleave="this.style.boxShadow=\'none\'">';
    h += '<div style="font-size:11px;color:'+mainColor+';margin-bottom:2px;font-weight:600;">'+dayLabel(d.id)+'</div>';
    // Day summary: focus minus the auto sleep prefix, else fall back to the
    // real events so a day never reads as just "🛌 Sleep 10pm".
    var summary = (d.focus || '').replace(/^🛌 Sleep 10pm(\s*—\s*)?/, '');
    if (!summary) summary = real.slice(0,2).map(function(e){ return e.text; }).join(' · ');
    h += '<div style="font-size:12px;font-weight:500;color:'+mainColor+';">'+esc(summary)+'</div></div>';
  });
  c.innerHTML = h;
}

// ── HAMBURGER MENU ──
function toggleMenu() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}

// ── TODAY NAVIGATION ──
function goToday() {
  var today = new Date(); today.setHours(0,0,0,0);
  var todayStr = localDateStr(today);
  switchTab('plan');
  for (var id in DAY_DATES) {
    if (DAY_DATES[id] === todayStr) { go(id); return; }
  }
  go('ov');
}

// ── KEYBOARD NAV ──
document.addEventListener('keydown', function(e) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  var plan = document.getElementById('tab-plan');
  if (!plan.classList.contains('active')) return;
  var curIdx = -1;
  VS.forEach(function(v, i) {
    var el = document.getElementById('view-'+v);
    if (el && el.classList.contains('active')) curIdx = i;
  });
  if (curIdx < 0) return;
  if (e.key === 'ArrowLeft' && curIdx > 0) { e.preventDefault(); go(VS[curIdx-1]); }
  if (e.key === 'ArrowRight' && curIdx < VS.length-1) { e.preventDefault(); go(VS[curIdx+1]); }
});

// ── SWIPE NAV (mobile) ──
(function() {
  var startX = 0, startY = 0, tracking = false;
  document.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) return;
    var t = e.target;
    if (t && t.closest && (t.closest('.chain-flow-h') || t.closest('.tab-bar') || t.closest('#tab-timeline'))) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, {passive: true});
  document.addEventListener('touchmove', function(e) {
    if (!tracking) return;
    var dx = e.touches[0].clientX - startX;
    var dy = Math.abs(e.touches[0].clientY - startY);
    if (Math.abs(dx) > 60 && Math.abs(dx) > dy * 1.5) {
      tracking = false;
      var plan = document.getElementById('tab-plan');
      if (!plan || !plan.classList.contains('active')) return;
      var curIdx = -1;
      VS.forEach(function(v, i) {
        var el = document.getElementById('view-' + v);
        if (el && el.classList.contains('active')) curIdx = i;
      });
      if (curIdx < 0) return;
      if (dx < 0 && curIdx < VS.length - 1) go(VS[curIdx + 1]);
      else if (dx > 0 && curIdx > 0) go(VS[curIdx - 1]);
    }
  }, {passive: true});
  document.addEventListener('touchend', function() { tracking = false; });
})();

// ── TICK PERSISTENCE (localStorage) ──
function updateDayProgress(dayId) {
  var chip = document.getElementById('dp-' + dayId);
  if (!chip) return;
  var panel = document.getElementById('view-' + dayId);
  if (!panel) return;
  var tickable = panel.querySelectorAll('.tc.tickable[data-tickid]');
  var done = 0;
  tickable.forEach(function(tc) { if (tc.classList.contains('ticked')) done++; });
  chip.textContent = done + '/' + tickable.length + ' done';
  chip.classList.toggle('all', tickable.length > 0 && done === tickable.length);
}
function updateAllDayProgress() {
  document.querySelectorAll('.dh-progress').forEach(function(c) {
    updateDayProgress(c.id.replace('dp-', ''));
  });
}
function restoreTicks() {
  document.querySelectorAll('.tc.tickable[data-tickid]').forEach(function(tc) {
    var id = tc.getAttribute('data-tickid');
    if (LS.get('tick-'+id) === '1') {
      tc.classList.add('ticked');
    }
  });
  if (typeof updateMDateStatus === 'function') updateMDateStatus();
  updateAllDayProgress();
}

// ── NEXT-UP CARD ──
function renderNextUp(dayId) {
  var box = document.getElementById('nextup-' + dayId);
  if (!box) return;
  var panel = document.getElementById('view-' + dayId);
  if (!panel) return;
  var next = null;
  // 1. Morning chain steps (in order, skip done)
  panel.querySelectorAll('[data-chain^="' + dayId + '-chain-"]').forEach(function(el) {
    if (next) return;
    if (LS.get('chain-' + el.getAttribute('data-chain')) === '1') return;
    next = { el: el, kind: 'chain' };
  });
  // 2. Day events in listed order (skip ticked)
  if (!next) {
    var evs = panel.querySelectorAll('.tc.tickable:not(.ticked)');
    for (var i = 0; i < evs.length; i++) {
      if (evs[i].closest('.done-fold')) continue;
      next = { el: evs[i], kind: 'event' };
      break;
    }
  }
  // 3. Evening wind-down steps (in order, skip done)
  if (!next) {
    panel.querySelectorAll('[data-chain^="' + dayId + '-pm-chain-"]').forEach(function(el) {
      if (next) return;
      if (LS.get('chain-' + el.getAttribute('data-chain')) === '1') return;
      next = { el: el, kind: 'pm' };
    });
  }
  if (!next) {
    box.className = 'nextup all-done';
    box.setAttribute('data-next', '');
    box.onclick = null;
    box.innerHTML = '<div class="nextup-emoji">🎉</div><div class="nextup-body"><div class="nextup-kicker">All done</div><div class="nextup-label">Everything is ticked off — enjoy the rest of the day.</div></div>';
    return;
  }
  var el = next.el;
  var emoji = '✅', label = '', meta = '';
  if (next.kind === 'chain' || next.kind === 'pm') {
    var em = el.querySelector('.chain-emoji');
    var lb = el.querySelector('.chain-label');
    if (em) emoji = em.textContent.trim();
    if (lb) label = lb.textContent.trim().replace(/<[^>]*>/g, '');
    meta = next.kind === 'pm' ? 'Evening wind-down' : 'Morning chain';
  } else {
    var tl = el.querySelector('.tl');
    var tt = el.querySelector('.tt');
    if (tl) {
      label = tl.textContent.trim();
      var m = label.match(/^\s*(\p{Extended_Pictographic})\s*(.*)$/u);
      if (m) { emoji = m[1]; label = m[2]; }
    }
    if (tt) meta = tt.textContent.trim();
  }
  box.className = 'nextup';
  box.setAttribute('data-next', next.kind);
  box.innerHTML = '<div class="nextup-emoji">' + esc(emoji) + '</div>'
    + '<div class="nextup-body"><div class="nextup-kicker">Next up</div>'
    + '<div class="nextup-label">' + esc(label) + '</div>'
    + (meta ? '<div class="nextup-meta">' + esc(meta) + '</div>' : '')
    + '</div><span class="nextup-arrow">→</span>';
  box.onclick = function() {
    if (el.click) el.click();
    renderNextUp(dayId);
  };
}

// ── COMPASS TOGGLE ──
function toggleCompass() {
  var open = LS.get('compass-open') === '1';
  LS.set('compass-open', open ? '0' : '1');
  applyCompassState();
}

function applyCompassState() {
  var open = LS.get('compass-open') === '1';
  document.querySelectorAll('.compass-card').forEach(function(card) {
    card.classList.toggle('open', open);
  });
}

// ── WEATHER PLACEMENT ──
function placeWeather() {
  var w = document.getElementById('weather-widget');
  if (!w) return;
  var active = document.querySelector('.day-panel.active');
  var top = active ? active.querySelector('.dh-top') : null;
  var center = top ? top.querySelector('.dh-center') : null;
  if (center) {
    if (w.parentElement === center) return;
    center.appendChild(w);
    return;
  }
  if (top) {
    if (w.parentElement === top) return;
    var prog = top.querySelector('.dh-progress');
    if (prog) prog.parentNode.insertBefore(w, prog);
    else top.appendChild(w);
    return;
  }
  var anchor = active ? (active.querySelector('.dh-focus') || null) : null;
  if (anchor) {
    if (w.parentElement === anchor.parentNode && w.previousElementSibling === anchor) return;
    anchor.parentNode.insertBefore(w, anchor.nextSibling);
    return;
  }
  var main = document.querySelector('.main');
  if (main && w.parentElement !== main) main.insertBefore(w, main.firstChild);
}

// ── MORNING CHAIN TOGGLE ──
function chainCount(flow) {
  var total = 0, done = 0;
  if (!flow) return { total: 0, done: 0 };
  flow.querySelectorAll('.chain-step[data-chain]').forEach(function(s) {
    total++;
    if (LS.get('chain-' + s.getAttribute('data-chain')) === '1') done++;
  });
  return { total: total, done: done };
}

function toggleChain(el, id) {
  // Always find the chain-step parent
  var step = el.closest ? el.closest('.chain-step') : el;
  if (!step || !step.classList.contains('chain-step')) step = el;
  var key = 'chain-' + id;
  var current = LS.get(key);
  var next = current === '1' ? '0' : '1';
  LS.set(key, next);
  if (next === '1') {
    step.classList.add('done');
  } else {
    step.classList.remove('done');
  }
  // Update status
  var dayId = id.split('-chain-')[0];
  var flow = step.closest ? (step.closest('.chain-flow') || step.closest('.chain-flow-h')) : null;
  var c = chainCount(flow);
  var statusEl = document.getElementById('chain-status-' + dayId);
  if (statusEl) {
    if (c.total > 0 && c.done === c.total) {
      statusEl.innerHTML = '✨🎉✨ Chain complete! ✨🎉✨';
      statusEl.style.color = '#1D9E75';
      statusEl.style.fontWeight = '600';
      statusEl.style.background = 'rgba(29,158,117,0.10)';
      statusEl.style.border = '1px solid rgba(29,158,117,0.30)';
      statusEl.style.borderRadius = '999px';
      statusEl.style.padding = '3px 12px';
      statusEl.style.display = 'inline-block';
      statusEl.style.animation = 'none';
      setTimeout(function() { if (statusEl) { statusEl.style.animation = 'sparkleFloat 2s ease-in-out infinite'; }}, 10);
    } else {
      statusEl.innerHTML = c.done + ' of ' + c.total + ' done';
      statusEl.style.color = '#9A9080';
      statusEl.style.fontWeight = '400';
      statusEl.style.background = 'transparent';
      statusEl.style.border = 'none';
      statusEl.style.padding = '0';
      statusEl.style.display = '';
    }
  }
  // Update progress bar
  updateChainProgress(dayId);
  renderNextUp(dayId);
}

// Keyboard navigation for chain steps: Enter/Space toggles, arrows move focus
document.addEventListener('keydown', function(e) {
  var el = document.activeElement;
  if (!el || !el.classList || !el.classList.contains('chain-step')) return;
  var flow = el.closest('.chain-flow-h');
  if (!flow) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleChain(el, el.getAttribute('data-chain'));
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    var steps = Array.prototype.slice.call(flow.querySelectorAll('.chain-step'));
    var i = steps.indexOf(el);
    var ni = e.key === 'ArrowRight' ? i + 1 : i - 1;
    if (ni >= 0 && ni < steps.length) {
      steps[ni].focus();
      steps[ni].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  } else if (e.key === 'Home' || e.key === 'End') {
    e.preventDefault();
    var all = Array.prototype.slice.call(flow.querySelectorAll('.chain-step'));
    var target = e.key === 'Home' ? all[0] : all[all.length - 1];
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }
});

function updateChainProgress(dayId) {
  var bar = document.getElementById('chain-progress-' + dayId);
  if (!bar) return;
  var flow = document.getElementById('chain-flow-' + dayId) || bar.parentElement;
  var c = chainCount(flow);
  var total = c.total;
  var done = c.done;
  if (total === 0) return;
  if (done === 0) {
    bar.style.width = '0';
    bar.style.height = '0px';
    bar.classList.remove('complete');
    return;
  }
  var isH = flow.classList.contains('chain-flow-h');
  if (isH) {
    // Horizontal: fill width
    var pct = (done / total) * 100;
    bar.style.width = pct + '%';
    bar.style.height = '100%';
  } else {
    // Vertical: fill height
    var stepH = flow.scrollHeight / total;
    bar.style.height = (stepH * done) + 'px';
    bar.style.width = '100%';
  }
  if (done === total) {
    bar.classList.add('complete');
  } else {
    bar.classList.remove('complete');
  }
}

function restoreChains() {
  document.querySelectorAll('[data-chain]').forEach(function(el) {
    var id = el.getAttribute('data-chain');
    if (LS.get('chain-' + id) === '1') {
      if (el.classList.contains('chain-step')) {
        el.classList.add('done');
      } else {
        var chk = el.querySelector('span');
        el.style.background = 'var(--pl-F0FFF4)';
        el.style.borderRadius = '4px';
        if (chk) { chk.style.background = 'var(--pl-1D9E75)'; chk.style.borderColor = 'var(--pl-1D9E75)'; chk.innerHTML = '✓'; chk.style.color = '#FFFFFF'; chk.style.fontSize = '9px'; chk.style.textAlign = 'center'; chk.style.lineHeight = '14px'; }
        el.style.textDecoration = 'line-through';
        el.style.color = '#9A9080';
      }
    }
  });
  // Restore status text
  document.querySelectorAll('[id^="chain-status-"]').forEach(function(statusEl) {
    var dayId = statusEl.id.replace('chain-status-', '');
    var flow = document.getElementById('chain-flow-' + dayId);
    var c = chainCount(flow);
    if (c.total > 0 && c.done === c.total) {
      statusEl.innerHTML = '🎉 Chain complete!';
      statusEl.style.color = '#1D9E75';
      statusEl.style.fontWeight = '600';
      statusEl.style.background = 'rgba(29,158,117,0.10)';
      statusEl.style.border = '1px solid rgba(29,158,117,0.30)';
      statusEl.style.borderRadius = '999px';
      statusEl.style.padding = '3px 12px';
      statusEl.style.display = 'inline-block';
    } else {
      statusEl.innerHTML = c.done + ' of ' + c.total + ' done';
      statusEl.style.color = '#9A9080';
      statusEl.style.background = 'transparent';
      statusEl.style.border = 'none';
      statusEl.style.padding = '0';
      statusEl.style.display = '';
    }
  });
  // Restore progress bars
  document.querySelectorAll('[id^="chain-status-"]').forEach(function(statusEl) {
    var dayId = statusEl.id.replace('chain-status-', '');
    updateChainProgress(dayId);
  });
  // Rebuild next-up cards for all days
  document.querySelectorAll('[id^="nextup-"]').forEach(function(box) {
    renderNextUp(box.id.replace('nextup-', ''));
  });
}

// ── HORIZONTAL TIMELINE ──
function createTimeRuler() {
  var col = document.createElement('div');
  col.className = 'tl-ruler';
  var h = '<div class="tl-ruler-hdr"></div><div class="tl-ruler-body">';
  for (var i = 7; i <= 21; i++) {
    var lbl = i >= 12 ? (i===12?'12':i-12)+'pm' : i+'am';
    h += '<div class="tl-ruler-hour" style="top:'+((i-7)*50)+'px">'+lbl+'</div>';
  }
  h += '</div>';
  col.innerHTML = h;
  return col;
}

function renderTimeline() {
  var c = document.getElementById('timeline-scroll');
  if (!c) return;
  c.innerHTML = '';
  c.appendChild(createTimeRuler());
  var today = new Date(); today.setHours(0,0,0,0);
  var todayStr = localDateStr(today);

  // Find start index: today or first day after today
  var startIdx = DAYS.findIndex(function(d) { return d.dateISO >= todayStr; });
  if (startIdx < 0) startIdx = 0;

  for (var i = startIdx; i < DAYS.length; i++) {
    c.appendChild(createTimelineDay(DAYS[i]));
  }

  // Generate future days (next 60 days)
  var lastDate = DAYS.length ? new Date(DAYS[DAYS.length-1].dateISO) : today;
  if (!DAYS.length) lastDate = today;
  for (var j = 1; j <= 60; j++) {
    var d = new Date(lastDate); d.setDate(d.getDate() + j);
    var ds = localDateStr(d);
    var dows = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var futureDay = {
      id: 'future-'+ds,
      dow: dows[d.getDay()],
      date: d.getDate()+' '+months[d.getMonth()],
      dateISO: ds,
      focus: '🕊️ Future day',
      events: []
    };
    c.appendChild(createTimelineDay(futureDay));
  }
}

function renderArchive() {
  var el = document.getElementById('archive-scroll');
  if (!el) return;
  var html = '';
  var any = false;
  DAYS.forEach(function(d) {
    var arch = (d.events || []).filter(function(ev) { return ev.archived; });
    if (!arch.length) return;
    any = true;
    html += '<div class="sl">' + d.dow + ' ' + d.date + ' <span style="font-weight:600;color:var(--pl-B4B2A9);">(' + arch.length + ')</span></div>';
    arch.slice().sort(function(a, b) { return (a.time || '').localeCompare(b.time || ''); }).forEach(function(ev) {
      html += '<div class="tc ticked" style="opacity:0.55;margin-bottom:6px;">';
      html += '<div class="chk">✓</div>';
      html += '<div class="tt" style="min-width:66px;">' + ev.time + '</div>';
      html += '<div class="tb" style="flex:1;"><div class="tl" style="text-decoration:line-through;color:var(--pl-888888);">' + (ev.link?'<a href="'+esc(ev.link)+'" target="_blank" onclick="event.stopPropagation()">'+esc(ev.text)+'</a>':esc(ev.text)) + '</div></div></div>';
    });
  });
  if (!any) html += '<div style="color:var(--pl-B4B2A9);font-size:12px;padding:24px 4px;text-align:center;">Nothing archived yet.</div>';
  el.innerHTML = html;
}

function createTimelineDay(d) {
  var col = document.createElement('div');
  col.className = 'tl-col';
  col.setAttribute('data-date', d.dateISO);
  var rawEvs = buildEvents(d);
  // Merge consecutive free blocks
  var evs = [];
  for (var i = 0; i < rawEvs.length; i++) {
    if (rawEvs[i].free && evs.length && evs[evs.length-1].free) {
      var prev = evs[evs.length-1];
      prev.endMin = rawEvs[i].endMin;
      prev.dur = prev.endMin - prev.startMin;
      var totalMin = prev.dur;
      if (totalMin >= 180) { prev.freeCls = 'free-3h'; }
      else if (totalMin >= 120) { prev.freeCls = 'free-2h'; }
      else { prev.freeCls = 'free-1h'; }
      prev.time = minToTime(prev.startMin)+'–'+minToTime(prev.endMin);
      prev.text = prev.freeCls === 'free-3h' ? '🟢 '+Math.floor(totalMin/60)+'h free'
               : prev.freeCls === 'free-2h' ? '🟡 '+Math.floor(totalMin/60)+'h free'
               : '🟠 '+Math.floor(totalMin/60)+'h free';
    } else {
      evs.push(rawEvs[i]);
    }
  }
  var h = '<div class="tl-col-hdr"><div class="tl-col-dow">'+d.dow.substring(0,3)+'</div><div class="tl-col-date">'+d.date+'</div></div>';
  h += '<div class="tl-col-focus">'+esc(d.focus)+'</div>';
  h += '<div class="tl-col-body">';
  evs.forEach(function(ev) {
    var isDayOff = !ev.free && eventCategory(ev).id === 'free';
    var cls = 'tl-ev'+(ev.buffer?' tl-buf':'')+(ev.free?' tl-free '+ev.freeCls:'')+(ev.teaching?' tl-teaching':'')+(ev.fnh?' tl-fnh':'')+(isDayOff?' tl-day-off':'');
    var top = Math.max(0, ((ev.startMin - 420) / 60) * 50);
    var ht = Math.max(20, (ev.dur / 60) * 50);
    ht = Math.min(ht, 750 - top);
    h += '<div class="'+cls+'" style="top:'+top+'px;height:'+ht+'px;min-height:0;">';
    h += '<div class="tl-ev-tt">'+ev.time+'</div>';
    h += '<div class="tl-ev-tl">'+esc(ev.text)+'</div>';
    h += '</div>';
  });
  h += '</div>';
  col.innerHTML = h;
  return col;
}

// ── COPY COMPLETED TASKS ──
function paneText(id) {
  var pane = document.getElementById(id);
  if (!pane) return '';
  var clone = pane.cloneNode(true);
  clone.style.cssText = 'position:fixed;left:-9999px;top:0;width:640px;visibility:visible;display:block;';
  document.body.appendChild(clone);
  var text = clone.innerText || clone.textContent || '';
  document.body.removeChild(clone);
  return text;
}

function copyAllPlans() {
  var sections = [
    {id:'tab-strat', title:'🧭 STRATEGIC FOUNDATION'},
    {id:'tab-plan75', title:'🎯 THE $70K PLAN'},
    {id:'tab-budget', title:'💰 FINANCIAL PLAN'},
    {id:'tab-dreams', title:'✨ DREAMS'}
  ];
  var parts = [];
  sections.forEach(function(sec) {
    var text = paneText(sec.id).replace(/\n{3,}/g, '\n\n').trim();
    if (text) parts.push(sec.title + '\n' + text);
  });
  if (!parts.length) { showToast('Nothing to copy'); return; }
  var output = parts.join('\n\n────────────────────\n\n');
  copyText(output, '✓ Copied all four plans');
}

function copyCompleted(dayId) {
  var panel = document.getElementById('view-'+dayId);
  if (!panel) return;
  var tasks = [];
  panel.querySelectorAll('.tc.ticked').forEach(function(tc) {
    var tt = tc.querySelector('.tt');
    var tl = tc.querySelector('.tl');
    if (tt && tl) tasks.push(tt.textContent.trim() + ' ' + tl.textContent.trim());
  });
  if (!tasks.length) { showToast('No completed tasks for this day'); return; }
  var text = dayLabel(dayId) + ' — Completed:\n' + tasks.join('\n');
  copyText(text, 'Copied ' + tasks.length + ' completed task(s)');
}

function copyMatrixCompleted() {
  var panel = document.getElementById('tab-lookin');
  if (!panel) return;
  var groups = [];
  var current = null;
  panel.querySelectorAll('div').forEach(function(el) {
    if (el.classList.contains('lookin-sec')) {
      current = { name: el.textContent.trim(), items: [] };
      groups.push(current);
      return;
    }
    if (!current || !el.classList.contains('tc') || !el.classList.contains('ticked')) return;
    var tl = el.querySelector('.tl');
    if (!tl) return;
    var line = '✓ ' + tl.textContent.trim();
    var tn = el.querySelector('.tn');
    if (tn && tn.textContent.trim()) line += ' — ' + tn.textContent.trim();
    current.items.push(line);
  });
  var total = groups.reduce(function(n, g) { return n + g.items.length; }, 0);
  if (!total) { showToast('No completed tasks'); return; }
  var text = 'Tasks — Completed:\n' + groups.map(function(g) {
    if (!g.items.length) return null;
    return g.name + '\n' + g.items.map(function(i) { return '  ' + i; }).join('\n');
  }).filter(Boolean).join('\n\n');
  copyText(text, 'Copied ' + total + ' completed task(s)');
}

function copyText(text, okMsg) {
  function done(ok) {
    if (okMsg) showToast(ok ? okMsg : 'Failed to copy');
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(false); });
    return;
  }
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  var ok = false;
  try { ok = document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
  done(ok);
}

function showToast(msg) {
  var el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;bottom:max(20px, env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);background:var(--pl-1A1A18);color:#FFFFFF;padding:8px 16px;border-radius:8px;font-size:12px;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;max-width:90vw;text-align:center;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._hide);
  el._hide = setTimeout(function(){ el.style.opacity = '0'; }, 2000);
}

// ── JOURNAL PROMPTS ──
function copyPrompt(el) {
  var card = el.closest ? el.closest('.tc') : el;
  var prompt = card ? card.getAttribute('data-prompt') : el.getAttribute('data-prompt');
  if (!prompt) return;
  copyText(prompt, '✓ Prompt copied');
}

function openDetail(el) {
  var card = el.closest ? el.closest('.tc') : el;
  if (!card || !card.getAttribute('data-detail')) return;
  var title = card.querySelector('.tl');
  var detail = card.getAttribute('data-detail');
  document.getElementById('task-detail-title').textContent = title ? title.textContent.replace(/→$/,'').trim() : '';
  document.getElementById('task-detail-body').innerHTML = esc(detail);
  document.getElementById('task-detail-overlay').classList.add('open');
}
function closeDetail() {
  document.getElementById('task-detail-overlay').classList.remove('open');
}

document.addEventListener('click', function(e) {
  var tl = e.target.closest('.tc[data-detail] .tl');
  if (tl) { e.preventDefault(); e.stopPropagation(); openDetail(tl); }
}, true);

function surprisePrompt() {
  var cards = document.querySelectorAll('#tab-lookin .tc[data-prompt]');
  if (!cards.length) return;
  var prompts = [];
  cards.forEach(function(c) {
    var p = c.getAttribute('data-prompt');
    if (p) prompts.push(p);
  });
  var pick = prompts[Math.floor(Math.random() * prompts.length)];
  var out = document.getElementById('surprise-out');
  if (out) {
    out.style.display = 'block';
    out.innerHTML = '<div style="font-size:9px;font-weight:700;color:var(--pl-8B5CF6);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">🎲 Today\'s prompt</div>' + pick;
  }
  copyText(pick, '✓ Copied');
}

function go(id) {
  if (id.indexOf('week-') === 0) {
    var idx = parseInt(id.split('-')[1]);
    renderWeekSummary(idx);
    document.getElementById('week-summary-container').style.display = 'block';
    var c = document.getElementById('day-panels-container');
    if (c) c.style.display = 'none';
  } else {
    var ws = document.getElementById('week-summary-container');
    if (ws) ws.style.display = 'none';
    var c = document.getElementById('day-panels-container');
    if (c) c.style.display = '';
  }

  VS.forEach(function(v) {
    var el = document.getElementById('view-' + v);
    if (el) el.classList.toggle('active', v === id);
  });
  placeWeather();
  if (id.indexOf('view-') === 0) renderNextUp(id.replace('view-', ''));
  document.querySelectorAll('.day-btn').forEach(function(b) {
    b.classList.toggle('active', (b.getAttribute('onclick') || '').includes("'" + id + "'"));
  });
  var m = document.querySelector('.main');
  if (m) m.scrollTop = 0;
  // Close sidebar on mobile
  var sb = document.querySelector('.sidebar');
  if (sb && sb.classList.contains('open')) {
    sb.classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  }
  // Sidebar auto-scroll to active day
  var activeBtn = document.querySelector('.day-btn.active');
  if (activeBtn) activeBtn.scrollIntoView({block:'nearest', behavior:'smooth'});
  highlightNow();
  updateTodayBtn();
  if (id.indexOf('week-') !== 0) syncTicksFromBackend(id);
}

function updateTodayBtn() {
  var btn = document.getElementById('scroll-today-btn');
  if (!btn) return;
  var todayStr = localDateStr(new Date());
  var todayId = null;
  for (var id in DAY_DATES) {
    if (DAY_DATES[id] === todayStr) { todayId = id; break; }
  }
  var cur = document.querySelector('.day-panel.active,.view.active');
  var isToday = todayId ? (cur && cur.id === 'view-' + todayId) : false;
  btn.classList.toggle('show', !isToday);
}

// ── WEATHER WIDGET (Open-Meteo — free, no API key) ──
var WEATHER_LAT = -37.8136;
var WEATHER_LON = 144.9631;
var WEATHER_PLACE = 'Melbourne';

function weatherCodeInfo(code, isDay) {
  if (code === 0) return isDay ? ['☀️','Clear'] : ['🌙','Clear'];
  if (code === 1) return isDay ? ['🌤️','Mostly clear'] : ['🌙','Mostly clear'];
  if (code === 2) return ['⛅','Partly cloudy'];
  if (code === 3) return ['☁️','Overcast'];
  if (code === 45 || code === 48) return ['🌫️','Fog'];
  if (code >= 51 && code <= 57) return ['🌦️','Drizzle'];
  if (code >= 61 && code <= 67) return ['🌧️','Rain'];
  if (code >= 71 && code <= 77) return ['🌨️','Snow'];
  if (code >= 80 && code <= 82) return ['🌦️','Rain showers'];
  if (code >= 85 && code <= 86) return ['🌨️','Snow showers'];
  if (code >= 95) return ['⛈️','Thunderstorm'];
  return ['🌡️','Mixed'];
}

function loadWeather() {
  var el = document.getElementById('weather-widget');
  if (!el) return;
  var url = 'https://api.open-meteo.com/v1/forecast?latitude='+WEATHER_LAT+'&longitude='+WEATHER_LON
    + '&current=temperature_2m,apparent_temperature,weather_code,is_day'
    + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    + '&timezone=Australia%2FMelbourne&forecast_days=1';
  el.style.opacity = '0.6';
  fetch(url)
    .then(function(r) { if (!r.ok) throw new Error('weather'); return r.json(); })
    .then(function(d) {
      var c = d.current;
      var info = weatherCodeInfo(c.weather_code, c.is_day === 1);
      var daily = d.daily;
      var rain = daily && daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : null;
      var updated = new Date().toLocaleTimeString('en-AU', {hour:'2-digit', minute:'2-digit'});
      el.style.display = 'flex';
      el.style.opacity = '1';
      el.innerHTML = '<div class="weather-emoji">'+info[0]+'</div>'
        + '<div><div class="weather-temp">'+Math.round(c.temperature_2m)+'°C</div>'
        + '<div class="weather-desc">'+info[1]+' · feels '+Math.round(c.apparent_temperature)+'°</div></div>'
        + '<div class="weather-meta">'+WEATHER_PLACE+'<br>H '+Math.round(daily.temperature_2m_max[0])+'° · L '+Math.round(daily.temperature_2m_min[0])+'°'+(rain!=null ? ' · ☔ '+rain+'%' : '')+'<br><span style="font-size:9px;color:var(--pl-B4B2A9);">↻ '+updated+'</span></div>';
    })
    .catch(function(err) {
      console.warn("[planner] weather fetch failed", err);
      el.style.display = 'none';
      el.style.opacity = '1';
    });
}
// Refresh weather every 30 min and on tap
setInterval(loadWeather, 30 * 60 * 1000);
document.addEventListener('click', function(e) {
  if (e.target.closest && e.target.closest('#weather-widget') && !e.target.closest('.tab-dropdown')) loadWeather();
});

// ── NOW INDICATOR ──
function parseRange(tc) {
  var tt = tc.querySelector('.tt');
  if (!tt) return null;
  var parts = tt.textContent.trim().split(/[–\-—]/);
  if (parts.length !== 2) return null;
  var p = parts[0].trim().split(':'), q = parts[1].trim().split(':');
  if (p.length < 2 || q.length < 2) return null;
  return [parseInt(p[0]) * 60 + parseInt(p[1]), parseInt(q[0]) * 60 + parseInt(q[1])];
}
function highlightNow() {
  document.querySelectorAll('.tc.now-event,.tc.next-event').forEach(function(e) {
    e.classList.remove('now-event', 'next-event');
  });
  var active = document.querySelector('.day-panel.active');
  if (!active) return;
  var dayId = active.id.replace('view-', '');
  var dayData = DAYS.find(function(d) { return d.id === dayId; });
  if (!dayData || dayData.dateISO !== localDateStr(new Date())) return;
  var now = new Date();
  var nowMin = now.getHours() * 60 + now.getMinutes();
  var foundNext = false;
  active.querySelectorAll('.tc').forEach(function(tc) {
    if (tc.classList.contains('free') || tc.classList.contains('ticked')) return;
    var r = parseRange(tc);
    if (!r) return;
    if (nowMin >= r[0] && nowMin < r[1]) { tc.classList.add('now-event'); return; }
    if (!foundNext && nowMin < r[0]) { tc.classList.add('next-event'); foundNext = true; }
  });
  // Live free blocks: shrink to "now–end" as time passes, hide once fully past
  active.querySelectorAll('.tc.free').forEach(function(tc) {
    var s = parseInt(tc.getAttribute('data-s'), 10);
    var e = parseInt(tc.getAttribute('data-e'), 10);
    if (isNaN(s) || isNaN(e)) return;
    if (nowMin >= e) { tc.style.display = 'none'; return; }
    tc.style.display = '';
    var liveStart = Math.max(nowMin, s);
    var remain = e - liveStart;
    var tt = tc.querySelector('.tt');
    if (tt) tt.textContent = minToTime(liveStart) + '–' + minToTime(e);
    var tl = tc.querySelector('.tl');
    if (tl) {
      var dot = remain >= 180 ? '🟢' : remain >= 120 ? '🟡' : '🟠';
      tl.textContent = dot + ' ' + fmtDur(remain) + ' free';
    }
    tc.style.minHeight = Math.max(36, Math.min(72, Math.round(remain * 0.5))) + 'px';
  });
  // Now line: map time-of-day to a Y position across the card stack
  var line = active.querySelector('.now-line');
  if (line) {
    var panelRect = active.getBoundingClientRect();
    var pts = [];
    active.querySelectorAll('.tc').forEach(function(tc) {
      if (tc.closest('.done-fold')) return;
      if (tc.classList.contains('ticked')) return;
      var h = tc.getBoundingClientRect().height;
      if (!h) return;
      var r = parseRange(tc);
      if (!r) return;
      var top = tc.getBoundingClientRect().top - panelRect.top;
      pts.push([r[0], top]);
      pts.push([r[1], top + h]);
    });
    pts.sort(function(a, b) { return a[0] - b[0]; });
    var y = -1;
    if (pts.length && nowMin >= pts[0][0] && nowMin <= pts[pts.length - 1][0]) {
      for (var i = 1; i < pts.length; i++) {
        if (pts[i][0] < nowMin) continue;
        var p0 = pts[i - 1], p1 = pts[i];
        if (p1[0] === p0[0]) { y = p1[1]; break; }
        var t = (nowMin - p0[0]) / (p1[0] - p0[0]);
        y = p0[1] + t * (p1[1] - p0[1]);
        break;
      }
    }
    if (y >= 0) { line.style.top = Math.round(y) + 'px'; line.classList.add('show'); }
    else { line.classList.remove('show'); }
  }
}

// ── TAB-BAR SCROLL FADE (shows there are more tabs) ──
(function() {
  function setTabBarFade(bar) {
    var can = bar.scrollWidth > bar.clientWidth + 2;
    bar.classList.toggle('scrolly', can);
    bar.classList.toggle('at-end', !can || bar.scrollLeft + bar.clientWidth >= bar.scrollWidth - 2);
  }
  document.querySelectorAll('.tab-bar').forEach(function(bar) {
    setTabBarFade(bar);
    bar.addEventListener('scroll', function() { setTabBarFade(bar); }, { passive: true });
    window.addEventListener('resize', function() { setTabBarFade(bar); });
  });
})();

window.addEventListener('DOMContentLoaded', function() {
  loadWeather();
  populateRecurring();
  buildLookups();
  renderSidebar();
  renderOverview();
  renderDays();
  renderGifts();
  restoreTicks();
  restoreChains();
  applyCompassState();
  // Open to today's date if it exists in the plan, otherwise Overview
  var today = new Date(); today.setHours(0,0,0,0);
  var todayStr = localDateStr(today);
  var target = 'ov';
  for (var id in DAY_DATES) {
    if (DAY_DATES[id] === todayStr) { target = id; break; }
  }
  go(target);
  syncMobileNav('plan');
  setMobileTitle('plan');
  var rng = (typeof planRangeLabel === 'function') ? planRangeLabel() : '';
  if (rng) { document.title = 'Plan — ' + rng; var tbar = document.querySelector('.tab-bar-title'); if (tbar) tbar.textContent = rng; var ovd = document.getElementById('ov-dh-dow'); if (ovd) ovd.textContent = rng; }
  // Highlight today in sidebar
  for (var id in DAY_DATES) {
    if (DAY_DATES[id] === todayStr) {
      document.querySelectorAll('.day-btn').forEach(function(b) {
        if ((b.getAttribute('onclick') || '').includes("'" + id + "'")) {
          b.classList.add('today');
        }
      });
      break;
    }
  }
  highlightNow();
  // Refresh now-indicator every minute
  setInterval(highlightNow, 60000);
  showLiveBadge();
});

// ── LIVE VERSION BADGE ──
function showLiveBadge() {
  var el = document.getElementById('live-badge');
  if (!el) return;
  // Fetch the served file and read its Last-Modified header: this is the real
  // "latest code actually on the server" timestamp, displayed on the iPhone.
  fetch(window.location.href, { cache: 'no-store', method: 'GET' })
    .then(function(r) {
      var lm = r.headers.get('Last-Modified');
      if (!lm) { el.style.display = 'none'; return; }
      var d = new Date(lm);
      var now = new Date();
      var sameDay = d.toDateString() === now.toDateString();
      var when = sameDay
        ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      el.textContent = '● ' + when;
      el.style.display = 'inline';
      el.title = 'Live from server · ' + d.toLocaleString();
    })
    .catch(function() { el.style.display = 'none'; });
}

// ── CAPACITY NAV ──
function capShow(id) {
  document.querySelectorAll('.view').forEach(function(v) { v.classList.toggle('active', v.id === 'view-' + id); });
  document.querySelectorAll('.sb-btn').forEach(function(b) {
    b.classList.toggle('active', (b.getAttribute('onclick') || '').includes("'" + id + "'"));
  });
  var m = document.querySelector('.main');
  if (m) m.scrollTop = 0;
}

// ── TICK SYSTEM + LOCALSTORAGE ──
function updateMDateStatus() {
  var steps = document.querySelectorAll('#mdate-steps .tc.tickable');
  var done = 0;
  steps.forEach(function(s) { if (s.classList.contains('ticked')) done++; });
  var status = document.getElementById('mdate-status');
  if (status) {
    if (done === 0) status.textContent = 'Tap to tick — done lightly, then closed.';
    else if (done === steps.length) { status.textContent = '✓ Money date complete — now closed. 🍵'; status.style.color = '#1D9E75'; }
    else status.textContent = done + ' of ' + steps.length + ' done';
  }
}

document.addEventListener('click', function(e) {
  var tc = e.target.closest('.tc.tickable');
  if (!tc) return;
  tc.classList.toggle('ticked');
  var id = tc.getAttribute('data-tickid');
  if (id) {
    if (tc.classList.contains('ticked')) LS.set('tick-'+id, '1');
    else LS.del('tick-'+id);
  }
  if (id && id.indexOf('mdate-') === 0) updateMDateStatus();
  var panel = tc.closest ? tc.closest('.day-panel') : null;
  if (panel) {
    var pid = panel.id.replace('view-', '');
    updateDayProgress(pid);
    renderNextUp(pid);
    syncTickToBackend(pid, tc, id, tc.classList.contains('ticked'));
  }
});

// ── TICK → BACKEND (Neon) ──
// Mirrors a day-panel tick/untick to planner-api so the Mini job can rename
// the matching calendar entry with a ✅ prefix. Sends day+startMin+text
// (+duration); the Worker upserts so a tick before planner_push ran is not lost.
function syncTickToBackend(pid, tc, tickId, done) {
  var day = DAY_DATES[pid];
  if (!day) return;
  var ttEl = tc.querySelector && tc.querySelector('.tt');
  var tlEl = tc.querySelector && tc.querySelector('.tl');
  if (!ttEl || !tlEl) return;
  var tr = timeRange(ttEl.textContent);
  var startMin = toMin(tr.start);
  var text = tlEl.textContent.trim();
  if (!text) return;
  var dur = tr.end ? (toMin(tr.end) - startMin) : 0;
  if (!(dur > 0)) dur = 30;
  try {
    fetch('https://planner-api.daniele-buatti.workers.dev/tasks/done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day: day, startMin: startMin, done: done, text: text, duration: dur })
    }).catch(function(err){ console.warn("[planner] tick sync failed", err); });
  } catch (e) {}
}

// Pull the day's done-state back from the backend so ticks made on another
// device (e.g. iPhone) show up here. Runs on load + on every day navigation.
// Idempotent: only sets/clears .ticked to match the Neon row and mirrors it to
// local storage so restoreTicks / updateDayProgress stay consistent. Chips the
// backend has no row for are left untouched (no fight over local-only state).
function syncTicksFromBackend(pid) {
  var day = DAY_DATES[pid];
  if (!day || pid === 'ov') return;
  var panel = document.getElementById('view-' + pid);
  if (!panel) return;
  fetch('https://planner-api.daniele-buatti.workers.dev/tasks?day=' + encodeURIComponent(day))
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(j) {
      if (!j || !j.ok || !j.tasks || !j.tasks.length) return;
      panel.querySelectorAll('.tc.tickable[data-tickid]').forEach(function(tc) {
        var ttEl = tc.querySelector('.tt'), tlEl = tc.querySelector('.tl');
        if (!ttEl || !tlEl) return;
        var sm;
        try { sm = toMin(timeRange(ttEl.textContent).start); } catch (err) { return; }
        var txt = tlEl.textContent.trim();
        var bak = null;
        for (var i = 0; i < j.tasks.length; i++) {
          if (j.tasks[i].start_min === sm && j.tasks[i].text === txt) { bak = j.tasks[i]; break; }
        }
        if (!bak) return;
        var on = !!bak.done;
        var id = tc.getAttribute('data-tickid');
        if (on && !tc.classList.contains('ticked')) {
          tc.classList.add('ticked');
          if (id) LS.set('tick-' + id, '1');
        } else if (!on && tc.classList.contains('ticked')) {
          tc.classList.remove('ticked');
          if (id) LS.del('tick-' + id);
        }
      });
      updateDayProgress(pid);
      renderNextUp(pid);
    }).catch(function(err){ console.warn("[planner] backend tick pull failed", err); });
}

// ── SEARCH ──
function openSearch() {
  document.getElementById('search-overlay').style.display = 'flex';
  document.getElementById('global-search').focus();
}
function closeSearch() {
  document.getElementById('search-overlay').style.display = 'none';
  document.getElementById('global-search').value = '';
  var mi = document.getElementById('global-search-m'); if (mi) mi.value = '';
  document.getElementById('search-results').innerHTML = '';
}
document.addEventListener('keydown', function(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') closeSearch();
});
function runSearch(q) {
  q = q.toLowerCase().trim();
  var overlay = document.getElementById('search-overlay');
  var res = document.getElementById('search-results');
  res.innerHTML = '';
  var sc = document.getElementById('search-clear');
  if (sc) sc.style.display = q ? 'inline' : 'none';
  if (!q) { overlay.style.display = 'none'; return; }
  overlay.style.display = 'block';
  var hits = [];
  VS.forEach(function(v) {
    var el = document.getElementById('view-' + v);
    if (!el) return;
    el.querySelectorAll('.tl').forEach(function(tl) {
      if (tl.textContent.toLowerCase().includes(q)) {
        hits.push({ day: v, text: tl.textContent.trim() });
      }
    });
  });
  if (!hits.length) { res.innerHTML = '<div style="color:var(--pl-9A9080);padding:12px;">No results found.</div>'; return; }
  hits.forEach(function(h) {
    var d = document.createElement('div');
    d.className = 'sres-item';
    d.style.cssText = 'padding:11px 14px;cursor:pointer;border-bottom:1px solid var(--pl-EEEEEE);font-size:13px;';
    d.innerHTML = '<span style="color:var(--pl-C4A96A);font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">' + esc(h.day) + '</span><br>' + esc(h.text);
    d.onclick = function() { closeSearch(); go(h.day); };
    res.appendChild(d);
  });
}
function clearSearch() {
  document.getElementById('global-search').value = '';
  var mi = document.getElementById('global-search-m'); if (mi) mi.value = '';
  document.getElementById('search-results').innerHTML = '';
  var sc = document.getElementById('search-clear');
  if (sc) sc.style.display = 'none';
  document.getElementById('search-overlay').style.display = 'none';
}

// ── PRINT ──
var _printStyleEl = null;
function setPrintOrientation(portrait) {
  if (!_printStyleEl) {
    _printStyleEl = document.createElement('style');
    document.head.appendChild(_printStyleEl);
  }
  _printStyleEl.textContent = portrait
    ? '@media print { @page { size: A4 portrait; margin: 10mm 12mm; } }'
    : '@media print { @page { size: A4 landscape; margin: 10mm 12mm; } }';
}

function buildPrintCheckboxes() {
  var container = document.getElementById('print-day-checks');
  if (!container) return;
  container.innerHTML = '';
  var today = new Date(); today.setHours(0,0,0,0);
  var cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + 7);
  ALL_PRINT_DAYS.forEach(function(d) {
    if (!document.getElementById('view-' + d.id)) return;
    var label = document.createElement('label');
    label.className = 'print-day-cb-label';
    label.style.cssText = 'font-size:11px;display:flex;align-items:center;gap:4px;';
    var cb = document.createElement('input');
    cb.type = 'checkbox'; cb.className = 'print-day-cb'; cb.value = d.id;
    var dayDate = DAY_DATES[d.id] ? new Date(DAY_DATES[d.id]) : null;
    if (dayDate && dayDate >= today && dayDate <= cutoff) cb.checked = true;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + d.label));
    container.appendChild(label);
  });
}

function toggleAllPrint(checked) {
  document.querySelectorAll('.print-day-cb').forEach(function(cb) { cb.checked = checked; });
}

function openPrint() { buildPrintCheckboxes(); document.getElementById('print-bar').style.display = 'flex'; }
function closePrint() {
  document.getElementById('print-bar').style.display = 'none';
  document.querySelectorAll('.day-panel').forEach(function(p) { p.classList.remove('print-me','page-break-before'); });
  if (_printStyleEl) _printStyleEl.textContent = '';
}
function doPrint() {
  document.querySelectorAll('.day-panel').forEach(function(p) { p.classList.remove('print-me','page-break-before'); });
  var checked = Array.from(document.querySelectorAll('.print-day-cb:checked')).map(function(c) { return c.value; });
  if (checked.length === 0) {
    var act = document.querySelector('.day-panel.active');
    if (act) checked = [act.id.replace('view-','')];
  }
  var single = checked.length === 1;
  setPrintOrientation(single ? true : false);
  checked.forEach(function(id) {
    var el = document.getElementById('view-' + id);
    if (!el) return;
    el.classList.add('print-me');
  });
  document.body.classList.add(single ? 'print-single' : 'print-2');
  window.print();
  setTimeout(function() { document.body.classList.remove('print-2','print-pair','print-single'); closePrint(); }, 1000);
}

// ── FOUR GIFTS TRACKER ──
var GIFT_QUESTIONS = [
  '"Where did Compromise wear a costume today?"',
  '"Did today feel like a labour of love, or performed competence?"',
  '"Would I do this week again gladly?"',
  '"Did the roster energise or drain today?"',
  '"Was today Style, or Compromise with a stage?"',
  '"What would whole-hearted look like right now?"',
  '"Did I play, or just produce?"'
];

function toggleGift(i) {
  var key = 'gift-' + localDateStr(new Date()) + '-' + i;
  var done = LS.get(key) === '1';
  if (done) LS.del(key);
  else LS.set(key, '1');
  renderGifts();
}

function renderGifts() {
  var today = localDateStr(new Date());
  var count = 0;
  var colors = ['var(--pl-5A8BC0)','var(--pl-C98A4A)','var(--pl-C878A8)','var(--pl-1D9E75)'];
  for (var i = 0; i < 4; i++) {
    var key = 'gift-' + today + '-' + i;
    var done = LS.get(key) === '1';
    var ring = document.getElementById('g-' + i);
    var chk = document.getElementById('gift-chk-' + i);
    if (ring) {
      ring.style.borderColor = done ? colors[i] : 'var(--pl-DDDDDD)';
      ring.style.color = done ? colors[i] : '#CCCCCC';
    }
    if (chk) {
      chk.style.background = done ? colors[i] : 'var(--pl-FFFFFF)';
      chk.style.borderColor = done ? colors[i] : 'var(--pl-C8C6BE)';
      chk.textContent = done ? '✓' : '';
    }
    if (done) count++;
  }
  var center = document.getElementById('gift-center');
  if (center) {
    if (count >= 3) { center.textContent = count === 4 ? '✨ bounteous' : '🏆 a won day'; center.style.color = '#D4A017'; }
    else { center.textContent = 'in motion'; center.style.color = '#CCCCCC'; }
  }
  var qi = parseInt(LS.get('gift-qi') || '0');
  var qel = document.getElementById('gift-question');
  if (qel) qel.textContent = GIFT_QUESTIONS[qi % GIFT_QUESTIONS.length];
  updateStreak();
}

function updateStreak() {
  var streak = 0, d = new Date();
  while (true) {
    var ds = localDateStr(d);
    var c = 0;
    for (var i = 0; i < 4; i++) { if (LS.get('gift-' + ds + '-' + i) === '1') c++; }
    if (c >= 3) streak++;
    else break;
    d.setDate(d.getDate() - 1);
  }
  var el = document.getElementById('gift-streak');
  if (el) el.textContent = streak;
  var week = '';
  for (var i = 6; i >= 0; i--) {
    var dd = new Date(); dd.setDate(dd.getDate() - i);
    var ds = localDateStr(dd);
    var c = 0;
    for (var j = 0; j < 4; j++) { if (LS.get('gift-' + ds + '-' + j) === '1') c++; }
    week += (c >= 3 ? '●' : '○') + ' ';
  }
  var wel = document.getElementById('gift-week');
  if (wel) wel.textContent = week;
}

// rotate question daily
var GIFT_QI = parseInt(LS.get('gift-qi') || '0');
var lastQDate = LS.get('gift-qdate');
var todayQ = localDateStr(new Date());
if (lastQDate !== todayQ) {
  GIFT_QI = (GIFT_QI + 1) % GIFT_QUESTIONS.length;
  LS.set('gift-qi', GIFT_QI);
  LS.set('gift-qdate', todayQ);
}

// ── TOOLTIP (works on any [data-tip] element) ──
(function() {
  var tip = document.getElementById('cat-tooltip');
  function showTip(el) {
    var txt = el.getAttribute('data-tip');
    var color = el.getAttribute('data-tip-color') || 'var(--pl-1A1A18)';
    if (!txt) return;
    var lines = txt.split('\n');
    if (lines.length <= 1) {
      tip.innerHTML = '<div style="color:'+color+';font-weight:600;">'+esc(txt)+'</div>';
      tip.style.borderLeft = '3px solid '+color;
    } else {
      var html = '';
      for (var i = 0; i < lines.length; i++) {
        html += '<div class="tt-item" style="color:'+color+';">'+esc(lines[i])+'</div>';
      }
      tip.innerHTML = html;
      tip.style.borderLeft = '3px solid '+color;
    }
    tip.style.display = 'block';
    var r = el.getBoundingClientRect();
    var left = r.left + r.width / 2 - tip.offsetWidth / 2;
    if (left < 4) left = 4;
    if (left + tip.offsetWidth > window.innerWidth - 4) left = window.innerWidth - tip.offsetWidth - 4;
    var top = r.top - tip.offsetHeight - 6;
    if (top < 4) top = r.bottom + 6;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function hideTip() { tip.style.display = 'none'; }
  document.addEventListener('mouseover', function(e) {
    var el = e.target.closest('[data-tip]');
    if (el) showTip(el);
  });
  document.addEventListener('mouseout', function(e) {
    var el = e.target.closest('[data-tip]');
    if (el) {
      var related = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-tip]');
      if (related !== el) hideTip();
    }
  });
  document.addEventListener('mousemove', function(e) {
    if (tip.style.display === 'block') {
      var el = document.elementFromPoint(e.clientX, e.clientY);
      var seg = el && el.closest && el.closest('[data-tip]');
      if (seg) showTip(seg); else hideTip();
    }
  });
})();

// ── TODAY BUTTON ──
function goToToday() {
  var days = document.querySelectorAll('.sidebar .day-btn');
  var found = false;
  days.forEach(function(b) {
    if (b.classList.contains('today')) {
      b.click();
      found = true;
    }
  });
  if (!found) {
    var ov = document.querySelector('.week-label');
    if (ov) { ov.click(); }
  }
  document.getElementById('scroll-today-btn').classList.remove('show');
}
(function checkNotToday() {
  var btn = document.getElementById('scroll-today-btn');
  if (!btn) return;
  updateTodayBtn();
})();

// ── KEYBOARD SHORTCUTS ──
document.addEventListener('keydown', function(e) {
  if (e.key === 't' && !e.ctrlKey && !e.metaKey && !e.target.closest('input,textarea')) {
    e.preventDefault();
    goToToday();
  }
  if (e.key === '?' && !e.target.closest('input,textarea')) {
    e.preventDefault();
    var msg = 'Keyboard shortcuts:\n← →  Navigate days\nT     Go to today\nS     Search\n?     This help';
    alert(msg);
  }
});

// ── TAX PROVISION TRACKER (interactive, localStorage) ──
var TAX_PAID = parseInt(LS.get('taxPaid') || '992');
var TAX_SETASIDE = parseInt(LS.get('taxSetaside') || '1073');
var TAX_TARGET = 11537;
var TAX_SAVINGS = 25025;

function updateTaxUI() {
  var total = TAX_PAID + TAX_SETASIDE;
  var gap = Math.max(0, TAX_TARGET - total);
  var pct = Math.min(100, Math.round(total / TAX_TARGET * 100));
  var trueSavings = TAX_SAVINGS - gap;
  document.getElementById('tax-setaside').textContent = '$' + TAX_SETASIDE;
  document.getElementById('tax-total').textContent = '$' + total;
  document.getElementById('tax-gap').textContent = '$' + gap;
  document.getElementById('tax-pct').textContent = pct + '%';
  document.getElementById('tax-bar').style.width = pct + '%';
  document.getElementById('tax-true-amount').textContent = '$' + trueSavings.toLocaleString();
  document.getElementById('tax-true-desc').textContent = '$25,025 − $' + gap.toLocaleString() + ' tax gap = what\'s actually yours';
  document.getElementById('tax-summary-line').innerHTML = '• You have <strong>$25,025</strong> — but <strong>$' + gap.toLocaleString() + '</strong> of that belongs to the ATO. True savings: <strong>~$' + trueSavings.toLocaleString() + '</strong>.';
}

function addTaxSetAside() {
  var amt = prompt('How much tax did you set aside this money date?', '');
  if (amt === null) return;
  amt = parseInt(amt.replace(/[^0-9]/g, ''));
  if (isNaN(amt) || amt <= 0) return;
  TAX_SETASIDE += amt;
  LS.set('taxPaid', TAX_PAID);
  LS.set('taxSetaside', TAX_SETASIDE);
  updateTaxUI();
}

updateTaxUI();

// ── SAVINGS TRAJECTORY CHART (interactive, JS-rendered SVG) ──
var CHART_MONTHS = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function renderSavingsChart(mo) {
  mo = parseInt(mo) || 1200;
  var start = 25025;
  var taxGap = 9472;
  var taxMo = 1500;
  var baliCost = 3500;
  var bhutanCost = 9500;
  var nMonths = 16;

  var gross = [], net = [], maxVal = 0, bal = start, gap = taxGap;
  var taxClosedAt = nMonths;
  for (var i = 0; i < nMonths; i++) {
    var g = bal;
    if (i === 2) g -= baliCost;
    if (i === 15) g -= bhutanCost;
    gross.push(g);
    var n = g - Math.max(0, gap);
    net.push(n);
    if (g > maxVal) maxVal = g;
    if (taxClosedAt === nMonths && gap > 0 && gap - taxMo <= 0) taxClosedAt = i;
    bal = g + mo;
    gap = Math.max(0, gap - taxMo);
  }
  maxVal = Math.ceil(maxVal / 5000) * 5000;
  if (maxVal < 35000) maxVal = 35000;

  var chartW = 640, chartH = 220, x0 = 60;
  var xStep = chartW / (nMonths - 1);
  function yVal(v) { return 260 - (v / maxVal) * chartH; }
  function xVal(i) { return x0 + i * xStep; }

  var h = '';
  var steps = maxVal / 5000;
  for (var s = 0; s <= steps; s++) {
    var y = yVal(s * 5000);
    h += '<line x1="'+x0+'" y1="'+y+'" x2="'+(x0+chartW)+'" y2="'+y+'" stroke="#F0F0F0" stroke-width="0.5"/>';
    h += '<text x="'+(x0-5)+'" y="'+(y+3)+'" text-anchor="end" font-size="9" fill="#9A9080">$'+(s*5)+'K</text>';
  }
  h += '<line x1="'+x0+'" y1="40" x2="'+x0+'" y2="260" stroke="#E8E6DF" stroke-width="1"/>';
  h += '<line x1="'+(x0+chartW)+'" y1="260" x2="'+x0+'" y2="260" stroke="#E8E6DF" stroke-width="1"/>';

  var labelI = [0,2,4,6,8,10,12,14,15];
  for (var li = 0; li < labelI.length; li++) {
    var i = labelI[li];
    h += '<text x="'+xVal(i).toFixed(1)+'" y="275" text-anchor="middle" font-size="8" fill="#9A9080">'+CHART_MONTHS[i]+'</text>';
    if (i === 15) h += '<text x="'+(xVal(i)-10).toFixed(1)+'" y="263" text-anchor="middle" font-size="7" fill="#8A8880">\'27</text>';
  }

  var grossPts = [], netPts = [], areaPts = [];
  for (var i = 0; i < nMonths; i++) {
    grossPts.push(xVal(i).toFixed(1)+','+yVal(gross[i]).toFixed(1));
    netPts.push(xVal(i).toFixed(1)+','+yVal(net[i]).toFixed(1));
    areaPts.push(xVal(i).toFixed(1)+','+yVal(gross[i]).toFixed(1));
  }
  var lx = xVal(nMonths-1).toFixed(1);
  areaPts.push(lx+',260');
  areaPts.push(x0.toFixed(1)+',260');

  h += '<defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">';
  h += '<stop offset="0%" stop-color="var(--pl-1D9E75)"/><stop offset="100%" stop-color="var(--pl-1D9E75)" stop-opacity="0"/></linearGradient></defs>';
  h += '<polygon points="'+areaPts.join(' ')+'" fill="url(#g2)" opacity="0.12"/>';
  h += '<polyline points="'+grossPts.join(' ')+'" fill="none" stroke="#1D9E75" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
  h += '<polyline points="'+netPts.join(' ')+'" fill="none" stroke="#9A9080" stroke-width="2" stroke-dasharray="5,4" stroke-linejoin="round" stroke-linecap="round"/>';

  // Current marker
  h += '<circle cx="'+xVal(0).toFixed(1)+'" cy="'+yVal(gross[0]).toFixed(1)+'" r="5" fill="#FFFFFF" stroke="#1D9E75" stroke-width="2.5"/>';
  h += '<text x="'+xVal(0).toFixed(1)+'" y="'+(yVal(gross[0])-11)+'" text-anchor="middle" font-size="8" font-weight="600" fill="#1D9E75">You are here</text>';
  h += '<text x="'+xVal(0).toFixed(1)+'" y="'+(yVal(gross[0])+16)+'" text-anchor="middle" font-size="9" fill="#1D9E75" font-weight="700">$'+gross[0].toLocaleString()+'</text>';

  // Bali
  var bi = 2;
  h += '<circle cx="'+xVal(bi).toFixed(1)+'" cy="'+yVal(gross[bi]).toFixed(1)+'" r="4" fill="#FFFFFF" stroke="#C98A4A" stroke-width="2"/>';
  h += '<line x1="'+xVal(bi).toFixed(1)+'" y1="'+yVal(gross[bi]).toFixed(1)+'" x2="'+(xVal(bi)+55).toFixed(1)+'" y2="'+(yVal(gross[bi])-14).toFixed(1)+'" stroke="#C98A4A" stroke-width="0.5" stroke-dasharray="3,3"/>';
  h += '<text x="'+(xVal(bi)+57).toFixed(1)+'" y="'+(yVal(gross[bi])-16).toFixed(1)+'" font-size="8" fill="#C98A4A" font-weight="600">Bali -$3.5K</text>';

  // Bhutan
  var bhi = 15;
  h += '<circle cx="'+xVal(bhi).toFixed(1)+'" cy="'+yVal(gross[bhi]).toFixed(1)+'" r="5" fill="#FFFFFF" stroke="#A67CB8" stroke-width="2.5"/>';
  h += '<line x1="'+xVal(bhi).toFixed(1)+'" y1="'+yVal(gross[bhi]).toFixed(1)+'" x2="'+(xVal(bhi)-60).toFixed(1)+'" y2="'+(yVal(gross[bhi])-6).toFixed(1)+'" stroke="#A67CB8" stroke-width="0.5" stroke-dasharray="3,3"/>';
  h += '<text x="'+(xVal(bhi)-62).toFixed(1)+'" y="'+(yVal(gross[bhi])-9).toFixed(1)+'" text-anchor="end" font-size="8" fill="#A67CB8" font-weight="600">Bhutan $9.5K →</text>';

  // After Bhutan (net)
  h += '<circle cx="'+xVal(bhi).toFixed(1)+'" cy="'+yVal(net[bhi]).toFixed(1)+'" r="3" fill="none" stroke="#9A9080" stroke-width="1.5" stroke-dasharray="3,2"/>';
  h += '<text x="'+xVal(bhi).toFixed(1)+'" y="'+(yVal(net[bhi])+14)+'" text-anchor="middle" font-size="7" fill="#9A9080">after: $'+net[bhi].toLocaleString()+'</text>';

  document.getElementById('savings-chart-svg').innerHTML = h;

  // Legend
  var leg = '<span><span style="display:inline-block;width:14px;height:3px;background:var(--plf-1D9E75);vertical-align:middle;margin-right:4px;border-radius:2px;"></span>Gross savings</span>';
  leg += '<span><span style="display:inline-block;width:14px;height:2px;background:var(--pl-9A9080);vertical-align:middle;margin-right:4px;border-radius:1px;border-top:2px dashed var(--pl-9A9080);height:0;"></span>True savings (after tax)</span>';
  leg += '<span style="color:var(--pl-9A9080);">|</span>';
  leg += '<span style="color:var(--pl-C98A4A);">● Bali $3.5K</span>';
  leg += '<span style="color:var(--pl-A67CB8);">● Bhutan $9.5K</span>';
  document.getElementById('savings-legend').innerHTML = leg;

  // Projection stats
  var taxClosed = Math.min(taxClosedAt, nMonths - 1);
  document.getElementById('tax-closed-date').textContent = CHART_MONTHS[taxClosed] + " '" + (taxClosed <= 5 ? '26' : '27');
  document.getElementById('bhutan-reached-date').textContent = CHART_MONTHS[15] + " '27";
  var bhutanAfter = net[15];
  document.getElementById('after-bhutan-balance').textContent = '$' + (bhutanAfter < 0 ? '0' : bhutanAfter.toLocaleString());
  document.getElementById('savings-rate-display').textContent = '$' + mo.toLocaleString();
}

function updateSavingsChart(val) {
  renderSavingsChart(parseInt(val) || 1200);
}
