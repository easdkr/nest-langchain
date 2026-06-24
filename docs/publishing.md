# Publishing

This repository is structured for independent npm packages under the
`@nest-langchain/*` scope. Releases should go through Changesets and CI, not
local npm commands.

## Normal flow

1. Add a changeset in the feature PR when a package needs a version bump:
   `pnpm changeset`.
   Public API, behavior, dependency, and package metadata changes need a
   changeset; docs-only and internal-only changes usually do not.
2. Merge feature PRs to `main` after review and CI.
3. Let the Changesets Release PR collect pending changesets and update package
   versions and changelogs.
4. Review the Release PR for correct package versions, changelog text, and CI
   status.
5. Merge the Release PR. CI owns the npm publish step.
6. Verify the published packages with:

```bash
npm view @nest-langchain/<package> version
```

## GitHub Actions and npm setup

The `.github/workflows/publish-npm.yml` workflow creates Release PRs and
publishes packages after those Release PRs are merged. It runs on pushes to
`main` and can also be manually dispatched to re-run the same automation.

Each published `@nest-langchain/*` package must be configured on npmjs.com for
OIDC Trusted Publishing with:

- repository: `easdkr/nest-langchain`
- workflow: `.github/workflows/publish-npm.yml`
- environment: unset unless the workflow is updated to use one

No `NPM_TOKEN` repository secret is required for the normal release path.

## Guardrails

Install the local release skill and pre-push hook before doing release work:

```bash
pnpm guardrails:install
```

Release automation should preserve package boundaries:

- publish only package directories
- keep peer dependency ranges explicit
- do not leak `workspace:*` into published peer dependencies
- verify package tarballs include `dist`, `src`, and package-local `README.md`

Do not run `npm publish`, `pnpm publish`, `pnpm release`, or
`changeset publish` locally. Do not create or push local release tags to trigger
publishing. If release automation is missing, incomplete, or failing, fix the
automation in a reviewed PR first.
