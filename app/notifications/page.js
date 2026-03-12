'use client';

import { useState, useEffect, useCallback } from 'react';

const NOTIFS_KEY = 'glowup:notifications';

function loadNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveNotifications(list) {
  try { localStorage.setItem(NOTIFS_KEY, JSON.stringify(list)); } catch {}
}

function markReadById(id) {
  const list = loadNotifications();
  let changed = false;
  for (const it of list) {
    if (it.id === id && !it.read) { it.read = true; changed = true; }
  }
  if (changed) saveNotifications(list);
}

function getUserSession() {
  try {
    const raw = localStorage.getItem('glowup:user:session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filterUnread, setFilterUnread] = useState(false);
  const [modal, setModal] = useState(null);

  const refresh = useCallback((unreadOnly = false) => {
    const all = loadNotifications();
    const sess = getUserSession();
    const filtered = all.filter(it => {
      if (sess) {
        if (it.toType === 'user' && it.toId && sess.id && it.toId !== sess.id) return false;
      }
      return unreadOnly ? !it.read : true;
    });
    setNotifications(filtered);
  }, []);

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  const handleMarkRead = (id) => {
    markReadById(id);
    refresh(filterUnread);
  };

  const handleMarkAll = () => {
    const arr = loadNotifications();
    arr.forEach(x => { x.read = true; });
    saveNotifications(arr);
    refresh(filterUnread);
  };

  const handleFilterUnread = () => {
    setFilterUnread(true);
    refresh(true);
  };

  const handleFilterAll = () => {
    setFilterUnread(false);
    refresh(false);
  };

  const openModal = (notif) => {
    markReadById(notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setModal(notif);
  };

  const closeModal = () => setModal(null);

  return (
    <>
      <style>{`
        .notif-item{padding:12px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;background:#fff;cursor:pointer}
        .notif-unread{background:#f8fafc}
        .notif-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center}
        .notif-modal{position:relative;z-index:9001;background:#fff;border-radius:10px;max-width:720px;width:calc(100% - 40px);padding:20px;box-shadow:0 8px 32px rgba(0,0,0,.18)}
        .notif-modal-close{position:absolute;right:10px;top:10px;border:none;background:transparent;font-size:18px;cursor:pointer}
      `}</style>

      <main className="section">
        <div className="container" style={{maxWidth:'880px',margin:'0 auto'}}>
          <h1 className="section-title">通知一覧</h1>
          <div className="cluster" style={{justifyContent:'space-between',alignItems:'center',marginBottom:'12px',display:'flex',flexWrap:'wrap',gap:'8px'}}>
            <div style={{display:'flex',gap:'8px'}}>
              <button className="btn btn-ghost" onClick={handleFilterUnread}>未読のみ</button>
              <button className="btn btn-ghost" onClick={handleFilterAll}>すべて</button>
            </div>
            <div>
              <button className="btn btn-ghost" onClick={handleMarkAll}>すべて既読にする</button>
            </div>
          </div>

          <div id="notifs-host">
            {notifications.length === 0 ? (
              <p className="muted">通知はありません</p>
            ) : (
              notifications.map(it => (
                <div
                  key={it.id}
                  className={'notif-item' + (it.read ? '' : ' notif-unread')}
                  onClick={() => openModal(it)}
                >
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
                    <div>
                      <div style={{fontWeight:700}}>{it.title || ''}</div>
                      <div style={{color:'#6b7280'}}>{it.body || ''}</div>
                      <div style={{fontSize:'12px',color:'#9ca3af',marginTop:'6px'}}>
                        {it.createdAt ? new Date(it.createdAt).toLocaleString() : ''}
                      </div>
                    </div>
                    <div>
                      <button
                        className="btn btn-ghost"
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(it.id); }}
                      >
                        既読にする
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {modal && (
        <div className="notif-modal-backdrop" onClick={closeModal}>
          <div className="notif-modal" onClick={e => e.stopPropagation()}>
            <button className="notif-modal-close" onClick={closeModal}>✕</button>
            <h3 style={{marginTop:0,marginBottom:'8px'}}>{modal.title || '通知'}</h3>
            <div style={{color:'#374151',marginBottom:'12px'}}>{modal.body || ''}</div>
            <div style={{fontSize:'12px',color:'#9ca3af',marginBottom:'12px'}}>
              {modal.createdAt ? new Date(modal.createdAt).toLocaleString() : ''}
            </div>
            {modal.data?.requestId && (
              <div style={{textAlign:'right'}}>
                <a
                  className="btn btn-ghost"
                  href={`/my-reservations?requestId=${encodeURIComponent(modal.data.requestId)}`}
                >
                  詳細を見る
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
