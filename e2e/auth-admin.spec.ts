import { expect, test } from "@playwright/test";
import {
  expectNoChunkLoadFailure,
  loginAdmin,
  requireEnv,
} from "./helpers/auth";

const adminEmail = requireEnv("TEST_ADMIN_EMAIL");
const adminPassword = requireEnv("TEST_ADMIN_PASSWORD");

test.describe("saved admin account login flow", () => {
  test("admin can sign in and reach dashboard", async ({ page }) => {
    test.setTimeout(60_000);
    await loginAdmin(page, adminEmail, adminPassword);

    await expect(page).toHaveURL(/\/admin(?:\?|$)/, { timeout: 45_000 });
    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Music Exclusive Admin")).toBeVisible();
    await expect(page.getByRole("button", { name: /Logout/i })).toBeVisible();
  });
});
