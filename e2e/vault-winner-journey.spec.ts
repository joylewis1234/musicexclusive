import { expect, test } from "@playwright/test";
import { expectNoChunkLoadFailure, requireEnv } from "./helpers/auth";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../src/config/supabase";

const baseFanEmail = requireEnv("TEST_FAN_EMAIL");

function buildPlusAlias(email: string, tag: string) {
  const [localPart, domain] = email.split("@");
  return `${localPart}+${tag}@${domain}`;
}

test.describe("vault winner journey", () => {
  test("fresh vault entrant can win and reach choose access", async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(120_000);

    const uniqueId = `${Date.now()}-${testInfo.parallelIndex}`;
    const name = `Vault E2E ${uniqueId}`;
    const email = buildPlusAlias(baseFanEmail, `vault-e2e-${uniqueId}`);
    const password = `VaultFan!${uniqueId}`;
    const vaultCodeResponse = await request.post(`${SUPABASE_URL}/functions/v1/generate-vault-code`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        name,
        email,
      },
    });

    expect(vaultCodeResponse.ok()).toBeTruthy();

    const vaultCodePayload = (await vaultCodeResponse.json()) as {
      code?: string;
      success?: boolean;
    };
    const vaultCode = vaultCodePayload.code;

    expect(vaultCodePayload.success).toBeTruthy();
    expect(vaultCode).toBeTruthy();

    await page.goto(
      `/vault/submit?email=${encodeURIComponent(email)}&code=${encodeURIComponent(vaultCode ?? "")}`,
      { waitUntil: "domcontentloaded" },
    );

    await expectNoChunkLoadFailure(page);

    await page.getByRole("button", { name: /UNLOCK ACCESS/i }).click();

    await expect(page).toHaveURL(/\/vault\/status(?:\?|$)/, { timeout: 20_000 });
    await expect(page.getByText(/CONGRATULATIONS/i)).toBeVisible({ timeout: 30_000 });
    await expectNoChunkLoadFailure(page);

    await page.getByRole("button", { name: /CONTINUE TO AGREEMENTS/i }).click();

    await expect(page).toHaveURL(/\/vault\/congrats(?:\?|$)/);
    await expect(page.getByRole("heading", { name: /Claim Your Access/i })).toBeVisible();
    await page.getByPlaceholder("Create password").fill(password);
    await page.getByPlaceholder("Confirm password").fill(password);
    await page.getByRole("checkbox").click();
    await page.getByRole("button", { name: /Claim Your Access/i }).click();

    await expect(page).toHaveURL(/\/onboarding\/listen(?:\?|$)/);
    await expect(page.getByText("Choose Your Access")).toBeVisible();
    await expectNoChunkLoadFailure(page);
  });
});
