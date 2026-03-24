'use client';
import { useEffect, useRef } from 'react';

export default function AdminInquiriesPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .table th, .table td { padding:8px; border-bottom:1px solid var(--color-border) }
      .badge { display:inline-block; padding:2px 8px; font-size:12px; border-radius:999px; background:#111; color:#fff }
      .row-note{ color:#6b7280; font-size:12px }
      .msg { max-width:720px; white-space:pre-wrap }
      .filters { display:flex; gap:8px; flex-wrap:wrap; align-items:end }
      .status-new { background:#111; color:#fff }
      .status-done { background:#16a34a; color:#fff }
    `;
    document.head.appendChild(style);

    let ADMIN_KEY = sessionStorage.getItem('fineme:admin:key') || '';
    if (!ADMIN_KEY) {
      ADMIN_KEY = prompt('管理APIキーを入力してください：') || '';
      if (ADMIN_KEY) sessionStorage.setItem('fineme:admin:key', ADMIN_KEY);
    }

    function h() { return { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY }; }

    function labelCategory(v) {
      const map = { hair: '美容室・ヘアサロン', esthetic: 'エステ・痩身', nails: 'ネイル', makeup: 'メイク・顔分析', eyelash: 'まつ毛・アイブロウ', cosmetic: '美容外科・美容クリニック' };
      return map[v] || (v || '—');
    }

    function formatDate(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '—';
      return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    let allData = [];

    async function load() {
      const tbody = document.getElementById('inq-tbody');
      tbody.innerHTML = '<tr><td colspan="8" class="muted">読み込み中…</td></tr>';
      try {
        const res = await fetch('/api/admin/inquiries', { headers: h() });
        if (!res.ok) { tbody.innerHTML = '<tr><td colspan="8" style="color:#ef4444;padding:8px">取得エラー。APIキーを確認してください。</td></tr>'; return; }
        allData = await res.json();
        render();
      } catch {
        tbody.innerHTML = '<tr><td colspan="8" style="color:#ef4444;padding:8px">ネットワークエラー</td></tr>';
      }
    }

    function filterData(arr) {
      const q = (document.getElementById('inq-q').value || '').toLowerCase();
      const cat = document.getElementById('inq-cat').value;
      const status = document.getElementById('inq-status').value;
      return arr.filter(it => {
        if (cat && it.category !== cat) return false;
        if (status && it.status !== status) return false;
        if (q) {
          const hay = [it.biz_name, it.contact_name, it.email, it.phone, it.message].map(v => (v||'').toLowerCase()).join(' ');
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    }

    function render() {
      const tbody = document.getElementById('inq-tbody');
      const arr = filterData(allData);
      tbody.innerHTML = '';
      if (!arr.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="8" class="muted" style="padding:12px">データがありません</td>';
        tbody.appendChild(tr); return;
      }
      for (const it of arr) {
        const isDone = it.status === 'done';
        const tr = document.createElement('tr');
        const contact = [it.email, it.phone].filter(Boolean).join(' / ');
        tr.innerHTML = `
          <td>${formatDate(it.created_at)}</td>
          <td>${esc(it.biz_name)}</td>
          <td>${esc(it.contact_name)}</td>
          <td style="font-size:12px">${esc(contact)}</td>
          <td>${labelCategory(it.category)}</td>
          <td>${esc(it.contact_pref)}</td>
          <td><span class="badge ${isDone ? 'status-done' : 'status-new'}">${isDone ? '対応済み' : '未対応'}</span></td>
          <td class="row-note">▼</td>
        `;
        const tr2 = document.createElement('tr');
        const td2 = document.createElement('td');
        td2.colSpan = 8;
        td2.innerHTML = `
          <div class="stack" style="gap:6px;padding:8px 0">
            <div class="msg">${esc(it.message || '')}</div>
            <div class="cluster" style="gap:8px">
              <button class="btn btn-ghost" data-act="done">${isDone ? '未対応に戻す' : '対応済みにする'}</button>
              <button class="btn btn-ghost" data-act="copy">内容をコピー</button>
              <button class="btn btn-ghost" data-act="delete" style="color:#b91c1c">削除</button>
            </div>
          </div>`;
        tr2.appendChild(td2);

        td2.querySelector('[data-act="done"]').addEventListener('click', async () => {
          const newStatus = isDone ? 'new' : 'done';
          await fetch('/api/admin/inquiries', { method: 'PATCH', headers: h(), body: JSON.stringify({ id: it.id, status: newStatus }) });
          it.status = newStatus;
          render();
        });
        td2.querySelector('[data-act="copy"]').addEventListener('click', () => {
          const text = [`【会社/屋号】${it.biz_name||''}`,`【担当者】${it.contact_name||''}`,`【メール】${it.email||''}`,it.phone?`【電話】${it.phone}`:'',`【カテゴリ】${labelCategory(it.category)}`,`【連絡希望】${it.contact_pref||''}`,`【内容】${(it.message||'').trim()}`].filter(Boolean).join('\n');
          navigator.clipboard.writeText(text).catch(()=>{});
        });
        td2.querySelector('[data-act="delete"]').addEventListener('click', async () => {
          if (!confirm('この問い合わせを削除しますか？')) return;
          await fetch('/api/admin/inquiries', { method: 'DELETE', headers: h(), body: JSON.stringify({ id: it.id }) });
          allData = allData.filter(x => x.id !== it.id);
          render();
        });

        // 行クリックで展開
        tr.style.cursor = 'pointer';
        let open = false;
        tr2.style.display = 'none';
        tr.addEventListener('click', () => { open = !open; tr2.style.display = open ? '' : 'none'; });

        tbody.appendChild(tr);
        tbody.appendChild(tr2);
      }
    }

    function exportCSV() {
      const arr = filterData(allData);
      const headers = ['id','created_at','status','biz_name','contact_name','email','phone','category','contact_pref','message'];
      const esc2 = v => '"' + String(v||'').replace(/"/g,'""') + '"';
      const lines = [headers.join(','), ...arr.map(it => headers.map(h => esc2(it[h])).join(','))];
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `inquiries-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
    }

    document.getElementById('inq-q').addEventListener('input', render);
    document.getElementById('inq-cat').addEventListener('change', render);
    document.getElementById('inq-status').addEventListener('change', render);
    document.getElementById('inq-export-csv').addEventListener('click', exportCSV);

    load();

    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  return (
    <main className="section">
      <div>
        <section className="stack">
          <h1 className="section-title">問い合わせ一覧</h1>
          <p className="muted">掲載相談フォームからの問い合わせ（Supabase保存）</p>

          <div className="card" style={{padding:'12px'}}>
            <div className="filters">
              <label>キーワード
                <input id="inq-q" type="search" placeholder="会社名・担当者・メール・本文で検索" />
              </label>
              <label>カテゴリ
                <select id="inq-cat">
                  <option value="">すべて</option>
                  <option value="hair">美容室・ヘアサロン</option>
                  <option value="esthetic">エステ・痩身</option>
                  <option value="nails">ネイル</option>
                  <option value="makeup">メイク・顔分析</option>
                  <option value="eyelash">まつ毛・アイブロウ</option>
                  <option value="cosmetic">美容外科・美容クリニック</option>
                </select>
              </label>
              <label>状態
                <select id="inq-status">
                  <option value="">すべて</option>
                  <option value="new">未対応</option>
                  <option value="done">対応済み</option>
                </select>
              </label>
              <button id="inq-export-csv" className="btn btn-ghost" type="button">CSVエクスポート</button>
            </div>
          </div>

          <div className="card" style={{padding:'12px'}}>
            <div className="table-responsive">
              <table className="table" style={{width:'100%'}}>
                <thead>
                  <tr>
                    <th style={{textAlign:'left'}}>受信日時</th>
                    <th style={{textAlign:'left'}}>会社/屋号</th>
                    <th style={{textAlign:'left'}}>担当者</th>
                    <th style={{textAlign:'left'}}>連絡先</th>
                    <th style={{textAlign:'left'}}>カテゴリ</th>
                    <th style={{textAlign:'left'}}>希望</th>
                    <th style={{textAlign:'left'}}>状態</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="inq-tbody">
                  <tr><td colSpan={8} className="muted" style={{padding:'12px'}}>読み込み中…</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
