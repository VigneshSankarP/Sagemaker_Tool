// ==UserScript==
// @name         SM Test Loader (Dev Branch) - New
// @namespace    sm-utilization
// @version      1.0-dev.1
// @description  Dev loader: loads core, footer and dashboard from your dev branch raw URLs for testing (no auto-update)
// @match        https://*.sagemaker.aws/*
// @match        https://*.amazonaws.com/*
// @match        https://*.console.aws.amazon.com/*
// @grant        none
// @require https://github.com/VigneshSankarP/Sagemaker_Tool/raw/refs/heads/dev/sm-core.user.js
// @require https://github.com/VigneshSankarP/Sagemaker_Tool/raw/refs/heads/dev/sm-footer.user.js
// @require https://github.com/VigneshSankarP/Sagemaker_Tool/raw/refs/heads/dev/sm-dashboard.user.js
// ==/UserScript==

(function () {
    'use strict';
    console.log('%c[SM TEST LOADER] active — loading dev modules...', 'color:orange;font-weight:700');

    // quick runtime check after a short delay so @require scripts have time to run
    setTimeout(() => {
      console.log('%c[SM TEST LOADER] SM_API:', 'color:cyan;font-weight:600', typeof window.SM_API === 'undefined' ? 'undefined' : window.SM_API);
      console.log('%c[SM TEST LOADER] Footer element:', 'color:magenta;font-weight:600', document.getElementById('sm-utilization'));
      console.log('%c[SM TEST LOADER] Dashboard hook:', 'color:lime;font-weight:600', typeof window.SM_SHOW_DASHBOARD === 'function' || typeof window.SM_UI_show === 'function');
    }, 1500);
})();
