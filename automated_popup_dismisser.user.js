// ==UserScript==
// @name         Automated Popup Dismisser
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Automatically closes any pop-up windows related to started/finished repair etc.
// @author       Dotsent
// @match        https://taustation.space/*
// @grant        none
// ==/UserScript==

var interval;

function hideDialog() {
    if ($('button.dialog-dismiss:visible, .dialog-bottom .btn-control span:visible').length > 0) {
        $('button.dialog-dismiss:visible, .dialog-bottom .btn-control span:visible').trigger("click");
        window.clearInterval(interval);
        window.setTimeout(startMonitoring, 10000); // Wait with monitoring to prevent page reload click-loop on slow devices or connections
    }
}

function startMonitoring() {
    interval = window.setInterval(hideDialog, 500);
}

(function() {
    'use strict';

    startMonitoring();
})();
