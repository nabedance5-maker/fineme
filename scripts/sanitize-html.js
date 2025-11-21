/* Minimal client-side sanitizeHtml
   - Keeps only allowed tags (whitelist)
   - Removes <script>, <style>, <iframe>, <object>, <embed>, <noscript> entirely
   - Removes attributes that start with "on" (event handlers)
   - Validates href/src attributes via safeUrl() if available
   Exposes: window.sanitizeHtml
*/
(function(global){
  'use strict';

  function sanitizeHtml(input){
    if(!input) return '';
    // If DOMParser not available, return empty (fail-safe)
    if(typeof DOMParser === 'undefined') return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(String(input), 'text/html');

    // Tags to keep (allowlist)
    const allowed = new Set([
      'a','b','strong','i','em','u','small','p','br','ul','ol','li',
      'blockquote','pre','code','h1','h2','h3','h4','h5','h6',
      'div','span','figure','figcaption','img','table','thead','tbody','tr','th','td'
    ]);

    // Tags to remove entirely with content
    const removeEntire = new Set(['script','style','iframe','object','embed','noscript']);

    function walk(node){
      const children = Array.from(node.childNodes);
      for(const child of children){
        if(child.nodeType === Node.ELEMENT_NODE){
          const tag = child.nodeName.toLowerCase();

          if(removeEntire.has(tag)){
            child.parentNode.removeChild(child);
            continue;
          }

          if(!allowed.has(tag)){
            // unwrap element: move children up, then remove
            while(child.firstChild){
              child.parentNode.insertBefore(child.firstChild, child);
            }
            child.parentNode.removeChild(child);
            continue;
          }

            // Sanitize attributes
          const attrs = Array.from(child.attributes || []);
          for(const a of attrs){
            const name = String(a.name || '').toLowerCase();
            const val = a.value || '';
            // remove event handlers (on*)
            if(name.startsWith('on')){
              child.removeAttribute(a.name);
              continue;
            }

            // validate href/src/xlink:href using safeUrl when applicable
            if(name === 'href' || name === 'src' || name === 'xlink:href'){
              try{
                const safe = (typeof global['safeUrl'] === 'function') ? global['safeUrl'](val) : null;
                if(!safe){
                  child.removeAttribute(a.name);
                }else{
                  child.setAttribute(a.name, safe);
                }
              }catch(e){
                child.removeAttribute(a.name);
              }
              continue;
            }

            // keep other attributes (class, alt, title, etc.)
          }

          // Recurse into allowed element
          walk(child);

        }else if(child.nodeType === Node.COMMENT_NODE){
          // remove comments
          child.parentNode.removeChild(child);
        }else{
          // text nodes are fine
        }
      }
    }

    walk(doc.body);
    return doc.body.innerHTML;
  }

  global['sanitizeHtml'] = sanitizeHtml;
  if(typeof module !== 'undefined' && module.exports) module.exports = sanitizeHtml;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
