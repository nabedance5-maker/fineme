// Feature Builder: initialize grid placement, sliders, and optional edit mode
export function initFeatureBuilder(root=document){
  try{
    const scope = root || document;
    // Apply grid placement from data attributes
    scope.querySelectorAll('[data-x], [data-y], [data-w], [data-h]').forEach(el=>{
      const x = el.getAttribute('data-x'); const y = el.getAttribute('data-y');
      const w = el.getAttribute('data-w'); const h = el.getAttribute('data-h');
      if(x) el.style.setProperty('--x', Number(x));
      if(y) el.style.setProperty('--y', Number(y));
      if(w) el.style.setProperty('--w', Number(w));
      if(h) el.style.setProperty('--h', Number(h));
      // ensure item class
      if(!el.classList.contains('fb-item')) el.classList.add('fb-item');
    });
    // Initialize sliders
    scope.querySelectorAll('.fb-slider').forEach(slider=>{
      let track = slider.querySelector('.fb-track');
      if(!track){ track = document.createElement('div'); track.className = 'fb-track';
        // move slides into track
        Array.from(slider.children).forEach(ch=>{ if(ch!==track){ if(ch.classList.contains('fb-slide')) track.appendChild(ch); } });
        slider.appendChild(track);
      }
      // nav buttons
      let nav = slider.querySelector('.fb-nav'); if(!nav){ nav = document.createElement('div'); nav.className='fb-nav';
        const prev = document.createElement('button'); prev.className='fb-btn'; prev.type='button'; prev.textContent='←';
        const next = document.createElement('button'); next.className='fb-btn'; next.type='button'; next.textContent='→';
        prev.addEventListener('click', ()=>{ track.scrollBy({ left: -300, behavior:'smooth' }); });
        next.addEventListener('click', ()=>{ track.scrollBy({ left: 300, behavior:'smooth' }); });
        nav.appendChild(prev); nav.appendChild(next); slider.appendChild(nav);
      }
    });

    // Optional edit mode: hash #edit enables lightweight drag to reposition (x only)
    if(location.hash === '#edit'){
      const canvas = scope.querySelector('.fb-grid'); if(canvas){ canvas.classList.add('fb-edit'); }
      scope.querySelectorAll('.fb-item').forEach(el=>{
        el.setAttribute('draggable','true');
        el.addEventListener('dragstart', (e)=>{ e.dataTransfer.setData('text/plain', 'drag'); });
        el.addEventListener('dragend', (e)=>{
          // naive: shift x based on horizontal movement
          try{ const dx = e.clientX - (e.pageX || 0); const cur = Number(el.style.getPropertyValue('--x')||'1'); const nx = Math.max(1, cur + (dx>0?1:-1)); el.style.setProperty('--x', nx); el.setAttribute('data-x', String(nx)); }catch{}
        });
      });
    }
  }catch(e){ /* noop */ }
}

// Auto-init for non-module include
try{ if(!('noAuto' in window)) document.addEventListener('DOMContentLoaded', ()=> initFeatureBuilder(document)); }catch(_){}
