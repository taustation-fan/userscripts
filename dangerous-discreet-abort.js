// ==UserScript==
// @name     Dangerous Discreet Abort
// @version  0.1
// @description  More obvious 'Abort' link in Discreet work
// @author       Jan Hovancik <jan@hovancik.net>
// @match        https://alpha.taustation.space/area/discreet-work*
// @grant        GM_addStyle
// ==/UserScript==

// When accepting Discreet Work, this script makes "Abort" button more "danger-like" as
// default state is positive action colored and often leads to accidental Abort.

add_css(`
  .discreet-work #discreet-work > a.btn-control.normal {
    background-color: #d76543;
  }
  .discreet-work #discreet-work > a.btn-control.normal:not([disabled]):not([aria-disabled]):hover {
    background-color: #f26c4f;
  }
`);


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
