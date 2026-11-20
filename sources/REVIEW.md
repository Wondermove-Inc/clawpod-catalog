# 2026-09-08 공식 자료에 따른 보완 데이터 수정

초기 입력은 Clawpod-Agent `b46fcc3b` 및 pi-ai 0.66.1이었다. 이 문서는 그 스냅샷을
공식 자료로 다시 확인해 변경한 기록이다. 게시 workflow에서 외부 provider API를 수집하지 않는다.
비용 단위는 USD / 백만 토큰이며, 실제 호출·계정 접근권을 검증한 기록은 아니다.

| 대상             | 수정 내용                                                                                                                               | 공식 근거                                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google / Vertex  | 0원 placeholder를 표준 text/image 기본 가격으로 교체. Vertex global 기준. 3.6/3.7/3.8 도입 가격은 2027-01-01 전환 규칙 추가             | [Gemini 가격](https://ai.google.dev/gemini-api/docs/pricing), [Vertex 가격](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing)          |
| Codex            | GPT-5.4/mini 종료(disabled), Terra/Luna 대체 ID. 구독 가격에 해당하지 않는 SDK API 비용과 0원 placeholder 생략                          | [Codex 모델](https://learn.chatgpt.com/docs/models), [과금](https://learn.chatgpt.com/docs/pricing)                                                                   |
| Anthropic Vertex | Sonnet 5 인상 취소: 입력/출력 2/10, cacheRead/cacheWrite 0.2/2.5                                                                        | [인상 취소](https://platform.claude.com/docs/en/about-claude/pricing), [Vertex 가격](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing) |
| Mantle           | Mythos Preview의 미확인 0원, Sonnet 5의 취소된 인상 일정에 근거한 비용 생략. AWS 청구 가격을 확인하기 전 타 플랫폼 가격을 대입하지 않음 | [AWS 모델 카드](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-5.html), [AWS 가격](https://aws.amazon.com/bedrock/pricing/)  |
| xAI              | 공식 전환 대상 3개를 deprecated로 표시하고 실제 grok-4.3 대상의 메타데이터 적용. 미확인 구형 ID 4개 제외                                | [전환 안내](https://docs.x.ai/developers/migration/may-15-retirement), [가격](https://docs.x.ai/developers/pricing)                                                   |
| MiniMax / Portal | M3의 미공개 cacheWrite=0 생략. Portal은 USD/token 구독 가격 근거가 없어 비용 생략. API 기본 가격은 유지                                 | [가격](https://platform.minimax.io/docs/guides/pricing-paygo)                                                                                                         |
| Bedrock          | Legacy 모델·프로파일 상태, 공지된 EOL 전환 규칙. Claude 3.5 Sonnet 확장 지원 가격 6/30으로 정정                                         | [수명주기](https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html), [가격](https://aws.amazon.com/bedrock/pricing/)                                |
| zAI              | GLM-5.1/5.2 입력/출력/cacheRead 1.4/4.4/0.26, GLM-5.3 cacheRead 0.26. Flash 할인 종료 후 0.15/0.5/0.03 전환                             | [가격](https://docs.z.ai/guides/overview/pricing)                                                                                                                     |
| OpenRouter       | 기존 255개를 현재 공개 API 428개와 대조, 확인 가능한 180개 가격·한도 갱신. Agent auto 별칭 유지. 공개 목록에 없는 74개 제외             | [모델 API](https://openrouter.ai/api/v1/models)                                                                                                                       |

## 날짜와 조건

- zAI Flash 할인 종료는 2026-09-09 24:00 UTC+8, 즉 `2026-09-09T16:00:00Z`이다.
- Google 도입 가격 종료와 AWS EOL은 공급자가 날짜만 명시해 UTC 자정을 게시 기준으로 삼았다.
  실제 서비스 종료 시각을 보증하지 않는다. 전환은 경계 후 첫 정상 게시에서 반영된다.
- AWS Claude 3 Haiku(2026-09-10), Nova Premier(2026-09-14), Sonnet 4(2026-10-14),
  Opus 4.1(2027-01-08) 및 해당 목록의 프로파일은 Legacy → disabled 전환 규칙을 가진다.
- 확정되지 않은 zAI Turbo 최신 가격도 보완 입력에서 생략한다. Upstream에 동일 ID의 가격이
  있으면 일반 병합 정책상 그 가격은 보존한다. 이 변경은 upstream 전체의 가격 감사를 뜻하지 않는다.
- `corrections`는 현재 필드가 명시된 구값과 같을 때만 적용한다. 더 새로운 다른 가격이나
  이미 disabled인 모델 상태는 덮어쓰지 않는다. 규칙에 공식 URL을 함께 기록한다.

## 의도적으로 유지한 운영 설정과 가격 범위

- Codex 272K context는 Agent 운영 예산이다. 서비스 최대 context로 변경하지 않는다.
- xAI 10000 및 MiniMax 131072 maxTokens는 Agent 기본값이며 공식 최대치라고 단정하지 않는다.
- Mantle Opus 4.7 reasoning=false는 Agent transport 호환성 정책이다.
- Gemini 3.1 Flash Preview는 Agent가 Gemini 3 Flash Preview로 변환하는 별칭이다.
- Gemini Pro는 200K 초과 시 장문 가격이 있으며, xAI도 모델별 장문 과금이 있다.
  MiniMax M3의 512K 초과 입력 비용은 기본 가격의 2배, Priority는 추가 1.5배이다.
  보완 cost는 기본 표준 가격이며 이러한 조건을 전부 표현하지 않는다.
- Google 저장 비용은 시간 단위 요금이므로 단순 cacheWrite 토큰 요금으로 새로 만들지 않는다.
  Anthropic의 cacheWrite는 5분 TTL이다. 지역·Priority·Batch·구독 가격은 별개다.
- Mythos 모델은 초대 전용이다. ID가 있는 것과 계정이 호출 가능한 것은 다르다.

## OpenRouter 재검토 방법

공개 API를 한 번 조회해 기존 ID와 대조했다. 입력 모달리티는 소비자 지원 범위인 text/image로
제한하고, 가격을 USD/token에서 USD/백만 토큰으로 변환했다. 캐시 가격이 없으면 생략했다.
`maxTokens`는 API의 `top_provider.max_completion_tokens`가 양수일 때 갱신했고, null이면
기존 Agent 기본값을 유지했다. 실제 라우팅 공급자에 따라 한도가 다를 수 있다.
`reasoning`은 파라미터 지원 여부와 같은 의미가 아니므로 Agent 정책을 유지했다.
새 API 목록의 모델을 전부 추가한 것이 아니며, 정기 자동 수집도 도입하지 않았다.

아래 74개는 이번 공개 목록에서 확인되지 않아 수동 보완 목록에서 제외했다.
이 목록을 모두 서비스 종료로 단정하지 않는다. `auto`는 Agent 기본 별칭으로 유지하되
라우팅 결과마다 과금이 달라 비용을 생략했다. 별개의 `openrouter/auto`도 유지한다.

- `ai21/jamba-large-1.7`
- `alibaba/tongyi-deepresearch-30b-a3b`
- `allenai/olmo-3.1-32b-instruct`
- `anthropic/claude-3.5-haiku`
- `anthropic/claude-3.7-sonnet`
- `anthropic/claude-3.7-sonnet:thinking`
- `anthropic/claude-opus-4.6-fast`
- `arcee-ai/trinity-large-preview:free`
- `arcee-ai/trinity-mini`
- `arcee-ai/trinity-mini:free`
- `arcee-ai/virtuoso-large`
- `baidu/ernie-4.5-21b-a3b`
- `baidu/ernie-4.5-vl-28b-a3b`
- `essentialai/rnj-1-instruct`
- `google/gemini-2.0-flash-001`
- `google/gemini-2.0-flash-lite-001`
- `google/gemini-2.5-flash-lite-preview-09-2025`
- `inception/mercury`
- `inception/mercury-coder`
- `meituan/longcat-flash-chat`
- `meta-llama/llama-3-8b-instruct`
- `meta-llama/llama-3.3-70b-instruct:free`
- `minimax/minimax-m2.5:free`
- `mistralai/devstral-medium`
- `mistralai/devstral-small`
- `mistralai/mistral-large-2411`
- `mistralai/mistral-small-creative`
- `mistralai/mixtral-8x7b-instruct`
- `mistralai/pixtral-large-2411`
- `nex-agi/deepseek-v3.1-nex-n1`
- `nvidia/llama-3.1-nemotron-70b-instruct`
- `nvidia/llama-3.3-nemotron-super-49b-v1.5`
- `nvidia/nemotron-3-nano-30b-a3b:free`
- `nvidia/nemotron-nano-12b-v2-vl:free`
- `nvidia/nemotron-nano-9b-v2`
- `nvidia/nemotron-nano-9b-v2:free`
- `openai/gpt-4-0314`
- `openai/gpt-4-1106-preview`
- `openai/gpt-4o-audio-preview`
- `openai/gpt-4o:extended`
- `openai/gpt-5-codex`
- `openai/gpt-5.1-chat`
- `openai/gpt-5.3-chat`
- `openai/gpt-oss-120b:free`
- `openai/gpt-oss-20b:free`
- `openai/o3-deep-research`
- `openai/o4-mini-deep-research`
- `openrouter/healer-alpha`
- `openrouter/hunter-alpha`
- `prime-intellect/intellect-3`
- `qwen/qwen-max`
- `qwen/qwen-plus-2025-07-28:thinking`
- `qwen/qwen-turbo`
- `qwen/qwen-vl-max`
- `qwen/qwen3-coder:free`
- `qwen/qwen3-next-80b-a3b-instruct:free`
- `qwen/qwq-32b`
- `sao10k/l3-euryale-70b`
- `stepfun/step-3.5-flash:free`
- `thedrummer/rocinante-12b`
- `tngtech/deepseek-r1t2-chimera`
- `x-ai/grok-3`
- `x-ai/grok-3-beta`
- `x-ai/grok-3-mini`
- `x-ai/grok-3-mini-beta`
- `x-ai/grok-4`
- `x-ai/grok-4-fast`
- `x-ai/grok-4.1-fast`
- `x-ai/grok-code-fast-1`
- `xiaomi/mimo-v2-flash`
- `xiaomi/mimo-v2-omni`
- `xiaomi/mimo-v2-pro`
- `z-ai/glm-4-32b`
- `z-ai/glm-4.5-air:free`

## xAI에서 제외한 미확인 구형 ID

- `grok-3-fast`
- `grok-3-mini`
- `grok-3-mini-fast`
- `grok-4-fast`

# 2026-10-02 Codex 모델 재검토

근거: [Codex 모델](https://learn.chatgpt.com/docs/models) (ChatGPT 로그인 기준). 계정 접근권·실제 호출은 검증하지 않았다.

| 모델 | 공식 문서 | 반영 |
| --- | --- | --- |
| `gpt-6.1-sol` | 현행. Plus·Pro·Business·Enterprise·Edu 순차 제공 | 추가 |
| `gpt-6-sol`, `gpt-6-luna` | Work와 Codex에서 사용 가능 | 추가 |
| `gpt-5.3-codex-spark` | 2026-09-14 종료 | `disabled` (공식 대체 ID 미기재로 `replacedBy` 생략) |
| `gpt-5.5` | 2026-10-14 모든 플랜에서 종료 예정 | 지금 `deprecated`, `effectiveAt` 2026-10-14 00:00 UTC 규칙으로 `disabled` |

- 새 모델은 `gpt-6-astra`와 같이 272K 운영 예산, 128000 maxTokens, text+image 입력으로 둔다.
  서비스 최대 context나 구독 비용을 새로 측정한 값이 아니다.
- `gpt-5.6-sol`·`gpt-5.6-terra`·`gpt-5.6-luna`는 문서상 롤아웃 기간 동안 유지되므로 그대로 둔다.
- `gpt-5.5-mini`, `gpt-5.1` 계열, `gpt-5.2-codex`는 문서에 언급이 없어 이번에 상태를 바꾸지 않았다.

# 2026-10-02 provider 누락 모델 재검토

models.dev와 OpenRouter 공개 API로 누락 후보를 찾은 뒤, 아래 공식 자료로 확인해 추가했다.
계정 접근권·실제 호출은 검증하지 않았다. 비용 단위는 USD / 백만 토큰이다.

| 대상 | 추가·수정 | 공식 근거 |
| --- | --- | --- |
| `anthropic-vertex` | `claude-opus-5-5`(4/20/0.2/5), `claude-sonnet-5-5`(2/10/0.2/2.5). 1M context, 128K 출력. Global 가격 | [Opus 5.5](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/claude/opus-5-5), [Sonnet 5.5](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/claude/sonnet-5-5), [Vertex 가격](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing) |
| `amazon-bedrock-mantle` | Opus 5.5, Sonnet 5.5, Fable 5, Fable 5.1, Opus 4.8 추가. 모든 행 가격을 AWS Geo/In-region 가격으로 통일(기존 Opus 5·Mythos 5·Opus 4.7 포함), 미확인이던 Sonnet 5·Mythos Preview 가격 채움 | [AWS 모델 카드](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-5-5.html), [AWS 가격](https://aws.amazon.com/bedrock/pricing/) |
| `minimax-portal` | `MiniMax-M3.1-Flash-Preview` (M Plan 전용, 비용 생략) | [텍스트 생성](https://platform.minimax.io/docs/guides/text-generation) |
| `amazon-bedrock` | 57행: Claude Opus 4.7/4.8, Sonnet 5, Fable 5/5.1, Opus 5/5.5, Sonnet 5.5; GPT-5.6 Sol/Terra/Luna, GPT-6 Astra/Sol/Luna, GPT-6.1 Sol; Grok 4.6/4.7; Kimi K3 | AWS 모델 카드, [AWS 가격](https://aws.amazon.com/bedrock/pricing/) |
| `openrouter` | 수동 목록 대신 매 게시마다 공개 API로 자동 갱신. 수동 파일에는 `auto` 별칭만 유지 | [모델 API](https://openrouter.ai/api/v1/models) |

## 판단과 한계

- **Mantle 가격 기준:** Mantle 모델 ID는 지역(in-Region) 전용이고, AWS는 runtime과 mantle의 토큰 가격이 같다고 밝힌다.
  그래서 Geo/In-region 가격(Global 대비 +10%)을 적용했다. 2026-09-08 기록의 "Mantle 미확인 비용 생략"은 이 검토로 대체한다.
- **Bedrock 가격:** 새 행은 AWS 기준을 따른다. us./eu./jp./au./in. 및 base ID는 +10%, global.은 기본가다.
  Global 표에 가격이 없는 global 행(Opus 4.7/4.8, Sonnet 5, Fable 5/5.1, Opus 5)은 비용을 생략했다.
- **기존 87행 가격 감사:** AWS Price List feed와 가격 페이지로 87행을 모두 대조해 64행 일치, 23행 수정했다.
  - Claude Sonnet 4.5/4.6, Haiku 4.5, Opus 4.5/4.6의 base·us.·eu. ID 15행: +10% (global.은 이미 일치).
    지역 할증은 Claude 4.5 이후·Nova 2·Grok 4.6/4.7·Kimi K3에만 있고, Sonnet 4·Opus 4/4.1·Claude 3.x·Nova 1·오픈 웨이트 모델에는 없다.
  - Nova 2 Lite·Nova Premier cacheRead, Qwen3 4종, Gemma 3 27B, Voxtral Small 가격 갱신.
    Qwen3 Next 80B 입력은 가격 페이지 $0.15를 썼다(feed의 표준 SKU는 Mantle 엔드포인트 $0.14).
  - Llama 3.1 405B, DeepSeek V3.1, Qwen3 235B, Qwen3 Coder 480B는 us-east-1 가격이 없어 us-west-2 가격 기준이다.
  - AWS에 캐시 가격이 없는데 0으로 적힌 기존 cache 필드는 이번에 정리하지 않았다.
  - Opus 4.1은 2026-10-08부터 공개 연장 지원 가격으로 바뀔 예정이라 다시 확인이 필요하다.
- **Bedrock ID 범위:** AWS 카드가 in-Region runtime endpoint를 명시한 경우에만 base ID를 넣었다(Sonnet 5, Opus 5, Opus 5.5).
  `jp.` Sonnet 5, `jp.` Opus 5, `eu.` Fable 5는 AWS 카드에 없어 제외했다.
- **Mantle 전용 모델:** `openai.gpt-5.5`, `xai.grok-4.3`, Gemma 4 3종은 bedrock-mantle에서만 제공되어 Converse(`amazon-bedrock`) 대신
  `amazon-bedrock-mantle`에 기본 API(`openai-completions`)로 추가했다. 가격은 AWS feed(GPT-5.5는 Marketplace 판매라 모델 카드) 기준이다.
  **AWS 카드는 이 모델들을 `/openai/v1` 경로로 제공한다고 하는데 Agent는 `/v1`을 쓴다. 실제 호출은 확인하지 않았다.**
  Grok 4.3·Gemma 4의 maxTokens는 공식 값이 없어 xAI upstream·models.dev 값을 썼다. GPT-5.5는 272K 초과 입력 할증을 표현하지 않았다.
- **reasoning:** Mantle Opus 4.8은 Opus 4.7과 같은 Agent 전송 정책으로 `false`. Bedrock Converse 행은 AWS 문서대로 `true`.
- **AWS나 xAI가 밝히지 않은 값:** Grok 4.6/4.7의 maxTokens 64000은 upstream xAI 행을 따랐고,
  Kimi K3의 131072는 운영 기본값이다. 둘 다 공식 최대치가 아니다.
- **기타:** GPT-6.1 Sol은 AWS가 명시적 캐싱 미지원이라고 밝혀 cacheWrite를 생략했다. AWS 기준 한도(1M/131072)가 OpenAI 기준(1.05M/128K)과 다르다.
  Kimi K3는 AWS가 Converse에서 이전 reasoning 블록을 재전송하면 실패할 수 있다고 경고한다.
  OpenAI·xAI의 장문(272K/200K 초과) 가격, AWS 1시간 cache write 가격은 행 형식으로 표현하지 않았다.

# 2026-10-27 Codex 모델을 공식 문서 기준으로 정리

근거: [Codex 모델](https://learn.chatgpt.com/docs/models) (ChatGPT 로그인 기준, 페이지 원문 확인). 계정 접근권·실제 호출은 검증하지 않았다.

| 모델 | 공식 문서 | 반영 |
| --- | --- | --- |
| `gpt-6-astra`, `gpt-6.1-sol`, `gpt-6-luna` | 현행 추천 모델 | 유지(active) |
| `gpt-6.1-terra` | 현행 추천 모델. Codex CLI 0.159.0 이상 필요 | **추가**(active) |
| `gpt-6-sol` | `gpt-5.4`의 대체 모델로 안내("when available to your plan and client"), 종료 공지 없음 | 유지(active) |
| `gpt-5.5` | 2026-10-14 19:00 UTC 종료. 유료 플랜 대체는 `gpt-6.1-sol` | `disabled`, `replacedBy: gpt-6.1-sol`. 지난 날짜 규칙은 삭제 |
| `gpt-5.4`, `gpt-5.4-mini` | 2026-08-31 종료. 대체는 `gpt-6-sol`, `gpt-6-luna` | `disabled`, `replacedBy`를 문서 안내대로 변경(이전: `gpt-5.6-terra`/`gpt-5.6-luna`) |
| `gpt-5.3-codex-spark` | 2026-09-14 종료 | `disabled` 유지 |
| `gpt-5.2`, `gpt-5.3-codex` | 이미 deprecated, 대체 모델 안내 없음 | `deprecated` 유지. 종료된 `gpt-5.5`를 가리키던 `replacedBy` 삭제 |
| `gpt-5.1`, `gpt-5.1-codex-max`, `gpt-5.1-codex-mini`, `gpt-5.2-codex`, `gpt-5.5-mini`, `gpt-5.6-sol/terra/luna` | 페이지에 언급 없음 | `deprecated` |

- 문서에서 사라진 모델은 종료 공지가 없으므로 `disabled`가 아니라 `deprecated`로 표시했다.
  Agent(`src/agents/model-catalog-vendored.ts`)는 두 상태를 같게 취급한다. 새 설정에는 넣지 않고, 이미 쓰는 모델은 메타데이터만 갱신한다.
- `gpt-6.1-terra` 값은 다른 Codex 최신 모델과 같이 272K 운영 예산, 128000 maxTokens, text+image, reasoning=true다.
  문서에 한도가 없어 같은 ID의 `openai` upstream 행(1.05M/128000, text+image, reasoning)과 일치하는지 확인했다.

# 2026-11-18 수동 provider 재검토

models.dev와 공식 Codex 페이지로 2026-10-01 이후 누락 후보를 찾고, 아래 공식 자료로 확인해 반영했다.
계정 접근권·실제 호출은 검증하지 않았다. 비용 단위는 USD / 백만 토큰이다.

| 대상 | 추가·수정 | 공식 근거 |
| --- | --- | --- |
| `openai-codex` | `gpt-6.2-astra`, `gpt-6.2-sol` 추가(현행 추천 모델). 페이지의 Codex 기본 context는 272K/500K지만 Agent 운영 예산 272K 유지 | [Codex 모델](https://learn.chatgpt.com/docs/models) |
| `anthropic-vertex` | `claude-haiku-5-5`(0.1/0.5/0.01/0.125), `claude-fable-5-2`(8/40/0.2/10) 추가. `claude-sonnet-5-5` cacheRead 0.2→0.1 | Vertex Claude 모델 페이지, [Vertex 가격](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing) Global |
| `google-vertex` | `gemini-4-argon`, `gemini-4-carbon`(프로모션 2/10/0.1, 2026-12-01부터 4/20/0.2 날짜 규칙), `gemini-4-hydrogen`(1.5/7.5/0.075) 추가 | [Vertex 가격](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing) |
| `minimax` | `MiniMax-M3.1-Flash`(0.15/0.6/0.015) 추가. `MiniMax-M2.7`·`-highspeed`는 2026-11-18 종료로 disabled | [모델 FAQ](https://platform.minimax.io/docs/faq/models) |
| `minimax-portal` | `MiniMax-M3.1-Flash` 추가. Flash-Preview·M2.7·M2.7-highspeed는 M3.1 Flash로 처리되어 deprecated(`replacedBy`) | [M Plan](https://platform.minimax.io/docs/m-plan/intro), [모델 FAQ](https://platform.minimax.io/docs/faq/models) |
| `amazon-bedrock` | 16행 추가: Claude Haiku 5.5(us./ca./eu./au./jp./global.), Fable 5.2, GPT-6.1 Terra, Kimi K3.1 Pro Highspeed, Kimi K3 `in.`, GLM-5.3. Sonnet 5.5 cacheRead 50% 인하(2026-10-07) 반영. 상태 40행 동기화 | AWS 모델 카드, AWS Price List feed, [수명주기](https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html) |
| `amazon-bedrock-mantle` | `openai.gpt-6.1-terra` 추가(us-east-1). Sonnet 5.5 cacheRead 0.22→0.11 | AWS 모델 카드 |

## 판단과 한계

- **Bedrock 상태 동기화:** Sonnet 4.5 deprecated(2027-04-08 EOL 날짜 규칙), Sonnet 4·Claude 3 Haiku·3.5 Sonnet v1/v2·3.7 Sonnet disabled,
  Llama 3.1 405B·Llama 3.2 disabled, 2026-09-30 공지된 오픈 웨이트 21행과 Palmyra X4/X5 deprecated.
  3.7 Sonnet은 AWS가 두 리전만 표기해 나머지 리전도 같다고 판단했다.
- **Bedrock Opus 4.1:** 2026-10-08 연장 지원 시작 후에도 AWS 가격은 15/75/1.5/18.75로 변화 없음.
- **캐시 쓰기:** GPT-6.1 Terra, Kimi K3.1, GLM-5.3은 AWS가 Converse에서 명시적 캐싱을 지원하지 않는다고 해 cacheWrite를 생략했다(GPT-6.1 Sol과 같은 기준).
  기존 Kimi K3·GPT-6 행은 같은 문구인데도 cacheWrite가 남아 있어 다음 검토에서 기준을 통일해야 한다.
- **표현 못 하는 가격:** Haiku 5.5의 100K 초과 입력 할증, GPT-6.1 Terra의 272K 초과 할증, Fable 5.2 Fast 모드 가격.
- **추가하지 않은 것:** Bedrock GPT-6.2 Astra/Sol(가격 페이지 이름만, 모델 카드·ID 없음), Nova 2.0 Pro/Omni(카드 없음), Mythos 5.2(승인제),
  Mantle Haiku 5.5(GovCloud 전용).
- **공식 값이 아닌 것:** Kimi K3.1 maxTokens 131072(K3 값 차용), MiniMax M3.1 Flash maxTokens 131072(운영 기본값),
  Gemini 4 maxTokens 65536(스트리밍 응답당 한도). Haiku 5.5 reasoning=true는 Anthropic upstream 행 기준.
- **확인 필요:** M Plan 문서가 텍스트 모델로 M3.1 Flash만 표기해 `minimax-portal`의 `MiniMax-M3`가 아직 제공되는지 불분명하다(변경하지 않음).
- **`google` provider(자동 생성):** Gemini 4 Argon/Carbon이 이미 들어와 있으나 2026-12-01 가격 인상은 upstream 갱신에 맡겼다.

# 2026-11-19 Thinking Effort 공식 문서 규칙

reasoning 모델의 지원 단계(`compat.thinkingLevels`)와 기본 단계(`compat.defaultThinkingLevel`)를 공식 문서로 확인해
`thinking` 규칙 274개(provider 지정 8개, `*` 266개)로 넣었다. 규칙마다 근거 URL(`source`)과 변환 근거(`note`)가 있다.
계정 접근권·실제 호출은 검증하지 않았다.

- **결과:** 활성 reasoning 모델 1594/1663 완료(이전 1100). 새로 채움 512행, 지원 단계 수정 221행, 기본 단계 수정 198행.
- **변환 기준:** 이름 있는 effort는 그대로(`none`→`off`), 끌 수 있을 때만 `off`.
  토큰 예산만 있는 모델(Claude 4.x 수동 예산, Gemini 2.5, Qwen3.5~3.7)은 OpenClaw 기본 사다리 `off/minimal/low/medium/high`.
  모델이 스스로 생각량을 정하는 모드는 `adaptive`. 켜기/끄기만 되는 모델은 `["off","low"]` + `{"low":"on"}`, 항상 켜짐은 `["low"]`.
- **출처 충돌(공식 문서를 따름):**
  - Claude Opus 5.5 기본값 `medium`(OpenRouter는 high).
  - Sonnet 4.6 기본값 `off`.
  - Claude 4.5 이하 예산형 모델은 켜기/끄기가 아니라 예산 사다리.
  - GPT-5.2 기본값 `off`(API 기본 effort `none`), GPT-5.5 Pro 기본값 `high`.
  - o3/o4-mini는 low/medium/high, Grok 4.3에 `xhigh` 추가.
  - Grok 4.20 reasoning 계열은 항상 켜짐.
  - GLM-5.2 `off/high/max` 기본 `max`.
  - Kimi K3 계열은 Moonshot API에서 끌 수 없음(Bedrock·Venice만 `off` 허용 규칙).
  - DeepSeek V4는 `off/low/high/max`.
  - Seed는 `minimal/xhigh/max` 제거.
  - Gemini 3.x는 끌 수 없음, Gemini 4 Neon/Hydrogen 기본 `high`.
- **OpenClaw 코드와 다른 곳:** Fable 5 기본값(Anthropic 문서는 high), Mythos Preview `max` 누락, Grok 4.3 `xhigh` 누락, MiMo 단계 정의.

## 판단과 한계

- Claude effort 모델에는 `adaptive` 단계를 따로 두지 않았다. 모든 effort 단계가 adaptive로 동작하기 때문이다. OpenClaw의 Sonnet 5 프로필에는 `minimal`과 `adaptive`가 있다.
- Sonnet 5.5의 `off`는 `between_tools`로만 가능하다(`disabled`는 400). Agent가 이를 보낼 수 없으면 `off`를 빼야 한다.
- 중계 provider도 제조사 공식 값을 따른다. 예외로 DeepSeek V4의 OpenRouter·Kilo 행은 OpenRouter 공개값(`off/high/xhigh`)을 유지한다(provider 지정 규칙).
- `openai-codex` 행에도 OpenAI API 기본값이 적용된다(GPT-5.2 기본 `off` 등). Codex 구독의 시작 effort는 다를 수 있다.
- Gemini 2.5 Pro/Flash는 2026-12-01부터 Google이 새 모델로 라우팅할 예정이라 `google` provider 규칙을 다시 봐야 한다.
- 공식 기본값이 명시되지 않아 API 레퍼런스 기본값을 쓴 모델: GPT-6 Astra, GPT-6.2, o-series 등(`medium`). 근거는 각 규칙의 `note`에 있다.
- **남은 빈칸 69행은 채우지 않았다:** 라우터 별칭 25(`auto`, `free`, `*-latest` 등), 공식 문서 없음 31, 기타 13(abliterated, Aion, Arrow).
- `qwen3-coder-next`·`qwen3-coder-30b-a3b`는 thinking 모드가 없는데 `reasoning: true`로 들어와 있다. Bedrock gpt-oss 행은 반대로 `reasoning: false`인데 reasoning 모델이다. reasoning 플래그 자체의 오류라 이번 범위에서는 고치지 않았다.

# 2026-11-19 catalog 전수 검사와 자동 값 덮어쓰기

`models/v1/catalog.json` 전체(55 provider, 2114 모델)를 구조·필수 값·값 이상·Effort·상태·보안 항목으로 검사했다.
구조, 보안(접속 정보 없음), 한도 값, Effort 형식은 문제가 없었다. 확실한 오류는 새 `overrides` 규칙 41개로 고쳤다.

| 문제 | 이전 | 이후 | 처리 |
| --- | ---: | ---: | --- |
| reasoning 값 없음 | 11 | 2 | github-copilot Claude/Gemini 5행 true, Mistral 2행·Llama 3.3 false, Volcengine Kimi K2.5 true. 남은 `ark-code-latest` 2행은 별칭이라 미정 |
| reasoning 값 오류 | - | - | `qwen3-coder-next`·`qwen3-coder-30b-a3b` false(모델 카드: non-thinking only). gpt-oss(Bedrock 4, Hugging Face 1) true |
| 이름 없음 | 9 | 0 | Qwen 8, Ollama gemma4 |
| 대체 모델이 종료된 모델 | 1 | 0 | novita `minimax-m2.7`의 `replacedBy` 제거(남은 활성 MiniMax 행 없음) |
| 유료인데 가격 0 | 27 | 8 | 구독 플랜 19행은 0 대신 비움 |

## 판단과 한계

- **남긴 가격 0 (8행):** NVIDIA API 4, Cohere north-mini-code, opencode big-pickle, OpenRouter Lyria 2. 실제 무료일 수 있다. Lyria는 OpenRouter가 가격을 0으로 공개하고 다른 과금 항목이 없다.
- **`vercel-ai-gateway/openai/gpt-live-1`:** 음성 실시간 모델이라 공식 컨텍스트·출력 한도가 없다. 값이 없어 Agent가 이 행을 쓰지 않는다. 지어내지 않았다.
- **가격 없음 147행:** 구독형(Codex, `*-plan` 등)은 의도된 것이다. ollama-cloud 27, kilocode 18 등 실제 빈칸은 공식 가격 확인이 필요해 이번에 고치지 않았다.
- **캐시 가격 0 (쓰기 1035, 읽기 234):** 무료(예: OpenAI 자동 캐시)인지 미상인지 파일만으로 구분할 수 없다. 제조사별 확인이 필요하다.

# 2026-11-19 가격 빈칸·캐시 가격 재검토

전수 검사의 가격 항목을 다시 나눴다.
- 가격 빈칸 147행 중 106행은 의도된 것이다: 구독형 81(ollama-cloud, `*-plan`, Codex 등), 라우터 별칭 25.
- 캐시 쓰기 0(1035행)은 대부분 정상이다: OpenAI·DeepSeek·xAI·Gemini 기본 캐시는 쓰기 요금이 따로 없다.
- 캐시 읽기 0(234행)도 대부분 캐시 기능이 없는 모델이라 정상이다: OpenAI Pro, Bedrock 오픈 모델, Voxtral 등. Agent도 없으면 0으로 계산한다.

의심 행 48개를 각 provider의 공식 가격 자료로 확인했다.

| 결과 | 행 | 내용 |
| --- | ---: | --- |
| 가격 입력 | 24 | Bedrock `global.` Claude 6(AWS AmazonBedrockFoundationModels Global 가격). GMI Claude 5(5분 캐시 쓰기 과금, Opus 4.7 할인 종료로 5/25). DeepInfra Seed 2.0 3·Qwen3.7 Max(구간 요금 포함). Qwen3.5 Plus 캐시 가격 |
| 공식 무료 0 | 8 | Z.ai GLM Flash 3, Gemini API Gemma 4 2(무료 티어만), Kilo·Vercel Glyph Cluster, Vercel Flint |
| 비움 유지 | 23 | NVIDIA 무료 체험 API 7, Cohere Tiny Aya 4(API 가격 없음), Qwen 국제 리전 가격 없음·판매 종료 6, Switchyard·Beam(가변), gpt-live-1(초 단위 과금), Ampersand·Flint(Kilo/Vercel 가격 미공개) |
| 가격 제거 | 1 | `qwen/qwen3-coder-plus`: 2026-10-10 판매 종료로 현재 1/5를 확인할 수 없음 |
| 현재 값 유지 | 1 | DeepInfra Claude Fable 5: 캐시 요금 없음(0/0이 맞음) |

## 판단과 한계

- `overrides`의 `cost`에 upstream 행과 같은 `tieredPricing`(컨텍스트 구간별 요금)을 허용했다.
- GMI 가격은 GMI 콘솔이 쓰는 비인증 JSON(`/api/v1/billing/model_prices`)에서 가져왔다. 공개 가격 페이지가 아니다.
  GMI는 캐시 쓰기를 `ephemeral5mInputPrice`로 과금하고 `cacheWritePrice`는 0으로 표기한다.
- Kilo·Vercel의 0원(Glyph Cluster, Flint)은 출시·stealth 프로모션이라 다시 확인해야 한다.
- Qwen 가격은 싱가포르 종량제 기준이다. 이 provider가 Coding Plan(월정액) 엔드포인트라면 토큰 단가가 적용되지 않는다.
- Qwen의 판매 종료 모델 4개(`qwen3-coder-plus`, `qwen3-coder-next`, `qwen3-max-2026-01-23`, `glm-4.7`)는 상태 변경 수단이 수동 모델에만 있어서 상태를 바꾸지 못했다.
- 전수 검사의 "유료인데 0" 16행 중 8행은 위의 공식 무료다.

# 2026-11-19 유지보수 도구와 검토 완료 빈칸 기록

다른 세션(사람·에이전트)이 같은 기준으로 이어서 작업할 수 있게 도구와 기록을 저장소에 넣었다. 절차와 기준은 `MAINTAINING.md`에 있다.

- `scripts/audit-catalog.mjs`(`npm run audit`): 전수 검사. 의도된 항목(구독형, 라우터 별칭, 검토 완료)과 처리 대상(open)을 나눈다.
- `scripts/find-model-candidates.mjs`(`npm run candidates`): 수동 provider의 신모델 후보(models.dev, Codex 공식 페이지).
- `knownGaps`: 공식 값이 없어서 남기는 빈칸 48개를 사유와 함께 기록했다.
  - Effort 40: 공식 문서 없음, stealth·abliterated·커뮤니티 모델 등
  - 가격 0 7: NVIDIA 체험 API 등
  - 한도 1: `gpt-live-1`
- `overrides`의 `"cost": null` 23개: 2026-11-19 가격 조사에서 공식 토큰 가격이 없다고 확인한 행을 기록했다.
  - NVIDIA 7, Cohere Tiny Aya 4, Qwen 6, Vercel·Kilo 프로모션·가변 가격 등
- 이슈 "Thinking effort gaps"를 "Catalog gaps"로 바꿨다. 이슈 보고서는 `npm run audit`와 같은 검사(가격 포함)를 쓰고, 처리 대상(open)만 세어 0이면 닫는다.
- 이 시점의 처리 대상: 무료 변형 모델 14개의 가격(kilocode 12: `:free` 11개 + `reflection/beam-free`, vercel `-free` 2개). 무료가 확인되면 0을 넣는다(미결정).
  - 미반영 후보: Bedrock GPT-6.2 Astra/Sol. Vertex Gemini 4 Neon은 승인제(verified enterprise customers 전용)라 보류(`MAINTAINING.md` 9장).
- 새 세션 에이전트에게 문서만 주고 실제 과제(Gemini 4 Neon 추가, `:free` 가격)를 계획하게 해서 문서 공백 16건을 찾아 고쳤다.
  - 수동 행 근거 기록 위치, `maxTokens`는 한 번 응답 기준, 미래 날짜 요금, 승인제 정책, Kilo·Vercel·Vertex 출처, 입력 형식 제한, 규칙 추가 위치, 점검일 기록 등.
  - 이슈 보고서가 가격 항목을 빼고 세던 문제를 고쳐 audit와 같은 기준으로 맞췄다.

# 2026-11-19 남은 할 일 마무리 (open 0)

`MAINTAINING.md` 절차로 `npm run audit`의 open 항목과 `npm run candidates`의 후보를 처리했다. 결과는 audit open 0, 이슈 Catalog gaps 할 일 0이다.

| 대상 | 처리 | 공식 근거 |
| --- | --- | --- |
| 무료 변형 모델 14개(kilocode `:free` 11 + `reflection/beam-free`, vercel `-free` 2) | `overrides`로 가격 0 | Kilo 모델 API(`isFree: true`, 가격 0/0) https://api.kilo.ai/api/openrouter/models, Vercel 모델 API(가격 0/0) https://ai-gateway.vercel.sh/v1/models |
| Bedrock GPT-6.2 Astra/Sol | `amazon-bedrock`에 us.·global. 4행: Astra 8.8/44/0.44(us)·8/40/0.4(global), Sol 2.2/11/0.11·2/10/0.1. 1,050,000 컨텍스트, 128,000 출력 | AWS 모델 카드 `model-card-openai-gpt-6-2-astra.html`, `…-sol.html` (출시 2026-11-17) |
| Mantle GPT-6.2 Astra/Sol | `amazon-bedrock-mantle`에 `openai.gpt-6.2-*` 2행(In-Region 가격, 30분 캐시 쓰기 11/2.75) | 같은 카드의 bedrock-mantle 모델 ID(us-east-1) |
| Qwen 판매 종료 4개 | `overrides`의 새 `status` 필드로 deprecated | https://www.alibabacloud.com/help/en/model-studio/model-depreciation |

## 판단과 한계

- `overrides`에 `status`(`deprecated`·`disabled`)를 허용했다. 자동 provider 행의 상태를 바꿀 수단이 없어 보류했던 Qwen 4개를 이것으로 처리했다.
- GPT-6.2는 bedrock-runtime에 지역 base ID가 없어(카드: Not supported) us.·global. profile만 넣었다.
- GPT-6.2 장문 할증(272K 초과 입력 시 전체 요청에 Sol 4.4/16.5, Astra 17.6/66 등)은 수동 행 형식이 구간 요금을 받지 않아 넣지 않았다. Astra Ultrafast(3배, 2027-03-01부터 6배)도 표현하지 않았다.
- Converse는 명시적 캐싱을 지원하지 않아 Bedrock 행에는 `cacheWrite`를 넣지 않았다. Mantle은 Chat Completions에서 지원해 30분 캐시 쓰기 가격을 넣었다. 기존 Mantle GPT-6.1 Terra 행에는 `cacheWrite`가 없다(미확인이라 그대로 둠).
- Mantle의 OpenAI 모델은 AWS 카드상 `/openai/v1` 경로로 제공된다. Agent가 `/v1`을 쓰는 문제는 기존 Mantle 비-Claude 행과 같다.
- Gemini 4 Neon은 verified enterprise customers 전용이라 승인제 기준으로 보류했다(`MAINTAINING.md` 9장).
- 브랜치 dry-run의 최신 원본에서 `novita/baidu/cobuddy`가 Effort 빈칸 open으로 다시 나타났다. 2026-11-19 Effort 조사에서 "공식 문서 없음"으로 건너뛴 모델이라 같은 사유로 `knownGaps`에 추가했다.

# 2026-11-20 실사용 상한(`contextTokens`) 보정

ClawPoD Agent가 catalog 값을 먼저 쓰게 되면(Agent 계획 4.3), 실사용 상한이 빠진 행은 실제로 쓰는 창이 크게 늘어난다. 그 전에 빠진 상한을 채웠다.

- `scripts/catalog.mjs`: `overrides.set`이 `contextTokens`(양의 정수)를 받게 했다. 적용 함수는 그대로다.
- 다른 `openai` 행의 272,000은 OpenClaw 상류 행의 값이다. 이 저장소의 규칙이 붙인 값이 아니다.
- 규칙은 모두 provider와 정확한 ID로 적었다. `*`는 `github-copilot`·`opencode`의 같은 모델(상류 922,000)까지, 접두사는 `-pro`·`:batch` 변형까지 덮기 때문이다.

| 묶음 | 행 | 이전 | 넣은 값 | 근거 |
| --- | --- | --- | --- | --- |
| a (2) | `openai/gpt-5.4`, `openai/gpt-6.1-terra` | 창 1,050,000, 상한 없음 | `contextTokens` 272000 | OpenAI 모델 페이지 `https://developers.openai.com/api/docs/models/<id>`: 272K 입력을 넘으면 장문 요금. 상류 형제 `openai` 행(`gpt-5.5`, `gpt-5.6-*`, `gpt-6-*`, `gpt-6.1-sol`, `gpt-6.2-*`)과 같은 값 |
| b (30) | `openrouter`·`kilocode`·`vercel-ai-gateway` 각 9(`openai/gpt-5.6-luna`, `-5.6-sol`, `-5.6-terra`, `-6-astra`, `-6-luna`, `-6-sol`, `-6.1-sol`, `-6.2-astra`, `-6.2-sol`), `novita` 2(`-6.2-astra`, `-6.2-sol`), `gmi` 1(`-5.6-sol`) | 창 1,050,000, 상한 없음 | `contextTokens` 272000 | 같은 OpenAI 모델 페이지. 직결 `openai` 행이 상류에서 272000을 가진 모델 |
| b′ (7) | `openai/gpt-5.4`(`kilocode`, `vercel-ai-gateway`, `openrouter`), `openai/gpt-6.1-terra`(`kilocode`, `novita`, `vercel-ai-gateway`, `openrouter`) | 창 1,050,000, 상한 없음 | `contextTokens` 272000 | 같은 OpenAI 모델 페이지. 직결 행은 묶음 a로 272000 |
| c (5) | `github-copilot`의 `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.5`, `gemini-2.5-pro`, `gemini-3.5-flash`(모두 deprecated) | 창 1,050,000 / 400,000 / 1,050,000 / 1,048,576 / 1,048,576, 상한은 `gpt-5.4-mini`·`gpt-5.5`만 272000, 최대 출력 128,000 또는 65,536 | `contextTokens` 128000, `maxTokens` 8192 | **공식 값 아님(승인된 예외).** Agent의 지금 값(clawpod-agent `extensions/github-copilot/models-defaults.ts`의 `DEFAULT_CONTEXT_WINDOW` 128000, `DEFAULT_MAX_TOKENS` 8192) |

OpenAI 모델 페이지 11개(`gpt-5.4`, `gpt-5.6-luna/sol/terra`, `gpt-6-astra/luna/sol`, `gpt-6.1-sol/terra`, `gpt-6.2-astra/sol`)는 2026-11-20에 원문을 받아 272K 문장과 1.05M 창을 확인했다.

## 판단과 한계

- 272,000은 OpenAI가 실사용 상한으로 공개한 값이 아니라 장문 요금의 경계다. 상류 OpenClaw가 같은 계열 행에 쓰는 값과 맞춘 것이다. 상류가 이 행들에 값을 주면 규칙이 그 값을 덮으므로, 그때 규칙을 지울지 본다.
- 묶음 c는 이 저장소의 "모든 수동 값에는 공식 근거" 원칙의 예외다. Copilot의 모델별 공식 한도를 찾지 못했고, 사용자가 Agent 값 유래 행을 예외로 승인했다. 근거 표기는 구독형 `"cost": null` 규칙의 선례를 따라 `source`에 이 문서 주소를, `note`에 "Not an official value"와 사유를 적었다. 공식 한도가 나오면 지운다(`MAINTAINING.md` 9장).
- `openrouter/auto`, `kilocode/openrouter/auto`(창 2,000,000, reasoning 켜짐)는 OpenRouter·Kilo 모델 API 값과 같아 고치지 않았다.
- `npm run audit` open은 작업 전후 모두 1이다(`openrouter/~deepseek/deepseek-pro-latest`의 cacheRead 0.2 > input 0.198, 상류 OpenRouter 값. 이 작업과 무관).

# 2026-11-20 채팅 API가 없는 행 제외 (`nonChatModels`)

ClawPoD Agent는 catalog의 활성 행을 모델 목록에 그대로 낸다. 채팅 API로 쓸 수 없는 실시간 음성 모델 행이 섞여 있어서, 고르면 요청이 실패할 모델이 목록에 나왔다. 이 행들을 catalog에서 뺐다.

- 자동 행을 빼는 수단이 없어서 수동 파일에 `nonChatModels`(provider·원래 ID 정확히, `reason`·`source` 필수)를 추가했다. `scripts/catalog.mjs`가 병합 직후 이 행들을 뺀다. 상태(`deprecated`)로 표시하지 않은 이유: 이 모델들은 종료·비권장이 아니라 처음부터 채팅용이 아니다.
- 원문 확인: OpenAI 모델 페이지는 HTML을 받아 Endpoints 절의 지원 표시(지원 아이콘 vs 회색 처리)를 읽었다. 같은 방법으로 `gpt-audio`는 Chat Completions 지원으로 읽혀 판별 방법을 교차 확인했다. Vercel은 모델 API `https://ai-gateway.vercel.sh/v1/models`의 `type`과 모델 페이지(`.md`)를, Google은 모델 페이지(`.md.txt`)를 받았다.

| 행 | 근거 |
| --- | --- |
| `openai/gpt-realtime-2.1` | https://developers.openai.com/api/docs/models/gpt-realtime-2.1 : 지원 엔드포인트는 Realtime(`v1/realtime`)뿐, Chat Completions·Responses 미지원 |
| `vercel-ai-gateway/openai/gpt-realtime-1.5`, `-2`, `-2.1`, `-mini` | Vercel 모델 API `type: "realtime"`(채팅 모델은 `language`), 모델 페이지 `https://vercel.com/ai-gateway/models/openai/<id>`: WebSocket 실시간 세션(`gateway.experimental_realtime`)으로만 사용. OpenAI 모델 페이지 `https://developers.openai.com/api/docs/models/<id>`: Realtime뿐, Chat Completions·Responses 미지원 |
| `vercel-ai-gateway/openai/gpt-live-1` | Vercel `type: "realtime"`, 모델 페이지와 https://vercel.com/docs/ai-gateway/modalities/realtime.md : GPT-Live는 별도 WebSocket 엔드포인트(`v1/live/sessions`). OpenAI 모델 페이지: Live 엔드포인트뿐, Chat Completions·Responses 미지원 |
| `vercel-ai-gateway/google/gemini-3.8-live`, `-live-extended-thinking` | Vercel `type: "realtime"`, 모델 페이지 예시는 `experimental_realtime`뿐, 실시간 문서가 "Other realtime models"로 나열. Google https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live (와 `-extended-thinking`): audio-to-audio Live API 모델, "Audio is the only supported response modality" |

뺀 행에만 걸리던 규칙 3개를 지웠다: `thinking` `*`/`gpt-realtime-2-1*`, `overrides` `vercel-ai-gateway`/`openai/gpt-live-1`(`cost: null`), `knownGaps` `vercel-ai-gateway`/`openai/gpt-live-1`(`model-data`).

## 판단과 한계

- 확인 범위: catalog 전체 ID를 실시간·음성·임베딩·이미지 등 키워드로 훑었다. `vercel-ai-gateway` 252행은 Vercel 모델 API `type`과 모두 대조했다(`language` 245, `realtime` 7 → 7행 모두 제외). `openai` 활성 행 31개는 OpenAI 모델 페이지의 엔드포인트를 모두 읽었다: `gpt-realtime-2.1` 말고는 모두 Chat Completions나 Responses를 지원한다.
- 빼지 않은 것: `openai/gpt-audio`·`gpt-audio-mini`(kilocode·openrouter, OpenAI 페이지에서 Chat Completions 지원), OpenRouter·Kilo의 이미지·음악 모델(OpenRouter 채팅 API로 제공), `mistral`의 `voxtral-small-*`(https://docs.mistral.ai/getting-started/models/models_overview/ : "audio input capabilities for instruct use cases"). `nvidia/nemotron-voicechat`은 이미 `deprecated`라 목록에 나오지 않아 조사하지 않았다.
- `openai/gpt-5.3-codex-spark`는 OpenAI 모델 페이지가 404라 엔드포인트를 확인하지 못했다. 근거가 없어 그대로 뒀다.
- Gemini 3.8 Live 두 행은 Google 문서가 "generateContent 미지원"을 직접 적지 않는다. Vercel의 분류(`realtime`)와 Google의 "응답은 오디오뿐" 문장을 근거로 삼았다.
- 상류가 같은 종류의 새 행을 넣으면 다시 나온다. 정기 점검 때 Vercel `type`이 `language`가 아닌 행과 OpenAI의 `gpt-realtime*`·`gpt-live*` 행을 확인한다.
- `npm run audit` open은 작업 전후 모두 1이다(`openrouter/~deepseek/deepseek-pro-latest`, 이 작업과 무관). 기존에 아무 행에도 걸리지 않던 `overrides` `kilocode`/`cohere/north-mini-code:free`(상류에서 행이 빠짐)는 이 작업 범위 밖이라 그대로 뒀다.

# 2026-11-20 Google API 행의 Effort 단계와 reasoning 꺼짐 행 점검

ClawPoD Agent가 모델별 Effort 단계를 catalog에서 읽기 전에(Agent 계획 5.1) 고칠 행을 정리했다. 바꾼 행은 5개이고 모두 `thinking` 규칙(provider·정확한 ID)이다.

| 행 | 이전 | 바꾼 값 | 근거 |
| --- | --- | --- | --- |
| `google/gemini-4-hydrogen`, `google/gemini-4-neon` (api `google-generative-ai`) | low, medium, high, xhigh (기본 high) | low, medium, high (기본 high) | **공식 값 아님(승인된 예외).** Google 공식 문서상 두 모델은 `xhigh`를 받는다(https://ai.google.dev/gemini-api/docs/thinking : "Both models default to `high` and support `xhigh`"). 그러나 Agent가 쓰는 Pi 1.5.2 Google 어댑터(`@earendil-works/pi-ai` `dist/api/google-shared.js:19-31`의 `resolveGoogleThinkingLevel`)는 minimal·low·medium·high만 받고 그 밖에서 예외를 던져 요청이 실패한다 |
| `google-vertex/gemini-4-hydrogen` (api `google-vertex`) | 같음 | 같음 | 같은 예외. 공식 문서 https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/4-hydrogen : "Hydrogen supports thinking levels LOW, MEDIUM, HIGH (default), and XHIGH". Vertex 경로도 같은 Pi 함수를 쓴다(`dist/api/google-vertex.js:250`) |
| `google/gemma-4-31b-it`, `google/gemma-4-26b-a4b-it` | off, low (기본 off, `{"low":"on"}`) | minimal, high (기본 minimal, 표시 이름 없음) | https://gemma.ai/deployment/gemini-api/ (`ai.google.dev/gemma/docs/core/gemma_on_gemini_api`가 리다이렉트): "you can control it using the API by setting the thinking level to "high" for enabled or "minimal" for disabled". 기본 minimal은 모델 카드(https://ai.google.dev/gemma/docs/core/model_card_4, 생각은 켜야만 켜짐)를 따랐다 |

- Google API(`google-generative-ai`·`google-vertex`) 행은 37개(`google` 21, `google-vertex` 15, `opencode` 1)다. 단계 목록에 `xhigh`·`max`가 있는 행은 위 3개뿐이고 `max`는 0이다(`opencode/gemini-3.6-flash`는 `xhigh`가 없다).
- 다른 gateway(`openrouter`, `kilocode`, `vercel-ai-gateway`, `venice` 등)의 Gemini 4 Hydrogen·Neon은 Pi Google 어댑터를 지나지 않으므로 공식대로 `xhigh`를 유지한다. 다른 provider의 Gemma 4 행도 그대로다(`*` 규칙 `gemma-4-*`).
- 규칙은 provider 지정이라 첫 `*` 규칙 앞에 넣었다. Gemma 4에 표시 이름 `{"low":"on"}`을 붙이지 않은 이유: 켜기/끄기 관례는 `low`를 켬으로 쓰는데, 이 모델의 Gemini API 값은 `minimal`(끔)·`high`(켬)이다. 선례: `gemini-3-1-flash-lite-image*`의 `["minimal","high"]`.

## reasoning 꺼짐 행 점검 (바꾼 행 0)

Agent에서 지금 단계를 고르면 effort가 요청에 실리는데 catalog가 reasoning을 꺼짐으로 적은 행 198개(kilocode 80, openrouter 117, ollama-cloud 1)를 공식 출처와 대조했다. 공식 근거로 reasoning을 지원하는 행이 없어 고친 행은 없다.

| 묶음 | 행 수 | 판단 | 근거 |
| --- | --- | --- | --- |
| openrouter | 117 | reasoning 미지원(그대로) | OpenRouter 모델 API https://openrouter.ai/api/v1/models (2026-11-20 받음): 117행 모두 `supported_parameters`에 `reasoning`·`include_reasoning`이 없다 |
| kilocode | 80 | reasoning 미지원(그대로) | Kilo 모델 API https://api.kilo.ai/api/openrouter/models (2026-11-20 받음): 80행 모두 `supported_parameters`에 `reasoning`·`include_reasoning`이 없다 |
| ollama-cloud `mistral-large-3:675b` | 1 | reasoning 미지원(그대로) | https://ollama.com/library/mistral-large-3 : 기능 목록에 thinking이 없다(Vision, Multilingual, System Prompt, Agentic 등). 이 페이지와 Ollama API는 이 모델이 2026-11-09에 종료(retired)됐다고 적는다 |

## 판단과 한계

- Google 3행은 이 저장소의 "모든 수동 값에는 공식 근거" 원칙의 예외다(사용자가 승인한 Agent 유래 예외). 근거 표기는 2026-11-20 Copilot 한도 예외를 따라 `source`에 이 문서 주소를, `note`에 공식 문서 URL·Pi 어댑터 위치·"Approved exception"을 적었다. **Agent가 Pi를 올려 Google 어댑터가 `xhigh`를 받게 되면 이 세 규칙을 지워 `xhigh`를 다시 넣는다**(`MAINTAINING.md` 9장).
- Gemma 4: `thinkingConfig`를 보내지 않을 때의 기본 동작은 Gemini API 페이지에 없다. 기본 minimal은 모델 카드(생각은 켜야만 켜짐)에 따른 것이다.
- 애매한 행(설명과 파라미터가 다름, 고치지 않음): `kilocode/mistralai/mistral-small`(Kilo 설명은 "currently runs Mistral Small 4 … reasoning"이지만 `supported_parameters`에 reasoning 없음), `openrouter/openai/gpt-5.2-chat`(설명은 "adaptive reasoning"이지만 reasoning 파라미터 없음, 조절 불가). gateway API가 reasoning 파라미터를 받는다고 표시하면 다시 본다.
- `ollama-cloud/mistral-large-3:675b`가 종료됐다는 사실은 이 작업 범위(reasoning) 밖이라 상태를 바꾸지 않았다. 다음 정기 점검 때 처리한다.
- `npm run audit` open은 작업 전후 모두 1이다(`openrouter/~deepseek/deepseek-pro-latest`, 이 작업과 무관).
