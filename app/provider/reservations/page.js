'use client';
import { useEffect, useRef } from 'react';

export default function ProviderReservationsPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    function listReservations() {
      try {
        const raw = localStorage.getItem('fineme:reservations:list');
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch { return []; }
    }
    function confirmVisited(id) {
      try {
        const key = 'fineme:reservations:list';
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = arr.findIndex(r => r.id === id);
        if (idx === -1) return { ok: false, error: 'not found' };
        arr[idx].status = 'visited';
        arr[idx].visitedAt = Date.now();
        localStorage.setItem(key, JSON.stringify(arr));
        return { ok: true };
      } catch { return { ok: false }; }
    }

    const host = document.getElementById('reservations-host');
    if (!host) return;

    function render() {
      host.textContent = '';
      const arr = listReservations();
      if (!arr.length) {
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = '予約がまだありません。';
        host.appendChild(p);
        return;
      }
      arr.forEach(r => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.padding = '12px';

        const h = document.createElement('div');
        h.className = 'cluster';
        h.style.justifyContent = 'space-between';

        const left = document.createElement('div');
        left.className = 'stack';
        left.appendChild(Object.assign(document.createElement('strong'), { textContent: r.title }));
        left.appendChild(Object.assign(document.createElement('span'), {
          className: 'muted',
          textContent: `予約者: ${r.userId} / 来店予定: ${new Date(r.visitDate).toLocaleString('ja-JP')}`
        }));

        const right = document.createElement('div');
        right.className = 'cluster';
        right.style.gap = '8px';

        const status = document.createElement('span');
        status.className = 'badge badge--neutral';
        status.textContent = r.status;
        right.appendChild(status);

        if (r.status !== 'visited') {
          const btn = document.createElement('button');
          btn.className = 'btn';
          btn.textContent = '来店確認';
          btn.addEventListener('click', async () => {
            const ok = confirm('このユーザーが来店したことを確認しますか？\n※ 確認後、体験談依頼メールが自動送信されます');
            if (!ok) return;
            const res = confirmVisited(r.id);
            if (res.ok) {
              status.textContent = 'visited';
              render();
            }
            try {
              const apiRes = await fetch(`/api/reservations?providerId=${r.storeId}`);
              const apiList = await apiRes.json();
              const match = (apiList || []).find(x =>
                x.provider_id === String(r.storeId) && x.status === 'approved' &&
                Math.abs(new Date(x.reserved_date) - new Date(r.visitDate)) < 86400000
              );
              if (match) {
                const userEmail = (match.user_contact || '').includes('@') ? match.user_contact : '';
                await fetch(`/api/reservations/${match.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'visited',
                    user_email: userEmail,
                    user_name: match.user_name,
                    provider_name: match.provider_id,
                    service_name: match.service_name || r.title,
                  }),
                });
              }
            } catch (e) { console.warn('[visited API]', e); }
            alert('来店確認しました。体験談依頼メールを送信しました。');
          });
          right.appendChild(btn);
        }

        h.appendChild(left);
        h.appendChild(right);
        card.appendChild(h);

        const meta = document.createElement('p');
        meta.className = 'muted';
        meta.textContent = `料金: ${r.price}円 / 手数料率: ${r.commissionRate}%`;
        card.appendChild(meta);

        host.appendChild(card);
      });
    }

    render();
  }, []);

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: '1000px' }}>
        <h1 className="section-title">予約一覧（掲載者向け）</h1>
        <p className="muted">来店確認を行うと、体験談依頼メールが自動送信されます。</p>
        <div id="reservations-host" className="stack"></div>
      </div>
    </main>
  );
}
