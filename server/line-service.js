const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');
const dbModule = require('./db');
const db = dbModule.open();

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';
const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

function buildTextMessage(text){
  return { type: 'text', text };
}

async function sendPush(to, messages){
  if(!ACCESS_TOKEN){
    console.warn('LINE access token not set; skipping sendPush');
    return { ok: false, reason: 'no-token' };
  }
  const body = { to, messages: Array.isArray(messages) ? messages : [ messages ] };
  const res = await fetch(LINE_PUSH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const txt = await res.text();
  if(!res.ok){
    console.warn('LINE push failed', res.status, txt);
    // log failure
    try{ db.run(`INSERT INTO notifications (target, type, payload, success, createdAt) VALUES (?, ?, ?, ?, ?)`, [to, 'push', txt, 0, new Date().toISOString()]); }catch(e){}
    return { ok:false, status: res.status, body: txt };
  }
  try{ db.run(`INSERT INTO notifications (target, type, payload, success, createdAt) VALUES (?, ?, ?, ?, ?)`, [to, 'push', txt, 1, new Date().toISOString()]); }catch(e){}
  return { ok:true, status: res.status, body: txt };
}

function formatReservationForUser(r){
  const lines = [];
  lines.push(`予約が確定しました！`);
  if(r.service) lines.push(`サービス: ${r.service}`);
  if(r.store) lines.push(`店舗: ${r.store}`);
  if(r.start) lines.push(`開始日時: ${r.start}`);
  if(r.address) lines.push(`住所: ${r.address}`);
  if(r.access) lines.push(`アクセス: ${r.access}`);
  if(r.storeUrl) lines.push(`店舗URL: ${r.storeUrl}`);
  return lines.join('\n');
}

function formatReservationForProvider(r){
  const lines = [];
  lines.push(`新しい予約が届きました`);
  if(r.userName) lines.push(`顧客: ${r.userName}`);
  if(r.start) lines.push(`日時: ${r.start}`);
  if(r.service) lines.push(`メニュー: ${r.service}`);
  if(r.contact && r.contactConsent) lines.push(`連絡先: ${r.contact}`);
  return lines.join('\n');
}

module.exports = { sendPush, buildTextMessage, formatReservationForUser, formatReservationForProvider };
