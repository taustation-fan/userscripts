// ==UserScript==
// @name     taustation_extended_nav
// @namespace https://github.com/moritz/
// @description Navigation extension for taustation.space
// @match https://alpha.taustation.space/*
// @version  1
// @grant    none
// @require http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

function show_hotel_room() {
    // contributed by Perleone
    if ( !window.location.pathname.match('^/area/hotel-rooms/enter-room') ) {
        return;
    }
    $('.area-hotel-rooms h1').append( ' ⇒ ' + $('.zone-notice').text() ).css('background-color', 'blue');
}


function gs_taustation_enhance() {
    // show area links for the most common sub-areas
    $('#game_navigation_areas a[href="/travel/area/inn"]').parent('li').after('<li class="area "> <a style="padding-left: 2em" href="/travel/area/bar">Bar</a> / <a href="/area/hotel-rooms/enter-room">Room</a> / <a href="/travel/area/lounge">Lounge</a> </li>');
    $('#game_navigation_areas a[href="/travel/area/market"]').parent('li').after('<li class="area "> <a style="padding-left: 2em" href="/travel/area/vendors">Vendors</a> / <a href="/travel/area/storage">Storage</a> / <a href="/travel/area/electronic-market">Public</a> </li>');
    $('#game_navigation_areas a[href="/travel/area/port"]').parent('li').after('<li class="area "> <a style="padding-left: 2em" href="/travel/area/shipping-bay">Shipping</a> / <a href="/travel/area/docks">Docks</a> / <a href="/travel/area/local-shuttles">Shuttles</a> </li>');

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
  

    // new feature: Once the chat is shown,
    // clicking on "CHAT" will increase the size of the chat window
    var is_fullpage_chat = false;
    var old_width = 0;
    var old_height = 0;

    function fullpage_chat() {
        $('#chat').width($(document).width() - 40);
        $('#chat').height($(document).height() - 40);
        $('.page-container').hide();
    }

    function normal_chat() {
        $('#chat').width(old_width);
        $('#chat').height(old_height);
        $('.page-container').show();
    }

    $('.chat-heading').bind('click', function () {
        if (is_fullpage_chat) {
            is_fullpage_chat = false;
            normal_chat();
        }
        else {
            is_fullpage_chat = true;
            if (old_width == 0) {
                old_width = $('#chat').width();
                old_height = $('#chat').height();
            }
            fullpage_chat();
        }
    });

    // show the number of the discreet work (counter per station)
    function show_discreet_counter() {
        // contributed by Perleone
        if ( !window.location.pathname.match('^(/area/discreet-work|/character/details/)') ) {
            return;
        }
        var flow = $('[id^=mission-].mission-flow');
        var discr_num = flow.prop('id').replace( /^.*-(\d+)$/, '$1' );
        flow.find('h3').text( flow.find('h3').text() + ' Mission No. ' + discr_num );
   }

    show_discreet_counter();
    show_hotel_room();

}
$(document).ready(gs_taustation_enhance);

