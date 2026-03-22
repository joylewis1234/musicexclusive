import { expect, test } from "@playwright/test";
import { expectNoChunkLoadFailure, storageStatePaths } from "./helpers/auth";

test.describe("admin artist approval flow", () => {
  test.use({ storageState: storageStatePaths.admin });

  test("admin can approve a newly submitted artist application", async ({
    browser,
    page,
  }, testInfo) => {
    test.setTimeout(120_000);

    const uniqueId = `${Date.now()}-${testInfo.parallelIndex}`;
    const artistName = `Approval E2E ${uniqueId}`;
    const artistEmail = `artist-approval-${uniqueId}@example.com`;

    const applicantContext = await browser.newContext();
    const applicantPage = await applicantContext.newPage();

    try {
      await applicantPage.goto("/artist/application-form", { waitUntil: "domcontentloaded" });

      await expectNoChunkLoadFailure(applicantPage);
      await applicantPage.getByLabel("Artist Name").fill(artistName);
      await applicantPage.getByLabel("Contact Email").fill(artistEmail);
      await applicantPage.getByLabel("Genre(s)").fill("Hip-Hop");
      await applicantPage.getByRole("checkbox").last().click();
      await applicantPage
        .getByRole("button", { name: /Submit Application/i })
        .click();

      await expect(applicantPage).toHaveURL(/\/artist\/application-submitted(?:\?|$)/, {
        timeout: 45_000,
      });
      await expect(applicantPage.getByText(artistName)).toBeVisible();
    } finally {
      await applicantContext.close().catch(() => {});
    }

    await page.goto("/admin/artist-applications", { waitUntil: "domcontentloaded" });

    await expectNoChunkLoadFailure(page);
    await expect(page.getByText("Review Applications")).toBeVisible({
      timeout: 30_000,
    });

    const applicationRow = page.locator("tr").filter({
      has: page.getByText(artistEmail),
    });

    await expect(applicationRow).toBeVisible({ timeout: 45_000 });
    await expect(applicationRow.getByText("Pending")).toBeVisible();

    await applicationRow.getByRole("button", { name: /Approve/i }).click();

    await expect(applicationRow.getByText("Approved")).toBeVisible({
      timeout: 45_000,
    });
    await expect(applicationRow.getByRole("button", { name: /Resend Email/i })).toBeVisible();
  });
});
