import { expect, test } from "@playwright/test";
import {
  expectNoChunkLoadFailure,
  storageStatePaths,
} from "./helpers/auth";

test.describe("saved auth storage states", () => {
  test.use({ storageState: storageStatePaths.fan });

  test("fan storage state opens profile without manual login", async ({ page }) => {
    await page.goto("/fan/profile", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/fan\/profile(?:\?|$)/);
    await expectNoChunkLoadFailure(page);
    await expect(page.getByRole("button", { name: "Log Out" }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe("saved artist auth storage state", () => {
  test.use({ storageState: storageStatePaths.artist });

  test("artist storage state opens dashboard without manual login", async ({ page }) => {
    await page.goto("/artist/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/artist\/dashboard(?:\?|$)/);
    await expectNoChunkLoadFailure(page);
    await expect(page.getByRole("button", { name: /^Upload$/i }).first()).toBeVisible();
  });
});

test.describe("saved admin auth storage state", () => {
  test.use({ storageState: storageStatePaths.admin });

  test("admin storage state opens dashboard without manual login", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/admin(?:\?|$)/);
    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Music Exclusive Admin")).toBeVisible({ timeout: 20_000 });
  });
});
