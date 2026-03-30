import { expect, test } from "@playwright/test";
import {
  expectNoChunkLoadFailure,
  storageStatePaths,
} from "./helpers/auth";

test.describe("authenticated fan smoke coverage", () => {
  test.use({ storageState: storageStatePaths.fan });

  test("fan can open discovery from profile", async ({ page }) => {
    await page.goto("/fan/profile", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Vault Access Active")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /Explore All Music/i }).click();

    await expect(page).toHaveURL(/\/discovery(?:\?|$)/);
    await expectNoChunkLoadFailure(page);
    await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible();
  });

  test("fan can open credits page from wallet card", async ({ page }) => {
    await page.goto("/fan/profile", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /^Add Credits$/i }).click();

    await expect(page).toHaveURL(/\/fan\/payment(?:\?|$)/);
    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Add Credits")).toBeVisible();
  });
});
