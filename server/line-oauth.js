require('dotenv').config();
const express = require('express');
const fetch = global.fetch || require('node-fetch');
// use URLSearchParams for building query strings
const path = require('path');
const fs = require('fs');
const dbModule = require('./db');

const router = express.Router();
const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const CLIENT_ID = process.env.LINE_LOGIN_CHANNEL_ID;
const CLIENT_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET;

// NOTE: buildAuthUrl removed in favor of URLSearchParams usage below

// start flow: redirect user to LINE authorization
router.get('/login', (req,res)=>{
  const rawReturnTo = req.query && req.query.returnTo ? req.query.returnTo : '/';
  const returnTo = String(rawReturnTo || '/');
  const provider = req.query && req.query.provider ? req.query.provider : undefined;
  // Build authorize URL (redirect_uri must match what is registered in LINE Developers)
  const redirectUri = process.env.LINE_OAUTH_CALLBACK || `http://localhost:${process.env.LINE_SERVER_PORT||4015}/line/callback`;
  const params = new URLSearchParams();
  params.set('response_type','code');
  params.set('client_id', CLIENT_ID);
  params.set('redirect_uri', redirectUri);
  params.set('scope', 'openid profile');
  params.set('state', returnTo);
  params.set('nonce', Math.random().toString(36).slice(2));
  if(provider) params.set('state', returnTo + '|provider');
  const authUrl = LINE_AUTH_URL + '?' + params.toString();
  res.redirect(authUrl);
});

// callback: exchange code for tokens, decode id_token to get sub, store in DB, then redirect back
router.get('/callback', async (req,res)=>{
  try{
  const code = String(req.query.code || '');
  const state = String(req.query.state || '/');
    if(!code) return res.status(400).send('missing code');
    const redirectUri = process.env.LINE_OAUTH_CALLBACK || `http://localhost:${process.env.LINE_SERVER_PORT||4015}/line/callback`;
    // exchange
  const bodyParams = new URLSearchParams();
  bodyParams.set('grant_type','authorization_code');
  bodyParams.set('code', code);
  bodyParams.set('redirect_uri', redirectUri);
  bodyParams.set('client_id', CLIENT_ID);
  bodyParams.set('client_secret', CLIENT_SECRET);
  const body = bodyParams.toString();
    const r = await fetch(LINE_TOKEN_URL, { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body });
    const j = await r.json();
    if(j.error) return res.status(500).json({ error: j });
    // decode id_token to extract sub
    const id_token = j.id_token;
    let decoded = null;
    try{ const parts = id_token.split('.'); decoded = JSON.parse(Buffer.from(parts[1],'base64').toString()); }catch(e){}
    const lineUserId = decoded && decoded.sub ? decoded.sub : (j.userId || null);
    // store in line_accounts table
    const db = dbModule.open();
    db.serialize(()=>{
      db.run(`INSERT OR REPLACE INTO line_accounts (line_user_id, access_token, refresh_token, scope, createdAt) VALUES (?, ?, ?, ?, ?)`, [lineUserId, j.access_token||'', j.refresh_token||'', j.scope||'', new Date().toISOString()]);
    });
    // redirect back to app; include line_user_id in query so client can pick it up
    let returnTo = '/';
    if(state){ // our usage encoded returnTo in state
      const s = String(state);
      returnTo = decodeURIComponent((s.split('|')[0]) || '/');
    }
    const sep = returnTo.includes('?') ? '&' : '?';
    return res.redirect(`${returnTo}${sep}line_user_id=${encodeURIComponent(lineUserId)}`);
  }catch(err){ console.error('line callback error', err); return res.status(500).send('callback error'); }
});

module.exports = router;
