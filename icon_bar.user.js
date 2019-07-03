// ==UserScript==
// @name        taustation_icon_bar
// @namespace   https://github.com/taustation-fan
// @description Extension to add quick-link icons to the icon bar at taustation.space
// @downloadURL https://github.com/taustation-fan/userscripts/raw/master/icon_bar.user.js
// @match       https://alpha.taustation.space/*
// @version     4.1
// @author      duelafn
// @require     https://rawgit.com/taustation-fan/userscripts/master/userscript-preferences.js
// ==/UserScript==

(function() {
    'use strict';

    // To configure this script, visit the in-game Preferences page (/preferences).
    let options = userscript_preferences( icon_bar_preferences_definition() );

    function icon_bar_preferences_definition() {
        return {
            key: 'icon_bar_prefs',
            label: 'Icon Bar',
            options: [
                {
                    label:   'Action: "Go to your hotel room" icon:',
                    help:    'To use, activate the icon twice.'
                },
                {
                    key:     'KEY_GOTO_HOTEL',
                    label:   '   • Hotkey: (if desired)',
                    type:    'text',
                    default: 'h'
                },
                {
                    key:     'ICON_HOTEL',
                    label:   '   • Icon: (any Font-Awesome 4 icon name)',
                    type:    'text',
                    default: 'fa-bed'
                },
                {
                    label:   'Action: "Go to your ship" icon:',
                    help:    'To use, activate the icon twice, allowing page to reload between attempts.'
                },
                {
                    key:     'SHIP_ID',
                    label:   '   • Ship registration number:',
                    help:    'If this field is blank, the Ship icon is not added.',
                    type:    'text'
                },
                {
                    key:     'KEY_GOTO_SHIP',
                    label:   '   • Hotkey: (if desired)',
                    type:    'text',
                    default: 's'
                },
                {
                    key:     'ICON_SHIP',
                    label:   '   • Icon:',
                    type:    'text',
                    default: 'fa-space-shuttle'
                },
                {
                    label:   'Status: "Well-fed" icon:',
                    help:    'Indicates whether the player is currently "Well-Fed".'
                },
                {
                    label:   '   [Deprecated: Tau Station now shows lightning icon when "Well Fed", not a banner]'
                },
                {
                    label:   'General configuration:'
                },
                {
                    key:     'MODIFIER_KEY',
                    label:   '   • Modifier key to combine with above hotkeys:',
                    type:    'select',
                    default: 'ctrlKey',
                    options: [
                        { value: '',        label: '(none)' },
                        { value: 'ctrlKey', label: 'CTRL' },
                        { value: 'altKey',  label: 'ALT' },
                    ]
                },
            ]
        };
    }

    // Canonicalize icon prefs: allow "empty" value (including whitespace) == unset value.
    // (userscript-preferences.js assumes that text values should contain at least one character.)
    if (options.ICON_HOTEL.trim() === "") { options.ICON_HOTEL = ""; }
    if (options.ICON_SHIP.trim() === "") { options.ICON_SHIP = ""; }

    // Helper functions
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

    let added_icons = false;
    function add_icon(icon, opt={}) {
        // The 2019-04-18 update inserted another avatar-links area above the
        // existing one, for character indicators (Visa, Bodyguard, and VIP).
        // It wraps poorly with >3 icons, so keep ours in the original area.
        //
        // The 2019-06-25 update moved the social icons into a full-width
        // row below the avatar photo & character indicator icons. Now, our
        // icons look better at the end of the character indicator icons row.
        let icons = document.querySelector(".avatar-links:last-of-type");
        if (!icons) { return; }

        let li = tag("li", { "class": "avatar-links--item" },
                     tag("a", { "href": (opt["href"] || "#"), "class": "icon-link", "data-component": "tooltip-basic", "data-message": (opt["tip"] || "") },
                         tag("span", { "class": "fa " + icon, "style": (opt["style"] || ""), "aria-hidden": "true" })
                        )
                    );
        icons.insertAdjacentElement('beforeend', li);
        added_icons = true;
        return li;
    }


    // Deprecated: Fork and Knife icon: Displayed if currently "Well-Fed"
    // The 2019-06-25 update removed the "Well Fed" banner, replacing it with
    // a new icon in the character indicator icons area (doing our work for us).


    let hotel_href;
    if (document.querySelector('.game-navigation a[href="/area/docks/leave_ship"]')) {
        hotel_href = "/area/docks/leave_ship";
    } else {
        hotel_href = "/area/hotel-rooms/enter-room";
    }
    if (options.ICON_HOTEL) {
        add_icon(options.ICON_HOTEL, { "href": hotel_href, "tip": "GoTo Room" });
    }

    let ship_href;
    if (options.SHIP_ID && options.SHIP_ID != "000-AA005") {
        ship_href = location.pathname.endsWith("/area/docks") ? "/area/docks/board_ship/" + options.SHIP_ID : "/area/docks";
        if (options.ICON_SHIP) {
            add_icon(options.ICON_SHIP, { "href": ship_href, "tip": "GoTo Ship" });
        }
    }

    // If we added any icons, we'll need to adjust the spacing between all icons on the row.
    // (Result of the 2019-06-25 update, after which we started using the "VIP"/etc. icons row.)
    if (added_icons) {
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

    // Listen for Control-* then perform action
    document.addEventListener('keydown', (event) => {
        if ((! options.MODIFIER_KEY) ||
            (options.MODIFIER_KEY === 'ctrlKey' && event.ctrlKey) ||
            (options.MODIFIER_KEY === 'altKey'  && event.altKey)    ){
            if (options.KEY_GOTO_HOTEL == event.key) {
                window.location.href = hotel_href;
                event.preventDefault();
                event.stopPropagation();
            }
            if (ship_href && options.KEY_GOTO_SHIP == event.key) {
                window.location.href = ship_href;
                event.preventDefault();
                event.stopPropagation();
            }
        }
    });

    // CSS needed to make room for the additional icons
    var head = document.getElementsByTagName('head')[0];
    if (head && (options.ICON_HOTEL || (options.ICON_SHIP && options.SHIP_ID))) {
        head.appendChild(tag(
            'style',
            { 'type': 'text/css' },
            `
            /* Spacing between action buttons (icons) */
            .avatar-links li + li { margin-left: 0em !important; }
            .avatar-links li a { width: 1.75em !important; }
            .avatar-links li .fa { margin-top: 0.5em; }
            @media (min-width: 1200px) { .avatar-links li .fa { margin-top: 0.75em; } }
        `));
    }

})();
