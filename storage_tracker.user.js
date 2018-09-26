// ==UserScript==
// @name         storage_tracker
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/storage_tracker.user.js
// @version      1.0
// @description  Track Storage items, and show owned items in Public Market
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.slim.js
// @require      https://github.com/taustation-fan/userscripts/raw/master/taustation-tools-common.js
// ==/UserScript==

//
// localStorage-related variables.
//
var storage_key_prefix = "tSStorage_"; // Actual prefix includes player name: e.g., "tSStorageTracker_PlayerName_".
var player_name;
var coretechs_storage;

// UI variables.
var tST_region; // Container for misc. Tau Station tools' UI.
var tSStorage_region;
var tSStorage_region_coretechs_storage;

//

$(document).ready(tSStorageTracker_main);

function tSStorageTracker_main() {
    'use strict';

    if ( !tSStorageTracker_storage_available() ) {
        console.log("localStorage not available");
        return;
    }

    // Get the player's name, to let us store different session data for different player characters.
    if (! player_name) {
        player_name = $('#player-name').text();
        if (player_name.length > 0) {
            storage_key_prefix += player_name + "_";
        }
    }

    var page_path = window.location.pathname;

    if ( page_path.startsWith('/coretechs/storage') ) {
        // tSStorageTracker_init();
        tSStorageTracker_load_from_storage();
        tSStorageTracker_coretechs_storage();
    }
    else if ( page_path.startsWith('/area/electronic-market') ) {
        // tSStorageTracker_init();
        tSStorageTracker_load_from_storage();
        tSStorageTracker_area_public_market();
    }
}

function tSStorageTracker_load_from_storage() {
    coretechs_storage = localStorage.getItem( storage_key_prefix + "_coretechs_storage" );

    if ( !coretechs_storage ) {
        console.log("No stored items found - visit Coretechs / Storage first");
        return;
    }

    coretechs_storage = JSON.parse( coretechs_storage );
}

function tSStorageTracker_coretechs_storage() {
    var date  = (new Date).toISOString();
    var items = new Object;
    var seen  = new Array;

    $(".content-section > table > tbody > tr").each(function() {
        var star     = $(this).find("td").eq(0).text();
        var station  = $(this).find("td").eq(1).text();
        var name     = $(this).find("td").eq(2).text();
        var quantity = $(this).find("td").eq(3).text();
        if ( !(name in items) ) {
            items[name] = new Object;
        }
        if ( !(star in items[name]) ) {
            items[name][star] = new Object;
        }
        if ( ( star in items[name] ) && ( station in items[name][star] ) ) {
            // already exists in this station - increase quantity
            items[name][star][station] = +quantity + items[name][star][station];
        }
        else {
            // new in station
            items[name][star][station] = +quantity;
        }
        seen[name] = 1;
    });
    coretechs_storage = new Object;
    coretechs_storage.items = items;
    coretechs_storage.date  = date;
    localStorage.setItem( storage_key_prefix + "_coretechs_storage", JSON.stringify(coretechs_storage) );

    var count = Object.keys(seen).length;
    tSStorageTracker_update_UI("Saved " + count + " unique items to localStorage");
}

function tSStorageTracker_area_public_market() {
    var items = coretechs_storage.items;

    // Add header
    $(".market-list-column-labels > div").eq(1).after("<div><span>Owned</span></div>");

    // Each item
    $(".market-list > li").each(function() {
        var dl       = $(this).find("dl").first();
        var name     = $(dl).find("dd").first().text();
        var appendTo = $(dl).find("div").eq(1);
        var content  = "0";

        if ( name in items ) {
            var count = 0;
            var text  = "";
            for ( var star in items[name] ) {
                for ( var station in items[name][star] ) {
                    var this_count = +items[name][star][station];
                    count += this_count;
                    if ( text.length ) {
                        text += ", ";
                    }
                    text += station + " (" + this_count + ")";
                }
            }
            content = "<span title=\"" + text + "\">" + count + "</span>";
        }
        $(appendTo).after(
            "<div class=\"market-item--content--col\">" +
                "<dt class=\"visuallyhidden\">Quantity Owned</dt>" +
                "<dd>" +
                    content +
                "</dd>" +
            "</div>"
        );
    });
}

function tSStorageTracker_add_UI() {
    console.log("tSStorageTracker_add_UI");

    add_css_link("https://github.com/taustation-fan/userscripts/raw/master/taustation-tools.css");

    tST_region = $("#tST-container");
    if (! tST_region.length) {
        $('.stats-container').before('<div id="tST-container" class="tST-container">\n</div>\n');
        tST_region = $("#tST-container");
    }

    // Add the section for this script's UI (vs. sibling scripts).
    tSStorage_region = $("#tSStorage-region");
    if (! tSStorage_region.length) {
        tSStorage_region = $('<div id="tSStorage-region" class="tST-section ">\n</div>\n').appendTo(tST_region);
    }

    tSStorage_region_coretechs_storage = $("#tSStorage-coretechs-storage");
    if (! tSStorage_region_coretechs_storage.length) {
        $('<span>Storage Tracker: </span>').appendTo(tSStorage_region);
        tSStorage_region_coretechs_storage = $('<span id="tSStorage-coretechs-storage"></span>').appendTo(tSStorage_region);
    }
}

function tSStorageTracker_update_UI(message) {
    console.log("tSStorageTracker_update_UI");

    if ( tSStorage_region_coretechs_storage === undefined ) {
        tSStorageTracker_add_UI();
    }

    tSStorage_region_coretechs_storage.html(message);
}

function tSStorageTracker_storage_available() {
    // example copied from https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
    var type="localStorage";

    try {
        var storage = window[type],
            x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            storage.length !== 0;
    }
}
