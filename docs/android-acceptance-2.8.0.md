# Mój Bilans 2.8.0 — Android acceptance checklist

**Environment:** https://durart.github.io/moj-bilans/preview/  
**Production:** https://durart.github.io/moj-bilans/ (do not modify)  
**PR:** https://github.com/durart/moj-bilans/pull/23 (draft)

## Before starting
- [ ] Open preview on Android Chrome; verify TEST/preview banner and version 2.8.0.
- [ ] Make a JSON backup of existing preview data before changing or clearing anything.
- [ ] Never clear production app storage, uninstall production PWA or import test data into production.

## Core smoke test
- [ ] Add a product and recipe, mark each as favorite, then reload; confirm persistence.
- [ ] Add a meal, edit and delete it; verify calories and B/T/W update.
- [ ] Add 250 ml water, then undo; confirm total and count.
- [ ] Change daily goals and save; confirm values persist after restart.
- [ ] Add weight and circumference measurement; verify history and trend.

## Backup and data safety
- [ ] Export preview backup; inspect that JSON file downloads successfully.
- [ ] Import a valid backup into **preview only** and verify counts and representative entries.
- [ ] Try invalid JSON; confirm rejection without deleting existing data.
- [ ] Restore the previously exported backup; verify meals, recipes, favorites, measurements and settings.
- [ ] If available, restore a known-good 2.7.1 backup into preview and verify backward compatibility.

## Offline and Service Worker
- [ ] Load preview online and wait for the page to settle.
- [ ] Turn on airplane mode; reopen installed preview or reload the preview tab; confirm the UI loads.
- [ ] Offline: open diary, products, history and settings; verify previously stored data is available.
- [ ] Restore connectivity; reload and confirm data is still present.
- [ ] After a future staging update, close all preview tabs, reopen, confirm the new build activates and old preview cache is retired.
- [ ] Verify the **production** app still opens and its local data is unchanged.

## Sign-off
- Android/browser version:
- Tested preview commit SHA:
- Date:
- Passed:
- Failed (include steps and screenshots):
- Decision: ACCEPT / REJECT / NEEDS FIXES

**Release gate:** CI green on the final commit, staging live-preview green, this checklist completed, and explicit owner approval. Do not merge PR #23 without authorization.
