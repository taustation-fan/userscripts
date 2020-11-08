// ==UserScript==
// @name         Tau Station Email Helper
// @namespace    http://tampermonkey.net/
// @downloadURL  https://github.com/taustation-fan/userscripts/raw/master/email_helper.user.js
// @version      0.4
// @description  Provides multi-email forwarding functionality to Tau Station email system
// @author       Sergey Kudriavtsev <https://github.com/dot-sent>
// @match        https://taustation.space/email/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @require      https://unpkg.com/turndown/dist/turndown.js
// ==/UserScript==

var localStorageKey = 'emailsToForward';

var turndownService = new TurndownService();

function extractEmailText(emailId) {
    var $emailBody = $('#email-body-' + emailId);
    var $emailHeader = $('#email-' + emailId);
    if ($emailBody.length == 0) { // This is the MAIN/currently opened email in conversation
        $emailBody = $emailHeader.next();
    }
    var emailComponents = [];
    var $emailBodyAuthorComponents = $emailBody.children('.comment-author');
    emailComponents.push($emailHeader.children('.comment-date')[0].innerHTML);
    emailComponents.push($emailHeader.children('.comment-title')[0].innerHTML);
    $emailBodyAuthorComponents.each(function(ix, $emailBodyAuthorComponent) {
        emailComponents.push($emailBodyAuthorComponent.innerHTML);
    });
    emailComponents.push('<p/>'); //extra line break between headers and body
    emailComponents.push($emailBody.children('.comment-body')[0].innerHTML);

    var text = '';
    $.each(emailComponents, function(ix, component) {
        text += turndownService.turndown(component) + '  \r\n';
    })
    return text;
}

function addEmailToLS(emailId) {
    var emails = {};
    if (localStorage.hasOwnProperty(localStorageKey)) {
        emails = JSON.parse(localStorage[localStorageKey]);
    }
    emails[emailId] = extractEmailText(emailId);
    localStorage.setItem(localStorageKey, JSON.stringify(emails));
}

function removeEmailFromLS(emailId) {
    if (localStorage.hasOwnProperty(localStorageKey)) {
        var emails = JSON.parse(localStorage[localStorageKey]);
        delete emails[emailId];
        localStorage.setItem(localStorageKey, JSON.stringify(emails));
    }
}

function isEmailForwarded(emailId) {
    if (localStorage.hasOwnProperty(localStorageKey)) {
        var emails = JSON.parse(localStorage[localStorageKey]);
        return emails.hasOwnProperty(emailId);
    }
    return false;
}

function clearLS() {
    localStorage.setItem(localStorageKey, JSON.stringify({}));
}

function initForwardButton(emailId, forwardStatus){
    var $emailBody = $('#email-body-' + emailId);
    if ($emailBody.length == 0) { // This is the MAIN/currently opened email in conversation
        $emailBody = $('#email-' + emailId).next();
    }
    var $emailButtons = $emailBody.children('.reply-actions');
    var $forwardButton = $emailButtons.find('.btn-forward');
    if (!$forwardButton.length) {
        $emailButtons.prepend('<a href="#" class="btn-control normal btn-forward">' + (forwardStatus ? '&#9745;' : '&#9744;') + ' Forward</a>');
        $forwardButton = $emailButtons.find('.btn-forward');
        $forwardButton.on('click', function(evt){
            evt.preventDefault();
            if (isEmailForwarded(emailId)){
                removeEmailFromLS(emailId);
                evt.target.innerHTML = '&#9744;' + ' Forward';
            } else {
                addEmailToLS(emailId);
                evt.target.innerHTML = '&#9745;' + ' Forward';
            }
        })
    } //TODO: 'else' block?
}

$(document).ready(function() {
    'use strict';

    var emails = {};
    if (localStorage.hasOwnProperty(localStorageKey)) {
        emails = JSON.parse(localStorage[localStorageKey]);
    }

    var $emailElements = $('#email-body button[id^="email-"], #email-body .boxed-main > div[id^="email-"]');
    $.each($emailElements, function(id, emailObj) {
        var emailId = emailObj.id.replace('email-', '');
        initForwardButton(emailId, emails.hasOwnProperty(emailId));
    });

    var $emailComposeButtonsContainer = $('#email .form-action-container, #email .form-submission');
    if ($emailComposeButtonsContainer.length) {
        $emailComposeButtonsContainer.prepend('<a href="#" class="btn-control normal btn-clear-paste-forward">Clear forwards</a> <a href="#" class="btn-control normal btn-paste-forward" style="margin-right: 5px;">Paste emails (' + Object.keys(emails).length + ') to forward</a>');
        $emailComposeButtonsContainer.find('.btn-paste-forward').on('click', function(evt){
            evt.preventDefault();
            var emailKeys = Object.keys(emails).sort();
            $.each(emailKeys, function(ix, key) {
                document.getElementById('message').value += '\r\n---\r\n\r\n' + emails[key];
            })
        });
        $emailComposeButtonsContainer.find('.btn-clear-paste-forward').on('click', function(evt){
            evt.preventDefault();
            clearLS();
        });
    }
});
