// ==UserScript==
// @name         Tau Station: Next Regen Tick
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://rawgit.com/taustation-fan/userscripts/master/next-regen-tick.user.js
// @version      0.1
// @description  The game shows countdown timers for each stat until full regeneration. But when is the _next_ regeneration tick due? This displays the duration in units, will only update on click.
// @author       Perleone (https://github.com/Perleone)
// @license      CC-BY-SA - https://creativecommons.org/licenses/by-sa/2.0/
// @match        https://alpha.taustation.space/*
// @grant        GM_addStyle
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==
//
// Disclaimer:
// These are quick-and-dirty one-off scripts, and do not reflect the author's style or quality of work when developing production-ready software.
//

(function() {
    'use strict';
    main_do();
})();

// Show the wait time for the next stat regeneration tick
function main_do() {
    // Call the actual function with some delay in order
    // to give the stat countdown javascript a head start
    // -- we need its data to calculate ours.
    setTimeout( function() { next_regen_tick_do(); }, 200 );

}

// Do the actual work: called on page load and on click
function next_regen_tick_do() {
    // Gather all regen countdown timers
    let refill_timers = $('.refill-timer').toArray();

    // Look at the digits only, they are decimal values
    // We need just one timer that is not zero, so we might as well get the largest
    let units_to_refill = Math.max(
        ... refill_timers
        .map( x => parseInt( x.innerText.replace( /\D/g, '' ) ) )
    );
    $('#nxt_tick').remove(); // There should be just one line of data output

    // Bail if there are no timers present
    if ( units_to_refill == 0 ) {
        return;
    }

    // The regeneration takes place every 5 Earth minutes == 300 Earth seconds.
    // One unit is 0.864 seconds, so the regen cycle lasts (rounded)
    // 347 units = 300 sec / 0.864 sec/unit
    let units_to_regen = units_to_refill % 347;
    $('.stat-container.focus .time-to-full')
        .append('<span id="nxt_tick">Nxt: ' + units_to_regen + '</span>');
    $('#nxt_tick').on( 'click', function() { next_regen_tick_do() } );

    // Adjust position below toxins box
    let toxins_height = parseInt($('div.toxins').first().height()) + 10;
    let nxt_pos = $('#nxt_tick').offset();
    nxt_pos.top += ( toxins_height + parseInt($('#nxt_tick').height()) );
    $('#nxt_tick').offset(nxt_pos);
    return;
}

GM_addStyle('#nxt_tick { cursor: pointer; }');
GM_addStyle('@media screen and (max-width: 62.5em) { #nxt_tick { margin: auto; display: table; } }');
