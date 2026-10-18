const { spawn } = require("node:child_process");
const path = require("node:path");

const MAX_STDERR_CHARACTERS = 8192;
const CONFIG_NAMES = new Set(["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"]);

function publicFailureReason(stderr) {
  const prefix = "Post-deploy syndication failed: ";
  const message = stderr.split(/\r?\n/).findLast((line) => line.startsWith(prefix));
  const detail = message ? message.slice(prefix.length) : "";
  const missing = /^Missing required syndication configuration:\s*(.*)$/.exec(detail);
  if (missing) {
    const names = missing[1].split(",").map((name) => name.trim());
    if (names.length && names.every((name) => CONFIG_NAMES.has(name))) {
      return `Missing required syndication configuration: ${names.join(", ")}.`;
    }
    return "Required website syndication configuration is missing.";
  }
  if (detail === "Missing GitHub configuration") {
    return "Required website syndication configuration is missing.";
  }
  const http = /^(?:(?:Failed to list posts for syndication: )?Failed to (?:list posts|fetch [^\r\n]+)|Lease (?:publish|confirm) update failed for [^\r\n]+) \(status ([1-5]\d{2})\)$/.exec(detail);
  if (http) {
    return `The GitHub writeback request failed (HTTP ${http[1]}).`;
  }
  if (/^Failed to scan local post [^\r\n]+:/.test(detail)) {
    return "A website blog post could not be read or parsed.";
  }
  if (/\b(?:ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|ERR_PACKAGE_PATH_NOT_EXPORTED|ERR_PACKAGE_IMPORT_NOT_DEFINED|ERR_UNKNOWN_FILE_EXTENSION|ERR_REQUIRE_ESM)\b/.test(stderr)) {
    return "A required website announcement dependency could not be loaded.";
  }
  if (/\b(?:TimeoutError|ETIMEDOUT|ESOCKETTIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT|AbortError)\b/.test(stderr)) {
    return "A website announcement request timed out.";
  }
  if (/^(?:Failed to list posts for syndication: )?fetch failed$/.test(detail)
      || /\b(?:ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ENETUNREACH|EHOSTUNREACH)\b/.test(stderr)) {
    return "The website announcement process could not reach a required service.";
  }
  if (/^(?:Failed to list posts for syndication: )?fetch is not defined$/.test(detail)) {
    return "The website announcement runtime does not provide fetch.";
  }
  if (/\b(?:ENOENT|EACCES|EPERM|EISDIR|ENOTDIR)\b/.test(stderr)) {
    return "A website announcement input file could not be read.";
  }
  if (/^(?:YAMLException|SyntaxError):/m.test(stderr)) {
    return "The website announcement process encountered a parsing error.";
  }
  if (/^(?:Failed to list posts for syndication: )?(?:Unexpected token |Unexpected end of JSON input)/.test(detail)) {
    return "The website announcement process encountered a parsing error.";
  }
  if (/^(?:ReferenceError|TypeError|RangeError|EvalError|URIError):/m.test(stderr)) {
    return "The website announcement process encountered a JavaScript runtime error.";
  }
  return "";
}

function runSyndicationScript(scriptPath) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    const child = spawn(process.execPath, [scriptPath], {
      env: process.env,
      stdio: ["inherit", "inherit", "pipe"],
    });

    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      stderr = (stderr + chunk.toString()).slice(-MAX_STDERR_CHARACTERS);
    });

    child.on("error", () => {
      reject(new Error("Post-deploy syndication script could not start."));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const exit = Number.isInteger(code)
        ? `Post-deploy syndication script exited with code ${code}.`
        : "Post-deploy syndication script did not complete.";
      const reason = publicFailureReason(stderr);
      reject(new Error(reason ? `${exit} ${reason}` : exit));
    });
  });
}

module.exports = {
  onSuccess: async () => {
    const scriptPath = path.resolve(
      process.cwd(),
      "netlify/post-deploy/run-syndication.js",
    );
    await runSyndicationScript(scriptPath);
  },
};
