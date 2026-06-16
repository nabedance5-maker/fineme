// agent-memory.js
// Supabase の agent_memory テーブルから Memory.md の内容を取得する共通ユーティリティ
// Vercel cron エージェントが起動時にオーナーコンテキストを読むために使う

import { getSupabase } from '@/lib/supabase';

/**
 * agent_memory テーブルから Memory.md の内容を取得する
 * 取得失敗時は空文字を返す（エージェントの動作を止めない）
 */
export async function fetchAgentMemory() {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('agent_memory')
      .select('content')
      .eq('id', 'main')
      .single();

    if (error || !data?.content) return '';
    return data.content;
  } catch (e) {
    console.warn('[agent-memory] fetch failed:', e.message);
    return '';
  }
}

/**
 * システムプロンプトにメモリを付加する
 * memory が空の場合はベースプロンプトをそのまま返す
 */
export function withMemory(baseSystem, memory) {
  if (!memory) return baseSystem;
  return `${baseSystem}

---
【オーナーコンテキスト（Memory.md より）】
${memory}`;
}
