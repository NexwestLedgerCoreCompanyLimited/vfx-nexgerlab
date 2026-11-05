# Security

Report vulnerabilities through GitHub private vulnerability reporting on this repository, not in a public issue.

VFX NexgerLab runs offline. Project files are treated as untrusted input, and they never load code. Reports about malformed projects, archives, or images are welcome.

## Supported versions

Only the newest release gets fixes.

## What this app does to stay safe

- The app window has no Node access, runs sandboxed, and blocks network requests.
- The MCP server has no network code, uses a separate folder for each call, and refuses to overwrite files.
- CodeQL, dependency review, secret scanning, and Dependabot run on this repository.
