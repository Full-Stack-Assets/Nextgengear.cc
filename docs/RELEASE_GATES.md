# Release Gates

A production content release is eligible to merge only when all of the following are true:

- The generated files are visible in a pull request.
- `npm run typecheck` passes.
- `npm run validate:content` reports no invalid posts.
- The complete test suite passes.
- `npm run build` succeeds for the full site.
- The preview deployment renders the changed posts correctly.
- Sources, affiliate claims, images, and disclosures were reviewed.
- The change does not duplicate an existing topic or materially reduce content quality.

A failed gate must leave `main` and the production deployment unchanged.
