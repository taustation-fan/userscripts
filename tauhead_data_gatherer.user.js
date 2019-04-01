// ==UserScript==
// @name         TauHead Data Gatherer
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/tauhead_data_gatherer.user.js
// @version      1.9
// @description  Post data to TauHead API
// @match        https://alpha.taustation.space/area/*
// @match        https://alpha.taustation.space/character/details/*
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

// *** Personal Data ***
// This script sends your current character level.
// If you"re not happy with that being sent, please do not use this script.
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
// It uses the browser"s localStorage to track which items you receive and
// return during the course of speaking to NPCs during Discreet Work.
// After completion of a Discreet Work (anonymous mission), it sends whether
// you kept any items, and whether you received at item as a reward.

// Nothing user-configurable below
//
var tauhead_domain = "https://www.tauhead.com";
var api_version    = "1.9";

// UI variables.
var th_init_button_ui;
var th_init_message_ui;
var th_region;
var th_message;
var dw_interval_id;
var dw_mission_flow;
var dw_mission_id;
var game_mobile_message_section;
var game_mobile_message_list;
var game_desktop_message_section;
var game_desktop_message_list;
var game_character_message_items;

// store movement of DW items in localStorage
var localStorage_prefix = "tauhead_data_gatherer";
var localStorage_mission_id      = localStorage_prefix + "_mission_id";
var localStorage_current_station = localStorage_prefix + "_current_station";
var localStorage_received_item   = localStorage_prefix + "_received_item";

//
var dw_ignore_mission_items = [
    "Bottle of Spring water",
    "Box of Strawberries",
    "Brosia",
    "Can of Caviar",
    "Copper Ingot",
    "Corpse Hooks",
    "Crate of Fresh fruit",
    "Crate of Gaule Wine",
    "Elric’s Consortium Visa",
    "Emily's Starship Plushie",
    "Galactic Cup Ticket",
    "Goldfish",
    "Hologram Cube",
    "Homemade heater",
    "Husk Body",
    "Lump of Regocrete",
    "Metal Box",
    "Model Porsche",
    "Muck's \"Special\" Package",
    "Plastic Scroll",
    "Polished Cube",
    "Rusted Sculpture",
    "Sadia's Datacard",
    "Shenzia’s Consortium Visa",
    "The 200 Commemorative Pin Badge",
    "Xavier's ID tag",
    "Yellow Rock",
    "Yolanda's Subderm",
    "Yvette's Gift",
];
//

$(document).ready(tauhead_main);

function tauhead_main() {
    "use strict";

    let page_path  = window.location.pathname;
    let clean_path = page_path.replace( /^\//, "" );
    clean_path = clean_path.replace( /\/$/, "" );

    if ( page_path.startsWith("/area/discreet-work") ) {
        tauhead_discreet_work_search_start();
    }
    else if ( page_path.startsWith("/character/details") ) {
        tauhead_discreet_work_search();
    }
    else if ( page_path.startsWith("/area/the-wrecks") ) {
        tauhead_wrecks_salvage_loot()        ||
        tauhead_wrecks_looking_for_trouble() ||
        tauhead_wrecks_sewers();
    }
}

function tauhead_discreet_work_search_start() {
    if ( !tauhead_storage_available() ) {
        console.log("tauhead_data_gatherer: localStorage required for Discreet Work tracking");
        return;
    }

    dw_mission_flow = $( "[id^=mission-].mission-flow" ).first();
    if ( !dw_mission_flow.length ) {
        return;
    }

    dw_mission_id = dw_mission_flow.attr( "id" ).match( /^mission-.*-anonymous-(\d+)$/ );
    if ( !dw_mission_id ) {
        return;
    }

    dw_mission_id = dw_mission_id[1];

    if ( dw_mission_flow
            .find(".mission-updates")
            .text()
            .match( /You have accepted the "Anonymous" mission./i )
        )
    {
        localStorage.setItem( localStorage_mission_id, dw_mission_id );
        localStorage.setItem( localStorage_current_station, tauhead_get_current_station() );
        localStorage.removeItem( localStorage_received_item );
    }
}

function tauhead_discreet_work_search() {
    if ( !tauhead_storage_available() ) {
        console.log("tauhead_data_gatherer: localStorage required for Discreet Work tracking");
        return;
    }

    dw_mission_flow = $( "[id^=mission-].mission-flow" ).first();
    if ( !dw_mission_flow.length ) {
        return;
    }

    dw_mission_id = dw_mission_flow.attr( "id" ).match( /^mission-.*-anonymous-(\d+)$/ );
    if ( !dw_mission_id ) {
        return;
    }

    dw_mission_id = dw_mission_id[1];

    if ( dw_mission_id !== localStorage.getItem( localStorage_mission_id ) ) {
        localStorage.removeItem( localStorage_mission_id );
        localStorage.removeItem( localStorage_current_station );
        localStorage.removeItem( localStorage_received_item );
        return;
    }

    if ( dw_mission_flow.find(".mission-action").text().match( /Ask .* about your reward/i ) ) {
        dw_interval_id = window.setInterval(tauhead_discreet_work_end, 600);
        tauhead_discreet_work_end();
    }
    else {
        dw_interval_id = window.setInterval(tauhead_discreet_work_item_exchange, 600);
        tauhead_discreet_work_item_exchange();
    }
}

function tauhead_discreet_work_item_exchange() {
    let lines = dw_mission_flow.find( ".mission-updates" ).not( "[data-tauhead-dw-seen='1']" );

    if ( 0 === lines.length ) {
        return;
    }

    for ( let i=0; i < lines.length; i++ ) {
        let line = lines[i];
        $(line).attr( "data-tauhead-dw-seen", 1 );

        let receive_item = $(line).text().match( /You have received 1 '(.*)'./ );
        if ( receive_item ) {
            receive_item = receive_item[1];
            if ( dw_ignore_mission_items.includes( receive_item ) ) {
                continue;
            }
            tauhead_discreet_work_add_item( receive_item );
            continue;
        }

        let return_item = $(line).text().match( /You no longer have 1 '(.*)'./ );
        if ( return_item ) {
            return_item = return_item[1];
            if ( dw_ignore_mission_items.includes( return_item ) ) {
                continue;
            }
            tauhead_discreet_work_remove_item( return_item );
            continue;
        }
    }
}

function tauhead_discreet_work_add_item( item ) {
    localStorage.setItem( localStorage_mission_id, dw_mission_id );
    localStorage.setItem( localStorage_received_item, item );
}

function tauhead_discreet_work_remove_item( item ) {
    let stored_item = localStorage.getItem( localStorage_received_item );
    if ( stored_item === item ) {
        localStorage.removeItem( localStorage_received_item );
    }
}

function tauhead_discreet_work_end() {
    let lines = dw_mission_flow.find(".mission-updates");

    if ( 0 === lines.length ) {
        return;
    }

    if ( !lines.text().match( /You have completed the "Anonymous" mission/i ) ) {
        return;
    }

    window.clearInterval(dw_interval_id);

    let current_station = localStorage.getItem( localStorage_current_station );
    let data = {
        action:          "discreet_work_loot",
        current_station: current_station,
        player_level:    tauhead_get_player_level(),
    };

    // Received & kept items
    let stored_mission_id = localStorage.getItem( localStorage_mission_id );
    let stored_item       = localStorage.getItem( localStorage_received_item );

    if ( stored_mission_id && ( stored_mission_id === dw_mission_id ) && stored_item ) {
        data.discreet_work_kept_item = stored_item;
    }

    // Reward Item
    let reward_item = tauhead_first_capture_that_matches( lines, /You have received '(.*)'/i );

    if ( reward_item ) {
        data.discreet_work_reward_item = reward_item;
    }

    // Reward Bonds
    let reward_bonds = tauhead_first_capture_that_matches( lines, /You have received (\d+) bonds/i );

    if ( reward_bonds ) {
        data.discreet_work_reward_bonds = reward_bonds;
    }

    localStorage.removeItem( localStorage_mission_id );
    localStorage.removeItem( localStorage_current_station );
    localStorage.removeItem( localStorage_received_item );

    tauhead_post( data, "Logged Discreet Work loot" );
}

function tauhead_wrecks_salvage_loot() {
    let lines = tauhead_get_character_messages();

    if ( 0 === lines.length ) {
        return;
    }

    if ( !lines.text().match( /Your Stamina is now at \d+%/i ) ) {
        return;
    }

    // Don't want to match this - it must be L4T, not salvageing
    if ( lines.text().match( /Your Agility is now at \d+%/i ) ) {
        return;
    }

    let data = {
        action:          "wrecks_salvage_loot",
        current_station: tauhead_get_current_station(),
        player_level:    tauhead_get_player_level(),
    };

    if ( lines.text().match( /You did not find anything of value/i ) ) {
        data.salvage_success = 0;
    }
    else if ( lines.text().match( /You found a /i ) ) {
        let loot = tauhead_first_capture_that_matches( lines, /"([^"]+)" has been added to your inventory/i );
        if ( !loot ) {
            return;
        }

        data.salvage_success = 1;
        data.salvage_loot    = loot;
    }
    else {
        return;
    }

    tauhead_post( data, "Logged salvage loot" );
    return true;
}

function tauhead_wrecks_looking_for_trouble() {
    let lines = tauhead_get_character_messages();

    if ( 0 === lines.length ) {
        return;
    }

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

    if ( !match ) {
        return;
    }

    let loot = tauhead_first_capture_that_matches( lines, /You have received bonus item '(.*)'/i );

    let data = {
        action:              "wrecks_looking_for_trouble_loot",
        current_station:     tauhead_get_current_station(),
        campaign_level:      match[1],
        campaign_difficulty: match[2],
        campaign_loot:       loot,
        player_level:        tauhead_get_player_level(),
    };

    tauhead_post( data, "Logged Looking-for-Trouble loot" );
    return true;
}

function tauhead_wrecks_sewers() {
    let lines = tauhead_get_character_messages();

    if ( 0 === lines.length ) {
        return;
    }

    let match = lines.text().match(
        /You have completed the "[^"]+ Enter the sewers Level (\d+)" campaign/i
    );

    if ( !match ) {
        return;
    }

    let loot = tauhead_captures_that_match( lines, /You have received bonus item '(.*)'/i );

    let data = {
        action:          "wrecks_sewers_loot",
        current_station: tauhead_get_current_station(),
        campaign_level:  match[1],
        campaign_loot:   loot,
        player_level:    tauhead_get_player_level(),
    };

    tauhead_post( data, "Logged Sewers loot" );
    return true;
}

function tauhead_wrecks_looking_for_trouble_search( success, level, difficulty ) {
    let data = {
        action:          "wrecks_looking_for_trouble_search",
        current_station: tauhead_get_current_station(),
        player_level:    tauhead_get_player_level(),
    };

    if (success) {
        data.campaign_search     = 1;
        data.campaign_level      = level;
        data.campaign_difficulty = difficulty;
    }
    else {
        data.campaign_search = 0;
    }

    tauhead_post( data, "Logged Looking-for-Trouble search result" );
}

function tauhead_get_character_messages() {
    if ( game_character_message_items ) {
        return game_character_message_items;
    }

    if (!game_mobile_message_section) {
        tauhead_populate_mobile_message_vars();
    }

    if ( 0 === game_mobile_message_section.length ) {
        return $();
    }

    game_character_message_items = $(game_mobile_message_section).find("li");

    return game_character_message_items;
}

function tauhead_captures_that_match( lines, regexp ) {
    let captures = [];
    $(lines).each(function() {
        let match = $(this).text().match(regexp);
        if ( match ) {
            captures.push(match[1]);
        }
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

    if ( 0 === message_area.length ) {
        return tauhead_add_message(message, color);
    }

    if (!color) {
        color = "green";
    }

    message_area.append(
        "<div class='mission-updates' style='background-color: "+color+";'>" +
        "TauHead Data Gatherer: " +
        message +
        "</div>"
    );
}

function tauhead_add_message(message, color) {
    if (!th_init_message_ui) {
        tauhead_init_message_ui();
    }

    if (!color) {
        color = "green";
    }

    let message_shown = false;

    if ( game_mobile_message_list.length === 1 ) {
        game_mobile_message_list.append(
            "<li style='background-color: "+color+";'>" +
            "TauHead Data Gatherer: " +
            message +
            "</li>"
        );
        message_shown = true;
    }

    if ( game_desktop_message_list.length === 1 ) {
        game_desktop_message_list.append(
            "<li style='background-color: "+color+";'>" +
            "TauHead Data Gatherer: " +
            message +
            "</li>"
        );
        message_shown = true;
    }

    if ( !message_shown ) {
        $(th_message).append(
            "<div style='background-color: "+color+";'>" +
            message +
            "</div>"
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
    if (th_init_message_ui) {
        return;
    }

    if (!game_mobile_message_section) {
        tauhead_populate_mobile_message_vars();
    }

    if (!game_desktop_message_section) {
        tauhead_populate_desktop_message_vars();
    }

    if ( game_mobile_message_section.length === 0 ) {
        tauhead_init_button_ui();
        th_init_message_ui = true;
        return;
    }

    if ( game_desktop_message_section.length === 0 ) {
        game_desktop_message_section = game_mobile_message_section;
    }

    if ( !game_mobile_message_list || game_mobile_message_list.length === 0 ) {
        game_mobile_message_list = $("<ul id='character-messages' class='messages character-messages-mobile' role='alert' area-label='Action Feedback'></ul>");
        game_mobile_message_section.append(game_mobile_message_list);
    }

    // If we're re-using the mobile section for the desktop,
    // don't add the message twice
    if ( !game_mobile_message_section.is( game_desktop_message_section ) ) {
        if ( !game_desktop_message_list || game_desktop_message_list.length === 0 ) {
            game_desktop_message_list = $("<ul class='messages character-messages-desktop' role='alert' area-label='Action Feedback'></ul>");
            game_desktop_message_section.append(game_desktop_message_list);
        }
    }

    th_init_message_ui = true;
}

function tauhead_init_button_ui() {
    if (th_init_button_ui) {
        return;
    }

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
    if ( !message ) {
        message = "Data logged";
    }

    data.api_version = api_version;

    $(".social-navigation")
        .first()
        .append(
            "<span>"+
                "<span id='tauhead-post-status' class='fa fa-spinner fa-spin' style='color: yellow'>"+
                "</span>"+
                "TauHead"+
            "</span>"
        );
    let status_indicator = $("#tauhead-post-status").first();

    $.post({
        url:         tauhead_domain+"/api/data_gatherer",
        data:        data,
        traditional: true,
        dataType:    "json",
        xhrFields: {
            withCredentials: true
        },
        success: function(jqXHR) {
            if (jqXHR.ok) {
                if ( "discreet_work_loot" === data.action ) {
                    tauhead_add_mission_message(message);
                }
                else {
                    tauhead_add_message(message);
                }
                status_indicator.removeClass("fa-spinner fa-spin");
                status_indicator.addClass("fa-check-circle");
                status_indicator.attr( "style", "color: green" );
            }
            else {
                let error = jqXHR.error || "An error occured";
                tauhead_add_message(error, "orange");
                if ( jqXHR.login_url ) {
                    tauhead_add_message(
                        "<a target='_blank' href='" + jqXHR.login_url + "'>Login</a>",
                        "orange"
                    );
                }
                status_indicator.removeClass("fa-spinner fa-spin");
                status_indicator.addClass("fa-exclamation-circle");
                status_indicator.attr( "style", "color: red" );
            }
        }
    })
        .fail( function() {
            tauhead_add_message("An unknown error occured", "orange");
            status_indicator.removeClass("fa-spinner fa-spin");
            status_indicator.addClass("fa-exclamation-circle");
            status_indicator.attr( "style", "color: red" );
        } );
}

function tauhead_get_player_level() {
    return $(".stats-container .level .amount").first().text();
}

function tauhead_storage_available() {
    // example copied from https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
    var type="localStorage";

    try {
        var storage = window[type],
            x = "__storage_test__";
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return false;
    }
}
