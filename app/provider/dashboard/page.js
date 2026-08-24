'use client';
import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { JAPAN_CITIES, PREFECTURES } from '@/app/_data/japan-cities';
import { ALL_AXES } from '@/lib/log-axes';

const _sb = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
);

export default function ProviderDashboardPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .tab-nav { display: flex; gap: 0; border-bottom: 2px solid rgba(232,228,220,0.2); margin-bottom: 24px; overflow-x: auto; }
      .tab-btn { padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 600; color: rgba(232,228,220,0.5); border-bottom: 2px solid transparent; margin-bottom: -2px; white-space: nowrap; transition: color .15s; }
      .tab-btn.active { color: #e8e4dc; border-bottom-color: rgba(232,228,220,0.85); }
      .tab-pane { display: none; }
      .tab-pane.active { display: block; }
      .form-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
      .form-field label { font-size: 12px; font-weight: 700; color: rgba(232,228,220,0.9); }
      .form-field input, .form-field textarea, .form-field select { padding: 10px 12px; border: 1.5px solid rgba(232,228,220,0.2); border-radius: 10px; font-size: 14px; width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.06); color: #e8e4dc; }
      .form-field input[type=checkbox] { width: auto; padding: 0; border: none; border-radius: 0; flex-shrink: 0; background: none; }
      .form-field textarea { min-height: 100px; resize: vertical; }
      .form-field select option { background: #0a0f1e; color: #e8e4dc; }
      .form-field input::placeholder, .form-field textarea::placeholder { color: rgba(232,228,220,0.35); }
      .checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
      .checkbox-item { display: flex; flex-direction: row; align-items: center; gap: 6px; font-size: 14px; text-align: left; color: rgba(232,228,220,0.85); }
      @media (max-width: 640px) { .checkbox-group { flex-direction: column; gap: 8px; } .checkbox-item { width: 100%; flex-direction: row; align-items: flex-start; } }
      .stat-card { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(232,228,220,0.15); border-radius: 12px; padding: 16px; text-align: center; }
      .stat-value { font-size: 32px; font-weight: 800; color: #e8e4dc; }
      .stat-label { font-size: 12px; color: rgba(232,228,220,0.6); margin-top: 2px; }
      .muted { color: rgba(232,228,220,0.55); }
      .publish-toggle { display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border-radius: 12px; border: 1px solid rgba(232,228,220,0.15); }
      .toggle-switch { position: relative; width: 48px; height: 26px; flex-shrink: 0; }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .toggle-slider { position: absolute; inset: 0; background: #d1d5db; border-radius: 26px; cursor: pointer; transition: background .2s; }
      .toggle-slider:before { content:''; position: absolute; width: 18px; height: 18px; left: 4px; bottom: 4px; background: #fff; border-radius: 50%; transition: transform .2s; }
      .toggle-switch input:checked + .toggle-slider { background: #111; }
      .toggle-switch input:checked + .toggle-slider:before { transform: translateX(22px); }
      .referral-code-box { padding: 16px; background: rgba(10,15,30,0.65); border: 1px solid rgba(232,228,220,0.15); border-radius: 12px; font-family: monospace; font-size: 18px; font-weight: 800; text-align: center; letter-spacing: 2px; color: #e8e4dc; }
    `;
    document.head.appendChild(style);

    // ── Auth helpers (inlined from scripts/auth.js) ──────────────
    const PROVIDER_KEY = 'fineme:provider:current';
    const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8';

    // ── Tab switching ────────────────────────────────────────────
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      const btn = document.querySelector(`[data-tab="${tabId}"]`);
      const pane = document.getElementById('tab-' + tabId);
      if (btn) btn.classList.add('active');
      if (pane) pane.classList.add('active');
    }
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    const tabParam = new URLSearchParams(location.search).get('tab');
    if (tabParam) switchTab(tabParam);

    // ── Provider data helpers ────────────────────────────────────
    function loadProviderData() {
      try { const raw = localStorage.getItem(PROVIDER_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
    }

    function getSupabaseToken() {
      try {
        const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (!key) return null;
        const session = JSON.parse(localStorage.getItem(key));
        return session?.access_token || null;
      } catch { return null; }
    }

    async function fetchAndCacheProviderData() {
      const token = getSupabaseToken();
      if (!token) return null;
      try {
        const res = await fetch('/api/provider/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        const data = await res.json();
        localStorage.setItem(PROVIDER_KEY, JSON.stringify(data));
        return data;
      } catch { return null; }
    }

    const PLAN_LABELS = { A: 'ライト（¥5,000/月）', B: 'スタンダード（¥7,000/月）', C: 'プレミアム（¥10,000/月）', free: '特例（無料）' };

    function calcPageScore(prov, svcs) {
      let s = 0;
      if (prov?.photo_url) s += 10;
      if (prov?.cover_image_url) s += 5;
      if (prov?.catchphrase) s += 10;
      if (prov?.philosophy) s += 10;
      if (prov?.unique_strengths) s += 10;
      if ((prov?.facility_photos || []).filter(Boolean).length > 0) s += 5;
      if (svcs?.length > 0) s += 15;
      if (svcs?.some(x => x.transformation_promise)) s += 15;
      if (svcs?.some(x => x.target_axis)) s += 10;
      if (svcs?.some(x => (x.before_text && x.after_text) || (x.before_image_url && x.after_image_url))) s += 10;
      return Math.min(s, 100);
    }
    function renderPageScore(prov, svcs) {
      const el = document.getElementById('page-score-bar');
      if (!el) return;
      const score = calcPageScore(prov, svcs);
      const color = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#ef4444';
      const msg = score >= 80 ? '掲載者として誇れるページです' : score >= 50 ? 'もう少しで魅力的なページになります' : 'まだ掲載者の魅力が伝わりにくい状態です';
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:12px;font-weight:700;color:rgba(232,228,220,0.9)">ページ完成度</span>
          <span style="font-size:14px;font-weight:900;color:${color}">${score}%</span>
        </div>
        <div style="height:8px;background:rgba(232,228,220,0.12);border-radius:99px;overflow:hidden;margin-bottom:6px">
          <div style="height:100%;width:${score}%;background:${color};border-radius:99px;transition:width .4s ease"></div>
        </div>
        <div style="font-size:11px;color:${color};font-weight:600">${msg}</div>
      `;
    }

    let provider = loadProviderData();
    fetchAndCacheProviderData().then(data => {
      if (data && JSON.stringify(data) !== JSON.stringify(provider)) {
        location.reload();
      }
    });

    if (provider) {
      document.getElementById('provider-name-header').textContent = provider.name || '掲載者ダッシュボード';
      const fnCode = provider.referral_code || '';
      const badge = document.getElementById('provider-number-badge');
      if (badge && fnCode) { badge.textContent = fnCode; badge.style.display = 'inline'; }
      const slug = provider.slug || fnCode.toLowerCase() || '';
      if (slug) {
        document.getElementById('provider-page-link').textContent = `fineme.me/provider/${slug}`;
        document.getElementById('view-page-btn').href = `/provider/${slug}`;
      }
      document.getElementById('billing-plan').textContent = PLAN_LABELS[provider.plan || 'A'] || 'プランA';
      if (provider.plan === 'free') {
        document.getElementById('billing-status').textContent = '';
        const billingStatusEl = document.getElementById('billing-status');
        if (billingStatusEl) billingStatusEl.style.display = 'none';
      } else {
        document.getElementById('billing-status').textContent = provider.billing_started ? '課金中' : '課金はまだ始まっていません（初回予約発生後に開始）';
      }
      document.getElementById('referral-code').textContent = fnCode || slug || '—';
      document.getElementById('publish-toggle-input').checked = !!provider.published;
      document.getElementById('publish-label').textContent = provider.published ? '公開中' : '非公開';
      ['name', 'catchphrase', 'target_desc', 'philosophy', 'guide_message', 'photo_url',
       'unique_strengths', 'nearest_station', 'prefecture', 'address',
       'price_from',
      ].forEach(k => {
        const el = document.getElementById('profile-form').elements[k];
        if (el) el.value = provider[k] || '';
      });
      // 都道府県に連動して市区町村セレクトを更新し、保存済みの市区町村を選択
      const prefEl = document.getElementById('profile-form').elements['prefecture'];
      const cityEl = document.getElementById('profile-city-select');
      if (prefEl && cityEl && provider.prefecture) {
        populateCitySelect(cityEl, provider.prefecture);
        cityEl.value = provider.city || '';
      }
      // service-form内のAIフィールド読み込み
      ['ideal_client_desc', 'client_before_state', 'transformation_pattern', 'best_fit_desc'].forEach(k => {
        const el = document.getElementById('service-form')?.elements[k];
        if (el) el.value = provider[k] || '';
      });
      // AI分析ステータス表示 & ボタン制御
      const aiStatus = document.getElementById('ai-match-status');
      if (provider.ai_match_profile) {
        const d = provider.ai_match_profile;
        const date = d.analyzed_at ? new Date(d.analyzed_at).toLocaleDateString('ja-JP') : '';
        if (aiStatus) aiStatus.innerHTML = `<span style="color:#059669;font-weight:700">✅ AI分析済み（${date}）</span><br><span style="font-size:12px;color:rgba(232,228,220,0.6)">${d.summary || ''}</span>`;
        setAnalyzeButtonState(true);
      } else {
        if (aiStatus) aiStatus.textContent = '未分析 — プロフィールを入力後「AIで分析する」ボタンを押してください';
        setAnalyzeButtonState(false);
      }
      // カバー画像プレビュー
      if (provider.cover_image_url) {
        const cp = document.getElementById('cover-photo-preview');
        const cw = document.getElementById('cover-photo-preview-wrap');
        const cu = document.querySelector('[name=cover_image_url]');
        if (cp) cp.src = provider.cover_image_url;
        if (cw) cw.style.display = 'block';
        if (cu) cu.value = provider.cover_image_url;
      }
      const oaEl = document.querySelector('[name=online_available]');
      if (oaEl) oaEl.checked = !!provider.online_available;
      (provider.facility_photos || []).forEach((url, i) => {
        const el = document.querySelector(`[name=facility_photo_${i + 1}]`);
        if (el) el.value = url || '';
      });

      ['description', 'provider_style'].forEach(k => {
        const el = document.getElementById('service-form')?.elements[k];
        if (el) el.value = provider[k] || '';
      });
      // 新サービスフィールド
      ['cancellation_policy', 'first_session_desc', 'trial_desc'].forEach(k => {
        const el = document.getElementById('service-form').elements[k];
        if (el) el.value = provider[k] || '';
      });
      const taEl = document.querySelector('[name=trial_available]');
      if (taEl) taEl.checked = !!provider.trial_available;
      const rhEl = document.getElementById('service-form').elements['response_hours'];
      if (rhEl && provider.response_hours) rhEl.value = String(provider.response_hours);

      document.querySelectorAll('[name=suitable_triggers]').forEach(cb => { cb.checked = (provider.suitable_triggers || []).includes(cb.value); });
      document.querySelectorAll('[name=handles_failure_patterns]').forEach(cb => { cb.checked = (provider.handles_failure_patterns || []).includes(cb.value); });
      document.querySelectorAll('[name=payment_methods]').forEach(cb => { cb.checked = (provider.payment_methods || []).includes(cb.value); });
    } else {
      document.getElementById('tab-stats').innerHTML = `
        <div class="card" style="padding:20px;text-align:center">
          <p class="muted">掲載者データが見つかりません。</p>
          <p style="font-size:13px;color:#6b7280">運営側より登録が完了次第、こちらに情報が表示されます。</p>
        </div>
      `;
    }

    // 今月の統計を非同期で取得
    (async function loadDashboardStats() {
      const pid = provider?.id;
      if (!pid) return;
      const yyyymm = new Date().toISOString().slice(0, 7); // YYYY-MM

      // 今月のページ閲覧数
      try {
        const res = await fetch(`/api/track/provider-view?provider_id=${encodeURIComponent(pid)}&month=${yyyymm}`);
        if (res.ok) {
          const data = await res.json();
          document.getElementById('stat-views').textContent = (data.total || 0) + '回';
        } else {
          document.getElementById('stat-views').textContent = '—';
        }
      } catch { document.getElementById('stat-views').textContent = '—'; }

      // 今月の問い合わせ数（予約リクエスト）
      try {
        const _statsToken = getSupabaseToken();
        const res = await fetch(`/api/reservations?providerId=${encodeURIComponent(pid)}`, {
          headers: _statsToken ? { 'Authorization': `Bearer ${_statsToken}` } : {}
        });
        if (res.ok) {
          const items = await res.json();
          const thisMonthItems = items.filter(r => (r.created_at || '').startsWith(yyyymm));
          const inquiryCount = thisMonthItems.length;
          document.getElementById('stat-inquiries').textContent = inquiryCount + '件';

          // 予約転換率・確定数・来店数
          const approvedCount = thisMonthItems.filter(r => r.status === 'approved').length;
          const visitedCount = thisMonthItems.filter(r => r.status === 'visited').length;
          const cvr = inquiryCount > 0 ? Math.round((approvedCount / inquiryCount) * 100) : 0;
          document.getElementById('stat-approved').textContent = approvedCount + '件';
          document.getElementById('stat-cvr').textContent = cvr + '%';
          document.getElementById('stat-visited').textContent = visitedCount + '件';
        } else {
          document.getElementById('stat-inquiries').textContent = '—';
          document.getElementById('stat-approved').textContent = '—';
          document.getElementById('stat-cvr').textContent = '—';
          document.getElementById('stat-visited').textContent = '—';
        }
      } catch {
        document.getElementById('stat-inquiries').textContent = '—';
        document.getElementById('stat-approved').textContent = '—';
        document.getElementById('stat-cvr').textContent = '—';
        document.getElementById('stat-visited').textContent = '—';
      }

      // 紹介報酬（今月の見込み）
      try {
        const res = await fetch(`/api/billing/referrals?provider_id=${encodeURIComponent(pid)}`);
        if (res.ok) {
          const data = await res.json();
          const amount = data.summary?.pending_this_month || 0;
          document.getElementById('stat-referrals').textContent = '¥' + amount.toLocaleString();
        } else {
          document.getElementById('stat-referrals').textContent = '—';
        }
      } catch { document.getElementById('stat-referrals').textContent = '—'; }
    })();

    // ── New Me Navi カバー軸の表示 ─────────────────────────────────
    if (provider) {
      const CAT_TO_AXIS = { gym:'body', eyebrow:'eyebrow', fashion:'fashion', hair:'hair', aga:'hair', makeup:'skin', hairremoval:'skin', esthetic:'skin', whitening:'teeth', orthodontics:'teeth', nail:'nail' };
      const AXIS_LABELS = { body:'体型', eyebrow:'眉', fashion:'服', hair:'髪', skin:'肌', teeth:'歯', nail:'爪' };
      const AXIS_ICONS = { body:'💪', eyebrow:'✏️', fashion:'👔', hair:'💇', skin:'✨', teeth:'😁', nail:'💅' };
      const allCats = [provider.main_category, ...(provider.sub_categories || [])].filter(Boolean);
      const coveredAxes = [...new Set(allCats.map(c => CAT_TO_AXIS[c]).filter(Boolean))];
      const infoEl = document.getElementById('axis-coverage-info');
      if (infoEl) {
        if (coveredAxes.length > 0) {
          infoEl.innerHTML = `
            <div style="padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px">
              <p style="font-size:12px;font-weight:700;color:#059669;margin:0 0 8px">✓ 自動検出されたカバー軸（8軸のうち）</p>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${coveredAxes.map(ax => `<span style="font-size:13px;font-weight:700;padding:4px 12px;background:#dcfce7;color:#15803d;border-radius:99px">${AXIS_ICONS[ax]} ${AXIS_LABELS[ax]}</span>`).join('')}
              </div>
              <p style="font-size:12px;color:#6b7280;margin:8px 0 0">このサービスがカバーする軸のギャップが大きいユーザーほど一致度が高くなります。</p>
            </div>`;
        } else {
          infoEl.innerHTML = `<div style="padding:10px 14px;background:#fef9c3;border:1px solid #fde68a;border-radius:10px;font-size:13px;color:#92400e">このサービスのカテゴリは8軸外（photo / consulting等）のため、軸一致スコアは計算されません。きっかけ・スタイルの一致で判定されます。</div>`;
        }
      }
    }

    // ── 公開設定トグル ───────────────────────────────────────────
    document.getElementById('publish-toggle-input').addEventListener('change', async function () {
      document.getElementById('publish-label').textContent = this.checked ? '公開中' : '非公開';
      await saveToLocal({ published: this.checked });
    });

    // ── フォーム保存 ─────────────────────────────────────────────
    async function saveToLocal(updates) {
      try {
        const raw = localStorage.getItem(PROVIDER_KEY);
        const d = raw ? JSON.parse(raw) : {};
        Object.assign(d, updates);
        localStorage.setItem(PROVIDER_KEY, JSON.stringify(d));
      } catch {}
      const token = getSupabaseToken();
      if (token) {
        try {
          const res = await fetch('/api/provider/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(updates)
          });
          if (res.ok) {
            const updated = await res.json();
            localStorage.setItem(PROVIDER_KEY, JSON.stringify(updated));
            showToast('保存しました');
            return true;
          } else {
            const errData = await res.json().catch(() => ({}));
            showToast('保存エラー: ' + (errData.error || res.status));
            return false;
          }
        } catch (e) { showToast('通信エラー: ' + e.message); return false; }
      } else {
        showToast('保存しました');
        return true;
      }
    }

    function showToast(msg) {
      try {
        const t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#111;color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;z-index:999';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
      } catch {}
    }

    // 市区町村セレクトを都道府県に連動して更新
    function populateCitySelect(selectEl, prefecture) {
      const cities = JAPAN_CITIES[prefecture] || [];
      selectEl.innerHTML = '<option value="">市区町村を選ぶ（任意）</option>';
      cities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        selectEl.appendChild(opt);
      });
    }
    const profilePrefEl = document.getElementById('profile-form').elements['prefecture'];
    const profileCityEl = document.getElementById('profile-city-select');
    if (profilePrefEl && profileCityEl) {
      profilePrefEl.addEventListener('change', () => {
        populateCitySelect(profileCityEl, profilePrefEl.value);
        profileCityEl.value = '';
      });
    }

    document.getElementById('profile-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      // boolean
      data.online_available = !!e.target.querySelector('[name=online_available]')?.checked;
      // numbers
      if (data.price_from) data.price_from = Number(data.price_from) || null;
      // arrays
      data.payment_methods = [...e.target.querySelectorAll('[name=payment_methods]:checked')].map(el => el.value);
      // city は select から取得
      data.city = profileCityEl ? profileCityEl.value : '';
      // facility_photos: 3つのURL入力を配列に結合
      data.facility_photos = [fd.get('facility_photo_1'), fd.get('facility_photo_2'), fd.get('facility_photo_3')].filter(Boolean);
      delete data.facility_photo_1; delete data.facility_photo_2; delete data.facility_photo_3;
      // プロフィール保存時にAI分析をリセット（再分析を促す）
      data.ai_match_profile = null;
      const ok = await saveToLocal(data);
      if (ok) setAnalyzeButtonState(false);
    });

    // AI分析ボタンの有効/無効を制御
    function setAnalyzeButtonState(analyzed) {
      const btn = document.getElementById('ai-analyze-btn');
      const status = document.getElementById('ai-match-status');
      if (!btn) return;
      if (analyzed) {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.title = 'プロフィールを編集して保存すると再分析できます';
      } else {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.title = '';
        if (status && !status.innerHTML.includes('✅')) {
          status.textContent = '未分析（ボタンを押すとマッチング精度が向上します）';
        }
      }
    }

    // AI分析ボタン
    document.getElementById('ai-analyze-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('ai-analyze-btn');
      const status = document.getElementById('ai-match-status');
      const token = getSupabaseToken();
      if (!token) { showToast('ログインが必要です'); return; }
      btn.disabled = true;
      btn.textContent = '分析中…';
      if (status) status.textContent = 'Claudeがプロフィールを読み取っています…';
      try {
        const res = await fetch('/api/provider/analyze', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '分析に失敗しました');
        const d = json.profile;
        if (status) {
          status.innerHTML = `<span style="color:#059669;font-weight:700">✅ AI分析完了</span><br><span style="font-size:12px;color:#6b7280">${d.summary || ''}</span>`;
        }
        showToast('✅ AI分析が完了しました。マッチングに反映されます。');
        setAnalyzeButtonState(true);
      } catch (err) {
        if (status) status.textContent = `エラー: ${err.message}`;
        showToast(`分析失敗: ${err.message}`);
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.textContent = 'AIで分析する';
      } finally {
        if (btn.textContent === '分析中…') btn.textContent = 'AIで分析する';
      }
    });

    document.getElementById('service-form').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      data.suitable_triggers = [...e.target.querySelectorAll('[name=suitable_triggers]:checked')].map(el => el.value);
      data.handles_failure_patterns = [...e.target.querySelectorAll('[name=handles_failure_patterns]:checked')].map(el => el.value);
      data.trial_available = !!e.target.querySelector('[name=trial_available]')?.checked;
      data.response_hours = data.response_hours ? Number(data.response_hours) : null;
      saveToLocal(data);
    });

    // ── サービス（メニュー）管理 ─────────────────────────────────
    (function setupServices() {
      const token = getSupabaseToken();
      if (!token) return;
      const listEl = document.getElementById('services-list');
      const editCard = document.getElementById('service-edit-card');
      const editForm = document.getElementById('service-edit-form');
      const editTitle = document.getElementById('service-edit-title');

      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

      async function loadServices() {
        if (!listEl) return;
        const res = await fetch('/api/provider/services', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) { listEl.innerHTML = '<p class="muted" style="color:#ef4444">取得エラー</p>'; return; }
        const items = await res.json();
        renderPageScore(provider, items);
        if (!items.length) { listEl.innerHTML = '<p class="muted">まだサービスがありません。「＋ 追加」から登録してください。</p>'; return; }
        listEl.innerHTML = '';
        items.forEach(s => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;padding:12px 0;border-bottom:1px solid #f3f4f6;gap:10px';
          const AXIS_LABELS_D = { body:'体型', eyebrow:'眉', fashion:'服', hair:'髪', skin:'肌', teeth:'歯', nail:'爪' };
          const AXIS_ICONS_D  = { body:'💪', eyebrow:'✏️', fashion:'👔', hair:'💇', skin:'✨', teeth:'😁', nail:'💅' };
          row.innerHTML = `
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
                <span style="font-weight:700;font-size:14px">${esc(s.name)}</span>
                ${s.is_featured ? '<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:99px">看板</span>' : ''}
                ${s.target_axis ? `<span style="font-size:11px;background:#eff6ff;color:#1d4ed8;padding:1px 7px;border-radius:99px">${AXIS_ICONS_D[s.target_axis]||''} ${AXIS_LABELS_D[s.target_axis]||s.target_axis}</span>` : ''}
              </div>
              <div style="font-size:13px;color:#6b7280">¥${Number(s.price).toLocaleString()}${s.duration ? ' · ' + esc(s.duration) : ''}</div>
              ${s.transformation_promise ? `<div style="font-size:12px;color:#374151;margin-top:3px;font-style:italic">「${esc(s.transformation_promise)}」</div>` : ''}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" data-edit="${s.id}">編集</button>
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px;color:#ef4444" data-del="${s.id}">削除</button>
            </div>`;
          listEl.appendChild(row);
        });
        listEl.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
          const s = items.find(x => x.id === btn.dataset.edit); if (!s) return;
          editTitle.textContent = 'サービスを編集'; editCard.style.display = 'block';
          editForm.elements['name'].value = s.name || ''; editForm.elements['price'].value = s.price || '';
          editForm.elements['duration'].value = s.duration || '';
          editForm.elements['is_featured'].checked = !!s.is_featured; editForm.elements['_service_id'].value = s.id;
          editForm.querySelectorAll('[name=suitable_path_types]').forEach(cb => { cb.checked = (s.suitable_path_types || []).includes(cb.value); });
          // 新フィールド
          if (editForm.elements['target_axis']) editForm.elements['target_axis'].value = s.target_axis || '';
          if (editForm.elements['category']) editForm.elements['category'].value = s.category || '';
          if (editForm.elements['transformation_promise']) editForm.elements['transformation_promise'].value = s.transformation_promise || '';
          if (editForm.elements['before_text']) editForm.elements['before_text'].value = s.before_text || '';
          if (editForm.elements['after_text']) editForm.elements['after_text'].value = s.after_text || '';
          if (editForm.elements['benefit_list_text']) editForm.elements['benefit_list_text'].value = (s.benefit_list || []).join('\n');
          const sImgPreview = document.getElementById('service-img-preview');
          const sImgPreviewWrap = document.getElementById('service-img-preview-wrap');
          const sImgUrl = document.getElementById('service-image-url');
          if (s.image_url) { if (sImgPreview) sImgPreview.src = s.image_url; if (sImgPreviewWrap) sImgPreviewWrap.style.display = 'block'; if (sImgUrl) sImgUrl.value = s.image_url; }
          else { if (sImgPreviewWrap) sImgPreviewWrap.style.display = 'none'; if (sImgUrl) sImgUrl.value = ''; }
          const sBIp = document.getElementById('service-before-img-preview'), sBIw = document.getElementById('service-before-img-wrap'), sBIu = document.getElementById('service-before-image-url');
          if (s.before_image_url) { if (sBIp) sBIp.src = s.before_image_url; if (sBIw) sBIw.style.display = 'block'; if (sBIu) sBIu.value = s.before_image_url; }
          else { if (sBIw) sBIw.style.display = 'none'; if (sBIu) sBIu.value = ''; }
          const sAIp = document.getElementById('service-after-img-preview'), sAIw = document.getElementById('service-after-img-wrap'), sAIu = document.getElementById('service-after-image-url');
          if (s.after_image_url) { if (sAIp) sAIp.src = s.after_image_url; if (sAIw) sAIw.style.display = 'block'; if (sAIu) sAIu.value = s.after_image_url; }
          else { if (sAIw) sAIw.style.display = 'none'; if (sAIu) sAIu.value = ''; }
          editCard.scrollIntoView({ behavior: 'smooth' });
        }));
        listEl.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このサービスを削除しますか？')) return;
          await fetch(`/api/provider/services/${btn.dataset.del}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          loadServices();
        }));
      }

      function resetServiceImgPreview() {
        const w = document.getElementById('service-img-preview-wrap'); if (w) w.style.display = 'none';
        const u = document.getElementById('service-image-url'); if (u) u.value = '';
        const m = document.getElementById('service-img-msg'); if (m) { m.style.display = 'none'; m.textContent = ''; }
        const bw = document.getElementById('service-before-img-wrap'); if (bw) bw.style.display = 'none';
        const bu = document.getElementById('service-before-image-url'); if (bu) bu.value = '';
        const bm = document.getElementById('service-before-img-msg'); if (bm) { bm.style.display = 'none'; bm.textContent = ''; }
        const aw = document.getElementById('service-after-img-wrap'); if (aw) aw.style.display = 'none';
        const au = document.getElementById('service-after-image-url'); if (au) au.value = '';
        const am = document.getElementById('service-after-img-msg'); if (am) { am.style.display = 'none'; am.textContent = ''; }
      }
      document.getElementById('btn-add-service')?.addEventListener('click', () => {
        editTitle.textContent = 'サービスを追加'; editCard.style.display = 'block';
        editForm.reset(); editForm.elements['_service_id'].value = '';
        resetServiceImgPreview();
        editCard.scrollIntoView({ behavior: 'smooth' });
      });
      document.getElementById('service-cancel-btn')?.addEventListener('click', () => {
        editCard.style.display = 'none'; editForm.reset(); resetServiceImgPreview();
      });

      editForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(editForm);
        const id = fd.get('_service_id');
        const suitablePathTypes = [...editForm.querySelectorAll('[name=suitable_path_types]:checked')].map(el => el.value);
        const benefitListRaw = fd.get('benefit_list_text') || '';
        const benefitList = benefitListRaw.split('\n').map(s => s.replace(/^[・▶→✓\s]+/, '').trim()).filter(Boolean);
        const body = { name: fd.get('name'), price: Number(fd.get('price')), duration: fd.get('duration') || null, is_featured: !!editForm.elements['is_featured'].checked, image_url: fd.get('image_url') || null, suitable_path_types: suitablePathTypes.length > 0 ? suitablePathTypes : null, target_axis: fd.get('target_axis') || null, transformation_promise: fd.get('transformation_promise') || null, before_text: fd.get('before_text') || null, after_text: fd.get('after_text') || null, before_image_url: fd.get('before_image_url') || null, after_image_url: fd.get('after_image_url') || null, benefit_list: benefitList.length > 0 ? benefitList : null, category: fd.get('category') || null };
        const url = id ? `/api/provider/services/${id}` : '/api/provider/services';
        const res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
        if (res.ok) { editCard.style.display = 'none'; editForm.reset(); loadServices(); showToast('保存しました'); }
        else { const err = await res.json(); showToast('エラー: ' + (err.error || '不明')); }
      });

      document.querySelectorAll('[data-tab="service"]').forEach(btn => btn.addEventListener('click', loadServices, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'service') loadServices();
    })();

    // ── スタッフ管理 ─────────────────────────────────────────────
    (function setupStaff() {
      const token = getSupabaseToken();
      if (!token) return;
      const listEl    = document.getElementById('staff-list');
      const editCard  = document.getElementById('staff-edit-card');
      const editForm  = document.getElementById('staff-edit-form');
      const editTitle = document.getElementById('staff-edit-title');

      function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

      async function loadStaff() {
        if (!listEl) return;
        const res = await fetch('/api/provider/staff', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) { listEl.innerHTML = '<p class="muted" style="color:#ef4444">取得エラー</p>'; return; }
        const items = await res.json();
        if (!items.length) { listEl.innerHTML = '<p class="muted">まだスタッフが登録されていません。「＋ 追加」から登録してください。</p>'; return; }
        listEl.innerHTML = '';
        items.forEach(s => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid #f3f4f6';
          row.innerHTML = `
            <div style="flex-shrink:0">
              ${s.photo_url
                ? `<img src="${esc(s.photo_url)}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb" />`
                : `<div style="width:52px;height:52px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:22px">👤</div>`}
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px">
                <strong style="font-size:14px">${esc(s.name)}</strong>
                ${s.is_featured ? '<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:99px">担当</span>' : ''}
                ${s.role ? `<span style="font-size:12px;color:#6b7280">${esc(s.role)}</span>` : ''}
              </div>
              ${s.experience_years ? `<span style="font-size:11px;color:#059669">経験${s.experience_years}年</span>` : ''}
              ${s.bio ? `<p style="font-size:12px;color:#9ca3af;margin:4px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.bio.slice(0, 60))}${s.bio.length > 60 ? '…' : ''}</p>` : ''}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" data-staff-edit="${s.id}">編集</button>
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px;color:#ef4444" data-staff-del="${s.id}">削除</button>
            </div>`;
          listEl.appendChild(row);
        });
        listEl.querySelectorAll('[data-staff-edit]').forEach(btn => btn.addEventListener('click', () => {
          const s = items.find(x => x.id === btn.dataset.staffEdit); if (!s) return;
          editTitle.textContent = 'スタッフを編集'; editCard.style.display = 'block';
          editForm.elements['name'].value         = s.name || '';
          editForm.elements['role'].value         = s.role || '';
          editForm.elements['bio'].value          = s.bio || '';
          editForm.elements['experience_years'].value = s.experience_years || '';
          editForm.elements['credentials'].value  = s.credentials || '';
          editForm.elements['is_featured'].checked = !!s.is_featured;
          editForm.elements['sort_order'].value   = s.sort_order ?? 0;
          editForm.elements['_staff_id'].value    = s.id;
          const prev = document.getElementById('staff-photo-preview');
          const prevWrap = document.getElementById('staff-photo-preview-wrap');
          const urlEl  = document.getElementById('staff-photo-url');
          if (s.photo_url) { prev.src = s.photo_url; prevWrap.style.display = 'block'; if (urlEl) urlEl.value = s.photo_url; }
          else { prevWrap.style.display = 'none'; if (urlEl) urlEl.value = ''; }
          editCard.scrollIntoView({ behavior: 'smooth' });
        }));
        listEl.querySelectorAll('[data-staff-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このスタッフを削除しますか？')) return;
          await fetch(`/api/provider/staff/${btn.dataset.staffDel}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          loadStaff();
        }));
      }

      document.getElementById('btn-add-staff')?.addEventListener('click', () => {
        editTitle.textContent = 'スタッフを追加'; editCard.style.display = 'block';
        editForm.reset(); editForm.elements['_staff_id'].value = '';
        document.getElementById('staff-photo-preview-wrap').style.display = 'none';
        document.getElementById('staff-photo-url').value = '';
        editCard.scrollIntoView({ behavior: 'smooth' });
      });
      document.getElementById('staff-cancel-btn')?.addEventListener('click', () => {
        editCard.style.display = 'none'; editForm.reset();
      });

      editForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(editForm);
        const id  = fd.get('_staff_id');
        const body = {
          name: fd.get('name'), role: fd.get('role') || null, bio: fd.get('bio') || null,
          photo_url: fd.get('photo_url') || null,
          experience_years: fd.get('experience_years') ? Number(fd.get('experience_years')) : null,
          credentials: fd.get('credentials') || null,
          is_featured: !!editForm.elements['is_featured'].checked,
          sort_order: Number(fd.get('sort_order')) || 0,
        };
        const url = id ? `/api/provider/staff/${id}` : '/api/provider/staff';
        const res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
        if (res.ok) { editCard.style.display = 'none'; editForm.reset(); loadStaff(); showToast('保存しました'); }
        else { const err = await res.json(); showToast('エラー: ' + (err.error || '不明')); }
      });

      // スタッフ写真アップロード（サービス画像と同じエンドポイントを流用）
      const staffImgBtn   = document.getElementById('staff-img-btn');
      const staffImgInput = document.getElementById('staff-img-input');
      const staffImgPrev  = document.getElementById('staff-photo-preview');
      const staffImgPrevW = document.getElementById('staff-photo-preview-wrap');
      const staffImgMsg   = document.getElementById('staff-img-msg');
      const staffPhotoUrl = document.getElementById('staff-photo-url');
      if (staffImgBtn) staffImgBtn.addEventListener('click', () => staffImgInput?.click());
      staffImgInput?.addEventListener('change', async () => {
        const file = staffImgInput.files?.[0]; if (!file) return;
        staffImgMsg.textContent = 'アップロード中…'; staffImgMsg.style.display = 'block'; staffImgBtn.disabled = true;
        const fd = new FormData(); fd.append('photo', file);
        try {
          const res  = await fetch('/api/provider/upload-service-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
          const data = await res.json();
          if (res.ok && data.url) {
            staffImgPrev.src = data.url; staffImgPrevW.style.display = 'block';
            if (staffPhotoUrl) staffPhotoUrl.value = data.url;
            staffImgMsg.textContent = '✓ 写真を設定しました'; staffImgMsg.style.color = '#059669';
          } else { staffImgMsg.textContent = 'エラー: ' + (data.error || '不明'); staffImgMsg.style.color = '#ef4444'; }
        } catch { staffImgMsg.textContent = '通信エラー'; staffImgMsg.style.color = '#ef4444'; }
        staffImgBtn.disabled = false; staffImgInput.value = '';
      });

      document.querySelectorAll('[data-tab="staff"]').forEach(btn => btn.addEventListener('click', loadStaff, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'staff') loadStaff();
    })();

    // ── 体験談タブ ────────────────────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const listEl = document.getElementById('stories-list');

      const AXIS_LABELS = { body:'体型・ボディ', eyebrow:'眉毛', fashion:'服・コーデ', hair:'髪・ヘア', skin:'肌・エステ', teeth:'歯・口元', nail:'爪' };

      async function loadStories() {
        if (!listEl) return;
        listEl.innerHTML = '<p class="muted">読み込み中…</p>';
        const res = await fetch('/api/provider/stories', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) { listEl.innerHTML = '<p style="color:#ef4444" class="muted">取得エラー</p>'; return; }
        const items = await res.json();
        if (!items.length) { listEl.innerHTML = '<p class="muted">まだ体験談はありません。</p>'; return; }
        listEl.innerHTML = '';
        items.forEach(s => {
          const row = document.createElement('div');
          row.style.cssText = 'border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;background:#fff;';
          const isHidden = !!s.provider_hidden;
          const axisLabel = s.axis_id ? (AXIS_LABELS[s.axis_id] || s.axis_id) : null;
          const date = s.created_at ? new Date(s.created_at).toLocaleDateString('ja-JP',{month:'long',day:'numeric'}) : '';
          row.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
                  ${axisLabel ? `<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#eff6ff;color:#2563eb;border-radius:99px;">${axisLabel}</span>` : ''}
                  <span style="font-size:11px;color:#9ca3af;">${date}</span>
                  <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;${s.status==='approved'?'background:#d1fae5;color:#065f46;':'background:#fef3c7;color:#92400e;'}">${s.status==='approved'?'公開中':'審査中'}</span>
                  ${isHidden ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#f3f4f6;color:#6b7280;border-radius:99px;">非表示中</span>' : ''}
                </div>
                <p style="font-size:13px;color:#374151;margin:0 0 4px;font-weight:600;">${s.concern_before ? s.concern_before.slice(0,80)+(s.concern_before.length>80?'…':'') : '(悩みなし)'}</p>
                <p style="font-size:12px;color:#6b7280;margin:0;">${s.change_after ? s.change_after.slice(0,80)+(s.change_after.length>80?'…':'') : ''}</p>
              </div>
              <button
                class="btn btn-ghost stories-toggle-btn"
                data-story-id="${s.id}"
                data-hidden="${isHidden ? '1' : '0'}"
                style="font-size:12px;padding:6px 12px;flex-shrink:0;${isHidden ? 'color:#6b7280;' : 'color:#ef4444;'}"
              >${isHidden ? '表示する' : '非表示にする'}</button>
            </div>
          `;
          listEl.appendChild(row);
        });
        listEl.querySelectorAll('.stories-toggle-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.storyId;
            const nowHidden = btn.dataset.hidden === '1';
            btn.disabled = true; btn.textContent = '更新中…';
            const res = await fetch(`/api/provider/stories/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ provider_hidden: !nowHidden }),
            });
            if (res.ok) { loadStories(); showToast(nowHidden ? '体験談を表示しました' : '体験談を非表示にしました'); }
            else { btn.disabled = false; btn.textContent = nowHidden ? '表示する' : '非表示にする'; showToast('更新エラー'); }
          });
        });
      }

      document.querySelectorAll('[data-tab="stories"]').forEach(btn => btn.addEventListener('click', loadStories, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'stories') loadStories();
    })();

    // ── 推奨来店周期の設定 ────────────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const axisSel = document.getElementById('rf-axis');
      const listEl = document.getElementById('rf-list');
      if (!axisSel || !listEl) return;

      axisSel.innerHTML = Object.entries(ALL_AXES).map(([id, def]) => `<option value="${id}">${def.icon} ${def.label}</option>`).join('');

      async function loadRecommended() {
        listEl.textContent = '読み込み中…';
        const res = await fetch('/api/provider/recommended-frequencies', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) { listEl.textContent = '取得エラー'; return; }
        const items = await res.json();
        if (!items.length) { listEl.innerHTML = '<p class="muted" style="font-size:13px;margin:4px 0 0">まだ設定していません。</p>'; return; }
        listEl.innerHTML = items.map(r => {
          const def = ALL_AXES[r.axis];
          const freqLabel = r.frequency_months
            ? (r.frequency_months === 1 ? '月1回' : `${r.frequency_months}ヶ月に1回`)
            : (r.frequency_weeks === 1 ? '週1回' : `${r.frequency_weeks}週ごと`);
          return `<span class="badge" style="display:inline-flex;align-items:center;gap:6px;margin:4px 6px 0 0;padding:4px 10px;border-radius:99px;background:rgba(232,228,220,0.1);font-size:12px;">
            ${def ? def.icon : ''} ${def ? def.label : r.axis}：${freqLabel}
            <button type="button" data-rf-del="${r.axis}" style="border:none;background:none;color:#ef4444;cursor:pointer;font-size:12px;">✕</button>
          </span>`;
        }).join('');
        listEl.querySelectorAll('[data-rf-del]').forEach(btn => btn.addEventListener('click', async () => {
          await fetch('/api/provider/recommended-frequencies', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ axis: btn.dataset.rfDel, frequency_weeks: null, frequency_months: null }),
          });
          loadRecommended();
        }));
      }

      const saveBtn = document.getElementById('rf-save-btn');
      if (saveBtn) saveBtn.addEventListener('click', async () => {
        const value = Number(document.getElementById('rf-value').value);
        const unit = document.getElementById('rf-unit').value;
        if (!value || value < 1) { showToast('周期を入力してください'); return; }
        saveBtn.disabled = true;
        await fetch('/api/provider/recommended-frequencies', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            axis: axisSel.value,
            frequency_weeks: unit === 'week' ? value : null,
            frequency_months: unit === 'month' ? value : null,
          }),
        });
        document.getElementById('rf-value').value = '';
        saveBtn.disabled = false;
        loadRecommended();
      });

      document.querySelectorAll('[data-tab="customers"]').forEach(btn => btn.addEventListener('click', loadRecommended, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'customers') loadRecommended();
    })();

    // ── 休眠判定の設定 ────────────────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const daysInput = document.getElementById('ds-days');
      const saveBtn = document.getElementById('ds-save-btn');
      const msgEl = document.getElementById('ds-msg');
      if (!daysInput || !saveBtn) return;

      async function loadDormantSettings() {
        const res = await fetch('/api/provider/dormant-settings', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        daysInput.value = data.no_visit_days;
      }

      saveBtn.addEventListener('click', async () => {
        const days = Number(daysInput.value);
        if (!days || days < 1) { msgEl.textContent = '1以上の日数を入力してください'; msgEl.style.color = '#ef4444'; return; }
        saveBtn.disabled = true;
        const res = await fetch('/api/provider/dormant-settings', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ no_visit_days: days }),
        });
        if (res.ok) { msgEl.style.color = '#059669'; msgEl.textContent = '✓ 保存しました'; }
        else { const d = await res.json(); msgEl.style.color = '#ef4444'; msgEl.textContent = d.error || '保存に失敗しました'; }
        saveBtn.disabled = false;
      });

      document.querySelectorAll('[data-tab="customers"]').forEach(btn => btn.addEventListener('click', loadDormantSettings, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'customers') loadDormantSettings();
    })();

    // ── New Me Log 顧客一覧タブ ───────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const listEl = document.getElementById('customers-list');
      const filterSel = document.getElementById('customers-filter');

      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      function fmtDate(d) {
        if (!d) return '未設定';
        return new Date(d).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
      }
      function fmtFreq(c) {
        if (c.frequency_months) return c.frequency_months === 1 ? '月1回' : `${c.frequency_months}ヶ月に1回`;
        if (c.frequency_weeks) return c.frequency_weeks === 1 ? '週1回' : `${c.frequency_weeks}週ごと`;
        return '未設定';
      }
      function overdueBadge(label, days) {
        if (typeof days !== 'number' || days >= 0) return '';
        return `<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#fef2f2;color:#dc2626;border-radius:99px;">${label}${-days}日超過</span>`;
      }
      const STATUS_LABEL = {
        active: { label: 'アクティブ', bg: '#f0fdf4', fg: '#16a34a' },
        dormant: { label: '休眠', bg: '#fffbeb', fg: '#d97706' },
        churned: { label: '離脱', bg: '#f3f4f6', fg: '#6b7280' },
      };
      function statusBadge(status) {
        const s = STATUS_LABEL[status] || STATUS_LABEL.active;
        return `<span style="font-size:11px;font-weight:700;padding:2px 8px;background:${s.bg};color:${s.fg};border-radius:99px;">${s.label}</span>`;
      }

      let allItems = [];
      let staffList = [];

      function render() {
        if (!listEl) return;
        const filter = filterSel?.value || 'all';
        const items = allItems.filter(c => {
          if (filter === 'user-overdue') return typeof c.userOverdueDays === 'number' && c.userOverdueDays < 0;
          if (filter === 'store-overdue') return typeof c.storeOverdueDays === 'number' && c.storeOverdueDays < 0;
          if (filter === 'dormant') return c.status === 'dormant' || c.status === 'churned';
          return true;
        });
        if (!items.length) {
          listEl.innerHTML = '<p class="muted">該当するお客様はいません。</p>';
          return;
        }
        listEl.innerHTML = '';
        items.forEach(c => {
          const def = ALL_AXES[c.axis];
          const axisLabel = def ? `${def.icon} ${esc(def.label)}` : esc(c.axis);
          const row = document.createElement('div');
          row.style.cssText = 'border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;background:#fff;';
          const staffOptions = ['<option value="">担当未割当</option>']
            .concat(staffList.map(s => `<option value="${s.id}"${c.assignedStaffId === s.id ? ' selected' : ''}>${esc(s.name)}</option>`))
            .join('');
          row.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:4px;">${esc(c.customer_name)}${c.hasStoreNote ? ' <span title="店舗メモあり" style="font-size:12px;">📝</span>' : ''}</div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
                  <span style="font-size:11px;font-weight:700;padding:2px 8px;background:#eff6ff;color:#2563eb;border-radius:99px;">${axisLabel}</span>
                  <span style="font-size:11px;color:#9ca3af;">${esc(c.name)}</span>
                  ${statusBadge(c.status)}
                  ${overdueBadge('ユーザー想定', c.userOverdueDays)}
                  ${overdueBadge('店舗推奨', c.storeOverdueDays)}
                  ${c.meScanDone ? '<span style="font-size:11px;padding:2px 8px;background:#faf5ff;color:#9333ea;border-radius:99px;">Me Scan済</span>' : ''}
                  ${c.mirror?.visualTier ? `<span style="font-size:11px;padding:2px 8px;background:#fff7ed;color:#c2410c;border-radius:99px;">Mirror: ${esc(c.mirror.visualTier)}</span>` : ''}
                </div>
                <p style="font-size:12px;color:#6b7280;margin:0 0 8px;">前回：${fmtDate(c.last_visit)}／次回目安：${fmtDate(c.next_visit)}／頻度：${fmtFreq(c)}／来店回数：${c.visitCount ?? 0}回</p>
                <div class="cluster" style="gap:8px;align-items:center;">
                  <button type="button" class="btn btn-ghost" style="font-size:12px;padding:5px 10px;" data-nudge="${c.user_id}">声かけメッセージを送る</button>
                  <button type="button" class="btn btn-ghost" style="font-size:12px;padding:5px 10px;" data-note="${c.user_id}">${c.hasStoreNote ? 'メモを見る/編集' : 'メモを追加'}</button>
                  <select data-assign="${c.user_id}" style="font-size:12px;padding:5px 8px;border:1px solid #e5e7eb;border-radius:8px;">${staffOptions}</select>
                </div>
                <div class="note-box" id="note-box-${c.user_id}" style="display:none;margin-top:8px;"></div>
              </div>
            </div>
          `;
          listEl.appendChild(row);
        });

        listEl.querySelectorAll('[data-assign]').forEach(sel => sel.addEventListener('change', async () => {
          const uid = sel.dataset.assign;
          sel.disabled = true;
          const res = await fetch(`/api/provider/customers/${uid}/note`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ assigned_staff_id: sel.value || null }),
          });
          showToast(res.ok ? '担当を更新しました' : '更新に失敗しました');
          sel.disabled = false;
        }));

        listEl.querySelectorAll('[data-nudge]').forEach(btn => btn.addEventListener('click', async () => {
          const message = prompt('お客様に送るメッセージを入力してください（店舗の公式LINE連携済みならそちらから、未連携ならFineme公式LINEから届きます）');
          if (!message?.trim()) return;
          btn.disabled = true;
          const res = await fetch(`/api/provider/customers/${btn.dataset.nudge}/nudge`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message }),
          });
          const data = await res.json();
          showToast(res.ok ? '送信しました' : `送信エラー：${data.error || '不明'}`);
          btn.disabled = false;
        }));

        listEl.querySelectorAll('[data-note]').forEach(btn => btn.addEventListener('click', async () => {
          const uid = btn.dataset.note;
          const box = document.getElementById(`note-box-${uid}`);
          if (!box) return;
          if (box.style.display === 'block') { box.style.display = 'none'; return; }
          box.style.display = 'block';
          box.innerHTML = '<p class="muted" style="font-size:12px;">読み込み中…</p>';
          const res = await fetch(`/api/provider/customers/${uid}/note`, { headers: { 'Authorization': `Bearer ${token}` } });
          const data = await res.json();
          box.innerHTML = `
            <textarea data-note-input="${uid}" style="width:100%;min-height:70px;font-size:13px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;" placeholder="この店舗だけが見られるメモ（要望・注意点など）。お客様には表示されません。">${esc(data.note || '')}</textarea>
            <button type="button" class="btn" style="font-size:12px;padding:5px 10px;margin-top:6px;" data-note-save="${uid}">メモを保存</button>
          `;
          box.querySelector(`[data-note-save="${uid}"]`).addEventListener('click', async (e) => {
            const btnSave = e.currentTarget;
            const note = box.querySelector(`[data-note-input="${uid}"]`).value;
            btnSave.disabled = true;
            await fetch(`/api/provider/customers/${uid}/note`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ note }),
            });
            showToast('メモを保存しました');
            btnSave.disabled = false;
          });
        }));
      }

      async function loadCustomers() {
        if (!listEl) return;
        listEl.innerHTML = '<p class="muted">読み込み中…</p>';
        const [res, staffRes] = await Promise.all([
          fetch('/api/provider/customers', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/provider/staff', { headers: { 'Authorization': `Bearer ${token}` } }),
        ]);
        if (!res.ok) { listEl.innerHTML = '<p style="color:#ef4444" class="muted">取得エラー</p>'; return; }
        staffList = staffRes.ok ? await staffRes.json() : [];
        allItems = await res.json();
        if (!allItems.length) {
          listEl.innerHTML = '<p class="muted">まだ紐づいているお客様はいません。QRコードでNew Me Logをご案内ください。</p>';
          return;
        }
        render();
      }

      if (filterSel) filterSel.addEventListener('change', render);
      document.querySelectorAll('[data-tab="customers"]').forEach(btn => btn.addEventListener('click', loadCustomers, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'customers') loadCustomers();
    })();

    // ── LINE連携タブ ──────────────────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const statusEl = document.getElementById('line-channel-status');
      const form = document.getElementById('line-channel-form');
      const msgEl = document.getElementById('lc-msg');
      const submitBtn = document.getElementById('lc-submit-btn');

      async function loadStatus() {
        if (!statusEl) return;
        statusEl.textContent = '読み込み中…';
        const res = await fetch('/api/provider/line-channel', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) { statusEl.textContent = '取得エラー'; return; }
        const data = await res.json();
        if (data.connected) {
          statusEl.innerHTML = `✅ 連携済み（${data.verified_at ? new Date(data.verified_at).toLocaleDateString('ja-JP') : ''}確認・${data.connected_by === 'staff' ? '運営代行設定' : '自己設定'}）`;
          const tokenInput = document.getElementById('lc-channel-token');
          if (tokenInput) tokenInput.placeholder = '変更する場合のみ入力（LIFF IDだけの追記なら空欄でOK）';
          const webhookBox = document.getElementById('lc-webhook-url-box');
          const webhookUrlEl = document.getElementById('lc-webhook-url');
          if (webhookBox && webhookUrlEl && provider?.id) {
            webhookUrlEl.textContent = `https://www.fineme.me/api/line/webhook/${provider.id}`;
            webhookBox.style.display = 'block';
          }
        } else {
          statusEl.textContent = '未連携（Fineme公式LINEからリマインドが送られます）';
        }
        const idInput = document.getElementById('lc-channel-id');
        const liffInput = document.getElementById('lc-liff-id');
        if (idInput && data.channel_id && !idInput.value) idInput.value = data.channel_id;
        if (liffInput && data.liff_id && !liffInput.value) liffInput.value = data.liff_id;
      }

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          submitBtn.disabled = true; submitBtn.textContent = '確認中…'; msgEl.textContent = '';
          try {
            const res = await fetch('/api/provider/line-channel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                channel_id: document.getElementById('lc-channel-id').value.trim(),
                channel_secret: document.getElementById('lc-channel-secret').value.trim(),
                channel_access_token: document.getElementById('lc-channel-token').value.trim(),
                liff_id: document.getElementById('lc-liff-id').value.trim(),
              }),
            });
            const data = await res.json();
            if (res.ok) {
              msgEl.style.color = '#059669';
              msgEl.textContent = `✓ 連携できました（${data.botDisplayName || ''}）`;
              document.getElementById('lc-channel-token').value = '';
              loadStatus();
            } else {
              msgEl.style.color = '#ef4444';
              msgEl.textContent = data.error || '保存に失敗しました';
            }
          } catch (err) {
            msgEl.style.color = '#ef4444';
            msgEl.textContent = '通信エラーが発生しました';
          }
          submitBtn.disabled = false; submitBtn.textContent = '保存して確認する';
        });
      }

      document.querySelectorAll('[data-tab="line-channel"]').forEach(btn => btn.addEventListener('click', loadStatus, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'line-channel') loadStatus();
    })();

    // ── クチコミ依頼タブ ──────────────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const urlInput = document.getElementById('rv-url');
      const form = document.getElementById('review-form');
      const msgEl = document.getElementById('rv-msg');
      if (!form) return;

      if (urlInput && provider?.google_review_url) urlInput.value = provider.google_review_url;

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('rv-submit-btn');
        submitBtn.disabled = true; msgEl.textContent = '';
        try {
          const res = await fetch('/api/provider/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ google_review_url: urlInput.value.trim() }),
          });
          if (res.ok) {
            msgEl.style.color = '#059669';
            msgEl.textContent = '✓ 保存しました';
          } else {
            const data = await res.json();
            msgEl.style.color = '#ef4444';
            msgEl.textContent = data.error || '保存に失敗しました';
          }
        } catch {
          msgEl.style.color = '#ef4444';
          msgEl.textContent = '通信エラーが発生しました';
        }
        submitBtn.disabled = false;
      });
    })();

    // ── 画像圧縮ヘルパー（Canvas, max 1200px, JPEG/WebP 0.85） ────
    function compressImage(file, maxPx = 1200, quality = 0.85) {
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          let { width, height } = img;
          if (width > maxPx || height > maxPx) {
            if (width >= height) { height = Math.round(height * maxPx / width); width = maxPx; }
            else { width = Math.round(width * maxPx / height); height = maxPx; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
      });
    }

    // ── 施設写真アップロード ──────────────────────────────────────
    (function setupFacilityPhotoUpload() {
      [1, 2, 3].forEach(slot => {
        const btn = document.getElementById(`facility-img-btn-${slot}`);
        const input = document.getElementById(`facility-img-input-${slot}`);
        const preview = document.getElementById(`facility-photo-preview-${slot}`);
        const previewWrap = document.getElementById(`facility-photo-preview-wrap-${slot}`);
        const msg = document.getElementById(`facility-img-msg-${slot}`);
        const hiddenUrl = document.querySelector(`[name=facility_photo_${slot}]`);

        const existingUrl = (provider?.facility_photos || [])[slot - 1];
        if (existingUrl && preview && previewWrap) {
          preview.src = existingUrl; previewWrap.style.display = 'block';
          if (hiddenUrl) hiddenUrl.value = existingUrl;
        }

        if (btn) btn.addEventListener('click', () => input?.click());
        if (!input) return;

        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          if (!file) return;
          const token = getSupabaseToken();
          if (!token) { showToast('ログインが必要です'); return; }

          msg.textContent = '圧縮中…'; msg.style.display = 'block'; btn.disabled = true;
          const compressedFacility = await compressImage(file);
          msg.textContent = 'アップロード中…';

          const fd = new FormData();
          fd.append('photo', compressedFacility, 'photo.jpg');
          fd.append('slot', String(slot));
          try {
            const res = await fetch('/api/provider/upload-facility-photo', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: fd,
            });
            let data; try { data = await res.json(); } catch { data = {}; }
            if (res.ok && data.url) {
              preview.src = data.url; previewWrap.style.display = 'block';
              if (hiddenUrl) hiddenUrl.value = data.url;
              msg.textContent = '保存中…'; msg.style.color = '#9ca3af';
              // 現在のfacility_photosを再構築してDB保存
              const allPhotos = [1, 2, 3].map(s => {
                const h = document.querySelector(`[name=facility_photo_${s}]`);
                return h ? h.value : '';
              }).filter(Boolean);
              const saved = await saveToLocal({ facility_photos: allPhotos });
              msg.textContent = saved ? '✓ 写真を保存しました' : '⚠ アップロードはできましたが保存に失敗しました。「保存する」を押してください。';
              msg.style.color = saved ? '#059669' : '#ef4444';
            } else {
              msg.textContent = 'エラー: ' + (data.error || '不明'); msg.style.color = '#ef4444';
            }
          } catch (e) { msg.textContent = '通信エラーが発生しました: ' + e.message; msg.style.color = '#ef4444'; }
          btn.disabled = false; input.value = '';
        });
      });
    })();

    // ── 写真アップロード ─────────────────────────────────────────
    (function setupPhotoUpload() {
      const btn = document.getElementById('photo-upload-btn');
      const input = document.getElementById('photo-file-input');
      const preview = document.getElementById('photo-preview');
      const previewWrap = document.getElementById('photo-preview-wrap');
      const msg = document.getElementById('photo-upload-msg');
      const hiddenUrl = document.querySelector('[name=photo_url]');

      if (provider?.photo_url) { preview.src = provider.photo_url; previewWrap.style.display = 'block'; }
      if (hiddenUrl && provider?.photo_url) hiddenUrl.value = provider.photo_url;

      if (btn) btn.addEventListener('click', () => input?.click());
      if (!input) return;

      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        const token = getSupabaseToken();
        if (!token) { showToast('ログインが必要です'); return; }

        msg.textContent = 'アップロード中…'; msg.style.display = 'block'; btn.disabled = true;

        const fd = new FormData();
        fd.append('photo', file);
        try {
          const res = await fetch('/api/provider/upload-photo', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fd
          });
          const data = await res.json();
          if (res.ok && data.url) {
            preview.src = data.url; previewWrap.style.display = 'block';
            if (hiddenUrl) hiddenUrl.value = data.url;
            try { const raw = localStorage.getItem(PROVIDER_KEY); if (raw) { const d = JSON.parse(raw); d.photo_url = data.url; localStorage.setItem(PROVIDER_KEY, JSON.stringify(d)); } } catch {}
            msg.textContent = '✓ 写真を更新しました'; msg.style.color = '#059669';
          } else {
            msg.textContent = 'エラー: ' + (data.error || '不明'); msg.style.color = '#ef4444';
          }
        } catch (e) { msg.textContent = '通信エラーが発生しました'; msg.style.color = '#ef4444'; }
        btn.disabled = false;
        input.value = '';
      });
    })();

    // ── カバー画像アップロード ────────────────────────────────────
    (function setupCoverImageUpload() {
      const btn = document.getElementById('cover-photo-upload-btn');
      const input = document.getElementById('cover-photo-file-input');
      const preview = document.getElementById('cover-photo-preview');
      const previewWrap = document.getElementById('cover-photo-preview-wrap');
      const msg = document.getElementById('cover-photo-upload-msg');
      const hiddenUrl = document.querySelector('[name=cover_image_url]');
      if (btn) btn.addEventListener('click', () => input?.click());
      if (!input) return;
      input.addEventListener('change', async () => {
        const file = input.files?.[0]; if (!file) return;
        const token = getSupabaseToken();
        if (!token) { showToast('ログインが必要です'); return; }
        msg.textContent = '圧縮中…'; msg.style.display = 'block'; btn.disabled = true;
        const compressedCover = await compressImage(file, 1920);
        msg.textContent = 'アップロード中…';
        const fd = new FormData(); fd.append('photo', compressedCover, 'photo.jpg');
        try {
          const res = await fetch('/api/provider/upload-service-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
          let data; try { data = await res.json(); } catch { data = {}; }
          if (res.ok && data.url) {
            preview.src = data.url; previewWrap.style.display = 'block';
            if (hiddenUrl) hiddenUrl.value = data.url;
            msg.textContent = '保存中…'; msg.style.color = '#9ca3af';
            const saved = await saveToLocal({ cover_image_url: data.url });
            if (saved) {
              msg.textContent = '✓ カバー画像を保存しました（ページに反映されました）'; msg.style.color = '#059669';
            } else {
              msg.textContent = '⚠ 画像はアップロードできましたが、DBへの保存に失敗しました。ページを再読み込みして再試行してください。'; msg.style.color = '#ef4444';
            }
          } else { msg.textContent = 'エラー: ' + (data.error || '不明'); msg.style.color = '#ef4444'; }
        } catch { msg.textContent = '通信エラーが発生しました'; msg.style.color = '#ef4444'; }
        btn.disabled = false; input.value = '';
      });
    })();

    // ── サービス画像アップロード ─────────────────────────────────
    (function setupServiceImageUpload() {
      const btn = document.getElementById('service-img-btn');
      const input = document.getElementById('service-img-input');
      const preview = document.getElementById('service-img-preview');
      const previewWrap = document.getElementById('service-img-preview-wrap');
      const msg = document.getElementById('service-img-msg');
      const hiddenUrl = document.getElementById('service-image-url');

      if (btn) btn.addEventListener('click', () => input?.click());
      if (!input) return;

      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        const token = getSupabaseToken();
        if (!token) { showToast('ログインが必要です'); return; }

        msg.textContent = '圧縮中…'; msg.style.display = 'block'; btn.disabled = true;
        const compressedSvc = await compressImage(file);
        msg.textContent = 'アップロード中…';

        const fd = new FormData();
        fd.append('photo', compressedSvc, 'photo.jpg');
        try {
          const res = await fetch('/api/provider/upload-service-image', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fd
          });
          let data; try { data = await res.json(); } catch { data = {}; }
          if (res.ok && data.url) {
            preview.src = data.url; previewWrap.style.display = 'block';
            if (hiddenUrl) hiddenUrl.value = data.url;
            msg.textContent = '✓ 画像を設定しました'; msg.style.color = '#059669';
          } else {
            msg.textContent = 'エラー: ' + (data.error || res.status); msg.style.color = '#ef4444';
          }
        } catch (e) { msg.textContent = '通信エラー: ' + e.message; msg.style.color = '#ef4444'; }
        btn.disabled = false;
        input.value = '';
      });
    })();

    // ── サービス Before/After 画像アップロード ────────────────────
    (function setupServiceBeforeAfterImages() {
      function setupImgSlot(btnId, inputId, previewId, wrapId, msgId, hiddenId) {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (btn) btn.addEventListener('click', () => input?.click());
        if (!input) return;
        input.addEventListener('change', async () => {
          const file = input.files?.[0]; if (!file) return;
          const token = getSupabaseToken();
          if (!token) { showToast('ログインが必要です'); return; }
          // 毎回 getElementById で取得（初期化タイミングの問題を回避）
          const preview = document.getElementById(previewId);
          const previewWrap = document.getElementById(wrapId);
          const msg = document.getElementById(msgId);
          const hidden = document.getElementById(hiddenId);
          if (msg) { msg.textContent = '圧縮中…'; msg.style.display = 'block'; }
          if (btn) btn.disabled = true;
          const compressed = await compressImage(file);
          if (msg) msg.textContent = 'アップロード中…';
          const fd = new FormData(); fd.append('photo', compressed, 'photo.jpg');
          try {
            const res = await fetch('/api/provider/upload-service-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
            let data; try { data = await res.json(); } catch { data = {}; }
            if (res.ok && data.url) {
              if (preview) preview.src = data.url;
              if (previewWrap) previewWrap.style.display = 'block';
              if (hidden) hidden.value = data.url;
              if (msg) { msg.textContent = '✓ 画像を設定しました'; msg.style.color = '#059669'; }
            } else {
              if (msg) { msg.textContent = 'エラー: ' + (data.error || res.status); msg.style.color = '#ef4444'; }
            }
          } catch (e) {
            if (msg) { msg.textContent = '通信エラー: ' + e.message; msg.style.color = '#ef4444'; }
          }
          if (btn) btn.disabled = false; input.value = '';
        });
      }
      setupImgSlot('service-before-img-btn','service-before-img-input','service-before-img-preview','service-before-img-wrap','service-before-img-msg','service-before-image-url');
      setupImgSlot('service-after-img-btn','service-after-img-input','service-after-img-preview','service-after-img-wrap','service-after-img-msg','service-after-image-url');
    })();

    // ── 予約リクエスト管理 ────────────────────────────────────────
    const STATUS_LABELS = { pending: '返答待ち', approved: '承認済み', rejected: 'お断り', counter_proposed: '代替提案済み', visited: '来店確認済み' };
    const STATUS_COLORS = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', counter_proposed: '#6366f1', visited: '#059669' };
    const TIME_OPTIONS = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

    function parseDateChoices(r) {
      const choices = [{ date: r.reserved_date || '', time: r.start_time || '', label: '第1希望' }];
      const note = r.note || '';
      const m2 = note.match(/【第2希望】(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/);
      const m3 = note.match(/【第3希望】(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/);
      if (m2) choices.push({ date: m2[1], time: m2[2], label: '第2希望' });
      if (m3) choices.push({ date: m3[1], time: m3[2], label: '第3希望' });
      return choices;
    }
    function noteWithoutChoices(note) {
      return (note || '')
        .replace(/【第[23]希望】\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/g, '')
        .replace(/【メニュー】[^\n]*/g, '')
        .replace(/【New Me Navi より】[\s\S]*?(?=\n\n|$)/, '')
        .trim();
    }

    function parseMeMapNote(note) {
      const match = (note || '').match(/【New Me Navi より】\n([\s\S]*?)(?:\n\n|$)/);
      return match ? match[1].trim() : null;
    }

    let _allRequests = [];

    async function loadRequests() {
      const k = document.getElementById('req-filter-kw'); if (k) k.value = '';
      const sf = document.getElementById('req-filter-status'); if (sf) sf.value = '';
      const providerId = provider?.id || loadProviderData()?.id;
      if (!providerId) { document.getElementById('requests-list').innerHTML = '<p class="muted">掲載者IDが見つかりません。</p>'; return; }
      const _reqToken = getSupabaseToken();
      const res = await fetch(`/api/reservations?providerId=${providerId}`, {
        headers: _reqToken ? { 'Authorization': `Bearer ${_reqToken}` } : {}
      });
      if (!res.ok) { document.getElementById('requests-list').innerHTML = '<p class="muted" style="color:#ef4444">取得エラー</p>'; return; }
      const items = await res.json();
      _allRequests = items;
      const pending = items.filter(r => r.status === 'pending').length;
      const b = document.getElementById('requests-badge');
      if (b) { b.textContent = pending || ''; b.style.display = pending > 0 ? 'inline' : 'none'; }
      applyRequestFilters();
    }

    function applyRequestFilters() {
      const statusFilter = document.getElementById('req-filter-status')?.value || '';
      const kwFilter = (document.getElementById('req-filter-kw')?.value || '').toLowerCase().trim();
      let items = _allRequests;
      if (statusFilter) items = items.filter(r => r.status === statusFilter);
      if (kwFilter) items = items.filter(r => (r.user_name || '').toLowerCase().includes(kwFilter) || (r.note || '').toLowerCase().includes(kwFilter));
      const countEl = document.getElementById('req-filter-count');
      if (countEl) countEl.textContent = `${items.length}件`;
      renderRequests(items);
    }

    // 絞り込みコントロールのイベント登録
    document.getElementById('req-filter-status')?.addEventListener('change', applyRequestFilters);
    document.getElementById('req-filter-kw')?.addEventListener('input', applyRequestFilters);
    document.getElementById('req-filter-reset')?.addEventListener('click', () => {
      const s = document.getElementById('req-filter-status'); if (s) s.value = '';
      const k = document.getElementById('req-filter-kw'); if (k) k.value = '';
      applyRequestFilters();
    });

    function renderRequests(items) {
      const el = document.getElementById('requests-list');
      if (!items.length) { el.innerHTML = '<p class="muted">条件に一致するリクエストはありません。</p>'; return; }
      el.innerHTML = '';
      items.forEach(r => {
        const choices = parseDateChoices(r);
        const menuMatch = (r.note || '').match(/【メニュー】([^\n]+)/);
        const menuText = menuMatch ? menuMatch[1] : '';
        const userMsg = noteWithoutChoices(r.note);
        const statusColor = STATUS_COLORS[r.status] || '#6b7280';
        const statusLabel = STATUS_LABELS[r.status] || r.status;

        const choicesHtml = r.status === 'pending' ? choices.map((c, i) => `
          <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;margin-bottom:4px">
            <input type="radio" name="choice-${r.id}" value="${i}" ${i === 0 ? 'checked' : ''} style="accentColor:#10b981">
            <span style="font-size:13px;font-weight:700;color:#374151">${c.label}:</span>
            <span style="font-size:13px;color:#374151">${c.date} ${c.time}</span>
          </label>
        `).join('') : `<p style="font-size:13px;color:#6b7280">第1希望: ${choices[0].date} ${choices[0].time}${r.confirmed_date ? ` → 確定: ${r.confirmed_date} ${r.confirmed_time || ''}` : ''}</p>`;

        const meMapNote = parseMeMapNote(r.note);
        const card = document.createElement('div');
        card.style.cssText = 'border:1.5px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:12px;background:#fff;color:#111;text-shadow:none';
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
                <strong style="font-size:15px">${esc(r.user_name)}</strong>
                <span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:99px;background:${statusColor}20;color:${statusColor}">${statusLabel}</span>
              </div>
              ${meMapNote ? `
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:10px">
                <p style="font-size:11px;font-weight:700;color:#2563eb;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em">🗺 New Me Navi より</p>
                ${meMapNote.split('\n').map(line => `<p style="font-size:13px;color:#1e40af;margin:0 0 2px;font-weight:${line.startsWith('最優先') ? '700' : '400'}">${esc(line)}</p>`).join('')}
              </div>` : ''}
              ${(r.status === 'approved' || r.status === 'visited') ? `
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-bottom:10px">
                <p style="font-size:11px;font-weight:700;color:#15803d;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em">ユーザー情報</p>
                <p style="font-size:13px;font-weight:700;color:#111;margin:0 0 2px">👤 ${esc(r.user_name)}</p>
                <p style="font-size:13px;color:#374151;margin:0">📧 ${esc(r.user_contact)}</p>
              </div>` : `<p style="font-size:12px;color:#9ca3af;margin:0 0 10px">連絡先: ${esc(r.user_contact)}</p>`}
              ${menuText ? `<p style="font-size:13px;color:#374151;margin:0 0 8px;font-weight:700">🎯 ${esc(menuText)}</p>` : ''}
              <div style="margin-bottom:8px">${choicesHtml}</div>
              ${userMsg ? `<div style="font-size:13px;color:#374151;padding:8px 12px;background:#f9fafb;border-radius:8px;margin-bottom:8px">${esc(userMsg)}</div>` : ''}
              ${r.provider_comment ? `<div style="font-size:13px;color:#6366f1;padding:8px 12px;background:#eef2ff;border-radius:8px">掲載者コメント: ${esc(r.provider_comment)}</div>` : ''}
              ${r.counter_date ? `<div style="font-size:13px;color:#6366f1;padding:8px 12px;background:#eef2ff;border-radius:8px;margin-top:6px">代替提案日時: ${r.counter_date} ${r.counter_time || ''}</div>` : ''}
            </div>
            ${r.status === 'pending' ? `
            <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0;min-width:120px">
              <button class="btn" style="font-size:12px;padding:8px 14px;background:#10b981;white-space:nowrap" onclick="approveRequest('${r.id}')">✓ 承認する</button>
              <button class="btn btn-ghost" style="font-size:12px;padding:8px 14px;white-space:nowrap" onclick="showCounterModal('${r.id}')">代替提案を送る</button>
              <button class="btn btn-ghost" style="font-size:12px;padding:8px 14px;color:#ef4444;white-space:nowrap" onclick="rejectRequest('${r.id}')">お断り</button>
            </div>` : r.status === 'approved' ? `
            <button class="btn btn-ghost" style="font-size:12px;padding:8px 14px" onclick="markVisited('${r.id}')">来店確認</button>` : ''}
          </div>
        `;
        el.appendChild(card);
      });
    }

    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    function getSelectedChoice(id) {
      const sel = document.querySelector(`input[name="choice-${id}"]:checked`);
      const idx = sel ? parseInt(sel.value) : 0;
      const card = sel ? sel.closest('[style]') : null;
      const labels = card ? card.querySelectorAll('label') : [];
      const choiceLabel = labels[idx];
      if (!choiceLabel) return null;
      const spans = choiceLabel.querySelectorAll('span');
      if (spans.length < 2) return null;
      const parts = spans[1].textContent.trim().split(' ');
      return { date: parts[0], time: parts[1] || '' };
    }

    window.approveRequest = async function (id) {
      const choice = getSelectedChoice(id);
      const body = { status: 'approved' };
      if (choice) { body.confirmed_date = choice.date; body.confirmed_time = choice.time; }
      const _approveToken = getSupabaseToken();
      const res = await fetch(`/api/reservations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(_approveToken ? { 'Authorization': `Bearer ${_approveToken}` } : {}) }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
      await loadRequests(); showToast('承認しました');
    };

    window.rejectRequest = async function (id) {
      if (!confirm('このリクエストをお断りしますか？（ユーザーへ通知されます）')) return;
      const _rejectToken = getSupabaseToken();
      const res = await fetch(`/api/reservations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(_rejectToken ? { 'Authorization': `Bearer ${_rejectToken}` } : {}) }, body: JSON.stringify({ status: 'rejected' }) });
      if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
      await loadRequests(); showToast('お断りを送りました');
    };

    window.markVisited = async function (id) {
      if (!confirm('来店を確認しますか？')) return;
      const _visitToken = getSupabaseToken();
      const res = await fetch(`/api/reservations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(_visitToken ? { 'Authorization': `Bearer ${_visitToken}` } : {}) }, body: JSON.stringify({ status: 'visited' }) });
      if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
      await loadRequests(); showToast('来店を確認しました');
    };

    window.showCounterModal = function (id) {
      const existing = document.getElementById('counter-modal-overlay');
      if (existing) existing.remove();
      const today = new Date().toISOString().split('T')[0];
      const timeOpts = TIME_OPTIONS.map(t => `<option value="${t}">${t}</option>`).join('');
      const overlay = document.createElement('div');
      overlay.id = 'counter-modal-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:18px;padding:28px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto">
          <h2 style="font-size:16px;font-weight:800;margin:0 0 6px">代替日時を提案する</h2>
          <p style="font-size:13px;color:#6b7280;margin:0 0 20px">希望に沿えない場合、別の日時を提案してください。ユーザーへメールで通知されます。</p>
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">提案日 *</label>
          <input id="counter-date-input" type="date" min="${today}" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;margin-bottom:12px">
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">提案時間 *</label>
          <select id="counter-time-input" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;margin-bottom:12px">
            <option value="">選択</option>${timeOpts}
          </select>
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">メッセージ（任意）</label>
          <textarea id="counter-msg-input" rows="3" placeholder="ご都合が合えばこちらの日時はいかがでしょうか" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;resize:vertical;margin-bottom:16px"></textarea>
          <div style="display:flex;gap:8px">
            <button onclick="submitCounter('${id}')" style="flex:1;padding:12px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">提案を送る</button>
            <button onclick="document.getElementById('counter-modal-overlay').remove()" style="padding:12px 16px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-size:14px;cursor:pointer">キャンセル</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    };

    window.submitCounter = async function (id) {
      const date = document.getElementById('counter-date-input').value;
      const time = document.getElementById('counter-time-input').value;
      const msg = document.getElementById('counter-msg-input').value;
      if (!date || !time) { showToast('日付と時間を選択してください'); return; }
      const _counterToken = getSupabaseToken();
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(_counterToken ? { 'Authorization': `Bearer ${_counterToken}` } : {}) },
        body: JSON.stringify({ status: 'counter_proposed', counter_date: date, counter_time: time, counter_proposal: msg || null })
      });
      if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
      document.getElementById('counter-modal-overlay').remove();
      await loadRequests(); showToast('代替提案を送りました');
    };

    document.querySelectorAll('[data-tab="requests"]').forEach(btn => {
      btn.addEventListener('click', loadRequests, { once: false });
    });
    if (provider?.id || loadProviderData()?.id) setTimeout(loadRequests, 500);

    // ── LINE連携 ─────────────────────────────────────────────────
    (function setupLineConnect() {
      const providerId = provider?.id || loadProviderData()?.id;
      if (!providerId) return;

      const params = new URLSearchParams(location.search);
      if (params.get('line_connected') === '1') {
        showToast('LINEと連携しました！予約リクエスト時にLINE通知が届きます');
        history.replaceState({}, '', location.pathname);
        document.getElementById('line-connect-status').innerHTML = '<p style="color:#06c755;font-weight:700;margin:0">✓ LINE通知が設定済みです</p>';
        return;
      }
      if (params.get('line_error')) {
        showToast('LINE連携に失敗しました。もう一度お試しください');
        history.replaceState({}, '', location.pathname);
      }

      if (provider?.line_user_id) {
        document.getElementById('line-connect-status').innerHTML = '<p style="color:#06c755;font-weight:700;margin:0">✓ LINE通知が設定済みです</p>';
        return;
      }

      const btn = document.getElementById('line-connect-btn');
      if (btn) btn.href = `/api/provider/line-connect?provider_id=${encodeURIComponent(providerId)}`;
    })();

    // 紹介コードコピー（課金タブ内）
    document.getElementById('copy-referral').addEventListener('click', () => {
      const code = document.getElementById('referral-code').textContent;
      navigator.clipboard.writeText(code).then(() => showToast('コードをコピーしました')).catch(() => {});
    });

    // ── 紹介報酬タブ ─────────────────────────────────────────────
    (function setupReferralTab() {
      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

      const fnCode = provider?.referral_code || '';
      const codeEl = document.getElementById('referral-code-tab');
      if (codeEl) codeEl.textContent = fnCode || '—';

      document.getElementById('copy-referral-code-btn')?.addEventListener('click', () => {
        if (!fnCode) { showToast('紹介コードが設定されていません'); return; }
        navigator.clipboard.writeText(fnCode).then(() => showToast('コードをコピーしました')).catch(() => {});
      });

      document.getElementById('copy-referral-url-btn')?.addEventListener('click', () => {
        if (!fnCode) { showToast('紹介コードが設定されていません'); return; }
        const url = `https://www.fineme.me/pages/provider/join.html?ref=${encodeURIComponent(fnCode)}`;
        navigator.clipboard.writeText(url).then(() => showToast('紹介URLをコピーしました')).catch(() => {});
      });

      async function loadReferrals() {
        const pid = provider?.id || loadProviderData()?.id;
        const listEl = document.getElementById('referral-list');
        if (!pid) { if (listEl) listEl.innerHTML = '<p class="muted">掲載者IDが見つかりません。</p>'; return; }

        try {
          const res = await fetch(`/api/billing/referrals?provider_id=${encodeURIComponent(pid)}`);
          if (!res.ok) { if (listEl) listEl.innerHTML = '<p class="muted" style="color:#ef4444">取得エラーが発生しました。</p>'; return; }
          const data = await res.json();
          const { referrals, summary } = data;

          const el = (id) => document.getElementById(id);
          if (el('ref-total-referred')) el('ref-total-referred').textContent = summary.total_referred;
          if (el('ref-active-count')) el('ref-active-count').textContent = summary.active_count;
          if (el('ref-pending-month')) el('ref-pending-month').textContent = '¥' + (summary.pending_this_month || 0).toLocaleString();
          if (el('ref-total-earned')) el('ref-total-earned').textContent = '¥' + (summary.total_earned_all_time || 0).toLocaleString();

          if (!listEl) return;
          if (!referrals.length) {
            listEl.innerHTML = '<p class="muted">まだ紹介した掲載者がいません。紹介URLを共有して報酬を獲得しましょう。</p>';
            return;
          }
          listEl.innerHTML = '';
          referrals.forEach(r => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;gap:12px;flex-wrap:wrap;background:#fff';
            const statusBadge = r.status === 'active'
              ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#d1fae5;color:#065f46">課金中</span>'
              : '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#f3f4f6;color:#6b7280">未課金</span>';
            const billingDate = r.billing_started
              ? `<span style="font-size:11px;color:#9ca3af">課金開始: ${esc(r.billing_started.slice(0, 10))}</span>`
              : '<span style="font-size:11px;color:#9ca3af">まだ課金なし</span>';
            row.innerHTML = `
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
                  <strong style="font-size:14px">${esc(r.referred_name)}</strong>
                  ${statusBadge}
                </div>
                ${billingDate}
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:13px;font-weight:700;color:${r.status === 'active' ? '#6366f1' : '#9ca3af'}">¥500/月</div>
                <div style="font-size:11px;color:#6b7280">累計: ¥${(r.total_earned || 0).toLocaleString()}</div>
              </div>
            `;
            listEl.appendChild(row);
          });
        } catch (e) {
          if (listEl) listEl.innerHTML = '<p class="muted" style="color:#ef4444">通信エラーが発生しました。</p>';
        }
      }

      document.querySelectorAll('[data-tab="referral"]').forEach(btn => {
        btn.addEventListener('click', loadReferrals, { once: false });
      });
      if (new URLSearchParams(location.search).get('tab') === 'referral') loadReferrals();
    })();

    // ── パスワード変更 ────────────────────────────────────────────
    document.getElementById('pw-change-btn').addEventListener('click', async () => {
      const pw1 = document.getElementById('new-pw1').value;
      const pw2 = document.getElementById('new-pw2').value;
      const msg = document.getElementById('pw-change-msg');
      msg.style.display = 'none';
      if (pw1.length < 8) { msg.textContent = 'パスワードは8文字以上で入力してください'; msg.style.color = '#ef4444'; msg.style.display = 'block'; return; }
      if (pw1 !== pw2) { msg.textContent = 'パスワードが一致しません'; msg.style.color = '#ef4444'; msg.style.display = 'block'; return; }
      try {
        const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        const session = key ? JSON.parse(localStorage.getItem(key)) : null;
        if (!session?.access_token) { msg.textContent = 'ログインセッションが見つかりません。再ログインしてください。'; msg.style.color = '#ef4444'; msg.style.display = 'block'; return; }
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient('https://qsfpzlvucqzmjldshwwd.supabase.co', SUPABASE_ANON);
        const { error } = await sb.auth.updateUser({ password: pw1 });
        if (error) { msg.textContent = 'エラー: ' + error.message; msg.style.color = '#ef4444'; }
        else { msg.textContent = 'パスワードを変更しました'; msg.style.color = '#059669'; document.getElementById('new-pw1').value = ''; document.getElementById('new-pw2').value = ''; }
        msg.style.display = 'block';
      } catch (e) { msg.textContent = 'エラーが発生しました'; msg.style.color = '#ef4444'; msg.style.display = 'block'; }
    });

    // ── カスタマーポータル ────────────────────────────────────────
    document.getElementById('billing-portal-btn').addEventListener('click', async e => {
      e.preventDefault();
      try {
        const { data: { session } } = await _sb.auth.getSession();
        const token = session?.access_token;
        if (!token) { showToast('ログインが必要です'); return; }
        const res = await fetch('/api/billing/portal-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else showToast('エラー: ' + (data.error || '不明なエラー'));
      } catch (err) { showToast('ポータルへのアクセスに失敗しました: ' + err.message); }
    });

    return () => {
      try { document.head.removeChild(style); } catch {}
      // Clean up window globals
      delete window.approveRequest;
      delete window.rejectRequest;
      delete window.markVisited;
      delete window.showCounterModal;
      delete window.submitCounter;
    };
  }, []);

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: '800px' }}>

        {/* ダッシュボードヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span id="provider-number-badge" style={{ display: 'none', fontSize: '13px', fontWeight: '800', padding: '3px 12px', background: '#111', color: '#fff', borderRadius: '99px' }}></span>
              <h1 className="section-title" style={{ margin: '0 0 4px' }} id="provider-name-header">掲載者ダッシュボード</h1>
            </div>
            <p className="muted" id="provider-page-link" style={{ margin: '0' }}></p>
          </div>
          <a id="view-page-btn" href="#" target="_blank" className="btn btn-ghost" style={{ fontSize: '13px' }}>自分のページを見る ↗</a>
        </div>

        {/* タブナビ */}
        <div className="tab-nav">
          <button className="tab-btn active" data-tab="stats">📊 概況</button>
          <button className="tab-btn" data-tab="requests">📬 予約リクエスト <span id="requests-badge" style={{ display: 'none', background: '#ef4444', color: '#fff', borderRadius: '99px', fontSize: '10px', padding: '1px 6px', marginLeft: '4px' }}></span></button>
          <button className="tab-btn" data-tab="profile">プロフィール</button>
          <button className="tab-btn" data-tab="staff">👤 スタッフ</button>
          <button className="tab-btn" data-tab="stories">📝 体験談</button>
          <button className="tab-btn" data-tab="customers">🗒️ New Me Log</button>
          <button className="tab-btn" data-tab="line-channel">💬 LINE連携</button>
          <button className="tab-btn" data-tab="reviews">⭐ クチコミ</button>
          <button className="tab-btn" data-tab="service">サービス設定</button>
          <button className="tab-btn" data-tab="publish">公開設定</button>
          <button className="tab-btn" data-tab="billing">課金・プラン</button>
          <button className="tab-btn" data-tab="referral">紹介報酬</button>
        </div>

        {/* タブ①：概況 */}
        <div className="tab-pane active" id="tab-stats">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '12px' }}>
            <div className="stat-card"><div className="stat-value" id="stat-views">—</div><div className="stat-label">今月のページ閲覧数</div></div>
            <div className="stat-card"><div className="stat-value" id="stat-inquiries">—</div><div className="stat-label">今月の問い合わせ数</div></div>
            <div className="stat-card"><div className="stat-value" id="stat-referrals">—</div><div className="stat-label">紹介報酬（今月）</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
            <div className="stat-card"><div className="stat-value" id="stat-approved">—</div><div className="stat-label">予約確定数（今月）</div></div>
            <div className="stat-card"><div className="stat-value" id="stat-cvr">—</div><div className="stat-label">予約転換率</div><div style={{fontSize:'11px',color:'rgba(232,228,220,0.4)',marginTop:'2px'}}>確定÷問い合わせ</div></div>
            <div className="stat-card"><div className="stat-value" id="stat-visited">—</div><div className="stat-label">来店完了数（今月）</div></div>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '15px' }}>Finemeからのメッセージ</h3>
            <p className="muted" style={{ margin: '0', lineHeight: '1.7' }}>順位は出しません。「合う人に届く」ことを大切にしています。<br />スコアは<strong>①AIマッチング</strong>（プロフィール文章をAIが読み取りユーザーの診断結果と照合）・<strong>②ページの充実度</strong>（写真・サービス・Before/After・スタッフ）・<strong>③ユーザーの変容軸との一致</strong>の3層で決まります。どれか1つではなく、ページ全体を丁寧に作ることが「合う人に届く」近道です。</p>
            <a href="/provider/philosophy" className="btn btn-ghost" style={{ fontSize: '13px', marginTop: '12px', display: 'inline-block' }}>Finemeの考え方を見る</a>
          </div>

          {/* LINE通知設定カード */}
          <div className="card" style={{ padding: '20px', borderColor: '#06c755' }} id="line-connect-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '22px' }}>💬</span>
              <h3 style={{ margin: '0', fontSize: '15px' }}>LINE通知を設定する</h3>
            </div>
            <p className="muted" style={{ margin: '0 0 14px', fontSize: '13px', lineHeight: '1.6' }}>
              予約リクエストが届いたとき、LINEに通知が届くようになります。<br />
              ボタンを押してLINEでログインするだけで自動設定されます。
            </p>
            <div id="line-connect-status">
              <a id="line-connect-btn" href="#" className="btn" style={{ background: '#06c755', color: '#fff', border: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                LINEと連携する
              </a>
            </div>
          </div>
        </div>

        {/* タブ②：予約リクエスト */}
        <div className="tab-pane" id="tab-requests">
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ margin: '0', fontSize: '16px' }}>予約リクエスト</h2>
              <span style={{ fontSize: '12px', color: 'rgba(232,228,220,0.55)' }} id="req-filter-count"></span>
            </div>

            {/* 絞り込みバー */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', padding: '12px 14px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', color: '#111', textShadow: 'none' }}>
              <input
                id="req-filter-kw"
                type="text"
                placeholder="名前・メモで検索"
                autoComplete="off"
                defaultValue=""
                style={{ flex: '1 1 140px', padding: '7px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              />
              <select
                id="req-filter-status"
                style={{ padding: '7px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', background: '#fff', cursor: 'pointer' }}
              >
                <option value="">すべてのステータス</option>
                <option value="pending">返答待ち</option>
                <option value="counter_proposed">代替提案済み</option>
                <option value="approved">承認済み</option>
                <option value="visited">来店確認済み</option>
                <option value="rejected">お断り</option>
              </select>
              <button
                id="req-filter-reset"
                className="btn btn-ghost"
                style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
              >
                リセット
              </button>
            </div>

            <div id="requests-list"><p className="muted">読み込み中…</p></div>
          </div>
        </div>

        {/* タブ③：プロフィール */}
        <div className="tab-pane" id="tab-profile">
          {/* ページ完成度スコア */}
          <div className="card" style={{ padding: '18px 22px', marginBottom: '16px' }}>
            <div id="page-score-bar">
              <div style={{ fontSize: '12px', color: 'rgba(232,228,220,0.5)' }}>ページ完成度を計算中…</div>
            </div>
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '16px' }}>基本情報</h2>
            <form id="profile-form">
              <div className="form-field"><label>掲載名 *</label><input name="name" required /></div>
              <div className="form-field">
                <label>キャッチコピー（ページ冒頭に大きく表示されます）</label>
                <input name="catchphrase" placeholder="例: マッチングアプリで勝てる顔をつくる、3ヶ月の変容プログラム" />
                <small className="muted">短く・強く・誰に向けているかが一目でわかる一文が効果的です</small>
              </div>
              <div className="form-field">
                <label>こんな方に向いています（1行ずつ書くと番号リストで表示されます）</label>
                <textarea name="target_desc" placeholder={"マッチングアプリの写真を改善したい\n何度も挫折したが今度こそ変わりたい\n自分が何をすべきかわからない"} style={{ minHeight: '100px' }}></textarea>
                <small className="muted">改行で区切ると①②③のカードとして掲載者ページに表示されます</small>
              </div>
              <div className="form-field">
                <label>このサービスが大切にしていること（引用文として大きく表示されます）</label>
                <textarea name="philosophy" placeholder="あなたのサービスの考え方・信念・強みを自分の言葉で。ページ上では黒背景の引用文スタイルで表示されます。"></textarea>
              </div>
              <div className="form-field" style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🧭 <span>変容の旅を始めようとしている方への言葉</span></label>
                <textarea name="guide_message" placeholder="ここから変わろうとしているあなたへ、ガイドとして一言あれば。&#10;例: 「外見を変えることは、自分の優先順位を自分で決めること」だと思っています。まず話を聞かせてください。" style={{ minHeight: '90px' }}></textarea>
                <small className="muted">掲載者ページの最上部に「ガイドからのひと言」として表示されます。サービス説明ではなく、人としてのあなたが伝わる言葉を。</small>
              </div>
              <div className="form-field">
                <label>プロフィール写真（ヒーロー内に円形アバターとして表示）</label>
                <div id="photo-preview-wrap" style={{ marginBottom: '8px', display: 'none' }}>
                  <img id="photo-preview" src="" alt="現在の写真" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                </div>
                <input type="file" id="photo-file-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                <button type="button" id="photo-upload-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>📷 写真を選択・変更（5MB以内・jpg/png/webp）</button>
                <p id="photo-upload-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                <input type="hidden" name="photo_url" />
              </div>
              <div className="form-field">
                <label>ヒーロー画像（ページ上部の背景バナー）</label>
                <div id="cover-photo-preview-wrap" style={{ marginBottom: '8px', display: 'none' }}>
                  <img id="cover-photo-preview" src="" alt="カバー画像" style={{ width: '100%', maxHeight: '130px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                </div>
                <input type="file" id="cover-photo-file-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                <button type="button" id="cover-photo-upload-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>🖼️ カバー画像を選択（横長比推奨・jpg/png/webp）</button>
                <p id="cover-photo-upload-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                <small className="muted">ページ上部の大きな背景として使用されます。施設・スタジオの雰囲気が伝わる横長写真を推奨。未設定の場合は黒グラデーションになります。</small>
                <input type="hidden" name="cover_image_url" />
              </div>
              {/* ── 掲載者情報・信頼シグナル ── */}
              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '20px 0 10px', paddingTop: '16px', borderTop: '1px solid rgba(232,228,220,0.12)' }}>掲載者情報・信頼シグナル</h3>
              <small className="muted" style={{ display: 'block', marginBottom: '14px', fontSize: '12px', lineHeight: '1.6' }}>ページ上部の「クイックファクト」として横一列で表示されます。同じカテゴリの他ガイドとの比較に直結します。</small>
              {/* ── 所在地 ── */}
              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '20px 0 10px', paddingTop: '16px', borderTop: '1px solid rgba(232,228,220,0.12)' }}>所在地・アクセス</h3>
              <small className="muted" style={{ display: 'block', marginBottom: '14px', fontSize: '12px', lineHeight: '1.6' }}>
                入力した住所はAIマッチングの距離計算に使用されます。番地まで入力するほど精度が上がります。ユーザーには最寄り駅のみ表示されます。
              </small>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-field">
                  <label>都道府県 <span style={{color:'#dc2626',fontSize:'12px'}}>*</span></label>
                  <select name="prefecture">
                    <option value="">選択してください</option>
                    {PREFECTURES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>市区町村</label>
                  <select id="profile-city-select" name="city">
                    <option value="">都道府県を先に選択</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label>番地以下（住所詳細）</label>
                <input name="address" placeholder="例: 渋谷区渋谷1-2-3 ○○ビル401号室" />
                <small className="muted">公開ページには表示されません。距離マッチング精度向上のみに使用します。</small>
              </div>
              <div className="form-field">
                <label>最寄り駅・アクセス（公開される情報）</label>
                <input name="nearest_station" placeholder="例: 渋谷駅から徒歩5分" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <input type="checkbox" name="online_available" id="online_available" />
                <label htmlFor="online_available" style={{ margin: '0', fontSize: '13px', fontWeight: '400' }}>オンライン対応あり（バッジ表示）</label>
              </div>

              {/* ── 料金・支払い ── */}
              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '20px 0 10px', paddingTop: '16px', borderTop: '1px solid rgba(232,228,220,0.12)' }}>料金・支払い</h3>
              <div className="form-field">
                <label>最低価格（円）</label>
                <input name="price_from" type="number" placeholder="例: 10000" />
                <small className="muted">検索ページでの価格フィルターに使用されます</small>
              </div>
              <div className="form-field">
                <label>支払い方法（複数選択可）</label>
                <div className="checkbox-group">
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="cash" />現金</label>
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="credit" />クレジットカード</label>
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="paypay" />PayPay</label>
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="rakuten_pay" />楽天Pay</label>
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="line_pay" />LINE Pay</label>
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="bank" />銀行振込</label>
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="other" />その他</label>
                </div>
              </div>

              <div className="form-field">
                <label>他サービスとの違い・このガイドだけの強み（最上部にゴールドで表示）</label>
                <textarea name="unique_strengths" placeholder={"例: マッチングアプリの写真撮影と外見コーチングをセットで提供できる唯一のサービスです。\n撮影から約1週間でプロフィール改善の結果を実感できます。"}></textarea>
                <small className="muted">同カテゴリで比較されたとき最初に目に入る場所です。「なぜここを選ぶか」を一言で書いてください。</small>
              </div>
              {[1, 2, 3].map(slot => (
                <div key={slot} className="form-field">
                  <label>施設・スタジオ写真 {['①','②','③'][slot-1]}</label>
                  <div id={`facility-photo-preview-wrap-${slot}`} style={{ marginBottom: '8px', display: 'none' }}>
                    <img id={`facility-photo-preview-${slot}`} src="" alt={`施設写真${slot}`} style={{ width: '160px', height: '110px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  </div>
                  <input type="file" id={`facility-img-input-${slot}`} accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                  <button type="button" id={`facility-img-btn-${slot}`} className="btn btn-ghost" style={{ fontSize: '13px' }}>📷 写真を選択（5MB以内・jpg/png/webp）</button>
                  <p id={`facility-img-msg-${slot}`} className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                  <input type="hidden" name={`facility_photo_${slot}`} />
                </div>
              ))}

              <button type="submit" className="btn" style={{ marginTop: '8px' }}>保存する</button>
            </form>
          </div>
        </div>

        {/* タブ④：スタッフ */}
        <div className="tab-pane" id="tab-staff">
          <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '16px' }}>スタッフ管理</h2>
                <p className="muted" style={{ margin: '0', fontSize: '12px', lineHeight: '1.6' }}>
                  個人でやっている方は、ご自身を「スタッフ」として登録してください。<br />
                  掲載者公開ページの「スタッフ紹介」欄に表示されます。
                </p>
              </div>
              <button type="button" className="btn" id="btn-add-staff" style={{ fontSize: '13px', padding: '7px 14px', flexShrink: '0' }}>＋ 追加</button>
            </div>
            <div id="staff-list"><p className="muted">読み込み中…</p></div>
          </div>

          {/* スタッフ追加・編集フォーム */}
          <div className="card" id="staff-edit-card" style={{ padding: '24px', display: 'none' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px' }} id="staff-edit-title">スタッフを追加</h3>
            <form id="staff-edit-form">
              <div className="form-field"><label>名前 *</label><input name="name" required placeholder="例: 山田 太郎" /></div>
              <div className="form-field"><label>役職・肩書き</label><input name="role" placeholder="例: パーソナルトレーナー / 代表" /></div>
              <div className="form-field">
                <label>写真</label>
                <div id="staff-photo-preview-wrap" style={{ marginBottom: '8px', display: 'none' }}>
                  <img id="staff-photo-preview" src="" alt="スタッフ写真" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%', border: '2px solid #e5e7eb' }} />
                </div>
                <input type="file" id="staff-img-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                <button type="button" id="staff-img-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>📷 写真を選択（5MB以内）</button>
                <p id="staff-img-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                <input type="hidden" name="photo_url" id="staff-photo-url" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-field"><label>経験年数</label><input name="experience_years" type="number" min="0" placeholder="例: 5" /></div>
                <div className="form-field"><label>表示順（小さい順）</label><input name="sort_order" type="number" min="0" defaultValue="0" /></div>
              </div>
              <div className="form-field"><label>資格・経歴</label><textarea name="credentials" placeholder={"例: NSCA認定パーソナルトレーナー\n元プロサッカー選手 8年"} style={{ minHeight: '80px' }}></textarea></div>
              <div className="form-field"><label>自己紹介・一言メッセージ</label><textarea name="bio" placeholder="例: 「外見を整えることは、生き方を整えること」。一人ひとりのペースで、一緒に歩んでいきます。" style={{ minHeight: '100px' }}></textarea></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <input type="checkbox" name="is_featured" id="staff-is-featured" />
                <label htmlFor="staff-is-featured" style={{ margin: '0', fontSize: '13px', fontWeight: '400' }}>担当スタッフとして優先表示する</label>
              </div>
              <input type="hidden" name="_staff_id" />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn">保存</button>
                <button type="button" className="btn btn-ghost" id="staff-cancel-btn">キャンセル</button>
              </div>
            </form>
          </div>
        </div>

        {/* タブ⑤：サービス設定 */}
        <div className="tab-pane" id="tab-service">

          {/* Finemeユーザー像バナー */}
          <div className="card" style={{ padding: '20px 22px', marginBottom: '16px', background: 'linear-gradient(135deg,#eff6ff,#eef2ff)', border: '1px solid #c7d2fe' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#6366f1', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Finemeに来るユーザーはどんな人か？</div>
            <p style={{ fontSize: '13px', color: '#1e1b4b', fontWeight: '600', margin: '0 0 12px', lineHeight: '1.7' }}>
              Finemeのユーザーは<strong>「Me Scanを受けた、変わる意志が決まっている人」</strong>です。<br />
              自分の<strong>コンパス軸（最優先の変容テーマ）</strong>を持ってあなたのページを訪れます。
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '8px', marginBottom: '12px' }}>
              {[
                { icon: '🧬', text: 'Me Scanで8軸をスキャン済み' },
                { icon: '🧭', text: 'コンパス軸（最優先テーマ）が決まっている' },
                { icon: '💬', text: '「来た道（タイプ）」が明確' },
                { icon: '🎯', text: '対応軸が一致すれば優先表示' },
              ].map(item => (
                <div key={item.icon} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', background: 'rgba(255,255,255,0.7)', borderRadius: '10px', padding: '10px' }}>
                  <span style={{ fontSize: '15px', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: '11px', color: '#374151', lineHeight: '1.5', fontWeight: '600' }}>{item.text}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: '#4f46e5', margin: '0', fontWeight: '700' }}>
              → 各プログラムに「対応軸」を設定すると、その軸のコンパスを持つユーザーに優先表示されます
            </p>
          </div>

          {/* サービス（メニュー）一覧 */}
          <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ margin: '0', fontSize: '16px' }}>サービス・メニュー</h2>
              <button type="button" className="btn" id="btn-add-service" style={{ fontSize: '13px', padding: '7px 14px' }}>＋ 追加</button>
            </div>
            <div id="services-list"><p className="muted">読み込み中…</p></div>
          </div>
          {/* サービス追加・編集フォーム */}
          <div className="card" id="service-edit-card" style={{ padding: '24px', marginBottom: '16px', display: 'none' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px' }} id="service-edit-title">サービスを追加</h3>
            <form id="service-edit-form">
              <div className="form-field"><label>サービス名 *</label><input name="name" required placeholder="例: 初回体験コース 60分" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-field"><label>価格（円）*</label><input name="price" type="number" required placeholder="5000" /></div>
                <div className="form-field"><label>所要時間</label><input name="duration" placeholder="例: 60分" /></div>
              </div>

              {/* サービスカテゴリ（L14） */}
              <div className="form-field">
                <label>サービスカテゴリ</label>
                <select name="category">
                  <option value="">選択しない</option>
                  <option value="gym">💪 ジム・パーソナルトレーニング</option>
                  <option value="makeup">💄 メイク・コスメ</option>
                  <option value="hair">💇 ヘア・美容院</option>
                  <option value="colordiagnosis">🎨 パーソナルカラー診断</option>
                  <option value="bonediagnosis">🔍 骨格診断</option>
                  <option value="diagnosis">📋 診断（総合・イメコン）</option>
                  <option value="fashion">👔 ファッション・スタイリング</option>
                  <option value="photo">📷 プロフィール写真・撮影</option>
                  <option value="marriage">💍 婚活・マッチングサポート</option>
                  <option value="eyebrow">✏️ 眉毛サロン</option>
                  <option value="hairremoval">🪒 脱毛</option>
                  <option value="esthetic">✨ エステ・フェイシャル</option>
                  <option value="whitening">😁 歯のホワイトニング</option>
                  <option value="orthodontics">🦷 歯列矯正</option>
                  <option value="nail">💅 ネイル</option>
                  <option value="aga">💊 AGA・薄毛治療</option>
                  <option value="consulting">🗣 コンサルティング</option>
                </select>
                <small className="muted">検索ページでのカテゴリ絞り込みに使われます</small>
              </div>

              {/* 対応軸（新） */}
              <div className="form-field">
                <label>対応軸（Me Scan 8軸）</label>
                <select name="target_axis">
                  <option value="">選択しない</option>
                  <option value="body">💪 体型・ボディ</option>
                  <option value="eyebrow">✏️ 眉</option>
                  <option value="fashion">👔 服・コーデ</option>
                  <option value="hair">💇 髪・ヘア</option>
                  <option value="skin">✨ 肌・エステ</option>
                  <option value="teeth">😁 歯・口元</option>
                  <option value="nail">💅 爪</option>
                </select>
                <small className="muted">設定すると、その軸のコンパスを持つユーザーのプログラム一覧で最上位に表示されます</small>
              </div>

              {/* 変容の約束（新） */}
              <div className="form-field">
                <label>変容の約束（一言キャッチコピー）</label>
                <input name="transformation_promise" placeholder="例: 骨格から計算した眉で、顔の印象が一変します" />
                <small className="muted">掲載者ページのプログラムカードで「」に囲まれて表示されます</small>
              </div>

              {/* Before / After（新） */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-field">
                  <label>受ける前の状態（Before）</label>
                  <textarea name="before_text" placeholder="例: 眉の形がわからず、なんとなく描いている" style={{ minHeight: '80px' }}></textarea>
                </div>
                <div className="form-field">
                  <label>受けた後の状態（After）</label>
                  <textarea name="after_text" placeholder="例: 骨格に合った眉で、顔全体が引き締まって見える" style={{ minHeight: '80px' }}></textarea>
                </div>
              </div>

              {/* Before/After 画像（任意） */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '4px' }}>
                <div className="form-field">
                  <label style={{ fontSize: '11px' }}>Before 画像（任意）</label>
                  <div id="service-before-img-wrap" style={{ marginBottom: '6px', display: 'none' }}>
                    <img id="service-before-img-preview" src="" alt="Before" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  </div>
                  <input type="file" id="service-before-img-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                  <button type="button" id="service-before-img-btn" className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 10px' }}>📷 画像追加</button>
                  <p id="service-before-img-msg" className="muted" style={{ fontSize: '11px', margin: '3px 0 0', display: 'none' }}></p>
                  <input type="hidden" name="before_image_url" id="service-before-image-url" />
                </div>
                <div className="form-field">
                  <label style={{ fontSize: '11px' }}>After 画像（任意）</label>
                  <div id="service-after-img-wrap" style={{ marginBottom: '6px', display: 'none' }}>
                    <img id="service-after-img-preview" src="" alt="After" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  </div>
                  <input type="file" id="service-after-img-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                  <button type="button" id="service-after-img-btn" className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 10px' }}>📷 画像追加</button>
                  <p id="service-after-img-msg" className="muted" style={{ fontSize: '11px', margin: '3px 0 0', display: 'none' }}></p>
                  <input type="hidden" name="after_image_url" id="service-after-image-url" />
                </div>
              </div>

              {/* ベネフィットリスト（新） */}
              <div className="form-field">
                <label>このプログラムで変わること（1行1項目）</label>
                <textarea name="benefit_list_text" placeholder={"例:\n自分に似合う眉の形が客観的にわかる\n毎朝5分で再現できるセルフケア手順を習得できる\nマッチングアプリの写真で印象が変わる"} style={{ minHeight: '120px' }}></textarea>
                <small className="muted">1行につき1項目。掲載者ページで✓リストとして表示されます（最大5項目）</small>
              </div>
              <div className="form-field">
                <label>サービス画像</label>
                <div id="service-img-preview-wrap" style={{ marginBottom: '8px', display: 'none' }}>
                  <img id="service-img-preview" src="" alt="サービス画像" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                </div>
                <input type="file" id="service-img-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                <button type="button" id="service-img-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>📷 サービス画像を設定（任意）</button>
                <p id="service-img-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                <input type="hidden" name="image_url" id="service-image-url" />
              </div>
              <div className="form-field">
                <label>このプログラムが向いている来た道の類型（任意・複数選択可）</label>
                <small className="muted" style={{ marginBottom: '8px', display: 'block' }}>選択すると掲載者公開ページでバッジとして表示されます</small>
                <div className="checkbox-group">
                  <label className="checkbox-item"><input type="checkbox" name="suitable_path_types" value="virgin" />初めてタイプ</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_path_types" value="quit" />続かなかったタイプ</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_path_types" value="blind" />非客観視タイプ</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_path_types" value="lapsed" />再開タイプ</label>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <input type="checkbox" name="is_featured" id="is_featured" />
                <label htmlFor="is_featured" style={{ margin: '0', fontSize: '13px', fontWeight: '400' }}>おすすめプログラムとして表示する</label>
              </div>
              <input type="hidden" name="_service_id" />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn" id="service-save-btn">保存</button>
                <button type="button" className="btn btn-ghost" id="service-cancel-btn">キャンセル</button>
              </div>
            </form>
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>New Me Navi マッチング設定</h2>
            <p className="muted" style={{ fontSize: '13px', margin: '0 0 12px', lineHeight: '1.6' }}>ユーザーのNew Me Naviに基づいて「あなたとの一致度」が自動計算されます。カバーする8軸は登録カテゴリから自動検出されます。</p>
            <div id="axis-coverage-info" style={{ marginBottom: '16px' }}></div>
            <form id="service-form">
              <div className="form-field"><label>サービス説明文（料金・メニューなど）</label><textarea name="description" placeholder="提供するサービスの詳細をここに書いてください"></textarea></div>
              <div className="form-field">
                <label>提供スタイル（New Me Navi連動）</label>
                <select name="provider_style">
                  <option value="">選択してください</option>
                  <option value="explanation">納得してから動く人向け（理由を丁寧に説明するスタイル）</option>
                  <option value="consultation">相談しながら進めたい人向け</option>
                  <option value="delegate">任せて結果を出してほしい人向け</option>
                  <option value="cautious">小さく試したい人向け</option>
                </select>
                <small className="muted">ユーザーのMe Scan回答のスタイル傾向と照合されます</small>
              </div>

              {/* ── AIマッチングプロフィール ── */}
              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '20px 0 10px', paddingTop: '16px', borderTop: '1px solid rgba(232,228,220,0.12)' }}>AIマッチングプロフィール</h3>
              <p className="muted" style={{ fontSize: '12px', margin: '0 0 14px', lineHeight: '1.6' }}>
                ここに書いた内容をAIが読み取り、あなたのサービスにどんなユーザーが合うかを自動判定します。<br />
                チェックボックスより精度の高いマッチングが実現します。書くほど効果的です。
              </p>
              <div className="form-field">
                <label>よく来るお客様の状況・背景</label>
                <textarea name="ideal_client_desc" rows={3} placeholder="例: マッチングアプリを始めたばかりで、写真の撮り方もわからない30代のサラリーマンが多い。自信がなく、何から始めればいいかわからない方が多い。" />
              </div>
              <div className="form-field">
                <label>来る前の典型的な状態</label>
                <textarea name="client_before_state" rows={3} placeholder="例: 外見に無頓着で、ジムや美容院に何年も行っていない。服は量販店で適当に買っていて、自分に似合うものがわからない。" />
              </div>
              <div className="form-field">
                <label>よく起きる変化のパターン</label>
                <textarea name="transformation_pattern" rows={3} placeholder="例: 3回通うと姿勢と歩き方が変わり、周囲から「変わった？」と言われ始める。6ヶ月で体重10kg減・マッチング率が上がったという声が多い。" />
              </div>
              <div className="form-field">
                <label>特に向いている人・状況</label>
                <textarea name="best_fit_desc" rows={3} placeholder="例: 「何かを変えなければ」と焦りを感じている人。過去に挫折したが今回こそはと思っている人。一人ではモチベーションが続かない人に特に向いている。" />
              </div>

              {/* AI分析ボタン */}
              <div style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#a5b4fc', marginBottom: '6px' }}>AIプロフィール分析</div>
                <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.75)', margin: '0 0 12px', lineHeight: '1.6' }}>
                  上の4つのフィールドを保存した後、「AIで分析する」をクリックするとClaudeがプロフィール全体を読み取り、マッチング精度を向上させます。
                </p>
                <div id="ai-match-status" style={{ fontSize: '12px', color: 'rgba(232,228,220,0.6)', marginBottom: '10px' }}></div>
                <button type="button" id="ai-analyze-btn" className="btn" style={{ background: '#4f46e5', color: '#fff', fontSize: '13px', padding: '8px 18px' }}>
                  AIで分析する
                </button>
              </div>

              <div className="form-field">
                <label>得意なきっかけ（複数選択可）</label>
                <div className="checkbox-group">
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="matching_app" />マッチングアプリ</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="love" />恋愛・告白前</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="career" />就職・転職前</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="word" />一言が刺さった</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="vague" />ずっと気になっていた</label>
                </div>
              </div>
              <div className="form-field">
                <label>得意な「来た道」の類型（複数選択可）</label>
                <small className="muted" style={{ display: 'block', marginBottom: '8px' }}>New Me Naviの「来た道スコア」と照合されます。該当する方にとって一致度が高くなります。</small>
                <div className="checkbox-group">
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="lost_direction" />以前やっていたが疎かになった方（再開タイプ）</label>
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="no_continuation" />始めたが続かなかった方（継続タイプ）</label>
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="no_result" />やっているが客観的評価がない方（非客観視タイプ）</label>
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="cost" />コストで断念した経験がある方</label>
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="awkward" />プロとの関係性で悩んだ方</label>
                </div>
              </div>
              {/* ── 予約・比較情報 ── */}
              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '20px 0 10px', paddingTop: '16px', borderTop: '1px solid rgba(232,228,220,0.12)' }}>予約・比較情報</h3>
              <small className="muted" style={{ display: 'block', marginBottom: '14px', fontSize: '12px', lineHeight: '1.6' }}>相談フォームや比較時に表示される情報です。設定するほどユーザーの「踏み出せない理由」を減らせます。</small>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input type="checkbox" name="trial_available" id="trial_available" />
                <label htmlFor="trial_available" style={{ margin: '0', fontSize: '13px', fontWeight: '400' }}>お試し・無料相談あり（クイックファクトにバッジ表示）</label>
              </div>
              <div className="form-field"><label>お試しコースの内容説明</label><textarea name="trial_desc" placeholder="例: 初回30分無料の外見相談を実施しています。オンライン可。まず話を聞くだけでもOKです。"></textarea></div>
              <div className="form-field">
                <label>返信目安</label>
                <select name="response_hours">
                  <option value="">設定しない</option>
                  <option value="12">12時間以内</option>
                  <option value="24">24時間以内（翌日）</option>
                  <option value="48">48時間以内（2日）</option>
                  <option value="72">72時間以内（3日）</option>
                </select>
                <small className="muted">「返信〇時間以内」として相談ページに表示。設定するだけで申込率が上がります。</small>
              </div>
              <div className="form-field">
                <label>キャンセルポリシー</label>
                <textarea name="cancellation_policy" placeholder="例: 前日24時間前までのキャンセルは無料。当日キャンセルは料金の50%をいただきます。"></textarea>
              </div>
              <div className="form-field">
                <label>初回セッションの内容説明</label>
                <textarea name="first_session_desc" placeholder="例: 初回は60分のカウンセリングから始まります。現状ヒアリング・外見診断・今後のプラン提案を行います。見学・話を聞くだけでも歓迎です。"></textarea>
                <small className="muted">相談フォームの直前にユーザーへ表示されます。「何が起きるかわからない不安」を解消する文章を書いてください。</small>
              </div>

              <button type="submit" className="btn" style={{ marginTop: '8px' }}>保存する</button>
            </form>
          </div>
        </div>

        {/* タブ⑤：体験談 */}
        <div className="tab-pane" id="tab-stories">
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>体験談の管理</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                利用者から寄せられた体験談の表示・非表示を切り替えられます。<br />
                非表示にした体験談は公開ページには表示されません。
              </p>
            </div>
            <div id="stories-list"><p className="muted">読み込み中…</p></div>
          </div>
        </div>

        {/* New Me Log：紐づいている顧客の一覧 */}
        <div className="tab-pane" id="tab-customers">
          <div className="card stack" style={{ padding: '24px', gap: 12, marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px' }}>推奨来店周期の設定</h2>
            <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
              設定すると、お客様がNew Me Logで貴店を選んだ時に頻度欄へ自動で入力されます（任意・お客様は自分で書き換えられます）。
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ minWidth: '160px' }}>
                <label>軸</label>
                <select id="rf-axis"></select>
              </div>
              <div className="form-field" style={{ minWidth: '90px' }}>
                <label>周期</label>
                <input id="rf-value" type="number" min="1" placeholder="例：6" />
              </div>
              <div className="form-field" style={{ minWidth: '110px' }}>
                <label>単位</label>
                <select id="rf-unit">
                  <option value="week">週ごと</option>
                  <option value="month">ヶ月ごと</option>
                </select>
              </div>
              <button className="btn" id="rf-save-btn" type="button">設定する</button>
            </div>
            <div id="rf-list"></div>
          </div>

          <div className="card stack" style={{ padding: '24px', gap: 12, marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px' }}>休眠判定の設定</h2>
            <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
              最終来店からこの日数を超えたお客様を「休眠」として一覧に表示します（既定90日）。
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ minWidth: '120px' }}>
                <label>未来店日数</label>
                <input id="ds-days" type="number" min="1" placeholder="90" />
              </div>
              <button className="btn" id="ds-save-btn" type="button">設定する</button>
              <span id="ds-msg" className="muted" style={{ fontSize: '13px' }}></span>
            </div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>New Me Log で紐づいているお客様</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                お客様がNew Me Log（無料の来店サイクル管理ツール）にご自身で登録し、お店を紐づけると、ここに表示されます。<br />
                リマインドは、店舗の公式LINEを連携している場合はそちらから、未連携の場合はFineme公式LINEから自動で送られます。まだ案内していない場合は
                <a href="/provider/log-toolkit" style={{ color: 'inherit', textDecoration: 'underline' }}>紹介用QRコード</a>
                をお店に置いてください。
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
              <label className="muted" style={{ fontSize: '13px' }}>表示：</label>
              <select id="customers-filter">
                <option value="all">すべて</option>
                <option value="user-overdue">ユーザー想定超過のみ</option>
                <option value="store-overdue">店舗推奨超過のみ</option>
                <option value="dormant">休眠のみ</option>
              </select>
            </div>
            <div id="customers-list"><p className="muted">読み込み中…</p></div>
          </div>
        </div>

        {/* LINE連携：店舗の公式LINEアカウントを連携し、そちらからリマインドを送る */}
        <div className="tab-pane" id="tab-line-channel">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>店舗の公式LINEと連携する</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                連携すると、お客様への来店リマインドがFineme公式LINEではなく、この店舗の公式LINEから届くようになります。<br />
                既に公式LINEを友だち追加しているお客様に届きやすくなります。<br />
                設定にはLINE Official Account ManagerでのMessaging API有効化・チャネルアクセストークンの発行が必要です。ご不明な場合はサポートいたしますのでお気軽にお問い合わせください。
              </p>
            </div>
            <div id="line-channel-status" className="muted" style={{ fontSize: '13px' }}>読み込み中…</div>
            <div id="lc-webhook-url-box" style={{ display: 'none', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '8px', padding: '12px' }}>
              <p className="muted" style={{ fontSize: '12px', margin: '0 0 4px' }}>予約前日リマインドの「行きます」ボタン等（ノーショー対策）を使う場合は、LINE Official Account Managerの「応答設定」→Webhookで以下のURLを設定してください（任意）：</p>
              <code id="lc-webhook-url" style={{ background: '#f3f4f6', color: '#111827', padding: '4px 8px', borderRadius: 4, fontSize: 12, wordBreak: 'break-all', display: 'inline-block' }}></code>
            </div>
            <form id="line-channel-form" className="stack" style={{ gap: '10px' }}>
              <div className="form-field">
                <label>チャネルID</label>
                <input id="lc-channel-id" type="text" placeholder="任意（控えとして保存）" />
              </div>
              <div className="form-field">
                <label>チャネルシークレット</label>
                <input id="lc-channel-secret" type="text" placeholder="任意（控えとして保存）" />
              </div>
              <div className="form-field">
                <label>チャネルアクセストークン *</label>
                <input id="lc-channel-token" type="text" placeholder="LINE Official Account Managerで発行したトークン" />
                <small className="muted" style={{ display: 'block', marginTop: '4px' }}>初回連携時は必須です。連携済みでLIFF IDだけ追記・変更する場合は空欄のままで構いません。</small>
              </div>
              <div className="form-field">
                <label>LIFF ID</label>
                <small className="muted" style={{ display: 'block', marginBottom: '4px' }}>お客様の連携ページ（LIFF）を作成した場合のみ入力してください</small>
                <input id="lc-liff-id" type="text" placeholder="任意" />
              </div>
              <button type="submit" className="btn" id="lc-submit-btn">保存して確認する</button>
              <p id="lc-msg" className="muted" style={{ fontSize: '13px' }}></p>
            </form>
          </div>
        </div>

        {/* クチコミ依頼の自動化：来店確定の1〜2日後にGoogleクチコミ投稿を促すLINEを自動送信 */}
        <div className="tab-pane" id="tab-reviews">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>来店後クチコミ依頼の自動化</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                GoogleクチコミのURLを設定すると、予約が「来店済み」になった1〜2日後に、自動でクチコミ投稿をお願いするメッセージをお客様に送ります（店舗の公式LINE連携済みならそちらから、未連携ならFineme公式LINEから）。<br />
                未設定の場合はこの機能は動作しません。
              </p>
            </div>
            <form id="review-form" className="stack" style={{ gap: '10px' }}>
              <div className="form-field">
                <label>GoogleクチコミURL</label>
                <input id="rv-url" type="url" placeholder="https://g.page/r/..." />
                <small className="muted" style={{ display: 'block', marginTop: '4px' }}>Googleビジネスプロフィールの「クチコミを増やす」から取得できるリンクです。</small>
              </div>
              <button type="submit" className="btn" id="rv-submit-btn">保存する</button>
              <p id="rv-msg" className="muted" style={{ fontSize: '13px' }}></p>
            </form>
          </div>
        </div>

        {/* タブ⑥：公開設定 */}
        <div className="tab-pane" id="tab-publish">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>公開設定</h2>
            <div className="publish-toggle">
              <label className="toggle-switch">
                <input type="checkbox" id="publish-toggle-input" />
                <span className="toggle-slider"></span>
              </label>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px' }} id="publish-label">非公開</div>
                <p className="muted" style={{ margin: '2px 0 0', fontSize: '13px' }}>非公開中はサイトに表示されませんが、月額費用は継続します。サービス内容の変更中や一時的に受付を止めたい場合にご利用ください。</p>
              </div>
            </div>
            <p className="muted" style={{ fontSize: '12px', margin: '0' }}>※ 掲載を完全に停止（解約）したい場合は「課金・プラン」タブからお手続きください。</p>
          </div>
        </div>

        {/* タブ⑥：課金・プラン */}
        <div className="tab-pane" id="tab-billing">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>課金・プラン</h2>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(232,228,220,0.6)', marginBottom: '4px' }}>現在のプラン</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#e8e4dc' }} id="billing-plan">読み込み中…</div>
              <div style={{ fontSize: '13px', color: 'rgba(232,228,220,0.6)', marginTop: '4px' }} id="billing-status"></div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(232,228,220,0.7)', marginBottom: '8px', fontWeight: '700' }}>紹介報酬制度</div>
              <p className="muted" style={{ fontSize: '13px', margin: '0 0 10px' }}>あなたの紹介コードを共有すると、紹介した方が掲載を継続している限り¥500/月の報酬を受け取れます。</p>
              <div className="referral-code-box" id="referral-code">—</div>
              <button className="btn btn-ghost" style={{ fontSize: '13px', marginTop: '10px', width: '100%' }} id="copy-referral">コードをコピー</button>
            </div>
            <div style={{ padding: '14px 16px', border: '1.5px solid rgba(232,228,220,0.15)', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.9)', margin: '0 0 8px', fontWeight: '700' }}>プラン変更・解約について</p>
              <p className="muted" style={{ fontSize: '13px', margin: '0' }}>プランの変更や解約は、運営（Fineme）への申請が必要です。<br />下記よりご連絡ください。</p>
              <a href="mailto:contact@fineme.me?subject=プラン変更・解約申請" className="btn btn-ghost" style={{ marginTop: '12px', display: 'inline-block', fontSize: '13px' }}>contact@fineme.me に連絡する</a>
            </div>
            {/* billing-portal-btn: referenced in JS for Stripe customer portal */}
            <button id="billing-portal-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>カスタマーポータルを開く</button>
          </div>
          <div className="card stack" style={{ padding: '24px', gap: '14px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>パスワード変更</h2>
            <div className="form-field"><label>新しいパスワード（8文字以上）</label><input type="password" id="new-pw1" /></div>
            <div className="form-field"><label>新しいパスワード（確認）</label><input type="password" id="new-pw2" /></div>
            <p id="pw-change-msg" style={{ fontSize: '13px', margin: '0', display: 'none' }}></p>
            <button className="btn" id="pw-change-btn" style={{ alignSelf: 'flex-start' }}>パスワードを変更する</button>
          </div>
        </div>

        {/* タブ⑦：紹介報酬 */}
        <div className="tab-pane" id="tab-referral">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>紹介報酬</h2>
            <p className="muted" style={{ fontSize: '13px', margin: '0', lineHeight: '1.7' }}>
              あなたの紹介コードを使ってFinemeに登録した掲載者が月額課金を継続している間、毎月¥500の報酬が発生します。
            </p>

            {/* 自分の紹介コード */}
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(232,228,220,0.7)', fontWeight: '700', marginBottom: '8px' }}>あなたの紹介コード</div>
              <div className="referral-code-box" id="referral-code-tab">—</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ fontSize: '13px', flex: '1' }} id="copy-referral-code-btn">コードをコピー</button>
                <button className="btn btn-ghost" style={{ fontSize: '13px', flex: '1' }} id="copy-referral-url-btn">紹介URLをコピー</button>
              </div>
            </div>

            {/* サマリーカード */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }} id="referral-summary-grid">
              <div className="stat-card"><div className="stat-value" id="ref-total-referred">—</div><div className="stat-label">紹介人数（合計）</div></div>
              <div className="stat-card"><div className="stat-value" id="ref-active-count">—</div><div className="stat-label">課金中の紹介者</div></div>
              <div className="stat-card"><div className="stat-value" id="ref-pending-month" style={{ color: '#6366f1' }}>—</div><div className="stat-label">今月の見込み報酬</div></div>
              <div className="stat-card"><div className="stat-value" id="ref-total-earned">—</div><div className="stat-label">累計報酬額</div></div>
            </div>

            {/* 紹介一覧テーブル */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 10px', color: 'rgba(232,228,220,0.9)' }}>紹介パートナー一覧</h3>
              <div id="referral-list"><p className="muted">読み込み中…</p></div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
