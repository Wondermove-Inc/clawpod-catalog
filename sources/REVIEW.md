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
