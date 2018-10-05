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

## Compact Storage

`compact_storage.user.js` will merge duplicate items in "CORTECHS" -> "Storage"
listing into a single row and update the quantity column accordingly.

This way, your storage report will take only 2 rows to let you know that
you have 145 Nanowires and 17 Paris Sabres at Yards of Gadani rather than
taking 25 rows to tell you.

## Compact Stats

`compact_stats.user.js` will make the panel with character stats - both general
numbers like XP, credits etc and the current stats - look much more compact
than by default. This function also adds a counter to the next stats 'tick',
although it starts working only after one 'tick' actually occurs.

## Hide irrelevant career tasks

`hide_tasks.user.js` will hide all the career tasks from all the "TASKS" tabs
in the game, except for the tasks explicitly listed in the script body.
Use with caution! This script requires manual updates to be adjusted to
the current career type and career rank/level of the player. By default it's
configured for high-rank Clone Technician.imp

## Combat Log

`combat-log.user.js` saves any combat-related activity to a log, pruning it
to present the same information in a more concise manner. A simple UI is
provided, to Show/Hide the Combat Log window (similar to the Chat window)
or Clear the log. The Combat Log window also provides a Download button
to save the log to a local file on your computer.

## Icon bar

`icon_bar.user.js` adds some icons to the icon bar (next to email, settings,
...). Comment out any icons you don't want in the `INSTALL` function.
Script includes CSS tweaks to reduce padding around buttons so that more
fit, adjust if desired.

* button_well_fed: Fork and Knife icon, displayed if currently "Well-Fed" (hides well-fed banner until you hover or click on icon)
* button_goto_hotel: Bed icon, go to hotel room (needs two clicks)
* button_goto_ship: Spaceship icon, go to ship (needs two clicks, and must set to your ship's serial number!)

## Discreet Helper

`discreet_helper.user.js` automatically converts mission locations (Inn, Ruins,
Gym, etc.) into clickable links that lead directly to that location's
"People" tab
clickable links

## Storage Tracker

`storage-tracker.user.js` augments the Public Market to show which items you
already own. First visit "Coretechs > Storage" to store all your items into
your browser's persistent localStorage. Then when you view
"Market > Public Marker", each listing includes the quantity you already own.
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
