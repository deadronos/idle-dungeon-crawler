# Idle Dungeon Crawler

A browser-based incremental RPG where you manage a party of heroes fighting through dungeon floors. The project uses React + TypeScript + Vite and is structured with explicit architecture documentation in `docs/ARCHITECTURE`.

## Features

- Three-hero starter party with distinct classes
- Active Time Battle (ATB) simulation
- Separate toggles for Autofight and Autoadvance to enable strategic farming
- Persistent gold-upgrades via an in-game shop
- Live combat log and per-unit skill banners
- Tailwind CSS + shadcn/Base UI styling
- Full testing suite with Vitest + Testing Library
- GitHub Pages deployment on `v*` tags

## Getting started

```sh
# install dependencies
npm ci

# run development server
npm run dev

# build production
npm run build
```

## Testing

Run the full test set with coverage:

```sh
npm run test
```

Interactive watch mode:

```sh
npm run test:watch
```

## Deployment

Deploys automatically to GitHub Pages at `https://deadronos.github.io/idle-dungeon-crawler/` when a tag matching `v*` is pushed. Edit the `base` field in `vite.config.ts` or the workflow if the repository path changes.

Tag and push to release:

```sh
git tag v1.0.0
git push origin v1.0.0
```

## License

This repository is licensed under the MIT license. See [LICENSE.md](LICENSE.md) for details.
