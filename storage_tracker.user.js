// ==UserScript==
// @name         Storage Tracker
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/storage_tracker.user.js
// @version      1.9
// @description  Track Storage items & Shipped items, and show owned items in Public Market
// @match        https://alpha.taustation.space/area/electronic-market*
// @match        https://alpha.taustation.space/area/shipping-bay*
// @match        https://alpha.taustation.space/area/storage*
// @match        https://alpha.taustation.space/area/vendors/*
// @match        https://alpha.taustation.space/character/inventory*
// @match        https://alpha.taustation.space/coretechs/storage*
// @match        https://alpha.taustation.space/preferences*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @require      https://github.com/taustation-fan/userscripts/raw/master/userscript-preferences.js
// @require      https://github.com/taustation-fan/userscripts/raw/master/taustation-tools-common.js
// ==/UserScript==

//
// localStorage-related variables.
//
var localStorage_key = "storage_tracker";
var player_name;
var coretechs_storage;

// UI variables.
var tSStorage_region;
var config;
//

const BRIEF_MODE  = 1;
const COLUMN_MODE = 2;

$(document).ready(tSStorageTracker_main);

function tSStorageTracker_main() {
    'use strict';

    if ( !tSStorageTracker_storage_available() ) {
        tSStorageTracker_update_UI("localStorage browser feature not available");
        return;
    }

    config = userscript_preferences( storage_tracker_prefs() );

    var page_path = window.location.pathname;

    if ( page_path.startsWith('/coretechs/storage') ) {
        tSStorageTracker_load_from_localStorage();
        tSStorageTracker_update_localStorage_from_coretechs_storage();
        tSStorageTracker_decorate_coretechs_storage();
    }
    else if ( page_path.startsWith('/area/electronic-market') ) {
        tSStorageTracker_load_from_localStorage();
        tSStorageTracker_decorate_public_market();
    }
    else if ( page_path.startsWith('/area/shipping-bay') ) {
        tSStorageTracker_load_from_localStorage();
        tSStorageTracker_update_localStorage_from_shipping();
        tSStorageTracker_decorate_shipping();
    }
    else if ( page_path.startsWith('/area/storage') ) {
        tSStorageTracker_load_from_localStorage();
        tSStorageTracker_decorate_storage();
    }
    else if ( page_path.startsWith('/area/vendors/') ) {
        tSStorageTracker_load_from_localStorage();
        tSStorageTracker_decorate_vendor();
    }
    else if ( page_path.startsWith('/character/inventory') ) {
        tSStorageTracker_load_from_localStorage();
        tSStorageTracker_update_localStorage_from_inventory();
        tSStorageTracker_decorate_inventory();

        if ( config.inventory_summarize_vip ) {
            tSStorageTracker_print_vip();
        }

        if ( config.inventory_summarize_rations ) {
            tSStorageTracker_print_rations();
        }
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
    var vip_shipped = tSStorageTracker_count_vip(coretechs_storage.shipped.item_totals);
    var vip_storage = tSStorageTracker_count_vip(coretechs_storage.storage.item_totals);
    var vip_inventory = tSStorageTracker_count_vip(coretechs_storage.carried.items);

    if (! config.inventory_show_icons) {
        tSStorageTracker_update_UI(`Days of VIP in shipping: ${vip_shipped}`);
        tSStorageTracker_update_UI(`Days of VIP in storage: ${vip_storage}`);
        tSStorageTracker_update_UI(`Days of VIP in inventory: ${vip_inventory}`);
        tSStorageTracker_update_UI(`Days of VIP total: ${vip_shipped + vip_storage + vip_inventory}`);
    } else {
        let total = vip_shipped + vip_storage + vip_inventory;
        let message = `Days of VIP: ${total} total`;
        if (total) {
            message += ' -';
            if (vip_shipped > 0 || ! config.general_hide_when_empty) {
                message += '&nbsp;' + vip_shipped   + ' ' + get_icon('Shipped') + ' ';
            }
            if (vip_storage > 0 || ! config.general_hide_when_empty) {
                message += '&nbsp;' + vip_storage   + ' ' + get_icon('Stored')  + ' ';
            }
            if (vip_inventory > 0 || ! config.general_hide_when_empty) {
                message += '&nbsp;' + vip_inventory + ' ' + get_icon('Carried') + ' ';
            }
        }
        tSStorageTracker_update_UI(message);
    }
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
    var shipped = tSStorageTracker_count_rations(coretechs_storage.shipped.item_totals);
    var stored = tSStorageTracker_count_rations(coretechs_storage.storage.item_totals);
    var carried = tSStorageTracker_count_rations(coretechs_storage.carried.items);
    for (var tier = 1; tier <= 5; tier++) {
        var key = 'ration-' + tier;
        var count = (shipped[key] || 0) + (stored[key] || 0) + (carried[key] || 0);
        if (count > 0) {
            if (! config.inventory_show_icons) {
                tSStorageTracker_update_UI('Ration tier ' + tier + ': ' + count);
            } else {
                let message = `Ration tier ${tier}: ${count} total`;
                if (count) {
                    message += ' -';
                    if (shipped[key] > 0 || ! config.general_hide_when_empty) {
                        message += '&nbsp;' + shipped[key] + ' ' + get_icon('Shipped') + ' ';
                    }
                    if (stored[key] > 0 || ! config.general_hide_when_empty) {
                        message += '&nbsp;' + stored[key]  + ' ' + get_icon('Stored')  + ' ';
                    }
                    if (carried[key] > 0 || ! config.general_hide_when_empty) {
                        message += '&nbsp;' + carried[key] + ' ' + get_icon('Carried') + '  ';
                    }
                }
                tSStorageTracker_update_UI(message);
            }
        }
    }
}

function tSStorageTracker_load_from_localStorage() {
    coretechs_storage = localStorage.getItem( localStorage_key );

    if ( !coretechs_storage ) {
        tSStorageTracker_delete_old_localStorage();

        tSStorageTracker_update_UI("No stored items found - visit Coretechs / Storage first");
        // Define the toplevel keys, so attempts to access their children don't throw.
        coretechs_storage = { shipped: {}, storage: {}, carried: {} };
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
    localStorage.setItem( localStorage_key, JSON.stringify(coretechs_storage) );

    var keys_count = Object.keys(count).length;
    tSStorageTracker_update_UI("Saved [" + keys_count + "] unique items");
}

function tSStorageTracker_update_localStorage_from_inventory() {
    var date  = (new Date).toISOString();
    var items = {};

    $("div[data-inventory-section=equipped] section > .slots .slot, " +  // Equipped items are still part of player's inventory.
      "section[data-inventory-section='carried'] > .slots > .slot").each(function() {
        let button   = $(this).find("button:first");    // Firefox/GreaseMonkey has issues with .first().
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
    localStorage.setItem( localStorage_key, JSON.stringify(coretechs_storage) );

    var count = Object.keys(items).length;
    tSStorageTracker_update_UI("Saved [" + count + "] unique carried items");
}

function tSStorageTracker_update_localStorage_from_shipping() {
    if (! config.shipping_track) {
        return;
    }

    var date  = (new Date).toISOString();
    var items = {};
    var count = {};

    $(".shipping-bay-main.received-items li.normal").each(function() {
        // Skip all "historical" entries (ones that no longer have an actual item "attached").
        if (! $(this).find('.shipping-bay-table-cell-item.status .arrived, ' +
                           '.shipping-bay-table-cell-item.status .in_transit').length) {
            return;
        }

        var name     = $(this).find(".shipping-bay-table-cell-item.item a").attr("href");
        var quantity = $(this).find(".shipping-bay-item-info-details-row:nth-of-type(1) dd").text();
        var station  = $(this).find(".shipping-bay-item-info-details-row:nth-of-type(4) dd").text();
        var star     = undefined;
        // Also available: Has the item has arrived yet?

        var item_regex = /\/item\//;
        var location_regex = /^(.+)\s+\(([^)]+)\)\s*$/;

        if ( name === undefined ) {
            return;
        }
        name = name.replace( item_regex, "" );

        if ( station === undefined ) {
            return;
        }
        var matches = station.match(location_regex);
        if (matches !== null && matches.length > 0) {
            station = matches[1];
            star    = matches[2];
        }

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
    coretechs_storage.shipped       = {};
    coretechs_storage.shipped.date  = date;
    coretechs_storage.shipped.items_by_location = items;
    coretechs_storage.shipped.item_totals       = count;
    localStorage.setItem( localStorage_key, JSON.stringify(coretechs_storage) );

    var key_count = Object.keys(count).length;
    tSStorageTracker_update_UI("Saved [" + key_count + "] unique items");
}

function tSStorageTracker_decorate_public_market() {
    let shipped = ( coretechs_storage.shipped !== undefined ) ? coretechs_storage.shipped.item_totals : {};
    let storage = ( coretechs_storage.storage !== undefined ) ? coretechs_storage.storage.item_totals : {};
    let carried = ( coretechs_storage.carried !== undefined ) ? coretechs_storage.carried.items       : {};

    let any_shipped_items = false;

    // Add headers
    $(".market-list-column-labels > div").eq(1)
        .after('<div class="market-list-column-labels--qty shipped-column"><span class="to-center">Shipped</span></div>\n' +
               '<div class="market-list-column-labels--qty"><span class="to-center">Stored</span></div>\n' +
               '<div class="market-list-column-labels--qty"><span class="to-center">Carried</span></div>\n');

    // Each item
    $(".market-list > li").each(function() {
        var dl       = $(this).find("dl:first");
        var name     = $(dl).find("dd > a").attr("href");
        var appendTo = $(dl).find("div").eq(1);
        name = name.replace( /\/item\//, "" );

        let shipped_count = ( shipped && name in shipped ) ? shipped[name] : 0;
        let storage_count = ( storage && name in storage ) ? storage[name] : 0;
        let carried_count = ( carried && name in carried ) ? carried[name] : 0;

        if (shipped_count > 0) {
            any_shipped_items = true;
        }

        let inserted_columns = '';

        let is_hidden = '';
        if (config.shipping_track) {
            if (shipped_count == 0 && config.general_hide_when_empty) {
                is_hidden = 'hidden';
            }
            inserted_columns +=
                "<div class=\"market-item--content--col market-item--content--qty shipped-column\">" +
                    "<dt class=\"visuallyhidden\">Shipped</dt> " +
                    "<dd style=\"text-align: right;\" " + is_hidden + ">" +
                        shipped_count + " " + get_icon('Shipped', false) +
                    "</dd>" +
                "</div>";
        }

        is_hidden = '';
        if (storage_count == 0 && config.general_hide_when_empty) {
            is_hidden = 'hidden';
        }
        inserted_columns +=
            "<div class=\"market-item--content--col market-item--content--qty\">" +
                "<dt class=\"visuallyhidden\">Stored</dt> " +
                "<dd style=\"text-align: right;\"" + is_hidden + ">" +
                    storage_count + " " + get_icon('Stored', false) +
                "</dd>" +
            "</div>";

        is_hidden = '';
        if (carried_count == 0 && config.general_hide_when_empty) {
            is_hidden = 'hidden';
        }
        inserted_columns +=
            "<div class=\"market-item--content--col market-item--content--qty\">" +
                "<dt class=\"visuallyhidden\">Carried</dt> " +
                "<dd style=\"text-align: right;\"" + is_hidden + ">" +
                    carried_count + " " + get_icon('Carried', false) +
                "</dd>" +
            "</div>";

        $(appendTo).after(inserted_columns);
    });

    // If no relevant items are in shipping, don't show the column.
    if (config.general_hide_when_empty &&
        ! any_shipped_items) {
        $('.shipped-column').remove();
    }
}

// Return HTML for a font-awesome icon that represents where the item is stored.
function get_icon(which, pad_sides) {
    let fa_icon  = '';
    let padding  = '';    // The icons have different widths, so pad their sides to align them.
    let which_lc = which.toLowerCase();
    if      (which_lc === 'shipped') { fa_icon = 'fa-rocket'; padding = (16 - 14.84)/2; }
    else if (which_lc === 'stored')  { fa_icon = 'fa-archive'; } // Already 16px wide.
    else if (which_lc === 'carried') { fa_icon = 'fa-male';   padding = (16 - 9.14)/2; }

    if  (! pad_sides) { padding = ''; }
    else if (padding) { padding = 'padding: 0px ' + padding + 'px;'; }

    return `<span class="fa ${fa_icon} tracker-icon ${which_lc}" title="${which}" ` +
                  `style="color: #4CD2F8; ${padding}"/>`;
}

function tSStorageTracker_decorate_vendor() {
    tSStorageTracker_decorate_item_slots(
        ".vendor > .inventory > section[data-inventory-section=carried] > .slots > .slot",
        '6.75em',
        '-6.75em'
    );
}

function tSStorageTracker_decorate_inventory() {
    tSStorageTracker_decorate_item_slots(
        (".inventory > div[data-inventory-section=equipped] section > .slots .slot, " +  // Include equipped items.
         ".inventory > section[data-inventory-section=carried] > .slots > .slot"),
        '5.25em',
        '-5.25em'
    );
}

function tSStorageTracker_decorate_storage() {
    if (config.storage_show_totals) {
        tSStorageTracker_decorate_item_slots(
            (".inventory > section[data-inventory-section=carried] > .slots > .slot"),
            '5.25em',
            '-5.25em'
        );
    }
}

function tSStorageTracker_decorate_item_slots(slots, container_offset, label_offset) {
    let shipped = ( coretechs_storage.shipped !== undefined ) ? coretechs_storage.shipped.item_totals : {};
    let storage = ( coretechs_storage.storage !== undefined ) ? coretechs_storage.storage.item_totals : {};
    let carried = ( coretechs_storage.carried !== undefined ) ? coretechs_storage.carried.items       : {};

    // Keep slot images aligned, regardless of their stored/carried[/shipped] text (if any).
    $(slots).parent().css('align-items', 'baseline');

    // Each item
    $(slots).each(function() {
        var button = $(this).find("button:first");
        var name   = $(button).attr("data-item-name");
        var content  = "0";
        var using_icons = config.inventory_show_icons;

        // show quantity count in bottom-left of item button
        let shipped_count = ( shipped && name in shipped ) ? shipped[name] : 0;
        let storage_count = ( storage && name in storage ) ? storage[name] : 0;
        let carried_count = ( carried && name in carried ) ? carried[name] : 0;
        // $('<span class="amount quantity-in-storage" style="right: 60%;">['+count+']</span>').appendTo(button);

        // If no items of this type are idling in shipping, don't include the "shipped: _" line (or room for it).
        let slot_container_offset = container_offset;
        let slot_label_offset     = label_offset;
        if (! using_icons) {
            if (! shipped_count && slot_container_offset.endsWith('em') && slot_label_offset.endsWith('em')) {
                slot_container_offset = adjust_em_abs_value(slot_container_offset, -1.25);  // Shrink both of these values...
                slot_label_offset     = adjust_em_abs_value(slot_label_offset,     -1.25);  //  ...by 1.25em (text + spacing).
            }
        } else {
            // When using icons, we only need 1 extra line for them.
            slot_container_offset = adjust_em_abs_value(slot_container_offset, -2);     // Shrink both of these values...
            slot_label_offset     = adjust_em_abs_value(slot_label_offset,     -2.45);  //  ...by appropriate amounts (text + spacing).
        }

        $(this).css('margin-bottom', slot_container_offset); // vendor page needs 6.75em
        // ^ inventory page needs 5.25em

        let tag = '<span class="name" style="bottom: '+slot_label_offset+';">'; // vendor page needs ~ 6.75em
        // ^ inventory needs -5.25em

        if (! using_icons) {
            if (shipped_count > 0 || ! config.general_hide_when_empty) {
                tag += 'Shipped: ' + shipped_count + '<br/>';
            }
            // If we're showing text labels, show at least both of these for less confusion-at-a-glance.
            tag += 'Stored: '  + storage_count + '<br/>';
            tag += 'Carried: ' + carried_count + '<br/>';
        } else {
            if (shipped_count > 0 || ! config.general_hide_when_empty) {
                tag += '<span class="visuallyhidden">Shipped</span>' +
                       '<span> ' + shipped_count + ' ' + get_icon('Shipped') + '</span> &nbsp;';
            }
            if (storage_count > 0 || ! config.general_hide_when_empty) {
                tag += '<span class="visuallyhidden">Stored</span>' +
                       '<span>' + storage_count + ' ' + get_icon('Stored') + '</span> &nbsp;';
            }
            if (carried_count > 0 || ! config.general_hide_when_empty) {
                tag += '<span class="visuallyhidden">Carried</span>' +
                       '<span> ' + carried_count + ' ' + get_icon('Carried') + '</span>';
            }
        }
        tag += '</span>';
        button.append(tag);
    });
}

function adjust_em_abs_value(input, delta) {
    let value = Number(input.replace('em', ''));
    let isNegative = (value < 0);

    value = Math.abs(value) + delta;
    if (isNegative) {
        value *= -1;
    }

    return value + 'em';
}

function tSStorageTracker_decorate_coretechs_storage() {
    if (! config.storage_show_totals) {
        return;
    }

    // Determine the best way to display the data (if at all), to accommodate mobile screens.
    // Criteria:
    //  - width  < 400px      - Far too narrow; don't display any totals.
    //  - width  = 400-750px  - Show only totals w/ icons, wrapped in one cell.
    //  - width >= 750px      - Show separate columns for totals.
    let mode = undefined;
    if        (window.matchMedia("(min-width: 750px)").matches) {
        mode = COLUMN_MODE;
    } else if (window.matchMedia("(min-width: 400px)").matches) {   //TODO: Use 560px? (From resizing desktop browser window.)
        mode = BRIEF_MODE;
    } else {
        return;     // Too narrow to display anything.
    }

    let shipped = ( coretechs_storage.shipped !== undefined ) ? coretechs_storage.shipped.item_totals : {};
    let storage = ( coretechs_storage.storage !== undefined ) ? coretechs_storage.storage.item_totals : {};
    let carried = ( coretechs_storage.carried !== undefined ) ? coretechs_storage.carried.items       : {};

    let any_shipped_items = false;

    // Add headers (if there's room).
    if (mode == BRIEF_MODE) {
        $('.table-base th:last').after('<th>Owned</th>\n');
    } else if (mode == COLUMN_MODE) {
        $('.table-base th:last').after((config.shipping_track
                                           ? '<th class="shipped-column">Shipped</th>\n' : '') +
                                       '<th>Stored</th>\n' +
                                       '<th>Carried</th>\n');
    }

    // Each item
    $('.content-section > table > tbody > tr').each(function() {
        var name     = $(this).find('td').eq(2).find('a').attr('href');
        var appendTo = $(this).find('td:last');
        name = name.replace(/\/item\//, '');

        let shipped_count = ( shipped && name in shipped ) ? shipped[name] : 0;
        let storage_count = ( storage && name in storage ) ? storage[name] : 0;
        let carried_count = ( carried && name in carried ) ? carried[name] : 0;

        let totals_text = [];
        {
            let pad_icons = (mode == BRIEF_MODE);

            if (config.shipping_track) {
                if (shipped_count > 0) {
                    any_shipped_items = true;
                }

                let is_hidden = (shipped_count == 0 && config.general_hide_when_empty
                                    ? 'hidden' : '');
                totals_text.push(
                    `    <span ${is_hidden} class="visuallyhidden">Shipped</span>\n` +
                    `    <span ${is_hidden}>${shipped_count} ${get_icon('Shipped', pad_icons)}<br/></span>\n`);
            }

            is_hidden = (storage_count == 0 && config.general_hide_when_empty
                            ? 'hidden' : '');
            totals_text.push(
                `    <span ${is_hidden} class="visuallyhidden">Stored</span>\n` +
                `    <span ${is_hidden}>${storage_count} ${get_icon('Stored', pad_icons)}<br/></span>\n`);

            is_hidden = (carried_count == 0 && config.general_hide_when_empty
                            ? 'hidden' : '');
            totals_text.push(
                `    <span ${is_hidden} class="visuallyhidden">Carried</span>\n` +
                `    <span ${is_hidden}>${carried_count} ${get_icon('Carried', pad_icons)}</span>\n`);
        }

        let appended_columns = '';
        if (mode == BRIEF_MODE) {
            appended_columns +=
                '<td data-label="Owned" style="text-align:right; line-height:1.33; min-width:4.25em;">\n' +  // Wide enough for "200" + icon.
                totals_text.join('\n') +
                '</td>\n';
        } else if (mode == COLUMN_MODE) {
            if (config.shipping_track) {
                appended_columns +=
                    '<td data-label="Shipped" class="shipped-column" style="text-align:right;">\n' +
                    totals_text.shift().replace('<br/>', '') +
                    '</td>\n';
            }

            appended_columns +=
                '<td data-label="Stored" style="text-align:right;">\n' +
                totals_text.shift().replace('<br/>', '') +
                '</td>\n';

            appended_columns +=
                '<td data-label="Carried" style="text-align:right;">\n' +
                totals_text.shift().replace('<br/>', '') +
                '</td>\n';
        }

        $(appendTo).after(appended_columns);
    });

    // If no relevant items are in shipping, don't show the column.
    if (! config.shipping_track ||
        (config.general_hide_when_empty && ! any_shipped_items)) {
        $('.shipped-column').remove();
    }
}

function tSStorageTracker_decorate_shipping() {
    if (! config.shipping_show_totals) {
        return;
    }

    // Since the shipping table is naturally almost as wide as a mobile screen,
    // we need to determine the best way to display the data (if at all).
    // Criteria:
    //  - width  < 400px      - Far too narrow; don't display any totals.
    //  - width  = 400-560px  - Show only totals w/ icons, wrapped in one cell.
    //  - width >= 560px      - Show separate columns for totals.
    let mode = undefined;
    if        (window.matchMedia("(min-width: 560px)").matches) {
        mode = COLUMN_MODE;
    } else if (window.matchMedia("(min-width: 400px)").matches) {
        mode = BRIEF_MODE;
    } else {
        return;     // Too narrow to display anything.
    }

    let shipped = ( coretechs_storage.shipped !== undefined ) ? coretechs_storage.shipped.item_totals : {};
    let storage = ( coretechs_storage.storage !== undefined ) ? coretechs_storage.storage.item_totals : {};
    let carried = ( coretechs_storage.carried !== undefined ) ? coretechs_storage.carried.items       : {};

    let any_shipped_items = false;

    let recvd = $('.received-items');

    // Columns should be at least 4.5em wide, to fit "200 []" (box) for the "Stored" column (widest icon).
    tST_add_css(`
.storage-tracker-header {
    min-width: 4.5em;
}
`);

    // Add headers (if there's room).
    let th_cls = 'shipping-bay-table-cell-item has-padding storage-tracker-header';
    if (mode == BRIEF_MODE) {
        recvd.find('.shipping-bay-item.thead .shipping-bay-table-cell-item.has-padding.status')
            .after(`<div id="st-owned" class="${th_cls}" aria-hidden="true">Owned</div>\n`);
    } else if (mode == COLUMN_MODE) {
        recvd.find('.shipping-bay-item.thead .shipping-bay-table-cell-item.has-padding.status')
            .after((config.shipping_track
                       ? `<div id="st-shipped" class="${th_cls} shipped-column" aria-hidden="true">Shipped</div>\n` : '') +
                   `<div id="st-stored"  class="${th_cls}" aria-hidden="true">Stored</div>\n` +
                   `<div id="st-carried" class="${th_cls}" aria-hidden="true">Carried</div>\n`);
    }

    let widths = {};
    recvd.find('.storage-tracker-header').each(function() {
        widths[this.id] = $(this).css('width');
    });

    // Each item
    recvd.find('.shipping-bay-item.normal > .shipping-bay-table-cell-top .shipping-bay-table-row-items').each(function() {
        if (! config.show_locations_of_picked_up_items &&
            ! $(this).find('.shipping-bay-table-cell-item.status .arrived, ' +
                           '.shipping-bay-table-cell-item.status .in_transit').length) {
            return;
        }

        var name     = $(this).find('.shipping-bay-table-cell-item.item').find('a').attr('href');
        var appendTo = $(this).find('.shipping-bay-table-cell-item.status');
        name = name.replace(/\/item\//, '');

        let shipped_count = ( shipped && name in shipped ) ? shipped[name] : 0;
        let storage_count = ( storage && name in storage ) ? storage[name] : 0;
        let carried_count = ( carried && name in carried ) ? carried[name] : 0;

        let totals_text = [];
        {
            let pad_icons = (mode == BRIEF_MODE);

            let is_hidden = '';
            if (shipped_count == 0 && config.general_hide_when_empty) {
                is_hidden = 'hidden';
            }
            if (config.shipping_track) {
                if (shipped_count > 0) {
                    any_shipped_items = true;
                }

                totals_text.push(
                    `    <dt ${is_hidden} class="visuallyhidden shipped-column">Shipped</dt>\n` +
                    `    <dd ${is_hidden} class="shipped-column">${shipped_count} ${get_icon('Shipped', pad_icons)}</dd>\n`);
            }

            is_hidden = '';
            if (storage_count == 0 && config.general_hide_when_empty) {
                is_hidden = 'hidden';
            }
            totals_text.push(
                `    <dt ${is_hidden} class="visuallyhidden">Stored</dt>\n` +
                `    <dd ${is_hidden}>${storage_count} ${get_icon('Stored', pad_icons)}</dd>\n`);

            is_hidden = '';
            if (carried_count == 0 && config.general_hide_when_empty) {
                is_hidden = 'hidden';
            }
            totals_text.push(
                `    <dt ${is_hidden} class="visuallyhidden">Carried</dt>\n` +
                `    <dd ${is_hidden}>${carried_count} ${get_icon('Carried', pad_icons)}</dd>\n`);
        }

        let appended_columns = '';
        if (mode == BRIEF_MODE) {
            appended_columns +=
                `<div class="shipping-bay-table-cell-item has-padding storage-tracker" ` +
                `     style="display:block; text-align:right; min-width:4.25em;">\n` +  // Wide enough for "200" + icon.
                totals_text.join('') +
                `</div>\n`;
        } else if (mode == COLUMN_MODE) {
            if (config.shipping_track) {
                appended_columns +=
                    `<div class="shipping-bay-table-cell-item has-padding storage-tracker" ` +
                    `     style="display:block; text-align:right; min-width:${widths['st-shipped']};">\n` +
                    totals_text.shift() +
                    `</div>\n`;
            }

            appended_columns +=
            `<div class="shipping-bay-table-cell-item has-padding storage-tracker" ` +
            `     style="display:block; text-align:right; min-width:${widths['st-stored']};">\n` +
            totals_text.shift() +
            '</div>\n';

            appended_columns +=
            `<div class="shipping-bay-table-cell-item has-padding storage-tracker" ` +
            `     style="display:block; text-align:right; min-width:${widths['st-carried']};">\n` +
            totals_text.shift() +
            `</div>\n`;
        }

        $(appendTo).after(appended_columns);
    });

    // If no relevant items are in shipping, don't show the column.
    if (! config.shipping_track ||
        (config.general_hide_when_empty && ! any_shipped_items)) {
        $('.shipped-column').remove();
    }
}

function tSStorageTracker_update_UI(message) {
    let prefix = "[Storage Tracker] ";
    if ( tSStorage_region === undefined ) {
        let content_section = $(".avatar-bar-container").first();
        tSStorage_region = $('<div id="tSStorage_region" style="margin-bottom: 1em;"></div>').insertAfter(content_section);
    }
    else {
        // Slightly indent subsequent lines.
        prefix = "&nbsp &nbsp ";
    }

    tSStorage_region.html( tSStorage_region.html() + `${prefix}${message}<br/>` );
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

function storage_tracker_prefs() {
    return {
        key:      localStorage_key + '_prefs',
        label:    "Storage Tracker",
        options: [
            // Group: 'General'
            {
                key:     'general_hide_when_empty',
                label:   'General: Hide category when count is empty',
                type:    'boolean',
                default: true,
            },
            // Group: 'Inventory'
            {
                key:     'inventory_show_icons',
                label:   'Inventory: Show totals using icons',
                type:    'boolean',
                default: true,
            },
            {
                key: "inventory_summarize_vip",
                label: "Inventory: Show VIP summary",
                type: "boolean"
            },
            {
                key: "inventory_summarize_rations",
                label: "Inventory: Show Ration summary",
                type: "boolean"
            },
            // Group: 'Shipping'
            {
                key:     'shipping_track',
                label:   'Shipping: Track items pending in Shipping',
                type:    'boolean',
                default: true,
            },
            {
                key:     'shipping_show_totals',
                label:   'Shipping: Show totals in Shipping list',
                type:    'boolean',
                default: true,
            },
            {
                key:     'show_locations_of_picked_up_items',
                label:   'Shipping: Show locations of picked-up items',
                type:    'boolean',
                default: true,
            },
            // Group: 'Storage'
            {
                key:     'storage_show_totals',
                label:   'Storage: Show totals in Storage list',
                type:    'boolean',
                default: true,
            }
        ]
    };
}

function tSStorageTracker_delete_old_localStorage() {
    // Can be removed after a period of time,
    // once all/most users have updated to 1.6
    let names = [];

    for ( let i=0, len=localStorage.length; i<len; i++ ) {
        let key = localStorage.key( i );
        if ( key.match( /^tSStorage_/ ) ) {
            names.push( key );
        }
        else if ( key.match( /^storage_tracker_/ ) && key !== "storage_tracker_prefs" ) {
            names.push( key );
        }
    }

    for ( let i=0, len=names.length; i<len; i++ ) {
        localStorage.removeItem( names[i] );
    }
}
