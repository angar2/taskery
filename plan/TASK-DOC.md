# TASK-DOC — 태스크 문서 양식

> 본 리포 *태스크 흐름의 단일 진실 소스* — 위계 + 양식 + 7 상태 + 4단 layer 가이드.
> 본문 spec(섹션별 작성 방법 + 완성 예시 3개)은 `template/.project/rules/TASK_DOC_RULE.md`에 위치 — 본 문서는 *왜 이 양식인지* + *상위 흐름*.

---

## 1. 태스크 위계

| 레벨 | 단위 | 위치 |
|------|------|------|
| **project** | 전체 프로젝트 | `.project/` 폴더 자체 (1회성 — `/project-init`이 골격 작성) |
| **plan** | 묶음 기획 단위 (예: 인증 시스템 전체) | `.project/plans/<vX.X>/` 안 기획 문서 (PLAN/SERVICE-POLICY/FEATURES/UX-UI/TECH-STACK/ARCHITECTURE/DATA-MODEL/API-SPEC/ROADMAP) |
| **task** | 기능/이슈 단위 (예: 로그인 로직 / 단일 버그) | `.project/tasks/<vX.X>/<NNN>_<slug>.md` (단일 파일) 또는 `TASK-<NNN>_<slug>/task.md` (폴더 승격) |
| **phase** | task.md Dev Plan 안 sub-섹션 | task.md `## Dev Plan` 안 `### Phase 1`, `### Phase 2`, ... |

**원칙**:
- task가 너무 크면 → 폴더 승격 (`TASK-<NNN>_<slug>/task.md` — *추가 자료 보관* 용도, 서브 문서 / 디자인 자료 등. mockup은 vX.X 공통이라 폴더 안 X — §1.5 참조)
- 더 크면 → plan으로 승격 (별도 plan 버전 또는 plan 안 묶음)
- waterfall phase 선제적 작성 금지 — *진행하면서 점진적 추가*

**spec-diffs / screenshots / mockup 위치 — vX.X 공통 단일화**:
- `.project/tasks/<vX.X>/spec-diffs/<NNN>_<slug>_spec-diff.md` — 단일 파일 task든 폴더 승격이든
- `.project/tasks/<vX.X>/screenshots/<NNN>_*.png`
- `.project/tasks/<vX.X>/mockup/<task-doc-name>-mockup.html` (UX/UI 구현 task 한정 — stash FRICTION_LOG #14+19 반영)
- 폴더 승격 task도 *vX.X 공통* 사용 (task 폴더 안에 spec-diffs/screenshots/mockup 생성하지 않음)
- 단일 진실 소스: [TASK_DOC_RULE.md §1.5](../template/.project/rules/TASK_DOC_RULE.md) + [MOCKUP_RULE.md](../template/.project/rules/MOCKUP_RULE.md)

→ [DECISIONS.md §6](DECISIONS.md)

---

## 2. 헤더 표 — 5컬럼

| 생성일 | 플랜 | 유형 | 규모 | 상태 |
|--------|------|------|------|------|
| 2026-05-08 | v1.0 | feature | medium | developing |

| 컬럼 | 의미 |
|------|------|
| **생성일** | ISO 형식 (YYYY-MM-DD) |
| **플랜** | 어느 plan 버전 하위인지 (예: v1.0, alpha) — `tasks/<vX.X>/` 디렉토리 명과 일치 |
| **유형** | `feature` / `bug` / `improvement` / `refactor` / `docs` / `chore` (git 브랜치 타입과 직결) |
| **규모** | `micro` (1 phase) / `small` (2-3) / `medium` (4-7) / `large` (8+ 또는 분리 검토) |
| **상태** | 7 상태 머신 (§3) |

---

## 3. 7 상태 — `-ing/-ed` 페어 일관성

```
draft → planned → developing → developed → testing → tested → closed
```

| 상태 | 시점 | 작성 주체 |
|------|------|---------|
| `draft` | task.md 빈 골격 생성 직후 | `/task-init`이 헤더에 작성 |
| `planned` | plan 완료 (사용자 *"이렇게 가자"* OK) | `/task-plan` 끝에 메인 |
| `developing` | dev 시작 | `/task-dev` 호출 시 메인 |
| `developed` | dev 끝 + self-check OK (린트/타입/빌드 PASS) | `/task-dev` 끝에 메인 |
| `testing` | 격리 세션 진행 중 | `/task-test` 호출 시 메인 |
| `tested` | 격리 세션 PASS 결과 받은 후 | `/task-test` 끝에 메인 |
| `closed` | git 마무리 완료 | `/task-close` 끝에 메인 |

**핵심 정신** — revision 단계 자체를 상태로 두지 않음. *대화로 OK = 다음 상태로 자동 전이*. revision은 *상태가 아니라 흐름의 자연스러운 이전*.

→ [DECISIONS.md §4](DECISIONS.md)

---

## 4. FAIL / UNCERTAIN 분기

`/task-test` 결과에 따라 분기 (대화 흐름):

| 결과 | 처리 | 종료 상태 |
|------|------|---------|
| **PASS** | `tested` 기록 → 사용자에게 close 신호 → 사용자 OK 시 `/task-close` | `tested` |
| **FAIL** | 메인이 격리 결과(로그/근거) 보고 → 사용자에게 *"고쳐? OK 마무리?"* 질문 | 사용자 답에 따라 분기 |
| FAIL + *"고쳐"* | 메인이 status를 `developing`으로 되돌림 → `/task-dev` 재진입 또는 직접 수정 | `developing` |
| FAIL + *"OK 마무리"* | `tested` 기록 (단 Result 섹션에 *"알려진 결함 — 사유: ..."* 명시) → `/task-close` | `tested` |
| **UNCERTAIN** | 메인이 결과 보고 → 사용자 검수 → PASS / FAIL 분기 흐름 | 사용자 판단에 따라 |

**self-check FAIL** (`/task-dev` 진행 중) → `developing` 그대로 유지, 메인 자체 수정 시도 → PASS 시 `developed` 기록. 3회 반복 fail 시 사용자에게 보고 + 판단 요청.

**핵심 정신**: *대화로 OK = 자동 전이*. 상태 머신이 모든 분기를 담지 X — 사용자 판단이 분기점.

---

## 5. 6 섹션 구성

```markdown
# TASK-NNN — <태스크 이름>

| 생성일 | 플랜 | 유형 | 규모 | 상태 |
|--------|------|------|------|------|
| ... | ... | ... | ... | ... |

## Requirements
<요구사항 + 메인이 증폭/구체화한 내용>

## Scope
<영향 범위 — 어느 파일의 어느 로직 / 신규 파일 / 등>

## Dev Plan

### Phase 1 — <짧은 이름>
- 파일: ...
- 왜: ...
- 어떻게: ...
- 완료 기준: ...
- 진행: [ ]

### Phase 2 — <짧은 이름>
- ...

## Test Plan
<테스트 방법 — /task-test 격리 세션이 그대로 수행>

## Result
<진행 결과 + 테스트 결과 통합>
```

| 섹션 | 작성 주체 | 시점 |
|------|---------|------|
| **Header** (5컬럼 표) | `/task-init`이 작성 (status는 스킬별 갱신) | task 생성 시 + 상태 전이마다 |
| **Requirements** | `/task-plan` Step 2 (사용자 인터뷰 + 메인 증폭) | `draft` → `planned` |
| **Scope** | `/task-plan` Step 3 (코드 서치) | `draft` → `planned` |
| **Dev Plan** | `/task-plan` Step 4 (Phase 분할 — 점진 추가 OK) | `draft` → `planned` (Phase 점진) |
| **Test Plan** | `/task-plan` Step 5 (실질 동작 시나리오 + `[AUTO]` / `[USER]` 분류 강제) | `draft` → `planned` |
| **Result** (진행 부) | `/task-dev` Step 7 | `developed` |
| **Result** (테스트 부) | `/task-test` Step 4 | `tested` |

**Header 섹션은 *별도 헤딩 없이* 표 자체**. 그 위 `# TASK-NNN — 이름`은 파일 제목.

**Phase는 Dev Plan 안 sub-섹션** — 별도 파일 X. 진행하면서 점진 추가. *waterfall 선제적 작성 함정 회피*.

**Test Plan = 실질 동작 시나리오 (stash FRICTION_LOG #14+19 / #25 반영)**:

- 본질: *본 task에서 구현한 요구사항이 정상 동작하는지* 검증 시나리오
- **유닛 테스트 X** — 유닛 테스트는 `/task-dev` Step 6.5에서 단일 시점 실행 (코드 정상성 영역, Test Plan과 직교)
- 각 시나리오 = (한 줄 설명, 분류, 방식, PASS 기준)
- **분류 강제**: `[AUTO]` (자동화 가능) / `[USER]` (자동화 불가, 사용자 검수)
- **카탈로그** (방식 선택 — 시나리오마다 1개 이상): 수동 검수 / 시나리오 스크립트 / API 호출 / 입출력 비교 / 사이드 이펙트 / 회귀 / E2E 자동화 도구
- **UX/UI 영역 분리** (UX/UI task 한정):
  - 동작 영역 (클릭/호버/드래그/입력 → 결과): 자동화 가능 → `[AUTO]`, 불가 → `[USER]` 체크리스트
  - 시각 영역 (레이아웃/색상/간격/호버 효과): 자동 비교 의미 X → `[USER]` 체크리스트 + 목업 기준 참조 (`mockup/<task-doc-name>-mockup.html`)
- 시각 영역 시나리오 있으면 *fix 사이클 1~2회 예상* 사전 예고 명시

가이드라인:
- **자기완결적**: `/task-test` 격리 세션이 *task.md만 보고도* 수행 가능
- **명령/기대값 포함**: 무엇을 실행하고 무엇이 기대되는지 명확
- **메인 가정 X**: *"잘 될 거야"* / *"문제 없을 듯"* 같은 가정 금지

상세 양식 + 카탈로그 + 매트릭스 → [task-plan SKILL.md](../template/.claude/skills/task-plan/SKILL.md) Step 5 + [TASK_DOC_RULE.md](../template/.project/rules/TASK_DOC_RULE.md) §2.5 참조.

---

## 6. 4단 layer 가이드 — 암묵지 이식

핵심 통찰: *양식 spec만으론 메인이 task마다 스타일 들쭉날쭉*. **작성 방법 + 예시 + 섹션별 설명 → 일관성 ↑**.

`TASK_DOC_RULE.md`는 4단 layer 구조 (시니어 영상 강조 패턴):

| Layer | 내용 | 위치 |
|-------|------|------|
| **1. 양식 Spec** | 헤더 5컬럼 / 6 섹션 / 7 상태 | TASK_DOC_RULE §1 |
| **2. 작성 방법** | 단계별 절차 (헤더 작성 / Requirements / Scope / Dev Plan / Test Plan / Result 작성) | TASK_DOC_RULE §2 |
| **3. 가이드라인** | 일관성 / 자기완결성 / 메인 가정 X / 점진 작성 OK / 짧고 명확하게 | TASK_DOC_RULE §3 |
| **4. 섹션별 설명 + 예시 스니펫** | Header / Requirements / Scope / Dev Plan / Test Plan / Result 각각 짧은 설명 + 예시 | TASK_DOC_RULE §4 |

**+ 완성 예시 3개** (4단 layer 끝에):
- 예시 1: chore/micro (한 줄 픽스)
- 예시 2: feature/medium (로그인 기능)
- 예시 3: bug/small (특정 버그 픽스)

**구성 원칙**: 양식 + 작성 방법 + 가이드 + 섹션 설명 + 완성 예시 = *암묵지 이식 4단 layer*. 형식 spec만 작성하면 메인이 들쭉날쭉, 4 layer로 일관성 확보.

---

## 7. 본문 단일 진실 소스

| 정보 | 단일 진실 소스 |
|------|--------------|
| 양식 spec + 작성 방법 + 가이드 + 예시 (4단 layer) | [template/.project/rules/TASK_DOC_RULE.md](../template/.project/rules/TASK_DOC_RULE.md) |
| 스킬별 task.md 갱신 흐름 | [template/.claude/skills/task-{init,plan,dev,test,close}/SKILL.md](../template/.claude/skills/) |
| 형식 위반 차단 | (현재 없음) — instruction + 대화. PLAYBOOK §4 minimal form hook 부활 검토 시점 |

본 문서는 *상위 추상 + link*만. 본문 spec은 TASK_DOC_RULE.md.

---

## 8. PLAYBOOK 부활 검토 시점

태스크 양식 영역에서 부활 가능한 미래 옵션:

| PLAYBOOK § | 항목 | 부활 검토 시점 |
|-----------|------|----------|
| §4 | minimal form hook | 태스크 문서 형식 위반 (헤더 누락 / 섹션 빠짐) ≥ 5회 누적 |
| §8 | 우선순위 컬럼 부활 | task 누적 ↑ → 우선순위 정렬 필요해질 때 |

**부활 흐름**: FRICTION_LOG 누적 → 사용자 직접 정독 → PLAYBOOK 본문 §방법 그대로 적용.

→ [PLAYBOOK.md](PLAYBOOK.md)

---

## 9. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-08 | 신규 작성 — 위계(project/plan/task/phase) + 헤더 5컬럼 + 7 상태 + 6 섹션 + FAIL/UNCERTAIN 분기 + 4단 layer 가이드 + PLAYBOOK 부활 트리거 |
| 2026-05-08 | §1 위계에 spec-diffs/screenshots vX.X 공통 단일화 명시. 폴더 승격은 *추가 자료* 자리용으로 명확화. 단일 진실 소스 = TASK_DOC_RULE.md §1.5 |
| 2026-05-09 | 표현 정제 — 인명 / 경박 표현 / 스킬 용어 / 이전 버전 비교 단락 정리. 폐기 항목 비교는 [DECISIONS.md](DECISIONS.md)로 위임. |
| 2026-05-30 | Test Plan = 실질 동작 시나리오 본질 명시 + `[AUTO]`/`[USER]` 분류 강제 + 카탈로그 / UX/UI 영역 분리 매트릭스 / 목업 기준 참조 / 시각 fix 사이클 예고. §1 위계에 mockup/ 디렉토리 추가 (vX.X 공통). (stash FRICTION_LOG #14+19 / #25 반영) |
| 2026-05-30 | 정합 검증 후속 정정 (Phase 5) — §1.5 mockup path 표기 `<NNN>_<slug>-mockup.html` → `<task-doc-name>-mockup.html` 으로 통일 (MOCKUP_RULE 단일 진실 소스 표기 정합 — 폴더 승격 케이스도 커버). |
| 2026-05-30 | 정합 검증 후속 정정 (3차) — §5 작성 주체 표의 Test Plan 표기 *자유 형식 — 자기완결성 가이드라인* → *실질 동작 시나리오 + `[AUTO]` / `[USER]` 분류 강제* 정합 (TASK_DOC_RULE §2.5 본질 재정의 정합). |
| 2026-05-31 | 정합 순회 2차 — §7 본문 단일 진실 소스 표 스킬 path *`<skill>.md`* → *`<skill>/SKILL.md`* (0.1.1 디렉토리 마이그레이션 후 갱신 누락분 정합). 단순 path 표기 정합 |
