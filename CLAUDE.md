# Claude Instructions

## Release and npm publishing

- Use the Changesets Release PR flow for package releases. Feature work may add
  changesets, but versioning, changelogs, tagging, and npm publishing are
  handled by CI.
- Keep `.github/workflows/publish-npm.yml` as the release workflow path because
  npm Trusted Publishing is configured against that filename.
- Never publish packages, run `pnpm release`, or create/push release tags from a
  local checkout.
- Local pushes of `v*` and `@nest-langchain/*@*` tags are blocked unless
  `ALLOW_NEST_LANGCHAIN_MANUAL_RELEASE_TAG_PUSH=1` is set for an explicit
  break-glass release.
- When release automation is not ready, repair the automation in a normal PR
  rather than bypassing it.
