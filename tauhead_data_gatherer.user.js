// ==UserScript==
// @name         TauHead Data Gatherer
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/tauhead_data_gatherer.user.js
// @version      1.2
// @description  Post data to TauHead API
// @match        https://alpha.taustation.space/*
// @exclude      https://alpha.taustation.space/combat/*
// @exclude      https://alpha.taustation.space/shop
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

// *** Personal Data ***
// This script sends your current character level and xp level (% to next level).
// If you're not happy with that being sent, please do not use this script.
// That specific data will not be shared publically on the site, and will only be
// available to site admins.
// ***
// This script requires a current log-in to tauhead.com
// ***
// *** Personal Data Rational ***
// The current hypothesis is that loot rewards are dependant on current player-level.
// This is seen by lower-level players receiving different loot than higher-level players
// for the same task.
// ***
// *** Description ***
// ***
// This script automatically sends data to tauhead.com to be queued for eventual processing.
// The ultimate aim of this data is to allow tauhead.com to show station-specific loot tables
// for different tasks, and to show relative availability of different items.
// ***
// *** When is data sent to tauhead.com ***
// ***
// Ruins / The Wrecks
// ==================
// Every time you "Salvage for goods", it sends whether you were successful or not,
// and what loot you gained.
// Every time you attempt to "Search for Trouble", it sends whether you were
// successful or not. When the "L4T" campaign is complete, it sends what looted
// you gained.
// Every time you complete a Sewers campaign, it sends what loot you gained from
// the final enemy.
// ***
// Discreet Work
// =============
// After completion of a Discreet Work (anonymous mission), it sends whether or
// not you gained an item as loot, and what that item was.
// This script can only identify loot items for which a message is shown upon
// completion of the Discreet Work mission. If an item is added to your
// inventory earlier during the Discreet Work, this will not be logged.

// Nothing user-configurable below
//
var tauhead_domain = 'https://www.tauhead.com';

// UI variables.
var th_init_button_ui;
var th_init_message_ui;
var th_region;
var th_message;
var dw_interval_id;
var game_mobile_message_section;
var game_mobile_message_list;
var game_desktop_message_section;
var game_desktop_message_list;
var game_character_message_items;

//

$(document).ready(tauhead_main);

function tauhead_main() {
    'use strict';

    let page_path  = window.location.pathname;
    let clean_path = page_path.replace( /^\//, "" );
    clean_path = clean_path.replace( /\/$/, "" );
    let path_parts = clean_path.split("/");

    if ( page_path.startsWith("/character/details") ) {
        tauhead_discreet_work_search();
    }

    if ( page_path.startsWith("/area/the-wrecks") ) {
        tauhead_wrecks_salvage_loot()
        || tauhead_wrecks_looking_for_trouble()
        || tauhead_wrecks_sewers();
    }
}

function tauhead_discreet_work_search() {
    if ( $(".mission-action").text().match( /Ask .* about your reward/i ) ) {
        dw_interval_id = window.setInterval(tauhead_discreet_work_loot, 750);
        tauhead_discreet_work_loot();
    }
}

function tauhead_discreet_work_loot(dw) {
    let lines = $(".mission-updates");

    if ( 0 === lines.length )
        return;

    if ( !lines.text().match( /You have completed the "Anonymous" mission/i ) )
        return;

    window.clearInterval(dw_interval_id);

    let loot = tauhead_first_capture_that_matches( lines, /You have received '(.*)'/i );

    let data = {
        method:              'discreet_work_loot',
        current_station:     tauhead_get_current_station(),
        player_level:        $.trim( $("#stats-panel .level .amount").text() ),
        player_xp:           $.trim( $("#stats-panel .experience .amount").text() ),
    };

    if (loot) {
        data["discreet_work_gave_loot_item"] = 1;
        data["discreet_work_loot"]           = loot;
    }
    else {
        data["discreet_work_gave_loot_item"] = 0;
    }

    tauhead_post( data, 'Logged Discreet Work loot' );
}

function tauhead_wrecks_salvage_loot() {
    let lines = tauhead_get_character_messages();

    if ( 0 === lines.length )
        return;

    if ( !lines.text().match( /Your Stamina is now at \d+%/i ) )
        return;

    // Don't want to match this - it must be L4T, not salvageing
    if ( lines.text().match( /Your Agility is now at \d+%/i ) )
        return;

    let data = {
        method:          'wrecks_salvage_loot',
        current_station: tauhead_get_current_station(),
        player_level:    $("#stats-panel .level .amount").text(),
        player_xp:       $("#stats-panel .experience .amount").text(),
    };

    if ( lines.text().match( /You did not find anything of value/i ) ) {
        data["salvage_success"] = 0;
    }
    else if ( lines.text().match( /You found a /i ) ) {
        let loot = lines.text().match( /"([^"]+)" has been added to your inventory/i );
        if ( !loot )
            return;

        data["salvage_success"] = 1;
        data["salvage_loot"]    = loot[1];
    }
    else {
        return;
    }

    tauhead_post( data, 'Logged salvage loot' );
    return true;
}

function tauhead_wrecks_looking_for_trouble() {
    let lines = tauhead_get_character_messages();

    if ( 0 === lines.length )
        return;

    if (
        lines.text().match( /Your Agility is now at \d+%/i ) &&
        lines.text().match( /Your Stamina is now at \d+%/i )
    ) {
        // Searching for a campaign
        if ( lines.text().match( /You did not find anyone/i ) ) {
            tauhead_wrecks_looking_for_trouble_search( false );
            return true;
        }

        let campaign = lines.text().match(
            /You have accepted the "[^"]+ Look for trouble Level (\d+) Difficulty (\w+)" campaign/i
        );
        if (campaign) {
            tauhead_wrecks_looking_for_trouble_search( true, campaign[1], campaign[2] );
        }
        return true;
    }

    let match = lines.text().match(
        /You have completed the "[^"]+ Look for trouble Level (\d+) Difficulty (\w+)" campaign/i
    );

    if ( !match )
        return;

    let loot = lines.text().match( /You have received bonus item '(.*)'/i );

    let data = {
        method:              'wrecks_looking_for_trouble_loot',
        current_station:     tauhead_get_current_station(),
        campaign_level:      match[1],
        campaign_difficulty: match[2],
        campaign_loot:       loot[1],
        player_level:        $.trim( $("#stats-panel .level .amount").text() ),
        player_xp:           $.trim( $("#stats-panel .experience .amount").text() ),
    };

    tauhead_post( data, 'Logged Looking-for-Trouble loot' );
    return true;
}

function tauhead_wrecks_sewers() {
    let lines = tauhead_get_character_messages();

    if ( 0 === lines.length )
        return;

    let match = lines.text().match(
        /You have completed the "[^"]+ Enter the sewers Level (\d+)" campaign/i
    );

    if ( !match )
        return;

    let loot = [];
    $(lines).each(function() {
        let loot_match = $(this).text().match( /You have received bonus item '(.*)'/i );
        if (loot_match) {
            loot.push( loot_match[1] );
        }
    });

    let data = {
        method:          'wrecks_sewers_loot',
        current_station: tauhead_get_current_station(),
        campaign_level:  match[1],
        campaign_loot:   loot,
        player_level:    $.trim( $("#stats-panel .level .amount").text() ),
        player_xp:       $.trim( $("#stats-panel .experience .amount").text() ),
    };

    tauhead_post( data, 'Logged Sewers loot' );
    return true;
}

function tauhead_wrecks_looking_for_trouble_search( success, level, difficulty ) {
    let data = {
        method:          'wrecks_looking_for_trouble_search',
        current_station: tauhead_get_current_station(),
        player_level:    $("#stats-panel .level .amount").text(),
        player_xp:       $("#stats-panel .experience .amount").text(),
    };

    if (success) {
        data["campaign_search"]     = 1;
        data["campaign_level"]      = level;
        data["campaign_difficulty"] = difficulty;
    }
    else {
        data["campaign_search"] = 0;
    }

    tauhead_post( data, 'Logged Looking-for-Trouble search result' );
}

function tauhead_get_character_messages() {
    if ( game_character_message_items )
        return game_character_message_items;

    if (!game_mobile_message_section)
        tauhead_populate_mobile_message_vars();

    if ( 0 === game_mobile_message_section.length )
        return $();

    game_character_message_items = $(game_mobile_message_section).find("li");

    return game_character_message_items;
}

function tauhead_captures_that_match( lines, regexp ) {
    let captures = [];
    $(lines).each(function() {
        let match = $(this).text().match(regexp);
        if ( match )
            captures.push(match[1]);
    });
    return captures;
}

function tauhead_first_capture_that_matches( lines, regexp ) {
    let captures = tauhead_captures_that_match( lines, regexp );
    if ( captures.length >= 1 ) {
        return captures[0];
    }
    return;
}

function tauhead_get_current_station() {
    return $.trim( $("#main-content .location-container .station").text() );
}

function tauhead_add_mission_message(message, color) {
    let message_area = $(".mission-flow").first();

    if ( 0 === message_area.length )
        return tauhead_add_message(message, color);

    if (!color)
        color = 'green';

    message_area.append(
        '<div class="mission-updates" style="background-color: '+color+';">' +
        'TauHead Data Gatherer: ' +
        message +
        '</div>'
    );
}

function tauhead_add_message(message, color) {
    if (!th_init_message_ui)
        tauhead_init_message_ui();

    if (!color)
        color = 'green';

    let message_shown = false;

    if ( game_mobile_message_list.length === 1 ) {
        game_mobile_message_list.append(
            '<li style="background-color: '+color+';">' +
            'TauHead Data Gatherer: ' +
            message +
            '</li>'
        );
        message_shown = true;
    }

    if ( game_desktop_message_list.length === 1 ) {
        game_desktop_message_list.append(
            '<li style="background-color: '+color+';">' +
            'TauHead Data Gatherer: ' +
            message +
            '</li>'
        );
        message_shown = true;
    }

    if ( !message_shown ) {
        $(th_message).append(
            '<div style="background-color: '+color+';">' +
            message +
            '</div>'
        );
    }
}

function tauhead_populate_mobile_message_vars() {
    game_mobile_message_section = $("#main-content > section[aria-label='Feedback']").first();
    game_mobile_message_list    = $(game_mobile_message_section).find("ul#character-messages").first();
}

function tauhead_populate_desktop_message_vars() {
    game_desktop_message_section = $("#main-content > .content-section > section[aria-label='Action Feedback']").first();
    game_desktop_message_list    = $(game_desktop_message_section).find("ul.character-messages-desktop").first();
}

function tauhead_init_message_ui() {
    if (th_init_message_ui)
        return;

    if (!game_mobile_message_section)
        tauhead_populate_mobile_message_vars();

    if (!game_desktop_message_section)
        tauhead_populate_desktop_message_vars();

    if ( game_mobile_message_section.length === 0 ) {
        tauhead_init_button_ui();
        th_init_message_ui = true;
        return;
    }

    if ( game_desktop_message_section.length === 0 )
        game_desktop_message_section = game_mobile_message_section;

    if ( !game_mobile_message_list || game_mobile_message_list.length === 0 ) {
        game_mobile_message_list = $('<ul id="character-messages" class="messages character-messages-mobile" role="alert" area-label="Action Feedback"></ul>');
        game_mobile_message_section.append(game_mobile_message_list);
    }

    // If we're re-using the mobile section for the desktop,
    // don't add the message twice
    if ( game_mobile_message_section[0] != game_desktop_message_section[0] ) {
        if ( !game_desktop_message_list || game_desktop_message_list.length === 0 ) {
            game_desktop_message_list = $('<ul class="messages character-messages-desktop" role="alert" area-label="Action Feedback"></ul>');
            game_desktop_message_section.append(game_desktop_message_list);
        }
    }

    th_init_message_ui = true;
}

function tauhead_init_button_ui() {
    if (th_init_button_ui)
        return;

    th_region  = $("<div></div>");
    th_message = $("<div></div>");
    $("body").append(th_region);

    $(th_region).append(
        "<div>TauHead Data-Gatherer</div>",
        th_message
    );

    th_init_button_ui = true;
}

function tauhead_post( data, message ) {
    if ( !message )
        message = "Data logged";

    $.post({
        url:         tauhead_domain+"/api/data_gatherer",
        data:        data,
        traditional: true,
        dataType:    "json",
        success: function(jqXHR) {
            if (jqXHR.ok) {
                if ( "discreet_work_loot" === data["method"] ) {
                    tauhead_add_mission_message(message);
                }
                else {
                    tauhead_add_message(message);
                }
            }
            else {
                let error = jqXHR["error"] || 'An error occured';
                tauhead_add_message(error, 'orange');
                if (jqXHR["login_url"]) {
                    tauhead_add_message(
                        '<a target="_blank" href="' + jqXHR['login_url'] + '">Login</a>',
                        'orange'
                    );
                }
            }
        }
    });
}
