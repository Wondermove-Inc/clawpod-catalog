# clawpod-catalog

ClawPoD Agent가 모델별 값의 SOT로 읽는 `models/v1/catalog.json`을 만드는 저장소입니다.

**catalog 데이터를 조사하거나 바꾸기 전에 반드시 [MAINTAINING.md](MAINTAINING.md)를 처음부터 끝까지 읽으세요.**
판단 기준(가격·한도·reasoning·Thinking Effort·상태), 수동 파일 작성법, 재생성·검증·PR 절차, 장애 대응, 열린 결정 목록이 모두 거기에 있습니다.

꼭 지킬 것:
- `models/v1/catalog.json`은 손으로 고치지 않습니다. `sources/clawpod-providers.json`을 고치고 재생성합니다.
- 모든 수동 값은 공식 문서 근거(`source` URL)가 있어야 합니다. 모르면 0이 아니라 비웁니다.
- 작업 기록은 `sources/REVIEW.md`에 날짜 절로 남깁니다.
- 브랜치를 따서 작업하고 PR로 올립니다. `npm test`는 모두 통과해야 하고, `npm run audit`의 open 항목은 작업 전보다 늘면 안 됩니다(audit는 항상 종료 코드 0이라 숫자를 직접 비교합니다).

자주 쓰는 명령:
```bash
npm test                     # 테스트
npm run audit                # catalog 전수 검사 (open 항목이 처리 대상)
npm run candidates           # 수동 provider 신모델 후보 (models.dev, Codex 페이지)
```
