/* Fineme 予約ウィジェット（でお要望 2026-10-19：hacomono差分 #14）
   使い方：<div data-fineme-widget="店舗のURL名" data-view="both" data-theme="light"></div>
           <script src="https://www.fineme.me/widget.js" async></script>
   ボタンだけ：<div data-fineme-button="店舗のURL名" data-label="予約する"></div> */
(function () {
  var base = (document.currentScript && document.currentScript.src.replace(/\/widget\.js.*$/, '')) || 'https://www.fineme.me';
  function enc(s) { return encodeURIComponent(String(s || '')); }
  document.querySelectorAll('[data-fineme-widget]').forEach(function (el) {
    if (el.getAttribute('data-fineme-ready')) return;
    el.setAttribute('data-fineme-ready', '1');
    var slug = el.getAttribute('data-fineme-widget');
    var f = document.createElement('iframe');
    f.src = base + '/embed/' + enc(slug) + '?view=' + enc(el.getAttribute('data-view') || 'both') + '&theme=' + enc(el.getAttribute('data-theme') || 'light');
    f.title = '予約';
    f.loading = 'lazy';
    f.style.cssText = 'width:100%;border:0;height:520px;display:block;background:transparent';
    el.appendChild(f);
    window.addEventListener('message', function (e) {
      if (e.origin !== base || !e.data || e.data.type !== 'fineme-embed-height' || e.source !== f.contentWindow) return;
      f.style.height = Math.min(Math.max(200, e.data.height), 4000) + 'px';
    });
  });
  document.querySelectorAll('[data-fineme-button]').forEach(function (el) {
    if (el.getAttribute('data-fineme-ready')) return;
    el.setAttribute('data-fineme-ready', '1');
    var a = document.createElement('a');
    a.href = base + '/provider/' + enc(el.getAttribute('data-fineme-button')) + '?tab=consult&from=widget';
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = el.getAttribute('data-label') || '予約する';
    a.style.cssText = 'display:inline-block;background:' + (el.getAttribute('data-color') || '#111') + ';color:#fff;font-weight:800;font-size:15px;padding:12px 24px;border-radius:10px;text-decoration:none;font-family:system-ui,sans-serif';
    el.appendChild(a);
  });
})();
