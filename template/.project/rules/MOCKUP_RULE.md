# MOCKUP_RULE

> 본 파일은 taskery 시스템 권장 UX/UI 구현 task의 HTML 목업 정책이다.
> 우선순위: **이 파일** (`.project/rules/MOCKUP_RULE.md`) → 메인 판단.
> 프로젝트별 변형이 필요하면 `.project/rules/MOCKUP_RULE.local.md` 생성 (npx update 미터치).

---

## 1. 목적

UX/UI 구현 task의 *시각 영역 사전 정합* + *task-test 시 USER 검수 기준 확보*. stash FRICTION_LOG #14+19 반영 — UX/UI 검증의 시각 fix 사이클 반복 마찰 사전 차단.

**효과**:
- 사용자가 *눈으로 보고* 의도 확인 → 인지 불일치 사전 차단
- 메인이 *시각 기준* 확보 → 구현 시 디자인 정합 검증 기준
- task-test USER 시각 시나리오의 *기준 파일* 역할

---

## 2. 적용 대상 task

**적용**:
- UX/UI 구현 포함 task (페이지 / 컴포넌트 신규 / 시각 변경 / 인터랙션 신규)
- `/task-plan` Step 2 Requirements 인터뷰 결과로 *UX/UI 구현 포함* 판단되면 Step 4.5 목업 프로세스 진입

**미적용**:
- 백엔드 / CLI / 인프라 / 설정 변경 등 시각 영역 없는 task
- UX/UI 포함이지만 사용자가 *"NO"* 응답한 task (Step 4.5에서 confirm)

---

## 3. 파일 위치 / 네이밍

- **경로**: `.project/tasks/<vX.X>/mockup/<task-doc-name>-mockup.html`
- **네이밍**: task 문서 파일명 + `-mockup.html`
  - 예 1: `001_login-form.md` → `001_login-form-mockup.html`
  - 예 2: 폴더 승격 `TASK-007_payment-flow/task.md` → `TASK-007_payment-flow-mockup.html`
- **task 1개 = 목업 1개** — multi-file 예외 영구 X. 복잡해도 한 파일 안 섹션 분리 (`<section id="popover">` 등)

---

## 4. 파일 형식

- 정적 HTML (외부 라이브러리 X)
- 단일 파일 안 inline `<style>` + 필요 시 vanilla `<script>`
- 시각 영역 (레이아웃 / 색상 / 간격 / 타이포 / 호버 효과) 본질 표현
- 인터랙션 가능 범위 (클릭 / 호버 시뮬) — 구현 정확도 ↑

---

## 5. 생성 흐름 (`/task-plan` Step 4.5 정합)

1. UX/UI 구현 task 판단 (Step 2 Requirements 인터뷰 결과)
2. 사용자에게 *"HTML 목업 만들까?"* 한 줄 confirm — **예외 없이 발화 강제**. 메인의 효용 판단(*"이 케이스는 목업 효용 낮음"* / *"SF Symbol은 HTML 재현 X"* 등)으로 confirm 자체를 생략하는 행위 영구 금지. 효용 판단은 질문에 *곁들이는 의견*으로만 가능 (생략 결정 대체 X — 목업 제작 여부는 *사용자 검수 방식 선택권*이라 *개발 자율 판단* 영역 X).
3. OK → 메인이 정적 HTML 생성 → 사용자 시각 승인 (✓ → 진행 / ✗ → 수정 재승인)
4. 승인된 목업 = task-test의 *시각 영역 USER 검수 기준*

---

## 6. 두 시점 활용

| 시점 | 활용 |
|------|------|
| `/task-dev` | 메인이 *직접 Read* (sub-agent 위임 X) 후 구현. 구현 = 목업 기준 (역방향 X — 코드 편의로 목업 어김 절대 X) |
| `/task-test` | 격리 세션 prompt에서 *목업 파일 정독 후 시각 USER 시나리오 기준*으로 사용. 자동 비교 X. 사용자 검수 보고 시 *체크리스트 + 목업 경로 명시* |

---

## 7. 시각 fix 사이클 사전 예고

시각 영역은 한 사이클로 100% 일치 보장 X. `/task-plan` Test Plan 작성 시 + `/task-test` 결과 보고 시 *"fix 사이클 1~2회 예상"* 사용자 안내 (기대치 사전 정렬, 부정 반응 누적 방지).

---

## 8. 디자인 산출 정독 의무

목업 = 디자인 산출. 메인이 *직접 Read* 후 구현 (sub-agent 위임 X — 요약만 받아 시각 정합 깨짐 함정 회피). stash FRICTION_LOG #12 일반화.

---

## 9. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-30 | 신규 작성 — UX/UI task HTML 목업 위치 / 형식 / 생성 흐름 / 두 시점 활용 / 시각 fix 사이클 예고 / 디자인 정독 의무 정의 (stash FRICTION_LOG #14+19 / #12 반영) |
| 2026-06-02 | §5 #2 — 목업 confirm *예외 없이 발화 강제* 명시 추가 (메인 효용 판단으로 confirm 자체 생략 금지). stash FRICTION_LOG 2026-06-01 F1 반영 |
