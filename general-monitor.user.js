// ==UserScript==
// @name         Tau Station: General Monitor
// @namespace    https://github.com/quasidart/tau-station-tools/
// @downloadURL  https://rawgit.com/taustation-fan/userscripts/master/general-monitor.user.js
// @version      0.4
// @description  Monitors the page, reacting based on the information available (including scheduling notifications, updating item text based on player details, etc.).
// @author       Mark Schurman (https://github.com/quasidart)
// @match        https://alpha.taustation.space/*
// @grant        CC-BY-SA
//
// @require      https://code.jquery.com/jquery-3.3.1.slim.js
// @require      https://rawgit.com/taustation-fan/tau-push/master/static/push.min.js
// ==/UserScript==
//
// Disclaimer:
// These are quick-and-dirty one-off scripts, and do not reflect the author's style or quality of work when developing production-ready software.
//
// Changelist:
//  - v0.1: Notification when Stats are fully refilled.
//  - v0.2: Enhance Stim info: Show % effect on current player (toxicity given player's Tier, boost to Stat(s) X(,Y,Z) given player's Stats & Medical Stim skill level, etc.)
//  - v0.3: Notification before shuttle departure / on arrival, when Brig / Sick Bay confinement ends, before Hotel Room reservation expires, and/or when player gains Experience or Bonds.
//  - v0.4: Notification: Checks if stats change again (& reschedules if needed); if multiple tabs, only one tab schedules notifications.
//

//////////////////////////////
// Begin: User Configuration.
//

// Temporarily disable stat tracking while any of the following pages are showing.
var tSM_config = {
    'debug': true,
    'also_notify_console': true,        // Also shows all notifications in browser's JavaScript Console log.
    'reuse_notification_delta': 60,     // When scheduling, reuse existing notification if it's within N seconds of new notification.

    // Notifications for misc. events.
    'notify_stats_refilled': true,      // Show notification when all Stats have regenerated to 100%.
    'stats_rescan_period': 15,          // # of minutes to wait to see if new notifications need to be scheduled.

    'notify_confinement_timer': true,   // Show notification when your confinement in the Brig or Sick Bay is finished.
    'notify_hotel_timer': true,         // Show notification before your Hotel reservation is set to expire.
    'notify_shuttle_timers': true,      // Show notification before a shuttle is about to depart, and when it arrives at its destination.

    'notify_experience_increase': true, // Show notification when player experience increases.
    'notify_bonds_increase': true,      // Show notification when player gains Bonds.

    // Inline webpage text tweaks.
    'show_stim_percentages': true       // Show Stims' effective boost & toxicity, based on player's Stats, Skills, and Level (Tier).
};

//
// End: User Configuration.
//////////////////////////////

var next_rescan_delta = tSM_config['stats_rescan_period'] * 60 * 1000;

$(document).ready(do_main);

async function do_main() {
    'use strict';

    if (! sessionStorage.tS_id) {
        sessionStorage.tS_id = Math.random() * 0x0FFFFFFFFFFFFFFF;
    }

    if (tSM_config.show_stim_percentages) {
        store_skills_if_present();
        show_stim_percentages();
    }

    set_up_notifications();

    notifications.timestamps.next_rescan = new Date(Date.now() + next_rescan_delta);
    window.setInterval(set_up_notifications, next_rescan_delta);
}

//////////////////////////////
// #region Notifications
//

var notifications = {};
notifications.handles    = {}
notifications.timestamps = {};

var during_init = true;
function set_up_notifications() {
    notifications.timestamps.next_rescan = new Date(Date.now() + next_rescan_delta);

    if (! localStorage.tSM_notifications_tab ||
        localStorage.tSM_notifications_tab == sessionStorage.tS_id)
    {
        localStorage.setItem('tSM_notifications_tab', sessionStorage.tS_id); // Claim (or reassert) ownership.

        if (tSM_config.notify_stats_refilled) {
            notify_when_stats_refilled();
        }

        if (tSM_config.notify_experience_increase) {
            notify_when_experience_increases();
        }

        if (tSM_config.notify_bonds_increase) {
            notify_when_bonds_increase();
        }

        if (tSM_config.notify_hotel_timer
            && window.location.pathname.startsWith('/area/hotel-rooms/enter-room')) {
            notify_hotel_reservation_expiration();
        }

        // These events are only applicable when the page first loads.
        if (during_init) {
            if (tSM_config.notify_shuttle_timers) {
                notify_shuttle_departing_soon();
                notify_shuttle_arriving_soon();
            }

            if (tSM_config.notify_confinement_timer) {
                notify_confinement_release();
            }
        }
    } else {
        debug('General Monitor: Another tab is handling notifications.')
    }

    during_init = false;
}

function notify_when_stats_refilled() {
    // First, calculate when this notification should happen (if at all).
    var max_time = 0;

    $('.player-stats .time-to-full').each(function () {
        var value = this.getAttribute('data-seconds-refill') / 1;
        if (max_time < value) {
            max_time = value;
        }
    });

    if (max_time > 0) {
        var message = 'Your stats have fully regenerated!';
        set_notification(max_time * 1000, message, "info", 'stats_refilled');
    }
    else {
        debug('General Monitor: Stats are full; no notification needed.');
    }
}

function notify_shuttle_departing_soon() {
    var severity = 'warning';

    // Scan for the following:
    //   <div class="timer global-timer" role="region" aria-label="Shuttle countdown"
    // -->    data-seconds-left="534" data-timer-type="shuttle">
    var shuttle_warning_node = $('div.global-timer[data-timer-type="shuttle"]');
    if (shuttle_warning_node.length == 0) {
        debug('General Monitor: Not waiting for shuttle; no notification needed.');
    } else {
        var seconds_remaining = shuttle_warning_node.attr('data-seconds-left');

        // If we're already where we need to be, no notification is needed.
        if (window.location.pathname.startsWith('/area/local-shuttles')) {
            return;
        }
        // Otherwise, show the notification _before_ the timer expires.
        else {
            ({ seconds_remaining, severity } = choose_early_notification_time(seconds_remaining, severity));
        }

        var message = 'Shuttle departing soon!';
        set_notification(seconds_remaining * 1000, message, severity, 'shuttle_departing');
    }
}

function choose_early_notification_time(seconds_remaining, severity) {
    // If it's several minutes from now, have it fire 1.5 minutes before departure time.
    if (seconds_remaining > 120) {
        seconds_remaining -= 90;
    }
    // If it's almost time, notify right now, unless we're already in the right location.
    else if (seconds_remaining < 20) {
        seconds_remaining = 0; // Time's almost up -- notify right now!
        severity = 'error'; // Get the user's attention.
    }
    // Otherwise, notify ~20 seconds before 
    else {
        seconds_remaining -= 20;
    }
    return { seconds_remaining, severity };
}

function notify_shuttle_arriving_soon() {
    var severity = 'warning';

    // Scan for the following:
    //   [ insert relevant <div ...> here ]
    var arrival_warning_node = $('div.global-timer[data-timer-type="travel"]');
    if (arrival_warning_node.length == 0) {
        debug('General Monitor: Not currently traveling; no notification needed.');
    } else {
        var seconds_remaining = arrival_warning_node.attr('data-seconds-left');

        var message = 'Arrived at destination!\n(Travel finished.)';
        set_notification(seconds_remaining * 1000, message, severity, 'travel_arriving');
    }
}

function notify_confinement_release() {
    var severity = 'warning';

    // Scan for the following:
    //  <div class="timer global-timer" role="region" aria-label="Confinement countdown"
    // -->    data-seconds-left="3221" data-timer-type="immobile">
    var timer_node = $('div.global-timer[data-timer-type="immobile"]');
    if (timer_node.length == 0) {
        debug('General Monitor: Not currently confined; no notification needed.');
    } else {
        var seconds_remaining = timer_node.attr('data-seconds-left');

        var confinement_area  = window.location.pathname.replace('/area/', '');
        if        (confinement_area == 'sickbay') { confinement_area = 'Sick Bay'; }
        else if (confinement_area == 'brig')    { confinement_area   = 'the Brig'; }

        var message = '"I\'m free!"\n\nReleased from confinement in ' + confinement_area + '.';
        set_notification(seconds_remaining * 1000, message, severity, 'confinement_released');
    }
}

function notify_hotel_reservation_expiration() {
    var severity = 'warning';

    // Scan for the following:
    //  <div class="timer timer-room" role="region" aria-label="Time left in room"
    // -->   data-seconds-left="699469" data-timer-type="room">
    var timer_node = $('div.timer-room[data-timer-type="room"]');
    if (timer_node.length == 0) {
        debug('General Monitor: Hotel room not visible; no notification needed.');
    } else {
        var seconds_remaining = timer_node.attr('data-seconds-left');

        ({ seconds_remaining, severity } = choose_early_notification_time(seconds_remaining, severity));

        // If the room is reserved for more than a day, there's no need to schedule the notification.
        // (If this page isn't being reloaded, the player's most likely active in another tab / browser.)
        if (seconds_remaining > (60 * 60 * 24)) {
            if (during_init) {
                debug('General Monitor: Hotel room is booked for over 1 day; notification is unnecessary.')
            }
            return;
        }

        var qualifier = "";
        if      (seconds_remaining > 120) { qualifier = "will expire very soon."; }
        else if (seconds_remaining >  20) { qualifier = "is about to expire!"; }
        else                              { qualifier = "is nearly expired!"; }

        var message = 'Your Hotel room ' + qualifier + '\n\nExtend your reservation, to be safe.';
        set_notification(seconds_remaining * 1000, message, severity, 'hotel_expiration');
    }
}

function notify_when_experience_increases() {
    if (during_init) {
        debug('General Monitor: Monitoring player\'s experience gains.');
    }

    var old_experience = localStorage['tSM_experience'] || 0;
    var cur_experience = $('.experience').find('.amount').text().replace('%', '').trim() / 1;

    var old_level = localStorage['tSM_level'] || 0;
    var cur_level = $('.level').find('.amount').text().trim() / 1;

    if (cur_level > old_level && old_level > 0) {
        localStorage.setItem('tSM_level', cur_level);
        cur_experience += 100;  // % experience rolled over (past 100%), so undo the rollover to let comparisons & subtraction work.
    }
    if (cur_experience > old_experience) {
        localStorage.setItem('tSM_experience', cur_experience);

        if (old_experience == 0) {
            set_notification(0, 'Starting experience monitor:\nLevel ' + cur_level + ', ' + cur_experience + '% experience.', "info", 'experience_increased');
        } else {
            var experience_gain = Math.trunc((cur_experience - old_experience) * 10) / 10;
            set_notification(0, 'You\'ve gained ' + experience_gain + '% experience.', "info", 'experience_increased');
        }
    }
}

function notify_when_bonds_increase() {
    if (during_init) {
        debug('General Monitor: Monitoring player\'s Bonds account.');
    }

    var old_bonds = localStorage['tSM_bonds'] || 0;
    var cur_bonds = $('.bonds').find('.amount').text().replace(',', '').trim() / 1;

    if (cur_bonds > old_bonds) {
        localStorage.setItem('tSM_bonds', cur_bonds);

        if (old_bonds > 0) {
            var bonds_gain = cur_bonds - old_bonds;
            set_notification(0, 'Gained ' + bonds_gain + ' Bonds.', "info", 'bonds_increased');
        }
    }
}

//Note: Needs @require https://rawgit.com/taustation-fan/tau-push/master/static/push.min.js
// Or, from browser's console:
//    var jsPush = document.createElement('script'); jsPush.setAttribute('src', 'https://rawgit.com/taustation-fan/tau-push/master/static/push.min.js'); document.getElementsByTagName('head')[0].appendChild(jsPush);
function set_notification(delay, message, severity, notification_key) {
    if (! notification_key) {
        notification_key = "";  // Scratch key, ignored by the rest of the script.
    }

    if (notification_key.length && notifications.timestamps[notification_key]) {
        var old_notification_timestamp = notifications.timestamps[notification_key];
        var cur_notification_timestamp = Date.now() + delay;

        var timestamp_delta = Math.floor(Math.abs(cur_notification_timestamp - old_notification_timestamp) / 1000);
        if (timestamp_delta < tSM_config.reuse_notification_delta) {
            debug('General Monitor: \'' + notification_key + '\': Reusing close-enough notification at ' + new Date(old_notification_timestamp) + ' (only ~' + timestamp_delta + ' seconds off).');
            return;
        } else {
            // Clear the old notification, since we now know it'll appear too early.
            debug('General Monitor: \'' + notification_key + '\': Clearing prior notification, since notification now needs to happen at a different time.\n' +
                  '  - Was at: ' + new Date(old_notification_timestamp) + '\n' +
                  '  - Now at: ' + new Date(cur_notification_timestamp) + '.');
            window.clearTimeout(notifications.handles[notification_key]);

            notifications.handles   [notification_key] = undefined;
            notifications.timestamps[notification_key] = undefined;
        }
    }

    if (delay > 0) {
        debug('General Monitor: \'' + notification_key + '\': Scheduled notification in ' + (delay / 1000) + ' seconds: "' + message.replace(/\n/g, '\n    ') + '"');
    }

    if (Push.Permission.has()) {
        notifications.handles   [notification_key] = window.setTimeout(() => set_notification_helper(message, severity, notification_key), delay);
        notifications.timestamps[notification_key] = Date.now() + delay;
    }
    else {
        Push.Permission.request(
            function () { notifications.handles   [notification_key] = window.setTimeout(() => set_notification_helper(message, severity, notification_key), delay);
                          notifications.timestamps[notification_key] = Date.now() + delay;
                        },
            function () { alert('Need notification permissions to send notification.\nNotification attempted:\n\n' +
                                'severity: ' + severity + '\n' + message); }
        )
    }
}

function set_notification_helper(message, severity, notification_key) {
    var title = 'Tau Monitor'; // 'Watcher'?

    if (severity.length) {
        if (severity == "info") {
            title = '✅ ' + title + ' ✅';
        } else if (severity == "warning" || severity == "warn") {
            title = '⚠️ ' + title + ' ⚠️';
        } else if (severity == 'error') {
            title = '🛑 ' + title + ' 🛑';
        } else if (severity.includes(' ')) {
            title = severity;
        }
    }

    if (tSM_config.also_notify_console) {
        var console_message = "";
        if (severity != title) {
            console_message = 'Showing notification: (' + severity + ')\n\n' + title + '\n' + message;
        } else {
            console_message = 'Showing notification:\n\n' + title + '\n' + message;
        }
        console_message = 'General Monitor: at ' + (new Date()) + '\n' + console_message;
        console.log(console_message.replace(/\n/g, '\n    '));
    }

    Push.create(title, {
        body: message,
        link: '/#',
        timeout: 120000,
        vibrate: [200, 100, 200, 100, 200, 100, 200]
    });

    // Notification shown; start checking if we need to schedule this notification again.
    notifications[notification_key] = undefined;
}

//
// #endregion Notification: All Stats regenerated to 100%.
//////////////////////////////

//////////////////////////////
// #region Stims: Show effective % Stat boost & Toxicity.
//

var skills_table = {};
function store_skills_if_present() {
    var skills_node = $("#character_skills");
    if (skills_node.length) {
        skills_node.find("tbody").find("tr")
                   .map(function() {
                       skills_table[$(this).find("td:first").text()] =
                           $(this).find("td:nth-of-type(2)").text();
                       return this;
                   });
        localStorage.setItem('tSM_skills', JSON.stringify(skills_table));
    }
}

var stat_totals = {};
function get_stat_totals() {
    // If we've already collected this info, no need to do so again.
    if (stat_totals.hasOwnProperty('Agility')) {
        return;
    }

    $('#stats-panel li.stat-container').each(function() {
        var stat_node = $(this);
        if (stat_node.hasClass('focus')) {
            return;
        }
        // var stat_name  = stat_node.find('div.time-to-full').attr('data-stat-name');
        var stat_name  = stat_node.find('span.label').text().replace(':', '');
        var stat_total = stat_node.find('span.pc-total').text();
        stat_totals[stat_name] = stat_total;
    });
}

var regex_stim_name_only = new RegExp(/(.*[\s'"]*)(Minor|Standard|Strong) ((Strength|Agility|Stamina|Intelligence|Social|Multi) (Stim,) (v\d\.[123])\.(\d\d\d))([\s'"]*[^%]*)/, "ig");
function match_stim_item_names() {
    return ($(this).text() || this.innerText || this.textContent).trim().match(regex_stim_name_only);
}

var modal_scanner_period = 100; // in milliseconds.
var modal_scanner_interval;
var modal_scanner_attempts;

function show_stim_percentages(isModal) {
    // Add only the selectors we anticipate needing, to reduce unnecessary scanning.
    var stim_node_selectors = [];
    stim_node_selectors.push('ul.messages');

    if (isModal) {
        stim_node_selectors.push('section.modal:has(div.header-info:has(span.name))',
                                 'form.buy-form');
    }

    if (window.location.pathname.endsWith('/coretechs/storage')) {
        stim_node_selectors.push('table.table-base td[data-label="Name"]:has(a)');

    } else if (window.location.pathname.includes('/item/')) {
        stim_node_selectors.push('section.item-detailed');
    } else {
        stim_node_selectors.push('div.slot');
    }

    debug('General Monitor: add_stim_percentages(isModal = ' + isModal + '): Using jQuery selectors: {\n - "' +
          stim_node_selectors.join('"\n - "') + '"\n}');

    var stims_found = [];
    for (var ii = 0; ii < stim_node_selectors.length; ii++) {
        $(stim_node_selectors[ii]).filter(match_stim_item_names).each(function() { stims_found.push(this); });
    }

    // Don't do unnecessary work -- this won't scan for stat totals & parse the skills JSON, unless we need to use them. 
    if (! stims_found.length) {
        var fn_call_desc = (isModal ? 'add_stim_percentages(isModal = ' + isModal + '): ' : '')
        debug('General Monitor: ' + fn_call_desc + 'No stim names found; no text to update.');
    } else {
        get_stat_totals();

        skills_table = JSON.parse(localStorage.tSM_skills);
        for (var index = 0; index < stims_found.length; index++) {
            update_stim_name(stims_found[index]);

            // If clicking on this brings up a modal details pane (inventory, store, etc.),
            // update stim details in that pane as well.
            if ($(stims_found[index]).hasClass('slot')) {
                $(stims_found[index]).find('button.item.modal-toggle')
                                     .click(async function()
                {
                    debug('General Monitor: Added click() handler to Stim in store/inventory slot.');
                    modal_scanner_attempts = 0;
                    modal_scanner_interval = setInterval(async function ()
                    {
                        modal_scanner_attempts++;

                        if ($('section.modal').length > 0) {
                            clearInterval(modal_scanner_interval);
                            debug('General Monitor: Post-click(): Finding & updating text in modal section.');
                            show_stim_percentages(true);
                        } else if (modal_scanner_attempts > 5000 / modal_scanner_period) {
                            clearInterval(modal_scanner_interval);
                            debug('General Monitor: Post-click(): Modal dialog taking too long to appear; aborting scan.');
                        }
                    }, modal_scanner_period)
                });
            }
        }
    }
}

function update_stim_name(stim_parent_node) {
    // Find the HTML tag actually containing the stim name. 

    // - In Storage.
    var stim_node = $(stim_parent_node).find('a:contains(" Stim, v")');
    
    // - In inventory or shop (including modal panel w/ details).
    if (! stim_node.length) { stim_node = $(stim_parent_node).find('span.name:contains(" Stim, v")'); }
    if (! stim_node.length) { stim_node = $(stim_parent_node).find('h2.form-heading:contains(" Stim, v")'); }

    // - In site's top-level information page for the item (".../item/foo").
    if (! stim_node.length) { stim_node = $(stim_parent_node).find('h1.name:contains(" Stim, v")'); }

    // - In messages to the player.
    if (! stim_node.length) { stim_node = $(stim_parent_node).find('li:contains(" Stim, v")'); }

    if (! stim_node.length) {
        console.info('General Monitor: FYI: Didn\'t find HTML tag containing stim name -- please update code to handle the following HTML:\n' +
                     stim_parent_node.outerHTML);
        return;
    }

    // For scenarios like "<stim_node><child_node>foo: </child_node> stim name here </stim_node>" (e.g., inventory),
    // update only the relevant #text child node, so actual-HTML-tag child-nodes aren't affected.
    var stim_name_text_node = $(stim_node).contents().filter(function() { return (this.nodeName == "#text"); })
                                                     .filter(match_stim_item_names)
    if (! stim_name_text_node.length) {
        console.info('General Monitor: FYI: Didn\'t find #text Node containing actual stim name (inside the overall stim node) -- please update code to handle the following HTML:\n' +
                     stim_name_text_node.outerHTML);
        return;
    } else if (stim_name_text_node.length > 1) {
        console.info('General Monitor: FYI: Find multiple #text Nodes containing actual stim name (inside one overall stim node); updating them all -- but please determine if this is correct for this scenario, and if it isn\'t, update the code to handle the following HTML:\n' +
                     stim_name_text_node.outerHTML);
    }

    $(stim_name_text_node).each(function() {
        var stim_name = this.textContent.trim();
        if (! stim_name.match(regex_stim_name_only)) {
            console.info('General Monitor: FYI: Unexpected "stim name" string found! Please update the code to handle the following HTML:\n' +
                         this.outerHTML);
            return;
        }

        var stim_stats_bitmask = Number.parseInt(stim_name.replace(regex_stim_name_only, '$7'));
        var stats_affected = [];
        if (stim_stats_bitmask &  1) { stats_affected.push('Strength'); }
        if (stim_stats_bitmask &  2) { stats_affected.push('Agility'); }
        if (stim_stats_bitmask &  4) { stats_affected.push('Stamina'); }
        if (stim_stats_bitmask &  8) { stats_affected.push('Social'); }
        if (stim_stats_bitmask & 16) { stats_affected.push('Intelligence'); }

        var stim_key = stim_name.replace(regex_stim_name_only, '$6 (' + stats_affected.length + ')');
        var stim_total_boost = total_stim_boosts_table[stim_key];

        debug(' -i- General-monitor: update_stim_name(): "'  + stim_name + 
                                         '" (total_boost = ' + stim_total_boost +
                                    ', stats_affected = [ "' + stats_affected.join('", "') + '" ])');

        this.textContent = calculate_stat_effects_and_rename_stim(stim_parent_node, stim_name, stats_affected, stim_total_boost);
    });

    // Default value; will be overridden below (unless HTML nodes end up being processed out of order).
    var stim_tier = 1;

    if ($(stim_parent_node).hasClass('modal') || $(stim_parent_node).hasClass('item-detailed')) {
        $(stim_parent_node).find('div.item-detailed-content ul.data-list li').each(function() {
            var class_name = $(this).attr('class');
            var stat_name;

            if (class_name.includes('-Boost')) {
                stat_name = class_name.replace('-Boost', '');
                stat_name = stat_name.substr(0, 1).toUpperCase() + stat_name.substr(1, stat_name.length);
            } else if ($(this).text().includes('Boost')) {
                stat_name = $(this).text().substr(0, $(this).text().indexOf(' '));
            }

            if (stat_name) {
                var stat_value_node = $(this).find('span');
                if (stat_value_node.text() == 0) {
                    return;
                }

                var stat_effective_boost_percent
                    = calculate_effective_stat_boost(stat_value_node.text(), stat_totals[stat_name], 
                                                     get_stim_skill_for_stat(stat_name), 1);
    
                debug(' -i- General-monitor: --> Stim details: ' + stat_name + ': ' + stat_value_node.text() + ' (+' + stat_effective_boost_percent + '%)');
                if (stat_effective_boost_percent != NaN) {
                    stat_value_node.css({ 'text-transform': 'none' });
                    stat_value_node.text('(+' + stat_effective_boost_percent + '%)   ' + stat_value_node.text());
                }
            } else if (class_name == 'tier') {
                stim_tier = $(this).find('span').text();

            } else if (class_name == 'Toxicity' || $(this).text().includes('Toxicity')) {
                class_name = 'Toxicity';
                var toxicity_value_node = $(this).find('span');
                var toxicity_value = toxicity_value_node.text();
                if (toxicity_value.endsWith('%')) {
                    toxicity_value = toxicity_value.substr(0, toxicity_value.length - 1);
                    debug(' -i- General-monitor: temp: toxicity_value = ' + toxicity_value);
                    toxicity_value = toxicity_value / 100;
                }

                var player_level = $('div.side-bar div.level-container span.amount').text();
                var player_tier  = Math.floor(((player_level - 1) / 5) + 1); // 1..5 = "1", 6..10 = "2", etc.

                var toxicity_string = toxicity_value_node.text();
                if (stim_tier > player_tier) {
                    debug(' -i- General-monitor: --> Stim details: ' + class_name + ': Player tier (' + player_tier + ') lower than Stim tier (' + stim_tier + ')');

                    toxicity_value_node.text('');
                    toxicity_value_node.append('<font style="color:#f00; text-transform:none; font-style:italic;">(n/a: tier too high)</font>   ' + toxicity_string);
                } else {
                    var effective_toxicity_percent
                        = calculate_effective_toxicity(toxicity_value, stim_tier, player_tier);
        
                    debug(' -i- General-monitor: --> Stim details: ' + class_name + ': ' + toxicity_string + ' (+' + effective_toxicity_percent + '%)');
                    if (effective_toxicity_percent != NaN) {
                        toxicity_value_node.text('');
                        toxicity_value_node.append('<font color="#f00">(+' + effective_toxicity_percent + '%)</font>   ' + toxicity_string);
                    }
                }
            }
        });
    }
}

function calculate_stat_effects_and_rename_stim(stim_parent_node, stim_name, stats_affected, stim_total_boost) {
    var output = "";
    var stim_boost_per_stat = stim_total_boost / stats_affected.length;

    for (var ii = 0; ii < stats_affected.length; ii++) {
        stat_name = stats_affected[ii];
        var stat_stim_skill_level = get_stim_skill_for_stat(stat_name);

        var stat_effective_boost_percent
          = calculate_effective_stat_boost(stim_boost_per_stat, stat_totals[stat_name], stat_stim_skill_level, 0);

        output += "+" + stat_effective_boost_percent + "%";
        if (stats_affected.length > 1) {
            output += " " + stat_abbrevs[stat_name] + ", ";
        }
    }

    // Slot item names are length-limited, to try to fit the % and partial stat name in the room available.
    var stim_strength = stim_name.replace(regex_stim_name_only, '$2');
    if ($(stim_parent_node).hasClass('slot')) {
        stim_strength = stim_strength_abbrevs[stim_strength];
    }

    if (stats_affected.length == 1) {
        // Single-stat stim (e.g.): "Standard (+3%) Stamina Stim, v1.2.004"
        output = stim_name.replace(regex_stim_name_only, '$1' + stim_strength + ' (' + output + ') $3$8');
    } else {
        // Multi-stat stim (e.g.):  "Standard Multi Stim, v3.2.003 (+5% STR, +8% AGI)"
        if (output.endsWith(', ')) {
            output = output.substr(0, output.length - 2);
        }

        output = stim_name.replace(regex_stim_name_only, '$1' + stim_strength + ' $3  (' + output + ')  $8');
        //old output = stim_name + ' (' + output + ')';
    }

    debug(' -i- General-monitor: --> New stim name: "' + output + '"');
    return output;
}

function get_stim_skill_for_stat(stat_name) {
    var stims_skill_level = skills_table['Medical Stim'];

    var stat_stim_skill_level = stims_skill_level;
    if (skills_table['Medical Stim ' + stat_name]) {
        stat_stim_skill_level = skills_table['Medical Stim ' + stat_name];
    }

    return stat_stim_skill_level;
}

function calculate_effective_stat_boost(stim_boost_per_stat, total_for_stat, stat_stim_skill_level, num_decimal_digits) {
    // Ref: https://tauguide.de/#medical-stim-toxicity-calculation-formula (props to @Dotsent)
    var effective_boost = (stim_boost_per_stat / total_for_stat) * (0.5 + 0.25 * stat_stim_skill_level) * 100;

    var sig_digits_multiplier = Math.pow(10, num_decimal_digits);
    
    if (effective_boost < 10) {
        sig_digits_multiplier *= 10;
    }
    effective_boost = Math.round(sig_digits_multiplier * effective_boost) / sig_digits_multiplier;

    return effective_boost;
}

function calculate_effective_toxicity(toxicity_value, stim_tier, player_tier) {
    // Ref: https://tauguide.de/#so-whats-the-gain-stat-boost (again, props to @Dotsent)
    var effective_toxicity = (player_tier - stim_tier + 1) * toxicity_value * 100;

    var sig_digits_multiplier = Math.pow(10, 1);
    
    if (effective_toxicity < 10) {
        sig_digits_multiplier *= 10;
    }
    effective_toxicity = Math.round(sig_digits_multiplier * effective_toxicity) / sig_digits_multiplier;

    return effective_toxicity;
}

var stat_abbrevs = {
    'Strength':     'STR',
    'Agility':      'AGI',
    'Stamina':      'STA',
    'Social':       'SOC',
    'Intelligence': 'INT'
};

var stim_strength_abbrevs = {
    'Minor':    'Min.',
    'Standard': 'Std.',
    'Strong':   'High'
}

var total_stim_boosts_table = {
    "v1.1 (1)":  5.5,
    "v1.2 (1)":  6,
    "v1.3 (1)":  6.5,
    "v2.1 (1)":  6.875,
    "v2.2 (1)":  6.875,
    "v2.3 (1)":  7.5,
    "v2.1 (2)":  9.6,
    "v2.2 (2)":  9.6,
    "v2.3 (2)":  10.5,
    "v2.1 (3)":  9.6,
    "v2.2 (3)":  9.6,
    "v2.3 (3)": 10.5,
    "v3.1 (2)": 12.25,
    "v3.2 (2)": 13.1,
    "v3.3 (2)": 14,
    "v3.1 (3)": 12.225,
    "v3.2 (3)": 13.125,
    "v3.3 (3)": 14.025,
    "v4.1 (2)": 16.6,
    "v4.2 (2)": 18.35,
    "v4.3 (2)": 20.1,
    "v4.1 (3)": 16.65,
    "v4.2 (3)": 18.375,
    "v4.3 (3)": 20.1,
    "v5.1 (2)": 25.35,
    "v5.2 (2)": 27.1,
    "v5.3 (2)": 29.75,
    "v5.1 (3)": 25.35,
    "v5.2 (3)": 28.5,
    "v5.3 (3)": 29.775
}

//
// #endregion Stims: Show effective % Stat boost & Toxicity.
//////////////////////////////

function debug(msg) {
    if (tSM_config.debug) {
        console.log(msg);
    }
}
