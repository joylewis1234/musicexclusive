import { expect, test } from "@playwright/test";
import { expectNoChunkLoadFailure } from "./helpers/auth";

test.describe("preview → founding superfan CTA", () => {
  test("header Become a Superfan navigates to founding superfan page", async ({ page }) => {
    await page.goto("/preview", { waitUntil: "domcontentloaded" });
    await expectNoChunkLoadFailure(page);

    const cta = page.getByRole("button", { name: /Become a Superfan/i });
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await cta.click();

    await expect(page).toHaveURL(/\/founding-superfan$/);
    await expect(page.getByText(/Become a Founding Superfan/)).toBeVisible();
  });
});
