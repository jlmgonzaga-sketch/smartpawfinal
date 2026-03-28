// ── SMARTPAW SHARED JS ──

// Load config & data
let cfg = JSON.parse(localStorage.getItem('sp_cfg') || '{}');
let log  = JSON.parse(localStorage.getItem('sp_log') || '[]');
let schedules = JSON.parse(localStorage.getItem('sp_schedules') || '[]');

// ── ADAFRUIT IO ──
const AIO = 'https://io.adafruit.com/api/v2';

async function aioGet(feed) {
  const r = await fetch(`${AIO}/${cfg.username}/feeds/${feed}/data/last`, {
    headers: { 'X-AIO-Key': cfg.apiKey }
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function aioPost(feed, value) {
  const r = await fetch(`${AIO}/${cfg.username}/feeds/${feed}/data`, {
    method: 'POST',
    headers: { 'X-AIO-Key': cfg.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: String(value) })
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// ── LOG ──
function addLog(title, amount, type) {
  const now = new Date();
  const entry = {
    title, amount, type,
    time: now.toISOString(),
    displayTime: now.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  };
  log.unshift(entry);
  if (log.length > 200) log.pop();
  localStorage.setItem('sp_log', JSON.stringify(log));
  return entry;
}

// ── SCHEDULES: check and fire ──
function checkSchedules() {
  if (!cfg.username || !cfg.apiKey) return;
  const now = new Date();
  const hhmm = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  const dayKey = 'sp_fired_' + now.toDateString();
  const fired = JSON.parse(sessionStorage.getItem(dayKey) || '[]');

  schedules
    .filter(s => s.active && s.time === hhmm && !fired.includes(s.id))
    .forEach(async s => {
      fired.push(s.id);
      sessionStorage.setItem(dayKey, JSON.stringify(fired));
      try {
        await aioPost(cfg.dispenseFeed || 'dispense-command', 1);
        addLog('⏰ Scheduled Feed', s.portion + 'g', 'schedule');
        showToast('⏰ Scheduled feed sent!', 'ok');
      } catch(e) {
        showToast('⚠️ Schedule failed', 'err');
      }
    });
}

// ── TOAST ──
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.className = 'toast', 3000);
}

// ── SAVE HELPERS ──
function saveCfg() { localStorage.setItem('sp_cfg', JSON.stringify(cfg)); }
function saveSchedules() { localStorage.setItem('sp_schedules', JSON.stringify(schedules)); }
function saveLog() { localStorage.setItem('sp_log', JSON.stringify(log)); }

// Periodically check schedules
setInterval(checkSchedules, 30000);
