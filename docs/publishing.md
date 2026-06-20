# Publishing

This repository is structured for independent npm packages under the `@nest-langchain/*` scope.

Before publishing:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm -r pack --dry-run
```

Release automation should preserve package boundaries:

- publish only package directories
- keep peer dependency ranges explicit
- do not leak `workspace:*` into published peer dependencies
- verify package tarballs include `dist`, `src`, and package-local `README.md`

