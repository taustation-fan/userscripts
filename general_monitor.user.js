// ==UserScript==
// @name         Tau Station: General Monitor
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/general_monitor.user.js
// @version      0.8
// @description  Monitors the page, reacting based on the information available (including scheduling notifications, updating item text based on player details, etc.).
// @author       Mark Schurman (https://github.com/quasidart)
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @require      https://github.com/taustation-fan/userscripts/raw/master/taustation-tools-common.js
// @require      https://github.com/taustation-fan/tau-push/raw/master/static/push.min.js
// @require      https://github.com/taustation-fan/userscripts/raw/master/userscript-preferences.js
// ==/UserScript==
//
// License: CC-BY-SA
//
// Disclaimer:
// These are quick-and-dirty one-off scripts, and do not reflect the author's style or quality of work when developing production-ready software.
//
// Changelist:
//  - v0.1: Notification when Stats are fully refilled.
//  - v0.2: Enhance Stim info: Show % effect on current player (toxicity given player's Tier, boost to Stat(s) X(,Y,Z) given player's Stats & Medical Stim skill level, etc.)
//  - v0.3: Notification before shuttle departure / on arrival, when Brig / Sick Bay confinement ends, before Hotel Room reservation expires, and/or when player gains Experience or Bonds.
//  - v0.4: Notification: Checks if stats change again (& reschedules if needed); if multiple tabs, only one tab schedules notifications.
//  - v0.5: Added dynamic UI; also notifies when ship finishes refueling.
//  - v0.6: Notify Career XP changes (gain or loss), filter notifying via jQuery selector, workaround for credits (exact amts no longer available w/o click), handle >1 day since last "daily" update, updated Ruins timers to check for the Wrecks.
//  - v0.7: Change self-managed config to use userscript-preferences.
//  - v0.7.1: Firefox now requires a user-generated event before it will ask user for Notification permissions.
//  - v0.8: Catch back up with site after using w/o updating for *checks calendar* ~16 months(!).
//
// Issues:
//
// Todo:
//  - Additional monitoring:
//     - notify_syndicate_credits_increase & notify_syndicate_bonds_increase
//  - Add multi-day timers:
//     - Visa expiration
//     - University class completion
//     - Well Fed boon: Possible to tell duration anymore?
//     - Move Hotel Room expiration to this approach/section?
//  - Improve "multiple-timers" UI support:
//     - Userscript's icon drops/rolls down a list of icons that are active?
//     - In expanded UI, show when a single category has multiple active timers. (Have $('#tSM-timer-display') show multiple rows? Have category's icon roll down a 2nd icon for the second timer?)
//
'use strict';

//////////////////////////////
// Begin: User Configuration.
//

var local_config = {
    debug: localStorage.tST_debug || false,
    dump_notifications: false,
};

const monitor_prefs_key = 'general_monitor_prefs';

const possible_notification_areas = new Map( [
    ['/',                                 'Character details page'],
    ['/character/inventory',              'Inventory page'],
    ['/area/hotel-rooms/enter-room',      'Hotel Room (safe area)'],
    ['jquery:.on-board',                  'Public/private Ship (safe area)'],
    ['/area/career',                      'Employment area'],
    ['/area/the-wrecks',                  'Ruins: The Wrecks (Sewers, LfT, Search Ruins)'],
    ['/area/the-wilds',                   'Ruins: The Wilds (Syndicate Campaigns)'],
] );

function general_monitor_preferences_definition() {
    return {
        key: monitor_prefs_key,
        label: 'General Monitor',
        options: [
            {
                type: "heading",
                text: "General configuration:"
            },
            // TODO: Add support for this?
            // {
            //     key:     'show_expiry_as_gct',
            //     label:   'Show "expires at" times as GCT',
            //     help:    "Show notifications' scheduled time using GCT, instead of Auld Earth's 24h time format (default).",
            //     type:    'boolean',
            //     default: false
            // },
            {
                key:     'also_notify_console',
                label:   "Echo all notifications in browser's JavaScript Console",
                type:    'boolean',
                default: true
            },
            {
                key:     'use_brief_notifications',
                label:   'Show brief messages in notifications',
                help:    "With some browsers/devices, compacting text within notifications can be helpful.\n" +
                         "(E.g.: Mobile browsers tend to use the mobile OS's notifications bar. On Windows 10,\n" +
                         "Chrome uses Windows' notification popups/system, while Firefox uses its own popups.)",
                type:    'boolean',
                default: (window.navigator.userAgent.match(/\bWindows\b[^;]+ 10.0/) !== null &&
                          window.navigator.userAgent.match(/\bChrome\//) !== null)
            },
            {
                key:     'stats_rescan_period',
                label:   'Rescan page how often? (in minutes)',
                help:    "The page will be rescanned every N minutes, to check if any new notifications need to be scheduled.\n" +
                         "For example: if the player uses up some of a stat in one tab, the site updates your stats in all Tau Station tabs.\n" +
                         "Rescanning allows you to get a \"Stats refilled!\" notification even if a different tab is handling notifications.",
                type:    'text',
                default: 15
            },
            {
                key:     'reuse_notification_delta',
                label:   "Rescans: Don't schedule new event if within N seconds of existing event",
                help:    "When scheduling, reuse an existing notification if it's within N seconds of new notification (of same type).\n" +
                         "For example: During a rescan, the new stats notification could be slightly off from the previously-scheduled\n" +
                         "notification (if web page is slow), or very far off from it (if stats decreased due to action in another tab).",
                type:    'text',
                default: '60'
            },
            // Notifications for misc. events.
            {
                type: "heading",
                text: "Select desired notifications:"
            },
            {
                key:     'notify_stats_refilled',
                label:   'Notify when Focus & stat bars have refilled',
                type:    'boolean',
                default: true
            },

            {
                key:     'notify_confinement_timer',
                label:   'Notify when released from Brig / Sick Bay',
                type:    'boolean',
                default: true
            },
            {
                key:     'notify_hotel_timer',
                label:   'Notify a few minutes before Hotel Room reservation expires',
                help:    "Shows notification shortly before your Hotel reservation is set to expire.\n" +
                         "Note: Tracks the reservation for the last Hotel Room you entered.",
                type:    'boolean',
                default: true
            },
            {
                key:     'notify_repair_timer',
                label:   'Notify when finished with repairs (items or ship)',
                type:    'boolean',
                default: true
            },
            {
                key:     'notify_ruins_timers',
                label:   'Notify when Ruins campaigns become available\n' +
                         '(Look For Trouble, Sewers, Syndicate Campaign)',
                help:    "If sewers/campaign is won before the cooldown period expires (making Tau's global timer\n" +
                         "disappear), you can still set this notification using the in-area timers in The Wrecks / The Wilds.",
                type:    'boolean',
                default: true
            },
            {
                key:     'notify_shuttle_timers',
                label:   'Notify when Ship/Shuttle about to leave or just arrived',
                help:    "Shows a notification before Shuttle departs, and when Shuttle or private Ship arrives at its destination.\n" +
                         "(For departure: shows a warning 90s before, and an alert 20s before -- unless Player is already in Local Shuttles.)",
                type:    'boolean',
                default: true
            },
            {
                key:     'notify_refuel_timer',
                label:   'Notify when finished refueling Ship(s)',
                help:    'Tracks multiple ships independently.\n' +
                         '(Timer UI shows when the first ship will finish.)',
                type:    'boolean',
                default: true
            },

            {
                key:     'notify_syndicate_experience_increase',
                label:   'Notify when Syndicate XP increases',
                help:    "This notification is shown only in the Syndicate details page.",
                type:    'boolean',
                default: true
            },
            {
                key:     'notify_career_experience_increase',
                label:   'Notify when Player Career XP increases',
                help:    "This notification is shown only in the Character details page.\n" +
                         "For players with multiple careers, each career's XP is tracked separately.",
                type:    'boolean',
                default: true
            },
            {
                key:     'notify_experience_increase',
                label:   'Notify when Player XP increases',
                type:    'boolean',
                default: true
            },
            {
                key:     'warn_experience_when_over',
                label:   'Notify when Player XP at/over n%',
                help:    "Warn Player when their Experience is at or over the specified percentage value.\n" +
                         "Useful for players on an XP diet.  To disable, set this to 0.",
                type:    'text',
                default: 99
            },
            {
                key:     'where_notify_experience',
                label:   'Show Player XP notification in areas:',
                help:    "These options limit where Experience notifications are shown.\n" +
                         "To show Experience notifications everywhere, clear these options.",
                type:    "boolean_array",
                options: possible_notification_areas
            },
            {
                key:     'where_notify_experience_jquery',
                label:   'Show Player XP notification in areas: (JQuery selector; optional)',
                help:    "Show Experience notification when page matches one of the following jQuery selectors.",
                type:    'text',
                default: ''
            },

            {
                key:     'notify_credits_increase',
                label:   'Notify when Player gains/loses credits',
                type:    'boolean',
                default: true
            },
            {
                key:     'notify_credits_each_day',
                label:   'Daily: Notify about Player\'s total Credits gained/lost during previous day',
                help:    "Shows a notification once per day (first visit to Tau Station website),\n" +
                         "showing total credits gained since the prior daily notification.",
                type:    'boolean',
                default: true
            },
            {
                key:     'where_notify_credits',
                label:   'Show Player Credits notification in areas:',
                help:    "These options limit where Credits notifications are shown.\n" +
                         "To show Credits notifications everywhere, clear these options.",
                type:    "boolean_array",
                options: possible_notification_areas
            },
            {
                key:     'where_notify_credits_jquery',
                label:   'Show Player Credits notification in areas: (JQuery selector; optional)',
                help:    "Show Credits notification when page matches one of the following jQuery selectors.",
                type:    'text',
                default: ''
            },
            {
                key:     'notify_bonds_increase',
                label:   'Notify when Player gains/loses Bonds',
                type:    'boolean',
                default: true
            },
        ]
    };
}

var tSM_config = {};

//
// End: User Configuration.
//////////////////////////////


//////////////////////////////
// All lines below are less-configurable or non-user-configurable.
//

const GCT_SECONDS_PER_UNIT = 0.864;

var log_prefix = '[General Monitor] ';

var ui = {
    'Stats' : {
        'notify_stats_refilled': {
            'icon':  '<span>Refilled</span>',
            'label': 'Time remaining until Stats have refilled' },
    },
    'Timers' : {
        'notify_confinement_timer' : '<span class="fa fa-lock"/>',  // or jail bars: '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4ggXFjYsyYkWmgAAAlBJREFUSMfd1juIFGkQB/Bf9w7YCIrCnC64uN7JYSKcj+QMDUQMVMTAg0MHs4sUU1+JYOADMTtBgxbU1MTA1MRIRTARMZFT2LuWWxHdFt1pA6vxo+lFA00sGLqn/lX/r+qrx0xWlNUbzKLBYiz3SeYxE/oMywKHt4lPhpWYCOz/wDMsy8Nwuh4Np3DIZ5nBNFZjDa4n2PXQrQ6bmQQ7FFzTmM0jinGA48SwwbgeDcehb74SS7maPFJpZaH3L8mCHLnvLD/IAVEsmEuLlegXlKTQUo7Wd4BxUVa/4Ai2JYZTRVmdwQl86CMvymoRTmEqUZ8uymorLmA8wCRu4Qr+6nAcxe+409MpY2zBBmzt+G0Ozskcr7G7Hg3PYSMOYn98fsWuejRseq6mwc6wae0PYmM9Gp7HbrwexFg/Cb+ruNG5z7tFWV3rXNOHoqw2YXsEVSTY+3g+wdtBpJvFNO7B+thD7VX8jKedjstDtxYnk0mewCNcbnkHncwf4Fni8A578VOnU8ZYgX9xE4uSgF6mhN0DDuC3yKDdUUvwvCeDfwI7Ht+zyOAh7qUHNEnEf2NVEE9Ei+5A3XNAHdjZaNX50D9PFmLT1mBzUVZ/Ymk4ZgnRfFKjdJtmCemeRF8UZfUK19oaTEbkx7AOF8P4P2zquZ50Fu7hD9yPOsFhPMaldg5msa8eDW93CvQeL/pmoDMLL5LWhJfBta/9wZmrR8On33rJBedcjqwoq2++VYMzy3uK1/f+JVmQo+2iPFoz7xQxL8pK0uddrOnB8uSZZd/7b8tH9ErQsbBStNsAAAAASUVORK5CYII=">',
        'notify_hotel_timer'       : {
            'icon':  '<span class="fa fa-bed"/>',
            'label': 'Hotel time remaining (only when <1 day left)' },
        'notify_repair_timer'      : '<span class="fa fa-wrench"/>',
        'notify_ruins_timers'      : {
            'icon':  '<span class="fa tSM-icon tSM-ruins"/>',   // Icon added by CSS section below (.tSM-ruins:before) -- allows mobile users to long-press to show timer details, without this text-based icon being highlighted as a text selection.
            'label': 'Ruins campaign timers' },
        'notify_shuttle_timers'    : '<span class="fa fa-rocket"/>',  // Not fa-shuttle, since that icon's wider than the others.
        'notify_refuel_timer'   : {
            'icon':  '<span class="fa tSM-icon tSM-refuel"/>',  // Icon added by CSS section below (.tSM-refuel:before) -- allows mobile users to long-press to show timer details, without this text-based icon being highlighted as a text selection.
            'label': 'Ship refueling time remaining' },
    },
    'XP gain' : {
        'notify_experience_increase': {
            'icon'  : '<span class="fa fa-user"/>', // or 'XP',
            'label' : 'Notify when your experience has increased (only when in specific rooms)' },
        'notify_career_experience_increase': {
            'icon'  : '<span class="fa fa-id-badge"/>',
            'label' : 'Notify when your Career experience has increased (only while viewing the character details page)' },
        //TODO(?): Implement UI w/ editable numeric field.
        // 'warn_experience_when_over': {
        //     'icon'  : '<span class="fa fa-exclamation-triangle"/>', // or '>=', // or '##',
        //     'label' : 'Highlight Experience field when XP is greater than some value.',
        //     'type'  : 'text' },
        //TODO(?): Implement UI w/ list of station areas. (Maybe: Leverage existing Areas list?)
        // 'where_notify_experience': '<span class="fa fa-map-marker"/>', // or '🗺', (&#x1F5FA; WORLD MAP)
        'notify_syndicate_experience_increase': {
            'icon'  : '<span class="fa fa-users"/>', // aka '👥', (&#x1F465; BUSTS IN SILHOUETTE)
            'label' : 'Notify when Syndicate experience has increased (only when viewing Syndicate info)' },
    },
    'Income': {
        'notify_credits_increase' : {
            'icon'  : '<svg><use xlink:href="/static/images/icons.svg#icon-credchip"></use></svg>', // or '₢', (&#x20A2; CRUZEIRO SIGN)
            'label' : 'Notify when your credits have increased (only when in specific rooms)' },
        'notify_credits_each_day' : {
            'icon'  : '<span class="fa fa-sun-o"/>', // or '🌙', (&#x1F319; CRESCENT MOON)
            'label' : 'In morning, report total change in credits over past day' },
        //TODO(?): Implement UI w/ list of station areas. (Maybe: Leverage existing Areas list?)
        // 'where_notify_credits': {
        //     'icon' : '<span class="fa fa-map-marker"/>', // or '🗺', (&#x1F5FA; WORLD MAP)
        //     'type' : 'select'?
        // },
        'notify_bonds_increase'   : {
            'icon'  : '<svg><use xlink:href="/static/images/icons.svg#icon-bond"></use></svg>',
            'label' : 'Notify when your bonds increase' },
    },
}

var next_rescan_delta = 15 * 60 * 1000; // Safe value (15 mins), in case it doesn't get overridden below.

var notifications = {};
notifications.handles    = {}
notifications.timestamps = {};

async function start_general_monitor() {
    tSM_config = userscript_preferences( general_monitor_preferences_definition() );

    // "boolean_array" config options end up containing any option that has ever been enabled,
    // even if they're currently disabled. Clean these up by removing currently-disabled options.
    tSM_config.where_notify_credits    = remove_unset_keys(tSM_config.where_notify_credits);
    tSM_config.where_notify_experience = remove_unset_keys(tSM_config.where_notify_experience);

    next_rescan_delta = tSM_config['stats_rescan_period'] * 60 * 1000

    // Set up a tab-specific ID, so only one tab is generating notifications at a time.
    if (! sessionStorage.tS_id) {
        sessionStorage.tS_id = Math.random() * 0x0FFFFFFFFFFFFFFF;
    }

    tSM_add_UI();

    ensure_notifications_allowed();

    set_up_notifications();

    notifications.timestamps.next_rescan = new Date(Date.now() + next_rescan_delta);
    window.setInterval(set_up_notifications, next_rescan_delta);
}

//////////////////////////////
// #region UI-related code.
//

    function tSM_add_UI() {
        // Make sure the common base UI has been added. (Shouldn't be needed, but $(document).ready(...) isn't calling taustation-tools-common.js's entry first, even though it should be added before ours.)
        tST_add_base_UI();

        // Add the section for this script's UI (vs. sibling scripts).
        tST_region.append(`
<div id="tSM-region" class="tST-section tST-control-bar">
  <div id="tSM-enabled-header" style="display:flex; width:100%; justify-content:space-between; display:none">
    <span style="float:left; width:auto;">Monitors</span>
    <span id="tSM-timer-display" style="float:right; width:auto; display:none;"></span>
  </div>
  <div id="tSM-disabled-header" style="display:flex; width:100%; justify-content:space-between; display:none">
    <span id="tSM-region-title" style="float:left; width:auto; vertical-align:bottom;">Monitors</span>
    <span style="width:auto; vertical-align:bottom;" title="Another tab is already responsible for handling notifications.">
      <font size="-1"><i>(turn <font color="#279702">on</font>/<font color="#2d7ab9">off</font> only)</i></font>
    </span>
    <span style="float:right; width:auto; vertical-align:bottom;">
      <font size="-1"><b><u><a id="tSM-take-control" style="color:#08a1ec; border:none; cursor: pointer;" title="Take control away from the other tab: handle notifications in this tab.">Take Control</a></u></b></font>
    </span>
  </div>
  <div id="tSM-body">
    <div id="tSM-request-permission-dialog" style="background-color: #444d;margin: 1em;margin-top: 0; display:none;">
      <a id="tSM-request-permission" class="tST-icon-link" style="margin:1em; padding:0.3em; font-size:0.9em; font-style:italic; color:#08a1ec;">
        Click to request permission to show Notifications
      </a>
    </div>
  </div>
</div>
`);

        // Add an icon that shows/hides the above UI, and can indicate info about the current combat log.
        tST_add_icon('#general-monitor-icon', '#tSM-region', `
<a id="general-monitor-icon" class="tST-icon-link" title="General Monitors:">
  <li class="tST-icons-list-entry" style="position:relative;">
    <span id="gm-scheduled-badge" class="notification" data-badge="0" style="position:absolute; top:-8px; right:4px; display:none"></span>
  </li>
</a>`);

        tSM_populate_ui();
    }

    function tSM_set_enabled(is_enabled) {
        if (is_enabled) {
            tST_nodes['#general-monitor-icon'].find('li').each(function() {
                // Update the userscript's icon, but leave the "Push permissions needed" overlay if it's present.
                let live_icon = $(this).find('.gm-live-icon');
                if (! live_icon.hasClass('gm-enabled')) {
                    live_icon.detach();
                    $(this).prepend('<span class="gm-live-icon gm-enabled fa fa-comments" style="vertical-align: top;"/>'); // Other options: '💬' (&#x1F4AC; SPEECH BALLOON), '🔔' (&#x1F514; BELL)
                }
            });
            $('#tSM-disabled-header').hide();
            $('#tSM-enabled-header' ).show();

            $('#tSM-take-control').off('click');
        } else {
            tST_nodes['#general-monitor-icon'].find('li').each(function() {
                // Update the userscript's icon, but leave the "Push permissions needed" overlay if it's present.
                $(this).find('.gm-live-icon').detach();
                $(this).prepend('<span class="gm-live-icon gm-disabled" style="vertical-align: top;">&#x1F4A4;</span>'); // ('💤' SLEEPING SYMBOL); another option: '🔕' (&#x1F515; BELL WITH CANCELLATION STROKE)
            });
            $('#gm-scheduled-badge').hide();
            $('#tSM-enabled-header' ).hide();
            $('#tSM-disabled-header').show();

            $('#tSM-take-control').click(function() {
                localStorage.setItem('tSM_notifications_tab', sessionStorage.tS_id);
                tSM_set_enabled(true);
                set_up_notifications();
            });

            // Clear any notifications we have pending; if another tab took ownership, it will reschedule them.
            for (var notification_key in notifications.handles) {
                window.clearTimeout(notifications.handles[notification_key]);
                notifications.handles   [notification_key] = undefined;
                notifications.timestamps[notification_key] = undefined;
            }
            if (notifications.timestamps) {
                dump_notifications('This tab is now disabled; cleared any notifications we scheduled.')
            }
        }
    }

    function tSM_populate_ui() {
        var tSM_area = $("#tSM-body");

        // This userscript's UI is a table of icons (with hidden checkboxes):
        //  - Green icon border = notification currently enabled;
        //  - Highlighted icon  = timer currently active.
        //
        // The resulting CSS is not short, so it's specified at the end of this file.
        //
        tST_add_css(css_for_icons_table);
        tSM_area.append('<table><tbody id="tSM-togglers-table"/></table>\n');
        tSM_area.find('#tSM-timer-display').hide();
        var table = tSM_area.find('#tSM-togglers-table');

        let total_notifications = 0;

        // Show related icons on the same line, with all icons cleanly aligned horizontally & vertically.
        for (var group in ui) {
            table.append('<tr><td><span class="tSM_group" id="header-group-' + group.replace(/ /g, "_") + '">' + group + ':&nbsp;</span></td><td id="group-' + group.replace(/ /g, '_') + '"/></tr>\n');
            var column = table.find('#group-' + group.replace(/ /g, '_'));
            for (var key in ui[group]) {
                let { icon, label } = lookupIconAndLabel(key, group);

                label = label.replace(/^notify_/, '').replace(/_/g, ' ')
                             .replace(/timers?$/, 'time remaining');
                if (label) {
                    label = label.substr(0, 1).toLocaleUpperCase() +
                            label.substr(1);
                }

                // Check if this notification is active.
                var key_is_active = check_if_key_active(key);
                if (group === 'Timers') {
                    total_notifications += key_is_active;
                }
                column.append(`
<div><a id="${key}" title="${label}" default-title="${label}">
  <input id="${key}-checkbox" type="checkbox" ${(tSM_config[key] ? 'checked' : '')}
         ${(key_is_active? 'class="tSM-timer-active"' : '')}>
  ${icon}
</a></div>
`);
                var ctlIcon = $('#' + key);
                ctlIcon.click(function(evt) {
                    var target = evt.currentTarget;
                    var key = target.id;
                    var checkbox = $(target).find('input#' + key + '-checkbox');

                    if (tSM_config[key] === undefined || tSM_config[key] === false) {
                        tSM_config[key] = true
                        //d checkbox.attr('checked', undefined);
                        checkbox.get()[0].checked = tSM_config[key];
                        console.log(log_prefix + 'Enabled ' + key + '.');

                    } else if (tSM_config[key] === true) {
                        tSM_config[key] = false
                        //d checkbox.removeAttr('checked');
                        checkbox.get()[0].checked = tSM_config[key];
                        console.log(log_prefix + 'Disabled ' + key + '.');
                    }
                    localStorage.setItem(monitor_prefs_key, JSON.stringify(tSM_config));
                });

                // Allow Timer icons to show the local clock time when the timer will finish.
                if (group == 'Timers' || group == 'Stats') {
                    // Desktop: React to mouse hover.
                    ctlIcon.hover(timer_hover_show_time,
                                  timer_mouseout_hide_time);

                    //TODO: Either change the <a> tag above to a button, or change the header column to buttons that cycle through showing each active timer's deadline.
                    // Mobile, keyboard, screen-readers: React to keyboard focus.
                    ctlIcon.focusin (timer_hover_show_time);
                    ctlIcon.focusout(timer_mouseout_hide_time);
                }
            }
            table.append('</td></tr>');
        }

        let badge = $('#gm-scheduled-badge');
        if (badge.length) {
            badge.attr('data-badge', total_notifications);
            if (total_notifications) {
                badge.show();
            }
        }
    }

    function lookupIconAndLabel(key, group) {
        let icon;
        let label;

        // If caller didn't provide a group name, try to find the relevant group.
        if (! group) {
            for (let known_group in ui) {
                if (! ui.hasOwnProperty(known_group)) {
                    continue;
                }
                if (ui[known_group].hasOwnProperty(key)) {
                    group = known_group;
                    break;
                }
            }
        }
        if (! group) {
            return;
        }

        icon = ui[group][key];
        label = key;

        if (typeof icon === 'object') {
            var obj = icon;
            icon = obj.icon;
            if (obj.label) {
                label = obj.label;
            }
        }
        return { icon, label };
    }

    function check_if_key_active(key) {
        var retval = 0;

        for (var keyTimestamp in notifications.timestamps) {
            if (check_if_this_key_active(keyTimestamp, key)) {
                retval++;
                break;
            }
        }

        return retval;
    }

    function check_if_this_key_active(keyTimestamp, key) {
        return (keyTimestamp.startsWith(key) && notifications.timestamps[keyTimestamp]);
    }

    function timer_hover_show_time(evt) {
        var target    = evt.currentTarget;
        var key       = target.id;
        var nameGroup = $(target).parent().parent().attr('id');
        var prefix    = '<span class="fa fa-clock-o"/> ';
        var labelOverlay;
        var firstTimerDate;

        $('#tSM-timer-display').html('');
        for (var keyTimestamp in notifications.timestamps) {
            if (! check_if_this_key_active(keyTimestamp, key)) {
                continue;
            }

            // Determine whether we have enough room to show the label (mainly helpful for mobile
            // layout -- which, ironically, ends up with a wider area here than desktop layout).
            if (stored_notifications_data[keyTimestamp + '_label']) {
                let label = stored_notifications_data[keyTimestamp + '_label'];

                let header = $('#tSM-enabled-header');
                let header_width = (header.css('width')     || '').replace('px', '') * 1;
                let header_font  = (header.css('font-size') || '').replace('px', '') * 1;

                // We need at least 20.75em for "Monitors" + typical label + timer summary.
                if (header_width && header_font && header_width / header_font >= 21) {
                    prefix = label + ' ' + prefix;
                }
            }

            var timerDate = new Date(notifications.timestamps[keyTimestamp]);
            // If multiple related notifications, show the one that'll happen first.
            if (! firstTimerDate || firstTimerDate > timerDate) {
                firstTimerDate = timerDate;
                labelOverlay = prefix + summarize_timer_end(timerDate);

                if (stored_notifications_data[keyTimestamp + '_tooltip']) {
                    let tooltip = stored_notifications_data[keyTimestamp + '_tooltip'];
                    $(target).attr('title', tooltip);
                }
            }
        }

        if (! labelOverlay) {
            labelOverlay = prefix + '<i>inactive</i>';
        }

        $('#tSM-timer-display').append(`<div class=alert-time>${labelOverlay}</div>`);
        $('#tSM-timer-display').show();
    }

    function summarize_timer_end(timer_date) {
        let retval =   ('00' + timer_date.getHours()  ).substr(-2) + ':'
                     + ('00' + timer_date.getMinutes()).substr(-2);

        var cur_date = new Date();
        if (timer_date && cur_date.getDate() !== timer_date.getDate()) {
            let days_ahead = (timer_date.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
            if (days_ahead < 1) {
                retval = 'Tomorrow @ ' + retval;
            } else {
                retval = `+${Math.floor(days_ahead)} days @ ` + retval;
            }
        }

        return retval;
    }

    function timer_mouseout_hide_time(evt) {
        var target = evt.currentTarget;

        // Restore the original tooltip, in case we showed a more-detailed one.
        $(target).attr('title', $(target).attr('default-title'));

        $('#tSM-timer-display').hide();
        $('#tSM-timer-display').html('');
    }

//
// #endregion UI-related code.
//////////////////////////////

//////////////////////////////
// #region Notification: All Stats regenerated to 100%.
//

function ensure_notifications_allowed() {
    if (! Push.Permission.has()) {
        $('#general-monitor-icon li').append('<span class="fa fa-exclamation need-notification-permission-warning" style="position:absolute; top:50%; left:85%; color:#d76543;" title="Need permission to show notifications"></span>');

        // First, try for an automatic prompt on page load. (Works with Chrome.)
        Push.Permission.request(
            function () { ; },
            function () {
                // Firefox only shows the "grant permissions?" dialog for user-generated events.
                // Hence, we need to ask the user to click something, before Firefox will show it.

                let table = $('#tSM-togglers-table');
                let dialog = $('#tSM-request-permission-dialog');
                let button = $('#tSM-request-permission');

                table.hide();
                dialog.show();
                button.click(function() {
                    Push.Permission.request(
                        function () {
                            $('.need-notification-permission-warning').detach();
                            dialog.hide();
                            table.show();
                        },
                        function () {
                            alert('Permission not granted.\n' +
                                'The "General Monitor" userscript can\'t show notifications until you grant permission.');
                        });
                });
            });
    }
}

let stored_notifications_data = {};

var other_tab_owner_reported = false;
var during_init = true;

function set_up_notifications() {
    notifications.timestamps.next_rescan = new Date(Date.now() + next_rescan_delta);

    load_scheduled_notifications();

    // Handle things that should happen in all tabs.
    if (during_init) {
        if (tSM_config.warn_experience_when_over) {
            warn_when_experience_is_over();
        }
    }

    if (! localStorage.tSM_notifications_tab ||
        localStorage.tSM_notifications_tab == sessionStorage.tS_id)
    {
        tSM_set_enabled(true);

        localStorage.setItem('tSM_notifications_tab', sessionStorage.tS_id); // Claim (or reassert) ownership.

        // Preprocess jQuery-based location matching criteria.
        let where_notify_credits_jquery    = collect_jquery_selectors(tSM_config.where_notify_credits,
                                                                      tSM_config.where_notify_credits_jquery);
        let where_notify_experience_jquery = collect_jquery_selectors(tSM_config.where_notify_experience,
                                                                      tSM_config.where_notify_experience_jquery);

        var info_notifications = [];

        if (tSM_config.notify_stats_refilled) {
            schedule_notify_when_stats_refilled();
        }

        if (tSM_config.notify_experience_increase && (in_matching_location(tSM_config.where_notify_experience) || in_matching_page(where_notify_experience_jquery))) {
            info_notifications.push(notify_when_experience_increases('player'));
        }
        if (tSM_config.notify_syndicate_experience_increase && in_matching_location({ '/syndicates': true })) {
            info_notifications.push(notify_when_experience_increases('syndicate'));
        }
        if (tSM_config.notify_career_experience_increase && in_matching_location({ '/': true })) {
            //TEST: Change Career XP & Rank, to trigger a notification.
            //t    $('th:contains("Career Rank") ~ td').text(($('th:contains("Career Rank") ~ td').text() * 1) - 1);
            //t    $('th:contains("Career Experience") ~ td').text('97.2%');
            //t    $('th:contains("Career Experience") ~ td').text('1.3%');
            info_notifications.push(notify_when_experience_increases('career'));
        }

        if (tSM_config.notify_credits_increase && (in_matching_location(tSM_config.where_notify_credits) || in_matching_page(where_notify_credits_jquery))) {
            info_notifications.push(notify_when_credits_increase());
        }

        if (tSM_config.notify_bonds_increase) {
            info_notifications.push(notify_when_bonds_increase());
        }

        // These events are only applicable when the page first loads.
        if (during_init) {
            if (tSM_config.notify_hotel_timer) {
                schedule_notify_hotel_reservation_expiration();
            }
    
            if (tSM_config.notify_repair_timer) {
                schedule_notify_repair_finished();
            }

            if (tSM_config.notify_confinement_timer) {
                schedule_notify_confinement_release();
            }

            if (tSM_config.notify_shuttle_timers) {
                schedule_notify_shuttle_departing_soon();
                schedule_notify_shuttle_arriving_soon();
            }

            if (tSM_config.notify_refuel_timer) {
                schedule_notify_refuel_finished();
            }

            if (tSM_config.notify_ruins_timers) {
                schedule_notify_ruins_campaigns();
            }

            if (tSM_config.notify_credits_each_day && (in_matching_location(tSM_config.where_notify_credits) || in_matching_page(where_notify_credits_jquery))) {
                schedule_notify_credits_each_day();
            }
        }

        if (info_notifications.length) {
            show_multi_notification('info', info_notifications);
        }

        // Finally, store any updated information we saved during the methods above.
        save_scheduled_notifications();
    } else {
        if (! other_tab_owner_reported) {
            debug(log_prefix + 'Another tab is handling notifications.');
            other_tab_owner_reported = true;

            tSM_set_enabled(false);
        }
    }

    debug(log_prefix + 'Will rescan page at: ' + notifications.timestamps.next_rescan);

    during_init = false;
}

function load_scheduled_notifications() {
    stored_notifications_data = JSON.parse(localStorage.tsM_scheduled_notifications || '{}');
}

function save_scheduled_notifications() {
    stored_notifications_data = remove_unset_keys(stored_notifications_data);
    localStorage.setItem('tsM_scheduled_notifications', JSON.stringify(stored_notifications_data));
}

function collect_jquery_selectors(objLocations, strLocationsJquery) {
    let arrSelectors = [];
    for (let key in objLocations) {
        if (key.startsWith('jquery:') && objLocations[key] === "true") {
            arrSelectors.push(key.replace('jquery:', ''));
        }
    }

    if (strLocationsJquery) {
        arrSelectors.push(strLocationsJquery);
    }

    return arrSelectors;
}

function in_matching_location(objLocations) {
    // Use the URL's path, without any "?_mid=87654321" suffix.
    const url_path = window.location.pathname.replace(/\?.*$/, '');
    return (! objLocations || jQuery.isEmptyObject(objLocations) ||
            (objLocations.hasOwnProperty(url_path) &&
             (objLocations[url_path] === true ||
              objLocations[url_path] === "true")));
}

function in_matching_page(arrSelectors) {
    var retval = false;

    if (arrSelectors && arrSelectors.length >= 0) {
        for (var ii = 0; ii < arrSelectors.length; ii++) {
            if ($(arrSelectors[ii]).length) {
                retval = true;
                break;
            }
        }
    }

    return retval;
}

function remove_unset_keys(obj) {
    let retval = obj;

    if (obj) {
        retval = {};
        for (let key in obj) {
            if (obj[key]) {
                retval[key] = obj[key];
            }
        }
    }

    return retval;
}

function schedule_notify_when_stats_refilled() {
    let timer_type = 'stats';

    // First, calculate when this notification should happen (if at all).
    var max_time = 0;
    $('.player-stats .time-to-full .refill-timer').each(function () {
        // Since this runs during every refresh, we need to read the GCT value instead of data-seconds-refill.
        // (data-seconds-refill only updates every 5 mins, so our timer could easily bounce around +/- 5 mins.)
        var value = get_gct_time_as_numeric($(this)) * GCT_SECONDS_PER_UNIT;
        if (max_time < value) {
            max_time = value;
        }
    });

    if (max_time > 0) {
        var message = 'Your stats have fully regenerated!';
        set_notification(max_time * 1000, message, "info", 'notify_stats_refilled');
    }
    else {
        debug(log_prefix + 'Stats are full; no notification needed.');
    }
}

function schedule_notify_shuttle_departing_soon() {
    var severity = 'warning';
    let timer_name = 'notify_shuttle_timers' + '&ETD';
    let not_active_debug_msg = 'Not waiting for shuttle';

    // This appears as a global timer, and can appear in any area.
    // Given that, we always regenerate the timer, instead of reusing the previously-saved timer.

    // Scan for the following:
    //   <div class="timer shuttle-timer" role="region" aria-label="Shuttle countdown"
    // -->    data-seconds-left="534" data-timer-type="shuttle">
    let timer_selector = 'div.shuttle-timer[data-timer-type="shuttle"]';

    process_global_timer(timer_name, severity, not_active_debug_msg, timer_selector,
        function(details) {
            let label   = 'Shuttle departure:';
            let tooltip = 'Shuttle will depart at:';
            let message = 'Shuttle departing soon!';

            let shuttle_info = (details.timer_node.find('.eta p').first().text() || '');
            if (shuttle_info) {
                let destination = shuttle_info.trim().replace(/.*Your shuttle to (.*) leaves .*/, '$1');
                if (destination !== shuttle_info) {
                    tooltip = tooltip.replace(/Shuttle\b/, `Shuttle to ${destination}`);
                    message = message.replace(/Shuttle\b/, `Shuttle to ${destination}`);
                }
            }

            details.label   = label;
            details.message = message;
            details.tooltip = tooltip;
            details.except_in = '/area/local-shuttles';

            return details;
        },
        function(details) {
            let seconds_remaining, severity;

            // Adjust seconds_remaining & severity, if necessary.
            ({ seconds_remaining, severity } = choose_early_notification_time(details.seconds_remaining, details.severity));

            details.seconds_remaining = seconds_remaining;
            details.severity = severity;
        });
}

const delay_threshold_warning = 20;

function choose_early_notification_time(seconds_remaining, severity) {
    // If it's several minutes from now, have it fire 2 minutes before departure time.
    if (seconds_remaining > 150) {
        seconds_remaining -= 120;
    }
    // If it's almost time, notify right now, unless we're already in the right location.
    else if (seconds_remaining < delay_threshold_warning) {
        seconds_remaining = 0; // Time's almost up -- notify right now!
        severity = 'error';    // Get the user's attention.
    }
    // Otherwise, notify ~20 seconds before
    else {
        seconds_remaining -= delay_threshold_warning;
    }
    return { seconds_remaining, severity };
}

function schedule_notify_shuttle_arriving_soon() {
    var severity = 'warning';
    let timer_name = 'notify_shuttle_timers' + '&ETA';
    let not_active_debug_msg = 'Not currently traveling';

    // This appears as a global timer, and can appear in any area.
    // Given that, we always regenerate the timer, instead of reusing the previously-saved timer.

    // Scan for the following:
    //   <div class="timer shuttle-timer confinement-timer" role="region" aria-label="Travel countdown"
    //        data-seconds-left="926" data-timer-type="travel">
    let timer_selector = 'div.shuttle-timer[data-timer-type="travel"]';

    process_global_timer(timer_name, severity, not_active_debug_msg, timer_selector,
        function (details) {
            let label   = 'Ship arrival:';
            var message = 'Arrived at destination!\n(Travel finished.)';
            let tooltip = "Ship will arrive at:";

            let current_station = get_current_station();
            if (current_station) {
                tooltip = tooltip.replace('arrive', `reach ${current_station}`);
                message = message.replace('destination', current_station);
            }

            let ship_name = ($('.cockpit-container h2 .name').text() || '').replace(/: $/, '');
            if (ship_name) {
                tooltip = tooltip.replace(/Ship\b/, `"${ship_name}"`);
            }

            details.label   = label;
            details.message = message;
            details.tooltip = tooltip;

            return details;
        });
}

function process_global_timer(timer_name, severity, not_active_debug_msg, timer_selector, get_notification_info, fn_extra_processing) {
    process_timer({ global: [ timer_name, severity, not_active_debug_msg, timer_selector, get_notification_info, fn_extra_processing ]});
}

function process_timer({ global, area } = {}) {
    let timer_prefix;

    let details = {
        seconds_remaining: undefined,
        severity: undefined,
        message: undefined,
        tooltip: undefined,
    };

    if (global) {
        timer_prefix = global[0]; // Should match area[1], when specified.
        process_global_timer_helper(...global);
    }

    if (area) {
        timer_prefix = area[1]; // Should match global[0], when specified.
        details.in_area = area.in_area;
        process_area_timer_helper(...area);
    }

    // Regardless of what happened above, start any relevant timers.
    schedule_active_notifications();

    //
    // Same-scope helper methods.
    //
    function process_global_timer_helper(timer_name, severity, not_active_debug_msg, timer_selector, get_notification_info, fn_extra_processing) {
        let timer_node;
        if (typeof timer_selector === 'string') {
            timer_node = $(timer_selector);
        } else if (typeof timer_selector === 'function') {
            timer_node = timer_selector();
        } else {
            timer_node = timer_selector;
        }

        if (! timer_node) {
            // Nothing to do (e.g., unexpected scenario) -- safest to just bail out.
            return;
        }

        if (timer_node.length == 0) {
            if (not_active_debug_msg) {
                debug(log_prefix + not_active_debug_msg + '; no notification needed.');
            }

            // Clear any previous timer.
            stored_notifications_data[timer_name]              = undefined;
            stored_notifications_data[timer_name + '_details'] = undefined;
            stored_notifications_data[timer_name + '_tooltip'] = undefined;
            stored_notifications_data[timer_name + '_data']    = undefined;
            stored_notifications_data[timer_name + '_label']   = undefined;
        } else {
            timer_node.each(function () {
                let details = {};
                details.timer_node = $(this);
                details.severity   = severity;

                details.seconds_remaining = details.timer_node.attr('data-seconds-left');

                // let notification_info = {};
                if (typeof get_notification_info === 'function') {
                    details = get_notification_info(details);
                // } else if (typeof get_notification_info === 'object') {
                //     details.notification_info = get_notification_info;
                } else {
                    details.message = get_notification_info;
                }

                if (fn_extra_processing) {
                  debug(`Before fn_extra_processing(): seconds_remaining = ${details.seconds_remaining}, severity = ${details.severity}`);
                  fn_extra_processing(details);
                  debug(`After  fn_extra_processing(): seconds_remaining = ${details.seconds_remaining}, severity = ${details.severity}`);
                }

                let timer_scheduled;
                if (details.seconds_remaining !== undefined) {
                    timer_scheduled = new Date(Date.now() + (details.seconds_remaining * 1000));
                }

                // Make sure we don't save the JQuery object from above.
                details.timer_node = undefined;

                if (timer_scheduled) {
                    stored_notifications_data[timer_name]              = timer_scheduled;

                    // The '_tooltip' & '_label' key/value pairs are used by the UI's show/hide code.
                    // (These either have a real value, or are undefined & are pruned before saving.)
                    stored_notifications_data[timer_name + '_tooltip'] = details.tooltip;
                    stored_notifications_data[timer_name + '_label']   = details.label;
                    stored_notifications_data[timer_name + '_data']    = details.data;

                    // Since these key/value pairs are stored above, we don't need to repeat them when we save details.
                    details.tooltip = undefined;
                    details.label   = undefined;
                    details.data    = undefined;
                    stored_notifications_data[timer_name + '_details'] = details;
                }
            });
        }
    }

    function process_area_timer_helper(in_area, timer_name, severity, not_active_debug_msg, timer_selector, get_notification_info, fn_extra_processing) {
        let currently_in_area;
        if (typeof in_area === 'string') {
            currently_in_area = window.location.pathname.startsWith(in_area);
        } else if (typeof in_area === 'function') {
            currently_in_area = in_area();
        } else {
            currently_in_area = in_area;
        }

        if (! currently_in_area) {
            // Nothing to do (e.g., not in the relevant room) -- safest to just bail out.
            return;
        }

        //TODO: Can we a) just reuse the function above as is, b) reuse it w/ slight modifications, or do we need to c) reimplement our own copy of it, adding changes incompatible with the above?
        process_global_timer_helper(timer_name, severity, not_active_debug_msg, timer_selector, get_notification_info, fn_extra_processing);
    }

    function schedule_active_notifications() {
        if (! timer_prefix) {
            return;
        }

        let cur_date = Date.now();

        for (let notification_name in get_notification_keys_by_prefix(timer_prefix)) {
            // Ignore this key's support values.
            if (notification_name.match(/_(details|label|tooltip|data)$/) !== null || ! stored_notifications_data[notification_name]) {
                continue;
            }

            timer_scheduled = new Date(stored_notifications_data[notification_name]).getTime(); // * 1;
            if (timer_scheduled < cur_date + (delay_threshold_warning * 1000)) {
                // Timer is long stale; just remove it, silently.
                clear_notification_keys_by_prefix(notification_name);
                continue;
            } else if (timer_scheduled < cur_date) {
                // Timer is stale, but still recent; show it anyway.
                seconds_remaining = 0;
            } else {
                // Timer's in the future; schedule it.
                seconds_remaining = (timer_scheduled - cur_date) / 1000;
            }

            //Disabled: Not necessary, and makes it look like we missed a timer.
            // // If the timer would run for more than a day, there's no need to schedule the notification.
            // // (If this page isn't being reloaded, the player's most likely active in another tab / browser.)
            // if (seconds_remaining > (60 * 60 * 24)) {
            //     if (during_init) {
            //         let timer_desc = notification_name.replace(/^([^@&]+)(?:@[^&]+|)&(.*)$/, '$1 ($2)')
            //                                           .replace(/^notify_/, '')
            //                                           .replace(/_/g, ' ');
            //         debug(log_prefix + timer_desc + ' would run for over 1 day; no notification needed.');
            //     }
            //     return;
            // }

            let details     = stored_notifications_data[notification_name + '_details'];
            details.tooltip = stored_notifications_data[notification_name + '_tooltip']; // Or undefined, if not set.
            details.data    = stored_notifications_data[notification_name + '_data'];    // Or undefined, if not set.

            set_notification(seconds_remaining * 1000, details, details.severity, notification_name);
        }
    }
}

function schedule_notify_confinement_release() {
    var severity = 'warning';
    let timer_name = 'notify_confinement_timer';
    let not_active_debug_msg = 'Not currently confined';

    // This appears as a global timer, and can appear in any area.
    // Given that, we always regenerate the timer, instead of reusing the previously-saved timer.

    // Scan for the following:
    //  <section class="timer confinement-timer" role="region" aria-label="Confinement countdown"
    // -->    data-seconds-left="9008" data-timer-type="confined">

    let timer_selector = $('section.confinement-timer[data-timer-type="confined"]').filter(function () {
         return ! filter_match_repair($(this));
    });

    process_global_timer(timer_name, severity, not_active_debug_msg, timer_selector,
        function (details) {
            var confinement_area  = window.location.pathname.replace('/area/', '');
            if      (confinement_area == 'sickbay') { confinement_area = 'Sick Bay'; }
            else if (confinement_area == 'brig')    { confinement_area = 'the Brig'; }
            else if (confinement_area == 'docks')   { confinement_area = 'the Docks'; }

            let label   = 'Confined until:';
            var message = '"I\'m free!"\n\nReleased from confinement in ' + confinement_area + '.';
            let tooltip = `Will be released from ${confinement_area} at:`;

            details.label   = label;
            details.message = message;
            details.tooltip = tooltip;

            return details;
        });
}

function schedule_notify_hotel_reservation_expiration() {
    var severity = 'warning';
    let timer_name = 'notify_hotel_timer';
    let not_active_debug_msg = 'Inside Hotel room, but no timer is present? Odd state';

    // If we're inside our hotel room, add (or clear) the current notification state.
    // Otherwise, leave any stored notifications alone.
    let fn_timer_selector = function () {
        let retval = undefined;

        if (window.location.pathname.startsWith('/area/hotel-rooms/enter-room')) {
            // Scan for the following:
            //  <div class="timer timer-room" role="region" aria-label="Time left in room"
            // -->   data-seconds-left="699469" data-timer-type="room">
            retval = $('div.timer-room[data-timer-type="room"]');
        }

        return retval;
    };

    process_global_timer(timer_name, severity, not_active_debug_msg, fn_timer_selector,
        function(details) {
            let label   = 'Hotel expires:';
            let tooltip = 'Hotel reserved until:'

            current_station = get_current_station();
            if (current_station) {
                tooltip = current_station + ' - ' + tooltip;
            }

            // This notification fires before the actual event (see below),
            // so report a corresponding "advance warning!" message.
            var qualifier = "";
            let min = delay_threshold_warning;
            if      (details.seconds_remaining > 120) { qualifier = "will expire very soon. (in ~2 minutes)"; }
            else if (details.seconds_remaining > min) { qualifier = `is about to expire! (in ${details.seconds_remaining}) seconds)`; }
            else                                      { qualifier = `is seconds away from expiring!`; }

            if (current_station) {
                qualifier = `in ${current_station} ${qualifier}`;
            }

            var message = 'Your Hotel room ' + qualifier + '\n\nExtend your reservation, to be safe.';

            details.label   = label;
            details.message = message;
            details.tooltip = tooltip;

            return details;
        },
        function(details) {
            let seconds_remaining, severity;

            // Adjust seconds_remaining & severity, if necessary.
            ({ seconds_remaining, severity } = choose_early_notification_time(details.seconds_remaining, details.severity));

            details.seconds_remaining = seconds_remaining;
            details.severity = severity;
        });
}

function get_current_station() {
    let retval = $("#main-content .location-container .station").text();
    if (! retval) {
        retval = $("#main-content .shuttle-timer .timer-message .eta").contents().filter(text_nodes_only).text();
    }
    if (! retval) {
        retval = undefined; // This lets remove_unset_keys() clear effectively-unset data before saving to localStorage.
    } else {
        retval = retval.trim();
        if (retval.includes('Traveling to')) {
            retval = retval.replace(/^Traveling to ([^.]*)( from .*|\. You.*)$/, '$1');
        } else {
            retval = retval.replace(/, [^,]+ system/i, '').trim();
        }
    }
    return retval;
}

function schedule_notify_repair_finished() {
    var severity = 'info';
    let timer_name = 'notify_repair_timer';
    let not_active_debug_msg = 'Not currently repairing anything';

    // This appears as a global timer, and can appear in any area.
    // Given that, we always regenerate the timer, instead of reusing the previously-saved timer.

    // Clear any previous timer.
    stored_notifications_data[timer_name] = undefined;

    // Scan for the following:
    //old  <section class="countdown timer player-feedback" aria-label="Current Activity Countdown" role="region"
    //old -->    data-seconds-left="107" data-activity-name="Repair Item">
    //  <section class="timer confinement-timer " aria-label="Current Activity Countdown" role="region"
    //           data-seconds-left="85" data-timer-type="confined">
    //    [...]
    //    <h2>Current activity: <span class="highlight">Item Repair</span></h2>

    let timer_selector = $('section.confinement-timer[data-timer-type="confined"]').filter(function() {
        return filter_match_repair($(this));
   });

    process_global_timer(timer_name, severity, not_active_debug_msg, timer_selector,
        function(details) {
            let label   = 'Repairing until:';
            var message = 'Finished repairing item!';
            let tooltip = 'Item: Repairs will finish at:';

            if (details.timer_node.find('p.eta:contains("ship")').length > 0) {
                message = message.replace(/\bitem/, 'your ship');
                tooltip = tooltip.replace(/Item\b/, 'Ship');

                let ship_name = ($('.cockpit-container h2 .name').text() || '').replace(/: $/, '');
                if (ship_name) {
                    message = message.replace(/(your ship)\b/, `$1 "${ship_name}"`);
                    tooltip = tooltip.replace(/(Ship)\b/,      `$1 "${ship_name}"`);
                }
            }

            details.label   = label;
            details.message = message;
            details.tooltip = tooltip;

            return details;
        });
}

function filter_match_repair($node) {
    return $(this).find('h2:contains("Item Repair"), ' +
                        'p.eta:contains("Confined to your ship")').length > 0;
}

function schedule_notify_ruins_campaigns() {
    var severity = 'info';
    let timer_base_name = 'notify_ruins_timers';

    // Scan for the following:
    // - Global timer:
    //   <div class="timer global-timer" role="region" aria-label="Campaign countdown"
    //  -->   data-seconds-left="6912" data-timer-type="campaign">
    // - Area timer:

    let notification_info = [
        {
            campaign_name: 'Look for trouble',
            in_area:       '/area/the-wrecks',
            timer_selector_global: 'div.global-timer[data-timer-type="campaign"]:has(.eta:contains("Look for trouble"))',
            timer_selector_area:   '.random-encounter:has(h2:contains("Look for trouble")) .random-encounter-timer-value',
        },
        {
            campaign_name: 'Enter the sewers',
            in_area:       '/area/the-wrecks',
            timer_selector_global: 'div.global-timer[data-timer-type="campaign"]:has(.eta:contains("Enter the sewers"))',
            timer_selector_area:   '.random-encounter:has(h2:contains("Enter the sewers")) .campaign-timer-value, ' +
                                   '.random-encounter:has(h2:contains("Enter the sewers")) .random-encounter-timer-value',
        },
        {
            campaign_name: 'Syndicate campaign',
            in_area:       '/area/the-wilds',
            timer_selector_global: 'div.global-timer[data-timer-type="campaign"]:has(.eta:contains("Syndicate Campaign"))',
            timer_selector_area:   '.random-encounter:has(h2:contains("Syndicate campaign")) .campaign-timer-value, ' +
                                   '.random-encounter:has(h2:contains("Syndicate campaign")) .random-encounter-timer-value',
        },
    ]

    // These always appear in their area (on one particular station), and also appear as a global timer (until the player(s) finish the campaign).
    // Given that, we may have to a) use the global timer, b) use the page timer, or c) reuse a previously-saved timer.

    for (let index in notification_info) {
        let info = notification_info[index];

        let timer_name = timer_base_name + '@' + info.in_area.replace('/area/', '')
                                         + '&' + info.campaign_name.replace(/ /g, '_');
        let not_active_debug_msg = `No "${info.campaign_name}" timer`;

        process_timer({
            global: [ timer_name, severity, not_active_debug_msg,
                () => jquery_nodes_or_undefined(info.timer_selector_global),
                function(details) {
                    return set_ruins_message_and_tooltip(details, info.campaign_name, info.in_area);
                }],
            area: [ info.in_area, timer_name, severity, not_active_debug_msg,
                () => jquery_nodes_or_undefined(info.timer_selector_area),
                function(details) {
                    return set_ruins_message_and_tooltip(details, info.campaign_name, info.in_area);
                }] });
    }
}

function jquery_nodes_or_undefined(selector) {
    // Return JQuery nodes if found, otherwise return undefined.
    // (In process_timer(), means notification isn't cleared if timer isn't found.)
    let $nodes = $(selector);
    if (! $nodes.length) {
        $nodes = undefined;
    }

    return $nodes;
}

function set_ruins_message_and_tooltip(details, campaign_name, in_area) {
    let room_name = in_area.replace('/area/the-w', 'The W');

    details.label   = `"${campaign_name}":`;
    details.message = 'Now available: ' + campaign_name + ' (in Ruins - ' + room_name + ')';
    details.tooltip = campaign_name + ' - will be available at:';

    return details;
}

function schedule_notify_refuel_finished() {
    var severity = 'info';
    var message  = 'Your ship has finished refueling.';
    let timer_name = 'notify_refuel_timer';
    let seconds_remaining;
    let timer_scheduled;

    let cur_date = Date.now();

    // First, remove any long-stale pre-existing timers -- if they expired (e.g.) while we
    // were reloading a page, we still want to see the notification.
    for (let notification_name in get_notification_keys_by_prefix(timer_name)) {
        // Ignore this key's support values.
        if (notification_name.match(/_(data|label|tooltip)$/) !== null) {
            continue;
        }

        timer_scheduled = stored_notifications_data[notification_name] * 1;
        if (timer_scheduled < cur_date + (delay_threshold_warning * 1000)) {
            // Long-stale timer; we can remove it & any support values it has.
            clear_notification_keys_by_prefix(notification_name);
        }
    }

    // If we're in the docks (but not in a ship), clear any prior notification(s) and check if we need to schedule it again.
    if (window.location.pathname.startsWith('/area/docks') && ! $('.on-board').length) {
        // Don't clear previous timers -- if a ship is refueling at a different station, we won't see it here but still care about it.

        // Scan for the following:
        //  <span class="warning-message">
        //    [...]
        //    <span>Ship is refueling, you cannot board it now. Refueling ends at 205.30/85:324 GCT.</span>
        //  </span>
        $('span.warning-message span').filter(function() { return this.innerText.toLocaleLowerCase().includes('ship is refueling'); })
                                      .each(function() {
            let this_node = $(this);
            var end_time_gct = get_gct_time_as_numeric(this_node);
            var cur_time_gct = get_gct_time_as_numeric();
            var delta_time_gct = end_time_gct - cur_time_gct;
            seconds_remaining  = delta_time_gct * GCT_SECONDS_PER_UNIT;
            timer_scheduled = Date.now() + (seconds_remaining * 1000);

            let ship_container = this_node.closest('.own-ship-details');
            let ship_id;
            let ship_name;
            if (ship_container.length) {
                let element_id = ship_container.attr('id');
                ship_id = element_id.replace(/ship-/, '');
                ship_name = (ship_container.closest('.own-ships-container').find(`[aria-controls="${element_id}"] .name`).text() || "").replace(/: */, '');
            }

            let notification_name = timer_name;
            if (ship_name) {
                notification_name += '&' + ship_name;
            } else if (ship_id) {
                notification_name += '&' + ship_id;
            }

            let label   = 'Refueling until:';
            let tooltip = 'Ship refueling until:';
            if (ship_name) {
                label = `"${ship_name}" refueled:`;
                tooltip = tooltip.replace(/Ship\b/, `Ship "${ship_name}"`);
            }
            stored_notifications_data[notification_name]              = timer_scheduled;
            stored_notifications_data[notification_name + '_tooltip'] = tooltip;
            stored_notifications_data[notification_name + '_label']   = label;
        });
    } else {
    }

    // Regardless of what happened above, start any relevant timers.
    for (let notification_name in get_notification_keys_by_prefix(timer_name)) {
        // Ignore this key's support values.
        if (notification_name.match(/_(data|tooltip)$/) !== null) {
            continue;
        }
        timer_scheduled = stored_notifications_data[notification_name] * 1;
        if (timer_scheduled < cur_date) {
            seconds_remaining = 0;
        } else {
            seconds_remaining = (timer_scheduled - cur_date) / 1000;
        }

        let ship_desc = notification_name.replace(/^[^&]+(?:&(.+)|)$/, '$1');

        if (ship_desc) {
            message = message.replace(/ship has/, `ship "${ship_desc}" has `);
        }

        set_notification(seconds_remaining * 1000, message, severity, notification_name);
    }
}

function get_notification_keys_by_prefix(key_prefix) {
    return get_keys_by_prefix(key_prefix, stored_notifications_data);
}

function get_keys_by_prefix(key_prefix, obj) {
    let retval = {};

    for (var key in obj) {
        if (! obj.hasOwnProperty(key)) {
            continue;
        }
        if (key.startsWith(key_prefix)) {
            retval[key] = '';
        }
    }

    return retval;
}

function clear_notification_keys_by_prefix(key_prefix) {
    for (var key in stored_notifications_data) {
        if (! stored_notifications_data.hasOwnProperty(key)) {
            continue;
        }
        if (key.startsWith(key_prefix)) {
            tST_debug(log_prefix + 'Clearing notification item: ' + key);
            stored_notifications_data[key] = undefined;
        }
    }
}

var experience_type_labels = {
    'player':    'player',
    'career':    'Career',
    'syndicate': 'Syndicate',
}

function notify_when_experience_increases(experience_type) {
    var is_syndicate = (experience_type === 'syndicate');
    var is_career    = (experience_type === 'career');

    var xp_type = experience_type_labels[experience_type];
    if (during_init) {
        console.log(log_prefix + 'Monitoring ' + xp_type + '\'s experience gains.');
    }

    var label_brief = 'XP';
    if (tSM_config.use_brief_notifications) {
        if (is_syndicate) {
            label_brief = 'SyndXP';
        } else if (is_career) {
            label_brief = 'CareerXP';
        }
    }
    var target = xp_type.toLocaleLowerCase();

    // Save career experience & rank (level) separately for each career the player may have.
    if (is_career) {
        target += '_' + $('#character_career_list th:first ~ td').text().replace(' ', '_');
    }

    var old_experience = Math.floor((stored_notifications_data[`xp_${target}_experience`] || 0) * 10) / 10;
    var cur_experience = get_current_experience(is_syndicate, is_career);

    stored_notifications_data[`xp_${target}_experience`] = cur_experience;

    var old_level = (stored_notifications_data[`xp_${target}_level`] * 1) || 0;
    var cur_level = (is_syndicate ? $('.my-syndicates-visual').find('.level dd') :
                     is_career    ? $('th:contains("Career Rank") ~ td')
                                  : $('.level').find('.amount')                   ).text().trim() * 1;
    var level_change = false;

    stored_notifications_data[`xp_${target}_level`] = cur_level;

    if (cur_level !== old_level) {
        if (old_level > 0) {
            level_change = (cur_level - old_level);
        }
    }

    debug(' - GM: cur_experience (' + cur_experience + ') !== old_experience (' + old_experience + ')?');

    var exp_to_new_level;
    if (level_change > 0) {
        exp_to_new_level = diff_values(100, old_experience, 1);
    } else if (level_change < 0) {
        exp_to_new_level = old_experience;  // How much it fell before the level dropped.
    }

    if (cur_experience !== old_experience || level_change) {
        if (old_experience === 0) {
            if (tSM_config.use_brief_notifications) {
                return 'Lvl ' + cur_level + ' @ ' + cur_experience + '% ' + label_brief;
            } else {
                return 'Starting ' + xp_type + ' experience monitor:\nLevel ' + cur_level + ', ' + cur_experience + '% experience.';
            }
        } else {
            var old_level_gain = '';
            if (level_change) {
                if (tSM_config.use_brief_notifications) {
                    if (level_change > 0) {
                        old_level_gain  = '(lvl++) ';
                        cur_experience += 100; // Merge the new level into the new XP, to let us show only one XP increase.
                    } else {
                        old_level_gain  = '(lvl--) ';
                        old_experience += 100; // Merge the old level into the old XP, to let us show only one XP increase.
                    }
                } else {
                    if (level_change > 0) {
                        old_level_gain = ' gone up a level (after ' + exp_to_new_level + '% experience), then ';
                        old_experience = 0; // Reset this, so the math below works.
                    } else {
                        old_level_gain = ' dropped a level (after losing ' + exp_to_new_level + '% experience), then ';
                        old_experience = 100;
                    }
                }
            }

            var experience_gain = diff_values(cur_experience, old_experience, 1);

            if (is_syndicate || is_career) {
                xp_type = 'Your ' + xp_type + ' has';
            } else {
                xp_type = 'You\'ve';
            }

            var is_gain = true;
            if (experience_gain < 0) {
                experience_gain = -1 * experience_gain;
                is_gain = false;
            }
            if (tSM_config.use_brief_notifications) {
                return old_level_gain + (is_gain? '+' : '-') + experience_gain + '% ' + label_brief;
            } else {
                return xp_type + old_level_gain + (is_gain? 'gained ' : 'lost ') + experience_gain + '% experience.';
            }
        }
    }
}

// Takes in boolean values (ignores other true-like values).
// When no args, defaults to player experience.
function get_current_experience(is_syndicate, is_career) {
    var value = (is_syndicate === true ? $('.my-syndicates-overview').find('.exp dd') :
                 is_career    === true ? $('th:contains("Career Experience") ~ td')
                              : $('.experience').find('.amount'));
    value = value.text().replace('%', '').trim();
    value = diff_values(value, 0, 1);

    return value;
}

function diff_values(high_value, low_value, decimal_places) {
    return round_with_sig_digits((high_value - low_value), decimal_places);
}

function round_with_sig_digits(value, decimal_places) {
    var factor = Math.pow(10, decimal_places);
    return Math.round(value * factor) / factor;
}

// We're using a unicode char in place of the credchip icon, so use a variable to minimize the repair work needed after bad file encodings.
var Cr = '₢'; // aka &#x20A2;, (CRUZEIRO SIGN)

function schedule_notify_credits_each_day() {
    var severity = 'info';

    var old_timestamp = stored_notifications_data['daily_credits_timestamp'];
    var old_time;
    if (old_timestamp) {
        old_time = new Date(old_timestamp);
    }

    // Do nothing unless we're on a different day than the last time we issued this notification.
    var cur_time = new Date(Date.now());
    if (old_time && cur_time.getDay() == old_time.getDay()) {
        return;
    }

    var cur_total = get_total_credits();
    if (cur_total === undefined) {
        debug("General Monitor: Warning: Can't find player's current \"total credits\" value! Skipping notification: notify_credits_each_day");
        return;
    }

    var old_total = (stored_notifications_data['daily_credits_total'] * 1) || 0;

    var timespan = '';
    if (old_time) {
        var date_diff = new Date(cur_time.getTime() - old_time.getTime());
        timespan = ' (vs. ';

        // Also, check if over a day/month has passed. (Here's wishing Javascript had separate Date vs. TimeSpan objects.)
        if (date_diff.getMonth() > 0) {
            timespan += date_diff.getMonth() + ' month(s), ';
        }
        // getDate() returns day-of-the-month (1-based, not 0-based).
        if (date_diff.getDate() > 1) {
            timespan += (date_diff.getDate() - 1) + ' days, ';
        }
        timespan += date_diff.getHours() + ' hours ago)';
    }

    var daily_difference = diff_values(cur_total, old_total, 2);
    var message = 'Daily: ' + (daily_difference > 0 ? 'Gained ' : 'Lost ') + daily_difference + Cr + timespan;

    stored_notifications_data['daily_credits_total'] = cur_total;
    stored_notifications_data['daily_credits_timestamp'] = cur_time;
    set_notification(0, message, severity, 'notify_credits_daily');
}

// Temporarily (1 week): Main text was rounded, tooltip had actual amount.
//     retval = $('.credits-' + loc).find('.player-info--amount-container a[data-message]')
//                               .attr("data-message").replace(',', '').replace(' credits', '').trim() * 1 || 0;

function get_total_credits() {
    var retval = undefined;

    // UI-agnostic credits value: Catch the value sent for analytics.
    var gtag_data_credits = $('script[src*="/gtag/"] + script').text().match(/'credits' *: *([0-9.]+)/);
    if (gtag_data_credits.length) {
        retval = gtag_data_credits[1] * 1;
    }

    return retval;
}

function notify_when_credits_increase() {
    if (during_init) {
        console.log(log_prefix + `Monitoring player's Credits (${Cr}) accounts.`);
    }

    var old_credits = undefined;
    var cur_credits = undefined;
    var diff_credits = 0;
    var abs_diff_credits = 0;

    var msgs = [];
    var is_negative = false;

    old_credits = diff_values(stored_notifications_data['credits_total'] * 1, 0, 2) || 0;
    cur_credits = diff_values(get_total_credits(), 0, 2);

    stored_notifications_data['credits_total'] = cur_credits;

    debug(' - GM: total cur_credits (' + cur_credits + ') !== total old_credits (' + old_credits + ')?');

    diff_credits     = diff_values(cur_credits, old_credits, 2);
    abs_diff_credits = Math.abs(diff_credits);

    if (cur_credits !== old_credits) {
        debug(' - GM: diff_credits = ' + diff_credits);

        is_negative = (diff_credits < 0);
        msgs.push((is_negative?   'lost ' : 'gained ') + abs_diff_credits + Cr + ' total (Bank + Wallet)');
    }

    var msg;
    if (tSM_config.use_brief_notifications) {
        var total_change = round_with_sig_digits(diff_credits, 2);
        if (total_change !== 0) {
            msg = (total_change > 0 ? '+' : '') + total_change + Cr;
            return msg;
        }
    } else {
        msg = msgs.join('\n - ');
        if (diff_credits) {
            msg = (is_negative? 'lost ' : 'gained ') + diff_credits + Cr + ' total';
        }

        if (msg) {
            var firstChar = msg.substr(0, 1);
                msg = firstChar.toLocaleUpperCase() + msg.substr(1, msg.length) + '.';
            }

        return msg;
    }
}

function notify_when_bonds_increase() {
    let bonds_node = $('#stats-panel .bonds');
    if (! bonds_node.length) {
        // Bonds not shown; nothing to do here.
        return;
    }

    if (during_init) {
        console.log(log_prefix + 'Monitoring player\'s Bonds account.');
    }

    var old_bonds = stored_notifications_data['bonds'] || 0;
    var cur_bonds = bonds_node.find('.bond-amount').text().replace(',', '').trim() * 1;
    var msg;

    stored_notifications_data['bonds'] = cur_bonds;

    if (cur_bonds !== old_bonds) {
        if (old_bonds !== 0) {
            var bonds_gain = cur_bonds - old_bonds;
            if (tSM_config.use_brief_notifications) {
                msg = (bonds_gain > 0 ? '+' : '') + bonds_gain + ' Bonds';
            } else {
                msg = 'Gained ' + bonds_gain + ' Bonds.';
            }
        }
    }

    return msg;
}

function show_multi_notification(severity, arrMessages) {
    var actualMessages = [];
    for (var index in arrMessages) {
        if (arrMessages[index]) {
            actualMessages.push(arrMessages[index]);
        }
    }

    if (actualMessages.length) {
        var message = 'Info: ' + actualMessages.join('  |  ');

        set_notification(0, message, severity, 'Informational Messages');
    }
}

//Note: Needs "@require https://rawgit.com/taustation-fan/tau-push/master/static/push.min.js"
// Or, from browser's console (for debugging):
//    var jsPush = document.createElement('script'); jsPush.setAttribute('src', 'https://rawgit.com/taustation-fan/tau-push/master/static/push.min.js'); document.getElementsByTagName('head')[0].appendChild(jsPush);
function set_notification(delay, notification_details, severity, notification_key) {
    if (! notification_key) {
        notification_key = "";  // Scratch key, ignored by the rest of the script.
    }

    var cur_notification_timestamp = Date.now() + delay;
    if (notification_key.length && notifications.timestamps[notification_key]) {
        var old_notification_timestamp = notifications.timestamps[notification_key];

        var timestamp_delta = Math.floor(Math.abs(cur_notification_timestamp - old_notification_timestamp) / 1000);
        if (timestamp_delta < tSM_config.reuse_notification_delta) {
            let msg_seconds_diff = (timestamp_delta > 0 ? ` (only ~${timestamp_delta} seconds off)` : '');
            debug(log_prefix + '\'' + notification_key + '\': Reusing close-enough notification at ' + new Date(old_notification_timestamp) + msg_seconds_diff + '.');
            dump_notifications(`Reusing existing notification: ${notification_key}` + msg_seconds_diff);
            return;
        } else {
            // Clear the old notification, since we now know it'll appear too early.
            debug(log_prefix + '\'' + notification_key + '\': Clearing prior notification, since notification now needs to happen at a different time.\n' +
                  '  - Was at: ' + new Date(old_notification_timestamp) + '\n' +
                  '  - Now at: ' + new Date(cur_notification_timestamp) + '.');
            window.clearTimeout(notifications.handles[notification_key]);

            notifications.handles   [notification_key] = undefined;
            notifications.timestamps[notification_key] = undefined;
        }
    }

    let message = (typeof notification_details === 'object' ? notification_details.message : notification_details);

    if (delay > 0) {
        debug(log_prefix + '\'' + notification_key + '\': Scheduled notification at ' + new Date(cur_notification_timestamp) +
              ' (in ' + (delay / 1000) + ' seconds): "' + message.replace(/\n/g, '\n    ') + '"');
    }

    let notification_key_prefix = notification_key.replace(/[@&].*/, '');

    if (Push.Permission.has()) {
        notifications.handles   [notification_key] = window.setTimeout(() => set_notification_helper(notification_details, severity, notification_key), delay);
        notifications.timestamps[notification_key] = cur_notification_timestamp;
        dump_notifications(`Added new notification: ${notification_key}`);

        $('#' + notification_key_prefix + '-checkbox').addClass('tSM-timer-active');
        let badge = $('#gm-scheduled-badge');
        badge.attr('data-badge', (badge.attr('data-badge') * 1) + 1);
        badge.show();
    }
    else {
        // A good fallback, even if it doesn't work on Firefox (which only asks
        // user for permission if this code arose from a user-triggered event).
        Push.Permission.request(
            function () {
                notifications.handles   [notification_key] = window.setTimeout(() => set_notification_helper(notification_details, severity, notification_key), delay);
                notifications.timestamps[notification_key] = cur_notification_timestamp;
                dump_notifications(`Added new notification (and requesting Push permission): ${notification_key}`);

                $('#' + notification_key_prefix + '-checkbox').addClass('tSM-timer-active');
                let badge = $('#gm-scheduled-badge');
                badge.attr('data-badge', (badge.attr('data-badge') * 1) + 1);
                badge.show();
            },
            function () {
                // Show notification (as an alert()), unless we're trying to schedule it far in advance.
                if (delay <= delay_threshold_warning * 1000) {
                    alert('Need notification permissions to send notification.\n' +
                          (delay > 5000 ? 'Attempted to schedule notification in ' + (delay / 1000) + ' seconds:'
                                        : 'Attempted notification:') + '\n\n' +
                          'severity: ' + severity + '\n' + message);
                }
            }
        );
    }
}

function set_notification_helper(notification_details, severity, notification_key) {
    var title = 'Tau Monitor'; // 'Watcher'?
    let message;
    let except_in;

    message = notification_details;
    if (typeof notification_details == 'object') {
        message   = notification_details.message;
        except_in = notification_details.except_in;
    }

    if (except_in && window.location.pathname.startsWith(except_in)) {
        // Notification isn't necessary if we're already in a given location.
        // (E.g.: "Shuttle's leaving, go to Local Shuttles now!", when already in Local Shuttles.)
        return;
    }

    if (severity.length) {
        if (severity === "info") {
            title = '✅ ' + title + ' ✅';
        } else if (severity === "warning" || severity === "warn") {
            title = '⚠️ ' + title + ' ⚠️';
        } else if (severity === 'error') {
            title = '🛑 ' + title + ' 🛑';
        } else if (severity.includes(' ')) {
            title = severity;
        }
    }

    if (tSM_config.also_notify_console) {
        var console_message = "";
        if (severity !== title) {
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

    let badge = $('#gm-scheduled-badge');
    badge.attr('data-badge', (badge.attr('data-badge') * 1) - 1);
    if (badge.attr('data-badge') == '0') {
        badge.hide();
    }

    if (notification_key) {
        // Notification shown; start checking if we need to schedule this notification again.
        notifications[notification_key] = undefined;
        notifications.handles   [notification_key] = undefined;
        notifications.timestamps[notification_key] = undefined;

        // When a notification type has multiple alerts (e.g., shuttle departure vs. arrival),
        // notification_key will be this alert's full unique identifier (e.g, including "&ETD" or "&ETA")
        clear_notification_keys_by_prefix(notification_key);
        save_scheduled_notifications();

        // Also, update the notification's icon to show that it's no longer active -- unless a
        // related key is active -- e.g., ruins (Trouble/Sewers), shuttle (departure/arrival).
        let notification_key_prefix = notification_key.replace(/[@&].*/, '');
        var related_key_is_active = check_if_key_active(notification_key_prefix);
        if (! related_key_is_active) {
            $('#' + notification_key_prefix + '-checkbox').removeClass('tSM-timer-active');
        }
    }
}

function dump_notifications(message) {
    if (! local_config.dump_notifications) {
        return;
    }

    if (message) {
        console.warn(log_prefix + message);
    }
    console.warn(notifications);
}

//
// #endregion Notification: All Stats regenerated to 100%.
//////////////////////////////

//////////////////////////////
// #region Warnings: Experience is nearing a threshold.
//

function warn_when_experience_is_over() {
    var experience_threshold = tSM_config.warn_experience_when_over;
    var cur_experience = get_current_experience();

    // If the experience is at/above the threshold, call attention to it (orange border & "73.4%" text).
    if (cur_experience >= experience_threshold) {
        var exp_node = $('.experience');
        exp_node.css({ 'box-shadow': '0 0 0.1em 0.2em #d76543', 'padding': '0.25em' });
        exp_node.find('.experience-container .amount').css({ 'color': '#d76543' });
    }
}

//
// #endregion Warnings: Experience is nearing a threshold.
//////////////////////////////

function debug(msg) {
    if (local_config.debug) {
        console.log(msg);
    }
}

var css_for_icons_table = `
div#tSM-region {
    display: block;
}

div#tSM-region div:not(#tSM-body) {
    display: inline-block;
    text-align: center;
    vertical-align: middle;
}

div#tSM-region div a * {
    padding: 0.1em;
    max-width: 20em;
    border: 1px solid #13628b;
    margin: 1px;
    cursor: pointer;
}

div#tSM-region div input {
    display: none;
}

div#tSM-region div input + span,
div#tSM-region div input + svg,
div#tSM-region div input + img {
    border: 1px solid #1e517b;
}

div#tSM-region div input:checked + span,
div#tSM-region div input:checked + svg,
div#tSM-region div input:checked + img {
    border-color: #279702;
}

div#tSM-region div input.tSM-timer-active:checked + span,
div#tSM-region div input.tSM-timer-active:checked + svg,
div#tSM-region div input.tSM-timer-active:checked + img {
    border-color: #00c0c0;
    background-color: #004f65;
    color: #ffffff;
}

div#tSM-region div #text,
div#tSM-region div span,
div#tSM-region div svg,
div#tSM-region div img {
    width:  22px;
    height: 22px;
}

div#tSM-region div #text {
    vertical-align: middle;
}

div#tSM-region div span {
    vertical-align: middle;
}

div#tSM-region div svg {
    display: inline-block;
    vertical-align: text-top;
    fill: currentColor;
}

span.tSM-icon {
    padding: 0;
}

/* ('🏚' DERELICT HOUSE BUILDING); no convenient fa icons available for "old buildings". */
span.tSM-ruins:before {
    content: "\\1F3DA";
}

/* ('⛽' FUEL PUMP); no convenient fa icons available for "gas pump". */
span.tSM-refuel:before {
    content: "\\26FD";
}
`;

function report_runtime(func) {
    var start = new Date();
    func();
    var delta = new Date() - start;
    console.log('[Runtime] "' + func.name + '": ' + delta + ' ms');
}

$(document).ready(report_runtime(start_general_monitor));
