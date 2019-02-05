// ==UserScript==
// @name         discreet_keyboard_navigation
// @namespace    https://github.com/taustation-fan/userscripts/raw/master/discreet_keyboard_navigation.user.js
// @version      1.0
// @author       Dean Serenevy <dean@serenevy.net>
// @license      CC0 - https://creativecommons.org/publicdomain/zero/1.0/
// @description  Add keyboard shortcut and optional icon to perform discreet work steps. Some options available in the scriot source.
// @match        https://alpha.taustation.space/*
// @grant        none
// ==/UserScript==


// Note: I think this is on the safe side of the Tau Station Term of Use.
// It performs actions only when initiated by user and, now that users are
// protected from attack during discreet missions, doesn't change game play
// for would-be attackers. It is also greatly reduces RSI flare-up from too
// much mouse use for me.

(function() {
    'use strict';

    // Set to key to press (with control) to step the discreet work
    let KEY_PRESS = 'd';

    // When true, after mission is complete, will return to discreet area
    // to start the next mission. When false, pressing Ctrl-d after
    // completing the mission will do nothing.
    let LOOP_AFTER_COMPLETION = true;

    // When true, adjust style of icon bar to allow more icons and then
    // insert an icon which will perform the next discreet action. This is
    // useful on mobile where keyboard navigation is useless. However, due
    // to Tau Station scrolling down to mission steps, you will do a
    // mixture of tapping the discreet icon and tapping the usual Tau
    // Station mission steps. This is still quite helpful on mobile since
    // it still reduces scrolling and tapping, just not as convenient as on
    // desktop. This combined with the fact that it messes with the icon
    // box style means I leave it disabled by default.
    let ADD_DISCREET_ICON = false;


    // JUST IMPLEMENTATION BELOW, NOTHING MORE TO CONFIGURE!
    // -----------------------------------------------------

    // If we are adding an icon, we need more room!
    if (ADD_DISCREET_ICON) {
        let head = document.getElementsByTagName('head')[0];
        let s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        s.appendChild(document.createTextNode(`
            /* Spacing between action buttons (icons) */
            .avatar-links li + li { margin-left: 0em !important; }
            .avatar-links li a { width: 1.75em; }
            .avatar-links li .fa { margin-top: 0.8em; }
            @media (min-width: 1080px) { .avatar-links li .fa { margin-top: 0.33em; } }
        `));
        head.appendChild(s);
    }

    // narrative directions: capture the name of the next location to visit
    var dh_narrative_directions = [
        /^\s*New goals:\s*Talk to .*? in (.*?) on .*?\s*$/,
        /^New goals: Return to .*? in (.*?) on .*? to collect your reward\.$/,
        /^From your CORETECHS you see that (.*?) is the place to find .*\.$/,
        /^Go to .*? who is in (.*)\.$/,
        /^A hunch tells you to go to the (.*?) to find .*\.$/,
        /^You're pretty sure you can find .*? in (.*)\.$/,
        /^You check your CORETECHS for the location of .*?. Seems like the place to look is (.*)\.$/,
        /^You ask a passerby if they know where to find .*?. They direct you to (.*)\.$/,
        // These next two are probably obsolete, but may not have been removed from all stations.
        /^New goals: Return to .*? in (.*?) to collect your reward\.$/,
        /^\s*New goals:\s*Talk to .*? in (.*?)\s*$/,
    ];

    // _discreet_target: loop over narrative directions and return the next location to visit
    function _discreet_target(ns) {
        if (!ns) { return null; }
        for (let i = 0; i < ns.length; i++) {
            for (let j = 0; j < dh_narrative_directions.length; j++) {
                console.log("Test '" + dh_narrative_directions[j] + "' against '" + ns[i].textContent + "'")
                let rv = dh_narrative_directions[j].exec(ns[i].textContent);
                if (rv != null) {
                    return rv[1];
                }
            }
        }
        return null;
    }

    // _discreet_step: Perform the next action required by the discreet mission
    function _discreet_step() {
        let node;
        let ns;

        // People page with a mission NPC
        node = document.querySelector('a.has-mission')
        if (node) {
            window.location.href = node.getAttribute('href');
            return;
        }

        // Unambiguous (single) mission action
        ns = document.querySelectorAll('.mission-action a');
        if (ns && ns.length > 0) {
            if (1 == ns.length) {
                ns[0].click();
                return;
            }
        }

        // Go to location from mission update
        if (goto_area(_discreet_target(document.querySelectorAll('.narrative-direction')))) {
            return;
        }
        if (goto_area(_discreet_target(document.querySelectorAll('.mission-updates')))) {
            return;
        }

        // "Accept" mission button on main discreet-work page
        node = document.querySelector('a[href="/area/discreet-work/accept"]');
        if (node) {
            window.location.href = node.getAttribute('href');
            return;
        }

        // You go back, Jack, do it again
        if (LOOP_AFTER_COMPLETION) {
            ns = document.querySelectorAll('.mission-updates');
            for (let i = 0; i < ns.length; i++) {
                if (ns[i].textContent.match(/You have completed the "Anonymous" mission/)) {
                    window.location.href = '/travel/area/discreet-work';
                }
            }
        }

        console.log("No discreet mission actions found.")
    }

    // goto_area: loop over navigation links and go to the requested location
    function goto_area(name) {
        if (name) {
            let ns = document.querySelectorAll('.nav-links .areas a');
            for (let i = 0; i < ns.length; i++) {
                let a = ns[i];
                if (a.textContent === name) {
                    let href = a.getAttribute('href');
                    if (href.indexOf("#/people") < 0) {
                        href = href + "#/people";
                    }
                    window.location.href = href;
                    return true;
                }
            }
        }
        return false;
    }

    // tag(name, attr, content...) : shortcut for building HTML
    function tag() {
        let ele = document.createElement(arguments[0]);
        if (arguments.length > 1 && arguments[1]) {
            for (let a in arguments[1]) { ele.setAttribute(a, arguments[1][a]); }
        }
        if (arguments.length > 2) {
            for (let i = 2; i < arguments.length; i++) {
                if (typeof arguments[i] === "string") {
                    ele.insertAdjacentText('beforeend', arguments[i]);
                } else {
                    ele.insertAdjacentElement('beforeend', arguments[i]);
                }
            }
        }
        return ele;
    }

    // Add an icon to the icon bar
    function add_icon(icon, opt={}) {
        let icons = document.querySelector(".avatar-links");
        if (!icons) { return; }

        let li = tag("li", { "class": "avatar-links--item" },
                     tag("a", { "href": (opt["href"] || "#"), "class": "icon-link", "data-component": "tooltip-basic", "data-message": (opt["tip"] || "") },
                         tag("span", { "class": "fa " + icon, "style": (opt["style"] || ""), "aria-hidden": "true" })
                        )
                    );
        icons.insertAdjacentElement('beforeend', li);
        return li;
    }


    // Set it up
    // ---------
    // Enable key / icon only when in discreet work area or when we are
    // currently on a mission. Note: when we have just finished a mission,
    // we don't have a page reload so the loop feature will still work.
    let enable = location.pathname.endsWith("/area/discreet-work");
    if (!enable) {
        let mission = document.querySelector('a[href="/mission"]');
        enable = (mission && mission.textContent === "Anonymous");
    }

    if (enable) {
        if (ADD_DISCREET_ICON) {
            let icon = add_icon("fa-bookmark", { "style": "color: #c24004;" });
            if (icon) { icon.onclick = _discreet_step; }
        }

        // Listen for Control-d then perform a step
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && KEY_PRESS == event.key) {
                _discreet_step();
                event.preventDefault();
                event.stopPropagation();
            }
        });
    }

})();
