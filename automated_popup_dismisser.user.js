// ==UserScript==
// @name         Automated Popup Dismisser
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automatically closes any pop-up windows related to started/finished repair etc.
// @author       Dotsent
// @match        https://alpha.taustation.space/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.setInterval(function() {
        $('button.dialog-dismiss').trigger("click");
    }, 500);
})();
