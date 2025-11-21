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
  });
  return db;
}

function open(){
  const db = init();
  return db;
}

module.exports = { open };
