import { expect, test } from "@playwright/test";
import {
  expectNoChunkLoadFailure,
  loginArtist,
  loginFan,
  requireEnv,
} from "./helpers/auth";

const fanEmail = requireEnv("TEST_FAN_EMAIL");
const fanPassword = requireEnv("TEST_FAN_PASSWORD");
const artistEmail = requireEnv("TEST_ARTIST_EMAIL");
const artistPassword = requireEnv("TEST_ARTIST_PASSWORD");

test.describe("saved test account login flows", () => {
  test("fan can sign in and reach profile", async ({ page }) => {
    test.setTimeout(60_000);
    await loginFan(page, fanEmail, fanPassword);

    await expect(page).toHaveURL(/\/fan\/profile(?:\?|$)/, { timeout: 45_000 });
    await expectNoChunkLoadFailure(page);
    await expect(page.getByRole("button", { name: "Log Out" }).first()).toBeVisible();
  });

  test("artist can sign in and reach dashboard", async ({ page }) => {
    test.setTimeout(60_000);
    await loginArtist(page, artistEmail, artistPassword);

    await expect(page).toHaveURL(/\/artist\/dashboard(?:\?|$)/, { timeout: 45_000 });
    await expectNoChunkLoadFailure(page);
    await expect(page.getByRole("button", { name: /^Upload$/i }).first()).toBeVisible();
  });
});
