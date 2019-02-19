// ==UserScript==
// @name         Tau Station: Combat Log
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://rawgit.com/taustation-fan/userscripts/master/combat-log.user.js
// @version      1.3.2
// @description  Records a log of any combat you're involved in.
// @author       Mark Schurman (https://github.com/quasidart)
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @require      https://rawgit.com/taustation-fan/userscripts/master/taustation-tools-common.js
// ==/UserScript==
//
// License: CC-BY-SA
//
// Disclaimer:
// These are quick-and-dirty one-off scripts, and do not reflect the author's style or quality of work when developing production-ready software.
//
// Changelist:
//  - v1.0: Initial commit.
//  - v1.1: Misc. refinements.
//  - v1.2: Support logging "being attacked".
//  - v1.2.1: Fix issue appearing with 2018-07-25's Wednesday update: In Chat window, messages frame was displaying zero text when this script was enabled.
//  - v1.3: Add an icon to control UI (via taustation-tools-common.js's Icons code); also, improved in-combat detection logic.
//  - v1.3.1: Fix for "attacker fled" scenario.
//

//////////////////////////////
// Begin: User Configuration.
//

// Temporarily disable stat tracking while any of the following pages are showing.
var tSCL_config = {
    'debug': false,
    'remove_visuallyhidden_content': false, // If true: Deletes all accessibility-related "visuallyhidden"-class content from the log. (If you use a screenreader, you may not want to delete them.)
    'show_when_in_combat': true,            // If true: Combat Log UI indicates when it is recording combat.
};

//
// End: User Configuration.
//////////////////////////////

$(document).ready(tST_combat_log_main);

//
// UI variables.
//
var nodes = {};

//
// localStorage-related variables.
//
var storage_key_prefix = "tSCL_"; // Actual prefix includes player name: e.g., "tSCL_PlayerName_".

// Main entry -- set up any UI, decide whether to enable this script, and switch it on/off.
async function tST_combat_log_main() {
    'use strict';

    storage_key_prefix = tST_get_storage_prefix(storage_key_prefix);

    tSCL_add_UI();

    tSCL_log_combat_activity();

    // Finally, disable the "Show" button if the log is empty.
    if (! tSCL_combat_log_pending()) {
        completely_disable_show_button();
    }
}

////////////////////
// #region UI-related code.
//

    function tSCL_add_UI() {
        // Add the section for this script's UI (vs. sibling scripts).
        tST_region.append('<div id="tSCL-region" class="tST-section tST-control-bar">Combat Log\n</div>\n')
        var tSCL_area = $("#tSCL-region");

        // Add an icon that shows/hides the above UI, and can indicate info about the current combat log.
        tST_add_icon('#combat-log-icon', '#tSCL-region', `
<a id="combat-log-icon" class="tST-icon-link" title="Combat log:">
    <li class="tST-icons-list-entry">
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" width="18.9" height="19" version="1.1">
            <g style="fill:none;stroke-dashoffset:691.29;stroke-opacity:1;stroke-width:138.26;">
                <g id="right-side" transform="matrix(-.043397 0 0 .043397 23.413 -.78549)">
                    <g transform="scale(.1)">
                    <path id="opponent-weapon" style="stroke:#ff722f;" d="m1186.4 4549.2c-41.959-16.691-88.798-58.91-118.07-105.06-25.371-39.274-28.298-54.001-28.298-120.77 0-108 6.8306-128.62 58.548-183.6 62.451-66.765 82.943-77.565 154.18-89.347l61.476-9.8184 321.04-324.99c177.6-178.69 322.01-328.92 322.01-333.83s-135.64-146.29-302.5-314.19c-259.56-261.17-323.97-333.83-297.62-333.83 2.9273 0 58.548 19.637 124.9 43.201 65.379 24.546 182.47 64.801 260.54 90.329l141.49 47.128 84.895 82.475 83.919 82.474 1405.2-1412.9 1404.2-1413.8 111.24-16.691c61.476-8.8364 156.13-25.528 210.77-36.328 54.645-9.8184 124.9-18.655 155.15-18.655h55.621l-5.8545 66.765c-2.9277 36.328-11.71 94.256-19.516 129.6-14.637 59.892-22.443 108-44.887 270.01l-9.7578 68.729-1244.1 1246.9c-684.04 686.31-1315.4 1321.6-1402.2 1411.9l-159.06 164.95 80.016 80.511 79.04 80.511 88.798 262.15c47.814 143.35 87.822 266.08 87.822 271.97 0 5.8911-4.8789 10.8-9.758 10.8-5.8548 0-146.37-136.48-312.26-304.37-165.89-166.91-307.38-304.37-314.21-304.37-6.8306 0-158.08 146.29-335.68 324.99-304.45 305.35-323.97 327.93-328.84 366.23-12.685 93.275-66.354 172.8-142.47 212.08-30.25 14.728-57.572 19.637-115.14 18.655-41.96 0-86.846-4.9092-100.51-9.8184z"/>
                    </g>
                </g>
                <g id="left-side" transform="matrix(.043397 0 0 .043397 -4.5133 -.78549)">
                    <g transform="scale(.1)">
                    <path id="player-weapon" style="stroke:#08a1ec;" d="m1186.4 4549.2c-41.959-16.691-88.798-58.91-118.07-105.06-25.371-39.274-28.298-54.001-28.298-120.77 0-108 6.8306-128.62 58.548-183.6 62.451-66.765 82.943-77.565 154.18-89.347l61.476-9.8184 321.04-324.99c177.6-178.69 322.01-328.92 322.01-333.83s-135.64-146.29-302.5-314.19c-259.56-261.17-323.97-333.83-297.62-333.83 2.9273 0 58.548 19.637 124.9 43.201 65.379 24.546 182.47 64.801 260.54 90.329l141.49 47.128 84.895 82.475 83.919 82.474 1405.2-1412.9 1404.2-1413.8 111.24-16.691c61.476-8.8364 156.13-25.528 210.77-36.328 54.645-9.8184 124.9-18.655 155.15-18.655h55.621l-5.8545 66.765c-2.9277 36.328-11.71 94.256-19.516 129.6-14.637 59.892-22.443 108-44.887 270.01l-9.7578 68.729-1244.1 1246.9c-684.04 686.31-1315.4 1321.6-1402.2 1411.9l-159.06 164.95 80.016 80.511 79.04 80.511 88.798 262.15c47.814 143.35 87.822 266.08 87.822 271.97 0 5.8911-4.8789 10.8-9.758 10.8-5.8548 0-146.37-136.48-312.26-304.37-165.89-166.91-307.38-304.37-314.21-304.37-6.8306 0-158.08 146.29-335.68 324.99-304.45 305.35-323.97 327.93-328.84 366.23-12.685 93.275-66.354 172.8-142.47 212.08-30.25 14.728-57.572 19.637-115.14 18.655-41.96 0-86.846-4.9092-100.51-9.8184z"/>
                    </g>
                </g>
            </g>
        </svg>
    </li>
</a>
`);
        nodes.icon = {};
        nodes.icon.player_weapon   = tST_icons.find('#player-weapon');
        nodes.icon.opponent_weapon = tST_icons.find('#opponent-weapon');

        // - Add a button pair: Show/Hide the combat log pop-over window.
        if (tSCL_config.show_when_in_combat) {
            tSCL_area.append('<span id="tSCL_status" class="tST-user-msg" style="font-style:italic;"></span>\n');
        }
        nodes.status = $('#tSCL_status');   // Bug prevention: If the above is skipped, ensure this remains a valid jQuery object (albeit an "empty" one).

        // - Add a button pair: Show/Hide the combat log pop-over window.
        tSCL_area.append('<a id="tSCL_show_combat_log" class="tST-button" title="Show Combat log window">Show</a>\n');
        nodes.show_button = $('#tSCL_show_combat_log');
        nodes.show_button.click(function(){
            if (tSCL_combat_log_pending()) {
                tSCL_show_combat_log_window(true);
            }
        });
        tSCL_area.append('<a id="tSCL_hide_combat_log" class="tST-button tST-hidden" title="Hide Combat log window">Hide</a>\n');
        nodes.hide_button = $('#tSCL_hide_combat_log');
        nodes.hide_button.click(function(){
            tSCL_show_combat_log_window(false);
        });

        // - Add a button: Clear stored log & related state.
        tSCL_area.append('<a id="tSCL_clear_log" class="tST-button tST-clear" title="Clear saved log">Clear</a>\n');
        nodes.clear_button = $('#tSCL_clear_log');
        nodes.clear_button.click(function() {
            tSCL_clear_log();
        });

        // Add the Combat log pop-over window, as hidden. Includes two containers:
        // one for the Combat log, and a hidden one used when constructing a log entry.
        var combat_log_window_html = `
<div id="combat_log_window" class="tST-container tST-floating-box tST-hidden">
    <div class="tST-section tST-floatbox-header">
        <span class="tST-title">Combat Log</span>
    </div>
    <div class="content tST-floatbox-scrollable-content">
        <div id="combat_log_contents" class="chat-messages-container"></div>
        <div id="combat_log_scratch" class="tST-hidden"></div>
    </div>
    <div class="tST-section tST-floatbox-footer">
        <span id="combat_log_footer" class="tST-control-bar"></span>
    </div>
</div>
`;
        // Note: 2018-07-25's Wednesday update (incl. Chat channels) now want zero ".content" elements before the the Chat window's "div.content" element. (Issue: Chat messages frame will appear empty.)
        $('section#chat').after(combat_log_window_html);
        nodes.combat_log = {};
        nodes.combat_log.window   = $('#combat_log_window');
        nodes.combat_log.scratch  = $('#combat_log_scratch');
        nodes.combat_log.contents = $('#combat_log_contents');
        nodes.combat_log.footer   = $('#combat_log_footer');

        // - Add a button to close the combat log window. (Will also change "Show" button to "Close".)
        nodes.combat_log.footer.append('<a id="tSCL_close_combat_log" class="tST-button" title="Close combat log window">Close</a>\n');
        nodes.close_button = $('#tSCL_close_combat_log');
        nodes.close_button.click(function(){
            tSCL_show_combat_log_window(false);
        });

        // - Add a button to download the combat log to a local file.
        nodes.combat_log.footer.append('<a id="tSCL_download_combat_log" class="tST-button" title="Download Combat log to a local file.">Download</a>\n');
        nodes.download_button = $('#tSCL_download_combat_log');
        nodes.download_button.click(function(){
            if (tSCL_combat_log_pending()) {
                download_html_to_file(nodes.combat_log.contents.html(), 'combat_log', true);
            }
        });

        // Finally, start in the appropriate state.
        tSCL_show_combat_log_window(false); // TODO: Enable reading/writing this state from/to localStorage?
    }

    function tSCL_combat_log_pending() {
        return localStorage.hasOwnProperty(storage_key_prefix + 'combat_log');  // Better perf than actually manipulating the large saved text string.
    }

    function completely_disable_show_button() {
        nodes.show_button .addClass('tST-button-disabled').attr('title', 'Combat log is currently empty.');
        nodes.clear_button.addClass('tST-button-disabled').attr('title', 'Combat log is currently empty.');
    }

    function tSCL_show_combat_log_window(show_window) {
        if (show_window == undefined) {
            show_window = false;
            if (tSCL_combat_log_pending() && nodes.combat_log.window.hasClass("tST-hidden")) {
                show_window = true;
            }
        }

        if (show_window) {
            nodes.show_button.addClass('tST-hidden');
            nodes.hide_button.removeClass('tST-hidden');

            var log_data = localStorage[storage_key_prefix + 'combat_log'];
            if (! log_data) {
                log_data = "";
            }
            present_log_in_container(log_data, nodes.combat_log.contents);

            // If the chat log is already up, show this on top of it; otherwise, show chat log on top.
            if ($('#chat').attr('class') != 'collapsed') {
                nodes.combat_log.window.css('z-index', $('#chat').css('z-index') + 1)
            } else {
                nodes.combat_log.window.css('z-index', $('#chat').css('z-index') - 1)
            }
            nodes.combat_log.window.removeClass('tST-hidden');

            window.addEventListener("keyup", tSCL_close_log_on_Escape_key);
        } else {
            window.removeEventListener("keyup", tSCL_close_log_on_Escape_key);

            nodes.combat_log.window.addClass('tST-hidden');
            nodes.combat_log.contents.html("");

            nodes.hide_button.addClass('tST-hidden');
            nodes.show_button.removeClass('tST-hidden');
        }

        debug((show_window ? 'Showing' : 'Hiding') + ' Combat log window.');
    }

    function tSCL_close_log_on_Escape_key(keyboardEvent) {
        if (keyboardEvent.key == "Escape" ||
            keyboardEvent.keyCode == 27) {
            tSCL_show_combat_log_window(false);
        }
    }

    function tSCL_show_combat_status(in_combat) {
        var color;

        if (tSCL_config.show_when_in_combat) {
            if      (in_combat == undefined) {
                var log_exists = tSCL_combat_log_pending();
                if (! log_exists)        { text = '(empty)';       color = text.grey_out;  show_icon_clear(); } // Text: dark grey (no log), via alpha channel
                else                     { text = '(idle)';        color = text.normal;    show_icon_idle();  } // Text: "White"   (default)
            }
            else if (in_combat)          { text = '(in combat)';   color = text.warning;  // Was '#df7d27';   }  // Text: Orange    (warning)
                if (localStorage[storage_key_prefix + 'combat_being_attacked']) {
                    show_icon_defending();
                } else {
                    show_icon_attacking();
                }
            }
            else if (in_combat == false) { text = '(combat over)'; color = stroke.normal;  show_icon_idle();  } // Text: Blue      (finished, win or loss)

            nodes.status.css({ 'color': color });
            nodes.status.text(text);
        }
    }

    var fill = {};
    fill.clear   = '#0000';
    fill.normal  = '#1e517b';
    fill.warning = '#df7d27';

    var stroke = {};
    stroke.normal  = '#08a1ec';
    stroke.warning = '#ff722f';

    var text = {};
    text.normal    = '#e2faf0';
    text.grey_out  = text.normal + '60';    // "Grey" = lowered to 60% opacity.
    text.warning   = stroke.warning;

    // Both icons = outline: No log yet (no combat has occurred).
    function show_icon_clear() {
        // $('#combat-log-icon #player-weapon')  .css({ 'stroke': colors.normal, 'fill': colors.clear });
        // $('#combat-log-icon #opponent-weapon').css({ 'stroke': colors.normal, 'fill': colors.clear });
        nodes.icon.player_weapon  .css({ 'stroke': stroke.normal, 'fill': fill.clear });
        nodes.icon.opponent_weapon.css({ 'stroke': stroke.normal, 'fill': fill.clear });
    }

    // Both icons filled in: Not in combat, but log isn't empty (combat has occurred).
    function show_icon_idle() {
        nodes.icon.player_weapon  .css({ 'stroke': stroke.normal, 'fill': fill.normal });
        nodes.icon.opponent_weapon.css({ 'stroke': stroke.normal, 'fill': fill.normal });
    }

    // Player icon is orange: Player is currently attacking someone (NPC or other player).
    function show_icon_attacking() {
        nodes.icon.player_weapon  .css({ 'stroke': stroke.warning, 'fill': fill.warning });
        nodes.icon.opponent_weapon.css({ 'stroke': stroke.normal,  'fill': fill.normal });
    }

    // Opponent icon is orange: Player is currently being attacked by another player.
    function show_icon_defending() {
        nodes.icon.player_weapon  .css({ 'stroke': stroke.normal,  'fill': fill.normal });
        nodes.icon.opponent_weapon.css({ 'stroke': stroke.warning, 'fill': fill.warning });
    }


//
// #endregion UI-related code.
////////////////////

////////////////////
// #region When relevant, record the current page's combat details into the Combat log.
//
    var combat_log_scratch;
    var combat_log;

    function tSCL_log_combat_activity() {
        var combat_area      = $('div.combat-area-wrapper');
        var random_encounter = $('div.random-encounter');

        tSCL_process_combat_round(combat_area, random_encounter);
    }

    var combat_ending_messages_regex = ' (sent to the sickbay|got away|fled|have defeated|lost|took [0-9.]+ credits from)';

    function tSCL_process_combat_round(combat_area, random_encounter) {
        combat_log_scratch = nodes.combat_log.scratch;
        combat_log = localStorage[storage_key_prefix + 'combat_log'];

        var player_name    = $('#player-name').text();
        var main_content   = $('#main-content');
        var area_messages  = main_content.find('#area-messages');
        var other_messages = main_content.find('.messages');
        var all_messages_text = area_messages.text() + '\n' + other_messages.text();

        var in_combat = false;
        var combat_round;

        if (localStorage[storage_key_prefix + 'combat_round'] != undefined
            && ! window.location.pathname.startsWith('/combat')) {
            console.log('Combat Log: Still in combat? (URL path lacks "/combat/..."; Now in "' + window.location.pathname + '").\n' +
                         '  -> Possible TODO: If a successful flee leaves /combat/, while unsuccessful doesn\'t leave /combat/, then have "left /combat/" trigger "combat ended".');
        }

        // When being attacked:
        // (- Continue: hits, misses, etc.)
        //  - Ignore: "tried to flee", "too slow to get away!", "You have defeated {player} in combat!" (log looting, which happens on the next page)
        //  - End: "You got away!", "{opponent} fled." "{player} lost and {was / you were} sent to the sickbay.", "took {amount} credits from", ...?
        var being_attacked = localStorage[storage_key_prefix + 'combat_being_attacked'];
        var once_entry_hash;
        var once_entry_hash_list = [];

        // #region Determine if we're actively in combat.
        {
            // Some "random encounter" blocks have info we want to log only once.
            if (random_encounter.length && ! random_encounter.hasClass('random-encounter--unavailable')
                                        && ! random_encounter.find('.random-encounter-cooldown').length) {
                if (localStorage[storage_key_prefix + 'combat_once_list']) {
                    once_entry_hash_list = localStorage[storage_key_prefix + 'combat_once_list'].split(' ');
                }
                once_entry_hash = getHashForJQueryObject(random_encounter).toString();
                if (! once_entry_hash_list.includes(once_entry_hash)) {
                    localStorage.setItem(storage_key_prefix + 'combat_once_list',
                                         localStorage[storage_key_prefix + 'combat_once_list'] + ' ' + once_entry_hash);
                    debug('tSCL_process_combat_round(): Info: Recording random_encounter node once.');
                    in_combat = 'once';
                } else {
                    debug('tSCL_process_combat_round(): Info: Saw already-recorded random_encounter node.');
                }
            }
            // If we see a "combat area" block, we're in combat.
            if (combat_area.length) {
                debug('tSCL_process_combat_round(): Saw combat_area node.');
                in_combat = true;
            }
            // If we see a clear message saying the current player attacked someone (or was attacked), we're in combat.
            if (all_messages_text.match('(' + player_name + ' attacked | attacked ' + player_name + ')')) {
                debug('tSCL_process_combat_round(): In combat: Saw "' + player_name + ' attacked" or "attacked ' + player_name + '".');
                in_combat = true;
            }
            // If URL contains "?...&weapon=[GUID]", we just used a weapon while attacking someone.
            // (True while in "/combat", and in other rooms (i.e., just won combat).)
            if (window.location.search.includes('weapon=')) {
                debug('tSCL_process_combat_round(): In combat: Saw "weapon=..." in URL.');
                in_combat = true;
            }
            // When attacking, the URL path contains "/combat/attack/..." while fighting, and "/combat?mid=..." when you've fled.
            if (window.location.pathname.startsWith("/combat")) {
                debug('tSCL_process_combat_round(): In combat: URL path starts with "/combat".');
                in_combat = true; // Was: = ! being_attacked;  (???)
            }
            // When attacking, we want to record the "loot" stage after combat has ended.
            if (all_messages_text.match(combat_ending_messages_regex)) {
                in_combat = ! being_attacked;
                debug('tSCL_process_combat_round(): ' + (in_combat ? 'In' : 'Not in') + ' combat: Saw combat-ending text.');
            }
            // You can be attacked in any room -- but while defending, you can't move freely between rooms (unless you have fled).
            if (localStorage[storage_key_prefix + 'combat_prev_room']
                && localStorage[storage_key_prefix + 'combat_prev_room'] != window.location.pathname
                && ! localStorage[storage_key_prefix + 'combat_prev_room'].startsWith('/combat')) {
                debug('tSCL_process_combat_round(): Not in combat: Able to move freely between rooms (or just fled).');
                in_combat = false;
            } else {
                debug('tSCL_process_combat_round(): In combat? Tracking room movement to detect if the player flees.');
                localStorage[storage_key_prefix + 'combat_prev_room'] = window.location.pathname;
            }

            //
            // Guaranteed, not-in-combat overrides.
            //

            // If you've made it into your hotel room, you're guaranteed to not be in combat.
            if (window.location.pathname.startsWith('/area/hotel-rooms/enter-room')) {
                debug('tSCL_process_combat_round(): Not in combat: Made it to our hotel room.');
                in_combat = false;
            }

            // This is rare, but overrides any answer we got above.
            if (all_messages_text.match('Internal error')) {   // Rare, but overriding: If this appears, assume combat was aborted by an error.
                debug('tSCL_process_combat_round(): Combat aborted! Saw "Internal error" message -- site aborted combat.');
                in_combat = false;
            }
        }
        // #endregion Determine if we're actively in combat.

        if (in_combat) {
            if (in_combat == 'once') {
                // Record this to the log, but don't start logging all activity.
                debug('tSCL_process_combat_round(): Logging combat-related information. (Not in active combat.)');
            } else {
                debug('tSCL_process_combat_round(): Starting / continuing combat.');
            }

            tSCL_show_combat_status(in_combat == 'once' ? undefined : true);

            // Prepare for this log entry.
            combat_round = tSCL_prepare_log_entry(combat_area);

            combat_log_scratch = combat_log_scratch.find('div.combat-round:last-of-type');

            // Include the page's combat prelude text (if any).
            if (area_messages.length) {
                combat_log_scratch.append(area_messages.clone());
            }
            // Include any random_encounter areas, unless we know we want to exclude this one.
            if (random_encounter.length && ! random_encounter.find('a:contains("Receive reward")').length) {
                combat_log_scratch.append(random_encounter.clone());
                combat_log_scratch.find('.random-encounter').find('.action-button-container').remove();
            }

            // Include any messages shown to the user.
            tSCL_add_character_messages_to_log(combat_area);

            // Include the combat form, in whole or in part, if any changes are expected.
            tSCL_add_combat_details_to_log(combat_area, combat_round);

            // If configured, remove any HTML intended for screenreaders (and therefore "visually hidden").
            if (tSCL_config.remove_visuallyhidden_content) {
                combat_log_scratch.find('.visuallyhidden').remove();
            }
            // If the timer hasn't expired, the after-timer "proceed" section isn't relevant & should be removed.
            combat_log_scratch.find('.proceed.hidden').remove();

            // Tweak the visual appearance of the log, to help readability.
            tSCL_update_css_in_log(combat_area);

            // Save all actions in our scratch combat_log, not just the one we're appending.
            localStorage.setItem(storage_key_prefix + 'combat_log', nodes.combat_log.scratch.html());

            if (in_combat != 'once') {
                nodes.combat_log.scratch.html('');    // No longer needed; clean up after ourselves.
            }
        }
        // Was "else", but also (partially) applies when in_combat == 'once'.
        if (in_combat != true && localStorage[storage_key_prefix + 'combat_round'] != undefined) {
            if (in_combat != 'once') {
                debug('tSCL_process_combat_round(): Combat finished.');
            }

            tSCL_show_combat_status(in_combat == 'once' ? undefined : false);

            if (in_combat != 'once') {
                combat_round = tSCL_prepare_log_entry(combat_area);
                combat_log_scratch = combat_log_scratch.find('div.combat-round:last-of-type');

                // Include any final messages shown to the user.
                tSCL_add_character_messages_to_log(combat_area);
            }

            var combat_desc = 'Combat';
            var start_label = combat_log_scratch.find('div.combat-session:last-of-type .combat-start').text();
            if (start_label) {
                combat_desc = start_label.replace(/ .*$/, '');  // Reuse only the first word.
            }

            var combat_session = localStorage[storage_key_prefix + 'combat_session'];
            combat_log_scratch.append('<a href="#combat-log-toc">\n' +
                                      '    <h3 class="combat-end" id="combat-end-' + combat_session + '">' + combat_desc + ' ended: ' + get_gct_time() + '</h3>\n' +
                                      '</a>\n\n'
                                    );
            // Save all actions in our scratch combat_log, not just the one we're appending.
            localStorage.setItem(storage_key_prefix + 'combat_log', nodes.combat_log.scratch.html());
            nodes.combat_log.scratch.html('');    // No longer needed; clean up after ourselves.

            localStorage.removeItem(storage_key_prefix + 'combat_round');
            localStorage.removeItem(storage_key_prefix + 'combat_session');
            localStorage.removeItem(storage_key_prefix + 'combat_saw_player_tables');
            localStorage.removeItem(storage_key_prefix + 'combat_being_attacked');
        } else if (! in_combat) {
            // Not inside nor exiting combat.
            debug('tSCL_process_combat_round(): Not inside nor exiting combat.');
            localStorage.removeItem(storage_key_prefix + 'combat_prev_room');   // Clear this, so stale values don't affect in-combat detection above.
            tSCL_show_combat_status(undefined);
        }
    }

    // Prepare for this log entry.
    function tSCL_prepare_log_entry(combat_area) {
        // Determine how many combat rounds have occurred so far.
        var combat_round = localStorage[storage_key_prefix + 'combat_round'];
        if (combat_round == undefined) {
            combat_round = 0;
        } else {
            combat_round++;
        }
        localStorage.setItem(storage_key_prefix + 'combat_round', combat_round);

        if (combat_log) {
            combat_log_scratch.html(combat_log);
        } else {
            combat_log_scratch.html('');
        }

        // Combat just started? Add a "combat session-N" container, and a timestamp.
        if (combat_round == 0) {
            // Add a large separator between combat sessions.
            combat_log_scratch.append('\n<hr style="height:0.5em; margin-top:2em; margin-bottom:2em;"/>\n\n');

            var combat_session = 1;
            var combat_session_nodes = combat_log_scratch.find('.combat-session');
            if (combat_session_nodes.length) {
                combat_session = combat_session_nodes.length + 1;
            }
            localStorage.setItem(storage_key_prefix + 'combat_session', combat_session);

            combat_log_scratch.append('<div id="combat-session-' + combat_session + '" class="combat-session"></div>');
            combat_log_scratch = combat_log_scratch.find('div.combat-session:last-of-type');

            // Provide a more descriptive title than "Combat session #n", if possible.
            var session_title;
            var session_desc  = 'Combat';

            var main_content = $('#main-content');

            // First, try looking for a title inside the random-encounter area.
            var random_encounter_area = main_content.find('.random-encounter');
            if (! session_title && random_encounter_area.length) {
                var rea_title = random_encounter_area.find('h1,h2,h3').filter(function () {
                    return this.hasAttribute('class') && (this.classList.contains('container-big-title'));
                }).text();

                if (rea_title) {
                    session_title = rea_title;
                    session_desc  = 'Info';
                }
            }

            // Next, check for interesting text in a campaign timer.
            //  - <div class="timer global-timer" role="region" aria-label="Campaign countdown" data-seconds-left="3739"
            //         data-timer-type="campaign">
            var campaign_timer = main_content.find('div.timer[data-timer-type="campaign"] .eta');
            if (campaign_timer.length) {
                var ct_title = campaign_timer.text().replace(/\r?\n/g, '').replace(/^.*left to complete "([^"]+)".*$/, "$1");
                if (ct_title) {
                    // Shorten some known titles that we might end up with.
                    ct_title = ct_title.replace(/ Enter the sewers /, ': Sewers: ');
                    session_title = ct_title;
                }
            }

            // Finally, try to extract (possibly additional) title info from the page's messages.
            var main_content   = $('#main-content');
            var message_groups = [ main_content.find('#area-messages').text(),
                                   main_content.find('.messages').text(),
                                   combat_area.find('.combat-log').text()
                                 ];
            for (var index in message_groups) {
                var attack_title;
                var regex_player = '(' + player_name + '|[Yy]ou)';
                var msgs = message_groups[index];
                if (msgs.match(regex_player + ' attacked (.+)\.')) {
                    attack_title = 'Attacked ' + msgs.match(regex_player + ' attacked (.+)\.')[2];
                } else if (msgs.match('(.+) attacked ' + regex_player + '\.')) {
                    attack_title = 'Attacked by ' + msgs.match('(.+) attacked ' + regex_player + '\.')[1];
                }

                // If we already have a session title, append the attack info to it.
                if (attack_title) {
                    if (session_title) {
                        session_title += ': ';
                    }
                    session_title += attack_title;
                    break;  // Found a useful title; no need to keep scanning.
                }
            }

            // Simple fallback.
            if (! session_title) {
                session_title = 'Combat session #' + combat_session;
            }

            combat_log_scratch.prepend('<a name="combat-session-' + combat_session + '" href="#combat-log-toc">\n' +
                                       '    <h1 class="combat-session-title">' + session_title + '</h1>\n' +
                                       '</a>\n' +
                                       '<h3 class="combat-start" id="combat-start-' + combat_session + '">' + session_desc + ' started: ' + get_gct_time() + '</h3>\n');
        } else {
            combat_log_scratch = combat_log_scratch.find('div.combat-session:last-of-type');

            // Add a small separator between rounds.
            combat_log_scratch.append('\n<hr style="width:40%; margin-top:1em; margin-bottom:1em;"/>\n\n');
        }

        // Add a container for everything in this combat round, and narrow all processing to the latest action.
        combat_log_scratch.append('<div id="combat-round-' + combat_round + '" class="combat-round"></div>')

        return combat_round;
    }

    // Include any messages shown to the user.
    function tSCL_add_character_messages_to_log(combat_area) {
        var page_combat_log = combat_area.find('.combat-log')
        var page_combat_log_text = page_combat_log.find('.combat-log--ul').text().replace(/\s\s+/g, " ").trim();

        var main_content = $('#main-content');
        var msgs_to_show = [];
        var text_of_msgs = [];
        for (var msg_type in { '.messages':'', '.character-messages':'', '.character-messages-desktop':'', '.character-messages-mobile':'' }) {
            main_content.find(msg_type).each(add_msg_if_unique);
        }

        for (var index in msgs_to_show) {
            var char_msgs = $(msgs_to_show[index]);
            if (char_msgs.length) {
                combat_log_scratch.append(char_msgs.clone());
                combat_log_scratch.append('<p/>\n');
            }
        }

        function add_msg_if_unique() {
            var msg_text = $(this).text().replace(/\s\s+/g, " ").trim();
            if (! msgs_to_show.includes(this)     &&
                ! text_of_msgs.includes(msg_text) &&
                ! (page_combat_log_text.length && page_combat_log_text == msg_text))
            {
                msgs_to_show.push(this);
                text_of_msgs.push(msg_text);
            }
        }
    }

    // Include the combat form, in whole or in part, if any changes are expected.
    function tSCL_add_combat_details_to_log(combat_area, combat_round) {
        // Append the log of actions that happened in the just-finished round.
        var page_combat_log = combat_area.find('.combat-log');
        if (page_combat_log.length) {
            combat_log_scratch.append(page_combat_log.clone());
        }

        var main_content = $('#main-content');
        var countdown = main_content.find('.combat-countdown');
        if (countdown.length) {
            combat_log_scratch.append(countdown.clone());
        }

        // Append the combat <form>...</form>, removing a part that we'll add back in later..
        var attack_form = combat_area.find('form[name="attack"]');
        if (attack_form.length) {
            combat_log_scratch.append(attack_form.html());
        } else {
            // No combat <form>? We're either being attacked by someone else, or we attacked but the combat is ending.
            var main_content   = $('#main-content');
            var area_messages  = main_content.find('#area-messages');
            var other_messages = main_content.find('.messages');
            var all_messages_text = area_messages.text() + '\n' + other_messages.text();

            if (! localStorage[storage_key_prefix + 'combat_being_attacked'] && ! all_messages_text.match(combat_ending_messages_regex)) {
                debug('Combat Log: Assuming we\'re being attacked. (We\'re logging combat, but an attack <form> was not found.)');
                localStorage.setItem(storage_key_prefix + 'combat_being_attacked', true);
            }
        }

        // When defending, we can only get the weapons involved from messages. (Already appended, above.)
        var page_messages = main_content.find('.messages');

        // Report which weapons were used.
        if (combat_round > 0) {
            var weapons_selected = [];
            var actor_table = { 'self':'You hit', 'opponent':'hit you with' };
            for (var actor in actor_table) {
                var weapon_name = "";

                // When attacking: Can be found in '.combat-log' (unless they missed).
                var weapon_node = page_combat_log.find('li:contains(' + actor_table[actor] + ')');
                if (! weapon_node.length) {
                    // When defending: Can be found in '.messages' (unless they missed).
                    weapon_node = page_messages.filter(function() { return $(this).text().match(/^.* hit .* with (.+), reducing .*$/) ||
                                                                           $(this).text().match(/^Your weapon, (.+), took .*$/); });
                }
                if (weapon_node.length) {
                    weapon_name = weapon_node.text().replace(/^.* hit .* with (.+), reducing .*$/, "$1")
                                                    .replace(/^Your weapon, (.+), took .*$/, "$1")

                    debug(actor + ': Found weapon name in game\'s combat actions log.');
                }

                // If not found above, check UUID from page URL. (Only applies to the attacker.)
                if (! weapon_name && actor == 'self' &&
                    window.location.search.includes('weapon=')) {
                    var uuid = window.location.search.replace(/^.*weapon=([-0-9a-f]+).*/, "$1");
                    if (uuid) {
                        weapon_node = combat_area.find('#player-content-' + actor).find('input[value="' + uuid + '"]')
                                                 .parent().find('.combat-slot--desc').clone();
                        if (weapon_node.length) {
                            weapon_name = weapon_node[0].innerText;

                            debug(actor + ': Found weapon name in page URL.');
                        }
                    }
                }

                // If not found above, fall back to the character's "weapons/belt" table.
                // (FWIW: This can be wrong -- on the page, the weapons are radio buttons, but the page has _both_ checked.)
                if (! weapon_name) {
                    weapon_node = combat_area.find('#player-content-' + actor).find('.combat-input:checked+.combat-slot--img--container').next();
                    if (weapon_node.length) {
                        weapon_name = weapon_node.text();
                        debug(actor + ': Found weapon name from checked item in character table.');
                    }
                }

                if (! weapon_name) {
                    weapon_name = "[unknown]";
                    debug(actor + ': Weapon name not found.');
                }

                var actor_column = combat_log_scratch.find('.combat-player.combat-player--' + actor);
                var actor_name   = actor_column.find('.combat-player--name').text().replace('Player ', '');
                actor_column.before('<span class="combat-slot--desc combat-player combat-player--' + actor + '" style="display:block; text-align:center; font-size:90%;">' + actor_name + ' used:<br/>\n' + weapon_name + '</span>');
            }
        }

        var any_damage_done = false;
        if (page_combat_log.length) {
            var action_text = page_combat_log.text();
            any_damage_done = ( action_text.length &&
                                (action_text.includes(' attacking ') || action_text.includes(' hit ')) );
        }

        if (any_damage_done ||
            (! localStorage[storage_key_prefix + 'combat_saw_player_tables'] &&
             combat_log_scratch.find('.combat-players')))
        {
            if (! localStorage[storage_key_prefix + 'combat_saw_player_tables']) {
                // If we haven't seen the player tables yet, leave both entire tables as they are.
                localStorage[storage_key_prefix + 'combat_saw_player_tables'] = true;

                debug((any_damage_done ? 'Did damage' : 'No damage done')
                      + '; haven\'t seen player tables yet, so not removing anything.');
            } else {
                // If we've already seen the player tables once, prune/reduce the info shown (much shorter log).
                combat_log_scratch.find('.combat-player--main-content').remove()
                debug('Did damage; already saw player tables, so removing \'class="combat-player--main-content"\' node & children.');
            }
        } else {
            // No damage? Keep the 2-column layout (for weapon choice below), but remove the content.
            combat_log_scratch.find('.combat-player').remove();
            debug('No damage done;  removing \'class="combat-player"\' node & children.');
        }
    }

    // Tweak the visual appearance of the log, to help readability.
    function tSCL_update_css_in_log(combat_area) {
        // If a character takes damage, highlight the affected stat.
        combat_log_scratch.find('.combat-log').find('.combat-log--item').each(function() {
            var text = $(this).text();

            var target;
            if      (text.startsWith('You hit '))     { target = 'opponent'; }
            else if (text.includes(' hit you with ')) { target = 'self'; }
            else { return; } // Not relevant for this processing.

            var stat_name = text.replace(/^.* reducing current ([^ ]+) .*$/, '$1');
            stat_name = stat_name[0].toLocaleUpperCase() + stat_name.substr(1);
            combat_log_scratch.find('.combat-player--' + target).find('.combat-player-stats--label--title:contains("' + stat_name + '")')
                              .parent().parent().css( {'border-width': '1px', 'border-style': 'solid', 'border-color': '#ff0'} );
        });

        // Tweak spacing in this field, to make it take up less room.
        combat_log_scratch.find('.combat-players')             .css( {'margin-top': '1em'} );
        combat_log_scratch.find('.combat-players--col--1-of-2').css( {'margin-bottom': 0} );
        combat_log_scratch.find('.combat-players--col--2-of-2').css( {'margin-bottom': 0} );
        combat_log_scratch.find('.combat-player--top')         .css( {'padding-top': '0.5em', 'padding-bottom': '0.5em'} );
        combat_log_scratch.find('.combat-player-stats--ul')    .css( {'padding-top': '0.5em', 'padding-bottom': '0.25em'} );
        combat_log_scratch.find('.combat-player-stats--item')  .css( {'margin-bottom': 0} );
        combat_log_scratch.find('.combat-player-stats--value') .addClass('tST-hidden');
        combat_log_scratch.find('.combat-fields')              .css( {'min-width': 'auto'} );

        // No need for this to have a predetermined height.
        combat_log_scratch.find('.combat-log').css( {'padding-top':'0.5em', 'padding-bottom':'0.5em', 'height': 'auto',
                                                     'font-size': '90%'} );

        // If opponent's equipment slots are available, don't hide them.
        combat_log_scratch.find('#player-content-opponent').removeAttr('hidden');

        combat_log_scratch.find('.combat-actions--title').each(function() {
            var icon = $(this).find('.combat-actions--title-icon');
            var text = $(this).text();

            $(this).html(icon).append(text.replace('You are ', 'You are now '));
        })

        // More tweaks to spacing/alignment.
        combat_log_scratch.find('.combat-actions').css( {'padding-top':0, 'padding-bottom':0, 'margin-bottom': 0} );
        combat_log_scratch.find('.combat-actions--inner').remove();
        combat_log_scratch.find('.combat-actions--title').css( {'padding':'0.5em', 'margin-bottom': 0,
                                                                'font-size': '90%'} );
        combat_log_scratch.find('.combat-actions--title-icon').css( {'height': '1em', 'vertical-align': 'middle;'} );
    }

    // Clear all stored logs saved by this script.
    function tSCL_clear_log() {
        tST_clear_localStorage_by_key_prefix(storage_key_prefix + "combat_");
        // for (var item in localStorage) {
        //     if (item.startsWith(storage_key_prefix + "combat_")) {
        //         debug('tSCL_clear_log(): Removing localStorage item: ' + item);
        //         localStorage.removeItem(item);
        //     }
        // }

        // Also clear the Combat log container.
        nodes.combat_log.contents.text("");

        // Finally, hide the window if it's visible, and disable the "show" button.
        tSCL_show_combat_log_window(false);
        completely_disable_show_button();

    }

//
// #endregion When relevant, record the current page's combat details into the Combat log.
////////////////////

// When showing the log, prepend a Table of Contents, to make it easier to jump between combat sessions.
function present_log_in_container(log, container) {
    container.html(log);

    // Prepend a table of contents, to easily jump between combat sessions.
    container.prepend('<div id="combat-log-toc"></div>\n');
    var toc = container.find('div#combat-log-toc');

    toc.append('<h1 style="font-color: white;">Table of Contents:</h1>\n');
    toc.append('<ul></ul>\n');
    toc = toc.find('ul');

    container.find('.combat-session').each(function() {
        var session_number = $(this).find('a').attr('name').replace(/^combat-session-(\d+)$/, '$1');
        var session_start  = $(this).find('h3.combat-start').text().replace(/^ *(Combat|Info) started: /, "");
        var session_end    = $(this).find('h3.combat-end'  ).text().replace(/^ *(Combat|Info) ended: /,   "");
        var session_delta  = (session_end.length ? get_gct_time_delta(session_start, session_end) : undefined);

        var session_title  = $(this).find('.combat-session-title').text();
        if (! session_title.length) {
            session_title = 'Combat session #' + session_number;
        }

        toc.append('<li><a href="#combat-session-' + session_number + '">' + session_title + '</a>\n' +
                   '<span style="font-size:90%; font-style:italic">(at ' + session_start +
                   (session_delta ? ', for <a href="#combat-end-' + session_number + '">' + session_delta + '</a>'
                                  : ', ongoing') +
                   ')</span></li>\n');
    });
}

function debug(msg) {
    if (tSCL_config.debug) {
        console.log(msg);
    }
}
