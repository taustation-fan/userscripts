// ==UserScript==
// @name         taustation_verbose_inventory
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://rawgit.com/taustation-fan/userscripts/master/verbose-inventory.user.js
// @description  For taustation.space: Show full item descriptions in the player's inventory & storage areas.
// @match        https://alpha.taustation.space/character/inventory
// @match        https://alpha.taustation.space/area/storage
// @version      1.0
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

$(document).ready(do_main);

async function do_main() {
    'use strict';
    show_verbose_inventory();
}

// Show full item names when an item inventory is being shown.
function show_verbose_inventory() {
    var inventory = $('.inventory');
    if (! inventory.length) {
        return;
    }

    // Preparation: Tweak the page's current styling so that it looks correct when we're finished.

    // The Combat Belt shows item rarity frames differently than Equipped & in-Backpack items,
    // resulting in unusual layout after we're done. Instead, tweak combat belt items to be like
    // equipped/backpack items.
    //
    inventory.find('div.slot.item-framed-img').each(function() {
        if (! $(this).find('button .item-framed-img').length) {
            var rarity = this.getAttribute('class').replace('slot', '').replace('item-framed-img', '').trim();
            $(this).find('button img').wrap('<div class="item-framed-img ' + rarity + '"></div>');
        }
    });

    // Preparation: Tweak the layout of these two items, so they look correct after we're done.
    inventory.find('section[data-inventory-section="carried"] button.item.modal-toggle').css({ 'bottom': 'auto' });
    inventory.find('div.item-framed-img').css({ 'height': 'fit-content' });

    // Finally: Find out the # of lines in each item's full name, then make each item tall enough to fit its full name.
    // (Item names sit inside their grandparent's margin-bottom, so they can't affect page layout to make room for themselves.)
    //
    var lineHeight = 1000; // Too-large value, which will be overridden below.
    var slot_item_names = inventory.find("div.item-framed-img .name");

    // Find out the height of a single line of text.
    slot_item_names.each(function() {
        // We need to set 'white-space: normal' first, so the page stops truncating item names to a single line.
        $(this).css({ 'white-space': 'normal',  'bottom': 'auto',  'margin-top': '0.25em' });

        if (this.innerText.includes('Food and water daily ration')) {
            lineHeight = $(this).height() / 2;
        } else if (this.innerText.match(/(Capacitor|Copper Wiring|Nanowire)/i)) {
            lineHeight = $(this).height();
        } else if ($(this).height() > 0 &&
                   lineHeight > $(this).height()) {
            lineHeight = $(this).height();
        }
    });

    // Sanity check.
    if (lineHeight == 1000) {
        lineHeight = 16; // Use a reasonable default.
    }

    // Make each item's area tall enough to show the full item name.
    slot_item_names.each(function() {
        var numLines  = Math.floor($(this).height() / lineHeight);
        var newHeight = (1.25 + numLines) + "em";

        $(this).parent().parent().css({ 'margin-bottom': newHeight });
    });
}
