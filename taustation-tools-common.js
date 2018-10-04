// ==UserScript==
// @name         taustation-tools-common
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/taustation-tools-common.js
// @version      0.2
// @description  Common code shared by my Tau Station userscripts.
// @author       Mark Schurman (https://github.com/quasidart)
// @match        https://alpha.taustation.space/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.slim.js
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
//

//////////////////////////////
// Begin: User Configuration. These can be configured in the userscripts that import this central script.
//

// Temporarily disable stat tracking while any of the following pages are showing.
var tST_config = {
    'debug': false,

    icons: {
        'show_ui_on_hover':    false,   // True: Shows parent userscript UI when mouse hovers over its icon.
        'hide_ui_after_hover': false    // True: Hides parent userscript UI when mouse leaves its icon. (Requires clicking on icon to interact with script's UI.)
    }
};

//
// End: User Configuration.
//////////////////////////////

$(document).ready(tST_main);

//
// UI variables.
//
var tST_region;         // Container for misc. Tau Station tools' UI.
var tST_icons;          // Container for icons to show/collapse the above tools' UI.
var panes_visible = {}; // Indicates whether each given script's UI pane is visible or not.

var tST_nodes = {};
var player_name;

async function tST_main() {
    add_css_link('https://rawgit.com/taustation-fan/userscripts/master/taustation-tools.css');
    tST_add_base_UI();
}

function tST_add_base_UI() {
    // If tST-region doesn't exist yet, add it.
    tST_region = $("#tST-container");
    if (! tST_region.length) {
        $('.stats-container').before('<div id="tST-container" class="tST-container tST-hidden" style="display: none;">\n</div>\n');
        tST_region = $("#tST-container");
    }

    // Also, add an area where the client scripts can place their icons.
    tST_icons = $('#tST-icons-region');
    if (! tST_icons.length) {
        $('.avatar-links.avatar-messages').before(`<ul id="tST-icons-region" class="avatar-links avatar-messages" style="float: left;">\n</ul>\n`);
        tST_icons = $('#tST-icons-region');
    }
}

////////////////////
// #region Helper methods for icons, used by related scripts during setup.
//

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
        // Get the player's name, to let us store different session data for different player characters.
        if (! player_name) {
            player_name = $('#player-name').text();
            if (player_name.length > 0) {
                // If the user is part of a Syndicate or has VIP, drop the "[foo]" prefix/suffix.
                script_prefix += player_name.replace(/^(\[...\] )?([^[ ]+)( \[...\])?/, '$2') + "_";
            }
        }
        return script_prefix;
    }


    function tST_clear_localStorage_by_key_prefix(key_prefix) {
        for (var item in localStorage) {
            if (item.startsWith(key_prefix)) {
                tST_debug('TauStationTools: Removing localStorage item: ' + item);
                localStorage.removeItem(item);
            }
        }
    }

    function tST_debug(msg) {
        if (tST_config.debug) {
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
            console.log('Copied the following text to the clipboard:\n' + msg);
        }
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
    var hash = 0, i, chr, text;
    if (jq_obj.length === 0) return hash;

    text = jq_obj.text() || "";
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
