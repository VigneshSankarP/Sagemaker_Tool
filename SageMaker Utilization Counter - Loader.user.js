// ==UserScript==
// @name         SM Test Loader (Dev Branch)
// @namespace    sm-utilization
// @version      1.0-test
// @description  Loads core, footer, dashboard from dev folder for testing
// @match        https://*.sagemaker.aws/*
// @match        https://*.amazonaws.com/*
// @match        https://*.console.aws.amazon.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/dev/sm-core.user.js
// @require      https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/dev/sm-footer.user.js
// @require      https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/dev/sm-dashboard.user.js
// ==/UserScript==

(function() {
    console.log("%cSM TEST LOADER ACTIVE", "color: orange; font-weight: bold;");
})();
