import { expect, test } from "@playwright/test";
import {
  expectNoChunkLoadFailure,
  storageStatePaths,
} from "./helpers/auth";

test.describe("admin review workflows", () => {
  test.use({ storageState: storageStatePaths.admin });

  test("admin can open artist applications review page", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /Artist Applications/i }).click();

    await expect(page).toHaveURL(/\/admin\/artist-applications(?:\?|$)/);
    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Review Applications")).toBeVisible();
    await expect(page.getByText("Enable Test Cleanup Mode")).toBeVisible();
  });

  test("admin can open invitations workflow and switch to DM mode", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /Artist Invitations/i }).click();

    await expect(page).toHaveURL(/\/admin\/invitations(?:\?|$)/);
    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Generate Artist Invitation")).toBeVisible();
    await page.getByRole("button", { name: /DM Text Invite/i }).click();
    await expect(page.getByRole("button", { name: /Generate DM/i })).toBeVisible();
  });
});
