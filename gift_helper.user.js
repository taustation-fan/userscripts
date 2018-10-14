// ==UserScript==
// @name         Tau Station Gift Helper
// @namespace    https://github.com/dot-sent
// @version      0.1
// @description  Provides extensive functionality to enable gifting through chat
// @author       Dot_sent
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

function url_param(name){
	var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
	return results == null ? null : results[1] || 0;
}

function add_user_to_recipients_list(user_to_add){
    $('#recipients').append('<option value="' + user_to_add.toLowerCase() + '">' + user_to_add + '</option>');
};

function redirect_to_inventory(user_to_add){
//    console.log('Redirecting to: ' + 'https://alpha.taustation.space/character/inventory?gift_to_user=' + user_to_add);
    window.location.href='https://alpha.taustation.space/character/inventory?gift_to_user=' + user_to_add;
};

function redirect_to_shipping_bay(user_to_add){
//    console.log('Redirecting to: ' + 'https://alpha.taustation.space/area/shipping-bay?gift_to_user=' + user_to_add);
    window.location.href='https://alpha.taustation.space/area/shipping-bay?gift_to_user=' + user_to_add;
}

function add_shipping_options(){
    $(".message-nav ul li:first-child .visuallyhidden").each(function(){
        var username = $(this).text();
        var parent_ul = $(this).parents('.message-nav ul')[0];
        if ($(parent_ul).find('.send-stuff-link').length == 0){
            if(window.location.href.indexOf('/character/inventory') > -1) {
                $(parent_ul).append('<li class="send-stuff-link"><a href="#" data-username="' + username + '">Send stuff</a></li>');
                $(parent_ul).find('.send-stuff-link a').on('click', function(){
                    add_user_to_recipients_list($(this).attr('data-username'));
                });
            } else {
                $(parent_ul).append('<li class="send-stuff-link"><a href="https://alpha.taustation.space/area/shipping-bay?gift_to_user=' + username + '">Send stuff</a></li>');
            }
        }
    });
}

$(document).ready(function() {
    var user_to_add = url_param('gift_to_user');
    if (user_to_add != null){
        if (window.location.href.indexOf('/area/shipping-bay') > -1){
            redirect_to_inventory(user_to_add);
        } else if(window.location.href.indexOf('/character/inventory') > -1){
            add_user_to_recipients_list(user_to_add);
        };
    };
    window.setInterval(add_shipping_options, 1000);
    add_shipping_options();
});
