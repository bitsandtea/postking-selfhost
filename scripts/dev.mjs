// `pnpm dev` / `pnpm dev:https` — runs `next dev` (with `--https` →
// `--experimental-https`) and makes Node trust the local mkcert CA, so
// POSTKING_API_URL can point at a PostKing dev server running over https
// (its `dev:https`): that certificate is signed by mkcert's root CA, which
// Node's fetch rejects by default (SELF_SIGNED_CERT_IN_CHAIN). Any other
// args (e.g. `-p 3001`) pass straight through to `next dev`.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function mkcertRootCa() {
  const candidates = [
    process.env.CAROOT,
    join(homedir(), "Library", "Application Support", "mkcert"),
    join(homedir(), ".local", "share", "mkcert"),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "mkcert"),
  ].filter(Boolean);
  for (const dir of candidates) {
    const pem = join(dir, "rootCA.pem");
    if (existsSync(pem)) return pem;
  }
  return null;
}

const env = { ...process.env };
const ca = mkcertRootCa();
if (ca && !env.NODE_EXTRA_CA_CERTS) env.NODE_EXTRA_CA_CERTS = ca;
if (!ca) {
  console.warn(
    "[dev] mkcert root CA not found — https calls to a local PostKing may fail with a certificate error."
  );
}

const args = process.argv.slice(2);
const https = args.includes("--https");
const nextArgs = ["dev", ...(https ? ["--experimental-https"] : []), ...args.filter((a) => a !== "--https")];
const child = spawn("next", nextArgs, {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 0));
