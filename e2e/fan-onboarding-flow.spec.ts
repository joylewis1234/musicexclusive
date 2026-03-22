import { expect, test } from "@playwright/test";
import {
  expectNoChunkLoadFailure,
  storageStatePaths,
} from "./helpers/auth";

test.describe("fan onboarding flow", () => {
  test.use({ storageState: storageStatePaths.fan });

  test("fan agreements continue into choose access", async ({ page }) => {
    await page.goto("/fan/agreements", { waitUntil: "domcontentloaded" });

    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("One Last Step...")).toBeVisible();
    await page.getByRole("checkbox").click();
    await page.getByRole("button", { name: /Agree & Continue/i }).click();

    await expect(page).toHaveURL(/\/onboarding\/listen(?:\?|$)/);
    await expect(page.getByText("Choose Your Access")).toBeVisible();
  });

  test("choose access routes into pay as you go entry", async ({ page }) => {
    await page.goto("/onboarding/listen", { waitUntil: "domcontentloaded" });

    await expectNoChunkLoadFailure(page);
    await page.getByRole("button", { name: /Load \$5 in Credits/i }).click();

    await expect(page).toHaveURL(/\/load-credits(?:\?|$)/);
    await expect(page.getByText("Credits to Load")).toBeVisible();
  });
});
