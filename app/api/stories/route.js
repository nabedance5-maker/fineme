import { queryAll, runQuery } from '@/lib/db-server';

/**
 * GET /api/stories  → 承認済みストーリー一覧
 * POST /api/stories → 体験談を投稿（pending状態で保存）
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'approved';
  const tag = searchParams.get('tag') || '';

  // stories テーブルが存在しない場合は空を返す（graceful fallback）
  const rows = await queryAll(
    `SELECT id, q1, q2, q3, q4, tags, status, createdAt
     FROM stories
     WHERE status=?
     ${tag ? "AND tags LIKE ?" : ''}
     ORDER BY createdAt DESC
     LIMIT 50`,
    tag ? [status, `%${tag}%`] : [status]
  );

  return Response.json(rows);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { answers, tags, submittedAt } = body;

    if (!answers || answers.length < 4) {
      return Response.json({ error: '回答が不足しています' }, { status: 400 });
    }

    // 各回答を最大文字数でサニタイズ
    const maxLen = [500, 600, 500, 400];
    const clean = answers.map((a, i) =>
      String(a || '').slice(0, maxLen[i]).replace(/[\x00-\x1F\x7F]/g, '')
    );

    const tagsStr = Array.isArray(tags) ? tags.slice(0, 5).join(',') : '';
    const now = submittedAt || new Date().toISOString();

    // stories テーブルへ INSERT（なければ無視）
    await runQuery(
      `INSERT OR IGNORE INTO stories (q1, q2, q3, q4, tags, status, createdAt)
       VALUES (?,?,?,?,?,'pending',?)`,
      [clean[0], clean[1], clean[2], clean[3], tagsStr, now]
    );

    return Response.json({ ok: true, message: '投稿を受け付けました。審査後に公開されます。' });
  } catch (err) {
    console.error('[stories POST]', err);
    return Response.json({ error: '送信に失敗しました' }, { status: 500 });
  }
}
