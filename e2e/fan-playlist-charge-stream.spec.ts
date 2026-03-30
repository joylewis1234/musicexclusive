import { expect, test } from "@playwright/test";
import { expectNoChunkLoadFailure, storageStatePaths } from "./helpers/auth";

test.describe("fan playlist — charge-stream", () => {
  test.use({ storageState: storageStatePaths.fan });

  test("My Playlist section renders on profile", async ({ page }) => {
    await page.goto("/fan/profile", { waitUntil: "domcontentloaded" });
    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Vault Access Active")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "My Playlist" })).toBeVisible();
  });

  test("playing a queued track POSTs charge-stream when credits available", async ({ page }) => {
    await page.goto("/fan/profile", { waitUntil: "domcontentloaded" });
    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Vault Access Active")).toBeVisible({ timeout: 20_000 });

    if (await page.getByText("Your playlist is empty").isVisible()) {
      test.skip(true, "Playlist is empty — add a ready track to cover charge-stream E2E.");
    }

    const playlistSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "My Playlist" }),
    });
    const playBtn = playlistSection.getByLabel("Play").first();
    await expect(playBtn).toBeVisible({ timeout: 15_000 });
    await playBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });

    if (await page.getByRole("heading", { name: "Not Enough Credits" }).isVisible()) {
      test.skip(true, "Fan test account needs ≥1 credit to assert charge-stream.");
    }

    const chargePromise = page.waitForResponse(
      (res) => res.url().includes("charge-stream") && res.request().method() === "POST",
      { timeout: 60_000 },
    );

    await page.getByRole("button", { name: /Stream Now \(1 Credit\)/i }).click();

    const res = await chargePromise;
    expect(res.ok(), `charge-stream HTTP ${res.status()}`).toBeTruthy();
  });
});
