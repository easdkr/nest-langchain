# Agent Instructions

## Release and npm publishing

- Use the Changesets Release PR flow for package releases. Normal feature PRs
  may add changesets, but version bumps, changelog updates, tags, and npm
  publishing belong to the release automation.
- Keep `.github/workflows/publish-npm.yml` as the release workflow path because
  npm Trusted Publishing is configured against that filename.
- Do not run `npm publish`, `pnpm publish`, `pnpm release`,
  `changeset publish`, or manual tag-based releases from a local checkout.
- Do not push release tags such as `v*` or `@nest-langchain/*@*` unless the
  maintainer explicitly sets `ALLOW_NEST_LANGCHAIN_MANUAL_RELEASE_TAG_PUSH=1`
  for a break-glass operation.
- If release automation is missing or failing, stop and fix the automation in a
  reviewed PR instead of bypassing it locally.
