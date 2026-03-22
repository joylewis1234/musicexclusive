import { expect, test } from "@playwright/test";
import { expectNoChunkLoadFailure } from "./helpers/auth";

test.describe("checkout return recovery flow", () => {
  test("missing session id shows recovery UI", async ({ page }) => {
    await page.goto("/checkout/return?credits=25", { waitUntil: "domcontentloaded" });

    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("We couldn't verify the payment.")).toBeVisible();
    await expect(page.getByText("Missing Stripe session id in return URL.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Try Again/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Go to Profile/i })).toBeVisible();
  });

  test("placeholder session id shows actionable Stripe retry guidance", async ({
    page,
  }) => {
    await page.goto("/checkout/return?session_id=%7BCHECKOUT_SESSION_ID%7D&credits=25", {
      waitUntil: "domcontentloaded",
    });

    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("We couldn't verify the payment.")).toBeVisible();
    await expect(
      page.getByText(/Stripe did not return a valid session id\. Please retry the purchase/i),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Try Again/i })).toBeVisible();
  });
});
