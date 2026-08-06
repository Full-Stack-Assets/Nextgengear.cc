# Automated Content Rollback

If a generated-content pull request causes a production defect after merge:

1. Identify the merge commit for the content pull request.
2. Revert that merge commit in a new pull request.
3. Require the normal typecheck, content validation, tests, build, and preview checks.
4. Merge the revert after validation.
5. Preserve the failed generated files and workflow logs for root-cause analysis.
6. Add a deterministic regression test before re-enabling the affected generator behavior.

Do not repair production by force-pushing or deleting history.
