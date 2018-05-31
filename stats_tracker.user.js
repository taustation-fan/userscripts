// ==UserScript==
// @name         stats_tracker
// @namespace    https://gist.github.com/quasidart/4b823f387b53717c4b6fac5464ebbcb5
// @version      1.0
// @description  To learn how player stats regenerate over time, this script periodically collects stats values, and stores the info only in a box within the current webpage (in a hidden <div>). To save, click the "Copy" button to copy the data into the clipboard, then save it to a file.
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      http://code.jquery.com/jquery-latest.js
// ==/UserScript==

//////////////////////////////
// Begin: User Configuration.
//

// Temporarily disable stat tracking while any of the following pages are showing.
var disable_on_pages = [
//	'/event', '/contact', '/preferences',   // Quick in-and-out pages.
//	'/archive', '/rules', '/shop',          // Reading-only pages.
//	'/email', '/forum', '/character/blogs'  // Reading and/or writing pages.
    ];

//
// End: User Configuration.
//////////////////////////////


$(document).ready(τST_stats_tracker_main);

//
// UI variables.
//
var τST_region; // Region for misc. Tau Station tools' UI.
var τSST_area;
var nodes = {};
var disabled_reason;

//
// localStorage-related variables.
//
var storage_key_prefix = "τSST_"; // Actual prefix includes player name: e.g., "τSST_PlayerName_".
var player_name;

var stats       = {}; // Keys: prefix + "stats_"       + stat name;
var stat_logs   = {}; // Keys: prefix + "stat_logs_"   + stat name;

// buff_messages is on all pages ("Well fed"); others (except location) are on player details page, aka website root.
var buffs_table = { buff_messages:[], location:"", genotype:"[genotype]" }; // Key: prefix + "buffs_table_" + buffs_table key
var buffs_summary = '';  // E.g.: # Baseline + VIP + Hotel + Healthcare 2   // (not saved to localStorage)

//
// State that we need to persist in JS.
//
var is_active_in_tab;
var buffs_changed = false;
var stats_update_timer_id;

// Misc. data.
var all_stats = { 'strength':'',
                  'agility':'',
                  'stamina':'',
                  'intelligence':'',
                  'social':'' };


// Main entry -- set up the UI, decide whether to enable the tracker, and switch it on/off.
function τST_stats_tracker_main() {
    'use strict';

    var is_active = false;

    // Get the player's name, to let us store different session data for different player characters.
    if (! player_name) {
        player_name = $('#player-name').text();
        if (player_name.length > 0) {
            storage_key_prefix += player_name + "_";
        }
    }

    τSST_add_UI();
    τSST_detect_static_buffs();
    τSST_get_stat_references();

    is_active = τSST_should_activate_tab();

    τSST_ignition_direct(is_active);

    window.addEventListener('unload', τSST_stop_timer);
}


////////////////////
// region UI-related code.
//

    function τSST_add_UI() {
        // If τST-region doesn't exist yet, add it.
        τST_region = $("#τST-region");
        if (! τST_region.length) {
            $('.stats-container').before('<div id="τST-region" class="τST-region">\n</div>\n');
            τST_region = $("#τST-region");
        }

        // Add the section for this script's UI (vs. sibling scripts).
        τST_region.append('<div id="τSST-region" class="τSST-region">\n</div>\n')
        τSST_area = $("#τSST-region");

        // Add CSS used by multiple items in our UI.
        τSST_add_css(τSST_area_css);

        // Add a [hidden] container to hold the Stat logs.
        τSST_area.append('<textarea id="τSST_stats_collection" class="percentage visuallyhidden"></textarea>');
        nodes.stats_collection = $('#τSST_stats_collection');

        // Add a toggle switch: Enable/disable in this browser Tab.
        // Adapted from: https://www.w3schools.com/howto/howto_css_switch.asp
        τSST_area.append('<label class="τSST_switch τSST_activator">\n' +
                        '    <input type="checkbox" id="τSST_enable" class="τSST_activator">\n' +
                        '    <span class="τSST_slider τSST_round τSST_activator"></span>\n' +
                        '</label>\n' +
                        '<span class="τSST_switch_desc τSST_row">\n' +
                        '    Stat Tracking\n' + 
                        '</span>\n');
        nodes.enable_checkbox = $('#τSST_enable')
        $('.τSST_switch').mouseup(τSST_ignition_event);

        // Add a button to copy the logged stats to the clipboard.
        τSST_area.append('<a id="τSST_copy_stats_to_clipboard" class="τSST_button τSST_copy" title="Copy Stat logs to clipboard">Copy</a>');
        nodes.copy_button = $('#τSST_copy_stats_to_clipboard');

        nodes.copy_button.click(function(){
            if (is_active_in_tab) {
                τSST_start_logger();
                τSST_copy_to_clipboard('τSST_stats_collection');
            }
        });

        // Our "second" button will show 1 of 2 buttons: "Reset" when inactive, or "Clear" when active.
        // - Wipe all stored data, and tell user to reload page to restart logging.
        τSST_area.append('<a id="τSST_reset_storage" class="τSST_button τSST_reset τSST_hidden" title="Remove all saved data">Reset</a>');
        nodes.reset_button = $('#τSST_reset_storage');

        nodes.reset_button.click(function() {
            τSST_reset_storage();
            $('.τSST_activator').removeClass().addClass('τSST_hidden');
            nodes.copy_button .addClass('τSST_hidden');
            nodes.reset_button.addClass('τSST_hidden');
            nodes.clear_button.addClass('τSST_hidden');
            $('.τSST_switch_desc').removeClass().addClass('τSST_switch_desc_solo')
                                    .text('Reload page to track stats').css('font-style', 'italic');
        });

        // - Clear stored logs only. (Also restarts this script, while keeping it enabled/disabled.)
        τSST_area.append('<a id="τSST_clear_logs" class="τSST_button τSST_clear τSST_hidden" title="Clear saved logs">Clear</a>');
        nodes.clear_button = $('#τSST_clear_logs');

        nodes.clear_button.click(function() {
            τSST_clear_logs();
            τSST_ignition_direct(is_active_in_tab);
        });

        // If this script was disabled automatically (e.g., on load), tell the user why.
        τSST_area.append('<div id="τSST_disabled_reason" class="τSST_disabled_reason centered"></div>');
        nodes.disabled_reason = $('#τSST_disabled_reason');

        τSST_update_disabled_reason();
    }

    function τSST_update_disabled_reason(reason) {
        if (reason == undefined) {
            reason = disabled_reason;
        }

        nodes.disabled_reason.empty().append(reason);
    }

    function τSST_should_activate_tab() {
        // If the user explicitly turned off logging in this tab, leave it turned off here.
        if (sessionStorage[storage_key_prefix + 'user-turned-off-tracker']) {
            disabled_reason = 'User turned off logging in this tab.';
            return false;
        }

        // If this tab is showing a page outside the main game, don't enable logging automatically.
        page_path = window.location.pathname;
        for (var index in disable_on_pages) {
            var prefix = disable_on_pages[index];

            if (page_path.startsWith(prefix)) {
                disabled_reason = "Not tracking while outside game area.<br>(If desired, turn on above.)</br>";
                return false;
            }
        }

        return true;
    }

    function τSST_ignition_direct(is_active) {
        console.log('τSST_ignition_manual(' + is_active + ')');
        nodes.enable_checkbox.get()[0].checked = is_active;
        τSST_ignition_worker(is_active);
    }

    function τSST_ignition_event(is_active) {
        console.log('τSST_ignition_event(' + is_active + ')');

        if (is_active != undefined && Object.getOwnPropertyNames(is_active).length) {
            is_active = undefined;
        }

        // Note: When called by a mouse click, the checkbox has _not_ been updated yet.
        if (is_active == undefined) {
            is_active = ! nodes.enable_checkbox.get()[0].checked;
        }
        console.log('τSST_ignition_event: New state: ' + is_active);

        // If the user explicitly turns logging on/off in this tab, save it for this tab:
        // We'll remember the user's preference if the tab refreshes or loads a new page.
        if (is_active == false && is_active_in_tab) {
            if (τSST_should_activate_tab()) {
                disabled_reason = 'User turned off logging in this tab.';
            }
            sessionStorage.setItem(storage_key_prefix + 'user-turned-off-tracker', true);
        } else if (is_active && is_active_in_tab == false) {
            sessionStorage.removeItem(storage_key_prefix + 'user-turned-off-tracker');
        }

        τSST_ignition_worker(is_active);
    }

    function τSST_ignition_worker(is_active) {
        if (is_active) {
            nodes.copy_button .removeClass('τSST_button_disabled');
            nodes.clear_button.removeClass('τSST_hidden');
            nodes.reset_button.addClass   ('τSST_hidden');
            τSST_update_disabled_reason("");
        } else {
            nodes.copy_button .addClass   ('τSST_button_disabled');
            nodes.clear_button.addClass   ('τSST_hidden');
            nodes.reset_button.removeClass('τSST_hidden');
            τSST_update_disabled_reason(disabled_reason);
        }

        if (is_active) {
            warn_user_if_core_buffs_missing();
        }

        // Do these only if we're changing our "active?" state.
        if (is_active_in_tab != is_active) {
            is_active_in_tab = is_active;

            if (is_active) {
                τSST_start_logger();
            } else {
                τSST_stop_timer();
            }
        }
    }

    function get_time_in_gct(node) {
        return (node || $('#gct_display')).text().replace(/[A-Za-z]/g, "");
    }

    function get_time_in_numeric_gct(node) {
        return gct_time_to_numeric(get_time_in_gct(node));
    }

    function gct_time_to_numeric(time_str) {
        return time_str.replace(/[^0-9]/g, "");
    }

    function get_refill_timer_in_gct_units(node) {
        var remaining = node.find('.refill-timer').text().replace('/', '').replace(':', '');
        return remaining;
    }

//
// endregion UI-related code.
////////////////////

////////////////////
// region LocalStorage-specific code.
//

    // Delete all stored data used by this script.
    function τSST_reset_storage() {
        τSST_clear_logs();

        for (var item in localStorage) {
            if (item.startsWith(storage_key_prefix)) {
                console.log('τSST_reset_storage(): Removing localStorage item: ' + item);
                localStorage.removeItem(item);
            }
        }
    }

    // Clear all stored logs saved by this script.
    function τSST_clear_logs() {
        for (var item in localStorage) {
            if (item.startsWith(storage_key_prefix + 'stat_logs_') ||
                item.startsWith(storage_key_prefix + "stats_")) {
                console.log('τSST_clear_logs(): Removing localStorage item: ' + item);
                localStorage.removeItem(item);
            }
        }

        // Also clear internal data that affects logging.
        stats = {};
        stat_logs = {};
        nodes.stats_collection.text("");

        is_storage_initialized = false;
    }

//
// endregion LocalStorage-specific code.
////////////////////

////////////////////
// region Stats tracking.
//

    // Collect initial references for each Stat.
    function τSST_get_stat_references() {
        nodes.focus     = $('#stats-panel div[class="stat-container focus"]');
        nodes.focus_pct = nodes.focus.find('div[class="percentage"]');

        for (var stat in all_stats) {
            nodes[stat]          = $('#stats-panel div[class="stat-container ' + stat + '"]');
            nodes[stat + '_pct'] = nodes[stat].find('span[class="pc"]');
        }
    }

    // Record any updates to the player's stat values (plus any active buffs).
    function τSST_start_logger() {
        if (! localStorage[storage_key_prefix + 'buffs_table_genotype']) {
            τSST_detect_buff_genotype();
        }

        τSST_detect_dynamic_buffs();
        τSST_record_current_stats();
    }

    function τSST_prep_log_for_stat(stat) {
        var should_start_new_section = buffs_changed;
        var add_header = false;
        var label = stat[0].toLocaleUpperCase() + stat.substr(1);

        stat_logs[stat] = localStorage[storage_key_prefix + 'stat_logs_' + stat];

        // If a log is already present, keep using it. (Code elsewhere is responsible for deleting existing logs if/when needed.)
        if (! stat_logs[stat]) {
            console.log('Initializing ' + label + ' log.');
            stat_logs[stat] = '';
            add_header = true;

        } else if (should_start_new_section) {
            console.log('Starting new section in ' + label + ' log.');
            stat_logs[stat] += '\n';
            add_header = true;
        } // Otherwise, just keep using it as-is.

        if (add_header) {
            τSST_save_current_buffs_description();
            stat_logs[stat] += 'Focus / ' + label + buffs_summary + '\n';
        }

        warn_user_if_core_buffs_missing(stat);

        localStorage.setItem(storage_key_prefix + 'stat_logs_' + stat, stat_logs[stat]);
    }

    function warn_user_if_core_buffs_missing(stat)
    {
        if (localStorage[storage_key_prefix + 'buffs_table_vip']      == undefined ||
            localStorage[storage_key_prefix + 'buffs_table_genotype'] == undefined ||
            (stat && ( stat_logs[stat].includes(vip_placeholder) ||
                       stat_logs[stat].includes(genotype_placeholder) )))
        {
            // disabled_reason = 'Need player info; please click player name.';
            disabled_reason = 'Need Genotype; please click player name.';
            τSST_update_disabled_reason();
        } else if (disabled_reason) {
            disabled_reason = undefined;
            τSST_update_disabled_reason();
        }
    }

    function τSST_record_current_stats() {
        console.log('Recording current stats.');

        for (var stat in all_stats) {
            // If we don't have a value for the stat yet, use the last-stored value.
            if (! stats[stat]) {
                stats[stat] = localStorage[storage_key_prefix + "stats_" + stat];
            }
        }

        // Get the current value for all other stats.
        var stats_new         = {};
        var combined_logs     = [];
        var should_save_buffs = false;

        var stat_timer         = "";
        var longest_stat_timer = "";

        // Get the current Focus value. (Note: Focus's value string contains a "%", so we need to remove it.)
        stats_new.focus = nodes.focus_pct.text();
        if (stats_new.focus.endsWith("%")) {
            stats_new.focus = stats_new.focus.substr(0, stats_new.focus.length - 1);
            localStorage.setItem(storage_key_prefix + "stats_" + "focus", stats_new.focus);

            stat_timer = get_refill_timer_in_gct_units(nodes.focus);
            if (longest_stat_timer < stat_timer) {
                longest_stat_timer = stat_timer;
            }
        }

        for (var stat in all_stats) {
            stats_new[stat] = nodes[stat + '_pct'].text();

            if (! stat_logs[stat]) {
                stat_logs[stat] = localStorage[storage_key_prefix + 'stat_logs_' + stat];
            }

            // Log this stat if it changed, or if it's not maxxed out and Focus changed (i.e., dropped).
            if (stats[stat] != stats_new[stat] ||
                (stats[stat] < "100" && stats.focus != stats_new.focus ))
            {
                // If a buff changed, log the previous stats so it shows the current increment.
                if (buffs_changed) {
                    stat_logs[stat] += stats.focus + ' / ' + stats[stat] + '\n';
                }

                τSST_prep_log_for_stat(stat);  // Initialize log, append to log, or append a new header if needed.

                stats[stat]      = stats_new[stat];
                stat_logs[stat] += stats_new.focus + ' / ' + stats[stat] + '\n';

                localStorage.setItem(storage_key_prefix + "stats_"     + stat, stats[stat]);
                localStorage.setItem(storage_key_prefix + "stat_logs_" + stat, stat_logs[stat]);
            }

            combined_logs.push(stat_logs[stat] + '\n#-----------------------------------------------------------\n');

            // If one or more stats haven't reached 100%, keep tracking stats.
            stat_timer = get_refill_timer_in_gct_units(nodes[stat]);
            if (longest_stat_timer < stat_timer) {
                longest_stat_timer = stat_timer;
            }
        }

        // Update our hidden Stat logs element on the page.
        nodes.stats_collection.text(combined_logs.join('\n'));

        // Update these for our next round of logging.
        buffs_changed = false;
        stats.focus = stats_new.focus;

        τSST_start_timer(longest_stat_timer);
    }

    var STAT_REGEN_PERIOD = 347;    // In GCT, 347 units (0.00347 of a day) = 299.8 seconds (about 5 minutes).
    var GCT_TO_24H_TIME   = (60 * 60 * 24) / 100000;

    function τSST_start_timer(longest_stat_timer) {
        var timer_delay    = 15 * 60;
        var timer_delay_ms = 0;
        var next_timer_GCT;

        // // If any Stats are not at 100%, call this method again in <5 minutes to catch regenerating Stat data.
        if (longest_stat_timer.length > 0) {
            longest_stat_timer = longest_stat_timer / 1; // Convert to a numeric value.
            if (longest_stat_timer > 0) {
                next_timer_GCT = longest_stat_timer % STAT_REGEN_PERIOD;
                if (next_timer_GCT == 0) {
                    next_timer_GCT = STAT_REGEN_PERIOD;
                }
                next_timer_GCT += 20;  // Give the UI some extra units (almost-seconds) to receive the update.
                timer_delay = next_timer_GCT * GCT_TO_24H_TIME;
            }
        }
        timer_delay_ms = timer_delay * 1000;

        var date = new Date();
        date.setTime(Date.now() + timer_delay_ms);
        var strDate = date.toLocaleTimeString();

        τSST_stop_timer();
        console.log('Starting timer: ' + timer_delay + ' seconds. (aka ' + strDate + ')');
        stats_update_timer_id = window.setTimeout(function(){ τSST_start_logger(); }, timer_delay_ms);
    }

    function τSST_stop_timer() {
        if (stats_update_timer_id) {
            window.clearTimeout(stats_update_timer_id);
            stats_update_timer_id = undefined;
        }
    }

//
// endregion Stats tracking.
////////////////////

////////////////////
// region Buffs detection.
//

    // Buffs that don't change without a page reload.
    function τSST_detect_static_buffs() {
        // Available only in Player Details page (http://alpha.taustation.space/ - root page).
        τSST_detect_buff_genotype();
        τSST_detect_buff_vip(); // TODO: Does this show the GCT time when VIP will end? If so, add to "...dynamic...()" below.
        τSST_detect_buff_skills();

        // Available on most (any?) page.
        τSST_detect_buff_hotel_room();
    }

    // Buffs that could change without a page reload (e.g., if another tab updated the stored data).
    function τSST_detect_dynamic_buffs() {
        if (! localStorage[storage_key_prefix + 'buffs_table_genotype']) {
            τSST_detect_buff_genotype();
        }

        τSST_detect_buff_well_fed();
    }

    var genotype_placeholder = '[genotype]';

    // Buff check: Genotype
    function τSST_detect_buff_genotype() {
        var genotype_placeholder = '[genotype]';
        buffs_table.genotype = localStorage[storage_key_prefix + 'buffs_table_genotype'];

        // Since clones can change a player's genotype, check it regardless of localStorage.
        var genotype_node = $('dt:contains("Genotype:") + dd');
        if (genotype_node.length) {
            buffs_table.genotype = genotype_node.text();
        }

        // If the genotype was just discovered for the first time, update our logs accordingly.
        // If it has actually changed, note the fact for our callers.
        if (buffs_table.genotype != localStorage[storage_key_prefix  + 'buffs_table_genotype']) {
            var first_discovery = false;

            for (var stat in all_stats) {
                var this_log = localStorage[storage_key_prefix + 'stat_logs_' + stat];

                if (! this_log) {
                    first_discovery = true;
                } else if (this_log.includes(genotype_placeholder)) {
                    this_log = this_log.replace(genotype_placeholder, buffs_table.genotype);
                    localStorage.setItem(storage_key_prefix + 'stat_logs_' + stat, this_log);

                    first_discovery = true;
                }
            }

            if (first_discovery) {
                // Technically, this didn't change; this is just the first time we could detect it.
                localStorage.setItem(storage_key_prefix + 'buffs_table_genotype', buffs_table.genotype);
            } else {
                // We already had a real value, so this has actually changed.
                buffs_changed = true;
            }
        }

        // Other than the above scenario, buff updates are stored only when actually updating a stat log.
    }

    var vip_placeholder = '[is vip?]';

    // Buff check: VIP Status
    function τSST_detect_buff_vip() {
        buffs_table.vip = localStorage[storage_key_prefix + 'buffs_table_vip'];

        var vip_node = $('dt:contains("VIP Status:") + dd');
        if (vip_node.length) {
            if (vip_node.find(':contains("Get VIP status!")').length) {
                buffs_table.vip = "non-VIP";
            } else {
                buffs_table.vip = "VIP";
            }
        }

        // If the VIP status was just discovered for the first time, update our logs accordingly.
        // If it has actually changed, note the fact for our callers.
        if (buffs_table.vip != localStorage[storage_key_prefix  + 'buffs_table_vip']) {
            var first_discovery = false;

            for (var stat in all_stats) {

                var this_log = localStorage[storage_key_prefix + 'stat_logs_' + stat];
                if (! this_log) {
                    first_discovery = true;
                } else if (this_log.includes(vip_placeholder)) {
                    this_log = this_log.replace(vip_placeholder, buffs_table.vip);
                    localStorage.setItem(storage_key_prefix + 'stat_logs_' + stat, this_log);

                    first_discovery = true;
                }
            }

            if (first_discovery) {
                // Technically, this didn't change; this is just the first time we could detect it.
                localStorage.setItem(storage_key_prefix + 'buffs_table_vip', buffs_table.vip);
            } else {
                // We already had a real value, so this has actually changed.
                buffs_changed = true;
            }
        }

        // Other than the above scenario, buff updates are stored only when actually updating a stat log.
    }

    // Buff check: Skills learned from the University. (E.g., Healthcare X)
    function τSST_detect_buff_skills() {
    }

    // Buff check: "Well fed"
    function τSST_detect_buff_well_fed() {
        var page_buffs_node = $(".buff-messages").find(".timer-message");
        if (page_buffs_node.length) {
            var buffs_list = buffs_table.buff_messages;
            var buffs_list_new = page_buffs_node.find("td:first").map(function() {
                return $(this).text();
            }).get();

            var list_temp = [];
            var buff;

            while (buffs_list && buffs_list.length > 0) {
                buff = buffs_list.shift();
                if (buffs_list_new.includes(buff)) {
                    list_temp.push(buff);
                }
            }
            buffs_list = list_temp;

            while (buffs_list_new.length > 0) {
                buff = buffs_list_new.shift();
                if (! buffs_list.includes(buff)) {
                    buffs_list.push(buff);
                }
            }

            buffs_table.buff_messages = buffs_list;
        }

        // If this buff has changed, note the fact for our callers.
        buffs_table.buff_msgs_summary = buffs_table.buff_messages.join(',');
        if (localStorage[storage_key_prefix + 'buffs_table_buff_messages'] != buffs_table.buff_msgs_summary) {
            buffs_changed = true;
        }

        // Buff updates are stored only when actually updating a stat log.
    }

    // Buff check: In Hotel room
    function τSST_detect_buff_hotel_room() {
        buffs_table.location = undefined;

        if ($(".zone-notice").text().includes("now in a safe zone") ||
            $('a[href="/area/hotel-rooms/enter-room"]').text().includes("Return to hotel room view"))
        {
            buffs_table.location = "Hotel";
        }

        // If this buff has changed, note the fact for our callers.
        if (localStorage[storage_key_prefix + 'buffs_table_location'] !=  buffs_table.location) {
            buffs_changed = true;
        }

        // Buff updates are stored only when actually updating a stat log.
    }

    function τSST_save_current_buffs_description() {
        τSST_store_current_buffs();

        buffs_summary = " # " + buffs_table.genotype;

        if (buffs_table.vip) {
            buffs_summary += " + " + buffs_table.vip;
        }

        if (buffs_table.buff_messages.length > 0) {
            buffs_summary += " + " + buffs_table.buff_messages.join(" + ");
        }

        if (buffs_table.location) {
            buffs_summary += " + " + buffs_table.location;
        }
    }

    function τSST_store_current_buffs() {
        if (buffs_table.genotype && buffs_table.genotype != genotype_placeholder) {
            localStorage.setItem(storage_key_prefix + 'buffs_table_genotype', buffs_table.genotype);
        } else {
            buffs_table.genotype = genotype_placeholder;
        }

        if (buffs_table.vip && buffs_table.vip != vip_placeholder) {
            localStorage.setItem(storage_key_prefix + 'buffs_table_vip', buffs_table.vip);
        } else {
            buffs_table.vip = vip_placeholder;
        }

        // TODO: Skills.

        localStorage.setItem(storage_key_prefix + 'buffs_table_buff_messages', buffs_table.buff_msgs_summary);

        if (buffs_table.location) {
            localStorage.setItem(storage_key_prefix + 'buffs_table_location', buffs_table.location);
        } else {
            localStorage.removeItem(storage_key_prefix + 'buffs_table_location');
        }
    }

//
// endregion Buffs detection.
////////////////////

////////////////////
// region Miscellaneous data. (E.g., CSS & related functions.)
//

    // Note: This works for form <input id="foo" value="copied text" /> elements, but not arbitrary elements.
    function τSST_copy_to_clipboard(idElement) {
        // Ref: https://www.w3schools.com/howto/howto_js_copy_clipboard.asp
        var element = document.getElementById(idElement);
        element.select();
        document.execCommand("copy");

        var msg = element.value;
        if (msg.length > 203) {
            msg = msg.substr(0, element.value.indexOf('\n', 200) + 1) + '...';
        }
        alert('Copied player stat logs to the clipboard.\n\nLog starts with:\n' +
              msg);
    }

    function τSST_add_css(css){
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

    function τSST_block_to_string(block) {
        // Ref: https://stackoverflow.com/questions/805107/creating-multiline-strings-in-javascript/805755#805755
        return block.toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1];
    }

    // Leave this large text block out of the way, at the bottom of the script.
    var τSST_area_css = τSST_block_to_string(function() {/*
        .τSST_row {
            position: relative;
            display: inline-block;
            height: 21px;
            bottom: 5px;
        }

        .τST-region {
            display: flow-root;
            border: 1px solid #13628b;
            background-color: #242634;
            margin: 5px 1px;
        }

        .τSST-region {
            padding-top: 4px;
            padding-bottom: 0;
            padding-left: 3px;
            padding-right: 3px;
            border: 1px solid #13628b;
            margin: 1px;
        }

        .τSST_disabled_reason {
            font-size: 75%;
            font-style: italic;
        }

        .centered {
            height: 100%;
            display: -webkit-flexbox;
            display: -ms-flexbox;
            display: -webkit-flex;
            display: flex;
            -webkit-flex-align: center;
            -ms-flex-align: center;
            -webkit-align-items: center;
            align-items: center;
            justify-content: center;
        }

        a.τSST_button {
            position: relative;
            height: 2.875em;
            width: 38%;
            margin-left: 2%;       
            margin-right: 2%;
            bottom: 5px;
            padding: .2em .2em;
            color: #d1e6dd;
            cursor: pointer;
            text-align: center;
            font-size: 90%;
            text-decoration: none;
        }

        a.τSST_button {
            border: 1px solid #13628b;
            background-color: #14181b;
        }
        a.τSST_button:hover {
            background-color: #14374a;
        }

        a.τSST_clear {
            border: 1px solid #279702;
            padding: .2em .3em;
        }
        a.τSST_clear:hover {
            background-color: #144b01;
        }

        a.τSST_reset {
            border: 1px solid #df7d27;
        }
        a.τSST_reset:hover {
            background-color: #c24004;
        }

        a.τSST_button_disabled, a.τSST_button_disabled:hover {
            padding-left: 0.1em;
            padding-right: 0.3em;
            background-color: transparent;
            font-style: italic;
            cursor: inherit;
            border-style: dashed;
        }

        .τSST_hidden {
            display: none;
            border: 0;
            height: 0;
            width: 0;
            margin: 0;
            padding: 0;
        }

        .τSST_switch {
            position: relative;
            display: inline-block;
            width: 36px;
            height: 21px;
            bottom: -1px;
        }

        .τSST_switch input { display:none; }

        .τSST_switch_desc {
            bottom: 4px;
            font-size: 95%;
        }

        .τSST_switch_desc_solo {
            font-size: 95%;
        }

        .τSST_slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: transparent; //#ccc;
            -webkit-transition: .4s;
            transition: .4s;
            border: 1px solid #187db4; // #13628b;
            margin: 1px;
        }

        .τSST_slider:before {
            position: absolute;
            content: "";
            height: 13px;
            width: 13px;
            left: 4px;
            bottom: 2px;
            background-color: white;
            -webkit-transition: .4s;
            transition: .4s;
        }

        input:checked + .τSST_slider {
            background-color: #1e517b;
        }

        input:focus + .τSST_slider {
            box-shadow: 0 0 1px #2196F3;
        }

        input:checked + .τSST_slider:before {
            -webkit-transform: translateX(13px);
            -ms-transform: translateX(13px);
            transform: translateX(13px);
        }

        .τSST_slider.τSST_round {
            border-radius: 16px;
        }

        .τSST_slider.τSST_round:before {
            border-radius: 50%;
        }
    */});

//
// endregion Large data. (E.g., CSS & related functions.)
////////////////////
