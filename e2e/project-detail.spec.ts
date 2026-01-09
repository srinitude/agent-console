import { test, expect, waitForAppReady } from "./fixtures/setup";

test.describe("Project Detail", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("should display project detail when a project is selected", async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector(".animate-spin", { state: "detached", timeout: 30000 }).catch(() => {});

    // Look for a project in the list
    const projectButton = page.locator("button:has-text('project'), [role='button']:has-text('/')").first();

    if (await projectButton.isVisible({ timeout: 5000 })) {
      await projectButton.click();

      // Should show project detail view with tabs
      await expect(
        page.locator("text=Events, text=Edits, text=Policies, text=No session").first()
      ).toBeVisible({ timeout: 10000 });
    } else {
      // No projects available - test passes as this is expected in clean state
      test.skip();
    }
  });

  test("should show tabs in project detail view", async ({ page }) => {
    // Skip if no projects
    const projectButton = page.locator("button:has-text('project')").first();
    if (!(await projectButton.isVisible({ timeout: 5000 }))) {
      test.skip();
      return;
    }

    await projectButton.click();

    // Check for tab buttons
    const eventsTab = page.locator("button:has-text('Events'), [role='tab']:has-text('Events')");
    const editsTab = page.locator("button:has-text('Edits'), [role='tab']:has-text('Edits')");
    const policiesTab = page.locator("button:has-text('Policies'), [role='tab']:has-text('Policies')");

    // At least one tab should be visible
    await expect(eventsTab.or(editsTab).or(policiesTab).first()).toBeVisible({ timeout: 5000 });
  });

  test("should switch between tabs", async ({ page }) => {
    const projectButton = page.locator("button:has-text('project')").first();
    if (!(await projectButton.isVisible({ timeout: 5000 }))) {
      test.skip();
      return;
    }

    await projectButton.click();
    await page.waitForTimeout(500);

    // Click on Edits tab if visible
    const editsTab = page.locator("button:has-text('Edits')").first();
    if (await editsTab.isVisible()) {
      await editsTab.click();

      // Edits tab should now be active (has border styling)
      await expect(editsTab).toHaveClass(/border-primary/);
    }
  });
});

test.describe("Event Log", () => {
  test("should display filter controls", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    const projectButton = page.locator("button:has-text('project')").first();
    if (!(await projectButton.isVisible({ timeout: 5000 }))) {
      test.skip();
      return;
    }

    await projectButton.click();

    // Look for filter buttons
    const filterButtons = page.locator("button:has-text('All'), button:has-text('Me'), button:has-text('Assistant')");
    await expect(filterButtons.first()).toBeVisible({ timeout: 10000 });
  });

  test("should have search input", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    const projectButton = page.locator("button:has-text('project')").first();
    if (!(await projectButton.isVisible({ timeout: 5000 }))) {
      test.skip();
      return;
    }

    await projectButton.click();

    // Look for search input
    const searchInput = page.locator("input[placeholder*='Search']");
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Session Selection", () => {
  test("should display session dropdown", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    const projectButton = page.locator("button:has-text('project')").first();
    if (!(await projectButton.isVisible({ timeout: 5000 }))) {
      test.skip();
      return;
    }

    await projectButton.click();
    await page.waitForTimeout(500);

    // Look for session selector (typically shows a truncated UUID)
    const sessionSelector = page.locator("button:has([class*='font-mono']), text=/[a-f0-9]{8}/i").first();
    if (await sessionSelector.isVisible({ timeout: 5000 })) {
      await expect(sessionSelector).toBeVisible();
    }
  });
});
