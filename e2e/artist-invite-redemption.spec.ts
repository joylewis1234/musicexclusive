import { expect, test } from "@playwright/test";
import {
  expectNoChunkLoadFailure,
  requireEnv,
  storageStatePaths,
} from "./helpers/auth";

const fanEmail = requireEnv("TEST_FAN_EMAIL");
const fanPassword = requireEnv("TEST_FAN_PASSWORD");

test.describe("artist invite redemption flow", () => {
  test.use({ storageState: storageStatePaths.artist });

  test("artist-generated invite can be redeemed by an existing fan", async ({
    browser,
    page,
  }) => {
    test.setTimeout(120_000);

    await page.goto("/artist/dashboard", { waitUntil: "domcontentloaded" });

    await expectNoChunkLoadFailure(page);
    const dismissTutorial = page.getByRole("button", { name: /I'll explore on my own/i });
    await dismissTutorial.click({ timeout: 10_000 }).catch(() => {});
    if (await dismissTutorial.isVisible().catch(() => false)) {
      await dismissTutorial.click();
    }
    await expect(page.getByText("Invite Fans")).toBeVisible();

    const generateInviteResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/functions/v1/generate-fan-invite") &&
        response.request().method() === "POST",
    );

    await page.getByRole("button", { name: /Generate Link/i }).click();

    const response = await generateInviteResponse;
    const payload = (await response.json()) as {
      invites?: Array<{ token?: string }>;
    };
    const inviteToken = payload.invites?.[0]?.token;

    expect(inviteToken).toBeTruthy();
    await expect(page.getByText("Invite link generated!")).toBeVisible();

    const fanContext = await browser.newContext();
    const fanPage = await fanContext.newPage();

    try {
      await fanPage.goto(`/invite?token=${inviteToken}&type=artist`, {
        waitUntil: "domcontentloaded",
      });

      await expectNoChunkLoadFailure(fanPage);
      await expect(fanPage.getByText("You've Been Invited!")).toBeVisible({
        timeout: 30_000,
      });
      await fanPage
        .getByRole("button", { name: /Accept Invite & Get Started/i })
        .click();

      await expect(fanPage).toHaveURL(/\/auth\/fan\?flow=invite/i);
      await expectNoChunkLoadFailure(fanPage);
      await expect(fanPage.locator('input[type="email"]').first()).toBeVisible({
        timeout: 30_000,
      });

      const displayNameInput = fanPage.getByPlaceholder("Your name");
      if (await displayNameInput.count()) {
        await displayNameInput.fill("Invite E2E");
      }
      await fanPage.locator('input[type="email"]').first().fill(fanEmail);
      await fanPage.locator('input[type="password"]').first().fill(fanPassword);
      const termsCheckbox = fanPage.getByRole("checkbox");
      if (await termsCheckbox.count()) {
        await termsCheckbox.click();
      }
      await fanPage.getByRole("button", { name: /Create Account/i }).click();

      await expect(fanPage).toHaveURL(/\/fan\/agreements(?:\?|$)/, {
        timeout: 45_000,
      });
      await expectNoChunkLoadFailure(fanPage);
      await expect(fanPage.getByText("One Last Step...")).toBeVisible();
    } finally {
      await fanContext.close().catch(() => {});
    }

  });
});
