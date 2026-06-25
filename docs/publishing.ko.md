# Publishing

[English](publishing.md) | [한국어](publishing.ko.md)

이 repository는 `@nest-langchain/*` scope 아래 독립 npm package를 배포하도록 구성되어 있습니다. Release는 local npm command가 아니라 Changesets와 CI를 통해 진행해야 합니다.

## Normal flow

1. Package version bump가 필요한 feature PR에는 changeset을 추가합니다: `pnpm changeset`.
   Public API, behavior, dependency, package metadata 변경에는 changeset이 필요합니다. Docs-only와 internal-only 변경에는 보통 필요하지 않습니다.
2. Review와 CI 이후 feature PR을 `main`에 merge합니다.
3. Changesets Release PR이 pending changeset을 모아 package version과 changelog를 갱신하게 둡니다.
4. Release PR의 package version, changelog text, CI status를 검토합니다.
5. Release PR을 merge합니다. npm publish step은 CI가 실행합니다.
6. Published package를 확인합니다.

```bash
npm view @nest-langchain/<package> version
```

## GitHub Actions and npm setup

`.github/workflows/publish-npm.yml` workflow는 Release PR을 만들고, Release PR이 merge된 뒤 package를 publish합니다. `main` push에서 실행되며, 같은 automation을 다시 실행하기 위해 manual dispatch도 가능합니다.

각 published `@nest-langchain/*` package는 npmjs.com에서 OIDC Trusted Publishing을 다음 값으로 설정해야 합니다.

- repository: `easdkr/nest-langchain`
- workflow: `.github/workflows/publish-npm.yml`
- environment: workflow가 environment를 쓰도록 변경되지 않는 한 unset

일반 release path에는 `NPM_TOKEN` repository secret이 필요하지 않습니다.

## Guardrails

Release work 전에 local release skill과 pre-push hook을 설치합니다.

```bash
pnpm guardrails:install
```

Release automation은 package dependency check를 통과해야 합니다.

- package directory만 publish합니다.
- peer dependency range를 명시적으로 유지합니다.
- published peer dependency에 `workspace:*`가 새어 나가지 않게 합니다.
- package tarball에 `dist`, `src`, package-local `README.md`가 포함되는지 확인합니다.

Local에서 `npm publish`, `pnpm publish`, `pnpm release`, `changeset publish`를 실행하지 마세요. Publishing trigger를 위해 local release tag를 만들거나 push하지 마세요. Release automation이 없거나 불완전하거나 실패한다면, 우회하지 말고 reviewed PR에서 automation을 먼저 고칩니다.
