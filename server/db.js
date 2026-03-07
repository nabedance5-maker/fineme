const path = require('path');
const fs = require('fs');
// sqlite3 is an optional native dependency. If it's not available in the environment
// we fall back to a tiny in-memory stub so the rest of the server can still run
// (useful for editors / CI that don't have native builds).
let Database = null;
try{
  // @ts-ignore
  const sqlite3 = require('sqlite3');
  Database = sqlite3.verbose();
}catch(e){
  console.warn('sqlite3 not available; using fallback stub DB (no persistence)');
}

const DB_PATH = path.join(__dirname, 'data', 'fineme.db');

function ensureDataDir(){
  const dir = path.dirname(DB_PATH);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true });
}

function init(){
  ensureDataDir();
  const db = Database ? new Database.Database(DB_PATH) : (function(){
    // minimal stub to avoid runtime exceptions in environments without sqlite3
    return {
      serialize(fn){ try{ fn(); }catch(e){} },
      run(){ /* no-op */ },
      get(q, params, cb){ if(typeof cb==='function') cb(null, null); }
    };
  })();
  db.serialize(()=>{
    // users table (for PoC)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loginId TEXT UNIQUE,
      displayName TEXT,
      email TEXT,
      passwordHash TEXT,
      line_user_id TEXT,
      line_access_token TEXT,
      line_refresh_token TEXT,
      createdAt TEXT
    )`);
    // shops table
    db.run(`CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      loginId TEXT UNIQUE,
      line_user_id TEXT,
      line_access_token TEXT,
      line_refresh_token TEXT,
      createdAt TEXT
    )`);
    // line_accounts store tokens prior to linking
    db.run(`CREATE TABLE IF NOT EXISTS line_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      line_user_id TEXT UNIQUE,
      access_token TEXT,
      refresh_token TEXT,
      scope TEXT,
      createdAt TEXT
    )`);
    // notifications log
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target TEXT,
      type TEXT,
      payload TEXT,
      success INTEGER,
      createdAt TEXT
    )`);
    // providers: Fineme掲載者マスタ（Stripe連携込み）
    db.run(`CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loginId TEXT UNIQUE,
      displayName TEXT,
      email TEXT,
      passwordHash TEXT,
      category TEXT,
      stripeCustomerId TEXT UNIQUE,
      stripeSubscriptionId TEXT UNIQUE,
      subscriptionStatus TEXT DEFAULT 'pending',
      billingStartDate TEXT,
      referredByProviderId INTEGER,
      planAmount INTEGER DEFAULT 3000,
      createdAt TEXT,
      FOREIGN KEY(referredByProviderId) REFERENCES providers(id)
    )`);
    // subscriptions: Stripe課金ログ（Webhookで書き込み）
    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      providerId INTEGER NOT NULL,
      stripeSubscriptionId TEXT UNIQUE,
      stripeCustomerId TEXT,
      status TEXT,
      currentPeriodStart TEXT,
      currentPeriodEnd TEXT,
      amount INTEGER,
      currency TEXT DEFAULT 'jpy',
      createdAt TEXT,
      updatedAt TEXT,
      FOREIGN KEY(providerId) REFERENCES providers(id)
    )`);
    // payments: 決済履歴
    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      providerId INTEGER NOT NULL,
      stripePaymentIntentId TEXT UNIQUE,
      stripeInvoiceId TEXT,
      amount INTEGER,
      currency TEXT DEFAULT 'jpy',
      status TEXT,
      description TEXT,
      paidAt TEXT,
      createdAt TEXT,
      FOREIGN KEY(providerId) REFERENCES providers(id)
    )`);
    // referral_rewards: 紹介報酬ストック（¥500/月）
    db.run(`CREATE TABLE IF NOT EXISTS referral_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrerProviderId INTEGER NOT NULL,
      referredProviderId INTEGER NOT NULL,
      rewardAmount INTEGER DEFAULT 500,
      status TEXT DEFAULT 'pending',
      periodYearMonth TEXT,
      paidAt TEXT,
      createdAt TEXT,
      FOREIGN KEY(referrerProviderId) REFERENCES providers(id),
      FOREIGN KEY(referredProviderId) REFERENCES providers(id)
    )`);
    // stories: 体験談投稿（4問＋タグ、審査フロー付き）
    db.run(`CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      q1 TEXT,
      q2 TEXT,
      q3 TEXT,
      q4 TEXT,
      tags TEXT,
      status TEXT DEFAULT 'pending',
      reviewedAt TEXT,
      createdAt TEXT
    )`);
    // bookings: 予約ログ（初回予約検知→課金開始トリガー）
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      providerId INTEGER NOT NULL,
      userId INTEGER,
      bookingDate TEXT,
      status TEXT DEFAULT 'confirmed',
      isFirstBooking INTEGER DEFAULT 0,
      createdAt TEXT,
      FOREIGN KEY(providerId) REFERENCES providers(id)
    )`);
  });
  return db;
}

function open(){
  const db = init();
  return db;
}

module.exports = { open };
