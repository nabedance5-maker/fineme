/**
 * lib/db-server.js
 * Next.js API routes から SQLite にアクセスするためのアダプター。
 * Vercel（serverless）では SQLite が使えないため、デモデータにフォールバック。
 *
 * 使い方:
 *   import { queryAll, queryOne, runQuery } from '@/lib/db-server';
 */

let _db = null;

function getDB() {
  if (_db) return _db;
  try {
    // Next.js のサーバーサイドから server/db.js を参照
    const dbModule = require('../server/db');
    _db = dbModule.open();
    return _db;
  } catch {
    return null;
  }
}

/** SELECT → 複数行 */
export function queryAll(sql, params = []) {
  return new Promise((resolve) => {
    const db = getDB();
    if (!db) return resolve([]);
    db.all(sql, params, (err, rows) => {
      resolve(err ? [] : (rows || []));
    });
  });
}

/** SELECT → 1行 */
export function queryOne(sql, params = []) {
  return new Promise((resolve) => {
    const db = getDB();
    if (!db) return resolve(null);
    db.get(sql, params, (err, row) => {
      resolve(err ? null : (row || null));
    });
  });
}

/** INSERT / UPDATE / DELETE */
export function runQuery(sql, params = []) {
  return new Promise((resolve) => {
    const db = getDB();
    if (!db) return resolve({ changes: 0 });
    db.run(sql, params, function(err) {
      resolve(err ? { changes: 0 } : { changes: this.changes, lastID: this.lastID });
    });
  });
}
