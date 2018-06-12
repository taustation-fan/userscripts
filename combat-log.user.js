// ==UserScript==
// @name         Tau Station: Combat Log
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/combat-log.user.js
// @version      1.1
// @description  Records a log of any combat you're involved in.
// @author       Mark Schurman (https://github.com/quasidart)
// @match        https://alpha.taustation.space/*
// @grant        CC-BY-SA
// @require      https://code.jquery.com/jquery-3.3.1.slim.js
// @require      https://github.com/taustation-fan/userscripts/raw/master/taustation-tools-common.js
// ==/UserScript==

//////////////////////////////
// Begin: User Configuration.
//

// Temporarily disable stat tracking while any of the following pages are showing.
var tSCL_config = {
    'debug': false,
    'remove_hidden_content': false     // True: Deletes all "visuallyhidden"/"hidden"-style content from the log.
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
function tST_combat_log_main() {
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
// region UI-related code.
//

    function tSCL_add_UI() {
        // Add the section for this script's UI (vs. sibling scripts).
        tST_region.append('<div id="tSCL-region" class="tST-section tST-control-bar">Combat Log:\n</div>\n')
        var tSCL_area = $("#tSCL-region");

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
        <div id="combat_log_scratch" class="tST-hidden visuallyhidden"></div>
    </div>
    <div class="tST-section tST-floatbox-footer">
        <span id="combat_log_footer" class="tST-control-bar"></span>
    </div>
</div>
`;
        $('.banner').before(combat_log_window_html);
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
        return (localStorage[storage_key_prefix + 'combat_log']);
    }

    function completely_disable_show_button() {
        nodes.show_button.addClass('tST-button-disabled').attr('title', 'Combat log is currently empty.');
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
            nodes.combat_log.window.removeClass('tST-hidden');

            window.addEventListener("keyup", tSCL_close_log_on_Escape_key);
        } else {
            window.removeEventListener("keyup", tSCL_close_log_on_Escape_key);

            nodes.combat_log.window.addClass('tST-hidden');
            nodes.combat_log.contents.html("");

            nodes.hide_button.addClass('tST-hidden');
            nodes.show_button.removeClass('tST-hidden');
        }

        if (tSCL_config.debug) {
            console.log((show_window ? 'Showing' : 'Hiding') + ' Combat log window.');
        }
    }

    function tSCL_close_log_on_Escape_key(keyboardEvent) {
        if (keyboardEvent.key == "Escape" ||
            keyboardEvent.keyCode == 27) {
            tSCL_show_combat_log_window(false);
        }
    }

//
// endregion UI-related code.
////////////////////

////////////////////
// region When relevant, record the current page's combat details into the Combat log.
//
    var combat_log_scratch;
    var combat_log;

    function tSCL_log_combat_activity() {
        var combat_area      = $('div.combat-area-wrapper');
        var random_encounter = $('div.random-encounter');

        tSCL_process_combat_round(combat_area, random_encounter);
    }

    function tSCL_process_combat_round(combat_area, random_encounter) {
        combat_log_scratch = nodes.combat_log.scratch;
        combat_log = localStorage[storage_key_prefix + 'combat_log'];

        var main_content   = $('#main-content');
        var area_messages  = main_content.find('#area-messages');
        var other_messages = main_content.find('.messages');

        var combat_round;

        if (combat_area.length ||
            (random_encounter.length &&
             ! random_encounter.find('.random-encounter-cooldown').length) ||
            area_messages.text().includes($('#player-name').text() + ' attacked '))
        {
            if (tSCL_config.debug) {
                console.log('tSCL_process_combat_round(): Starting / continuing combat.');
            }

            // Prepare for this log entry.
            combat_round = tSCL_prepare_log_entry();

            combat_log_scratch = combat_log_scratch.find('div.combat-round:last-of-type');

            // Include the page's combat prelude text (if any).
            if (area_messages.length) {
                combat_log_scratch.append(area_messages.clone());
            }
            if (random_encounter.length) {
                combat_log_scratch.append(random_encounter.clone());
                combat_log_scratch.find('.random-encounter').find('.action-button-container').remove();
            }

            // Include any messages shown to the user.
            tSCL_add_character_messages_to_log(combat_area);

            // Include the combat form, in whole or in part, if any changes are expected.
            tSCL_add_combat_details_to_log(combat_area, combat_round);

            // Remove any HTML that shouldn't be shown.
            if (tSCL_config.remove_hidden_content) {
                combat_log_scratch.find('.visuallyhidden').remove();
                combat_log_scratch.find('.hidden').remove();
            }

            // Tweak the visual appearance of the log, to help readability.
            tSCL_update_css_in_log(combat_area);

            // Save all actions in our scratch combat_log, not just the latest.
            localStorage.setItem(storage_key_prefix + 'combat_log', nodes.combat_log.scratch.html());
            combat_log_scratch.html('');

        } else if (localStorage[storage_key_prefix + 'combat_round'] != undefined) {
            if (tSCL_config.debug) {
                console.log('tSCL_process_combat_round(): Combat finished.');
            }

            combat_round = tSCL_prepare_log_entry();
            combat_log_scratch = combat_log_scratch.find('div.combat-round:last-of-type');

            // Include any final messages shown to the user.
            tSCL_add_character_messages_to_log(combat_area);

            var combat_session = localStorage[storage_key_prefix + 'combat_session'];
            combat_log_scratch.append('<a href="#combat-log-toc">\n' +
                                      '    <h3 class="combat-end" id="combat-end-' + combat_session + '">Combat ended: ' + get_gct_time() + '</h3>\n' +
                                      '</a>\n\n'
                                    );
            localStorage.setItem(storage_key_prefix + 'combat_log', nodes.combat_log.scratch.html());

            localStorage.removeItem(storage_key_prefix + 'combat_round');
            localStorage.removeItem(storage_key_prefix + 'combat_session');
            localStorage.removeItem(storage_key_prefix + 'combat_saw_player_tables');
        }
    }

    // Prepare for this log entry.
    function tSCL_prepare_log_entry() {
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

            combat_log_scratch.prepend('<a name="combat-session-' + combat_session + '" href="#combat-log-toc">\n' +
                                       '    <h1>Combat session #' + combat_session + '</h1>\n' +
                                       '</a>\n' +
                                       '<h3 class="combat-start" id="combat-start-' + combat_session + '">Combat started: ' + get_gct_time() + '</h3>\n');
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
        }

        // Report which weapons were used.
        if (combat_round > 0) {
            var weapons_selected = [];
            var actor_table = { 'self':'You hit', 'opponent':'hit you with' };
            for (var actor in actor_table) {
                var weapon_name = "";

                var weapon_node = page_combat_log.find('li:contains(' + actor_table[actor] + ')');
                if (weapon_node.length) {
                    weapon_name = weapon_node.text().replace(/^.* hit .* with (.+), reducing .*$/, "$1")
                                                    .replace(/^Your weapon, (.+), took .*$/, "$1")

                    if (tSCL_config.debug) {
                        console.log(actor + ': Found weapon name in game\'s combat actions log.');
                    }
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

                            if (tSCL_config.debug) {
                                console.log(actor + ': Found weapon name in page URL.');
                            }
                        }
                    }
                }

                // If not found above, fall back to the character's "weapons/belt" table.
                // (FWIW: This can be wrong -- on the page, the weapons are radio buttons, but the page has _both_ checked.)
                if (! weapon_name) {
                    weapon_node = combat_area.find('#player-content-' + actor).find('.combat-input:checked+.combat-slot--img--container').next();
                    if (weapon_node.length) {
                        weapon_name = weapon_node.text();

                        if (tSCL_config.debug) {
                            console.log(actor + ': Found weapon name from checked item in character table.');
                        }
                    }
                }

                if (! weapon_name) {
                    weapon_name = "[unknown]";

                    if (tSCL_config.debug) {
                        console.log(actor + ': Weapon name not found.');
                    }
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
            ! localStorage[storage_key_prefix + 'combat_saw_player_tables']) {
            if (! localStorage[storage_key_prefix + 'combat_saw_player_tables']) {
                // If we haven't seen the player tables yet, leave both entire tables as they are.
                localStorage[storage_key_prefix + 'combat_saw_player_tables'] = true;

                if (tSCL_config.debug) {
                    console.log('Did damage; haven\'t seen player tables yet, so not removing anything.');
                }
            } else {
                // If we've already seen the player tables once, prune/reduce the info shown (much shorter log).
                combat_log_scratch.find('.combat-player--main-content').remove()

                if (tSCL_config.debug) {
                    console.log('Did damage; already saw player tables, so removing \'class="combat-player--main-content"\' node & children.');
                }
            }
        } else {
            // No damage? Keep the 2-column layout (for weapon choice below), but remove the content.
            combat_log_scratch.find('.combat-player').remove();

            if (tSCL_config.debug) {
                console.log('No damage done;  removing \'class="combat-player"\' node & children.');
            }
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
        })

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

        combat_log_scratch.find('.combat-actions--title').each(function() {
            var icon = $(this).find('.combat-actions--title-icon');
            var text = $(this).text();

            $(this).html(icon).append(text.replace('You are ', 'You are now '));
        })

        combat_log_scratch.find('.combat-actions').css( {'padding-top':0, 'padding-bottom':0, 'margin-bottom': 0} );
        combat_log_scratch.find('.combat-actions--inner').remove();
        combat_log_scratch.find('.combat-actions--title').css( {'padding':'0.5em', 'margin-bottom': 0,
                                                                'font-size': '90%'} );
        combat_log_scratch.find('.combat-actions--title-icon').css( {'height': '1em', 'vertical-align': 'middle;'} );
    }

    // Clear all stored logs saved by this script.
    function tSCL_clear_log() {
        for (var item in localStorage) {
            if (item.startsWith(storage_key_prefix + "combat_")) {
                if (tSCL_config.debug) {
                    console.log('tSCL_clear_log(): Removing localStorage item: ' + item);
                }

                localStorage.removeItem(item);
            }
        }

        // Also clear the Combat log container.
        nodes.combat_log.contents.text("");

        // Finally, hide the window if it's visible, and disable the "show" button.
        tSCL_show_combat_log_window(false);
        completely_disable_show_button();

    }

//
// endregion When relevant, record the current page's combat details into the Combat log.
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
        var session_start  = $(this).find('h3.combat-start').text().replace(/^ *Combat started: /, "");
        var session_end    = $(this).find('h3.combat-end').text().replace(/^ *Combat ended: /, "");
        var session_delta  = get_gct_time_delta(session_start, session_end);

        toc.append('<li><a href="#combat-session-' + session_number + '">Combat session #' + session_number + '</a>\n' +
                   '<span style="font-size:90%; font-style:italic">(at ' + session_start + ', for ' +
                   '<a href="#combat-end-' + session_number + '">' + session_delta + '</a>)</span></li>\n');
    });
}
