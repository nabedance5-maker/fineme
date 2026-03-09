// @ts-nocheck
export {};
// Resolve runtime helpers (may be provided as globals by helper scripts).
// Provide a local binding so static analyzers don't flag undefined globals.
const safeUrl = (typeof globalThis !== 'undefined' && typeof globalThis.safeUrl === 'function') ? globalThis.safeUrl : null;
const PROVIDERS_KEY = 'glowup:providers';
const SERVICES_KEY = 'glowup:services';
function resolvePrefix(){ return location.pathname.includes('/pages/') ? '..' : '.'; }

// compute correct relative path to store.html depending on current page location
function storeBase(){
  try{
    if(location.pathname && location.pathname.indexOf('/pages/') !== -1) return './store.html';
    return './pages/store.html';
  }catch{ return './pages/store.html'; }
}

function qs(s, el=document){ return el.querySelector(s); }
function params(){
  try{
    const sp = new URL(location.href).searchParams;
    const o = {};
    const q = sp.toString();
    if(q){
      for(const part of q.split('&')){
        const [k,v] = part.split('=');
        if(k){ o[decodeURIComponent(k)] = v? decodeURIComponent(v): ''; }
      }
    }
    return o;
  }catch{ return {}; }
}

function loadProviders(){
  try{ const raw = localStorage.getItem(PROVIDERS_KEY); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr:[]; }catch{ return []; }
}
function loadServices(){
  try{ const raw = localStorage.getItem(SERVICES_KEY); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr:[]; }catch{ return []; }
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

function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

import { loadOptions } from './options.js';
export { loadServices, loadProviders };

(async function init(){
  const { providerId='' } = params();
  const root = qs('#store-root');
  if(!root){ return; }
  // Defer insertion of skip-link until we detect keyboard usage (first Tab press).
  // This prevents visual clutter for mouse/touch users while keeping accessibility for keyboard users.
  try{
    let skipInserted = false;
    function insertSkipAndFocus(){
      if(skipInserted) return;
      try{
        const skip = document.getElementById('skip-to-main') || document.createElement('a');
        skip.id = 'skip-to-main';
        skip.className = 'skip-link';
        skip.href = '#store-root';
        skip.textContent = '主要コンテンツへ移動';
        if(!document.getElementById('skip-to-main')){
          const hdr = document.getElementById('site-header');
          if(hdr && hdr.parentNode){ hdr.parentNode.insertBefore(skip, hdr); } else { document.body.insertBefore(skip, document.body.firstChild); }
        }
        // move focus to the skip link so the user's Tab lands there
        try{ skip.focus(); }catch{}
        skipInserted = true;
      }catch(e){}
    }
    function onFirstTab(e){
      // Accept Tab (key) without modifier keys as keyboard navigation
      if(e.key === 'Tab' || e.keyCode === 9){
        insertSkipAndFocus();
        document.removeEventListener('keydown', onFirstTab, true);
      }
    }
    document.addEventListener('keydown', onFirstTab, true);
  }catch(e){}
  let providers = loadProviders();
  if(!providers.length){ providers = await loadStaticProviders(); }
  const services = loadServices();
  const provider = providers.find(p=> p.id === providerId);
  if(!provider){
    const pNo = document.createElement('p');
    pNo.className = 'muted';
    pNo.textContent = '店舗が見つかりませんでした。';
    root.appendChild(pNo);
    return;
  }
  // Hide provider page if onboarding is not completed
  if(!(provider.onboarding && provider.onboarding.completed)){
    const card = document.createElement('div'); card.className='card'; card.style.padding='12px';
    const h = document.createElement('strong'); h.textContent = 'この店舗は準備中です（非公開）'; card.appendChild(h);
    const p = document.createElement('p'); p.className='muted'; p.textContent='オンボーディング未完了のため、一般公開されていません。'; card.appendChild(p);
    root.appendChild(card);
    return;
  }
  const prof = provider.profile || {};
  const publishedServices = services.filter(s=> s.providerId === provider.id && s.published);
  const cover = publishedServices.find(s=> s.photo)?.photo || '';
  const fallback = (location.pathname.includes('/pages/')) ? '../assets/placeholders/placeholder-default.svg' : './assets/placeholders/placeholder-default.svg';
  const coverImg = cover && cover.trim() ? cover : fallback;

  const storeName = escapeHtml(prof.storeName || provider.name || '');
  const address = escapeHtml(prof.address || '');
  const website = (prof.website||'').trim();
  const phone = escapeHtml(prof.phone || '');
  const hours = escapeHtml(prof.businessHours || '');
  // access may be stored as object {station, walk} or legacy string
  let accessRaw = '';
  if(prof.access && typeof prof.access === 'object'){
    accessRaw = `${prof.access.station||''}${prof.access.walk? ' 徒歩'+prof.access.walk+'分' : ''}`.trim();
  } else {
    accessRaw = prof.access || prof.accessStation || '';
  }
  const access = escapeHtml(accessRaw || '');
  const desc = (prof.description||'').toString();
  const priceFrom = (prof.priceFrom != null && prof.priceFrom !== '') ? Number(prof.priceFrom) : null;
  const amenities = Array.isArray(prof.amenities) ? prof.amenities : [];
  const paymentMethods = Array.isArray(prof.paymentMethods) ? prof.paymentMethods : [];
  const staffCount = Array.isArray(prof.staffs) ? prof.staffs.length : 0;

  // compute provider-level review summary by aggregating service reviews
  let providerRating = { avg: 0, count: 0 };
  try{
    const mod = await import('./reviews.js');
    let totalScore = 0; let totalCount = 0;
    for(const s of publishedServices){
      const key = s.id ? `local:${s.id}` : (s.slug ? `slug:${s.slug}` : null);
      if(!key) continue;
      try{ const r = mod.ratingSummary(key) || { avg:0, count:0 }; totalScore += (Number(r.avg)||0) * (Number(r.count)||0); totalCount += Number(r.count)||0; }catch(e){}
    }
    if(totalCount > 0) providerRating = { avg: Math.round((totalScore/totalCount)*10)/10, count: totalCount };
  }catch(e){ /* reviews optional */ }

  // build a gallery images array from provider profile and services
  const galleryImgs = [];
  try{
    if(Array.isArray(prof.gallery)){
      for(const u of prof.gallery){ if(u && String(u).trim()) galleryImgs.push(String(u).trim()); }
    }
    for(const s of publishedServices){ if(s.photo && String(s.photo).trim()) galleryImgs.push(String(s.photo).trim()); if(Array.isArray(s.gallery)){ for(const u of s.gallery){ if(u && String(u).trim()) galleryImgs.push(String(u).trim()); } } }
    // dedupe while preserving order
    const seen = new Set();
    for(let i=0;i<galleryImgs.length;i++){ const v = galleryImgs[i]; if(seen.has(v)){ galleryImgs.splice(i,1); i--; } else seen.add(v); }
  }catch(e){ /* ignore */ }

  // Amenity label mapping for user-friendly display
  const AMENITY_LABELS = {
    parking: '駐車場',
    private_room: '個室',
    wheelchair: 'バリアフリー',
    wifi: 'Wi‑Fi',
    credit_card: 'クレジットカード可',
    child_friendly: '子連れ可',
    women_only: '女性専用',
    priority_reservation: '予約優先',
    same_day: '当日予約可',
    english: '英語対応'
  };

  // Payment method label mapping
  const PAYMENT_LABELS = {
    cash: '現金',
    credit_card: 'クレジットカード',
    paypay: 'PayPay',
    linepay: 'LINE Pay',
    applepay: 'Apple Pay',
    googlepay: 'Google Pay'
  };

  // ensure chip CSS exists
  (function ensureChipStyles(){
    if(document.getElementById('fineme-chip-styles')) return;
    const css = `
      .chip{ display:inline-block; background:#f6f7f8; color:var(--muted); padding:6px 10px; border-radius:16px; font-size:13px; border:1px solid rgba(0,0,0,0.04); }
      @media(max-width:480px){ .chip{ font-size:12px; padding:5px 8px } }
    `;
    const s = document.createElement('style'); s.id = 'fineme-chip-styles'; s.appendChild(document.createTextNode(css)); document.head.appendChild(s);
  })();

  // prepare hoursHtml: prefer structured businessHoursStructured if available
  let hoursHtml = '';
  try{
    if(prof.businessHoursStructured && typeof prof.businessHoursStructured === 'object'){
      const names = { mon:'月', tue:'火', wed:'水', thu:'木', fri:'金', sat:'土', sun:'日' };
      const rows = [];
      for(const k of ['mon','tue','wed','thu','fri','sat','sun']){
        const obj = prof.businessHoursStructured[k] || {};
        if(obj.closed){ rows.push(`${names[k]}: 定休日`); }
        else if(obj.open && obj.close){ rows.push(`${names[k]}: ${escapeHtml(obj.open)}〜${escapeHtml(obj.close)}`); }
        else if(obj.open){ rows.push(`${names[k]}: ${escapeHtml(obj.open)}`); }
      }
      if(rows.length) hoursHtml = `<p><strong>営業時間（週）</strong><br>${rows.join(' / ')}</p>`;
    } else if(hours){
      hoursHtml = `<p><strong>営業時間</strong><br>${hours}</p>`;
    }
  }catch(e){ hoursHtml = hours ? `<p><strong>営業時間</strong><br>${hours}</p>` : ''; }

  // Build root content using DOM APIs to avoid injecting HTML templates with user data
  root.textContent = '';
  const header = document.createElement('div'); header.className = 'store-header';
  const coverImgEl = document.createElement('img'); coverImgEl.className = 'store-cover';
  const safeCover = (typeof safeUrl === 'function') ? (safeUrl(coverImg) || '') : coverImg || '';
  coverImgEl.src = safeCover; coverImgEl.alt = prof.storeName || provider.name || '';
  coverImgEl.loading = 'lazy';
  header.appendChild(coverImgEl);

  const info = document.createElement('div'); info.className = 'store-info';
  const topRow = document.createElement('div'); topRow.style.display = 'flex'; topRow.style.alignItems = 'center'; topRow.style.gap = '12px';
  const h1 = document.createElement('h1'); h1.className = 'section-title'; h1.style.margin = '0'; h1.textContent = prof.storeName || provider.name || '';
  topRow.appendChild(h1);
  if(priceFrom){ const badge = document.createElement('div'); badge.className = 'badge'; badge.style.background = 'linear-gradient(90deg,var(--primary),#0e3760)'; badge.style.color = '#fff'; badge.style.padding = '6px 10px'; badge.style.borderRadius = '20px'; badge.style.fontWeight = '700'; badge.textContent = `¥${priceFrom.toLocaleString()}〜`; topRow.appendChild(badge); }
  if(providerRating.count){ const rdiv = document.createElement('div'); rdiv.className = 'rating-badge'; rdiv.style.display = 'flex'; rdiv.style.alignItems = 'center'; rdiv.style.gap = '6px'; rdiv.style.padding = '6px 10px'; rdiv.style.borderRadius = '14px'; rdiv.style.border = '1px solid rgba(0,0,0,0.05)'; rdiv.style.background = '#fff'; const spanStar = document.createElement('span'); spanStar.style.fontWeight='700'; spanStar.style.color='#ffb400'; spanStar.textContent = `★ ${providerRating.avg}`; const spanCount = document.createElement('span'); spanCount.className = 'muted'; spanCount.textContent = `(${providerRating.count})`; rdiv.appendChild(spanStar); rdiv.appendChild(spanCount); topRow.appendChild(rdiv); }
  info.appendChild(topRow);
  if(address){ const pAddr = document.createElement('p'); pAddr.className = 'card-meta'; pAddr.textContent = prof.address || ''; info.appendChild(pAddr); }
  const metaRow = document.createElement('div'); metaRow.style.marginTop = '8px'; metaRow.style.display = 'flex'; metaRow.style.gap = '8px'; metaRow.style.flexWrap = 'wrap'; metaRow.style.alignItems = 'center';
  if(publishedServices && publishedServices.length){ const svc = publishedServices[0]; const cat = svc.category || ''; const dur = svc.duration || svc.time || svc.minutes || ''; if(cat){ const chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = `🗂 ${cat}`; metaRow.appendChild(chip); } if(dur){ const chip2 = document.createElement('span'); chip2.className = 'chip'; chip2.textContent = `⏱ ${dur}分`; metaRow.appendChild(chip2); } }
  const reserveLink = document.createElement('a'); reserveLink.className = 'btn btn--primary hero-reserve';
  // Navigate directly to schedule page (no serviceId); include providerId to help filter
  reserveLink.href = (location.pathname.includes('/pages/')) ? `./user/schedule.html?providerId=${encodeURIComponent(provider.id)}&origin=detail` : `./pages/user/schedule.html?providerId=${encodeURIComponent(provider.id)}&origin=detail`;
  reserveLink.style.marginLeft = 'auto'; reserveLink.setAttribute('aria-label','予約へ進む'); reserveLink.textContent = '予約へ進む'; metaRow.appendChild(reserveLink);
  info.appendChild(metaRow);
  // Compatibility card (診断ベース相性表示)
  try{
    const matchMod = await import('./matching.js');
    const m = await matchMod.computeMatchForProvider(provider.id);
    if(m){
      const card = document.createElement('div'); card.className = 'card'; card.style.padding='12px'; card.style.marginTop='10px';
      const title = document.createElement('div'); title.className='cluster'; title.style.justifyContent='space-between'; title.style.alignItems='center';
      const strong = document.createElement('strong'); strong.textContent = 'あなたとの相性'; title.appendChild(strong);
      // ゾーン文言（A–D＋Eの距離から近似）
      try{
        const raw = localStorage.getItem('fineme:diagnosis:latest');
        const diag = raw ? JSON.parse(raw) : null;
        const user = matchMod.getUserAxesFromDiagnosis(diag);
        const shop = matchMod.getShopScoresFromProvider(provider);
        const comp = matchMod.computeCompatibilityAxes(user, shop);
        const zoneLabel = (function(adj){
          if(adj <= 2.0) return 'とても相性がいい';
          if(adj <= 3.0) return '相性がいい';
          if(adj <= 4.0) return '合いそう';
          return '選択肢として表示';
        })(Number(comp.adjusted||999));
        const badge = document.createElement('span'); badge.className='badge'; badge.textContent = zoneLabel; title.appendChild(badge);
      }catch{}
      card.appendChild(title);
      if(Array.isArray(m.reasons) && m.reasons.length){
        const ul = document.createElement('ul'); ul.style.margin='8px 0 0'; ul.style.padding='0 0 0 18px';
        for(const r of m.reasons.slice(0,3)){ const li=document.createElement('li'); li.textContent=String(r); ul.appendChild(li); }
        card.appendChild(ul);
      }
      const ctaWrap = document.createElement('div'); ctaWrap.className='cluster'; ctaWrap.style.justifyContent='flex-end'; ctaWrap.style.marginTop='10px';
      const a = document.createElement('a'); a.className='btn btn--primary'; a.href = reserveLink.href; a.textContent = '予約へ進む'; ctaWrap.appendChild(a);
      card.appendChild(ctaWrap);
      info.appendChild(card);
    }
  }catch(e){ /* optional */ }
  // Response-to-your-type section (STEP3入力を反映)
  try{
    const diagRaw = localStorage.getItem('fineme:diagnosis:latest');
    const diag = diagRaw ? JSON.parse(diagRaw) : null;
    const prof = (provider && provider.onboarding && provider.onboarding.profile) ? provider.onboarding.profile : null;
    const userTypeName = (diag?.step2?.classification?.type_name) || (diag?.intent?.type_name) || '';
    if(diag && prof){
      const mod = await import('./compatibility.js');
      const comp = await mod.generateCompatibility(diag, provider);
      if(comp){
        const cardHost = document.createElement('div'); cardHost.className='stack';
        const head = document.createElement('div'); head.className='cluster'; head.style.justifyContent='space-between'; head.style.alignItems='center';
        const title = document.createElement('strong'); title.textContent = `あなたの診断結果「${userTypeName}」への応え方`;
        head.appendChild(title);
        cardHost.appendChild(head);
        mod.renderCompatibilityCard(cardHost, comp);
        info.appendChild(cardHost);
      }
    }
  }catch(_){ }
  if(address){ const pAddr2 = document.createElement('p'); pAddr2.className = 'card-meta'; pAddr2.textContent = prof.address || ''; info.appendChild(pAddr2); }
  const ul = document.createElement('ul'); ul.className = 'info-list'; if(phone){ const li = document.createElement('li'); const strong = document.createElement('strong'); strong.textContent = '電話番号'; const span = document.createElement('span'); span.textContent = prof.phone || ''; li.appendChild(strong); li.appendChild(span); ul.appendChild(li); } if(access){ const li2 = document.createElement('li'); const strong2 = document.createElement('strong'); strong2.textContent = 'アクセス'; const span2 = document.createElement('span'); span2.textContent = accessRaw || ''; li2.appendChild(strong2); li2.appendChild(span2); ul.appendChild(li2); } info.appendChild(ul);
  if(amenities.length){ const wrap = document.createElement('div'); wrap.style.marginTop = '10px'; wrap.style.display='flex'; wrap.style.gap='8px'; wrap.style.flexWrap='wrap'; for(const a of amenities){ const sp = document.createElement('span'); sp.className='chip'; sp.textContent = AMENITY_LABELS[a] || a; wrap.appendChild(sp); } info.appendChild(wrap); }
  header.appendChild(info);
  root.appendChild(header);

  // Tabs
  const nav = document.createElement('nav'); nav.className='tabs'; nav.setAttribute('role','tablist'); nav.setAttribute('aria-label','店舗情報タブ'); nav.style.marginTop='18px';
  const tabs = ['info','menu','gallery','staff']; const labels = ['店舗基本情報','サービスメニュー','ギャラリー','スタッフ'];
  for(let i=0;i<tabs.length;i++){ const btn = document.createElement('button'); btn.id = `tab-btn-${tabs[i]}`; btn.setAttribute('role','tab'); btn.dataset.tab = tabs[i]; btn.className = `tab-btn${i===0?' is-active':''}`; btn.textContent = labels[i]; nav.appendChild(btn); }
  root.appendChild(nav);

  // Panels
  const pInfo = document.createElement('section'); pInfo.id = 'tab-info'; pInfo.className = 'tab-panel'; pInfo.setAttribute('role','tabpanel'); pInfo.setAttribute('aria-labelledby','tab-btn-info'); pInfo.textContent = ''; root.appendChild(pInfo);
  const pMenu = document.createElement('section'); pMenu.id = 'tab-menu'; pMenu.className = 'tab-panel'; pMenu.setAttribute('role','tabpanel'); pMenu.setAttribute('aria-labelledby','tab-btn-menu'); pMenu.style.display='none'; const h2Menu = document.createElement('h2'); h2Menu.className='section-title'; h2Menu.style.fontSize='22px'; h2Menu.textContent='サービスメニュー'; pMenu.appendChild(h2Menu); const servicesGrid = document.createElement('div'); servicesGrid.id='store-services'; servicesGrid.className='features-grid'; pMenu.appendChild(servicesGrid); const detailHost = document.createElement('div'); detailHost.id='service-detail-host'; pMenu.appendChild(detailHost); root.appendChild(pMenu);
  const pGallery = document.createElement('section'); pGallery.id='tab-gallery'; pGallery.className='tab-panel'; pGallery.setAttribute('role','tabpanel'); pGallery.setAttribute('aria-labelledby','tab-btn-gallery'); pGallery.style.display='none'; const h2Gal = document.createElement('h2'); h2Gal.className='section-title'; h2Gal.style.fontSize='22px'; h2Gal.textContent='ギャラリー'; pGallery.appendChild(h2Gal); const galDiv = document.createElement('div'); galDiv.id='store-gallery'; galDiv.className='detail-gallery'; pGallery.appendChild(galDiv); root.appendChild(pGallery);
  const pStaff = document.createElement('section'); pStaff.id='tab-staff'; pStaff.className='tab-panel'; pStaff.setAttribute('role','tabpanel'); pStaff.setAttribute('aria-labelledby','tab-btn-staff'); pStaff.style.display='none'; const h2Staff = document.createElement('h2'); h2Staff.className='section-title'; h2Staff.style.fontSize='22px'; h2Staff.textContent='スタッフ'; pStaff.appendChild(h2Staff); const staffGrid = document.createElement('div'); staffGrid.id='store-staff'; staffGrid.className='staff-grid'; pStaff.appendChild(staffGrid); root.appendChild(pStaff);

  // Populate the 「店舗基本情報」タブ with detailed info so it's not empty
  try{
    const infoPanel = qs('#tab-info');
    if(infoPanel){
      const infoSection = document.createElement('div');
      infoSection.className = 'detail-section';
      // address
      if(address){
        const pAddr = document.createElement('p');
        const strong = document.createElement('strong'); strong.textContent = '住所';
        pAddr.appendChild(strong);
        pAddr.appendChild(document.createElement('br'));
        pAddr.appendChild(document.createTextNode(address));
        infoSection.appendChild(pAddr);
      }
      // phone
      if(phone){
        const pPhone = document.createElement('p');
        const strong2 = document.createElement('strong'); strong2.textContent = '電話番号';
        const br2 = document.createElement('br');
        const aTel = document.createElement('a');
        aTel.href = `tel:${encodeURIComponent(phone)}`;
        aTel.textContent = phone;
        pPhone.appendChild(strong2);
        pPhone.appendChild(br2);
        pPhone.appendChild(aTel);
        infoSection.appendChild(pPhone);
      }
      // hoursHtml may contain small HTML fragments; sanitize if possible
      if(hoursHtml){
        const holder = document.createElement('div');
        try{
          if(typeof sanitizeHtml === 'function'){
            // use trusted sanitizer when available
            holder.innerHTML = sanitizeHtml(hoursHtml);
          } else {
            // avoid raw innerHTML when sanitizer is unavailable; parse known simple structure
            // expected shapes (from code above):
            // 1) `<p><strong>営業時間（週）</strong><br>...rows joined with / ...</p>`
            // 2) `<p><strong>営業時間</strong><br>...escaped hours...</p>`
            try{
              const m = /<strong>(.*?)<\/strong>(?:<br\s*\/?>)?([\s\S]*)/i.exec(hoursHtml);
              if(m){
                const p = document.createElement('p');
                const strongEl = document.createElement('strong');
                strongEl.textContent = m[1] || '';
                p.appendChild(strongEl);
                p.appendChild(document.createElement('br'));
                // remaining content may contain separators like ' / ' or already-escaped text
                const rest = (m[2] || '').replace(/<[^>]+>/g,'').trim();
                p.appendChild(document.createTextNode(rest));
                holder.appendChild(p);
              } else {
                // fallback: strip tags and present as text preserving separators
                const txt = hoursHtml.replace(/<[^>]+>/g,'').trim();
                const p = document.createElement('p'); p.textContent = txt; holder.appendChild(p);
              }
            }catch(e){ holder.textContent = hoursHtml.replace(/<[^>]+>/g,''); }
          }
        }catch(e){ holder.textContent = hoursHtml.replace(/<[^>]+>/g,''); }
        // move children into infoSection
        while(holder.firstChild){ infoSection.appendChild(holder.firstChild); }
      }
      // access
      if(access){
        const pAcc = document.createElement('p');
        const sAcc = document.createElement('strong'); sAcc.textContent = 'アクセス';
        pAcc.appendChild(sAcc);
        pAcc.appendChild(document.createElement('br'));
        pAcc.appendChild(document.createTextNode(access));
        infoSection.appendChild(pAcc);
      }
      // staff count
      const pStaff = document.createElement('p');
      const sStaff = document.createElement('strong'); sStaff.textContent = 'スタッフ数';
      pStaff.appendChild(sStaff);
      pStaff.appendChild(document.createElement('br'));
      pStaff.appendChild(document.createTextNode(String(staffCount) + '名'));
      infoSection.appendChild(pStaff);
      // website
      if(website){
        const pWeb = document.createElement('p');
        const sWeb = document.createElement('strong'); sWeb.textContent = 'WEB';
        pWeb.appendChild(sWeb);
        pWeb.appendChild(document.createElement('br'));
        const aWeb = document.createElement('a'); aWeb.href = website; aWeb.target = '_blank'; aWeb.rel = 'noopener'; aWeb.textContent = website;
        pWeb.appendChild(aWeb);
        infoSection.appendChild(pWeb);
      }
      // priceFrom
      if(priceFrom){
        const pPrice = document.createElement('p');
        const sPrice = document.createElement('strong'); sPrice.textContent = '価格目安';
        pPrice.appendChild(sPrice); pPrice.appendChild(document.createElement('br'));
        pPrice.appendChild(document.createTextNode('¥' + priceFrom.toLocaleString() + '〜'));
        infoSection.appendChild(pPrice);
      }
      // amenities
      if(amenities.length){
        const pAm = document.createElement('p');
        const sAm = document.createElement('strong'); sAm.textContent = '設備・サービス';
        pAm.appendChild(sAm); pAm.appendChild(document.createElement('br'));
        pAm.appendChild(document.createTextNode(amenities.map(a=> AMENITY_LABELS[a] || a).join('、')));
        infoSection.appendChild(pAm);
      }
      // payment methods
      if(paymentMethods.length){
        const pPm = document.createElement('p');
        const sPm = document.createElement('strong'); sPm.textContent = '支払方法';
        pPm.appendChild(sPm); pPm.appendChild(document.createElement('br'));
        const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.gap = '8px'; wrap.style.flexWrap = 'wrap';
        paymentMethods.forEach(pm=>{ const sp = document.createElement('span'); sp.className='chip'; sp.textContent = PAYMENT_LABELS[pm] || pm; wrap.appendChild(sp); });
        pPm.appendChild(wrap); infoSection.appendChild(pPm);
      }
      // description (preserve newlines as <br>)
      if(desc){
        const pDesc = document.createElement('p'); pDesc.style.marginTop = '8px';
        const parts = String(desc).split(/\r?\n/);
        parts.forEach((line, idx)=>{ if(idx) pDesc.appendChild(document.createElement('br')); pDesc.appendChild(document.createTextNode(line)); });
        infoSection.appendChild(pDesc);
      }
      infoPanel.appendChild(infoSection);
    }
  }catch(e){ /* ignore */ }

  // Tab activation helper and wiring
  function activateTab(name){
    try{
      const btns = root.querySelectorAll('.tab-btn');
  const panels = ['info','menu','gallery','staff'];
      btns.forEach(b => {
        const isActive = b.dataset.tab === name;
        b.classList.toggle('is-active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        b.setAttribute('tabindex', isActive ? '0' : '-1');
      });
      panels.forEach(p => {
        const el = qs(`#tab-${p}`);
        if(!el) return;
        const visible = (p === name);
        el.style.display = visible ? 'block' : 'none';
        el.setAttribute('aria-hidden', visible ? 'false' : 'true');
        // allow programmatic focus into the panel when visible (but don't move focus automatically here)
        try{ el.tabIndex = visible ? 0 : -1; }catch{};
      });
    }catch(e){}
  }
  // wire click handlers
  try{
    const tabRoot = root.querySelector('.tabs');
    if(tabRoot){
      const tabButtons = tabRoot.querySelectorAll('.tab-btn');
      tabButtons.forEach(btn => {
        btn.setAttribute('role','tab');
        btn.setAttribute('aria-controls', `tab-${btn.dataset.tab}`);
        btn.setAttribute('tabindex', btn.classList.contains('is-active') ? '0' : '-1');
        btn.setAttribute('aria-selected', btn.classList.contains('is-active') ? 'true' : 'false');
        btn.addEventListener('click', ()=>{
          const t = btn.dataset.tab;
          activateTab(t);
          try{ const u = new URL(location.href); u.searchParams.set('tab', t); u.searchParams.delete('serviceId'); history.replaceState({}, '', u.toString()); }catch(e){}
        });
      });
      // keyboard navigation: Left/Right/Home/End
      tabRoot.addEventListener('keydown', (ev)=>{
        const key = ev.key;
        const target = ev.target;
        if(!target || !target.classList || !target.classList.contains('tab-btn')) return;
        const buttons = Array.from(tabRoot.querySelectorAll('.tab-btn'));
        const idx = buttons.indexOf(target);
        if(idx === -1) return;
        if(key === 'ArrowRight' || key === 'ArrowLeft' || key === 'Home' || key === 'End'){
          ev.preventDefault();
          let nextIdx = idx;
          if(key === 'ArrowRight') nextIdx = (idx + 1) % buttons.length;
          if(key === 'ArrowLeft') nextIdx = (idx - 1 + buttons.length) % buttons.length;
          if(key === 'Home') nextIdx = 0;
          if(key === 'End') nextIdx = buttons.length - 1;
          const next = buttons[nextIdx];
          if(next){ next.focus(); next.click(); }
        }
      });
    }
  }catch(e){}

  // create a sticky reservation CTA (bottom-right) for better conversion
  try{
    const stickyId = 'fineme-sticky-reserve';
    if(!document.getElementById(stickyId)){
      const a = document.createElement('a');
      a.id = stickyId;
      a.className = 'btn btn--primary';
      // sticky CTA goes to schedule page (provider filter)
      a.href = (location.pathname.includes('/pages/')) ? `./user/schedule.html?providerId=${encodeURIComponent(provider.id)}&origin=detail` : `./pages/user/schedule.html?providerId=${encodeURIComponent(provider.id)}&origin=detail`;
      a.setAttribute('aria-label','予約へ進む');
      a.textContent = '予約へ進む';
      a.style.position = 'fixed';
      a.style.right = '16px';
      a.style.bottom = '18px';
      a.style.zIndex = '1200';
      a.style.borderRadius = '28px';
      a.style.padding = '12px 14px';
      a.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
      // 以前はメニュータブへスクロールする挙動にしていましたが、要件に合わせて
      // クリック時はカレンダーページへ通常遷移させます（イベントを介入しない）。
      document.body.appendChild(a);
    }
  }catch(e){}

  // --- Tracking hook for CTA / analytics ---
  function trackEvent(name, payload){
    try{
      const ev = { name, timestamp: new Date().toISOString(), providerId: provider.id, ...payload };
      // dispatch DOM event
      try{ window.dispatchEvent(new CustomEvent('fineme:event', { detail: ev })); }catch(e){}
      // call optional global hook for integration
      try{ if(typeof window.finemeTrack === 'function') window.finemeTrack(ev); }
      catch(e){}
      // console for local debugging
      try{ console.log('fineme.event', ev); }catch(e){}
    }catch(e){}
  }

  // Provide a default global finemeTrack handler if none exists.
  try{
    if(typeof window.finemeTrack !== 'function'){
      window.finemeTrack = function(ev){
        try{
          // Event naming convention: fineme_<action> (e.g. fineme_reserve_click)
          const eventName = (ev && ev.name) ? `fineme_${String(ev.name).replace(/[^a-z0-9_]/ig,'_')}` : 'fineme_event';
          const params = Object.assign({}, ev);
          // If gtag is present, use it (GA4 friendly)
          try{
            if(typeof window.gtag === 'function'){
              window.gtag('event', eventName, params);
              return;
            }
          }catch(e){}
          // If Measurement Protocol keys are provided on window, send directly
          try{
            const measId = window.FINEME_GA4_MEASUREMENT_ID;
            const apiSecret = window.FINEME_GA4_API_SECRET;
            if(measId && apiSecret && typeof fetch === 'function'){
              // ensure client_id exists (best-effort)
              let cid = localStorage.getItem('fineme:clientId');
              if(!cid){ cid = `${Math.random().toString(36).slice(2)}.${Date.now()}`; try{ localStorage.setItem('fineme:clientId', cid); }catch(e){} }
              const body = { client_id: cid, events: [ { name: eventName, params } ] };
              const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measId)}&api_secret=${encodeURIComponent(apiSecret)}`;
              fetch(url, { method:'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }).catch(()=>{});
              return;
            }
          }catch(e){}
          // fallback: console log
          try{ console.log('finemeTrack fallback', ev); }catch(e){}
        }catch(e){ /* swallow */ }
      };
    }
  }catch(e){}

  // wire hero/sticky CTA to tracking + SPA navigation
  try{
    const heroBtn = qs('.hero-reserve');
    if(heroBtn){
        // 予約CTAはカレンダーページへ通常遷移する（横取りしない）
    }
    const sticky = document.getElementById('fineme-sticky-reserve');
    if(sticky){
            // 予約CTAはカレンダーページへ通常遷移する（横取りしない）
    }
  }catch(e){}

  // --- Gallery + Modal Slider ---
  (function ensureGallery(){
    try{
      const host = qs('#store-gallery');
      if(!host) return;
      if(!galleryImgs || !galleryImgs.length){ const p = document.createElement('p'); p.className='muted'; p.textContent = 'ギャラリー画像はありません。'; host.appendChild(p); return; }
      // inject gallery styles
      if(!document.getElementById('fineme-gallery-styles')){
        const css = `
          .store-gallery-main{ width:100%; max-width:960px; margin:0 auto 12px; border-radius:8px; overflow:hidden; }
          .store-gallery-main img{ width:100%; height:auto; display:block; }
          .store-gallery-thumbs{ display:flex; gap:8px; overflow-x:auto; padding:6px 0; }
          .store-gallery-thumb{ flex:0 0 auto; width:96px; height:64px; object-fit:cover; border-radius:6px; cursor:pointer; border:2px solid transparent; }
          .store-gallery-thumb.is-active{ border-color:var(--primary); }
          .gallery-modal{ position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0.85); z-index:1600; }
          .gallery-modal img{ max-width:94%; max-height:86%; border-radius:8px; }
          .gallery-modal .close{ position:absolute; top:18px; right:20px; background:transparent; color:#fff; border:none; font-size:28px; cursor:pointer; }
          .gallery-nav{ position:absolute; top:50%; transform:translateY(-50%); color:#fff; font-size:28px; background:transparent; border:none; cursor:pointer; padding:12px; }
          .gallery-prev{ left:12px; }
          .gallery-next{ right:12px; }
        `;
        const s = document.createElement('style'); s.id = 'fineme-gallery-styles'; s.appendChild(document.createTextNode(css)); document.head.appendChild(s);
      }
      // build main + thumbs
      const main = document.createElement('div'); main.className = 'store-gallery-main';
      const mimg = document.createElement('img'); mimg.src = galleryImgs[0]; mimg.alt = storeName + ' ギャラリー'; mimg.loading = 'lazy'; main.appendChild(mimg);
      host.appendChild(main);
      const thumbs = document.createElement('div'); thumbs.className = 'store-gallery-thumbs';
      galleryImgs.forEach((u, idx)=>{
  const t = document.createElement('img'); t.className = 'store-gallery-thumb'; t.src = u; t.alt = `${storeName} サムネイル ${idx+1}`; t.loading = 'lazy'; t.decoding = 'async';
        if(idx===0) t.classList.add('is-active');
        t.addEventListener('click', ()=>{ try{ mimg.src = u; thumbs.querySelectorAll('.store-gallery-thumb').forEach(x=> x.classList.remove('is-active')); t.classList.add('is-active'); }catch(e){} });
        thumbs.appendChild(t);
      });
      host.appendChild(thumbs);

      // modal overlay
      let modal = document.getElementById('fineme-gallery-modal');
      if(!modal){
        modal = document.createElement('div'); modal.id = 'fineme-gallery-modal'; modal.className = 'gallery-modal';
        const btnClose = document.createElement('button'); btnClose.className = 'close'; btnClose.setAttribute('aria-label','閉じる'); btnClose.textContent = '×';
        const btnPrev = document.createElement('button'); btnPrev.className = 'gallery-nav gallery-prev'; btnPrev.setAttribute('aria-label','前へ'); btnPrev.textContent = '‹';
        const btnNext = document.createElement('button'); btnNext.className = 'gallery-nav gallery-next'; btnNext.setAttribute('aria-label','次へ'); btnNext.textContent = '›';
        const modalImgEl = document.createElement('img'); modalImgEl.src = ''; modalImgEl.alt = '';
        modal.appendChild(btnClose); modal.appendChild(btnPrev); modal.appendChild(btnNext); modal.appendChild(modalImgEl);
        document.body.appendChild(modal);
      }
      const modalImg = modal.querySelector('img'); const btnClose = modal.querySelector('.close'); const btnPrev = modal.querySelector('.gallery-prev'); const btnNext = modal.querySelector('.gallery-next');
      let curIdx = 0;
  // touch/swipe state
  let touchStartX = 0;
  let touchEndX = 0;
  function openModal(i){ curIdx = i||0; modalImg.src = galleryImgs[curIdx]; preloadAdjacent(curIdx); modal.style.display = 'flex'; try{ modal.focus(); }catch{} }
  function closeModal(){ modal.style.display = 'none'; }
  function showNext(n){ curIdx = (curIdx + (n||1) + galleryImgs.length) % galleryImgs.length; modalImg.src = galleryImgs[curIdx]; preloadAdjacent(curIdx); }
  function preloadAdjacent(index){ try{ const next = (index+1) % galleryImgs.length; const prev = (index-1+galleryImgs.length)%galleryImgs.length; const i1 = new Image(); i1.src = galleryImgs[next]; const i2 = new Image(); i2.src = galleryImgs[prev]; }catch(e){} }
      // wire events
      main.addEventListener('click', ()=> openModal(0));
      thumbs.querySelectorAll('.store-gallery-thumb').forEach((el, i)=> el.addEventListener('dblclick', ()=> openModal(i)));
      btnClose.addEventListener('click', closeModal);
  btnPrev.addEventListener('click', ()=> showNext(-1));
  btnNext.addEventListener('click', ()=> showNext(1));
  // touch handlers for modal image (swipe)
  modalImg.addEventListener('touchstart', (ev)=>{ try{ touchStartX = ev.touches && ev.touches[0] ? ev.touches[0].clientX : 0; }catch(e){} });
  modalImg.addEventListener('touchend', (ev)=>{ try{ touchEndX = ev.changedTouches && ev.changedTouches[0] ? ev.changedTouches[0].clientX : 0; const diff = touchEndX - touchStartX; if(Math.abs(diff) > 40){ if(diff < 0) showNext(1); else showNext(-1); } }catch(e){} });
      modal.addEventListener('click', (ev)=>{ if(ev.target === modal) closeModal(); });
      window.addEventListener('keydown', (ev)=>{ if(modal.style.display === 'flex'){ if(ev.key === 'Escape') closeModal(); if(ev.key === 'ArrowRight') showNext(1); if(ev.key === 'ArrowLeft') showNext(-1); } });

      // enhance modal with fade/open classes for smoother transitions
      const MODAL_FADE_IN_MS = 220;
      const MODAL_FADE_OUT_MS = 180;
      const _origOpenModal = openModal;
      openModal = function(i){ try{ curIdx = i||0; modalImg.src = galleryImgs[curIdx]; preloadAdjacent(curIdx); modal.classList.remove('fade-exit'); modal.classList.add('fade-enter'); modal.style.display = 'flex'; // allow CSS to animate
          // small delay to trigger image transition
          setTimeout(()=>{ modal.classList.add('open'); }, 30);
          try{ modal.focus(); }catch(e){}
      }catch(e){} };
      const _origCloseModal = closeModal;
      closeModal = function(){ try{ modal.classList.remove('fade-enter'); modal.classList.remove('open'); modal.classList.add('fade-exit'); setTimeout(()=>{ modal.style.display = 'none'; modal.classList.remove('fade-exit'); }, MODAL_FADE_OUT_MS + 10); }catch(e){} };

      // Sticky booking CTA: show a compact booking button when user scrolls away from hero
      try{
        const heroBtn = document.querySelector('.hero-reserve');
        if(heroBtn){
          let sticky = document.getElementById('fineme-sticky-booking');
          if(!sticky){
            sticky = document.createElement('div'); sticky.id = 'fineme-sticky-booking'; sticky.className = 'sticky-booking hidden';
            const txt = document.createElement('div'); txt.style.fontWeight='700'; txt.style.fontSize='14px'; txt.textContent = 'この店舗を予約';
            const cta = document.createElement('a'); cta.className = 'btn btn--primary'; cta.style.padding='8px 12px'; cta.href = heroBtn.href; cta.setAttribute('aria-label','予約へ進む'); cta.textContent = '予約へ進む';
            sticky.appendChild(txt); sticky.appendChild(cta); document.body.appendChild(sticky);
          }
          // sync href when heroBtn changes
          const ctaLink = sticky.querySelector('a'); if(ctaLink) ctaLink.href = heroBtn.href;
          let lastScroll = window.scrollY;
          function updateSticky(){ try{
            const show = window.scrollY > 220 && window.scrollY > lastScroll; // show when scrolled down past hero
            lastScroll = window.scrollY;
            sticky.classList.toggle('visible', show);
            sticky.classList.toggle('hidden', !show);
          }catch(e){}
          }
          window.addEventListener('scroll', throttle(updateSticky, 120));
          // small throttle helper
          function throttle(fn, wait){ let t=null; return function(){ if(t) return; t=setTimeout(()=>{ fn(); t=null; }, wait); }; }
        }
      }catch(e){}

    }catch(e){}
  })();

  // --- Representative review + "口コミをもっと見る" modal ---
  (async function ensureReviewsSnippet(){
    try{
      const host = qs('.store-info'); if(!host) return;
      const mod = await import('./reviews.js');
      const all = [];
      for(const s of publishedServices){ const key = s.id? `local:${s.id}` : (s.slug? `slug:${s.slug}` : null); if(!key) continue; try{ const arr = mod.getReviewsFor(key) || []; for(const r of arr) all.push(Object.assign({serviceName: s.name||''}, r)); }catch(e){} }
      if(!all.length) return;
      all.sort((a,b)=> new Date(b.createdAt||0) - new Date(a.createdAt||0));
      const rep = all[0];
  const snippet = document.createElement('div'); snippet.style.marginTop = '10px';
  const bq = document.createElement('blockquote'); bq.style.margin='0'; bq.style.padding='8px'; bq.style.borderLeft='3px solid #eee'; bq.style.background='#fff';
  const txt = document.createTextNode(escapeHtml(rep.comment || '').slice(0,200) + ((rep.comment && rep.comment.length>200)? '…':''));
  bq.appendChild(txt);
  const footer = document.createElement('footer'); footer.style.marginTop = '6px'; footer.style.fontSize = '13px'; footer.style.color = 'var(--muted)';
  footer.textContent = '— ' + (rep.userName||'ユーザー') + ' ';
  const spanDate = document.createElement('span'); spanDate.style.marginLeft = '8px'; spanDate.style.color = 'var(--muted)'; spanDate.textContent = new Date(rep.createdAt).toLocaleDateString(); footer.appendChild(spanDate);
  bq.appendChild(footer);
  snippet.appendChild(bq);
  const moreWrap = document.createElement('div'); moreWrap.style.marginTop = '6px';
  const moreLink = document.createElement('a'); moreLink.href = '#'; moreLink.className = 'btn btn-ghost'; moreLink.id = 'fineme-open-reviews'; moreLink.textContent = '口コミをもっと見る';
  moreWrap.appendChild(moreLink); snippet.appendChild(moreWrap);
  host.appendChild(snippet);
      // build reviews modal (simple)
      let rmodal = document.getElementById('fineme-reviews-modal');
      if(!rmodal){
        rmodal = document.createElement('div'); rmodal.id = 'fineme-reviews-modal'; rmodal.style.display='none'; rmodal.style.position='fixed'; rmodal.style.inset='0'; rmodal.style.zIndex='1700'; rmodal.style.background='rgba(0,0,0,0.6)';
        const inner = document.createElement('div'); inner.style.maxWidth='840px'; inner.style.margin='60px auto'; inner.style.background='#fff'; inner.style.borderRadius='8px'; inner.style.padding='16px'; inner.style.position='relative'; inner.style.maxHeight='80vh'; inner.style.overflow='auto';
        const btnClose2 = document.createElement('button'); btnClose2.id = 'fineme-close-reviews'; btnClose2.style.position='absolute'; btnClose2.style.top='8px'; btnClose2.style.right='10px'; btnClose2.textContent = '×';
        const h3 = document.createElement('h3'); h3.style.marginTop = '0'; h3.textContent = '口コミ一覧';
        const listDiv = document.createElement('div'); listDiv.id = 'fineme-reviews-list';
        inner.appendChild(btnClose2); inner.appendChild(h3); inner.appendChild(listDiv);
        rmodal.appendChild(inner);
        document.body.appendChild(rmodal);
      }
      const openBtn = document.getElementById('fineme-open-reviews'); const closeBtn = document.getElementById('fineme-close-reviews'); const listHost = document.getElementById('fineme-reviews-list');
    function renderReviews(){ listHost.textContent=''; for(const r of all){ const card = document.createElement('div'); card.style.padding='10px'; card.style.borderBottom='1px solid rgba(0,0,0,0.04)';
      const strong = document.createElement('strong'); strong.textContent = r.userName||'ユーザー';
      const span = document.createElement('span'); span.className = 'muted'; span.style.fontSize = '12px'; span.style.marginLeft = '8px'; span.textContent = new Date(r.createdAt).toLocaleDateString();
      const divc = document.createElement('div'); divc.style.marginTop = '6px'; divc.textContent = r.comment || '';
      card.appendChild(strong); card.appendChild(span); card.appendChild(divc); listHost.appendChild(card); } }
      if(openBtn){ openBtn.addEventListener('click', (ev)=>{ try{ ev.preventDefault(); renderReviews(); rmodal.style.display='block'; }catch(e){} }); }
      if(closeBtn){ closeBtn.addEventListener('click', ()=>{ rmodal.style.display='none'; }); }
      rmodal.addEventListener('click', (ev)=>{ if(ev.target === rmodal) rmodal.style.display='none'; });
    }catch(e){}
  })();

  const grid = qs('#store-services');
  if(publishedServices.length === 0){
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = '公開中のサービスはありません。';
    grid.appendChild(p);
    return;
  }

  // helper to build deep-link to this store + service
  function buildStoreLink({ providerId='', storeId='', serviceId='' }={}){
    const p = `${storeBase()}?providerId=${encodeURIComponent(providerId||'')}`;
    const s = storeId ? `&storeId=${encodeURIComponent(storeId)}` : '';
    const t = '&tab=menu';
    const sid = serviceId ? `&serviceId=${encodeURIComponent(serviceId)}` : '';
    return `${p}${s}${t}${sid}`;
  }

  for(const s of publishedServices){
    const card = document.createElement('a');
    card.className = 'card';
    card.href = buildStoreLink({ providerId: provider.id, storeId: s.storeId, serviceId: s.id });
    const price = Number((s.price!=null?s.price:s.priceMin)||0);
    const placeholder = (location.pathname.includes('/pages/')) ? '..' : '.';
    const imgPlaceholder = `${placeholder}/assets/placeholders/placeholder-default.svg`;
    const imgSrc = (s.photo && s.photo.trim()) ? s.photo : imgPlaceholder;
    // Build card content using DOM APIs to avoid injecting HTML strings
    // image (use safeUrl if available, fallback to placeholder)
    const imgEl = document.createElement('img');
    imgEl.className = 'service-thumb';
    const safeImg = (typeof safeUrl === 'function') ? (safeUrl(imgSrc) || imgPlaceholder) : (imgSrc || imgPlaceholder);
    imgEl.src = safeImg;
    imgEl.alt = s.name || '';
    imgEl.loading = 'lazy';
    imgEl.decoding = 'async';
    imgEl.addEventListener('error', function(){ try{ this.onerror = null; this.src = imgPlaceholder; }catch(e){} });

    const body = document.createElement('div'); body.className = 'card-body';
    const h3 = document.createElement('h3'); h3.className = 'card-title'; h3.textContent = s.name || '';
    const meta1 = document.createElement('p'); meta1.className = 'card-meta'; meta1.textContent = `${labelRegion(s.region)} / ${s.category || ''}`;
    const meta2 = document.createElement('p'); meta2.className = 'card-meta'; meta2.textContent = `¥${price.toLocaleString()}`;
    body.appendChild(h3); body.appendChild(meta1); body.appendChild(meta2);

    card.appendChild(imgEl); card.appendChild(body);
    // expand inline when clicked: intercept navigation
    card.addEventListener('click', (ev)=>{
      try{ ev.preventDefault(); }catch(e){}
      const sid = s.id || s.slug;
      openServiceInline(sid);
      // update URL (shallow) to reflect deep-link
      try{ const u = new URL(location.href); u.searchParams.set('tab','menu'); u.searchParams.set('serviceId', sid); history.replaceState({}, '', u.toString()); }catch(e){}
    });
    grid.appendChild(card);
  }

  // when a serviceId is present in query, open the menu tab and expand it
  async function openServiceInline(serviceId){
    if(!serviceId) return;
    // ensure menu tab visible
    activateTab('menu');
    const host = qs('#store-services');
    // find the corresponding service object
    const svc = publishedServices.find(x => String(x.id) === String(serviceId) || String(x.slug||'') === String(serviceId));
  if(!svc) return;
  const detailHost = qs('#service-detail-host');
  // remove existing detail
  if(detailHost) detailHost.textContent = '';
    const price = Number((svc.price!=null?svc.price:svc.priceMin)||0);
    const imgPlaceholder = (location.pathname.includes('/pages/')) ? '..' : '.';
    const imgSrc = (svc.photo && svc.photo.trim()) ? svc.photo : `${imgPlaceholder}/assets/placeholders/placeholder-default.svg`;

    // ensure detail styles (gallery / overlay / access block)
    (function ensureDetailStyles(){
      if(document.getElementById('fineme-detail-styles')) return;
      const css = `
        :root{ --detail-bg:#f6f7f8; }
        .detail-hero{ display:block; width:100%; max-width:960px; margin:0 auto 18px auto; }
        .detail-hero img{ width:100%; height:auto; border-radius:8px; display:block; }
        .detail-gallery{ display:flex; gap:8px; overflow-x:auto; padding:6px 0; }
        .detail-thumb{ flex:0 0 auto; width:220px; height:140px; object-fit:cover; border-radius:8px; cursor:pointer; border:1px solid rgba(0,0,0,0.06); }
        .detail-access{ background:linear-gradient(90deg, rgba(14,55,96,0.02), rgba(14,55,96,0.01)); padding:12px; border-radius:8px; margin:8px 0; }
        .detail-access p{ margin:4px 0; }
        .gallery-overlay{ position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0.75); z-index:1200; }
        .gallery-overlay img{ max-width:94%; max-height:86%; border-radius:8px; box-shadow:0 8px 32px rgba(0,0,0,0.6); }
        .gallery-overlay .close{ position:absolute; top:18px; right:20px; background:transparent; color:#fff; border:none; font-size:28px; cursor:pointer; }

        /* Section styling: card-like blocks for clarity */
        .detail-section{ background:#fff; padding:16px; border-radius:8px; box-shadow:0 4px 12px rgba(20,30,40,0.04); margin:18px 0; border:1px solid rgba(0,0,0,0.04); }
        .detail-section h3, .detail-section h4{ margin:0 0 8px 0; font-size:16px; }
        .detail-container{ display:block; max-width:960px; margin:0 auto; padding:8px; }
        .svc-options-block > div{ background:transparent; padding:8px 0; }
        .svc-options-block label{ display:block; padding:8px 0; border-bottom:1px dashed rgba(0,0,0,0.03); }
        .svc-options-block label:last-child{ border-bottom:none; }
        .svc-options-block input[type="checkbox"]{ margin-top:6px; margin-right:10px; }
        .svc-options-block .name{ font-weight:700; margin-bottom:4px; }
        .svc-options-block .meta{ color:var(--muted); font-size:13px }
        .btn--primary{ background:linear-gradient(90deg,var(--primary), #0e3760); color:#fff; border:none; padding:10px 14px; border-radius:6px; box-shadow:var(--shadow-sm); }
        @media(max-width:720px){ .detail-section{ padding:12px; } .detail-thumb{ width:140px;height:90px } }
      `;
      const s = document.createElement('style'); s.id = 'fineme-detail-styles'; s.appendChild(document.createTextNode(css)); document.head.appendChild(s);
    })();

    const providerAddress = prof.address || '';
    const providerPhone = prof.phone || '';
    const providerBusinessHours = prof.businessHours || '';
    const providerWebsite = prof.website || '';
    const mapLink = providerAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(providerAddress)}` : '';

    // sanitize external links
    const safeMap = (typeof safeUrl === 'function') ? (safeUrl(mapLink) || '') : (mapLink || '');
    const safeSite = (typeof safeUrl === 'function') ? (safeUrl(providerWebsite) || '') : (providerWebsite || '');

  const div = document.createElement('div');
  div.className = 'card';
  div.style.padding = '16px';
    // Accessibility: mark this region and make it focusable so screen readers announce it when opened
    div.setAttribute('role','region');
    div.setAttribute('aria-live','polite');
    div.setAttribute('aria-label', `サービス詳細: ${svc.name}`);
    div.tabIndex = -1;

    // Build service detail panel using DOM APIs (avoid innerHTML)
    div.textContent = '';
    const container = document.createElement('div'); container.style.display = 'flex'; container.style.flexDirection = 'column'; container.style.gap = '12px';

    const detailImg = document.createElement('img');
    const safeDetailImg = (typeof safeUrl === 'function') ? (safeUrl(imgSrc) || imgPlaceholder) : (imgSrc || imgPlaceholder);
    detailImg.src = safeDetailImg;
    detailImg.alt = svc.name || '';
    detailImg.style.width = '100%'; detailImg.style.maxWidth = '640px'; detailImg.style.height = 'auto'; detailImg.style.borderRadius = '8px'; detailImg.style.objectFit = 'cover';
    container.appendChild(detailImg);

    const infoWrap = document.createElement('div');
    const h3 = document.createElement('h3'); h3.style.margin = '0'; h3.textContent = svc.name || '';
    const catchcopy = document.createElement('p'); catchcopy.className = 'muted'; catchcopy.textContent = svc.catchcopy || '';
    const priceP = document.createElement('p'); priceP.style.marginTop = '8px'; priceP.style.fontWeight = '700'; priceP.textContent = `料金：¥${price.toLocaleString()}`;
    infoWrap.appendChild(h3); infoWrap.appendChild(catchcopy); infoWrap.appendChild(priceP);
    if(svc.description){ const desc = document.createElement('p'); desc.id = 'svc-description'; desc.style.marginTop = '8px'; desc.textContent = svc.description || ''; infoWrap.appendChild(desc); }

    const optionsBlock = document.createElement('div'); optionsBlock.className = 'svc-options-block';
    infoWrap.appendChild(optionsBlock);

    if(providerAddress || providerPhone || providerBusinessHours || providerWebsite){
      const accessDiv = document.createElement('div'); accessDiv.className = 'detail-access'; accessDiv.style.marginTop = '12px';
      if(providerAddress){ const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = '住所'; p.appendChild(strong); p.appendChild(document.createTextNode('： ' + (providerAddress || ''))); if(safeMap){ const a = document.createElement('a'); a.href = safeMap; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '地図を開く'; p.appendChild(document.createTextNode(' ')); p.appendChild(a); } accessDiv.appendChild(p); }
      if(providerPhone){ const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = '電話'; p.appendChild(strong); p.appendChild(document.createTextNode('： ')); const a = document.createElement('a'); a.href = `tel:${encodeURIComponent(providerPhone)}`; a.textContent = providerPhone; p.appendChild(a); accessDiv.appendChild(p); }
      if(providerBusinessHours){ const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = '営業時間'; p.appendChild(strong); p.appendChild(document.createTextNode('： ' + providerBusinessHours)); accessDiv.appendChild(p); }
      if(safeSite){ const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = 'Web'; p.appendChild(strong); p.appendChild(document.createTextNode('： ')); const a = document.createElement('a'); a.href = safeSite; a.target = '_blank'; a.rel = 'noopener'; a.textContent = safeSite; p.appendChild(a); accessDiv.appendChild(p); }
      infoWrap.appendChild(accessDiv);
    }

    // Reserve link
    const reserveWrap = document.createElement('div'); reserveWrap.style.marginTop = '12px';
    const reserveLink = document.createElement('a'); reserveLink.id = 'svc-reserve-btn'; reserveLink.className = 'btn btn--primary';
    reserveLink.href = svc.slug ? `./booking/${encodeURIComponent(svc.slug)}?origin=detail` : (location.pathname && location.pathname.indexOf('/pages/') !== -1 ? `./user/schedule.html?serviceId=${encodeURIComponent(svc.id||'')}&origin=detail` : `./pages/user/schedule.html?serviceId=${encodeURIComponent(svc.id||'')}&origin=detail`);
    reserveLink.setAttribute('aria-label', `予約へ進む - ${svc.name || ''}`);
    reserveLink.textContent = '予約へ進む';
    reserveWrap.appendChild(reserveLink);
    infoWrap.appendChild(reserveWrap);

    container.appendChild(infoWrap);
    div.appendChild(container);

    // --- Hero slider: if we have multiple gallery images, replace single cover with simple slider ---
    try{
      const coverEl = qs('.store-cover');
      if(coverEl){
        // prefer galleryImgs if available, else fallback to coverImg
        const imgs = (galleryImgs && galleryImgs.length) ? galleryImgs : (coverImg ? [coverImg] : []);
        if(imgs.length > 1){
          // inject slider styles
          if(!document.getElementById('fineme-hero-styles')){
            const css = `
              .store-cover-wrap{ position:relative; width:100%; max-width:1200px; margin-bottom:12px }
              .store-cover-wrap img{ width:100%; height:auto; display:block; border-radius:8px }
              .cover-control{ position:absolute; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.35); color:#fff; border:none; padding:8px 10px; border-radius:6px; cursor:pointer }
              .cover-prev{ left:12px }
              .cover-next{ right:12px }
              .cover-dots{ position:absolute; left:50%; transform:translateX(-50%); bottom:10px; display:flex; gap:6px }
              .cover-dot{ width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.6);cursor:pointer }
              .cover-dot.is-active{ background:var(--primary); }
            `;
            const s = document.createElement('style'); s.id = 'fineme-hero-styles'; s.appendChild(document.createTextNode(css)); document.head.appendChild(s);
          }
          const wrap = document.createElement('div'); wrap.className = 'store-cover-wrap';
          const img = document.createElement('img'); img.className = 'store-cover-slide'; img.alt = storeName; img.src = imgs[0]; img.loading = 'eager';
          // optional srcset support if profile provides variants
          if(prof.coverSrcset && typeof prof.coverSrcset === 'string'){ img.srcset = prof.coverSrcset; }
          wrap.appendChild(img);
          const prev = document.createElement('button'); prev.className = 'cover-control cover-prev'; prev.textContent = '‹'; wrap.appendChild(prev);
          const next = document.createElement('button'); next.className = 'cover-control cover-next'; next.textContent = '›'; wrap.appendChild(next);
          const dots = document.createElement('div'); dots.className = 'cover-dots'; imgs.forEach((u,i)=>{ const d = document.createElement('button'); d.className='cover-dot'; if(i===0) d.classList.add('is-active'); d.addEventListener('click', ()=> showHero(i)); dots.appendChild(d); }); wrap.appendChild(dots);
          coverEl.parentNode.replaceChild(wrap, coverEl);
          let cur = 0; let adv = null;
          function showHero(i){ cur = (i+imgs.length)%imgs.length; img.src = imgs[cur]; if(prof.coverSrcset && typeof prof.coverSrcset === 'string'){ img.srcset = prof.coverSrcset; } const ds = dots.querySelectorAll('.cover-dot'); ds.forEach((x,idx)=> x.classList.toggle('is-active', idx===cur)); }
          prev.addEventListener('click', ()=>{ showHero(cur-1); resetAuto(); });
          next.addEventListener('click', ()=>{ showHero(cur+1); resetAuto(); });
          // auto advance every 6s
          function startAuto(){ adv = setInterval(()=>{ showHero(cur+1); }, 6000); }
          function resetAuto(){ try{ if(adv) clearInterval(adv); startAuto(); }catch(e){} }
          startAuto();
          // pause on hover
          wrap.addEventListener('mouseenter', ()=>{ try{ if(adv) clearInterval(adv); }catch(e){} });
          wrap.addEventListener('mouseleave', ()=>{ startAuto(); });
        } else if(imgs.length === 1){
          // ensure srcset if available
          if(prof.coverSrcset && typeof prof.coverSrcset === 'string'){ coverEl.srcset = prof.coverSrcset; }
          // LCP: force eager for first image
          coverEl.loading = 'eager';
        }
      }
    }catch(e){}
      // Append detail and then inject options UI (so we can wire handlers)
      detailHost.appendChild(div);

      try{
        const allOpts = loadOptions();
        const svcOptIds = Array.isArray(svc.optionIds) ? svc.optionIds : [];
        const svcOpts = svcOptIds.map(id => allOpts.find(o=> String(o.id) === String(id))).filter(Boolean);
        if(svcOpts.length){
          const optsContainer = document.createElement('div');
          optsContainer.style.marginTop = '12px';
          const section = document.createElement('section');
          section.className = 'detail-section';
          section.setAttribute('aria-labelledby','opts-title-inline');
          const h4 = document.createElement('h4'); h4.id = 'opts-title-inline'; h4.style.margin = '8px 0 4px'; h4.textContent = 'オプション';
          section.appendChild(h4);
          for(const o of svcOpts){
            const label = document.createElement('label'); label.className = 'svc-option-card'; label.style.display = 'flex'; label.style.gap = '12px'; label.style.alignItems = 'flex-start'; label.style.padding = '10px'; label.style.borderRadius = '8px';
            const input = document.createElement('input'); input.type = 'checkbox'; input.className = 'svc-option-checkbox'; input.value = String(o.id);
            const inner = document.createElement('div'); inner.style.flex = '1';
            const row = document.createElement('div'); row.style.display = 'flex'; row.style.justifyContent = 'space-between'; row.style.alignItems = 'center'; row.style.gap = '12px';
            const nameDiv = document.createElement('div'); nameDiv.style.fontWeight = '700'; nameDiv.textContent = o.name || '';
            const priceDiv = document.createElement('div'); priceDiv.style.fontWeight = '700'; priceDiv.style.color = 'var(--primary)'; priceDiv.textContent = o.price ? '¥' + Number(o.price).toLocaleString() : '';
            row.appendChild(nameDiv); row.appendChild(priceDiv);
            const descDiv = document.createElement('div'); descDiv.style.color = 'var(--muted)'; descDiv.style.fontSize = '13px'; descDiv.style.marginTop = '6px'; descDiv.textContent = o.description ? String(o.description) : '';
            inner.appendChild(row); inner.appendChild(descDiv);
            label.appendChild(input); label.appendChild(inner);
            section.appendChild(label);
          }
          optsContainer.appendChild(section);
          // place options under the photo (single-column layout)
          const optHost = div.querySelector('.svc-options-block');
          if(optHost) {
            optsContainer.style.maxWidth = '100%';
            optHost.appendChild(optsContainer);
          }

          // wire reservation href update
          const reserveBtn = detailHost.querySelector('#svc-reserve-btn');
          function updateReserveHref(){
            try{
              if(!reserveBtn) return;
              const selected = Array.from(optsContainer.querySelectorAll('.svc-option-checkbox:checked')).map(i=> i.value).filter(Boolean).join(',');
              const href = reserveBtn.getAttribute('href') || '';
              const u = new URL(href, location.href);
              if(selected) u.searchParams.set('optionIds', selected); else u.searchParams.delete('optionIds');
              reserveBtn.setAttribute('href', u.pathname + u.search);
            }catch(e){ }
          }
          optsContainer.addEventListener('change', updateReserveHref);
          // initialize
          updateReserveHref();
        }
      }catch(e){ /* ignore */ }

    // Ensure there's a polite live region to announce the opened service for screen readers
    try{
      let announcer = document.getElementById('store-live-announcer');
      if(!announcer){
        announcer = document.createElement('div');
        announcer.id = 'store-live-announcer';
        announcer.setAttribute('role','status');
        announcer.setAttribute('aria-live','polite');
        announcer.className = 'visually-hidden';
        root.appendChild(announcer);
      }
      announcer.textContent = `サービス「${svc.name}」を開きました。`;
      // Clear announcer after a short time to allow re-announcement later
      setTimeout(()=>{ try{ announcer.textContent = ''; }catch{} }, 2000);
    }catch(e){}

  // move focus to the newly inserted detail region so screen readers announce it
  try{ div.focus(); }catch(e){}

    // add to view history (async, best-effort)
    try{
      const modH = await import('./history.js');
      const href = location.pathname + location.search;
      const snap = { href, name: svc.name, region: svc.region, category: svc.category, priceFrom: price, image: imgSrc, providerName: provider.profile?.storeName || provider.name || '', providerId: provider.id };
      if(modH && typeof modH.addHistory === 'function') modH.addHistory(snap);
    }catch(e){ /* ignore */ }

    // Gallery
      if(Array.isArray(svc.gallery) && svc.gallery.length){
      const galWrap = document.createElement('div');
      galWrap.className = 'stack';
      const h3 = document.createElement('h3'); h3.style.margin = '0'; h3.textContent = 'ギャラリー'; galWrap.appendChild(h3);
      const gallery = document.createElement('div'); gallery.className = 'detail-gallery';
      for(const u of svc.gallery){ const img = document.createElement('img'); img.className='detail-thumb'; img.src = u; img.setAttribute('data-full', u); img.alt = svc.name || 'gallery'; gallery.appendChild(img); }
      galWrap.appendChild(gallery);
      detailHost.appendChild(galWrap);

      // overlay creation
      let overlay = document.getElementById('gallery-overlay-store');
      if(!overlay){
        overlay = document.createElement('div'); overlay.id = 'gallery-overlay-store'; overlay.className = 'gallery-overlay';
        const btnClose = document.createElement('button'); btnClose.className = 'close'; btnClose.setAttribute('aria-label','閉じる'); btnClose.textContent = '×';
        const imgEl = document.createElement('img'); imgEl.src = ''; imgEl.alt = 'ギャラリー画像';
        overlay.appendChild(btnClose); overlay.appendChild(imgEl);
        document.body.appendChild(overlay);
      }
      gallery.querySelectorAll('.detail-thumb').forEach(t => t.addEventListener('click', ()=>{
        const src = t.getAttribute('data-full') || t.src; const img = overlay.querySelector('img'); img.src = src; overlay.style.display = 'flex';
      }));
      overlay.addEventListener('click', (ev)=>{ if(ev.target === overlay || ev.target.classList && ev.target.classList.contains('close')) overlay.style.display = 'none'; });
    }

    // style reservation button (important to win against global CSS)
    try{
      const invBtn = detailHost.querySelector('#svc-reserve-btn');
      if(invBtn){ invBtn.style.setProperty('background', 'linear-gradient(90deg,var(--primary), #0e3760)', 'important'); invBtn.style.setProperty('color', '#fff', 'important'); invBtn.style.setProperty('border', 'none', 'important'); invBtn.style.setProperty('box-shadow', 'var(--shadow-sm)', 'important'); }
    }catch(e){}

    // Reviews: render below if reviews module available
    try{
      const mod = await import('./reviews.js');
      const serviceKey = svc.id ? `local:${svc.id}` : (svc.slug ? `slug:${svc.slug}` : '');
      const sum = mod.ratingSummary(serviceKey);
      const revSection = document.createElement('section'); revSection.className='stack'; revSection.style.marginTop='12px';
      const h3 = document.createElement('h3'); h3.style.margin = '0'; h3.textContent = 'レビュー';
      const clusterDiv = document.createElement('div'); clusterDiv.className = 'cluster'; clusterDiv.style.gap = '8px'; clusterDiv.style.alignItems = 'center';
      const strong = document.createElement('strong'); strong.textContent = '平均';
      const badgeSpan = document.createElement('span'); badgeSpan.className = 'badge'; badgeSpan.textContent = `${sum.avg} ★ / ${sum.count} 件`;
      clusterDiv.appendChild(strong); clusterDiv.appendChild(badgeSpan);
      const listHost = document.createElement('div'); listHost.id = 'store-svc-review-list';
      const infoCard = document.createElement('div'); infoCard.className = 'card'; infoCard.style.padding = '12px';
  const p = document.createElement('p'); p.className = 'muted'; p.style.margin = '0';
  p.appendChild(document.createTextNode('レビューの投稿は「マイページ › 予約履歴」から行えます。'));
  p.appendChild(document.createElement('br'));
  p.appendChild(document.createTextNode('予約したサービスで、予約日時を過ぎたもののみ投稿可能です。'));
  const a = document.createElement('a'); a.className = 'btn btn-ghost'; a.href = './pages/mypage/reservations.html'; a.style.marginLeft = '8px'; a.textContent = '予約履歴を開く';
  p.appendChild(a);
      infoCard.appendChild(p);
      revSection.appendChild(h3); revSection.appendChild(clusterDiv); revSection.appendChild(listHost); revSection.appendChild(infoCard);
      detailHost.appendChild(revSection);
      const getReviewsFor = mod.getReviewsFor || function(){ return []; };
      function escape(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
      function star(n){ return '★'.repeat(n) + '☆'.repeat(5-n); }
      function renderReviews(){
        const arr = getReviewsFor(serviceKey).filter(r=> r && r.visible !== false);
        listHost.textContent = '';
        if(!arr.length){ const p = document.createElement('p'); p.className='muted'; p.textContent='まだレビューはありません。'; listHost.appendChild(p); return; }
        const frag = document.createDocumentFragment();
        for(const r of arr.sort((a,b)=> new Date(b.createdAt||0)-new Date(a.createdAt||0))){
          const item = document.createElement('div'); item.className='card'; item.style.padding='12px';
          const top = document.createElement('div'); top.className = 'cluster'; top.style.justifyContent = 'space-between'; top.style.alignItems = 'center'; top.style.gap = '8px';
          const left = document.createElement('div');
          const strongName = document.createElement('strong'); strongName.textContent = r.userName || 'ユーザー';
          const dateSpan = document.createElement('span'); dateSpan.className = 'muted'; dateSpan.style.fontSize = '12px'; dateSpan.style.marginLeft = '8px'; dateSpan.textContent = new Date(r.createdAt).toLocaleDateString();
          left.appendChild(strongName); left.appendChild(dateSpan);
          const ratingDiv = document.createElement('div'); ratingDiv.setAttribute('aria-label','評価'); ratingDiv.textContent = star(Number(r.rating)||0);
          top.appendChild(left); top.appendChild(ratingDiv);
          item.appendChild(top);
          if(r.comment){ const p = document.createElement('p'); p.style.margin = '8px 0 0'; p.textContent = r.comment; item.appendChild(p); }
          const low = document.createElement('div'); low.className = 'cluster'; low.style.justifyContent = 'flex-end'; low.style.gap = '8px'; low.style.marginTop = '8px';
          const flagBtn = document.createElement('button'); flagBtn.type = 'button'; flagBtn.className = 'btn btn-ghost btn-flag'; flagBtn.setAttribute('data-id', r.id); flagBtn.textContent = '通報';
          low.appendChild(flagBtn); item.appendChild(low);
          frag.appendChild(item);
        }
        listHost.appendChild(frag);
      }
      renderReviews();
      window.addEventListener('storage', (ev)=>{ try{ if(ev.key === 'glowup:reviews') renderReviews(); }catch{} });
      // delegation: handle flag (通報)
      detailHost.addEventListener('click', (e)=>{
        const t = e.target;
        if(t && t.classList && t.classList.contains('btn-flag')){
          const id = t.getAttribute('data-id'); if(!id) return;
          const reason = window.prompt('通報理由を入力してください（任意）','');
          try{
            if(typeof mod.flagReview === 'function') mod.flagReview(id, reason||'');
          }catch(err){ console.warn('flag failed', err); }
          renderReviews();
        }
      });
    }catch(e){ /* reviews optional */ }

    try{
      // Respect users' reduced-motion preference
      const prefersReduced = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      div.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    }catch(e){}
  }

  // parse incoming query to auto-open and set initial tab
  try{
    const q = params();
    if(q.tab === 'menu' && q.serviceId){
      openServiceInline(q.serviceId);
      activateTab('menu');
    } else if(q.tab){
      activateTab(q.tab);
    } else {
      activateTab('info');
    }
  }catch(e){}

  // Staff list

  // --- Hero effects: parallax, video support, auto-zoom ---
  (function initHeroEffects(){
    try{
      // Respect reduced motion preference
      const reduced = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

      const hero = document.querySelector('.store-hero-fullbleed') || document.querySelector('.store-cover-wrap') || document.querySelector('.store-cover') || document.querySelector('.detail-hero');
      if(!hero) return;

      // find candidate media element (img or video)
      let media = hero.querySelector('video, img.store-cover, img.store-cover-slide, img.cover, img');
      if(!media) return;

      // helper to detect video URL
      function looksLikeVideo(url){ return typeof url === 'string' && /\.(mp4|webm)(\?|$)/i.test(url); }

      // If the image src points to a video, replace with a looping muted video element
      const src = media.tagName === 'IMG' ? (media.getAttribute('data-video') || media.src || '') : (media.tagName === 'VIDEO' ? (media.currentSrc || media.src) : '');
      let videoEl = media.tagName === 'VIDEO' ? media : null;
      if(looksLikeVideo(src) || (media.tagName === 'IMG' && media.dataset && media.dataset.video)){
        try{
          const videoUrl = media.dataset.video || src;
          // create video element
          videoEl = document.createElement('video');
          videoEl.className = 'cover-video cover-parallax';
          videoEl.autoplay = true;
          videoEl.muted = true;
          videoEl.loop = true;
          videoEl.playsInline = true;
          videoEl.preload = 'metadata';
          // poster fallback
          if(media.tagName === 'IMG' && media.src) videoEl.poster = media.src;
          // create source
          const s = document.createElement('source');
          s.src = videoUrl;
          // infer type
          if(/\.webm(\?|$)/i.test(videoUrl)) s.type = 'video/webm';
          else if(/\.mp4(\?|$)/i.test(videoUrl)) s.type = 'video/mp4';
          videoEl.appendChild(s);
          // replace media in DOM (keep semantic img as poster if needed)
          media.style.display = 'none';
          hero.insertBefore(videoEl, media.nextSibling);
          // attempt to play; if autoplay blocked, leave poster visible
          const p = videoEl.play();
          if(p && p.catch) p.catch(()=>{ /* autoplay blocked; keep poster (img) visible */ });
          media = videoEl;
        }catch(e){}
      }

      // Enable auto-zoom unless reduced motion requested
      const AUTO_ZOOM = !reduced;
      if(AUTO_ZOOM) hero.classList.add('is-zooming');

      // parallax + zoom via rAF
      const intensity = 18; // px max translate
      const zoomScale = AUTO_ZOOM ? 1.06 : 1.0;
      let latestScroll = 0, ticking = false;

      function update(){
        ticking = false;
        try{
          const rect = hero.getBoundingClientRect();
          const vh = window.innerHeight || document.documentElement.clientHeight;
          // compute normalized offset from center (-1..1)
          const center = rect.top + rect.height/2;
          const norm = Math.max(-1, Math.min(1, (center - vh/2) / (vh/2)));
          const translate = -norm * intensity; // inverse so content moves slightly opposite to scroll
          // apply transform combining translate and scale
          if(media && media.style){
            media.style.transform = `translateY(${translate}px) scale(${zoomScale})`;
            media.style.willChange = 'transform';
          }
        }catch(e){}
      }

      function onScroll(){ latestScroll = window.scrollY; if(!ticking){ ticking = true; requestAnimationFrame(update); } }

      // initial update
      update();
      // wire events
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      // also observe hero size changes
      try{ if(window.ResizeObserver){ const ro = new ResizeObserver(()=> onScroll()); ro.observe(hero); } }catch(e){}

    }catch(e){ console.debug('hero effects init failed', e); }
  })();
  const staffWrap = qs('#store-staff');
  const staffList = Array.isArray(prof.staffs) ? prof.staffs : [];
  if(staffList.length === 0){
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'スタッフ情報は準備中です。';
    staffWrap.appendChild(p);
  } else {
    for(const st of staffList){
      const card = document.createElement('div'); card.className = 'staff-card';
      const href = `./staff.html?providerId=${encodeURIComponent(provider.id)}&staffId=${encodeURIComponent(st.id)}`;
      const photo = st.photo && st.photo.trim() ? st.photo : ((location.pathname.includes('/pages/')) ? '../assets/placeholders/placeholder-default.svg' : './assets/placeholders/placeholder-default.svg');
      const years = (st.experienceYear && Number.isFinite(Number(st.experienceYear))) ? Math.max(0, new Date().getFullYear() - Number(st.experienceYear)) : null;
      const img = document.createElement('img'); img.className = 'staff-avatar'; img.src = photo; img.alt = escapeHtml(st.name||'スタッフ');
      const wrapper = document.createElement('div');
      const pName = document.createElement('p'); pName.className = 'staff-name';
      const aName = document.createElement('a'); aName.href = href; aName.textContent = st.name || '';
      pName.appendChild(aName);
      wrapper.appendChild(pName);
      if(st.role || years!=null){
        const roleRow = document.createElement('div'); roleRow.className = 'staff-role-row';
        if(st.role){ const pRole = document.createElement('p'); pRole.className = 'staff-role'; pRole.textContent = st.role; roleRow.appendChild(pRole); }
        if(years!=null){ const sp = document.createElement('span'); sp.className = 'staff-exp'; sp.textContent = `(${years}年)`; roleRow.appendChild(sp); }
        wrapper.appendChild(roleRow);
      }
      if(st.oneLiner){ const pBio = document.createElement('p'); pBio.className = 'staff-bio'; pBio.textContent = st.oneLiner; wrapper.appendChild(pBio); }
      card.appendChild(img); card.appendChild(wrapper); staffWrap.appendChild(card);
    }
  }
})();
