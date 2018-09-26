// ==UserScript==
// @name         taustation_hide_tasks
// @namespace    https://github.com/dot-sent
// @version      0.1
// @description  Hide irrelevant career tasks
// @author       Dot_sent
// @match        https://alpha.taustation.space/area/*
// @grant        none
// @require http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

function taustation_hide_tasks() {
    // This associative array contains tasks that should remain listed.
    // All the others will be hidden. This particular list is adjusted
    // for a high-level Clone Technician, you will want to create your
    // own according to the career you choose and the career rank you
    // currently have. Don't forget to adjust this list accordingly
    // when you get closer to the next career level!
    var visibleTasks = {
        "Interview a new client": 1,
        "Rearrange the clone tank layout": 1,
        "Dispose of a clone": 1,
        "Administer an accelerant dose": 1,
        "Complete the clone center's payroll": 1,
        "Create a premium clone": 1,
    };
    $('div.tab-content-career').find("td[data-label='Task']").each(function(i,el){
        if (visibleTasks[el.innerHTML] != 1) {
            $(el).parent().hide();
        }
    });
}

$(document).ready(taustation_hide_tasks);
