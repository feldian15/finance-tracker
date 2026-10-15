# Reviewable Heuristic Duplicates

**Status**: accepted

Heuristic duplicate detection will import the transaction and mark it `Needs Review` instead of discarding it. The existing heuristic—matching account, date, amount, and normalized description—will remain unchanged for Plaid and CSV imports. Exact repeats of an existing Plaid transaction ID will continue to be suppressed. Flagged transactions remain included in balances and reports, appear on the existing transactions page with a filter, and require explicit **Mark correct** confirmation to clear the marker; editing alone does not clear it, and deletion hard-deletes it. Existing transactions start with the marker cleared, and manual transactions are outside this workflow.

The decision preserves potentially valid transactions after Plaid’s sync cursor advances while keeping the existing duplicate-detection behavior and avoiding a separate review queue or import-history model. Multiple matching CSV imports remain separate flagged transactions by design.
