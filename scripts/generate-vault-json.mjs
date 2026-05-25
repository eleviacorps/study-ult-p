import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { getVault } = require("../src/lib/vault-parser.ts");

// Use a require hook or just use tsx... actually this is tricky.
// Instead, let's use the API directly from a small Node script.
