import { expect, test } from "@playwright/test";
import {
  expectNoChunkLoadFailure,
  storageStatePaths,
} from "./helpers/auth";

test.describe("authenticated admin smoke coverage", () => {
  test.use({ storageState: storageStatePaths.admin });

  test("admin can open artist waitlist from dashboard", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /Artist Waitlist/i }).click();

    await expect(page).toHaveURL(/\/admin\/waitlist(?:\?|$)/);
    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Artist Waitlist Management")).toBeVisible();
  });

  test("admin can open fan waitlist from dashboard", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /Fan Waitlist/i }).click();

    await expect(page).toHaveURL(/\/admin\/fan-waitlist(?:\?|$)/);
    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Founding Superfan Signups")).toBeVisible();
  });

  test("admin can open test tools from dashboard", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /Test Tools/i }).click();

    await expect(page).toHaveURL(/\/admin\/test-tools(?:\?|$)/);
    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Admin Test Tools")).toBeVisible();
  });
});
