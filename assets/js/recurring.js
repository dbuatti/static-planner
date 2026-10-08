// Recurring FNH / money / sleep events — shared by plan.html and index.html.
// Load AFTER data/schedule.js (needs the global DAYS array). Starts from today
// so the current day gets its weekday rules (allowance on Thu, money date on Sun).
function populateRecurring() {
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var short = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var existing = {};
  DAYS.forEach(function(d) { existing[d.dateISO] = d; });

  function hasEvent(day, pattern) { return day.events.some(function(e) { return e.text.match(pattern); }); }

  function addDay(date) {
    var y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
    var iso = y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    if (existing[iso]) return existing[iso];
    var dow = date.toLocaleDateString('en-AU', {weekday:'long'});
    var dots = {Monday:'dc-music',Tuesday:'dc-music',Wednesday:'dc-kine',Thursday:'dc-rest',Friday:'dc-rest',Saturday:'dc-rest',Sunday:'dc-rest'};
    var day = {id:iso.replace(/-/g,'').substring(4), dow:dow, date:d+' '+short[m]+' '+y, dateISO:iso, dot:dots[dow]||'dc-rest', events:[], sub:'', focus:''};
    DAYS.push(day);
    existing[iso] = day;
    return day;
  }

  function isoDate(y,m,d) { return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }

  var today = new Date(); today.setHours(0,0,0,0);
  var startDate = new Date(today); // include today so today's rules apply on the day
  startDate = new Date(Math.max(startDate.getTime(), new Date('2026-07-29').getTime()));
  var endDate = new Date('2027-01-21');

  for (var d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    var y = d.getFullYear(), mo = d.getMonth(), da = d.getDate();
    var iso = isoDate(y,mo,da);
    var dow = d.getDay(); // 0=Sun,1=Mon,...,6=Sat
    var day = addDay(d);

    // Tue: Weekly Q&A 9-10:30
    if (dow === 2 && !hasEvent(day, /Weekly Q\s*&?\s*A/i)) {
      day.events.push({time:'09:00–10:30', text:'🧠 FNH Weekly Q&A', fnh:true});
    }
    // Thu: Weekly Q&A 6-8pm
    if (dow === 4 && !hasEvent(day, /Weekly Q\s*&?\s*A/i)) {
      day.events.push({time:'18:00–20:00', text:'🧠 FNH Weekly Q&A', fnh:true});
    }
    // Thu: Allowance transfer 11-11:30
    if (dow === 4 && !hasEvent(day, /Allowance transfer/)) {
      day.events.push({time:'11:00–11:30', text:'💰 Allowance transfer — $200 (150 lean · 250 good month)'});
    }
    // Thu: Financial Weekly 11:30-11:45
    if (dow === 4 && !hasEvent(day, /Financial Weekly/)) {
      day.events.push({time:'11:30–11:45', text:'💰 Financial Weekly — catch up transactions + review', tickable:true});
    }
    // Sun: Money date 3pm
    if (dow === 0 && !hasEvent(day, /money date/i)) {
      day.events.push({time:'15:00–15:20', text:'💰 Sunday money date — review + log set-aside', tickable:true});
    }
    // Weekly anchor: SLEEP
    if (!hasEvent(day, /Sleep by 10pm/)) {
      day.events.push({time:'22:00–22:30', text:'😴 Sleep by 10pm — lights out'});
    }
    if (day.focus.indexOf('🛌 Sleep 10pm') === -1) {
      day.focus = '🛌 Sleep 10pm' + (day.focus ? ' — ' + day.focus : '');
    }
  }

  // Mastery: Mon 6-8pm (fortnightly, starting Aug 3)
  for (var d = new Date('2026-08-03'); d <= endDate; d.setDate(d.getDate() + 14)) {
    var y = d.getFullYear(), mo = d.getMonth(), da = d.getDate();
    var iso = isoDate(y,mo,da);
    var day = addDay(d);
    if (!hasEvent(day, /Mastery|Master/i)) {
      day.events.push({time:'18:00–20:00', text:'🧠 FNH Mastery Catch Up', fnh:true});
    }
  }
  // Mastery: Thu 9-11am (fortnightly, starting Jul 30, opposite weeks)
  for (var d = new Date('2026-07-30'); d <= endDate; d.setDate(d.getDate() + 14)) {
    var y = d.getFullYear(), mo = d.getMonth(), da = d.getDate();
    var iso = isoDate(y,mo,da);
    var day = addDay(d);
    if (!hasEvent(day, /Mastery|Master/i)) {
      day.events.unshift({time:'09:00–11:00', text:'🧠 FNH Mastery Catch Up', fnh:true});
    }
  }

  // Sort DAYS by date
  DAYS.sort(function(a,b) { return a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0; });
}