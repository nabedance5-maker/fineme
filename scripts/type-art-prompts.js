// scripts/type-art-prompts.js
// Me Scan 136タイプのカードイラスト用プロンプト（男性 / Belle 両トラック）。
//
// テスト生成と全量生成で文面がズレると、あとから足した1枚だけ絵柄が違う事故になるため、
// プロンプトはこのファイルだけに置く。生成の実行は type-art-run.js。
//
// ── 設計（2026-07-28 でお決定）─────────────────────────────────────
// 1. 人物が主役。生き物・花は「背後の気配」として残す
//    → 以前は生き物/花そのものを描いていたため、8軸を「たてがみが人間の髪でできている」
//      のような代替表現でしか出せず、絵から軸が読み取れなかった。
//      人体には髪・眉・肌・歯・体・服・手爪が実物として在るので、そのまま描ける。
// 2. 顔は描くが美形にしない
//    → タイプ名は「折れた鵺」のように"今の状態"を指す。理想像を置くと
//      「お前はダメだった→こうなれ」になり、vision.md §8-4（始点を嘲笑わない）に反する。
//      寓意像（タロットのアルカナ）として、折れた姿にも品位を持たせる。
// 3. 性別は SUBJECT の先頭で固定する
//    → 男女混在は過去に3件事故っている（CLAUDE.md の二トラック規約）。
//      モチーフ文・姿勢文にも he/his・she/her を必ず入れて二重に効かせる。
//
// ⚠️ FLUX は否定形（"not a fashion model"）を打ち消しきれず、かえって
//    その要素を描くことがある。美形回避は否定形ではなく、
//    "plain ordinary face" のような肯定的な指定で行う。
//
// ⚠️ "collectible card" という語を入れると、FLUX は「カードという物体」を描く。
//    白背景に浮いたトレカになり、さらに下部にタイトル帯を作って
//    無意味な英字（LICARPITE / ANRRII 等）を入れてくる。1回目のテストで実際に3枚出た。
//    → その語を使わず「画面いっぱいのイラスト」「枠は絵の一部として描く」と指定する。
//
// ⚠️ 画像内の文字は「装飾枠が下端で途切れて額（カルトゥーシュ）ができ、そこに題字が入る」
//    という経路で出てくる。"no text" を並べても消えない。
//    → 禁止語を増やすより、**枠が一周途切れないことを肯定形で言い切る**ほうが効く
//      （"one continuous unbroken pattern all the way around, nothing interrupts it"）。
//      でお指示：画像内に文字は一切入れない（2026-07-30）。
//
// ⚠️ 肌系の軸（S 肌 / R 脱毛）で "bare skin" "bare shoulders" "bare arms" と書くと、
//    人物が裸で描かれる。男性側は NSFW 判定をすり抜けて実際に全裸の絵が出た（TYPE-RND）。
//    Belle 側だけ着衣を明示して男性を直さなかったのが誤り。両トラックとも fully clothed を明記する。
//    体型軸（B）だけは上半身裸でよい（体そのものが主題のため）。
//
// ⚠️ プロンプトは先頭ほど強く効く。軸（髪・眉・肌…）が画面の主役になるよう、
//    被写体と軸を先頭に置き、画風・枠の指定は後ろに回している。
//    1回目のテストでは画風を先頭に置いたため、肌軸が炎に負ける等のムラが出た。

const AXES  = ['B', 'E', 'F', 'H', 'S', 'R', 'T', 'W'];
const CARES = ['N', 'C', 'A', 'P'];
const PATHS = ['V', 'Q', 'K', 'L', 'D'];

// ── 男性トラック ─────────────────────────────────────────────────────

const MALE_SUBJECT =
  'a single ordinary young Japanese man, alone, filling the frame, ' +
  'an allegorical mythic portrait, ' +
  'a plain everyday face with quiet dignity, natural unretouched features, ' +
  'ordinary looking, modest, not a model';

const MALE_STYLE =
  'stylized painterly artwork, ' +
  'ukiyo-e influenced modern illustration, bold gold linework, flat illustrative rendering, ' +
  'deep navy blue background, reverent solemn mood, ' +
  'a slim ornate gold filigree border painted just inside the edge of the picture, ' +
  'the border is one continuous unbroken pattern all the way around, ' +
  'nothing interrupts it, no cartouche, no plaque, no banner, no panel, no label, no seal, ' +
  'full bleed artwork filling the entire canvas edge to edge, ' +
  'a wordless painting, no text, no lettering, no characters, no numbers, no signature';

const MALE_AXIS_COLOR = {
  B: 'vivid crimson red accent color',
  E: 'rich violet purple accent color',
  F: 'emerald green accent color',
  H: 'deep cobalt blue accent color',
  S: 'warm amber peach accent color',
  R: 'bright cyan aqua accent color',
  T: 'bright golden yellow accent color',
  W: 'jade teal accent color',
};

// 8軸を人体の部位そのものとして描く。
// どの軸も「dominates the composition」「unmistakable focal point」で言い切り、
// 画風指定より軸のほうが強く効くようにしている（T軸は solemn を明示的に上書きする）。
const MALE_AXIS_MOTIF = {
  B: 'his powerful sculpted physique dominates the composition, bare shoulders and clearly defined torso musculature, the built body is the unmistakable focal point of the picture',
  E: 'his strong sharply defined eyebrows dominate the composition, the bold brow line frames his eyes, his face is rendered close and large so the brows are the unmistakable focal point',
  F: 'his elaborate layered garments dominate the composition, richly textured fabric drape and precise tailoring fill the frame, the clothing is the unmistakable focal point',
  H: 'his long flowing black hair dominates the composition, thick lustrous strands cascade past his shoulders and catch the light, the hair is the unmistakable focal point',
  S: 'his luminous clear skin dominates the composition, soft light refracting across the complexion of his face and neck above the collar of his robe, fully clothed, the glowing skin surface is the unmistakable focal point',
  R: 'his impossibly smooth hairless skin dominates the composition, a clean-shaven jaw and smooth forearms gleaming like polished satin without a single hair, fully clothed in a robe with the sleeves pushed back, the flawless smoothness is the unmistakable focal point',
  T: 'his open radiant smile with gleaming white teeth dominates the composition, the joyful bright expression fills his face and lights the entire picture, this one is warm and radiant rather than solemn',
  W: 'his hands are held prominently in the foreground and dominate the composition, long well-kept fingers and clean neatly trimmed nails rendered in sharp detail, the hands are the unmistakable focal point',
};

// spirit = 背後に立ち上がる生き物の気配 / pose = 人物の姿勢
// 姿勢が care×path の状態（眠れる・折れた・臥す・聖なる…）を担う。
const MALE_FIGURE = {
  'フェンリル': {
    spirit: 'the immense wolf god Fenrir bound in heavy magical chains looms behind him in shadow, world-ending power held at bay',
    pose:   'he sits motionless with his eyes closed, immense unspent force lying dormant in his frame',
  },
  'レヴィアタン': {
    spirit: 'the ancient sea serpent Leviathan coils vast and half-unseen behind him, primordial depths churning in the dark',
    pose:   'he stands facing away into the darkness, unaware of the vastness stirring at his back',
  },
  '伏竜': {
    spirit: 'a great coiled dragon hidden in deep shadow behind him, barely emerging from the darkness, concealed brilliance held in silence',
    pose:   'he kneels low with his head bowed, gathering himself in stillness, not yet risen',
  },
  '蟠龍': {
    spirit: 'a dragon coiled tight and tensed rises behind him, gathered energy on the verge of release',
    pose:   'he crouches coiled with his weight forward, ready to spring at any moment',
  },
  '鵺': {
    spirit: 'the chimera nue with its monkey head, tanuki body and snake tail hovers behind him as a shifting uneasy shadow',
    pose:   'he sits with his shoulders dropped and his gaze fallen away, worn down but still upright, quiet unbroken dignity in his stillness',
  },
  'マンティコア': {
    spirit: 'the manticore with its lion body and scorpion tail rampages behind him in a storm of shadow',
    pose:   'he strains forward with his arms flung wide, raw untamed force breaking out of him',
  },
  'ヒュドラ': {
    spirit: 'the many-headed hydra lies dormant behind him, coils of regenerative potential submerged in dark water',
    pose:   'he lies half reclined in deep rest, vast strength gathering unseen beneath the surface',
  },
  '鳳凰': {
    spirit: 'the phoenix fenghuang blazes into rebirth behind him, feathers of renewal flaring in the dark',
    pose:   'he rises to his feet with his face lifted toward the light, returning from the ashes',
  },
  'グリフィン': {
    spirit: 'the griffin, eagle-headed and lion-bodied, stands guard behind him with its wings half raised',
    pose:   'he stands on watch with his stance squared and his chin level, untested but unwavering',
  },
  '玄武': {
    spirit: 'Genbu the black tortoise of the north sits immense behind him, withdrawn into its ancient shell',
    pose:   'he sits drawn inward with his arms folded close, withdrawn in patient uncertainty',
  },
  'ガルーダ': {
    spirit: 'Garuda the divine eagle king spreads vast wings behind him, stirring a cosmic wind',
    pose:   'he strides forward without hesitation, moving on pure instinct, wind pulling at him',
  },
  '天馬': {
    spirit: 'the celestial winged horse Tianma stands behind him with its great wings folded in rest',
    pose:   'he rests seated with his hands loose at his sides, his speed set down for a moment',
  },
  '朱雀': {
    spirit: 'Suzaku the vermilion bird of the south burns behind him in mastered crimson flame',
    pose:   'he stands with his arms open and his back straight, burning with controlled fire at full stride',
  },
  '白虎': {
    spirit: 'Byakko the white tiger of the west stands behind him in dignified stillness, withdrawn from the hunt',
    pose:   'he stands still and deliberately at rest, a seasoned fighter who has stepped back',
  },
  '飛龍': {
    spirit: 'a magnificent dragon soars behind him in full flight, commanding the heavens',
    pose:   'he stands tall at the height of his power, unaware of how far he has already come',
  },
  'スフィンクス': {
    spirit: 'the sphinx crouches behind him in monumental stillness, keeper of unspoken riddles',
    pose:   'he sits in heavy stillness with his hands on his knees, holding what he knows in silence',
  },
  '麒麟': {
    spirit: 'the sacred kirin stands behind him wreathed in soft light, appearing only where virtue is',
    pose:   'he stands serene with his hands open at his sides, strength and gentleness in balance',
  },
};

const MALE_CARE_PATH = {
  NV: 'フェンリル', NK: 'レヴィアタン', ND: '伏竜',
  CV: '蟠龍', CQ: '鵺', CK: 'マンティコア', CL: 'ヒュドラ', CD: '鳳凰',
  AV: 'グリフィン', AQ: '玄武', AK: 'ガルーダ', AL: '天馬', AD: '朱雀',
  PQ: '白虎', PK: '飛龍', PL: 'スフィンクス', PD: '麒麟',
};

// ── Belle トラック ───────────────────────────────────────────────────

const BELLE_SUBJECT =
  'a single ordinary young Japanese woman, alone, filling the frame, ' +
  'an allegorical mythic portrait, ' +
  'a plain everyday face with quiet dignity, a natural complexion with barely any makeup, ' +
  'ordinary looking, modest, not a model';

const BELLE_STYLE =
  'painterly watercolor and ink wash artwork, ' +
  'soft ethereal aesthetic, delicate brushwork, flat illustrative rendering, ' +
  'deep midnight navy background with glowing soft ambient light, ' +
  'a slim ornate cool silver filigree border with floral motifs painted just inside the edge of the picture, the border stays silver and never gold, ' +
  'the border is one continuous unbroken pattern all the way around, ' +
  'nothing interrupts it, no cartouche, no plaque, no banner, no panel, no label, no seal, ' +
  'full bleed artwork filling the entire canvas edge to edge, ' +
  'a wordless painting, no text, no lettering, no characters, no numbers, no signature';

const BELLE_AXIS_COLOR = {
  B: 'vivid crimson rose accent glow',
  E: 'rich violet purple accent glow',
  F: 'emerald green accent glow',
  H: 'deep cobalt blue accent glow',
  S: 'warm amber golden accent glow',
  R: 'bright cyan aqua accent glow',
  T: 'bright golden yellow accent glow',
  W: 'jade teal accent glow',
};

const BELLE_AXIS_MOTIF = {
  B: 'her graceful poised figure and elegant posture dominate the composition, the flowing line of her silhouette from shoulder to waist is the unmistakable focal point',
  E: 'her beautifully shaped arched eyebrows dominate the composition, the delicate brow line frames her eyes, her face is rendered close and large so the brows are the unmistakable focal point',
  F: 'her flowing layered garments dominate the composition, silk drape and woven textile pattern fill the frame, the clothing is the unmistakable focal point',
  H: 'her long silky hair dominates the composition, luminous strands cascading past her shoulders catching soft light, the hair is the unmistakable focal point',
  S: 'her luminous translucent skin dominates the composition, warm radiant light permeating the complexion of her face and neck above the collar of her robe, fully clothed, the glowing skin is the unmistakable focal point',
  R: 'her impossibly smooth hairless skin dominates the composition, silk-smooth flawless forearms and the line of her neck catching light like porcelain, fully clothed in a robe, the flawless smoothness is the unmistakable focal point',
  T: 'her open radiant smile with gleaming white teeth dominates the composition, the joyful bright expression fills her face and lights the entire picture, this one is warm and radiant rather than melancholy',
  W: 'her hands are held prominently in the foreground and dominate the composition, slender fingers and beautifully manicured long nails rendered in delicate detail, the hands are the unmistakable focal point',
};

const BELLE_FIGURE = {
  '薔薇': {
    spirit: 'a great crimson rose in deep slumber blooms behind her, petals tightly spiraled and sealed, thorned vines coiling around her',
    pose:   'she stands fully clothed in a robe with her eyes closed and her arms drawn in, sealed and waiting for her moment',
  },
  '芙蓉': {
    spirit: 'pale blush hibiscus blossoms drift behind her, soft and unaware of their own grace',
    pose:   'she turns her face away from the dark mirror beside her, not seeing her own beauty',
  },
  '野菫': {
    spirit: 'tiny wild violets bloom persistently around her between dark mossy stones',
    pose:   'she sits quietly among the stones, continuing on without needing to be seen',
  },
  '蕾': {
    spirit: 'a slender flower bud encased in crystalline frost rises behind her, sealed shut by ice',
    pose:   'she stands perfectly still with her hands clasped at her chest, held in suspended anticipation',
  },
  '紫陽花': {
    spirit: 'hydrangea blooms scatter behind her, blue-violet petals falling like slow rain',
    pose:   'she stands with her hands open as fallen petals slip through her fingers, composed and dignified in the moment of loss',
  },
  '夾竹桃': {
    spirit: 'oleander flowers with deep glossy leaves surround her, alluring and quietly guarded',
    pose:   'she halts with her head slightly turned, caught between two directions',
  },
  '牡丹': {
    spirit: 'a grand peony sealed in winter sleep looms behind her, a sleeping empress of flowers',
    pose:   'she rests seated in deep repose, magnificent potential wrapped in sleep',
  },
  '椿': {
    spirit: 'a perfect scarlet camellia blooms fully open behind her, not a single petal fallen',
    pose:   'she stands fully upright and open, meeting the viewer without hesitation at her peak',
  },
  '新芽': {
    spirit: 'tender green spring shoots push up around her from dark rich soil, reaching toward light',
    pose:   'she stands trembling slightly with her hands lifted toward an unseen light, newly emerged',
  },
  '勿忘草': {
    spirit: 'tiny forget-me-nots drift on dark still water behind her, fading into pale blue',
    pose:   'she stands half turned at the water edge, searching for a place to belong',
  },
  '月見草': {
    spirit: 'evening primrose opens alone in silver moonlight behind her',
    pose:   'she stands alone in the moonlight, serene and needing no witness',
  },
  '山茶花': {
    spirit: 'sasanqua camellia rests in gentle stillness around her, soft pink in a quiet interlude',
    pose:   'she sits at rest in a pause between seasons, her hands folded in her lap',
  },
  '白梅': {
    spirit: 'white plum blossoms radiate on dark ink-wash branches behind her',
    pose:   'she stands luminous and composed at the height of her presence',
  },
  '落梅': {
    spirit: 'fallen plum petals scatter across wet dark stone around her, caught mid-fall',
    pose:   'she pauses mid-motion with one hand outstretched, caught between action and rest',
  },
  '百合': {
    spirit: 'a pristine white lily opens fully behind her, golden stamens surrendered to the air',
    pose:   'she stands with her arms open and her face lifted, giving herself over in complete trust',
  },
  '蓮': {
    spirit: 'a sealed lotus bud rests on glassy dark water behind her, holding sacred silence',
    pose:   'she sits still above dark water with her eyes lowered, holding what she knows in silence',
  },
  '桜': {
    spirit: 'cherry blossom blazes at absolute peak behind her in the first rose light of dawn',
    pose:   'she stands in the dawn light with her face turned toward it, at the apex of her brief fullness',
  },
};

const BELLE_CARE_PATH = {
  NV: '薔薇', NK: '芙蓉', ND: '野菫',
  CV: '蕾', CQ: '紫陽花', CK: '夾竹桃', CL: '牡丹', CD: '椿',
  AV: '新芽', AQ: '勿忘草', AK: '月見草', AL: '山茶花', AD: '白梅',
  PQ: '落梅', PK: '百合', PL: '蓮', PD: '桜',
};

// ── トラック定義 ─────────────────────────────────────────────────────

const TRACKS = {
  fineme: {
    id: 'fineme',
    label: '男性',
    outDir: 'public/images/types',
    subject: MALE_SUBJECT,
    style: MALE_STYLE,
    axisColor: MALE_AXIS_COLOR,
    axisMotif: MALE_AXIS_MOTIF,
    figures: MALE_FIGURE,
    carePath: MALE_CARE_PATH,
  },
  belle: {
    id: 'belle',
    label: 'Belle',
    outDir: 'public/images/types/belle',
    subject: BELLE_SUBJECT,
    style: BELLE_STYLE,
    axisColor: BELLE_AXIS_COLOR,
    axisMotif: BELLE_AXIS_MOTIF,
    figures: BELLE_FIGURE,
    carePath: BELLE_CARE_PATH,
  },
};

// 被写体 → 軸 → 姿勢 → 気配 → アクセント色 → 画風 の順。
// FLUX は先頭ほど強く効くので、「誰が」と「どの軸が主役か」を最初に置く。
// 画風・枠・文字禁止は最後。アクセント色より後ろに置かないと、
// Belle の銀枠が暖色アクセント（crimson / golden / amber）に負けて金枠になる。
function buildPrompt(trackId, axis, careCode, pathCode) {
  const track = TRACKS[trackId];
  if (!track) throw new Error(`未知のトラック: ${trackId}`);
  const subject = track.carePath[careCode + pathCode];
  if (!subject) throw new Error(`存在しない組み合わせ: ${careCode}${pathCode}`);
  const fig = track.figures[subject];
  return [
    track.subject,
    track.axisMotif[axis],
    fig.pose,
    fig.spirit,
    track.axisColor[axis],
    track.style,
  ].join('. ') + '.';
}

// 8軸 × 17（care×path の有効な組み合わせ）= 136通り。
// 無効な組み合わせ: NQ, NL, PV
function allTypes(trackId) {
  const track = TRACKS[trackId];
  const out = [];
  for (const axis of AXES) {
    for (const care of CARES) {
      for (const pathCode of PATHS) {
        const subject = track.carePath[care + pathCode];
        if (!subject) continue;
        out.push({ code: `${axis}${care}${pathCode}`, axis, care, path: pathCode, subject });
      }
    }
  }
  return out;
}

module.exports = { TRACKS, AXES, CARES, PATHS, buildPrompt, allTypes };
