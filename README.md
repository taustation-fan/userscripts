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
