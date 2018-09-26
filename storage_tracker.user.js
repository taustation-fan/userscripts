// ==UserScript==
// @name         storage_tracker
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/storage_tracker.user.js
// @version      1.0
// @description  Track Storage items, and show owned items in Public Market
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.slim.js
// ==/UserScript==

//
// localStorage-related variables.
//
var storage_key_prefix = "tSStorage_"; // Actual prefix includes player name: e.g., "tSStorageTracker_PlayerName_".
var player_name;
var coretechs_storage;

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
    });
    coretechs_storage = new Object;
    coretechs_storage.items = items;
    coretechs_storage.date  = date;
    localStorage.setItem( storage_key_prefix + "_coretechs_storage", JSON.stringify(coretechs_storage) );
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
