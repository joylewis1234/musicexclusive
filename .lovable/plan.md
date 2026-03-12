
Objective: find and restore the last known-good Live version (before the black-screen publish issue).

What I can do in this mode: guide precisely.  
What you need to do in the editor: perform the restore/publish click steps.

Plan:

1) Identify the likely “good window”
- In chat/history, locate the first message where black screen was reported.
- Mark versions just before that timestamp as first restore candidates.

2) Open Version History
- Desktop: click the clock icon (top navigation) or Plus (+) → History.
- Mobile: switch to Preview mode, then tap clock icon (bottom-left) or (…) → History.

3) Restore candidate versions (newest to oldest)
- Start with the newest version before the first black-screen report.
- Click that version → Restore/Revert.
- Publish using Update in the publish dialog.
- If still broken, repeat with the next older candidate.

4) Verify each restore properly (required)
- Open the published URL in a private/incognito tab.
- Hard refresh once.
- Confirm page renders (not black), styles load, and interactive JS works.
- Also verify on mobile viewport once (the issue may differ by cache/device).

5) Lock in the recovered baseline
- Once a good version is found, keep that restored state as your baseline.
- Then re-apply only safe, minimal changes in small increments, publishing after each.

If no historical version works:
- That indicates a platform publish pipeline issue, not app code.
- Share support: project ID, published URL, and the exact version IDs/timestamps you tested.
