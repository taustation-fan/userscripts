// ==UserScript==
// @name         Tau Combat Safeguard
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/combat-safeguard.user.js
// @version      1.0
// @description  Tau Station: prevent entering combat when stats or focus are too low
// @author       SandwichMaker <traktofon@gmail.com>
// @match        https://alpha.taustation.space/preferences
// @match        https://alpha.taustation.space/area/the-wrecks*
// @match        https://alpha.taustation.space/area/the-wilds*
// @match        https://alpha.taustation.space/character/details/*
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @require      https://github.com/taustation-fan/userscripts/raw/master/userscript-preferences.js
// @grant        none
// ==/UserScript==

/* eslint-disable no-multi-spaces */

let csg_stats_dom;

function csg_get_stats() {
    if ( !csg_stats_dom ) {
        csg_stats_dom = $( "#stats-panel .player-stats" ).first();
    }
    return {
        focus: Number( csg_stats_dom.find( ".focus .percentage" ).text().replace( /%/, "" ) ),
        str:   Number( csg_stats_dom.find( ".strength .percentage .pc" ).text() ),
        agi:   Number( csg_stats_dom.find( ".agility .percentage .pc" ).text() ),
        sta:   Number( csg_stats_dom.find( ".stamina .percentage .pc" ).text() ),
    };
}

(function() {
    'use strict';

    function pref_specs() {
        return {
            key: 'combat_safeguard',
            label: 'Combat Safeguard',
            options: [
                {
                    key: 'min_focus',
                    label: 'Prevent combat if focus below',
                    type: 'text',
                    default: '10',
                },
                {
                    key: 'min_stats',
                    label: 'Prevent combat if any stat below',
                    type: 'text',
                    default: '10',
                },
            ],
        };
    }

    function disable_button(i, btn) {
        if (btn.textContent.startsWith('Attack') || btn.textContent.startsWith('Take over')) {
            btn.textContent = "Don't click!";
            btn.href = "javascript:alert('Idiot!')";
        }
    }

    let options = userscript_preferences( pref_specs() );

    let path = window.location.pathname;
    if (path.match('^/preferences')) return;

    let stats = csg_get_stats();
    let focus = stats.focus;
    let lowest_stat = Math.min(stats.str, stats.agi, stats.sta);

    if ( (focus < options.min_focus) || (lowest_stat < options.min_stats) ) {
        $( '.opponent--action .btn-control' ).each( disable_button );
        $( '.campaign--action .btn-control' ).each( disable_button );
        $( '.random-encounter-action .btn-control' ).each( disable_button );
        $( '.character-profile--actions .social .btn-control' ).each( disable_button );
    }
})();
