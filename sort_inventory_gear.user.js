// ==UserScript==
// @name         Tau Sort Inventory Gear
// @namespace    https://github.com/taustation-fan/userscripts/
// @version      1.0
// @description  Tau Sort Inventory Gear
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.js
// ==/UserScript==

var from_json;

$(document).ready(add_buttons);

function add_buttons() {
    if (window.location.pathname.startsWith("/character/inventory")) {
        let header = $(".content-section .inventory > h2").first();
        let div    = $('<div>Sort: </div>');
        $(header).after(div);

        let energy   = $('<button>Energy</button>');
        let impact   = $('<button>Impact</button>');
        let piercing = $('<button>Piercing</button>');
        energy.click(  function() { sort_gear("energy"); });
        impact.click(  function() { sort_gear("impact"); });
        piercing.click(function() { sort_gear("piercing"); });

        div.append( energy, impact, piercing );
    }
}

function sort_gear(sort_by) {
    let json = from_json ? from_json : get_inventory_data();

    let carried_groups = json.carried_groups;
    let carried        = json.carried;
    let by_slug = [];

    for ( let i=0; i<carried_groups.length; ++i ) {
        let group       = carried_groups[i];
        let group_items = carried[group];

        for ( let j=0; j<group_items.length; ++j ) {
            by_slug[ group_items[j].slug ] = group_items[j];
        }
    }

    let parent = $("section[data-inventory-section='carried'] .slots").first();
    let slots  = $(parent).find(".slot").detach();
    let armor  = [];
    let weapon = [];
    let other  = [];

    for ( let i = 0; i<slots.length; ++i ) {
        let item_type = $(slots[i]).find("button.item").first().attr('data-item-type');

        if ( "weapon" == item_type ) {
            weapon.push( slots[i] );
        }
        else if ( "armor" == item_type ) {
            armor.push( slots[i] );
        }
        else {
            other.push( slots[i] );
        }
    }

    weapon.sort(function(a, b) {
        let a_slug = $(a).find("button.item").first().attr('data-item-slug');
        let b_slug = $(b).find("button.item").first().attr('data-item-slug');
        let a_x = by_slug[a_slug].item.item_component_weapon[sort_by+"_damage"];
        let b_x = by_slug[b_slug].item.item_component_weapon[sort_by+"_damage"];
        return ( a_x == b_x ) ? 0 : ( a_x < b_x ) ? 1 : -1;
    });

    armor.sort(function(a, b) {
        let a_slug = $(a).find("button.item").first().attr('data-item-slug');
        let b_slug = $(b).find("button.item").first().attr('data-item-slug');
        let a_x = by_slug[a_slug].item.item_component_armor[sort_by];
        let b_x = by_slug[b_slug].item.item_component_armor[sort_by];
        return ( a_x == b_x ) ? 0 : ( a_x < b_x ) ? 1 : -1;
    });

    parent.append( weapon, armor, other );
};

function get_inventory_data() {
    let script = $(".content-section .inventory ~ script").html();
    script = script.replace( /^\s*var\s+items\s*=\s*/, "" );
    script = script.replace( /\s+var\s+friends\s+=[\s\S]*/, "" );
    script = script.replace( /;\s*$/, "" );
    from_json = JSON.parse( script );

    return from_json;
}
