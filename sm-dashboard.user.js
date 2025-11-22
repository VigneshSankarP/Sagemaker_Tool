// ==UserScript==
// @name        SM Dashboard UI (original)
// @namespace   sm-utilization
// @version     1.0
// @description Dashboard modal (extracted from v1.7; unchanged behavior)
// @match       https://*.console.aws.amazon.com/*
// @match       https://*.amazonaws.com/*
// @match       https://*.sagemaker.aws/*
// @grant       none
// ==/UserScript==

(function(){
  'use strict';

  function createDashboardModal() {
    if (document.getElementById('sm-dashboard-root')) return document.getElementById('sm-dashboard-root');
    const root = document.createElement('div'); root.id = 'sm-dashboard-root';
    Object.assign(root.style, { position:'fixed', left:0, top:0, right:0, bottom:0, display:'none', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.4)', zIndex:2147483647 });
    root.innerHTML = `
      <div style="background:#fff; padding:20px; border-radius:10px; width:800px; max-height:85%; overflow:auto; box-shadow:0 8px 32px rgba(0,0,0,0.2); font-family:Inter,Arial,sans-serif; color:#111">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h2 style="margin:0">SageMaker Utilization — Dashboard</h2>
          <div>
            <button id="sm-db-export" style="margin-right:8px">Export JSON</button>
            <button id="sm-db-reset" style="margin-right:8px">Reset All</button>
            <button id="sm-db-close">Close</button>
          </div>
        </div>
        <hr>
        <div id="sm-db-summary" style="margin-top:8px;"></div>
        <div id="sm-db-controls" style="margin-top:12px;"></div>
        <h3 style="margin-top:14px">Sessions (recent 200)</h3>
        <div style="max-height:340px; overflow:auto;">
          <table id="sm-db-table" style="width:100%; border-collapse:collapse;">
            <thead><tr><th style="text-align:left">Start</th><th style="text-align:left">End</th><th style="text-align:right">Duration (s)</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    // close handler
    root.addEventListener('click', (e) => { if (e.target === root) hideDashboard(); });
    root.querySelector('#sm-db-close').addEventListener('click', hideDashboard);
    root.querySelector('#sm-db-export').addEventListener('click', dashboardExportJSON);
    root.querySelector('#sm-db-reset').addEventListener('click', ()=>{ if(confirm('Reset all SM data? This cannot be undone.')){ if(window.SM_API) window.SM_API.reset('both'); updateDashboard(); } });

    return root;
  }

  function showDashboard() { const root = createDashboardModal(); root.style.display = 'flex'; updateDashboard(); }
  function hideDashboard() { const root = document.getElementById('sm-dashboard-root'); if (root) root.style.display = 'none'; }

  window.SM_UI_show = showDashboard;
  window.SM_UI_updateDashboard = function(){ try{ updateDashboard(); } catch(e){} };

  function updateDashboard(){
    const root = createDashboardModal();
    let data = null;
    if (window.SM_API && typeof window.SM_API.getData === 'function') data = window.SM_API.getData();
    else {
      data = {
        committed: JSON.parse(localStorage.getItem('sm_daily_committed')||'0') || 0,
        count: JSON.parse(localStorage.getItem('sm_count')||'0') || 0,
        sessions: JSON.parse(localStorage.getItem('sm_sessions')||'[]') || [],
        history: JSON.parse(localStorage.getItem('sm_history')||'{}') || {}
      };
    }

    const sum = root.querySelector('#sm-db-summary');
    sum.innerHTML = `<p><b>Total Committed:</b> ${fmtSec(data.committed)} (${data.committed}s) | <b>Count:</b> ${data.count || 0} | <b>Active:</b> ${(data.running ? 'Yes' : 'No')}</p>`;

    const tbody = root.querySelector('tbody');
    tbody.innerHTML = '';
    (data.sessions || []).slice(0,200).forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${new Date(s.date || s.start || 0).toLocaleString()}</td><td>${s.end ? new Date(s.end).toLocaleString() : '-'}</td><td style="text-align:right">${Math.round((s.durationMs||s.duration||0)/1000)}</td>`;
      tbody.appendChild(tr);
    });
  }

  function fmtSec(sec) {
    sec = Math.max(0, Math.floor(+sec || 0));
    const h = Math.floor(sec/3600); const m = Math.floor((sec%3600)/60); const s = sec%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function dashboardExportJSON(){
    const data = window.SM_API ? window.SM_API.getData() : { error: 'core missing' };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sm-data.json'; a.click(); URL.revokeObjectURL(url);
  }

  // live update
  window.addEventListener('sm_core_update', ()=>{ try{ if(document.getElementById('sm-dashboard-root') && document.getElementById('sm-dashboard-root').style.display==='flex') updateDashboard(); } catch(e){} });
  window.addEventListener('keydown', (e)=>{ if(e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'u'){ showDashboard(); } });

})();
