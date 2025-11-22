// ==UserScript==
// @name         SM - Footer UI (floating footer, UI-only)
// @namespace    sm-utilization
// @version      1.0-fixed
// @description  Footer display for SageMaker Utilization (floating footer)
// @match       https://*.console.aws.amazon.com/*
// @match       https://*.amazonaws.com/*
// @grant       none
// @updateURL   https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/sm-footer-ui.user.js
// @downloadURL https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/sm-footer-ui.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Wait until SM_API exists
    function whenReady(fn) {
        if (window.SM_API) fn();
        else setTimeout(() => whenReady(fn), 50);
    }

    whenReady(() => {
        console.log("SM Footer UI Loaded");

        // --- CREATE FLOATING FOOTER ---
        const display = document.createElement("div");
        display.id = "sm-utilization";

        Object.assign(display.style, {
            position: "fixed",
            left: "12px",
            bottom: "12px",                     // <--- FIXED: always bottom
            zIndex: "2147483647",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 8px",
            borderRadius: "6px",
            background: "rgba(0,0,0,0.72)",
            color: "#ffffff",
            fontSize: "14px",
            fontFamily: "sans-serif",
            opacity: 1,
            pointerEvents: "auto",
        });

        // Attach to BODY (universal, works everywhere)
        document.body.appendChild(display);

        // --- ELEMENTS ---
        const txt = document.createElement("span");
        txt.textContent = "Utilization: --:--:-- | Count: 0";

        const btn = document.createElement("button");
        btn.textContent = "Log";
        Object.assign(btn.style, {
            padding: "3px 6px",
            cursor: "pointer",
            borderRadius: "4px",
            border: "1px solid #fff",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
        });

        btn.onclick = () => {
            if (window.SM_UI_showDashboard) window.SM_UI_showDashboard();
            else alert("Dashboard not loaded.");
        };

        display.appendChild(txt);
        display.appendChild(btn);

        // --- API: update footer text ---
        window.SM_UI_updateDisplay = function(state) {
            try {
                const dur = formatDuration(state.totalCommitted || 0);
                const count = state.count ?? 0;
                txt.textContent = `Utilization: ${dur} | Count: ${count}`;
            } catch (e) { console.error("Footer update failed", e); }
        };

        // --- API: control visibility ---
        window.SM_UI_setVisible = function(visible) {
            display.style.display = visible ? "flex" : "none";
        };

        // --- Helper ---
        function formatDuration(sec) {
            const h = Math.floor(sec / 3600).toString().padStart(2, "0");
            const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
            const s = Math.floor(sec % 60).toString().padStart(2, "0");
            return `${h}:${m}:${s}`;
        }

        // --- Subscribe to updates ---
        SM_API.onUpdate((state) => window.SM_UI_updateDisplay(state));

        // Force initial state
        window.SM_UI_updateDisplay(SM_API.getData());
        window.SM_UI_setVisible(true);
    });
})();
