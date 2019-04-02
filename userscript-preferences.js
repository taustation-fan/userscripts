/* exported userscript_preferences */
var core_prefs;

function userscript_preferences( def ) {
    "use strict";

    if ( !def.key ) {
        if ( def.player_key ) {
            def.key = _userscript_preferences_key_from_player_key( def.player_key );
        }
        else {
            console.log("userscript_preferences() needs either a 'key' or 'player_key'");
            return;
        }
    }

    let config = _userscript_preferences_return_config( def );

    if ( "/preferences" === window.location.pathname ) {
        _userscript_preferences_add_ui( def, config );
    }

    return config;
}

function _userscript_preferences_add_ui( def, values ) {
    "use strict";

    let container = $( "<span></span>" );
    let label = def.label || def.key;
    container.append( `<h2 class='settings-header'>UserScript: ${label}</h2>` );

    for ( let i in def.options ) {
        let pref = def.options[i];
        let this_id = def.key + "_" + pref.key;
        let this_value = values[ pref.key ];
        let dt = $("<dt></dt>");
        let dd = $("<dd></dd>");
        container.append( dt, dd );

        dt.text( pref.label || pref.key );

        if (pref.help) {
            dt.append( $(
                "<span></span>",
                {
                    class: "fa fa-question-circle",
                    style: "padding-left: 0.5em;",
                    title: pref.help
                }
            ) );
        }

        let input = $(
            "<input/>",
            {
                "data-userscript-pref": this_id
            }
        );

        switch ( pref.type ) {
            case "text":
                input.prop( {
                    type: "text",
                    value: this_value
                } );
                dd.append( input );
                break;
            case "boolean":
            case "bool":
                input = $(
                    "<button></button",
                    {
                        "data-userscript-pref": pref.key,
                        "data-state": ( this_value ? 1 : 0 ),
                        class: "toggle",
                        text: ( this_value ? " On " : " Off " ),
                        type: "checkbox",
                        value: 1
                    } );
                input.click( function(event) {
                    _toggle_userscript_boolean.call( this, event, def, values );
                } );
                dd.append( input );
                break;
            case "array_checkbox":
                for ( let j in pref.options ) {
                    let key     = pref.options[j].key;
                    let label   = pref.options[j].label || key;
                    let input_i = input.clone();
                    input_i.prop( {
                        name: key,
                        type: "checkbox",
                        value: 1
                    } );
                    if ( this_value && this_value.hasOwnProperty(key) && this_value[key] ) {
                        input_i.prop( "checked", "checked" );
                    }
                    let olabel = $( "<label></label>", { css: { clear: "all" } } );
                    olabel.append( input, label );
                    dd.append( olabel );
                }
                break;
            case "radio":
                for ( let j in pref.options ) {
                    let value = pref.options[j];
                    let input_i = input.clone();
                    input_i.prop( {
                        name: this_id,
                        type: "radio",
                        value: value,
                        html: value
                    } );
                    if ( this_value && ( this_value === value ) ) {
                        input_i.prop( "checked", "checked" );
                    }
                    let olabel = $( "<label></label>", { css: { clear: "all" } } );
                    olabel.append( input_i );
                    dd.append( olabel );
                }
                break;
        }
    }

    let save = $( `<button data-userscript-save='${def.key}'>Save "${label}" Settings</button>` );
    save.click( function() {
        _save_userscript_settings(def);
    } );

    container.append(
        "<dt></dt>",
        $("<dd></dd>").append( save )
    );

    if ( !core_prefs ) {
        core_prefs = $("#preferences");
    }

    core_prefs.append( container );
}

function _toggle_userscript_boolean( event, def, values ) {
    let button = $(this);
    let id = button.attr( "data-userscript-pref" );
    let on = 1 == button.attr( "data-state" ) ? true : false;

    button.attr( "data-state", on ? 0 : 1 );

    values[id] = on ? false : true;

    localStorage.setItem(
        def.key,
        JSON.stringify( values )
    );

    button.text( on ? " Off " : " On " );

    event.preventDefault();
    event.stopPropagation();
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

function _userscript_preferences_return_config( def ) {
    "use strict";

    let stored_config;
    let stored_config_str = localStorage.getItem( def.key );
    try {
        stored_config = JSON.parse( stored_config_str );
    }
    catch (error) {
        // console.log("caught error");
        // console.log(error);
    }

    if ( !stored_config ) {
        stored_config = {};
    }

    let config = stored_config;

    for ( let i in def.options ) {
        let pref = def.options[i];

        // Prefer stored config
        if ( config.hasOwnProperty( pref.key ) ) {
            continue;
        }

        if ( pref.default ) {
            config[ pref.key ] = pref.default;
        }

        // Ensure array_checkbox always has an object value
        if ( "array_checkbox" === def.type ) {
            config[ pref.key ] = {};
        }
    }

    return config;
}

var player_name;

function _userscript_preferences_key_from_player_key( key ) {
    "use strict";

    // Get the player's name, to let us store different data for different player characters.
    if ( !player_name ) {
        player_name = $("#player-name").text();
        player_name = $.trim( player_name );

        // Remove [VIP] and [SYN]
        player_name = player_name.replace(/^(\[...\] )?([^[ ]+)( \[...\])?/, "$2");
    }

    return `${key}_${player_name}`;
}
