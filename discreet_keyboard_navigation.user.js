// ==UserScript==
// @name         discreet_keyboard_navigation
// @namespace    https://github.com/taustation-fan/userscripts/raw/master/discreet_keyboard_navigation.user.js
// @version      1.6
// @author       Dean Serenevy <dean@serenevy.net>
// @license      CC0 - https://creativecommons.org/publicdomain/zero/1.0/
// @description  Add keyboard shortcut and optional icon to perform discreet work steps. Some options available on User Preferences page.
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/discreet_keyboard_navigation.user.js
// @match        https://alpha.taustation.space/area/*
// @match        https://alpha.taustation.space/character/*
// @match        https://alpha.taustation.space/preferences
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @require      https://rawgit.com/taustation-fan/userscripts/master/userscript-preferences.js
// @grant        none
// ==/UserScript==


// Note: I think this is on the safe side of the Tau Station Term of Use.
// It performs actions only when initiated by user and, now that users are
// protected from attack during discreet missions, doesn't change game play
// for would-be attackers. It is also greatly reduces RSI flare-up from too
// much mouse use for me.

// Nothing user-configurable below
// To configure, visit in-game User Preferences (/preferences)

(function() {
    'use strict';

    let options = userscript_preferences( get_prefs_spec() );

    // stop trigger-happy fingers from following a link twice before page reload
    let followed_link = false;
    // If we are adding an icon, we need more room!
    if (options.add_discreet_icon) {
        let head = document.getElementsByTagName('head')[0];
        let s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        s.appendChild(document.createTextNode(`
            /* Spacing between action buttons (icons) */
            .avatar-links li + li { margin-left: 0em !important; }
            .avatar-links li a { width: 1.75em !important; }
            .avatar-links li .fa { margin-top: 0.5em; }
            @media (min-width: 1200px) { .avatar-links li .fa { margin-top: 0.75em; } }
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

    function goto_url(url) {
        if (!followed_link) {
            followed_link = true;
            window.location.href = url;
        }
    }

    // _discreet_step: Perform the next action required by the discreet mission
    function _discreet_step() {
        let node;
        let ns;

        if (followed_link) {
            return;
        }

        // People page with a mission NPC
        node = document.querySelector('a.has-mission')
        if (node) {
            goto_url(node.getAttribute('href'));
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
            goto_url(node.getAttribute('href'));
            return;
        }

        // You go back, Jack, do it again
        if (options.loop_after_completion) {
            ns = document.querySelectorAll('.mission-updates');
            for (let i = 0; i < ns.length; i++) {
                if (ns[i].textContent.match(/You have completed the "Discreet Work"/)) {
                    goto_url('/travel/area/discreet-work');
                    return;
                }
            }
        }

        // Fallback in case of error (bug 41) or manual movement
        // If in an area with a mission "people" tab, click the tab
        node = document.querySelector('a[href="#/people"]');
        if (node && node.querySelector('.mission-flag--img')) {
            node.click();
            return;
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
                    goto_url(href);
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
        let icons = document.querySelector(".avatar-links:last-of-type");
        if (!icons) { return; }

        let li = tag("li", { "class": "avatar-links--item" },
                     tag("a", { "href": (opt["href"] || "#"), "class": "icon-link", "data-component": "tooltip-basic", "data-message": (opt["tip"] || "") },
                         tag("span", { "class": "fa " + icon, "style": (opt["style"] || ""), "aria-hidden": "true" })
                        )
                    );
        icons.insertAdjacentElement('beforeend', li);
        return li;
    }

    // Spec for userscript-preferences.js library
    function get_prefs_spec() {
        return {
            key: "discreet_kb_nav_prefs",
            label: "Discreet Keyboard Navigation",
            options: [
                {
                    key: "key_press",
                    label: "Key to press to step the discreet work",
                    type: "text",
                    default: "d"
                },
                {
                    key: "key_modifier",
                    label: "Modifier key to combine with above key",
                    type: "select",
                    default: "ctrlKey",
                    options: [
                        { value: "", label: "(none)" },
                        { value: "ctrlKey", label: "CTRL" },
                        { value: "altKey", label: "ALT" },
                    ]
                },
                {
                    key: "loop_after_completion",
                    label: "Loop After Completion",
                    help: "After mission is complete, will return to discreet area to start the next mission",
                    type: "boolean",
                    default: true
                },
                {
                    key: "add_discreet_icon",
                    label: "Add Discreet Icon",
                    help: "Rearrange icon bar and add an icon to perform next step. Useful on mobiles",
                    type: "boolean"
                },
                {
                    key: "debug",
                    label: "Debug",
                    type: "boolean"
                }
            ]
        };
    }


    // Set it up
    // ---------
    // Enable key / icon only when in discreet work area or when we are
    // currently on a mission. Note: when we have just finished a mission,
    // we don't have a page reload so the loop feature will still work.
    let enable = location.pathname.endsWith("/area/discreet-work");
    if (!enable) {
        let mission = document.querySelector('#employment_panel a[href="/mission"]');
        enable = (mission && mission.textContent === "Show current");
    }

    if (enable) {
        if (options.add_discreet_icon) {
            let icon = add_icon("fa-bookmark", { "style": "color: #c24004;" });
            if (icon) {
                icon.onclick = _discreet_step;

                // Adjust the spacing between all icons on the row.
                // (The 2019-06-25 update moved the social icons into a full-width
                // row below the avatar photo & character indicator icons. Now, our
                // icon looks better at the end of the character indicator icons row
                // -- but we need to make sure there's room for all icons present.)
                let num_visible_icons = 0;
                let icons_in_row = document.querySelector(".avatar-links:last-of-type").children;
                for (var ii = 0; ii < icons_in_row.length; ii++) {
                    if (! icons_in_row[ii].hasAttribute("hidden")) {
                        num_visible_icons++;
                    }
                }
                let new_width = (100 / num_visible_icons) + "%";
                for (ii = 0; ii < icons_in_row.length; ii++) {
                    if (! icons_in_row[ii].hasAttribute("hidden")) {
                        icons_in_row[ii].style.width = new_width;
                        icons_in_row[ii].style.minWidth = "24px";
                    }
                }
            }
        }

        // Listen for bound key-combination then perform a step
        document.addEventListener('keydown', (event) => {
            let match = false;
            if ( options.key_modifier.length > 0 && options.hasOwnProperty("key_modifier") ) {
                if ( event[ options.key_modifier ] && event.key === options.key_press ) {
                    match = true;
                }
            }
            else if ( event.key === options.key_press && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey ) { // No modifier configured
                match = true;
            }

            if (match) {
                _discreet_step();
                event.preventDefault();
                event.stopPropagation();
            }
        });
    }

})();
