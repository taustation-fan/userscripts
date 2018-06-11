# Tau Station User Scripts

This is a collection of user scripts for the [Tau Station Text-Based MMORPG](https://taustation.space/).

You need the *Greasemonkey* or *Tampermonkey* extension in your browser to
use them.

Some of the scripts have optional features which you can enable by removing
the comments sign `//` from the start of the line.

# Scripts

## Navigation

`navigation.js` implements the following features:

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

`bank_helper.js` implements a single feature, at the "Bank" area only:

Whenever your credits "on hand" are greater than the amount you'd always like to keep at hand, it'll prefill the "deposit" textbox with the excess cash.

Note that this does *not* automatically deposit the credits. It simply fills the box for you.

## Compact Storage

`compact_storage.js` will merge duplicate items in "CORTECHS" -> "Storage"
listing into a single row and update the quantity column accordingly.

This way, your storage report will take only 2 rows to let you know that
you have 145 Nanowires and 17 Paris Sabres at Yards of Gadani rather than
taking 25 rows to tell you.

## Compact Stats

`compact_stats.js` will make the panel with character stats - both general
numbers like XP, credits etc and the current stats - look much more compact
than by default. This function also adds a counter to the next stats 'tick',
although it starts working only after one 'tick' actually occurs.

## Hide irrelevant career tasks

`hide_tasks.js` will hide all the career tasks from all the "TASKS" tabs
in the game, except for the tasks explicitly listed in the script body.
Use with caution! This scrip requires manual updates to be adjusted to
the current career type and career rank/level of the player. By default it's
configured for high-rank Clone Technician.
