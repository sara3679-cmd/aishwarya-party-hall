# One-click GoDaddy publishing from VS Code

## First-time setup

1. Create a GoDaddy Personal Access Token with these Node.js Hosting scopes:
   - `hosting.paas.apps:read`
   - `hosting.paas.code:write`
   - `hosting.paas.deploy:execute`
2. Copy `.env.godaddy.example` to `.env.godaddy.local`.
3. Paste the token after `GODADDY_PAT=` in `.env.godaddy.local`.

The private `.env.godaddy.local` file is excluded from Git. Never send or commit the token.

## Publish from VS Code

1. Open **Terminal → Run Task**.
2. Select **GoDaddy: Publish Live (one click)**.
3. Review the successful Preview build.
4. Type `PUBLISH` when the terminal asks for final live-publish confirmation.

The task synchronizes the current UI code into the GoDaddy application copy, runs a production build, creates a small ZIP without `node_modules`, uploads it to Preview, and publishes it to the live domain after confirmation.

To update Preview without changing the public website, run **GoDaddy: Upload Preview Only**.
