// ==UserScript==
// @name         Tau Station: Stims: Show boosted-stat icons
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://rawgit.com/taustation-fan/userscripts/master/stim-stat-icons.user.js
// @version      1.2.1
// @description  Overlay icons on stims, indicating which stats are boosted by each stim.
// @author       Mark Schurman (https://github.com/quasidart)
// @match        https://alpha.taustation.space/area/docks*
// @match        https://alpha.taustation.space/area/electronic-market*
// @match        https://alpha.taustation.space/area/storage*
// @match        https://alpha.taustation.space/area/the-wilds*
// @match        https://alpha.taustation.space/area/vendors*
// @match        https://alpha.taustation.space/character/inventory*
// @match        https://alpha.taustation.space/combat*
// @match        https://alpha.taustation.space/coretechs/storage/*
// @match        https://alpha.taustation.space/item/*
// @match        https://alpha.taustation.space/preferences*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @require      https://rawgit.com/taustation-fan/userscripts/master/userscript-preferences.js
// ==/UserScript==
//
// License: CC-BY-SA
//
// Disclaimer:
// These are quick-and-dirty one-off scripts, and do not reflect the author's style or quality of work when developing production-ready software.
//
// Changelist:
//  - v1.0: Initial version.
//  - v1.1.1: Added support: Storage Management page
//  - v1.1.2: Added support: Ship's storage
//  - v1.2: Initial release (code cleanup, minor UI updates)
//  - v1.2.1: Switch to Font Awesome 5
//
// TODO List: (things not yet implemented or ready)
//  - After site's upcoming combat update, options.hide_mental_stats_during_combat shouldn't hide INT during combat.
//
'use strict';

var local_config = {
    debug:                      localStorage.tST_debug              || false,
    debug_MutationObserver:     localStorage.debug_MutationObserver || false,  // Used for react_when_updated() / MutationObserver logging -- noisy enough to warrant a separate debug flag.
    fake_stim_in_public_market: false,
};

var log_prefix = 'Stim Stat Icons: ';

const default_icon_position = {
    Strength:     'top-left',
    Agility:      'top-hcenter',
    Stamina:      'vcenter-left',
    Boost:        'vcenter-hcenter',
    Intelligence: 'vcenter-right',
    Tier:         'bottom-left',
    Social:       'bottom-hcenter',
};

var options;
var player_tier;

function stim_stat_icons() {
    // To configure this script, visit the in-game Preferences page (/preferences).
    options = userscript_preferences( stim_stat_icons_preferences_definition() );

    if (window.location.pathname.startsWith('/character/inventory') && ! options.show_in_inventory) {
        return;
    }

    let level = $('.player-info .level .amount');
    if (level.length) {
        level = Number.parseInt(level.text(), 10);
        player_tier = Math.floor((level - 1) / 5) + 1;
        localStorage.setItem('player_tier', player_tier);
    } else if (localStorage.hasOwnProperty('player_tier')) {
        player_tier = Number.parseInt(localStorage.player_tier);
    }

    add_stim_stat_icons();
}

function add_stim_stat_icons(isDialog) {
    // Add only the selectors we anticipate needing, to reduce unnecessary scanning.
    let stim_parent_selectors = 'div.slot';
    let img_frames_selector   = '.item[data-item-type=medical]';

    let dialog_parent_selector = 'section.modal:has(div.header-info:has(span.name)) ';
    let dialog_frame_selector  = '.item-detailed:has(.data-list .type span:contains("Medical"))';

    let is_filter_container = false;
    let filter_container_selector = 'div.slots';

    if (window.location.pathname.startsWith('/item/')) {
        stim_parent_selectors = '.item-individual';
        img_frames_selector   = dialog_frame_selector + ' .item-framed-img';

    } else if (window.location.pathname.startsWith('/combat/')) {
        stim_parent_selectors = '.combat-belt--content--inner';
        img_frames_selector   = '.combat-belt--content--img-container';

    } else if (window.location.pathname.startsWith('/area/electronic-market')) {
        stim_parent_selectors = '.market-list--item';
        img_frames_selector   = '.market-item--content--verbose:has(.market-item-details-data dt:contains("Type") ~ dd:contains("Medical")) .item-framed-img';

        if (local_config.fake_stim_in_public_market) {
            // For testing: Change the first public market entry to look like a Stim item.
            $('.market-list--item:first .market-item--content--item a').text('Mil T04-V031-8.13x5-0.035');
            let fake_stim = $('.market-list--item:first .market-item-details-data--row:has(dt:contains("Type"))');
            fake_stim.find('dt').text('Type');
            fake_stim.find('dd').text('Medical');
        }
    } else if (window.location.pathname.startsWith('/coretechs/storage')) {
        is_filter_container = true;
        dialog_parent_selector = '.dialog-coretech'
        dialog_frame_selector  = undefined;

    } else if (! window.location.pathname.startsWith('/area/vendors')) {
        img_frames_selector += ' .item-framed-img'; // Absent in vendors' products list.
    }

    if (isDialog) {
        stim_parent_selectors = dialog_parent_selector + dialog_frame_selector;
        img_frames_selector   = '.item-framed-img';   // Modal sections lack '.item[data-item-type=medical]'.
    } else {
        add_stat_icons_css();   // We only need to add this when first run, not for in-page modal updates.
    }

    debug(log_prefix + `Using jQuery selectors:\n - parent = "${stim_parent_selectors}"\n - frames = "${img_frames_selector}"`);

    let stim_parents = $(stim_parent_selectors);

    // Don't do unnecessary work -- this won't scan for stat totals & parse the skills JSON, unless we need to use them.
    if (! stim_parents.length) {
        console.log(log_prefix + 'No stims found.');
    } else {
        console.log(log_prefix + 'Decorating stims.');

        // get_stat_totals();

        // skills_table = JSON.parse(localStorage.tSDS_skills);
        add_stat_icons_for_stim(stim_parents, img_frames_selector);

        // If clicking on this brings up a modal details pane (inventory, store, etc.),
        // update stim details in that pane as well.
        if (! isDialog && ! is_filter_container) {
            let dialog_pane_container = 'section[data-inventory-section="combat-belt"], ' +
                                        'section[data-inventory-section="carried"] .slots';

            start_dialog_observer(dialog_pane_container, dialog_frame_selector, false);
        }
    }

    // If the stims are in a dynamic container, it may not populate until after the initial
    // backend query has finished, and may re-populate when a different filter is chosen,
    // so attach an observer to the container.
    if (is_filter_container) {
        react_when_updated($(filter_container_selector),
                           function (mutation) {
                               if (mutation.addedNodes && mutation.addedNodes.length) {
                                   return ($(mutation.target).find(img_frames_selector).length);
                               } else {
                                   return false;
                               }  },
                           function (domElement) {
                               let img_frame = $(domElement).find(img_frames_selector);
                               if (img_frame.length) {
                                   add_stat_icons_for_stim($(domElement), '.item-framed-img');
                               }
                           },
                           { childList: true, subtree: true });

        // Also start a pop-over-dialog observer, for when the player clicks on an item.
        let dialog_pane_container = 'body'; // Unfortunately (for perf), this pop-over dialog is added as a direct child of <body>.
        start_dialog_observer(dialog_pane_container, dialog_frame_selector, true);
    }
}

function start_dialog_observer(dialog_pane_container, dialog_frame_selector, isPopover) {
    let all_slots = $(dialog_pane_container);
    if (all_slots.length) {
        react_when_updated(all_slots,
                           function (mutation) {
                               if (isPopover) {
                                   return ($(mutation.target).hasClass('dialog--content--inner'));
                               } else {
                                   return ($(mutation.target).find('section.modal').length);
                               }
                           },
                           function (domElement) {
                               let img_frame = $(domElement);
                               if (dialog_frame_selector) {
                                   img_frame = img_frame.find(dialog_frame_selector);
                               }
                               if (img_frame.length) {
                                   add_stat_icons_for_stim(img_frame, '.item-framed-img');
                               }
                           },
                           { childList: true, subtree: true });
    }
}

function add_stat_icons_for_stim(stim_parents, img_frames_selector) {
    stim_parents.each(function() {
      try {
        let stim_name_selector = '.name';
        if (window.location.pathname.startsWith('/combat/')) {
            stim_name_selector = '.combat-belt--content--desc';
        } else if (window.location.pathname.startsWith('/area/electronic-market')) {
            stim_name_selector = '.market-item--content--item a';
        } else if (window.location.pathname.startsWith('/coretechs/storage') &&
                   (this.tagName === 'DIV' && this.classList.contains("dialog-coretech"))) {
            stim_name_selector = '.item-detailed-header .name';
        }

        let stim_frame = $(this);
        if (! stim_frame.hasClass('item-framed-img') && img_frames_selector) {
            stim_frame = stim_frame.find(img_frames_selector);
        }
        let button_child = stim_frame.children('button.modal-toggle');
        if (button_child.length) {
            stim_frame = button_child;
        }

        if (! stim_frame) {
            return;
        }

        let name = $(this).find(stim_name_selector).text();
        // Extract the stim's type, Tier, stats bitmask, and boost amount(s). (For now, we don't show toxicity.)
        let matches = name.match(/([A-Za-z]+) T(\d+)-v(\d+)((?:-[\d\.]+(?:x\d)?)+)-/i);
        if (matches !== null) {
            let stim_type = matches[1];
            let stim_tier = Number.parseInt(matches[2], 10);
            let stim_stats_bitmask = Number.parseInt(matches[3], 10);

            let stim_boost = matches[4];

            let stats_affected = get_stats_from_bitmask(stim_stats_bitmask);

            if (options.show_boost_amount && stim_boost && (player_tier || options.show_boost_for_all_tiers)) {
                if (stim_tier === player_tier || options.show_boost_for_all_tiers) {
                    // Pick the highest boost value (in case multiple are present).
                    stim_boost = Number.parseFloat(stim_boost.replace(/x\d/g, '').split(/-/).sort().reverse()[0]);

                    // Truncate to 2 significant digits, to be "icon"-sized.
                    if (stim_boost >= 10) {
                        stim_boost = Math.floor(stim_boost);
                    } else {
                        stim_boost = Math.floor(stim_boost * 10) / 10;
                    }

                    stats_affected.push('Boost:' + stim_boost);
                }
            }

            if (player_tier) {
                if (stim_tier === player_tier - 1) {
                    stats_affected.push('Tier:' + stim_tier + ':warn');
                } else if (stim_tier !== player_tier) {
                    stats_affected.push('Tier:' + stim_tier + ':bad');
                }
            }

            console.log(log_prefix + name.replace(/medical: */i, '')
                                         .replace(/armor: */i, '[in Belt] ')
                                         .replace(/[ \t\r\n]+/g, ' ').trim()
                        + ' -> { ' + stats_affected.join(', ') + ' }');

            // Iterate through stats_affected, to add stat icons to the frame.
            stats_affected.forEach(function (stat_name) {
              try {
                let text_value = undefined;
                let severity = undefined;
                if (stat_name.includes(':')) {
                    [ stat_name, text_value, severity ] = stat_name.split(':');
                }

                let stat_key = stat_name.toLowerCase() + '_position';
                let y_x = (options[stat_key] || default_icon_position[stat_name]);
                if (! y_x) {
                    debug(log_prefix + 'Couldn\'t find position for "' + stat_name + '" icon!  Skipping it.');
                    return;
                }

                let icon_y;
                let icon_x;

                [ icon_y, icon_x ] = y_x.split('-');

                if (options.shift_to_avoid_overlay && stat_name !== 'Boost' && stat_name !== 'Tier') {
                    [ icon_y, icon_x ] = shift_to_avoid_overlay(icon_y, icon_x, stim_type, stats_affected);
                }

                if (   options.hide_mental_stats_during_combat
                    && window.location.pathname.startsWith('/combat/')
                    && (stat_name === 'Social' || stat_name === 'Intelligence')) { //TODO: After site's upcoming combat update, don't hide INT during combat.
                    icon_y = 'hidden';
                    icon_x = 'hidden';
                }

                stim_frame.append(insert_icon(stat_name, icon_y, icon_x, text_value, severity));
              } catch (ex) {
                  console.log(log_prefix + 'stats_affected.each(): Caught error: ' + ex);
              }
            });

            // If we added any fa-* icons or text, we need to adjust them a little.
            let text_icons = stim_frame.find('.stim-icon-text');
            text_icons.each(function() {
                let text_icon = $(this);
                let container_height = text_icon.parent().css('height');
                if (container_height.includes('%') || window.location.pathname.startsWith('/area/electronic-market')) {
                    container_height = '166%'; // On Public Market page, items starts out collapsed, so .css('height') is (e.g.) "22%" instead of a pixel height.
                }
                let shrink_factor = 1.5;
                if (text_icon.hasClass('stim-stat-intelligence')) {
                    shrink_factor = 1.3;
                }
                let font_size = `calc(${container_height} / ${shrink_factor})`;

                text_icon.css({'font-size': font_size,
                               'line-height': 'normal'});   // Line-height needed mainly in Public Market page.
            });
        }
      } catch (ex) {
          console.log(log_prefix + 'stim_parents.each(): Caught error: ' + ex);
      }
    });
}

function get_stats_from_bitmask(stim_stats_bitmask) {
    let stats_affected = [];

    /*eslint no-bitwise:off */
    if (stim_stats_bitmask &  1) { stats_affected.push('Strength');     }
    if (stim_stats_bitmask &  2) { stats_affected.push('Agility');      }
    if (stim_stats_bitmask &  4) { stats_affected.push('Stamina');      }
    if (stim_stats_bitmask &  8) { stats_affected.push('Social');       }
    if (stim_stats_bitmask & 16) { stats_affected.push('Intelligence'); }

    return stats_affected;
}

// Attempt to shift the overlaid-icon placement, to avoid covering part of the stims in the item image.
function shift_to_avoid_overlay(icon_y, icon_x, stim_type, stats_affected) {
    let stats_only = (stats_affected || []).filter(function(value) { return (! value.includes(':')); });

    if (stim_type && stim_type.startsWith('Mil')) {
        // 1 diagonal stim (bottom-left to top-right).
        // Change Top,Right to Top,H-Center, and Bottom,Left to Bottom,H-Center.
        if (icon_y === 'top') {
            icon_x = icon_x.replace(/right$/, 'hcenter');
        } else if (icon_y === 'bottom') {
            icon_x = icon_x.replace(/left$/, 'hcenter');
        }
        icon_x = [ icon_x, 'diagonal' ];

    } else if (stats_only.length) {
        // if (stats_only.length == 2) {
        //     // 2 vertical stims (centered).
        //     // Change any H-Center to Right, unless it's on the bottom & the item may have a quantity.
        //     if (icon_y !== 'bottom' ||
        //         (! window.location.pathname.startsWith('/character/inventory') &&
        //          ! window.location.pathname.startsWith('/area/storage') &&
        //          ! window.location.pathname.startsWith('/combat'))) {
        //         icon_x = icon_x.replace(/hcenter$/, 'right');
        //     }
        // } else if (stats_only.length == 3) {
        //     // 1 vertical stim (offset left), two horizontal stims.
        //     // Change Bottom,H-Center to Bottom,Right.
        //     if (icon_y === 'bottom' &&
        //         (! window.location.pathname.startsWith('/character/inventory') &&
        //          ! window.location.pathname.startsWith('/area/storage') &&
        //          ! window.location.pathname.startsWith('/combat'))) {
        //         icon_x = icon_x.replace(/hcenter$/, 'right');
        //     }
        // }
    }

    return [ icon_y, icon_x ];
}

const stim_special_tooltips = {
    warn:  'FYI: This stim does not match your tier,\n' +
           'and will be more toxic than normal.',
    bad:   'Warning: This stim is dangerous for you to use.',
    boost: 'This stim recovers stats by up to {0} points,\n' +
           'depending on your Stims skills.',
}

function insert_icon(stat_name, icon_y, icon_x, text_value, severity) {
    let title = stat_name;

    // If X/Y aren't specified, show the icon inline.
    icon_x = (icon_x || 'inline');
    icon_y = (icon_y || 'inline');

    let fa_icon = '';
    let icon_text = '';
    let decoration = 'stim-text-container';

    if (stat_name === 'Intelligence') {
        fa_icon = 'fa-lightbulb';
    } else if (stat_name === 'Social') {
        fa_icon = 'fa-user';
    } else if (stat_name === 'Boost') {
        icon_text = text_value;
        decoration += ' stim-boost-border';
        title = stim_special_tooltips[stat_name.toLowerCase()].replace('{0}', text_value);
    } else if (stat_name === 'Tier') {
        icon_text = 'T' + text_value;
    } else {
        decoration = ''; // General case: No decoration needed.
    }

    if (fa_icon) {
        icon_text = `<span class="far ${fa_icon}" />\n`;
    }

    let icon_class = 'stim-stat-icon';
    if (icon_text) {
        icon_class = 'stim-icon-text';
    }

    if (severity) {
        decoration += ' stim-severity-' + severity;
        title = stim_special_tooltips[severity];
    }

    // If the stim image is diagonal, we've indicated it in icon_x.
    if (Array.isArray(icon_x)) {
        icon_x = icon_x.join(' stim-image-');
    }

    return `
<div class="stim-stat-background stim-stat-${icon_y} stim-stat-${icon_x} ${decoration}">
    <div class="${icon_class} stim-stat-${stat_name.toLowerCase()}" title="${title}">
    ${icon_text}</div>
</div>
`;
}

////////////////////
// #region Add CSS used by this script.
//

function add_css(css) {
    // Ref: https://stackoverflow.com/questions/3922139/add-css-to-head-with-javascript
    var head = document.getElementsByTagName('head')[0];
    var s = document.createElement('style');
    s.setAttribute('type', 'text/css');
    if (s.styleSheet) {   // IE
        s.styleSheet.cssText = css;
    } else {              // the world
        s.appendChild(document.createTextNode(css));
    }
    head.appendChild(s);
}

function add_stat_icons_css() {
    add_css(`
.stim-stat-background {
    background: radial-gradient(black, #0008, black);
    border-radius: 33%;
    width: 22%;
    height: 22%;
    margin: 2px;
    padding: 1.5%;
    position: absolute;
    z-index: 1;
}

.stim-text-container {
    min-width: 22%;
    width: fit-content;
}

.stim-stat-hidden {
    display: none;
}

.stim-stat-left {
    left: 7%;
}

.stim-stat-hcenter {
    left: calc(50% - (22% / 2));
}

.stim-stat-right {
    right: 7%;
}

.stim-stat-top {
    top: 3.5%;
}

.stim-stat-vcenter {
    top: calc(50% - (22% / 2));
}

.stim-stat-bottom {
    bottom: 3.5%;
}

.stim-image-diagonal.stim-stat-hcenter.stim-stat-top {
    left: calc(45% - (22% / 2));
}

.stim-image-diagonal.stim-stat-hcenter.stim-stat-bottom {
    left: calc(55% - (22% / 2));
}

.stim-image-diagonal.stim-stat-vcenter.stim-stat-left {
    top: calc(40% - (22% / 2));
}

.stim-image-diagonal.stim-stat-vcenter.stim-stat-right {
    top: calc(55% - (22% / 2));
}

.stim-stat-icon {
    height: 100%;
    width: 100%;
}

.stim-stat-strength {
    background-color: #40A0A0;
    -webkit-mask: url(/static/images/gym/strength.svg) no-repeat center;
    -webkit-mask-size: 100% 100%;
    mask-size: 24px 24px;
    mask: url(/static/images/gym/strength.svg) no-repeat center;
}

.stim-stat-agility {
    background-color: #C85050;
    -webkit-mask: url(/static/images/gym/agility.svg) no-repeat center;
    -webkit-mask-size: 100% 100%;
    mask-size: 24px 24px;
    mask: url(/static/images/gym/agility.svg) no-repeat center;
}

.stim-stat-stamina {
    background-color: cornflowerblue;
    -webkit-mask: url(/static/images/gym/stamina.svg) no-repeat center;
    -webkit-mask-size: 100% 100%;
    mask-size: 24px 24px;
    mask: url(/static/images/gym/stamina.svg) no-repeat center;
}

.stim-stat-intelligence.stim-icon-text {
    color: #CCCC00;
    margin-top: -3%;
}

.stim-stat-social.stim-icon-text {
    color: #CC00CC;
    /* margin-top: -3%; */
    margin-top: 5%;  /* Some FontAwesome icons end up vertically offset, so center this accordingly. */
    margin-bottom: 5%;
}

.stim-icon-text {
    text-align: center;
    cursor: inherit;
}

.stim-boost-border {
    border: cyan outset 2px;
    color: cyan;
}

.stim-severity-warn {
    border: yellow outset 2px;
    color: yellow;
}

.stim-severity-bad {
    border: red outset 2px;
    color: red;
}
`);
}

//
// #endregion Add CSS used by this script.
////////////////////

////////////////////
// #region Helper methods.
//

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

    // Make sure only one script instance adds this observer.
    let key = 'observer_' + (Fn_of_node ? getHashForString(Fn_of_node.toString()) : getHashForJQueryObject(jQuery));
    let nonce = String(Math.random() * 0x0FFFFFFFFFFFFFFF);

    if (jQuery.attr(key)) {
        debug(log_prefix + 'Another userscript is already setting up this observer.');
        if (Fn_of_node) {
            debug_MutationObserver(Fn_of_node);
        } else {
            debug_MutationObserver(jQuery);
        }
        return;
    }

    jQuery.attr(key, nonce); // Otherwise, set this, and set up the observer, but _don't_ attach the observer unless our value is still present (below).

    if (timer != undefined) {
        timer *= 1000; // Convert to milliseconds.
    }

    // Options for the observer (which mutations to observe)
    if (! config) {
        config = { childList: true, subtree: true };
    }

    var stop_timer = undefined;

    // Callback function to execute when mutations are observed
    var callback = function(mutationsList, cbObserver) {
        debug_MutationObserver(log_prefix + 'Processing mutationsList:');

        for (var mutation of mutationsList) {
            debug_MutationObserver(log_prefix + ' - Saw mutation:'); debug_MutationObserver(mutation);

            if (mutation.target && (filter == undefined || filter(mutation))) {
                debug_MutationObserver(log_prefix + '    - Filter: matched.');
                if (timer != undefined && stop_timer) {
                    window.clearTimeout(stop_timer);
                    stop_timer = undefined;
                }

                // Call the provided function on all applicable nodes.
                let processed_added = false;
                let processed_target = false;

                if (config.childList || config.subtree) {
                    mutation.addedNodes.forEach(function (node) {
                        Fn_of_node(node);
                    });
                    processed_added = true;
                }

                if (config.attributes || config.characterData) {
                    Fn_of_node(mutation.target);
                    processed_target = true;
                }

                if (! processed_added && ! processed_target) {
                    debug(log_prefix + 'Warning: Caught wanted observation, but didn\'t process any nodes! Please verify values being provided to react_when_updated()\'s "config" parameter.')
                }

                if (timer != undefined) {
                    stop_timer = window.setTimeout(() => stop_reacting_to_updates(cbObserver), timer);
                }
            } else {
                debug_MutationObserver(log_prefix + '    - Filter: Didn\'t match.');
            }
        }
    };

    // Create an observer instance linked to the callback function
    var observer = new MutationObserver(callback);

    if (timer != undefined) {
        stop_timer = window.setTimeout(() => stop_reacting_to_updates(observer), timer);
    }

    // Make sure we still "own" attaching this observer.
    if (jQuery.attr(key) === nonce) {
        // Start observing the target node for configured mutations.
        jQuery.each(function () { observer.observe(this, config); });
    } else {
        debug(log_prefix + 'Another userscript owns setting up this observer; bowing out in favor of it.');
    }
}

function stop_reacting_to_updates(observer) {
    observer.disconnect();
    debug_MutationObserver(log_prefix + 'Disconnected MutationObserver.');
}

function getHashForJQueryObject(jq_obj) {
    var text;

    if (jq_obj.length !== 0) {
        text = jq_obj.text() || "";
    }

    return getHashForString(text);
}

// Compute a simple hash value for a string.
// Ref: https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
function getHashForString(text) {
    var hash = 0, i, chr;

    if (! text) {
        return hash;
    }

    // Remove newlines; also, remove any timers from the text, so the hash results in a consistent value.
    text = text.replace(/\r?\n/g, '').replace(/D[0-9]*\.?[0-9]*\/[0-9]+:[0-9]+/g, '');

    for (i = 0; i < text.length; i++) {
        chr   = text.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

function debug(msg) {
    if (local_config.debug) {
        console.log(msg);
    }
}

function debug_MutationObserver(msg) {
    if (local_config.debug_MutationObserver) {
        console.log(msg);
    }
}

function report_runtime(func) {
    var start = new Date();
    func();
    var delta = new Date() - start;
    console.log('[Runtime] "' + func.name + '": ' + delta + ' ms');
}

//
// #endregion Helper methods.
////////////////////

function stim_stat_icons_preferences_definition() {
    const placement_options = [
        { value: 'top-left',        label: 'Top left'      },
        { value: 'top-hcenter',     label: 'Top center'    },
        { value: 'top-right',       label: 'Top right'     },
        { value: 'vcenter-left',    label: 'Middle left'   },
        { value: 'vcenter-hcenter', label: 'Middle center' },
        { value: 'vcenter-right',   label: 'Middle right'  },
        { value: 'bottom-left',     label: 'Bottom left'   },
        { value: 'bottom-hcenter',  label: 'Bottom center' },
        { value: 'bottom-right',    label: 'Bottom right'  },
        { value: undefined,         label: '------------'  },
        { value: 'hidden-hidden',   label: 'Hide icon'     },
    ];

    return {
        key: 'stim_stat_icons_prefs',
        label: 'Stims: Show icons for boosted stats',
        options: [
            {
                key:     'show_in_inventory',
                label:   'Show stim icons in Inventory',
                help:    'Disable this to make your Inventory less visually noisy.\n' +
                         'Stim icons will still be shown on other pages.',
                type:    'boolean',
                default: 'true'
            },
            {
                key:     'hide_mental_stats_during_combat',
                label:   'Show only combat-stat icons during combat',
                type:    'boolean',
                default: 'true'
            },
            {
                key:     'show_boost_amount',
                label:   'Show stat boost granted by stim',
                type:    'boolean',
                default: 'true'
            },
            {
                key:     'show_boost_for_all_tiers',
                label:   'Show stat boost for all tiers',
                help:    'Stims meant for lower tier-players can be used, but they affect your toxicity more.',
                type:    'boolean',
                default: 'false'
            },
            {
                key:     'shift_to_avoid_overlay',
                label:   'Shift icons to not cover stim image',
                type:    'boolean',
                default: 'true'
            },
            {
                label:   'Placement of stat icons:'
            },
            {
                key:     'strength_position',
                label:   '   • Strength icon',
                type:    'select',
                default: 'top-left',
                options: placement_options
            },
            {
                key:     'agility_position',
                label:   '   • Agility icon',
                type:    'select',
                default: 'top-right',
                options: placement_options
            },
            {
                key:     'stamina_position',
                label:   '   • Stamina icon',
                type:    'select',
                default: 'vcenter-left',
                options: placement_options
            },
            {
                key:     'intelligence_position',
                label:   '   • Intelligence icon',
                type:    'select',
                default: 'vcenter-right',
                options: placement_options
            },
            {
                key:     'social_position',
                label:   '   • Social icon',
                type:    'select',
                default: 'bottom-hcenter',
                options: placement_options
            },
            {
                key:     'boost_position',
                label:   '   • Boost amount',
                type:    'select',
                default: 'vcenter-hcenter',
                options: placement_options
            },
            {
                key:     'tier_position',
                label:   '   • Tier warning',
                type:    'select',
                default: 'bottom-left',
                options: placement_options
            },
        ]
    };
}

$(document).ready(report_runtime(stim_stat_icons));
