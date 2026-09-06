import { readFileSync, writeFileSync } from "node:fs";

const LOCKFILE = "package-lock.json";
const PUBLIC_REGISTRY = "https://registry.npmjs.org/";

// This repository is public, so the lockfile must not name the private registry
// proxy an internal machine installs through. Every tarball URL is rewritten to
// the same package path on the public registry; the integrity hashes cover the
// tarball contents, not its host, so they stay valid.
const TARBALL_URL = /("resolved": ")https?:\/\/[^"]*?\/((?:@[^/"]+\/)?[^/"]+\/-\/[^"]+)"/g;

const before = readFileSync(LOCKFILE, "utf8");
const after = before.replace(TARBALL_URL, `$1${PUBLIC_REGISTRY}$2"`);

if (after === before) process.exit(0);

writeFileSync(LOCKFILE, after);
console.log(`${LOCKFILE}: rewrote tarball URLs to ${PUBLIC_REGISTRY}`);
