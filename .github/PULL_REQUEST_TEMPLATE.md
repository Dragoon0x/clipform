## What this changes

<!-- A short summary. Link to an issue if relevant. -->

## Why

<!-- The motivation. What problem does this solve, or what does it enable? -->

## How

<!-- Notes on the implementation. Anything tricky? Any decisions worth flagging? -->

## Checklist

- [ ] `node --check code.js` passes
- [ ] `grep -n '\\.\\.\\.' code.js` is empty (no spread in sandbox JS — the Figma plugin VM rejects it)
- [ ] UI scripts parse via `vm.createScript` (see CONTRIBUTING.md for the one-liner)
- [ ] Reloaded the plugin in Figma and the feature works end-to-end
- [ ] If a new sandbox API is used, manifest `permissions` / `networkAccess.allowedDomains` updated
- [ ] If a new feature is user-visible, README updated
- [ ] CHANGELOG entry added (under an `Unreleased` heading if there isn't one)
