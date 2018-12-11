// ==UserScript==
// @name         taustation_hide_tasks
// @namespace    https://github.com/dot-sent
// @version      0.3
// @description  Hide irrelevant career tasks
// @author       Dot_sent
// @match        https://alpha.taustation.space/area/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @require      http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==
//
// Note: The @grant lines above were added mainly to indicate that this script
//       uses key/value storage & adds CSS styles. The actual GM_* methods
//       themselves are deprecated, and no longer supported by GreaseMonkey.
//

add_css(`
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
    cursor: pointer;
  }
  .tau_station_hidden_tasks_btn_edit span{
    margin: 3% 3% 3% 3%;
  }
`);

// For Chrome: If not set, check if we can load older state from GM_getValue().
// (TamperMonkey (Chrome) still has legacy support for the GM_* methods; GreaseMonkey (Firefox) does not.)
var legacy_hiddenTasksString = undefined;
if (! localStorage.hasOwnProperty("tau_station_hidden_task_array")) {
    try {
        legacy_hiddenTasksString = GM_getValue("tau_station_hidden_task_array", "{}");
        if (legacy_hiddenTasksString) {
            console.log("hidden_tasks: Loaded prior data from GM_getValue(); using localStorage henceforth.");
        }
    }
    catch (err) {
        // Legacy API not supported in this browser; just use localStorage below.
    }
}

var is_editing_visibility = 0;
var hiddenTasksString = localStorage["tau_station_hidden_task_array"] || legacy_hiddenTasksString || "{}";
var hiddenTasks = (hiddenTasksString == undefined || hiddenTasksString == "" || hiddenTasksString == "[]" ? {} : JSON.parse(hiddenTasksString));

function taustation_hide_tasks() {
    $('div.tab-content-career').find("td[data-label='Task']").each(function(i,el){
        if (hiddenTasks[el.innerHTML] == 1) {
            $(el).parent().hide();
        }
    });
}

function toggle_task_visibility(evt, data) {
    hiddenTasks[data.task_title] = 1 - data.state;
    localStorage.setItem("tau_station_hidden_task_array", JSON.stringify(hiddenTasks));
    var elem = evt.target;
    $(elem).html(data.state == 1 ? "Hide" : "Show");
    $(elem).off();
    $(elem).click(function (evt) { toggle_task_visibility(evt, { task_title: data.task_title, state: 1 - data.state }); });
}

function toggle_edit_interface() {
    if (is_editing_visibility){
        is_editing_visibility = 0;
        $('.tau_station_show_task_container').remove();
        $('#tau_station_hidden_tasks_btn_edit_label').html('Edit task visibility');
        taustation_hide_tasks();
    } else {
        is_editing_visibility = 1;
        $('#tau_station_hidden_tasks_btn_edit_label').html('Apply visibility settings');
        $('.tab-content-career table thead tr').append('<th class="tau_station_show_task_container">Hide/Show</th>');
        $('div.tab-content-career').find("td[data-label='Task']").each(function(i,el){
            var button_code = '<td class="tau_station_show_task_container"><a class="btn-control normal tau_station_show_hide_task">' + (hiddenTasks[el.innerHTML] == 1 ? 'Show' : 'Hide') + '</a></td>';
            $(el).parent().show().append(button_code);
            $(el).parent().find('.tau_station_show_hide_task').click(function (evt) { toggle_task_visibility(evt, { task_title: el.innerHTML, state: hiddenTasks[el.innerHTML] == 1 ? 1 : 0 }); });
        });
    }
}

function init_interface() {
    $($('.tab-content-career h2')[0]).after('<div class="tau_station_hidden_tasks_btn_edit" id="tau_station_hidden_tasks_btn_edit"><span id="tau_station_hidden_tasks_btn_edit_label">Edit task visibility</span></div>');
    $('#tau_station_hidden_tasks_btn_edit').click(toggle_edit_interface);
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

(function() {
    'use strict';

    init_interface();
    taustation_hide_tasks();
})();
