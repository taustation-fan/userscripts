// ==UserScript==
// @name         Tau Discreet Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
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

(function() {
    'use strict';
    var places;
    function refresh_directions() {
        if (!$('.narrative-direction, .mission-updates').length) {
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
        $('.narrative-direction:not([data-discreethelper="done"]), .mission-updates').each(function(idx,nd) {
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
    // TODO refresh directions only when a _new_
    // ".narrative-direction" enters the DOM,
    // rather than every second
    window.setInterval(refresh_directions, 1000);
    refresh_directions();
})();
