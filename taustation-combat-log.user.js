// ==UserScript==
// @name         taustation-fan: Combat Log
// @namespace    https://github.com/taustation-fan/userscripts/
// -downloadURL  https://github.com/taustation-fan/userscripts/raw/master/combat_log.user.js
// @version      0.1
// @description  Records a log of any combat you're involved in.
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.slim.js
// @require      https://github.com/taustation-fan/userscripts/raw/master/taustation-tools-common.js
// ==/UserScript==

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

    //works tSCL_log_combat_activity_simple();
    // tSCL_log_combat_activity_detailed();

    // // During testing only.
    // nodes.combat_log.contents.html(localStorage[storage_key_prefix + '_combat_log_reference']);

    tSCL_log_combat_activity_pruned();

    // // During testing only.
    // nodes.combat_log.contents.html('');

    // Finally, disable the "Show" button if the log is empty.
    if (! tSCL_combat_log_pending()) {
        nodes.show_button.addClass('tST-button-disabled');
    }
}

////////////////////
// region UI-related code.
//

    function tSCL_add_UI() {
        // Add the section for this script's UI (vs. sibling scripts).
        tST_region.append('<div id="tSCL-region" class="tST-section tST-control-bar">Combat Log:\n</div>\n')
        tSCL_area = $("#tSCL-region");

        // - Add a button pair: Show/Hide the combat log pop-over window.
        tSCL_area.append('<a id="tSCL_show_combat_log" class="tST-button" title="Show Combat log window">Show</a>');
        nodes.show_button = $('#tSCL_show_combat_log');
        nodes.show_button.click(function(){
            if (tSCL_combat_log_pending()) {
                tSCL_show_combat_log_window(true);
            }
        });
        tSCL_area.append('<a id="tSCL_hide_combat_log" class="tST-button tST-hidden" title="Hide Combat log window">Hide</a>');
        nodes.hide_button = $('#tSCL_hide_combat_log');
        nodes.hide_button.click(function(){
            tSCL_show_combat_log_window(false);
        });

        // - Add a button: Clear stored log & related state.
        tSCL_area.append('<a id="tSCL_clear_log" class="tST-button tST-clear" title="Clear saved log">Clear</a>');
        nodes.clear_button = $('#tSCL_clear_log');
        nodes.clear_button.click(function() {
            tSCL_clear_log();
        });

        // Add the Combat log pop-over window, as hidden. Includes two containers:
        // one for the Combat log, and a hidden one used when constructing a log entry.
        var combat_log_window_html =
            '<div id="combat_log_window" class="tST-container tST-floating-box tST-hidden">\n' +
            '    <div class="tST-section tST-floatbox-header">\n' +
            '        <span class="tST-title">Combat Log</span>\n' +
            '    </div>\n' +
            '    <div class="content tST-floatbox-scrollable-content">\n' +
            '        <div id="combat_log_contents" class="chat-messages-container"></div>\n' +
            '        <div id="combat_log_scratch" class="tST-hidden visuallyhidden"></div>\n' +
            '    </div>\n' +
            '    <div class="tST-section tST-floatbox-footer">\n' +
            '        <span id="combat_log_footer" class="tST-control-bar"></span>\n' +
            '    </div>\n' +
            '</div>';
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
        nodes.combat_log.footer.append('<a id="tSCL_download_combat_log" class="tST-button" title="Download Combat log to a local file.">Download</a>');
        nodes.download_button = $('#tSCL_download_combat_log');
        nodes.download_button.click(function(){
            if (tSCL_combat_log_pending()) {
                download_html_to_file(localStorage[storage_key_prefix + 'combat_log'], 'combat_log', true);
            }
        });

        // Finally, start in the appropriate state.
        tSCL_show_combat_log_window(false); // TODO: Enable reading/writing this state from/to localStorage?
    }

    function tSCL_combat_log_pending() {
        return (localStorage[storage_key_prefix + 'combat_log']);
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
            nodes.combat_log.contents.html(log_data);
            nodes.combat_log.window.removeClass('tST-hidden');

            window.addEventListener("keyup", tSCL_close_log_on_Escape_key);
        } else {
            window.removeEventListener("keyup", tSCL_close_log_on_Escape_key);

            nodes.combat_log.window.addClass('tST-hidden');
            nodes.combat_log.contents.html("");

            nodes.hide_button.addClass('tST-hidden');
            nodes.show_button.removeClass('tST-hidden');
        }

        console.log((show_window ? 'Showing' : 'Hiding') + ' Combat log window.');
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

    function tSCL_log_combat_activity_simple() {
        var combat_log = localStorage[storage_key_prefix + 'combat_log'];

        var combat_area      = $('div.combat-area-wrapper');
        var random_encounter = $('div.random-encounter');

        if (combat_area.length ||
            (random_encounter.length &&
             ! random_encounter.find('.random-encounter-cooldown').length))
        {
            if (combat_log) {
                combat_log += '\n<hr/>\n\n';
            } else {
                combat_log = "";
            }

            if (! localStorage[storage_key_prefix + 'combat_active']) {
                localStorage.setItem(storage_key_prefix + 'combat_active', true);
                combat_log += '<h1> Combat started: ' + get_gct_time() + '</h1>\n';
            }

            for (var msg_type in { '.messages':'', '.character-messages':'', '.character-messages-desktop':'', '.character-messages-mobile':'' }) {
                //c? var char_msgs = $('#character-messages');
                var char_msgs = $(msg_type);
                if (char_msgs.length) {
                    combat_log += char_msgs[0].outerHTML; // TODO: Use .innerHTML instead?
                    //d combat_log += '<hr width="50%"/>\n';
                }
            }

            if (random_encounter.length) {
                combat_log += random_encounter[0].outerHTML; // TODO: Use .innerHTML instead?
            }
            if (combat_area.length) {
                combat_log += combat_area[0].outerHTML; // TODO: Use .innerHTML instead?
            }

            localStorage.setItem(storage_key_prefix + 'combat_log', combat_log);

        } else if (localStorage[storage_key_prefix + 'combat_active']) {
            localStorage.setItem(storage_key_prefix + 'combat_active', false);
            combat_log += '<h2> Combat ended: ' + get_gct_time() + '</h2>\n';

            localStorage.setItem(storage_key_prefix + 'combat_log', combat_log);
        }
    }

    function tSCL_log_combat_activity_pruned() {
        var combat_log_scratch = nodes.combat_log.scratch;
        var combat_log = localStorage[storage_key_prefix + 'combat_log'];

        //c combat_log_scratch.html(combat_log);

        var combat_area      = $('div.combat-area-wrapper');
        var random_encounter = $('div.random-encounter');

        tSCL_process_combat_round(combat_area, random_encounter);

        // // During testing only.
        // {
        //     var empty = $('.fdsaklfjdsalkf');
        //     tSCL_process_combat_round(empty, $(random_encounter[0]));

        //     combat_area.each(function () { tSCL_process_combat_round($(this), empty); });

        //     tSCL_process_combat_round(empty, $(random_encounter[1]));
        // }
    }

    function tSCL_process_combat_round(combat_area, random_encounter) {
        // During testing only?
        var combat_log_scratch = nodes.combat_log.scratch;

        var combat_log = localStorage[storage_key_prefix + 'combat_log'];

        var main_content   = $('#main-content');
        var area_messages  = main_content.find('#area-messages');
        var other_messages = main_content.find('.messages');

        if (combat_area.length ||
            (random_encounter.length &&
             ! random_encounter.find('.random-encounter-cooldown').length) ||
            area_messages.text().includes($('#player-name').text() + ' attacked ')
            // ||
            //other_messages.text().includes('fled from combat')
        )
        {
         console.log('tSCL_process_combat_round(): Starting / continuing combat.');
            // During testing only: Save page before navigating away & after combat ends.
            if (combat_area.length || random_encounter.length) {
                window.removeEventListener('unload', download_page_to_file);
                window.addEventListener('unload', download_page_to_file);
            } else {
                // Combat has finished; just save the page as it is.
                download_page_to_file();
            }

            // Prepare for this log entry.
            var combat_round = tSCL_prepare_log_entry(combat_log, combat_log_scratch);

            combat_log_scratch = combat_log_scratch.find('div.combat-round:last-of-type');

            // Include the page's combat prelude text (if any).
            if (area_messages.length) {
                combat_log_scratch.append(area_messages.clone());
            }
            if (random_encounter.length) {
                combat_log_scratch.append(random_encounter.clone()); //d? [0]);
                combat_log_scratch.find('.random-encounter').find('.action-button-container').remove();
            }

            // Include any messages shown to the user.
            tSCL_add_character_messages_to_log(combat_area, combat_log_scratch);

            // Include the combat form, in whole or in part, if any changes are expected.
            tSCL_add_combat_details_to_log(combat_area, combat_log_scratch, combat_round);

            //u // Remove any HTML that shouldn't be shown.
            //u combat_log_scratch.find('.visuallyhidden').remove();
            //u combat_log_scratch.find('.hidden').remove();

            // Tweak the visual appearance of the log, to help readability.
            tSCL_update_css_in_log(combat_area, combat_log_scratch);

            // Save all actions in our scratch combat_log, not just the latest.
            localStorage.setItem(storage_key_prefix + 'combat_log', nodes.combat_log.scratch.html());
            combat_log_scratch.html('');

        } else if (localStorage[storage_key_prefix + 'combat_round'] != undefined) {
         console.log('tSCL_process_combat_round(): Combat finished.');
            var combat_round = tSCL_prepare_log_entry(combat_log, combat_log_scratch);
            combat_log_scratch = combat_log_scratch.find('div.combat-round:last-of-type');

            // Include any final messages shown to the user.
            tSCL_add_character_messages_to_log(combat_area, combat_log_scratch);

            localStorage.removeItem(storage_key_prefix + 'combat_round');
            localStorage.removeItem(storage_key_prefix + 'combat_saw_player_tables');

            combat_log_scratch.append('<h2> Combat ended: ' + get_gct_time() + '</h2>\n\n');
            localStorage.setItem(storage_key_prefix + 'combat_log', nodes.combat_log.scratch.html());
        }
    }

    // Prepare for this log entry.
    function tSCL_prepare_log_entry(combat_log, combat_log_scratch) {
        // Determine how many combat actions have occurred so far.
        var combat_round = localStorage[storage_key_prefix + 'combat_round'];
        if (combat_round == undefined) {
            combat_round = 0;
        } else {
            combat_round++;
        }
        localStorage.setItem(storage_key_prefix + 'combat_round', combat_round);

        if (combat_log) {
            combat_log_scratch.html(combat_log);

            // Add a large separator between combat sessions, and a smaller one between rounds.
            if (combat_round == 0) {
                combat_log_scratch.append('\n<hr style="height:0.5em; margin-top:2em; margin-bottom:2em;"/>\n\n');
            } else {
                combat_log_scratch.append('\n<hr style="width:40%; margin-top:1em; margin-bottom:1em;"/>\n\n');
            }
        } else {
            combat_log_scratch.html('');
        }

        // Combat just started? Add a timestamp.
        if (combat_round == 0) {
            combat_log_scratch.append('<h1> Combat started: ' + get_gct_time() + '</h1>\n');
        }

        // Add a container for everything in this combat action, and narrow all processing to the latest action.
        combat_log_scratch.append('<div id="combat-round-' + combat_round + '" class="combat-round"></div>')

        return combat_round;
    }

    // Include any messages shown to the user.
    function tSCL_add_character_messages_to_log(combat_area, combat_log_scratch) {
        var page_combat_log = combat_area.find('.combat-log')
        var page_combat_log_text = page_combat_log.find('.combat-log--ul').text().replace(/\s\s+/g, " ").trim();

        var main_content = $('#main-content');
        var msgs_to_show = [];
        var text_of_msgs = [];
        for (var msg_type in { '.messages':'', '.character-messages':'', '.character-messages-desktop':'', '.character-messages-mobile':'' }) {
            main_content.find(msg_type).each(function() {
                msg_text = $(this).text().replace(/\s\s+/g, " ").trim();
                if (! msgs_to_show.includes(this) &&
                    ! text_of_msgs.includes(msg_text) &&
                    ! (page_combat_log_text.length && page_combat_log_text == msg_text)) {
                    msgs_to_show.push(this);
                    text_of_msgs.push(msg_text);
                }
            });
        }

        for (var index in msgs_to_show) {
            var char_msgs = $(msgs_to_show[index]);
            if (char_msgs.length) {
                combat_log_scratch.append(char_msgs.clone());
                combat_log_scratch.append('<p/>\n');
                //d combat_log += '<hr width="50%"/>\n';
            }
        }
    }

    // Include the combat form, in whole or in part, if any changes are expected.
    function tSCL_add_combat_details_to_log(combat_area, combat_log_scratch, combat_round) {
        // Append the log of actions that happened in the just-finished round.
        var page_combat_log = combat_area.find('.combat-log');
        if (page_combat_log.length) {
            // combat_log_scratch.append(element_and_children[0].outerHTML);
            combat_log_scratch.append(page_combat_log.clone());
        }

        var main_content = $('#main-content');
        var countdown = main_content.find('.combat-countdown');
        if (countdown.length) {
            combat_log_scratch.append(countdown.clone());
        }

        // var action_text = combat_area.find('.combat-log').text();
        //c? var combat_actions;

        // Append the combat <form>...</form>, removing a part that we'll add back in later..
        var attack_form = combat_area.find('form[name="attack"]');
        if (attack_form.length) {
            //c? combat_actions = attack_form.find('.combat-actions');   // We'll add this bit later.

            combat_log_scratch.append(attack_form.html());
            //c? combat_log_scratch.find('.combat-actions').remove();    // The key part of this info is always appended later.
        }

        // Report which weapon was used.
        if (combat_round > 0) {
            var weapons_selected = [];
            var actor_table = { 'self':'You hit', 'opponent':'hit you with' };
            for (var actor in actor_table) {
                var weapon_name = "";

                var weapon_node = page_combat_log.find('li:contains(' + actor_table[actor] + ')');
                if (weapon_node.length) {
                    weapon_name = weapon_node.text().replace(/^.* hit .* with (.+), reducing .*$/, "$1")
                                                    .replace(/^Your weapon, (.+), took .*$/, "$1")
                    console.log(actor + ': Found weapon name in game\'s combat actions log.');
                }

                // If not found above, fall back to the table.
                // (FWIW: This can be wrong -- tn the page, the weapons are radio buttons, but the page has _both_ checked.)
                if (! weapon_name) {
                    weapon_node = combat_area.find('#player-content-' + actor).find('.combat-input:checked+.combat-slot--img--container').next();
                    if (weapon_node.length) {
                        weapon_name = weapon_node.text();
                        console.log(actor + ': Found weapon name from checked item in character table.');
                    }
                }

                // weapons_selected.push(weapon_name);
                if (! weapon_name) {
                    weapon_name = "[unknown]";
                    console.log(actor + ': Weapon name not found.');
                }

                // var actor_node = combat_log_scratch.find('.combat-player.combat-player--' + actor)
                //                                    .find('.combat-player--name');
                // var actor_name =
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

        console.log('Round ' + combat_round + ': any_damage_done? ' + any_damage_done + '. (Action text:\n' + action_text);
        if (any_damage_done ||
            ! localStorage[storage_key_prefix + 'combat_saw_player_tables']) {
            if (! localStorage[storage_key_prefix + 'combat_saw_player_tables']) {
                // If we haven't seen the player tables yet, leave both entire tables as they are.
                localStorage[storage_key_prefix + 'combat_saw_player_tables'] = true;
                console.log('Did damage; haven\'t seen player tables yet, so not removing anything.');
            } else {
                // If we've already seen the player tables once, prune/reduce the info shown (much shorter log).
                combat_log_scratch.find('.combat-player--main-content').remove()
                // var combat_player_main_content = combat_log_scratch.find('.combat-player--main-content');
                // console.log('main_content is in combat round ' + combat_player_main_content.parent().parent().parent().parent().attr('id'));
                // combat_player_main_content.remove();
                console.log('Did damage; already saw player tables, so removing \'class="combat-player--main-content"\' node & children.');
            }
        } else {
            // No damage? Keep the 2-column layout (for weapon choice below), but remove the content.
            combat_log_scratch.find('.combat-player').remove(); //.html('');
            console.log('No damage done;  removing \'class="combat-player"\' node & children.');
        }

        // for (var index in weapons_selected) {
        //     weapon_name = weapons_selected[index];
        //     if (! weapon_name) {
        //         weapon_name = "[unknown]";
        //     }
        //     combat_area.find('.combat-players--col--' + (index + 1) + '-of-2').append('<span class="combat-slot--desc">Weapon selected: ' + weapon_name + '</span>');
        // }

        // combat_log_scratch.append('<div class="combat-actions-wrapper"></div>');
        // combat_log_scratch.find('.combat-actions-wrapper').append(combat_actions.clone());
        //c? combat_log_scratch.append(combat_actions.clone());
    }

    // Tweak the visual appearance of the log, to help readability.
    function tSCL_update_css_in_log(combat_area, combat_log_scratch) {

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
                console.log('tSCL_clear_log(): Removing localStorage item: ' + item);
                localStorage.removeItem(item);
            }
        }

        // Also clear the Combat log container.
        nodes.combat_log.contents.text("");

        // Finally, hide the window if it's visible, and disable the "show" button.
        tSCL_show_combat_log_window(false);
        nodes.show_button.addClass('tST-button-disabled');
    }

function tSCL_log_combat_activity_detailed() {
    // var self = $('.combat-player--self');
    // console.log(self.find('.combat-player-stats--label--title').text() + ': ' +
    //             self.find('.combat-player-stats--label--perc').text());

    // var stats_mine = self.find('.combat-player-stats--item');

}
