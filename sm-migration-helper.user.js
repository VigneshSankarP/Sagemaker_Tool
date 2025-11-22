// ==UserScript==
// @name        SM - Migration Helper
// @namespace   https://github.com/VigneshSankarP/Sagemaker_Tool
// @version     1.0.0
// @description Replacement stub for old single-file userscript. Prompts users to install new 3 scripts.
// @match       https://*.console.aws.amazon.com/*
// @match       https://*.amazonaws.com/*
// @grant       none
// @updateURL   https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/sm-migration-helper.user.js
// @downloadURL https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/sm-migration-helper.user.js
// ==/UserScript==

(function(){
  'use strict';

  if (localStorage.getItem('sm_migrated_v1')) return;
  localStorage.setItem('sm_migrated_v1','1');

  const urls = [
    'https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/SageMaker%20Utilization%20Counter%20-%20Loader.user.js'
  ];

  const banner = document.createElement('div');
  Object.assign(banner.style, {position:'fixed',left:'12px',top:'12px',right:'12px',zIndex:2147483647,background:'#fff',padding:'12px',borderRadius:'8px',boxShadow:'0 6px 24px rgba(0,0,0,.2)'} );
  banner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
      <div>
        <strong>New SM version available</strong>
        <div style="font-size:12px">We split the tool into 3 scripts (core, footer, dashboard). Click Install to open the installer.</div>
      </div>
      <div>
        <button id="sm-install-all" style="padding:8px">Install</button>
        <button id="sm-dismiss" style="margin-left:8px;padding:8px">Dismiss</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);
  banner.querySelector('#sm-dismiss').addEventListener('click', ()=>banner.remove());
  banner.querySelector('#sm-install-all').addEventListener('click', ()=>{
    urls.forEach(u=>window.open(u,'_blank'));
    banner.remove();
  });

  try{ window.__SM_OLD_WAS_DISABLED__ = true; }catch(e){}
})();
