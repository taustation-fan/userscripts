// ==UserScript==
// @name         Storage Tracker
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/storage_tracker.user.js
// @version      1.5
// @description  Track Storage items, and show owned items in Public Market
// @match        https://alpha.taustation.space/area/electronic-market*
// @match        https://alpha.taustation.space/area/vendors/*
// @match        https://alpha.taustation.space/character/inventory
// @match        https://alpha.taustation.space/coretechs/storage
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @require      https://github.com/taustation-fan/userscripts/raw/master/taustation-tools-common.js
// ==/UserScript==

//
// localStorage-related variables.
//
var storage_key_prefix = "tSStorage_"; // Actual prefix includes player name: e.g., "tSStorage_PlayerName_".
var player_name;
var coretechs_storage;

// UI variables.
var tSStorage_region;

//

$(document).ready(tSStorageTracker_main);

function tSStorageTracker_main() {
    'use strict';

    if ( !tSStorageTracker_storage_available() ) {
        tSStorageTracker_update_UI("localStorage browser feature not available");
        return;
    }

    // Get the player's name, to let us store different session data for different player characters.
    if (! player_name) {
        player_name = $('#player-name').text();
        if (player_name.length > 0) {
            // If the user is part of a Syndicate or has VIP, drop the "[foo]" prefix/suffix.
            storage_key_prefix += player_name.replace(/^( *\[...\] +)?([^( ]+)( +\(VIP\) *)?/, '$2') + "_";
        }
    }

    var page_path = window.location.pathname;

    if ( page_path.startsWith('/coretechs/storage') ) {
        tSStorageTracker_load_from_localStorage();
        tSStorageTracker_update_localStorage_from_coretechs_storage();
    }
    else if ( page_path.startsWith('/area/electronic-market') ) {
        tSStorageTracker_load_from_localStorage();
        tSStorageTracker_decorate_public_market();
    }
    else if ( page_path.startsWith('/area/vendors/') ) {
        tSStorageTracker_load_from_localStorage();
        tSStorageTracker_decorate_vendor();
    }
    else if ( page_path.startsWith('/character/inventory') ) {
        tSStorageTracker_load_from_localStorage();
        tSStorageTracker_update_localStorage_from_inventory();
        tSStorageTracker_decorate_inventory();
        tSStorageTracker_print_vip();
        tSStorageTracker_print_rations();
    }
}

function tSStorageTracker_count_vip(counts) {
    var total_days = 0;
    for (var key in counts) {
       if (counts.hasOwnProperty(key) && key.startsWith('vip-')) {
          var days_per_pack = parseInt(key.substr(4));
          total_days += counts[key] * days_per_pack;
       }
    }
    return total_days;
}

function tSStorageTracker_print_vip() {
    var vip_storage = tSStorageTracker_count_vip(coretechs_storage.storage.item_totals);
    var vip_inventory = tSStorageTracker_count_vip(coretechs_storage.carried.items);
    console.log('Days of VIP in storage: ', vip_storage);
    console.log('Days of VIP in inventory: ', vip_inventory);
    console.log('Days of VIP total: ', vip_storage + vip_inventory);
}

function tSStorageTracker_count_rations(counts) {
    var results = {}
    for (var key in counts) {
       if (counts.hasOwnProperty(key) && key.startsWith('ration-')) {
            results[key] = counts[key];
       }
    }
    return results;
}

function tSStorageTracker_print_rations() {
     var stored = tSStorageTracker_count_rations(coretechs_storage.storage.item_totals);
     var carried = tSStorageTracker_count_rations(coretechs_storage.carried.items);
     for (var tier = 1; tier <= 5; tier++) {
         var key = 'ration-' + tier;
         var count = (stored[key] || 0) + (carried[key] || 0);
         if (count > 0) {
             console.log('Ration tier ' + tier + ': ' + count);
         }
     }
}

function tSStorageTracker_load_from_localStorage() {
    coretechs_storage = localStorage.getItem( storage_key_prefix + "_storage_tracker" );

    if ( !coretechs_storage ) {
        tSStorageTracker_update_UI("No stored items found - visit Coretechs / Storage first");
        coretechs_storage = {};
        return;
    }

    coretechs_storage = JSON.parse( coretechs_storage );
}

function tSStorageTracker_update_localStorage_from_coretechs_storage() {
    var date  = (new Date).toISOString();
    var items = {};
    var count = {};

    $(".content-section > table > tbody > tr").each(function() {
        var star     = $(this).find("td").eq(0).text();
        var station  = $(this).find("td").eq(1).text();
        var name     = $(this).find("td").eq(2).find("a").attr("href");
        var quantity = $(this).find("td").eq(3).text();
        var regex    = /\/item\//;

        if ( name === undefined ) {
            return;
        }
        name = name.replace( regex, "" );

        if ( !(name in items) ) {
            items[name] = {};
        }
        if ( !(star in items[name]) ) {
            items[name][star] = {};
        }
        if ( ( star in items[name] ) && ( station in items[name][star] ) ) {
            // already exists in this station - increase quantity
            items[name][star][station] = +quantity + items[name][star][station];
        }
        else {
            // new in station
            items[name][star][station] = +quantity;
        }
        if ( count[name] === undefined ) {
            count[name] = +quantity;
        }
        else {
            count[name] += +quantity;
        }
    });
    coretechs_storage.storage       = {};
    coretechs_storage.storage.date  = date;
    coretechs_storage.storage.items_by_location = items;
    coretechs_storage.storage.item_totals       = count;
    localStorage.setItem( storage_key_prefix + "_storage_tracker", JSON.stringify(coretechs_storage) );

    var count = Object.keys(count).length;
    tSStorageTracker_update_UI("Saved [" + count + "] unique items");
}

function tSStorageTracker_update_localStorage_from_inventory() {
    var date  = (new Date).toISOString();
    var items = {};

    $("section[data-inventory-section='carried'] > .slots > .slot").each(function() {
        let button   = $(this).find("button").first();
        let name     = button.attr("data-item-name");
        let quantity = button.find("span.amount");

        if ( quantity.length ) {
            let text = quantity.text();
            let remove = quantity.find(".visuallyhidden").text();
            text = text.replace( remove, "" );
            quantity = text;
        }
        else {
            quantity = 1;
        }

        if ( name in items ) {
            // already got some - increase quantity
            items[name] = +quantity + items[name];
        }
        else {
            // new
            items[name] = +quantity;
        }
    });
    coretechs_storage.carried = {};
    coretechs_storage.carried.items = items;
    coretechs_storage.carried.date  = date;
    localStorage.setItem( storage_key_prefix + "_storage_tracker", JSON.stringify(coretechs_storage) );

    var count = Object.keys(items).length;
    tSStorageTracker_update_UI("Saved [" + count + "] unique carried items");
}

function tSStorageTracker_decorate_public_market() {
    let storage = ( coretechs_storage.storage !== undefined ) ? coretechs_storage.storage.item_totals : {};
    let carried = ( coretechs_storage.carried !== undefined ) ? coretechs_storage.carried.items       : {};

    // Add headers
    $(".market-list-column-labels > div").eq(1).after('<div class="market-list-column-labels--qty"><span class="to-center">Stored</span></div>');
    $(".market-list-column-labels > div").eq(1).after('<div class="market-list-column-labels--qty"><span class="to-center">Carried</span></div>');

    // Each item
    $(".market-list > li").each(function() {
        var dl       = $(this).find("dl").first();
        var name     = $(dl).find("dd > a").attr("href");
        var appendTo = $(dl).find("div").eq(1);
        name = name.replace( /\/item\//, "" );

        let storage_count = ( name in storage ) ? storage[name] : 0;
        let carried_count = ( name in carried ) ? carried[name] : 0;

        $(appendTo).after(
            "<div class=\"market-item--content--col market-item--content--qty\">" +
                "<dt class=\"visuallyhidden\">Stored</dt>" +
                "<dd>" +
                    storage_count +
                "</dd>" +
            "</div>"
        );

        $(appendTo).after(
            "<div class=\"market-item--content--col market-item--content--qty\">" +
                "<dt class=\"visuallyhidden\">Carried</dt>" +
                "<dd>" +
                    carried_count +
                "</dd>" +
            "</div>"
        );
    });
}

function tSStorageTracker_decorate_vendor() {
    tSStorageTracker_decorate_item_slots(
        ".vendor > .inventory > section[data-inventory-section=carried] > .slots > .slot",
        '5.5em',
        '-5.5em'
    );
}

function tSStorageTracker_decorate_inventory() {
    tSStorageTracker_decorate_item_slots(
        ".inventory > section[data-inventory-section=carried] > .slots > .slot",
        '4em',
        '-4em'
    );
}

function tSStorageTracker_decorate_item_slots(slots, container_offset, label_offset) {
    let storage = ( coretechs_storage.storage !== undefined ) ? coretechs_storage.storage.item_totals : {};
    let carried = ( coretechs_storage.carried !== undefined ) ? coretechs_storage.carried.items       : {};

    // Each item
    $(slots).each(function() {
        $(this).css( 'margin-bottom', container_offset ); // vendor page needs 5.5em
        // ^ inventory page needs 4.25em
        var button = $(this).find("button").first();
        var name   = $(button).attr("data-item-name");
        var content  = "0";

        // show quantity count in bottom-left of item button
        let storage_count = ( name in storage ) ? storage[name] : 0;
        let carried_count = ( name in carried ) ? carried[name] : 0;
        // $('<span class="amount quantity-in-storage" style="right: 60%;">['+count+']</span>').appendTo(button);
        let tag = '<span class="name" style="bottom: '+label_offset+';">'; // vendor page needs ~ 5.5em
        // ^ inventory needs -4em
        tag += 'Stored: '  + storage_count + '<br/>';
        tag += 'Carried: ' + carried_count + '<br/>';
        tag += '</span>';
        button.append(tag);
    });
}

function tSStorageTracker_update_UI(message) {
    if ( tSStorage_region === undefined ) {
        let content_section = $(".content-container").first();
        tSStorage_region = $('<div id="tSStorage_region"></div>').prependTo(content_section);
    }

    tSStorage_region.html("[Storage Tracker] "+message);
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
