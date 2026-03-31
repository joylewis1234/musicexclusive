import { expect, type Page } from "@playwright/test";
import path from "path";

type CredentialKey =
  | "TEST_FAN_EMAIL"
  | "TEST_FAN_PASSWORD"
  | "TEST_ARTIST_EMAIL"
  | "TEST_ARTIST_PASSWORD"
  | "TEST_ADMIN_EMAIL"
  | "TEST_ADMIN_PASSWORD"
  /** Optional: long fan journey specs (see `fan-joy-lewis-demo-journey.spec.ts`) */
  | "FAN_EMAIL"
  | "FAN_PASSWORD";

export const storageStatePaths = {
  fan: path.resolve(process.cwd(), "playwright/.auth/fan.json"),
  artist: path.resolve(process.cwd(), "playwright/.auth/artist.json"),
  admin: path.resolve(process.cwd(), "playwright/.auth/admin.json"),
};

export function requireEnv(name: CredentialKey): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required Playwright env var: ${name}`);
  }
  return value;
}

export async function expectNoChunkLoadFailure(page: Page) {
  await expect(page.getByText("Failed to load page")).toHaveCount(0);
}

export async function loginFan(page: Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expectNoChunkLoadFailure(page);

  await page.getByRole("heading", { name: /Welcome to Music Exclusive/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /Fan Login/i }).click();
  await Promise.race([
    page.waitForURL(/\/auth\/fan(?:\?|$)/, { timeout: 45_000 }),
    page.locator('input[type="email"]').first().waitFor({ state: "visible", timeout: 45_000 }),
  ]);
  await expectNoChunkLoadFailure(page);

  const switchToSignIn = page.getByRole("button", { name: /Already have an account\? Sign in/i });
  if (await switchToSignIn.isVisible().catch(() => false)) {
    await switchToSignIn.click();
  }
  await page.locator('input[type="email"]').first().waitFor({ state: "visible", timeout: 45_000 });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);

  const tokenResponsePromise = page.waitForResponse(
    (res) => res.url().includes("/auth/v1/token") && res.request().method() === "POST",
    { timeout: 45_000 },
  );
  await page.getByRole("button", { name: /^Sign In$/i }).click();
  const tokenResponse = await tokenResponsePromise;
  if (!tokenResponse.ok()) {
    const body = await tokenResponse.text().catch(() => "");
    throw new Error(
      `Fan sign-in token request failed: HTTP ${tokenResponse.status()} ${tokenResponse.statusText()}. ${body.slice(0, 800)}`,
    );
  }
}

export async function loginArtist(page: Page, email: string, password: string) {
  await page.goto("/artist/login", { waitUntil: "domcontentloaded" });
  await expectNoChunkLoadFailure(page);

  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /^LOG IN$/i }).click();
}

export async function loginAdmin(page: Page, email: string, password: string) {
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await expectNoChunkLoadFailure(page);

  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /^Sign In$/i }).click();
}
