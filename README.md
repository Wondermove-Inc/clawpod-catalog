# clawpod-catalog

ClawPoD 에이전트가 소비하는 **모델 카탈로그 미러**다. 에이전트 게이트웨이는 본가(openclaw) 호스팅 카탈로그에 직접 붙지 않고, 이 레포의 raw URL 만 바라본다.

```
본가 catalog.openclaw.ai
        │  게시 잡: fetch → zod 검증 → minVersion 재작성 → pricing 드랍 → diff 기록 → 게시
        ▼
이 레포  models/v1/catalog.json
        │  raw URL (6h 폴링, ETag)
        ▼
에이전트 게이트웨이 (clawpod-agent)
```

## 소비 URL

```
https://raw.githubusercontent.com/Wondermove-Inc/clawpod-catalog/main/models/v1/catalog.json
```

## 왜 미러인가

- **통제**: 본가 게시가 멈추거나 바뀌어도 이 레포가 방파제다. 롤백은 `git revert` 하나로 전 에이전트에 반영된다.
- **검증**: 게시 잡이 zod 검증을 통과시킨 번들만 여기 도달한다. 스냅샷과의 diff 가 커밋 이력으로 남아 사람 리뷰가 가능하다.
- **정책 분리**: 본가의 `minVersion`(본가 버전 요구)은 clawpod 와 무관하므로 게시 시점에 clawpod 패키지 버전으로 재작성하고 원본은 `sourceMinVersion` 으로 보존한다. `pricing` 맵(페이로드의 ~95%)은 clawpod 에 소비자가 없어 드랍한다.

## 파일 계약

`models/v1/catalog.json` — 본가 원격 번들과 동일 스키마(`schemaVersion: 1`):
`generatedAt` / `minVersion`(재작성됨) / `sourceMinVersion`(원본) / `sourceCommit` / `providers`.

변환 로직의 원본은 clawpod-agent 의 `scripts/refresh-model-catalog.ts` 이며, 이 레포의 `scripts/publish-catalog.mjs` 가 같은 의미론을 standalone 으로 구현한다 (+ `baseUrl`/`headers` 재귀 제거, generatedAt 미래 skew ≤24h·회귀 금지 가드).

## 게시 자동화

`.github/workflows/publish.yml` — 6시간 스케줄 + `workflow_dispatch` 만 사용한다 (`pull_request_target` 금지: fork PR 에 쓰기 토큰이 노출되는 유일한 경로).

- **자동 게시(기본)**: diff 가 작으면 main 에 직접 커밋.
- **PR 게이트**: provider 삭제가 있거나 모델 수 변동이 ±50 을 넘으면(또는 `force_pr` 입력) PR 을 열어 사람 리뷰를 거친다.
- `dry_run` 입력으로 검증·diff 만 수행할 수 있다.
- 재작성되는 `minVersion` 값은 루트 `MIN_VERSION` 파일이 결정한다.

## 수동 갱신 (비상시)

```bash
npm ci
node scripts/publish-catalog.mjs    # 본가에서 받아 검증·변환·기록
# git diff 확인 후 커밋
```

## 주의

- 이 레포의 데이터는 본가 공개 카탈로그의 파생물이며 비밀 정보를 포함하지 않는다. 비밀·자격증명·내부 엔드포인트를 절대 커밋하지 않는다.
- 에이전트 쪽 소비 코드는 번들의 `baseUrl`/`headers` 를 저장 전에 제거(sanitize)한다 — 이 레포가 탈취되더라도 에이전트 트래픽 목적지는 바꿀 수 없다. 그래도 쓰기 권한은 최소로 유지할 것.
