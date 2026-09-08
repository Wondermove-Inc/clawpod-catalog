# clawpod-catalog

[![publish-catalog](https://github.com/Wondermove-Inc/clawpod-catalog/actions/workflows/publish.yml/badge.svg)](https://github.com/Wondermove-Inc/clawpod-catalog/actions/workflows/publish.yml)

ClawPoD 에이전트 게이트웨이가 사용하는 **검증·변환된 OpenClaw 모델 카탈로그 미러**입니다.

이 저장소는 upstream hosted catalog와 ClawPoD runtime 사이의 게시 경계입니다. 원본을 그대로 중계하지 않고, 게시 전에 이 레포의 수동 관리 보완 데이터를 병합하고, 구조를 확인하고 transport 관련 필드를 제거한 뒤 Git 이력으로 추적 가능한 snapshot을 제공합니다.

> 이 저장소는 모델 카탈로그 데이터와 게시 자동화만 담당합니다. 모델 요청을 proxy하지 않으며 provider endpoint, credential, runtime 설정을 배포하지 않습니다.

## 핵심 책임

- **안정된 소비 URL 제공**: ClawPoD gateway는 upstream에 직접 연결하지 않고 이 저장소의 raw artifact를 조회합니다.
- **검증과 변환**: publisher가 upstream bundle을 검사하고 ClawPoD 정책에 맞게 변환합니다.
- **변경 추적**: 게시 결과와 diff를 `main` commit으로 남깁니다.
- **방어 계층 제공**: publisher와 consumer가 각각 schema와 transport override를 검사합니다.

이 경계가 upstream 데이터의 진실성, 무중단 가용성, 암호학적 provenance, human approval 또는 fleet-wide rollback을 보장하는 것은 아닙니다. 정확한 한계는 [보안 및 신뢰 경계](#보안-및-신뢰-경계)와 [Rollback과 사고 대응](#rollback과-사고-대응)을 참고하세요.

## 아키텍처

```text
https://catalog.openclaw.ai/models/v1/catalog.json
                         │
                         │ fetch → publisher ingress 검증
                         │ sources/clawpod-providers.json 병합
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
| 수동 관리 보완 JSON | upstream에 없는 provider/model 정의와 출처 기록 |
| 이 저장소의 publisher | fetch, ingress 검증, 보완 데이터 병합, sanitize, 시각 정책, 게시 |
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
    sourceGeneratedAt,
    supplementDigest,
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
| `generatedAt` | 필수 양의 정수 | 실제 변경 시 갱신하는 단조 증가 게시 시각 | 양의 정수, 과도한 미래 시각 거부, build stamp보다 최신일 때 overlay 후보 |
| `sourceGeneratedAt` | upstream 입력에는 허용하지 않음 | 마지막으로 수락한 upstream 생성 시각 | unknown root field로 제거됨 |
| `supplementDigest` | upstream 입력에는 허용하지 않음 | 검증된 보완 입력의 SHA-256; 서명은 아님 | unknown root field로 제거됨 |
| `minVersion` | 선택 non-empty 문자열, 게시 시 [`MIN_VERSION`](MIN_VERSION) 값으로 재작성 | ClawPoD 게시 정책 값 | 선택 non-empty 문자열이며 정보용, runtime gate가 아님 |
| `sourceMinVersion` | 선택 non-empty 문자열. Upstream `minVersion`이 있으면 게시 변환이 그 값으로 설정 | 현재 upstream 원본 `minVersion` 문자열 | 선택 필드이나 존재하면 non-empty 문자열, 정보용 |
| `sourceCommit` | 선택 non-empty 문자열; commit의 진위는 검증하지 않음 | 현재 upstream 추적 문자열 | 선택 필드이나 존재하면 non-empty 문자열. 서명·검증된 provenance가 아님 |
| `providers` | 필수 record이며 `anthropic`·`openai` 존재를 별도 확인. 각 `models`는 비어 있으면 안 되며 provider 내부 중복 ID를 거부 | provider별 API 유형과 model metadata | provider별 model 최소 1개, provider 내부 model id 중복 금지 |

Publisher ingress schema와 consumer acceptance schema는 동일하지 않습니다.

| 단계 | 주요 동작 |
| --- | --- |
| Publisher ingress | Zod로 알려진 필드 형식을 검사합니다. `schemaVersion`은 ingress에서 선택이며 출력은 `1`로 정규화합니다. Unknown field는 허용하지만 빈 모델 배열과 중복 ID는 거부합니다. `anthropic`과 `openai` provider 존재를 별도로 요구합니다. |
| 게시 변환 | 수동 보완 데이터를 병합하고 `baseUrl`·`headers`·`apiKey`·`auth`·`authHeader`를 재귀 제거합니다. Root `pricing`도 제거합니다. `minVersion`을 재작성하고 가능한 경우 원본을 `sourceMinVersion`으로 보존합니다. |
| Consumer acceptance | `schemaVersion: 1`, provider별 model 최소 1개, provider 내부 중복 id 금지와 gate field를 검사합니다. 알 수 없는 provider/model payload field와 transport/pricing field는 제거합니다. |

따라서 “publisher 검증 통과”만으로 consumer acceptance를 보장한다고 가정하면 안 됩니다. 최종 계약 집행자는 `clawpod-agent`입니다.

## 게시 파이프라인

게시 명령은 [`scripts/publish-catalog.mjs`](scripts/publish-catalog.mjs), 병합·검증 로직은 [`scripts/catalog.mjs`](scripts/catalog.mjs), 자동화는 [`.github/workflows/publish.yml`](.github/workflows/publish.yml)에 있습니다.

### 1. Fetch

- 원본: `https://catalog.openclaw.ai/models/v1/catalog.json`
- timeout: 30초
- 응답 전체를 읽은 뒤 8MiB를 초과하면 게시 전 거부
- HTTP 오류와 JSON parse 오류는 fail closed

Publisher의 8MiB 검사는 streaming download/memory cap이 아닙니다. Consumer의 4MiB streaming body limit와 목적·구현이 다릅니다. 최종 직렬화한 게시 파일에는 별도로 4MiB 한도를 적용합니다.

### 2. Validate

- Zod 기반 ingress 검사
- `anthropic`, `openai` provider 존재 확인
- `generatedAt`이 현재보다 24시간을 초과해 미래이면 거부
- upstream `generatedAt`이 이전 `sourceGeneratedAt`보다 과거이면 변경하지 않음. 이전 형식의 게시본에는 `generatedAt`을 비교 기준으로 사용
- 보완 입력은 허용된 필드·API 유형만 수락하며 빈 목록·중복 ID·출처 누락을 거부

### 3. 보완 데이터 병합, sanitize와 정책 변환

- [`sources/clawpod-providers.json`](sources/clawpod-providers.json)을 매 실행마다 읽어 provider/model ID 기준으로 병합
- 같은 모델은 upstream 행 전체를 우선하며 보완 데이터로 덮어쓰지 않음
- provider API 또는 중복 모델의 유효 API가 충돌하면 게시 중단
- 중첩된 `baseUrl`, `headers`, `apiKey`, `auth`, `authHeader` 제거
- root `pricing` 제거
- [`MIN_VERSION`](MIN_VERSION) 값으로 `minVersion` 재작성
- upstream `minVersion`을 `sourceMinVersion`으로 보존
- upstream 유래 commit summary를 제한된 문자 집합으로 정규화
- 원본 시각은 `sourceGeneratedAt`, 보완 입력 digest는 `supplementDigest`로 기록
- 내용이 같으면 기존 `generatedAt`을 보존; 변경 시 현재 시각·upstream 시각·직전 게시 시각+1 중 최댓값을 사용
- 전체 결과를 검증하고 임시 파일+rename으로 교체

### 4. 변경 경로 선택

| 조건 | Workflow 동작 |
| --- | --- |
| 변경 없음 | commit 없이 종료 |
| 변경 있음 | `main`에 자동 commit/push |
| `dry_run=true` | catalog write, commit, push 없이 검증·diff만 수행 |

게시는 **무인 자동**입니다. 사람 검토를 요구하는 경로는 없습니다. Provider 삭제나 model 수 급변은 workflow log에 notice로 남을 뿐 게시를 막지 않습니다.

Schema 검증 실패, 필수 provider(`anthropic`, `openai`) 누락, API 충돌, 24시간을 초과한 미래 시각, 출력 크기 초과 또는 손상된 이전 artifact는 run을 실패시키고 기존 artifact를 유지합니다. 과거 upstream 시각은 실패 대신 변경 없이 종료합니다. 게시 시각이 upstream보다 앞서더라도 `sourceGeneratedAt` 기준으로 다음 정상 갱신을 수락합니다.

2026-09-05부터 8회 연속 실패한 원인이 이 부분입니다. 당시에는 model 수 급변(274 -> 1003)이 review 경로로 routing됐고, 그 경로가 `gh pr create`를 호출했는데 조직 정책이 GitHub Actions의 PR 생성을 금지하고 있어 branch push 직후 run이 실패했습니다. Review 경로 자체를 제거해 해결했습니다.

보완 파일 자체는 **수동 관리**합니다. 6시간 작업은 그 파일을 다시 병합할 뿐 provider API나 Clawpod-Agent 소스에서 보완 모델을 수집하지 않습니다. 수정 절차와 데이터 기준은 [sources/README.md](sources/README.md)를 참고하세요.

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
| Publisher | ingress·보완 schema 검사, 필수 provider, API 충돌 검사, 미래 skew·회귀 guard, transport/auth key 제거, 출력 크기 제한 | loose unknown field, root 수준 `pricing` 제거, upstream 신뢰 |
| Workflow | schedule/dispatch trigger, 게시 workflow의 `contents: write`, output의 env 전달, concurrency | approval 미강제, repository 설정 의존, workflow 자체의 write 권한 |
| Actions toolchain | Node.js 22 설정, lockfile 기반 `npm ci` | `actions/*@v4` major-version ref, `ubuntu-latest` rolling runner |
| Transport | GitHub HTTPS raw URL | mutable `main`, commit pin·checksum·signature 없음 |
| Consumer | HTTPS, SSRF guard, timeout, streaming size limit, acceptance gate, sanitize, temp+rename | 동시 writer race, restart 전 미적용, 유효 cache 장기 유지, model metadata·목록이 planning에 미치는 영향 |

`baseUrl`과 `headers` 제거는 remote catalog가 agent traffic endpoint를 직접 바꾸는 위험을 줄입니다. 그러나 악성 model metadata, model 목록 변경, planning 오류 또는 가용성 영향을 모두 막는 보장은 아닙니다.

Credential, token, internal endpoint 또는 secret을 catalog와 workflow output에 넣지 마세요. 현재 sanitize 규칙만으로 모든 미래 unknown field의 민감정보 부재가 자동 보장되지는 않으므로 diff review가 필요합니다.

이 workflow는 `pull_request_target`을 사용하지 않습니다. Privileged context에서 untrusted code/content를 처리하는 trigger를 추가하려면 별도 보안 설계와 검토가 필요합니다.

## 운영 Runbook

### 정상 게시 확인

1. [publish-catalog workflow](https://github.com/Wondermove-Inc/clawpod-catalog/actions/workflows/publish.yml)의 결론과 summary를 확인합니다.
2. `main`에 catalog commit이 올라갔는지 확인합니다.
3. [빠른 시작](#카탈로그-소비)의 `curl | jq`로 현재 artifact가 parse되는지 확인합니다.
4. Commit이 올라갔다는 사실을 내용 검증 완료로 간주하지 않습니다.
5. Consumer 적용이 필요하면 fetch 시점과 process restart 여부를 별도로 확인합니다.

### 수동 갱신

```bash
npm ci
node scripts/publish-catalog.mjs
```

이 명령은 실제 artifact를 씁니다. 실행 전 dry-run을 수행하고, 실행 후에는 `models/v1/catalog.json` diff를 검토하세요. 보완 파일을 수정했다면 입력과 생성 결과를 함께 검토하세요. Generated artifact를 손으로 편집하지 마세요.

### 오프라인 검증·재생성

```bash
npm test
node scripts/publish-catalog.mjs --source-file /path/to/upstream-catalog.json --dry-run
node scripts/publish-catalog.mjs --source-file /path/to/upstream-catalog.json
```

`--source-file`은 네트워크를 사용하지 않고 저장한 원본 upstream bundle을 입력으로 사용합니다. 보완 데이터 병합·시각 회귀 검사·크기 제한은 온라인 실행과 같습니다. 이미 보완된 최종 게시 파일을 입력으로 재사용하면 이전 수동 모델이 영구히 남는 문제가 생기므로 거부합니다. 원본보다 새로운 입력이 필요하면 upstream에서 다시 받아야 합니다.

### Rollback과 사고 대응

1. 잘못된 게시 commit과 영향받은 field/provider/model을 식별합니다.
2. 추가 자동 게시를 막아야 하는지 판단합니다. Scheduled publisher가 upstream 상태를 다시 게시할 수 있습니다.
3. Repository artifact는 Git 이력으로 복구할 수 있지만, 더 낮은 `generatedAt`은 이미 더 최신 bundle을 보관한 consumer cache를 덮어쓰지 못할 수 있습니다.
4. Fleet 복구는 consumer cache, configured source URL, build stamp와 process restart 상태를 별도로 확인해야 합니다.
5. 이 저장소에는 지원되는 fleet-wide rollback 명령이 없습니다. Runtime 조치는 해당 운영 승인 절차를 따르세요.

## 문제 해결

| 증상 | 확인할 내용 |
| --- | --- |
| Dry-run 결과가 `nothing to do` | upstream `generatedAt`이 게시본의 `sourceGeneratedAt`보다 과거인지, 변환 결과가 현재 artifact와 byte 단위로 같은지 확인 |
| Workflow가 `main`에 commit하지 않음 | 변경 유무(`changed`), `dry_run` 값, publish step의 검증 실패 여부 |
| Consumer에 즉시 반영되지 않음 | 6시간 TTL, stored cache, build stamp, source URL, process restart 여부 |
| Consumer가 vendored snapshot 사용 | cache 부재·손상, URL mismatch, build stamp 부재/신선도, refresh 비활성화, acceptance 오류 |
| Fetch 실패 후 이전 결과가 계속 보임 | 기존 valid cache가 유지될 수 있으며 최대 보존 기간이 없음 |

## 변경 관리

- `models/v1/catalog.json`은 generated artifact입니다. 직접 편집하지 마세요.
- 보완 모델 변경은 `sources/clawpod-providers.json`과 출처를 수정하고 재생성하세요. Upstream에도 있는 모델은 보완 파일에서 삭제해도 유지됩니다.
- Publisher 동작 변경은 [`scripts/publish-catalog.mjs`](scripts/publish-catalog.mjs)와 consumer acceptance의 차이를 함께 검토해야 합니다.
- Automation 변경은 [`.github/workflows/publish.yml`](.github/workflows/publish.yml)의 token 권한, untrusted input, trigger, concurrency를 검토해야 합니다.
- `MIN_VERSION` 변경은 게시 artifact의 `minVersion` 정책을 바꿉니다. Consumer runtime gate를 바꾸는 것은 아닙니다.
- README의 운영·보안 주장은 source와 함께 갱신하세요.

`npm test`는 네트워크·인증 없이 병합, 시각 처리, 오류 시 보존, dry-run 및 보완 데이터를 검증합니다. PR 검증 workflow와 6시간 게시 workflow 모두 실행합니다.

## Repository 구조

| 경로 | 설명 |
| --- | --- |
| [`models/v1/catalog.json`](models/v1/catalog.json) | Consumer가 조회하는 게시 artifact |
| [`scripts/publish-catalog.mjs`](scripts/publish-catalog.mjs) | Fetch·검증·변환·diff 분류 구현 |
| [`scripts/catalog.mjs`](scripts/catalog.mjs) | 병합·검증·시각 정책 |
| [`sources/clawpod-providers.json`](sources/clawpod-providers.json) | 수동 관리 보완 데이터와 출처 |
| [`sources/README.md`](sources/README.md) | 보완 데이터 갱신 방법과 범위 |
| [`tests/catalog.test.mjs`](tests/catalog.test.mjs) | 오프라인 회귀 테스트 |
| [`.github/workflows/test.yml`](.github/workflows/test.yml) | PR·main 테스트 |
| [`.github/workflows/publish.yml`](.github/workflows/publish.yml) | Schedule·manual dispatch·commit automation |
| [`MIN_VERSION`](MIN_VERSION) | 게시 artifact의 ClawPoD `minVersion` 정책 입력 |
| [`package.json`](package.json) | Publisher와 dry-run command |
| [`package-lock.json`](package-lock.json) | npm dependency lock |

## 지원 및 라이선스

- 이 저장소에는 공식 지원 담당자, 응답 시간 또는 지원 채널을 정하는 `SUPPORT`/issue policy가 없습니다. Repository의 issue 기능이 활성화되어 있다는 사실만으로 공식 지원 계약을 추정하지 마세요. 운영 조직이 별도로 지정한 채널과 절차가 있으면 그것을 따르세요.
- 장애 자료를 공유할 때는 workflow run URL과 영향을 받은 provider/model 등 재현 가능한 정보만 제공하고 credential이나 내부 endpoint는 첨부하지 마세요.
- 이 저장소에는 현재 `LICENSE` 파일이 없습니다. 별도 라이선스 정책을 확인하기 전에는 사용·복제·배포 권한을 추정하지 마세요.
