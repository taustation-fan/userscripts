// ==UserScript==
// @name     taustation_extended_nav
// @namespace https://github.com/moritz/
// @description Navigation extension for taustation.space
// @downloadURL https://rawgit.com/taustation-fan/userscripts/master/navigation.user.js
// @match https://alpha.taustation.space/*
// @version  1.2
// @grant    none
// @require http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

// If you've started one or more Career paths, set them to true here,
// and uncomment "show_change_career_links();" in the function below.
var show_careers = {
    'trader':             false,    // Business
    'opportunist':        false,    // Criminal
    'embassy_staff':      false,    // Law
    'cloning_specialist': false,    // Medicine
    'operative':          false,    // Special Services
    'port_technician':    false     // Technologist
};

function gs_taustation_enhance() {
    // show area links for the most common sub-areas
    add_sub_area_nav_links();

    // hide bond spending options without confirmation dialog.
    // remove the leading "//" from a line to enable it:

    // bond to credits conversion in the bank
    // $('.bond-to-credits').hide();

    // bribe for an extra ration
    // $('a.btn-buy-rations').hide();

    // Intelligence training
    // $('.btn-train-intelligence').hide();
    // $('.header-train-intelligence').hide();

    // personal trainer that the Gym
    // $('.personal-trainer').hide();

    // "Buy a round" at the lounge:
    // $('.buy-a-round').hide();


    // hide area tutorial and area image to save space
    // $('.tutorial').hide(); // area tutorial
    // $('.area-hero').hide(); // area image

    // make the Shop button less annoying
    $('.shop').removeClass('shop').addClass('bug-report')

    // show the number of the discreet work (counter per station)
    show_discreet_counter();

    // Highlight when safe in hotel-room
    show_hotel_room();

    // new feature: Once the chat is shown,
    // clicking on "CHAT" will increase the size of the chat window
    modify_chat();

    // Make it easy to change between the careers you've chosen.
    // show_change_career_links();

    //
    // END OF USER-CONFIGURATION
    //

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
        $('#chat').width($(document).width() - 40);
        $('#chat').height($(document).height() - 40);
        $('.page-container').hide();
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

    function show_change_career_links() {
        // If no careers have been selected (see show_careers above),
        // don't display this addition.
        var careers_selected = false;
        for (var x in show_careers) {
            careers_selected = careers_selected | show_careers[x];
        }
        if (! careers_selected) {
            return;
        }

        if ($('#employment_panel').find('.employment-title').length) {
            // A career is currently active: Show the link to leave your career.
            $('#game_navigation_areas a[href="/travel/area/job-center"]').parent('li')
                .after('<li class="area"><span style="padding-left: 2em">→</span> <a href="/character/quit-career">Change career</a></li>\n');
        } else if (! $(".description-container .name").text().match(/career advisory/i)) {
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
            if (show_careers.trader)             { careers.push('<a href="' + prefix + 'trader">Trader</a>'); }
            if (show_careers.opportunist)        { careers.push('<a href="' + prefix + 'opportunist">Opportunist</a>'); }
            if (show_careers.embassy_staff)      { careers.push('<a href="' + prefix + 'embassy-staff">Embassy</a>'); }
            if (show_careers.cloning_specialist) { careers.push('<a href="' + prefix + 'cloning-specialist">Cloning</a>'); }
            if (show_careers.operative)          { careers.push('<a href="' + prefix + 'operative">Operative</a>'); }
            if (show_careers.port_technician)    { careers.push('<a href="' + prefix + 'port-technician">Port Tech</a>'); }

            // People typically have only 1-2 careers (so far); the list we
            // end up with should be short, so just show it on one line.
            // (For 3+ careers, two or more lines would look better.)
            var careers_shown = careers.join(' / ');
            $('#game_navigation_areas a[href="/travel/area/job-center"]').parent('li')
                .after('<li class="area"><span style="padding-left: 2em">→ Start:</span>\n' + careers_shown + '\n</li>\n');
        }
    }
}
$(document).ready(gs_taustation_enhance);
