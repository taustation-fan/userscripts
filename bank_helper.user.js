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
    var bank_ele = document.querySelectorAll('.bank-details-container .dl-container .credits');
    if (!bank_ele) {
        return;
    }
    var credits_in_bank = parseFloat(bank_ele.innerHTML.replace(/,/g,''));

    // How much money is on me:
    let on_me_ele = document.querySelector('.player-info .credit-container-wallet a');
    if (!on_me_ele) { return; }
    let credits_on_me = parseFloat(on_me_ele.getAttribute("data-message").replace(/,/g,''));

    // If you've got too many credits, deposit them!
    if (credits_on_me > amt_min_credits_on_hand) {
        document.querySelectorAll('#deposit_amount')[0].value = ( credits_on_me*100 - amt_min_credits_on_hand*100 )/100;
    }
})();
