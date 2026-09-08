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
