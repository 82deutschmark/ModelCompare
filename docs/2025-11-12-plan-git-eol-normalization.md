# Plan: Git EOL Normalization and Index Cleanup

- Date: 2025-11-12 19:21
- Goal: Prevent CRLF/LF churn (especially `package-lock.json`) and clean the index so only real changes appear.

## Context
- `features` is up-to-date with `origin/features` and 92 commits ahead of `origin/main`.
- Hundreds of files showed as modified because they were staged previously; `git diff` showed nothing (working tree vs index), indicating index-only changes.
- `package-lock.json` had a full-file diff, but ignoring whitespace showed no semantic change — classic EOL normalization noise on Windows.

## Actions
1. Add minimal `.gitattributes` to enforce LF for `package-lock.json` and avoid future lockfile churn.
2. Unstage and restore working tree to discard index-only/whitespace changes.
3. Commit `.gitattributes` and changelog entry documenting the change.

## Verification Steps
- `git status` should show a clean working tree after reset/restore and commit.
- Subsequent changes to `package-lock.json` should only reflect real dependency updates.

## Notes
- No code or dependency changes were introduced.
- This is a repository hygiene/configuration change; CHANGELOG updated as [1.0.1].

