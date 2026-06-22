# Publishing

This repository is structured for independent npm packages under the `@nest-langchain/*` scope.

Before publishing:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm -r pack --dry-run
```

## GitHub Actions

Use the `Publish npm Packages` workflow for package releases.

Required repository secret:

```text
NPM_TOKEN
```

The workflow is manually dispatched and supports:

- `package: all` to publish every package with an unpublished local version
- a specific `@nest-langchain/*` package
- `npm_tag`, defaulting to `latest`
- `dry_run`, which runs the same build and pack checks without publishing

Each package job checks whether the local `package.json` version already exists
on npm. Existing versions are skipped instead of failing the whole release.

Release automation should preserve package boundaries:

- publish only package directories
- keep peer dependency ranges explicit
- do not leak `workspace:*` into published peer dependencies
- verify package tarballs include `dist`, `src`, and package-local `README.md`
