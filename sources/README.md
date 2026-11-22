# 수동 관리 보완 카탈로그

`clawpod-providers.json`은 이 레포가 직접 관리하는 추가 모델 입력입니다.
6시간 게시 작업은 OpenClaw 생성기로 직접 만든 upstream 원본과 이 파일을 병합합니다. **Clawpod-Agent를
clone하거나 실행하지 않으며, provider API에서 이 파일을 자동 수집하지 않습니다.**
`openrouter`만 예외로, 게시 작업이 OpenRouter 공개 API에서 직접 받습니다. 이 파일에는 Agent 전용
별칭 `auto`만 남아 있습니다(루트 README의 "1-1. OpenRouter" 참고).

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
| `openai-codex`              |           22 | SDK 9개 + 플러그인 augmentation + 공식 문서 추가분(2026-11-18 GPT-6.2) + Agent 별칭 `gpt-5.6`(2026-11-21) |
| `codex`                     |           21 | `openai-codex` 21행과 같은 값·상태(같은 ChatGPT Codex 백엔드, 2026-11-21). `openai-codex`를 고치면 같이 고친다 |
| `anthropic`                 |            2 | 상류 `anthropic`에 없는 Pi 1.5.2 행 Sonnet 4.5 둘(값은 Pi 판·파일 해시 예외, 상태는 Anthropic 폐기 문서, 2026-11-21) |
| `openai`                    |           10 | 상류 `openai`에 없는 Pi 1.5.2 행(값은 Pi 판·파일 해시 예외, 상태는 OpenAI 폐기 문서, 2026-11-21) |
| `google`                    |           14 | 플러그인 정적 Gemini 목록; preview 포함. 2026-11-21 3.1 Pro custom tools·Robotics ER 2 |
| `google-vertex`             |           16 | Google 모델 목록 + 2026-11-18 Gemini 4 Argon/Carbon/Hydrogen + 2026-11-21 3.1 Pro custom tools |
| `google-gemini-cli`         |            7 | `google` 수동 행과 같은 값, 가격 없음(Gemini CLI 로그인 요청 한도, 2026-11-21). `google` 수동 행을 고치면 같이 고친다 |
| `xai`                       |           12 | 현행 7개 + 공식 별칭 1개(`grok-4.20`) + 공식 전환 안내가 있는 별칭 4개(2026-11-21 `grok-4-0709`) |
| `minimax`                   |            5 | 플러그인의 text 모델 목록 + 2026-11-18 M3.1 Flash + 2026-11-22 퇴역 Preview |
| `minimax-cn`                |            5 | `minimax` 행의 중국 엔드포인트 사본, 가격 없음(CNY뿐, 2026-11-22) |
| `minimax-portal-cn`         |            5 | `minimax-portal` 행의 중국 엔드포인트 사본(구독, 2026-11-22) |
| `kimi`                      |            2 | Agent가 아직 해석하는 퇴역 ID `kimi-code`·`k2p5`(2026-11-22) |
| `kilocode`                  |            1 | Agent 옛 기본 ID `kilo/auto` 퇴역 행(2026-11-22) |
| `nvidia`                    |            7 | 공개 목록에 없고 플러그인 표로만 해석되던 Agent 표 ID 퇴역 행 5(2026-11-22) + 안쪽 catalog 행 사실 칸을 복사한 `moonshotai/kimi-k3`·`z-ai/glm-5.2` 퇴역 행(2026-11-22 I3h) |
| `minimax-portal`            |            5 | M Plan 모델. 2026-11-18 M3.1 Flash 추가, Preview·M2.7은 대체됨                |
| `amazon-bedrock`            |          164 | SDK 87개 + AWS 문서 추가 77개(2026-10-02 57, 11-18 16, 11-19 GPT-6.2 4)     |
| `amazon-bedrock-mantle`     |           18 | Claude 10개 + Mantle 전용 8개 (2026-11-19 GPT-6.2 Astra/Sol)              |
| `anthropic-vertex`          |           15 | `global` 표준 가격 (2026-11-18 Haiku 5.5·Fable 5.2 추가)                    |
| `openrouter`                |            1 | Agent `auto` 별칭만. 나머지는 게시 때 공개 API에서 자동 갱신          |
| `zai`                       |            6 | 에이전트 내장 JSON의 기준 목록; upstream에는 이미 더 많은 모델이 있음 |
| `opencode`                  |           69 | 상류 `opencode`에 없는 Pi 1.5.2 행 중 Zen 모델 API에 있는 것(값은 Pi 판·파일 해시 예외, 2026-11-21). Effort는 모델 API `capabilities.reasoning`(2026-11-22 I3h), 단계가 안 나오는 9행만 Agent 현재 동작 보존 규칙 |
| `opencode-go`               |           22 | 상류 `opencode-go`에 없는 Pi 1.5.2 행 중 Go 모델 API에 있는 것(같은 방식, 2026-11-21). Effort도 같은 방식(보존 규칙 3행) |
| `byteplus`                  |            3 | 상류 `byteplus`에 없는 Agent 플러그인 표 행 중 공식 모델 목록에 있는 Seed 2.0 Pro/Lite/Mini(값은 Agent 표, 가격은 공식 USD, Effort는 Agent 현재 동작 보존 규칙, 2026-11-21) |
| `volcengine`                |            3 | 상류 `volcengine`에 없는 Agent 플러그인 표 행 중 공식 모델 목록에 있는 것(같은 방식, 가격은 CNY뿐이라 비움·`knownGaps`, 2026-11-21) |
| `together`                  |            1 | 상류 `together`에 없는 Agent 플러그인 표 행 중 공식 서버리스 목록에 있는 Qwen3.8 Flash(값은 Agent 표, 가격은 공식 USD, Effort는 Agent 현재 동작 보존 규칙, 2026-11-21) |
| `synthetic`                 |            4 | 신설 provider(상류 없음, Anthropic Messages). Agent 플러그인 표 행 중 공식 모델 API에 있는 4개(값은 Agent 표, 가격은 공식 종량가, reasoning 3행 Effort는 Agent 현재 동작 보존 규칙, gpt-oss는 reasoning 꺼짐 유지, 2026-11-21) |

숫자는 **현재 보완 입력**의 규모입니다. 최종 artifact의 목록·개수는 upstream과
병합되므로 다릅니다. Google과 zAI는 upstream에도 있으며, 일반 병합에서는 기존 행이 우선합니다.

- Google 비용은 공식 표준 text/image 기본 가격으로 교체했습니다. Vertex는 global 기준입니다.
- Codex·MiniMax Portal의 USD/token 구독 비용과 Mantle의 미확인 비용은 생략했습니다.
  비용 미상을 0원으로 게시하지 않습니다.
- OpenRouter `openrouter/auto`처럼 음수 가격 sentinel이 있는 행은 자동 변환 시 `cost` 전체를 생략합니다.
  가격 미상을 0원으로 바꾸지 않습니다. `auto`(이 파일)와 `openrouter/auto`(API)는 각각 있는 ID입니다.
- Codex 최신 모델의 272K context window는 플러그인의 운영 예산이며 서비스 최대 한도를
  새로 측정한 값이 아닙니다. 기존 SDK의 일반 API 가격도 Codex 구독 비용으로 사용하지 않습니다.
- xAI의 일부 최대 출력 길이는 원본이 명시적으로 사용하는 보수적 fallback입니다.
- AWS 모델·profile ID는 지역·계정 권한에 따라 달라집니다. 이 파일은 자격 증명이나
  endpoint를 배포하지 않고 AWS 계정에서 모델을 탐색하지 않습니다.
- Anthropic Vertex 가격은 global 기준입니다. 지역별 가용성·가격은 다를 수 있습니다.
  모델별 `anthropic-messages` API를 가진 Mantle 행도 그대로 유지합니다.
- `gpt-5.2`와 `gpt-5.3-codex`의 deprecated 표시는 유지합니다. ChatGPT 로그인용
  `gpt-5.4`/`gpt-5.4-mini`는 종료되어 disabled 및 공식 대체 모델을 기록했습니다.
- 2026-10-02 Codex 재검토: `gpt-6-sol`·`gpt-6.1-sol`·`gpt-6-luna` 추가, 9/14 종료된
  `gpt-5.3-codex-spark`는 disabled, 10/14 종료 예정인 `gpt-5.5`는 deprecated 후 날짜 규칙으로 disabled 전환.
- 2026-10-27 Codex를 공식 문서 기준으로 정리: `gpt-6.1-terra` 추가, `gpt-5.5` disabled(대체 `gpt-6.1-sol`),
  `gpt-5.4`/`gpt-5.4-mini` 대체를 `gpt-6-sol`/`gpt-6-luna`로 변경, 문서에서 사라진 구형 모델은 deprecated.
  현재 새 설정에 노출되는 Codex 모델은 Astra·6.1 Sol·6.1 Terra·6 Luna·6 Sol 5개입니다.
- 카탈로그 추가만으로 provider 인증이나 활성화를 설정하지는 않습니다.

## 수정 절차

전체 절차와 판단 기준은 루트의 [MAINTAINING.md](../MAINTAINING.md)에 있습니다. 요약하면 이렇습니다.

1. 알맞은 칸(`providers`, `corrections`, `overrides`, `thinking`, `knownGaps`, `nonChatModels`)을 고치고, 수동 행을 바꿨으면 같은 provider의 `provenance.notes`에 날짜와 요약을 덧붙입니다.
2. 최근 성공한 게시 실행의 `catalog-sources` artifact를 받아 catalog를 재생성합니다. 명령은 MAINTAINING.md 7장에 있고, 로컬에 OpenClaw를 설치할 필요가 없습니다.
3. `npm test`와 `npm run audit`를 실행하고 입력·출력 diff를 함께 검토합니다. 테스트는 생성 파일에 보완 모델이 모두 반영됐는지도 확인합니다.
4. 보완 JSON, `REVIEW.md` 기록, 생성된 `models/v1/catalog.json`을 함께 커밋합니다.

새 형식의 **최종 artifact를 upstream 입력으로 재사용할 수 없습니다.** 이미 병합된 수동 모델이 삭제되지 않고 남는 것을 막기 위함입니다.

## 입력 계약과 병합 규칙

- Root에는 `schemaVersion: 1`, `provenance`, `providers`와 선택적 `corrections`, `overrides`, `thinking`, `knownGaps`, `nonChatModels`만 허용합니다.
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

## Thinking Effort 규칙 (`thinking`)

`thinking`은 공식 문서로 확인한 Thinking Effort 값입니다. 자동 출처(OpenClaw·OpenRouter·models.dev)보다 먼저 적용되며,
자동 출처가 없거나 틀린 모델에 씁니다. 순서대로 확인해 처음 맞는 규칙 하나만 적용합니다.

```json
{
  "provider": "anthropic-vertex",
  "model": "claude-opus-5-*",
  "levels": ["low", "medium", "high", "xhigh", "max"],
  "default": "high",
  "source": "https://..."
}
```

- `model`은 정확한 ID이거나, `*`로 끝나는 접두사입니다. 접두사 규칙을 쓰면 같은 계열의 새 모델도 자동으로 걸립니다.
- `provider`를 `"*"`로 쓰면 모든 provider에 적용되고, `model`은 정규화한 ID(`scripts/thinking.mjs`의 `modelKey`)로 비교합니다.
  소문자로 바꾸고 `vendor/` 접두사, `:변형`, `@접미사`, 지역 접두사(`us.` 등), `anthropic.` 같은 제조사 접두사, 끝의 `-v<숫자>`를 빼고
  `.`과 `_`를 `-`로 바꾼 값입니다. 예를 들어 `anthropic/claude-opus-5.5`와 `us.anthropic.claude-opus-5-5`는 모두 `claude-opus-5-5`입니다.
  규칙 하나로 모든 중계 provider의 같은 모델이 채워집니다. 특정 provider만 다르게 하려면 그 규칙을 `*` 규칙보다 앞에 둡니다.
- `levels`는 `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `adaptive`, `max`, `ultra` 중에서 낮은 단계부터 중복 없이 적습니다.
  끌 수 있는 모델만 `off`를 넣습니다. `default`는 `levels` 중 하나여야 합니다.
- 켜고 끄기만 되는 모델은 `["off", "low"]`와 `"labels": {"low": "on"}`으로 적습니다.
- `reasoning: true`인 행에만 적용합니다. 근거와 판단은 REVIEW.md에 기록합니다.
- `map`(선택)은 그 단계를 요청에 **무엇으로 보내는지**입니다. 행의 `thinkingLevelMap`에 키 단위로 덮어씁니다. 키는 Agent 런타임(Pi)의
  `thinkingLevelMap` 키 `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`만 됩니다(`adaptive`·`ultra` 없음). 값은 보낼 문자열이거나 `null`입니다.
  `levels`를 상류 `thinkingLevelMap`의 `null`로 거른 **뒤에** 쓰므로, 규칙이 `null`로 둔 단계도 목록에 남습니다.
  예: `{"provider": "anthropic", "model": "claude-sonnet-5-5*", "levels": [...], "default": "high", "map": {"off": null}, "source": "https://..."}`는 화면에 `off`를 남기고 요청에는 thinking 칸을 싣지 않습니다.
- `null`은 Pi에서 "그 단계를 고르지 않음"입니다. Pi `clampThinkingLevel`이 다른 단계로 옮깁니다. 아무것도 보내지 않으려면 그 행에 옮겨 갈 단계가 남지 않아야 합니다
  (예: xAI 항상 켜짐 행은 목록이 `low` 하나라 Agent가 나머지 단계를 `null`로 채우고, `low`도 `null`이라 effort가 실리지 않습니다).

## 자동 값 덮어쓰기 (`overrides`)

`overrides`는 OpenClaw·OpenRouter에서 자동으로 들어온 값이 틀렸거나 비어 있을 때, 공식 근거로 확인한 값으로
덮어쓰는 규칙입니다. `corrections`와 달리 기존 값과 상관없이 항상 적용됩니다(수동 값이 이김).

```json
{
  "provider": "*",
  "model": "qwen3-coder-next",
  "set": { "reasoning": false },
  "source": "https://huggingface.co/Qwen/Qwen3-Coder-Next",
  "note": "Model card: supports only non-thinking mode."
}
```

- 모델 찾는 방식은 `thinking` 규칙과 같습니다(정확한 ID, `*`로 끝나는 접두사, `provider: "*"`는 정규화한 ID).
  `thinking`과 달리 맞는 규칙이 모두 순서대로 적용됩니다.
- `set`에 쓸 수 있는 필드는 `name`, `reasoning`, `contextWindow`, `contextTokens`, `maxTokens`, `cost`(`tieredPricing` 포함), `replacedBy`, `status`(`deprecated`·`disabled`), `compat`입니다.
- `compat`은 런타임 compat 키의 **키 단위 패치**입니다: `{"compat": {"supportsStrictMode": true, "maxTokensField": null}}`는 그 두 키만 바꾸고 지우며 다른 compat 키는 남깁니다. 키는 런타임 이름(영문자만), 값은 boolean·문자열·`null`(지움)입니다. 비면 `compat` 칸 자체가 빠집니다. Effort 키(`thinkingLevels` 등)는 여기 쓰지 않고 `thinking`으로 씁니다.
  `contextTokens`는 창(`contextWindow`)보다 작은 실사용 입력 예산입니다. 상류 행에 없을 때 넣습니다.
  `null`은 필드를 지웁니다. 가격을 모르면 0이 아니라 `"cost": null`로 비웁니다.
- `reasoning: false`로 바꾸면 그 모델의 Thinking Effort 값도 함께 지웁니다.
- 적용 순서: 병합 → `corrections` → `overrides` → `thinking`.
  그래서 `overrides`로 `reasoning: true`가 된 모델도 `thinking` 규칙으로 Effort가 채워집니다.
- 자동 provider 행의 상태는 `overrides`의 `status`로 바꿉니다. 수동 행의 상태와 날짜 전환은 `corrections`로 합니다.

## 검토 완료 빈칸 (`knownGaps`)

공식 값이 없어서 비워 둘 수밖에 없는 빈칸을 사유와 함께 기록합니다. 여기 기록된 빈칸은 `npm run audit`과
이슈 **Catalog gaps**에서 "known"으로 분류되어 처리 대상에서 빠집니다. 같은 조사를 반복하지 않기 위한 기록입니다.

```json
{ "provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b", "check": "zero-price",
  "reason": "NVIDIA API catalog trial endpoint: free prototyping, no per-token price.",
  "source": "https://forums.developer.nvidia.com/t/nvidia-nim-faq/300317" }
```

- `check`: `thinking`(Effort 없음), `cost`(가격 없음), `zero-price`(가격 0이 의도됨), `model-data`(이름·reasoning·한도 없음)
- 모델 매칭은 `thinking` 규칙과 같지만, **항상 provider와 원래 ID로 정확히** 지정합니다. `*`로 넓게 걸면 다른 모델의 진짜 빈칸까지 가려집니다.
- 공식 값이 나오면 해당 항목을 지우고 값을 넣습니다.
- 라우터 별칭(`auto`, `free`, `*-latest`, `openrouter/*`)은 따로 적지 않아도 known으로 분류됩니다.

가격 빈칸을 "검토했지만 공식 가격이 없음"으로 확정할 때는 `knownGaps` 대신 `overrides`에 `"cost": null`과 근거를 써도 됩니다.
upstream이 나중에 근거 없는 가격을 넣어도 계속 비워 둡니다.

## 채팅용이 아닌 행 (`nonChatModels`)

자동으로 들어온 행 중 채팅 API(Chat Completions·Responses·Messages 등)로 쓸 수 없는 모델을 행 단위로 적습니다.
적힌 행은 병합 직후 catalog에서 빠집니다. Agent는 catalog에 없는 행을 목록에 내지 않습니다.

```json
{ "provider": "openai", "model": "gpt-realtime-2.1",
  "reason": "OpenAI model page lists only the Realtime endpoint (v1/realtime); Chat Completions and Responses are not supported.",
  "source": "https://developers.openai.com/api/docs/models/gpt-realtime-2.1" }
```

- **항상 provider와 원래 ID로 정확히** 지정합니다. `*`나 접두사는 스키마가 막습니다.
- `reason`과 `source`(공식 URL)는 필수입니다. 그 모델이 채팅 API를 지원하지 않는다는 공식 근거를 적습니다.
- 이미지·오디오를 출력하는 모델이라도 채팅 API로 쓸 수 있으면 적지 않습니다(예: OpenRouter의 이미지 모델, OpenAI `gpt-audio`).
- 뺀 행에 걸리던 `thinking`·`overrides`·`knownGaps` 규칙은 지웁니다.
- 제조사가 채팅 API를 열면 해당 항목을 지웁니다.

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
- 규칙은 공급자 API를 자동 수집하지 않습니다(OpenRouter 목록 자체는 별도로 자동 갱신). 일반 API 가격을 구독 요금으로 환산하지 않습니다.

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
