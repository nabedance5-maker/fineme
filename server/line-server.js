/*
  Simple LINE notification server for local testing.
  - POST /line/reservations  (create reservation request)
  - GET  /line/action         (approve|cancel) via query (resId, action)
  - Scheduler runs every minute to send reminders (72h/12h/4h/24h)

  Notes:
  - Requires LINE_CHANNEL_ACCESS_TOKEN and optionally LINE_USER_ID (provider) in env.
  - This server stores reservations in server/data/reservations.json (simple file store for demo).
  - For production, integrate with real backend DB and secure auth + publicly reachable endpoints.
*/

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { sendPush, buildTextMessage, formatReservationForUser, formatReservationForProvider } = require('./line-service');
const dbModule = require('./db');

const DATA_FILE = path.join(__dirname, 'data', 'reservations.json');
const PORT = process.env.LINE_SERVER_PORT || 4015;
const DEFAULT_PROVIDER_LINE_ID = process.env.LINE_USER_ID || '';

const db = dbModule.open();

function readReservations(){
  try{ const txt = fs.readFileSync(DATA_FILE,'utf8'); return JSON.parse(txt||'[]'); }catch(e){ return []; }
}
function writeReservations(arr){ fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8'); }

const app = express();
app.use(bodyParser.json());

// Simple in-memory rate limiter: last reservation timestamp by user identifier
const lastReservationAt = {}; // { [userId]: timestamp }

// lightweight CSRF/Origin check: require either X-Requested-With or same-origin Referer
function passesCsrfCheck(req){
  try{
    if(req.get('x-requested-with') === 'XMLHttpRequest') return true;
    const ref = req.get('referer') || req.get('origin');
    if(!ref) return false;
    // allow if referer contains this host
    const host = req.get('host') || '';
    return ref.indexOf(host) !== -1;
  }catch(e){ return false; }
}

// mount LINE oauth router (provides /line/login and /line/callback)
try{ app.use('/line', require('./line-oauth')); }catch(e){ console.warn('could not mount line-oauth', e); }

// create reservation (simulate user request). Body: { service, store, start, address, access, storeUrl, userId, userName, contact, contactConsent }
app.post('/line/reservations', (req,res)=>{
  const payload = req.body || {};
  // Basic CSRF/origin protection
  if(!passesCsrfCheck(req)) return res.status(403).json({ ok:false, error:'csrf_failed' });

  // required fields
  const userId = payload.userId || payload.userLoginId || null;
  const storeId = payload.store || payload.storeId || null;
  const service = payload.service || null;
  const start = payload.start || null;
  if(!userId) return res.status(400).json({ ok:false, error:'missing userId' });
  if(!service) return res.status(400).json({ ok:false, error:'missing service' });
  if(!start) return res.status(400).json({ ok:false, error:'missing start' });

  // rate limit: one reservation per user per 60 seconds
  try{
    const last = lastReservationAt[String(userId)];
    if(last && (Date.now() - last) < 60*1000) return res.status(429).json({ ok:false, error:'rate_limited' });
  }catch(e){}

  // validate user exists and store exists (if DB available)
  const validateAndCreate = ()=>{
    const list = readReservations();
    const id = 'res_' + Date.now();
    const item = Object.assign({ id, status:'pending', createdAt: new Date().toISOString(), notified: { '72h':false,'12h':false,'4h':false,'24h':false } }, payload);
    list.push(item); writeReservations(list);
    // update rate limiter
    try{ lastReservationAt[String(userId)] = Date.now(); }catch(e){}
    // notify provider
    const providerId = DEFAULT_PROVIDER_LINE_ID;
    if(providerId){
      const msg = formatReservationForProvider(item);
      sendPush(providerId, buildTextMessage(msg)).catch(e=>console.warn('push err',e));
    }
    return res.json({ ok:true, reservation: item });
  };

  // If db object exists, perform lookups
  try{
    if(db && typeof db.get === 'function'){
      // check user
      db.get(`SELECT * FROM users WHERE id = ? OR loginId = ? OR line_user_id = ?`, [userId, userId, userId], (uerr, urow)=>{
        if(uerr) return res.status(500).json({ ok:false, error: String(uerr) });
        if(!urow) return res.status(403).json({ ok:false, error:'user_not_found' });
        // if storeId provided, check shops table
        if(storeId){
          db.get(`SELECT * FROM shops WHERE id = ? OR loginId = ?`, [storeId, storeId], (serr, srow)=>{
            if(serr) return res.status(500).json({ ok:false, error: String(serr) });
            if(!srow) return res.status(403).json({ ok:false, error:'store_not_found' });
            return validateAndCreate();
          });
        } else {
          return validateAndCreate();
        }
      });
    } else {
      // no DB available: best-effort validation by basic shapes
      return validateAndCreate();
    }
  }catch(e){ return res.status(500).json({ ok:false, error: String(e) }); }
});

// Sync user from client to server DB (simple upsert by loginId)
app.post('/api/sync-user', (req,res)=>{
  try{
    const p = req.body || {};
    if(!p.loginId) return res.status(400).json({ ok:false, error:'missing loginId' });
    const now = new Date().toISOString();
    db.serialize(()=>{
      db.run(`INSERT OR IGNORE INTO users (loginId, displayName, email, passwordHash, createdAt) VALUES (?, ?, ?, ?, ?)`,
        [p.loginId, p.displayName||p.loginId, p.email||p.loginId, p.passwordHash||'', now]);
      db.run(`UPDATE users SET displayName = ?, email = ?, passwordHash = ? WHERE loginId = ?`, [p.displayName||p.loginId, p.email||p.loginId, p.passwordHash||'', p.loginId]);
      db.get(`SELECT * FROM users WHERE loginId = ?`, [p.loginId], (err,row)=>{ if(err) return res.status(500).json({ ok:false, error: String(err) }); res.json({ ok:true, user: row }); });
    });
  }catch(e){ res.status(500).json({ ok:false, error: String(e) }); }
});

// Link a LINE account to a server user (by loginId)
app.post('/api/link-line', (req,res)=>{
  try{
    const { loginId, lineUserId } = req.body || {};
    if(!loginId || !lineUserId) return res.status(400).json({ ok:false, error:'missing loginId or lineUserId' });
    const now = new Date().toISOString();
    db.serialize(()=>{
      // ensure line_accounts exists (it should)
      db.get(`SELECT * FROM line_accounts WHERE line_user_id = ?`, [lineUserId], (err, la)=>{
        if(err) return res.status(500).json({ ok:false, error: String(err) });
        // upsert user by loginId
        db.run(`INSERT OR IGNORE INTO users (loginId, displayName, email, createdAt) VALUES (?, ?, ?, ?)`,[loginId, loginId, loginId, now]);
        db.run(`UPDATE users SET line_user_id = ? WHERE loginId = ?`, [lineUserId, loginId], function(uerr){
          if(uerr) return res.status(500).json({ ok:false, error: String(uerr) });
          // optionally copy tokens from line_accounts into users
          if(la){ db.run(`UPDATE users SET line_access_token = ?, line_refresh_token = ? WHERE loginId = ?`, [la.access_token, la.refresh_token, loginId]); }
          db.get(`SELECT * FROM users WHERE loginId = ?`, [loginId], (gerr,row)=>{ if(gerr) return res.status(500).json({ ok:false, error: String(gerr) }); res.json({ ok:true, user: row }); });
        });
      });
    });
  }catch(e){ res.status(500).json({ ok:false, error: String(e) }); }
});

// provider action endpoint (clicked from message or admin UI)
app.get('/line/action', (req,res)=>{
  const { resId, action } = req.query;
  if(!resId || !action) return res.status(400).send('missing resId or action');
  const list = readReservations();
  const it = list.find(x=> x.id === resId);
  if(!it) return res.status(404).send('not found');

  if(action === 'approve'){
    it.status = 'approved';
    it.approvedAt = new Date().toISOString();
    writeReservations(list);
    // notify user and provider
    if(it.userId){ sendPush(it.userId, buildTextMessage(formatReservationForUser(it))).catch(()=>{}); }
    if(DEFAULT_PROVIDER_LINE_ID) sendPush(DEFAULT_PROVIDER_LINE_ID, buildTextMessage(`予約を承認しました。\n${it.userName||''} | ${it.start||''}`)).catch(()=>{});
    return res.send('approved');
  }
  if(action === 'cancel'){
    it.status = 'cancelled';
    it.cancelledAt = new Date().toISOString();
    writeReservations(list);
    if(it.userId){ sendPush(it.userId, buildTextMessage(`予約はキャンセルされました。\n${it.service||''} | ${it.start||''}`)).catch(()=>{}); }
    if(DEFAULT_PROVIDER_LINE_ID) sendPush(DEFAULT_PROVIDER_LINE_ID, buildTextMessage(`予約をキャンセルしました。\n${it.userName||''} | ${it.start||''}`)).catch(()=>{});
    return res.send('cancelled');
  }
  return res.status(400).send('unknown action');
});

// simple list endpoint for debug
app.get('/line/reservations', (req,res)=>{ res.json(readReservations()); });

// scheduler: run every minute and check for reminders
function runScheduler(){
  const now = new Date();
  const list = readReservations();
  let changed = false;
  for(const it of list){
    if(!it.start) continue;
  const start = new Date(it.start);
  const diffMs = start.getTime() - now.getTime(); // ms until
  const diffH = diffMs / (1000*60*60);
    // 72h, 12h, 4h notifications to provider if still pending
    if(it.status === 'pending'){
      if(diffH <= 72 && !it.notified['72h']){ if(DEFAULT_PROVIDER_LINE_ID) sendPush(DEFAULT_PROVIDER_LINE_ID, buildTextMessage(`未処理の予約リクエストがあります（72時間前）。\n${it.service||''} | ${it.start||''}`)).catch(()=>{}); it.notified['72h']=true; changed=true; }
      if(diffH <= 12 && !it.notified['12h']){ if(DEFAULT_PROVIDER_LINE_ID) sendPush(DEFAULT_PROVIDER_LINE_ID, buildTextMessage(`未処理の予約リクエストがあります（12時間前）。\n${it.service||''} | ${it.start||''}`)).catch(()=>{}); it.notified['12h']=true; changed=true; }
      if(diffH <= 4 && !it.notified['4h']){ if(DEFAULT_PROVIDER_LINE_ID) sendPush(DEFAULT_PROVIDER_LINE_ID, buildTextMessage(`予約時間まであと4時間です。承認またはキャンセルをお願いします。\n${it.service||''} | ${it.start||''}`)).catch(()=>{}); it.notified['4h']=true; changed=true; }
    }
    // 24h reminder for both user and provider when approved
    if(it.status === 'approved' && !it.notified['24h']){
      if(diffH <= 24){
        if(it.userId) sendPush(it.userId, buildTextMessage(`明日は予約日です\n${it.service||''} | ${it.start||''}`)).catch(()=>{});
        if(DEFAULT_PROVIDER_LINE_ID) sendPush(DEFAULT_PROVIDER_LINE_ID, buildTextMessage(`明日は予約日です\n${it.service||''} | ${it.start||''}`)).catch(()=>{});
        it.notified['24h'] = true; changed = true;
      }
    }
  }
  if(changed) writeReservations(list);
}

setInterval(runScheduler, 60*1000); // every minute

app.listen(PORT, ()=>{
  console.log('LINE server listening on port', PORT);
});
