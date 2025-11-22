// ==UserScript==
// @name         SM Test Loader (Dev Branch)
// @namespace    sm-utilization
// @version      1.0-dev
// @description  Loads core, footer, and dashboard from the dev branch for testing
// @match        https://*.sagemaker.aws/*
// @match        https://*.amazonaws.com/*
// @match        https://*.console.aws.amazon.com/*
// @grant        none
// @require      https://github.com/VigneshSankarP/Sagemaker_Tool/raw/refs/heads/dev/sm-core.user.js
// @require      https://github.com/VigneshSankarP/Sagemaker_Tool/raw/refs/heads/dev/sm-footer.user.js
// @require      https://github.com/VigneshSankarP/Sagemaker_Tool/raw/refs/heads/dev/sm-dashboard.user.js
// ==/UserScript==

(function() {
    console.log("%c[SM TEST LOADER ACTIVE]", "color: orange; font-weight: bold; font-size: 14px");
})();
