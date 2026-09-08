# 수동 관리 보완 카탈로그

`clawpod-providers.json`은 이 레포가 직접 관리하는 추가 모델 입력입니다.
6시간 게시 작업은 OpenClaw upstream과 이 파일을 병합합니다. **Clawpod-Agent를
clone하거나 실행하지 않으며, provider API에서 이 파일을 자동 수집하지 않습니다.**

## 데이터의 기준과 공식 자료 재검토

Clawpod-Agent commit `b46fcc3becf5cb0304d6a5578a7b7343345a2f1d`의 모델 정의와
그 checkout에 설치된 `@mariozechner/pi-ai@0.66.1`을 참고했습니다. 각 provider의
`provenance`에 파일 경로, revision, 적용 기준을 기록했습니다. SDK 데이터에는
실제로 읽은 `models.generated.js`의 SHA-256도 포함합니다. 이는 데이터 추적용이며
원격 provider가 지금 모든 모델을 제공한다는 보증이나 서명은 아닙니다.

2026-09-08 공식 자료로 가격·수명주기를 재검토했습니다. 수정 근거와 제외 목록은
[REVIEW.md](REVIEW.md)에 있습니다. 아래는 재검토 후 보완 입력입니다.

| Provider                    | 보완 모델 수 | 데이터 기준                                                           |
| --------------------------- | -----------: | --------------------------------------------------------------------- |
| `openai-codex`              |           15 | SDK 9개 + 플러그인 augmentation. 중복은 플러그인 우선                 |
| `google`                    |           12 | 플러그인 정적 Gemini 목록; preview 포함                               |
| `google-vertex`             |           12 | Vertex builder와 같이 Google 모델 목록 공유                           |
| `xai`                       |           10 | 현행 7개 + 공식 전환 안내가 있는 별칭 3개                             |
| `minimax`, `minimax-portal` |       각각 3 | 플러그인의 text 모델 목록                                             |
| `amazon-bedrock`            |           87 | SDK의 모델·inference profile ID 목록                                  |
| `amazon-bedrock-mantle`     |            5 | 소스에 명시된 Claude 모델만 포함; 동적 탐색 목록은 미수집             |
| `anthropic-vertex`          |           11 | `global` 지역, 2026-09-08 기준 표준 가격                              |
| `openrouter`                |          181 | 공개 API에 있는 기존 180개 + Agent auto 별칭                          |
| `zai`                       |            6 | 에이전트 내장 JSON의 기준 목록; upstream에는 이미 더 많은 모델이 있음 |

숫자는 **현재 보완 입력**의 규모입니다. 최종 artifact의 목록·개수는 upstream과
병합되므로 다릅니다. Google과 zAI는 upstream에도 있으며, 일반 병합에서는 기존 행이 우선합니다.

- Google 비용은 공식 표준 text/image 기본 가격으로 교체했습니다. Vertex는 global 기준입니다.
- Codex·MiniMax Portal의 USD/token 구독 비용과 Mantle의 미확인 비용은 생략했습니다.
  비용 미상을 0원으로 게시하지 않습니다.
- OpenRouter `openrouter/auto`의 음수 가격 sentinel은 변환 시 `cost` 전체를 생략했습니다.
  가격 미상을 0원으로 바꾸지 않습니다. `auto`와 `openrouter/auto`는 소스에 각각 있는 ID입니다.
- Codex 최신 모델의 272K context window는 플러그인의 운영 예산이며 서비스 최대 한도를
  새로 측정한 값이 아닙니다. 기존 SDK의 일반 API 가격도 Codex 구독 비용으로 사용하지 않습니다.
- xAI의 일부 최대 출력 길이는 원본이 명시적으로 사용하는 보수적 fallback입니다.
- AWS 모델·profile ID는 지역·계정 권한에 따라 달라집니다. 이 파일은 자격 증명이나
  endpoint를 배포하지 않고 AWS 계정에서 모델을 탐색하지 않습니다.
- Anthropic Vertex 가격은 global 기준입니다. 지역별 가용성·가격은 다를 수 있습니다.
  모델별 `anthropic-messages` API를 가진 Mantle 행도 그대로 유지합니다.
- `gpt-5.2`와 `gpt-5.3-codex`의 deprecated 표시는 유지합니다. ChatGPT 로그인용
  `gpt-5.4`/`gpt-5.4-mini`는 종료되어 disabled 및 공식 대체 모델을 기록했습니다.
- 카탈로그 추가만으로 provider 인증이나 활성화를 설정하지는 않습니다.

## 수정 절차

1. `providers.<provider>.models`를 수정하고 같은 provider의 `provenance`를 갱신합니다.
2. `npm run publish-catalog:dry-run`으로 입력 검증과 병합 결과를 확인합니다.
3. `npm run publish-catalog`로 생성합니다.
4. `npm test`를 실행하고 입력·출력 diff를 함께 검토합니다. 테스트는 생성 파일에 보완 모델이 모두 반영됐는지도 확인합니다.
5. 보완 JSON, 출처 문서, 생성된 `models/v1/catalog.json`을 함께 커밋합니다.

원본 upstream을 저장해 두었다면 `--source-file /path/to/upstream.json`으로
오프라인 재생성이 가능합니다. 새 형식의 **최종 artifact를 upstream 입력으로
재사용할 수 없습니다.** 이미 병합된 수동 모델이 삭제되지 않고 남는 것을 막기 위함입니다.

## 입력 계약과 병합 규칙

- Root에는 `schemaVersion: 1`, `provenance`, `providers`와 선택적 `corrections`만 허용합니다.
- Provider에는 `api`, 비어 있지 않은 `models`가 필요합니다.
- Model에는 `id`, `name`, `input`, `reasoning`, `contextWindow`, `maxTokens`가 필요합니다.
  선택 필드는 `api`, `contextTokens`, `cost`, `status`, `replacedBy`입니다.
- 비용을 모르면 `cost`를 생략합니다. 비용이 있으면 `input`, `output`은 필수이며
  `cacheRead`, `cacheWrite`는 선택입니다. 모든 비용은 유한한 0 이상의 숫자입니다.
- ID는 provider 내부에서 중복될 수 없습니다. `openrouter`처럼 `/`가 포함된 모델 ID는
  provider 접두어를 임의로 제거하거나 추가하지 말고 소스 값을 그대로 기록합니다.
- `baseUrl`, `headers`, `apiKey`, `auth`, `authHeader` 및 그 밖의 미정의 필드는 보완 입력에서 거부합니다.
- 같은 provider가 없으면 추가하고, 있으면 없는 model ID만 추가합니다.
- 같은 model ID가 양쪽에 있으면 일반 병합에서는 **upstream 행 전체**를 유지합니다.
  병합 후 아래의 검증된 `corrections`만 조건부로 적용합니다.
- Provider API가 다르거나 같은 모델의 유효 API가 다르면 게시가 실패합니다.
  Upstream의 API 변경을 확인하고 보완 파일을 수정해야 합니다. 모델별 API는 provider 기본값보다 우선합니다.
- 보완 파일에서만 제공하던 모델을 삭제하면 다음 재생성에서 빠집니다. Upstream에도 있는
  모델은 유지됩니다. 반대로 upstream이 모델을 삭제해도 보완 파일에 남아 있으면 다시 추가됩니다.
  모델 폐기 시 두 소스의 상태를 확인하고 보완 파일도 함께 수정해야 합니다.
- 전체 보완 파일이 없거나 손상되면 게시를 중단합니다. 조용히 보완 provider를 누락시키지 않습니다.

## 검증된 보정과 날짜 전환

`corrections`는 공식 근거 URL과 정확한 기존 값을 명시한 예외입니다. 모든 규칙은
보완 목록에 있는 provider/model만 대상으로 하며, 모델을 새로 만들거나 활성화하지 않습니다.

- `kind: cost`: `expected`의 모든 비용 필드가 현재 값과 일치할 때만 `set`을 적용합니다.
  수정하는 필드에는 반드시 기존 값 조건이 필요합니다. 다른 비용·모델 필드는 보존하며,
  upstream이 이미 다른 가격으로 바뀌었거나 비용 자체가 없으면 건너뜁니다.
- `kind: status`: `from` 상태와 일치할 때만 `deprecated` 또는 `disabled`로 바꿉니다.
  `from: null`은 상태가 없는 행입니다. `replacedBy`는 공식 대체 ID가 있을 때 기록합니다.
- `effectiveAt`은 선택적인 UTC epoch 밀리초입니다. 게시 시각이 경계 이상이면 적용합니다.
  목록 순서대로 처리하므로 Legacy → EOL 전환은 두 규칙으로 표현할 수 있습니다.
- 현재 zAI의 오래된 upstream 가격, Codex 종료 상태, Vertex Sonnet 5 인상 취소와
  AWS EOL·zAI Flash 할인 종료·Gemini 도입 가격 종료를 관리합니다.
- 날짜 규칙은 **다음 정상 6시간 게시에서** 반영됩니다. 경계 시각에 별도 작업을 실행하지
  않으므로 cron 간격만큼 지연될 수 있습니다. 원본 시각이 같아도 결과가 바뀌면 게시합니다.
- 날짜가 지나면 CI가 임의로 실패하는 방식이 아닙니다. 외부 정책 변경·할인 연장·인상 취소는
  여전히 수동으로 확인해야 합니다. Google/AWS가 날짜만 공지한 경우 UTC 자정을 게시 기준으로 씁니다.
- 규칙은 공급자 API를 자동 수집하지 않습니다. 일반 API 가격을 구독 요금으로 환산하지 않습니다.

비용은 기본 표준 요금입니다. Gemini Pro의 장문 가격, MiniMax M3의 512K 초과 요금,
xAI 장문 요금, Priority 및 지역별 차이는 단일 기본 `cost`만으로 표현하지 않습니다.
확인된 세부 조건은 REVIEW.md에 기록하며, upstream이 제공하는 추가 가격 필드는 보존합니다.

## 시각과 실패 동작

`sourceGeneratedAt`은 upstream 시각, `generatedAt`은 최종 게시 시각입니다.
기존 형식은 `generatedAt`을 원본 시각으로 간주해 첫 실행에서 마이그레이션합니다.
보완 파일만 바뀌어도 게시 시각이 증가하지만, 동일 입력 재실행은 byte 단위로 동일합니다.
`MIN_VERSION`과 보완 출처 변경도 게시 입력 변경에 포함됩니다.

Upstream이 마지막으로 수락한 원본보다 과거이면 전체 실행이 변경 없이 종료됩니다.
네트워크 실패 시에도 보완 파일만 따로 게시하지 않습니다. 이 경우 최신 원본을 확보한 뒤
재실행해야 합니다. 미래 시각, API 충돌, 최종 4MiB 초과 및 검증 오류는 기존 artifact를
유지하며 실패합니다. 정상 결과는 임시 파일을 쓴 뒤 rename으로 교체합니다.
