// お店が渡す、AI姿勢分析の記録の閲覧ページ（2026-11-24 渡邉承認の指示書 §3・§9）。
// /record/posture/<トークン>。トークンを知っている人だけが見られる（検索エンジンには載せない・リンク元にURLを渡さない）。
// 出すのはその1件の写真・前回からの変化・気づき・気になる部位・次の一手だけ。お客様の名前・お店のメモ・点数は出さない。
import { getSupabase } from '@/lib/supabase';
import { findSharedPostureEntry, publicPostureView } from '@/lib/posture-share';
import ClaimRecord from './ClaimRecord';
import './record.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: '姿勢の記録 | Fineme',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

const fmt = iso => new Date(iso).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric' });

function List({ title, items, chips }) {
  if (!items?.length) return null;
  return (
    <section className="rp-block">
      <h2 className="rp-h">{title}</h2>
      {chips
        ? <ul className="rp-chips">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
        : <ul className="rp-list">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>}
    </section>
  );
}

export default async function PostureRecordPage(props) {
  const { token } = await props.params;
  const db = getSupabase();
  const entry = await findSharedPostureEntry(db, token);

  if (!entry) {
    return (
      <main className="rp">
        <div className="rp-card rp-gone">
          <p className="rp-kicker">姿勢の記録</p>
          <h1 className="rp-title">この記録は、いまは見られません</h1>
          <p className="rp-lead">リンクの期限が切れたか、お店が表示をやめた可能性があります。もう一度ご覧になりたい場合は、通っているお店にお声がけください。</p>
        </div>
      </main>
    );
  }

  const v = await publicPostureView(db, entry);
  return (
    <main className="rp">
      <div className="rp-card">
        <p className="rp-kicker">{v.provider_name} からの姿勢の記録{v.is_sample ? '（デモ用のサンプル）' : ''}</p>
        <h1 className="rp-title">姿勢チェックの記録</h1>
        <p className="rp-date">{fmt(v.created_at)}</p>
        <p className="rp-lead">お店で撮った写真を、AIが見た目から読み取ったメモです。医療的な診断ではありません。撮り方で変わるため、変化の目安としてご覧ください。</p>

        {(v.photo_url || v.side_photo_url) && (
          <div className="rp-photos">
            {v.photo_url && <figure><img src={v.photo_url} alt="正面の写真" referrerPolicy="no-referrer" /><figcaption>正面</figcaption></figure>}
            {v.side_photo_url && <figure><img src={v.side_photo_url} alt="横の写真" referrerPolicy="no-referrer" /><figcaption>横</figcaption></figure>}
          </div>
        )}

        <List title="前回からの変化" items={v.changes} />
        <List title="今回の気づき" items={v.findings} />
        <List title="気になる部位" items={v.focus_areas} chips />
        <List title="次の一手" items={v.next_actions} />

        <p className="rp-foot">このページは {fmt(v.expires_at)} まで見られます。{v.provider_slug ? <> お店のページは<a href={`/provider/${v.provider_slug}`}>こちら</a>。</> : null}</p>
      </div>

      {v.claimable && <ClaimRecord token={token} providerName={v.provider_name} />}
    </main>
  );
}
