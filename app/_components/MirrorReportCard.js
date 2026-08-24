'use client';
import { Fragment, useState } from 'react';
// Mirror ビジュアルレポート表示カード。
// app/api/mirror/report が返す report_content（Claude Haiku生成のSTEP1-15相当の構造化JSON。
// 2026-08-12に元プロンプトのサブ項目粒度に合わせて全面拡張）と photo_url（署名付きURL）を
// HTML/CSSでレンダリングする。画像生成AIは使わない。
// app/mirror/page.js・app/belle/mirror/page.js・app/mypage/mirror/page.js から共有利用。
//
// 画像保存ボタン：html2canvasは使わない。app/_components/ServiceLog.js の
// FVカード画像化（2026-08-05）で、cqw・flex中央寄せ・背景画像を含む構成を
// html2canvasの3手法いずれでも正しく描けず断念し、<canvas>手描き方式に切り替えた
// 前例がある。同じ轍を踏まないよう、この保存機能も最初から手描きcanvas方式にする。

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// 日本語は単語境界が無いため、測定幅ベースで1文字ずつ改行判定する簡易ワードラップ。
function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of String(text || '')) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrappedText(ctx, text, centerX, startY, maxWidth, lineHeight) {
  const lines = wrapLines(ctx, text, maxWidth);
  lines.forEach((line, i) => ctx.fillText(line, centerX, startY + i * lineHeight));
  return startY + lines.length * lineHeight;
}

// VISUAL TYPEのピル型バッジを中央揃え・折り返しで描画する。
function drawPillRow(ctx, items, centerX, startY, maxWidth, { fontSize, color, bg, border }) {
  ctx.font = `700 ${fontSize}px 'Noto Sans JP', sans-serif`;
  const padX = fontSize * 0.9, gap = fontSize * 0.5, pillH = fontSize * 2.2;
  const rows = [];
  let row = [], rowWidth = 0;
  items.forEach(text => {
    const w = ctx.measureText(text).width + padX * 2;
    if (rowWidth + w + (row.length ? gap : 0) > maxWidth && row.length) {
      rows.push({ row, rowWidth });
      row = []; rowWidth = 0;
    }
    row.push({ text, w });
    rowWidth += w + (row.length > 1 ? gap : 0);
  });
  if (row.length) rows.push({ row, rowWidth });

  let y = startY;
  rows.forEach(({ row, rowWidth }) => {
    let x = centerX - rowWidth / 2;
    row.forEach(({ text, w }) => {
      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      const rectY = y - pillH * 0.72;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, rectY, w, pillH, pillH / 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(text, x + padX, y);
      x += w + gap;
    });
    y += pillH + fontSize * 0.4;
  });
  return y;
}

// 中央揃えテキストを描く共通ヘルパー。呼び出しごとに font/align/baseline を
// 必ず明示的に設定し直す（前の呼び出しの状態に依存しない。overflow時は
// maxWidthに収まるまでフォントサイズを自動で縮める）。
function fillCenteredText(ctx, text, centerX, y, { font, maxWidth, minFont }) {
  let fontStr = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (maxWidth) {
    const sizeMatch = font.match(/(\d+)px/);
    let size = sizeMatch ? parseInt(sizeMatch[1], 10) : null;
    if (size) {
      ctx.font = fontStr;
      while (ctx.measureText(text).width > maxWidth && size > (minFont || 12)) {
        size -= 2;
        fontStr = font.replace(/\d+px/, `${size}px`);
        ctx.font = fontStr;
      }
    }
  }
  ctx.font = fontStr;
  ctx.fillText(text, centerX, y);
}

// シェア用カードを1080×1920（スマホ縦画面比）のcanvasに手描きする。
async function renderShareCardImage(reportContent, photoUrl, accentHex, tierComparison) {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const SERIF = "'Noto Serif JP', Georgia, serif";
  const SANS = "'Noto Sans JP', sans-serif";

  // document.fonts.ready だけだと、そのページでまだ一度も使われていない
  // ウェイト/サイズの組み合わせは待たれないことがある（フォールバック書体で
  // 幅が想定と大きくズレ、はみ出し・行間崩れの原因になっていた）。
  // 実際にcanvasで使う組み合わせを個別にloadして確実に揃える。
  try {
    await Promise.all([
      document.fonts.load(`800 26px ${SANS}`),
      document.fonts.load(`700 24px ${SANS}`),
      document.fonts.load(`800 72px ${SERIF}`),
      document.fonts.load(`800 56px ${SANS}`),
      document.fonts.load(`700 26px ${SANS}`),
      document.fonts.load(`400 24px ${SANS}`),
      document.fonts.load(`700 22px ${SANS}`),
    ]);
    await document.fonts.ready;
  } catch {}

  ctx.fillStyle = '#05080F';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = accentHex;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.globalAlpha = 1;

  const CARD_MAX_W = 880; // 左右余白を確保した安全テキスト幅
  let y = 100;

  ctx.fillStyle = accentHex;
  fillCenteredText(ctx, 'F I N E M E   S T O I C   M I R R O R', W / 2, y, { font: `800 26px ${SANS}`, maxWidth: 980, minFont: 18 });
  y += 70;

  // 写真は「切り抜かず全体を収める」contain方式（オンスクリーン表示と同じ見え方にする。
  // 以前はcoverで固定枠に切り抜いており、アスペクト比が変わって見える不具合があった）。
  let photoImg = null;
  if (photoUrl) {
    try { photoImg = await loadImageEl(photoUrl); } catch { photoImg = null; }
  }
  if (photoImg) {
    const maxW = 820, maxH = 760;
    const scale = Math.min(maxW / photoImg.width, maxH / photoImg.height, 1);
    const dw = photoImg.width * scale, dh = photoImg.height * scale;
    const boxX = (W - dw) / 2, boxY = y, radius = 28;
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(boxX, boxY, dw, dh, radius);
    else ctx.rect(boxX, boxY, dw, dh);
    ctx.clip();
    ctx.drawImage(photoImg, boxX, boxY, dw, dh);
    ctx.restore();
    ctx.strokeStyle = accentHex;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(boxX, boxY, dw, dh, radius); ctx.stroke(); }
    ctx.globalAlpha = 1;
    y = boxY + dh + 70;
  } else {
    y += 20;
  }

  if (reportContent.visual_tier) {
    ctx.fillStyle = 'rgba(232,228,220,0.45)';
    fillCenteredText(ctx, '現在の変容ステージ', W / 2, y, { font: `700 24px ${SANS}` });
    y += 76;

    ctx.fillStyle = accentHex;
    fillCenteredText(ctx, reportContent.visual_tier, W / 2, y, { font: `800 72px ${SERIF}`, maxWidth: CARD_MAX_W, minFont: 40 });
    y += 96;
  }

  const scoreText = `${reportContent.visual_score} / ${reportContent.visual_score_max || 888}`;
  ctx.fillStyle = 'rgba(232,228,220,0.9)';
  fillCenteredText(ctx, scoreText, W / 2, y, { font: `800 56px ${SANS}`, maxWidth: CARD_MAX_W, minFont: 32 });
  y += 74;

  if (reportContent.visual_tier_description) {
    ctx.fillStyle = 'rgba(232,228,220,0.55)';
    ctx.font = `400 24px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    y = drawWrappedText(ctx, reportContent.visual_tier_description, W / 2, y + 16, CARD_MAX_W, 38) + 24;
  }

  if (reportContent.visual_type_keywords?.length) {
    ctx.textBaseline = 'alphabetic';
    y = drawPillRow(ctx, reportContent.visual_type_keywords, W / 2, y, CARD_MAX_W, {
      fontSize: 24, color: accentHex, bg: 'rgba(255,255,255,0.03)', border: accentHex,
    });
    y += 16;
  }

  if (reportContent.visual_type_description) {
    ctx.fillStyle = 'rgba(232,228,220,0.6)';
    ctx.font = `400 24px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    y = drawWrappedText(ctx, reportContent.visual_type_description, W / 2, y + 12, CARD_MAX_W, 38) + 24;
  }

  if (tierComparison?.promoted) {
    const text = `🎉 前回の「${tierComparison.previous_tier}」から「${reportContent.visual_tier}」へ変容が進みました`;
    ctx.fillStyle = accentHex;
    ctx.font = `700 24px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    y = drawWrappedText(ctx, text, W / 2, y + 16, CARD_MAX_W, 36) + 16;
  }

  ctx.fillStyle = 'rgba(232,228,220,0.22)';
  fillCenteredText(ctx, 'fineme.me', W / 2, H - 72, { font: `700 24px ${SANS}` });

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

const SCORE_LABELS = {
  face_balance: '顔全体のバランス',
  parts_layout: 'パーツ配置',
  eyes: '目元',
  eyebrows: '眉',
  nose: '鼻',
  mouth: '口元',
  faceline: 'フェイスライン',
  symmetry: '左右バランス',
  hair: '髪型',
  skin: '肌・清潔感',
  body_shaping: '体型の見せ方',
  posture: '姿勢',
  fashion: '服装',
  color_matching: '色合わせ',
  overall_cohesion: '全体の統一感',
  photo_impression: '写真映え',
};

function Rows({ items, accent }) {
  const visible = (items || []).filter(([, v]) => v != null && v !== '');
  if (!visible.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: '6px', columnGap: '10px' }}>
      {visible.map(([label, val]) => (
        <Fragment key={label}>
          <span style={{ fontSize: '11px', color: accent, opacity: 0.75, fontWeight: 700 }}>{label}</span>
          <span style={{ fontSize: '12px', color: 'rgba(232,228,220,0.72)', lineHeight: 1.6 }}>{val}</span>
        </Fragment>
      ))}
    </div>
  );
}

function Section({ icon, title, accent, children }) {
  return (
    <div style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
      <p style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(232,228,220,0.9)', marginBottom: '8px' }}>
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

function ChipList({ items, accent, accentSoft, accentBorder }) {
  if (!items?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
      {items.map((t, i) => (
        <span key={i} style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: accentSoft, border: `1px solid ${accentBorder}`, color: accent }}>
          {t}
        </span>
      ))}
    </div>
  );
}

export default function MirrorReportCard({ reportContent, photoUrl, gender, tierComparison }) {
  const [saving, setSaving] = useState(false);

  if (!reportContent) return null;

  const accent = gender === 'female' ? '#E0A6C4' : '#C9A84C';
  const accentSoft = gender === 'female' ? 'rgba(224,166,196,0.12)' : 'rgba(201,168,76,0.12)';
  const accentBorder = gender === 'female' ? 'rgba(224,166,196,0.4)' : 'rgba(201,168,76,0.4)';

  async function handleSaveImage() {
    setSaving(true);
    try {
      const blob = await renderShareCardImage(reportContent, photoUrl, accent, tierComparison);
      if (!blob) throw new Error('画像の生成に失敗しました');

      const filename = `fineme-mirror-${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Fineme Mirror', text: reportContent.visual_tier ? `変容ステージ: ${reportContent.visual_tier}` : 'Fineme Mirror の診断結果' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch (e) {
      if (e?.name !== 'AbortError') alert('画像の保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  const scoreEntries = Object.entries(reportContent.scores || {}).filter(([, v]) => v != null);
  const topWeightKey = scoreEntries.length
    ? scoreEntries.reduce((top, [key]) => {
        const w = reportContent.score_weights?.[key] || 0;
        const topW = reportContent.score_weights?.[top] || 0;
        return w > topW ? key : top;
      }, scoreEntries[0][0])
    : null;

  const face = reportContent.face;
  const hair = reportContent.hair;
  const skin = reportContent.skin;
  const neckShoulders = reportContent.neck_shoulders;
  const body = reportContent.body;
  const posture = reportContent.posture;
  const fashion = reportContent.fashion;
  const cohesion = reportContent.visual_cohesion;
  const photoQuality = reportContent.photo_quality;

  return (
    <div style={{ background: '#05080F', borderRadius: '20px', overflow: 'hidden', border: `1px solid ${accentBorder}`, marginTop: '28px', boxShadow: '0 24px 60px rgba(0,0,0,0.8)' }}>
      {/* シェア用カード（スクショ・保存ボタン両対応の1画面。でお指定の階層：
          階級（最大の主役）→点数（次点で大きく）→VISUAL TYPE→写真→透かし） */}
      <div style={{ padding: '22px 22px 26px', textAlign: 'center' }}>
        <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.28em', color: accent, textTransform: 'uppercase' }}>Fineme Mirror — Stoic Mirror</span>

        {photoUrl && (
          <div style={{ padding: '14px 0 0' }}>
            <img
              src={photoUrl}
              alt="診断写真"
              style={{ maxWidth: '100%', maxHeight: '360px', borderRadius: '14px', border: `1px solid ${accentBorder}`, objectFit: 'cover' }}
            />
          </div>
        )}

        {reportContent.visual_tier && (
          <div style={{ padding: '20px 0 0' }}>
            <p style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.2em', color: 'rgba(232,228,220,0.35)', textTransform: 'uppercase', margin: '0 0 6px' }}>
              現在の変容ステージ
            </p>
            <p style={{ fontFamily: "'Noto Serif JP', Georgia, serif", fontSize: '40px', fontWeight: 800, color: accent, margin: 0, lineHeight: 1.2 }}>
              {reportContent.visual_tier}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '6px', padding: '10px 0 0' }}>
          <span style={{ fontSize: '32px', fontWeight: 800, color: 'rgba(232,228,220,0.9)', lineHeight: 1 }}>{reportContent.visual_score}</span>
          <span style={{ fontSize: '13px', color: 'rgba(232,228,220,0.4)' }}>/ {reportContent.visual_score_max || 888}</span>
        </div>

        {reportContent.visual_tier_description && (
          <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.5)', margin: '6px 0 0', lineHeight: 1.6 }}>
            {reportContent.visual_tier_description}
          </p>
        )}

        {reportContent.visual_type_keywords?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', padding: '16px 0 0' }}>
            {reportContent.visual_type_keywords.map((kw, i) => (
              <span key={i} style={{ fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '99px', background: accentSoft, border: `1px solid ${accentBorder}`, color: accent }}>
                {kw}
              </span>
            ))}
          </div>
        )}

        {reportContent.visual_type_description && (
          <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.55)', margin: '8px 0 0', lineHeight: 1.7 }}>
            {reportContent.visual_type_description}
          </p>
        )}

        {tierComparison?.promoted && (
          <div style={{ margin: '16px 0 0', padding: '10px 14px', borderRadius: '12px', background: accentSoft, border: `1px solid ${accentBorder}` }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: accent, margin: 0, lineHeight: 1.6 }}>
              🎉 前回の「{tierComparison.previous_tier}」から「{reportContent.visual_tier}」へ変容が進みました
            </p>
          </div>
        )}

        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.2em', color: 'rgba(232,228,220,0.18)', margin: '20px 0 0' }}>fineme.me</p>
      </div>

      <div style={{ padding: '0 22px 4px', textAlign: 'center' }}>
        <button
          onClick={handleSaveImage}
          disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: 'none', border: `1px solid ${accentBorder}`, borderRadius: '99px', color: accent, fontSize: '12px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
        >
          {saving ? '作成中…' : '📸 この結果を画像で保存'}
        </button>
      </div>

      {reportContent.first_impression && (
        <div style={{ margin: '12px 22px', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(232,228,220,0.08)' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: accent, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' }}>First Impression</p>
          <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.8)', lineHeight: 1.7, margin: 0 }}>{reportContent.first_impression}</p>
        </div>
      )}

      <div style={{ margin: '20px 22px 8px' }}>
        {face && (
          <Section icon="👤" title="顔・頭部" accent={accent}>
            <Rows accent={accent} items={[
              ['顔型', face.face_shape], ['縦横比', face.aspect_ratio], ['顔の余白', face.margin],
              ['輪郭', face.contour], ['額', face.forehead], ['頬', face.cheeks], ['頬骨', face.cheekbones],
              ['顎', face.chin], ['フェイスライン', face.faceline], ['立体感', face.dimensionality],
              ['左右バランス', face.symmetry], ['パーツ配置', face.parts_layout],
            ]} />
            {face.eyebrows && (
              <div style={{ marginTop: '10px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(232,228,220,0.5)', marginBottom: '4px' }}>眉</p>
                <Rows accent={accent} items={[
                  ['太さ', face.eyebrows.thickness], ['長さ', face.eyebrows.length], ['角度', face.eyebrows.angle],
                  ['位置', face.eyebrows.position], ['目との距離', face.eyebrows.eye_distance],
                  ['左右差', face.eyebrows.asymmetry], ['印象', face.eyebrows.impression],
                ]} />
              </div>
            )}
            {face.eyes && (
              <div style={{ marginTop: '10px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(232,228,220,0.5)', marginBottom: '4px' }}>目元</p>
                <Rows accent={accent} items={[
                  ['大きさ', face.eyes.size], ['縦幅/横幅', face.eyes.height_width], ['形', face.eyes.shape],
                  ['目尻の角度', face.eyes.corner_angle], ['左右差', face.eyes.asymmetry],
                  ['眉との距離', face.eyes.eyebrow_distance], ['印象', face.eyes.impression],
                ]} />
              </div>
            )}
            {face.nose && (
              <div style={{ marginTop: '10px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(232,228,220,0.5)', marginBottom: '4px' }}>鼻</p>
                <Rows accent={accent} items={[
                  ['鼻筋', face.nose.bridge], ['鼻幅', face.nose.width], ['鼻先', face.nose.tip],
                  ['小鼻', face.nose.nostrils], ['バランス', face.nose.balance], ['印象', face.nose.impression],
                ]} />
              </div>
            )}
            {face.mouth && (
              <div style={{ marginTop: '10px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(232,228,220,0.5)', marginBottom: '4px' }}>口元</p>
                <Rows accent={accent} items={[
                  ['口の大きさ', face.mouth.size], ['唇の厚み', face.mouth.lip_thickness],
                  ['上下唇のバランス', face.mouth.lip_balance], ['口角', face.mouth.corner],
                  ['鼻と口の距離', face.mouth.nose_distance], ['印象', face.mouth.impression],
                ]} />
              </div>
            )}
            {face.layout && (
              <div style={{ marginTop: '10px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(232,228,220,0.5)', marginBottom: '4px' }}>パーツの配置</p>
                <Rows accent={accent} items={[
                  ['額〜眉', face.layout.forehead_to_eyebrow], ['眉〜鼻', face.layout.eyebrow_to_nose],
                  ['鼻〜顎', face.layout.nose_to_chin], ['目鼻口の配置', face.layout.feature_arrangement],
                  ['中心軸', face.layout.center_axis], ['左右バランス', face.layout.symmetry],
                ]} />
              </div>
            )}
          </Section>
        )}

        {hair && (
          <Section icon="💇" title="髪型・ヘアスタイル" accent={accent}>
            <Rows accent={accent} items={[
              ['長さ', hair.length], ['前髪', hair.bangs], ['毛量', hair.volume], ['シルエット', hair.silhouette],
              ['顔型との相性', hair.face_shape_compatibility], ['髪型の効果', hair.styling_effect],
              ['トップのボリューム', hair.top_volume], ['サイドのボリューム', hair.side_volume],
              ['顔周り', hair.face_framing], ['服装との統一感', hair.outfit_cohesion],
              ['良い点', hair.strengths], ['改善できる点', hair.improvements],
            ]} />
            <ChipList items={hair.recommended_styles} accent={accent} accentSoft={accentSoft} accentBorder={accentBorder} />
          </Section>
        )}

        {skin && (
          <Section icon="✨" title="肌・清潔感" accent={accent}>
            <Rows accent={accent} items={[
              ['肌の見え方', skin.appearance], ['質感', skin.texture], ['ツヤ', skin.glow],
              ['乾燥部分', skin.dry_areas], ['肌色', skin.skin_tone], ['髭', skin.facial_hair],
              ['眉のグルーミング', skin.eyebrow_grooming], ['その他グルーミング', skin.other_grooming],
              ['清潔感の印象', skin.cleanliness_impression],
            ]} />
          </Section>
        )}

        {neckShoulders && (
          <Section icon="📐" title="首・肩・上半身" accent={accent}>
            <Rows accent={accent} items={[
              ['首の見え方', neckShoulders.neck_appearance], ['首と顔のバランス', neckShoulders.neck_face_balance],
              ['肩幅', neckShoulders.shoulder_width], ['肩の傾き', neckShoulders.shoulder_tilt],
              ['肩〜首のライン', neckShoulders.neck_shoulder_line], ['上半身のシルエット', neckShoulders.upper_body_silhouette],
              ['見えている範囲', neckShoulders.visible_parts], ['服を着た状態のバランス', neckShoulders.clothed_balance],
            ]} />
          </Section>
        )}

        {body && (
          <Section icon="🧍" title="体型・全身バランス" accent={accent}>
            <Rows accent={accent} items={[
              ['全体のシルエット', body.overall_silhouette], ['肩幅と腰のバランス', body.shoulder_hip_balance],
              ['上半身と下半身のバランス', body.upper_lower_balance], ['脚の見え方', body.legs], ['腕の見え方', body.arms],
              ['縦のライン', body.vertical_line], ['横のライン', body.horizontal_line],
              ['服を含めたプロポーション', body.clothed_proportion], ['立ち姿のバランス', body.standing_balance],
              ['見え方と身体そのものの区別', body.styling_vs_physique],
            ]} />
          </Section>
        )}

        {posture && (
          <Section icon="🧘" title="姿勢・ポージング" accent={accent}>
            <Rows accent={accent} items={[
              ['頭の位置', posture.head_position], ['首の角度', posture.neck_angle], ['肩の位置', posture.shoulder_position],
              ['背中', posture.back], ['骨盤', posture.pelvis], ['脚の位置', posture.leg_position], ['腕の位置', posture.arm_position],
              ['重心', posture.center_of_gravity], ['左右の傾き', posture.left_right_tilt],
              ['立ち方', posture.standing_style], ['座り方', posture.sitting_style], ['ポーズの効果', posture.pose_effect],
            ]} />
            {posture.top_improvements?.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(232,228,220,0.5)', marginBottom: '4px' }}>最も改善効果が大きい姿勢</p>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  {posture.top_improvements.map((t, i) => (
                    <li key={i} style={{ fontSize: '11px', color: 'rgba(232,228,220,0.65)', lineHeight: 1.7 }}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {fashion && (
          <Section icon="👔" title="服装・ファッション" accent={accent}>
            <Rows accent={accent} items={[
              ['服の種類', fashion.clothing_type], ['色', fashion.color], ['素材感', fashion.material_texture],
              ['シルエット', fashion.silhouette], ['サイズ感', fashion.size_fit], ['丈', fashion.length],
              ['肩のライン', fashion.shoulder_line], ['トップスとボトムスのバランス', fashion.top_bottom_balance],
              ['靴', fashion.shoes], ['アクセサリー', fashion.accessories], ['小物', fashion.small_items],
              ['レイヤード', fashion.layering], ['色の組み合わせ', fashion.color_combination],
              ['服と身体のバランス', fashion.body_balance], ['服と顔立ちの相性', fashion.face_compatibility],
              ['服と髪型の統一感', fashion.hair_cohesion], ['ファッションの方向性', fashion.style_direction],
              ['現在の強み', fashion.strengths], ['改善点', fashion.improvements],
            ]} />
            <ChipList items={fashion.recommended_silhouettes} accent={accent} accentSoft={accentSoft} accentBorder={accentBorder} />
            <ChipList items={fashion.recommended_colors} accent={accent} accentSoft={accentSoft} accentBorder={accentBorder} />
            {fashion.avoid_styles?.length > 0 && (
              <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.45)', marginTop: '8px', lineHeight: 1.6 }}>
                避けた方がよい可能性: {fashion.avoid_styles.join(' / ')}
              </p>
            )}
          </Section>
        )}

        {cohesion && (
          <Section icon="🎨" title="全体の統一感" accent={accent}>
            <Rows accent={accent} items={[
              ['顔と髪型', cohesion.face_hair], ['顔と服', cohesion.face_fashion], ['体型と服', cohesion.body_fashion],
              ['髪型と服', cohesion.hair_fashion], ['色の統一感', cohesion.color_cohesion],
              ['全体のシルエット', cohesion.overall_silhouette], ['清潔感', cohesion.cleanliness],
              ['方向性', cohesion.style_direction], ['全体の完成度', cohesion.overall_completeness],
            ]} />
          </Section>
        )}

        {photoQuality && (
          <Section icon="📷" title="写真写り" accent={accent}>
            <Rows accent={accent} items={[
              ['カメラアングル', photoQuality.camera_angle], ['顔の角度', photoQuality.face_angle],
              ['身体の角度', photoQuality.body_angle], ['カメラとの距離', photoQuality.camera_distance],
              ['レンズの歪み', photoQuality.lens_distortion], ['照明', photoQuality.lighting],
              ['光の方向', photoQuality.light_direction], ['背景', photoQuality.background],
              ['構図', photoQuality.composition], ['余白', photoQuality.margin], ['表情', photoQuality.expression],
              ['ポージング', photoQuality.pose], ['視線', photoQuality.gaze], ['雰囲気', photoQuality.atmosphere],
            ]} />
            {photoQuality.retake_advice && (
              <p style={{ fontSize: '11px', color: accent, lineHeight: 1.6, marginTop: '8px' }}>
                撮り直しアドバイス: {photoQuality.retake_advice}
              </p>
            )}
          </Section>
        )}
      </div>

      {scoreEntries.length > 0 && (
        <div style={{ margin: '8px 22px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ fontSize: '10px', fontWeight: 800, color: accent, letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>Scoring</p>
            <a href="/mirror/scoring" style={{ fontSize: '10px', color: 'rgba(232,228,220,0.35)', textDecoration: 'underline' }}>採点方法について</a>
          </div>
          {scoreEntries.map(([key, val]) => (
            <div key={key} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'rgba(232,228,220,0.6)', marginBottom: '3px' }}>
                <span>
                  {SCORE_LABELS[key] || key}
                  {key === topWeightKey && (
                    <span style={{ marginLeft: '6px', fontSize: '9px', fontWeight: 800, padding: '1px 7px', borderRadius: '99px', background: accentSoft, border: `1px solid ${accentBorder}`, color: accent }}>
                      この写真で最も効いている要素
                    </span>
                  )}
                </span>
                <span>{val}</span>
              </div>
              <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(232,228,220,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${val}%`, height: '100%', background: accent, borderRadius: '99px' }} />
              </div>
              {reportContent.score_reasons?.[key] && (
                <p style={{ fontSize: '10px', color: 'rgba(232,228,220,0.4)', margin: '3px 0 0', lineHeight: 1.5 }}>{reportContent.score_reasons[key]}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {(reportContent.strengths_top?.length > 0 || reportContent.improvements_top?.length > 0) && (
        <div style={{ display: 'flex', gap: '12px', margin: '0 22px 20px', flexWrap: 'wrap' }}>
          {reportContent.strengths_top?.length > 0 && (
            <div style={{ flex: '1 1 200px' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#50c88c', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>魅力の強み</p>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {reportContent.strengths_top.map((s, i) => (
                  <li key={i} style={{ fontSize: '11px', color: 'rgba(232,228,220,0.65)', lineHeight: 1.8 }}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {reportContent.improvements_top?.length > 0 && (
            <div style={{ flex: '1 1 200px' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#7aadff', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px' }}>改善ポイント</p>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {reportContent.improvements_top.map((item, i) => (
                  <li key={i} style={{ fontSize: '11px', color: 'rgba(232,228,220,0.65)', lineHeight: 1.8 }}>
                    {item.category && <span style={{ color: '#7aadff', fontWeight: 700 }}>[{item.category}] </span>}
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {reportContent.final_profile && (
        <div style={{ margin: '0 22px 22px', padding: '16px', borderRadius: '12px', background: accentSoft, border: `1px solid ${accentBorder}` }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: accent, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '10px' }}>My Visual Profile</p>
          {[
            ['VISUAL TYPE', reportContent.final_profile.visual_type],
            ['最大の強み', reportContent.final_profile.biggest_strength],
            ['最も改善効果が大きいポイント', reportContent.final_profile.top_improvement],
            ['似合いやすいスタイル', reportContent.final_profile.recommended_style],
            ['似合いやすい髪型', reportContent.final_profile.recommended_hair],
            ['おすすめの写真アングル', reportContent.final_profile.recommended_angle],
            ['おすすめのポージング', reportContent.final_profile.recommended_pose],
          ].filter(([, v]) => v).map(([label, val], i) => (
            <p key={i} style={{ fontSize: '11px', color: 'rgba(232,228,220,0.75)', margin: '0 0 6px', lineHeight: 1.6 }}>
              <span style={{ color: accent, fontWeight: 700 }}>{label}: </span>{val}
            </p>
          ))}
        </div>
      )}

      <div style={{ margin: '0 22px 22px', textAlign: 'center' }}>
        <a
          href="/mirror/match"
          style={{ display: 'inline-block', padding: '12px 24px', borderRadius: '999px', background: accent, color: '#0a0f1e', fontWeight: 800, fontSize: '13px', textDecoration: 'none' }}
        >
          このスコアを改善できるメニューを探す
        </a>
      </div>
    </div>
  );
}
