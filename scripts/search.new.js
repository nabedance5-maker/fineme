// mark as module for TS to avoid global redeclare across files
export {};
import { recordEvent } from './metrics.js';
// Resolve runtime helpers (may be provided as globals by helper scripts)
// Prefer globalThis.safeUrl when available; this creates a local const so static
// analyzers/TypeScript won't flag undefined global references.
const safeUrl = (typeof globalThis !== 'undefined' && typeof globalThis.safeUrl === 'function') ? globalThis.safeUrl : null;
const SERVICES_KEY = 'glowup:services';
const PROVIDERS_KEY = 'glowup:providers';

function qs(sel, el=document){ return el.querySelector(sel);} 

// --- Text utilities for safe rendering and highlighting ---
function escapeHTML(str){
  return String(str||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function escapeRegex(str){
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// Build HTML with only <mark> tags injected; other content is escaped.
function highlightSafe(text, query){
  const t = String(text||'');
  const q = String(query||'').trim();
  if(!q) return escapeHTML(t);
  try{
    const re = new RegExp(escapeRegex(q), 'ig');
    let lastIndex = 0; let out = '';
    let m;
    while((m = re.exec(t))){
      out += escapeHTML(t.slice(lastIndex, m.index));
      out += '<mark>' + escapeHTML(m[0]) + '</mark>';
      lastIndex = m.index + m[0].length;
      if(m.index === re.lastIndex) re.lastIndex++; // avoid zero-length loops
    }
    out += escapeHTML(t.slice(lastIndex));
    return out;
  }catch{
    return escapeHTML(t);
  }
}

function placeholderFor(category){
  const prefix = location.pathname.includes('/pages/') ? '..' : '.';
  const map = {
    consulting: `${prefix}/assets/placeholders/placeholder-consulting.svg`,
    gym: `${prefix}/assets/placeholders/placeholder-gym.svg`,
    makeup: `${prefix}/assets/placeholders/placeholder-makeup.svg`,
    hair: `${prefix}/assets/placeholders/placeholder-hair.svg`,
    diagnosis: `${prefix}/assets/placeholders/placeholder-diagnosis.svg`,
    fashion: `${prefix}/assets/placeholders/placeholder-fashion.svg`,
    photo: `${prefix}/assets/placeholders/placeholder-photo.svg`,
    marriage: `${prefix}/assets/placeholders/placeholder-marriage.svg`,
    eyebrow: `${prefix}/assets/placeholders/placeholder-eyebrow.svg`,
    hairremoval: `${prefix}/assets/placeholders/placeholder-hairremoval.svg`,
    esthetic: `${prefix}/assets/placeholders/placeholder-esthetic.svg`,
    whitening: `${prefix}/assets/placeholders/placeholder-whitening.svg`,
    orthodontics: `${prefix}/assets/placeholders/placeholder-orthodontics.svg`,
    nail: `${prefix}/assets/placeholders/placeholder-nail.svg`,
  };
  return map[category] || `${prefix}/assets/placeholders/placeholder-default.svg`;
}

function categoryPhotoFor(category){
  // 著作権配慮：Unsplashの写真を使用。失敗時はローカルSVGにフォールバック。
  const map = {
    consulting: 'https://images.unsplash.com/photo-1529336953121-ad5a0d43d0d2?q=80&w=1400&auto=format&fit=crop', // ミーティング風景
    gym: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1400&auto=format&fit=crop', // ジム
    makeup: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1400&auto=format&fit=crop', // メイク
  hair: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1400&auto=format&fit=crop', // ヘア/バーバー
    diagnosis: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1400&auto=format&fit=crop', // カラー/布見本
    fashion: 'https://images.unsplash.com/photo-1520975657288-4e3b66f3c54a?q=80&w=1400&auto=format&fit=crop', // コーデ
    photo: 'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?q=80&w=1400&auto=format&fit=crop', // 撮影
    marriage: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1400&auto=format&fit=crop' // 結婚相談
  };
  return map[category] || '';
}

// 検索結果カード（安全なハイライトを使用）
function card({name, region, category, priceFrom, image, href, providerName, address, providerId, storeName, storeId, serviceId, slug, _reason, _priceTier, _expertise, _pace}, opts={}){
  const q = (opts && opts.q) || '';
  const a = document.createElement('a');
  a.className = 'card';
  a.href = href;

  // Show service name as the prominent title; show storeName as sub-line if available, otherwise provider name
  const titleHTML = highlightSafe(name || providerName || '', q);
  const primaryEntity = storeName && storeName.trim() ? storeName : providerName;
  // If we have a storeName, render it as a link to the store detail page; otherwise show providerName plain
  const serviceLineHTML = (function(){
    try{
      if(storeName && storeName.trim()){
        const link = `${storeBase()}?providerId=${encodeURIComponent(providerId||'')}${storeId? `&storeId=${encodeURIComponent(storeId)}` : ''}`;
        return `<p class="card-meta"><a href="${link}">${highlightSafe(storeName, q)}</a></p>`;
      }
      if(providerName && providerName.trim()){
        return `<p class="card-meta">${highlightSafe(providerName, q)}</p>`;
      }
      return '';
    }catch(e){ return primaryEntity ? `<p class="card-meta">${highlightSafe(primaryEntity||'', q)}</p>` : ''; }
  })();
  const placeholder = placeholderFor(category);
  const imgSrc = (image && image.trim()) ? image : (categoryPhotoFor(category) || placeholder);

  const safePrice = (typeof priceFrom === 'number' && !Number.isNaN(priceFrom)) ? priceFrom : 0;

  // compute reserve href: prefer booking by slug, otherwise schedule by serviceId, otherwise fallback
  const reserveHref = (function(){
    try{ if(typeof slug === 'string' && slug.trim()) return `${resolvePrefix()}/booking/${encodeURIComponent(slug)}`; }catch(e){}
    if(typeof serviceId !== 'undefined' && serviceId){
      try{ if(location.pathname && location.pathname.indexOf('/pages/') !== -1) return `./user/schedule.html?serviceId=${encodeURIComponent(serviceId)}&origin=affinity`; }catch{};
      return `./pages/user/schedule.html?serviceId=${encodeURIComponent(serviceId)}&origin=affinity`;
    }
    return (typeof href === 'string') ? (href + '?reserve=1') : '#';
  })();
  // Build card DOM safely to avoid innerHTML with untrusted content
  try{
    const img = document.createElement('img'); img.className = 'service-thumb';
    const computedSrc = (typeof safeUrl === 'function' ? (safeUrl(imgSrc) || placeholder) : (imgSrc || placeholder));
    if(computedSrc) img.src = computedSrc;
    img.alt = String(name || providerName || '');
    img.addEventListener('error', ()=>{ try{ img.onerror = null; img.src = placeholder; }catch{} });

    const body = document.createElement('div'); body.className = 'card-body';
    // 相性コメント（1行）
    if(_reason && String(_reason).trim()){
      const pReason = document.createElement('p'); pReason.style.fontWeight='600'; pReason.style.margin='0 0 6px 0'; pReason.textContent = String(_reason).trim();
      body.appendChild(pReason);
    }
    const topCluster = document.createElement('div'); topCluster.className = 'cluster'; topCluster.style.justifyContent = 'space-between'; topCluster.style.alignItems = 'center'; topCluster.style.gap = '8px';
    const h3 = document.createElement('h3'); h3.className = 'card-title'; h3.style.margin = '0';
    // titleHTML may contain <mark> tags from highlightSafe (safe), so set as innerHTML
    try{ h3.innerHTML = titleHTML; }catch{ h3.textContent = name || providerName || ''; }
    const favBtn = document.createElement('button'); favBtn.type = 'button'; favBtn.className = 'btn btn-ghost btn-fav'; favBtn.setAttribute('aria-pressed','false'); favBtn.title = 'お気に入りに保存'; favBtn.textContent = '♡';
    // 相性理由タグ（診断結果に基づく簡易バッジ）
    const tagsWrap = document.createElement('div'); tagsWrap.className = 'cluster'; tagsWrap.style.gap = '6px'; tagsWrap.style.flexWrap = 'wrap'; tagsWrap.style.alignItems = 'center';
    try{
      // 診断の最新結果から理由タグを導出
      const raw = localStorage.getItem('fineme:diagnosis:latest');
      const diag = raw ? JSON.parse(raw) : null;
      const reasons = deriveReasons(diag);
      if(reasons.length){
        for(const r of reasons.slice(0,3)){
          const b = document.createElement('span');
          b.className = 'badge';
          b.textContent = r;
          tagsWrap.appendChild(b);
        }
      }
      // Providerタグ由来のバッジ（価格帯・提案ペース・得意領域）
      try{
        // Prefer enriched fields on item; fallback to local provider lookup
        let tier = String(_priceTier||'');
        let pace = Number(_pace||0);
        let exp = Array.isArray(_expertise) ? _expertise : [];
        if(!tier || !pace || !exp.length){
          const provsRaw = localStorage.getItem(PROVIDERS_KEY);
          const provs = provsRaw ? JSON.parse(provsRaw) : [];
          const p = Array.isArray(provs) ? provs.find(x=> x && x.id === providerId) : null;
          if(p){
            tier = tier || String(p?.profile?.priceTier||'');
            if(!pace){ const D = Number(p?.onboarding?.scores?.D||0); pace = (D>=1 && D<=3) ? D : 0; }
            if(!exp.length){ exp = Array.isArray(p?.profile?.expertise) ? p.profile.expertise : []; }
          }
        }
        if(tier){
          const lbl = tier==='low' ? '価格帯：低' : (tier==='mid' ? '価格帯：中' : (tier==='high' ? '価格帯：高' : '価格帯'));
          const b = document.createElement('span'); b.className='badge'; b.textContent = lbl; tagsWrap.appendChild(b);
        }
        if(pace>=1 && pace<=3){
          const paceLblMap = { 1:'提案ペース：ゆっくり', 2:'提案ペース：バランス', 3:'提案ペース：テンポ良く' };
          const b = document.createElement('span'); b.className='badge'; b.textContent = paceLblMap[pace]; tagsWrap.appendChild(b);
        }
        if(exp.length){
          for(const v of exp.slice(0,2)){
            const b = document.createElement('span'); b.className='badge'; b.textContent = labelCategory(v);
            tagsWrap.appendChild(b);
          }
        }
        // Availability badges based on local provider slots (today/weekend)
        try{
          const slots = loadSlots();
          let todayCount = 0, weekendCount = 0;
          const sid = String(serviceId||slug||'');
          const pid = String(providerId||'');
          const today = todayYmd();
          const weekendSet = upcomingWeekendSet();
          for(const s of slots){
            if(!s || !s.open) continue;
            const sd = String(s.date||'');
            const spid = String(s.providerId||'');
            const ssid = String(s.serviceId||'');
            const isMatch = ((ssid && sid && ssid===sid) || (spid && pid && spid===pid));
            if(!isMatch) continue;
            if(sd === today) todayCount++;
            if(weekendSet.has(sd)) weekendCount++;
          }
          if(todayCount>0){ const b = document.createElement('span'); b.className='badge'; b.textContent = '当日空きあり'; tagsWrap.appendChild(b); }
          if(weekendCount>0){ const b = document.createElement('span'); b.className='badge'; b.textContent = `週末${weekendCount}枠`; tagsWrap.appendChild(b); }
        }catch{}
      }catch(e){ /* ignore badge enrich errors */ }
    }catch{ /* silent */ }
    const rightCluster = document.createElement('div'); rightCluster.className='cluster'; rightCluster.style.gap='8px'; rightCluster.style.alignItems='center';
    rightCluster.appendChild(tagsWrap); rightCluster.appendChild(favBtn);
    topCluster.appendChild(h3); topCluster.appendChild(rightCluster);
    body.appendChild(topCluster);

    // service line: store link or provider name
    try{
      if(storeName && storeName.trim()){
        const pStore = document.createElement('p'); pStore.className = 'card-meta';
        const link = document.createElement('a'); link.href = `${storeBase()}?providerId=${encodeURIComponent(providerId||'')}${storeId? `&storeId=${encodeURIComponent(storeId)}` : ''}`;
        try{ link.innerHTML = highlightSafe(storeName, q); }catch{ link.textContent = storeName; }
        pStore.appendChild(link);
        body.appendChild(pStore);
      } else if(providerName && providerName.trim()){
        const pProv = document.createElement('p'); pProv.className = 'card-meta';
        try{ pProv.innerHTML = highlightSafe(providerName, q); }catch{ pProv.textContent = providerName; }
        body.appendChild(pProv);
      }
    }catch(e){ /* ignore */ }

    const pAddr = document.createElement('p'); pAddr.className = 'card-meta'; try{ pAddr.innerHTML = highlightSafe(address || labelRegion(region), q); }catch{ pAddr.textContent = address || labelRegion(region); }
    const pCat = document.createElement('p'); pCat.className = 'card-meta'; try{ pCat.innerHTML = highlightSafe(labelCategory(category), q); }catch{ pCat.textContent = labelCategory(category); }
    const pPrice = document.createElement('p'); pPrice.className = 'card-meta'; pPrice.textContent = `料金：¥${safePrice.toLocaleString()}`;
    const controls = document.createElement('div'); controls.className = 'cluster'; controls.style.marginTop = '8px'; controls.style.gap = '8px';
    const reserveA = document.createElement('a'); reserveA.className = 'btn'; reserveA.href = reserveHref; reserveA.textContent = '予約へ進む';
    try{
      reserveA.addEventListener('click', ()=>{
        try{ recordEvent('revisit', { providerId, storeId, serviceId, slug }); }catch{}
      });
    }catch{}
    controls.appendChild(reserveA);

    // append children
    body.appendChild(pAddr); body.appendChild(pCat); body.appendChild(pPrice); body.appendChild(controls);
    a.appendChild(img); a.appendChild(body);
    // supply favorite button reference for later import logic
    // favBtn is present inside 'a' and will be queried by the favorites module
  }catch(e){
    // fallback: minimal safe rendering
    a.textContent = String(name || providerName || 'サービス');
  }

  // お気に入りトグル（リンク遷移を避けるため、クリック伝播を止める）
  try{
    import('./favorites.js').then(mod =>{
      const { isFavorited, toggleFavorite } = mod;
      const el = a.querySelector('.btn-fav');
  if(!el || !(el instanceof HTMLElement)) return;
  const btn = el;
      const snapshot = { href, name, region, category, priceFrom: safePrice, image: imgSrc, providerName, providerId };
      const updateVisual = ()=>{
        const on = isFavorited(snapshot.href);
        btn.setAttribute('aria-pressed', on? 'true':'false');
        btn.textContent = on ? '♥' : '♡';
        btn.title = on ? 'お気に入りを解除' : 'お気に入りに保存';
      };
      updateVisual();
      btn.addEventListener('click', async (ev)=>{
        ev.preventDefault(); ev.stopPropagation();
        try{
          const auth = await import('./user-auth.js');
          const session = auth && typeof auth.getUserSession === 'function' ? auth.getUserSession() : null;
          if(!session){
            const go = window.confirm('お気に入り機能を利用するにはログインが必要です。ログインしますか？');
            if(go){ location.href = '/pages/user/login.html'; }
            return;
          }
        }catch{}
        const on = toggleFavorite(snapshot);
        try{ if(on){ recordEvent('adoption', { providerId, storeId, serviceId, slug, href }); } }catch{}
        updateVisual();
      });
    }).catch(()=>{});
  }catch{}
  return a;
}

// 診断結果から相性理由タグを作る（STEP2の軸スコアとタイプから）
function deriveReasons(diag){
  const out = [];
  try{
    if(!diag) return out;
    // タイプ由来の共通ラベル
    const typeId = String(diag?.intent?.type_id || '');
    const TYPE_LABELS = {
      // w01〜w08の例示（辞書に合わせる）
      w01: '説明が丁寧',
      w02: '自然な変化',
      w03: '背中を押してくれる',
      w04: '一緒に決める',
      w05: 'ベーシック重視',
      w06: 'トレンドに強い',
      w07: '写真映え',
      w08: '清潔感アップ'
    };
    if(TYPE_LABELS[typeId]) out.push(TYPE_LABELS[typeId]);
    // STEP2の軸スコアから上位軸を理由化
    const axes = (diag?.step2?.scores?.axes) || {};
    const pairs = Object.keys(axes).map(k=> ({ key:k, val: Number(axes[k]||0) }));
    pairs.sort((a,b)=> b.val - a.val);
    const AXIS_LABELS = {
      guidance: '導線がわかりやすい',
      gentle: '優しく進める',
      natural: '自然体でいける',
      evidence: '根拠が明確',
      customization: 'あなた用に調整'
    };
    for(const p of pairs.slice(0,2)){
      if(AXIS_LABELS[p.key]) out.push(AXIS_LABELS[p.key]);
    }
  }catch{ /* ignore */ }
  // 重複除去
  return Array.from(new Set(out));
}

function labelRegion(key){
  const map = {
    hokkaido:'北海道', aomori:'青森県', iwate:'岩手県', miyagi:'宮城県', akita:'秋田県', yamagata:'山形県', fukushima:'福島県',
    ibaraki:'茨城県', tochigi:'栃木県', gunma:'群馬県', saitama:'埼玉県', chiba:'千葉県', tokyo:'東京都', kanagawa:'神奈川県',
    niigata:'新潟県', toyama:'富山県', ishikawa:'石川県', fukui:'福井県', yamanashi:'山梨県', nagano:'長野県', gifu:'岐阜県',
    shizuoka:'静岡県', aichi:'愛知県', mie:'三重県', shiga:'滋賀県', kyoto:'京都府', osaka:'大阪府', hyogo:'兵庫県',
    nara:'奈良県', wakayama:'和歌山県', tottori:'鳥取県', shimane:'島根県', okayama:'岡山県', hiroshima:'広島県', yamaguchi:'山口県',
    tokushima:'徳島県', kagawa:'香川県', ehime:'愛媛県', kochi:'高知県', fukuoka:'福岡県', saga:'佐賀県', nagasaki:'長崎県',
    kumamoto:'熊本県', oita:'大分県', miyazaki:'宮崎県', kagoshima:'鹿児島県', okinawa:'沖縄県'
  };
  if(!key) return '全国';
  return map[key] || key;
}
function labelCategory(key){
  const map={
    consulting:'外見トータルサポート',
    gym:'パーソナルジム',
    makeup:'メイクアップ',
    hair:'ヘア',
    diagnosis:'カラー/骨格診断',
    fashion:'コーデ提案',
    photo:'写真撮影（アプリ等）',
    marriage:'結婚相談所',
    eyebrow:'眉毛',
    hairremoval:'脱毛',
    esthetic:'エステ',
    whitening:'ホワイトニング',
    orthodontics:'歯科矯正',
    nail:'ネイル',
    aga:'AGA'
  };
  return map[key]||key;
}

// Render detailed category guide + CTAs
function renderCategoryGuide(category, container, resultsList){
  try{
    const GUIDE = {
      consulting: {
        initial: ['現状の課題を整理','目的・期限・予算の優先度決め','最初の一歩を一緒に決める'],
        price: '目安：¥5,000〜¥15,000（初回相談）／継続は別途',
        flow: ['予約（オンライン可）','ヒアリング・方針提案','計画と次アクション確定'],
        ctas: [
          { label:'価格感：お手頃のみ', mutate:(u)=> u.searchParams.set('priceTier','low') },
          { label:'テンポ良く進めたい', mutate:(u)=> u.searchParams.set('pace','3') },
        ]
      },
      gym: {
        initial: ['体の悩み（体脂肪・姿勢など）を共有','目標期間と頻度をすり合わせ','体験トレーニングで相性確認'],
        price: '目安：¥6,000〜¥12,000（体験1回）／月額は店舗により異なる',
        flow: ['体験予約','カウンセリング＋体験','プラン選択・開始'],
        ctas: [
          { label:'当日予約可を優先', mutate:(u)=> u.searchParams.set('quick','today') },
          { label:'テンポ良く提案（D=3）', mutate:(u)=> u.searchParams.set('pace','3') },
        ]
      },
      makeup: {
        initial: ['現状の肌・目的（写真/面接等）共有','ベース〜ポイントの基礎習得','必要な道具の提案'],
        price: '目安：¥5,000〜¥10,000（レッスン1回）',
        flow: ['予約','カウンセリング・実演','自分で再現の練習'],
        ctas: [
          { label:'専門：メイク系を優先', mutate:(u)=> u.searchParams.append('expertise','makeover') },
          { label:'週末の空き枠', mutate:(u)=> u.searchParams.set('quick','weekend') },
        ]
      },
      hair: {
        initial: ['似合わせの方向性共有','カット/セットで印象調整','スタイリングの再現方法習得'],
        price: '目安：¥4,000〜¥8,000（カット）',
        flow: ['予約','カウンセリング・施術','再現ポイント確認'],
        ctas: [
          { label:'価格感：お手頃', mutate:(u)=> u.searchParams.set('priceTier','low') },
          { label:'清潔感重視の提案', mutate:(u)=> u.searchParams.append('expertise','makeover') },
        ]
      },
      diagnosis: {
        initial: ['目的（服/写真/仕事等）共有','パーソナルカラー/骨格の計測','似合うの方向性確認'],
        price: '目安：¥8,000〜¥18,000（カラー/骨格セットで変動）',
        flow: ['予約','計測・判定','結果の活用提案'],
        ctas: [
          { label:'カラー診断強め', mutate:(u)=> u.searchParams.append('expertise','color') },
          { label:'骨格診断強め', mutate:(u)=> u.searchParams.append('expertise','skeleton') },
        ]
      },
      fashion: {
        initial: ['シーン（デート/仕事等）の想定共有','服の方向性・サイズ感決定','買い足し候補の提案'],
        price: '目安：¥6,000〜¥12,000（同行/提案の時間で変動）',
        flow: ['予約','ヒアリング・提案','試着・購入支援'],
        ctas: [
          { label:'専門：スタイリング系', mutate:(u)=> u.searchParams.append('expertise','styling') },
          { label:'価格感：バランス', mutate:(u)=> u.searchParams.set('priceTier','mid') },
        ]
      },
      photo: {
        initial: ['使途（アプリ/仕事等）共有','衣装/場所/雰囲気を決定','ポーズ・表情練習'],
        price: '目安：¥8,000〜¥20,000（時間/納品枚数で変動）',
        flow: ['予約','撮影（現地）','納品・セレクト'],
        ctas: [
          { label:'専門：写真/撮影', mutate:(u)=> u.searchParams.append('expertise','photo') },
          { label:'当日予約可', mutate:(u)=> u.searchParams.set('quick','today') },
        ]
      },
      eyebrow: {
        initial: ['形の要望共有','デザイン決定（太さ/角度）','仕上げと維持方法確認'],
        price: '目安：¥4,000〜¥7,000',
        flow: ['予約','施術','仕上げ確認'],
        ctas: [ { label:'価格感：お手頃', mutate:(u)=> u.searchParams.set('priceTier','low') } ]
      },
      hairremoval: {
        initial: ['部位と目的共有','回数・期間の目安確認','肌状態の確認'],
        price: '目安：¥5,000〜（部位/回数で変動）',
        flow: ['予約','施術','経過確認'],
        ctas: [ { label:'価格感：お手頃', mutate:(u)=> u.searchParams.set('priceTier','low') } ]
      },
      esthetic: {
        initial: ['肌悩み共有（毛穴/乾燥等）','施術内容確認','ホームケア提案'],
        price: '目安：¥6,000〜¥12,000',
        flow: ['予約','施術','ケア指導'],
        ctas: [ { label:'優しく進めたい', mutate:(u)=> u.searchParams.set('pace','1') } ]
      },
      whitening: {
        initial: ['色味の目標共有','施術方式確認（ホーム/オフィス）','回数と注意点確認'],
        price: '目安：¥5,000〜¥15,000',
        flow: ['予約','施術','経過確認'],
        ctas: [ { label:'当日予約可', mutate:(u)=> u.searchParams.set('quick','today') } ]
      },
      orthodontics: {
        initial: ['現状の歯並び相談','方式（ワイヤー/マウスピース）確認','期間・費用の概算'],
        price: '目安：要相談（長期治療のため）',
        flow: ['相談予約','検査と提案','治療開始'],
        ctas: [ { label:'説明が丁寧な店舗', mutate:(u)=> u.searchParams.set('pace','1') } ]
      },
      nail: {
        initial: ['要望共有（長さ/清潔感重視）','施術内容確認','維持・ケア確認'],
        price: '目安：¥4,000〜¥8,000',
        flow: ['予約','施術','仕上げ確認'],
        ctas: [ { label:'価格感：お手頃', mutate:(u)=> u.searchParams.set('priceTier','low') } ]
      },
      marriage: {
        initial: ['目標（時期/条件）共有','戦略と外見プランの設計','必要施策の優先度決定'],
        price: '目安：要相談（プランにより異なる）',
        flow: ['相談予約','プラン提案','活動開始'],
        ctas: [ { label:'テンポ良く進めたい', mutate:(u)=> u.searchParams.set('pace','3') } ]
      }
    };
    const cfg = GUIDE[category]; if(!cfg) return;
    const wrap = document.createElement('div'); wrap.className='card'; wrap.style.margin='8px 0 12px 0';
    const inner = document.createElement('div'); inner.className='card-body';
    const h = document.createElement('h3'); h.textContent = 'カテゴリガイド'; h.style.margin = '0 0 8px 0'; inner.appendChild(h);
    const makeList = (title, items)=>{
      const sec = document.createElement('div'); sec.className='stack'; sec.style.margin='8px 0';
      const sh = document.createElement('h4'); sh.textContent = title; sh.style.margin='0 0 6px 0'; sec.appendChild(sh);
      const ul = document.createElement('ul'); ul.style.margin='0'; ul.style.paddingLeft='18px';
      for(const it of items){ const li = document.createElement('li'); li.textContent = String(it); ul.appendChild(li); }
      sec.appendChild(ul); return sec;
    };
    inner.appendChild(makeList('初回にやるべきこと', cfg.initial || []));
    const priceP = document.createElement('p'); priceP.className='muted'; priceP.style.margin='0 0 8px 0'; priceP.textContent = cfg.price || ''; inner.appendChild(priceP);
    inner.appendChild(makeList('予約の流れ', cfg.flow || []));
    // CTAs
    if(Array.isArray(cfg.ctas) && cfg.ctas.length){
      const cta = document.createElement('div'); cta.className='cluster'; cta.style.gap='8px'; cta.style.flexWrap='wrap';
      for(const b of cfg.ctas){
        const btn = document.createElement('button'); btn.type='button'; btn.className='btn btn-ghost'; btn.textContent = b.label;
        btn.addEventListener('click', ()=>{
          const u = new URL(location.href);
          // preserve existing params
          if(category) u.searchParams.set('category', category);
          if(getSortKey()) u.searchParams.set('sort', getSortKey());
          if(parseParams().region) u.searchParams.set('region', String(parseParams().region));
          if(parseParams().keyword) u.searchParams.set('keyword', String(parseParams().keyword));
          try{ b.mutate(u); }catch{}
          location.href = u.toString();
        });
        cta.appendChild(btn);
      }
      // Reset filters button
      const reset = document.createElement('button'); reset.type='button'; reset.className='btn'; reset.textContent='フィルターを解除';
      reset.addEventListener('click', ()=>{
        const u = new URL(location.href);
        // preserve essential params
        if(category) u.searchParams.set('category', category);
        if(getSortKey()) u.searchParams.set('sort', getSortKey());
        if(parseParams().region) u.searchParams.set('region', String(parseParams().region));
        if(parseParams().keyword) u.searchParams.set('keyword', String(parseParams().keyword));
        // clear filter params
        u.searchParams.delete('priceTier');
        u.searchParams.delete('pace');
        u.searchParams.delete('expertise');
        u.searchParams.delete('quick');
        location.href = u.toString();
      });
      cta.appendChild(reset);
      inner.appendChild(cta);
    }
    wrap.appendChild(inner);
    if(container && resultsList){ container.insertBefore(wrap, resultsList); }
  }catch(e){ console.warn('failed to render detailed guide', e); }
}

// Render active filter chips and quick toggle (today/weekend)
function renderActiveFilters(container, resultsList){
  try{
    const ent = parseParams();
    const chips = [];
    const preserve = (u)=>{
      if(ent.category) u.searchParams.set('category', ent.category);
      if(getSortKey()) u.searchParams.set('sort', getSortKey());
      if(ent.region) u.searchParams.set('region', String(ent.region));
      if(ent.keyword || ent.q) u.searchParams.set('keyword', String(ent.keyword || ent.q));
    };
    const labelTier = (t)=> t==='low'?'価格帯:低':(t==='mid'?'価格帯:中':(t==='high'?'価格帯:高':`価格帯:${t}`));
    const labelPace = (p)=>({ '1':'提案ペース:ゆっくり', '2':'提案ペース:バランス', '3':'提案ペース:テンポ良く' }[String(p)] || `提案ペース:${p}`);
    const labelQuick = (q)=> q==='today'?'今日行ける':(q==='weekend'?'週末行ける':`quick:${q}`);
    const labelExpertise = (e)=> ({
      makeover:'メイク系', color:'カラー診断', skeleton:'骨格診断', styling:'スタイリング', photo:'写真/撮影',
      hair:'ヘア', eyebrow:'眉', hairremoval:'脱毛', esthetic:'エステ', whitening:'ホワイトニング', orthodontics:'矯正', nail:'ネイル',
      marriage:'婚活', gym:'トレーニング', fashion:'ファッション', diagnosis:'診断', consulting:'外見コンサル'
    }[String(e)] || String(e));

    if(ent.priceTier){ chips.push({ label: labelTier(ent.priceTier), remove: (u)=> u.searchParams.delete('priceTier') }); }
    if(ent.pace){ chips.push({ label: labelPace(ent.pace), remove: (u)=> u.searchParams.delete('pace') }); }
    const exps = Array.isArray(ent.expertiseAll) ? ent.expertiseAll : [];
    for(const e of exps){ chips.push({ label: `専門:${labelExpertise(e)}`, remove: (u)=>{
      const remain = exps.filter(v=> v!==e);
      u.searchParams.delete('expertise');
      for(const r of remain){ u.searchParams.append('expertise', r); }
    }}); }
    if(ent.quick){ chips.push({ label: labelQuick(ent.quick), remove: (u)=> u.searchParams.delete('quick') }); }

    // Build container UI only if something is active OR always show quick toggles
    const wrap = document.createElement('div'); wrap.className='search-active-filters'; wrap.style.margin='8px 0';
    const row = document.createElement('div'); row.className='cluster'; row.style.gap='8px'; row.style.flexWrap='wrap';
    if(chips.length){
      const title = document.createElement('span'); title.className='muted'; title.textContent='現在の条件:'; row.appendChild(title);
      for(const c of chips){
        const b = document.createElement('button'); b.type='button'; b.className='badge'; b.textContent=c.label+' ✕';
        b.setAttribute('aria-label', `条件を解除: ${c.label}`);
        b.addEventListener('click', ()=>{ const u=new URL(location.href); preserve(u); try{ c.remove(u); }catch{} location.href=u.toString(); });
        row.appendChild(b);
      }
      // 全て解除ボタン
      const reset = document.createElement('button'); reset.type='button'; reset.className='btn btn-ghost'; reset.textContent='全て解除';
      reset.setAttribute('aria-label', 'すべての条件を解除');
      reset.addEventListener('click', ()=>{
        const u = new URL(location.href); preserve(u);
        u.searchParams.delete('priceTier');
        u.searchParams.delete('pace');
        u.searchParams.delete('expertise');
        u.searchParams.delete('quick');
        location.href = u.toString();
      });
      row.appendChild(reset);
    }
    // Quick toggle buttons
    const toggles = document.createElement('div'); toggles.className='cluster'; toggles.style.gap='8px';
    const mkToggle = (label, val)=>{
      const btn = document.createElement('button'); btn.type='button'; btn.className='btn btn-ghost'; btn.textContent=label;
      if(ent.quick === val){ btn.classList.add('is-active'); btn.setAttribute('aria-pressed', 'true'); } else { btn.setAttribute('aria-pressed', 'false'); }
      btn.addEventListener('click', ()=>{
        const u = new URL(location.href); preserve(u);
        if(ent.quick === val){ u.searchParams.delete('quick'); } else { u.searchParams.set('quick', val); }
        // pace implicit mapping already happens in parseParams for quick
        location.href = u.toString();
      });
      return btn;
    };
    toggles.appendChild(mkToggle('今日行ける', 'today'));
    toggles.appendChild(mkToggle('週末行ける', 'weekend'));
    // Attach toggles either alone or following chips
    wrap.appendChild(row);
    wrap.appendChild(toggles);

    if(container && resultsList){ container.insertBefore(wrap, resultsList); }
  }catch(e){ console.warn('failed to render active filters', e); }
}

// ---- おすすめカテゴリ推奨スコア ----
function recommendCategories(diag){
  // base: type -> prioritized categories
  const typeId = String(diag?.intent?.type_id || '');
  const TYPE_BASE = {
    w01: ['consulting','eyebrow','hair','diagnosis'], // 説明が丁寧 → 導き型
    w02: ['hair','eyebrow','esthetic','fashion'], // 自然な変化
    w03: ['consulting','photo','marriage','gym'], // 背中を押す
    w04: ['fashion','makeup','photo','consulting'], // 一緒に決める
    w05: ['diagnosis','fashion','hair','makeup'], // ベーシック重視
    w06: ['fashion','makeup','hair','photo'], // トレンド強め
    w07: ['photo','makeup','fashion','hair'], // 写真映え
    w08: ['eyebrow','whitening','orthodontics','hairremoval'] // 清潔感アップ
  };
  const baseList = TYPE_BASE[typeId] || [];
  const baseBoost = (cat)=>{
    const idx = baseList.indexOf(cat);
    if(idx===0) return 60; if(idx===1) return 40; if(idx===2) return 25; if(idx>=3) return 15; return 10;
  };
  // axes -> category weights (simple mapping)
  const axes = (diag?.step2?.scores?.axes) || {};
  const AXIS_WEIGHTS = {
    natural: { hair:0.25, eyebrow:0.2, esthetic:0.2, fashion:0.15 },
    evidence: { diagnosis:0.35, orthodontics:0.25, whitening:0.25 },
    guidance: { consulting:0.35, marriage:0.25 },
    customization: { fashion:0.3, makeup:0.25, nail:0.2 },
    gentle: { esthetic:0.25, makeup:0.2, nail:0.2 }
  };
  const CATS_ALL = ['consulting','gym','makeup','hair','diagnosis','fashion','photo','marriage','eyebrow','hairremoval','esthetic','whitening','orthodontics','nail'];
  const scores = {};
  for(const c of CATS_ALL){
    let s = baseBoost(c);
    for(const ax in AXIS_WEIGHTS){
      const v = Number(axes[ax]||0); // 0..100 想定
      const w = AXIS_WEIGHTS[ax][c] || 0;
      s += v * w; // 軸値×重み（最大加点 ~35程度）
    }
    scores[c] = Math.max(0, Math.min(100, Math.round(s)));
  }
  // sort with score desc
  const sorted = Object.keys(scores).sort((a,b)=> scores[b]-scores[a]);
  return { scores, sorted };
}

// 目的 -> カテゴリの紐づけ
function categoriesForPurpose(purpose){
  const map = {
    first_impression: ['consulting','eyebrow','hair','fashion'], // 第一印象を変えたい
    profile_photo: ['photo','makeup','fashion','hair'], // プロフィール写真を良くしたい
    confidence: ['consulting','photo','marriage','fashion'], // 恋愛で自信
    body_shape: ['gym'], // 体を整えたい（パーソナルトレーニング等）
    know_what_suits: ['diagnosis','fashion'], // 似合うを知りたい
    total_update: ['consulting','photo','gym','fashion'] // トータルで磨く（パッケージ想定）
  };
  return map[purpose] || [];
}

function parseParams(){
  const u=new URL(location.href);
  const ent = {};
  // URLSearchParams#forEach is widely supported
  u.searchParams.forEach((value, key) => { ent[key] = value; });
  // Multi-value params: expertise (checkboxes)
  try{ ent.expertiseAll = u.searchParams.getAll('expertise'); }catch{ ent.expertiseAll = []; }
  // accept both q and keyword
  if(!ent.q && ent.keyword) ent.q = ent.keyword;
  // normalize numeric params
  if(ent.top){ const n = parseInt(String(ent.top), 10); ent.top = Number.isFinite(n) ? String(n) : ''; }
  // quick booking presets: map to fast pace internally
  if(ent.quick && !ent.pace){ ent.pace = '3'; }
  return ent;
}

function toInt(v, def){
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function renderPagination({ total, page, per, mount, onNavigate }){
  // mount: HTMLElement to append into (usually container after results)
  // Clear existing pager
  const old = document.getElementById('results-pager');
  if(old && old.parentNode) old.parentNode.removeChild(old);
  if(total <= per) return;

  const totalPages = Math.ceil(total / per);
  page = Math.min(Math.max(1, page), totalPages);
  const nav = document.createElement('nav');
  nav.id = 'results-pager';
  nav.className = 'pagination';

  const btn = (label, targetPage, disabled=false, aria='') => {
    const a = document.createElement('button');
    a.type = 'button';
    a.textContent = label;
    if(aria) a.setAttribute('aria-label', aria);
    a.disabled = !!disabled;
    a.className = 'pager-btn';
    a.addEventListener('click', () => onNavigate(targetPage));
    return a;
  };

  // Prev
  nav.appendChild(btn('‹ 前へ', page - 1, page === 1, '前のページ'));

  // Page numbers (compact: show first, last, current ±2)
  const pages = new Set([1, totalPages]);
  for(let p = page - 2; p <= page + 2; p++) if(p >= 1 && p <= totalPages) pages.add(p);
  const sortedPages = Array.from(pages).sort((a,b)=>a-b);
  let last = 0;
  for(const p of sortedPages){
    if(last && p - last > 1){
      const dots = document.createElement('span');
      dots.textContent = '…';
      dots.className = 'pager-ellipsis';
      nav.appendChild(dots);
    }
    const b = btn(String(p), p, false, `ページ ${p}`);
    if(p === page) b.classList.add('is-current');
    nav.appendChild(b);
    last = p;
  }

  // Next
  nav.appendChild(btn('次へ ›', page + 1, page === totalPages, '次のページ'));

  mount.parentNode.insertBefore(nav, mount.nextSibling);
}

function resolvePrefix(){
  const p = location.pathname;
  return p.includes('/pages/') ? '..' : '.';
}

// compute correct relative path to store.html depending on current page location
function storeBase(){
  try{
    // If current page is under /pages/, store.html is in same folder
    if(location.pathname && location.pathname.indexOf('/pages/') !== -1) return './store.html';
    // otherwise, store.html lives under ./pages/
    return './pages/store.html';
  }catch{ return './pages/store.html'; }
}

// Load providers from localStorage (used by enrichment)
function loadProviders(){
  try{
    const raw = localStorage.getItem(PROVIDERS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}

// -- tiny polyfills (runtime-safe, no override if exists) --
if(!Object.fromEntries){
  Object.fromEntries = function(iter){
    const obj = {};
    for(const [k,v] of iter){ obj[k] = v; }
    return obj;
  };
}

async function loadStaticServices(){
  const rel = `${resolvePrefix()}/scripts/data/services.json`;
  try{
    const res = await fetch(rel, { cache:'no-store' });
    if(!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }catch(e){
    try{
      const res2 = await fetch('/scripts/data/services.json', { cache:'no-store' });
      if(!res2.ok) throw new Error(String(res2.status));
      const data2 = await res2.json();
      return Array.isArray(data2) ? data2 : [];
    }catch(e2){
      console.warn('Failed to load static services.json', e2);
      return [];
    }
  }
}

async function loadStaticProviders(){
  const rel = `${resolvePrefix()}/scripts/data/providers.json`;
  try{
    const res = await fetch(rel, { cache:'no-store' });
    if(!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }catch(e){
    try{
      const res2 = await fetch('/scripts/data/providers.json', { cache:'no-store' });
      if(!res2.ok) throw new Error(String(res2.status));
      const data2 = await res2.json();
      return Array.isArray(data2) ? data2 : [];
    }catch(e2){ return []; }
  }
}

function loadLocalServices(){
  try{
    const raw = localStorage.getItem(SERVICES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if(!Array.isArray(arr)) return [];
    // provider maps (local only; static fallback handled later)
    const provRaw = localStorage.getItem(PROVIDERS_KEY);
    let provNameMap = {}, provAddrMap = {};
    try{
      const provArr = provRaw? JSON.parse(provRaw):[];
      if(Array.isArray(provArr)){
        for(const p of provArr){ if(p && p.id){ provNameMap[p.id]=p.name; provAddrMap[p.id]= (p.profile && p.profile.address) || ''; } }
      }
    }catch{}
    // published only, map to card/search model
  return arr.filter(s=> s && s.published).map(s => ({
      name: s.name,
      region: s.region,
      category: s.category,
      priceFrom: Number((s.price!=null?s.price:s.priceMin)||0),
      image: s.photo || '',
      // deep-link into store page and include serviceId for inline expansion
  href: `${storeBase()}?providerId=${encodeURIComponent(s.providerId||'')}${(typeof s.storeId !== 'undefined' && s.storeId !== null && s.storeId !== '') ? `&storeId=${encodeURIComponent(s.storeId)}` : ''}&tab=menu&serviceId=${encodeURIComponent(s.id)}`,
      serviceId: s.id,
      providerName: provNameMap[s.providerId] || '',
      address: provAddrMap[s.providerId] || '',
      providerId: s.providerId,
      // include storeId so later enrichment can resolve provider.stores -> storeName/address
      storeId: (typeof s.storeId !== 'undefined') ? s.storeId : '',
      _searchText: [s.name||'', s.catchcopy||'', s.description||'', provNameMap[s.providerId]||'', provAddrMap[s.providerId]||''].join(' ').toLowerCase()
    }));
  }catch{ return []; }
}

// Load provider slots from localStorage (used by quick=today|weekend filtering)
function loadSlots(){
  try{
    const raw = localStorage.getItem('glowup:slots');
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}

function todayYmd(){ const d = new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; }
function upcomingWeekendSet(){
  const out = new Set();
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  // Find next Saturday and Sunday (including today if weekend)
  const addDate = (offset)=>{ const d=new Date(now); d.setDate(d.getDate()+offset); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); out.add(`${y}-${m}-${dd}`); };
  if(day === 6){ addDate(0); addDate(1); }
  else if(day === 0){ addDate(0); }
  else{
    const toSat = 6 - day; const toSun = 7 - day;
    addDate(toSat); addDate(toSun);
  }
  return out;
}

function matchesQuickSlot(it, quick, slots){
  try{
    if(!quick) return true;
    if(!Array.isArray(slots) || slots.length===0) return true; // no slot data → do not over-filter
    const targetDates = quick==='today' ? new Set([todayYmd()]) : upcomingWeekendSet();
    const sid = String(it.serviceId||it.slug||'');
    const pid = String(it.providerId||'');
    for(const s of slots){
      if(!s || !s.open) continue;
      const sd = String(s.date||'');
      if(!targetDates.has(sd)) continue;
      const spid = String(s.providerId||'');
      const ssid = String(s.serviceId||'');
      // match by service or provider
      if((ssid && sid && ssid===sid) || (spid && pid && spid===pid)) return true;
    }
    return false;
  }catch{ return true; }
}

function updateCount(n){
  const el = qs('#results-count');
  if(el){
    el.textContent = `${n}件見つかりました`;
  }
}

function updateRange(total, start, end){
  const el = qs('#results-range');
  if(el){
    if(total === 0){ el.textContent = ''; return; }
    const s = start + 1; // 1-indexed
    el.textContent = `${total}件中 ${s}–${end}件を表示`;
  }
}

function getSortKey(){
  const { sort='' } = parseParams();
  return sort;
}

function sortItems(items, sort){
  const safeNum = v => (typeof v === 'number' && !isNaN(v)) ? v : Number.POSITIVE_INFINITY;
  // 未定義価格は常に末尾へ（昇順は +∞、降順は - で比較）
  const safeStr = v => (v||'').toString();
  const collator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' });
  const arr = [...items];
  switch(sort){
    case 'price_asc':
      return arr.sort((a,b)=> safeNum(a.priceFrom) - safeNum(b.priceFrom));
    case 'price_desc':
      return arr.sort((a,b)=> safeNum(b.priceFrom) - safeNum(a.priceFrom));
    case 'name_desc':
      return arr.sort((a,b)=> collator.compare(safeStr(b.providerName||b.name), safeStr(a.providerName||a.name)));
    case 'name_asc':
      return arr.sort((a,b)=> collator.compare(safeStr(a.providerName||a.name), safeStr(b.providerName||b.name)));
    default:
      return arr; // おすすめ順（現状はそのまま）
  }
}

(async function init(){
  const { q='', region='', category='', purpose='', page:pageStr, per:perStr, diag:diagMode='' } = parseParams();
  const list = qs('#results');
  const qLower = (q||'').toLowerCase();
  try{ if(q && q.trim()){ recordEvent('search', { query: q.trim(), region: region||'', category: category||'', purpose: purpose||'' }); } }catch{}

  /**
   * @typedef {Object} ServiceItem
   * @property {string} name
   * @property {string} [region]
   * @property {string} [category]
   * @property {number} [priceFrom]
   * @property {string} [image]
   * @property {string} href
   * @property {string} [serviceId]
   * @property {string} [slug]
   * @property {string} [providerId]
   * @property {string} [storeId]
   * @property {string} [providerName]
   * @property {string} [address]
   * @property {string} [_searchText]
   * @property {string} [storeName]
   * @property {string} [storeAddress]
   * @property {string} [_priceTier]
   * @property {number} [_pace]
   * @property {string[]} [_expertise]
   * @property {string} [_reason]
   */

  const staticData = await loadStaticServices();
  /** @type {ServiceItem[]} */
  const staticItems = staticData.map(s => ({
    name: s.name,
    region: s.region,
    category: s.category,
    priceFrom: Number(s.priceFrom||0),
    image: s.image || '',
  href: `${storeBase()}?providerId=${encodeURIComponent(s.providerId||'')}${s.storeId? `&storeId=${encodeURIComponent(s.storeId)}` : ''}&tab=menu&serviceId=${encodeURIComponent(s.slug||s.id||'')}`,
    serviceId: s.slug || s.id || '',
    slug: s.slug || '',
    providerId: s.providerId || '',
    storeId: s.storeId || '',
    providerName: s.providerName || '',
    address: s.address || s.access || '',
    _searchText: ''
  }));

  /** @type {ServiceItem[]} */
  let localItems = loadLocalServices();
  // If local providers are missing (after cache clear), enrich localItems with static providers map
  if(localItems.some(it=> !it.providerName || !it.address)){
    const provs = await loadStaticProviders();
    if(Array.isArray(provs) && provs.length){
      const nameMap = Object.fromEntries(provs.map(p=> [p.id, p.name]));
      const addrMap = Object.fromEntries(provs.map(p=> [p.id, (p.profile && p.profile.address)||'']));
      localItems = localItems.map(it=> ({
        ...it,
        providerName: it.providerName || nameMap[it.providerId] || '',
        address: it.address || addrMap[it.providerId] || ''
      }));
    }
  }
  // Enrich items with store info from provider profile stores (local + static providers)
  try{
    const provsLocal = loadProviders();
    const provsStaticAll = await loadStaticProviders();
    const allProvs = Array.isArray(provsLocal) ? provsLocal.slice() : [];
    let localProvidersModified = false;
    if(Array.isArray(provsStaticAll)){
      // append static providers that aren't in local by id
      // and if a local provider exists but has no stores, copy static stores into it (and persist)
      for(const sp of provsStaticAll){ 
        const idx = allProvs.findIndex(p=> p.id === sp.id);
        if(idx === -1){
          allProvs.push(sp);
        }else{
          const lp = allProvs[idx];
          // If local provider lacks stores but static has stores, merge stores from static
          if((!Array.isArray(lp.stores) || lp.stores.length === 0) && Array.isArray(sp.stores) && sp.stores.length){
            try{ lp.stores = JSON.parse(JSON.stringify(sp.stores)); }catch{ lp.stores = sp.stores; }
            // also reflect back to provsLocal so we can persist only local changes
            const origIdx = Array.isArray(provsLocal) ? provsLocal.findIndex(p=> p.id === sp.id) : -1;
            if(origIdx !== -1){
              try{ provsLocal[origIdx].stores = JSON.parse(JSON.stringify(sp.stores)); }catch{ provsLocal[origIdx].stores = sp.stores; }
              localProvidersModified = true;
            }
          }
          // ensure profile fields exist to avoid missing address/name during enrichment
          if(!lp.profile && sp.profile) lp.profile = JSON.parse(JSON.stringify(sp.profile));
        }
      }
      // persist modifications to local providers so other pages see stores without requiring user action
      try{
        if(localProvidersModified && Array.isArray(provsLocal)){
          localStorage.setItem(PROVIDERS_KEY, JSON.stringify(provsLocal));
          console.debug('[dbg] persisted merged stores into localStorage for providers');
        }
      }catch(e){ console.warn('failed to persist merged providers', e); }
    }
    const provMap = Object.fromEntries(allProvs.map(p=> [p.id, p]));

    // DEBUG: dump provMap keys and whether prov-deo exists
    try{ console.debug('[dbg] provMap keys:', Object.keys(provMap)); console.debug('[dbg] prov-deo entry:', provMap['prov-deo']); }catch(e){}

    const enrich = (it)=>{
      const plain = JSON.parse(JSON.stringify(it || {}));
      const p = provMap[plain.providerId];
      // DEBUG: show which providerId each item references
      try{ console.debug('[dbg] enriching item', plain.name, 'providerId=', plain.providerId, 'storeId=', plain.storeId); }catch(e){}
      if(!p) return plain;
      const stores = Array.isArray(p.stores) ? p.stores : (p.profile ? [ { id: '', storeName: p.profile.storeName||'', address: p.profile.address||'' } ] : []);
      const sid = String(plain.storeId || '');
      let st = sid ? stores.find(s=> String(s.id||'') === sid) : null;
      // DEBUG: show provider stores and match result
      try{ console.debug('[dbg] provider', p.id, 'stores=', stores, 'matchedStore=', st); }catch(e){}
      // If no explicit storeId is set on the service, fall back to the provider's first store (if any)
      if(!st && Array.isArray(stores) && stores.length > 0){
        try{ console.debug('[dbg] fallback to first store for provider', p.id); }catch(e){}
        st = stores[0];
        // do not overwrite plain.storeId coming from service; assign for display only
      }
      // Use store info if we have a store
      if(st){
        plain.storeId = plain.storeId || String(st.id || '');
        plain.storeName = st.storeName || '';
        plain.storeAddress = st.address || '';
        if(plain.storeAddress) plain.address = plain.storeAddress;
      }
      // Attach provider-level tags for badges/filters
      try{
        plain._priceTier = (p.profile && p.profile.priceTier) ? String(p.profile.priceTier) : '';
        plain._expertise = (p.profile && Array.isArray(p.profile.expertise)) ? p.profile.expertise.slice() : [];
        const D = Number(p?.onboarding?.scores?.D||0);
        plain._pace = (D>=1 && D<=3) ? D : 0;
      }catch(e){ plain._priceTier=''; plain._expertise=[]; plain._pace=0; }
      return plain;
    };

    localItems = localItems.map(enrich);
    // also enrich static items (they may reference providerId/storeId)
    for(let i=0;i<staticItems.length;i++) staticItems[i] = enrich(staticItems[i]);
  }catch(e){ console.warn('failed to enrich providers/stores', e); }
  /** @type {ServiceItem[]} */
  const all = [...staticItems, ...localItems];
  // Exclude services whose provider onboarding is not completed or provider visibility is hidden（店舗全体の非公開）
  try{
    const provsLocal = loadProviders();
    const provsStaticAll = await loadStaticProviders();
    const allProvs = Array.isArray(provsLocal) ? provsLocal.slice() : [];
    if(Array.isArray(provsStaticAll)){
      for(const sp of provsStaticAll){ if(!allProvs.find(p=> p.id===sp.id)) allProvs.push(sp); }
    }
    const provMap = Object.fromEntries(allProvs.map(p=> [p.id, p]));
    for(let i=0;i<all.length;i++){
      const it = all[i]; const p = provMap[it.providerId];
      if(p && ((!p.onboarding || !p.onboarding.completed) || (p.visibility === 'hidden'))){ all.splice(i,1); i--; }
    }
  }catch(_){ }

  const filtered = all.filter(s=>{
    const mq = qLower ? (
      (s.name||'').toLowerCase().includes(qLower) || (typeof s._searchText === 'string' && s._searchText.includes(qLower))
    ) : true;
    const mr = region ? s.region===region : true;
    const mc = category ? s.category===category : true;
    // purpose が選択されている場合、purposeに紐づくカテゴリに含まれるかをチェック
    const mp = purpose ? (function(){
      const allowed = categoriesForPurpose(purpose);
      if(!allowed || allowed.length===0) return true;
      return allowed.includes(s.category);
    })() : true;
    // priceTier filter
    const tierParam = (parseParams().priceTier||'').toString();
    const mtier = tierParam ? (String(s._priceTier||'')===tierParam) : true;
    // pace filter (D: 1..3)
    const paceParamRaw = (parseParams().pace||'').toString();
    const paceParam = paceParamRaw ? Number(paceParamRaw) : 0;
    const mpace = paceParam ? (Number(s._pace||0) === paceParam) : true;
    // expertise filter (any-of)
    const expAll = Array.isArray(parseParams().expertiseAll) ? parseParams().expertiseAll : [];
    const mexp = expAll.length ? expAll.some(x=> Array.isArray(s._expertise) && s._expertise.includes(x)) : true;
    const quick = (parseParams().quick||'').toString();
    const slots = loadSlots();
    const mquick = quick ? matchesQuickSlot(s, quick, slots) : true;
    return mq && mr && mc && mp && mtier && mpace && mexp && mquick;
  });
  // 診断に基づく「おすすめカテゴリ」タブの表示（ログイン時のみ）
  try{
    const diag = loadDiagnosis();
    const isLoggedInTab = (function(){ try{ return !!sessionStorage.getItem('glowup:userSession'); }catch{ return false; } })();
    if(!isLoggedInTab || !diag || !diag.step2){ throw new Error('no diag or not logged in'); }
    const { scores, sorted: catSorted } = recommendCategories(diag);
    const topCats = catSorted.slice(0, 6);
    const tabs = document.createElement('div'); tabs.className='cluster'; tabs.style.flexWrap='wrap'; tabs.style.gap='8px'; tabs.style.margin='0 0 12px 0';
    const makeTab = (label, onClick, isPrimary=false)=>{
      const b = document.createElement('button'); b.type='button'; b.className = isPrimary? 'btn' : 'btn btn-ghost'; b.textContent = label; b.addEventListener('click', onClick); return b;
    };
    const u0 = new URL(location.href);
    const primary = makeTab('おすすめ', ()=>{ const u=new URL(location.href); u.searchParams.delete('category'); u.searchParams.set('diag','1'); location.href = u.toString(); }, true);
    tabs.appendChild(primary);
    for(const c of topCats){
      const b = makeTab(labelCategory(c), ()=>{ const u=new URL(location.href); u.searchParams.set('category', c); location.href = u.toString(); });
      // スコアバッジ
      const badge = document.createElement('span'); badge.className='badge'; badge.textContent = String(scores[c])+'%'; badge.style.marginLeft='6px';
      const wrap = document.createElement('span'); wrap.className='cluster'; wrap.style.gap='4px'; wrap.appendChild(b); wrap.appendChild(badge);
      tabs.appendChild(wrap);
    }
    const container = qs('.container.stack') || qs('.section .container') || document.body;
    if(container) container.insertBefore(tabs, container.querySelector('.results-meta'));
  }catch(e){ /* skip tabs when not logged in or no diag */ }
  // --- 診断タイプに合う順（初期状態のみ適用） ---
  async function buildProvMap(){
    try{
      const provsLocal = loadProviders();
      const provsStaticAll = await loadStaticProviders();
      const allProvs = Array.isArray(provsLocal) ? provsLocal.slice() : [];
      if(Array.isArray(provsStaticAll)){
        for(const sp of provsStaticAll){ if(!allProvs.find(p=> p.id===sp.id)) allProvs.push(sp); }
      }
      return Object.fromEntries(allProvs.map(p=> [p.id, p]));
    }catch{ return {}; }
  }

  function loadDiagnosis(){ try{ const raw = localStorage.getItem('fineme:diagnosis:latest'); return raw? JSON.parse(raw): null; }catch{ return null; } }

  function getCompatScoreForItem(it, provMap, diag){
    try{
      if(!diag || !diag.intent || !diag.intent.type_id) return 0;
      const typeId = String(diag.intent.type_id);
      const p = provMap[it.providerId];
      if(!p) return 0;
      // profile.whatTypes（最大2つ想定）に一致すれば高スコア
      const whatTypes = (p.onboarding && p.onboarding.profile && Array.isArray(p.onboarding.profile.whatTypes)) ? p.onboarding.profile.whatTypes : [];
      if(whatTypes.includes(typeId)) return 100;
      // 近似や未設定は控えめスコア
      if(whatTypes.length>0) return 60;
      return 40;
    }catch{ return 0; }
  }

  const hasExplicitFilters = Boolean(q || region || category || purpose || getSortKey());
  const diag = loadDiagnosis();
  const isLoggedIn = (function(){ try{ return !!sessionStorage.getItem('glowup:userSession'); }catch{ return false; } })();
  const shouldCompatSort = (!hasExplicitFilters) && isLoggedIn && (!!diag) && (String(diagMode) !== '0');
  let pinned = [];

  let sorted;
  if(shouldCompatSort){
    const provMap = await buildProvMap();
    const scored = filtered.map(it=> ({ it, score: getCompatScoreForItem(it, provMap, diag) }));
    scored.sort((a,b)=> b.score - a.score);
    sorted = scored.map(s=> s.it);
    // Pin top-N starters if requested
    const topN = (function(){ const v = parseInt(String(parseParams().top||''),10); return (Number.isFinite(v) && v>0) ? Math.min(v, sorted.length) : 0; })();
    if(topN && !category){
      pinned = sorted.slice(0, topN);
      sorted = sorted.slice(topN);
      try{
        const header2 = document.createElement('div'); header2.className='search-purpose-summary';
        const h = document.createElement('h3'); h.textContent = 'タイプに合うスターター'; h.style.margin='0 0 6px 0'; header2.appendChild(h);
        const pHint = document.createElement('p'); pHint.className='muted'; pHint.style.margin='0 0 8px 0'; pHint.textContent = '診断タイプに合いやすい入門・試しやすい選択肢を先頭に表示しています。'; header2.appendChild(pHint);
        const grid = document.createElement('div'); grid.className='features-grid';
        const frag = document.createDocumentFragment(); pinned.forEach(s=> {
          const full = {
            name: s.name,
            region: s.region||'',
            category: s.category||'',
            priceFrom: Number(s.priceFrom||0),
            image: s.image||'',
            href: s.href,
            providerName: s.providerName||'',
            address: s.address||'',
            providerId: s.providerId||'',
            storeName: s.storeName||'',
            storeId: s.storeId||'',
            serviceId: s.serviceId||'',
            slug: s.slug||'',
            _reason: s._reason||'',
            _priceTier: s._priceTier||'',
            _expertise: Array.isArray(s._expertise)? s._expertise.slice():[],
            _pace: Number(s._pace||0)
          };
          frag.appendChild(card(full, { q }));
        });
        grid.appendChild(frag); header2.appendChild(grid);
        if(list && list.parentNode) list.parentNode.insertBefore(header2, list);
      }catch{}
    }
    // バナー表示: 「診断タイプ◯◯に合う順で表示中」
    try{
      const header = document.createElement('div');
      header.className = 'search-purpose-summary';
      const p = document.createElement('p'); p.style.margin='0 0 8px 0'; p.style.fontWeight='600';
      const t = document.createTextNode('診断タイプに合う順で表示中: ');
      const strong = document.createElement('span'); strong.style.fontWeight='700';
      const step2name = (diag?.step2?.classification?.type_name) || '';
      strong.textContent = String(step2name || diag?.intent?.type_name || '');
      p.appendChild(t); p.appendChild(strong); header.appendChild(p);
      if(list && list.parentNode) list.parentNode.insertBefore(header, list);
    }catch{}
  }else{
    // 診断あり × カテゴリ指定あり → A-D＋E距離でゾーン表示
    if(category && isLoggedIn && diag && String(diagMode) !== '0'){
      const provMap = await buildProvMap();
      const matcher = await import('./matching.js').catch(()=>null);
      // 互換性距離（小さいほど相性が高い）
      function computeDistance(it){
        try{
          if(!matcher) return { adjusted: 999, reason:'' };
          const user = matcher.getUserAxesFromDiagnosis(diag);
          const shop = matcher.getShopScoresFromProvider(provMap[it.providerId]);
          const comp = matcher.computeCompatibilityAxes(user, shop);
          const reason = matcher.computeReasonLine(user, shop, comp);
          return { adjusted: Number(comp.adjusted||999), reason };
        }catch{ return { adjusted: 999, reason:'' }; }
      }
      function clamp01(n){ n = Number(n)||0; if(n<0) return 0; if(n>1) return 1; return n; }
      function computeTrust01(providerId){
        try{
          const RESV_KEY = 'glowup:reservations'; const VISIT_KEY = 'glowup:visits';
          const rRaw = localStorage.getItem(RESV_KEY); const vRaw = localStorage.getItem(VISIT_KEY);
          const reservations = rRaw? JSON.parse(rRaw):[]; const visits = vRaw? JSON.parse(vRaw):[];
          const myRes = Array.isArray(reservations)? reservations.filter(x=> x && x.providerId===providerId):[];
          const myVis = Array.isArray(visits)? visits.filter(x=> x && x.providerId===providerId):[];
          const totalRes = myRes.length; const completed = myRes.filter(x=> x.status==='visited' || x.status==='completed').length;
          // repeat users ratio
          const map = new Map(); for(const v of myVis){ const uid = v.userId||''; map.set(uid, (map.get(uid)||0)+1); }
          let rep=0; for(const cnt of map.values()){ if(cnt>=2) rep++; }
          const totalUsers = map.size || 1; const repeatRate = (rep/totalUsers); // 0..1
          const visitRate = totalRes? (completed/totalRes) : 0; // 0..1
          // completionRate from provider profile if available
          let completion = 0.5; try{ const p = provMap[providerId]; completion = clamp01((Number(p?.profile?.completionRate||50))/100); }catch{}
          // weight: visit 0.5, repeat 0.3, completion 0.2
          const trust = clamp01((visitRate*0.5) + (repeatRate*0.3) + (completion*0.2));
          // map to 0.6..1.0
          return 0.6 + (0.4 * trust);
        }catch{ return 0.7; }
      }
      function computeDiversityBoost(providerId, provMap){
        try{
          const p = provMap[providerId];
          const completedAt = p?.onboarding?.completedAt ? new Date(p.onboarding.completedAt).getTime() : 0;
          const now = Date.now(); const days = completedAt? ((now - completedAt)/86400000) : 999;
          const recentBoost = days <= 30 ? 0.08 : 0.0; // up to +8%
          // mild jitter based on providerId hash
          let hash = 0; for(let i=0;i<providerId.length;i++){ hash = ((hash<<5)-hash) + providerId.charCodeAt(i); hash|=0; }
          const jitter = ((hash % 100)/10000); // -? we're fine with tiny positive
          const boost = 1.0 + recentBoost + jitter;
          return Math.max(0.9, Math.min(1.1, boost));
        }catch{ return 1.0; }
      }
      // 計算＆ソート（距離の昇順）
      const scored = filtered.map(it=>{
        const r = computeDistance(it);
        let spec = 0, trust = 0;
        try{ spec = matcher.scoreServiceSpecificity(it)||0; }catch{}
        try{ trust = matcher.scoreProfileTrust(provMap[it.providerId])||0; }catch{}
        return { it: { ...it, _reason: r.reason }, dist: r.adjusted, spec, trust };
      });
      scored.sort((a,b)=> a.dist - b.dist);
      // ゾーン割当（割合ベース）
      let zones = [];
      try{ zones = matcher.assignZonesByPercent(scored); }catch{ zones = scored.map((_,i)=> i<Math.ceil(scored.length*0.1)?'A': (i<Math.ceil(scored.length*0.3)?'B': (i<Math.ceil(scored.length*0.6)?'C':'D'))); }
      const visible = scored.map((s,i)=> ({ ...s, zone: zones[i], tb: (s.spec*0.7 + s.trust*0.3) }));
      // ゾーンごとの並び調整（同ゾーン内のみ：具体性・信頼で降順）
      const orderZone = (arr)=> arr.sort((a,b)=> (b.tb - a.tb));
      const zoneA = orderZone(visible.filter(s=> s.zone==='A'));
      const zoneB = orderZone(visible.filter(s=> s.zone==='B'));
      const zoneC = orderZone(visible.filter(s=> s.zone==='C'));
      const zoneD = orderZone(visible.filter(s=> s.zone==='D'));
      // 説明ブロック
      try{
        const header = document.createElement('div'); header.className='search-purpose-summary';
        const h = document.createElement('h3'); h.textContent='この並びについて'; h.style.margin='0 0 6px 0'; header.appendChild(h);
        const p = document.createElement('p'); p.textContent='あなたの診断結果と、各店舗のスタイル・強みをもとに相性の高い順で表示しています。'; p.style.margin='0 0 4px 0'; header.appendChild(p);
        const p2 = document.createElement('p'); p2.className='muted'; p2.style.margin='0'; p2.textContent='同じゾーン内の並びは、サービスの具体性やプロフィールの充実度で調整しています。'; header.appendChild(p2);
        if(list && list.parentNode) list.parentNode.insertBefore(header, list);
      }catch{}
      // レンダリング（ゾーン見出し付き）
      if(list){ list.textContent=''; }
      function renderZone(title, items){
        if(!items.length) return;
        const zWrap = document.createElement('div'); zWrap.className='stack'; zWrap.style.margin='12px 0';
        const zTitle = document.createElement('h4'); zTitle.textContent = title; zTitle.style.margin='0 0 8px 0'; zWrap.appendChild(zTitle);
        const frag = document.createDocumentFragment(); items.forEach(s=> frag.appendChild(card(s.it, { q })) );
        const grid = document.createElement('div'); grid.className='features-grid'; grid.appendChild(frag); zWrap.appendChild(grid);
        list.appendChild(zWrap);
      }
      renderZone('今のあなたと、特に相性が良い', zoneA);
      renderZone('相性が良い', zoneB);
      renderZone('合いそう', zoneC);
      renderZone('選択肢として表示', zoneD);
      updateCount(zoneA.length + zoneB.length + zoneC.length + zoneD.length);
      sorted = visible.map(s=> s.it); // for pager fallback if needed
    }else{
      sorted = sortItems(filtered, getSortKey());
    }
  }

  // 一旦クリア
  if(list) list.textContent = '';

  if(sorted.length===0){
    const p = document.createElement('p');
    p.className='muted';
    p.textContent='該当するサービスが見つかりませんでした。';
    if(list) list.appendChild(p);
    updateCount(0);
    try{ if(q && q.trim()){ recordEvent('search_noresult', { query: q.trim(), region, category, purpose }); } }catch{}
    console.info('[search] static:', staticItems.length, 'local:', localItems.length, 'filters:', {q,region,category,purpose});
    return;
  }
  const per = toInt(perStr, 12);
  const page = toInt(pageStr, 1);
  const total = sorted.length + pinned.length;
  const totalPages = Math.ceil(total / per);
  const safePage = Math.min(Math.max(1, page), Math.max(totalPages, 1));
  const start = (safePage - 1) * per;
  const end = Math.min(start + per, total);

  updateCount(total);
  if(list){
    const frag = document.createDocumentFragment();
    sorted.slice(start, end).forEach(s=> frag.appendChild(card(s, { q })) );
    list.appendChild(frag);
    updateRange(total, start, end);
    // 選択された purpose があれば、ページ上部にラベルと紐づくカテゴリを表示する
    if(purpose){
      try{
        const header = document.createElement('div');
        header.className = 'search-purpose-summary';
        const purposeLabels = {
          first_impression: '第一印象を変えたい',
          profile_photo: 'プロフィール写真を良くしたい',
          confidence: '恋愛で自信を持ちたい',
          body_shape: '体を整えたい',
          know_what_suits: '自分に似合うものを知りたい',
          total_update: 'トータルで磨く'
        };
        const pname = purposeLabels[purpose] || purpose;
        const linked = categoriesForPurpose(purpose).map(labelCategory).join(' / ');
        // build header content safely using textContent (avoid innerHTML)
        try{
          const p = document.createElement('p');
          p.style.margin = '0 0 8px 0';
          p.style.fontWeight = '600';
          p.appendChild(document.createTextNode('目的: '));
          const strong = document.createElement('span'); strong.style.fontWeight = '600'; strong.textContent = String(pname);
          p.appendChild(strong);
          const spanMuted = document.createElement('span'); spanMuted.style.fontWeight = '400'; spanMuted.style.color = 'var(--color-muted)'; spanMuted.textContent = `（該当カテゴリ: ${linked}）`;
          p.appendChild(document.createTextNode(' '));
          p.appendChild(spanMuted);
          header.appendChild(p);
          list.parentNode.insertBefore(header, list);
        }catch(e){
          // fallback: minimal safe text
          const p = document.createElement('p'); p.className = 'muted'; p.textContent = `目的: ${pname} （該当カテゴリ: ${linked}）`; header.appendChild(p); list.parentNode.insertBefore(header, list);
        }
      }catch(e){ console.warn('failed to render purpose header', e); }
    }
    // カテゴリが選択されている場合、カテゴリガイドを表示
    if(category){
      try{
        const header = document.createElement('div'); header.className='search-purpose-summary';
        const labels = {
          consulting:'外見全体の方向性を決め、優先度整理と伴走を受けられます。',
          gym:'体型改善や姿勢改善を目指すトレーニングです。',
          makeup:'好印象な基礎〜目的別のメイクを学べます。',
          hair:'髪型相談・カット/セットで印象を整えます。',
          diagnosis:'パーソナルカラー/骨格など「似合う」の基準を知れます。',
          fashion:'シーン別の服選び・コーデ提案で「外さない」を作ります。',
          photo:'プロフィール写真や宣材など、伝わる印象の写真を撮ります。',
          marriage:'婚活に特化したサポートで戦略と見た目を整えます。',
          eyebrow:'眉の形・濃さ調整で印象をアップします。',
          hairremoval:'ムダ毛対処で清潔感を上げます。',
          esthetic:'肌や毛穴、むくみなどのケアで整えます。',
          whitening:'歯の色味改善で笑顔の印象を良くします。',
          orthodontics:'歯並び改善で長期的な印象を高めます。',
          nail:'爪の清潔感・手元の印象を整えます。'
        };
        const cLabel = labelCategory(category);
        const h = document.createElement('h3'); h.style.margin='0 0 6px 0'; h.textContent = `カテゴリ: ${cLabel}`; header.appendChild(h);
        const p2 = document.createElement('p'); p2.className='muted'; p2.style.margin='0'; p2.textContent = labels[category] || 'このカテゴリの中から、あなたの目的に合う選択肢を探せます。'; header.appendChild(p2);
        list.parentNode.insertBefore(header, list);
      }catch(e){ console.warn('failed to render category guide', e); }
      // アクティブフィルターとクイックトグルを先に表示
      try{ renderActiveFilters(list.parentNode, list); }catch{}
      // 詳しいガイド/CTA（詳細セクション）
      try{ renderCategoryGuide(category, list.parentNode, list); }catch{ }
    }
    // カテゴリ未選択でも、フィルターチップは表示（あれば）
    if(!category){ try{ renderActiveFilters(list.parentNode, list); }catch{} }
    renderPagination({
      total,
      page: safePage,
      per,
      mount: list,
      onNavigate: (nextPage) => {
        const u = new URL(location.href);
        u.searchParams.set('page', String(nextPage));
        u.searchParams.set('per', String(per));
        // 保持する他のパラメータ
        if(q) u.searchParams.set('keyword', q);
        if(region) u.searchParams.set('region', region);
        if(category) u.searchParams.set('category', category);
        if(getSortKey()) u.searchParams.set('sort', getSortKey());
        // keep diagnosis/top/quick flags
        const ent = parseParams();
        if(ent.diag) u.searchParams.set('diag', String(ent.diag));
        if(ent.top) u.searchParams.set('top', String(ent.top));
        if(ent.quick) u.searchParams.set('quick', String(ent.quick));
        location.href = u.toString();
      }
    });
  }
})();
