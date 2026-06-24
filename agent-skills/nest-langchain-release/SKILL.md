---
name: nest-langchain-release
description: Use when planning, reviewing, or executing nest-langchain versioning, Changesets Release PRs, npm publishing, or release-tag work.
---

# nest-langchain Release

Use the Changesets Release PR flow. Feature PRs may add changesets, but Release
PRs own version bumps, changelog updates, tags, and npm publishing.
Read `docs/publishing.md` first when it is available; treat it as the repository
source of truth.

## Workflow

1. Confirm the package change has an appropriate changeset.
2. Wait for the Changesets Release PR to aggregate pending changesets.
3. Review package versions, changelog entries, and CI.
4. Merge the Release PR and let CI publish to npm.
5. Verify with `npm view @nest-langchain/<package> version`.

## Guardrails

- Keep `.github/workflows/publish-npm.yml` as the release workflow path.
- Do not run local `npm publish`, `pnpm publish`, `pnpm release`, or
  `changeset publish`.
- Do not create or push local release tags to trigger publishing.
- Do not bypass a missing or broken Changesets Release PR with a manual release.
- Preserve package-local `README.md`, `repository.url`, and
  `repository.directory` metadata for provenance-safe publishes.
- Treat `ALLOW_NEST_LANGCHAIN_MANUAL_RELEASE_TAG_PUSH=1` as break-glass only
  after explicit maintainer approval.
