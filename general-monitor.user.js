// ==UserScript==
// @name         Tau Station: General Monitor
// @namespace    https://github.com/quasidart/tau-station-tools/
// @downloadURL  https://rawgit.com/taustation-fan/userscripts/master/general-monitor.user.js
// @version      0.3
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
//  - v0.2: Update Stim name to include % boost to Stat(s) X(,Y,Z), given character's Stats & Medical Stim skill level.
//  - v0.3: Update Stim details to show effective % toxicity, given character's Level (Tier).
//

//////////////////////////////
// Begin: User Configuration.
//

// Temporarily disable stat tracking while any of the following pages are showing.
var tSM_config = {
    'debug': false,

    'show_stats_notification': true, // Show notification when all Stats have regenerated to 100%.
    'also_notify_console': true,     // Also show Stat notifications in browser's JavaScript Console log?
    'stats_rescan_period': 15,      // # of minutes to wait to see if new notifications need to be scheduled.

    'show_stim_percentages': true    // Show Stims' effective boost & toxicity, based on player's Stats, Skills, and Level (Tier).
};

//
// End: User Configuration.
//////////////////////////////


$(document).ready(do_main);

async function do_main() {
    'use strict';

    if (tSM_config.show_stim_percentages) {
        store_skills_if_present();
        show_stim_percentages();
    }

    set_up_notifications();

    notifications.next_rescan_timestamp = new Date(Date.now() + tSM_config['stats_rescan_period'] * 60 * 1000);
    window.setInterval(set_up_notifications, tSM_config['stats_rescan_period'] * 60 * 1000);
}

//////////////////////////////
// region Notification: All Stats regenerated to 100%.
//

function set_up_notifications() {
    notifications.next_rescan_timestamp = new Date(Date.now() + tSM_config['stats_rescan_period'] * 60 * 1000);

    if (! notifications.stats_refilled) {
        notify_when_stats_refilled();
    }
}

var notifications = {};

function notify_when_stats_refilled() {
    var max_time = 0;

    $('.player-stats .time-to-full').each(function () {
        var value = this.getAttribute('data-seconds-refill');
        if (max_time < value) {
            max_time = value;
        }
    });

    if (max_time > 0) {
        set_notification(max_time * 1000, 'Your stats have fully regenerated!', "info", 'stats_refilled');
        debug('Scheduled notification in ' + max_time + ' seconds: "Your stats have fully regenerated!"');
    }
    else {
        debug('Stats are full; no notification needed.');
    }
}

//Note: Needs @require https://rawgit.com/taustation-fan/tau-push/master/static/push.min.js
// Or, from browser's console:
//    var jsPush = document.createElement('script'); jsPush.setAttribute('src', 'https://rawgit.com/taustation-fan/tau-push/master/static/push.min.js'); document.getElementsByTagName('head')[0].appendChild(jsPush);
function set_notification(delay, message, severity, notification_key) {
    if (! notification_key) {
        notification_key = "";  // Scratch key, ignored by the rest of the script.
    }

    if (Push.Permission.has()) {
        notifications[notification_key] = window.setTimeout(() => set_notification_helper(message, severity, notification_key), delay);
    }
    else {
        Push.Permission.request(
            function () { notifications[notification_key] = window.setTimeout(() => set_notification_helper(message, severity, notification_key), delay); },
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
        } else if (severity == "warning") {
            title = '⚠️ ' + title + ' ⚠️';
        } else if (severity == 'error') {
            title = '🛑 ' + title + ' 🛑';
        } else if (severity.includes(' ')) {
            title = severity;
        }
    }

    if (tSM_config.also_notify_console) {
        if (severity != title) {
            console.log('Showing notification: (' + severity + ')\n\n' + title + '\n' + message);
        } else {
            console.log('Showing notification:\n\n' + title + '\n' + message);
        }
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
// endregion Notification: All Stats regenerated to 100%.
//////////////////////////////

//////////////////////////////
// region Stims: Show effective % Stat boost & Toxicity.
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
        debug('General Monitor: add_stim_percentages(isModal = ' + isModal + '): No matching stim names found!');
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
    if (! stim_node.length) {
        stim_node = $(stim_parent_node).find('span.name:contains(" Stim, v")');
    }
    if (! stim_node.length) {
        stim_node = $(stim_parent_node).find('h2.form-heading:contains(" Stim, v")');
    }

    // - In site's top-level information page for the item (".../item/foo").
    if (! stim_node.length) {
        stim_node = $(stim_parent_node).find('h1.name:contains(" Stim, v")');
    }

    // - In messages to the player.
    if (! stim_node.length) {
        stim_node = $(stim_parent_node).find('li:contains(" Stim, v")');
    }

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
// endregion Stims: Show effective % Stat boost & Toxicity.
//////////////////////////////

function debug(msg) {
    if (tSM_config.debug) {
        console.log(msg);
    }
}