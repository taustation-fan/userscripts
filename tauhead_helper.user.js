// ==UserScript==
// @name         TauHead Helper
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/tauhead_helper.user.js
// @version      1.0
// @description  Add links to Post data to TauHead
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.slim.js
// @require      https://github.com/taustation-fan/userscripts/raw/master/taustation-tools-common.js
// ==/UserScript==

var tauhead_domain = 'https://www.tauhead.com';

//

var vendor_item_fields = [
    'max_quantity_that_can_be_sold_per_attempt',
    'default_quantity',
    'has_unlimited_quantity',
    'price',
    'price_unit'
];

var item_fields = [
    'name',
    'slug',
    'image',
    'tier',
    'overridden_tier',
    'stack_size',
    'bonds',
    'mass',
    'rarity',
    'description'
];

var item_fields_might_have_rel = {
    'item_component_armor': [
        'energy',
        'impact',
        'piercing'
    ],
    'item_component_medical': [
        'base_toxicity',
        'strength_boost',
        'agility_boost',
        'stamina_boost',
        'intelligence_boost',
        'social_boost'
    ],
    'item_component_mod': [
        'focus_mod',
        'strength_mod',
        'agility_mod',
        'stamina_mod',
        'intelligence_mod',
        'social_mod',
        'mod_type'
    ],
    'item_component_weapon': [
        'energy_damage',
        'impact_damage',
        'piercing_damage',
        'accuracy',
        'hand_to_hand'
    ]
};

var item_type_fields = [
    'name',
    'slug',
];

// UI variables.
var tSTauHeadHelper_region;

//

$(document).ready(tSTauHeadHelper_main);

function tSTauHeadHelper_main() {
    'use strict';

    let page_path  = window.location.pathname;
    let clean_path = page_path.replace( /^\//, "" );
    clean_path = clean_path.replace( /\/$/, "" );
    let path_parts = clean_path.split("/");

    if ( 2 == path_parts.length && "area" == path_parts[0] ) {
        tSTauHeadHelper_add_button({ action: 'add_area',     slug: path_parts[1] });
        tSTauHeadHelper_add_button({ action: 'add_sub_area', slug: path_parts[1] });
        tSTauHeadHelper_add_button({ action: 'add_area',     slug: path_parts[1], url: 'update_area',     text: 'Update Area' });
        tSTauHeadHelper_add_button({ action: 'add_sub_area', slug: path_parts[1], url: 'update_sub_area', text: 'Update Sub-Area' });

        tSTauHeadHelper_add_button({ action: 'add_area_npcs', slug: path_parts[1] });

        if ( "government-center" === path_parts[1] ) {
            tSTauHeadHelper_add_button({ action: 'update_station_details' });
        }
        else if ( "storage" === path_parts[1] ) {
            tSTauHeadHelper_add_button({ action: 'update_items_from_storage', url: 'update_items', text: 'Update Items' });
        }
    }
    else if ( 2 == path_parts.length && "item" == path_parts[0] ) {
        tSTauHeadHelper_add_button({ action: 'update_item', slug: path_parts[1] });
    }
    else if ( 2 == path_parts.length && "character" == path_parts[0] && "inventory" == path_parts[1] ) {
        tSTauHeadHelper_add_button({ action: 'update_items_from_inventory', url: 'update_items', text: 'Update Items' });
    }
    else if ( 3 == path_parts.length && "character" == path_parts[0] && "details" == path_parts[1] ) {
        tSTauHeadHelper_add_button({ action: 'update_npc', slug: path_parts[2], text: 'Update NPC' });
    }
    else if ( 4 == path_parts.length && "area" == path_parts[0] && ( "character" == path_parts[2] || "corporation" == path_parts[2] ) ) {
        tSTauHeadHelper_add_button({ action: 'update_vendor_itinerary', area_slug: path_parts[1] });
    }

    if ( page_path.startsWith('/area/electronic-market') ) {
        tSTauHeadHelper_add_button({ action: 'log_auctions' });
    }
}

var tSTauHeadHelper_actions = {
    add_area: function(data, defaults) {
        if ( typeof defaults === 'undefined' ) {
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

        defaults["system"]                 = system;
        defaults["station"]                = station;
        defaults["name"]                   = name;
        defaults["aka"]                    = aka;
        defaults["bg_img"]                 = get_bg_img();
        defaults["content_img"]            = get_content_img();
        defaults["content_side_img"]       = get_content_side_img();
        defaults["hero_img"]               = get_hero_img();
        defaults["other_img"]              = get_other_img(data);
        defaults["area_description_short"] = get_area_description_short();
        defaults["area_description_long"]  = get_area_description_long();
        defaults["slug"]                   = data.slug;

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
                    console.log($(this).text());
                    let link           = $(this).find("td:nth-child(1) a");
                    console.log(link);
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
                    if ( primary_weapon !== "none" )
                        response["npc_"+npc_counter+".primary_weapon_slug"] = primary_weapon;
                    if ( armor !== "none" )
                        response["npc_"+npc_counter+".armor_slug"] = armor;
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

        return tSTauHeadHelper_actions['add_area'](data, defaults);
    },

    log_auctions: function(data) {
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
            price = price.replace( /[^0-9]+/g, "" ); // strip non-digits ","

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
                if (!item_fields_might_have_rel.hasOwnProperty(rel_name)) continue;

                let rel_vals = item[rel_name];
                if (rel_vals === null) continue;

                let rel_cols = item_fields_might_have_rel[rel_name];

                for ( let k=0; k < rel_cols.length; k++ ) {
                    let col_name  = rel_cols[k];
                    let col_value = rel_vals[col_name];

                    if ( col_name !== null && typeof(col_name) === "object" ) {
                        // nested
                        for (let sub_rel_name in col_name) {
                            if (!col_name.hasOwnProperty(sub_rel_name)) continue;

                            let sub_rel_vals = col_name[sub_rel_name];
                            if (sub_rel_vals === null) continue;

                            let sub_rel_cols = col_name[sub_rel_name];

                            for ( let l=0; l < sub_rel_cols.length; l++ ) {
                                let sub_col_name  = sub_rel_cols[l];
                                let sub_col_value = sub_rel_vals[sub_col_name];

                                if ( typeof sub_col_value !== 'undefined' ) {
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
                if ( "item_component_weapon" == rel_name ) {
                    response["item_"+item_counter+".item_component_weapon.weapon_type"]   = item["item_component_weapon"]["weapon_type"]["name"];
                    response["item_"+item_counter+".item_component_weapon.is_long_range"] = item["item_component_weapon"]["weapon_type"]["is_long_range"];
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

    update_items_from_inventory: function(data) {
        let script = $(".content-section .inventory ~ script").html();
        script = script.replace( /^\s*var\s+items\s*=\s*/, '' );
        script = script.replace( /\s+var\s+friends\s+=[\s\S]*/, '' );
        script = script.replace( /;\s*$/, '' );
        let json = JSON.parse( script );
        let carried_groups = json.carried_groups;
        let carried        = json.carried;
        let items          = [];

        for ( let i=0; i<carried_groups.length; ++i ) {
            let group       = carried_groups[i];
            let group_items = carried[group];

            for ( let j=0; j<group_items.length; ++j ) {
                let item = group_items[j].item;

                item.image = group_items[j].image;

                items.push( item );
            }
        }

        return tSTauHeadHelper_actions['update_items'](data, items);
    },

    update_items_from_storage: function(data) {
        let script = $(".storage-container + script").html();
    	script = script.replace( /^\s*var\s+storage\s*=\s*/, '' );
    	script = script.replace( /\{\s+items:/, '{"items":' );
    	let json = JSON.parse( script );
        let carried_groups = json.items.carried_groups;
        let carried        = json.items.carried;
        let items          = [];

        for ( let i=0; i<carried_groups.length; ++i ) {
            let group       = carried_groups[i];
            let group_items = carried[group];

            for ( let j=0; j<group_items.length; ++j ) {
                let item = group_items[j].item;

                item.image = group_items[j].image;

                items.push( item );
            }
        }

        return tSTauHeadHelper_actions['update_items'](data, items);
    },

    update_npc: function(data) {
        let char = $(".character-overview").first();

        let name = $(char).find("h1").first().text();
        let genotype;
        let description = [];
        let i = 1;

        $(char).find("p").each(function() {
            let text = $(this).text();
            text = trim_ws_ends( text );
            if ( i === 1 ) {
                let match = text.match( /(\w+) genotype/i );
                genotype = match[1].toLowerCase();
            }
            else {
                description.push( text );
            }
            i++;
        });

        description = description.join("\n\n");

        let response = {
            "slug":        data.slug,
            "name":        trim_ws_ends( name ),
            "genotype":    genotype,
            "description": trim_ws_ends( description ),
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
    	script = script.replace( /^\s*var\s+vendor\s*=\s*/, '' );
    	script = script.replace( /\{\s+items:/, '{"items":' );
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
                market_stall_id = vendor_item["market_stall_id"];
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
                    if (!item_fields_might_have_rel.hasOwnProperty(rel_name)) continue;

                    let rel_vals = item[rel_name];
                    if (rel_vals === null) continue;

                    let rel_cols = item_fields_might_have_rel[rel_name];

                    for ( var m=0; m < rel_cols.length; m++ ) {
                        let col_name  = rel_cols[m];
                        let col_value = rel_vals[col_name];

                        if ( col_name !== null && typeof(col_name) === "object" ) {
                            // nested
                            for (var sub_rel_name in col_name) {
                                if (!col_name.hasOwnProperty(sub_rel_name)) continue;

                                let sub_rel_vals = col_name[sub_rel_name];
                                if (sub_rel_vals === null) continue;

                                let sub_rel_cols = col_name[sub_rel_name];

                                for ( var n=0; n < sub_rel_cols.length; n++ ) {
                                    let sub_col_name  = sub_rel_cols[n];
                                    let sub_col_value = sub_rel_vals[sub_col_name];

                                    if ( typeof sub_col_value !== 'undefined' ) {
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
                    if ( "item_component_weapon" == rel_name ) {
                        response["item_"+item_counter+".item_component_weapon.weapon_type"]   = item["item_component_weapon"]["weapon_type"]["name"];
                        response["item_"+item_counter+".item_component_weapon.is_long_range"] = item["item_component_weapon"]["weapon_type"]["is_long_range"];
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

function tSTauHeadHelper_init_ui() {
    // add_css_link('https://rawgit.com/taustation-fan/userscripts/master/taustation-tools.css');

    tSTauHeadHelper_region = $('#tSTauHeadHelper_region');
    if ( !tSTauHeadHelper_region.length ) {
        tSTauHeadHelper_region = $('<div id="tSTauHeadHelper_region">TauHead Helper: </div>');
        $('body').append(tSTauHeadHelper_region);
        tSTauHeadHelper_region.append('<br/>');
    }
}

function tSTauHeadHelper_add_button( data ) {
    tSTauHeadHelper_init_ui();

    let id   = data.id   || data.action;
    let text = data.text || slug_to_words(data.action);

    let button = $('<button id="tauhead_helper_'+id+'">'+text+'</button>');
    button.click( function() { tSTauHeadHelper_actions[data.action](data) } );
    tSTauHeadHelper_region.append(button);
    tSTauHeadHelper_region.append('<br/>');
}

function tSTauHeadHelper_post( data ) {
    let response = data.response;
    let url      = data.request.url || data.request.action;
    url = tauhead_domain + '/api/' + url;

    let form = $('<form action="'+url+'" method="post" target="_blank"></form>');
    for (let name in response) {
        let input = $('<input type="hidden" />');
        input.attr( 'name', name );
        input.attr( 'value', response[name] );
        form.append( input );
    }

    $('body').append(form);
    form.submit();
    $('body').remove(form);

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
    let img = $("img.area-hero").attr('src');

    img = strip_url(img);

    if ( "none" === img ) {
        return "";
    }

    return img;
}

function get_other_img(data) {
    let img;
    if ( data.slug == "bank" ) {
        img = $(".bank-container").first().css("background-image");
    }
    else if ( data.slug == "bar" ) {
        img = $(".decor img").first().attr("src");
    }
    else if ( data.slug == "decommissioned-area" ) {
        img = $(".area-content").first().css("background-image");
    }
    else if ( data.slug == "government-center" ) {
        img = $(".gov-area-wrapper.rations").first().css("background-image");
    }
    else if ( data.slug == "security" ) {
        img = window.getComputedStyle( $(".security-main-content")[0], ':after' ).getPropertyValue("background-image");
    }
    else if ( data.slug == "storage" ) {
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
        path = path.toLowerCase();
        path = trim_ws_ends( path );
    }

    else {
        path = "";
    }

    return path;
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
