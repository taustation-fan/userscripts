/*

All callers are required to have loaded jQuery themselves.

Function `add_userscript_settings` should be called when visiting URL `/preferences`.
This adds a section of userscript-specific preferences that the user may edit.
The function requires a single argument object.

The object must have a `key` value. This is used as the key for `localStorage`.
You can all the provided `get_player_storage_prefix` function to allow for player-specific
options. (See example below).

The object may have a `label` value, used as the heading for this section's preferences.
If `label` is missing, the value of `key` is used instead.

The object may have a `defaults` value. Each key/value is used as a preference's default value
if this preference is not already in localStorage.

The object must have an `options` array.
Each array item must be an object defining a single preference.

Each preference definition must have a `key` value.
Each preference may have a `label` value. If missing, the value of `key` is used.
Each preference must have a `type` value.
Types `checkbox_array` and `radio` must have an `options` array.

Type `checkbox_array` options must be an array of objects.
Each object must have a `key` value.
Each object may have a `label` value. If missing, the value of `key` is used.

Type `radio` options must be an array of strings.
Each string is a valid value that may be selected.

The object may have a `callback` value.
This should be a function that will be called after localStorage has been updated.
It will be passed a single argument of the same `values` object saved to localStorage.

Function `fetch_userscript_preferences` returns an object of key/values found in localStorage,
merged with any provided defaults.
The function requires 1 or 2 arguments.
The 1st `key` argument is required. This is used as the key for `localStorage`.
The 2nd `defaults` argument is optional. Each key/value is used if the key is not found in
localStorage.

Example user-code:
*/
let defaults = {
    my_text: "default value!",
    my_checkbox: true,
    my_checkbox_array: {
        one: true
    },
    my_radio: 'two'
};
let local_storage_key = get_player_storage_prefix( "my_key_name" );

if ( window.location.pathname === "/preferences" ) {
    add_userscript_settings( {
        key:   local_storage_key,
        label: "My Heading",
        defaults: defaults,
        options: [
            {
                key:   "my_text",
                label: "My Text",
                type: "text"
            },
            {
                key:   "my_checkbox",
                label: "My Checkbox",
                type: "checkbox"
            },
            {
                key:   "my_checkbox_array",
                label: "My Checkbox Array",
                type: "checkbox_array",
                options: [
                    { key: one, label: "One" },
                    { key: two, label: "Two" }
                ]
            },
            {
                key:   "my_radio",
                label: "My Radio buttons",
                type: "radio",
                options: ["one", "two"]
            }
        ]
    } );
}

let options = fetch_userscript_preferences(
    local_storage_key,
    defaults
);

/**/

var core_prefs;

function add_userscript_settings(def) {
    "use strict";

    if ( "/preferences" !== window.location.pathname ) {
        return;
    }

    let stored_defaults = {};
    let stored_defaults_str = localStorage.getItem( def.key );
    if ( stored_defaults_str ) {
        try {
            stored_defaults = JSON.parse( stored_defaults_str );
        }
        catch (error) {
            // console.log("caught error");
            // console.log(error);
        }
    }
    let def_defaults = {};
    if ( def.hasOwnProperty("defaults") ) {
        def_defaults = def.defaults;
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
        if ( stored_defaults.hasOwnProperty( pref.key ) ) {
            this_value = stored_defaults[ pref.key ];
        }
        else if ( def_defaults.hasOwnProperty( pref.key ) ) {
            this_value = def_defaults[ pref.key ];
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
                    let checked = ( this_value.hasOwnProperty(key) && this_value[key] ) ? "checked=checked" : "";
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

function fetch_userscript_preferences( key, defaults ) {
    let options = {};
    if ( defaults ) {
        for ( let i in defaults ) {
            options[i] = defaults[i];
        }
    }
    let stored_options = localStorage.getItem(local_storage_key);
    if ( stored_options ) {
        // Merge options from storage into the defaults, so that new options
        // are used even if user hasn't updated in /preferences
        try {
            stored_options = JSON.parse( stored_options );
            for ( let i in stored_options ) {
                options[i] = stored_options[i];
            }
        }
        catch (error) {
            // console.log("caught error");
            // console.log(error);
        }
    }
    return options;
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
