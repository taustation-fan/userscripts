// ==UserScript==
// @name         Hide all decimals in donations amounts at syndicate Banking overview
// @namespace    http://tampermonkey.net/
// @version      0.2
// @author       Dot_sent
// @match        https://taustation.space/syndicates
// @grant        none
// @require http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

function taustation_hide_decimals(){
    $(".currency-amount").each(function(){
        var elem = $(this);
        var str = elem[0].innerHTML;
        str = str.replace(/\..*/gm, '');
        elem[0].innerHTML = str;
    })
}

$(document).ready(taustation_hide_decimals);
