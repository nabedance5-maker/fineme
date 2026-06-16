#!/usr/bin/env node
// Memory.md → Supabase agent_memory 同期スクリプト
// 使い方: node scripts/sync-brain-memory.js
// Memory.md を更新したら毎回これを実行する（または Claude Code に頼む）

import fs from 'fs';
import path from 'path';
import os from 'os';

const MEMORY_PATH = path.join(os.homedir(), 'MyBrain', 'Memory.md');
const API_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/sync-brain-memory`
  : 'https://www.fineme.me/api/admin/sync-brain-memory';
const SECRET = process.env.CRON_SECRET;

if (!SECRET) {
  console.error('Error: CRON_SECRET 環境変数が設定されていません');
  process.exit(1);
}

const content = fs.readFileSync(MEMORY_PATH, 'utf-8');
console.log(`Memory.md 読み込み完了 (${content.length} 文字)`);

const res = await fetch(API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SECRET}`,
  },
  body: JSON.stringify({ content }),
});

const json = await res.json();
if (!res.ok) {
  console.error('同期失敗:', json);
  process.exit(1);
}

console.log(`✅ Supabase に同期完了 (${json.length} 文字)`);
