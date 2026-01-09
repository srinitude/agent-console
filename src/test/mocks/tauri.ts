import { vi } from "vitest";
import type {
  Project,
  Session,
  SessionEvent,
  FileEdit,
  FileDiff,
  ActiveSessionsResult,
  IndexStatus,
  SearchResponse,
} from "@/lib/types";

// Factory functions for test data
export const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  agentType: "claude-code",
  projectPath: "/Users/test/project",
  projectName: "test-project",
  sessionCount: 5,
  subagentCount: 2,
  lastActivity: new Date().toISOString(),
  sessions: [],
  ...overrides,
});

export const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: "test-session-uuid-12345678",
  slug: "test-session",
  summary: "Test session summary",
  model: "claude-opus-4-5-20251101",
  version: "1.0.0",
  gitBranch: "main",
  startedAt: new Date().toISOString(),
  lastActivity: new Date().toISOString(),
  messageCount: 10,
  ...overrides,
});

export const createMockSessionEvent = (
  overrides: Partial<SessionEvent> = {}
): SessionEvent => ({
  sequence: 0,
  uuid: "event-uuid-123",
  timestamp: new Date().toISOString(),
  eventType: "user",
  subtype: null,
  toolName: null,
  preview: "Test event preview",
  byteOffset: 0,
  compactMetadata: null,
  summary: null,
  logicalParentUuid: null,
  leafUuid: null,
  launchedAgentId: null,
  launchedAgentDescription: null,
  launchedAgentPrompt: null,
  launchedAgentIsAsync: null,
  launchedAgentStatus: null,
  userType: "external",
  isCompactSummary: null,
  isToolResult: false,
  isMeta: false,
  ...overrides,
});

export const createMockFileEdit = (
  overrides: Partial<FileEdit> = {}
): FileEdit => ({
  path: "src/app.ts",
  editType: "modified",
  lastEditedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockFileDiff = (
  overrides: Partial<FileDiff> = {}
): FileDiff => ({
  oldString: "old content",
  newString: "new content",
  sequence: 0,
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const createMockIndexStatus = (
  overrides: Partial<IndexStatus> = {}
): IndexStatus => ({
  ready: true,
  totalEvents: 100,
  fileEditsCount: 5,
  filesEditedCount: 3,
  error: null,
  ...overrides,
});

export const createMockSearchResponse = (
  overrides: Partial<SearchResponse> = {}
): SearchResponse => ({
  matches: [],
  totalSearched: 0,
  truncated: false,
  ...overrides,
});

// Mock implementations
export const mockInvoke = vi.fn();
export const mockListen = vi.fn();
export const mockEmit = vi.fn();

// Default mock implementations for common commands
const defaultInvokeHandler = async (
  cmd: string,
  args?: Record<string, unknown>
): Promise<unknown> => {
  switch (cmd) {
    case "get_projects":
      return [createMockProject()];
    case "get_active_sessions":
      return { supported: true, activePaths: [] } as ActiveSessionsResult;
    case "get_project_sessions":
      return [createMockSession()];
    case "get_available_terminals":
      return ["macos-terminal", "iterm2"];
    case "get_indexed_events":
      return { events: [], totalCount: 0, offset: 0, hasMore: false };
    case "get_indexed_file_edits":
      return [];
    case "get_index_status":
      return createMockIndexStatus({ ready: false });
    case "watch_session":
      return undefined;
    case "unwatch_session":
      return undefined;
    case "search_session_events":
      return createMockSearchResponse();
    case "get_git_file_diff":
      return {
        original: "",
        current: "",
        existsAtHead: true,
        existsInWorkdir: true,
      };
    default:
      console.warn(`Unhandled Tauri command in mock: ${cmd}`);
      return undefined;
  }
};

// Setup Tauri mocks - call this in beforeEach
export function setupTauriMocks() {
  mockInvoke.mockImplementation(defaultInvokeHandler);
  mockListen.mockReturnValue(Promise.resolve(() => {}));
  mockEmit.mockReturnValue(Promise.resolve());

  vi.mock("@tauri-apps/api/core", () => ({
    invoke: mockInvoke,
  }));

  vi.mock("@tauri-apps/api/event", () => ({
    listen: mockListen,
    emit: mockEmit,
  }));

  vi.mock("@tauri-apps/api/webviewWindow", () => ({
    WebviewWindow: vi.fn().mockImplementation(() => ({
      once: vi.fn(),
      show: vi.fn().mockResolvedValue(undefined),
      setFocus: vi.fn().mockResolvedValue(undefined),
    })),
  }));

  vi.mock("@tauri-apps/api/window", () => ({
    getCurrentWindow: vi.fn().mockReturnValue({
      show: vi.fn().mockResolvedValue(undefined),
      setFocus: vi.fn().mockResolvedValue(undefined),
    }),
  }));
}

// Helper to reset mocks between tests
export function resetTauriMocks() {
  mockInvoke.mockClear();
  mockInvoke.mockImplementation(defaultInvokeHandler);
  mockListen.mockClear();
  mockListen.mockReturnValue(Promise.resolve(() => {}));
  mockEmit.mockClear();
}

// Helper to mock specific invoke responses
export function mockInvokeOnce(cmd: string, response: unknown) {
  mockInvoke.mockImplementationOnce(async (invokedCmd: string) => {
    if (invokedCmd === cmd) {
      return response;
    }
    return defaultInvokeHandler(invokedCmd);
  });
}

// Helper to mock invoke to throw an error
export function mockInvokeError(cmd: string, error: string) {
  mockInvoke.mockImplementationOnce(async (invokedCmd: string) => {
    if (invokedCmd === cmd) {
      throw new Error(error);
    }
    return defaultInvokeHandler(invokedCmd);
  });
}

// Helper to capture event listeners
export function captureEventListener(eventName: string) {
  let callback: ((event: { payload: unknown }) => void) | null = null;

  mockListen.mockImplementation(
    async (
      name: string,
      cb: (event: { payload: unknown }) => void
    ): Promise<() => void> => {
      if (name === eventName) {
        callback = cb;
      }
      return () => {};
    }
  );

  return {
    emit: (payload: unknown) => {
      if (callback) {
        callback({ payload });
      }
    },
    getCallback: () => callback,
  };
}
