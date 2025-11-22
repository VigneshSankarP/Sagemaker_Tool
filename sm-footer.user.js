// ==UserScript==
// @name         SM Footer UI (fixed-stable)
// @namespace    sm-utilization
// @version      1.0-fixed
// @description  Fixed floating footer UI for SageMaker counter (stable, no flashing)
// @match        https://*.console.aws.amazon.com/*
// @match        https://*.amazonaws.com/*
// @match        https://*.sagemaker.aws/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  function whenReady(fn) {
    if (window.SM_API) fn();
    else setTimeout(() => whenReady(fn), 50);
  }

  whenReady(() => {
    // create footer container (fixed, bottom-left, original style)
    if (document.getElementById('sm-utilization')) return; // avoid duplicates

    const display = document.createElement('div');
    display.id = 'sm-utilization';
    Object.assign(display.style, {
      position: 'fixed',
      left: '12px',
      bottom: '12px',
      zIndex: '2147483647',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 10px',
      borderRadius: '6px',
      background: 'rgba(255,255,255,0.92)',
      color: '#0b1220',
      fontSize: '14px',
      fontFamily: 'Inter, system-ui, sans-serif',
      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
      pointerEvents: 'auto',
      userSelect: 'none',
      whiteSpace: 'nowrap'
    });

    const utilText = document.createTextNode('Utilization: 00:00:00');
    display.appendChild(utilText);

    const countLabel = document.createElement('span');
    countLabel.style.marginLeft = '8px';
    countLabel.textContent = '| Count: 0';
    display.appendChild(countLabel);

    const logBtn = document.createElement('button');
    logBtn.id = 'sm-log-btn';
    logBtn.innerHTML = '📊 Log';
    Object.assign(logBtn.style, {
      marginLeft: '8px',
      padding: '6px 10px',
      borderRadius: '6px',
      background: '#ffffff',
      color: '#0b1220',
      border: '1px solid #cfcfcf',
      cursor: 'pointer',
      fontSize: '13px'
    });
    logBtn.addEventListener('mouseenter', () => logBtn.style.background = '#f5f7fb');
    logBtn.addEventListener('mouseleave', () => logBtn.style.background = '#ffffff');
    logBtn.addEventListener('click', () => {
      if (typeof window.SM_SHOW_DASHBOARD === 'function') window.SM_SHOW_DASHBOARD();
      else if (typeof window.SM_UI_show === 'function') window.SM_UI_show();
      else window.open('https://github.com/VigneshSankarP/Sagemaker_Tool', '_blank');
    });
    display.appendChild(logBtn);

    document.body.appendChild(display);

    // update display when core updates
    function updateDisplay() {
      try {
        const data = window.SM_API ? window.SM_API.getData() : { committed: 0, count: 0, pending: 0 };
        const committed = data.committed ?? data.totalCommitted ?? 0;
        const pending = data.pending ?? 0;
        const total = (committed || 0) + (pending || 0);
        utilText.nodeValue = `Utilization: ${formatTime(total)} `;
        countLabel.textContent = `| Count: ${data.count || 0}`;
      } catch (e) {
        console.error('SM Footer update failed', e);
      }
    }

    function formatTime(sec) {
      sec = Math.max(0, Math.floor(+sec || 0));
      const h = Math.floor(sec/3600);
