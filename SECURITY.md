# Security policy

## Status

Clipform is **experimental, pre-1.0** software. See [DISCLAIMER.md](DISCLAIMER.md) for the full set of caveats. This security policy describes how to report issues, **not** any guarantee of response, timeline, or fix.

## Supported versions

Only the **latest** release on `main` is considered for security reports. Older tags receive no security updates of any kind.

| Version | Supported |
|---|---|
| Latest `main` / latest release | Best-effort, no SLA |
| Any older tag | No |

## Reporting a vulnerability

If you believe you have found a security issue, **do not open a public GitHub issue**.

Please instead use GitHub's private vulnerability reporting:

1. Go to https://github.com/Dragoon0x/clipform/security/advisories
2. Click **Report a vulnerability**
3. Fill in the form

If that is unavailable for any reason, open a regular issue titled `Security: please contact me privately` with no details, and the author will reach out via the email associated with your GitHub account.

## What's in scope

Only issues in the source code of this repository:

- `manifest.json`
- `code.js`
- `ui.html`

## What's out of scope

Reports about the following will be closed without action:

- The Figma plugin sandbox itself — report those to Figma
- Transformers.js, ONNX Runtime, CLIP weights, or other third-party code loaded at runtime — report to the upstream maintainer
- The `images.weserv.nl` proxy — report to its maintainers
- OpenAI's API — report to OpenAI
- Your own OpenAI API key being charged because you pasted it into a third-party Figma plugin — see DISCLAIMER §5
- Any issue requiring a Figma feature, file structure, or configuration the plugin does not itself create

## No bug bounty

There is no bounty, financial reward, or compensation of any kind for security reports.

## After a report

The author may, at their sole discretion and on no timeline:

- Acknowledge the report
- Fix the issue
- Publish a security advisory
- Credit the reporter in release notes (only if requested)
- Or ignore the report entirely

By submitting a report you grant the author permission to use the information in it as needed to remediate the issue, including referencing it in commit messages, release notes, or public advisories.
