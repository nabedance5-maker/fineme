import { createClient } from '@supabase/supabase-js';
import PrintButton from './PrintButton';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export const metadata = {
  title: '役者向けプロジェクトブリーフ | Fineme',
  robots: { index: false },
};

export default async function ActorBriefPage() {
  const supabase = getSupabase();
  const { data: episodes } = await supabase
    .from('drama_episodes')
    .select('episode_no, title')
    .order('episode_no', { ascending: true });

  return (
    <>
      <style>{`
        @media print {
          nav, footer, header, .no-print { display: none !important; }
          body, html { background: white !important; color: black !important; text-shadow: none !important; }
          body::before { display: none !important; }
          .brief-wrap { background: white !important; color: black !important; padding: 0 !important; }
          .brief-doc { box-shadow: none !important; border: none !important; background: white !important; color: black !important; padding: 24px 32px !important; max-width: 100% !important; }
          .brief-cover-title { color: black !important; text-shadow: none !important; }
          .brief-cover-sub { color: #333 !important; }
          .brief-cover-date { color: #666 !important; border-color: #ccc !important; }
          .brief-section-num { color: #666 !important; }
          .brief-section-title { color: black !important; border-color: #ccc !important; }
          .brief-rule-label { color: black !important; background: #eee !important; }
          .brief-tag { background: #eee !important; color: black !important; border: 1px solid #ccc !important; }
          .brief-episode { border-color: #ccc !important; }
          .brief-episode-num { color: #666 !important; }
          .brief-episode-title { color: black !important; }
          .brief-footer-text { color: #666 !important; border-color: #ccc !important; }
        }
      `}</style>

      <div className="brief-wrap" style={{
        minHeight: '100vh',
        padding: '48px 16px 80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
      }}>
        <PrintButton />

        <div className="brief-doc" style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: '12px',
          padding: '56px 64px',
          maxWidth: '760px',
          width: '100%',
          boxShadow: '0 8px 48px rgba(0,0,0,0.4)',
        }}>

          {/* Cover */}
          <div style={{ marginBottom: '56px', paddingBottom: '40px', borderBottom: '1px solid rgba(201,168,76,0.18)' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#c9a84c', marginBottom: '20px', fontWeight: '600' }}>
              FINEME × SHORT DRAMA
            </p>
            <h1 className="brief-cover-title" style={{
              fontFamily: "'Noto Serif JP', serif",
              fontSize: '32px',
              fontWeight: '700',
              color: '#e8e4dc',
              lineHeight: '1.4',
              marginBottom: '12px',
            }}>
              役者向けプロジェクトブリーフ
            </h1>
            <p className="brief-cover-sub" style={{ fontSize: '15px', color: 'rgba(232,228,220,0.6)', marginBottom: '24px' }}>
              このドキュメントはドラマシリーズの企画概要・制作ルールをまとめたものです。
            </p>
            <p className="brief-cover-date" style={{
              fontSize: '13px',
              color: 'rgba(232,228,220,0.45)',
              borderTop: '1px solid rgba(232,228,220,0.1)',
              paddingTop: '16px',
            }}>
              2026年6月 作成
            </p>
          </div>

          {/* 01 */}
          <section style={{ marginBottom: '48px' }}>
            <SectionHeader num="01" title="このプロジェクトについて" />
            <p style={{ fontSize: '15px', lineHeight: '1.9', color: 'rgba(232,228,220,0.85)' }}>
              Fineme（ファインミ）は「外見を起点に自信を再設計する」プラットフォームです。
              ターゲットは、恋愛や人間関係で躓き、変わりたいと思っている男性。
            </p>
            <p style={{ fontSize: '15px', lineHeight: '1.9', color: 'rgba(232,228,220,0.85)', marginTop: '12px' }}>
              ショートドラマは、そのターゲットへのリーチを担う集客チャネルです。
              ジャンルは<strong style={{ color: '#c9a84c' }}>「あるあるコメディ × 感情ドラマ」</strong>。
              思わず笑って、でも最後にちょっと刺さる。そういう作品を作ります。
            </p>
          </section>

          {/* 02 */}
          <section style={{ marginBottom: '48px' }}>
            <SectionHeader num="02" title="フォーマットルール" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Rule label="尺" value="45〜75秒" />
              <Rule label="撮影ペース" value="週1本" />
              <Rule label="フック" value="冒頭1秒は「事件がすでに起きている状態」から始める。起承転結の「起」から入らない。動作・表情で引く。" />
              <Rule label="オチ" value="必ず入れる。問題は解決しない。「次が気になるひっかかり」を残して終わる。" />
              <Rule label="テロップ" value="重要なリアクション・台詞は字幕で強調（音なし視聴対応）。説明的・解説的なテロップは入れない。" />
              <Rule label="SE / BGM" value="効果音・BGMの指示を台本に含める（例：SE: 通知音、BGM: テンポの速いコメディBGM）。" />
              <Rule label="笑いの作り方" value="笑いはセリフで作らない。状況・行動・反射で作る。「外見が原因とわかるが、それを本人が言わない」設計。" />
            </div>
          </section>

          {/* 03 */}
          <section style={{ marginBottom: '48px' }}>
            <SectionHeader num="03" title="コンテンツルール" />
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', letterSpacing: '0.08em', color: 'rgba(232,228,220,0.5)', marginBottom: '10px', textTransform: 'uppercase' }}>
                禁止ワード（動画内・キャプション全て）
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['外見改善', 'モテる', '非モテ', 'イケメン', 'ブサイク', '清潔感'].map(w => (
                  <span key={w} className="brief-tag" style={{
                    padding: '4px 12px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(232,228,220,0.15)',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: 'rgba(232,228,220,0.75)',
                  }}>{w}</span>
                ))}
              </div>
            </div>
            <Rule label="Fineme宣伝" value="動画内ゼロ。バイオとピンコメントのみ。" />
          </section>

          {/* 04 */}
          <section style={{ marginBottom: '48px' }}>
            <SectionHeader num="04" title="エピソードリスト" />
            {episodes && episodes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {episodes.map((ep) => (
                  <div key={ep.episode_no} className="brief-episode" style={{
                    borderLeft: '2px solid rgba(201,168,76,0.4)',
                    paddingLeft: '16px',
                    paddingTop: '4px',
                    paddingBottom: '4px',
                  }}>
                    <span className="brief-episode-num" style={{ fontSize: '12px', color: '#c9a84c', display: 'block', marginBottom: '2px' }}>
                      #{ep.episode_no}
                    </span>
                    <span className="brief-episode-title" style={{ fontSize: '16px', fontFamily: "'Noto Serif JP', serif", color: '#e8e4dc' }}>
                      「{ep.title}」
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '15px', color: 'rgba(232,228,220,0.45)' }}>エピソード未登録</p>
            )}
            <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.45)', marginTop: '16px' }}>
              脚本は別途AIで初稿を出してから一緒にブラッシュアップします。
            </p>
          </section>

          {/* 05 */}
          <section style={{ marginBottom: '0' }}>
            <SectionHeader num="05" title="次のステップ" />
            <ol style={{ paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                '撮影日程の調整',
                '脚本草案を作成（AI初稿 → 一緒にブラッシュアップ）',
                '撮影 → TikTok @fineme.drama 開設 → 第1話投稿',
              ].map((step, i) => (
                <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '15px', color: 'rgba(232,228,220,0.8)' }}>
                  <span style={{ color: '#c9a84c', fontWeight: '700', minWidth: '20px' }}>{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          {/* Footer */}
          <div className="brief-footer-text" style={{
            marginTop: '56px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(232,228,220,0.1)',
            fontSize: '12px',
            color: 'rgba(232,228,220,0.35)',
            lineHeight: '1.7',
          }}>
            Fineme — fineme.me<br />
            プロデューサー：でお（@deo_fineme）<br />
            TikTok：@fineme.drama
          </div>
        </div>
      </div>
    </>
  );
}

function SectionHeader({ num, title }) {
  return (
    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'baseline', gap: '12px' }}>
      <span className="brief-section-num" style={{ fontSize: '11px', letterSpacing: '0.15em', color: '#c9a84c', fontWeight: '600' }}>
        {num}
      </span>
      <h2 className="brief-section-title" style={{
        fontFamily: "'Noto Serif JP', serif",
        fontSize: '18px',
        fontWeight: '700',
        color: '#e8e4dc',
        margin: '0',
        paddingBottom: '10px',
        borderBottom: '1px solid rgba(201,168,76,0.2)',
        flex: 1,
      }}>
        {title}
      </h2>
    </div>
  );
}

function Rule({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <span className="brief-rule-label" style={{
        fontSize: '12px',
        fontWeight: '600',
        color: 'rgba(232,228,220,0.5)',
        background: 'rgba(255,255,255,0.05)',
        padding: '3px 10px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        minWidth: '60px',
        textAlign: 'center',
        marginTop: '2px',
      }}>
        {label}
      </span>
      <p style={{ fontSize: '15px', lineHeight: '1.7', color: 'rgba(232,228,220,0.8)', margin: 0 }}>
        {value}
      </p>
    </div>
  );
}
