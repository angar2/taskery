---
name: plan-init
description: plan 버전 단위 9 기획 문서 작성 — 신규 vX.X/ 또는 기존 카피 후 변경 인터뷰
---

# /plan-init

## 개요

plan 버전(vX.X)마다 호출. `.project/plans/<vX.X>/` 안에 9 기획 문서 생성. 사용자 결정 버전명(v1.0 / alpha / mvp 등 자유).

9 기획 문서:
- PLAN.md (진입 인덱스 + 체크리스트)
- SERVICE-POLICY.md (백엔드/풀스택)
- FEATURES.md
- UX-UI.md (프론트엔드/풀스택)
- TECH-STACK.md
- ARCHITECTURE.md
- DATA-MODEL.md (백엔드/풀스택)
- API-SPEC.md
- ROADMAP.md

## 호출 시점

- `/project-init` 직후 첫 plan 생성 시.
- 새 plan 버전(예: v1.0 → v1.1) 시작 시.
- 기존 plan 분기/리비전 시.

## 입력 처리

인자 = 버전명 (예: `/plan-init v1.0`). 인자 없으면 사용자에게 *"어느 버전?"* 질문.

두 분기:
- **분기 1 (신규)**: `.project/plans/v*/` 없음 → 새 vX.X/ 생성 + 9 문서별 질문 라운드.
- **분기 2 (이어가기)**: 기존 plans/vY.Y/ 있음 → 가장 최신 카피 → 새 vX.X/ 생성 → 변경 인터뷰 → 변경된 문서만 갱신 → AGENT-GUIDE.md 활성 버전 갱신.

## 단계

### Step 1 — 분기 판단

1. `.project/plans/` 디렉토리 존재 확인.
2. 하위 vX.X 폴더 목록 추출 (`ls .project/plans/`).
3. 비어 있음 → 분기 1 (신규).
4. 1개 이상 있음 → 분기 2 (이어가기).

### Step 2 — 버전명 확정

1. 인자로 들어왔으면 그대로 사용 (단 기존 충돌 시 사용자 confirm).
2. 인자 없으면 사용자에게 질문:
   - 분기 1: *"첫 plan 버전명? (예: v1.0, alpha, mvp)"*
   - 분기 2: *"기존 최신은 vY.Y. 새 버전명? (예: vY.Y+1)"*
3. 형식 강제 X. 사용자 자유.

### Step 3 — 분기 1 처리 (신규)

1. `.project/plans/<vX.X>/` 디렉토리 생성.
2. 프로젝트 타입(PROJECT.md에서 추출) 확인:
   - frontend → SERVICE-POLICY/DATA-MODEL 제외 가능 (선택)
   - backend → UX-UI 제외 가능 (선택)
   - fullstack → 9개 모두
3. 9 문서별 질문 라운드 — *한 문서씩, 핵심 질문 1~3개*:
   - **SERVICE-POLICY.md** (해당 시): 사용자 권한 / 데이터 보존 / 결제 정책 등
   - **FEATURES.md**: 핵심 기능 목록 (기능 단위 — 짧게)
   - **UX-UI.md** (해당 시): 페이지/화면 목록 + 핵심 인터랙션
   - **TECH-STACK.md**: 언어/프레임워크/주요 라이브러리 + 선택 이유
   - **ARCHITECTURE.md**: 시스템 구조 (멀티 리포 / 레이어드 / 마이크로서비스 등)
   - **DATA-MODEL.md** (해당 시): 주요 엔티티 + 관계
   - **API-SPEC.md**: 엔드포인트 목록 + 인증 방식
   - **ROADMAP.md**: 마일스톤 + 시기 + 우선순위
4. 받은 답 기반으로 각 문서 작성.
5. 마지막에 **PLAN.md** 작성 — 9 문서 인덱스 + 체크리스트.
6. **`.project/AGENT-GUIDE.md`의 활성 plan 버전 vX.X로 갱신** (신규도 동일 — 분기 2와 일관).

### Step 4 — 분기 2 처리 (이어가기)

1. 가장 최신 vY.Y/ 디렉토리 전체 카피 → vX.X/.
2. 변경 인터뷰 — 사용자에게 *"이번 버전에서 어느 문서가 변경되나? (다중 선택)"*:
   - SERVICE-POLICY / FEATURES / UX-UI / TECH-STACK / ARCHITECTURE / DATA-MODEL / API-SPEC / ROADMAP
3. 선택된 문서별 변경 사항 인터뷰 — *"이 문서에서 무엇이 달라지나?"*.
4. 받은 답으로 해당 문서만 수정. 나머지는 카피 그대로.
5. PLAN.md 갱신 — 변경 문서 표시.
6. **`.project/AGENT-GUIDE.md`의 활성 plan 버전 vX.X로 갱신**.

### Step 5 — `tasks/<vX.X>/` 디렉토리 준비

1. `.project/tasks/<vX.X>/` 디렉토리 생성 (빈 폴더).
2. `.project/tasks/<vX.X>/spec-diffs/`, `.project/tasks/<vX.X>/screenshots/` 빈 폴더 미리 생성.

### Step 6 — `PLAN.md` 작성/갱신

```markdown
# PLAN <vX.X>

## 9 기획 문서 인덱스

- [x] SERVICE-POLICY.md (해당 / 미해당)
- [x] FEATURES.md
- [x] UX-UI.md (해당 / 미해당)
- [x] TECH-STACK.md
- [x] ARCHITECTURE.md
- [x] DATA-MODEL.md (해당 / 미해당)
- [x] API-SPEC.md
- [x] ROADMAP.md

## 변경 이력
| 버전 | 날짜 | 변경 문서 | 요약 |
|------|------|----------|------|
| <vX.X> | <YYYY-MM-DD> | <목록 또는 "전체 (신규)"> | <요약> |

## 활성 task 버전
- `.project/tasks/<vX.X>/` 사용
```

### Step 7 — 결과 보고

작성/갱신된 문서 목록 + 다음 단계 안내:
- *"<vX.X>/ 9 기획 문서 작성 완료. AGENT-GUIDE.md 활성 버전 <vX.X>로 갱신. 다음은 `/task-init`으로 첫 task 생성."*

**결과 commit 흐름** (GIT_RULE 정합):
- dev 직접 commit *금지* (git-guard.sh 차단). 두 가지 default 흐름:
  1. **첫 task에 묶기 (권장)**: 분기 1(신규)에서 `/project-init` 직후 본 스킬 호출이면 `/project-init` 산출물과 같은 작업 브랜치(보통 TASK-001 부트스트랩 chore)에 함께 commit. 분기 2(이어가기)면 새 task 브랜치 또는 임시 docs 브랜치에서.
  2. **임시 docs 브랜치**: `git checkout -b docs/{개발자}_plan-{vX.X}` 후 commit → dev에 `--no-ff` 머지. 다음 task 생성 *전*에 plan 산출물을 깔끔히 박고 싶을 때.

## 도구 가이드

- **Read**: PROJECT.md / 기존 plans/vY.Y/ 정독
- **Bash**: `ls .project/plans/`, `cp -r plans/vY.Y plans/vX.X`, `mkdir -p plans/<vX.X> tasks/<vX.X>/{spec-diffs,screenshots}`
- **Write/Edit**: 9 기획 문서 작성/갱신
- **AskUserQuestion**: 9 문서별 핵심 질문 + 변경 인터뷰

## 주의사항

- 9 문서 *전부 강제 X*. 프로젝트 타입에 따라 일부 제외 가능 (frontend → SERVICE-POLICY/DATA-MODEL 미해당 등).
- 분기 2(이어가기)에서 *전체 재작성 금지*. 변경된 문서만 갱신.
- 질문 라운드는 *한 번에 한 문서씩*. 한꺼번에 9 문서 질문 X.
- 답 받기 전 자동 추정 진행 X. 단 PROJECT.md / 기존 plans 정보로 *제안*은 OK (사용자 confirm 후).
- AGENT-GUIDE.md 활성 버전 갱신 *반드시*. 누락 시 메인 세션이 옛 plan 보고 헤맴.

## 상태 전이

해당 없음 (plan 레벨 — task 상태 X).
