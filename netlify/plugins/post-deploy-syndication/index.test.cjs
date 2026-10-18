const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "index.cjs"), "utf8");

function plugin() {
  const child = new EventEmitter();
  child.stderr = new EventEmitter();
  const writes = [];
  const calls = [];
  const context = {
    require: (name) => name === "node:child_process"
      ? { spawn: (...args) => { calls.push(args); return child; } }
      : require(name),
    module: { exports: {} },
    process: {
      execPath: process.execPath,
      env: { PRIVATE_TEST_VALUE: "not-for-public-output" },
      cwd: () => path.resolve(__dirname, "../../.."),
      stderr: { write: (chunk) => writes.push(chunk) },
    },
  };
  vm.runInNewContext(source, context, { filename: "index.cjs" });
  return { hook: context.module.exports.onSuccess, child, writes, calls };
}

async function failedMessage(stderr, code = 1) {
  const instance = plugin();
  const result = instance.hook();
  instance.child.stderr.emit("data", Buffer.from(stderr));
  instance.child.emit("close", code);
  let message;
  await assert.rejects(result, (error) => { message = error.message; return true; });
  return { ...instance, message };
}

test("keeps the production hook and inherits existing environment and output", async () => {
  const instance = plugin();
  const result = instance.hook();
  instance.child.emit("close", 0);
  await result;
  assert.equal(instance.calls.length, 1);
  const [executable, args, options] = instance.calls[0];
  assert.equal(executable, process.execPath);
  assert.equal(args[0], path.resolve(__dirname, "../../post-deploy/run-syndication.js"));
  assert.equal(options.env.PRIVATE_TEST_VALUE, "not-for-public-output");
  assert.deepEqual(Array.from(options.stdio), ["inherit", "inherit", "pipe"]);
});

test("publishes missing configuration names without configuration values", async () => {
  const raw = "Post-deploy syndication failed: Missing required syndication configuration: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO\n";
  const { message, writes } = await failedMessage(raw);
  assert.equal(message, "Post-deploy syndication script exited with code 1. Missing required syndication configuration: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO.");
  assert.equal(Buffer.concat(writes).toString(), raw);
});

test("rejects unrecognized configuration text from public failure details", async () => {
  const { message } = await failedMessage("Post-deploy syndication failed: Missing required syndication configuration: GITHUB_TOKEN=private-key, https://user:token@example.test/?key=secret\n");
  assert.match(message, /Required website syndication configuration is missing/);
  for (const value of ["private-key", "token", "secret", "example.test"]) {
    assert.ok(!message.includes(value));
  }
});

test("reports GitHub HTTP status without the request path or credentials", async () => {
  for (const detail of [
    "Failed to list posts for syndication: Failed to list posts (status 403)",
    "Failed to list posts for syndication: Failed to fetch private/path?token=secret (status 404)",
  ]) {
    const { message } = await failedMessage(`Post-deploy syndication failed: ${detail}\n`);
    assert.match(message, /GitHub writeback request failed \(HTTP 40[34]\)/);
    assert.ok(!message.includes("private"));
    assert.ok(!message.includes("secret"));
  }
});

test("reports post parse failures without file contents or paths", async () => {
  const { message } = await failedMessage("Post-deploy syndication failed: Failed to scan local post private-name.md: secret contents\n");
  assert.match(message, /blog post could not be read or parsed/);
  assert.ok(!message.includes("private-name"));
  assert.ok(!message.includes("secret"));
});

test("reports a syntax category without source lines and arbitrary stderr", async () => {
  const { message } = await failedMessage("private source line\nSyntaxError: secret details\nprivate stack\n");
  assert.match(message, /encountered a parsing error/);
  assert.ok(!message.includes("private"));
  assert.ok(!message.includes("secret"));
});

test("does not reflect arbitrary child errors into public metadata", async () => {
  const { message } = await failedMessage("Post-deploy syndication failed: https://user:password@example.test/?token=secret\nprivate stack\n");
  assert.equal(message, "Post-deploy syndication script exited with code 1.");
});

test("captures only a bounded stderr tail while retaining original build output", async () => {
  const raw = "Post-deploy syndication failed: Missing required syndication configuration: GITHUB_TOKEN\n" + "x".repeat(16384);
  const { message, writes } = await failedMessage(raw);
  assert.equal(message, "Post-deploy syndication script exited with code 1.");
  assert.equal(Buffer.concat(writes).toString(), raw);
});

test("keeps useful diagnostics after large earlier stderr and split chunks", async () => {
  const instance = plugin();
  const result = instance.hook();
  instance.child.stderr.emit("data", Buffer.from("x".repeat(16384) + "\nPost-deploy syndication failed: Missing required syndication "));
  instance.child.stderr.emit("data", Buffer.from("configuration: GITHUB_TOKEN\n"));
  instance.child.emit("close", 1);
  await assert.rejects(result, /Missing required syndication configuration: GITHUB_TOKEN/);
});

test("process startup and signal failures retain no private error details", async () => {
  const instance = plugin();
  const result = instance.hook();
  instance.child.emit("error", new Error("private startup path"));
  await assert.rejects(result, { message: "Post-deploy syndication script could not start." });
  const { message } = await failedMessage("private signal state", null);
  assert.equal(message, "Post-deploy syndication script did not complete.");
});
