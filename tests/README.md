# Birthday Manager Tests

This directory contains tests for the Birthday Manager application.

## Unit Tests (Python)

Run unit tests with:

```bash
python3 -m pytest tests/test_core.py -v
```

Or using unittest:

```bash
python3 -m unittest tests.test_core
```

## E2E Tests (Playwright)

### Setup

Install Playwright:

```bash
npm install -D @playwright/test
npx playwright install
```

### Run Tests

Run all E2E tests:

```bash
npx playwright test
```

Run tests in a specific browser:

```bash
npx playwright test --project=chromium
```

Run tests in headed mode (see browser):

```bash
npx playwright test --headed
```

### View Test Results

View HTML report:

```bash
npx playwright show-report
```

## Test Coverage

- **Unit Tests**: Core business logic (birthday management, age calculation, export/import)
- **E2E Tests**: Full user workflows (add birthday, search, sort, pagination, export, i18n, accessibility)

## Notes

- E2E tests require the server to be running (or use the webServer config)
- Tests use a test database that is cleaned up after each test
- E2E tests are configured to run on port 5001 by default

