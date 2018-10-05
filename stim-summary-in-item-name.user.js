// ==UserScript==
// @name         Tau Station: Describe Stims
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://rawgit.com/taustation-fan/userscripts/master/stim-summary-in-item-name.user.js
// @version      1.0.2
// @description  Show full, multi-line stim name (+ %stat effects) in Inventory / Storage / etc.; also updates item details pane to show %stat & %toxin effects. Calculates percentages using Medical Stims skill level & player-vs.-stim Tiers, based on formulae at https://tauguide.de/#so-whats-the-gain-stat-boost & https://tauguide.de/#medical-stim-toxicity-calculation-formula .
// @author       Mark Schurman (https://github.com/quasidart)
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.slim.js
// ==/UserScript==
//
// License: CC-BY-SA
//
// Disclaimer:
// These are quick-and-dirty one-off scripts, and do not reflect the author's style or quality of work when developing production-ready software.
//
// Changelist:
//  - v1.0: Updates Stim names, as well as any detailed Stim item info present on the page; also shows full item names in the inventory & in Storage. If user clicks on a Stim to show details, the inserted Details section is updated as well.
//  - v1.0.1: Renamed from "describe-stims.user.js" to "stim-summary-in-item-name.user.js" -- easier to spot if someone scans the list of file names for Stim-related userscripts.
//  - v1.0.2: Fixed duplicate item frames on updated items.
//

//////////////////////////////
// Begin: User Configuration.
//

var tSDS_config = {
     'debug': true,
     'show_verbose_inventory': true, // Show full, multi-line item names (without truncating) in Inventory & Storage (item views): Increases row spacing to make room for long item names & Stim descriptions added by this script.
};

//
// End: User Configuration.
//////////////////////////////


$(document).ready(do_main);

async function do_main() {
    'use strict';

    store_skills_if_present();
    show_stim_percentages();

    // If configured above, expand the inventory to show full item names.
    show_verbose_inventory();
}


//////////////////////////////
// #region Stims: Show effective % Stat boost & Toxicity.
//

var skills_table = {};
function store_skills_if_present() {
    // Note: This code should ignore scenarios where Syndicate leadership is viewing a fellow member's information.
    if (! window.location.pathname == '/') {
        return;
    }

    var skills_node = $("#character_skills");
    if (skills_node.length) {
        skills_node.find("tbody").find("tr")
                   .map(function() {
                       skills_table[$(this).find("td:first").text()] =
                           $(this).find("td:nth-of-type(2)").text();
                       return this;
                   });
        localStorage.setItem('tSDS_skills', JSON.stringify(skills_table));
    }
}

var stat_totals = {};
function get_stat_totals() {
    // If we've already collected this info, no need to do so again.
    if (stat_totals.hasOwnProperty('Agility')) {
        return;
    }

    $('#stats-panel li.stat-container').each(function() {
        var stat_node = $(this);
        if (stat_node.hasClass('focus')) {
            return;
        }

        var stat_name  = stat_node.find('span.label').text().replace(':', '');
        var stat_total = stat_node.find('span.pc-total').text();
        stat_totals[stat_name] = stat_total;
    });
}

var regex_stim_name_only = new RegExp(/(.*[\s'"]*)(Minor|Standard|Strong) ((Strength|Agility|Stamina|Intelligence|Social|Multi) (Stim,) (v\d\.[123])\.(\d\d\d))([\s'"]*[^%]*)/, "ig");
function match_stim_item_names() {
    var text_to_match = ($(this).text() || this.innerText || this.textContent).trim();
    return (  text_to_match.match(regex_stim_name_only) &&
            ! text_to_match.includes('%'));
}


var modal_scanner_period = 100; // in milliseconds.
var modal_scanner_interval;
var modal_scanner_attempts;

function show_stim_percentages(isModal) {
    // Add only the selectors we anticipate needing, to reduce unnecessary scanning.
    var stim_node_selectors = [];
    stim_node_selectors.push('ul.messages');

    if (isModal) {
        stim_node_selectors.push('section.modal:has(div.header-info:has(span.name))',
                                 'form.buy-form');
    }

    if (window.location.pathname.endsWith('/coretechs/storage')) {
        stim_node_selectors.push('table.table-base td[data-label="Name"]:has(a)');

    } else if (window.location.pathname.includes('/item/')) {
        stim_node_selectors.push('section.item-detailed');
    } else {
        stim_node_selectors.push('div.slot');
    }

    debug('Describe Stims: add_stim_percentages(isModal = ' + isModal + '): Using jQuery selectors: {\n - "' +
          stim_node_selectors.join('"\n - "') + '"\n}');

    var stims_found = [];
    for (var ii = 0; ii < stim_node_selectors.length; ii++) {
        $(stim_node_selectors[ii]).filter(match_stim_item_names).each(function() { stims_found.push(this); });
    }

    // Don't do unnecessary work -- this won't scan for stat totals & parse the skills JSON, unless we need to use them.
    if (! stims_found.length) {
        var fn_call_desc = (isModal ? 'add_stim_percentages(isModal = ' + isModal + '): ' : '')
        debug('Describe Stims: ' + fn_call_desc + 'No stim names found; no text to update.');
    } else if (! localStorage.tSDS_skills) {
        window.alert('Tau Station - Describe Stims (userscript):\n' +
                     '\n' +
                     'Medical Stim skill levels needed!\n' +
                     'Please click on your username (near the top left corner), then return to this page.')
    } else {
        get_stat_totals();

        skills_table = JSON.parse(localStorage.tSDS_skills);
        for (var index = 0; index < stims_found.length; index++) {
            update_stim_name(stims_found[index]);

            // If clicking on this brings up a modal details pane (inventory, store, etc.),
            // update stim details in that pane as well.
            if ($(stims_found[index]).hasClass('slot')) {
                $(stims_found[index]).find('button.item.modal-toggle')
                                     .click(async function()
                {
                    debug('Describe Stims: Added click() handler to Stim in store/inventory slot.');
                    modal_scanner_attempts = 0;
                    modal_scanner_interval = setInterval(async function ()
                    {
                        modal_scanner_attempts++;

                        if ($('section.modal').length > 0) {
                            clearInterval(modal_scanner_interval);
                            debug('Describe Stims: Post-click(): Finding & updating text in modal section.');
                            show_stim_percentages(true);
                            show_verbose_inventory();
                        } else if (modal_scanner_attempts > 5000 / modal_scanner_period) {
                            clearInterval(modal_scanner_interval);
                            debug('Describe Stims: Post-click(): Modal dialog taking too long to appear; aborting scan.');
                        }
                    }, modal_scanner_period)
                });
            }
        }
    }
}

function update_stim_name(stim_parent_node) {
    // Find the HTML tag actually containing the stim name.

    // - In Storage.
    var stim_node = $(stim_parent_node).find('a:contains(" Stim, v")');

    // - In inventory or shop (including modal panel w/ details).
    if (! stim_node.length) { stim_node = $(stim_parent_node).find('span.name:contains(" Stim, v")'); }
    if (! stim_node.length) { stim_node = $(stim_parent_node).find('h2.form-heading:contains(" Stim, v")'); }

    // - In site's top-level information page for the item (".../item/foo").
    if (! stim_node.length) { stim_node = $(stim_parent_node).find('h1.name:contains(" Stim, v")'); }

    // - In messages to the player.
    if (! stim_node.length) { stim_node = $(stim_parent_node).find('li:contains(" Stim, v")'); }

    if (! stim_node.length) {
        console.info("Describe Stims: FYI: Didn't find HTML tag containing stim name -- please update code to handle the following HTML:\n" +
                     stim_parent_node.outerHTML);
        return;
    }

    // For scenarios like "<stim_node><child_node>foo: </child_node> stim name here </stim_node>" (e.g., inventory),
    // update only the relevant #text child node, so actual-HTML-tag child-nodes aren't affected.
    var stim_name_text_node = $(stim_node).contents().filter(function() { return (this.nodeName == "#text"); })
                                                     .filter(match_stim_item_names)
    if (! stim_name_text_node.length) {
        console.info("Describe Stims: FYI: Didn't find #text Node containing actual stim name (inside the overall stim node) -- please update code to handle the following HTML:\n" +
                     stim_name_text_node.outerHTML);
        return;
    } else if (stim_name_text_node.length > 1) {
        console.info("Describe Stims: FYI: Find multiple #text Nodes containing actual stim name (inside one overall stim node); updating them all -- but please determine if this is correct for this scenario, and if it isn't, update the code to handle the following HTML:\n" +
                     stim_name_text_node.outerHTML);
    }

    $(stim_name_text_node).each(function() {
        var stim_name = this.textContent.trim();
        if (! stim_name.match(regex_stim_name_only)) {
            console.info('Describe Stims: FYI: Unexpected "stim name" string found! Please update the code to handle the following HTML:\n' +
                         this.outerHTML);
            return;
        }

        var stim_stats_bitmask = Number.parseInt(stim_name.replace(regex_stim_name_only, '$7'));
        var stats_affected = [];
        if (stim_stats_bitmask &  1) { stats_affected.push('Strength'); }
        if (stim_stats_bitmask &  2) { stats_affected.push('Agility'); }
        if (stim_stats_bitmask &  4) { stats_affected.push('Stamina'); }
        if (stim_stats_bitmask &  8) { stats_affected.push('Social'); }
        if (stim_stats_bitmask & 16) { stats_affected.push('Intelligence'); }

        var stim_key = stim_name.replace(regex_stim_name_only, '$6 (' + stats_affected.length + ')');
        var stim_total_boost = total_stim_boosts_table[stim_key];

        debug(' -i- Describe Stims: update_stim_name(): "'  + stim_name +
                                        '" (total_boost = ' + stim_total_boost +
                                   ', stats_affected = [ "' + stats_affected.join('", "') + '" ])');

        var newText = calculate_stat_effects_and_rename_stim(stim_parent_node, stim_name, stats_affected, stim_total_boost);
        var parentHtml = $(this).parent().html();
        $(this).parent().html(parentHtml.replace(this.textContent, newText));
    });

    // Default value; will be overridden below (unless HTML nodes end up being processed out of order).
    var stim_tier = 1;

    if ($(stim_parent_node).hasClass('modal') || $(stim_parent_node).hasClass('item-detailed')) {
        $(stim_parent_node).find('div.item-detailed-content ul.data-list li').each(function() {
            var class_name = $(this).attr('class');
            var stat_name;

            if (class_name.includes('-Boost')) {
                stat_name = class_name.replace('-Boost', '');
                stat_name = stat_name.substr(0, 1).toUpperCase() + stat_name.substr(1, stat_name.length);
            } else if ($(this).text().includes('Boost')) {
                stat_name = $(this).text().substr(0, $(this).text().indexOf(' '));
            }

            if (stat_name) {
                var stat_value_node = $(this).find('span');
                if (stat_value_node.text() == 0) {
                    return;
                }

                var stat_effective_boost_percent
                    = calculate_effective_stat_boost(stat_value_node.text(), stat_totals[stat_name],
                                                     get_stim_skill_for_stat(stat_name), 1);

                debug(' -i- Describe Stims: --> Stim details: ' + stat_name + ': ' + stat_value_node.text() + ' (+' + stat_effective_boost_percent + '%)');
                if (stat_effective_boost_percent != NaN) {
                    var value_string = stat_value_node.text();
                    stat_value_node.css({ 'text-transform': 'none' });
                    stat_value_node.text('');
                    stat_value_node.append('<font style="color:' + stat_colors[stat_name] + ';">(+' + stat_effective_boost_percent + '%)</font>   ' + value_string);
                }
            } else if (class_name == 'tier') {
                stim_tier = $(this).find('span').text();

            } else if (class_name == 'Toxicity' || $(this).text().includes('Toxicity')) {
                class_name = 'Toxicity';
                var toxicity_value_node = $(this).find('span');
                var toxicity_value = toxicity_value_node.text();
                if (toxicity_value.endsWith('%')) {
                    toxicity_value = toxicity_value.substr(0, toxicity_value.length - 1);
                    debug(' -i- Describe Stims: temp: toxicity_value = ' + toxicity_value);
                    toxicity_value = toxicity_value / 100;
                }

                var player_level = $('div.side-bar div.level-container span.amount').text();
                var player_tier  = Math.floor(((player_level - 1) / 5) + 1); // 1..5 = "1", 6..10 = "2", etc.

                var toxicity_string = toxicity_value_node.text();
                if (stim_tier > player_tier) {
                    debug(' -i- Describe Stims: --> Stim details: ' + class_name + ': Player tier (' + player_tier + ') lower than Stim tier (' + stim_tier + ')');

                    toxicity_value_node.text('');
                    toxicity_value_node.append('<font style="color:#f00; text-transform:none; font-style:italic;">(n/a: tier too high)</font>   ' + toxicity_string);
                } else {
                    var effective_toxicity_percent
                        = calculate_effective_toxicity(toxicity_value, stim_tier, player_tier);

                    debug(' -i- Describe Stims: --> Stim details: ' + class_name + ': ' + toxicity_string + ' (+' + effective_toxicity_percent + '%)');
                    if (effective_toxicity_percent != NaN) {
                        toxicity_value_node.text('');
                        toxicity_value_node.append('<font color="#f00">(+' + effective_toxicity_percent + '%)</font>   ' + toxicity_string);
                    }
                }
            }
        });
    }
}

function calculate_stat_effects_and_rename_stim(stim_parent_node, stim_name, stats_affected, stim_total_boost) {
    var output = "";
    var stim_boost_per_stat = stim_total_boost / stats_affected.length;

    for (var ii = 0; ii < stats_affected.length; ii++) {
        stat_name = stats_affected[ii];
        var stat_stim_skill_level = get_stim_skill_for_stat(stat_name);

        var stat_effective_boost_percent
          = calculate_effective_stat_boost(stim_boost_per_stat, stat_totals[stat_name], stat_stim_skill_level, 0);

        output += '<font color="' + stat_colors[stat_name] + '">+' + stat_effective_boost_percent + '%';
        if (stats_affected.length > 1) {
            output += " " + stat_abbrevs[stat_name] + "</font>, ";
        } else {
            output += '</font>';
        }
    }

    // Slot item names are length-limited; if we aren't showing full item names, use a shorter potency word
    // to try to fit the % and partial stat name in the room available.
    var stim_potency = stim_name.replace(regex_stim_name_only, '$2');
    if ((! tSDS_config.show_verbose_inventory) && $(stim_parent_node).hasClass('slot')) {
        stim_potency = stim_potency_abbreviations[stim_potency];
    }

    if (stats_affected.length == 1) {
        // Single-stat stim (e.g.): "Standard (+3%) Stamina Stim, v1.2.004"
        output = stim_name.replace(regex_stim_name_only, '$1' + stim_potency + ' (' + output + ') $3$8');
    } else {
        // Multi-stat stim (e.g.):  "Standard Multi Stim, v3.2.003 (+5% STR, +8% AGI)"
        if (output.endsWith(', ')) {
            output = output.substr(0, output.length - 2);
        }

        output = stim_name.replace(regex_stim_name_only, '$1' + stim_potency + ' $3  (' + output + ')  $8');
    }

    debug(' -i- Describe Stims: --> New stim name:  "' + output + '"');
    return output;
}

function get_stim_skill_for_stat(stat_name) {
    var stims_skill_level = skills_table['Medical Stim'];

    var stat_stim_skill_level = stims_skill_level;
    if (skills_table['Medical Stim ' + stat_name]) {
        stat_stim_skill_level = skills_table['Medical Stim ' + stat_name];
    }

    return stat_stim_skill_level;
}

function calculate_effective_stat_boost(stim_boost_per_stat, total_for_stat, stat_stim_skill_level, num_decimal_digits) {
    // Ref: https://tauguide.de/#medical-stim-toxicity-calculation-formula (props to @Dotsent)
    var effective_boost = (stim_boost_per_stat / total_for_stat) * (0.5 + 0.25 * stat_stim_skill_level) * 100;

    // Round each stat-boost percentage to the # of significant digits requested.
    var sig_digits_multiplier = Math.pow(10, num_decimal_digits);
    if (effective_boost < 10) {
        sig_digits_multiplier *= 10;
    }

    effective_boost = Math.round(sig_digits_multiplier * effective_boost) / sig_digits_multiplier;

    return effective_boost;
}

function calculate_effective_toxicity(toxicity_value, stim_tier, player_tier) {
    // Ref: https://tauguide.de/#so-whats-the-gain-stat-boost (again, props to @Dotsent)
    var effective_toxicity = (player_tier - stim_tier + 1) * toxicity_value * 100;

    // Round each toxicity percentage to the # of significant digits requested.
    var sig_digits_multiplier = Math.pow(10, 1);
    if (effective_toxicity < 10) {
        sig_digits_multiplier *= 10;
    }

    effective_toxicity = Math.round(sig_digits_multiplier * effective_toxicity) / sig_digits_multiplier;

    return effective_toxicity;
}

// Since the above adds text to already-long item names, show full item names in the player's inventory.
function show_verbose_inventory() {
    if (! tSDS_config.show_verbose_inventory ||
        ! window.location.pathname.match('(/character/inventory|/area/storage)')) {
        return;
    }

    var inventory = $('.inventory');
    if (! inventory.length) {
        return;
    }

    // Preparation: Tweak the page's current styling so that it looks correct when we're finished.

    // The Combat Belt & Storage show item rarity frames differently than Equipped & in-Backpack
    // items, resulting in unusual layout after we're done. Instead, tweak these items to be like
    // equipped/backpack items.
    //
    inventory.find('div.slot.item-framed-img').each(function() {
        if (! $(this).find('button .item-framed-img').length) {
            var rarity = this.getAttribute('class').replace('slot', '').replace('item-framed-img', '').trim();
            $(this).removeClass(rarity);
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

var stat_abbrevs = {
    'Strength':     'STR',
    'Agility':      'AGI',
    'Stamina':      'STA',
    'Social':       'SOC',
    'Intelligence': 'INT'
};

// Stat colors are pulled from the Stim images' top button color.
var stat_colors = {
    'Strength':     '#63D0AC',
    'Agility':      '#FF3030',
    'Stamina':      '#40C0FF',
    'Social':       '#C672CE',
    'Intelligence': '#FFD570'
};

var stim_potency_abbreviations = {
    'Minor':    'Min.',
    'Standard': 'Std.',
    'Strong':   'High'
}

// Obtained from individual Stims' item pages. (The boost values are independent of the stats being affected.)
var total_stim_boosts_table = {
    "v1.1 (1)":  5.5,
    "v1.2 (1)":  6,
    "v1.3 (1)":  6.5,
    "v2.1 (1)":  6.875,
    "v2.2 (1)":  6.875,
    "v2.3 (1)":  7.5,
    "v2.1 (2)":  9.6,
    "v2.2 (2)":  9.6,
    "v2.3 (2)":  10.5,
    "v2.1 (3)":  9.6,
    "v2.2 (3)":  9.6,
    "v2.3 (3)": 10.5,
    "v3.1 (2)": 12.25,
    "v3.2 (2)": 13.1,
    "v3.3 (2)": 14,
    "v3.1 (3)": 12.225,
    "v3.2 (3)": 13.125,
    "v3.3 (3)": 14.025,
    "v4.1 (2)": 16.6,
    "v4.2 (2)": 18.35,
    "v4.3 (2)": 20.1,
    "v4.1 (3)": 16.65,
    "v4.2 (3)": 18.375,
    "v4.3 (3)": 20.1,
    "v5.1 (2)": 25.35,
    "v5.2 (2)": 27.1,
    "v5.3 (2)": 29.75,
    "v5.1 (3)": 25.35,
    "v5.2 (3)": 28.5,
    "v5.3 (3)": 29.775
}

//
// #endregion Stims: Show effective % Stat boost & Toxicity.
//////////////////////////////


function debug(msg) {
    if (tSDS_config.debug) {
        console.log(msg);
    }
}
