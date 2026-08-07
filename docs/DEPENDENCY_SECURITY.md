# Dependency Security Remediation

A fresh GitHub Actions install on August 6, 2026 reported 54 dependency vulnerabilities: 2 low, 25 moderate, 24 high, and 3 critical.

## Additional compatibility findings

- The application resolves React and React DOM 19.
- TinaCMS 3.7.2 transitively includes packages declaring React 18 peer support.
- Deprecated transitive packages include `glob@10.5.0` and `prebuild-install@7.1.3`.

## Required remediation order

1. Run the dedicated dependency-security workflow and inspect its uploaded `dependency-audit.json` artifact.
2. Trace each critical finding to its direct parent dependency.
3. Upgrade supported parent packages one at a time.
4. Verify whether the latest TinaCMS version explicitly supports React 19; otherwise evaluate a controlled React 18 compatibility branch.
5. Do not use `npm audit fix --force` without reviewing every breaking change.
6. Re-run typecheck, unit tests, content validation, and the production build after each dependency stage.

## Release policy

- Critical production-reachable findings block release.
- High findings require a fix or documented reachability-based risk acceptance.
- Peer-dependency warnings must not be silently ignored for production-tier classification.
