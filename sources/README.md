# 수동 관리 보완 카탈로그

`clawpod-providers.json`은 이 레포가 직접 관리하는 추가 모델 입력입니다.
6시간 게시 작업은 OpenClaw upstream과 이 파일을 병합합니다. **Clawpod-Agent를
clone하거나 실행하지 않으며, provider API에서 이 파일을 자동 수집하지 않습니다.**

## 초기 데이터의 기준

Clawpod-Agent commit `b46fcc3becf5cb0304d6a5578a7b7343345a2f1d`의 모델 정의와
그 checkout에 설치된 `@mariozechner/pi-ai@0.66.1`을 참고했습니다. 각 provider의
`provenance`에 파일 경로, revision, 적용 기준을 기록했습니다. SDK 데이터에는
실제로 읽은 `models.generated.js`의 SHA-256도 포함합니다. 이는 데이터 추적용이며
원격 provider가 지금 모든 모델을 제공한다는 보증이나 서명은 아닙니다.

| Provider | 초기 보완 모델 수 | 데이터 기준 |
| --- | ---: | --- |
| `openai-codex` | 15 | SDK 9개 + 플러그인 augmentation. 중복은 플러그인 우선 |
| `google` | 12 | 플러그인 정적 Gemini 목록; preview 포함 |
| `google-vertex` | 12 | Vertex builder와 같이 Google 모델 목록 공유 |
| `xai` | 14 | 플러그인 정적 카탈로그 |
| `minimax`, `minimax-portal` | 각각 3 | 플러그인의 text 모델 목록 |
| `amazon-bedrock` | 87 | SDK의 모델·inference profile ID 목록 |
| `amazon-bedrock-mantle` | 5 | 소스에 명시된 Claude 모델만 포함; 동적 탐색 목록은 미수집 |
| `anthropic-vertex` | 11 | `global` 지역, 2026-09-08 기준 표준 가격 |
| `openrouter` | 255 | SDK 목록 + 플러그인 기본 모델; 중복은 플러그인 우선 |
| `zai` | 6 | 에이전트 내장 JSON의 기준 목록; upstream에는 이미 더 많은 모델이 있음 |

숫자는 **초기 보완 입력**의 규모입니다. 최종 artifact의 목록·개수는 upstream과
병합되므로 다릅니다. 최신 main에는 이미 Google과 zAI가 있어 기존 행이 우선합니다.

- Google·Codex 등의 0 비용은 원본 플러그인의 placeholder일 수 있으며 무료 이용을 뜻하지 않습니다.
- OpenRouter `openrouter/auto`의 음수 가격 sentinel은 변환 시 `cost` 전체를 생략했습니다.
  가격 미상을 0원으로 바꾸지 않습니다. `auto`와 `openrouter/auto`는 소스에 각각 있는 ID입니다.
- Codex 최신 모델의 272K context window는 플러그인의 운영 예산이며 서비스 최대 한도를
  새로 측정한 값이 아닙니다. 기존 SDK 모델의 비용도 SDK 메타데이터입니다.
- xAI의 일부 최대 출력 길이는 원본이 명시적으로 사용하는 보수적 fallback입니다.
- AWS 모델·profile ID는 지역·계정 권한에 따라 달라집니다. 이 파일은 자격 증명이나
  endpoint를 배포하지 않고 AWS 계정에서 모델을 탐색하지 않습니다.
- Anthropic Vertex 가격은 global 기준입니다. 지역별 가용성·가격은 다를 수 있습니다.
  모델별 `anthropic-messages` API를 가진 Mantle 행도 그대로 유지합니다.
- `gpt-5.2`와 `gpt-5.3-codex`의 deprecated 표시는 Codex 플러그인의 lifecycle map을 따릅니다.
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

- Root에는 `schemaVersion: 1`, `provenance`, `providers`만 허용합니다.
- Provider에는 `api`, 비어 있지 않은 `models`가 필요합니다.
- Model에는 `id`, `name`, `input`, `reasoning`, `contextWindow`, `maxTokens`가 필요합니다.
  선택 필드는 `api`, `contextTokens`, `cost`, `status`, `replacedBy`입니다.
- 비용을 모르면 `cost`를 생략합니다. 비용이 있으면 `input`, `output`은 필수이며
  `cacheRead`, `cacheWrite`는 선택입니다. 모든 비용은 유한한 0 이상의 숫자입니다.
- ID는 provider 내부에서 중복될 수 없습니다. `openrouter`처럼 `/`가 포함된 모델 ID는
  provider 접두어를 임의로 제거하거나 추가하지 말고 소스 값을 그대로 기록합니다.
- `baseUrl`, `headers`, `apiKey`, `auth`, `authHeader` 및 그 밖의 미정의 필드는 보완 입력에서 거부합니다.
- 같은 provider가 없으면 추가하고, 있으면 없는 model ID만 추가합니다.
- 같은 model ID가 양쪽에 있으면 **upstream 행 전체**를 유지합니다. 보완 파일은 upstream
  모델의 가격·제한·deprecated 상태를 덮어쓰는 override 파일이 아닙니다.
- Provider API가 다르거나 같은 모델의 유효 API가 다르면 게시가 실패합니다.
  Upstream의 API 변경을 확인하고 보완 파일을 수정해야 합니다. 모델별 API는 provider 기본값보다 우선합니다.
- 보완 파일에서만 제공하던 모델을 삭제하면 다음 재생성에서 빠집니다. Upstream에도 있는
  모델은 유지됩니다. 반대로 upstream이 모델을 삭제해도 보완 파일에 남아 있으면 다시 추가됩니다.
  모델 폐기 시 두 소스의 상태를 확인하고 보완 파일도 함께 수정해야 합니다.
- 전체 보완 파일이 없거나 손상되면 게시를 중단합니다. 조용히 보완 provider를 누락시키지 않습니다.

## 시각과 실패 동작

`sourceGeneratedAt`은 upstream 시각, `generatedAt`은 최종 게시 시각입니다.
기존 형식은 `generatedAt`을 원본 시각으로 간주해 첫 실행에서 마이그레이션합니다.
보완 파일만 바뀌어도 게시 시각이 증가하지만, 동일 입력 재실행은 byte 단위로 동일합니다.
`MIN_VERSION`과 보완 출처 변경도 게시 입력 변경에 포함됩니다.

Upstream이 마지막으로 수락한 원본보다 과거이면 전체 실행이 변경 없이 종료됩니다.
네트워크 실패 시에도 보완 파일만 따로 게시하지 않습니다. 이 경우 최신 원본을 확보한 뒤
재실행해야 합니다. 미래 시각, API 충돌, 최종 4MiB 초과 및 검증 오류는 기존 artifact를
유지하며 실패합니다. 정상 결과는 임시 파일을 쓴 뒤 rename으로 교체합니다.
