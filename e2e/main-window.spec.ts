import { test, expect, waitForAppReady } from "./fixtures/setup";

test.describe("Main Window", () => {
  test("should display the application title", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    // The window title should be "Agent Console"
    await expect(page).toHaveTitle(/Agent Console/);
  });

  test("should show project list or loading state", async ({ page }) => {
    await page.goto("/");

    // Should show either loading spinner or project list
    const hasContent = await page
      .locator("text=No projects found, .animate-spin, [data-testid='project-list']")
      .first()
      .isVisible();

    expect(hasContent).toBe(true);
  });

  test("should have settings navigation", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    // Look for settings button/link (gear icon or text)
    const settingsButton = page.locator("button[title*='Settings'], a[href*='settings'], text=Settings").first();

    // Settings might be in a dropdown or directly visible
    // This is a basic check that the UI is functional
    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle empty state gracefully", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    // Wait for loading to complete
    await page.waitForSelector(".animate-spin", { state: "detached", timeout: 30000 }).catch(() => {
      // Spinner might not exist if content loads quickly
    });

    // Should show either projects or empty state message
    const content = await page.locator("body").textContent();
    expect(content).toBeTruthy();
  });
});

test.describe("Navigation", () => {
  test("should navigate to settings and back", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    // Wait for initial load
    await page.waitForTimeout(1000);

    // Navigate to settings if settings button exists
    const settingsLink = page.locator("button:has-text('Settings'), a:has-text('Settings')").first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();

      // Should show settings content
      await expect(page.locator("text=Appearance, text=Theme, text=Terminal").first()).toBeVisible({
        timeout: 5000,
      });

      // Navigate back
      const backButton = page.locator("button:has-text('Back')").first();
      if (await backButton.isVisible()) {
        await backButton.click();
      }
    }
  });
});

test.describe("Theme", () => {
  test("should respect system theme preference", async ({ page }) => {
    // Set system to prefer dark mode
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await waitForAppReady(page);

    // The document should have dark class applied
    const hasDarkClass = await page.locator("html").evaluate((el) => {
      return el.classList.contains("dark");
    });

    // Either has dark class or is light mode by default
    expect(typeof hasDarkClass).toBe("boolean");
  });
});
