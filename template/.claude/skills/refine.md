---
description: 회고 메타 — FRICTION_LOG 정독 + 반복 패턴 감지 + bottoms-up 보강 제안 (PLAYBOOK 부활 / 새 룰)
---

# /refine

## 개요

5 task마다 또는 사용자 호출 시 메인이 `.project/FRICTION_LOG.md`를 정독해 *반복 패턴 감지* + *bottoms-up 보강 제안*. PLAYBOOK 미래 옵션 항목 부활 검토 또는 새 룰 추가 제안. 사용자 OK 시 적용.

**핵심 정신**: *"미리 박지 X, 진짜 데이터 모이면 그때 추가"* — 5사이클 함정(top-down 미리 박기) 회피.

## 호출 시점

- 5 task 닫고 나서 (`/task-close` 5회 후 메인이 사용자에게 *"`/refine` 돌릴까요?"* 제안 OK).
- 사용자가 *"짜증 정리 좀"* / *"`/refine`"* 명시 호출.
- 짜증 패턴이 단기 폭증할 때 (메인 자체 판단으로 사용자에게 제안).

## 입력 처리

인자 없음. 기본 흐름.

옵션 인자 = `--scope last-N` (예: `--scope last-10` — 최근 10개 짜증만). 미명시 시 *전체* 정독.

## 단계

### Step 1 — FRICTION_LOG.md 정독

1. `.project/FRICTION_LOG.md` Read.
2. 파일 없거나 비어 있으면 종료 + 안내:
   *"FRICTION_LOG가 비어 있어. 짜증 데이터 누적되면 다시 호출. 평소 *'이거 짜증나'* 발화해주면 메인이 한 줄씩 추가."*
3. 인자 `--scope last-N` 있으면 마지막 N개 행만 추출.

### Step 2 — 패턴 분류 + 빈도 카운트

짜증 항목을 카테고리로 분류:

| 카테고리 | 예시 |
|---------|------|
| 형식 위반 | task 헤더 누락 / 섹션 빠짐 / status 잘못 박힘 |
| 컨텍스트 부담 | 메인 세션이 무거워짐 / 답변 느림 / 압축 발생 |
| 슬래시 미스매치 | `/task-init` 인터뷰 짜증 / `/task-plan` 질문 너무 많음 / 등 |
| Test Plan 가정 | 격리 세션이 메인 가정 못 풀어 헤맴 |
| git/커밋 흐름 | 브랜치 이름 충돌 / 커밋 순서 헛갈림 |
| 멀티리포 통신 | shared/ 메시지 못 잡음 / .env 빠짐 |
| 자동화 부족 | 같은 작업 반복 / 자동화 가능한데 수동 |
| 기타 | 위 카테고리 외 |

각 카테고리 *빈도 카운트* + 짜증 행 인용.

### Step 3 — 반복 패턴 감지

빈도 ≥ 3회 카테고리는 *반복 패턴*으로 간주. 빈도 < 3회는 *단발성*으로 분류.

```markdown
## 반복 패턴 (≥ 3회)

1. <카테고리>: <N회>
   - 짜증 1: "<원문 인용>" (<날짜 / TASK 맥락>)
   - 짜증 2: ...
   - ...

2. <카테고리>: <N회>
   ...
```

### Step 4 — PLAYBOOK 항목 매핑

`plan/PLAYBOOK.md` Read. 반복 패턴마다 *부활 후보 항목* 매핑:

| 반복 패턴 카테고리 | PLAYBOOK 후보 항목 |
|------------------|--------------------|
| 형식 위반 | §4 minimal form hook |
| 컨텍스트 부담 | §1 컨텍스트 격리 강화 / §2 압축 평가 subagent |
| 슬래시 미스매치 | (PLAYBOOK 외 — 슬래시 instruction 보강 검토) |
| Test Plan 가정 | (PLAYBOOK 외 — TASK_DOC_RULE.md §3.3 보강 검토) |
| git/커밋 흐름 | (PLAYBOOK 외 — GIT_RULE.md 보강 검토) |
| 멀티리포 통신 | (PLAYBOOK 외 — LINKED-REPOS.md 보강 검토) |
| 자동화 부족 | §3 Python orchestrator (큰 그림) / §7 자동 PR 리뷰 |
| 큰 묶음 작업 부담 | §5 `/plan-roadmap` 슬래시 |
| task 누적 우선순위 | §8 우선순위 컬럼 부활 |
| npx update 충돌 | §9 머지 로직 엣지 케이스 보강 |

### Step 5 — bottoms-up 제안서 작성

```markdown
## /refine 제안서 — <YYYY-MM-DD>

### 반복 패턴 (≥ 3회)
- <카테고리 1>: <N회>
- <카테고리 2>: <N회>

### PLAYBOOK 부활 검토
1. **§<N> <항목명>** 부활 검토
   - 사유: <패턴 N회 누적 — PLAYBOOK §<N> 매핑>
   - 도입 방법: <PLAYBOOK §<N> 본문 §방법 그대로 인용 + 적용 영역>
   - 얻는 것: <효용>
   - 주의: <함정 — PLAYBOOK §<N> §주의 인용>

2. ...

### PLAYBOOK 외 보강 제안
1. **<문서 / 슬래시>** 보강
   - 사유: <패턴 N회>
   - 보강 방향: <구체 수정 제안>
   - 영향 범위: <수정 대상 파일>

### 단발성 짜증 (< 3회 — 데이터 더 모이기 대기)
- <짜증 인용 N>회

### 추천 다음 행동
- <지크 OK 시 적용 순서>
```

### Step 6 — 사용자 합의

제안서 보여주기 + *"어느 항목 적용할까?"* 묻기.

분기:
- **사용자 OK한 항목 → 즉시 적용 (또는 별도 task로 분리)**:
  - PLAYBOOK 부활: 해당 PLAYBOOK 항목 *방법* 그대로 따라 새 task 생성 — `/task-init` 호출 권장 (큰 변경이면).
  - 슬래시 instruction 보강: 해당 `template/.claude/skills/<슬래시>.md` 직접 Edit + 사유 기록.
  - TASK_DOC_RULE / GIT_RULE 보강: 해당 룰 파일 Edit + 수정 이력 행 추가.
- **거부한 항목 → 보류** (FRICTION_LOG에 *"보류 — `/refine` <YYYY-MM-DD>"* 메모).
- **단발성 → 그대로 누적** (반복되면 다음 `/refine`에서 다시 검토).

### Step 7 — FRICTION_LOG 갱신

본 `/refine` 호출 결과를 FRICTION_LOG에 메타 행 추가:

```markdown
## /refine — <YYYY-MM-DD>

- 반복 패턴: <카테고리> N회 / <카테고리> N회
- 부활 적용: §<N> <항목명> (TASK-<NNN>으로 분리)
- 보강 적용: <문서명> §<N> Edit
- 보류: <항목>
- 단발성 누적: N건
```

이 메타 행은 다음 `/refine`이 *이전 회고 결과 참조*용.

### Step 8 — 결과 보고

```
✅ /refine 완료
- 정독한 짜증 행: <N>건
- 반복 패턴: <카테고리> N개
- 적용한 보강: <목록>
- 보류: <목록>
- 단발성 누적: <N>건 (다음 회고 대기)

다음 일정: <5 task 후 / 사용자 호출 시>
```

## 도구 가이드

- **Read**: `.project/FRICTION_LOG.md` / `plan/PLAYBOOK.md` / 보강 대상 룰/슬래시 파일 정독
- **Edit**: 보강 적용 (TASK_DOC_RULE / GIT_RULE / 슬래시 instruction Edit) + FRICTION_LOG 메타 행 추가
- **AskUserQuestion**: Step 6 합의 — 어느 항목 적용할지 사용자 답
- **Write**: 신규 룰/문서 추가 (드뭄 — 보통 PLAYBOOK 부활 항목이 새 hook 등 신규 파일 생성 요청 시)

## 주의사항

- **미리 박지 X** — *진짜 데이터(반복 패턴) 없이* PLAYBOOK 부활 절대 X. 5사이클 함정 재발 회피의 핵심.
- **단발성 짜증 = 데이터 부족** — < 3회 패턴은 *부활 검토 X*. 누적 대기.
- **자체 판단으로 룰 박지 X** — 보강 제안은 *사용자 합의 후* 적용. *"이거 좋아 보여"* 자체 판단으로 즉시 Edit X.
- **5사이클 함정 — 합리적 변형 차단** — minimal form hook 부활 시 *섹션 존재* 검사만. *내용 검증 X*. 5사이클의 25행 화이트리스트 함정 회피 (PLAYBOOK §4 §주의 참조).
- **PLAYBOOK 본문 인용 그대로** — *방법* 인용 시 자체 추측 박지 X. PLAYBOOK 본문 한 줄씩 따라가며 적용.
- **`/refine` 호출 빈도** — 매 task마다 호출 X. 5 task 또는 짜증 누적 폭증 시. 너무 잦으면 *회고 자체가 짜증*.
- **회고 → 보강 → 다음 task** 흐름 — 보강 적용은 *별도 task로 분리* 권장 (큰 변경이면). `/task-init` 호출하고 plan에 부활 사유 박음.

## 상태 전이

해당 없음 (meta 레벨 — task 상태 전이 X).

단 보강 적용이 *별도 task*로 분리되면 그 task는 일반 흐름 (draft → planned → ... → closed) 따라감.

## 5사이클 참조

5사이클 자료 X (`/refine`은 v0.2 신규 슬래시).

대신 `RETROSPECTIVE.md` (5사이클 회고 본문) 정독 권장 — 어떤 짜증이 5사이클에서 발생했는지 패턴 학습. 단 *그 회고 자체*는 5사이클 끝났을 때 1회성으로 진행한 것이고, `/refine`은 *주기적 mini-회고*가 핵심 차이.

v0.2 신규점:
- bottoms-up 보강 시스템화 (5사이클은 사후 회고 1회만)
- PLAYBOOK 카탈로그 + 매핑 테이블 (Step 4) — 진짜 필요해질 때 *어디 봐야 할지* 명확
- FRICTION_LOG 단일 진실 소스 (5사이클은 분산된 짜증 추적 — 통합 못 함)
