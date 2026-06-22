# Security Remediation: Exposed API Keys

> Incident record. **Contains no key values by design.** Do not paste real
> credentials into this file or any tracked file.

## What happened
API keys were committed to version control in plaintext (originally via a
`SECURITY_REMEDIATION.md` that embedded live values, and — per the original
report — a `.env.local` in a related project). Anything ever pushed to a remote
must be treated as permanently compromised.

## Status in THIS repository (`Full-Stack-Assets/nextgengear.cc`)
- `.env.local` was **never committed** here (`git log --all --full-history -- .env.local` returns nothing).
- `.env.local` is correctly listed in `.gitignore`; only `.env.example` (placeholders) is tracked.
- The previous version of this file contained plaintext keys and remains in
  pre-removal git history (initial commit) until history is rewritten or the
  keys are rotated.

## Required action — ROTATE FIRST (only this truly fixes it)
Revoke and reissue every exposed credential. File/branch/history cleanup is
secondary and does **not** neutralize a key that was already pushed.

| Credential | Revoke at |
|---|---|
| Groq API key | https://console.groq.com/keys |
| Brave Search API key | https://api.search.brave.com/app/keys |
| Pexels API key | https://www.pexels.com/api/ |
| GitHub PAT | https://github.com/settings/tokens |
| `CRON_SECRET` | regenerate: `openssl rand -hex 32`, then update the deploy env |

After rotating, update the new values in your deployment environment
(Vercel/Cloudflare) and your local `.env.local` only — never a tracked file.

## Optional history cleanup (after rotation)
If you still want the old values gone from git history, rewrite it on this repo:

```bash
pip3 install git-filter-repo
git filter-repo --path SECURITY_REMEDIATION.md --invert-paths   # purge old versions
# then force-push; coordinate with anyone who has clones/forks
```

This is destructive and rewrites shared history — do it deliberately, and only
after the keys are rotated.

## Prevention
- Keep `.env.local` in `.gitignore` (already done). Never commit real secrets.
- Use `.env.example` placeholders only.
- Add a pre-commit secret scanner (gitleaks / trufflehog) and enable GitHub
  secret scanning + push protection on the repo.
