# Agent Console (for Claude Code)

Inspect event logs, view file edits, search conversations, and analyze policy evaluations.

### Event Logs

Browse the full conversation history with timestamps. Filter by event type (me, context, assistant, system), drill into sub-agent sessions, and inspect raw JSON.

![Event Logs](docs/screenshots/1event-logs.png)

### File Edits

See every file change made during a session. Toggle between tree and log views, view side-by-side or unified diffs, and compare against git HEAD.

![File Edits](docs/screenshots/2view-edits.png)

### Boolean Search

Search across the entire session with AND/OR operators. Matching terms are highlighted in context snippets.

![Boolean Search](docs/screenshots/3boolean-search.png)

### Policy Viewer

Visualize [Cupcake](https://github.com/eqtylab/cupcake) policy evaluations with timing traces. See which policies matched, what decisions were made (Allow, Deny, Halt), and why.

![Policy Viewer](docs/screenshots/4cupcake-policy-viewer.png)

---

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Bun](https://bun.sh/)

### Install Dependencies

```bash
bun install
```

### Development

```bash
bun run tauri dev
```

### Build

```bash
bun run tauri build
```

The built app will be in `src-tauri/target/release/bundle/`.

---

## Testing

The project includes comprehensive test coverage with unit tests, component tests, and end-to-end tests.

### Unit & Component Tests (Vitest)

```bash
# Run tests once
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage report
bun run test:coverage

# Run tests with UI
bun run test:ui
```

### End-to-End Tests (Playwright)

```bash
bun run test:e2e
```

### Rust Tests

```bash
bun run test:rust
```

### Type Checking

```bash
bun run typecheck
```

---

## CI

GitHub Actions automatically runs all tests on push and pull requests. See `.github/workflows/test.yml` for the workflow configuration.
