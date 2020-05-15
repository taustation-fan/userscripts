// ==UserScript==
// @name         taustation-tools-common
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/taustation-tools-common.js
// @version      0.4.1
// @description  Common code shared by Tau Station userscripts.
// @author       Mark Schurman (https://github.com/quasidart)
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==
//
// License: CC-BY-SA
//
// Disclaimer:
// These are quick-and-dirty one-off scripts, and do not reflect the author's style or quality of work when developing production-ready software.
//
// Changelist:
//  - v0.1: Initial commit.
//  - v0.2: New: Icons for client scripts (clicking icon shows/hides each script's UI)
//  - v0.3: Plays better with icon_bar userscript, and supports combat page's new stripped-down UI (non-combat UI items now absent).
//  - v0.4: Pulls player name from Combat UI when needed (since it lacks the sidebar), and moved icons to underneath GCT display (always present).
//  - v0.4.1: More adaptable placement of scripts' UI.

//////////////////////////////
// Begin: User Configuration. These can be configured in the userscripts that import this central script.
//

// Temporarily disable stat tracking while any of the following pages are showing.
var tST_config = {
    'debug':         localStorage.tST_debug         || false,
    'debug_verbose': localStorage.tST_debug_verbose || false,     // Used for react_when_updated() / MutationObserver logging -- noisy enough to warrant controlling separately.

    icons: {
        'show_ui_on_hover':    false,   // True: Shows parent userscript UI when mouse hovers over its icon.
        'hide_ui_after_hover': false    // True: Hides parent userscript UI when mouse leaves its icon. (Requires clicking on icon to interact with script's UI.)
    }
};

//
// End: User Configuration.
//////////////////////////////

var is_firefox = (navigator.userAgent.toLowerCase().indexOf('firefox') > -1);

//
// UI variables.
//
var tST_region;         // Container for misc. Tau Station tools' UI.
var tST_icons;          // Container for icons to show/collapse the above tools' UI.
var panes_visible = {}; // Indicates whether each given script's UI pane is visible or not.

var tST_nodes = {};
var player_name;

var log_prefix = 'TauStation Tools (common): ';

function tST_main() {
    add_css_link('https://rawgit.com/taustation-fan/userscripts/master/taustation-tools.css');
    tST_add_base_UI();
}

function tST_add_base_UI() {
    let container_target;
    var new_ui;

    // Add an area where the client scripts can place their UI panes.
    tST_region = $("#tST-container");
    if (! tST_region.length) {
        container_target = get_parent_for_ui();

        new_ui = '<div id="tST-container" class="tST-container tST-hidden" style="display: none;">\n</div>\n';

        if (container_target.length) {
            container_target.prepend(new_ui);
        } else {
            console.log(log_prefix + 'Warning: No container for scripts\' UI, and couldn\'t find ideal spot to put it. Will insert it at the top of the page body.' )
            $('body').prepend(new_ui);
        }

        tST_region = $("#tST-container");
    }

    // Add an area where the client scripts can place their icons. By default,
    // add it to the GCT display in the banner. However, if that's hidden by
    // a userscript, move it to the top of the player stats.
    let target;
    tST_icons = $('#tST-icons-region');
    if (! tST_icons.length) {
        let banner_is_hidden = false;

        new_ui = $('<ul id="tST-icons-region">\n</ul>\n');

        let gct_in_banner = $('.banner, .coordinated-time, .time-container');
        if (gct_in_banner.length) {
            banner_is_hidden = !! gct_in_banner.filter(function() { return (this.style.display === 'none'); }).length;
            if (! banner_is_hidden) {
                // Set up notifiers, to tell us if we need to move the icons region to keep it visible.
                react_when_updated(gct_in_banner,
                                   function (mutation) { return mutation.target.style.display === 'none'; },
                                   function () {
                                       move_icons_to_sidebar();   
                                   },
                                   { attributes: true, attributeFilter: [ 'style' ] },
                                   5); // 5 seconds (in case of a long-running userscript before us).

                target = $('.time-container');
            }
        }
   
        if (target.length) {
            let timer_width = target.css('width');
            timer_width = (timer_width ? 'width:' + timer_width + ';' : '');

            // This uses "position:absolute;" to avoid shifting the page content
            // downwards; add the area's current width so we can still center it.
            new_ui.attr('style', 'z-index:1; display:flex; padding:0;\n' +
                                '    justify-content:center; position:absolute; ' + timer_width + '"');

            target.parent().addClass('tST-icons-adjustment');
            target.append(new_ui);
        } else {
            // Put it above our script UI's container, if we found a suitable location earlier.
            if (container_target.length) {
                move_icons_to_sidebar(new_ui);
            } else {
                console.log(log_prefix + 'Warning: No container for scripts\' icons, and couldn\'t find ideal spot to put it. Will insert it at the top of the page body.' )
                $('body').prepend(new_ui);
            }
        }

        tST_icons = $('#tST-icons-region');
    }
}

function get_parent_for_ui() {
    let target = $('.side-bar');
    if (! target.length) { target = $('.stats-container'); }
    // Combat screen doesn't have a stats container, but does still have a sidebar.
    if (! target.length) { target = $('.combat-sidebar'); }
    if (! target.length) { target = $('#content-container'); }

    return target;
}

// Place (or move) the icons UI region atop the stats container, to keep it visible.
function move_icons_to_sidebar(icons_ui) {
    if (! icons_ui || ! icons_ui.length) {
        icons_ui = $('#tST-icons-region');
    }

    let sidebar = get_parent_for_ui();
    if (sidebar.length) {
        // First: Check if we're placing it, or moving an already-placed node.
        if (icons_ui.parent().length) {
            icons_ui = icons_ui.detach();
            icons_ui.removeAttr('style');   // Its display-under-GCT styles aren't applicable any more.
        }

        // Next: Apply new styles, and [re-]attach it to the page.
        icons_ui.attr('style', 'display:flex; padding-left:0; justify-content:space-evenly;');
        sidebar.prepend(icons_ui);
    }
}

////////////////////
// #region Helper methods for icons, used by related scripts during setup.
//

    function tST_add_UI_pane(ui_html) {
        if (tST_region && tST_region.length) {
            tST_region.append(ui_html);
        }
    }

    function tST_add_icon(icon_id, script_pane_id, icon_html) {
        tST_add_icon_in_container(icon_id, script_pane_id, '#tST-container', icon_html);
    }

    function tST_add_icon_in_container(icon_id, script_pane_id, script_pane_container, icon_html) {
        tST_icons.append(icon_html);
        tST_nodes[icon_id] = tST_icons.find(icon_id);
        tST_nodes[icon_id].css({ 'max-width': 30, 'max-height': 30 });

        expand_collapse_pane(panes_visible[icon_id], icon_id, script_pane_id, script_pane_container, true);
        tST_nodes[icon_id].click(function() {
            panes_visible[icon_id] = ! panes_visible[icon_id];
            expand_collapse_pane(panes_visible[icon_id], icon_id, script_pane_id, script_pane_container, true);
        });

        tST_nodes[icon_id].hover(
            function() {
                if (tST_config.icons.show_ui_on_hover) {
                    panes_visible[icon_id] = true;
                    expand_collapse_pane(true,
                                         icon_id, script_pane_id, script_pane_container,
                                         ! tST_config.icons.hide_ui_after_hover);
                }
            },
            function() {
                if (tST_config.icons.hide_ui_after_hover) {
                    panes_visible[icon_id] = ! panes_visible[icon_id];
                    expand_collapse_pane(panes_visible[icon_id],
                                         icon_id, script_pane_id, script_pane_container,
                                         ! tST_config.icons.show_ui_on_hover);
                }
            } );
    }

    function expand_collapse_pane(show_pane, icon_id, region_name, container_name, should_update_tooltip) {
        if (! container_name) {
            container_name = '#tST-container';
        }

        if (show_pane) {
            tST_nodes[icon_id].addClass('tST-icon-link--showing-window');
            if (should_update_tooltip) {
                update_icon_title(icon_id, 'Click icon to hide pane below.');
            }

            $(container_name).removeClass('tST-hidden');
            $(container_name).show();

            $(region_name).removeClass('tST-hidden');
            $(region_name).show();
        } else {
            if (should_update_tooltip) {
                update_icon_title(icon_id, 'Click icon to use pane below.');
            }

            $(region_name).addClass('tST-hidden');
            $(region_name).hide();

            $(icon_id).removeClass('tST-icon-link--showing-window');

            if (! any_panes_visible(container_name)) {
                $(container_name).addClass('tST-hidden');
                $(container_name).hide();
            }
        }
    }

    function update_icon_title(icon_id, title_suffix) {
        var title = tST_nodes[icon_id].attr('title') + ' ';
        var prefix_len = title.indexOf(':') + 1;
        tST_nodes[icon_id].attr('title', title.substr(0, prefix_len) + ' ' + title_suffix);
    }

    function any_panes_visible(container_name) {
        // Refresh this list, if we can.
        if (container_name) {
            $(container_name + " > div[id$='-region']").each(function() {
                panes_visible[this.id] = ! $(this).hasClass('tST-hidden');
            });
        }

        var any_visible = false;
        for (var key in panes_visible) {
            any_visible |= panes_visible[key];
        }

        return any_visible;
    }

//
// #endregion Helper methods for icons, used by related scripts during setup.
////////////////////

////////////////////
// #region Helper methods used by related scripts during setup.
//

    function tST_get_storage_prefix(script_prefix) {
        // Get the player's name from the sidebar, to let us store different session data for different player characters.
        // (Note: Multiple characters per person are against the game's ToS; however, one computer might be used by
        //  different people (e.g., family members) for different characters.)
        if (! player_name) {
            player_name = $('#player-name').text();
        }

        if (! player_name) {
            // If in combat, we have to pull this from the Combat UI (since it lacks the sidebar).
            player_name = $('.combat-player--name:first').text().replace(/^(You |Player )/, '');
        }
        if (player_name.length > 0) {
            // If the user is part of a Syndicate or has VIP, drop the "[foo]" prefix/suffix.
            script_prefix += player_name.replace(/^(\[...\] )?([^[ ]+)( \[...\])?/, '$2').trim() + "_";
        }
        return script_prefix;
    }


    function tST_clear_localStorage_by_key_prefix(key_prefix) {
        for (var item in localStorage) {
            if (item.startsWith(key_prefix)) {
                tST_debug(log_prefix + 'Removing localStorage item: ' + item);
                localStorage.removeItem(item);
            }
        }
    }

    function tST_debug(msg) {
        if (tST_config.debug) {
            console.log(msg);
        }
    }

    function tST_debug_verbose(msg) {
        if (tST_config.debug_verbose) {
            console.log(msg);
        }
    }

    // Note: This works for form <input id="foo" value="copied text" /> elements,
    //       but does not work for arbitrary HTML elements.
    function copy_to_clipboard(idElement, hide_alert) {
        // Ref: https://www.w3schools.com/howto/howto_js_copy_clipboard.asp
        var element = document.getElementById(idElement);
        element.select();
        document.execCommand("copy");

        var msg = element.value;
        if (msg.length > 203) {
            msg = msg.substr(0, msg.indexOf('\n', 200) + 1) + '...';
        }

        if (! hide_alert) {
            console.log(log_prefix + 'Copied the following text to the clipboard:\n' + msg);
        }
    }

    // Trigger a handler when nodes of interest are updated. For details about the datatypes
    // named below, see: https://dom.spec.whatwg.org/#interface-mutationobserver
    //
    // Parameters:
    //  - jQuery      A valid jQuery object (collection of matching nodes) to be monitored.
    //                If the collection is empty (no nodes matched the jQuery selector), this function exits cleanly.
    //  - filter      A function(MutationRecord) {...} block that returns True for changes we're interested in.
    //  - Fn_of_node  A function(Node) {...} block to run against each matching DOM Node.
    //                (Note: The function's input parameter is a DOM Node, not a jQuery-wrapped node.)
    //  - config      [Optional] A MutationObserverInit object listing the types of mutations to observe.
    //                (For legal values, search the web for MutationObserverInit / "mutation observer options".)
    //                Default: { childList: true, subtree: true }
    //  - timeout     [Optional] Maximum time (in seconds) to wait between updates; resets when a matching update is detected.
    //                If this timeout expires without detecting a matching update, the code will stop detecting changes.
    //                Default: No timeout -- does not stop monitoring for updates.
    //
    // Example usage:
    //     // When the page's "People" tab is shown, add links to all item names in its table.
    //     react_when_updated(
    //             // We want to monitor the "People" tab area of this page.
    //             $('.tab-content-people'),
    //
    //             // Filter: Ignore all changes, unless the affected node is a <tbody>.
    //             function (mutation) { return mutation.target.nodeName.toLowerCase() == 'tbody'; },
    //
    //             // Run the following code against each matching <tbody> DOM Node.
    //             function (DOM_node) {
    //                 // For a) each item field that b) does not contain "None", linkify the item name.
    //                 $($DOM_node).find('td:not(:first-of-type):not(:contains("None"))').each(function () {
    //                     linkify_equipment_element(this);
    //                 });
    //             },
    //
    //             // Detect updates to the "People" tab's direct children & descendants.
    //             { childList: true, subtree: true },
    //
    //             // We only need to process changes when the "People" tab is first shown; after that, no further changes occur.
    //             2); // 2 seconds (a little extra time).
    //     }
    //
    function react_when_updated(jQuery, filter, Fn_of_node, config, timer) {
        if (! jQuery.length) {
            return;
        }

        // Make sure only one script instance adds this observer.
        let key = 'observer_' + (Fn_of_node ? getHashForString(Fn_of_node.toString()) : getHashForJQueryObject(jQuery));
        let nonce = String(Math.random() * 0x0FFFFFFFFFFFFFFF);

        if (jQuery.attr(key)) {
            tST_debug(log_prefix + 'Another userscript is already setting up this observer.');
            if (Fn_of_node) {
                tST_debug_verbose(Fn_of_node);
            } else {
                tST_debug_verbose(jQuery);
            }
            return;
        }

        jQuery.attr(key, nonce); // Otherwise, set this, and set up the observer, but _don't_ attach the observer unless our value is still present (below).

        if (timer != undefined) {
            timer *= 1000; // Convert to milliseconds.
        }

        // Options for the observer (which mutations to observe)
        if (! config) {
            config = { childList: true, subtree: true };
        }

        var stop_timer = undefined;

        // Callback function to execute when mutations are observed
        var callback = function(mutationsList, cbObserver) {
            tST_debug_verbose(log_prefix + 'Processing mutationsList:');

            for (var mutation of mutationsList) {
                tST_debug_verbose(log_prefix + ' - Saw mutation:'); tST_debug_verbose(mutation);

                if (mutation.target && (filter == undefined || filter(mutation))) {
                    tST_debug_verbose(log_prefix + '    - Filter: matched.');
                    if (timer != undefined && stop_timer) {
                        window.clearTimeout(stop_timer);
                        stop_timer = undefined;
                    }

                    // Call the provided function on all applicable nodes.
                    let processed_added = false;
                    let processed_target = false;

                    if (config.childList || config.subtree) {
                        mutation.addedNodes.forEach(function (node) {
                            Fn_of_node(node);
                        });
                        processed_added = true;
                    }

                    if (config.attributes || config.characterData) {
                        Fn_of_node(mutation.target);
                        processed_target = true;
                    }

                    if (! processed_added && ! processed_target) {
                        tST_debug(log_prefix + 'Warning: Caught wanted observation, but didn\'t process any nodes! Please verify values being provided to react_when_updated()\'s "config" parameter.')
                    }

                    if (timer != undefined) {
                        stop_timer = window.setTimeout(() => stop_reacting_to_updates(cbObserver), timer);
                    }
                } else {
                    tST_debug_verbose(log_prefix + '    - Filter: Didn\'t match.');
                }
            }
        };

        // Create an observer instance linked to the callback function
        var observer = new MutationObserver(callback);

        if (timer != undefined) {
            stop_timer = window.setTimeout(() => stop_reacting_to_updates(observer), timer);
        }

        // Make sure we still "own" attaching this observer.
        if (jQuery.attr(key) === nonce) {
            // Start observing the target node for configured mutations.
            jQuery.each(function () { observer.observe(this, config); });
        } else {
            tST_debug(log_prefix + 'Another userscript owns setting up this observer; bowing out in favor of it.');
        }
    }

    function stop_reacting_to_updates(observer) {
        observer.disconnect();
        tST_debug_verbose(log_prefix + 'Disconnected MutationObserver.');
    }

//
// #endregion Helper methods used by related scripts during setup.
////////////////////

////////////////////
// #region Helper methods: Adding new CSS styles to a page, and manipulating large blocks of text.
//

    // Usage: (mainly for older browsers, before `multi-line string` was added to ES/JS)
    //     var stringValue = block_to_string(function() {/*
    //[...large block of text to be imported as a single string...]
    //     */});
    function block_to_string(block) {
        // Ref: https://stackoverflow.com/questions/805107/creating-multiline-strings-in-javascript/805755#805755
        return block.toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1];
    }

    function add_css_link(css_link){
        // Ref: https://stackoverflow.com/questions/3922139/add-css-to-head-with-javascript
        var head = document.getElementsByTagName('head')[0];
        var s = document.createElement('link');
        s.setAttribute('rel',  'stylesheet');
        s.setAttribute('type', 'text/css');
        s.setAttribute('href', css_link);
        head.appendChild(s);
    }

    function tST_add_css(css){
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

//
// #endregion Helper methods: Adding new CSS styles to a page, and manipulating large blocks of text.
////////////////////

////////////////////
// #region Helper methods: Interact with GCT-based time from the web page.
//

    function get_gct_time(node) {
        return (node || $('#gct_display')).text().replace(/[A-Za-z]/g, "");
    }

    function get_gct_time_as_html(node) {
        return (node || $('#gct_display'))[0].outerHTML;
    }

    function get_gct_time_for_filename(node) {
        return get_gct_time().replace('/', '_').replace(':', '.');
    }

    function get_gct_time_as_numeric(node) {
        return gct_time_to_numeric(get_gct_time(node));
    }

    function gct_time_to_numeric(time_str) {
        return time_str.replace(/[^0-9]/g, "") * 1;
    }

    function gct_numeric_to_time(time_value) {
        time_value   = time_value.toString();
        var len_time = time_value.length;
        time_value   = ('0000000000' + time_value).substr(-10);

        if (len_time > 5) {
            // Large GCT value: Show full format. (e.g., "199.69/81:946")
            return time_value.toString().replace(/^([0-9]*)([0-9]{2})([0-9]{2})([0-9]{3})$/g, "$1.$2/$3:$4");
        } else {
            // Large GCT value: Show >1-day format. (e.g., "/81:946")
            return time_value.toString().replace(/^0*(\d{2})(\d{3})$/g, "/$1:$2");
        }
    }

    function get_gct_time_delta(time_start, time_end) {
        var time_delta = gct_numeric_to_time(gct_time_to_numeric(time_end) - gct_time_to_numeric(time_start));
        return 'D' + time_delta.replace(/^0*(\.|([1-9][0-9]*\.))/, '$2')
                               .replace(/^0*(\/|([1-9][0-9]*\/))/, '$1');
    }

    //
// #endregion Helper methods: Interact with GCT-based time from the web page.
////////////////////

////////////////////
// #region Helper methods: Download data to a local file.
//

    function download_page_to_file() {
        var output_html = document.documentElement.outerHTML;
        var filename = get_gct_time_for_filename() + '-' + document.URL.replace(':', ';').replace('/', "-").replace('?', '¿');
        download_to_file(output_html, filename, 'text/html');
    }

    function download_html_to_file(html_data, filename, append_timestamp) {
        // Reuse TauStation's central CSS file. (This way, we link to the current
        // version of the file -- e.g., '.../main.css?=41'.)
        var css_ref = $('head > link[href^="/static/css/main.css"]').clone();
        css_ref.attr('href', document.location.origin + css_ref.attr('href'));

        var output_html = '<html>\n<head>\n' +
                        (css_ref.length ? css_ref[0].outerHTML + '\n'
                                        : '<!-- No original CSS - this won\'t display well. -->\n') +
                        '<style text="text/css">\n.tST-hidden {\ndisplay: none;\n}\n</style>\n' +
                        '</head>\n' +
                        '<body style="max-width: 500px; margin-left: 1em;">\n' +
                        html_data +
                        '\n</body>\n</html>\n';
        if (append_timestamp) {
            filename += '-' + get_gct_time_for_filename();
        }
        download_to_file(output_html, filename, 'text/html');
    }

    function download_data_to_file(raw_data, filename, append_timestamp) {
        if (append_timestamp) {
            filename += '-' + get_gct_time_for_filename();
        }
        download_to_file(raw_data, filename, 'application/json');
    }

    // Function to download data to a file.
    // Ref: https://stackoverflow.com/questions/13405129/javascript-create-and-save-file
    function download_to_file(data, filename, type) {
        // If a file extension was not provided, use mime-type suffix as a basic guess.
        if (filename.replace(/\.[A-Za-z]+$/, '') == filename) {
            filename += '.' + type.substr(type.indexOf('/') + 1);
        }

        var file = new Blob([data], {type: type});
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var a = document.createElement("a"),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

//
// #endregion Helper methods: Download data to a local file.
////////////////////

////////////////////
// #region Helper methods: Simplify jQuery code.
//

// Option for .filter(...): Return only pure-text nodes. (Allows getting only "Foo-text" child node from "<foo> Foo-text <bar>bar-text</bar> </foo>".)
function text_nodes_only() {
    return (this.nodeName == "#text");
}

// Computes a simple hash value for a string. 
// Ref: https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
function getHashForJQueryObject(jq_obj) {
    var text;

    if (jq_obj.length !== 0) {
        text = jq_obj.text() || "";
    }

    return getHashForString(text);
}

function getHashForString(text) {
    var hash = 0, i, chr;

    if (! text) {
        return hash;
    }

    // Remove newlines; also, remove any timers from the text, so the hash results in a consistent value.
    text = text.replace(/\r?\n/g, '').replace(/D[0-9]*\.?[0-9]*\/[0-9]+:[0-9]+/g, '');

    for (i = 0; i < text.length; i++) {
        chr   = text.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

//
// #endregion Helper methods: Simplify jQuery code.
////////////////////

$(document).ready(tST_main);