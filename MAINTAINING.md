# catalog 유지보수 가이드

이 문서는 사람이든 다른 세션의 에이전트든 **이 문서만 읽고** catalog 데이터를 같은 기준으로 유지할 수 있게 쓴 것입니다.
설계 배경은 [README.md](README.md), 데이터 칸별 형식은 [sources/README.md](sources/README.md),
지금까지의 판단 기록은 [sources/REVIEW.md](sources/REVIEW.md)에 있습니다.

## 0. 목표와 원칙

- `models/v1/catalog.json`은 ClawPoD Agent가 모델별 값(이름, reasoning, 컨텍스트, 최대 출력, 가격, 상태, Thinking Effort)을 읽는 **SOT**입니다.
- 형식은 OpenClaw catalog 형식(`packages/model-catalog-core/src/model-catalog-types.ts`의 `ModelCatalogModel`)을 따릅니다. 새 필드 이름을 만들지 않습니다.
- **모든 수동 값은 공식 근거가 있어야 합니다.**
  - 규칙(`corrections`, `overrides`, `thinking`, `knownGaps`)에는 `source`(공식 URL)를 적고, 판단이 필요했던 내용은 `note`(`knownGaps`는 `reason`)에 남깁니다.
  - 수동 모델 행(`providers.<provider>.models`)에는 `source`·`note` 칸이 없습니다(스키마가 막고, catalog에도 나가지 않습니다). 근거는 `provenance.<provider>.notes` 끝에 `Reviewed YYYY-MM-DD: added <id> (...)`로 덧붙이고, `sources/REVIEW.md` 표에 URL과 함께 적습니다. `provenance`의 `source`·`revision`·`files`는 그 provider를 처음 만든 출처라 바꾸지 않습니다.
  - 모든 작업은 `sources/REVIEW.md`에 날짜 절로 기록합니다.
- **모르면 비웁니다.** 가격·한도를 모르는데 0이나 추정값을 넣지 않습니다. 공식적으로 무료인 경우에만 0을 쓰고, 그때도 근거 URL을 남깁니다.
- `models/v1/catalog.json`은 손으로 고치지 않습니다. 항상 `sources/clawpod-providers.json`(이하 **수동 파일**)을 고치고 재생성합니다.
- Agent 코드(clawpod-agent 저장소)는 이 저장소의 범위가 아닙니다. Agent가 아직 모르는 값(예: `max` 단계)이 있어도 catalog는 OpenClaw 형식대로 씁니다.

## 1. catalog가 만들어지는 순서

`.github/workflows/publish.yml`이 하루 한 번(`17 18 * * *`, 한국 시간 03:17) 실행합니다.

1. **`generate` job (읽기 권한만):**
   - `openclaw/openclaw` main을 받아 `scripts/generate-openclaw-catalog.sh`로 OpenClaw catalog를 생성합니다. 생성기의 크기 제한 2개를 32MiB로 올려서 실행합니다.
   - `scripts/fetch-openrouter.mjs`로 OpenRouter 모델 목록을 받습니다.
   - `scripts/fetch-models-dev.mjs`로 models.dev 목록을 받습니다.
   - 세 파일을 `catalog-sources` artifact로 넘깁니다(7일 보관).
2. **`publish` job (쓰기 권한):** `scripts/publish-catalog.mjs`가 아래 순서로 최종본을 만듭니다.
   (이 문서가 설명하는 빈칸 보고·`knownGaps`·`npm run audit`는 2026-11-19 PR #20 이후 동작입니다.)
   1. OpenClaw 결과 + OpenRouter 변환 결과(`scripts/openrouter.mjs`)
   2. 수동 파일의 `providers` 병합. **같은 provider/model ID가 있으면 자동 쪽 행이 이기고**, 수동 행은 자동 쪽에 없을 때만 들어갑니다.
      그다음 수동 파일 `nonChatModels`에 적힌 행(채팅 API가 없는 모델)을 뺍니다.
   3. `corrections`: 기존 값이 정확히 일치할 때만 적용하는 가격·상태 보정. 날짜 조건(`effectiveAt`)을 걸 수 있습니다.
   4. `overrides`: 자동 값을 무조건 덮어씁니다(`null`이면 지움).
   5. `thinking`: Effort 채우기. 출처 순서는 수동 규칙 → OpenClaw 행에 이미 있는 값 → OpenRouter → models.dev 순입니다.
   6. 검증: 스키마, 필수 provider, 4MiB 한도, 시각 역행
   7. 바뀌었으면 bot이 `main`에 커밋합니다.
   8. "Report catalog gaps" 단계가 전수 검사(`scripts/audit-catalog.mjs`)의 결과로 이슈 **Catalog gaps**를 갱신합니다(아래 3장). 이 단계가 실패해도 커밋은 진행됩니다.

**자동으로 들어오는 것과 아닌 것**

| 구분 | provider | 새 모델 |
| --- | --- | --- |
| 자동 | OpenClaw가 만드는 provider 전부(`anthropic`, `openai`, `google`, `xai`, `zai`, `ollama-cloud`, 중계 provider 등), `openrouter` | 하루 한 번 자동 추가 |
| 수동 | `openai-codex`, `codex`, `amazon-bedrock`, `amazon-bedrock-mantle`, `anthropic-vertex`, `google-vertex`, `google-gemini-cli`, `minimax-portal`, `minimax-cn`, `minimax-portal-cn`, `synthetic` (그 밖에 수동 파일 `providers`에 있는 행) | 사람이 공식 문서를 보고 추가 |

`anthropic`, `openai`, `google`, `xai`, `zai`, `minimax`, `opencode`, `opencode-go`, `byteplus`, `volcengine`, `together`, `kimi`, `kilocode`, `nvidia`, `mistral`, `openrouter`, `vercel-ai-gateway`은 자동 행과 수동 행이 섞여 있습니다. 수동 파일 `providers`에 있는 ID가 해당 provider의 수동 행입니다.

## 2. 파일 지도

| 파일 | 역할 |
| --- | --- |
| `sources/clawpod-providers.json` | **수동 파일.** `providers`, `provenance`, `corrections`, `overrides`, `thinking`, `knownGaps` |
| `sources/README.md` | 수동 파일 각 칸의 형식과 규칙 |
| `sources/REVIEW.md` | 날짜별 검토 기록(근거, 판단, 한계). 새 작업마다 절을 추가 |
| `scripts/publish-catalog.mjs` | 최종본 생성(CLI) |
| `scripts/catalog.mjs` | 병합·`nonChatModels`·`corrections`·`overrides`·검증, 수동 파일 스키마 |
| `scripts/thinking.mjs` | Effort 채우기, `modelKey`, 규칙 매칭(`ruleMatches`), 라우터 별칭·검토 완료 빈칸 판정(`isRouterAlias`, `isKnownGap`) |
| `scripts/openrouter.mjs`, `scripts/models-dev.mjs` | 외부 목록 변환·검증 |
| `scripts/audit-catalog.mjs` | **전수 검사** (`npm run audit`)와 이슈 Catalog gaps 보고서(`gapReport`) |
| `scripts/find-model-candidates.mjs` | **수동 provider 신모델 후보 찾기** (`npm run candidates`) |
| `scripts/generate-openclaw-catalog.sh` | OpenClaw 생성기 실행(크기 제한 패치 포함) |
| `tests/*.test.mjs` | `npm test` |

## 3. 정기 작업 (권장: 주 1회 + 신모델 발표 시)

```bash
git checkout main && git pull
npm ci
npm run candidates -- --since <지난 점검일 YYYY-MM-DD>   # 수동 provider 신모델 후보 (생략하면 최근 90일)
npm run audit                                          # 전수 검사: open 항목만 처리 대상
```

- 지난 점검일은 9장 표의 "마지막 정기 점검" 행에 있습니다. 점검을 마치면 그 날짜를 갱신합니다.
- GitHub 이슈 **Catalog gaps**는 `npm run audit`와 **같은 검사**로 매 게시마다 갱신됩니다. 둘의 "Open" 목록이 처리 대상입니다. 할 일이 없으면 이슈가 닫히고, 닫힌 뒤 새 할 일이 생기면 같은 제목("Catalog gaps")의 새 이슈가 만들어집니다.
- "Known"은 처리하지 않습니다. 구독형 가격, 라우터 별칭, `knownGaps`에 사유가 기록된 항목, `overrides`에서 `"cost": null`로 확정한 가격이 여기에 들어갑니다.
- `npm run audit`는 항상 종료 코드 0입니다. 판단 기준은 "open이 0이거나, 작업 전보다 늘지 않았는가"입니다.

**후보 분류**
- `npm run candidates`는 후보만 보여 줍니다.
- 채팅용 텍스트 모델이 아니면 추가하지 않습니다: 이미지·영상·음성 생성, 임베딩, 실시간 음성 등.
- 자동 행 중에 채팅 API(Chat Completions·Responses·Messages 등)로 쓸 수 없는 모델이 있으면(예: 실시간 음성 전용) `nonChatModels`에 행 단위로 적어 뺍니다. 이미지·오디오를 출력하더라도 채팅 API로 쓸 수 있으면 빼지 않습니다.
- `google-vertex`는 Gemini·Gemma만, `anthropic-vertex`는 Claude만 다룹니다. Vertex의 다른 partner 모델(Grok 등)은 범위 밖입니다.
- **승인제 모델은 추가하지 않습니다.** 승인·초대·allowlist·"verified enterprise customers only" 같은 조건이 붙은 모델은 일반 공개되면 추가하고, 그 전까지는 REVIEW에 사유만 남깁니다(예: Mythos 5.2, Gemini 4 Neon). 이미 들어 있는 승인제 행(Mythos Preview 등)은 유지합니다.

## 4. 조사: 어디서 공식 값을 확인하나

후보 목록(models.dev, OpenRouter)은 **2차 출처**입니다. 후보를 찾는 데만 쓰고, 값은 아래 공식 출처로 확인합니다.

| 대상 | 공식 출처 |
| --- | --- |
| Codex(`openai-codex`, `codex`) 모델·종료 | https://learn.chatgpt.com/docs/models (페이지 원문을 직접 받아 확인. 요약 도구는 모델명을 섞어서 답한 적이 있음). `codex`(Codex 하네스)는 같은 백엔드라 `openai-codex`와 같은 행을 둡니다. `openai-codex`를 고치면 `codex`도 같이 고칩니다(`openai-codex`의 Agent 별칭 `gpt-5.6`만 예외, 테스트가 확인) |
| Gemini CLI(`google-gemini-cli`) | `google` 수동 행과 같은 값이고 가격만 비웁니다(Google 로그인은 하루 요청 수 한도, https://developers.google.com/gemini-code-assist/resources/quotas). `google` 수동 행을 고치면 같이 고칩니다(테스트가 수동 파일끼리 비교). 상류 `google` 자동 행이 같은 ID의 값을 바꿨으면 그 값이 공식인지 보고 두 수동 행을 같이 고칩니다 |
| Bedrock 모델 ID·지역 profile | AWS 모델 카드 `https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-<vendor>-<model>.html` |
| Bedrock 가격 | AWS Price List feed `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/us-east-1/index.json`, 그리고 `AmazonBedrockFoundationModels` offer(Claude Global 가격은 여기에 있음). 가격 페이지는 JS로 로딩되므로 feed를 받아서 확인 |
| Bedrock 수명주기 | https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html |
| Mantle(`amazon-bedrock-mantle`) | AWS 모델 카드의 bedrock-mantle 모델 ID 항목. models.dev에 없음 |
| Vertex Claude(`anthropic-vertex`) | Vertex partner model 페이지(`docs.cloud.google.com/.../partner-models/claude/<model>`), https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing 의 **Global** 탭 |
| Vertex Gemini(`google-vertex`) | 모델 페이지 `https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/<버전-이름>`(예: `.../gemini/4-neon`; `gemini-` 접두사를 붙이면 404). 가격은 위 가격 페이지의 **Standard 탭, Global 행**. 가격 페이지 URL이 `cloud.google.com/model-garden/pricing`로 리다이렉트될 수 있음 |
| Kilo(`kilocode`) 가격·무료 여부 | Kilo 모델 API `https://api.kilo.ai/api/openrouter/models`(가격과 `isFree`)를 공식으로 봄. `https://kilo.ai/landing/free-models`는 보조 자료. 둘이 다르면 API를 따르고 REVIEW에 적음 |
| Vercel(`vercel-ai-gateway`) 가격 | `https://ai-gateway.vercel.sh/v1/models`, 모델 페이지 `https://vercel.com/ai-gateway/models/<vendor>/<model>`, Vercel changelog |
| MiniMax(`minimax`, `minimax-portal`, 중국 `minimax-cn`, `minimax-portal-cn`) | https://platform.minimax.io/docs (종량제 가격, M Plan 구독, 모델 FAQ의 종료 공지), 중국 https://platform.minimax.cn/docs/faq/models.md (가격은 CNY뿐이라 `-cn`은 가격을 비움). `minimax`/`minimax-portal` 수동 행을 고치면 `minimax-cn`/`minimax-portal-cn`의 같은 행도 같이 고칩니다(같은 모델의 중국 엔드포인트 사본, 테스트가 비교) |
| OpenCode Zen·Go(`opencode`, `opencode-go`) | 모델 API https://opencode.ai/inference/v1/models · https://opencode.ai/inference/go/v1/models (문서가 "전체 목록"이라 부르는 곳: 한도·입력·reasoning effort·가격·엔드포인트), Zen 문서 https://opencode.ai/docs/zen/ (모델 표·가격표·Free models·Deprecated models 표), Go 문서 https://opencode.ai/docs/go/ . 수동 행 91개의 값은 Pi 1.5.2 판 그대로인 승인된 예외입니다(REVIEW 2026-11-21) |
| Synthetic(`synthetic`) | 모델 API https://api.synthetic.new/openai/v1/models (인증 없이 받음: 한도·입력·reasoning effort·토큰당 가격, `pricing.input_cache_writes`), 가격표 https://synthetic.new/pricing/models ("Usage-based price" 열. 구독 할인 단가는 쓰지 않음). 수동 행 4개의 이름·reasoning·입력·창·최대 출력은 Agent 플러그인 표 값인 승인된 예외입니다(REVIEW 2026-11-21) |
| Thinking Effort | 제조사 API 문서: Anthropic(platform.claude.com, extended thinking·effort), OpenAI(developers.openai.com reasoning), Google(ai.google.dev/gemini-api/docs/thinking), xAI(docs.x.ai reasoning), DeepSeek·Qwen(Alibaba Model Studio)·Z.ai·Moonshot·MiniMax 공식 문서, 오픈 모델은 Hugging Face 모델 카드·chat template |
| OpenClaw 기준 프로필 | `gh api repos/openclaw/openclaw/contents/packages/llm-core/src/model-contracts/anthropic.ts --jq .content \| base64 -d` (단계 체계 확인·교차 검증용. 공식 문서와 다르면 공식 문서를 따름) |

## 5. 값 기준 (판단이 갈리는 곳)

### 가격 (`cost`, USD / 백만 토큰)
- `input`, `output`, `cacheRead`, `cacheWrite`를 씁니다. 컨텍스트 길이별 요금이 있으면 `tieredPricing: [{input, output, cacheRead?, cacheWrite?, range: [시작, 끝] | [시작]}]`도 씁니다.
- **모르면 비웁니다**(`overrides`에서 `"cost": null`). **구독형**(Codex, `*-plan`, `*-token-plan`, MiniMax Portal, Kimi Code, GitHub Copilot, Ollama Cloud, Gemini CLI)은 토큰 단가가 없으므로 비웁니다.
- **공식 무료**만 0입니다(근거 URL 필수). provider 자신의 모델 API가 가격 0을 주거나 무료로 표시하면(예: Kilo `isFree: true`) 공식 무료로 봅니다. 프로모션 무료는 9장 표에 재확인 행을 추가합니다.
- `cacheWrite`는 Anthropic 기준 **5분** 캐시 쓰기 가격입니다. 1시간 가격은 넣지 않습니다.
- 캐시 쓰기 요금이 따로 없는 제조사(OpenAI, DeepSeek, xAI, Gemini 기본 캐시)는 0이 정상입니다. 캐시 기능이 없는 모델은 `cacheRead` 0 또는 생략이 정상입니다.
- **Bedrock**
  - 지역 profile(`us.`, `eu.`, `jp.`, `au.`, `apac.`, `in.`, `ca.`)과 base ID는 Geo/In-region 가격입니다. Claude 4.5 이후, Nova 2, Grok 4.6 이후, Kimi K3는 Global보다 **10% 높습니다**.
  - `global.` profile은 Global 가격입니다.
  - Claude 4.x 이전, Sonnet 4, 오픈 웨이트 모델은 할증이 없습니다.
- **Mantle** 모델 ID는 지역 전용이라 Geo/In-region 가격을 씁니다.
- **Vertex**는 Global 가격을 씁니다(지역 가격은 10% 높음).
- 표현할 수 없는 조건(장문 할증의 일부, Batch, Priority, Fast 모드)은 기본 단가만 넣고 `note`나 REVIEW에 적습니다.
- **미래 날짜부터 새로 생기는 요금**(예: Gemini 4 Hydrogen·Neon의 캐시 쓰기 요금이 2027-01-12부터 생김)은 지금 표현할 수 없습니다. `corrections`는 기존 값이 있어야 바꿀 수 있기 때문입니다. 지금은 넣지 않고, 9장 표에 그 날짜의 재확인 행을 추가합니다.

### 한도 (`contextWindow`, `contextTokens`, `maxTokens`)
- 공식 값을 씁니다.
- `contextTokens`는 창보다 작은 **실사용 입력 예산**입니다(예: OpenAI 1.05M 창 모델의 272,000. 공식 문서의 장문 요금 경계와 같습니다). 상류 행에 없으면 `overrides`로 넣습니다. 프로바이더와 정확한 ID로 적습니다(`*`나 접두사는 다른 provider의 행이나 `-pro`·`:batch` 변형까지 덮습니다). `maxTokens`는 **한 번의 응답으로 받을 수 있는 최대 출력**입니다. 여러 번 이어 받는 장문 생성 한도가 아닙니다. 예: Gemini 4의 공식 "Maximum output tokens"는 1,048,576이지만, 한 번 응답은 65,536이라서 65,536을 씁니다.
- **Codex는 예외입니다:** `contextWindow` 272000은 Agent 운영 예산이고, 서비스 최대치로 바꾸지 않습니다(`maxTokens` 128000).
- 공식 최대 출력이 없으면 같은 모델의 다른 공식 행 값이나 보수적인 운영값을 쓰고, `note`에 "공식 값 아님"이라고 적습니다.
- 한도가 없는 행은 Agent가 사용하지 않습니다.

### 입력 형식 (`input`)
- 수동 행(`providers`)에는 `text`, `image`, `document`(네이티브 문서·PDF 입력, 자동 행과 같은 이름)를 쓸 수 있습니다(스키마 제한, 2026-11-24 `document` 추가). `overrides`는 입력을 바꾸지 않습니다. 음성·영상 입력을 지원해도 수동 행에는 넣지 않고, 필요하면 REVIEW에 적습니다. 자동 행(OpenClaw)의 `document`·`video`는 그대로 둡니다.

### reasoning
- 생각(thinking) 모드가 있으면 `true`입니다. 켜고 끌 수만 있어도 `true`입니다.
- 자동 값이 틀린 사례가 있었습니다: `qwen3-coder`는 true로 들어왔지만 실제로는 non-thinking이고, Bedrock gpt-oss는 false로 들어왔지만 실제로는 reasoning 모델입니다. 의심되면 모델 카드로 확인합니다.

### Thinking Effort (`compat.thinkingLevels`, `compat.defaultThinkingLevel`)
- **단계 이름과 순서**는 `off, minimal, low, medium, high, xhigh, adaptive, max, ultra`입니다(낮은 것부터, 중복 없이).
- **기본 단계**는 reasoning 관련 파라미터를 아무것도 보내지 않았을 때 제조사 API가 동작하는 단계입니다.
- **변환 규칙:**
  - 이름 있는 effort(OpenAI `reasoning.effort`, Anthropic `effort`, Gemini 3+ `thinking_level`, xAI `reasoning_effort` 등)는 이름 그대로 씁니다. `none`은 `off`입니다.
  - `off`는 생각을 실제로 끌 수 있을 때만 넣습니다.
  - 토큰 예산만 있는 모델(Claude 4.x 수동 예산, Gemini 2.5 `thinkingBudget`, Qwen `thinking_budget`)은 `off, minimal, low, medium, high`입니다. 끌 수 없으면 `off`를 빼고, 모델이 예산을 스스로 정하는 모드가 있으면 `adaptive`를 넣습니다.
  - 켜기/끄기만 되는 모델은 `["off","low"]`이고 `labels: {"low":"on"}`을 붙입니다. 기본이 켜짐이면 `low`, 꺼짐이면 `off`입니다.
    Agent 런타임에서 `low`가 돌지 못하는 행(Agent Pi 행의 `thinkingLevelMap`에서 `low`가 `null`)은 켜짐 단계를 그 경로가 오늘 보내는 단계로 적습니다. 예: `qwen-token-plan`의 `glm-5`·`glm-5.1`은 `["off","high"]`, `labels: {"high":"on"}`, 기본 `high`입니다(Pi 행 `low:null`·`high:"high"`). 근거는 모델마다 다릅니다: 두 모델 모두 thinking 기본 켜짐·`enable_thinking: false`로 끔이고, `reasoning_effort` 표는 glm-5.1 이상만 담습니다(glm-5.1: none~xhigh, `max` 안 받음). glm-5는 공식 effort 목록이 없고 `high`는 오늘 보내는 값이라 그대로 둡니다(https://www.alibabacloud.com/help/en/model-studio/glm, REVIEW 2026-11-23 I5). Agent가 목록 단계에 대한 Pi 행의 `null`을 목록대로 풀게 되면 다시 봅니다.
  - 항상 켜져 있고 조절할 수 없는 모델은 `["low"]`이고 `labels: {"low":"on"}`입니다.
  - 끌 수 없는 모델에서 단계 없이 부르는 호출이 보낼 값은 `map.off`로 적습니다(가장 낮은 목록 단계). `off`는 목록에 넣지 않습니다.
  - Claude effort 모델(4.6 이후)에는 `adaptive`를 따로 넣지 않습니다. 모든 단계가 adaptive로 동작하기 때문입니다.
- **출처 우선순위:** 공식 문서 > OpenClaw 프로필 > OpenRouter > models.dev. OpenRouter는 예산형 모델을 켜기/끄기로만 표시하는 등 틀린 적이 많습니다.
- 라우터 별칭(`auto`, `free`, `*-latest`, `openrouter/*`)은 실제로 보내지는 모델이 바뀌므로 채우지 않습니다. `scripts/thinking.mjs`의 `isRouterAlias`가 이를 판별합니다.

### 상태 (`status`, `replacedBy`)
- `deprecated`는 사용 비권장이고 `disabled`는 종료입니다. Agent는 둘 다 새 설정에 노출하지 않고, 이미 쓰는 사용자의 모델은 유지합니다.
  - 제조사가 종료를 공지했으면 `disabled`입니다.
  - 문서에서 사라졌지만 종료 공지가 없으면 `deprecated`입니다.
- `replacedBy`는 같은 provider의 **활성** 모델만 가리킵니다. 대체 모델이 종료되면 지우거나 바꿉니다.
- 미래 날짜의 종료는 `corrections`에 `effectiveAt`(UTC epoch ms, 예: `Date.UTC(2027,3,8)`)로 넣습니다. 그 뒤 첫 게시 때 자동으로 바뀝니다.
- 수동 행의 상태는 행에 직접 쓰거나 `corrections`(날짜 전환)로 바꿉니다. `corrections`는 **수동 파일 `providers`에 있는 행만** 대상으로 합니다.
- 자동 provider 행의 상태는 `overrides`의 `"status": "deprecated" | "disabled"`로 바꿉니다(날짜 조건은 없음).

## 6. 반영 방법

### 어느 칸에 쓰나

| 상황 | 칸 |
| --- | --- |
| 수동 provider의 새 모델, 수동 행의 값 수정 | `providers.<provider>.models` 배열 끝에 추가. `provenance.<provider>.notes`에 날짜와 요약 추가 |
| 자동 행의 이름·reasoning·한도(`contextTokens` 포함)·가격·대체 모델이 틀리거나 비어 있음 | `overrides` |
| Effort가 비었거나 틀림 | `thinking` |
| 요청 인코딩 값(그 단계를 무엇으로 보내는가, 보내지 않는가) | `thinking` 규칙의 `map` (`sources/README.md`) |
| 수동 행의 가격·상태 조건부 보정, 날짜 전환 | `corrections` |
| 자동 행의 상태(사용 비권장·종료) | `overrides`의 `status` |
| 자동 행의 런타임 compat 키(요청 모양: `supportsStrictMode`, `maxTokensField`, `promptCacheKeyMode`, `cachesInstructions` 등)가 틀리거나 공식 근거가 없음 | `overrides`의 `set.compat`. 키 단위로 적용하고 `null`은 그 키만 지웁니다(나머지 compat 키는 남음). 근거가 없으면 지웁니다(Agent가 기본 요청 모양으로 돎). Effort 키(`thinkingLevels`·`defaultThinkingLevel`·`thinkingLevelLabels`)는 `thinking` 칸으로 씁니다 |
| 채팅 API로 쓸 수 없는 자동 행(실시간 음성 전용 등) | `nonChatModels` (provider와 원래 ID 정확히, `reason`·`source` 필수). 행이 catalog에서 빠집니다 |
| 공식 값이 없어서 비워 둘 수밖에 없는 빈칸 | `knownGaps` (`check`: `thinking` / `cost` / `zero-price` / `model-data`, `reason` 필수) |

### 모델 매칭 (`thinking`, `overrides`, `knownGaps` 공통)
- `provider`가 특정 provider면 `model`을 **원래 ID**와 비교합니다. 정확히 같거나, `model`이 `*`로 끝나면 접두사로 비교합니다.
- `provider: "*"`면 모든 provider에 적용되고, `model`을 **정규화 ID**(`modelKey`)와 비교합니다.
  - 정규화 규칙: 소문자로 바꾸고, 앞의 `vendor/`·`:변형`·`@접미사`·지역 접두사(`us.` 등)·`anthropic.` 같은 제조사 접두사·끝의 `-v숫자`를 뺀 뒤, `.`과 `_`를 `-`로 바꿉니다.
  - 예: `anthropic/claude-opus-5.5`, `us.anthropic.claude-opus-5-5`, `claude-opus-5-5@default`는 모두 `claude-opus-5-5`입니다.
  - 확인 방법: `node -e 'import("./scripts/thinking.mjs").then(m=>console.log(m.modelKey("us.anthropic.claude-opus-5-5")))'`
- `thinking`은 처음 맞는 규칙 하나만 적용합니다. 그래서 provider 지정 규칙은 첫 `*` 규칙보다 앞에 넣고, `*` 규칙은 배열 끝에 추가합니다. 더 좁은 `*` 규칙이 넓은 접두사 규칙에 가려지지 않는지 확인합니다.
- `overrides`는 맞는 규칙이 모두 순서대로 적용됩니다. 배열 끝에 추가하고, 같은 필드를 바꾸면 뒤 규칙이 이깁니다. `knownGaps`도 배열 끝에 추가합니다.
- **접두사 주의:** `claude-opus-5*`는 `claude-opus-5-5`까지 잡습니다. 다른 계열을 잡지 않는지 확인합니다.
- **짧은 키 주의:** 정규화 결과가 `v3-2`처럼 짧으면 다른 제조사 모델과 겹칩니다. 이럴 때는 `*`를 쓰지 말고 provider와 원래 ID로 지정합니다. `knownGaps`는 항상 provider와 원래 ID로 지정합니다.

### 수동 파일 편집 방법
- 형식은 `JSON.stringify(data, null, 2) + "\n"`과 정확히 같아야 합니다. 손 편집보다 node로 읽고 쓰는 편이 안전합니다.

```bash
node -e '
const fs=require("fs");const f="sources/clawpod-providers.json";const t=fs.readFileSync(f,"utf8");const s=JSON.parse(t);
if(JSON.stringify(s,null,2)+"\n"!==t) throw new Error("format drift");
// 예: s.overrides.push({provider:"...",model:"...",set:{...},source:"https://...",note:"..."});
fs.writeFileSync(f,JSON.stringify(s,null,2)+"\n")'
node --input-type=module -e 'import fs from "node:fs";import {validateSupplement} from "./scripts/catalog.mjs";validateSupplement(JSON.parse(fs.readFileSync("sources/clawpod-providers.json","utf8")));console.log("valid")'
```

- 규칙이 실제 행에 걸리는지 확인합니다. 아무 행에도 걸리지 않는 규칙은 오타이거나 ID가 바뀐 것입니다.

```bash
node --input-type=module -e '
import fs from "node:fs";import {ruleMatches} from "./scripts/thinking.mjs";
const s=JSON.parse(fs.readFileSync("sources/clawpod-providers.json","utf8"));const c=JSON.parse(fs.readFileSync("models/v1/catalog.json","utf8"));
for(const k of ["thinking","overrides","knownGaps"])for(const r of s[k]??[])if(!Object.entries(c.providers).some(([p,v])=>v.models.some(m=>ruleMatches(r,p,m.id))))console.log(k,"matches nothing:",r.provider,r.model)'
```

## 7. 재생성·검증·PR

```bash
git checkout main && git pull && git checkout -b <type>/<요약>   # type: feat | fix | docs
# 수동 파일 수정 후
npm ci
run=$(gh run list --workflow publish.yml --branch main --status success -L 1 --json databaseId --jq '.[0].databaseId')
rm -rf /tmp/catalog-sources && gh run download "$run" -n catalog-sources -D /tmp/catalog-sources
git checkout origin/main -- models/v1/catalog.json
node scripts/publish-catalog.mjs \
  --source-file /tmp/catalog-sources/openclaw-catalog.json \
  --openrouter-file /tmp/catalog-sources/openrouter-models.json \
  --modelsdev-file /tmp/catalog-sources/models-dev.json \
  --report-file /tmp/catalog-gaps.md
npm test
npm run audit
```

**확인할 것**
- `npm test`가 모두 통과해야 합니다.
- `npm run audit`의 open 항목이 늘지 않아야 합니다.
- `/tmp/catalog-gaps.md`의 "Open gaps"가 늘지 않아야 합니다.
- `git diff models/v1/catalog.json`이 의도한 행만 바뀌었는지 봅니다. 모델 수 변화는 publish 로그의 `models=A->B`로 확인합니다.

**기록:** `sources/REVIEW.md` 끝에 `# YYYY-MM-DD <주제>` 절을 추가합니다. 무엇을 어떤 근거로 바꿨는지 표로 정리하고, `## 판단과 한계`에 공식 값이 아닌 것과 다시 확인해야 할 것을 적습니다. 숫자를 바꿨다면 `sources/README.md`의 provider 모델 수 표도 고칩니다.

**PR**
- 커밋 메시지는 `feat:` / `fix:` / `docs:`로 시작합니다. PR 본문은 한국어로 요약·변경·검증·한계를 씁니다.
- workflow나 스크립트를 바꿨으면 `gh workflow run publish.yml --ref <branch> -f dry_run=true`로 브랜치 dry-run을 돌려 결과를 PR에 적습니다. dry-run은 커밋하지 않고, 이슈도 건드리지 않습니다.
- 머지는 merge commit 방식(`gh pr merge <n> --merge`)으로 합니다.
- **확인 2:** 같은 디렉터리에 artifact를 두 번 받으면 `gh run download`가 `file exists`를 내고도 종료 코드 0으로 끝나, 옛 원본으로 재생성됩니다. 그래서 위 명령처럼 먼저 `rm -rf /tmp/catalog-sources`를 합니다.

**충돌:** bot이 하루 한 번 `models/v1/catalog.json`을 커밋하므로, 그사이 main이 바뀌면 catalog가 충돌합니다. 그때는 최신 main으로 rebase하고, 최신 artifact로 위 재생성을 다시 합니다. catalog를 손으로 합치지 않습니다.
- **머지 후:** 바로 반영하려면 `gh workflow run publish.yml --ref main`을 실행합니다. 공개 raw URL은 GitHub 캐시 때문에 최대 약 5분 늦게 바뀝니다.

## 8. 장애 대응 (실제로 겪은 것)

| 증상 | 원인 | 대응 |
| --- | --- | --- |
| `Install OpenClaw dependencies` 실패, `requires Node >=…` | OpenClaw가 Node 최소 버전을 올림 | `generate` job의 `setup-node`는 `check-latest: true`라 24.x 최신을 받습니다. 메이저 버전을 올렸다면 `node-version`을 바꿉니다 |
| `Generate OpenClaw catalog` 실패, `response exceeds` / `bundle … exceeds client limit` | OpenClaw 생성기 내부 크기 제한 | `scripts/generate-openclaw-catalog.sh`의 `raise_limit`에 해당 상수를 추가합니다. 우리 최종본 한도(4MiB)는 publisher가 따로 검사합니다 |
| `Generate OpenClaw catalog` 실패, OpenClaw 내부 에러(예: `models.dev catalog missing … for provider kimi-for-coding`) | OpenClaw 코드와 외부 출처가 어긋남 | 보통 OpenClaw가 곧 고칩니다. 급하면 수동 실행 때 `openclaw_ref` 입력으로 정상이던 OpenClaw commit을 지정합니다 |
| `Fetch OpenRouter` / `Fetch models.dev` 실패 | 외부 장애, 부분 응답 | 그 회차만 실패하고 기존 catalog가 유지됩니다. 다음 회차에 자동 복구됩니다 |
| `Report catalog gaps` 실패 | GitHub API 오류 | 커밋에는 영향이 없습니다(`continue-on-error`). 다음 회차에 다시 갱신됩니다 |
| 예약 실행이 계속 성공인데 catalog가 안 바뀜 | 모든 출처가 그대로 | 정상입니다. 원본이 같으면 `nothing to do`로 끝납니다 |

## 9. 열린 결정과 재확인 목록

처리하면 이 목록을 고치고 REVIEW에 기록합니다. 새로 생긴 재확인 거리(프로모션, 미래 날짜 요금, 보류한 판단)도 여기에 추가합니다.

| 시점 | 항목 |
| --- | --- |
| 마지막 정기 점검 | **2026-11-19** (다음 점검 때 `npm run candidates -- --since 2026-11-19`). 이 날 `npm run audit` open 0, 후보는 아래 보류 1건뿐 |
| 보류 (승인제) | `anthropic/claude-mythos-5-1`(11/21, Anthropic 검증 프로그램 통과 조직 전용). 일반 공개되면 공식 값(창 1M·출력 128K, $10/$50/cacheRead $0.25/cacheWrite $12.5)으로 추가(`claude-mythos-5*` `thinking` 규칙 이미 있음). `openai/gpt-5.6-cyber`(11/21, Daybreak Red 승인 고객 전용). 일반 공개되면 Pi 1.5.2 값(창 400,000·`contextTokens` 272,000·출력 128,000, text·image)과 공식 가격으로 추가. Vertex Gemini 4 Neon(11/18, verified enterprise customers 전용). 일반 공개되면 추가: Global $3/$15/cacheRead $0.15, 한 번 응답 65,536, 단계 low~xhigh 기본 high(`thinking` 규칙 이미 있음). 단, 아래 "Agent Pi 갱신 시" 행이 남아 있으면 `google-vertex`/`gemini-4-neon` 규칙(low~high)도 함께 넣습니다 |
| 2026-12-01 이후 | Gemini 2.5 Pro/Flash가 새 모델로 라우팅됨. `google` provider의 Gemini 2.5 Effort 규칙을 재검토(`google-gemini-cli`의 같은 행도 같은 `*` 규칙을 받음). 자동 provider `google`의 Gemini 4 Argon/Carbon 가격 인상이 반영됐는지 확인(`google-vertex`는 날짜 규칙으로 자동) |
| 2027-01-12 이후 | Gemini 4 Hydrogen(그리고 Neon)의 캐시 쓰기 요금(입력의 1.25배)이 생김. `google-vertex` 행에 `cacheWrite` 추가 |
| 수시 | 무료·프로모션 0원 모델의 유료 전환: Glyph Cluster, Flint(Kilo·Vercel)와 무료 변형 14개(kilocode `:free`, vercel `-free`). 가격 0은 `overrides`에 있으니, 출처 API에서 가격이 생기면 해당 규칙을 지우거나 고칩니다. OpenCode 무료 11행(`opencode` 8, `opencode-go` 3, ID에 `-free`)은 수동 행 값이 0이니, Zen·Go 모델 API에서 가격이 생기면 행 값을 고칩니다 |
| 수시 | `github-copilot` 퇴역 5행(`gpt-5.4`, `gpt-5.4-mini`, `gpt-5.5`, `gemini-2.5-pro`, `gemini-3.5-flash`)의 `contextTokens` 128000·`maxTokens` 8192는 공식 값이 아니라 Agent 값입니다(승인된 예외, REVIEW 2026-11-20). Copilot 공식 모델별 한도가 공개되면 해당 `overrides` 규칙을 지우거나 고칩니다 |
| Agent Pi 갱신 시 | `google`·`google-vertex`의 Gemini 4 Hydrogen·Neon 3행은 공식 단계에서 `xhigh`를 뺀 값입니다(Agent의 Pi 1.5.2 Google 어댑터가 `xhigh`에서 예외를 던짐, 승인된 예외, REVIEW 2026-11-20). Agent가 올린 Pi의 Google 어댑터가 `xhigh`를 받으면 `thinking`의 provider 지정 규칙 3개를 지웁니다. 그 전에는 Google API(`google-generative-ai`·`google-vertex`) 행에 새로 `xhigh`·`max`가 생기면 같은 방식으로 뺍니다 |
| 수시 (OpenCode) | 2026-11-21 수동 행 91개(`opencode` 69, `opencode-go` 22)의 Pi 값 중 공식 모델 API와 다른 칸: `opencode/deepseek-v4.1-flash` 이름(API "DeepSeek V4.1 Flash 1017"), `opencode/claude-sonnet-4-5` 창 200,000(API 1,000,000), `opencode/gpt-5.4` 창 272,000(API 1,050,000), `opencode-go/kimi-k3.1-pro` 출력 131,072(API 1,048,576), 입력 예산(`limit.input`) 24행 미반영. 공식 값으로 바꾸기로 하면 이 칸을 고칩니다. 할인 종료: Gemini 4 Argon(두 provider) 2026-12-01부터, Gemini 3.7·3.8 Flash 2027-01-01부터 가격 2배(API `multipliers`), Mistral Large 4도 "50% off" 표시. Zen "Deprecated models" 표에 있지만 모델 API·모델 표에 남은 6행(`gpt-5-codex`, `gpt-5.1-codex`, `-max`, `-mini`, `gpt-5.2-codex`, `minimax-m2.5`)의 상태는 비워 두었습니다. API에서 빠지면 행·규칙을 지웁니다 |
| 수시 (OpenCode 넣지 않은 ID) | 문서 표에는 있으나 모델 API에 없어 넣지 않은 `opencode/glm-5.1`, `glm-5.2`, `kimi-k2.6`, `inkling-2-small-free`, `opencode-go/glm-5.2`(그리고 Deprecated 표의 `gemini-3.1-pro`, `gemini-3-flash`, `glm-5.3-flash-free`, `minimax-m3.1-flash-free`, `glm-5`, `kimi-k2.5`, 공식 어디에도 없는 `opencode-go/mimo-v2.5`, `mimo-v2.5-pro`). 모델 API에 나타나면 공식 값으로 추가합니다 |
| 수시 (OpenCode Effort) | 2026-11-22(I3h)부터 `opencode`·`opencode-go` 규칙은 모델 API `capabilities.reasoning`을 따릅니다: `effort` 배열이 있으면 그 단계(`none`→`off`, `toggle`이면 `off` 추가), `effort` 없이 `toggle`만 있으면 `off`·`adaptive`. 기본 단계는 API `default` → 지금 값이 새 목록 안이면 그대로 → 제조사 공식 기본(`*` 규칙·문서) → 가장 가까운 단계(기록) 순서입니다(근거 없는 기본값 변경 금지). `opencode-go/minimax-m3` 기본 adaptive는 공식 기본값이 아닌 오케스트레이터 결정입니다(Anthropic 경로 MiniMax 기본은 off). 이 규칙으로 단계가 안 나오는 11행(effort·toggle 둘 다 없음: `claude-haiku-4-5`·`claude-sonnet-4-5`(budget만), `iceman-free`, `kimi-k2.7-code`, `mimo-v2.6-flash-free`, `minimax-m2.5`·`m2.7`, `nemotron-3.5-lightning-free`, Go `iceman-contributor-free`·`mimo-v2.6-flash`·`mimo-v2.6-pro`)은 Agent 현재 동작 보존 규칙("Not the official ladder") 그대로입니다. `grok-build-0.1`은 2026-11-24(G1)부터 on 한 단계(`high`)이고, 같은 날 `disabled` 입니다(xAI 가 2026-11-19 에 종료, https://docs.x.ai/docs/release-notes. Grok Build 는 xAI 만 서비스하고 OpenCode 는 그것을 중계하므로 함께 끝남). 모델 API가 바뀌면 같은 규칙으로 다시 대조합니다. 공식끼리 어긋나는 곳(Zen `kimi-k3` toggle 대 Moonshot "항상 생각", Zen `mistral-large-4` `none` 대 Mistral "Large 4 does not accept none")은 OpenCode를 따랐습니다(REVIEW 2026-11-22 I3h) |
| 수시 (BytePlus·Volcano Engine) | 2026-11-21 수동 행 6개(`byteplus` 3, `volcengine` 3)의 이름·reasoning·입력·창·최대 출력은 Agent 플러그인 표 값입니다. 공식과 다른 칸: `byteplus` Seed 2.0 Pro/Lite/Mini `maxTokens` 4096(공식 기본 출력 4K, 최대 128K), 입력에 오디오 없음(Lite·Mini는 공식 오디오 이해 지원, 수동 행 스키마 제한). `byteplus` 가격은 Standard [0,128K] 구간이고 (128,256] 구간(두 배)은 넣지 않았습니다. `volcengine` 3행은 공식 가격이 CNY뿐이라 비우고 `knownGaps`에 적었습니다. Volcano Engine이 USD 가격을 공개하면 행에 넣고 `knownGaps` 3개를 지웁니다. 공식 퇴역 공지에 오르면 행을 지우거나 상태를 바꿉니다 |
| Volc 계열 요청 확인 수단이 생기면 | `byteplus`·`volcengine` 수동 행 6개의 `thinking` 규칙(정확한 ID, "Not the official ladder")은 Agent의 현재 동작(목록 off~high+adaptive, 기본 low)을 보존한 값입니다. 공식 thinking 제어(ModelArk Chat API `thinking.type`, 이미 있는 `*` 규칙 `seed-2-0*`·`deepseek-v4-1-flash*`·`doubao-seed-2-1*`의 목록)로 바꾸려면 Agent가 그 주소로 실제 요청을 보내 확인할 수단이 필요합니다. 바꿀 때는 이 6규칙을 지웁니다 |
| 수시 (Together) | 2026-11-21 수동 행 `together/Qwen/Qwen3.8-Flash`의 이름·reasoning·입력·창·최대 출력은 Agent 플러그인 표 값입니다. 공식 서버리스 목록에 근거가 없는 칸: 이미지 입력(Vision 표에 없음), reasoning, 최대 출력 8192. Together가 이 값을 공개하면 행을 고칩니다. `thinking` 규칙(정확한 ID, "Not the official ladder")은 Agent의 현재 동작(목록 off~high+adaptive, 기본 low)을 보존한 값이고, 지우면 `*` 규칙 `qwen3-8-flash*`(off·low·medium·xhigh, 기본 xhigh)가 걸립니다. Agent가 이 주소로 실제 요청을 보내 확인할 수단이 생기면 규칙을 지웁니다. 상류 `together`에 같은 ID가 생기면 상류 행이 이깁니다 |
| 수시 (Synthetic) | 2026-11-21 신설 provider `synthetic`(수동 행만, Anthropic Messages)의 4행 이름·reasoning·입력·창·최대 출력은 Agent 플러그인 표 값입니다. 공식 모델 API와 다른 칸: 네 행 모두 `maxTokens` 8192(API 65,536), `hf:openai/gpt-oss-120b` 창 128,000(API 131,072)·reasoning false(API effort none/low/medium/high). gpt-oss는 `overrides`의 정확한 ID 규칙(`reasoning: false`)이 `*` 규칙 `gpt-oss-*`(`reasoning: true`)보다 뒤에 있어야 꺼진 채로 남습니다. reasoning 행 3개의 `thinking` 규칙(정확한 ID, "Not the official ladder")은 Agent의 현재 동작(목록 off~high+adaptive, 기본 low)을 보존한 값이고, 지우면 `*` 규칙 `glm-4-7-flash*`·`glm-5-3*`·`qwen3-8-27b*`가 걸립니다. Agent가 이 주소로 실제 요청을 보내 확인할 수단이 생기면 규칙 3개와 gpt-oss `overrides` 규칙을 지우고 공식 값(API `reasoning_parameters.efforts`, 최대 출력)으로 바꿉니다. 모델 API에서 ID가 빠지면 행·규칙을 지웁니다(API 문서: 오래된 모델은 순환되며 404). 상류 OpenClaw에 `synthetic`이 생기면 같은 ID는 상류 행이 이깁니다 |
| OpenAI 새 GPT 계열 발표 시 | https://developers.openai.com/api/docs/guides/prompt-caching 의 top-level `instructions` 문장("Models starting with GPT-6.2 … append these instructions after input")이 새 계열에도 걸리는지 확인하고, 걸리면 `overrides`에 `cachesInstructions: false` 계열 규칙(`provider: "*"`, 예: `gpt-6-2*`·`openai-gpt-62*`)을 한 줄씩 더합니다. 끝 `*`는 "6.2 이상"을 뜻하지 않습니다 |
| 수시 (퇴역 Agent ID, 2026-11-22) | `kimi/kimi-code`·`k2p5`, `kilocode/kilo/auto`, `nvidia` 7행(그중 `moonshotai/kimi-k3`·`z-ai/glm-5.2`는 값이 안쪽 catalog 행 사본), `minimax`·`minimax-cn`·`minimax-portal-cn`의 `MiniMax-M3.1-Flash-Preview`는 Agent가 아직 해석하는 ID를 퇴역 행(값은 Agent 표)으로 남긴 것입니다. 프로바이더가 그 이름을 거부한다는 공식 근거(퇴역 공지 등)가 생기면 행을 지웁니다. `stepfun-plan` 행 목록 재검토: Step Plan 표의 "仅接受 `step-router-v1`"이 plan 채널 전체에 걸리는지 |
| 카탈로그 후속 (I3h, 2026-11-22) | `moonshot/kimi-k3`·`kimi-k3.1-pro(-highspeed)` 행의 단계는 2026-11-23 I5 C1로 처리했습니다(공식 low/high/max, 기본 max, 규칙 `map`이 `low`·`high`의 상류 `null`을 풂, REVIEW 2026-11-23). Gemini·Gemma 행 `map`의 `off` 칸을 공식 근거로 넣으면 Agent의 Google `off` 이름 규칙을 지울 수 있습니다. Bedrock Pi 전용 Claude ID 20개를 catalog 행으로, 옛 Azure 키, Gemini 명시 캐시 칸은 Agent 설계 `S3I3H-DESIGN.md` 4.3에 있습니다 |
| 수시 (I5 Not the official default, 2026-11-23) | `openai/gpt-daybreak-blue-latest`의 기본 단계 `low`는 공식 기본값이 아닙니다. 별칭 스냅샷 `gpt-5.6-sol`의 공식 기본은 `medium`입니다(https://developers.openai.com/api/docs/models/gpt-5.6-sol). 이 행은 기본이 없어 Agent가 일반 대체값 `low`로 돌던 퇴역 별칭이라, 규칙의 필수 `default`에 오늘 값 `low`를 적어 요청을 그대로 지켰습니다(승인된 예외, REVIEW 2026-11-23 I5). 별칭이 다른 스냅샷을 가리키거나 행이 빠지면 규칙을 고치거나 지웁니다 |
| 수시 (I5 완전한 끄기 아닌 `off`, 2026-11-23) | `baseten/openai/gpt-oss-120b`의 `off`(`none`으로 나감)는 5장 "`off`는 실제로 끌 수 있을 때만"의 예외입니다. Baseten은 이 모델에 "`none` can still reason", "OpenAI GPT 120B can return `reasoning_content` with `none`"이라고 적습니다(https://docs.baseten.co/inference/model-apis/reasoning). 목록에서 `off`를 빼면 Agent가 오늘 보내는 `none` 대신 `minimal`을 보내고(Agent I5 코드 고침 뒤) 사용자는 가장 낮은 단계를 잃으므로, 오늘 요청을 지키려고 남겼습니다(승인된 예외, REVIEW 2026-11-23 I5). Baseten이 `none`을 완전한 끄기로 바꾸면 예외가 아니게 됩니다 |
| 수시 (I5 후속, 2026-11-23) | F3: `thinking`의 `nvidia`/`moonshotai/kimi-k3` 규칙(퇴역 행, `max` 하나)은 안쪽 행이 I5 C1로 low/high/max가 된 뒤에도 I3h 때의 `max` 하나를 지킵니다(note를 그렇게 고쳤음). 단계를 바꾸면 그 경로의 요청이 바뀌므로 Agent 쪽 측정과 함께 따로 봅니다. F4: Baseten `moonshotai/Kimi-K3.1-Pro`도 공식이 `none`을 받습니다(지금 `off` 없음). F5: `kimi/k3`·`k3-256k` 목록의 `off`는 Kimi Code 공식(항상 생각, low/high/max)과 어긋납니다 |
| 2026-12-11·2027-01-14·2027-01-22·2027-04-01 (복원한 폐기 행) | 2026-11-24 복원한 수동 행은 공식 폐기(Deprecated)지만 마지막 게시 행대로 상태를 비워 두었습니다. 종료일: `openai` `gpt-5`·`gpt-5-mini`·`gpt-5-nano`·`gpt-5-pro`·`o3`·`o3-pro` 2026-12-11, `gpt-4o-2024-08-06`·`gpt-4o-2024-11-20`·`gpt-4.1-mini`(날짜 스냅샷) 2027-01-14, `anthropic` `claude-opus-4-5`·`-20251101` 2027-01-22, `openai` `gpt-5.1`·`gpt-5.3-codex` 2027-04-01(https://developers.openai.com/api/docs/deprecations, https://platform.claude.com/docs/en/about-claude/model-deprecations). `gpt-4o`·`gpt-4o-mini`·`gpt-4.1-mini` 별칭은 종료일이 없습니다. `deprecated` 표시와 날짜 `corrections`(`effectiveAt`, `disabled`)를 넣을지 결정이 필요합니다. 상류가 같은 id 를 다시 내면 수동 행은 쓰이지 않습니다 |
| 수시 (Grok Build 중계 행, 2026-11-24) | `openrouter/x-ai/grok-build-0.1`·`vercel-ai-gateway/spacexai/grok-build-0.1`·`opencode/grok-build-0.1` 은 `disabled` 수동 행입니다(xAI 가 2026-11-19 종료, https://docs.x.ai/docs/release-notes, 두 중계 모델 API 에서도 빠짐). 상류(OpenRouter·Vercel 자동 목록)가 같은 id 를 다시 나열하면 병합에서 상류 행이 이겨 수동 행과 상태가 사라집니다. 그때는 `xai` 행처럼 `overrides` 의 `set.status: "disabled"` 로 옮깁니다 |
| Agent SOT 전환 시 | Sonnet 5.5의 `off`(`between_tools`로만 가능), Codex 모델 기본 Effort가 API 기본값과 같은지, Agent의 `max` 단계 지원 |

`corrections`의 날짜 규칙(Sonnet 4.5 EOL 2027-04-08, Gemini 4 Vertex 가격 2026-12-01 등)은 자동으로 적용되므로 여기에 넣지 않습니다.

## 10. 하지 말 것

- `models/v1/catalog.json`을 손으로 고치거나, 충돌을 손으로 합치는 것
- 모르는 가격·한도에 0이나 추정값을 넣는 것
- 공식 문서가 있는데 models.dev·OpenRouter 값만 보고 수동 값을 정하는 것
- 짧은 정규화 키로 `*` 규칙을 만드는 것, 그리고 `knownGaps`를 `*`로 넓게 거는 것
- workflow에 `pull_request_target` 트리거를 추가하는 것(fork PR에 쓰기 토큰이 넘어감)
- OpenClaw 코드를 `publish` job(쓰기 권한)에서 실행하는 것. 외부 코드는 `generate` job에서만 돌립니다
- 비밀 정보(키, 토큰)나 `baseUrl`·`headers`·`apiKey` 같은 전송 필드를 catalog에 넣는 것(publisher가 제거하고, audit이 잡습니다)
