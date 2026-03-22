import { expect, test } from "@playwright/test";

test.describe("public navigation smoke coverage", () => {
  test("home CTA reaches vault entry", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Try Your Luck, Enter the Lottery Vault/i }).click();
    await expect(page).toHaveURL(/\/vault\/enter$/);
    await expect(page.getByRole("button", { name: /GET MY VAULT CODE/i })).toBeVisible();
  });

  test("home CTA reaches founding superfan page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Unlock Superfan Access/i }).first().click();
    await expect(page).toHaveURL(/\/founding-superfan$/);
    await expect(page.getByText("Become a Founding Superfan")).toBeVisible();
  });

  test("login selector routes to fan auth", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Fan Login/i }).click();
    await expect(page).toHaveURL(/\/auth\/fan$/);
    await expect(page.getByText(/Join the Vault|Welcome Back/)).toBeVisible();
  });
});
