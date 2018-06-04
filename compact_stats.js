// ==UserScript==
// @name     taustation_compact_stats
// @namespace https://github.com/dot-sent
// @description Extension to compact the left stats block at taustation.space
// @match https://alpha.taustation.space/*
// @version  1
// @grant    GM_addStyle
// @author Dot_sent
// @require http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

GM_addStyle ( `
  .extra-area{
    padding-left: 2em;
  }
  .collapsed-stats{
    width: 100%;
    padding-left: .563em;
    padding-top: .563em;
    padding-bottom: .563em;
  }
  .collapsed-stat-value.mental{
    color: #08a1ec;
  }
  .collapsed-stat-value.physical{
    color: #d76543;
  }
  .collapsed-stat-value.focus{
    color: #0ec12f;
  }
  #units_to_next_tick{
    box-sizing: unset;
  }
`);

function taustation_compact_stats() {
    $('<div class="collapsed-info-1 player-info--row"><div class="player-info--col--1-of-2"></div><div class="player-info--col--2-of-2"></div></div>' +
     '<div class="collapsed-info-2 player-info--row"><div class="player-info--col--1-of-2"></div><div class="player-info--col--2-of-2"></div></div>' +
     '<div class="collapsed-info-3 player-info--row"><div class="player-info--col--1-of-1"></div></div>').insertAfter('.player-info--row--player');
		var current_row = $('.collapsed-info-3').next();
    for (var i=0; i<4; i++){
        current_row.hide();
        current_row = current_row.next();
    }
  	$('.bonds-text').hide();
    $('.player-info--icon').attr('height', 19).attr('width', 19);
    $('.level-container').detach().appendTo('.collapsed-info-1 .player-info--col--1-of-2').attr('style', 'border-left: none;');
    $('.credit-container').detach().appendTo('.collapsed-info-1 .player-info--col--2-of-2').attr('style', 'border-left: none;');
    $('.experience-container').detach().attr('style', 'padding-left: .563em; padding-right: .563em;').appendTo('.collapsed-info-2 .player-info--col--1-of-2');
    $('.bonds-container').detach().appendTo('.collapsed-info-2 .player-info--col--2-of-2').attr('style', 'border-left: none;');
    $('.toxins-container').detach().appendTo('.collapsed-info-3 .player-info--col--1-of-1').attr('style', 'border-left: none;');

    var stat_labels = { 'strength': 'STR', 'agility': 'AGI', 'stamina': 'STA', 'intelligence': 'INT', 'social': 'SOC' };
    var info_line = '<table class="collapsed-stats"><tbody><tr><td colspan="6">Unit(s) to next tick: <span id="units_to_next_tick">???</span></td></tr><tr>';
    var info_type = ' physical';
  	for (var stat in stat_labels){
        info_line += '<td>' + stat_labels[stat] + '</td><td class="collapsed-stat-value' + info_type + ' ' + stat + '">' + $('.' + stat + ' .pc')[0].innerHTML + '%</td>';
        if (stat == 'stamina'){ // Line break - ugly, I know
            info_line += '</tr><tr>';
            info_type = ' mental';
        }
    }
    info_line += '<td>F</td><td class="collapsed-stat-value focus">' + $('.focus .percentage')[0].innerHTML + '</td></tr></tbody></table>';
    var units_to_update = null;
    setInterval(function(){
        if (units_to_update != null) {
            units_to_update -= 1;
            if (units_to_update < 0){
                units_to_update = null;
                $('#units_to_next_tick')[0].innerHTML = "0 (stats full)";
            } else {
                $('#units_to_next_tick')[0].innerHTML = units_to_update;
            }
        }
        for (var stat in stat_labels){
            var cur_val = $('.' + stat + ' .pc')[0].innerHTML + '%';
            if (cur_val != $('.collapsed-stat-value.' + stat)[0].innerHTML){
                $('.collapsed-stat-value.' + stat)[0].innerHTML = cur_val;
                units_to_update = 347; // 5 minutes to units
            }
        }
        var focus_value = $('.focus .percentage')[0].innerHTML;
        if ($('.collapsed-stat-value.focus')[0].innerHTML != focus_value){
            $('.collapsed-stat-value.focus')[0].innerHTML = focus_value;
                units_to_update = 347; // 5 minutes to units
        }
    }, 864);
    $('<div class="player-info--row">' + info_line + '</div>').insertBefore($('.player-stats'));
    $('.player-stats').hide();
    $('.collapsed-stats').mouseenter(function(){
        $('.player-stats').show();
    }).mouseleave(function(){
        $('.player-stats').hide();
    });
    $('.employment-title').hide();
    var employment_link_titles = {
      '/mission': 'Mission | ',
      '/travel/area/discreet-work': 'Discreet | ',
      '/travel/area/side-jobs': 'Side jobs | ',
      '/career': 'Career'
    };
    var employment_links = $('#employment_panel a');
    for (var emp_link in employment_link_titles){
        $('#employment_panel a[href="' + emp_link + '"]')[0].innerHTML = employment_link_titles[emp_link];
    }
    $('<div class="employment-links" style="padding-left: .563em; padding-top: .563em; padding-bottom: .563em;"></div>').appendTo('#employment_panel');
    $('#employment_panel a').detach().appendTo('div.employment-links');
    $('#employment_panel ul.list-reset').hide();
}

$(document).ready(taustation_compact_stats);
