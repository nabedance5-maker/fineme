// 「来店の目安を過ぎたお客様」へのまとめて声かけ（2026-11-21 渡邉判断：提案資料の見本と同じことを管理画面でできるように）。
// 送信は app/api/provider/customers/overdue-nudge、文案は同 /draft。ここは両方で使う定数と、文案づくり。
// AI に渡すのは、店舗名・業種・前回のメニュー名（件数の多い順）と人数だけ。お客様の名前・連絡先は渡さない（名前は送る時に {name} を置き換える）。
import { aiClient } from '@/lib/ai';

export const OVERDUE_NUDGE_LABEL = '来店の目安を過ぎたお客様へ声かけ';

const CATEGORY_LABELS = {
  consulting: 'コンサルティング', gym: 'ジム・トレーニング', makeup: 'メイク', hair: '美容室・ヘアサロン',
  diagnosis: '診断', fashion: 'ファッション', photo: '写真', marriage: '結婚相談', eyebrow: '眉サロン',
  hairremoval: '脱毛', esthetic: 'エステ', whitening: 'ホワイトニング', orthodontics: '矯正歯科',
  nail: 'ネイル', aga: 'AGAクリニック',
};

export function fallbackDraft() {
  return '{name}様、前回のご来店から少し間が空きましたね。その後お変わりありませんか？\n前回の状態を保つなら、そろそろ次のご来店がおすすめの時期です。\nご都合のよい日時を、下のボタンからお選びいただけます。';
}

// menus: ['眉スタイリング', ...]（多い順）。count: 送る人数
export async function generateOverdueDraft({ storeName, category, menus, count }) {
  const cat = CATEGORY_LABELS[category] || category || '';
  const prompt = `あなたは${cat ? `「${cat}」の` : ''}お店「${storeName || 'お店'}」のスタッフです。
来店の目安（いつもの通う間隔）を過ぎたお客様${count}名に、お店の公式LINEから送る声かけの文面を1つ作ってください。
お客様が前回受けたメニュー（多い順）：${menus.length ? menus.join('、') : '不明'}

【厳守】
- 書き出しは「{name}様、」。{name} は送る時にお客様ごとのお名前に置き換わるので、そのまま書く
- 3〜4文・全体で150字以内。敬語で、押し売りにしない。お客様を責めない（「来ていない」等と言わない）
- 前回のメニューに合わせて、今が次の来店によい時期である理由を、業種として一般的な範囲で一言添える。効果を断定・保証しない。医療的な判断をしない
- 最後は「下のボタンから予約できる」ことにつなげる（文面の下に予約ボタンが付く）
- 割引・特典・日付・数字を勝手に作らない。絵文字・記号の装飾を使わない
次のJSONだけを出力してください：{"text":"..."}`;
  try {
    const client = aiClient('free', { budgetMs: 12000 });
    const msg = await client.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, messages: [{ role: 'user', content: prompt }] });
    const raw = msg.content?.[0]?.text || '';
    const m = raw.match(/\{[\s\S]*\}/);
    const text = m ? String(JSON.parse(m[0]).text || '').trim() : '';
    if (!text || text.length > 400 || !text.includes('{name}')) return { text: fallbackDraft(), ai: false };
    return { text, ai: true };
  } catch (e) {
    console.warn('[overdue-nudge] draft failed:', e?.message);
    return { text: fallbackDraft(), ai: false };
  }
}
