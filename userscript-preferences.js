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
        let has_value = values.hasOwnProperty( pref.key );
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
                    style: "margin-left: 0.5em;",
                    title: pref.help
                }
            ) );
        }

        let feedback = $( "<span></span>" );
        let input = $(
            "<input/>",
            {
                "data-userscript-pref": pref.key
            }
        );

        switch ( pref.type ) {
            case "text":
                input.prop( {
                    type: "text",
                    value: this_value
                } );
                input.css( { "margin-right": "0.5em" } );
                input.on(
                    "keyup keypress paste",
                    function() {
                        _userscript_preferences_waiting( feedback );
                    } );
                input.donetyping( function() {
                    _save_userscript_field.call( this, def, values, feedback );
                } );
                dd.append( input, feedback );
                break;
            case "boolean":
            case "bool":
                input = $(
                    "<button></button",
                    {
                        "data-userscript-pref": pref.key,
                        "data-state": ( this_value ? 1 : 0 ),
                        class: "toggle",
                        text: ( this_value ? " On " : " Off " )
                    } );
                input.click( function(event) {
                    _toggle_userscript_boolean.call( this, event, def, values );
                } );
                dd.append( input );
                break;
            case "boolean_array":
            case "bool_array":
                for ( let j in pref.options ) {
                    let key     = pref.options[j].key;
                    let label   = pref.options[j].label || key;
                    input = $(
                        "<button></button",
                        {
                            "data-userscript-pref": pref.key,
                            "data-userscript-item": key,
                            class: "toggle"
                        } );
                    if ( has_value && this_value.hasOwnProperty(key) && this_value[key] ) {
                        input.prop( "data-state", 1 );
                        input.text( " On " );
                    }
                    else {
                        input.prop( "data-state", 0 );
                        input.text( " Off " );
                    }
                    input.click( function(event) {
                        _toggle_userscript_boolean_array.call( this, event, def, values );
                    } );
                    let olabel = $( "<label></label>", { css: { display: "block" } } );
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
                        text: value
                    } );
                    if ( has_value && ( this_value === value ) ) {
                        input_i.prop( "checked", "checked" );
                    }
                    input_i.click( function() {
                        _userscript_preferences_waiting( feedback );
                        _save_userscript_field.call( this, def, values, feedback );
                    } );
                    let olabel = $( "<label></label>", { css: { "margin-right": "0.5em" } } );
                    olabel.append( input_i, value );
                    dd.append( olabel );
                }
                dd.append( feedback );
                break;
            case "select":
                input = $(
                    "<select></select>",
                    {
                        "data-userscript-pref": pref.key,
                        style: "margin-right: 0.5em"
                    } );
                for ( let j in pref.options ) {
                    let opt = pref.options[j];
                    let value = Array.isArray( opt ) ? opt[0] : opt.value;
                    let label = Array.isArray( opt ) ? opt[1] : opt.label;
                    let option = $( "<option></option>",
                        {
                            value: value,
                            text: label
                        } );
                    if ( has_value && ( this_value === value ) ) {
                        option.prop( "selected", "selected" );
                    }
                    input.append( option );
                }
                input.change( function() {
                    _userscript_preferences_waiting( feedback );
                    _save_userscript_field.call( this, def, values, feedback );
                } );
                dd.append( input, feedback );

                break;
        }
    }

    if ( !core_prefs ) {
        core_prefs = $("#preferences");
    }

    core_prefs.append( container );
}

function _save_userscript_field( def, values, feedback ) {
    let input = $(this);

    let id = input.attr( "data-userscript-pref" );
    values[id] = input.val();

    localStorage.setItem(
        def.key,
        JSON.stringify( values )
    );

    _userscript_preferences_ok( feedback );
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

function _toggle_userscript_boolean_array( event, def, values ) {
    let button = $(this);
    let outer_id = button.attr( "data-userscript-pref" );
    let inner_id = button.attr( "data-userscript-item" );
    let on = 1 == button.attr( "data-state" ) ? true : false;

    button.attr( "data-state", on ? 0 : 1 );

    if ( !values.hasOwnProperty(outer_id) ) {
        values[outer_id] = {};
    }

    if ( !values[outer_id].hasOwnProperty(inner_id) ) {
        values[outer_id][inner_id] = {};
    }

    values[outer_id][inner_id] = on ? false : true;

    localStorage.setItem(
        def.key,
        JSON.stringify( values )
    );

    button.text( on ? " Off " : " On " );

    event.preventDefault();
    event.stopPropagation();
}

function _userscript_preferences_waiting( el ) {
    el.css( "color", "" );
    el.removeClass("fa-check-circle");
    el.addClass("fa fa-spinner fa-spin");
}

function _userscript_preferences_ok( el ) {
    el.removeClass( "fa-spinner fa-spin" );
    el.addClass( "fa fa-check-circle" );
    el.css( "color", "green" );
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

;(function($){
    $.fn.extend({
        donetyping: function(callback,timeout){
            timeout = timeout || 1000;
            var timeoutReference,
                doneTyping = function(el){
                    if (!timeoutReference) return;
                    timeoutReference = null;
                    callback.call(el);
                };
            return this.each(function(i,el){
                var $el = $(el);
                // Chrome Fix (Use keyup over keypress to detect backspace)
                $el.is(':input') && $el.on('keyup keypress paste',function(e){
                    // This catches the backspace button in chrome, but also prevents
                    // the event from triggering too preemptively. Without this line,
                    // using tab/shift+tab will make the focused element fire the callback.
                    if (e.type=='keyup' && e.keyCode!=8) return;

                    // Check if timeout has been set. If it has, "reset" the clock and
                    // start over again.
                    if (timeoutReference) clearTimeout(timeoutReference);
                    timeoutReference = setTimeout(function(){
                        // if we made it here, our timeout has elapsed. Fire the
                        // callback
                        doneTyping(el);
                    }, timeout);
                }).on('blur',function(){
                    // If we can, fire the event since we're leaving the field
                    doneTyping(el);
                });
            });
        }
    });
})(jQuery);
