// ==UserScript==
// @name         taustation_hide_tasks
// @namespace    https://github.com/dot-sent
// @version      0.2
// @description  Hide irrelevant career tasks
// @author       Dot_sent
// @match        https://alpha.taustation.space/area/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @require http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

GM_addStyle(`
  .tau_station_hidden_tasks_btn_edit{
    border: 1px solid #13628b;
    background-color: #14374a;
    height: 2.875em;
    padding: .552em .2em .552em .2em;
    width: 38%;
    text-align: center;
    color: #d1e6dd;
    font-style: normal;
    font-weight: 300;
    font-family: Electrolize,sans-serif;
    text-align: center;
  }
  .tau_station_hidden_tasks_btn_edit span{
    margin: 3% 3% 3% 3%;
  }
`);

var is_editing_visibility = 0;
var hiddenTasksString = GM_getValue("tau_station_hidden_task_array", "{}");
var hiddenTasks = hiddenTasksString == undefined || hiddenTasksString == "" || hiddenTasksString == "[]" ? {} : JSON.parse(hiddenTasksString);

function taustation_hide_tasks() {
    $('div.tab-content-career').find("td[data-label='Task']").each(function(i,el){
        if (hiddenTasks[el.innerHTML] == 1) {
            $(el).parent().hide();
        }
    });
}

function toggle_task_visibility(evt) {
    hiddenTasks[evt.data.task_title] = 1 - evt.data.state;
    GM_setValue("tau_station_hidden_task_array", JSON.stringify(hiddenTasks));
    var elem = evt.target;
    $(elem).off();
    $(elem).on('click', { task_title: evt.data.task_title, state: 1 - evt.data.state}, toggle_task_visibility);
    $(elem).html(evt.data.state == 1 ? "Hide" : "Show");
}

function toggle_edit_interface() {
    if (is_editing_visibility){
        is_editing_visibility = 0;
        $('.tau_station_show_task_container').remove();
        $('#tau_station_hidden_task_btn_edit').html('Edit task visibility');
        taustation_hide_tasks();
    } else {
        is_editing_visibility = 1;
        $('#tau_station_hidden_task_btn_edit').html('Apply visibility settings');
        $('.tab-content-career table thead tr').append('<th class="tau_station_show_task_container">Hide/Show</th>');
        $('div.tab-content-career').find("td[data-label='Task']").each(function(i,el){
            var button_code = '<td class="tau_station_show_task_container"><a class="btn-control normal tau_station_show_hide_task">' + (hiddenTasks[el.innerHTML] == 1 ? 'Show' : 'Hide') + '</a></td>';
            $(el).parent().show().append(button_code);
            $(el).parent().find('.tau_station_show_hide_task').on('click', { task_title: el.innerHTML, state: hiddenTasks[el.innerHTML] == 1 ? 1 : 0 }, toggle_task_visibility);
        });
    }
}

function init_interface() {
    $($('.tab-content-career h2')[0]).after('<div class="tau_station_hidden_tasks_btn_edit"><span id="tau_station_hidden_task_btn_edit">Edit task visibility</span></div>');
    $('#tau_station_hidden_task_btn_edit').on('click', toggle_edit_interface);
}

(function() {
    'use strict';

    init_interface();
    taustation_hide_tasks();
})();
