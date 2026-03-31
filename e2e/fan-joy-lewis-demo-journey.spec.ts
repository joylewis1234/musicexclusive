import { expect, test } from "@playwright/test";
import {
  expectNoChunkLoadFailure,
  loginFan,
  requireEnv,
} from "./helpers/auth";

/**
 * Joy Lewis demo artist — seed data (`supabase/export/data-migration.sql`):
 * artist_profiles.artist_name includes "Joy Lewis" / Demo Artist.
 * Override if your project uses a different id: PLAYWRIGHT_DEMO_ARTIST_ID
 */
const DEMO_ARTIST_ID =
  process.env.PLAYWRIGHT_DEMO_ARTIST_ID?.trim() ||
  "435b37fd-9d4d-43db-aba3-ae55427c1e41";

test.describe("fan journey — Joy Lewis demo artist (FAN_EMAIL / FAN_PASSWORD)", () => {
  test.describe.configure({ mode: "serial" });

  test("login, stream two tracks, playlist, share track + artist", async ({ page }) => {
    test.setTimeout(120_000);

    const email = requireEnv("FAN_EMAIL");
    const password = requireEnv("FAN_PASSWORD");

    await loginFan(page, email, password);
    await page.waitForURL(/\/fan\/profile(?:\?|$)/, {
      timeout: 90_000,
      waitUntil: "domcontentloaded",
    });
    await expectNoChunkLoadFailure(page);

    await page.goto(`/artist/${DEMO_ARTIST_ID}`, { waitUntil: "domcontentloaded" });
    await expectNoChunkLoadFailure(page);

    await expect(
      page.getByRole("heading", { name: /Joy Lewis|Demo Artist/i }),
    ).toBeVisible({ timeout: 25_000 });

    const topSongs = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Top Songs" }),
    });

    if (await page.getByText("No exclusive tracks available yet").isVisible()) {
      test.skip(true, "No tracks on this artist profile in this environment.");
    }

    const trackRows = topSongs.locator("div.cursor-pointer");
    const rowCount = await trackRows.count();
    if (rowCount < 1) {
      test.skip(true, "No track rows found.");
    }

    /** Vault player card (not the hero). Primary control is aria-label Play or Pause. */
    const vaultPlayer = page
      .locator("div.mx-5.mb-6")
      .filter({ has: page.locator("p.font-semibold.truncate") });
    const vaultPlayPause = () =>
      vaultPlayer.getByRole("button", { name: /^(Play|Pause)$/ });
    const vaultPause = () => vaultPlayer.getByRole("button", { name: "Pause" });

    const confirmStream = async () => {
      const chargePromise = page.waitForResponse(
        (res) =>
          res.url().includes("charge-stream") && res.request().method() === "POST",
        { timeout: 60_000 },
      );
      await page.getByRole("button", { name: /Stream Now \(1 Credit\)/i }).click();
      const res = await chargePromise;
      expect(res.ok(), `charge-stream HTTP ${res.status()}`).toBeTruthy();
    };

    /** First click may only pause; a second click opens the stream confirmation dialog. */
    const openVaultStreamDialog = async () => {
      await vaultPlayPause().click();
      const dialog = page.getByRole("dialog");
      try {
        await dialog.waitFor({ state: "visible", timeout: 3_000 });
      } catch {
        await vaultPlayPause().click();
        await expect(dialog).toBeVisible({ timeout: 15_000 });
      }
    };

    // ── Track 1: select row → Play on vault player → confirm stream ──
    await trackRows.nth(0).click();
    await expect(page.getByText("Select a track to load the Vault Player")).toHaveCount(0, {
      timeout: 15_000,
    });

    await openVaultStreamDialog();

    if (await page.getByRole("heading", { name: "Not Enough Credits" }).isVisible()) {
      test.skip(true, "FAN_EMAIL account needs ≥1 credit per stream for this spec.");
    }

    await confirmStream();

    // ── Track 2 (if present) ──
    if (rowCount >= 2) {
      if (await vaultPause().isVisible().catch(() => false)) {
        await vaultPause().click();
      }
      await trackRows.nth(1).click();
      await expect(page.getByText("Select a track to load the Vault Player")).toHaveCount(0, {
        timeout: 15_000,
      });
      await expect(vaultPlayPause()).toBeVisible({ timeout: 15_000 });
      await openVaultStreamDialog();
      if (await page.getByRole("heading", { name: "Not Enough Credits" }).isVisible()) {
        test.skip(true, "Insufficient credits for second stream.");
      }
      await confirmStream();
    }

    // ── Playlist: add a track if any row still shows "Add to playlist" ──
    const firstAdd = topSongs.getByLabel("Add to playlist").first();
    if (await firstAdd.isVisible().catch(() => false)) {
      const addRow = topSongs
        .locator("div.cursor-pointer")
        .filter({ has: page.getByLabel("Add to playlist") })
        .first();
      await addRow.click();

      const playlistInsert = page.waitForResponse(
        (res) =>
          res.url().includes("/rest/v1/fan_playlists") && res.request().method() === "POST",
        { timeout: 20_000 },
      );
      await addRow.getByLabel("Add to playlist").click();
      const insertRes = await playlistInsert;
      expect(insertRes.ok(), await insertRes.text().catch(() => "")).toBeTruthy();

      await expect(page.getByText(/Added to playlist/)).toBeVisible({ timeout: 15_000 });
    }

    await page.goto("/fan/profile", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "My Playlist" })).toBeVisible({
      timeout: 20_000,
    });

    // ── Share track (row Share) ──
    await page.goto(`/artist/${DEMO_ARTIST_ID}`, { waitUntil: "domcontentloaded" });
    await topSongs.getByRole("button", { name: "Share" }).first().click();
    await expect(
      page.getByRole("dialog").getByText("Share this Exclusive Track"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Loading Vault members...")).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(
      page
        .getByText("No other active Vault members to share with yet")
        .or(page.getByPlaceholder("Search Vault members...")),
    ).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");

    // ── Share artist (Share to Inbox) ──
    const shareToInbox = page.getByRole("button", { name: "Share to Inbox" });
    await shareToInbox.scrollIntoViewIfNeeded();
    await shareToInbox.click();
    await expect(page.getByRole("dialog").getByText("Share Artist Profile")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Loading Vault members...")).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(
      page
        .getByText("No other active Vault members to share with yet")
        .or(page.getByPlaceholder("Search Vault members...")),
    ).toBeVisible({ timeout: 15_000 });
  });
});
