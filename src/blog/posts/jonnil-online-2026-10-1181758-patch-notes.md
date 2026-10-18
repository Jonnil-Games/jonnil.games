---
title: "Jonnil Online 2026.10.1181758 Patch Notes"
date: "2026-10-18"
author: "Jonnil"
excerpt: "Jonnil Online 2026.10.1181758: Find community pages and the studio website in Information > Links using a mouse, keyboard or controller."
categories:
  - "JonnilOnline"
  - "Changelog"
syndicate:
  - "bluesky"
syndication:
  discord: "https://discord.com/"
syndicationStatus:
  bluesky: "requested"
  discord: "confirmed"
syndicationRequestedAt:
  bluesky: "2026-10-18T18:24:56.471Z"
syndicationLastError:
  bluesky: "publish-status-400"
---

## Added
- Find community pages and the studio website in Information > Links using a mouse, keyboard or controller.
- Set button text and background colors separately in Options > Appearance. Choose Button Text or Button Background, preview your changes, then select Apply to save.
- The stamp library remembers your selected stamp between sessions.

## Changed
- The interface font now supports Japanese kana and more punctuation and symbols.
- Character artwork imports require a .png filename and a static PNG sprite sheet. Animated PNGs are rejected. Web imports also require a non-empty file no larger than 256 KiB, exported with interlacing off.
- Reopening the stamp library refreshes added or removed PNG files. Category tabs are hidden when no built-in stamps are available.

## Fixed
- Balls now bounce off painted walls, including when pushed by a player.
- Character imports and multiplayer artwork transfers reject damaged or incomplete PNGs before saving them. If you see a checksum error, export the image again.
- If saved character artwork is missing, character selection uses available artwork or asks you to import or create some. Character and pet menus hide Copy Current and Edit Current when artwork is missing.
- Browser text now uses the requested size and colors without WebGL.
- Switching stamp categories keeps the selected stamp in the visible category, or clears the selection if that category is empty.
- Saving a custom stamp while viewing Built-in now switches to Custom and selects the saved stamp.
- Stamps whose images fail to load are hidden from the library.

<!-- release-id: 51bdf9a0933bdad2b47ca6aabd026cce06fb2af7b44acf6f85573b28c56b4497 -->
