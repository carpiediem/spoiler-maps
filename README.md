# Spoiler Maps

[![CI](https://github.com/carpiediem/spolier-maps/actions/workflows/ci.yml/badge.svg)](https://github.com/carpiediem/spolier-maps/actions/workflows/ci.yml)

This app will help people build maps that summarize their favorite books or movies. All the map content will be associated with a particular point in the story and will not appear (in the viewer tool) until the user tells the map how much of the book they've read. This avoids spoilers for individual people.

## Inspiration

<https://carpiediem.github.io/game-of-thrones-map/>

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for dev server and builds
- [Leaflet](https://leafletjs.com/) / [react-leaflet](https://react-leaflet.js.org/) for the map
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

The app will be available at http://localhost:5173.

## Available Scripts

| Script                 | Description                               |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Start the Vite dev server                 |
| `npm run build`        | Type-check and build for production       |
| `npm run preview`      | Preview the production build locally      |
| `npm run test`         | Run the test suite with Vitest            |
| `npm run typecheck`    | Run the TypeScript compiler in check mode |
| `npm run lint`         | Lint the source with oxlint               |
| `npm run format`       | Format the codebase with Prettier         |
| `npm run format:check` | Check formatting without writing changes  |

## Continuous Integration

Every push to `main` and every pull request runs the [CI workflow](.github/workflows/ci.yml), which type-checks, verifies formatting, and runs the test suite.

## Contributing

Before opening a pull request, please make sure the following pass locally:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test
```
