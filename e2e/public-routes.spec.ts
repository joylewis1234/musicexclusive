import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function expectHealthyPage(page: Page, locator: ReturnType<Page["getByText"]>) {
  await expect(page.getByText("Failed to load page")).toHaveCount(0);
  await expect(locator).toBeVisible({ timeout: 15_000 });
}

test.describe("public route smoke coverage", () => {
  test("home page renders primary CTA", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expectHealthyPage(page, page.getByText("STEP INSIDE THE VAULT"));
    await expect(page.getByRole("button", { name: /Preview Exclusive Music/i }).first()).toBeVisible();
  });

  test("login selector loads", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expectHealthyPage(page, page.getByText("Choose how you want to sign in"));
    await expect(page.getByText("Fan Login")).toBeVisible();
  });

  test("fan auth vault flow loads (sign-in)", async ({ page }) => {
    await page.goto("/auth/fan?flow=vault", { waitUntil: "domcontentloaded" });
    await expectHealthyPage(page, page.getByRole("heading", { name: "Welcome Back" }));
    await expect(page.getByText("Sign in to access your Vault membership")).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  });

  test("fan agreement page loads", async ({ page }) => {
    await page.goto("/fan/agreements", { waitUntil: "domcontentloaded" });
    await expectHealthyPage(page, page.getByText("One Last Step..."));
    await expect(page.getByText("Agree & Continue")).toBeVisible();
  });

  test("choose access page loads", async ({ page }) => {
    await page.goto("/onboarding/listen", { waitUntil: "domcontentloaded" });
    await expectHealthyPage(page, page.getByRole("heading", { name: /Choose Your Access/i }));
    await expect(page.getByRole("button", { name: /Become a Superfan/i })).toBeVisible();
  });

  test("pay as you go page loads", async ({ page }) => {
    await page.goto("/load-credits", { waitUntil: "domcontentloaded" });
    await expectHealthyPage(page, page.getByText("Load Credits"));
    await expect(page.getByRole("button", { name: /Pay \$5\.00 with Stripe/i })).toBeVisible();
  });

  test("founding superfan page loads", async ({ page }) => {
    await page.goto("/founding-superfan", { waitUntil: "domcontentloaded" });
    await expectHealthyPage(page, page.getByText("Become a Founding Superfan."));
    await expect(page.getByRole("button", { name: /Reserve My Lifetime Access/i })).toBeVisible();
  });
});
