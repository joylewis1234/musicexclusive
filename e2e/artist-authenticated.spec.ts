import { expect, test } from "@playwright/test";
import {
  expectNoChunkLoadFailure,
  storageStatePaths,
} from "./helpers/auth";

test.describe("authenticated artist smoke coverage", () => {
  test.use({ storageState: storageStatePaths.artist });

  test("artist dashboard shows invite and uploads sections", async ({ page }) => {
    await page.goto("/artist/dashboard", { waitUntil: "domcontentloaded" });

    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Invite Fans")).toBeVisible();
    await expect(page.getByText("Your Uploads")).toBeVisible();
  });

  test("artist can open upload page from dashboard", async ({ page }) => {
    await page.goto("/artist/dashboard", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /^Upload$/i }).first().click();

    await expect(page).toHaveURL(/\/artist\/upload(?:\?|$)/);
    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Upload Exclusive Track")).toBeVisible();
    await expect(page.getByLabel("Track Title *")).toBeVisible();
  });
});
