import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const projectName = `dubbl-ui-test-${process.pid}`;
const composeFile = "docker-compose.ui-test.yml";

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited ${signal ?? `with code ${code}`}`));
    });
  });
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not allocate a port for the isolated UI test database");
  }
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

const port = await availablePort();
const databaseUrl = `postgresql://dubbl_ui_test:dubbl_ui_test@127.0.0.1:${port}/dubbl_ui_test`;
const testEnv = {
  ...process.env,
  UI_TEST_DB_PORT: String(port),
  DATABASE_URL: databaseUrl,
  AUTH_SECRET: "dubbl-ui-test-only-secret",
  AUTH_TRUST_HOST: "true",
  AUTH_URL: "http://127.0.0.1:3100",
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
  REGISTRATION_MODE: "open",
};
const composeArgs = ["compose", "--project-name", projectName, "-f", composeFile];
let dockerDatabaseStarted = false;
let localDataDir;

function dockerIsAvailable() {
  return spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;
}

function localPostgresIsAvailable() {
  return ["initdb", "pg_ctl", "createdb"].every(
    (command) => spawnSync("which", [command], { stdio: "ignore" }).status === 0,
  );
}

async function startLocalPostgres() {
  localDataDir = await mkdtemp(path.join(os.tmpdir(), "dubbl-ui-test-pg-"));
  await run("initdb", [
    "--pgdata", localDataDir,
    "--username", "dubbl_ui_test",
    "--no-locale",
    "--encoding", "UTF8",
    "--auth-local", "trust",
    "--auth-host", "trust",
  ], testEnv);
  await run("pg_ctl", [
    "--pgdata", localDataDir,
    "--options", `-h 127.0.0.1 -p ${port} -F`,
    "--log", path.join(localDataDir, "postgres.log"),
    "--wait", "start",
  ], testEnv);
  await run("createdb", ["--host", "127.0.0.1", "--port", String(port), "--username", "dubbl_ui_test", "dubbl_ui_test"], testEnv);
}

async function stopLocalPostgres() {
  if (!localDataDir) return;
  try {
    await run("pg_ctl", ["--pgdata", localDataDir, "--mode", "immediate", "stop"], testEnv);
  } finally {
    await rm(localDataDir, { recursive: true, force: true });
  }
}

try {
  if (dockerIsAvailable()) {
    dockerDatabaseStarted = true;
    await run("docker", [...composeArgs, "up", "--detach", "--wait", "postgres"], testEnv);
  } else if (localPostgresIsAvailable()) {
    await startLocalPostgres();
  } else {
    throw new Error("Start Docker Desktop or install PostgreSQL server tools (initdb, pg_ctl, createdb) to run the isolated UI suite.");
  }
  await run("pnpm", ["db:migrate"], testEnv);
  await run("pnpm", ["exec", "tsx", "lib/db/seed.ts"], testEnv);
  await run("node", ["scripts/prepare-ui-test-db.mjs"], testEnv);
  await run("pnpm", ["exec", "playwright", "test"], testEnv);
} catch (error) {
  console.error("UI suite setup or browser checks failed. It uses an ephemeral demo database and a separate app server on port 3100.");
  process.exitCode = 1;
  console.error(error);
} finally {
  if (dockerDatabaseStarted) {
    try {
      await run("docker", [...composeArgs, "down", "--volumes", "--remove-orphans"], testEnv);
    } catch (error) {
      process.exitCode = 1;
      console.error("Could not remove the isolated UI test database container:", error);
    }
  }
  try {
    await stopLocalPostgres();
  } catch (error) {
    process.exitCode = 1;
    console.error("Could not stop and remove the isolated UI test database:", error);
  }
}
