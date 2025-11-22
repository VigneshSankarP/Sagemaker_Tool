// ==UserScript==
// @name        SM - Footer UI (floating footer, UI-only)
// @namespace   https://github.com/VigneshSankarP/Sagemaker_Tool
// @version     1.0.0
// @description Footer UI (reads from SM_API). No timer logic here.
// @match       https://*.console.aws.amazon.com/*
// @match       https://*.amazonaws.com/*
// @grant       none
// @updateURL   https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/sm-footer-ui.user.js
// @downloadURL https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/sm-footer-ui.user.js
// ==/UserScript==

(function(){
  'use strict';

  const display = document.createElement('div');
  display.id = 'sm-utilization';
  Object.assign(display.style, {
    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
    color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', opacity: '0.92',
    pointerEvents: 'auto', userSelect: 'none', whiteSpace: 'nowrap', display: 'none',
    alignItems: 'center', gap: '8px', zIndex: 9999
  });

  const utilText = document.createTextNode('Utilization: 00:00:00');
  display.appendChild(utilText);
  const countLabel = document.createElement('span');
  countLabel.textContent = ' | Count: 0';
  display.appendChild(countLabel);

  function attachToFooter() {
    const footer = document.querySelector('footer') || document.body;
    if (!footer) return;
    if (getComputedStyle(footer).position === 'static') footer.style.position = 'relative';
    if (!footer.contains(display)) footer.appendChild(display);
    const existingBtn = display.querySelector('#sm-log-btn');
    if (!existingBtn) {
      const btn = document.createElement('button');
      btn.id = 'sm-log-btn'; btn.type = 'button'; btn.title = 'Open utilization dashboard';
      btn.innerHTML = '📊 Log';
      Object.assign(btn.style, {
        marginLeft: '8px', padding: '6px 10px', borderRadius: '6px', background: '#ffffff',
        color: '#0b1220', border: '1px solid #cfcfcf', boxShadow: 'none', cursor: 'pointer', fontSize: '13px',
      });
      btn.addEventListener('mouseenter', () => btn.style.background = '#f5f7fb');
      btn.addEventListener('mouseleave', () => btn.style.background = '#ffffff');
      btn.addEventListener('click', ()=> { if (typeof window.SM_UI_showDashboard === 'function') window.SM_UI_showDashboard(); else showDashboard_local(); });
      display.appendChild(btn);
    }
  }

  function showDashboard_local(){ try { if (typeof window.SM_UI_showDashboard === 'function') window.SM_UI_showDashboard(); else if (typeof window.SM_openDashboard === 'function') window.SM_openDashboard(); else { const raw = 'https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/sm-dashboard.user.js'; window.open(raw, '_blank'); } } catch(e){} }

  function updateDisplay_local() {
    try {
      if (!window.SM_API) return;
      const data = window.SM_API.getData();
      const committed = data.committed || 0;
      const pending = data.pending || 0;
      const total = committed + pending;
      utilText.nodeValue = `Utilization: ${fmt(total)}`;
      countLabel.textContent = ` | Count: ${data.count || 0}`;
    } catch(e){}
  }

  function fmt(seconds) {
    seconds = Math.max(0, Math.floor(+seconds || 0));
    const h = Math.floor(seconds/3600);
    const m = Math.floor((seconds%3600)/60);
    const s = seconds%60;
    return [h,m,s].map(n=>String(n).padStart(2,'0')).join(':');
  }

  window.SM_UI_setVisible = function(visible) {
    try { display.style.display = visible ? 'flex' : 'none'; } catch(e){}
  };

  window.SM_UI_showDashboard = function(){ try { if (typeof window.SM_UI_show === 'function') window.SM_UI_show(); else showDashboard_local(); } catch(e){} };

  window.SM_UI_updateDisplay = updateDisplay_local;
  window.addEventListener('sm_core_update', updateDisplay_local);

  const attachTimer = setInterval(()=>{ try{ attachToFooter(); updateDisplay_local(); }catch(e){} }, 800);
  new MutationObserver(()=>{ try{ attachToFooter(); }catch(e){} }).observe(document.body, { childList:true, subtree:true });

  window.addEventListener('keydown', (e)=>{ if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'u') { try { if (typeof window.SM_UI_showDashboard === 'function') window.SM_UI_showDashboard(); } catch(e){} } });

})();
