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

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
require('dotenv').config(); // fallback to .env
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const { sendPush, buildTextMessage, formatReservationForUser, formatReservationForProvider } = require('./line-service');
const dbModule = require('./db');
const { internalRouter, billingRouter } = require('./stripe-handlers');

const FINEME_DIR = path.join(__dirname, '..');

const DATA_FILE = path.join(__dirname, 'data', 'reservations.json');
const PORT = process.env.LINE_SERVER_PORT || 4015;
const DEFAULT_PROVIDER_LINE_ID = process.env.LINE_USER_ID || '';

const db = dbModule.open();

function readReservations(){
  try{ const txt = fs.readFileSync(DATA_FILE,'utf8'); return JSON.parse(txt||'[]'); }catch(e){ return []; }
}
function writeReservations(arr){ fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8'); }

const app = express();
app.use(bodyParser.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

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

// Stripe 内部Webhook処理 + 管理者向け課金API
app.use('/internal', internalRouter);
app.use('/api/billing', billingRouter);

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

// ── 診断完了イベント登録 ──────────────────────────────────────────────────
// POST /line/diagnosis-event { line_user_id, compass_first }
app.post('/line/diagnosis-event', (req, res) => {
  if (!passesCsrfCheck(req)) return res.status(403).send('forbidden');
  const { line_user_id, compass_first } = req.body || {};
  if (!line_user_id) return res.status(400).json({ error: 'line_user_id required' });
  const now = new Date().toISOString();
  // upsert: 同じline_user_idが既にあれば更新、なければ挿入
  db.get('SELECT id FROM diagnosis_events WHERE line_user_id = ?', [line_user_id], (err, row) => {
    if (row) {
      db.run(
        'UPDATE diagnosis_events SET compass_first=?, completed_at=?, remind_3d_sent=0, remind_7d_sent=0, remind_30d_sent=0 WHERE line_user_id=?',
        [compass_first || null, now, line_user_id]
      );
    } else {
      db.run(
        'INSERT INTO diagnosis_events (line_user_id, compass_first, completed_at, createdAt) VALUES (?, ?, ?, ?)',
        [line_user_id, compass_first || null, now, now]
      );
    }
  });
  res.json({ ok: true });
});

// ── 診断後リマインドスケジューラー ─────────────────────────────────────────
function runDiagnosisReminders(){
  const now = new Date();
  db.all('SELECT * FROM diagnosis_events', [], (err, rows) => {
    if (err || !rows) return;
    for (const row of rows) {
      const completed = new Date(row.completed_at);
      const diffDays = (now.getTime() - completed.getTime()) / (1000 * 60 * 60 * 24);
      const compassLabel = row.compass_first ? `【${row.compass_first}】` : '';

      // 3日後リマインド
      if (diffDays >= 3 && !row.remind_3d_sent) {
        sendPush(row.line_user_id, buildTextMessage(
          `🧭 変容の旅、最初の一歩は踏み出せましたか？\n\nMe Scanから3日が経ちました。${compassLabel}があなたのFineme Compassです。\n\nNew Me Naviで今日の行き先を確認してみてください。\nhttps://fineme.me/mypage/navi`
        )).catch(() => {});
        db.run('UPDATE diagnosis_events SET remind_3d_sent=1 WHERE id=?', [row.id]);
      }

      // 7日後リマインド
      if (diffDays >= 7 && !row.remind_7d_sent) {
        sendPush(row.line_user_id, buildTextMessage(
          `🗺️ Me Scanから1週間が経ちました。\n\n地図を持ったまま止まっていませんか？どんな小さな一歩でも、変容は始まります。${compassLabel}から始めてみましょう。\n\nhttps://fineme.me/diagnosis/result`
        )).catch(() => {});
        db.run('UPDATE diagnosis_events SET remind_7d_sent=1 WHERE id=?', [row.id]);
      }

      // 30日後リマインド
      if (diffDays >= 30 && !row.remind_30d_sent) {
        sendPush(row.line_user_id, buildTextMessage(
          `✨ Me Scanから1ヶ月が経ちました。\n\n外見は変わりましたか？変容の地図（New Me Map）を更新して、今の自分を再スキャンしてみてください。\n\nhttps://fineme.me/diagnosis`
        )).catch(() => {});
        db.run('UPDATE diagnosis_events SET remind_30d_sent=1 WHERE id=?', [row.id]);
      }
    }
  });
}

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

setInterval(() => { runScheduler(); runDiagnosisReminders(); }, 60*1000); // every minute

// ── LINE → Claude Code ブリッジ ──────────────────────────────────────────────

const MEETING_AGENTS = [
  { id: 'COO',        name: '戦略参謀（COO）',          role: 'KPI管理・事業方針・意思決定支援・ロードマップを担当する戦略参謀' },
  { id: 'CPO',        name: 'CPO（プロダクト責任者）',  role: '機能企画・UX・ロードマップを担当するプロダクト責任者' },
  { id: 'CMO',        name: 'CMO（マーケティング責任者）', role: 'SEO・集客・ブランド・SNSを担当するマーケティング責任者' },
  { id: 'CSO_SALES',  name: 'CSO（セールス責任者）',    role: '掲載企業獲得・パートナー交渉・マネタイズを担当するセールス責任者' },
  { id: 'ENG',        name: 'ENG（エンジニア）',         role: 'コード実装・バグ修正・技術負債解消を担当するエンジニア' },
  { id: 'CW',         name: 'CW（コンテンツライター）',  role: '記事・サービス説明文・LP原稿を担当するコンテンツライター' },
  { id: 'DA',         name: 'DA（データアナリスト）',    role: '市場調査・競合分析・GA分析を担当するデータアナリスト' },
  { id: 'SKEPTIC',    name: '懐疑役（CSO）',             role: '他エージェント全員の意見に批判的・懐疑的な反論を出す懐疑役。数字・前提・リスクを徹底的に突く。肯定しない。' },
];

function runClaude(prompt) {
  return new Promise((resolve) => {
    const claudePath = process.env.CLAUDE_PATH || 'claude';
    const proc = spawn(claudePath, ['--print', prompt, '--output-format', 'text', '--dangerously-skip-permissions'], {
      cwd: FINEME_DIR, shell: true, stdio: ['ignore', 'pipe', 'pipe'], env: Object.assign({}, process.env)
    });
    let out = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { out += d.toString(); });
    proc.on('close', () => resolve(out.trim()));
    proc.on('error', e => resolve(`エラー: ${e.message}`));
  });
}

async function runMeeting(topic) {
  const meetingDir = path.join(__dirname, 'data', 'meetings');
  if (!fs.existsSync(meetingDir)) fs.mkdirSync(meetingDir, { recursive: true });
  const dateStr = new Date().toLocaleString('ja-JP').replace(/[/:]/g, '-').replace(/\s/g, '_');
  const meetingFile = path.join(meetingDir, `${dateStr}.md`);
  fs.writeFileSync(meetingFile, `# Fineme 定例会議\n\n**日時**: ${new Date().toLocaleString('ja-JP')}\n**議題**: ${topic}\n\n---\n\n`, 'utf8');

  await pushToOwner(`📋 定例会議を開始します\n\n議題: ${topic}\n\n参加: COO → CPO → CMO → CSO(Sales) → ENG → CW → DA → 懐疑役 → まとめ\n\n各発言が届き次第お知らせします。`);

  const outputs = [];
  for (const agent of MEETING_AGENTS) {
    const prevContext = outputs.length > 0
      ? `\n\nこれまでの発言:\n${outputs.map(o => `【${o.name}】\n${o.output}`).join('\n\n')}`
      : '';
    const prompt = agent.id === 'SKEPTIC'
      ? `あなたはFinemeの懐疑役（CSO）です。以下の議題に対する他エージェント全員の意見に批判的・懐疑的な反論・問題提起をしてください。数字・前提・リスクを徹底的に突いてください。肯定しないでください。300字以内。\n\n議題: ${topic}${prevContext}`
      : `あなたはFinemeの${agent.role}です。以下の議題について専門領域の観点から意見・提案を述べてください。300字以内。\n\n議題: ${topic}${prevContext}`;

    const output = await runClaude(prompt);
    outputs.push({ name: agent.name, output });
    await pushToOwner(`【${agent.name}】\n\n${output}`);
    fs.appendFileSync(meetingFile, `## ${agent.name}\n\n${output}\n\n---\n\n`, 'utf8');
  }

  const summaryPrompt = `以下のFineme定例会議の議事録から、重要論点3つと次のアクション（担当付き）をまとめてください。200字以内。\n\n議題: ${topic}\n\n${outputs.map(o => `【${o.name}】\n${o.output}`).join('\n\n')}`;
  const summary = await runClaude(summaryPrompt);
  fs.appendFileSync(meetingFile, `## まとめ\n\n${summary}\n`, 'utf8');
  await pushToOwner(`📌 会議まとめ\n\n${summary}`);
}

async function pushToOwner(text) {
  const token = process.env.CLAUDE_LINE_ACCESS_TOKEN;
  const userId = process.env.OWNER_LINE_USER_ID;
  if (!token || !userId) return;
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text: String(text).slice(0, 4900) }] })
  }).catch(e => console.warn('pushToOwner err', e));
}

function splitForLine(text, max = 4900) {
  const chunks = [];
  let s = String(text || '(出力なし)');
  while (s.length > 0) { chunks.push(s.slice(0, max)); s = s.slice(max); }
  return chunks.length ? chunks : ['(出力なし)'];
}

app.post('/webhook/claude', (req, res) => {
  const secret = process.env.CLAUDE_LINE_CHANNEL_SECRET;
  const signature = req.headers['x-line-signature'];
  if (secret && signature) {
    const hash = crypto.createHmac('SHA256', secret).update(req.rawBody || '').digest('base64');
    if (hash !== signature) return res.status(403).send('Forbidden');
  }
  // 即座に 200 を返す（LINE の 1 秒タイムアウト対策）
  res.status(200).send('OK');

  const events = (req.body && req.body.events) || [];
  for (const event of events) {
    if (event.type !== 'message' || !event.message || event.message.type !== 'text') continue;
    const senderId = event.source && event.source.userId;
    if (senderId !== process.env.OWNER_LINE_USER_ID) continue;

    const prompt = event.message.text.trim();
    if (!prompt) continue;

    // 定例会議モード
    if (prompt.startsWith('定例会議:') || prompt.startsWith('定例会議：')) {
      const topic = prompt.replace(/^定例会議[：:]\s*/, '').trim();
      if (!topic) { pushToOwner('議題を入力してください。例: 定例会議: 今月の掲載者獲得が目標未達'); continue; }
      runMeeting(topic).catch(e => pushToOwner(`❌ 会議エラー: ${e.message}`));
      continue;
    }

    // 通常の Claude Code モード
    pushToOwner(`🤖 作業開始します...\n\n「${prompt}」\n\n完了したら報告します。`);

    const proc = spawn(process.env.CLAUDE_PATH || 'claude', ['--print', prompt, '--output-format', 'text', '--dangerously-skip-permissions'], {
      cwd: FINEME_DIR,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: Object.assign({}, process.env)
    });

    let output = '';
    proc.stdout.on('data', d => { output += d.toString(); });
    proc.stderr.on('data', d => { output += d.toString(); });
    proc.on('close', async (code) => {
      const prefix = code === 0 ? '✅ 完了しました\n\n' : '⚠️ エラーが発生しました\n\n';
      for (const chunk of splitForLine(prefix + output.trim())) {
        await pushToOwner(chunk);
      }
    });
    proc.on('error', async (err) => {
      await pushToOwner(`❌ Claude Code の起動に失敗しました\n${err.message}`);
    });
  }
});

app.listen(PORT, ()=>{
  console.log('LINE server listening on port', PORT);
});
