// ==UserScript==
// @name         taustation-tools-common
// @namespace    https://github.com/taustation-fan/userscripts/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/taustation-tools-common.js
// @version      0.1
// @description  Common code shared by my Tau Station userscripts.
// @author       Mark Schurman (https://github.com/quasidart)
// @match        https://alpha.taustation.space/*
// @grant        CC-BY-SA
// @require      https://code.jquery.com/jquery-3.3.1.slim.js
// ==/UserScript==
//
// Disclaimer:
// These are quick-and-dirty one-off scripts, and do not reflect the author's style or quality of work when developing production-ready software.
//

$(document).ready(tST_main);

//
// UI variables.
//
var tST_region; // Container for misc. Tau Station tools' UI.
var player_name;

function tST_main() {
    add_css_link('https://rawgit.com/taustation-fan/userscripts/master/taustation-tools.css');
    tST_add_base_UI();
}

function tST_add_base_UI() {
    // If tST-region doesn't exist yet, add it.
    tST_region = $("#tST-container");
    if (! tST_region.length) {
        $('.stats-container').before('<div id="tST-container" class="tST-container">\n</div>\n');
        tST_region = $("#tST-container");
    }
}


////////////////////
// region Helper methods used by related scripts during setup.
//

    function tST_get_storage_prefix(script_prefix) {
        // Get the player's name, to let us store different session data for different player characters.
        if (! player_name) {
            player_name = $('#player-name').text();
            if (player_name.length > 0) {
                script_prefix += player_name + "_";
            }
        }
        return script_prefix;
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
// endregion Helper methods used by related scripts during setup.
////////////////////

////////////////////
// region Helper methods: Adding new CSS styles to a page, and manipulating large blocks of text.
//

    // Usage:
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

//
// endregion Helper methods: Adding new CSS styles to a page, and manipulating large blocks of text.
////////////////////

////////////////////
// region Helper methods: Interact with GCT-based time from the web page.
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
        return time_str.replace(/[^0-9]/g, "");
    }

    function gct_numeric_to_time(time_value) {
        time_value = time_value.toString();
        time_value = "0000000000".substr(0, 10 - time_value.length) + time_value;
        return time_value.toString().replace(/^([0-9]*)([0-9]{2})([0-9]{2})([0-9]{3})$/g, "$1.$2/$3:$4");
    }
    
    function get_gct_time_delta(time_start, time_end) {
        var time_delta = gct_numeric_to_time(gct_time_to_numeric(time_end) - gct_time_to_numeric(time_start));
        return 'D' + time_delta.replace(/^0*(\.|([1-9][0-9]*\.))/, '$2')
                               .replace(/^0*(\/|([1-9][0-9]*\/))/, '$1');
    }
    
//
// endregion Helper methods: Interact with GCT-based time from the web page.
////////////////////

////////////////////
// region Helper methods: Download data to a local file.
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
// endregion Helper methods: Download data to a local file.
////////////////////
