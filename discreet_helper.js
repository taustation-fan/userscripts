// ==UserScript==
// @name         Tau Discreet Helper
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add links to areas while on discreet work
// @author       Marco Fontani <MFONTANI@cpan.org>
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.slim.js
// ==/UserScript==

// While on a discreet work (or mission?), routinely "scan"
// the mission update text to see whether anything looks like
// an area at the current station, i.e. "Gym" or "Bank", etc.
// and if so link to that area's "people" tab
// This speeds up discreet missions ever so slightly.
// 
// Version 0.2: Checks "Mission Update" text in addition to
// "Narrative Direction" text, due to addition of starting/
// ending NPCs for all Discreet Work
//   --Bret Shefter <SpamNabber@gmail.com>

(function() {
    'use strict';
    var places;
    function refresh_directions() {
        if ((!$('.narrative-direction').length) && (!$('.mission-updates').length)) {
            return;
        }
        if (typeof places === 'undefined') {
            places = [];
            $('#game_navigation_areas a').each(function (idx,x) {
                var location = $(x).attr('href');
                var name     = $(x).find('span').text();
                if (name.length) {
                    places[name] = location;
                }
            });
        }
        
        if ($('.narrative-direction').length) {
            $('.narrative-direction:not([data-discreethelper="done"])').each(function(idx,nd) {
                var text = $(nd).html();
                // "tag" as already looked at
                $(nd).attr('data-discreethelper', 'done');
                if (text.match(/<a/)) {
                    return;
                }
                for (var k in places) {
                    if (text.indexOf(k) !== -1) {
                        text = text.replace(k, "<a href='" + places[k] + "#/people'>" + k + "</a>");
                        console.log("Discreet Helper: ", text);
                    }
                }
                $(nd).html(text);
            });
        }

        // same check for Mission Updates 
        if ($('.mission-updates').length) {
            $('.mission-updates:not([data-discreethelper="done"])').each(function(idx,mu) {
                var text = $(mu).html();
                $(mu).attr('data-discreethelper', 'done');
                if (text.match(/<a/)) {
                    return;
                }
                for (var k in places) {
                    if (text.indexOf(k) !== -1) {
                        text = text.replace(k, "<a href='" + places[k] + "#/people'>" + k + "</a>");
                        console.log("Discreet Helper: ", text);
                    }
                }
                $(mu).html(text);
            });
        }
        
    }
    // TODO refresh directions only when a _new_
    // ".narrative-direction" enters the DOM,
    // rather than every second
    window.setInterval(refresh_directions, 1000);
    refresh_directions();
})();
