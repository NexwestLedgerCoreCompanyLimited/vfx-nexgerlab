#!/bin/sh
# Runs the Electron tests. Electron cannot start inside the coding sandbox, so run this in a normal terminal.
npx electron-vite build > .superpowers/e2e.log 2>&1 && npx playwright test --reporter=line "$@" >> .superpowers/e2e.log 2>&1
echo "E2E_DONE $?"
