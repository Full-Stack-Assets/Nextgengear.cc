# Security Policy

## Reporting a vulnerability

Please do not open a public issue for suspected vulnerabilities. Report the affected component, reproduction steps, impact, and any proposed mitigation directly to the repository owner through a private GitHub security advisory when available.

## Automated content safety

Generated content is untrusted until it passes schema validation, MDX compilation, the test suite, and a complete production build. Automation must not push generated content directly to the production branch.

## Secrets

API keys and deployment credentials must be stored in GitHub Actions or hosting-platform secret stores. They must never be committed to the repository, included in generated content, or exposed to pull requests from untrusted forks.
