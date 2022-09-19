# Tau Station User Scripts

This is a collection of user scripts for the [Tau Station Text-Based MMORPG](https://taustation.space/).

You need the *Greasemonkey* or *Tampermonkey* extension in your browser to
use them.

Some of the scripts have optional features which you can enable by removing
the comments sign `//` from the start of the line.

## New UI

As Tau Station is being actively updated with new UI, most of these scripts are currently broken.
We are working on fixing them but they may break again as the UI changes. Sorry for the inconvenience.

Scripts working as of 2022-09-18:

* Navigation: Links to sub-areas only (note that Bar and Lounge have been removed as user requests)
* Linkify Item Names: Wilds area only during Syndicate Campaigns

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

## Stim Stat Icons

`stim-stat-icons.user.js` overlays icons on all stims, to let you understand at a glance
what each stim does. You can also see what each icon means, by hovering your mouse over
an icon. Here's an example screenshot:

![Stims with overlaid icons](https://cdn.discordapp.com/attachments/674746680826003476/674747104924663828/unknown.png)

The player can glance at them, and immediately know that:

 1. Stims #1 & #6 are not safe to use. (This character is Tier 4; Stim #1 is one Tier
    below them _(somewhat more toxic)_, while Stim #6 is higher than their Tier _(much more toxic)_.)

 2. Stims #2 & #3 recover the most stat points; Stims #1, #4, and #5 recover the least.

 3. If they need to recover, say, Agility (runner icon) and Intelligence (lightbulb),
    they should use Stim #3.
     - Physical stats use the icons from Tau Station's Gym page; Intelligence shows a
       lightbulb, and Social uses a person (silhouette).
     - The stat icons use the same color scheme that the Stim images use to indicate
       the stats they affect. This is also the same color scheme used when training stats.
       _(The one exception is Intelligence, where its training pages use a different color than Stims use.)_

4. They may want to sell the Stims in slot #4 (and maybe #5), since their effects are
    covered better by other stims.

## Combat Safeguard

`combat-safeguard.user.js` prevents you from entering combat if focus or stats are too low,
as that would have a high chance of landing you in sickbay immediately.
If your focus or any physical stat is below the limits (configurable in User Preferences),
the "Attack" button(s) will be modified to show a taunt instead of entering combat.
The safeguard applies to campaign combat, enter the sewers, look for trouble, and PvP.

## Automated Popup Dismisser

`automated_popup_dismisser.user.js` just dismisses any pop-up screen in the game within 
500 milliseconds after opening. This has been tested with stopping/starting career,
starting/finishing repair and personal ship travel popups; if there is a popup that is
not closed automatically by this script, please let Dotsent know. Also, this script is
the simplest possible, thus it just repeats the search for a dimissal button every 500ms,
which is likely processor-inefficient and might slow the browser down on some devices.

## General Monitor

Your computer can proactively alert you (sound & popup) when you have new email.
`general_monitor.user.js` can make your computer proactively alert you when your
Tau Station stats have refilled, your ship arrives at a station, your Look for
Trouble cooldown has finished, or for miscellaneous other events that show global
or in-room timers. It can also show notifications when information changes -- for
example, showing how much Experience and/or Credits you've gained since the last
time you entered a safe area (or other specific rooms, or "any time it happens").

This script adds a "💬" icon near the top of the page (or "💤" if a different tab is
managing notifications); clicking the icon unhides a small UI box (see below),
showing which notifications have pending alerts. This UI lets you enable/disable the
different kinds of notifications, see which ones have pending alerts, and can show
what time an alert is scheduled to appear (on mouse-hover / tap-and-hold); you can
also have this tab "Take Control" of managing alerts, if another tab had control.
This script also uses the Preferences page, for more detailed config options.

![General Monitor's icon & UI](https://cdn.discordapp.com/attachments/710900084086145166/710963735996399616/unknown.png)

One caveat: Notifications won't appear if the browser has been unloaded from
memory. This isn't an issue on desktop computers, but is something that
happens on Android & iOS devices when they (eventually) reclaim memory by
suspending background apps.
