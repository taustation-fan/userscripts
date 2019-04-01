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
    core_prefs.append( `<h2 class='settings-header'>UserScript: ${label}</h2>` );

    for ( let i=0; i<def.options.length; i++ ) {
        let pref = def.options[i];
        let dl = $("<dl></dl>");
        let dd = $("<dd></dd>");

        core_prefs.append(dl);
        let this_label = pref.label || pref.key;
        let dt = $( `<dt>${this_label}</dt>` );
        if (pref.help) {
            dt.append( $(
                "<span></span>",
                {
                    class: "fa fa-info-circle",
                    style: "padding-left: 0.5em;",
                    title: pref.help
                }
            ) );
        }
        dl.append( dt, dd );
        let this_value;
        if ( stored_defaults.hasOwnProperty( pref.key ) ) {
            this_value = stored_defaults[ pref.key ];
        }
        else if ( def_defaults.hasOwnProperty( pref.key ) ) {
            this_value = def_defaults[ pref.key ];
        }
        let this_id = def.key + "_" + pref.key;

        let checked;

        switch ( pref.type ) {
            case "text":
                dd.append(
                    `<input data-userscript-pref='${this_id}' type='text' value='${this_value}' />`
                );
                break;
            case "checkbox":
                checked = this_value ? "checked=checked" : "";
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
        let is_checked;
        let all_checkboxes;

        switch ( pref.type ) {
            case "text":
                values[ pref.key ] = $(`input[data-userscript-pref=${this_id}]`).first().val();
                break;
            case "checkbox":
                is_checked = $(`input[data-userscript-pref=${this_id}]`).first().prop("checked");
                values[ pref.key ] = is_checked ? true : false;
                break;
            case "array_checkbox":
                all_checkboxes = $(`input[data-userscript-pref=${this_id}]`);
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
    let stored_options = localStorage.getItem(key);
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
            script_prefix += "_" + player_name.replace(/^(\[...\] )?([^[ ]+)( \[...\])?/, "$2");
        }
    }
    return script_prefix;
}
