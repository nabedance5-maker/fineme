'use client';
import { useEffect, useState } from 'react';

const PAGE_LABELS = { diagnosis_result: '診断結果', map: 'Map' };

function avg(arr, key) {
  const vals = arr.map(r => r[key]).filter(v => v != null);
  if (!vals.length) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
}

function Stars({ val }) {
  if (val == null) return <span style={{color:'#9ca3af'}}>-</span>;
  return (
    <span style={{color:'#c9a84c',letterSpacing:'-1px'}}>
      {'★'.repeat(val)}{'☆'.repeat(5 - val)}
      <span style={{color:'#374151',marginLeft:4,letterSpacing:'normal'}}>{val}</span>
    </span>
  );
}

export default function AdminFeedbackPage() {
  const [rows, setRows]       = useState(null);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('');
  const [deleting, setDel]    = useState(null);

  const adminKey = typeof window !== 'undefined' ? sessionStorage.getItem('fineme:admin:key') : '';

  useEffect(() => { load(); }, []);

  async function load() {
    setRows(null);
    const res = await fetch('/api/admin/feedback?limit=500', {
      headers: { 'x-admin-key': sessionStorage.getItem('fineme:admin:key') || '' },
    });
    if (res.status === 401) { setError('管理者キーが必要です'); return; }
    const data = await res.json();
    if (!Array.isArray(data)) { setError(data?.error || 'エラー'); return; }
    setRows(data);
  }

  async function handleDelete(id) {
    if (!confirm('このフィードバックを削除しますか？')) return;
    setDel(id);
    await fetch('/api/admin/feedback', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': sessionStorage.getItem('fineme:admin:key') || '' },
      body: JSON.stringify({ id }),
    });
    setDel(null);
    load();
  }

  const filtered = rows
    ? rows.filter(r => !filter || r.page === filter)
    : [];

  const kpiAll  = rows ?? [];
  const kpiPage = filter ? filtered : kpiAll;

  return (
    <div style={{color:'#111827'}}>
      <h1 style={{fontSize:22,fontWeight:800,marginBottom:4}}>フィードバック</h1>
      <p style={{fontSize:13,color:'#6b7280',marginBottom:24}}>ユーザーから届いた診断・Mapへの評価</p>

      {error && <div style={{background:'#fee2e2',color:'#b91c1c',padding:'12px 16px',borderRadius:8,marginBottom:16}}>{error}</div>}

      {rows == null && !error && (
        <div style={{color:'#6b7280',padding:'40px 0',textAlign:'center'}}>読み込み中...</div>
      )}

      {rows != null && (
        <>
          {/* KPI cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:24}}>
            {[
              { label:'件数', val: kpiPage.length },
              { label:'的確さ（平均）', val: avg(kpiPage,'rating_accuracy') ? `★ ${avg(kpiPage,'rating_accuracy')}` : '-' },
              { label:'使いやすさ（平均）', val: avg(kpiPage,'rating_usability') ? `★ ${avg(kpiPage,'rating_usability')}` : '-' },
              { label:'また使いたいか（平均）', val: avg(kpiPage,'rating_revisit') ? `★ ${avg(kpiPage,'rating_revisit')}` : '-' },
            ].map(kpi => (
              <div key={kpi.label} style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:12,padding:'14px 16px'}}>
                <div style={{fontSize:11,color:'#6b7280',marginBottom:4}}>{kpi.label}</div>
                <div style={{fontSize:22,fontWeight:800,color:'#111827'}}>{kpi.val}</div>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            {['', 'diagnosis_result', 'map'].map(p => (
              <button key={p}
                style={{padding:'7px 16px',borderRadius:99,fontSize:13,fontWeight:filter===p?700:500,
                  background:filter===p?'#111827':'#f3f4f6',color:filter===p?'#fff':'#374151',
                  border:'1px solid',borderColor:filter===p?'#111827':'#e5e7eb',cursor:'pointer'}}
                onClick={() => setFilter(p)}
              >
                {p ? PAGE_LABELS[p] ?? p : 'すべて'}
              </button>
            ))}
            <button onClick={load} style={{marginLeft:'auto',padding:'7px 16px',borderRadius:99,fontSize:13,background:'#f3f4f6',border:'1px solid #e5e7eb',cursor:'pointer'}}>
              更新
            </button>
          </div>

          {/* Table */}
          {filtered.length === 0
            ? <div style={{textAlign:'center',color:'#9ca3af',padding:'48px 0'}}>フィードバックはまだありません</div>
            : (
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:'2px solid #e5e7eb',textAlign:'left'}}>
                      {['日時','ページ','的確さ','使いやすさ','また使いたい','タイプ','コンパス','コメント',''].map(h => (
                        <th key={h} style={{padding:'8px 10px',fontWeight:700,color:'#374151',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                        <td style={{padding:'10px',whiteSpace:'nowrap',color:'#6b7280'}}>
                          {new Date(r.created_at).toLocaleString('ja-JP',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
                        </td>
                        <td style={{padding:'10px',whiteSpace:'nowrap'}}>
                          <span style={{background:'#f3f4f6',padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:700}}>
                            {PAGE_LABELS[r.page] ?? r.page}
                          </span>
                        </td>
                        <td style={{padding:'10px'}}><Stars val={r.rating_accuracy}/></td>
                        <td style={{padding:'10px'}}><Stars val={r.rating_usability}/></td>
                        <td style={{padding:'10px'}}><Stars val={r.rating_revisit}/></td>
                        <td style={{padding:'10px',color:'#6b7280'}}>{r.type_code ?? '-'}</td>
                        <td style={{padding:'10px',color:'#6b7280'}}>{r.compass_first ?? '-'}</td>
                        <td style={{padding:'10px',maxWidth:240,color:'#374151'}}>{r.comment ?? <span style={{color:'#d1d5db'}}>-</span>}</td>
                        <td style={{padding:'10px'}}>
                          <button
                            disabled={deleting === r.id}
                            onClick={() => handleDelete(r.id)}
                            style={{color:'#ef4444',background:'none',border:'none',cursor:'pointer',fontSize:12,padding:'2px 6px'}}
                          >削除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </>
      )}
    </div>
  );
}
