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

# 2026-11-21 `codex` 행 신설, `openai` Pi 전용 행, `openai-codex/gpt-5.6`

ClawPoD Agent가 `openai`·`openai-codex`·`codex` 플러그인이 코드로 지어 넣던 모델 값을 지우기 전에(Agent 3차 묶음 B), 그 값이 catalog에 있게 했다. 추가 32행, 기존 행 변화 0.

| 묶음 | 행 | 값 | 근거 |
| --- | --- | --- | --- |
| `codex` 신설 (21) | `openai-codex` 수동 21행과 같은 ID: `gpt-5.1`, `gpt-5.1-codex-max`, `gpt-5.1-codex-mini`, `gpt-5.2`, `gpt-5.2-codex`, `gpt-5.3-codex`, `gpt-5.3-codex-spark`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.5`, `gpt-5.5-mini`, `gpt-5.6-luna`/`-sol`/`-terra`, `gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`, `gpt-6.1-sol`, `gpt-6.1-terra`, `gpt-6.2-astra`, `gpt-6.2-sol` | 같은 ID의 `openai-codex` 행과 이름·창·출력·입력·reasoning·상태·대체 모델이 같음. 가격은 비움(구독형) | Codex 하네스(Agent `extensions/codex/provider.ts`)는 `openai-codex`와 같은 ChatGPT Codex 백엔드(`https://chatgpt.com/backend-api`)를 쓴다. 모델 근거는 `openai-codex`와 같다: https://learn.chatgpt.com/docs/models |
| `openai` 보완 (10) | `chat-latest`, `gpt-4`, `gpt-4-turbo`, `gpt-4.1-nano`, `gpt-4o-2024-05-13`, `gpt-5-chat-latest`, `o1`, `o1-pro`, `o3-mini`, `o4-mini` | 이름·창·출력·입력·reasoning·가격은 Pi 1.5.2 그대로 | **Pi 판과 파일 해시(승인된 예외):** `@earendil-works/pi-ai@1.5.2` `dist/providers/data/openai.json`(sha256 `df2fe1f312051bbe29801ef903ab370c701a74a680f1370e96eb465eacd1d82d`)의 `openai-responses` 행. 상류 `openai` 블록(36행)에 없는 Pi 행이 정확히 이 10개와 `gpt-5.6-cyber`다 |
| 위 `openai` 행의 상태 (9) | `gpt-4`, `gpt-4-turbo`, `gpt-4o-2024-05-13`, `o1`, `o1-pro`, `o3-mini` → `disabled`, 대체 `gpt-5.6-sol`. `gpt-4.1-nano` → 대체 `gpt-5.6-luna`. `o4-mini` → 대체 `gpt-5.6-terra`. 모두 2026-10-23 종료. `gpt-5-chat-latest` → `disabled`, 대체 `gpt-5.6-sol`, 2026-07-23 종료 | | https://developers.openai.com/api/docs/deprecations (`.md` 원문, 공지 2026-04-22). `o1-pro`의 문서상 대체는 `gpt-5.6-sol` (`reasoning.mode: pro`)이다. 대체 모델 셋은 상류 `openai`의 활성 행이다 |
| `openai-codex/gpt-5.6` (1) | `gpt-5.6-sol` 행과 같은 값·상태(`deprecated`), 이름 `gpt-5.6` | | Agent 별칭 행(`extensions/openai/openai-codex-provider.ts`가 `gpt-5.6`을 `gpt-5.6-sol`로 받음). OpenAI API 문서: "The `gpt-5.6` alias routes requests to GPT-5.6 Sol"(https://developers.openai.com/api/docs/models/gpt-5.6). Codex 백엔드가 `gpt-5.6`을 그대로 받는지는 공식 근거가 없어 Agent RND에서 확인한다 |

스크립트·테스트:
- `scripts/audit-catalog.mjs`: 구독형 목록에 `codex`를 넣었다. `openai-codex`와 같은 구독 백엔드라 토큰 단가가 없다.
- `tests/catalog.test.mjs`: 보완 provider 목록에 `codex`·`openai`를 넣었다. 게시된 catalog에서 `codex`의 모든 행이 같은 ID의 `openai-codex` 행과 같은지 확인한다. `codex` ID 목록이 `openai-codex` ID 목록에서 `gpt-5.6`만 뺀 것과 같은지도 확인한다. 기존 비채팅 행 테스트는 fixture `openai`에 새 보완 행이 붙으므로, 보완 행을 뺀 ID로 비교하게 고쳤다.

## 넣지 않은 행

| 행 | 이유 |
| --- | --- |
| `openai/gpt-5.6-cyber` | **승인제**(3장). https://developers.openai.com/api/docs/models/gpt-5.6-cyber : "help approved defenders …", "available to all Daybreak Red customers. To use it through the API, enable Daybreak Red for the project". https://openai.com/daybreak/ : "we verify applicants and review how they plan to use OpenAI's models before approving access". 일반 공개되면 추가한다(`MAINTAINING.md` 9장 보류 행). 공식 값은 창 400,000·최대 입력 272,000·출력 128,000·text·image·$12.5/$75/cacheRead $1.25이다. Pi의 `cacheWrite` 15.625는 공식 페이지에 없다 |
| `openai/gpt-5.5-mini`, `openai/gpt-5.5-nano` | https://developers.openai.com/api/docs/models/gpt-5.5-mini 는 404(2026-11-21)이고, 모델 목록과 폐기 문서에도 없다. 값은 Agent 플러그인이 지은 것이라 넣지 않는다(모르면 비운다) |

## 판단과 한계

- `chat-latest`의 상태는 폐기 문서와 모델 목록에 없어 비웠다. 폐기 문서에는 `gpt-5.x-chat-latest`만 있다. 이 행의 Effort 빈칸은 기존 라우터 별칭 규칙(`-latest`, `scripts/thinking.mjs` `isRouterAlias`)으로 이미 known이고 Effort도 채우지 않는다. 그래서 `knownGaps`를 따로 넣지 않았다.
- 새 `openai` 행의 Effort는 기존 `*` 규칙에서 나온다: `o1`·`o3-mini`·`o4-mini`는 low~high(기본 medium), `o1-pro`는 low~high(기본 없음). 모두 종료된 행이다.
- `codex` 행의 Effort는 `openai-codex`와 같다. 규칙이 `provider: "*"`이고 정규화 ID로 비교하기 때문이며, 테스트로 고정했다. Codex 하네스는 `max`를 app-server의 `high`로 보낸다(Agent 쪽 사항, catalog는 공식 단계를 그대로 둔다).
- 재생성 원본은 publish run 44792525826의 artifact다. main `4078af0`과 같은 `sourceGeneratedAt` 1795199248061이다. `git diff models/v1/catalog.json`에서 추가 32행과 최상위 `generatedAt`·`supplementDigest` 말고는 바뀐 것이 없다.
- `npm run audit` open은 작업 전후 모두 0이다. thinking 누락은 65에서 66이 됐다(`openai/chat-latest`, 라우터 별칭이라 known). 구독형 cost 누락은 111에서 118이 됐다(`codex` 현역 7행, known).

# 2026-11-21 `anthropic` Sonnet 4.5 Pi 전용 행

ClawPoD Agent가 `anthropic`·`anthropic-vertex`·`amazon-bedrock-mantle` 플러그인이 코드로 지어 넣던 모델 값을 지우기 전에(Agent 3차 묶음 C), Agent가 Pi에서만 받던 Sonnet 4.5 두 ID의 값이 catalog에 있게 했다. 추가 2행, 기존 행 변화 0.

| 행 | 값 | 근거 |
| --- | --- | --- |
| `anthropic/claude-sonnet-4-5` (이름 `Claude Sonnet 4.5 (latest)`), `anthropic/claude-sonnet-4-5-20250929` (이름 `Claude Sonnet 4.5`) | 창 200,000·출력 64,000, text·image, reasoning true, $3/$15/cacheRead $0.3/cacheWrite $3.75 | **Pi 판과 파일 해시(승인된 예외):** `@earendil-works/pi-ai@1.5.2` `dist/providers/data/anthropic.json`(sha256 `ebd207ed51603e2060b870bef72c86e9de02d3a14f78bd9813f2de0db27dbdef`)의 `chat:claude-sonnet-4-5`·`chat:claude-sonnet-4-5-20250929`. 공식 값과 같다: https://platform.claude.com/docs/en/about-claude/models/overview.md "Claude Sonnet 4.5 · 200K tokens · 64K tokens · $3 / MTok · $15 / MTok", https://platform.claude.com/docs/en/about-claude/pricing.md "Claude Sonnet 4.5 · $3 / MTok · $3.75 / MTok · $6 / MTok · $0.30 / MTok · $15 / MTok"(5분 캐시 쓰기 $3.75) |
| 위 2행의 상태 | `deprecated`, 대체 `claude-sonnet-5-5`. `corrections` 2줄로 2026-11-30(`effectiveAt` 1795996800000 = `Date.UTC(2026,10,30)`)에 `disabled` | https://platform.claude.com/docs/en/about-claude/model-deprecations.md : "claude-sonnet-4-5-20250929 · Deprecated · September 30, 2026 · November 30, 2026", 대체 `claude-sonnet-5-5`, "This retirement includes `claude-sonnet-4-5`, the same model's ID without a date". `claude-sonnet-5-5`는 상류 `anthropic`의 활성 행이다 |

- Effort는 기존 `thinking` 규칙 `claude-sonnet-4-5*`(off~high, 기본 off)에서 나온다. 새 규칙은 없다. 공식 thinking 문서의 Sonnet 4.5 "No `thinking` field → Thinking off"와 맞는다(https://platform.claude.com/docs/en/build-with-claude/thinking.md).
- 상류에 같은 ID가 생기면 상류 행이 이긴다(1장). 그때 이 2행은 지워도 된다.
- 테스트: 보완 provider 목록에 `anthropic`을 넣었다. 게시 catalog에서 두 행이 2026-11-30 직전까지 `deprecated`(대체 `claude-sonnet-5-5`), 그 시각부터 `disabled`인지 확인한다.

## 넣지 않은 ID

| ID | 이유 |
| --- | --- |
| `anthropic/claude-opus-4.6`, `-4.7`, `-4.8`, `anthropic/claude-sonnet-4.6`, `anthropic/claude-fable-5.1`, `anthropic/claude-mythos-5.1` (점 철자) | 공식 ID가 아니다. 모델 표와 폐기 표의 ID는 모두 하이픈이다(https://platform.claude.com/docs/en/about-claude/models/overview.md, https://platform.claude.com/docs/en/about-claude/model-deprecations.md, 2026-11-21 받은 원문에서 점 철자 0건). "Starting with the Claude 4.6 generation, model IDs use a dateless format: `claude-{name}-{major}[-{minor}]`"(https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions). Agent 플러그인이 이름으로 지어 세우던 값이다 |
| `anthropic/claude-mythos-5-1` | **승인제**(3장). "limited availability", "Available only to organizations verified through Anthropic's verification programs"(https://platform.claude.com/docs/en/about-claude/pricing.md, models/overview.md). 일반 공개되면 추가한다(`MAINTAINING.md` 9장 보류 행). 이미 있는 `anthropic/claude-mythos-5`(자동)와 `anthropic-vertex/claude-mythos-5`·`-5-1`(수동)은 "이미 들어 있는 승인제 행은 유지" 대로 둔다 |
| `amazon-bedrock-mantle/anthropic.claude-haiku-5-5` | AWS 모델 카드의 "Availability using the bedrock-mantle endpoint"가 `us-gov-west-1 (GovCloud West)` 하나다(https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-5-5.html, 2026-11-21). `provenance.amazon-bedrock-mantle.notes`의 기존 판단과 같다 |

## 판단과 한계

- 두 행의 값은 이 저장소의 "모든 수동 값은 공식 근거" 원칙에서 Pi 판·파일 해시를 근거로 쓰는 승인된 예외다(2026-11-21 `openai` 행과 같은 방식). 다만 이 2행은 이름을 뺀 값 전부가 공식 문서와도 같다.
- 2026-11-30 이후에는 Anthropic API가 두 ID를 거절한다. 이 PR이 그 뒤에 머지됐다면 `corrections` 대신 행에 바로 `disabled`를 적어야 한다(이번에는 11-21 머지라 `corrections`).
- 기록만 하고 고치지 않은 것: 상류 자동 행 `anthropic/claude-opus-4-8`이 `deprecated`(대체 `claude-opus-5`)로 게시되지만 공식 상태는 "claude-opus-4-8 · Active · N/A · Not sooner than May 28, 2027"이다(https://platform.claude.com/docs/en/about-claude/model-deprecations.md). 자동 행의 상태를 현역으로 되돌리는 칸이 없다(`overrides`의 `status`는 `deprecated`·`disabled`만). 상류가 고치면 해소된다.
- 재생성 원본은 publish run 44845405061의 artifact다(main `e2ba344`과 같은 `sourceGeneratedAt` 1795221799148). `git diff models/v1/catalog.json`에서 추가 2행과 최상위 `generatedAt`·`supplementDigest` 말고는 바뀐 것이 없다.
- `npm run audit` open은 작업 전후 모두 0이다. 두 행은 퇴역 상태라 Effort·가격 검사 대상이 아니다.

# 2026-11-21 `xai` 공식 별칭 `grok-4.20`, 은퇴 ID `grok-4-0709`

ClawPoD Agent가 `xai` 플러그인의 값 표와 이름 추정을 지우기 전에(Agent 3차 묶음 D), 그 표가 세우던 ID 가운데 공식 근거가 있는 두 ID의 값이 catalog에 있게 했다. 추가 2행, 기존 행 변화 0.

| 행 | 값 | 근거 |
| --- | --- | --- |
| `xai/grok-4.20` (이름 `Grok 4.20`, 현역) | 창 1,000,000·출력 30,000, text·image, reasoning true, $1.25/$2.5/cacheRead $0.2/cacheWrite 0 | https://docs.x.ai/developers/models/grok-4.20 : "Model name grok-4.20-0309-reasoning", "Aliases grok-4.20-reasoning-latest grok-4.20 …", "Modalities Text, Image → Text", "Context window 1,000,000", "Reasoning The model can think before responding", "Input Tokens $1.25 / 1M tokens · Cached tokens $0.20 / 1M tokens · Output Tokens $2.50 / 1M tokens". 같은 모델의 게시 행 `xai/grok-4.20-0309-reasoning`과 같은 값이다 |
| `xai/grok-4-0709` (이름 `Grok 4 0709`) | 창 1,000,000·출력 64,000, text·image, reasoning true, $1.25/$2.5/cacheRead $0.2/cacheWrite 0. `deprecated`, 대체 `grok-4.3` | https://docs.x.ai/developers/migration/may-15-retirement : 표 "grok-4-0709 · grok-4.3 with low reasoning effort", "The slugs themselves continue to resolve", "you will be billed at grok-4.3 pricing of $1.25 per 1M input tokens and $2.50 per 1M output tokens". 창·입력·cacheRead: https://docs.x.ai/developers/models/grok-4.3 ("Context window 1,000,000", "Text, Image → Text", "Cached tokens $0.20"). 공식상 `grok-4.3`으로 돌므로 값은 게시 행 `xai/grok-4.3`과 같게 했다(2026-09-08 은퇴 별칭 3행과 같은 방식) |
| `thinking` 규칙 `xai`/`grok-4-0709` | `["low"]`, 기본 `low`, `labels: {low: "on"}` | 같은 은퇴 안내: 이 ID의 요청은 `grok-4.3` + reasoning effort `low`로 처리된다. 은퇴 ID에서 effort를 바꿀 수 있다는 문서는 없다. provider 지정 규칙이라 첫 `*` 규칙 앞에 넣었다 |

- `grok-4.20`의 Effort는 새 규칙 없이 기존 `*` 규칙 `grok-4-20`(항상 켬, `low` 하나)에서 나온다. 이 규칙은 원래 이 별칭을 위해 쓴 것이다(note "xAI alias grok-4.20 -> grok-4.20-0309-reasoning"). 추론 안내 https://docs.x.ai/developers/model-capabilities/text/reasoning : "`grok-4.7`, `grok-4.6`, and `grok-4.5` support the `reasoning_effort` parameter".
- 상류에 같은 ID가 생기면 상류 행이 이긴다(1장).
- 테스트: 게시 catalog에서 두 행의 값·상태·대체와 Effort(`low` 켬)를 확인한다.

## 넣지 않은 ID

| ID | 이유 |
| --- | --- |
| `xai/grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`, `grok-4-fast`, `grok-4`, `grok-4-1`, `grok-4-1-fast` | 공식 ID가 아니다. 모델 표(https://docs.x.ai/developers/models)에 없고, 은퇴 안내의 ID 목록에도 없다(은퇴 안내에는 `grok-4-fast-reasoning`·`-non-reasoning`, `grok-4-1-fast-reasoning`·`-non-reasoning`만 있다). Agent 플러그인이 이름으로 지어 세우던 값이다. 앞 넷은 2026-09-08에도 "미확인 구형 ID"로 뺐다 |
| `grok-4.20-0309-reasoning`의 다른 공식 별칭 14개(`grok-4.20-reasoning-latest`, `grok-4.20-reasoning`, `grok-4.20-0309`, `grok-4.20-beta-0309-reasoning`, `grok-4.20-beta`, `grok-4.20-beta-0309`, `grok-4.20-beta-latest`, `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-reasoning`, `grok-4.20-experimental-beta-0304-reasoning`, `grok-4.20-experimental-beta-0304`, `grok-4.20-experimental-beta-reasoning-latest`, `grok-4.20-experimental-beta-latest`, `grok-4.20-reasoning-gv2`) | 공식 별칭이지만(위 모델 페이지 "Aliases") Agent·ClawPoD Cloud·RND 어디에서도 쓰지 않는다. 필요해지면 `grok-4.20`과 같은 값으로 넣는다 |

## 기록만 하고 고치지 않은 것 (catalog와 공식 문서의 차이)

| 행 | 게시 catalog | 공식 문서(2026-11-21) |
| --- | --- | --- |
| `xai/grok-build-0.1` | 창 256,000(상류 자동 행). Effort `["low"]`(켬), 기본 `low`: 이 저장소의 `*` 규칙 `grok-build*`, note "no reasoning efforts listed" | 모델 페이지 https://docs.x.ai/developers/models/grok-build-0.1 : "Context window 500,000", "Reasoning efforts Supported low, medium, high, xhigh · Default high". 모델 표 https://docs.x.ai/developers/models 의 `maxPromptLength`도 500000. 추론 안내의 `reasoning_effort` 지원 문장과 요약 표에는 이 모델이 없다 |
| `xai/grok-4.5` | Effort `low, medium, high`, 기본 `high` | 모델 페이지 https://docs.x.ai/developers/models/grok-4.5 : "Reasoning efforts Supported low, medium, high, xhigh · Default high". 추론 안내 https://docs.x.ai/developers/model-capabilities/text/reasoning : "`xhigh` is available on grok-4.6 and later. On models that do not support it, such as `grok-4.5`, requests with `"xhigh"` are treated as `"high"`", 요약 표도 low/medium/high. 두 공식 문서가 서로 다르다 |

## 판단과 한계

- 최대 출력은 xAI 공식 값이 없다(모델 페이지와 모델 표에 최대 입력 `maxPromptLength`만 있다). 두 행 모두 **공식 값 아님**이다. `grok-4.20`의 30,000은 같은 모델의 게시 행 `xai/grok-4.20-0309-reasoning`(상류 자동 행, 30,000)을 따랐다. 같은 모델이 두 ID에서 다른 값을 보이지 않게 하기 위해서다. `grok-4-0709`의 64,000은 전환 대상의 게시 행 `xai/grok-4.3`(상류 자동 행, 64,000)을 따랐다.
- `grok-4-0709`는 2026-09-08 은퇴 별칭 3행(`grok-3` 등, Agent 운영 값 출력 10,000)과 달리 64,000을 쓴다. 이 ID는 reasoning 모델로 돌고, Agent가 지금 이 ID 요청에 싣는 출력 상한도 64,000이라 10,000이면 상한이 줄어든다.
- 상태는 `disabled`가 아니라 `deprecated`다. xAI가 은퇴를 공지했지만 "The slugs themselves continue to resolve"라 요청은 계속 처리된다. 2026-09-08 은퇴 별칭 3행과 같은 판단이다.
- 장문(200K 초과) 요금은 넣지 않았다. 기존 `xai` 수동 행과 같이 기본 요금만 적는다(`sources/README.md` 비용 절).
- 재생성 원본은 publish run 44855317119의 artifact다(main `8a1a258`과 같은 `sourceGeneratedAt` 1795227774303). 행 단위 비교에서 추가 2행과 최상위 `generatedAt`·`supplementDigest` 말고는 바뀐 것이 없다.
- `npm run audit` open은 작업 전후 모두 0이다(cost 118, reasoning 2, thinking 66, zero price 15, 모두 known, 숫자 같음). `grok-4-0709`는 퇴역 행이라 `replacedBy` 검사만 받고, `grok-4.20`은 현역 필수 칸이 모두 있다.

# 2026-11-21 Google custom tools·Robotics ER 2 행, `google-gemini-cli` 신설

ClawPoD Agent가 `google` 플러그인의 값 표·이름 추정·정적 목록을 지우기 전에(Agent 3차 묶음 E), 그 코드와 Pi가 세우던 ID 가운데 공식 근거가 있는 ID의 값이 catalog에 있게 했다. 추가 10행(`google` 2, `google-vertex` 1, `google-gemini-cli` 7), 기존 행 변화 0.

| 행 | 값 | 근거 |
| --- | --- | --- |
| `google/gemini-3.1-pro-preview-customtools` (이름 `Gemini 3.1 Pro Preview Custom Tools`) | 창 1,048,576·출력 65,536, text·image, reasoning true, $2/$12/cacheRead $0.2 | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview : Versions "Preview: `gemini-3.1-pro-preview-customtools`", "For those building with a mix of bash and custom tools, Gemini 3.1 Pro Preview comes with a separate endpoint available via the API called `gemini-3.1-pro-preview-customtools`", "Input token limit 1,048,576", "Output token limit 65,536". https://ai.google.dev/gemini-api/docs/pricing : Gemini 3.1 Pro 절 머리에 두 ID, "$2.00, prompts <= 200k tokens", "$12.00", 캐시 "$0.20". 값은 같은 provider의 수동 행 `gemini-3.1-pro-preview`와 같다 |
| `google/gemini-robotics-er-2-preview` (이름 `Gemini Robotics-ER 2 Preview`) | 창 131,072·출력 65,536, text·image, reasoning true, $1/$5/cacheRead $0.1 | https://ai.google.dev/gemini-api/docs/models/gemini-robotics-er-2-preview : "Model code `gemini-robotics-er-2-preview`", "Inputs Text, images, video, audio · Output Text", "Input token limit 131,072", "Output token limit 65,536", "Thinking Supported". 가격 페이지 Standard 탭: "$1.00 (text / image / video / audio) through December 31, 2026. $2.00 … starting January 1, 2027", 출력 "$5.00 through December 31, 2026. $10.00 starting January 1, 2027", 캐시 "$0.10 … $0.20 starting January 1, 2027" |
| 위 행의 가격 날짜 보정 | `corrections` 1줄: 2027-01-01(`effectiveAt` 1798761600000 = `Date.UTC(2027,0,1)`)부터 $2/$10/cacheRead $0.2 | 같은 가격 페이지. 기존 Gemini 3.6·3.7·3.8 Flash 보정과 같은 날이다 |
| `thinking` 규칙 `*`/`gemini-robotics-er-2-preview` | `minimal, low, medium, high`, 기본 `high` | https://ai.google.dev/gemini-api/docs/thinking 표: "gemini-robotics-er-2-preview \| On (high) \| minimal, low, medium, high". `xhigh`·`max` 없음. 배열 끝에 넣었고 게시 catalog에서 이 행 하나에만 걸린다 |
| `google-vertex/gemini-3.1-pro-preview-customtools` | 창 1,048,576·출력 65,536, text·image, reasoning true, $2/$12/cacheRead $0.2 | https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-1-pro : "Gemini 3.1 Pro supports an additional endpoint: gemini-3.1-pro-preview-customtools", "Pricing for gemini-3.1-pro-preview-customtools is identical to Gemini 3.1 Pro", Versions "gemini-3.1-pro-preview-customtools* · Launch stage: Public preview". 이 페이지는 변형의 한도를 따로 적지 않는다. 같은 페이지 표의 Gemini 3.1 Pro 값(Context window 1,048,576, Maximum output tokens 65,536)을 따랐다. 값은 기존 수동 행 `google-vertex/gemini-3.1-pro-preview`(Global)와 같다 |
| `google-gemini-cli` 신설 (7): `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, `gemini-3-flash-preview`, `gemini-3.1-flash-lite`, `gemini-3.1-pro-preview`, `gemini-3.1-pro-preview-customtools` | 같은 ID의 `google` 수동 행과 이름·입력·reasoning·창·출력이 같다. 가격은 비움(구독형). `api: "google-generative-ai"` | 모두 Gemini API 공식 ID(https://ai.google.dev/gemini-api/docs/models , 폐기 표 https://ai.google.dev/gemini-api/docs/deprecations). Agent의 Gemini CLI provider(`extensions/google/gemini-cli-provider.ts`)는 Google OAuth 로그인만 쓴다. 그 사용은 하루 요청 수 한도이고 토큰 단가가 없다: https://developers.google.com/gemini-code-assist/resources/quotas "These daily request limits are aggregated across all interactions with any model version or family (for example, Pro, Flash) used with the Gemini CLI or agent mode", Gemini CLI 문서 https://geminicli.com/docs/resources/quota-and-pricing/ "Google account … Maximum requests per user per day". 모델 선택 문서 https://geminicli.com/docs/cli/model/ : "Auto (Gemini 3) … gemini-3-pro-preview, gemini-3-flash-preview", "Auto (Gemini 2.5) … gemini-2.5-pro, gemini-2.5-flash", "Manual · Any available model". `gemini-3-flash-preview`는 Agent CLI 백엔드의 `flash` 별칭이 가리키는 ID다 |

스크립트·테스트:
- `scripts/audit-catalog.mjs`: 구독형 목록에 `google-gemini-cli`를 넣었다(가격 빈칸은 known).
- `tests/catalog.test.mjs`: 보완 provider 목록에 `google-gemini-cli`를 넣었다. 게시 catalog에서 새 10행의 값·Effort, Robotics 가격의 2027-01-01 전환, `google-gemini-cli`의 ID 목록과 가격 없음, 새 행에 `xhigh`·`max`가 없는지 확인한다. **수동 파일**에서 `google-gemini-cli` 행마다 같은 ID의 `google` 수동 행과 가격 말고 같은지 확인한다. 게시본으로 비교하지 않는 이유: `google`은 자동+수동 provider라 상류 자동 행이 같은 ID 값을 바꾸면 6시간 게시의 `npm test`가 막힌다.

## 넣지 않은 ID

| ID | 이유 |
| --- | --- |
| `google/deep-research-preview-04-2026`, `google/deep-research-max-preview-04-2026` | https://ai.google.dev/gemini-api/docs/deep-research : "The Deep Research agent is exclusively available using the Interactions API. You cannot access it through `generate_content`." 채팅 API 모델이 아니다(3장) |
| `google/gemini-2.5-computer-use-preview-10-2025` | 폐기 표: 2025-10-07 출시, **2026-07-28 종료**, 권장 대체 `gemini-3.8-flash`(자동 전환 문구 없음) |
| `google/gemini-3.1-flash-image-preview`, `google-gemini-cli/gemini-3.1-flash-image-preview` | 폐기 표: 2026-06-25 종료. 이미지 생성 모델(3장 범위 밖) |
| `google/gemini-3.7-flash-001`, `google-gemini-cli/gemini-3.1-flash`, `google-gemini-cli/gemini-3.1-flash-preview`, `google-gemini-cli/gemini-3.1-pro` | 공식 ID가 아니다(모델 목록·폐기 표에 없음). `gemini-3.1-flash-preview`는 이미 `knownGaps`에 "no official documentation"으로 있는 ID다 |
| `google-gemini-cli/gemma-4-26b-a4b-it`, `google-gemini-cli/gemma-4-31b-it` | Gemini API에는 있지만 Gemini CLI(Code Assist)가 Gemma를 준다는 공식 근거가 없다(할당량 문서는 "Pro, Flash", CLI 모델 문서는 Gemini 3·2.5만) |
| `google/gemini-robotics-er-2-streaming-preview` | 이번 후보 밖. Robotics ER 2 모델 페이지의 두 번째 탭에 있다(같은 한도, 별도 가격 절). Agent에서 쓰는 곳이 없어 넣지 않았다. 필요해지면 같은 방식으로 넣는다 |

## 기록만 하고 고치지 않은 것 (catalog와 공식 문서의 차이)

| 행 | 게시 catalog | 공식 문서(2026-11-21) |
| --- | --- | --- |
| `google/gemini-3.1-flash-preview`, `google-vertex/gemini-3.1-flash-preview` | 현역 행(가격 있음, Effort `knownGaps`) | 공식 ID가 아니다. Agent는 이 ID를 `gemini-3-flash-preview`로 바꿔 찾으므로 목록에만 나오고 해석에는 쓰이지 않는다 |
| `google/gemini-2.5-pro`, `google/gemini-2.5-flash` | 현역 | 폐기 표: AI Studio에서 빠졌고 2026-12-01부터 요청이 각각 `gemini-3.8-flash`·`gemini-3.5-flash-lite`로 자동 전환된다. `MAINTAINING.md` 9장에 이미 재확인 행이 있다. `google-gemini-cli`의 같은 두 행도 그때 함께 본다 |
| `google/gemini-3.5-flash`, `google/gemini-3.7-flash` | 현역 | 폐기 표: AI Studio에서 빠졌고 요청은 `gemini-3.6-flash`·`gemini-3.8-flash`로 자동 전환, "the endpoint is not shutting down" |

## 판단과 한계

- 수동 행은 입력에 `text`·`image`만 쓸 수 있어 Robotics ER 2의 video·audio 입력은 넣지 못했다(5장).
- 장문(200K 초과) 요금은 넣지 않았다. 기존 `google` 수동 행과 같이 기본 요금만 적는다.
- customtools 세 행의 Effort는 새 규칙 없이 기존 `*` 규칙 `gemini-3-1-pro-preview*`(low~high, 기본 high, note "Covers -customtools variant")에서 나온다. `google-gemini-cli`의 나머지 6행도 `google` 행과 같은 `*` 규칙이 걸려 같은 단계·기본을 받는다.
- `google-gemini-cli`의 가격을 비운 것은 Agent가 이 provider를 Google OAuth 로그인으로만 쓰기 때문이다. Gemini CLI를 Gemini API 키로 쓰면 토큰 단가가 생기지만(Gemini CLI 할당량 문서 "when using an API key, you pay per token/call") 그 경우는 Agent의 `google` provider다.
- Gemini CLI가 각 ID를 실제로 받는지 ID별 공식 목록은 없다(모델 문서는 Auto 묶음과 "Any available model"). Gemini CLI 모델 문서의 Auto (Gemini 3) 묶음에는 Gemini API에서 2026-03-09 종료된 `gemini-3-pro-preview`가 아직 적혀 있다.
- 상류에 같은 ID가 생기면 상류 행이 이긴다(1장). `google-gemini-cli` 행은 `google` 수동 행을 고칠 때 같이 고친다(4장).
- 재생성 원본은 publish run 44875777834의 artifact다(main `d9a5f04`와 같은 `sourceGeneratedAt` 1795242717351). 상류 `google`(20행)에 새 ID는 없다. 행 단위 비교에서 추가 10행, 새 provider `google-gemini-cli`(`api: google-generative-ai`), 최상위 `generatedAt`·`supplementDigest` 말고는 바뀐 것이 없다.
- `npm run audit` open은 작업 전후 모두 0이다. 구독형 cost 누락은 118에서 125가 됐다(`google-gemini-cli` 7행, known). reasoning 2, thinking 66, zero price 15는 같다.

# 2026-11-21 OpenCode Zen·Go Pi 전용 행(`opencode` 69, `opencode-go` 22), `opencode-go/kimi-k3` Effort

ClawPoD Agent는 `opencode`·`opencode-go` 모델 값을 Pi에서만 받는다(Agent 3차 묶음 F). 상류 `opencode`(6행)·`opencode-go`(9행)에 없는 Pi 행을 catalog에 넣었다. 추가 91행. 기존 행 변화는 `opencode-go/kimi-k3`의 Effort 하나다.

| 묶음 | 행 | 값 | 근거 |
| --- | --- | --- | --- |
| `opencode` (69) | `openai-completions` 17: `beam-free`, `deepseek-v4.1-flash`, `deepseek-v4.1-flash-free`, `deepseek-v4-pro`, `flint-40b-free`, `glm-5.3`, `glm-5.3-flash`, `iceman-free`, `kimi-k2.7-code`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `minimax-m2.5`, `minimax-m2.7`, `mistral-large-4`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `qwen3.8-max`. `anthropic-messages` 17: `claude-fable-5`, `-5-1`, `-5-2`, `claude-haiku-4-5`, `claude-haiku-5-5`, `claude-opus-4-5`, `-4-6`, `-4-7`, `-4-8`, `-5-5`, `claude-sonnet-4-5`, `-4-6`, `claude-sonnet-5`, `-5-5`, `qwen3.5-plus`, `qwen3.6-plus`, `qwen3.8-flash`. `google-generative-ai` 5: `gemini-3.5-flash`, `-3.5-flash-lite`, `-3.7-flash`, `-3.8-flash`, `gemini-4-argon`. `openai-responses` 30: `gpt-5`, `gpt-5-codex`, `gpt-5-nano`, `gpt-5.1`, `-5.1-codex`, `-5.1-codex-max`, `-5.1-codex-mini`, `gpt-5.2`, `-5.2-codex`, `gpt-5.3-codex`, `gpt-5.4`, `-5.4-mini`, `-5.4-nano`, `-5.4-pro`, `gpt-5.5`, `-5.5-pro`, `gpt-5.6-luna`, `-5.6-terra`, `gpt-6-astra`, `gpt-6-luna`, `gpt-6-sol`, `gpt-6.1-sol`, `grok-4.5`, `grok-4.6`, `grok-4.7`, `grok-build-0.1`, `muse-ember-1.0`, `muse-spark-1.2`, `muse-spark-1.3`, `muse-wonder-1.0` | 이름·`api`·입력·reasoning·창·출력·가격 네 칸이 Pi 1.5.2 그대로. 모두 reasoning true, 입력 text 또는 text·image | **Pi 판과 파일 해시(승인된 예외):** `@earendil-works/pi-ai@1.5.2` `dist/providers/data/opencode.json`(sha256 `b47c72fcf7f07c783051361f2835f2217f16cc342275acfc13cfa8d667426fbf`, Agent `c4842bf5ae`). 행을 넣을지는 Zen 모델 API https://opencode.ai/inference/v1/models 로 정했다(Zen 문서 https://opencode.ai/docs/zen/ : "Fetch the full list of available models and their metadata from the models endpoint") |
| `opencode-go` (22) | `openai-completions` 13: `beam-free`, `glm-5.3`, `glm-5.3-flash`, `hy4`, `hy4-preview`, `iceman-contributor-free`, `kimi-k3.1-pro`, `longcat-2.0`, `longcat-2.5-free`, `mimo-v2.6-flash`, `mimo-v2.6-pro`, `minimax-m3.1-flash`, `step-5-preview`. `anthropic-messages` 4: `claude-haiku-5-5`, `minimax-m3`, `qwen3.7-plus`, `qwen3.8-flash`. `google-generative-ai` 1: `gemini-4-argon`. `openai-responses` 4: `gpt-6-luna`, `grok-4.7`, `muse-spark-1.2-contributor`, `muse-spark-1.3-contributor` | 같은 방식 | Pi `dist/providers/data/opencode-go.json`(sha256 `2e8f20182913cec36586a84ea6392f998e4f5897e1a824a36b3ea8a943d21639`). Go 모델 API https://opencode.ai/inference/go/v1/models . Go 문서 https://opencode.ai/docs/go/ : "Token prices are per 1M tokens and are the same for Go, Go Plus, and Go Teams." — 토큰 단가가 있어 구독형 목록에 넣지 않았다(상류 `opencode-go` 행도 단가를 가짐) |
| 가격 0 (11) | `opencode`: `beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `iceman-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`. `opencode-go`: `beam-free`, `iceman-contributor-free`, `longcat-2.5-free` | 0/0/0/0 | **공식 무료.** Zen 가격표의 "Free", Go 모델 API 가격 0. Free models 절은 여러 무료 모델을 "for a limited time"이라 적는다(프로모션 무료, `MAINTAINING.md` 9장 수시 행). 모두 ID에 `free`가 있다 |

provider 단위 `api`는 상류와 같은 `openai-completions`이고, 행의 `api`는 다를 때만 적었다. 상류 `opencode` 행은 `limit.input`을 `contextTokens`로 갖지만, 이 91행은 Pi 행에 없어 넣지 않았다. 장문 구간 가격(Pi `tiers`)은 수동 스키마가 받지 않는다.

## 공식 모델 API와의 대조 (2026-11-21 받은 원문)

이름·입력·reasoning·창·출력·가격 네 칸을 비교했다. 아래 칸 말고는 같다. **다른 칸도 Pi 값을 두었다**(Agent가 지금 쓰는 값을 그대로 옮기는 범위, 승인된 결정).

| 칸 | 행 | Pi(catalog) / 공식 API |
| --- | --- | --- |
| 이름 | `opencode/deepseek-v4.1-flash` | "DeepSeek V4.1 Flash" / "DeepSeek V4.1 Flash 1017"(문서 모델 표는 "DeepSeek V4.1 Flash") |
| `contextWindow` | `opencode/claude-sonnet-4-5` | 200,000 / 1,000,000 |
| `contextWindow` | `opencode/gpt-5.4` | 272,000 / 1,050,000 |
| `maxTokens` | `opencode-go/kimi-k3.1-pro` | 131,072 / 1,048,576(창과 같은 수. 상류 `kimi-k3` 행도 131,072) |
| 입력 예산(`limit.input`) | 24행: GPT-5 계열 12행 272,000, GPT-5.4~6.1 계열 11행 922,000, `opencode-go/hy4` 983,010 | 넣지 않음 / 값 있음 |
| `api` | Gemini 6행(`opencode` 5, `opencode-go` 1) | `google-generative-ai` / 권장 `interactions`. API의 `api` 목록에 `generate-content`도 같은 주소로 있어 Pi 경로는 공식 경로다 |
| `cacheWrite` | GPT-5.6~6.1 계열 7행 | 공식은 `{"30m": x, "12h": 2x}`. Pi 값은 30분 값과 같다 |

할인·가격 조건(값은 지금 공식 가격과 같다, 기록만): `opencode`·`opencode-go`의 `gemini-4-argon`은 API `multipliers` `date gte 2026-12-01` ×2, `opencode/gemini-3.7-flash`·`-3.8-flash`는 `2027-01-01` ×2(가격표 "50% off"). `opencode/mistral-large-4`도 가격표 "50% off"이고 종료일은 공식에 없다. Claude Fable 5.2·Opus 4.8·Opus 5.5와 GPT 계열 16행은 `service_tier`(fast·priority·flex 등) 배수가 있다. 기본 단가만 넣는다(5장).

## Effort: Agent 현재 동작 보존 규칙 91 + `opencode-go/kimi-k3`

| 규칙 | 값 | 근거 |
| --- | --- | --- |
| 91행 각각에 provider·정확한 ID 규칙 1개 | `off, minimal, low, medium, high, adaptive`, 기본 `low`. `source` = 이 파일, note는 "Not the official ladder: …" | **공식 단계가 아니다(승인된 예외).** catalog에 Effort가 없는 지금, Agent는 reasoning 모델에 이 목록과 기본 `low`를 쓴다. 행이 생기면 Agent는 Effort를 catalog에서만 읽으므로, 공식 목록을 넣으면 OpenCode로 나가는 요청이 바뀐다. OpenCode로 실제 요청을 보내 확인할 수단이 없어 지금 동작을 그대로 적었다. 이 때문에 5장 원칙 두 가지를 일부러 어긴다: 생각을 끌 수 없는 행에도 `off`가 있고, Claude effort 모델(4.6 이후)에도 `adaptive`가 있다 |
| `opencode-go/kimi-k3`(상류 행) | `max` 하나, 기본 `max` | Go 모델 API의 `kimi-k3` `capabilities.reasoning`이 `{"supported":true,"effort":["max"]}`다. 행 안의 `supportedReasoningEfforts: ["max"]`와 `*` 규칙 `kimi-k3*`(low·high·max)가 어긋나던 것을 고쳤다. Agent의 Pi 경로는 어느 단계든 `max`로 보내므로 요청은 같다 |

- 규칙은 모두 첫 `*` 규칙 앞(인덱스 14~105)에 있다. 접두 `*`를 쓰지 않았다. 접두 규칙은 상류가 나중에 내는 같은 계열 ID에 번지기 때문이다. 상류가 같은 ID를 내면 상류 행이 이기고, 규칙은 그 행에 계속 걸린다. ID가 빠지면 6장 "matches nothing" 검사가 잡는다.
- 규칙 수를 줄일 수 없다. 규칙이 없으면 89행의 목록이 OpenRouter·models.dev·`*` 규칙 값으로 바뀐다. 남은 2행(`iceman-free`, `iceman-contributor-free`)은 다른 출처가 목록을 주지 않아 `knownGaps` 2개가 필요하고, 다음 게시 때 소리 없이 바뀔 수 있다.
- 공식 목록으로 바꾸면 Agent 요청이 바뀐다(Agent 설계 기록): 89행 목록이 바뀌고, 새 세션 기본 요청이 69행에서 바뀐다(Claude 4.x 등 14행은 `off`). 저장 `xhigh`·`max` 80칸(46행)이 그대로 나가고, 켬/끔·항상 켬 13행은 `low`(켬)가 된다. `grok-build-0.1`은 `*` 규칙 `grok-build*`(`low` 켬)와 Pi 변환표가 겹쳐 모든 단계가 effort 없이 나간다. 공식 목록은 모델 API의 `capabilities.reasoning.effort`다(예: `opencode/claude-opus-4-7` low~max, `opencode/gpt-5.4` none~xhigh, `opencode/gpt-6-sol` none~max). 바꿀 때는 `MAINTAINING.md` 9장 "OpenCode 요청 확인 수단" 행을 따른다.

## 넣지 않은 ID

| ID | 이유 |
| --- | --- |
| `opencode/gemini-3.1-pro`, `gemini-3-flash`, `glm-5.3-flash-free`, `minimax-m3.1-flash-free` | Zen "Deprecated models" 표 2026-11-17·18. 모델 표·모델 API에 없다 |
| `opencode/glm-5`, `kimi-k2.5` | "Deprecated models" 표 2026-05-14·08-05. 모델 API에 없다 |
| `opencode/glm-5.1`, `glm-5.2`, `kimi-k2.6`, `inkling-2-small-free` | 문서 모델 표에는 있으나 문서가 전체 목록이라 부르는 모델 API에 없다 |
| `opencode-go/glm-5.2` | Go 문서 모델 이름 목록에는 있으나 Go 모델 API에 없다 |
| `opencode-go/mimo-v2.5`, `mimo-v2.5-pro` | 공식 문서·API 어디에도 없다 |
| `zai/glm-5.2-highspeed`, `zai/glm-5.3-highspeed` | Z.AI 가격 페이지(https://docs.z.ai/guides/overview/pricing)와 문서 색인(https://docs.z.ai/llms.txt)에 "highspeed" 0건. Pi에만 있고 가격이 0이다. 이번 작업은 `zai`를 건드리지 않았다 |

Pi의 비채팅 `classifier` 행 2개(`jev-1.13`, `jev-1.13-free`)는 후보가 아니다.

## 기록만 한 것

- Zen "Deprecated models" 표에 있지만 모델 표·가격표·모델 API에 모두 남아 있는 6행을 넣었다: `opencode/gpt-5-codex`, `gpt-5.1-codex`, `gpt-5.1-codex-max`, `gpt-5.1-codex-mini`, `gpt-5.2-codex`(표 2026-07-23), `minimax-m2.5`(2026-08-05). 공식 신호가 서로 다르고, 상태를 바꾸면 Agent가 새 설정에 노출하지 않게 되므로 이번에는 상태를 비웠다(`MAINTAINING.md` 9장 OpenCode 행).
- 위 공식 대조의 다른 칸과 할인 종료일.

## 판단과 한계

- 91행의 값은 "모든 수동 값은 공식 근거" 원칙에서 Pi 판·파일 해시를 근거로 쓰는 승인된 예외다(2026-11-21 `openai`·`anthropic` Pi 전용 행과 같은 방식). 행의 존재는 공식 모델 API로 정했다.
- Effort 91규칙은 공식 단계가 아니다. Agent가 OpenCode로 실제 요청을 확인할 수 있게 되면 공식 목록으로 바꾼다.
- 재생성 원본은 publish run 44879978665의 artifact다(main `bc51cfb`과 같은 `sourceGeneratedAt` 1795245934394). `models=2149->2240 (+91)`. `git diff models/v1/catalog.json`에서 추가 91행, `opencode-go/kimi-k3`의 `thinkingLevels`(low·high·max → max), 최상위 `generatedAt`·`supplementDigest` 말고는 바뀐 것이 없다.
- `npm run audit` open은 작업 전후 모두 0이다. cost 125, reasoning 2, thinking 66, zero price 15(모두 known) 숫자도 같다. 91행 모두 Effort를 갖고, 가격 0 행은 모두 ID에 `free`가 있다.
- 6장 "matches nothing" 검사: 새 규칙 92개는 모두 정확히 한 행에 걸린다(91행은 자기 규칙이 첫 규칙, `kimi-k3` 규칙은 `opencode-go/kimi-k3` 하나). 아무 행에도 안 걸리는 기존 규칙 3개(`*` `dots-3-note-preview*`, `kilocode` `cohere/north-mini-code:free`, `kilocode` `dots-studio/dots-3-note-preview:free`)는 작업 전 main에서도 같다.

# 2026-11-21 BytePlus·Volcano Engine Agent 플러그인 표 행(`byteplus` 3, `volcengine` 3)

ClawPoD Agent는 `byteplus`·`byteplus-plan`·`volcengine`·`volcengine-plan` 모델 값을 플러그인 정적 표에서도 받아 왔다(Agent 3차 묶음 G1에서 표를 런타임에서 뗀다). 표에만 있던 18개 ID 가운데 공식 모델 목록에 현역으로 있는 6개만 수동 행으로 넣었다. 기존 행 변화는 없다.

| provider / ID | 이름 | 입력 | reasoning | 창 / 최대 출력 | 가격(USD/1M) | 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| `byteplus/seed-2-0-pro-260328` | Seed 2.0 Pro | text·image | true | 256,000 / 4,096 | 0.50 / 3.00, cacheRead 0.10, cacheWrite 0 | 모델 목록 https://docs.byteplus.com/en/docs/ModelArk/1330310 (256K / 최대 입력 224K / 최대 출력 128K, Deep reasoning Yes, Visual understanding Yes), 가격 https://docs.byteplus.com/en/docs/ModelArk/1099320 Standard "[0, 128]" 행("Token prices are **USD per million tokens**") |
| `byteplus/seed-2-0-lite-260428` | Seed 2.0 Lite | text·image | true | 256,000 / 4,096 | 0.25 / 2.00, cacheRead 0.05, cacheWrite 0 | 같음(LTS) |
| `byteplus/seed-2-0-mini-260428` | Seed 2.0 Mini | text·image | true | 256,000 / 4,096 | 0.10 / 0.40, cacheRead 0.02, cacheWrite 0 | 같음(LTS) |
| `volcengine/deepseek-v4-1-flash-260910` | DeepSeek V4.1 Flash | text·image | true | 1,024,000 / 384,000 | 없음(`knownGaps` cost) | 모델 목록 https://www.volcengine.com/docs/82379/1330310 (上下文窗口 1024K, 最大回答 384K, 深度思考·多模态理解). 가격 https://www.volcengine.com/docs/82379/1544106 는 元/M token 뿐(`deepseek-v4-1-flash` 空闲 1.00 / 缓存命中 0.02 / 输出 4.00, 高峰 시간대 별도) |
| `volcengine/doubao-seed-2-1-lite-260915` | Doubao Seed 2.1 Lite | text·image | true | 1,024,000 / 256,000 | 없음 | 같은 목록(1024K, 最大回答 256K). 가격 `doubao-seed-2.1-lite` 0.80 / 缓存命中 0.16 / 输出 2.70 元 |
| `volcengine/doubao-seed-2-1-pro-260915` | Doubao Seed 2.1 Pro (September) | text·image | true | 1,024,000 / 256,000 | 없음 | 같은 목록(1024K, 最大回答 256K). 가격 `doubao-seed-2.1-pro` 6.00 / 1.20 / 30.00 元 |

- 이름·reasoning·입력·창·최대 출력은 **Agent 플러그인 표 값 그대로**다(Agent `c4842bf5ae8ef47091c98f41a39f86417a1658fc` `extensions/byteplus/models.ts`, `extensions/volcengine/models.ts`). 값을 바꾸면 Agent의 컴팩션 요약 요청(`max_tokens`)이 바뀌므로, 표가 런타임에서 빠져도 요청이 같도록 표 값을 옮겼다. provider `api`는 상류와 같은 `openai-completions`다.
- **가격만 표 값이 아니다.** 표의 가격은 0 또는 자리 채움 `0.0001/0.0002`라 옮기지 않았다(0장 "모르면 비웁니다"). BytePlus는 공식 USD, Volcano Engine은 CNY만 있어 비우고 `knownGaps`(`check: "cost"`) 3개를 적었다.
- `cacheWrite: 0`: BytePlus는 캐시를 토큰 쓰기가 아니라 저장 시간으로 받는다. 가격표 "Cache-storage prices are **USD per million tokens per hour**", Seed 2.0 세 행 Cache storage `$0.0083`. 토큰 쓰기 요금이 없으므로 5장대로 0이다.
- 원문은 2026-11-21 받았다. 설계 때 받은 사본과 본문(페이지에 든 마크다운)이 같다.

## 공식과 다른 칸(기록만)

| 칸 | 행 | catalog(Agent 표) / 공식 |
| --- | --- | --- |
| `maxTokens` | `byteplus` 3행 | 4,096 / 최대 출력 128K. 목록 문서 "The default output is 4K for all models unless otherwise specified. Max output includes CoT." — 4,096은 공식 기본 출력과 같다 |
| 가격 구간 | `byteplus` 3행 | [0,128K] 구간만 넣었다. (128,256] 구간은 Pro 1.00 / 0.20 / 6.00, Lite 0.50 / 0.10 / 4.00, Mini 0.20 / 0.04 / 0.80. Flex·배치 등 다른 요금은 넣지 않는다(5장) |
| `input` | `byteplus` Lite·Mini, `volcengine` Lite | 수동 행은 text·image만 받는다(5장). 공식은 오디오 이해도 지원 |
| 가격 | `volcengine` 3행 | 없음 / CNY만. 날짜 붙은 ID가 아니라 모델 계열 이름 단위로 적혀 있다 |

## Effort: Agent 현재 동작 보존 규칙 6

| 규칙 | 값 | 근거 |
| --- | --- | --- |
| 6행 각각에 provider·정확한 ID 규칙 1개 | `off, minimal, low, medium, high, adaptive`, 기본 `low`. `source` = 이 파일, note는 "Not the official ladder: …" | **공식 단계가 아니다.** catalog에 Effort가 없는 지금, Agent는 reasoning 모델에 이 목록과 기본 `low`를 쓴다. 이 주소는 Agent에서 프록시형이라 대화 턴에 `reasoning_effort`를 보내지 않는다. 규칙이 없으면 이미 있는 `*` 규칙이 걸려 목록·기본이 바뀐다: `seed-2-0*`(off·low·medium·high, 기본 medium), `deepseek-v4-1-flash*`(off·low·high·max, 기본 high), `doubao-seed-2-1*`(off·low·medium·high, 기본 high). 그래서 5장 원칙을 일부러 어긴다(공식 근거 없이 off·minimal·adaptive를 적음) |

- 공식 thinking 제어: Volcano Engine 모델 목록 "其中带"深度思考"能力标签的模型，默认调用即启用深度思考；如需仅执行文本生成任务，可通过调用参数关闭深度思考（Chat API 传入 `thinking.type=disabled`，Responses API 传入 `reasoning.effort=minimal`）". 공식 목록은 위 세 `*` 규칙이 이미 적고 있다(근거 https://docs.byteplus.com/en/docs/ModelArk/deep-thinking , https://www.volcengine.com/docs/82379/1449737 , https://api-docs.deepseek.com/api/create-chat-completion).
- 규칙은 첫 `*` 규칙 앞(인덱스 106~111)에 있다. 접두 `*`를 쓰지 않았다(상류의 같은 계열 새 ID에 번지지 않게). 6규칙은 각각 자기 행 하나에만 걸린다.
- 공식 목록으로 바꾸려면 Agent가 이 주소로 실제 요청을 보내 확인할 수단이 필요하다(`MAINTAINING.md` 9장).

## 넣지 않은 ID (12)

| provider | ID | 이유 |
| --- | --- | --- |
| `byteplus` | `seed-1-8-251228`, `kimi-k2-5-260127` | "Fourth batch of model deprecations (November 11, 2026)", Deactivation Date November 11, 2026(https://docs.byteplus.com/en/docs/ModelArk/model-deprecation-notice) |
| `byteplus-plan` | `doubao-seed-code` | BytePlus 문서에 이 문자열이 없다. 대응 모델 "ByteDance-Seed-Code"는 Coding Plan Deprecated models 표 09.23(https://docs.byteplus.com/en/docs/ModelArk/coding-plan-personal-model-deprecation) |
| `byteplus-plan` | `glm-4.7` | Coding Plan 지원 모델 목록(https://docs.byteplus.com/en/docs/ModelArk/coding-plan-personal-get-started)에 없다 |
| `volcengine` | `doubao-seed-1-8-251228`, `doubao-seed-code-preview-251028` | 第九批 EOS 2026-09-21 14:00(UTC+8)(https://www.volcengine.com/docs/82379/model-deprecation-notice) |
| `volcengine-plan` | `doubao-seed-code`(08.05), `glm-4.7`(06.08), `kimi-k2.5`(06.08), `kimi-k2.7-code`(10.28), `minimax-m3`(11.02) | Coding Plan "已下线模型" 표(https://www.volcengine.com/docs/82379/coding-plan-personal-model-deprecation) |
| `volcengine-plan` | `doubao-seed-code-preview-251028` | Coding Plan 문서에 없고, 종량 API에서 第九批 EOS 2026-09-21 |

퇴역 공지 표의 "Automated Replacement"(자동 교체) 열은 모델 ID를 직접 부르는 호출의 자동 전환을 뜻하지 않는다. 그런 호출(preset 엔드포인트)은 자동 전환 없이 끝난다(Volcano Engine은 자동 전환을 사용자가 만든 "自定义推理接入点"에만 적는다): BytePlus "Allowed throughput rate (TPM/RPM/IPM) of all the preset inference endpoints will be set to **0** on the **Deactivation Date**.", Volcano Engine "对于预置推理接入点 到期将直接关停，不自动切换，也不支持在控制台手动切换。"(두 퇴역 공지).

`byteplus-plan`·`volcengine-plan`은 구독형이라(5장) 수동 행을 두지 않았다. 상류 행(`ark-code-latest` 등)은 그대로다.

## 판단과 한계

- 6행의 값은 공식 값이 아니라 Agent 표 값이다(공식과 다른 칸은 위 표). 행의 존재와 가격은 공식 문서로 정했다.
- Effort 6규칙은 공식 단계가 아니다.
- 재생성 원본은 publish run 44892006922의 artifact다(main `7e7218f`과 같은 `sourceGeneratedAt` 1795255206096). `models=2240->2246 (+6)`. `git diff models/v1/catalog.json`에서 추가 6행과 최상위 `generatedAt`·`supplementDigest` 말고는 바뀐 것이 없다.
- `npm run audit` open은 작업 전후 모두 0이다. cost known 125 → 128(`volcengine` 3행, `knownGaps`), reasoning 2, thinking 66, zero price 15는 그대로다.
- 6장 "matches nothing" 검사: 새 규칙 6개는 모두 정확히 한 행에 걸린다. 아무 행에도 안 걸리는 기존 규칙 3개는 작업 전 main에서도 같다.

# 2026-11-21 Together Agent 플러그인 표 행(`together` 1)

ClawPoD Agent는 `together` 모델 값을 플러그인 정적 표에서도 받아 왔다(Agent 3차 묶음 G2에서 표를 런타임에서 뗀다). 표의 16개 ID 가운데 8개는 상류 `together` 행이 이미 있고, 공식 서버리스 목록에 현역으로 있는데 catalog에 없는 1개만 수동 행으로 넣었다. 기존 행 변화는 없다.

| provider / ID | 이름 | 입력 | reasoning | 창 / 최대 출력 | 가격(USD/1M) | 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| `together/Qwen/Qwen3.8-Flash` | Qwen3.8 Flash | text·image | true | 1,000,000 / 8,192 | 0.15 / 0.47, cacheRead 0, cacheWrite 0 | 서버리스 모델 목록 https://docs.together.ai/docs/serverless-models.md "Chat models" 표: `Qwen/Qwen3.8-Flash`, Context length 1000000, Input $0.15, Cached input "-", Output $0.47, Function calling Yes, Structured outputs Yes |

- 이름·reasoning·입력·창·최대 출력은 **Agent 플러그인 표 값 그대로**다(Agent `c4842bf5ae8ef47091c98f41a39f86417a1658fc` `extensions/together/models.ts`). 값을 바꾸면 Agent의 컴팩션 요약 요청(`max_tokens`)이 바뀌므로, 표가 런타임에서 빠져도 요청이 같도록 표 값을 옮겼다. provider `api`는 상류와 같은 `openai-completions`다.
- 가격은 공식 값이고 표 값과 같다. Together 변경 기록(https://docs.together.ai/llms-full.txt)상 2026-10-06부터 다시 $0.15/$0.47이다.
- `cacheRead: 0`, `cacheWrite: 0`: 목록의 Cached input 칸이 "-"(캐시 단가 없음)다. 같은 목록에서 "-"인 상류 `together` 행(`Qwen/Qwen3.6-Plus`, `Qwen/Qwen3.5-9B`, `openai/gpt-oss-120b`)도 두 칸이 0이다(5장 "캐시 기능이 없는 모델은 cacheRead 0 또는 생략").
- 원문은 2026-11-21 받았다. 설계 때 받은 사본과 바이트가 같다(서버리스 목록·퇴역 페이지 sha256 `9007f548…`·`c8c4a23f…`).

## 공식과 다른 칸(기록만)

| 칸 | catalog(Agent 표) / 공식 |
| --- | --- |
| `input` | text·image / 근거 없음. 이 모델은 목록의 "Vision models" 표에 없다 |
| `reasoning` | true / 목록에 추론 여부 칸이 없다 |
| `maxTokens` | 8,192 / 목록에 최대 출력 칸이 없다(Agent 표 주석: 공식 출력 한도를 모르는 행은 요청 대체값 8K) |

## Effort: Agent 현재 동작 보존 규칙 1

| 규칙 | 값 | 근거 |
| --- | --- | --- |
| `together` / `Qwen/Qwen3.8-Flash` 정확한 ID 규칙 1개 | `off, minimal, low, medium, high, adaptive`, 기본 `low`. `source` = 이 파일, note는 "Not the official ladder: …" | **공식 단계가 아니다.** catalog에 Effort가 없는 지금, Agent는 reasoning 모델에 이 목록과 기본 `low`를 쓴다. 이 주소는 Agent에서 프록시형이라 대화 턴에 `reasoning_effort`를 보내지 않는다. 규칙이 없으면 이미 있는 `*` 규칙 `qwen3-8-flash*`(off·low·medium·xhigh, 기본 xhigh)가 걸려 목록·기본이 바뀐다. 그래서 5장 원칙을 일부러 어긴다(공식 근거 없이 off·minimal·adaptive를 적음) |

- 공식 thinking 제어: 제조사 Qwen API의 목록은 위 `*` 규칙이 이미 적고 있다(근거 https://docs.qwencloud.com/api-reference/chat/openai-chat). Together 목록은 이 모델의 추론 제어를 적지 않는다.
- 규칙은 첫 `*` 규칙 앞(인덱스 112)에 있다. 접두 `*`를 쓰지 않았다(같은 계열 새 ID에 번지지 않게). 규칙은 자기 행 하나에만 걸린다.
- 공식 목록으로 바꾸려면 Agent가 이 주소로 실제 요청을 보내 확인할 수단이 필요하다(`MAINTAINING.md` 9장).

## 넣지 않은 ID (9)

| provider | ID | 이유 |
| --- | --- | --- |
| `together` | `deepseek-ai/DeepSeek-R1`(2026-05-14), `deepseek-ai/DeepSeek-V3.1`(2026-05-14), `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8`(2026-03-31), `meta-llama/Llama-4-Scout-17B-16E-Instruct`(2026-02-06), `moonshotai/Kimi-K2.5`(2026-05-21), `moonshotai/Kimi-K2-Instruct-0905`(2026-03-06), `zai-org/GLM-4.7`(2026-04-02) | 퇴역 페이지 https://docs.together.ai/docs/deprecations.md "Deprecation history › Inference" 표(괄호는 Removal date). 서버리스 목록에도 없다 |
| `qianfan` | `deepseek-v4-flash` | 퇴역 기록 https://cloud.baidu.com/doc/qianfan/s/zmh4stou3 표(登记日期 / 退役模型版本 / 模型退役日期 / 推荐替换模型) "2026-09-01 / DeepSeek-V4-Flash / 2026-09-29 / DeepSeek-V4-Flash-0731". 국제 영문 목록(https://intl.cloud.baidu.com/en/doc/qianfan/s/7m95lyy43-intl-en)에는 아직 `deepseek-v4-flash`가 있지만, Agent `qianfan` 주소가 중국 도메인 `https://qianfan.baidubce.com/v2`라 중국 퇴역 기록을 따른다 |
| `moonshot` | `kimi-k2.5` | 모델 목록 https://platform.kimi.ai/docs/models.md "Deprecated Models" 표 "`kimi-k2.5` \| Deprecated" |

- Together 퇴역 페이지의 "Active model redirects" 표에 `DeepSeek-R1` → `DeepSeek-R1-0528`이 있다. 대상 `deepseek-ai/DeepSeek-R1-0528`은 서버리스 목록에 없어 넘겨 줄 곳이 없다. 그래서 `deepseek-ai/DeepSeek-R1`도 행을 두지 않는다. Fine-tuning 표의 `moonshotai/Kimi-K2.5` → `moonshotai/Kimi-K2.6`(2026-07-29)은 추론이 아니라 파인튜닝 퇴역이다.

## 판단과 한계

- 이 행의 값은 공식 값이 아니라 Agent 표 값이다(공식에 없는 칸은 위 표). 행의 존재와 가격은 공식 문서로 정했다.
- Effort 규칙은 공식 단계가 아니다.
- 재생성 원본은 publish run 44898298257의 artifact다(main `9413adc`과 같은 `sourceGeneratedAt` 1795259924895). `models=2246->2247 (+1)`. `git diff models/v1/catalog.json`에서 추가 1행과 최상위 `generatedAt`·`supplementDigest` 말고는 바뀐 것이 없다.
- `npm run audit` open은 작업 전후 모두 0이다. cost known 128, reasoning 2, thinking 66, zero price 15는 그대로다.
- 6장 "matches nothing" 검사: 새 규칙은 정확히 한 행에 걸린다. 아무 행에도 안 걸리는 기존 규칙 3개는 작업 전 main에서도 같다.

# 2026-11-21 Synthetic Agent 플러그인 표 행(`synthetic` 4, 새 provider)

ClawPoD Agent는 `synthetic`(synthetic.new, Anthropic Messages API) 모델 값을 플러그인 정적 표에서 받아 왔다(Agent 3차 묶음 G3에서 표를 런타임에서 뗀다). catalog에는 `synthetic` provider가 없었다. 표의 28개 ID 가운데 공식 모델 API에 현역으로 있는 4개만 새 provider `synthetic`(`api: "anthropic-messages"`)의 수동 행으로 넣었다. 기존 행 변화는 없다.

| provider / ID | 이름 | 입력 | reasoning | 창 / 최대 출력 | 가격(USD/1M) | 공식 모델 API 값 |
| --- | --- | --- | --- | --- | --- | --- |
| `synthetic/hf:openai/gpt-oss-120b` | GPT OSS 120B | text | false | 128,000 / 8,192 | 0.10 / 0.10, cacheRead 0.02, cacheWrite 0 | ctx 131072, max out 65536, text, efforts none/low/medium/high, prompt $0.0000001, completion $0.0000001, cache reads $0.00000002, cache writes 0 |
| `synthetic/hf:zai-org/GLM-4.7-Flash` | GLM 4.7 Flash | text | true | 196,608 / 8,192 | 0.10 / 0.50, cacheRead 0.02, cacheWrite 0 | ctx 196608, max out 65536, text, efforts none/low/medium/high, $0.0000001 / $0.0000005 / $0.00000002 / 0 |
| `synthetic/hf:zai-org/GLM-5.3-Flash` | GLM 5.3 Flash | text·image | true | 524,288 / 8,192 | 0.15 / 0.50, cacheRead 0.04, cacheWrite 0 | ctx 524288, max out 65536, text·image, efforts low/high/max, $0.00000015 / $0.0000005 / $0.00000004 / 0 |
| `synthetic/hf:Qwen/Qwen3.8-27B` | Qwen3.8 27B | text·image | true | 262,144 / 8,192 | 0.45 / 2.20, cacheRead 0.09, cacheWrite 0 | ctx 262144, max out 65536, text·image, efforts low/medium/xhigh, $0.00000045 / $0.0000022 / $0.00000009 / 0 |

- 근거: 모델 API https://api.synthetic.new/openai/v1/models (인증 없이 200. `hf:` 모델은 위 4개와 `hf:zai-org/GLM-5.3`, `hf:deepseek-ai/DeepSeek-V4.1-Flash-1017`, `hf:moonshotai/Kimi-K3.1-Pro` 7개뿐), 가격표 https://synthetic.new/pricing/models "Usage-based price" 열(GPT-OSS $0.10 / cached $0.02 / $0.10, GLM-4.7-Flash $0.10 / $0.02 / $0.50, GLM-5.3-Flash $0.15 / $0.04 / $0.50, Qwen3.8-27B $0.45 / $0.09 / $2.20). 원문은 2026-11-21 받았고 모델 API는 설계 때 사본과 바이트가 같다(sha256 `3e0c30a4…a99e`).
- 이름·reasoning·입력·창·최대 출력은 **Agent 플러그인 표 값 그대로**다(Agent `c4842bf5ae8ef47091c98f41a39f86417a1658fc` `extensions/synthetic/models.ts`). 이 주소는 Anthropic Messages라 Agent가 `max_tokens = min(maxTokens, 32000)`을 보내고, reasoning 행에는 고른 단계를 Anthropic `thinking`(켬: 단계별 토큰 예산, `off`: disabled)으로 보낸다. 최대 출력을 공식 65,536으로 바꾸면 `max_tokens`가 8,192 → 32,000으로, gpt-oss reasoning을 켜면 요청에 `thinking`이 생긴다. 표가 런타임에서 빠져도 요청이 같도록 표 값을 옮겼다.
- 가격은 공식 종량가다. Agent 표의 0은 자리 채움(`SYNTHETIC_DEFAULT_COST`)이라 쓰지 않았다. `cacheWrite: 0`은 모델 API `pricing.input_cache_writes`가 "0"이기 때문이다.
- 구독형으로 보지 않는다: 요금 페이지 https://synthetic.new/pricing 는 구독(Go·Standard·Big·Bigger)과 "extra usage at API pricing"을 함께 팔고, https://synthetic.new/pricing/models 는 "Models are charged per token. Usage-based requests pay the usage-based price; users on a subscription plan have their rate limit deducted at the subscription discounted rate."라고 적는다. 토큰당 종량가가 공개돼 있으므로 `SUBSCRIPTION_PROVIDERS`에 넣지 않고 가격을 채웠다(구독 할인 단가는 쓰지 않음).
- 모델 문서 https://dev.synthetic.new/docs/api/models : "Pinning to specific model names risks 404 errors when we rotate older models out." 모델 API에서 ID가 빠지면 행을 지운다(`MAINTAINING.md` 9장).

## 공식과 다른 칸(기록만)

| ID | 칸 | catalog(Agent 표) / 공식 모델 API |
| --- | --- | --- |
| 4행 모두 | `maxTokens` | 8,192 / 65,536 |
| `hf:openai/gpt-oss-120b` | `contextWindow` | 128,000 / 131,072 |
| `hf:openai/gpt-oss-120b` | `reasoning` | false / `reasoning_parameters.efforts` none·low·medium·high, `supported_features`에 `reasoning` |

## Effort: Agent 현재 동작 보존 규칙 3, gpt-oss reasoning 꺼짐 유지 규칙 1

| 규칙 | 값 | 근거 |
| --- | --- | --- |
| `thinking`: `synthetic` / `hf:zai-org/GLM-4.7-Flash`, `hf:zai-org/GLM-5.3-Flash`, `hf:Qwen/Qwen3.8-27B` 정확한 ID 규칙 3개 | `off, minimal, low, medium, high, adaptive`, 기본 `low`. `source` = 이 파일, note는 "Not the official ladder: …" | **공식 단계가 아니다.** catalog에 Effort가 없는 지금, Agent는 reasoning 모델에 이 목록과 기본 `low`를 쓴다. 규칙이 없으면 이미 있는 `*` 규칙이 걸려 목록·기본이 바뀐다: `glm-4-7-flash*`(off·low, 기본 low), `glm-5-3*`(low·high·max, 기본 max), `qwen3-8-27b*`(off·low·medium·xhigh, 기본 xhigh). 그래서 5장 원칙을 일부러 어긴다(공식 근거 없이 off·minimal·adaptive를 적음) |
| `overrides`: `synthetic` / `hf:openai/gpt-oss-120b` `set: {reasoning: false}` | 배열 끝(`*` 규칙 `gpt-oss-*` 뒤) | **공식 값이 아니다.** 이미 있는 `*` 규칙 `gpt-oss-*`(`set: {reasoning: true}`, "some hosts publish reasoning:false")가 모든 provider의 gpt-oss 행에 걸려, 이 규칙이 없으면 이 행이 reasoning true와 `*` `thinking` 규칙 `gpt-oss*`(low·medium·high, 기본 medium)로 게시된다(재생성 전 테스트에서 확인). 그러면 Agent의 Anthropic 요청에 `thinking`이 생긴다. Agent 표 값(false)을 지키려고 정확한 ID로 뒤에서 덮는다. 이 행에는 `thinking` 규칙이 없고 Effort도 붙지 않는다(생성기는 reasoning true 행에만 채운다) |

- 공식 thinking 제어: 모델 API `reasoning_parameters.efforts`(위 표). Anthropic Messages 주소에서 이 effort 이름이 어떻게 받아들여지는지는 공식 문서에서 찾지 못했다.
- 규칙 3개는 첫 `*` 규칙 앞(인덱스 113~115, Together 규칙 뒤)에 있다. 접두 `*`를 쓰지 않았다(같은 계열 새 ID에 번지지 않게). 각 규칙과 `overrides` 규칙은 자기 행 하나에만 걸린다.
- 공식 목록·reasoning으로 바꾸려면 Agent가 이 주소로 실제 요청을 보내 확인할 수단이 필요하다(`MAINTAINING.md` 9장).

## 넣지 않은 ID

| provider | ID | 이유 |
| --- | --- | --- |
| `synthetic` 3 | `hf:zai-org/GLM-5.3Beta`, `hf:deepseek-ai/DeepSeek-V4.1-FlashBeta`, `hf:moonshotai/Kimi-K3` | 모델 API에 이 ID가 없다. 비슷한 이름의 다른 ID만 있다: `hf:zai-org/GLM-5.3`(문서 표의 "Beta"는 배지), `hf:deepseek-ai/DeepSeek-V4.1-Flash-1017`, `hf:moonshotai/Kimi-K3.1-Pro`. 같은 모델이라는 공식 근거가 없어 다른 ID로 옮기지 않았다 |
| `synthetic` 21 | `hf:deepseek-ai/DeepSeek-R1-0528`, `hf:deepseek-ai/DeepSeek-V3-0324`, `hf:deepseek-ai/DeepSeek-V3.1`, `hf:deepseek-ai/DeepSeek-V3.1-Terminus`, `hf:deepseek-ai/DeepSeek-V3.2`, `hf:deepseek-ai/DeepSeek-V3`, `hf:meta-llama/Llama-3.3-70B-Instruct`, `hf:meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8`, `hf:MiniMaxAI/MiniMax-M2.5`(Agent 기본 모델), `hf:moonshotai/Kimi-K2.5`, `hf:moonshotai/Kimi-K2-Instruct-0905`, `hf:moonshotai/Kimi-K2-Thinking`, `hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4`, `hf:Qwen/Qwen3-235B-A22B-Instruct-2507`, `hf:Qwen/Qwen3-235B-A22B-Thinking-2507`, `hf:Qwen/Qwen3-Coder-480B-A35B-Instruct`, `hf:Qwen/Qwen3-VL-235B-A22B-Instruct`, `hf:zai-org/GLM-4.5`, `hf:zai-org/GLM-4.6`, `hf:zai-org/GLM-4.7`, `hf:zai-org/GLM-5` | 모델 API와 모델 문서 어디에도 없다. 퇴역 공지는 없고 목록에서 빠졌다(위 404 문구) |
| `venice` 11 | `claude-sonnet-4-5`, `grok-41-fast`, `grok-code-fast-1`, `hermes-3-llama-3.1-405b`, `minimax-m21`, `mistral-31-24b`, `openai-gpt-52-codex`, `qwen3-4b`, `qwen3-coder-480b-a35b-instruct`, `venice-uncensored`, `zai-org-glm-4.7-flash` | 공식 목록에 0건: https://api.venice.ai/api/v1/models (148건), `?type=all`(432건). 2개는 퇴역 트래커 https://docs.venice.ai/overview/deprecations 에 있다(`claude-sonnet-4-5` Oct 30, 2026, `hermes-3-llama-3.1-405b` Nov 2, 2026 Deprecated). 상류 `venice` 자동 행은 손대지 않았다 |
| `chutes` 45 | Agent `extensions/chutes/models.ts` 표 전용 45개 전부(Agent 기본 모델 `zai-org/GLM-4.7-TEE` 포함) | 공식 목록 https://llm.chutes.ai/v1/models (19건)에 0건(대소문자 무시). 상류 `chutes` 자동 행은 손대지 않았다 |
| `arcee` 4 | `trinity-large-preview`, `trinity-large-thinking`, `trinity-mini`, `trinity-nano` | https://docs.arcee.ai/arcee-language-models/trinity-family.md 의 모델 표(Trinity-Nano·Trinity-Mini·Trinity-Large-Thinking) "API Model Name"이 모두 "Not Hosted"이고 Large-Preview는 그 표에 없다. 가격표 https://docs.arcee.ai/get-started/pricing.md 에 Trinity 0건. catalog `openrouter`에도 Trinity 행이 없다. 그래서 `arcee` provider를 만들지 않았다 |

## 기록만: Ollama Cloud `:cloud` ID, Kilo `kilo/auto`(Agent 묶음 G4, 이 저장소 변경 없음)

- Ollama Cloud 직접 API는 접미사 없는 이름을 쓴다(https://docs.ollama.com/cloud/models.md "Model names": "For direct requests to `ollama.com`, list models with `curl https://ollama.com/api/tags`… In the Ollama app, CLI, official libraries, or local API, use the `:cloud` name"). Agent 표의 `:cloud` ID 6개 가운데 접미사를 뗀 `glm-5.2`·`kimi-k3`·`minimax-m3`는 이미 상류 `ollama-cloud` 행이 있고, `glm-5.1`(2026-09-25)·`kimi-k2.5`(2026-07-31)·`minimax-m2.7`(2026-11-09)은 퇴역이다(https://docs.ollama.com/cloud/model-lifecycle.md 표, `POST https://ollama.com/api/show` 410 "… was retired on …"; `minimax-m2.7`은 lifecycle 표에 아직 없고 410 응답으로만 확인). 행을 넣지 않는다(수동 스키마의 `api`에 `ollama`가 없기도 하다).
- 상류 자동 행 `ollama-cloud/minimax-m3`의 창 524,288과 `/api/show`의 `minimax-m3.context_length` 512,000이 다르다. 상류 자동 행이라 이번에 고치지 않았다(후속).
- Kilo `kilo/auto`는 게이트웨이 목록 https://api.kilo.ai/api/gateway/models (470건)에 없다. auto 계열은 `kilo-auto/frontier`·`balanced`·`efficient`·`free`·`small`이다.

## 판단과 한계

- 4행의 값은 공식 값이 아니라 Agent 표 값이다(공식과 다른 칸은 위 표). 행의 존재와 가격은 공식 모델 API·가격표로 정했다.
- Effort 규칙 3개와 gpt-oss `overrides` 규칙은 공식 값이 아니다.
- 재생성 원본은 publish run 44903821026의 artifact다(main `38a7851`과 같은 `sourceGeneratedAt` 1795264063029). `providers=58 (+1/-0) models=2247->2251 (+4)`. `origin/main` 대비 행 단위 비교에서 새 provider `synthetic`(4행, provider 메타 `api`만)과 최상위 `generatedAt`·`supplementDigest` 말고는 바뀐 것이 없다.
- `npm run audit` open은 작업 전후 모두 0이다. cost known 128, reasoning 2, thinking 66, zero price 15는 그대로다.
- 6장 "matches nothing" 검사: 새 규칙 4개는 각각 정확히 한 행에 걸린다. 아무 행에도 안 걸리는 기존 규칙 3개는 작업 전 main에서도 같다.

# 2026-11-22 compat 요청 키 판정, GPT-6.2 계열, MiniMax 중국 키와 퇴역 Agent ID (ClawPoD Agent 3차 I3e·I3f·I3g)

ClawPoD Agent가 catalog compat을 요청 모양의 층(설정 > 내장 catalog > Pi 내장)으로 쓰게 되므로, 요청에 닿는 compat 키를 공식 근거로 판정했다. 근거가 있으면 그 값, 없으면 그 키를 지운다(Agent가 오늘 기본값으로 돈다). 생성기에 `overrides.set.compat`(키 단위 패치, `null`은 그 키만 지움)을 더했다. 설계: clawpod-agent 보고서 `S3I3E/F/G-DESIGN.md`.

## 생성기

- `scripts/catalog.mjs`: `overrides.set.compat` = `z.record(/^[A-Za-z]+$/, boolean | 문자열 | null)`, 빈 패치 거부. `applyOverrides`는 compat만 키 단위로 합치고 빈 compat은 지운다. 다른 칸은 그대로 통째 교체.
- `scripts/audit-catalog.mjs`: `SUBSCRIPTION_PROVIDERS`에 `minimax-portal-cn`(구독, `minimax-portal`과 같음).

## I3e: compat 요청 키

| 규칙 | 바뀌는 행 | 근거 |
| --- | --- | --- |
| `kimi`/`k3*`, `mistral`/`*`: `adaptiveThinking` 지움 | kimi 4, mistral 3 | 런타임 키가 아니다(`forceAdaptiveThinking`). Kimi Code 문서(https://www.kimi.com/code/docs/en/kimi-code/models.html)는 Anthropic 경로 thinking 칸을 적지 않고, Mistral(https://docs.mistral.ai/inference/conversations/reasoning)은 `reasoning_effort`뿐. 이름을 바꾸지 않고 지운다 |
| `abliteration`/`*`: `supportsPromptCacheKey` 지움, `promptCacheKeyMode: "enabled"` | 4 | "Cache routing hint (`prompt_cache_key`) Supported" (https://docs.abliteration.ai/compatibility-matrix.md) |
| `particle`/`particle-ai/particle-1` 9키, `featherless`/`Qwen/Qwen3-32B` 7키, `longcat`/`LongCat-2.0` 8키 지움 | 1·1·1 | 공식 문서 없음(Featherless 문서 읽기 실패, LongCat 문서는 2.5만). Effort는 남김 |
| `tencent-tokenhub`·`tencent-tokenplan`/`*`: `supportsReasoningEffort`·`supportsUsageInStreaming` 지움 | 5·4 | 공식 문서 확인 못함 |
| `github-copilot`/`gemini-*`: `maxTokensField`·`supportsDeveloperRole`·`supportsStore`·`supportsUsageInStreaming` 지움 | 4 | Copilot 공개 API 문서 없음 |
| `opencode`·`opencode-go`/`*`: `maxTokensField`·`supportsDeveloperRole`·`supportsUsageInStreaming` 지움 | 상류 행 | 문서·모델 API에 없는 칸 (https://opencode.ai/docs/zen/) |
| `supportsStrictMode: true`: `opencode/kimi-k3`, `opencode-go/kimi-k3`, `opencode-go/kimi-k2.7-code` | 3 | 모델 API `api.chat-completions.capabilities.tools.strict: true` (https://opencode.ai/zen/v1/models , https://opencode.ai/inference/go/v1/models , 2026-11-22) |
| `supportsStrictMode` 지움: `opencode-go/kimi-k2.6`, `deepseek-v4-flash` | 2 | Go 모델 API에 ID 없음 |
| `supportsStrictMode: false` 유지: `opencode/big-pickle`·`minimax-m3`, `opencode-go/deepseek-v4-pro`·`hy3`·**`deepseek-v4.1-flash`** | 0 | 모델 API가 `tools.strict`를 적지 않음(명시 없음 → 오늘 동작 유지). 설계는 `deepseek-v4.1-flash`를 "목록에 없음"으로 지웠으나 2026-11-22 Go 목록에 있고 strict만 없어 같은 갈래로 뒀다 |
| `supportsReasoningEffort` 지움: `opencode/claude-opus-5`·`gemini-3.6-flash`·`gpt-5.6-sol`, `opencode-go/gpt-5.6-luna`·`deepseek-v4-flash` | 5 | 모델 API가 chat-completions가 아닌 messages/generate-content/responses로만 서빙(또는 목록에 없음) |
| `stepfun`·`stepfun-plan`/`step-3.7-flash`: `supportsDeveloperRole`·`supportsStore`·`supportsStrictMode`·`supportsUsageInStreaming` 지움 | 2 | 공식 API 문서(https://platform.stepfun.ai/docs/en/api-reference/chat/chat-completion-create.md)는 `max_tokens`·`reasoning_effort`만 (둘은 남김) |
| `nvidia`/`*`: `requiresStringContent` 지움 | 4 | 근거 없음. 배열 content를 펴면 VL 행 이미지가 빠진다 |
| `baseten`/`deepseek-ai/DeepSeek-V4-Flash-0731` `maxTokens` 384000 → 262144 | 1 | Chat Completions 스키마 `max_tokens` `maximum: 262144` (https://docs.baseten.co/reference/inference-api/chat-completions.md) |
| `requesty`/`claude-sonnet-5-5`: `supportsReasoningEffort` 지움 | 1 | Requesty는 Anthropic에 effort를 thinking 예산으로 바꿈(https://docs.requesty.ai/features/reasoning.md), Sonnet 5.5는 예산형 400(https://platform.claude.com/docs/en/build-with-claude/thinking-troubleshooting) |

`thinking` 규칙(정확한 ID, 첫 `*` 규칙 앞):

| provider / ID | 단계 / 기본 | 근거 |
| --- | --- | --- |
| `baseten`/`nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B` | off, high / **off** | Baseten 추론 문서 "Off by default", 값 "`none`, `high`" (https://docs.baseten.co/inference/model-apis/reasoning.md). 설계는 기본 high였으나 문서가 기본 꺼짐이라 off로 뒀다 |
| `opencode-go`/`deepseek-v4-pro` | high, max / high | Go 모델 API effort [high, max], toggle 없음 |
| `opencode-go`/`deepseek-v4.1-flash` | low, high, max / high | Go 모델 API effort [low, high, max], toggle 없음 |
| `together`/`deepseek-ai/DeepSeek-V4-Pro-0813` | off, high, max / high | "accepts only "high" and "max" for `reasoning_effort`. Other values are mapped automatically: "low" and "medium" map to "high". "high" and "xhigh" map to "max"." 켬/끔은 `reasoning.enabled` (https://docs.together.ai/docs/inference/chat/reasoning.md). 문서가 `high` 에서 스스로 어긋나므로 `high` 가 `max` 로 돌 수 있다(받는 값만 보내므로 400 위험은 없음) |

## I3f: GPT-6.2 계열 `cachesInstructions: false`

`overrides` 끝에 `provider: "*"` 규칙 둘(`gpt-6-2*`, Venice 점 없는 ID `openai-gpt-62*`). OpenAI 문서: "Models starting with GPT-6.2, including Astra and Sol, append these instructions after input, beyond eligible cache breakpoints." (https://developers.openai.com/api/docs/guides/prompt-caching). 걸리는 행 36(openai 2는 상류 값이 이미 false, 나머지 34가 바뀜: openai-codex·codex 각 2, openrouter 8, kilocode 6, vercel 4, amazon-bedrock 4, venice 4, novita 2, mantle 2). `gpt-6-astra`·`gpt-6.1-*`·`gpt-5.6-*`에는 걸리지 않는다. 키 단위 패치라 상류 compat(`codeMode` 등)과 Effort가 남는다.

## I3g: MiniMax 중국 키, 퇴역 Agent ID, Step Plan 출력 상한

| 대상 | 내용 | 근거 |
| --- | --- | --- |
| 새 수동 provider `minimax-cn` | `minimax` 수동 5행 그대로(M2.7·M2.7-highspeed `disabled`, M3, M3.1-Flash, M3.1-Flash-Preview `deprecated`→M3.1-Flash), 가격 없음 + `knownGaps` cost 2 | 중국 FAQ https://platform.minimax.cn/docs/faq/models.md (M3.1-Flash·M3 현역, M2.5·M2.7 2026-11-18 下线), 가격 CNY뿐 https://platform.minimaxi.com/docs/pricing/overview.md |
| 새 수동 provider `minimax-portal-cn` | `minimax-portal` 5행 그대로(M2.7 둘·Flash-Preview `deprecated`→M3.1-Flash) | 같은 FAQ: M Plan·Token Plan의 M2.5/M2.7 요청은 2026-10-19부터 M3.1 Flash로, "原模型名称保留作为兼容入口" |
| `minimax`/`MiniMax-M3.1-Flash-Preview` | 퇴역 행(`minimax-portal`과 같은 값) | "Existing model names will continue to work" (https://platform.minimax.io/docs/faq/models.md) |
| `kimi`/`kimi-code`(Kimi Code), `k2p5`(Kimi Code (legacy model id)) | `deprecated`, `replacedBy: kimi-for-coding`, 262144 / 32768, text·image, reasoning | Kimi Code 목록에 없음, "A mistyped model ID falls back to K2.8 Preview without thinking" (K2.8 Preview = `kimi-for-coding`) |
| `kilocode`/`kilo/auto` | `deprecated`, `replacedBy` 없음, 1000000 / 128000 | Kilo 목록에 없음(https://api.kilo.ai/api/gateway/models), 거부 근거도 없음 → 남김 |
| `nvidia` 5: `nvidia/nemotron-3-super-120b-a12b`, `minimaxai/minimax-m3`, `moonshotai/kimi-k2.5`, `minimaxai/minimax-m2.5`, `z-ai/glm5` | `deprecated`, `replacedBy` 없음, 값은 Agent 표 | 공개 목록 https://integrate.api.nvidia.com/v1/models (2026-11-22, 33 ID)에 없음, 공식 퇴역 공지 없음 → 남김 |
| `nvidia` 행 없음: `moonshotai/kimi-k3`, `z-ai/glm-5.2` | 퇴역 행을 넣지 않음 | 오늘 플러그인 표 없이 중첩 id 로 안쪽 provider(`moonshot`·`zai`)의 catalog 행을 빌려 해석된다. 퇴역 행 규칙(설계 I3g R3)은 "설정 행 없이 플러그인 표로만 해석되는 id" 에만 적용한다. 행을 넣으면 값이 옛 표 값으로 바뀐다(kimi-k3 창 1,048,576 → 131,072, glm-5.2 출력 131,072 → 8,192, glm-5.2 기본 단계 max → off; 실측 설계 I3g R4) |
| `stepfun-plan`/`step-3.7-flash` `maxTokens` 262144 → 65536 | `overrides` | **해석값이다.** StepFun 문서(zh)의 표 "Step Plan 通道：Step Router V1 字段差异"는 `step-router-v1` 모델의 제약이고(`max_tokens` "上限为 64K", `model` "仅接受 step-router-v1"), plan 채널 router 가 `step-5-preview`·`step-3.7-flash` 로 보낸다는 간접 근거뿐이다. 64K 를 65536 으로 읽었다(Agent 플러그인 값과 같음) (https://platform.stepfun.com/docs/zh/api-reference/chat/chat-completion-create) |

- 퇴역 행 값은 Agent 표 그대로다(clawpod-agent `5ae2c04979` `extensions/{minimax,kimi-coding,kilocode,nvidia}`). 가격은 비웠다.
- Effort: 새 규칙 없음. `-cn` 행과 Preview는 기존 `*` 규칙(`minimax-m3-1-flash*`, `minimax-m3*`, `minimax-m2*`)이 global 같은 모델과 같은 값을 준다(테스트가 `-cn` 대 global 비교). `kimi-code`·`k2p5`·`kilo/auto`는 출처가 없어 Effort 없음.

## 퇴역 행이 바꾸는 Effort (받아들임, 2026-11-22 리뷰 F1)

Agent 는 Effort 를 그 모델의 catalog 행 하나에서 읽는다(자기 행 → pointer → 중첩 id 의 안쪽 행 순서, 먼저 있는 행이 정함). 그래서 퇴역 행을 새로 넣으면 값 칸은 Agent 표와 같아도 Effort 출처가 바뀐다. catalog 가 SOT 이고 새 값이 공식 출처에 더 맞아 받아들인다.

| ID | 오늘(행 없음) | 게시본(자기 행) | 단계를 준 규칙과 근거 |
| --- | --- | --- | --- |
| `minimax/MiniMax-M3.1-Flash-Preview` | catalog 행 없음, Agent 기본 `low` | `low, medium, high, xhigh, max` / 기본 `max`(`minimax-portal` 의 같은 행이 오늘 쓰는 값과 같음, 받는 값이라 400 위험 없음). `max` 단계: 오늘 `xhigh` 가 나가던 것이 `max` 로 나간다(목록에 `max` 가 생김). Agent 훅이 이 id 에 적응형 thinking 을 강제하므로 기본 턴 effort 가 low → max(비용·지연 증가) | `*` `minimax-m3-1-flash*`: https://platform.minimax.io/docs/api-reference/text-anthropic-api (`output_config.effort` low~max, 기본 max, 끌 수 없음). Preview 는 M Plan 에서 M3.1 Flash 가 서빙 (https://platform.minimax.io/docs/faq/models.md) |
| `minimax-cn`·`minimax-portal-cn` 의 Preview | 같음 | 같음. `max` 단계도 같이: 오늘 `xhigh` 가 나가던 것이 `max` 로 나간다 | 같음(설계가 받아들인 `-cn` 변화) |
| `nvidia` 5(`nemotron-3-super-120b-a12b`, `minimaxai/minimax-m3`, `moonshotai/kimi-k2.5`, `minimaxai/minimax-m2.5`, `z-ai/glm5`) | 플러그인 표 행(reasoning false) | 같은 값의 퇴역 행, Effort 없음(off 만). 실측 변화 0(설계 I3g R4) | 규칙 없음, 공식 근거 없음. `reasoning: false` 는 Agent 플러그인 표 값(clawpod-agent `5ae2c04979` `extensions/nvidia/provider-catalog.ts`). 생성기는 `reasoning: true` 행에만 단계를 채운다 |
| `nvidia/moonshotai/kimi-k3`, `nvidia/z-ai/glm-5.2` | 중첩 id 로 안쪽 catalog 행을 빌림 | 같음(행을 넣지 않음) | 위 I3g 표 |

## 판단과 한계

- 근거 없음 → 키 삭제는 "공식 값"이 아니라 "Agent 기본값으로 돌림"이다. 근거가 생기면 같은 `overrides`로 넣는다.
- 설계와 다르게 한 것: Baseten Nemotron 3 Ultra 기본 off(문서), `opencode-go/deepseek-v4.1-flash` strict false 유지(목록에 있음), `mistral`은 ID 셋 대신 `mistral/*`(그 키가 있는 행은 셋뿐이라 결과 같음).
- 재생성 원본은 publish run 44993939201의 artifact(main `526db9d`와 같은 `sourceGeneratedAt` 1795329111410). `providers=58->60 models=2252->2271 (+19)`. main 대비: 추가 19행, 빠짐 0, 바뀜 85행(위 규칙의 칸뿐).
- `npm run audit` open 0 → 0. cost known 128 → 132(`minimax-cn` knownGaps 2, `minimax-portal-cn` 구독 2).
- "matches nothing": 새 규칙 33개 모두 행에 걸림. 아무 행에도 안 걸리는 기존 규칙 3개는 main과 같다.
- 생성기·audit 스크립트를 바꿨다. 브랜치 dry-run 결과는 PR에 적는다.

# 2026-11-22 Agent 이름 규칙을 catalog 사실로 옮김, OpenCode Effort 공식 대조, NVIDIA 퇴역 2행 (ClawPoD Agent 3차 I3h)

ClawPoD Agent가 플러그인·코어에서 모델 이름으로 정하던 thinking·요청 사실(적응형 여부, effort 지원, 출력 상한, 단계를 무엇으로 보내는지)을 catalog 행으로 옮긴다. Agent는 이 게시본을 받은 뒤 이름 규칙을 지운다. 설계: clawpod-agent 보고서 `S3I3H-DESIGN.md`(R2·R1+·R1++), 리뷰 `S3I3H-DESIGN-REVIEW.md` 재검토 R-L5·R-L6.

## 생성기

- `thinking` 규칙에 `map` 칸(선택). 키는 Pi `thinkingLevelMap`의 7개(`off`…`max`, `adaptive`·`ultra` 없음), 값은 문자열 또는 `null`, 빈 `map` 거부. `applyThinking`이 단계 거르기 **뒤에** 행 `thinkingLevelMap`에 키 단위로 덮어쓴다(상류 키는 남음, 상류 값이 객체가 아니면 버림). 그래서 규칙이 `null`로 둔 단계도 목록에 남는다.
- 검증: 게시본 2273행의 `compat`·`thinkingLevelMap`을 Agent 저장소의 Pi `ProviderCompatSchema`·`ThinkingLevelMapSchema`(typebox Compile)로 검사, 실패 0.

## 옮긴 사실

| 규칙 | 행 | 근거 |
| --- | --- | --- |
| `overrides` `*` 10: `claude-opus-4-6*`·`-4-7*`·`-4-8*`·`claude-opus-5*`·`claude-sonnet-4-6*`·`claude-sonnet-5*`·`claude-haiku-5-5*`·`claude-fable-5*`·`claude-mythos-5*`·`claude-mythos-preview*` → `compat.forceAdaptiveThinking: true` | 181(Anthropic Messages 전송만 읽음, 다른 전송은 칸만) | 예산형 `budget_tokens`는 4.7 이후 400, 4.6 deprecated (https://platform.claude.com/docs/en/build-with-claude/thinking-troubleshooting), 켜짐 방식은 adaptive (https://platform.claude.com/docs/en/build-with-claude/thinking) |
| `overrides` MiniMax 8: `minimax`·`minimax-cn`·`minimax-portal`·`minimax-portal-cn` × `MiniMax-M3`·`MiniMax-M3.1-Flash-Preview` → `forceAdaptiveThinking: true` | 8 | "Thinking is off by default for `MiniMax-M3` and can be enabled with `adaptive`", M3.1-Flash "always thinks and returns `400` if `disabled` is sent" (https://platform.minimax.io/docs/api-reference/text-anthropic-api) |
| `thinking` `anthropic`·`anthropic-vertex` `claude-sonnet-5-5*`, `amazon-bedrock-mantle` `anthropic.claude-sonnet-5-5*`: `*` 규칙과 같은 단계·기본 + `map {off: null}` | 3 | Sonnet 5.5는 `thinking: {type: "disabled"}`를 모든 effort에서 400 (https://platform.claude.com/docs/en/build-with-claude/thinking-troubleshooting). `off`는 화면에 남고 요청에 thinking 칸이 없다 |
| `thinking` `xai` `grok-4.20`·`grok-4.20-0309-reasoning`·`grok-build*`(새 3)과 기존 `grok-4-0709`: `["low"]` on + `map {low: null}` | 4 | effort는 grok-4.3·4.5 이상만, 나머지는 끌 수도 조절할 수도 없음 (https://docs.x.ai/docs/guides/reasoning) |
| `overrides` `mistral` 6: `mistral-small-latest`·`mistral-small-2603`·`mistral-medium-3-5`·`mistral-large-4`·`zai-glm-5-3`·`zai-glm-5-3-flash` → `supportsReasoningEffort: true` | 6 | https://docs.mistral.ai/capabilities/reasoning/ (`small-latest`은 Agent가 참으로 두던 별칭) |
| `overrides` `mistral` 6: `ministral-3b/8b/14b-2512`·`mistral-large-2512`·`mistral-medium-2604` → `maxTokens` 8192, `mistral-medium-latest` → 16384 | 6 | **공식 값 아님.** Mistral은 최대 출력을 공개하지 않고 "Token counts include both input and output tokens"(https://docs.mistral.ai/getting-started/models/known-limitations) 라 `maxTokens` = 창은 틀림. 값은 Agent가 오늘 보내는 값(`src/config/defaults.ts` mistral 표) |
| `overrides` `kilocode` 4: `kilo/auto`·`x-ai/grok-4.20`·`-reasoning`·`-reasoning-beta` → `supportsReasoningEffort: false` | 4 | 위 xAI, 라우터 별칭은 https://openrouter.ai/docs/use-cases/reasoning-tokens |
| `thinking` OpenCode Gemini 4(`opencode` 3.7/3.8 Flash·4 Argon, `opencode-go` 4 Argon) `map {minimal: "low"}` | 4 | minimal "Not supported on Gemini 4 models or gemini-3.8-flash", 3.7 Flash low/medium/high (https://aistudio.google.com/docs/thinking). 저장된 `minimal`이 거부되는 `MINIMAL` 대신 `LOW`로 나간다 |

- MiniMax M3 `xhigh:"high"` 변환표는 넣지 않았다(출처 없음, 설계 D1·R2.4). R1++: M3는 effort 칸을 무시한다("Other models ignore this field") — 바이트만 바뀌고 동작은 같다.
- 기존 `*` `minimax-m3-1-flash*` 규칙이 퇴역 Preview 행에 이미 걸려 있어 K9는 데이터 변경 없음.
- Kimi K3: 행 `map` 실험은 채택하지 않았다(설계 5.5). MAINTAINING 9장 "카탈로그 후속"에 남겼다.

## OpenCode Zen·Go Effort 공식 대조 (모델 API 2026-11-22 원문)

규칙(오케스트레이터 R1++): `capabilities.reasoning.effort`가 있으면 그 단계(`none`→`off`), `toggle`이면 `off` 추가. `effort` 없이 `toggle`만 있으면 `off`·`adaptive`(budget만 함께 있는 qwen3.5/3.6/3.7-plus 포함). 기본 단계(오케스트레이터 결정, 근거 없는 기본값 변경 금지, 리뷰 L2로 순서 정정): (b) API `reasoning.default`가 있으면 그 값 → (a) 지금 catalog 기본값이 새 목록 안이면 그대로 → (c) 제조사 공식 기본(`*` 규칙·제조사 문서, URL) → (d) 목록 안에서 지금 기본값과 가장 가까운 단계(기록). 출처: https://opencode.ai/zen/v1/models (= `/inference/v1/models`, 같은 바이트), https://opencode.ai/inference/go/v1/models .

- 바꾼 규칙 81: 보존 규칙 79를 공식 단계로 고치고, 상류 행 2(`opencode/claude-opus-5` off 뺌, `opencode/kimi-k3` off 더함)에 새 규칙. 행별 전후는 각 규칙 `note`와 아래 요약.
  - 단계: Claude는 effort 목록 그대로(`toggle`이 있는 `claude-haiku-5-5`만 `off`), GPT·Grok·Gemini·DeepSeek·GLM·Qwen·Muse·Hy4·LongCat·Kimi K3.1 Pro·Step·Beam·Nemotron·Flint도 API effort/toggle 그대로.
  - 기본: 67행은 (a)로 지금 기본값을 지킨다(대부분 보존 프로필의 `low`, 상류 `claude-opus-5` high·`kimi-k3` max). 바뀌는 것은 **14행**: (b) 1행(`opencode-go/kimi-k3.1-pro`, API `default` max), (c) 12행, 오케스트레이터 결정 1행(`opencode-go/minimax-m3`). (d)에 걸린 행은 없다.

| 행 | 기본 전 → 후 | 근거(c: 제조사 공식 기본) |
| --- | --- | --- |
| `opencode/qwen3.5-plus`, `opencode/qwen3.6-plus`, `opencode-go/qwen3.7-plus` | low → adaptive | 목록 off/adaptive. Qwen `enable_thinking` 기본 true (https://docs.qwencloud.com/developer-guides/text-generation/thinking) |
| `opencode-go/longcat-2.0` | low → adaptive | 목록 off/adaptive. 템플릿 `enable_thinking` 기본 true (https://huggingface.co/meituan-longcat/LongCat-2.0) |
| `opencode/longcat-2.5-free`, `opencode-go/longcat-2.5-free` | low → off | 목록 off/adaptive. `*` `longcat-2-5*` 규칙: 템플릿 `enable_thinking` 기본 false (https://huggingface.co/meituan-longcat/LongCat-2.5) |
| `opencode-go/kimi-k3.1-pro` | low → max | (b) Go 모델 API `reasoning.default` `{"type":"effort","value":"max"}` (https://opencode.ai/inference/go/v1/models) |
| `opencode-go/minimax-m3` | low → adaptive | **공식 기본값 아님.** 이 행은 Anthropic Messages로 돌고, 그 경로에서 MiniMax-M3는 생략 시 thinking off다(https://platform.minimax.io/docs/api-reference/text-anthropic-api). 오늘의 thinking-on 동작을 유지하려고 오케스트레이터가 adaptive로 결정. 같은 이유로 `overrides`에 `forceAdaptiveThinking: true`(M3 `thinking.type`은 `disabled`/`adaptive`만 받음, 없으면 켰을 때 예산형으로 나갈 수 있음, K3 MiniMax 규칙과 같은 근거) |
| `opencode/deepseek-v4-pro` | low → high | 목록 off/high/max. `*` `deepseek-v4-pro*` 규칙 (https://api-docs.deepseek.com/api/create-chat-completion) |
| `opencode/mistral-large-4` | low → high | 목록 off/high. `*` `mistral-large-4*` 규칙 (https://docs.mistral.ai/inference/conversations/reasoning) |
| `opencode/gpt-5.4-pro` | low → medium | 목록 medium/high/xhigh. `*` `gpt-5-4-pro*` 규칙 (https://developers.openai.com/api/docs/models/gpt-5.4-pro) |
| `opencode/gpt-5.5-pro` | low → high | 목록 medium/high/xhigh. `*` `gpt-5-5-pro*` 규칙 (https://developers.openai.com/api/docs/models/gpt-5.5-pro) |
| `opencode-go/hy4`, `opencode-go/hy4-preview` | low → high | 목록 off/high. `*` `hy4*` 규칙 (https://www.tencentcloud.com/document/product/1300/80637) |
- 공식끼리 어긋남(OpenCode를 따름): Zen `kimi-k3` toggle(Moonshot "K3 always thinks"), Zen `mistral-large-4` effort `none`·`high`(Mistral "Large 4 does not accept `none`"). OpenCode가 그 엔드포인트의 계약을 낸 쪽이라 따랐다. 요청 확인 수단이 생기면 다시 본다.
- 그대로 둔 보존 규칙 12(effort·toggle 둘 다 없어 규칙이 단계를 주지 않음): Zen `claude-haiku-4-5`·`claude-sonnet-4-5`(budget만), `iceman-free`, `kimi-k2.7-code`, `mimo-v2.6-flash-free`, `minimax-m2.5`, `minimax-m2.7`, `nemotron-3.5-lightning-free`, `grok-build-0.1`, Go `iceman-contributor-free`, `mimo-v2.6-flash`, `mimo-v2.6-pro`. 상류 `opencode/big-pickle`은 단계 없음 그대로.
- 목록에 없는 상류 퇴역 행(`opencode-go/deepseek-v4-flash`·`kimi-k2.6`)은 대조 대상 밖.
- `tools.strict`: 이 값은 `capabilities.tools`가 아니라 `api.<경로>.capabilities.tools.strict`에 있다. chat-completions 행 중 `strict: true`인데 catalog에 없던 8행에 `supportsStrictMode: true`(I3e와 같은 규칙): Zen `mimo-v2.6-flash-free`·`kimi-k2.7-code`·`mistral-large-4`·`beam-free`, Go `mimo-v2.6-flash`·`mimo-v2.6-pro`·`beam-free`·`kimi-k3.1-pro`. messages·responses 경로 행의 strict는 Pi 기본이 API마다 달라 이번에 넣지 않았다.

## NVIDIA 퇴역 2행 (리뷰 R-L5)

| ID | 값 | 근거 |
| --- | --- | --- |
| `nvidia/moonshotai/kimi-k3` | `moonshot/kimi-k3` 행의 `name`·`input`·`reasoning`·`contextWindow`·`maxTokens` + 단계 `max`/기본 `max`(정확한 ID `thinking` 규칙, 없으면 `*` `kimi-k3*`가 low/high/max를 줌), `deprecated` | 공개 목록 https://integrate.api.nvidia.com/v1/models (2026-11-22, 33 ID)에 없음, 공식 퇴역 공지·대체 모델 없음 → `replacedBy` 없음 |
| `nvidia/z-ai/glm-5.2` | `zai/glm-5.2` 행의 같은 칸, 단계는 기존 `*` `glm-5-2` 규칙(off/high/max, 기본 max, 안쪽 행과 같음), `deprecated` | 같음 |

- 요청 compat·`thinkingLevelMap`은 넣지 않았다. 리뷰 실측(`trees/rv2-nv`): 사실 칸만 넣으면 설정 경로 요청 변화 0, `/model` 경로도 해석된다. 2026-11-22 I3g 절의 "행 없음" 판단(34d07b6)을 이 절이 대신한다.
- 가격은 넣지 않았다. Moonshot·Z.ai 단가는 NVIDIA 가격이 아니다(오케스트레이터 결정, 설계 R-L5의 `cost` 칸을 뺌). 다른 NVIDIA 퇴역 행과 같다.

## 판단과 한계

- 후속: `mistral/mistral-large-4-0-8`·`mistral-large-latest`도 effort 단계(low/medium/high)가 있지만 `supportsReasoningEffort` 표시가 없다(K5는 Agent 플러그인이 다루던 6 ID만). Mistral reasoning 문서로 두 ID가 `reasoning_effort`를 받는지 확인한 뒤 같은 `overrides`로 넣는다.
- 공식 값이 아닌 것: Mistral `maxTokens` 6(오늘 값), `opencode-go/minimax-m3` 기본 adaptive, OpenCode 67행의 기본 단계(지금 값 유지, 대부분 보존 프로필의 low), NVIDIA `kimi-k3` 단계(안쪽 행 사본), OpenCode 보존 규칙 12.
- 재생성 원본: publish run 45001361401 artifact(main `53832bd`와 같은 `sourceGeneratedAt` 1795335017306). `providers=60 (+0/-0) models=2271->2273 (+2)`. main 대비 추가 2, 빠짐 0, 바뀜 281행(위 규칙의 칸뿐: `forceAdaptiveThinking` 190, OpenCode 단계 81(그중 기본값 변경 14), `opencode-go/minimax-m3` `forceAdaptiveThinking`, `thinkingLevelMap` 11, `supportsReasoningEffort` 10, `supportsStrictMode` 8, `maxTokens` 6. 한 행이 여러 칸).
- `npm run audit` open 0 → 0. "matches nothing" 3개는 main과 같은 기존 규칙.
- 요청 확인: 이 저장소는 요청을 보내지 않는다. Agent 쪽 요청 변화 실측은 설계 R2.2 하네스(OpenCode 대조분은 그 측정 밖 — Agent H0 때 같은 하네스로 잰다).

# 2026-11-23 목록 밖 단계 교정 (ClawPoD Agent 3차 I5)

Agent가 카탈로그 목록에 없는 단계를 실행 지도에서 `null`로 두도록 고치기 전에(Agent 설계 S3I5), Pi 칸이 가려 주던 목록 오류 8행을 공식 문서로 고쳤다. 생성기 한 줄(G1)이 함께 들어간다.

## 생성기 G1 (`scripts/thinking.mjs` `applyThinking`)

| 항목 | 내용 |
| --- | --- |
| 바꾼 것 | 단계 거르기에서, 첫 일치 규칙의 `map`이 그 단계에 문자열을 적었으면 상류 `thinkingLevelMap`의 `null`로 거르지 않는다 |
| 왜 | Moonshot K3·daybreak-blue 행은 상류 행 지도의 `null`이 공식 단계를 걸렀고, 규칙 `map`은 거른 뒤에 쓰여 어떤 규칙으로도 되살릴 수 없었다. `overrides.set`은 `thinkingLevelMap`을 받지 않는다(strict) |
| 지켜지는 것 | 규칙 `null`(Sonnet 5.5 `off`, xAI `low`)은 그대로 목록에 남는다. `map`이 없는 규칙과 상류 `null`만 있는 단계는 지금과 같다 |
| 기존 데이터 영향 | 0행(기존 규칙 395개의 문자열 `map`은 OpenCode Gemini `minimal:"low"` 4개뿐이고 `minimal`이 그 규칙 목록에 없다) |
| 테스트 | `tests/thinking.test.mjs` "a rule map string lifts the upstream null…" (고치기 전 실패 확인) |

## 바꾼 규칙과 근거

| # | 행 | 규칙 | 결과 | 공식 근거 |
| --- | --- | --- | --- | --- |
| C1 | `moonshot/kimi-k3`, `kimi-k3.1-pro`, `kimi-k3.1-pro-highspeed` | `thinking` `moonshot` `kimi-k3*`: low/high/max, 기본 max, `map {low:"low", high:"high"}` | 목록 `["max"]` → `["low","high","max"]`, 지도 `low`·`high`가 `null`에서 제 값으로 | K3 열 "applies to `kimi-k3`, `kimi-k3.1-pro`, and `kimi-k3.1-pro-highspeed`", "supports `\"low\"`, `\"high\"`, and `\"max\"` (default `\"max\"`)", `thinking` "Not supported", "K3 always reasons" (https://platform.kimi.ai/docs/api/models-overview) |
| O1 | 같은 3행 | `overrides` `set.compat.supportedReasoningEfforts: null` | `["max"]` 지움. `thinkingRequired: true`는 공식("always reasons")과 맞아 둠 | 같음. 런타임 사용처 0, `set.compat`은 배열을 받지 않아 지운다 |
| C2 | `qwen-token-plan/glm-5`, `glm-5.1` | `thinking` 정확한 ID 2개: off/high, 기본 high, `labels {high:"on"}` | `["off","low"]`·기본 low·`{low:"on"}` → `["off","high"]`·기본 high·`{high:"on"}` | 두 모델: `enable_thinking` 기본 true, `false`로 끔. glm-5.1만: `reasoning_effort` none~xhigh "(highest, max is not supported)"(effort 표에 glm-5는 없음) (https://www.alibabacloud.com/help/en/model-studio/glm), "thinking mode enabled by default: … glm-5.1, glm-5" (https://www.alibabacloud.com/help/en/model-studio/deep-thinking), Token Plan 모델 목록 (https://www.alibabacloud.com/help/en/model-studio/token-plan-team-overview) |
| C3 | `openai/gpt-daybreak-blue-latest` | `thinking` 정확한 ID: off/low/medium/high/xhigh/max, 기본 low, `map {off:"none"}` | `off` 추가, 지도 `off: null` → `"none"`, 기본 없음 → `low` | "Default snapshot: `gpt-5.6-sol`", Deprecated (https://developers.openai.com/api/docs/models/gpt-daybreak-blue-latest), "Reasoning.effort supports: none, low, medium (default), high, xhigh, and max" (https://developers.openai.com/api/docs/models/gpt-5.6-sol). 같은 모양의 `gpt-daybreak-red-latest` 행과 맞음 |
| O2 | 같은 행 | `overrides` `set.compat.supportedReasoningEfforts: null` | `none` 없는 낡은 목록 지움 | O1과 같은 이유 |
| C4 | `baseten/moonshotai/Kimi-K3` | `thinking` 정확한 ID: off/low/high/max, 기본 max | `off` 추가 | Kimi K3 "`none`, `low`, `high`, `max` (default)", "`none` turns reasoning off on every model whose row lists it" (https://docs.baseten.co/inference/model-apis/reasoning) |
| C5 | `baseten/openai/gpt-oss-120b` | `thinking` 정확한 ID: off/minimal/low/medium/high, 기본 medium | `off`·`minimal` 추가 | "`none`, `minimal`, `low`, `medium` (default), `high`, `xhigh`, `max`", "`none` can still reason" (같은 문서). `xhigh`·`max`는 넣지 않음: gpt-oss 본래 단계는 low/medium/high(https://developers.openai.com/api/docs/models/gpt-oss-120b, `*` `gpt-oss*` 규칙)이고 오늘 그 저장 값은 `high`로 돈다 |
| — | `openai/gpt-5.3-codex` | 바꾸지 않음 | `["low","medium","high","xhigh"]` 그대로 | "supports `low`, `medium`, `high`, and `xhigh`" (https://developers.openai.com/api/docs/models/gpt-5.3-codex), `none` 없음 |

- 새 provider 규칙 6개는 첫 `*` 규칙(`claude-opus-5-5*`) 앞에 넣었다. 각 행의 첫 일치 규칙이다(테스트가 확인).
- 손대지 않은 것: `nvidia/moonshotai/kimi-k3` 규칙의 단계(퇴역 행, `max` 하나). 바꾸면 그 경로의 요청이 바뀐다(MAINTAINING 9장 F3). C1 뒤 거짓이 된 note("copies the published moonshot/kimi-k3 row")만 "I3h 때 안쪽 행 사본인 `max` 하나를 지킨다"로 고쳤다(데이터 변화 0). `opencode-go/kimi-k3` `["max"]`는 그 호스트의 공식 목록이라 그대로.
- 테스트 "NVIDIA kimi-k3 and glm-5.2 retired rows copy the inner rows' facts"는 kimi-k3의 단계 칸만 안쪽 행 대신 그 규칙이 고정한 `max`/`max`와 비교하도록 고쳤다(나머지 사실 칸 비교는 그대로).

## 생성 결과 (main `b188305` 게시본 대비)

재생성 원본: publish run 45054766206 artifact(`sourceGeneratedAt` 1795371934415, `sourceCommit` 5b68403, main과 같음). `providers=60 (+0/-0) models=2275->2275 (+0)`. 바뀐 행은 정확히 8개, 추가·삭제 0.

| 행 | 바뀐 칸 |
| --- | --- |
| `moonshot/kimi-k3`, `kimi-k3.1-pro`, `kimi-k3.1-pro-highspeed` | `thinkingLevels` `["max"]` → `["low","high","max"]`, `thinkingLevelMap.low`·`.high` `null` → `"low"`·`"high"`, `supportedReasoningEfforts` 지움 |
| `qwen-token-plan/glm-5`, `glm-5.1` | `thinkingLevels` `["off","low"]` → `["off","high"]`, 기본 `low` → `high`, 라벨 `{low:"on"}` → `{high:"on"}` |
| `openai/gpt-daybreak-blue-latest` | `thinkingLevels`에 `off` 추가, `thinkingLevelMap.off` `null` → `"none"`, 기본 없음 → `low`, `supportedReasoningEfforts` 지움 |
| `baseten/moonshotai/Kimi-K3` | `thinkingLevels` `["low","high","max"]` → `["off","low","high","max"]` |
| `baseten/openai/gpt-oss-120b` | `thinkingLevels` `["low","medium","high"]` → `["off","minimal","low","medium","high"]` |

## 판단과 한계

- 공식 값이 아닌 것: daybreak-blue 기본 `low`(스냅샷 공식 기본은 `medium`). 행에 기본이 없어 Agent가 일반 대체값 `low`로 돌던 퇴역 별칭이라 오늘 값을 지켰다(MAINTAINING 9장 "Not the official default").
- 관례와 다른 것: glm-5·5.1 켜짐 단계가 `low`가 아니라 `high`다. Agent Pi 행이 `low:null`이라 목록의 `low`가 그 경로에서 돌지 못하고, `high`는 오늘 보내는 값이다(MAINTAINING 5장). 공식 근거는 모델마다 다르다: glm-5.1은 effort 표가 `low`·`high`를 받고 `max`를 받지 않는다. glm-5는 effort 표에 없어 공식 effort 목록이 없다(thinking 기본 켜짐만 확인). 공식이 glm-5 effort를 적으면 그 규칙만 고친다.
- 관례와 다른 것: `baseten/openai/gpt-oss-120b`의 `off`는 완전한 끄기가 아니다. Baseten은 "`none` can still reason", "OpenAI GPT 120B can return `reasoning_content` with `none`"이라고 적는다. MAINTAINING 5장 "`off`는 실제로 끌 수 있을 때만"의 예외로, 오늘 요청 `none`을 지키려고 남겼다(MAINTAINING 9장).
- 캐시(Agent 쪽): glm-5·5.1 기본값 변경으로 저장 단계 없는 세션의 Runtime 줄 `thinking=`이 한 번 바뀐다. 직접 Moonshot K3에 `max` 밖 단계를 저장한 세션은 요청 단계가 공식대로 바뀌어 Moonshot 접두 캐시를 한 번 놓친다("Switching levels invalidates prefix-cache hits"). 턴마다 바뀌는 값은 없다.
- `qwen-token-plan` GLM의 `off`는 Agent 전송이 `enable_thinking: false`를 보내지 않아 실제로 끄지 못한다(Agent 후속 F2, 이 저장소 범위 밖).
- 검증: `npm test` 통과, `npm run audit` open 1 → 1(main에도 있는 `openrouter/~deepseek/deepseek-pro-latest` cacheRead > input), "matches nothing" 3개는 main과 같음, thinking profiles 1721/1787(main과 같음), Pi 스키마(`ProviderCompatSchema`·`ThinkingLevelMapSchema`) 2275행 실패 0.

# 2026-11-23 항상 켜진 xAI 행의 effort 칸 표기 (ClawPoD Agent 3차 I6)

xAI 직결 항상 켜짐 4행은 "추론하지만 effort 칸은 보내지 않음"을 규칙 `map {low: null}`로 적어 왔다(I3h). `null`은 "고를 수 없는 단계"라서 Agent 화면이 목록 밖 `off`를 보였다. 같은 뜻의 기존 키 `compat.supportsReasoningEffort: false`(Kilo Gateway Grok 4.20 행이 이미 씀)로 바꾼다. Agent가 Responses 경로에서 이 키를 읽게 하는 코드는 Agent 쪽 같은 묶음이다(설계 S3I6).

## 바꾼 규칙과 근거

| # | 자리 | 바꾼 것 | 근거 |
| --- | --- | --- | --- |
| C1~C4 | `thinking` `xai` `grok-4-0709`, `grok-4.20`, `grok-4.20-0309-reasoning`, `grok-build*` | `map {low: null}` 삭제, note를 "Always on, no effort control; the route takes no effort field"로 | "`grok-4.7`, `grok-4.6`, and `grok-4.5` support the `reasoning_effort` parameter", "Reasoning cannot be disabled." (https://docs.x.ai/docs/guides/reasoning), "Reasoning: Yes" (https://docs.x.ai/developers/models/grok-4.20) |
| O1·O2 | `overrides` `xai` `grok-4.20`, `grok-4.20-0309-reasoning` | `set.compat.supportsReasoningEffort: false` | 위 reasoning 가이드. Kilo 행과 같은 패턴 |
| O3 | `overrides` `xai` `grok-4-0709` | 같음 | "`grok-4-0709` → `grok-4.3` with `low` reasoning effort" (https://docs.x.ai/developers/migration/may-15-retirement) |
| O4 | `overrides` `xai` `grok-build*`(규칙 C4와 같은 패턴) | 같음. **F1 전까지 임시 값** | https://docs.x.ai/developers/models/grok-build-0.1 은 effort `low, medium, high, xhigh`, 기본 `high`를 적는다. 오늘 요청(칸 없음 = xAI 기본 `high`)을 지킨다 |
| O5 | `overrides` `opencode` `grok-build-0.1` | `set.compat.supportsReasoningEffort: true`. **F1 전까지 임시 값** | 같은 페이지. Agent Pi 행의 `false`는 어떤 Responses 직렬화기도 읽지 않았고 오늘 effort `high`가 나간다. Agent가 Responses에서 키를 읽게 된 뒤에도 그 요청을 지킨다 |

- 문서: `sources/README.md` `null` 설명("고를 수 없는 단계에만, 칸을 받지 않는 경로는 `supportsReasoningEffort: false`"), `MAINTAINING.md` 5장 항상 켜짐 줄, 9장 F1 행.
- 원문에 "보내면 거절"은 없다. 그래서 칸을 보내지 않는 오늘 요청을 지킨다.

## 생성 결과 (main `2bf5021` 게시본 대비)

재생성 원본: publish run 45090583867 artifact(`sourceGeneratedAt` 1795394845329, `sourceCommit` 461b02a, main과 같음). `providers=60 (+0/-0) models=2275->2275 (+0)`. 바뀐 행 정확히 5, 추가·삭제 0.

| 행 | 바뀐 칸 |
| --- | --- |
| `xai/grok-4.20`, `grok-4.20-0309-reasoning`, `grok-4-0709`, `grok-build-0.1` | `thinkingLevelMap {low: null}` 지움, `compat.supportsReasoningEffort: false` 추가. 목록 `["low"]`·라벨 `{low:"on"}`·기본 `low` 그대로 |
| `opencode/grok-build-0.1` | `compat.supportsReasoningEffort: true` 추가 |

- Agent 설계·리뷰의 흉내 스냅샷(`/tmp/claude-1000/n1/fix5`, `/tmp/claude-1000/n1-review/fix5`)과 대조: 바뀐 행 집합이 같고, 다섯 행의 값(가격 뺀 행 전체)이 같다. `compat` 안 키 순서만 다르다(실제 출력은 `overrides`가 `thinking`보다 먼저 돌아 `supportsReasoningEffort`가 앞이나 중간에 온다).

## 판단과 한계

- 임시 값: O4·O5와 `xai`/`grok-build*` 규칙은 공식 Grok Build 단계(F1)를 적용하기 전까지 오늘 요청을 지키는 값이다(MAINTAINING 9장).
- 후속(Agent 쪽, 이 저장소 범위 밖): F2 OpenRouter `x-ai/grok-4.20`·`x-ai/grok-build-0.1`은 effort `low`를 보냄, F3 Venice 요약 `reasoning_effort: low`, F4 Vercel `spacexai/grok-4.20-reasoning(-beta)` 예산, F6 `opencode/grok-build-0.1` cold·warm 표시 차이(F1과 함께), F7 one-off 호출.
- 검증: `npm test` 통과, `npm run audit` open 1 → 1(main에도 있는 `openrouter/~deepseek/deepseek-pro-latest`), "matches nothing" 3개 = main, thinking profiles 1721/1787 = main, Pi 스키마 2275행 실패 0.
