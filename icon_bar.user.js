// ==UserScript==
// @name        taustation_icon_bar
// @namespace   https://github.com/taustation-fan
// @description Extension to add quick-link icons to the icon bar at taustation.space
// @match       https://alpha.taustation.space/*
// @version     3
// @author      duelafn
// ==/UserScript==

(function() {
    'use strict';

    let SHIP_ID = "000-AA005";               // Set to YOUR ship serial number

    // Disable any key or icon by setting it to an empty string.
    let KEY_GOTO_HOTEL = 'h';
    let KEY_GOTO_SHIP  = 's';

    // May set icon to any font-awesome 4 icon name.
    let ICON_HOTEL    = 'fa-bed';            // Bed icon: go to hotel room (needs two clicks)
    let ICON_SHIP     = 'fa-space-shuttle';  // Spaceship icon: go to ship (needs two clicks, and set serial number!)
    let ICON_WELL_FED = 'fa-cutlery';        // Fork and Knife icon: Displayed if currently "Well-Fed"


    // JUST IMPLEMENTATION BELOW, NOTHING MORE TO CONFIGURE!
    // -----------------------------------------------------

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


    // Fork and Knife icon: Displayed if currently "Well-Fed"
    // Also hides the well-fed buff banner (shows it temporarily if you hover
    // over the fork and knife, keeps it displayed if you click the icon).
    if (ICON_WELL_FED) {
        let buff_div = document.querySelector(".buff-messages");
        if (!buff_div) { return; }
        let display = buff_div.style.display;

        let unknown = 0;
        buff_div.querySelectorAll(".timer-message tr").forEach(
            function(tr, idx, rs) {
                if (idx > 0) { // skip header
                    if (tr.children[0].textContent === 'Well fed') {
                        let icon = add_icon(ICON_WELL_FED, { "tip": "Well fed", "style": "color: #66bb6a;" });
                        if (icon) {
                            icon.onmouseover = function() { buff_div.style.display = display; };
                            icon.onmouseout  = function() { if (unknown == 0) { buff_div.style.display = "none"; } };
                            icon.onclick     = function() { unknown = unknown ? 0 : 1; };
                        }
                    }

                    else { unknown += 1; }
                }
            }
        );

        if (unknown == 0) {
            buff_div.style.display = 'none';
        }
    }

    let hotel_href;
    if (document.querySelector('.game-navigation a[href="/area/docks/leave_ship"]')) {
        hotel_href = "/area/docks/leave_ship";
    } else {
        hotel_href = "/area/hotel-rooms/enter-room";
    }
    if (ICON_HOTEL) {
        add_icon(ICON_HOTEL, { "href": hotel_href, "tip": "GoTo Room" });
    }

    let ship_href;
    if (SHIP_ID && SHIP_ID != "000-AA005") {
        ship_href = location.pathname.endsWith("/area/docks") ? "/area/docks/board_ship/" + SHIP_ID : "/area/docks";
        if (ICON_SHIP) {
            add_icon(ICON_SHIP, { "href": ship_href, "tip": "GoTo Ship" });
        }
    }

    // Listen for Control-* then perform action
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey) {
            if (KEY_GOTO_HOTEL == event.key) {
                window.location.href = hotel_href;
            }
            if (ship_href && KEY_GOTO_SHIP == event.key) {
                window.location.href = ship_href;
            }
        }
    });

    // CSS needed to make room for the additional icons
    var head = document.getElementsByTagName('head')[0];
    if (head && (ICON_HOTEL || ICON_SHIP || ICON_WELL_FED)) {
        head.appendChild(tag(
            'style',
            { 'type': 'text/css' },
            `
            /* Reduce spacing between action buttons */
            .avatar-links li + li { margin-left: 0em !important; }
            .avatar-links li a { width: 1.75em; }
            /* Vertical alignment of icons (varies on mobile, not sure how to fix) */
            .avatar-links li .fa { margin-top: 0.8em; }
            @media (min-width: 1080px) {
                .avatar-links li .fa { margin-top: 0.33em; }
            }
        `));
    }

})();
