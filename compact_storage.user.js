// ==UserScript==
// @name         taustation_compact_storage
// @namespace    https://github.com/taustation-fan/userscripts/raw/master/compact_storage.js
// @version      1.0
// @author       Dean Serenevy <dean@serenevy.net>
// @license      CC0 - https://creativecommons.org/publicdomain/zero/1.0/
// @description  Merge duplicate items in "CORTECHS" -> "Storage" listing into a single row
// @match        https://alpha.taustation.space/coretechs/storage
// @grant        none
// ==/UserScript==

// Merge duplicate items in "CORTECHS" -> "Storage" listing into a single row.
(function() {
    'use strict';

    if (window.location.href.endsWith("/coretechs/storage")) {
        var table = document.querySelector('.content-section > table');

        var last_qtd;
        var last_row = ['',NaN];
        table.querySelectorAll("tr").forEach(
            function(tr, idx, rs) {
                var this_qtd;
                var this_row = ['',NaN];

                // Extract current row key and quantity
                tr.querySelectorAll("td").forEach(
                    function(td, i, r) {
                        if (i < 3) {
                            // key is first three columns: star, station, item name
                            this_row[0] += ";;;" + td.textContent;
                        } else if (i == 3) {
                            // last column is quantity
                            this_qtd = td;
                            this_row[1] = parseInt(td.textContent, 10);
                        }
                    }
                );

                if (!isNaN(last_row[1]) && !isNaN(this_row[1])) {
                    // If star, station, and item all same, combine with previous row
                    if (this_row[0] === last_row[0]) {
                        last_row[1] += this_row[1];
                        last_qtd.textContent = last_row[1]
                        tr.remove();
                        return; // Don't update last_*
                    }
                }

                // This else block optional: it hides all empty storage units
                else if (isNaN(this_row[1]) && idx > 0) {
                    tr.remove();
                }

                last_qtd = this_qtd;
                last_row = this_row;
            }
        );
    }
})();
