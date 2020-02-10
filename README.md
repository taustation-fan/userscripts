# Tau Station User Scripts

This is a collection of user scripts for the [Tau Station Text-Based MMORPG](https://taustation.space/).

You need the *Greasemonkey* or *Tampermonkey* extension in your browser to
use them.

Some of the scripts have optional features which you can enable by removing
the comments sign `//` from the start of the line.

# Scripts

## Navigation

`navigation.user.js` implements the following features:

* Adds navigation links to sub-areas (for example: Storage, Public Market and Vendors below *Market*)
* Optionally removes buttons that let you spend bonds without confirmation dialogs
* Option to expand the Chat window
* Shows discreet work counters

## Track Character Stats

`stats_tracker.user.js` implements the following features:

* Tracks character's stats in the background, and writes to stat-specific logs as each stat regenerates.
* Detects & reports buffs currently applicable to the character.
   * Until Genotype, VIP status, etc. are known, it discreetly asks the user to navigate to the [character details](https://alpha.taustation.space/) page to collect that information.
   * Note: In progress: Detect relevant character skills (e.g., `Healthcare 2`).
* Provides simple UI to let the user a) enable/disable stat tracking temporarily, b) copy collected logs to the clipboard, c) clear logs collected so far, and d) remove all session data associated with this userscript.

## Tau Station Bank Helper

`bank_helper.user.js` implements a single feature, at the "Bank" area only:

Whenever your credits "on hand" are greater than the amount you'd always like to keep at hand, it'll prefill the "deposit" textbox with the excess cash.

Note that this does *not* automatically deposit the credits. It simply fills the box for you.

## Compact Stats

`compact_stats.user.js` will make the panel with character stats - both general
numbers like XP, credits etc and the current stats - look much more compact
than by default. This function also adds a counter to the next stats 'tick',
although it starts working only after one 'tick' actually occurs.

## Hide irrelevant career tasks

`hide_tasks.user.js` will hide the career tasks from all the "TASKS" tabs
in the game according to your preferences. This script shows the new button 
"Edit task visibility" on each career page - it allows you to quickly reconfigure
which tasks you want to hide and see what is their current difficulty. 


   _(Note: This script uses localStorage to store the preferences, so they will be 
   browser-specific and the script might not work in browsers that don't support
   localStorage properly._

## Combat Log

`combat-log.user.js` saves any combat-related activity to a log, pruning it
to present the same information in a more concise manner. A simple UI is
provided, to Show/Hide the Combat Log window (similar to the Chat window)
or Clear the log. The Combat Log window also provides a Download button
to save the log to a local file on your computer.

   _(Note: The Combat Log script works well in Chrome, and in 
   ["Firefox for Android"](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_for_Android),
   but currently needs work to collect cleaner logs when run in native Firefox._

## Icon bar

`icon_bar.user.js` adds some icons to the icon bar (next to email,
settings, ...). Set any icons you don't want to empty string "" in the
configuration section. Script includes Control-h and Control-s keyboard
shortcuts and CSS tweaks to reduce padding around icons so that they all
fit.

* ICON_HOTEL: Bed icon, go to hotel room (needs two clicks)
* ICON_SHIP: Spaceship icon, go to ship (needs two clicks, and must set to your ship's serial number!)
* ICON_WELL_FED: Fork and Knife icon, displayed if currently "Well-Fed" (hides well-fed banner until you hover or click on icon)

## Discreet Helper

`discreet_helper.user.js` automatically converts mission locations (Inn, Ruins,
Gym, etc.) into clickable links that lead directly to that location's
"People" tab
clickable links

## Discreet Keyboard Navigation

`discreet_keyboard_navigation.user.js` adds a keyboard shortcut (control-d)
and optional icon (useful for mobile) to perform discreet work steps.
Parses the page to jump to the correct station areas and talk to the right
people. Adds configuration options to the in-game User Preferences page.

## Dangerous Discreet Abort

When accepting Discreet Work, this script (`dangerous-discreet-work.js`) makes "Abort" button more "danger-like" as default state is positive action colored and often leads to accidental Abort.

## Storage Tracker

`storage-tracker.user.js` augments the Public Market to show which items you
already own. First visit "Coretechs > Storage" to store all your items into
your browser's persistent localStorage. Then when you view
"Market > Public Market", each listing includes the quantity you already own.
Hover your mouse over the quantity to view on which stations your items are
stored. Remember to revisit "Coretechs > Storage" after storing any new items.

## Verbose Inventory

`verbose-inventory.user.js` will cause full item names to be shown in the
player's inventory & storage space. It also widens the spacing between rows
(where necessary), to make room for the extra text.

## Stim Summary in Item Names

`stim-summary-in-item-name.user.js` will update each visible Stim name to include
both the stats it affects and the percentage boost it would add (based on your
max stat values & your level in the relevant Medical Stim skills). When a Stim's
details pane is shown, this also shows the effective toxicity (based on its tier,
your tier, and the aforementioned skill levels). It can also optionally show full
item names in the inventory & Storage pages, so that you can see what each Stim
does without having to click on any of them. (This script incorporates all of
`verbose-inventory.user.js`; you only need one script or the other, not both.)

   _(Note: The old, deprecated name for this userscript was `describe-stims.user.js`;
   if you have that version installed, please uninstall it & reinstall the userscript
   using its new file name.)_

## Show Next Regeneration Tick

`next-regen-tick.user.js`: The game shows countdown timers for each stat until
full regeneration. But when is the _next_ regeneration tick due? This displays
the duration in units. It will only be updated on mouseclick.

## Linkify Item Names

`linkify-item-names.user.js` updates item names to be a link to that item's info
page ("/item/_[item-name]_"). It affects item names when looking at another player's
info ("/character/details/_[character-name]_"), and during Syndicate Campaigns
(in the opponents list, and in the final loot summary when the Campaign is finished).
In the Syndicate Campaigns opponents list, it will also show a summary of the damage
/ defense types for opponents' equipment.

## Email helper

`email_helper.user.js` adds "Forward" toggle buttons to the email reading interface.
Clicking Forward adds the email contents to the localStorage, ready for forwarding,
clicking it once again removes the email from localStorage. The script also adds two
new buttons to the email compose interface - one of them clears all the emails from
the localStorage, while the other one pastes all the emails from localStorage to the
current message window, after the existing text. The script utilizes [turndown library](https://github.com/domchristie/turndown)
to convert the emails to their Markdown code and preserve the look and feel as much
as possible.
