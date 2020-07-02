// ==UserScript==
// @name         Tau Discreet Helper
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Add links to areas while on discreet work
// @author       Marco Fontani <MFONTANI@cpan.org>
// @match        https://taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

// While on a discreet work (or mission?), routinely "scan"
// the mission update text to see whether anything looks like
// an area at the current station, i.e. "Gym" or "Bank", etc.
// and if so link to that area's "people" tab
// After finishing the mission, restore the "new mission"
// links without the user needing to reload the page.
// These speed up discreet missions ever so slightly.

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

    // After a Discreet Work mission's final click, show the "Find discreet work"
    // sidebar link without requiring a page reload.
    //
    // Step 1: Future-proofing: Save the "new mission links" html currently used by the site.
    function save_new_mission_links() {
        if (window.location.pathname.startsWith('/area/discreet-work')) {
            $('.jobs-list a[href="/area/discreet-work/accept"]').click(function() {
                localStorage.setItem('discreet_helper-new_mission_links',
                                     $('.employment-title:contains("Current Mission")').parent().html());
            });
        }
    }

    // Step 2: Restore the previously-saved links (instead of using a hardcoded string).
    function restore_new_mission_links() {
        if (window.location.pathname.startsWith('/character/details/') &&
            localStorage['discreet_helper-new_mission_links']) {
            $('.mission-step-link[data-step-slug="finish"]').click(function() {
                // After clicking the above mission step, the "active mission" is no longer active,
                // but remains in the sidebar. Replace it with the "find new missions" links.
                $('.employment-title:contains("Current Mission")').parent()
                    .html(localStorage['discreet_helper-new_mission_links']);
                localStorage.removeItem('discreet_helper-new_mission_links');
            });
        }
    }

    // TODO refresh directions only when a _new_
    // ".narrative-direction" enters the DOM,
    // rather than every second
    window.setInterval(refresh_directions, 1000);
    refresh_directions();

    save_new_mission_links();
    restore_new_mission_links();
})();
