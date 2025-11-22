// ==UserScript==
// @name         SM Dashboard UI
// @namespace    sm-utilization
// @version      1.0
// @description  Dashboard modal
// ==/UserScript==

(function () {
    'use strict';

    function wait() {
        if (window.SM_API) init();
        else setTimeout(wait, 50);
    }
    wait();

    function init() {
        let modal = null;

        window.SM_SHOW_DASHBOARD = show;

        function show() {
            if (!modal) create();
            modal.style.display = "flex";
        }

        function create() {
            modal = document.createElement("div");
            Object.assign(modal.style, {
                position: "fixed",
                left: "0",
                top: "0",
                width: "100%",
                height: "100%",
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(3px)",
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2147483647
            });

            const panel = document.createElement("div");
            Object.assign(panel.style, {
                background: "#fff",
                padding: "20px",
                width: "360px",
                borderRadius: "10px",
                fontFamily: "sans-serif"
            });

            const title = document.createElement("div");
            title.textContent = "SageMaker Utilization Dashboard";
            title.style.fontSize = "18px";
            title.style.marginBottom = "10px";
            title.style.fontWeight = "600";

            const content = document.createElement("div");
            content.id = "sm-d-content";
            content.style.margin = "10px 0";

            const close = document.createElement("button");
            close.textContent = "Close";
            close.onclick = () => modal.style.display = "none";
            Object.assign(close.style, {
                marginTop: "10px",
                padding: "6px 10px",
                cursor: "pointer"
            });

            panel.appendChild(title);
            panel.appendChild(content);
            panel.appendChild(close);
            modal.appendChild(panel);
            document.body.appendChild(modal);

            update();
            window.addEventListener("SM_UPDATE", update);

            function update() {
                const d = window.SM_API.getData();
                content.innerHTML = `
                    <div><b>Total Today:</b> ${format(d.totalCommitted)}</div>
                    <div><b>Count:</b> ${d.count}</div>
                `;
            }

            function format(sec) {
                const h = String(Math.floor(sec / 3600)).padStart(2, "0");
                const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
                const s = String(sec % 60).padStart(2, "0");
                return `${h}:${m}:${s}`;
            }
        }
    }

})();
