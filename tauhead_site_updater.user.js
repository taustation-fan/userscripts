// ==UserScript==
// @name         TauHead Site Updater
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/tauhead_site_updater.user.js
// @version      1.1
// @description  Add buttons to in-game pages to update TauHead with data on auction-listings, items, stations, areas, NPCs and vendor-inventories
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @require      https://rawgit.com/taustation-fan/userscripts/master/userscript-preferences.js
// ==/UserScript==

// ***
// This script requires a current log-in to tauhead.com with appropriate user-rights granted.
// ***

/* globals userscript_preferences: false */

var tauhead_domain = "https://www.tauhead.com";

var error_css_colour = "#ff0000";

//

var vendor_item_fields = [
    "max_quantity_that_can_be_sold_per_attempt",
    "default_quantity",
    "has_unlimited_quantity",
    "price",
    "price_unit"
];

var item_fields = [
    "name",
    "slug",
    "image",
    "tier",
    "overridden_tier",
    "stack_size",
    "bonds",
    "mass",
    "rarity",
    "description"
];

var item_fields_might_have_rel = {
    "item_component_armor": [
        "energy",
        "impact",
        "piercing"
    ],
    "item_component_medical": [
        "base_toxicity",
        "strength_boost",
        "agility_boost",
        "stamina_boost",
        "intelligence_boost",
        "social_boost"
    ],
    "item_component_mod": [
        "focus_mod",
        "strength_mod",
        "agility_mod",
        "stamina_mod",
        "intelligence_mod",
        "social_mod",
        "mod_type"
    ],
    "item_component_weapon": [
        "energy_damage",
        "impact_damage",
        "piercing_damage",
        "accuracy",
        "hand_to_hand"
    ]
};

var item_type_fields = [
    "name",
    "slug",
];

// UI variables.
var tSTauHeadHelper_region;
var tSTauHeadHelper_buttons = {};
var tSTauHeadHelper_known_ui_areas = ["area", "sub_area", "other", "items", "auction"];
var tSTauHeadHelper_message_area;

//

$(document).ready(tSTauHeadHelper_main);

function tSTauHeadHelper_main() {
    "use strict";

    let config = userscript_preferences( site_updater_preferences() );
    let page_path  = window.location.pathname;
    let clean_path = page_path.replace( /^\//, "" );
    clean_path = clean_path.replace( /\/$/, "" );
    let path_parts = clean_path.split("/");

    if ( 2 === path_parts.length && "area" === path_parts[0] ) {
        if ( config.update_all ) {
            tSTauHeadHelper_add_button({ action: "add_area",     slug: path_parts[1], span: "area" });
            tSTauHeadHelper_add_button({ action: "add_sub_area", slug: path_parts[1], span: "sub_area" });
            tSTauHeadHelper_add_button({ action: "add_area",     slug: path_parts[1], url: "update_area",     text: "Update Area",     span: "area" });
            tSTauHeadHelper_add_button({ action: "add_sub_area", slug: path_parts[1], url: "update_sub_area", text: "Update Sub-Area", span: "sub_area" });

            tSTauHeadHelper_add_button({ action: "add_area_npcs", slug: path_parts[1], span: "other" });

            if ( "government-center" === path_parts[1] ) {
                tSTauHeadHelper_add_button({ action: "update_station_details", span: "other" });
            }
            // else if ( "storage" === path_parts[1] ) {
            //     tSTauHeadHelper_add_button({ action: "update_items_from_storage", url: "update_items", text: "Update Items", span: "items" });
            // }
        }
    }
    else if ( 2 === path_parts.length && "item" === path_parts[0] ) {
        if ( config.update_all || config.update_auctions_and_items ) {
            tSTauHeadHelper_add_button({ action: "update_item", slug: path_parts[1], span: "items" });
        }
    }
    // else if ( 2 === path_parts.length && "character" === path_parts[0] && "inventory" === path_parts[1] ) {
    //     tSTauHeadHelper_add_button({ action: "update_items_from_inventory", url: "update_items", text: "Update Items", span: "items" });
    // }
    else if ( 3 === path_parts.length && "character" === path_parts[0] && "details" === path_parts[1] ) {
        if ( config.update_all ) {
            tSTauHeadHelper_add_button({ action: "update_npc", slug: path_parts[2], text: "Update NPC", span: "other" });
        }
    }
    else if ( 4 === path_parts.length && "area" === path_parts[0] && ( "character" === path_parts[2] || "corporation" === path_parts[2] ) ) {
        if ( config.update_all ) {
            tSTauHeadHelper_add_button({ action: "update_vendor_itinerary", area_slug: path_parts[1], span: "items" });
        }
    }

    if ( page_path.startsWith("/area/electronic-market") ) {
        if ( config.update_all || config.update_auctions_and_items ) {
            tSTauHeadHelper_add_button({ action: "log_auctions", span: "auction" });
        }
    }

    if ( Object.keys( tSTauHeadHelper_buttons ).length ) {
        tSTauHeadHelper_render_buttons();
    }
}

var tSTauHeadHelper_actions = {
    add_area: function(data, defaults) {
        if ( typeof defaults === "undefined" ) {
            defaults = {};
        }

        let name = document.title;
        name = name.replace( / — τ — Tau Station/, "" );
        name = name.replace( /\/.*/, "" );
        name = trim_ws_ends(name);

        let desc = $(".description-container").first();
        let aka  = $(desc).find(".name").text();
        let other = $(desc).find(".station").text();
        let station = other.replace( /,.*/, "" );
        station = trim_ws_ends(station);
        let system  = other.replace( /.*,\s+/, "" );
        system = system.replace( /\s+system\s+$/i, "" );
        system = trim_ws_ends(system);

        defaults.system                 = system;
        defaults.station                = station;
        defaults.name                   = name;
        defaults.aka                    = aka;
        defaults.bg_img                 = get_bg_img();
        defaults.content_img            = get_content_img();
        defaults.content_side_img       = get_content_side_img();
        defaults.hero_img               = get_hero_img();
        defaults.other_img              = get_other_img(data);
        defaults.area_description_short = get_area_description_short();
        defaults.area_description_long  = get_area_description_long();
        defaults.slug                   = data.slug;

        tSTauHeadHelper_post({ request: data, response: defaults });
    },

    add_area_npcs: function(data) {
        let desc = $(".description-container").first();
        let other = $(desc).find(".station").text();
        let station = other.replace( /,.*/, "" );
        station = trim_ws_ends(station);
        let system  = other.replace( /.*,\s+/, "" );
        system = system.replace( /\s+system\s+$/i, "" );
        system = trim_ws_ends(system);

        let response = {
            system:    system,
            station:   station,
            area_slug: data.slug,
        };

        let npc_counter = 0;
        $("#people div.tab-content-people h2")
            .each(function() {
                if ( ! $(this).text().match( /\bNPCs\b/i ) ) {
                    return;
                }

                $(this).next("table").find("tbody tr").each(function() {
                    npc_counter++;
                    let link           = $(this).find("td:nth-child(1) a");
                    let primary_weapon = $(this).find("td:nth-child(2)").text();
                    let armor          = $(this).find("td:nth-child(3)").text();
                    let slug = $(link).attr("href");
                    slug = slug.replace( /\/character\/details\//, "" );
                    let name = $(link).text();
                    //
                    primary_weapon = string_to_slug( primary_weapon );
                    armor          = string_to_slug( armor );
                    //
                    response["npc_"+npc_counter+".slug"] = slug;
                    response["npc_"+npc_counter+".name"] = trim_ws_ends( name );
                    if ( primary_weapon !== "none" ) {
                        response["npc_"+npc_counter+".primary_weapon_slug"] = primary_weapon;
                    }
                    if ( armor !== "none" ) {
                        response["npc_"+npc_counter+".armor_slug"] = armor;
                    }
                });
            });
        response.npc_counter = npc_counter;

        tSTauHeadHelper_post({ request: data, response: response });
    },

    add_sub_area: function(data) {
        let parent_link = $("div.game-navigation nav ul.areas li.area.current a[href^='/travel/area/']").first();
        let parent_slug = parent_link.attr("href");
        parent_slug = parent_slug.replace( /^\/travel\/area\//, "" );

        let defaults = {
            parent_area_slug: parent_slug,
        };

        return tSTauHeadHelper_actions.add_area(data, defaults);
    },

    log_auctions: function(data) {
        if ( !is_storage_available() ) {
            console.log("localStorage not available");
            tSTauHeadHelper_message_area.css("background-color", error_css_colour);
            tSTauHeadHelper_message_area.text("localStorage not available");
            return;
        }

        let gct = $("#gct_display").text();
        gct = gct.replace( /[^0-9./:]+/g, "" );
        gct = trim_ws_ends(gct);

        let auction_counter = 0;
        let response = {
            "gct": gct,
        };

        $("ul.market-list li.market-list--item").each(function() {
            auction_counter++;

            let details   = $(this).find(".market-item--content").first();
            let url       = $(details).find(".market-item--content--item dd a").first().attr("href");
            let quantity  = $(details).find(".market-item--content--qty dd").first().text();
            let price     = $(details).find(".market-item--content--price dd .currency-amount").first().text();
            price = price.replace( /,/g, "" );

            let target_id   = $(details).find(".market-item--content--expand dd button").first().attr("data-area-toggle-target");
            let target      = $(this).find("#"+target_id);
            let seller_link = $(target).find(".market-item-details-data--row:nth-child(1) dd a").first();
            let seller_slug = $(seller_link).attr("href");
            let seller_name = $(seller_link).text();
            let auction_id  = $(target).find("a.market-item--buy-btn").attr("href");

            response["auction_"+auction_counter+".auction_id"]  = path_to_slug(auction_id);
            response["auction_"+auction_counter+".item_slug"]   = path_to_slug(url);
            response["auction_"+auction_counter+".quantity"]    = trim_ws_ends(quantity);
            response["auction_"+auction_counter+".price"]       = trim_ws_ends(price);
            response["auction_"+auction_counter+".seller_slug"] = path_to_slug(seller_slug);
            response["auction_"+auction_counter+".seller_name"] = trim_ws_ends(seller_name);
        });

         // Add own auctions
         // ( Only from page 1 )
         if ( ( window.location.pathname === "/area/electronic-market" ) ||
            ( window.location.pathname === "/area/electronic-market/page/1" ) )
         {
             let own_auctions = $("ol.market-my-items--list li");

             if ( own_auctions.length ) {
                 inject(fetch_game_character);
                 let own_name = localStorage.getItem( "tauhead_game_name" );
                 let own_slug = localStorage.getItem( "tauhead_game_slug" );

                 own_auctions.each(function() {
                     auction_counter++;

                     let reclaim_button = $(this).find(".market-my-items--list-col--reclaim a").first().attr("href");
                     reclaim_button = reclaim_button.replace(/^\/area\/electronic-market\/buy-item\//, "");

                     let details = $(this).find(".market-my-items--list-col--item dd").first().text();
                     let match   = details.match( /(.*) Quantity \((\d+)\)/ );
                     let item_name = match[1];
                     let quantity  = match[2];

                     let price = $(this).find(".market-my-items--list-col--price .currency-amount").first().text();
                     while ( price.match(/,/) ) {
                         price = price.replace(/,/, "");
                     }

                     response["auction_"+auction_counter+".auction_id"]  = reclaim_button;
                     response["auction_"+auction_counter+".item_slug"]   = get_slug(item_name);
                     response["auction_"+auction_counter+".quantity"]    = quantity;
                     response["auction_"+auction_counter+".price"]       = price;
                     response["auction_"+auction_counter+".seller_slug"] = own_slug;
                     response["auction_"+auction_counter+".seller_name"] = own_name;
                 });
             }
         }

        response.auction_counter = auction_counter;
        tSTauHeadHelper_post({ request: data, response: response });
    },

    update_item: function(data) {
        let response = {};

        var item      = $(".item-individual > .item-detailed").first();
        var header    = $(item).find(".item-detailed-header");
        var content   = $(item).find(".item-detailed-content");
        var container = $(content).find(".item-detailed-container");
        var stats     = $(container).find(".item-detailed-stats");

        response.slug = data.slug;
        response.name = $(header).find("h1.name").text();

        response.image = $(container).find(".item-framed-img > img").attr("src");

        // lowercase item_type_slug
        response.item_type_slug = $(stats).find(".type > span").text();
        response.item_type_slug = response.item_type_slug.toLowerCase();
        response.item_type_slug = trim_ws_ends( response.item_type_slug );
        response.item_type_slug = response.item_type_slug.replace( /\s+/, "-" );

        response.rarity = $(stats).find(".rarity > span").text();
        response.tier   = $(stats).find(".tier > span").text();

        // strip " kg" from end of mass
        response.mass   = $(stats).find(".weight > span").text();
        response.mass = response.mass.replace( /\s+kg/, "" );

        // parse value
        response.value = $(stats).find(".value .currency").text();
        response.value = response.value.match( /^(\d+)/ )[1];

        response.description = $(content).find(".item-detailed-description").text();

        switch ( response.item_type_slug ) {
            case "armor":
                response["item_component_armor.energy"]   = $(stats).find(".energy-damage span").text();
                response["item_component_armor.impact"]   = $(stats).find(".impact-damage span").text();
                response["item_component_armor.piercing"] = $(stats).find(".piercing-damage span").text();
                break;
            case "medical":
                // medical list items don't currently have meaningful class names
                // they're all "strength" - hopefully a bug that'll be fixed
                // need to check text values instead
                $(stats).find("ul li").each(function() {
                    let name  = $(this).text();
                    let value = $(this).find("span").text();
                    value = trim_ws_ends( value );
                    if ( name.match( /Base Toxicity/i ) ) {
                        let percent = value.match( /(\d+)\s*\%/ );
                        if ( percent ) {
                            value = percent[1]/100;
                            value = value.toFixed(3);
                        }
                        response["item_component_medical.base_toxicity"] = value;
                    }
                    else if ( name.match( /Strength Boost/i ) ) {
                        response["item_component_medical.strength_boost"] = value;
                    }
                    else if ( name.match( /Agility Boost/i ) ) {
                        response["item_component_medical.agility_boost"] = value;
                    }
                    else if ( name.match( /Stamina Boost/i ) ) {
                        response["item_component_medical.stamina_boost"] = value;
                    }
                    else if ( name.match( /Intelligence Boost/i ) ) {
                        response["item_component_medical.intelligence_boost"] = value;
                    }
                    else if ( name.match( /Social Boost/i ) ) {
                        response["item_component_medical.social_boost"] = value;
                    }
                });
                break;
            // case "mod":
            //     console.log("item_type_slug: 'mod' not yet implemented in-game")
            //     break;
            case "weapon":
                response["item_component_weapon.energy_damage"]   = $(stats).find(".energy-damage span").text();
                response["item_component_weapon.impact_damage"]   = $(stats).find(".impact-damage span").text();
                response["item_component_weapon.piercing_damage"] = $(stats).find(".piercing-damage span").text();
                response["item_component_weapon.accuracy"]        = $(stats).find(".accuracy span").text();
                response["item_component_weapon.weapon_type"]     = $(stats).find(".weapon_type span").text();

                // calculate
                let h2h    = $(stats).find(".hand-to-hand span").text();
                let is_h2h = h2h.match( /yes/i );
                response["item_component_weapon.hand_to_hand"] = is_h2h ? 1 : 0;

                // calculate is_long_range
                let range   = $(stats).find(".range span").text();
                let is_long = range.match( /long/i );
                response["item_component_weapon.is_long_range"] = is_long ? 1 : 0;
                break;
            // default:
            //     console.log("unknown item_type_slug: '" + response.item_type_slug + "'");
        }

        tSTauHeadHelper_post({ request: data, response: response });
    },

    update_items: function(data, items) {
        let item_counter      = 0;
        let item_type_counter = 0;
        let seen_slug  = {};
        let item_types = {};
        let response   = {};

        for ( let i=0; i < items.length; i++ ) {
            let item = items[i];
            if ( seen_slug[ item.slug ] ) {
                continue;
            }

            item_counter++;
            response["item_"+item_counter+".id"] = item.item_id;
            response["item_"+item_counter+".item_type_slug"] = item.item_type.slug;
            for ( let j=0; j < item_fields.length; j++ ) {
                let item_key   = item_fields[j];
                let item_value = item[item_key];
                response["item_"+item_counter+"."+item_key] = item_value;
            }
            for (var rel_name in item_fields_might_have_rel) {
                if (!item_fields_might_have_rel.hasOwnProperty(rel_name)) {
                    continue;
                }

                let rel_vals = item[rel_name];
                if (rel_vals === null) {
                    continue;
                }

                let rel_cols = item_fields_might_have_rel[rel_name];

                for ( let k=0; k < rel_cols.length; k++ ) {
                    let col_name  = rel_cols[k];
                    let col_value = rel_vals[col_name];

                    if ( col_name !== null && typeof(col_name) === "object" ) {
                        // nested
                        for (let sub_rel_name in col_name) {
                            if (!col_name.hasOwnProperty(sub_rel_name)) {
                                continue;
                            }

                            let sub_rel_vals = col_name[sub_rel_name];
                            if (sub_rel_vals === null) {
                                continue;
                            }

                            let sub_rel_cols = col_name[sub_rel_name];

                            for ( let l=0; l < sub_rel_cols.length; l++ ) {
                                let sub_col_name  = sub_rel_cols[l];
                                let sub_col_value = sub_rel_vals[sub_col_name];

                                if ( typeof sub_col_value !== "undefined" ) {
                                    response["item_"+item_counter+"."+rel_name+"."+col_name+"."+sub_col_name] = sub_col_value;
                                }
                            }
                        }
                    }
                    else {
                        response["item_"+item_counter+"."+rel_name+"."+col_name] = col_value;
                    }
                }

                // Special-case item_component_weapon[weapon_type]
                if ( "item_component_weapon" === rel_name ) {
                    response["item_"+item_counter+".item_component_weapon.weapon_type"]   = item.item_component_weapon.weapon_type.name;
                    response["item_"+item_counter+".item_component_weapon.is_long_range"] = item.item_component_weapon.weapon_type.is_long_range;
                }
            }

            seen_slug[ item.slug ] = 1;

            let item_type = item.item_type;
            if ( !item_types[item_type.slug] ) {
                item_type_counter++;
                for ( var p=0; p < item_type_fields.length; p++ ) {
                    let item_type_key   = item_type_fields[p];
                    let item_type_value = item_type[item_type_key];
                    response["item_type_"+item_type_counter+"."+item_type_key] = item_type_value;
                }
                item_types[item_type.slug] = 1;
            }
        }

        response.item_counter      = item_counter;
        response.item_type_counter = item_type_counter;

        tSTauHeadHelper_post({ request: data, response: response });
    },

    // update_items_from_inventory: function(data) {
    //     let script = $(".content-section .inventory ~ script").html();
    //     script = script.replace( /^\s*var\s+items\s*=\s*/, "" );
    //     script = script.replace( /\s+var\s+friends\s+=[\s\S]*/, "" );
    //     script = script.replace( /;\s*$/, "" );
    //     let json = JSON.parse( script );
    //     let carried_groups = json.carried_groups;
    //     let carried        = json.carried;
    //     let items          = [];
    //
    //     for ( let i=0; i<carried_groups.length; ++i ) {
    //         let group       = carried_groups[i];
    //         let group_items = carried[group];
    //
    //         for ( let j=0; j<group_items.length; ++j ) {
    //             let item = group_items[j].item;
    //
    //             item.image = group_items[j].image;
    //
    //             items.push( item );
    //         }
    //     }
    //
    //     return tSTauHeadHelper_actions.update_items(data, items);
    // },

    // update_items_from_storage: function(data) {
    //     let script = $(".storage-container + script").html();
    //     script = script.replace( /^\s*var\s+storage\s*=\s*/, "" );
    //     script = script.replace( /\{\s+items:/, `{"items":` );
    //     let json = JSON.parse( script );
    //     let carried_groups = json.items.carried_groups;
    //     let carried        = json.items.carried;
    //     let items          = [];
    //
    //     for ( let i=0; i<carried_groups.length; ++i ) {
    //         let group       = carried_groups[i];
    //         let group_items = carried[group];
    //
    //         for ( let j=0; j<group_items.length; ++j ) {
    //             let item = group_items[j].item;
    //
    //             item.image = group_items[j].image;
    //
    //             items.push( item );
    //         }
    //     }
    //
    //     return tSTauHeadHelper_actions.update_items(data, items);
    // },

    update_npc: function(data) {
        let char = $(".character-overview").first();

        let name = $(char).find("h1").first().text();

        let match = $(".character-profile--details p").first().text().match( /(\w+) genotype/i );
        let genotype = match[1].toLowerCase();

        let description = $(".character-profile").first().next("div").text();

        let avatar = $(".character-profile--image img").first().attr("src");

        let response = {
            "slug":        data.slug,
            "name":        trim_ws_ends( name ),
            "genotype":    genotype,
            "description": trim_ws_ends( description ),
            "avatar":      avatar
        };

        tSTauHeadHelper_post({ request: data, response: response });
    },

    update_station_details: function(data) {
        let desc    = $(".description-container").first();
        let other   = $(desc).find(".station").text();
        let station = other.replace( /,.*/, "" );
        let system  = other.replace( /.*,\s+/, "" );
        system = system.replace( /\s+system\s+$/i, "" );

        let stats           = $(".station-stats > dl").first();
        let affiliation     = $(stats).find("div:nth-child(1) dd").text();
        let orwellian_level = $(stats).find("div:nth-child(2) dd").text();
        let law_level       = $(stats).find("div:nth-child(3) dd").text();
        let level           = $(stats).find("div:nth-child(4) dd").text();

        let response = {
            "system":          trim_ws_ends( system ),
            "station":         trim_ws_ends( station ),
            "affiliation":     string_to_slug( affiliation ),
            "orwellian_level": string_to_slug( orwellian_level ),
            "law_level":       string_to_slug( law_level ),
            "level":           trim_ws_ends( level ),
        };

        tSTauHeadHelper_post({ request: data, response: response });
    },

    update_vendor_itinerary: function(data) {
        let desc = $(".description-container").first();
        let other = $(desc).find(".station").text();
        let station = other.replace( /,.*/, "" );
        station = trim_ws_ends(station);
        let system  = other.replace( /.*,\s+/, "" );
        system = system.replace( /\s+system\s+$/i, "" );
        system = trim_ws_ends(system);

        let response = {
            system:    system,
            station:   station,
            area_slug: data.area_slug
        };

        let script = $(".vendor-container + script").html();
        script = script.replace( /^\s*var\s+vendor\s*=\s*/, "" );
        script = script.replace( /\{\s+items:/, `{"items":` );
        let json = JSON.parse( script );

        let vendor = json.items;
        response["vendor.name"] = vendor.name;
        response["vendor.slug"] = vendor.slug;
        response["vendor.is_corporation"] = vendor.is_corporation;

        let items      = {};
        let item_types = {};
        let vendor_item_counter = 0;
        let item_counter        = 0;
        let item_type_counter   = 0;
        let market_stall_id;

        for ( var i=0; i < json.items.items.length; i++ ) {
            vendor_item_counter++;
            let vendor_item = json.items.items[i];

            response["vendor_item_"+vendor_item_counter+".id"] = vendor_item.market_stall_item_id;
            response["vendor_item_"+vendor_item_counter+".item_slug"] = vendor_item.item.slug;
            for ( var j=0; j < vendor_item_fields.length; j++ ) {
                let vendor_item_key   = vendor_item_fields[j];
                let vendor_item_value = vendor_item[vendor_item_key];
                if ( null === vendor_item_value) {
                    vendor_item_value = "";
                }
                response["vendor_item_"+vendor_item_counter+"."+vendor_item_key] = vendor_item_value;
            }

            if ( !market_stall_id ) {
                market_stall_id = vendor_item.market_stall_id;
                response["vendor.id"] = market_stall_id;
            }

            let item = vendor_item.item;
            if ( !items[vendor_item.item_id] ) {
                item_counter++;
                response["item_"+item_counter+".id"] = vendor_item.item_id;
                response["item_"+item_counter+".item_type_slug"] = item.item_type.slug;

                for ( var k=0; k < item_fields.length; k++ ) {
                    let item_key   = item_fields[k];
                    let item_value = item[item_key];
                    response["item_"+item_counter+"."+item_key] = item_value;
                }
                for (var rel_name in item_fields_might_have_rel) {
                    if (!item_fields_might_have_rel.hasOwnProperty(rel_name)) {
                        continue;
                    }

                    let rel_vals = item[rel_name];
                    if (rel_vals === null) {
                        continue;
                    }

                    let rel_cols = item_fields_might_have_rel[rel_name];

                    for ( var m=0; m < rel_cols.length; m++ ) {
                        let col_name  = rel_cols[m];
                        let col_value = rel_vals[col_name];

                        if ( col_name !== null && typeof(col_name) === "object" ) {
                            // nested
                            for (var sub_rel_name in col_name) {
                                if (!col_name.hasOwnProperty(sub_rel_name)) {
                                    continue;
                                }

                                let sub_rel_vals = col_name[sub_rel_name];
                                if (sub_rel_vals === null) {
                                    continue;
                                }

                                let sub_rel_cols = col_name[sub_rel_name];

                                for ( var n=0; n < sub_rel_cols.length; n++ ) {
                                    let sub_col_name  = sub_rel_cols[n];
                                    let sub_col_value = sub_rel_vals[sub_col_name];

                                    if ( typeof sub_col_value !== "undefined" ) {
                                        response["item_"+item_counter+"."+rel_name+"."+col_name+"."+sub_col_name] = sub_col_value;
                                    }
                                }
                            }
                        }
                        else {
                            response["item_"+item_counter+"."+rel_name+"."+col_name] = col_value;
                        }
                    }

                    // Special-case item_component_weapon[weapon_type]
                    if ( "item_component_weapon" === rel_name ) {
                        response["item_"+item_counter+".item_component_weapon.weapon_type"]   = item.item_component_weapon.weapon_type.name;
                        response["item_"+item_counter+".item_component_weapon.is_long_range"] = item.item_component_weapon.weapon_type.is_long_range;
                    }
                }
                items[vendor_item.item_id] = 1;
            }

            let item_type = item.item_type;
            if ( !item_types[item_type.slug] ) {
                item_type_counter++;
                for ( var p=0; p < item_type_fields.length; p++ ) {
                    let item_type_key   = item_type_fields[p];
                    let item_type_value = item_type[item_type_key];
                    response["item_type_"+item_type_counter+"."+item_type_key] = item_type_value;
                }
                item_types[item_type.slug] = 1;
            }
        }

        response.vendor_item_counter = vendor_item_counter;
        response.item_counter        = item_counter;
        response.item_type_counter   = item_type_counter;

        tSTauHeadHelper_post({ request: data, response: response });
    }
};

function tSTauHeadHelper_add_button( data ) {
    let span = data.span || "other";

    if ( tSTauHeadHelper_known_ui_areas.indexOf(span) === -1 ) {
        span = "other";
    }

    if ( tSTauHeadHelper_buttons[span] ) {
        tSTauHeadHelper_buttons[span].push( data );
    }
    else {
        tSTauHeadHelper_buttons[span] = [data];
    }
}

function tSTauHeadHelper_render_buttons() {
    tSTauHeadHelper_init_ui();

    for ( let ui_area of tSTauHeadHelper_known_ui_areas ) {
        if ( ! tSTauHeadHelper_buttons[ui_area] ) {
            continue;
        }

        let span = $("<span/>").appendTo(tSTauHeadHelper_region);

        for ( let data of tSTauHeadHelper_buttons[ui_area] ) {
            let id   = data.id   || data.action;
            let text = data.text || slug_to_words(data.action);

            let attrs = {
                id:    "tauhead_helper_"+id,
                style: "font-size: large;",
                text:  text
            };

            let button = $("<button/>", attrs);
            button.click( function() { tSTauHeadHelper_actions[data.action](data); } );

            span.append(button, "<br/>");
        }

        $(span).find("button").last().css( "margin-bottom", "0.5em" );
    }
}

function tSTauHeadHelper_init_ui() {
    // add_css_link("https://rawgit.com/taustation-fan/userscripts/master/taustation-tools.css");

    tSTauHeadHelper_region = $("#tSTauHeadHelper_region");
    if ( !tSTauHeadHelper_region.length ) {
        tSTauHeadHelper_region = $(`<div id="tSTauHeadHelper_region">TauHead Helper: </div>`);
        $("body").append(tSTauHeadHelper_region);
        tSTauHeadHelper_region.append("<br/>");

        tSTauHeadHelper_message_area = $(`<span style="clear: both"></span>`);
        tSTauHeadHelper_region.append(tSTauHeadHelper_message_area);
    }
}

function tSTauHeadHelper_post( data ) {
    let response = data.response;
    let url      = data.request.url || data.request.action;
    url = tauhead_domain + "/api/" + url;

    let form = $(`<form action="${url}" method="post" target="_blank"></form>`);
    for (let name in response) {
        let input = $(`<input type="hidden" />`);
        input.attr( "name", name );
        input.attr( "value", response[name] );
        form.append( input );
    }

    $("body").append(form);
    form.submit();
    $("body").remove(form);

    return false;
}

function get_bg_img() {
    let img = $("html").css("background-image");

    img = strip_url(img);

    if ( "none" === img ) {
        return "";
    }

    return img;
}

function get_content_img() {
    let img = $(".area-content-block").css("background-image");

    img = strip_url(img);

    if ( "none" === img ) {
        return "";
    }

    return img;
}

function get_content_side_img() {
    let img = $(".area-content-block-side-image").css("background-image");

    img = strip_url(img);

    if ( "none" === img ) {
        return "";
    }

    return img;
}

function get_hero_img() {
    let img = $("img.area-hero").attr("src");

    img = strip_url(img);

    if ( "none" === img ) {
        return "";
    }

    return img;
}

function get_other_img(data) {
    let img;
    if ( data.slug === "bank" ) {
        img = $(".bank-container").first().css("background-image");
    }
    else if ( data.slug === "bar" ) {
        img = $(".decor img").first().attr("src");
    }
    else if ( data.slug === "decommissioned-area" ) {
        img = $(".area-content").first().css("background-image");
    }
    else if ( data.slug === "government-center" ) {
        img = $(".gov-area-wrapper.rations").first().css("background-image");
    }
    else if ( data.slug === "security" && $(".security-main-content").length ) {
        img = window.getComputedStyle( $(".security-main-content")[0], ":after" ).getPropertyValue("background-image");
    }
    else if ( data.slug === "storage" ) {
        img = $(".storage-container").first().css("background-image");
    }

    img = strip_url(img);

    if ( "none" === img ) {
        return "";
    }

    return img;
}

function get_area_description_short() {
    let desc = $("#area .area-description-short");
    return ( desc !== null ) ? trim_ws_ends( desc.text() ) : null;
}

function get_area_description_long() {
    let desc = $("#area .area-description-long");
    return ( desc !== null ) ? trim_ws_ends( desc.text() ) : null;
}

function path_to_slug(path) {
    if (path.length) {
        path = path.replace( /.*\//, "" );
    }

    return string_to_slug(path);
}

function slug_to_words(slug) {
    if (slug.length) {
        slug = slug.replace( /_/g, " " );
        slug = slug.replace( /^\w/, function(x) {return x.toUpperCase();} );
        slug = slug.replace( /\s\w/g, function(x) {return x.toUpperCase();} );
    }
    else {
        slug = "";
    }

    return slug;
}

function string_to_slug(str) {
    if (str.length) {
        str = str.toLowerCase();
        str = trim_ws_ends( str );
        str = str.replace( /’/g, "" );
        str = str.replace( /™/g, "tm" );
        str = str.replace( /\s+/g, "-" );
    }
    else {
        str = "";
    }

    return str;
}

function strip_url(img) {
    if (img) {
        img = img.replace( /.*url\("https:\/\/alpha\.taustation\.space/, "" );
        img = img.replace( /"\)$/, "" );
    }
    else {
        img = "";
    }

    return img;
}

function trim_ws_ends(str) {
    if (str.length) {
        str = str.replace( /^\s+/, "" );
        str = str.replace( /\s+$/, "" );
    }
    else {
        str = "";
    }

    return str;
}

function is_storage_available() {
    // example copied from https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
    var type="localStorage";
    var storage;

    try {
        storage = window[type];
        var x = "__storage_test__";
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === "QuotaExceededError" ||
            // Firefox
            e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
            // acknowledge QuotaExceededError only if there's something already stored
            storage.length !== 0;
    }
}

function fetch_game_character() {
    localStorage.setItem( "tauhead_game_name", Core.character.name );
    localStorage.setItem( "tauhead_game_slug", Core.character.slug );
}

function inject(func) {
    var source = func.toString();
    var script = document.createElement("script");
    script.innerHTML = "("+source+")()";
    document.body.appendChild(script);
}

// Following function and vars copied from linkify-item-names
// https://github.com/taustation-fan/userscripts/blob/master/linkify-item-names.user.js

function get_slug(text) {
    var retval = "";
    if (text) {
        // First, check for simple, special-case slugs.
        retval = lookup_slug[text.toLowerCase()];
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

        // Next, check for Stim names.
        // if (! retval) {
        //     retval = get_slug_for_stim(text);
        // }

        // Finally, just try processing the item name itself. (Appilcable to most items in the game.)
        if (! retval) {
            retval = text;

            // Convert accented characters to their 7-bit equivalent. (JS's I18N
            // is too good - unfortunately, no "lossy" conversion method exists.)
            // These are the only such chars that've been seen so far.
            retval = retval.replace(/ & /g,        " ")  // & (ampersand)
                           .replace(/\xC9/g,       "E")  // É (capital E ACUTE)
                           .replace(/\xE9/g,       "e")  // é (small E ACUTE)
                           .replace(/\u014d/g,     "o")  // ō (small O WITH MACRON)
                           .replace(/ ?\u2013 ?/g, "-")  // – (EN DASH)
                           .replace(/\u2019/g,     "")   // ’ (RIGHT SINGLE QUOTATION MARK)
                           .replace(/\u2122/g,     "tm");// ™ (TRADE MARK SIGN)

            // Convert remaining characters as appropriate. (Note: \x2D = "-", which we need to keep.)
            retval = retval.toLowerCase().replace(/[\x21-\x2C\x2E-\x2F]/g, "").replace(/[ \xA0]/g, "-");
        }
    }
    return retval;
}

// Weapons & armor here also need to match equipped items in other characters'
// descriptions, where they appear in lower case (unlike item names elsewhere).
var lookup_slug = {
    "two bond certificate":    "bonds-2",
    "five bond certificate":   "bonds-5",
    "ten bond certificate":    "bonds-10",
    "twenty bond certificate": "bonds-20",
    "thirty bond certificate": "bonds-30",
    "forty bond certificate":  "bonds-40",
    "trusty hand":             "trusty-field-hand",
    "the silent one":          "handgun-reclaim",
    "heavy dö-maru":           "heavy-d-maru",
};

var lookup_slug_regexp = [
    [ new RegExp("Tier ([0-9]+) Ration"),      "ration-$1" ],
    [ new RegExp("VIP Pack - ([0-9]+) days?"), "vip-$1" ],
];

// Example Stim names:
//  - "Str T01-V001-8.25-0.1"
//  - "Soc T02-V008-10.31-0.1"
//  - "Civ T04-V005-13.76x2-0.075"
//  - "Mil T03-V027-7.54x4-0.03"
// var stim_name_pattern = new RegExp(/(Str|Agi|Sta|Int|Soc|Civ|Mil) T([0-9]+)-V([0-9]+)-([0-9.]+)(?:x([0-9]+))?-[0-9.]+/);
//
// var placeholder_stim_name = "[stim]";
//
// function get_slug_for_stim(text) {
//     var matches = text.match(stim_name_pattern);
//     if (matches === null) {
//         return;
//     }
//
//     // var category  = matches[1];
//     // var tier      = matches[2];
//     // var stat_map  = matches[3];
//     // var stat_amt  = matches[4];
//     // var num_stats = matches[5];
//
//     // var name_for_category = {
//     //     "Str": "Strength",
//     //     "Agi": "Agility",
//     //     "Sta": "Stamina",
//     //     "Int": "Intelligence",
//     //     "Soc": "Social",
//     //     "Civ": "Multi",
//     //     "Mil": "Military",
//     // }
//
//     // category = name_for_category[category];
//
//     // For now, just return a placeholder value, so callers can ignore stims.
//     // (To fully work, this function would need a lookup table to convert Tier-
//     // specific (stat_amt * num_stats) values into { "Minor", "Standard", "Strong" }.)
//     //
//     return placeholder_stim_name;
// }

function site_updater_preferences() {
    return {
        key: "tauhead_site_updater",
        label: "TauHead Site Updater",
        options: [
            {
                key:     "update_auctions_and_items",
                label:   "Show UI for Auction Listings & Items",
                type:    "boolean",
                default: true
            },
            {
                key:     "update_all",
                label:   "Show UI for All Available Pages",
                type:    "boolean",
                default: false
            },
        ]
    };
}
