#!/usr/bin/env bash
# Railpack/Nixpacks entrypoint — run the compiled Node.js server
set -e

node dist/server.js
