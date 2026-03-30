import { expect, test } from "@playwright/test";
import { expectNoChunkLoadFailure, storageStatePaths } from "./helpers/auth";

test.describe("fan discovery — share modal", () => {
  test.use({ storageState: storageStatePaths.fan });

  test("Share track dialog loads vault messaging (empty list or member search)", async ({ page }) => {
    await page.goto("/discovery", { waitUntil: "domcontentloaded" });
    await expectNoChunkLoadFailure(page);

    await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible({ timeout: 20_000 });

    const shareBtn = page.getByRole("button", { name: "Share track" }).first();
    await expect(shareBtn).toBeVisible({ timeout: 25_000 });
    await shareBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Share Inside the Vault")).toBeVisible();

    await expect(page.getByText("Loading Vault members...")).toHaveCount(0, { timeout: 30_000 });

    await expect(
      page
        .getByText("No other active Vault members to share with yet")
        .or(page.getByPlaceholder("Search Vault members...")),
    ).toBeVisible({ timeout: 15_000 });
  });
});
