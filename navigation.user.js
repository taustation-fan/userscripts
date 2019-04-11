// ==UserScript==
// @name     taustation_extended_nav
// @namespace https://github.com/moritz/
// @description Navigation extension for taustation.space
// @downloadURL https://rawgit.com/taustation-fan/userscripts/master/navigation.user.js
// @match https://alpha.taustation.space/*
// @version  1.9.1
// @grant    none
// @require http://code.jquery.com/jquery-3.3.1.min.js
// @require https://rawgit.com/taustation-fan/userscripts/master/userscript-preferences.js
// ==/UserScript==

// Nothing user-configurable below
// To configure, visit in-game User Preferences (/preferences)

function gs_taustation_enhance() {
    let options = userscript_preferences( navigation_preferences_definition() );

    // show area links for the most common sub-areas
    if ( options.show_sub_area_nav_links ) {
        add_sub_area_nav_links();
    }

    // hide bond spending options without confirmation dialog.

    // bond to credits conversion in the bank
    if ( options.hide_bond_conversion_in_bank ) {
        $('.bond-to-credits').hide();
    }

    // bribe for an extra ration
    if ( options.hide_bribe_for_extra_ration ) {
        $('a#bribe-for-ration').hide();
    }

    // Intelligence training
    if ( options.hide_int_training ) {
        $('.btn-train-intelligence').hide();
        $('.header-train-intelligence').hide();
    }

    // personal trainer that the Gym
    if ( options.hide_gym_trainer ) {
        $('.personal-trainer').hide();
    }

    // "Buy a round" at the lounge:
    if ( options.hide_lounge_buy_round ) {
        $('.btn-train-social').hide();
    }


    // hide area tutorial and area image to save space
    if ( options.hide_area_tutorial_image ) {
        $('.tutorial').hide(); // area tutorial
        $('.area-hero').hide(); // area image
    }

    // make the Shop button less annoying
    if ( options.style_shop_button ) {
        $('.shop').removeClass('shop').addClass('bug-report')
    }

    // show the number of the discreet work (counter per station)
    if ( options.show_discreet_counter ) {
        show_discreet_counter();
    }

    // Highlight when safe in hotel-room
    if ( options.show_hotel_room_message ) {
        show_hotel_room();
    }

    if ( options.show_hotel_ship_icon ) {
        show_hotel_room_or_ship_icon();
    }

    // new feature: Once the chat is shown,
    // clicking on "CHAT" will increase the size of the chat window
    if ( options.modify_chat ) {
        modify_chat();
    }

    // Make it easy to change between the careers you've chosen.
    if ( options.show_change_career_links ) {
        show_change_career_links();
    }


    function add_sub_area_nav_links() {
        var current_station = $(".description-container .station").text();
        var port_links = '<li class="area "> <a style="padding-left: 2em" href="/travel/area/shipping-bay">Shipping</a> / <a href="/travel/area/docks">Docks</a>';
        if ( current_station.match(/jump gate/i) !== null ) {
            port_links += ' / <a href="/travel/area/interstellar-shuttles">Interstellar</a>';
        }
        port_links += ' / <a href="/travel/area/local-shuttles">Shuttles</a> </li>';

        $('#game_navigation_areas a[href="/travel/area/inn"]').parent('li').after('<li class="area "> <a style="padding-left: 2em" href="/travel/area/bar">Bar</a> / <a href="/area/hotel-rooms/enter-room">Room</a> / <a href="/travel/area/lounge">Lounge</a> </li>');
        $('#game_navigation_areas a[href="/travel/area/market"]').parent('li').after('<li class="area "> <a style="padding-left: 2em" href="/travel/area/vendors">Vendors</a> / <a href="/travel/area/electronic-market">Public</a> / <a href="/travel/area/storage">Storage</a> </li>');
        $('#game_navigation_areas a[href="/travel/area/port"]').parent('li').after(port_links);
        $('#game_navigation_areas a[href="/travel/area/ruins"]').parent('li').after('<li class="area "> <a style="padding-left: 2em" href="/travel/area/the-wrecks">Wrecks</a> / <a href="/area/the-wilds">Wilds</a> </li>');
    }

    var is_fullpage_chat = false;
    var old_style;
    function modify_chat() {
        $('.chat-heading').bind('click', function () {
            if (is_fullpage_chat) {
                is_fullpage_chat = false;
                normal_chat();
            }
            else {
                is_fullpage_chat = true;
                if (! old_style) {
                    old_style = $('#chat').attr('style');
                }
                fullpage_chat();
            }
        });
    }

    function fullpage_chat() {
        let chat = $( "#chat:first" );
        chat.css( "max-height", "100vh" );
        chat.css( "margin", 0 );
        chat.css( "bottom", 0 );
        chat.css( "right", 0 );
        chat.find(".chat--inner").css( "height", "calc( 100% - 2.25em )" );
        let header = chat.find( "header:first" );
        header.css( "height", "unset" );
        header.css( "padding", 0 );
        let h2 = header.find("h2:first");
        h2.css( "font-size", "unset" );
        header.find( "button" ).css( "padding", 0 );
        let content = chat.find(".content:first");
        content.css( "height", "calc( 100% - 5.5em )" );
        let controls = chat.find(".controls:first");
        controls.css( "height", "unset" );
        controls.css( "margin", 0 );
        controls.css( "padding", 0 );
        let controls_channels = chat.find("#controls_channels:first");
        controls_channels.css( "height", "unset" );
        controls_channels.css( "margin", 0 );
        controls_channels.css( "padding", 0 );
        controls_channels.find( "button" ).each( function() {
            $(this).css( "padding", 0 );
            $(this).css( "font-size", "unset" );
        } );
        $( ".page-container" ).hide();
        chat.height( $(document).height() );
        chat.width( $(document).width() );
    }

    function normal_chat() {
        // Future-proofing, in case they ever add a style attrib to this.
        if (old_style) {
            $('#chat').attr('style', old_style);
        } else {
            $('#chat').removeAttr('style');
        }
        $('.page-container').show();
    }

    function show_discreet_counter() {
        // contributed by Perleone
        if ( !window.location.pathname.match('^(/area/discreet-work|/character/details/)') ) {
            return;
        }
        var flow = $('[id^=mission-].mission-flow');
        if (flow.prop('id')) {
            var discr_num = flow.prop('id').replace( /^.*-(\d+)$/, '$1' );
            flow.find('h3').text( flow.find('h3').text() + ' Mission No. ' + discr_num );
        }
    }

    function show_hotel_room() {
        // contributed by Perleone
        if ( !window.location.pathname.match('^/area/hotel-rooms/enter-room') ) {
            return;
        }
        $('.area-hotel-rooms h1').append( ' ⇒ ' + $('.zone-notice').text() ).css('background-color', 'blue');
    }

    function show_hotel_room_or_ship_icon() {
        let attrs = undefined;

        if (
            // we are at hotel-room area page
            window.location.pathname.startsWith('/area/hotel-rooms/enter-room')
            // or a non-area page with a location link back to inside the hotel-room
            || $(".non-area-heading-container a.navigation[href='/area/hotel-rooms/enter-room']").length
        ) {
            attrs = {
                'class': 'fa fa-bed',
            };
        } else if (
            // We are onboard a private ship, or are traveling in a shuttle (not merely in an area page).
            // (The link back to the area page just uses '/area/', so it's not helpful here.)
            $('.global-timer[data-timer-type="travel"]').length ||
            $('.areas a[href="/area/docks/leave_ship"]').length
        ) {
            attrs = {
                'class': 'fa fa-space-shuttle',
            };
        }

        if (attrs) {
            if (! attrs.hasOwnProperty('style')) {  // Allow it to be specified as empty.
                attrs.style = 'margin-left: 0.5em;';
            }

            // player name on large screens
            $('<span/>', attrs).appendTo('#player-name');
            // player name on small screens
            $('<span/>', attrs).appendTo('.avatar-links--item--player');
        }
    }

    //TODO: Add "Hide Tasks"-style UI to Careers page, to select which careers this shows (instead of using constants at top of file).
    //TODO: Move to sidebar's [Employment] section? (May also need to confirm that sidebar's [Areas] section includes Employment area.)
    function show_change_career_links() {
        // If no careers have been selected (see show_careers above),
        // don't display this addition.
        var careers_selected = false;
        for (var x in options.show_careers) {
            careers_selected = careers_selected | options.show_careers[x];
        }
        if (! careers_selected) {
            return;
        }

        if (! $('#employment_panel').find('a[href="/travel/area/job-center"],a[href="/area/job-center"]').length) {
            // A career is currently active: Show the link to leave your career.
            $('#game_navigation_areas a[href="/travel/area/job-center"]').parent('li')
                .after('<li class="area"><span style="padding-left: 2em">→</span> <a href="/character/quit-career">Change career</a></li>\n');
        } else if (!window.location.pathname.startsWith('/area/career-advisory')) {
            // No careers are currently active, but we can only change careers
            // inside Career Advisory: Show a link to Career Advisory. (Same as
            // the page's "start a career" link, but in the same place on-page
            // as the career-change links above & below.)
            $('#game_navigation_areas a[href="/travel/area/job-center"]').parent('li')
                .after('<li class="area"><span style="padding-left: 2em">→ Go to</span> <a href="/area/career-advisory">Career Advisory</a></li>\n');
        } else {
            // No careers are currently active: Show only the careers that the
            // player has chosen to pursue (see show_careers above).
            var careers = [];
            var prefix  = '/area/career-advisory/start-career/';
            if (options.show_careers.trader)             { careers.push('<a href="' + prefix + 'trader">Trader</a>'); }
            if (options.show_careers.opportunist)        { careers.push('<a href="' + prefix + 'opportunist">Opportunist</a>'); }
            if (options.show_careers.embassy_staff)      { careers.push('<a href="' + prefix + 'embassy-staff">Embassy</a>'); }
            if (options.show_careers.cloning_specialist) { careers.push('<a href="' + prefix + 'cloning-specialist">Cloning</a>'); }
            if (options.show_careers.operative)          { careers.push('<a href="' + prefix + 'operative">Operative</a>'); }
            if (options.show_careers.port_technician)    { careers.push('<a href="' + prefix + 'port-technician">Port Tech</a>'); }

            // People typically have only 1-2 careers (so far); the list we
            // end up with should be short, so just show it on one line.
            // (For 3+ careers, two or more lines would look better.)
            var careers_shown = careers.join(' / ');
            $('#game_navigation_areas a[href="/travel/area/job-center"]').parent('li')
                .after('<li class="area"><span style="padding-left: 2em">→ Start:</span>\n' + careers_shown + '\n</li>\n');
        }
    }

    function navigation_preferences_definition() {
        return {
            player_key: "extended_nav_prefs",
            label: "Extended Navigation",
            options: [
                {
                    key:     "show_change_career_links",
                    label:   "Show career-change links",
                    type:    "boolean",
                    default: true
                },
                {
                    key:     "show_careers",
                    label:   "Show careers",
                    help:    "Only used if above setting is true",
                    type:    "boolean_array",
                    options: [
                        { key: "trader",             label: "Trader" },
                        { key: "opportunist",        label: "Opportunist" },
                        { key: "embassy_staff",      label: "Embassy Staff" },
                        { key: "cloning_specialist", label: "Cloning Specialist" },
                        { key: "operative",          label: "Operative" },
                        { key: "port_technician",    label: "Port Technician" },
                    ]
                },
                {
                    key:     "show_sub_area_nav_links",
                    label:   "Show sub-area nav links",
                    type:    "boolean",
                    default: true
                },
                {
                    key:     "show_discreet_counter",
                    label:   "Show discreet-work counter",
                    type:    "boolean",
                    default: true
                },
                {
                    key:     "show_hotel_ship_icon",
                    label:   "Show icon when safe in Hotel Room or Ship",
                    type:    "boolean",
                    default: true
                },
                {
                    key:     "show_hotel_room_message",
                    label:   "Show large message when safe in Hotel Room",
                    type:    "boolean",
                    default: true
                },
                {
                    key:     "modify_chat",
                    label:   "Modify chat: allow maximizing chat window",
                    type:    "boolean",
                    default: true
                },
                {
                    key:   "hide_bond_conversion_in_bank",
                    label: "Hide bond-conversion in Bank",
                    type:  "boolean",
                },
                {
                    key:   "hide_bribe_for_extra_ration",
                    label: "Hide Gov't Centre option to buy extra ration for bonds",
                    type:  "boolean",
                },
                {
                    key:   "hide_int_training",
                    label: "Hide Intelligence training",
                    type:  "boolean",
                },
                {
                    key:   "hide_gym_trainer",
                    label: "Hide Gym personal trainer",
                    type:  "boolean",
                },
                {
                    key:   "hide_lounge_buy_round",
                    label: "Hide Lounge 'buy a round'",
                    type:  "boolean",
                },
                {
                    key:   "hide_area_tutorial_image",
                    label: "Hide area tutorials & image",
                    type:  "boolean",
                },
                {
                    key:     "style_shop_button",
                    label:   "Remove color highlight from Shop button",
                    type:    "boolean",
                    default: true
                },
            ]
        };
    }
}
$(document).ready(gs_taustation_enhance);
