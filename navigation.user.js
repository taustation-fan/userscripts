// ==UserScript==
// @name     taustation_extended_nav
// @namespace https://github.com/moritz/
// @description Navigation extension for taustation.space
// @downloadURL https://rawgit.com/taustation-fan/userscripts/master/navigation.user.js
// @match https://taustation.space/*
// @version  1.11.0
// @grant    none
// @require http://code.jquery.com/jquery-3.3.1.min.js
// @require https://rawgit.com/taustation-fan/userscripts/master/userscript-preferences.js
// ==/UserScript==

// Nothing user-configurable below
// To configure, visit in-game User Preferences (/preferences)

function gs_taustation_enhance() {
    let options = userscript_preferences( navigation_preferences_definition() );

    // Store reference to popup object so we don't have to build it more than once
    let emoji_window = $();
    // Store reference to button so we don't create it more than once
    let emoji_btn = $();
    // Store reference to core chat field to avoid repeatedly querying the DOM
    let chat_field;

    let added_sublinks = false;

    // show area links for the most common sub-areas
    if ( options.show_sub_area_nav_links ) {
        added_sublinks = true;
        add_sub_area_nav_links();
    }

    // hide bond spending options without confirmation dialog.

    // bond to credits conversion in the bank
    if ( options.hide_bond_conversion_in_bank && window.location.pathname.startsWith('/area/bank') ) {
        $('.bond-to-credits').hide();

        // Note: In Mobile view, the confirm dialog will now overlap the People tab --
        // but it sits under the tab (not laying on top of it), so it can't be clicked.
        // (The dialog is added after page load, so change its CSS so overlay isn't needed.)
        add_css(`
.confirm--dialog {
    position: relative !important;
}
/* Anchor background image at top, so it doesn't shift when the confirmation dialog appears. */
.bank-container {
    background-position-y: top !important;
}
`);
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

    if ( options.chat_emojis ) {
            add_chat_emoji_css();
            add_chat_emoji_action();
    }

    // Make it easy to change between the careers you've chosen.
    if ( options.show_change_career_links ) {
        added_sublinks = true;
        show_change_career_links();
    }

    if (added_sublinks) {
        add_nav_sub_links_css();
    }


    function insert_into_navigation_pane_after_index(index, areas)
    {
        window.FrameState.navigation.areas.splice(index + 1, 0, areas);
    }

    function add_sub_area_nav_links()
    {
        if (!window.FrameState) {
            return;
        }

        var current_station = window.FrameState.location.station;

        var innIndex = window.FrameState.navigation.areas.findIndex(o => o.text === "Inn");
        var innSubs = [
            {text: "Bar", link: "/travel/area/bar"},
            {text: "Room", link: "/area/hotel-rooms/enter-room"},
            {text: "Lounge", link: "/travel/area/lounge"}
        ];
        insert_into_navigation_pane_after_index(innIndex, innSubs);

        var marketIndex = window.FrameState.navigation.areas.findIndex(o => o.text === "Market");
        var marketSubs = [
            {text: "Public", link: "/travel/area/public-market"},
            {text: "Storage", link: "/travel/area/storage"},
            {text: "Vendors", link: "/travel/area/vendors"}
        ];
        insert_into_navigation_pane_after_index(marketIndex, marketSubs);

        var portIndex = window.FrameState.navigation.areas.findIndex(o => o.text === "Port")
        var portSubs = [
            {text: "Docks", link: "/travel/area/docks"},
            {text: "Shuttles", link: "/travel/area/local-shuttles"},
            {text: "Shipping", link: "/travel/area/shipping"}
        ];
        if ( current_station.match(/jump gate/i) !== null ) {
            portSubs.splice(2, 0, {text: "Interstellar", link: "/travel/area/interstellar-shuttles"});
        }
        insert_into_navigation_pane_after_index(portIndex, portSubs);

        var ruinsIndex = window.FrameState.navigation.areas.findIndex(o => o.text === "Ruins")
        var ruinsSubs = [
            //{text: "Wrecks", link: "/travel/area/the-wrecks"},
            {text: "Wilds", link: "/travel/area/the-wilds"}
        ];
        insert_into_navigation_pane_after_index(ruinsIndex, ruinsSubs);

        window.FrameState.navigation.areas = window.FrameState.navigation.areas.flat();

        if ( options.hunt_mode) {
            window.FrameState.navigation.areas.map(({text, link}) => {
                var newLink = link + "#/people";
                return {text, newLink};
            });
        }
    }

    // Mimic the highlight shown for top-level-area links.
    function add_nav_sub_links_css() {
        add_css(`
.area a.nav-sub-link:hover,
.area a.nav-sub-link:focus {
    box-shadow: 0 0 0.188em 0.25em #83f1fd;
    color: #08a1ec;
}
`);
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
            $('.timer[data-timer-type="travel"], ' +
              '.areas a[href="/area/docks/leave_ship"]').length
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

    function show_change_career_links() {
        // If no careers have been selected (see show_careers above),
        // don't display this addition.
        var careers_selected = 0;
        for (var x in options.show_careers) {
            // This script initially used an early version of userscript-preferences' boolean_array field; when
            // that code changed, this field's data was left with a bogus string property named "undefined".
            if (x === undefined || x === 'undefined') {
                continue;
            }

            if (options.show_careers[x]) {
                careers_selected++;
            }
        }
        if (! careers_selected) {
            return;
        }

        //TODO: Improve this selector, if/when a site update changes the Employment section's items to have different classes, or its "Career" line indicates "career active?" (vs. none active) using something besides fragile, user-visible text.
        if ($('#employment_panel a[href="/travel/area/job-center"]:not(:contains("Choose a career"))').length) {
            // A career is currently active: Show the link to leave your career.
            $('#game_navigation_areas a[href="/travel/area/job-center"]').parent('li')
                .after('<li class="area"><span style="padding-left: 1.6em">→</span> <a class="nav-sub-link" href="/character/quit-career">Change career</a></li>\n');
        } else if (!window.location.pathname.startsWith('/area/career-advisory')) {
            // No careers are currently active, but we can only change careers
            // inside Career Advisory: Show a link to Career Advisory. (Same as
            // the page's "start a career" link, but in the same place on-page
            // as the career-change links above & below.)
            $('#game_navigation_areas a[href="/travel/area/job-center"]').parent('li')
                .after('<li class="area"><span style="padding-left: 1.6em">→ Go to</span> <a class="nav-sub-link" href="/area/career-advisory">Career Advisory</a></li>\n');
        } else {
            // No careers are currently active: Show only the careers that the
            // player has chosen to pursue (see show_careers above).
            var careers = [];
            var prefix  = '/area/career-advisory/start-career/';
            if (options.show_careers.trader)             { careers.push('<a class="nav-sub-link" href="' + prefix + 'trader">Trader</a>'); }
            if (options.show_careers.opportunist)        { careers.push('<a class="nav-sub-link" href="' + prefix + 'opportunist">Opportunist</a>'); }
            if (options.show_careers.embassy_staff)      { careers.push('<a class="nav-sub-link" href="' + prefix + 'embassy-staff">Embassy</a>'); }
            if (options.show_careers.cloning_specialist) { careers.push('<a class="nav-sub-link" href="' + prefix + 'cloning-specialist">Cloning</a>'); }
            if (options.show_careers.operative)          { careers.push('<a class="nav-sub-link" href="' + prefix + 'operative">Operative</a>'); }
            if (options.show_careers.port_technician)    { careers.push('<a class="nav-sub-link" href="' + prefix + 'port-technician">Port Tech</a>'); }

            // If the player has only 1-2 careers, show them on one line.
            // For 3+ careers, use two or more lines.
            var careers_shown = '';
            if (careers_selected < 3) {
                careers_shown = careers.join(' / ');
            } else {
                let start_next_line = (careers_selected % 2);
                for (let ii = 0; ii < careers_selected; ii++) {
                    careers_shown += careers[ii];
                    // Append a separator, unless it's the last item.
                    if (ii + 1 < careers_selected) {
                        // If odd, the first line has 1 career, and successive lines have 2 careers;
                        // if even, each line has 2 careers.
                        if ((ii+1) % 2 === start_next_line) {
                            careers_shown += ' /<br><span style="padding-left: 4em;"/>';
                         } else {
                             careers_shown += ' / ';
                         }
                    }
                }
            }
            $('#game_navigation_areas a[href="/travel/area/job-center"]').parent('li')
                .after('<li class="area"><span style="padding-left: 1.6em">→ Start:</span>\n' + careers_shown + '\n</li>\n');
        }
    }

    function add_css(css){
        // Ref: https://stackoverflow.com/questions/3922139/add-css-to-head-with-javascript
        var head = document.getElementsByTagName('head')[0];
        var s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        if (s.styleSheet) {   // IE
            s.styleSheet.cssText = css;
        } else {              // the world
            s.appendChild(document.createTextNode(css));
        }
        head.appendChild(s);
    }

    function add_chat_emoji_css() {
        add_css(`
            #userscript_emoji_window {
                height: 18em;
                max-height: 18em;
                width: 18em;
                position: absolute;
                top: 0;
                left: 0;
                transform: translateY(-100%);
                overflow-y: auto;
                background-color: black;
            }
            #userscript_emoji_window .userscript_emoji_icon {
                display: inline !important;
                height: 1em;
                width: 1em !important;
                max-height: 1em;
                max-width: 1em !important;
                margin: 0.25em;
            }`);
    }

    function add_chat_emoji_action() {
        let chat = $("#chat");
        let toggle_btn = chat.find("header .btn-wrapper button").first();
        let chat_msg_container = chat.find(".chat-messages-container").first();
        chat_field = $("#chat-body");

        toggle_btn.click(
            {
                chat: chat,
                toggle_btn: toggle_btn
            },
            function (e) {
                if ( chat_msg_container.is(":visible") ) {
                    enter_chat_action(e);
                }
                else {
                    exit_chat_action();
                }
            }
        );
    }

    function enter_chat_action(e) {
        if ( ! emoji_btn.length ) {
            emoji_btn = $(
                `<button></button`,
                {
                    html: "&#128515;"
                }
            );

            emoji_btn.click(
                {
                    chat: e.data.chat
                },
                function () {
                    if ( $("#userscript_emoji_window").length ) {
                        emoji_window_close();
                    }
                    else {
                        emoji_window_open();
                    }
                }
            );

            e.data.chat.find(".controls .btn-wrapper").first().before(emoji_btn);
        }
    }

    function emoji_window_open() {
        if ( ! emoji_window.length ) {
            emoji_window = $(
                `<div></div>`,
                {
                    id: "userscript_emoji_window"
                }
            );

            for ( let name in emoji_list ) {
                let btn = $(
                    `<div></div>`,
                    {
                        html: emoji_list[name],
                        class: "userscript_emoji_icon",
                        title: name
                    }
                );

                btn.click(
                    {
                        emoji_name: name
                    },
                    append_chat_text
                );

                emoji_window.append(btn);
            }
        }

        chat_field.after(emoji_window);
    }

    function emoji_window_close() {
        emoji_window.detach();
    }

    function exit_chat_action() {
        emoji_window.detach();
    }

    function append_chat_text(e) {
        let emoji_name = e.data.emoji_name;

        let text = chat_field.val();

        text += ":" + emoji_name + ":";

        chat_field.val( text );

        // Move cursor to end of field
        let i = text.length;
        chat_field[0].setSelectionRange( i, i );
    }

    function navigation_preferences_definition() {
        return {
            key: "extended_nav_prefs",
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
                    options: new Map( [
                        [ "trader",             "Trader" ],
                        [ "opportunist",        "Opportunist" ],
                        [ "embassy_staff",      "Embassy Staff" ],
                        [ "cloning_specialist", "Cloning Specialist" ],
                        [ "operative",          "Operative" ],
                        [ "port_technician",    "Port Technician" ],
                    ] )
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
                    key:     "chat_emojis",
                    label:   "Add emoji menu to chat",
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
                {
                    key:     "hunt_mode",
                    label:   "Hunt mode",
                    help:    "All navigation panel links point to People tab directly",
                    type:    "boolean",
                },
            ]
        };
    }
}

// List taken from veure-emojis.js
// Removed names containing "-" which don't currently work in-game
// Removed names starting with a number which don't currently work in-game
// Sorted into category order ("p", "d", "n", "t", "s", "a", "")
// Each category sorted back into original order as found in
// https://gist.github.com/oliveratgithub/0bf11a9aff0d6da7b46f1490f86a71eb
const emoji_list = {
    "joy": "&#128514;",
    "heart_eyes": "&#128525;",
    "sob": "&#128557;",
    "blush": "&#128522;",
    "unamused": "&#128530;",
    "kissing_heart": "&#128536;",
    "weary": "&#128553;",
    "ok_hand": "&#128076;",
    "pensive": "&#128532;",
    "smirk": "&#128527;",
    "grin": "&#128513;",
    "wink": "&#128521;",
    "thumbsup": "&#128077;",
    "pray": "&#128591;",
    "relieved": "&#128524;",
    "flushed": "&#128563;",
    "raised_hands": "&#128588;",
    "cry": "&#128546;",
    "sunglasses": "&#128526;",
    "v": "&#9996;",
    "eyes": "&#128064;",
    "sweat_smile": "&#128517;",
    "sleeping": "&#128564;",
    "smile": "&#128516;",
    "expressionless": "&#128529;",
    "confused": "&#128533;",
    "information_desk_person": "&#128129;",
    "stuck_out_tongue_winking_eye": "&#128540;",
    "disappointed": "&#128542;",
    "yum": "&#128523;",
    "neutral_face": "&#128528;",
    "sleepy": "&#128554;",
    "clap": "&#128079;",
    "kiss": "&#128139;",
    "point_right": "&#128073;",
    "scream": "&#128561;",
    "rage": "&#128545;",
    "smiley": "&#128515;",
    "tired_face": "&#128555;",
    "stuck_out_tongue_closed_eyes": "&#128541;",
    "muscle": "&#128170;",
    "skull": "&#128128;",
    "triumph": "&#128548;",
    "laughing": "&#128518;",
    "sweat": "&#128531;",
    "point_left": "&#128072;",
    "heart_eyes_cat": "&#128571;",
    "grinning": "&#128512;",
    "mask": "&#128567;",
    "wave": "&#128075;",
    "persevere": "&#128547;",
    "crown": "&#128081;",
    "kissing_closed_eyes": "&#128538;",
    "stuck_out_tongue": "&#128539;",
    "disappointed_relieved": "&#128549;",
    "innocent": "&#128519;",
    "confounded": "&#128534;",
    "angry": "&#128544;",
    "grimacing": "&#128556;",
    "raising_hand": "&#128587;",
    "thumbsdown": "&#128078;",
    "dancer": "&#128131;",
    "no_mouth": "&#128566;",
    "fist": "&#9994;",
    "point_down": "&#128071;",
    "no_good": "&#128581;",
    "tongue": "&#128069;",
    "cold_sweat": "&#128560;",
    "ok_woman": "&#128582;",
    "joy_cat": "&#128569;",
    "zzz": "&#128164;",
    "walking": "&#128694;",
    "worried": "&#128543;",
    "fearful": "&#128552;",
    "open_hands": "&#128080;",
    "ghost": "&#128123;",
    "nail_care": "&#128133;",
    "alien": "&#128125;",
    "bow": "&#128583;",
    "angel": "&#128124;",
    "dancers": "&#128111;",
    "point_up": "&#9757;",
    "kissing_smiling_eyes": "&#128537;",
    "anguished": "&#128551;",
    "runner": "&#127939;",
    "couple": "&#128107;",
    "dizzy_face": "&#128565;",
    "point_up_2": "&#128070;",
    "open_mouth": "&#128558;",
    "hushed": "&#128559;",
    "ring": "&#128141;",
    "astonished": "&#128562;",
    "two_women_holding_hands": "&#128109;",
    "crying_cat_face": "&#128575;",
    "princess": "&#128120;",
    "massage": "&#128134;",
    "person_frowning": "&#128589;",
    "lips": "&#128068;",
    "frowning": "&#128550;",
    "couplekiss": "&#128143;",
    "couple_woman_kiss": "&#128105;&zwj;&#10084;&zwj;&#128139;&zwj;&#128105;",
    "couple_man_kiss": "&#128104;&zwj;&#10084;&zwj;&#128139;&zwj;&#128104;",
    "couple_with_heart": "&#128145;",
    "man_man_love": "&#128104;&zwj;&#10084;&zwj;&#128104;",
    "smiling_imp": "&#128520;",
    "imp": "&#128127;",
    "kissing_cat": "&#128573;",
    "santa": "&#127877;",
    "smirk_cat": "&#128572;",
    "smile_cat": "&#128568;",
    "scream_cat": "&#128576;",
    "baby": "&#128118;",
    "footprints": "&#128099;",
    "kissing": "&#128535;",
    "smiley_cat": "&#128570;",
    "lipstick": "&#128132;",
    "man": "&#128104;",
    "japanese_ogre": "&#128121;",
    "guardsman": "&#128130;",
    "girl": "&#128103;",
    "mortar_board": "&#127891;",
    "woman": "&#128105;",
    "pouting_cat": "&#128574;",
    "high_heel": "&#128096;",
    "bikini": "&#128089;",
    "family": "&#128106;",
    "haircut": "&#128135;",
    "boy": "&#128102;",
    "person_with_pouting_face": "&#128590;",
    "eyeglasses": "&#128083;",
    "older_woman": "&#128117;",
    "two_men_holding_hands": "&#128108;",
    "athletic_shoe": "&#128095;",
    "nose": "&#128067;",
    "man_with_turban": "&#128115;",
    "ear": "&#128066;",
    "tophat": "&#127913;",
    "bride_with_veil": "&#128112;",
    "older_man": "&#128116;",
    "dress": "&#128087;",
    "cop": "&#128110;",
    "person_with_blond_hair": "&#128113;",
    "japanese_goblin": "&#128122;",
    "man_with_gua_pi_mao": "&#128114;",
    "busts_in_silhouette": "&#128101;",
    "jeans": "&#128086;",
    "necktie": "&#128084;",
    "shirt": "&#128085;",
    "closed_umbrella": "&#127746;",
    "womans_hat": "&#128082;",
    "mans_shoe": "&#128094;",
    "handbag": "&#128092;",
    "construction_worker": "&#128119;",
    "purse": "&#128091;",
    "kimono": "&#128088;",
    "boot": "&#128098;",
    "school_satchel": "&#127890;",
    "sandal": "&#128097;",
    "briefcase": "&#128188;",
    "womans_clothes": "&#128090;",
    "pouch": "&#128093;",
    "middle_finger": "&#128405;",
    "writing_hand": "&#9997;",
    "dark_sunglasses": "&#128374;",
    "eye": "&#128065;",
    "pizza": "&#127829;",
    "beers": "&#127867;",
    "birthday": "&#127874;",
    "coffee": "&#9749;",
    "fries": "&#127839;",
    "doughnut": "&#127849;",
    "lollipop": "&#127853;",
    "strawberry": "&#127827;",
    "banana": "&#127820;",
    "watermelon": "&#127817;",
    "eggplant": "&#127814;",
    "fork_and_knife": "&#127860;",
    "beer": "&#127866;",
    "wine_glass": "&#127863;",
    "tropical_drink": "&#127865;",
    "peach": "&#127825;",
    "cherries": "&#127826;",
    "candy": "&#127852;",
    "hamburger": "&#127828;",
    "icecream": "&#127846;",
    "pineapple": "&#127821;",
    "chocolate_bar": "&#127851;",
    "grapes": "&#127815;",
    "cocktail": "&#127864;",
    "cake": "&#127856;",
    "cookie": "&#127850;",
    "apple": "&#127822;",
    "tangerine": "&#127818;",
    "poultry_leg": "&#127831;",
    "shaved_ice": "&#127847;",
    "lemon": "&#127819;",
    "baby_bottle": "&#127868;",
    "spaghetti": "&#127837;",
    "fish_cake": "&#127845;",
    "ramen": "&#127836;",
    "corn": "&#127805;",
    "bento": "&#127857;",
    "bread": "&#127838;",
    "tea": "&#127861;",
    "rice": "&#127834;",
    "green_apple": "&#127823;",
    "fried_shrimp": "&#127844;",
    "sushi": "&#127843;",
    "ice_cream": "&#127848;",
    "tomato": "&#127813;",
    "meat_on_bone": "&#127830;",
    "stew": "&#127858;",
    "honey_pot": "&#127855;",
    "custard": "&#127854;",
    "curry": "&#127835;",
    "pear": "&#127824;",
    "dango": "&#127841;",
    "rice_ball": "&#127833;",
    "melon": "&#127816;",
    "oden": "&#127842;",
    "sweet_potato": "&#127840;",
    "sake": "&#127862;",
    "rice_cracker": "&#127832;",
    "popcorn": "&#127871;",
    "champagne": "&#127870;",
    "hot_pepper": "&#127798;",
    "burrito": "&#127791;",
    "taco": "&#127790;",
    "hotdog": "&#127789;",
    "egg": "&#129370;",
    "see_no_evil": "&#128584;",
    "sparkles": "&#10024;",
    "speak_no_evil": "&#128586;",
    "cherry_blossom": "&#127800;",
    "fire": "&#128293;",
    "rose": "&#127801;",
    "sunny": "&#9728;",
    "new_moon_with_face": "&#127770;",
    "star2": "&#127775;",
    "sun_with_face": "&#127774;",
    "leaves": "&#127811;",
    "sweat_drops": "&#128166;",
    "penguin": "&#128039;",
    "star": "&#11088;",
    "four_leaf_clover": "&#127808;",
    "hibiscus": "&#127802;",
    "palm_tree": "&#127796;",
    "cloud": "&#9729;",
    "snowflake": "&#10052;",
    "crescent_moon": "&#127769;",
    "earth_africa": "&#127757;",
    "zap": "&#9889;",
    "sunflower": "&#127803;",
    "earth_americas": "&#127758;",
    "bouquet": "&#128144;",
    "dog": "&#128054;",
    "herb": "&#127807;",
    "fallen_leaf": "&#127810;",
    "tulip": "&#127799;",
    "cat": "&#128049;",
    "christmas_tree": "&#127876;",
    "full_moon_with_face": "&#127773;",
    "hear_no_evil": "&#128585;",
    "dash": "&#128168;",
    "cactus": "&#127797;",
    "maple_leaf": "&#127809;",
    "blossom": "&#127804;",
    "ocean": "&#127754;",
    "umbrella": "&#9748;",
    "pig": "&#128055;",
    "bee": "&#128029;",
    "earth_asia": "&#127759;",
    "panda_face": "&#128060;",
    "snowman": "&#9924;",
    "partly_sunny": "&#9925;",
    "feet": "&#128062;",
    "rabbit": "&#128048;",
    "snake": "&#128013;",
    "turtle": "&#128034;",
    "frog": "&#128056;",
    "hatching_chick": "&#128035;",
    "bear": "&#128059;",
    "tiger": "&#128047;",
    "ear_of_rice": "&#127806;",
    "octopus": "&#128025;",
    "jack_o_lantern": "&#127875;",
    "whale": "&#128051;",
    "dolphin": "&#128044;",
    "hatched_chick": "&#128037;",
    "monkey": "&#128018;",
    "mushroom": "&#127812;",
    "elephant": "&#128024;",
    "droplet": "&#128167;",
    "seedling": "&#127793;",
    "bird": "&#128038;",
    "first_quarter_moon_with_face": "&#127771;",
    "goat": "&#128016;",
    "new_moon": "&#127761;",
    "tropical_fish": "&#128032;",
    "last_quarter_moon_with_face": "&#127772;",
    "full_moon": "&#127765;",
    "evergreen_tree": "&#127794;",
    "pig_nose": "&#128061;",
    "fish": "&#128031;",
    "koala": "&#128040;",
    "bug": "&#128027;",
    "horse": "&#128052;",
    "monkey_face": "&#128053;",
    "wolf": "&#128058;",
    "cow": "&#128046;",
    "chicken": "&#128020;",
    "whale2": "&#128011;",
    "deciduous_tree": "&#127795;",
    "dragon": "&#128009;",
    "hamster": "&#128057;",
    "mouse": "&#128045;",
    "waxing_crescent_moon": "&#127762;",
    "first_quarter_moon": "&#127763;",
    "baby_chick": "&#128036;",
    "waning_crescent_moon": "&#127768;",
    "last_quarter_moon": "&#127767;",
    "sheep": "&#128017;",
    "waning_gibbous_moon": "&#127766;",
    "racehorse": "&#128014;",
    "rooster": "&#128019;",
    "rabbit2": "&#128007;",
    "beetle": "&#128030;",
    "crocodile": "&#128010;",
    "dog2": "&#128021;",
    "cat2": "&#128008;",
    "shell": "&#128026;",
    "poodle": "&#128041;",
    "ant": "&#128028;",
    "dragon_face": "&#128050;",
    "snail": "&#128012;",
    "camel": "&#128043;",
    "tanabata_tree": "&#127883;",
    "dromedary_camel": "&#128042;",
    "cow2": "&#128004;",
    "pig2": "&#128022;",
    "rat": "&#128000;",
    "ram": "&#128015;",
    "tiger2": "&#128005;",
    "boar": "&#128023;",
    "ox": "&#128002;",
    "bamboo": "&#127885;",
    "blowfish": "&#128033;",
    "leopard": "&#128006;",
    "water_buffalo": "&#128003;",
    "mouse2": "&#128001;",
    "rosette": "&#127989;",
    "shamrock": "&#9752;",
    "comet": "&#9732;",
    "turkey": "&#129411;",
    "scorpion": "&#129410;",
    "lion_face": "&#129409;",
    "crab": "&#129408;",
    "spider_web": "&#128376;",
    "spider": "&#128375;",
    "chipmunk": "&#128063;",
    "wind_blowing_face": "&#127788;",
    "fog": "&#127787;",
    "airplane": "&#9992;",
    "rainbow": "&#127752;",
    "anchor": "&#9875;",
    "rocket": "&#128640;",
    "milky_way": "&#127756;",
    "rotating_light": "&#128680;",
    "vertical_traffic_light": "&#128678;",
    "fireworks": "&#127878;",
    "stars": "&#127776;",
    "house_with_garden": "&#127969;",
    "sunrise": "&#127749;",
    "oncoming_automobile": "&#128664;",
    "night_with_stars": "&#127747;",
    "house": "&#127968;",
    "fuelpump": "&#9981;",
    "checkered_flag": "&#127937;",
    "sparkler": "&#127879;",
    "blue_car": "&#128665;",
    "bike": "&#128690;",
    "sunrise_over_mountains": "&#127748;",
    "volcano": "&#127755;",
    "wedding": "&#128146;",
    "convenience_store": "&#127978;",
    "statue_of_liberty": "&#128509;",
    "city_sunset": "&#127751;",
    "bus": "&#128652;",
    "steam_locomotive": "&#128642;",
    "hospital": "&#127973;",
    "oncoming_police_car": "&#128660;",
    "church": "&#9962;",
    "office": "&#127970;",
    "love_hotel": "&#127977;",
    "mount_fuji": "&#128507;",
    "school": "&#127979;",
    "ferris_wheel": "&#127905;",
    "roller_coaster": "&#127906;",
    "tokyo_tower": "&#128508;",
    "ship": "&#128674;",
    "fire_engine": "&#128658;",
    "police_car": "&#128659;",
    "bridge_at_night": "&#127753;",
    "oncoming_taxi": "&#128662;",
    "ambulance": "&#128657;",
    "tent": "&#9978;",
    "seat": "&#128186;",
    "taxi": "&#128661;",
    "european_castle": "&#127984;",
    "foggy": "&#127745;",
    "helicopter": "&#128641;",
    "oncoming_bus": "&#128653;",
    "european_post_office": "&#127972;",
    "carousel_horse": "&#127904;",
    "construction": "&#128679;",
    "department_store": "&#127980;",
    "truck": "&#128666;",
    "railway_car": "&#128643;",
    "speedboat": "&#128676;",
    "rice_scene": "&#127889;",
    "bullettrain_side": "&#128644;",
    "hotel": "&#127976;",
    "tractor": "&#128668;",
    "fountain": "&#9970;",
    "metro": "&#128647;",
    "station": "&#128649;",
    "bank": "&#127974;",
    "articulated_lorry": "&#128667;",
    "bullettrain_front": "&#128645;",
    "minibus": "&#128656;",
    "tram": "&#128650;",
    "traffic_light": "&#128677;",
    "japanese_castle": "&#127983;",
    "post_office": "&#127971;",
    "japan": "&#128510;",
    "train": "&#128651;",
    "trolleybus": "&#128654;",
    "factory": "&#127981;",
    "train2": "&#128646;",
    "light_rail": "&#128648;",
    "busstop": "&#128655;",
    "monorail": "&#128669;",
    "mountain_railway": "&#128670;",
    "aerial_tramway": "&#128673;",
    "mountain_cableway": "&#128672;",
    "suspension_railway": "&#128671;",
    "airplane_arriving": "&#128748;",
    "airplane_departure": "&#128747;",
    "railway_track": "&#128740;",
    "motorway": "&#128739;",
    "synagogue": "&#128333;",
    "mosque": "&#128332;",
    "kaaba": "&#128331;",
    "stadium": "&#127967;",
    "desert": "&#127964;",
    "classical_building": "&#127963;",
    "cityscape": "&#127961;",
    "camping": "&#127957;",
    "ferry": "&#9972;",
    "mountain": "&#9968;",
    "shinto_shrine": "&#9961;",
    "heart": "&#10084;",
    "two_hearts": "&#128149;",
    "recycle": "&#9851;",
    "notes": "&#127926;",
    "purple_heart": "&#128156;",
    "broken_heart": "&#128148;",
    "sparkling_heart": "&#128150;",
    "blue_heart": "&#128153;",
    "cupid": "&#128152;",
    "heartpulse": "&#128151;",
    "revolving_hearts": "&#128158;",
    "arrow_left": "&#11013;",
    "yellow_heart": "&#128155;",
    "heavy_check_mark": "&#10004;",
    "green_heart": "&#128154;",
    "heartbeat": "&#128147;",
    "arrow_forward": "&#9654;",
    "arrow_backward": "&#9664;",
    "arrow_right_hook": "&#8618;",
    "leftwards_arrow_with_hook": "&#8617;",
    "white_check_mark": "&#9989;",
    "arrow_right": "&#10145;",
    "musical_note": "&#127925;",
    "dizzy": "&#128171;",
    "red_circle": "&#128308;",
    "boom": "&#128165;",
    "thought_balloon": "&#128173;",
    "ballot_box_with_check": "&#9745;",
    "underage": "&#128286;",
    "bangbang": "&#8252;",
    "x": "&#10060;",
    "exclamation": "&#10071;",
    "heart_decoration": "&#128159;",
    "gift_heart": "&#128157;",
    "heavy_multiplication_x": "&#10006;",
    "hotsprings": "&#9832;",
    "ok": "&#127383;",
    "cyclone": "&#127744;",
    "anger": "&#128162;",
    "speech_balloon": "&#128172;",
    "top": "&#128285;",
    "warning": "&#9888;",
    "small_orange_diamond": "&#128312;",
    "o": "&#11093;",
    "fast_forward": "&#9193;",
    "put_litter_in_its_place": "&#128686;",
    "black_small_square": "&#9642;",
    "arrow_down": "&#11015;",
    "no_entry_sign": "&#128683;",
    "loud_sound": "&#128266;",
    "loudspeaker": "&#128226;",
    "sos": "&#127384;",
    "left_luggage": "&#128709;",
    "cool": "&#127378;",
    "question": "&#10067;",
    "back": "&#128281;",
    "blue_circle": "&#128309;",
    "black_circle": "&#9899;",
    "white_circle": "&#9898;",
    "customs": "&#128707;",
    "arrows_clockwise": "&#128259;",
    "up": "&#127385;",
    "arrow_up": "&#11014;",
    "arrow_upper_right": "&#8599;",
    "arrow_lower_right": "&#8600;",
    "arrow_lower_left": "&#8601;",
    "eight_spoked_asterisk": "&#10035;",
    "small_blue_diamond": "&#128313;",
    "baby_symbol": "&#128700;",
    "new": "&#127381;",
    "free": "&#127379;",
    "grey_exclamation": "&#10069;",
    "mega": "&#128227;",
    "arrow_upper_left": "&#8598;",
    "soon": "&#128284;",
    "repeat": "&#128257;",
    "a": "&#127344;",
    "interrobang": "&#8265;",
    "u5272": "&#127545;",
    "cancer": "&#9803;",
    "trident": "&#128305;",
    "arrow_heading_down": "&#10549;",
    "arrow_up_down": "&#8597;",
    "radio_button": "&#128280;",
    "curly_loop": "&#10160;",
    "arrows_counterclockwise": "&#128260;",
    "wavy_dash": "&#12336;",
    "rewind": "&#9194;",
    "eight_pointed_black_star": "&#10036;",
    "small_red_triangle": "&#128314;",
    "high_brightness": "&#128262;",
    "heavy_plus_sign": "&#10133;",
    "small_red_triangle_down": "&#128315;",
    "arrow_heading_up": "&#10548;",
    "name_badge": "&#128219;",
    "no_entry": "&#9940;",
    "sparkle": "&#10055;",
    "b": "&#127345;",
    "m": "&#9410;",
    "aquarius": "&#9810;",
    "heavy_dollar_sign": "&#128178;",
    "white_flower": "&#128174;",
    "diamond_shape_with_a_dot_inside": "&#128160;",
    "aries": "&#9800;",
    "womens": "&#128698;",
    "scorpius": "&#9807;",
    "o2": "&#127358;",
    "heavy_minus_sign": "&#10134;",
    "sagittarius": "&#9808;",
    "part_alternation_mark": "&#12349;",
    "large_blue_diamond": "&#128311;",
    "bell": "&#128276;",
    "leo": "&#9804;",
    "gemini": "&#9802;",
    "large_orange_diamond": "&#128310;",
    "taurus": "&#9801;",
    "globe_with_meridians": "&#127760;",
    "clock6": "&#128341;",
    "pisces": "&#9811;",
    "capricorn": "&#9809;",
    "negative_squared_cross_mark": "&#10062;",
    "grey_question": "&#10068;",
    "beginner": "&#128304;",
    "on": "&#128283;",
    "id": "&#127380;",
    "secret": "&#12953;",
    "libra": "&#9806;",
    "virgo": "&#9805;",
    "arrow_up_small": "&#128316;",
    "black_square_button": "&#128306;",
    "mobile_phone_off": "&#128244;",
    "congratulations": "&#12951;",
    "clock1130": "&#128358;",
    "black_joker": "&#127183;",
    "white_square_button": "&#128307;",
    "loop": "&#10175;",
    "information_source": "&#8505;",
    "vs": "&#127386;",
    "end": "&#128282;",
    "parking": "&#127359;",
    "black_medium_small_square": "&#9726;",
    "six_pointed_star": "&#128303;",
    "mens": "&#128697;",
    "arrow_double_up": "&#9195;",
    "white_small_square": "&#9643;",
    "keycap_ten": "&#128287;",
    "no_bell": "&#128277;",
    "clock12": "&#128347;",
    "signal_strength": "&#128246;",
    "black_medium_square": "&#9724;",
    "low_brightness": "&#128261;",
    "clock3": "&#128338;",
    "clock1": "&#128336;",
    "arrow_double_down": "&#9196;",
    "arrow_down_small": "&#128317;",
    "mute": "&#128263;",
    "white_large_square": "&#11036;",
    "wheelchair": "&#9855;",
    "clock2": "&#128337;",
    "atm": "&#127975;",
    "cinema": "&#127910;",
    "white_medium_square": "&#9723;",
    "ideograph_advantage": "&#127568;",
    "ng": "&#127382;",
    "wc": "&#128702;",
    "repeat_one": "&#128258;",
    "no_mobile_phones": "&#128245;",
    "clock4": "&#128339;",
    "no_smoking": "&#128685;",
    "black_large_square": "&#11035;",
    "clock5": "&#128340;",
    "u6307": "&#127535;",
    "ophiuchus": "&#9934;",
    "no_pedestrians": "&#128695;",
    "vibration_mode": "&#128243;",
    "clock10": "&#128345;",
    "clock9": "&#128344;",
    "clock8": "&#128343;",
    "u7a7a": "&#127539;",
    "ab": "&#127374;",
    "flower_playing_cards": "&#127924;",
    "clock11": "&#128346;",
    "clock7": "&#128342;",
    "white_medium_small_square": "&#9725;",
    "currency_exchange": "&#128177;",
    "sound": "&#128265;",
    "chart": "&#128185;",
    "cl": "&#127377;",
    "speaker": "&#128264;",
    "u55b6": "&#127546;",
    "mahjong": "&#126980;",
    "restroom": "&#128699;",
    "u7121": "&#127514;",
    "u6709": "&#127542;",
    "u7533": "&#127544;",
    "u6708": "&#127543;",
    "u7981": "&#127538;",
    "u6e80": "&#127541;",
    "children_crossing": "&#128696;",
    "accept": "&#127569;",
    "u5408": "&#127540;",
    "clock130": "&#128348;",
    "sa": "&#127490;",
    "twisted_rightwards_arrows": "&#128256;",
    "clock930": "&#128356;",
    "potable_water": "&#128688;",
    "clock230": "&#128349;",
    "clock1230": "&#128359;",
    "clock1030": "&#128357;",
    "abc": "&#128292;",
    "clock430": "&#128351;",
    "do_not_litter": "&#128687;",
    "clock330": "&#128350;",
    "heavy_division_sign": "&#10135;",
    "clock730": "&#128354;",
    "clock530": "&#128352;",
    "capital_abcd": "&#128288;",
    "symbols": "&#128291;",
    "clock830": "&#128355;",
    "clock630": "&#128353;",
    "abcd": "&#128289;",
    "koko": "&#127489;",
    "passport_control": "&#128706;",
    "baggage_claim": "&#128708;",
    "no_bicycles": "&#128691;",
    "asterisk": "&#42;",
    "heart_exclamation": "&#10083;",
    "star_of_david": "&#10017;",
    "cross": "&#10013;",
    "atom": "&#9883;",
    "wheel_of_dharma": "&#9784;",
    "yin_yang": "&#9775;",
    "peace": "&#9774;",
    "star_and_crescent": "&#9770;",
    "orthodox_cross": "&#9766;",
    "biohazard": "&#9763;",
    "radioactive": "&#9762;",
    "place_of_worship": "&#128720;",
    "anger_right": "&#128495;",
    "menorah": "&#128334;",
    "om_symbol": "&#128329;",
    "play_pause": "&#9199;",
    "track_previous": "&#9198;",
    "track_next": "&#9197;",
    "black_heart": "&#128420;",
    "speech_left": "&#128488;",
    "octagonal_sign": "&#128721;",
    "spades": "&spades;",
    "hearts": "&hearts;",
    "diamonds": "&diams;",
    "clubs": "&clubs;",
    "left_right_arrow": "&harr;",
    "copyright": "&copy;",
    "registered": "&reg;",
    "tm": "&trade;",
    "hash": "#&#8419;",
    "zero": "0&#8419;",
    "one": "1&#8419;",
    "two": "2&#8419;",
    "three": "3&#8419;",
    "four": "4&#8419;",
    "five": "5&#8419;",
    "six": "6&#8419;",
    "seven": "7&#8419;",
    "eight": "8&#8419;",
    "nine": "9&#8419;",
    "headphones": "&#127911;",
    "microphone": "&#127908;",
    "soccer": "&#9917;",
    "basketball": "&#127936;",
    "trophy": "&#127942;",
    "clapper": "&#127916;",
    "musical_score": "&#127932;",
    "football": "&#127944;",
    "guitar": "&#127928;",
    "space_invader": "&#128126;",
    "video_game": "&#127918;",
    "baseball": "&#9918;",
    "dart": "&#127919;",
    "swimmer": "&#127946;",
    "performing_arts": "&#127917;",
    "tennis": "&#127934;",
    "golf": "&#9971;",
    "surfer": "&#127940;",
    "fishing_pole_and_fish": "&#127907;",
    "bath": "&#128704;",
    "musical_keyboard": "&#127929;",
    "snowboarder": "&#127938;",
    "game_die": "&#127922;",
    "saxophone": "&#127927;",
    "bicyclist": "&#128692;",
    "rowboat": "&#128675;",
    "trumpet": "&#127930;",
    "violin": "&#127931;",
    "bowling": "&#127923;",
    "rugby_football": "&#127945;",
    "horse_racing": "&#127943;",
    "circus_tent": "&#127914;",
    "ticket": "&#127915;",
    "ski": "&#127935;",
    "running_shirt_with_sash": "&#127933;",
    "slot_machine": "&#127920;",
    "mountain_bicyclist": "&#128693;",
    "weightlifter_woman": "&#127947;&zwj;&#9792;",
    "weightlifter": "&#127947;",
    "basketballer": "&#9977;",
    "golfer": "&#127948;",
    "golfer_woman": "&#127948;&zwj;&#9792;",
    "bow_and_arrow": "&#127993;",
    "volleyball": "&#127952;",
    "medal": "&#127941;",
    "reminder_ribbon": "&#127895;",
    "ice_skate": "&#9976;",
    "skier": "&#9975;",
    "drum": "&#129345;",
    "eye_speachbubble": "&#128065;&zwj;&#128488;"
};

$(document).ready(gs_taustation_enhance);
