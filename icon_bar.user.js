// ==UserScript==
// @name        taustation_icon_bar
// @namespace   https://github.com/taustation-fan
// @description Extension to add quick-link icons to the icon bar at taustation.space
// @match       https://alpha.taustation.space/*
// @version     2
// @author      duelafn
// ==/UserScript==

function INSTALL() {
    button_well_fed();              // Fork and Knife icon: Displayed if currently "Well-Fed"
    button_goto_hotel();            // Bed icon: go to hotel room (needs two clicks)
//  button_goto_ship("003-AA010");  // Spaceship icon: go to ship (needs two clicks, and set serial number!)

    var head = document.getElementsByTagName('head')[0];
    if (head) {
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
}


// Helper function
function tag(name, attr, content) {
    var ele = document.createElement(name);
    if (attr) {
        for (var a in attr) { ele.setAttribute(a, attr[a]); }
    }
    if (content) {
        if (typeof content === "string") {
            ele.textContent = content;
        } else {
            ele.insertAdjacentElement('beforeend', content);
        }
    }
    return ele;
}

// Bed icon: go to hotel room (needs two clicks)
function button_goto_hotel() {
    'use strict';

    var icons = document.querySelector(".avatar-links");
    if (!icons) { return; }

    var li = tag("li", { "class": "avatar-links--item" },
                 tag("a", { "href": "/area/hotel-rooms/enter-room", "class": "icon-link", "data-component": "tooltip-basic", "data-message": "GoTo Room" },
                     tag("span", { "class": "fa fa-bed" })
                    )
                );
    icons.insertAdjacentElement('beforeend', li);
}

// Spaceship icon: go to ship (needs two clicks)
function button_goto_ship(serial) {
    'use strict';

    var icons = document.querySelector(".avatar-links");
    if (!icons) { return; }

    var href = location.pathname.endsWith("/area/docks") ? "/area/docks/board_ship/" + serial : "/area/docks";
    var li = tag("li", { "class": "avatar-links--item" },
                 tag("a", { "href": href, "class": "icon-link", "data-component": "tooltip-basic", "data-message": "GoTo Ship" },
                     tag("span", { "class": "fa fa-space-shuttle" })
                    )
                );
    icons.insertAdjacentElement('beforeend', li);
}

// Fork and Knife icon: Displayed if currently "Well-Fed"
// Also hides the well-fed buff banner (shows it temporarily if you hover
// over the fork and knife, keeps it displayed if you click the icon).
function button_well_fed() {
    'use strict';

    var icons = document.querySelector(".avatar-links");
    if (!icons) { return; }

    var buff_div = document.querySelector(".buff-messages");
    if (!buff_div) { return; }
    var display = buff_div.style.display;

    var unknown = 0;
    buff_div.querySelectorAll(".timer-message tr").forEach(
        function(tr, idx, rs) {
            if (idx > 0) { // skip header
                if (tr.children[0].textContent === 'Well fed') {
                    var li = tag("li", { "class": "avatar-links--item" },
                                 tag("a", { "href": "#", "class": "icon-link", "data-component": "tooltip-basic", "data-message": "Well fed" },
                                     tag("span", { "class": "fa fa-cutlery", "style": "color: #66bb6a;" })
                                    )
                                );

                    li.onmouseover = function() { buff_div.style.display = display; };
                    li.onmouseout  = function() { if (unknown == 0) { buff_div.style.display = "none"; } };
                    li.onclick     = function() { unknown = unknown ? 0 : 1; };

                    icons.insertAdjacentElement('beforeend', li);
                }

                else { unknown += 1; }
            }
        }
    );

    if (unknown == 0) {
        buff_div.style.display = 'none';
    }
}


INSTALL();
