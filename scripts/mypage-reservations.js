// Render user's booking requests in My Page (reservations)
// @ts-nocheck
import { getUserSession } from './user-auth.js';
import { addReview } from './reviews.js';
import { isNicknameAllowed } from './validation.js';

const REQUESTS_KEY = 'glowup:requests';
const SERVICES_KEY = 'glowup:services';
const PROVIDERS_KEY = 'glowup:providers';
const SLOTS_KEY = 'glowup:slots';

function qs(s, root=document){ return root.querySelector(s); }

// Date helpers (local time)
function startOfDayLocal(dateStr){
  if(!dateStr) return null;
  if(dateStr instanceof Date){
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate(), 0, 0, 0, 0);
  }
  const s = String(dateStr).trim();
  // Match common patterns: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, or ISO with time
  let m = s.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
  if(m){
    const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
    if(y && mo && d){ return new Date(y, mo-1, d, 0, 0, 0, 0); }
  }
  // Compact form YYYYMMDD
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if(m){
    const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
    return new Date(y, mo-1, d, 0, 0, 0, 0);
  }
  // Fallback: rely on Date parsing then normalize to local start of day
  const d = new Date(s);
  if(!isNaN(d.getTime())){
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }
  return null;
}
function formatYMD(dt){ if(!(dt instanceof Date)) return ''; const y=dt.getFullYear(); const m=String(dt.getMonth()+1).padStart(2,'0'); const d=String(dt.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }
function cancellationCutoff(r){
  // cutoff is the start of reservation day (i.e., previous day 23:59:59まで)
  const sod = startOfDayLocal(r?.date);
  return sod;
}
function canCancelRequest(r){
  if(!r) return false;
  // Allow user to cancel even if approved, until cutoff; block only certain final states
  if(['rejected','expired','cancelled'].includes(r.status)) return false;
  const cutoff = cancellationCutoff(r);
  if(!cutoff) return true; // fail-open to avoid誤検知
  return new Date() < cutoff;
}

// Review eligibility: allow only after reservation date has passed (end of day)
function parseHHMM(hhmm){
  const m = String(hhmm||'').trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if(!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}
function canReviewRequest(r){
  if(!r) return false;
  // Only for approved reservations (実際に施術が成立したもの)
  if(r.status !== 'approved') return false;
  const sod = startOfDayLocal(r?.date);
  if(!sod) return false;
  const end = parseHHMM(r.end);
  const start = parseHHMM(r.start);
  let target = null;
  if(end){
    target = new Date(sod.getFullYear(), sod.getMonth(), sod.getDate(), end.h, end.m, 0, 0);
  } else if(start){
    // 終了時間がなければ開始時刻を基準に
    target = new Date(sod.getFullYear(), sod.getMonth(), sod.getDate(), start.h, start.m, 0, 0);
  } else {
    // 時刻情報が無ければ当日終了を基準
    target = new Date(sod.getFullYear(), sod.getMonth(), sod.getDate(), 23, 59, 59, 999);
  }
  return new Date() > target;
}

function load(key){
  try{ const raw = localStorage.getItem(key); const arr = raw? JSON.parse(raw): []; return Array.isArray(arr)? arr: []; }catch{ return []; }
}

function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

function escapeHtml(str){
  return String(str ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

// compute correct relative path to store.html depending on current page location
function storeBase(){
  try{
    if(location.pathname && location.pathname.indexOf('/pages/') !== -1) return './store.html';
    return './pages/store.html';
  }catch{ return './pages/store.html'; }
}

function statusBadge(status){
  // Treat undefined/empty status as 'pending' for backward compatibility
  const s = status || 'pending';
  const map = { pending: ['保留', 'badge--pending'], approved: ['承認','badge--approved'], rejected: ['辞退','badge--rejected'], expired: ['期限切れ','badge--neutral'], cancelled: ['キャンセル', 'badge--neutral'] };
  const pair = map[s] || [String(s), 'badge--neutral'];
  const label = pair[0];
  const cls = pair[1];
  // Return structured data so callers can create elements safely (avoid returning raw HTML)
  return { label, cls };
}

function cancelRequest(reqId){
  const session = getUserSession(); if(!session) return { ok:false, msg:'ログインが必要です。' };
  const all = load(REQUESTS_KEY);
  const sLogin = (session.loginId || '').toLowerCase();
  const idx = all.findIndex(r => {
    if(r.id !== reqId) return false;
    const byId = r.userId && session?.id && r.userId === session.id;
    const byLogin = r.userLoginId && sLogin && r.userLoginId.toLowerCase() === sLogin;
    const byContact = r.contact && sLogin && String(r.contact).toLowerCase() === sLogin;
    return byId || byLogin || byContact;
  });
  if(idx === -1) return { ok:false, msg:'対象のリクエストが見つかりません。' };
  const r = all[idx];
  // Treat undefined status as pending (backward compatibility). Block only finalized states except approved.
  if(['rejected','expired','cancelled'].includes(r.status)) return { ok:false, msg:'この予約はキャンセルできません。' };
  // Check cancellation cutoff (day before 23:59)
  const cutoff = cancellationCutoff(r);
  if(!cutoff){
    // Fail-open: 日付が読めないデータはキャンセルを許可
    r.status = 'cancelled';
    r.userCanceledAt = new Date().toISOString();
    save(REQUESTS_KEY, all);
    return { ok:true, msg:'予約リクエストをキャンセルしました。' };
  }
  if(new Date() >= cutoff){
    const deadline = new Date(cutoff.getTime() - 60*1000); // 前日23:59
    return { ok:false, msg:`キャンセル期限（${formatYMD(deadline)} 23:59）を過ぎています。` };
  }
  const wasApproved = r.status === 'approved';
  r.status = 'cancelled';
  r.userCanceledAt = new Date().toISOString();
  save(REQUESTS_KEY, all);
  // If it was approved, reopen the slot for booking
  if(wasApproved){
    const slots = load(SLOTS_KEY);
    const sIdx = slots.findIndex(s=> s.id === r.slotId);
    if(sIdx !== -1){
      slots[sIdx].open = true;
      save(SLOTS_KEY, slots);
    }
  }
  return { ok:true, msg:'予約リクエストをキャンセルしました。' };
}

function renderList(){
  const session = getUserSession();
  const tbody = qs('#user-requests-tbody');
  if(!tbody) return;
  const reqs = load(REQUESTS_KEY);
  const services = load(SERVICES_KEY);
  const providers = load(PROVIDERS_KEY);

  const mine = reqs.filter(r => {
    const byId = r.userId && session?.id && r.userId === session.id;
    const byLogin = !byId && r.userLoginId && session?.loginId && (r.userLoginId.toLowerCase() === session.loginId.toLowerCase());
    const byContact = !byId && !byLogin && r.contact && session?.loginId && (String(r.contact).toLowerCase() === session.loginId.toLowerCase());
    return byId || byLogin || byContact;
  }).sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''));

  if(mine.length === 0){
    // Build a safe no-results row using DOM APIs
    tbody.textContent = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '9');
    const p = document.createElement('p');
    p.className = 'muted';
    p.style.margin = '12px 0';
    p.textContent = '予約リクエストはまだありません。';
    td.appendChild(p);
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  // Build rows using DOM APIs to avoid injecting HTML strings.
  tbody.textContent = '';
  const frag = document.createDocumentFragment();
  for(const r of mine){
    const svc = services.find(s=> s.id === r.serviceId);
    const prov = providers.find(p=> p.id === r.providerId);
    const svcName = svc?.name || '(不明なサービス)';
    const store = prov?.profile?.storeName || prov?.name || '';
    const time = `${r.start || ''} - ${r.end || ''}`;
    const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : '';

    const tr = document.createElement('tr');

    const tdCreated = document.createElement('td'); tdCreated.setAttribute('data-label','送信日時'); tdCreated.textContent = created; tr.appendChild(tdCreated);

    const tdService = document.createElement('td'); tdService.setAttribute('data-label','サービス');
    if(svc){
      const a = document.createElement('a'); a.className = 'svc-link';
      const href = `${storeBase()}?providerId=${encodeURIComponent(svc.providerId||'')}${svc.storeId? `&storeId=${encodeURIComponent(svc.storeId)}` : ''}&tab=menu&serviceId=${encodeURIComponent(svc.id)}`;
      a.href = href; a.textContent = svcName; tdService.appendChild(a);
    } else {
      tdService.textContent = svcName;
    }
    tr.appendChild(tdService);

    const tdDate = document.createElement('td'); tdDate.setAttribute('data-label','日付'); tdDate.textContent = r.date || ''; tr.appendChild(tdDate);

    const tdTime = document.createElement('td'); tdTime.setAttribute('data-label','時間'); tdTime.textContent = time; tr.appendChild(tdTime);

    const tdStatus = document.createElement('td'); tdStatus.setAttribute('data-label','ステータス');
    const sb = statusBadge(r.status); const span = document.createElement('span'); span.className = `badge ${sb.cls}`; span.textContent = sb.label; tdStatus.appendChild(span); tr.appendChild(tdStatus);

    const tdProvComment = document.createElement('td'); tdProvComment.setAttribute('data-label','店舗コメント'); tdProvComment.textContent = r.providerComment || ''; tr.appendChild(tdProvComment);

    const tdStore = document.createElement('td'); tdStore.setAttribute('data-label','店舗'); tdStore.textContent = store; tr.appendChild(tdStore);

    const tdNote = document.createElement('td'); tdNote.setAttribute('data-label','メモ'); tdNote.textContent = r.note || ''; tr.appendChild(tdNote);

    // 操作列
    const tdOps = document.createElement('td'); tdOps.setAttribute('data-label','操作');
    // Review button
    const reviewOK = canReviewRequest(r);
    const reviewed = !!r.reviewedAt;
    const reviewBtn = document.createElement('button'); reviewBtn.className = 'btn btn--sm'; reviewBtn.setAttribute('data-action','review'); reviewBtn.setAttribute('data-id', r.id);
    reviewBtn.disabled = !(reviewOK && !reviewed);
    reviewBtn.title = reviewed ? 'この予約は既にレビュー済みです' : (reviewOK ? 'この予約のレビューを投稿' : (r.status !== 'approved' ? '承認済みの予約のみ投稿可能です' : '予約日時の経過後に投稿可能です'));
  // build button contents safely without using innerHTML
  const reviewIcon = document.createElement('span'); reviewIcon.className = 'btn__icon'; reviewIcon.setAttribute('aria-hidden','true'); reviewIcon.textContent = '★';
  reviewBtn.appendChild(reviewIcon);
  reviewBtn.appendChild(document.createTextNode(reviewed ? '投稿済み' : 'レビュー'));
    tdOps.appendChild(reviewBtn);
    // Cancel button
    const canCancel = canCancelRequest(r);
    const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn btn--sm btn--outline-danger'; cancelBtn.setAttribute('data-action','cancel'); cancelBtn.setAttribute('data-id', r.id);
    cancelBtn.disabled = !canCancel;
    const deadlineDate = cancellationCutoff(r) ? new Date(cancellationCutoff(r).getTime() - 60*1000) : null;
    cancelBtn.title = canCancel ? 'この予約をキャンセル' : (deadlineDate ? `キャンセル期限（${formatYMD(deadlineDate)} 23:59）を過ぎています` : 'この予約はキャンセルできません');
  const cancelIcon = document.createElement('span'); cancelIcon.className = 'btn__icon'; cancelIcon.setAttribute('aria-hidden','true'); cancelIcon.textContent = '✖';
  cancelBtn.appendChild(cancelIcon);
  cancelBtn.appendChild(document.createTextNode('キャンセル'));
    tdOps.appendChild(cancelBtn);
    if(!canCancel && deadlineDate){ const hint = document.createElement('div'); hint.className = 'muted'; hint.style.marginTop='4px'; hint.style.fontSize='12px'; hint.textContent = `期限: ${formatYMD(deadlineDate)} 23:59`; tdOps.appendChild(hint); }
    tr.appendChild(tdOps);

    frag.appendChild(tr);
  }
  tbody.appendChild(frag);
}

document.addEventListener('DOMContentLoaded', () => {
  const tbody = qs('#user-requests-tbody');
  if(tbody){
    tbody.addEventListener('click', (e)=>{
      const cancelBtn = e.target.closest('button[data-action="cancel"]');
      if(cancelBtn){
        const id = cancelBtn.getAttribute('data-id');
        if(!id) return;
        if(!confirm('この予約リクエストをキャンセルしますか？')) return;
        const res = cancelRequest(id);
        const msg = qs('#user-requests-message');
        if(msg) msg.textContent = res.msg;
        renderList();
        return;
      }
      const reviewBtn = e.target.closest('button[data-action="review"]');
      if(reviewBtn){
        const id = reviewBtn.getAttribute('data-id');
        if(!id) return;
        openReviewEditor(id);
        return;
      }
    });
  }
  renderList();
});

// Render review editor for a specific request id
function openReviewEditor(reqId){
  const reqs = load(REQUESTS_KEY);
  const services = load(SERVICES_KEY);
  const r = reqs.find(x=> x.id === reqId);
  if(!r) return;
  const svc = services.find(s=> s.id === r.serviceId);
  const svcName = svc?.name || '(不明なサービス)';
  const serviceKey = svc ? `local:${svc.id}` : '';
  const ok = canReviewRequest(r);
  const hint = ok ? 'レビューを投稿できます。' : '予約日時の経過後に投稿可能です。';

  // remove existing overlay if any
  const prev = document.getElementById('review-editor-overlay');
  if(prev) prev.remove();

  const overlay = document.createElement('div');
  overlay.id = 'review-editor-overlay';
  Object.assign(overlay.style, { position:'fixed', top:0, left:0, right:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)', zIndex:2147483647, padding:'20px' });

  const dialog = document.createElement('div');
  dialog.style.width = '720px'; dialog.style.maxWidth = '100%'; dialog.style.background = '#fff'; dialog.style.borderRadius = '12px'; dialog.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35)'; dialog.style.padding = '18px'; dialog.style.maxHeight = '90vh'; dialog.style.overflow = 'auto';

  const header = document.createElement('div'); header.className = 'cluster'; header.style.justifyContent = 'space-between'; header.style.alignItems = 'center';
  const title = document.createElement('strong'); title.textContent = 'レビュー投稿';
  const closeBtn = document.createElement('button'); closeBtn.type = 'button'; closeBtn.className = 'btn btn-ghost'; closeBtn.textContent = '閉じる';
  closeBtn.addEventListener('click', ()=> overlay.remove());
  header.appendChild(title); header.appendChild(closeBtn);

  const info = document.createElement('div'); info.className = 'muted'; info.textContent = `サービス: ${svcName} / 予約日: ${r.date || ''} ${(r.start||'') + (r.end? ' - '+r.end : '')}`;

  // form
  const form = document.createElement('form'); form.id = 'review-editor-form'; form.className = 'cluster'; form.style.display = 'flex'; form.style.gap = '12px'; form.style.alignItems = 'center';
  const label = document.createElement('label'); label.textContent = '評価 ';
  const select = document.createElement('select'); select.name = 'rating'; select.required = true;
  [5,4,3,2,1].forEach(v=>{ const o = document.createElement('option'); o.value = String(v); o.text = String(v); select.appendChild(o); });
  label.appendChild(select);
  const nickInput = document.createElement('input'); nickInput.name = 'nick'; nickInput.placeholder = '投稿時のニックネーム（必須）'; nickInput.style.width = '220px'; nickInput.style.marginRight = '8px'; nickInput.required = true; nickInput.setAttribute('aria-required','true'); nickInput.maxLength = 20;
  const input = document.createElement('input'); input.name = 'comment'; input.placeholder = 'よかった点・改善点など（任意）'; input.style.flex = '1'; input.style.minWidth = '120px';
  const submitBtn = document.createElement('button'); submitBtn.className = 'btn'; submitBtn.type = 'submit'; submitBtn.textContent = '投稿';
  if(!ok){ select.disabled = true; input.disabled = true; submitBtn.disabled = true; }
  const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.gap = '8px'; wrap.style.alignItems = 'center'; wrap.appendChild(submitBtn);
  form.appendChild(label); form.appendChild(nickInput); form.appendChild(input); form.appendChild(wrap);

  const note = document.createElement('p'); note.className = 'muted'; note.style.margin = '0'; note.style.fontSize = '12px'; note.textContent = hint;

  dialog.appendChild(header); dialog.appendChild(info); dialog.appendChild(form); dialog.appendChild(note);
  overlay.appendChild(dialog); document.body.appendChild(overlay);

  overlay.addEventListener('click', (ev)=>{ if(ev.target === overlay) overlay.remove(); });
  submitBtn.focus();

    form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!ok) return;
    const rating = select.value;
    const comment = (input.value||'').toString();
  let nickname = (nickInput.value||'').toString().trim();
  if(nickname.length > 20) nickname = nickname.slice(0,20);
  if(!nickname){ nickInput.setCustomValidity('ニックネームを入力してください'); nickInput.reportValidity(); nickInput.setCustomValidity(''); nickInput.focus(); return; }
    try{
      const valid = await isNicknameAllowed(nickname);
      if(!valid.ok){ alert(valid.reason || 'ニックネームが不正です'); nickInput.focus(); return; }
    }catch(e){ console.error('validation error', e); }
    const user = getUserSession();
    if(!user){ alert('ログインが必要です。'); return; }
    const userForReview = Object.assign({}, user, { name: nickname || (user.name || 'ユーザー') });
    try{
      addReview({ serviceKey, rating, comment, user: userForReview });
      // mark this request as reviewed to prevent duplicates
      const all = load(REQUESTS_KEY);
      const idx = all.findIndex(x=> x.id === reqId);
      if(idx !== -1){ all[idx].reviewedAt = new Date().toISOString(); save(REQUESTS_KEY, all); }
  // replace dialog contents with a simple confirmation card (built via DOM APIs)
  dialog.textContent = '';
  const card = document.createElement('div'); card.className = 'card'; card.style.padding = '12px';
  const p = document.createElement('p'); p.textContent = 'レビューを投稿しました。ありがとうございます。';
  card.appendChild(p); dialog.appendChild(card);
      setTimeout(()=>{ overlay.remove(); renderList(); }, 1200);
    }catch(err){ console.error('addReview failed', err); alert('レビューの投稿に失敗しました'); }
  });
}
