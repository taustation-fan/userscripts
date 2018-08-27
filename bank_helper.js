// ==UserScript==
// @name         Tau Station Bank Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automatically fill the bank deposit box with your extra cash
// @author       Marco Fontani <MFONTANI@cpan.org>
// @match        https://alpha.taustation.space/area/bank*
// @grant        none
// ==/UserScript==

// @run-at document-end
(function() {
    'use strict';

    // How many credits you ALWAYS want to keep on hand.
    // Anything above it will be auto-filled for deposit while you're at a bank.
    var amt_min_credits_on_hand = 2000;

    // How much money in the bank
    var bank_qsa = document.querySelectorAll('.bank-details-container .dl-container dd.even:nth-of-type(4)');
    if (typeof(bank_qsa) === 'undefined') {
        return;
    }
    var credits_in_bank = parseFloat(bank_qsa[0].innerHTML.replace(/,/g,''));

    // How much money is on me:
    var on_me_qsa = document.querySelectorAll('.player-info .credit-container.player-info--amount-container span.amount');
    if (typeof(on_me_qsa) === 'undefined') {
        return;
    }
    var credits_on_me = parseFloat(on_me_qsa[0].innerHTML.replace(/,/g,''));

    // If you've got too many credits, deposit them!
    if (credits_on_me > amt_min_credits_on_hand) {
        document.querySelectorAll('#deposit_amount')[0].value = ( credits_on_me*100 - amt_min_credits_on_hand*100 )/100;
    }
})();