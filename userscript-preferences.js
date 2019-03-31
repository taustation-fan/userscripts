/*

All callers are required to have loaded jQuery themselves.

Function `add_userscript_settings` requires 2 arguments.

The first a text-string to be used as a section heading; something a user
will recognize associates these settings with your userscript.

The second an array of option objects.
Each option object corresponds to a single preference.
The keys 'type', 'label', 'value' and 'options' are used to render the
settings form field.
The key 'callback' is optional. The provided function is called with a single
value - the value entered / selected by the user.
The key 'localStorage' is optional. This will be used as a key in the
browser's localStorage. If provided, any 'value' argument will be ignored

Example user-code:

if ( window.location.pathname === "/preferences" ) {
    add_userscript_settings(
        "My Heading",
        [
            {
                label: "Text area",
                type: "text",
                value: "value 1",
                callback: function(value) {
                    alert(value);
                }
            },
            {
                label: "Checkbox",
                type: "checkbox",
                value: false,
                callback: function(value) {
                    alert(value);
                }
            },
            {
                label: "Radio buttons",
                type: "radio",
                value: "one",
                options: ["one", "two"],
                callback: function(value) {
                    alert(value);
                }
            }
        ]
    );
}

*/

var core_prefs;

function add_userscript_settings(def) {
    "use strict";

    if ( "/preferences" !== window.location.pathname ) {
        return;
    }

    let defaults = localStorage.getItem( def.key );
    if ( defaults ) {
        try {
            defaults = JSON.parse( defaults );
        }
        catch (error) {
            defaults = {};
        }
    }
    else {
        defaults = {};
    }


    if ( !core_prefs ) {
        core_prefs = $("#preferences");
    }

    let label = def.label || def.key;
    core_prefs.append( `<h2>UserScript: ${label}</h2>` );

    for ( let i=0; i<def.options.length; i++ ) {
        let pref = def.options[i];
        let dl = $("<dl></dl>");
        let dd = $("<dd></dd>");

        core_prefs.append(dl);
        let this_label = pref.label || pref.key;
        dl.append(
            `<dt>${this_label}</dt>`,
            dd
        );
        let this_value;
        if ( defaults.hasOwnProperty( pref.key ) ) {
            this_value = defaults[ pref.key ];
        }
        else if ( pref.hasOwnProperty("default") ) {
            this_value = pref.default;
        }
        let this_id = def.key + "_" + pref.key;

        switch ( pref.type ) {
            case "text":
                dd.append(
                    `<input data-userscript-pref='${this_id}' type='text' value='${this_value}' />`
                );
                break;
            case "checkbox":
                let checked = this_value ? "checked=checked" : "";
                dd.append(
                    `<input data-userscript-pref='${this_id}' type='checkbox' value=1 ${checked}/>`
                );
                break;
            case "array_checkbox":
                for ( let j=0; j<pref.options.length; j++ ) {
                    let key     = pref.options[j].key;
                    let label   = pref.options[j].label || key;
                    let checked = ( this_value && this_value.hasOwnProperty(key) ) ? this_value[key] :
                                  pref.options[j].hasOwnProperty("default") ? pref.options[j].default :
                                  false;
                    checked = checked ? "checked=checked" : "";
                    dd.append(
                        "<label>"+
                        `<input data-userscript-pref='${this_id}' name='${key}' type='checkbox' value=1 ${checked} />`+
                        label+
                        "</label>"+
                        "<br />"
                    );
                }
                break;
            case "radio":
                // let item_id = this_id + "_" + i;
                for ( let j=0; j<pref.options.length; j++ ) {
                    let value = pref.options[j];
                    let checked = value === this_value ? "checked=checked" : "";
                    dd.append(
                        "<label>"+
                        `<input data-userscript-pref='${this_id}' name='${this_id}' type='radio' value='${value}' ${checked} />`+
                        value+
                        "</label>"+
                        "<br />"
                    );
                }
                break;
        }
    }

    let save = $( `<button data-userscript-save='${def.key}'>Save "${label}" Settings</button>` );
    save.click( function() {
        _save_userscript_settings(def);
    } );

    core_prefs.append(
        "<dt></dt>",
        $("<dd></dd>").append( save )
    );
}

function _save_userscript_settings(def) {
    "use strict";

    let values = {};

    for ( let i=0; i<def.options.length; i++ ) {
        let pref    = def.options[i];
        let this_id = def.key + "_" + pref.key;

        switch ( pref.type ) {
            case "text":
                values[ pref.key ] = $(`input[data-userscript-pref=${this_id}]`).first().val();
                break;
            case "checkbox":
                let is_checked = $(`input[data-userscript-pref=${this_id}]`).first().prop("checked");
                values[ pref.key ] = is_checked ? true : false;
                break;
            case "array_checkbox":
                let all_checkboxes = $(`input[data-userscript-pref=${this_id}]`);
                values[ pref.key ] = {};
                all_checkboxes.map( function() {
                    values[ pref.key ][ $(this).prop("name") ] = $(this).prop("checked") ? true : false;
                } );
                break;
            case "radio":
                values[ pref.key ] = $(`input[data-userscript-pref=${this_id}]:checked`).val();
                break;

        }
    }

    localStorage.setItem(
        def.key,
        JSON.stringify( values )
    );

    if ( def.hasOwnProperty("callback") ) {
        def["callback"]( values );
    }

    $( `button[data-userscript-save=${def.key}]` ).first().append(
        "<span class='fa fa-check-circle' style='color: green; padding-left: 0.5em'></span>"
    );

    window.setTimeout(
        function() {
            $( `button[data-userscript-save=${def.key}]` )
                .first()
                .find( "span[class^=fa]" )
                .remove();
        },
        1000
    );
}

var player_name;

function get_player_storage_prefix(script_prefix) {
    // Get the player's name, to let us store different session data for different player characters.
    if (! player_name) {
        player_name = $("#player-name").text();
        if (player_name.length > 0) {
            // If the user is part of a Syndicate or has VIP, drop the "[foo]" prefix/suffix.
            script_prefix += player_name.replace(/^(\[...\] )?([^[ ]+)( \[...\])?/, "$2") + "_";
        }
    }
    return script_prefix;
}
