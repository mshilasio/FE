/* Family Expenses – shared logic. Data lives in your private Google Sheet (via Apps Script);
   a copy is cached in this browser so the pages feel instant and work if you are offline. */
const FT = (() => {
  'use strict';
  const K = { conn: 'ft_conn', tx: 'ft_tx', cfg: 'ft_cfg', user: 'ft_user' };
  const jget = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n, d = 0) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const num = s => parseFloat(String(s).replace(/,/g, '')) || 0;
  const pad = n => String(n).padStart(2, '0');
  const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const R = (m, c) => ({ match: m, category: c });
  const DEFAULT_CONFIG = {
    people: ['Mshila', 'Selma'],
    // budgets are monthly, seeded from your Sept–Dec 2026 spreadsheet. Edit them in Settings.
    categories: [
      { name: 'School & Tuition', group: 'Kids', budget: 100000 },
      { name: 'Kids Lessons & Sports', group: 'Kids', budget: 70000 },
      { name: 'Kids Gear & Uniforms', group: 'Kids', budget: 0 },
      { name: 'Rent', group: 'Home', budget: 105000 },
      { name: 'House Help & Salaries', group: 'Home', budget: 58000 },
      { name: 'Utilities', group: 'Home', budget: 14000 },
      { name: 'Groceries', group: 'Home', budget: 80000 },
      { name: 'Clothing & Personal', group: 'Home', budget: 15000 },
      { name: 'Insurance', group: 'Home', budget: 0 },
      { name: 'Home Maintenance', group: 'Home', budget: 0 },
      { name: 'Transport & Fuel', group: 'Lifestyle', budget: 0 },
      { name: 'Health & Medical', group: 'Lifestyle', budget: 0 },
      { name: 'Eating Out & Leisure', group: 'Lifestyle', budget: 0 },
      { name: 'Airtime & Data', group: 'Lifestyle', budget: 0 },
      { name: 'Gifts & Giving', group: 'Lifestyle', budget: 0 },
      { name: 'Travel & Holidays', group: 'Lifestyle', budget: 0 },
      { name: 'Other', group: 'Other', budget: 0 }
    ],
    rules: [
      R('naivas', 'Groceries'), R('carrefour', 'Groceries'), R('quickmart', 'Groceries'), R('chandarana', 'Groceries'),
      R('greenspoon', 'Groceries'), R('cleanshelf', 'Groceries'), R('tuskys', 'Groceries'), R('butchery', 'Groceries'),
      R('mama mboga', 'Groceries'), R('groceries', 'Groceries'), R('supermarket', 'Groceries'),
      R('kplc', 'Utilities'), R('kenya power', 'Utilities'), R('nairobi water', 'Utilities'), R('zuku', 'Utilities'),
      R('faiba', 'Utilities'), R('wifi', 'Utilities'), R('internet', 'Utilities'), R('electricity', 'Utilities'), R('water bill', 'Utilities'),
      R('ridgeways total', 'Transport & Fuel'), R('totalenergies', 'Transport & Fuel'), R('rubis', 'Transport & Fuel'),
      R('shell', 'Transport & Fuel'), R('astrol', 'Transport & Fuel'), R('fuel', 'Transport & Fuel'), R('petrol', 'Transport & Fuel'),
      R('uber', 'Transport & Fuel'), R('bolt', 'Transport & Fuel'), R('parking', 'Transport & Fuel'),
      R('pharmacy', 'Health & Medical'), R('chemist', 'Health & Medical'), R('hospital', 'Health & Medical'),
      R('clinic', 'Health & Medical'), R('dental', 'Health & Medical'), R('doctor', 'Health & Medical'),
      R('java', 'Eating Out & Leisure'), R('artcaffe', 'Eating Out & Leisure'), R('kfc', 'Eating Out & Leisure'),
      R('pizza', 'Eating Out & Leisure'), R('restaurant', 'Eating Out & Leisure'), R('cafe', 'Eating Out & Leisure'), R('coffee', 'Eating Out & Leisure'),
      R('airtime', 'Airtime & Data'), R('data bundle', 'Airtime & Data'),
      R('school fees', 'School & Tuition'), R('school', 'School & Tuition'), R('tuition', 'School & Tuition'), R('extra class', 'School & Tuition'),
      R('academy of dance', 'Kids Lessons & Sports'), R('karen country club', 'Kids Lessons & Sports'), R('hoopspire', 'Kids Lessons & Sports'),
      R('fusion', 'Kids Lessons & Sports'), R('karen blixen', 'Kids Lessons & Sports'), R('swimming', 'Kids Lessons & Sports'),
      R('chess', 'Kids Lessons & Sports'), R('basketball', 'Kids Lessons & Sports'), R('football', 'Kids Lessons & Sports'),
      R('taekwondo', 'Kids Lessons & Sports'), R('music', 'Kids Lessons & Sports'), R('dance', 'Kids Lessons & Sports'),
      R('uniform', 'Kids Gear & Uniforms'), R('skates', 'Kids Gear & Uniforms'), R('kit', 'Kids Gear & Uniforms'),
      R('rent', 'Rent'), R('house help', 'House Help & Salaries'), R('salary', 'House Help & Salaries'), R('wages', 'House Help & Salaries'),
      R('old mutual', 'Insurance'), R('britam', 'Insurance'), R('jubilee', 'Insurance'), R('insurance', 'Insurance'),
      R('clothes', 'Clothing & Personal'), R('clothing', 'Clothing & Personal'), R('salon', 'Clothing & Personal'), R('barber', 'Clothing & Personal'),
      R('plumber', 'Home Maintenance'), R('repair', 'Home Maintenance'), R('hardware', 'Home Maintenance')
    ]
  };

  function applyHash() {
    if (!location.hash || location.hash.length < 3) return;
    try {
      const p = new URLSearchParams(location.hash.slice(1));
      if (p.get('u')) jset(K.conn, { url: p.get('u') });
      if (p.get('n')) jset(K.user, p.get('n'));
      history.replaceState(null, '', location.pathname + location.search);
    } catch (e) {}
  }
  applyHash();

  let tx = jget(K.tx, []);
  let config = jget(K.cfg, null);
  if (!config || !Array.isArray(config.categories)) config = clone(DEFAULT_CONFIG);
  if (!Array.isArray(config.rules)) config.rules = [];
  if (!Array.isArray(config.people) || !config.people.length) config.people = clone(DEFAULT_CONFIG.people);

  const conn = () => { const c = jget(K.conn, null); return c && c.url ? c : null; };
  const user = () => jget(K.user, '') || config.people[0];
  const setUser = n => jset(K.user, n);
  const setConn = url => { if (url) jset(K.conn, { url: url.trim() }); else localStorage.removeItem(K.conn); };

  const normTx = t => ({
    id: String(t.id || ''), date: String(t.date || '').slice(0, 10), time: String(t.time || '').slice(0, 5),
    amount: Number(t.amount) || 0, cost: Number(t.cost) || 0, balance: Number(t.balance) || 0,
    recipient: String(t.recipient || ''), account: String(t.account || ''), purpose: String(t.purpose || ''),
    category: String(t.category || ''), paidBy: String(t.paidBy || ''), method: String(t.method || ''),
    addedBy: String(t.addedBy || ''), addedAt: String(t.addedAt || ''), _p: t._p || 0
  });
  tx = tx.map(normTx);

  const save = () => { jset(K.tx, tx); jset(K.cfg, config); };

  function url(c, extra) { return c.url + (c.url.includes('?') ? '&' : '?') + 't=' + Date.now() + (extra || ''); }

  async function post(body) {
    const c = conn(); if (!c) return;
    await fetch(c.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  }

  async function refresh() {
    const c = conn(); if (!c) return { local: true };
    const r = await fetch(url(c));
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'The sheet refused the request ');
    const server = (d.transactions || []).map(normTx);
    const ids = new Set(server.map(t => t.id));
    const keep = tx.filter(t => t._p && Date.now() - t._p < 5 * 60 * 1000 && !ids.has(t.id)); // just-added, not yet visible
    tx = server.concat(keep);
    if (d.config && Array.isArray(d.config.categories)) { config = d.config; if (!config.rules) config.rules = []; if (!config.people) config.people = clone(DEFAULT_CONFIG.people); }
    else post({ action: 'saveConfig', config }); // first connection: seed the sheet with defaults
    save();
    return { local: false };
  }

  async function add(list) {
    const have = new Set(tx.map(t => t.id));
    const fresh = list.map(normTx).filter(t => !have.has(t.id));
    fresh.forEach(t => { t._p = Date.now(); });
    tx = tx.concat(fresh); save();
    if (conn() && fresh.length) await post({ action: 'add', transactions: fresh.map(t => { const o = Object.assign({}, t); delete o._p; return o; }) });
    return { added: fresh.length, dup: list.length - fresh.length, ids: fresh.map(t => t.id) };
  }
  async function update(id, patch) {
    const t = tx.find(x => x.id === id); if (!t) return;
    Object.assign(t, patch); save();
    if (conn()) await post({ action: 'update', id, patch });
  }
  async function remove(id) {
    tx = tx.filter(t => t.id !== id); save();
    if (conn()) await post({ action: 'delete', id });
  }
  async function saveConfig(c) {
    config = c; save();
    if (conn()) await post({ action: 'saveConfig', config });
  }

  /* ---------- categorising ---------- */
  function matcher(m) { return new RegExp('(^|[^a-z0-9])' + m.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); }
  function best(text) {
    text = text.toLowerCase(); const valid = new Set(config.categories.map(c => c.name)); let b = null;
    for (const r of config.rules) {
      if (!r.match || !valid.has(r.category)) continue;
      if (matcher(r.match).test(text) && (!b || r.match.length > b.match.length)) b = r;
    }
    return b ? b.category : '';
  }
  // The purpose you typed wins over the recipient name.
  const suggest = t => best(t.purpose || '') || best((t.recipient || '') + ' ' + (t.account || ''));

  async function learn(list) {
    let changed = false;
    list.forEach(t => {
      const key = (t.recipient || '').toLowerCase().trim();
      if (!t.category || t.category === 'Uncategorised' || key.length < 3 || key === 'cash') return;
      const ex = config.rules.find(r => r.match.toLowerCase() === key);
      if (ex) { if (ex.category !== t.category) { ex.category = t.category; changed = true; } }
      else { config.rules.push({ match: key, category: t.category }); changed = true; }
    });
    if (changed) await saveConfig(config);
  }

  /* ---------- M-PESA parsing ---------- */
  function parseMpesa(raw) {
    return raw.split(/(?=\b[A-Z0-9]{10}\s+Confirmed)/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).map(parseOne).filter(Boolean);
  }
  function parseOne(msg) {
    const code = (msg.match(/\b([A-Z0-9]{10})\s+Confirmed/) || [])[1]; if (!code) return null;
    let amount, recipient, account = '';
    let m = msg.match(/Ksh\s?([\d,]+(?:\.\d+)?)\s+(?:paid|sent)\s+to\s+(.+?)\s+on\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i);
    if (m) { amount = num(m[1]); recipient = m[2]; }
    else {
      m = msg.match(/bought\s+Ksh\s?([\d,]+(?:\.\d+)?)\s+of\s+airtime/i);
      if (!m) return null;
      amount = num(m[1]); recipient = 'Safaricom Airtime';
    }
    recipient = recipient.replace(/\.$/, '').trim();
    const a = recipient.match(/\s+for\s+account\s+(.+)$/i);
    if (a) { account = a[1].replace(/\.$/, '').trim(); recipient = recipient.replace(a[0], '').trim(); }
    const dm = msg.match(/\bon\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
    const date = dm ? (dm[3].length === 2 ? '20' + dm[3] : dm[3]) + '-' + pad(dm[2]) + '-' + pad(dm[1]) : todayISO();
    let time = '';
    const tm = msg.match(/at\s+(\d{1,2}):(\d{2})\s*([AP]M)/i);
    if (tm) { let h = parseInt(tm[1], 10) % 12; if (tm[3].toUpperCase() === 'PM') h += 12; time = pad(h) + ':' + tm[2]; }
    const bm = msg.match(/balance\s+is\s+Ksh\s?([\d,]+(?:\.\d+)?)/i);
    const cm = msg.match(/Transaction cost,?\s*Ksh\s?([\d,]+(?:\.\d+)?)/i);
    const pm = msg.match(/\(([^()]+)\)\s*$/) || msg.match(/https?:\/\/\S*?\(([^()]+)\)/);
    const t = { id: code, date, time, amount, cost: cm ? num(cm[1]) : 0, balance: bm ? num(bm[1]) : 0,
      recipient, account, purpose: pm ? pm[1].trim() : '', category: '', paidBy: user(), method: 'M-PESA' };
    t.category = suggest(t);
    return t;
  }
  const newId = () => 'M-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

  /* ---------- UI helpers ---------- */
  function catOptions(sel) {
    const groups = {}; config.categories.forEach(c => { const g = c.group || 'Other'; (groups[g] = groups[g] || []).push(c.name); });
    const known = new Set(config.categories.map(c => c.name));
    let h = sel ? '' : '<option value="">— choose category —</option>';
    if (sel && !known.has(sel)) h += `<option selected>${esc(sel)}</option>`;
    for (const g in groups) h += `<optgroup label="${esc(g)}">` + groups[g].map(n => `<option ${n === sel ? 'selected' : ''}>${esc(n)}</option>`).join('') + '</optgroup>';
    return h;
  }
  const peopleOptions = sel => config.people.concat(config.people.includes(sel) || !sel ? [] : [sel]).map(p => `<option ${p === sel ? 'selected' : ''}>${esc(p)}</option>`).join('');

  function header(active) {
    const el = document.getElementById('hdr'); if (!el) return;
    const nav = [['index.html', 'Add'], ['dashboard.html', 'Dashboard'], ['settings.html', 'Settings']]
      .map(([h, l]) => `<a class="nav-btn ${active === h ? 'active' : ''}" href="${h}">${l}</a>`).join('');
    el.innerHTML = `<div class="header"><div class="header-icon">Ksh</div><div><h1>Family Expenses</h1>
      <p><span class="dot ${conn() ? 'on' : ''}"></span>${conn() ? 'Shared sheet connected' : 'Not connected · this device only'}</p></div><div class="header-nav">${nav}</div></div>`;
  }

  function csv(list) {
    const cols = ['date', 'time', 'amount', 'cost', 'category', 'recipient', 'account', 'purpose', 'paidBy', 'method', 'balance', 'id'];
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    return [cols.join(',')].concat(list.map(t => cols.map(c => q(t[c])).join(','))).join('\n');
  }
  function download(name, text) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click();
  }

  return {
    esc, fmt, num, todayISO, sleep, clone, DEFAULT_CONFIG,
    all: () => tx, config: () => config, conn, setConn, user, setUser,
    refresh, add, update, remove, saveConfig, learn, suggest, parseMpesa, newId,
    catOptions, peopleOptions, header, csv, download, url, post
  };
})();
