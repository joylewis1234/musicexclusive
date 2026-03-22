import { expect, test } from "@playwright/test";
import {
  expectNoChunkLoadFailure,
  storageStatePaths,
} from "./helpers/auth";

test.describe("payments entry flow", () => {
  test.use({ storageState: storageStatePaths.fan });

  test("superfan subscribe page enables CTA after accepting terms", async ({ page }) => {
    await page.goto("/subscribe", { waitUntil: "domcontentloaded" });

    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Become a Superfan")).toBeVisible();

    const subscribeButton = page.getByRole("button", { name: /Subscribe \$5\/month/i });
    await expect(subscribeButton).toBeDisabled();
    await page.getByRole("checkbox").click();
    await expect(subscribeButton).toBeEnabled();
  });

  test("load credits page updates CTA for custom amount", async ({ page }) => {
    await page.goto("/load-credits", { waitUntil: "domcontentloaded" });

    await expectNoChunkLoadFailure(page);
    await page.getByLabel("Credits to Load").fill("50");

    await expect(page.getByText("Order Summary")).toBeVisible();
    await expect(page.getByRole("button", { name: /Pay \$10\.00 with Stripe/i })).toBeVisible();
  });
});
