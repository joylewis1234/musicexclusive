import "dotenv/config";
import { access, mkdir } from "fs/promises";
import path from "path";
import { chromium, type FullConfig } from "@playwright/test";
import {
  loginAdmin,
  loginArtist,
  loginFan,
  requireEnv,
  storageStatePaths,
} from "./helpers/auth";

async function saveFanState(baseURL: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await loginFan(
    page,
    requireEnv("TEST_FAN_EMAIL"),
    requireEnv("TEST_FAN_PASSWORD"),
  );
  await page.waitForURL(/\/fan\/profile(?:\?|$)/, { timeout: 45_000 });
  await context.storageState({ path: storageStatePaths.fan });
  await browser.close();
}

async function saveArtistState(baseURL: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await loginArtist(
    page,
    requireEnv("TEST_ARTIST_EMAIL"),
    requireEnv("TEST_ARTIST_PASSWORD"),
  );
  await page.waitForURL(/\/artist\/dashboard(?:\?|$)/, { timeout: 45_000 });
  await context.storageState({ path: storageStatePaths.artist });
  await browser.close();
}

async function saveAdminState(baseURL: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await loginAdmin(
    page,
    requireEnv("TEST_ADMIN_EMAIL"),
    requireEnv("TEST_ADMIN_PASSWORD"),
  );
  await page.waitForURL(/\/admin(?:\?|$)/, { timeout: 45_000 });
  await context.storageState({ path: storageStatePaths.admin });
  await browser.close();
}

async function storageStateExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export default async function globalSetup(config: FullConfig) {
  const project = config.projects[0];
  const baseURL =
    project?.use?.baseURL && typeof project.use.baseURL === "string"
      ? project.use.baseURL
      : "http://127.0.0.1:8080";

  await mkdir(path.dirname(storageStatePaths.fan), { recursive: true });

  if (!(await storageStateExists(storageStatePaths.fan))) {
    await saveFanState(baseURL);
  }

  if (!(await storageStateExists(storageStatePaths.artist))) {
    await saveArtistState(baseURL);
  }

  if (!(await storageStateExists(storageStatePaths.admin))) {
    await saveAdminState(baseURL);
  }
}
