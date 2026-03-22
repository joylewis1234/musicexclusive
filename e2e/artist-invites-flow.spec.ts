import { expect, test } from "@playwright/test";
import {
  expectNoChunkLoadFailure,
  storageStatePaths,
} from "./helpers/auth";

test.describe("artist invite flow", () => {
  test.use({ storageState: storageStatePaths.artist });

  test("artist dashboard shows invite generation controls", async ({ page }) => {
    await page.goto("/artist/dashboard", { waitUntil: "domcontentloaded" });

    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Invite Fans")).toBeVisible();
    await expect(page.getByText("Monthly Usage")).toBeVisible();
    await expect(page.getByRole("button", { name: /Generate Link/i })).toBeVisible();
  });
});
