# Spoiler Maps

[![CI](https://github.com/carpiediem/spoiler-maps/actions/workflows/ci.yml/badge.svg)](https://github.com/carpiediem/spoiler-maps/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/carpiediem/spoiler-maps/branch/main/graph/badge.svg)](https://codecov.io/gh/carpiediem/spoiler-maps)
[![CodeQL](https://github.com/carpiediem/spoiler-maps/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/carpiediem/spoiler-maps/actions/workflows/codeql-analysis.yml)
[![Accessibility Scanner](https://github.com/carpiediem/spoiler-maps/actions/workflows/a11y-scan.yml/badge.svg)](https://github.com/carpiediem/spoiler-maps/actions/workflows/a11y-scan.yml)

This app will help people build maps that summarize their favorite books or movies. All the map content will be associated with a particular point in the story and will not appear (in the viewer tool) until the user tells the map how much of the book they've read. This avoids spoilers for individual people.

A story can be exported to (and imported from) a human-editable YAML file — see [docs/yaml-export-format.md](docs/yaml-export-format.md) for the schema.

## Inspiration

Ten years ago, I adapted an existing map of The Song of Ice and Fire book series into [an interactive map](https://carpiediem.github.io/game-of-thrones-map/) that included controls to avoid spoiling the plot. As the Game of Thrones TV show gained popularity, my map got [quite a bit](https://lifehacker.com/get-your-game-of-thrones-fix-with-this-interactive-spo-1782986360/) of attention. I did my best to update the map to match subsequent series of the show, but the original code was quite brittle and each change meant editing lots of JSON data by hand. Since then, I've found myself wanting to make similar maps for other stories, so I finally got around to building a tool that would make it easier.

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for dev server and builds
- [Leaflet](https://leafletjs.com/) / [react-leaflet](https://react-leaflet.js.org/) for the map
- [sql.js](https://sql.js.org/) for in-browser SQLite persistence, backed by IndexedDB
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) for tests
- [oxlint](https://oxc.rs/docs/guide/usage/linter.html) for linting, [Prettier](https://prettier.io/) for formatting

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 24+

### Setup

```bash
npm install
npm run dev
```

<!-- markdownlint-disable MD034 -->

The app will be available at http://localhost:5173.

<!-- markdownlint-enable MD034 -->

## Available Scripts

| Script                  | Description                               |
| ----------------------- | ----------------------------------------- |
| `npm run dev`           | Start the Vite dev server                 |
| `npm run build`         | Type-check and build for production       |
| `npm run preview`       | Preview the production build locally      |
| `npm run test`          | Run the test suite with Vitest            |
| `npm run test:coverage` | Run the test suite and collect coverage   |
| `npm run typecheck`     | Run the TypeScript compiler in check mode |
| `npm run lint`          | Lint the source with oxlint               |
| `npm run format`        | Format the codebase with Prettier         |
| `npm run format:check`  | Check formatting without writing changes  |

## Workflows

This repo uses a few GitHub Actions workflows under [.github/workflows](.github/workflows):

- **[CI](.github/workflows/ci.yml)** — runs on every push to `main` and every pull request. Type-checks, verifies formatting, lints, and runs the test suite with coverage, uploading the results to [Codecov](https://codecov.io/gh/carpiediem/spoiler-maps). Once CI passes on a pull request opened by Dependabot, a separate job automatically approves it and enables auto-merge.
- **[CD](.github/workflows/cd.yml)** — runs on every push to `main` (and can be triggered manually). Builds the app and deploys it to [GitHub Pages](https://carpiediem.github.io/spoiler-maps/).
- **[CodeQL](.github/workflows/codeql-analysis.yml)** — runs on push and pull requests to `main`, plus a weekly schedule. Scans the JavaScript/TypeScript source for security vulnerabilities.
- **[Accessibility Scanner](.github/workflows/a11y-scan.yml)** — manually triggered from the Actions tab. Scans the live deployed site and files GitHub issues for any accessibility violations it finds.

## Contributing

Before opening a pull request, please make sure the following pass locally:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test
```
