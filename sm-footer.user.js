// ==UserScript==
// @name         SM Footer UI (fixed)
// @namespace    sm-utilization
// @version      1.0
// @description  Floating footer UI for SageMaker counter
// ==/UserScript==

(function () {
    'use strict';

    function wait() {
        if (window.SM_API) init();
        else setTimeout(wait, 50);
    }
    wait();

    function init() {
        const box = document.createElement("div");
        box.id = "sm-utilization";
        Object.assign(box.style, {
            position: "fixed",
            left: "12px",
            bottom: "12px",
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
        });
        document.body.appendChild(box);

        const txt = document.createElement("span");
        txt.textContent = "Utilization: --:--:-- | Count: 0";

        const btn = document.createElement("button");
        btn.textContent = "Log";
        Object.assign(btn.style, {
            padding: "3px 6px",
            cursor: "pointer",
            borderRadius: "4px",
            background: "rgba(255,255,255,0.2)",
            border: "1px solid #fff",
            color: "#fff"
        });

        btn.onclick = () => {
            if (window.SM_SHOW_DASHBOARD) window.SM_SHOW_DASHBOARD();
            else alert("Dashboard not loaded.");
        };

        box.appendChild(txt);
        box.appendChild(btn);

        window.addEventListener("SM_UPDATE", () => update());

        function update() {
            const d = window.SM_API.getData();
            txt.textContent = `Utilization: ${format(d.totalCommitted)} | Count: ${d.count}`;
        }

        function format(sec) {
            const h = String(Math.floor(sec / 3600)).padStart(2, "0");
            const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
            const s = String(sec % 60).padStart(2, "0");
            return `${h}:${m}:${s}`;
        }
    }

})();
