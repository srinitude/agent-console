import { test as base } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Extend base test with fixtures
export const test = base.extend<{
  testProjectPath: string;
  testSessionPath: string;
}>({
  // Create a temporary test project with mock session data
  testProjectPath: async ({}, use) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-console-e2e-"));
    const claudeDir = path.join(tempDir, ".claude", "projects");
    fs.mkdirSync(claudeDir, { recursive: true });

    // Create a test project directory
    const projectPath = path.join(tempDir, "test-project");
    fs.mkdirSync(projectPath, { recursive: true });

    await use(tempDir);

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  },

  // Create a test session file
  testSessionPath: async ({ testProjectPath }, use) => {
    const projectName = "test-project";
    const sessionId = "test-session-" + Date.now();
    const projectDir = path.join(
      testProjectPath,
      ".claude",
      "projects",
      encodeURIComponent(path.join(testProjectPath, "test-project"))
    );
    fs.mkdirSync(projectDir, { recursive: true });

    const sessionPath = path.join(projectDir, `${sessionId}.jsonl`);

    // Write some test events
    const events = [
      {
        type: "user",
        message: {
          role: "user",
          content: [{ type: "text", text: "Hello, Claude!" }],
        },
        uuid: "event-1",
        timestamp: new Date().toISOString(),
      },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Hello! How can I help you today?" }],
        },
        uuid: "event-2",
        timestamp: new Date().toISOString(),
      },
    ];

    fs.writeFileSync(
      sessionPath,
      events.map((e) => JSON.stringify(e)).join("\n") + "\n"
    );

    await use(sessionPath);
  },
});

export { expect } from "@playwright/test";

// Helper to create mock session JSONL content
export function createMockSessionContent(events: Array<{
  type: "user" | "assistant" | "system";
  content: string;
}>): string {
  return events
    .map((event, index) => {
      const timestamp = new Date(Date.now() - (events.length - index) * 60000).toISOString();
      if (event.type === "user") {
        return JSON.stringify({
          type: "user",
          message: {
            role: "user",
            content: [{ type: "text", text: event.content }],
          },
          uuid: `event-${index}`,
          timestamp,
        });
      } else if (event.type === "assistant") {
        return JSON.stringify({
          type: "assistant",
          message: {
            role: "assistant",
            content: [{ type: "text", text: event.content }],
          },
          uuid: `event-${index}`,
          timestamp,
        });
      } else {
        return JSON.stringify({
          type: "system",
          subtype: "init",
          uuid: `event-${index}`,
          timestamp,
        });
      }
    })
    .join("\n") + "\n";
}

// Helper to wait for the application to be ready
export async function waitForAppReady(page: import("@playwright/test").Page) {
  // Wait for the main content to be visible
  await page.waitForSelector('[data-slot="card"], [data-testid="project-list"], .animate-spin', {
    timeout: 10000,
  });
}
