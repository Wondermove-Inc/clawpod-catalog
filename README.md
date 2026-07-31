# clawpod-catalog

[![publish-catalog](https://github.com/Wondermove-Inc/clawpod-catalog/actions/workflows/publish.yml/badge.svg)](https://github.com/Wondermove-Inc/clawpod-catalog/actions/workflows/publish.yml)

ClawPoD 에이전트 게이트웨이가 사용하는 **검증·변환된 OpenClaw 모델 카탈로그 미러**입니다.

이 저장소는 upstream hosted catalog와 ClawPoD runtime 사이의 게시 경계입니다. 원본을 그대로 중계하지 않고, 게시 전에 구조를 확인하고 transport 관련 필드를 제거한 뒤 Git 이력으로 추적 가능한 snapshot을 제공합니다.

> 이 저장소는 모델 카탈로그 데이터와 게시 자동화만 담당합니다. 모델 요청을 proxy하지 않으며 provider endpoint, credential, runtime 설정을 배포하지 않습니다.

## 핵심 책임

- **안정된 소비 URL 제공**: ClawPoD gateway는 upstream에 직접 연결하지 않고 이 저장소의 raw artifact를 조회합니다.
- **검증과 변환**: publisher가 upstream bundle을 검사하고 ClawPoD 정책에 맞게 변환합니다.
- **변경 추적**: 게시 결과와 diff를 Git commit 또는 review PR 경로로 남깁니다.
- **방어 계층 제공**: publisher와 consumer가 각각 schema와 transport override를 검사합니다.

이 경계가 upstream 데이터의 진실성, 무중단 가용성, 암호학적 provenance, human approval 또는 fleet-wide rollback을 보장하는 것은 아닙니다. 정확한 한계는 [보안 및 신뢰 경계](#보안-및-신뢰-경계)와 [Rollback과 사고 대응](#rollback과-사고-대응)을 참고하세요.

## 아키텍처

```text
https://catalog.openclaw.ai/models/v1/catalog.json
                         │
                         │ fetch → publisher ingress 검증
                         │ sanitize/transform → diff 분류
                         ▼
              models/v1/catalog.json
                         │
                         │ GitHub raw main URL
                         │ ETag / If-Modified-Since
                         ▼
                 clawpod-agent cache
                         │
                         │ consumer acceptance gate
                         │ 다음 process restart에서 planning에 적용
                         ▼
                     models.json
```

| 구성요소 | 책임 |
| --- | --- |
| Upstream catalog | 원본 모델 metadata와 추적 필드 제공 |
| 이 저장소의 publisher | fetch, ingress 검증, sanitize, 정책 변환, 게시 경로 선택 |
| GitHub repository | mutable `main` artifact와 변경 이력 제공 |
| `clawpod-agent` | HTTPS fetch, consumer gate, cache, build-stamp 비교, runtime 적용 결정 |

## 빠른 시작

### 카탈로그 소비

공개 소비 URL:

```text
https://raw.githubusercontent.com/Wondermove-Inc/clawpod-catalog/main/models/v1/catalog.json
```

현재 artifact의 metadata와 규모를 확인하려면:

```bash
CATALOG_URL="https://raw.githubusercontent.com/Wondermove-Inc/clawpod-catalog/main/models/v1/catalog.json"

curl -fsSL "$CATALOG_URL" |
  jq '{
    schemaVersion,
    generatedAt,
    minVersion,
    sourceMinVersion,
    sourceCommit,
    providers: (.providers | length),
    models: ([.providers[].models[]] | length)
  }'
```

고정 provider/model 수를 문서에 적지 않는 이유는 카탈로그가 게시될 때마다 바뀔 수 있기 때문입니다. 운영 판단에는 항상 현재 artifact를 사용하세요.

### 게시 dry-run

```bash
npm ci
npm run publish-catalog:dry-run
```

`npm ci`는 local `node_modules`를 변경합니다. 이어지는 publisher `--dry-run`은 upstream을 실제로 조회하고 검증·diff 판단을 수행하지만 `models/v1/catalog.json`은 쓰지 않습니다. 이 명령은 offline validator나 test suite가 아닙니다.

## Artifact 계약

게시 artifact는 [`models/v1/catalog.json`](models/v1/catalog.json)입니다.

| 필드 | Publisher ingress | 현재 게시 artifact | Consumer 경계 |
| --- | --- | --- | --- |
| `schemaVersion` | 선택 필드이나 존재하면 `1` | `1` | 반드시 `1`이어야 함 |
| `generatedAt` | 필수 양의 정수 | upstream 생성 시각 | 양의 정수, 과도한 미래 시각 거부, build stamp보다 최신일 때 overlay 후보 |
| `minVersion` | 선택 문자열, 게시 시 [`MIN_VERSION`](MIN_VERSION) 값으로 재작성 | ClawPoD 게시 정책 값 | 선택 non-empty 문자열이며 정보용, runtime gate가 아님 |
| `sourceMinVersion` | schema에 선언되지 않은 unknown field로 통과할 수 있음. Upstream `minVersion`이 truthy이면 게시 변환이 그 값으로 설정 | 현재 upstream 원본 `minVersion` 문자열 | 선택 필드이나 존재하면 non-empty 문자열, 정보용 |
| `sourceCommit` | schema에 선언되지 않은 unknown field로 형식 검증 없이 통과·보존될 수 있음 | 현재 upstream 추적 문자열 | 선택 필드이나 존재하면 non-empty 문자열. 서명·검증된 provenance가 아님 |
| `providers` | 필수 record이며 `anthropic`·`openai` 존재를 별도 확인. 각 `models`는 배열이나 ingress에서 비어 있을 수 있음 | provider별 API 유형과 model metadata | provider별 model 최소 1개, provider 내부 model id 중복 금지 |

Publisher ingress schema와 consumer acceptance schema는 동일하지 않습니다.

| 단계 | 주요 동작 |
| --- | --- |
| Publisher ingress | Zod로 알려진 필드 형식을 검사합니다. `schemaVersion`은 ingress에서 선택이고 provider의 빈 model 배열 및 unknown field가 허용될 수 있습니다. `anthropic`과 `openai` provider 존재를 별도로 요구합니다. |
| 게시 변환 | `baseUrl`·`headers`를 재귀 제거하고 root `pricing`을 제거합니다. `minVersion`을 재작성하고 가능한 경우 원본을 `sourceMinVersion`으로 보존합니다. |
| Consumer acceptance | `schemaVersion: 1`, provider별 model 최소 1개, provider 내부 중복 id 금지와 gate field를 검사합니다. 알 수 없는 provider/model payload field와 transport/pricing field는 제거합니다. |

따라서 “publisher 검증 통과”만으로 consumer acceptance를 보장한다고 가정하면 안 됩니다. 최종 계약 집행자는 `clawpod-agent`입니다.

## 게시 파이프라인

게시 구현은 [`scripts/publish-catalog.mjs`](scripts/publish-catalog.mjs), 자동화는 [`.github/workflows/publish.yml`](.github/workflows/publish.yml)에 있습니다.

### 1. Fetch

- 원본: `https://catalog.openclaw.ai/models/v1/catalog.json`
- timeout: 30초
- 응답 전체를 읽은 뒤 8MiB를 초과하면 게시 전 거부
- HTTP 오류와 JSON parse 오류는 fail closed

Publisher의 8MiB 검사는 streaming download/memory cap이 아닙니다. Consumer의 4MiB streaming body limit와 목적·구현이 다릅니다.

### 2. Validate

- Zod 기반 ingress 검사
- `anthropic`, `openai` provider 존재 확인
- `generatedAt`이 현재보다 24시간을 초과해 미래이면 거부
- upstream `generatedAt`이 현재 게시본보다 과거이면 변경하지 않음

### 3. Sanitize와 정책 변환

- 중첩된 `baseUrl`, `headers` 제거
- root `pricing` 제거
- [`MIN_VERSION`](MIN_VERSION) 값으로 `minVersion` 재작성
- upstream `minVersion`을 `sourceMinVersion`으로 보존
- upstream 유래 commit summary를 제한된 문자 집합으로 정규화

### 4. 변경 경로 선택

| 조건 | Workflow 동작 |
| --- | --- |
| 변경 없음 | commit·PR 없이 종료 |
| provider 삭제 없음, model 수 변동 절댓값 ≤ 50, `force_pr=false` | `main`에 자동 commit/push 시도 |
| provider 삭제, model 수 변동 절댓값 > 50 또는 `force_pr=true` | 별도 branch를 push하고 review PR 생성 시도 |
| `dry_run=true` | catalog write, commit, push, PR 없이 검증·diff만 수행 |

PR 경로는 사람 검토가 필요한 변경을 분리하기 위한 **routing**입니다. required reviewer, 승인 또는 merge를 강제하지 않습니다. PR 생성은 repository의 GitHub Actions 설정에도 의존합니다.

Workflow는 nominal 6시간 cron(`17 */6 * * *`)과 수동 dispatch로 실행됩니다. 동일 concurrency group에서 동시에 하나만 실행하고 running run은 취소하지 않지만, 대기 중인 pending run은 새 pending run으로 대체될 수 있습니다.

## Consumer lifecycle

`clawpod-agent`의 기본 source는 이 저장소의 raw URL입니다.

1. Gateway가 process 시작 후 즉시 확인하고 이후 6시간 TTL에 따라 확인합니다.
2. HTTPS만 허용하며 SSRF guard, 15초 timeout, 4MiB streaming body limit를 적용합니다.
3. ETag와 Last-Modified가 있으면 conditional request를 사용합니다.
4. 통과한 bundle을 state directory cache에 temp file + rename 방식으로 저장합니다.
5. 저장된 bundle이 build stamp보다 최신이고 acceptance gate를 통과하면 vendored snapshot 자리에 overlay합니다.
6. 새로 fetch한 bundle은 live state를 즉시 바꾸지 않습니다. 다음 process restart 이후 models.json planning에서 적용됩니다.

### Cache와 fallback의 정확한 의미

- 동일 source URL의 **순차 실행**에서는 더 오래된 `generatedAt`이 더 최신 cache를 덮어쓰지 않도록 검사합니다.
- compare와 rename은 atomic CAS가 아닙니다. Gateway와 CLI 같은 동시 writer가 경합하면 stale bundle이 일시적으로 덮어쓸 수 있으며 이후 refresh에서 수렴할 수 있습니다.
- source URL이 달라지면 timestamp와 무관하게 새 source의 store로 교체될 수 있습니다.
- fetch, JSON 또는 새 bundle validation 실패는 기존의 유효한 cache를 자동 삭제하지 않습니다.
- 유효한 remote cache에는 별도의 최대 보존 기간이 없습니다. Build stamp보다 최신이면 다음 restart에서도 계속 overlay가 될 수 있습니다.
- Cache 부재·손상, source URL 불일치, build stamp 부재, stored bundle이 build stamp보다 오래됨, refresh 비활성화 등 overlay gate가 성립하지 않으면 vendored snapshot이 사용됩니다.

Consumer 세부 구현은 [`clawpod-agent` model catalog 문서](https://github.com/Wondermove-Inc/clawpod-agent/blob/main/docs/concepts/model-catalog.md)를 참고하세요.

## 보안 및 신뢰 경계

| 계층 | 현재 방어 | 남는 위험 |
| --- | --- | --- |
| Publisher | ingress schema 검사, 필수 provider, 미래 skew·회귀 guard, transport key 제거 | loose unknown field, root 수준 `pricing` 제거, upstream 신뢰 |
| Workflow | schedule/dispatch trigger, 명시된 `contents: write`·`pull-requests: write`, output의 env 전달, concurrency | approval 미강제, repository 설정 의존, workflow 자체의 write 권한 |
| Actions toolchain | Node.js 22 설정, lockfile 기반 `npm ci` | `actions/*@v4` major-version ref, `ubuntu-latest` rolling runner, runner 제공 `gh`는 immutable pin이 아님 |
| Transport | GitHub HTTPS raw URL | mutable `main`, commit pin·checksum·signature 없음 |
| Consumer | HTTPS, SSRF guard, timeout, streaming size limit, acceptance gate, sanitize, temp+rename | 동시 writer race, restart 전 미적용, 유효 cache 장기 유지, model metadata·목록이 planning에 미치는 영향 |

`baseUrl`과 `headers` 제거는 remote catalog가 agent traffic endpoint를 직접 바꾸는 위험을 줄입니다. 그러나 악성 model metadata, model 목록 변경, planning 오류 또는 가용성 영향을 모두 막는 보장은 아닙니다.

Credential, token, internal endpoint 또는 secret을 catalog와 workflow output에 넣지 마세요. 현재 sanitize 규칙만으로 모든 미래 unknown field의 민감정보 부재가 자동 보장되지는 않으므로 diff review가 필요합니다.

이 workflow는 `pull_request_target`을 사용하지 않습니다. Privileged context에서 untrusted code/content를 처리하는 trigger를 추가하려면 별도 보안 설계와 검토가 필요합니다.

## 운영 Runbook

### 정상 게시 확인

1. [publish-catalog workflow](https://github.com/Wondermove-Inc/clawpod-catalog/actions/workflows/publish.yml)의 결론과 summary를 확인합니다.
2. 자동 mode면 `main` commit, review mode면 branch와 PR 생성 여부를 확인합니다.
3. [빠른 시작](#카탈로그-소비)의 `curl | jq`로 현재 artifact가 parse되는지 확인합니다.
4. PR이 생성됐다는 사실을 승인 완료로 간주하지 않습니다.
5. Consumer 적용이 필요하면 fetch 시점과 process restart 여부를 별도로 확인합니다.

### 수동 갱신

```bash
npm ci
node scripts/publish-catalog.mjs
```

이 명령은 실제 artifact를 씁니다. 실행 전 dry-run을 수행하고, 실행 후에는 **`models/v1/catalog.json` diff만** 검토하세요. Generated artifact를 손으로 편집하지 마세요.

### Rollback과 사고 대응

1. 잘못된 게시 commit과 영향받은 field/provider/model을 식별합니다.
2. 추가 자동 게시를 막아야 하는지 판단합니다. Scheduled publisher가 upstream 상태를 다시 게시할 수 있습니다.
3. Repository artifact는 Git 이력으로 복구할 수 있지만, 더 낮은 `generatedAt`은 이미 더 최신 bundle을 보관한 consumer cache를 덮어쓰지 못할 수 있습니다.
4. Fleet 복구는 consumer cache, configured source URL, build stamp와 process restart 상태를 별도로 확인해야 합니다.
5. 이 저장소에는 지원되는 fleet-wide rollback 명령이 없습니다. Runtime 조치는 해당 운영 승인 절차를 따르세요.

## 문제 해결

| 증상 | 확인할 내용 |
| --- | --- |
| Dry-run 결과가 `nothing to do` | upstream `generatedAt`이 현재 게시본보다 과거인지, 변환 결과가 현재 artifact와 byte 단위로 같은지 확인 |
| 예상한 PR이 없음 | `needs_review`, `force_pr`, 변경 유무, Actions의 PR 생성 설정과 workflow log |
| Workflow가 `main`에 바로 commit | provider 삭제 여부, model 수 변동이 **50 초과**인지, `force_pr` 값 |
| Consumer에 즉시 반영되지 않음 | 6시간 TTL, stored cache, build stamp, source URL, process restart 여부 |
| Consumer가 vendored snapshot 사용 | cache 부재·손상, URL mismatch, build stamp 부재/신선도, refresh 비활성화, acceptance 오류 |
| Fetch 실패 후 이전 결과가 계속 보임 | 기존 valid cache가 유지될 수 있으며 최대 보존 기간이 없음 |

## 변경 관리

- `models/v1/catalog.json`은 generated artifact입니다. 직접 편집하지 마세요.
- Publisher 동작 변경은 [`scripts/publish-catalog.mjs`](scripts/publish-catalog.mjs)와 consumer acceptance의 차이를 함께 검토해야 합니다.
- Automation 변경은 [`.github/workflows/publish.yml`](.github/workflows/publish.yml)의 token 권한, untrusted input, trigger, concurrency를 검토해야 합니다.
- `MIN_VERSION` 변경은 게시 artifact의 `minVersion` 정책을 바꿉니다. Consumer runtime gate를 바꾸는 것은 아닙니다.
- README의 운영·보안 주장은 source와 함께 갱신하세요.

현재 저장소에는 별도의 offline validator 또는 test script가 없습니다. 존재하지 않는 검증 명령을 문서화하지 마세요.

## Repository 구조

| 경로 | 설명 |
| --- | --- |
| [`models/v1/catalog.json`](models/v1/catalog.json) | Consumer가 조회하는 게시 artifact |
| [`scripts/publish-catalog.mjs`](scripts/publish-catalog.mjs) | Fetch·검증·변환·diff 분류 구현 |
| [`.github/workflows/publish.yml`](.github/workflows/publish.yml) | Schedule·manual dispatch·commit/PR automation |
| [`MIN_VERSION`](MIN_VERSION) | 게시 artifact의 ClawPoD `minVersion` 정책 입력 |
| [`package.json`](package.json) | Publisher와 dry-run command |
| [`package-lock.json`](package-lock.json) | npm dependency lock |

## 지원 및 라이선스

- 이 저장소에는 공식 지원 담당자, 응답 시간 또는 지원 채널을 정하는 `SUPPORT`/issue policy가 없습니다. Repository의 issue 기능이 활성화되어 있다는 사실만으로 공식 지원 계약을 추정하지 마세요. 운영 조직이 별도로 지정한 채널과 절차가 있으면 그것을 따르세요.
- 장애 자료를 공유할 때는 workflow run URL과 영향을 받은 provider/model 등 재현 가능한 정보만 제공하고 credential이나 내부 endpoint는 첨부하지 마세요.
- 이 저장소에는 현재 `LICENSE` 파일이 없습니다. 별도 라이선스 정책을 확인하기 전에는 사용·복제·배포 권한을 추정하지 마세요.
