/* escapeHtml: simple HTML-escape for text insertion */
(function(global){
  'use strict';
  function escapeHtml(str){
    if(str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  global['escapeHtml'] = escapeHtml;
  if(typeof module !== 'undefined' && module.exports) module.exports = { escapeHtml };
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
