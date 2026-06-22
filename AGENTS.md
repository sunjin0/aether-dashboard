# AGENTS.md

## Project Shape
- Single Umi Max / Ant Design Pro React app; runtime wiring is in `config/config.ts` and `src/app.tsx`, not a separate `main.tsx` entrypoint.
- Routes are manually declared in `config/routes.ts`; route components resolve under `src/pages`.
- `src/app.tsx` fetches current user info from `/api/sys/info` and redirects unauthenticated users to `/login`; layout menus are loaded at runtime from `/api/sys/getRouters`.
- API wrappers live under `src/services/**` and use `@umijs/max` `request`; shared response/entity types live under `src/services/entity`.
- Path aliases are configured as `@/* -> src/*`, with Umi generated aliases `@@/* -> src/.umi/*` and `@@test/* -> src/.umi-test/*`.

## Commands
- Install/setup: use `npm install`; Jenkins also uses `npm install --prefer-offline`, and `postinstall` runs `max setup`.
- Dev with local backend proxy disabled for mocks: `npm run start:dev` or `npm run dev` (`REACT_APP_ENV=dev MOCK=none UMI_ENV=dev max dev`).
- Other dev targets: `npm run start:test` targets the `test` proxy, `npm run start:pre` targets `pre`, and `npm run start:no-mock` sets only `MOCK=none UMI_ENV=dev`.
- Build: `npm run build` (`max build`); preview runs a fresh build first via `npm run preview`.
- Verification: `npm run lint` runs ESLint on `src`, Prettier with write mode, then `tsc --noEmit`; run `git diff` after lint because `lint:prettier` mutates files.
- Focused checks: `npm run lint:js`, `npm run tsc`, `npm run test -- <jest args>`, `npm run test:update` for snapshots, `npm run test:coverage` for coverage.
- OpenAPI generation: `npm run openapi`; it reads `config/oneapi.json` plus a remote Swagger schema from `config/config.ts` and can rewrite generated service/mock code.

## Environment And Generated Files
- Local `/api/` proxy for `REACT_APP_ENV=dev` points to `http://localhost:8080/` with `pathRewrite: { '^': '' }`; production builds do not use this proxy.
- Generated Umi output directories `.umi`, `.umi-production`, `.umi-test`, plus `dist`, `coverage`, and `build` are ignored; do not edit generated files directly.
- `yarn.lock` exists locally but `.gitignore` ignores lockfiles and CI uses npm, so do not assume the lockfile is the committed dependency source of truth.
- `.yarnrc.yml` sets `nodeLinker: node-modules`; there is no Plug'n'Play setup despite the `.yarn/` install-state directory.

## Tests And CI
- Jest config is async via `@umijs/max/test`, uses browser target, `url: http://localhost:8000`, and setup file `tests/setupTests.jsx` for `localStorage`, `URL.createObjectURL`, `Worker`, and `matchMedia` mocks.
- Jenkins is the only checked-in CI config; it runs `npm install --prefer-offline`, `npm run build`, then copies `dist/*` to `/var/www/html/aether-dashboard` and reports GitHub commit status under `jenkins-ci`.
- Commit messages are expected to satisfy `@commitlint/config-conventional`; lint-staged runs ESLint for JS/TS and Prettier for JS/TS/Less/Markdown/JSON/YAML if hooks are installed.
