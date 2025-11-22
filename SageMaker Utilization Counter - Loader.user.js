// ==UserScript==
// @name         SageMaker Utilization Counter - Loader (3-part)
// @namespace    https://github.com/VigneshSankarP/Sagemaker_Tool
// @version      1.0.0
// @description  Loader script — requires core, footer and dashboard. Install only this script (Tampermonkey @require will load others).
// @match        https://*.console.aws.amazon.com/*
// @match        https://*.amazonaws.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/SageMaker%20Utilization%20Counter%20-%20Loader.user.js
// @downloadURL  https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/main/SageMaker%20Utilization%20Counter%20-%20Loader.user.js
// @require      https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/dev/sm-core-engine.user.js
// @require      https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/dev/sm-footer-ui.user.js
// @require      https://raw.githubusercontent.com/VigneshSankarP/Sagemaker_Tool/dev/sm-dashboard.user.js
// ==/UserScript==

(function(){ 'use strict'; console.info("SM Loader active — core, footer, dashboard loaded via @require"); })();
