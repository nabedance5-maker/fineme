/* safeUrl: validate URLs before assigning to href/src.
   - Rejects javascript: scheme
   - Allows http(s), relative URLs, and data:image/*
   - Returns normalized absolute URL string when possible, or original relative path for safe relative URLs
   - Returns null for unsafe URLs
*/
(function(global){
  'use strict';

  function safeUrl(input){
    if(!input && input !== '') return null;
    const url = String(input).trim();
    if(url.length === 0) return null;
    if(/^javascript:/i.test(url)) return null;
    if(/^data:/i.test(url)){
      if(/^data:image\//i.test(url)) return url;
      return null;
    }
    if(/^(\/|\.\/|\.\.\/)/.test(url)) return url;
    try{
      const base = (typeof document !== 'undefined' && document.baseURI) ? document.baseURI : location.origin || 'http://example.com/';
      const u = new URL(url, base);
      if(u.protocol === 'http:' || u.protocol === 'https:'){
        return u.toString();
      }
      return null;
    }catch(e){
      return null;
    }
  }

  // Expose on globalThis in a way that avoids TypeScript complaining about unknown properties
  try{ globalThis['safeUrl'] = safeUrl; }catch(e){ if(typeof window !== 'undefined') window['safeUrl'] = safeUrl; }
  if(typeof module !== 'undefined' && module.exports) module.exports = { safeUrl };
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
