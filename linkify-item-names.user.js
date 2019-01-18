// ==UserScript==
// @name         Tau Station: Linkify Item Names
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://raw.githubusercontent.com/taustation-fan/userscripts/master/linkify-item-names.user.js
// @version      1.10
// @description  Automatically convert each item name into a link to that item's details page.
// @author       Mark Schurman (https://github.com/quasidart)
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==
//
// License: CC-BY-SA
//
// Disclaimer:
// These are quick-and-dirty one-off scripts, and do not reflect the author's style or quality of work when developing production-ready software.
//
// Changelist:
//  - v0.1: Handle items in an area's People list, and in "player details" pages.
//  - v0.2: Handle Syndicate Campaigns -- list of opponents (Ruins->Wilds page), and the final loot summary.
//  - v1.0: Published at GitHub.
//  - v1.02: [Dotsent] Skim/save details from "/item/$slug", and append summary to linkified item names.
//  - v1.1.0: Dynamically query TauHead.com API for not-yet-saved weapon & armor details.
//

// TODO List: (things not yet implemented or ready)
//

// Action Items: (things ready & waiting for action)
//

//////////////////////////////
// Begin: User Configuration.
//

var linkify_config = {
    'debug': false,
    'open_links_in_new_tab': true,  // If true: Clicking an item link opens the item page in a new tab.
    'check_if_item_exists_in_ls': true, // If true: preserves existing values in localStorage, otherwise overwrites them
};

//
// End: User Configuration.
//////////////////////////////

var log_prefix = 'Linkify item names: ';
var ls_prefix = 'lins_'; // Linkify Item Names Storage

$(document).ready(linkify_all_item_names);

async function linkify_all_item_names() {
    if (window.location.pathname.startsWith('/character/details/')) {
        linkify_items_in_character_details();
    }

    if (window.location.hash.startsWith('#/people')) {
        linkify_items_in_people_tab();
    } else {
        $('.tab-nav-item[href="#/people"]').click(function() {
            linkify_items_in_people_tab();
        });
    }

    if (window.location.pathname.startsWith('/area/the-wilds')
        && $('.syndicate-campaigns').length > 0) {
        linkify_items_in_syndicate_campaign_opponents_list();
    }

    if (window.location.pathname.startsWith('/item/')) {
        var slug = window.location.pathname.substr(6);
        if (!linkify_config.check_if_item_exists_in_ls || !localStorage.hasOwnProperty(slug)){
            store_item_params(slug);
        }
    }

    var campaign_rewards = $('#campaign-rewards-syndicate');
    if (campaign_rewards.length) {
        linkify_items_in_syndicate_campaign_rewards();
    }
}

//////////////////////////////
// #region Area-specific handlers.
//
var regex_character_armor_and_weapons = new RegExp(/(appears to be )(?:(wearing a )(?:(.+)( and )|(.+)(\.)))?(?:(carrying a )(.+)(\.))?/);

function linkify_items_in_character_details() {
    // Examples:
    //  - "Alice appears to be wearing a smeared composite armor."
    //  - "bob appears to be carrying a g-sag1e."
    //  - "carol appears to be wearing a smeared composite armor and carrying a g-sag1e."

    var line = $('.character-overview p:contains("appears to be")');
    if (line.length && !line.children().length) {
        var html = line.html();
        var matches = html.match(regex_character_armor_and_weapons);
        if (matches != null) {
            console.log(log_prefix + 'Linkifying item in character info.');

            // First, wrap the item names in a tag, so we can update them asynchronously if needed.
            html = html.replace(regex_character_armor_and_weapons,
                                '$1$2<span class="linkified">' + (matches[3] || matches[5]) + '</span>$4' +
                                '$7<span class="linkified">'   + matches[8] + '</span>$6$9');
            line.html(html);

            // Next, update the items (which, if AJAX calls are needed, updates them asynchronously).
            line.find('.linkified').each(function() {
                linkify_item_element(this);
            });
        }
    }
}

function linkify_items_in_people_tab() {
    var items_listed = $('.people-content tr td:not(:first-of-type):not(:contains("None"))');
    if (items_listed.length) {
        console.log(log_prefix + 'Linkifying others\' equipment.');
        items_listed.each(function () {
            linkify_item_element(this);
        });
    } else {
        console.log(log_prefix + 'Linkifying others\' equipment (when People tab gets populated).');
        react_when_updated($('.tab-content-people'),
                            function (mutation) { return mutation.target.nodeName.toLowerCase() == 'tbody'; },
                            function (domElement) {
                                $(domElement).find('td:not(:first-of-type):not(:contains("None"))').each(function () {
                                    linkify_item_element(this);
                                });
                            },
                            { childList: true, subtree: true }, // Chrome requires childList, but ignores descendants if subtree isn't included.
                            2); // 2 seconds (a little extra time).
    }
}

function linkify_items_in_syndicate_campaign_opponents_list() {
    var items_listed = $('.campaign-dl-armor dd, .campaign-dl-weapon dd');
    if (items_listed.length) {
        console.log(log_prefix + 'Linkifying Syndicate Campaign opponents\' equipment.');
        linkify_item_element(items_listed);
    }
}

function linkify_items_in_syndicate_campaign_rewards() {
    var items_listed = $('#campaign-rewards-syndicate li, #campaign-rewards-personal li');
    if (items_listed.length) {
        console.log(log_prefix + 'Linkifying Syndicate Campaign rewards.');
        linkify_item_element(items_listed);
    }
}

// Applies to "/item/{slug}" page. (Also applies to "/character/inventory",
// in case we decide to skim from there as well.)
function store_item_params(slug) {
    var data_list = $('.data-list');
    var item_type = data_list.find('.type>span');
    if (item_type.length && (item_type.html().toLowerCase() == 'armor' || item_type.html().toLowerCase() == 'weapon')) {
        // Note: If we start skimming Inventory item data, use (e.g.) '[class^="piercing-"]>span' instead.
        //       (In Inventory, weapons use these, but armor uses (e.g.) '.piercing-defense>span'.)
        var piercing = data_list.find('.piercing-damage>span').html();
        var impact = data_list.find('.impact-damage>span').html();
        var energy = data_list.find('.energy-damage>span').html(); // In Inventory, '.Energy-damage>span' is capitalized.

        localStorage.setItem(ls_prefix + slug, format_item_data(piercing, impact, energy));
    }
}

//
// #endregion Area-specific handlers.
//////////////////////////////

//////////////////////////////
// #region Common workers.
//

function linkify_item_element(dom_elements) {
    var jq_elements = $(dom_elements);

    // Ignore any elements that already contain a link. (Note: .children() ignores #text nodes; .contents() includes them.)
    if (! jq_elements.find('a').length) {
        var text_elements = jq_elements.contents().filter(text_nodes_only);
        text_elements.each(function() {
            var text_element = this;
            var item_count = undefined;
            var item_text  = text_element.textContent;

            if (! item_text) {
                return;
            }

            var matches = item_text.match(/^(\d+) x (.*)$/);
            if (matches !== null && matches.length) {
                item_count = matches[1];
                item_text  = matches[2];
            }

            // If this needs to contact TauHead, it will complete asynchronously,
            // therefore it needs to handle updating the output (not us).
            linkify_item_name(item_text, function(item_html) {
                if (item_count) {
                    item_html = item_count + ' x ' + item_html;
                }

                $(text_element).replaceWith(item_html);
            });
        });
    }

    function text_nodes_only() {
        return (this.nodeName == "#text");
    }
}

function linkify_item_name(text, fn_update_item_name) {
    var retval = '';
    if (text) {
        text = text.trim();
        var slug   = get_slug(text);
        var target = (linkify_config.open_links_in_new_tab ? ' target="_blank"' : '');

        // This will happen synchronously if we already have the item data,
        // or asynchronously if we need to get the data via an AJAX call.
        var fn_apply_link_and_data = function() {
            var extra = localStorage[ls_prefix + slug] || "";

            retval = '<a ' + target + ' href="/item/' + slug + '">' + text + '</a>' + extra;
            fn_update_item_name(retval);
        }

        if (! localStorage.hasOwnProperty(ls_prefix + slug)) {
            get_item_data(slug, fn_apply_link_and_data);
        } else {
            fn_apply_link_and_data();
        }
    }
}

function get_slug(text) {
    var retval = '';
    if (text) {
        // First, check for simple, special-case slugs.
        retval = lookup_slug[text];
        if (! retval) {
            // Next, check for more complex, special-case slugs.
            for (var index in lookup_slug_regexp) {
                var regexp  = lookup_slug_regexp[index][0];
                var replace = lookup_slug_regexp[index][1];

                if (regexp.test(text)) {
                    retval = text.replace(regexp, replace);
                    break;
                }
            }
        }

        // Finally, just try processing the item name itself. (Appilcable to most items in the game.)
        if (! retval) {
            retval = text;

            // Convert accented characters to their 7-bit equivalent. (JS's I18N
            // is too good - unfortunately, no "lossy" conversion method exists.)
            // These are the only such chars that've been seen so far.
            retval = retval.replace(/\xC9/g,       'E')  // É (capital E ACUTE)
                            .replace(/\xE9/g,       'e')  // é (small E ACUTE)
                            .replace(/\u014d/g,     'o')  // ō (small O WITH MACRON)
                            .replace(/ ?\u2013 ?/g, '-')  // – (EN DASH)
                            .replace(/\u2019/g,     '')   // ’ (RIGHT SINGLE QUOTATION MARK)
                            .replace(/\u2122/g,     'tm');// ™ (TRADE MARK SIGN)

            // Convert remaining characters as appropriate. (Note: \x2D = "-", which we need to keep.)
            retval = retval.toLowerCase().replace(/[\x21-\x2C\x2E-\x2F]/g, '').replace(/[ \xA0]/g, '-');
        }
    }
    return retval;
}

var lookup_slug = {
    'Insignificant Bond Package': 'bonds-2',
    'Tiny Bond Package':          'bonds-5',
    'Small Bond Package':         'bonds-10',
    'Standard Bond Package':      'bonds-20',
    'Large Bond Package':         'bonds-30',
    'Huge Bond Package':          'bonds-40',
};

var lookup_slug_regexp = [
    [ new RegExp('Food and water daily ration tier ([0-9]+)'), 'ration-$1' ],
];


var ajax_enabled = true;

var count_ajax_queries = 0;
var last_slug_queried  = undefined;
var missing_slugs      = [];

// Query TauHead.com's API to get the JSON data for a single item.
function get_item_data(slug, fn_finish_caller_tasks) {
    // Allow us to disable AJAX for subsequent attempts (on this page) if a suitably-bad error occurs.
    if (! ajax_enabled) {
        return;
    }

    count_ajax_queries++;
    last_slug_queried = slug;

    $.getJSON('https://www.tauhead.com/item/' + slug)
        .done(function (data, status, xhr) {
            if (data) {
                // If not a weapon or armor, this will add the item w/ an empty value (to prevent further AJAX queries for it).
                var saved_data = format_item_data(data);
                localStorage.setItem(ls_prefix + slug, saved_data);
            }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            if (jqXHR.status == 404) {
                missing_slugs.push(slug);
            }
        })
        // Continue updating the item name, even if TauHead has no data for it (yet).
        .always(function (jqXHR, textStatus) {
            // When the last AJAX query returns, report the total # of queries for this page load.
            if (last_slug_queried == slug) {
                console.log(log_prefix + 'Sent ' + count_ajax_queries + ' AJAX queries to TauHead.com.')
                if (missing_slugs.length) {
                    console.log(log_prefix + 'TauHead.com is missing the following items:\n' +
                                '  ' + missing_slugs.join(', '));
                }
            }

            fn_finish_caller_tasks();
        });
}

// Transform one item's weapon/armor data into the format saved to localStorage.
// Can pass in either separate piercing, impact, and energy values, or a single
// object containing the item's JSON data.
function format_item_data(piercing, impact, energy) {
    if (typeof piercing === 'object') {
        var data = piercing;
        if (data.hasOwnProperty('item_component_weapon')) {
            piercing = (data.item_component_weapon.piercing_damage || 0) * 1;
            impact   = (data.item_component_weapon.impact_damage   || 0) * 1;
            energy   = (data.item_component_weapon.energy_damage   || 0) * 1;
        } else if (data.hasOwnProperty('item_component_armor')) {
            piercing = (data.item_component_armor.piercing || 0) * 1;
            impact   = (data.item_component_armor.impact   || 0) * 1;
            energy   = (data.item_component_armor.energy   || 0) * 1;
        } else {
            // Not a weapon or armor; for now, we don't care about it.
            return '';
        }
    }

    return ' (P:' + piercing + ', I:' + impact + ', E:' + energy + ')';
}

// Trigger a handler when nodes of interest are updated. For details about the datatypes
// named below, see: https://dom.spec.whatwg.org/#interface-mutationobserver
//
// Parameters:
//  - jQuery      A valid jQuery object (collection of matching nodes) to be monitored.
//                If the collection is empty (no nodes matched the jQuery selector), this function exits cleanly.
//  - filter      A function(MutationRecord) {...} block that returns True for changes we're interested in.
//  - Fn_of_node  A function(Node) {...} block to run against each matching DOM Node.
//                (Note: The function's input parameter is a DOM Node, not a jQuery-wrapped node.)
//  - config      [Optional] A MutationObserverInit object listing the types of mutations to observe.
//                (For legal values, search the web for MutationObserverInit / "mutation observer options".)
//                Default: { childList: true, subtree: true }
//  - timeout     [Optional] Maximum time (in seconds) to wait between updates; resets when a matching update is detected.
//                If this timeout expires without detecting a matching update, the code will stop detecting changes.
//                Default: No timeout -- does not stop monitoring for updates.
//
// Example usage:
//     // When the page's "People" tab is shown, add links to all item names in its table.
//     react_when_updated(
//             // We want to monitor the "People" tab area of this page.
//             $('.tab-content-people'),
//
//             // Filter: Ignore all changes, unless the affected node is a <tbody>.
//             function (mutation) { return mutation.target.nodeName.toLowerCase() == 'tbody'; },
//
//             // Run the following code against each matching <tbody> DOM Node.
//             function (DOM_node) {
//                 // For a) each item field that b) does not contain "None", linkify the item name.
//                 $($DOM_node).find('td:not(:first-of-type):not(:contains("None"))').each(function () {
//                     linkify_equipment_element(this);
//                 });
//             },
//
//             // Detect updates to the "People" tab's direct children & descendants.
//             { childList: true, subtree: true },
//
//             // We only need to process changes when the "People" tab is first shown; after that, no further changes occur.
//             2); // 2 seconds (a little extra time).
//     }
//
function react_when_updated(jQuery, filter, Fn_of_node, config, timer) {
    if (! jQuery.length) {
        return;
    }

    if (timer != undefined) {
        timer *= 1000; // Convert to milliseconds.
    }

    // Options for the observer (which mutations to observe)
    if (! config) {
        config = { childList: true, subtree: true };
    }

    var stop_timer = undefined;

    // Callback function to execute when mutations are observed
    var callback = function(mutationsList, observer) {
        debug(log_prefix + 'Processing mutationsList:');

        for (var mutation of mutationsList) {
            debug(log_prefix + ' - Saw mutation:'); debug(mutation);

            if (mutation.target && (filter == undefined || filter(mutation))) {
                debug(log_prefix + '    - Filter: matched.');
                if (timer != undefined && stop_timer) {
                    window.clearTimeout(stop_timer);
                    stop_timer = undefined;
                }

                mutation.addedNodes.forEach(function (node) {
                    Fn_of_node(node);
                });

                if (timer != undefined) {
                    stop_timer = window.setTimeout(stop_reacting_to_updates, timer);
                }
            } else {
                debug(log_prefix + '    - Filter: Didn\'t match.');
            }
        }
    };

    // Create an observer instance linked to the callback function
    var observer = new MutationObserver(callback);

    if (timer != undefined) {
        stop_timer = window.setTimeout(stop_reacting_to_updates, timer);
    }

    // Start observing the target node for configured mutations
    jQuery.each(function () { observer.observe(this, config); });
}

function stop_reacting_to_updates() {
    observer.disconnect();
    debug(log_prefix + 'Disconnected MutationObserver.');
}

//
// #endregion Common workers.
//////////////////////////////

function debug(msg) {
    if (linkify_config.debug) {
        console.log(msg);
    }
}
