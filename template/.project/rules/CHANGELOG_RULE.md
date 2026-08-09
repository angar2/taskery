# CHANGELOG_RULE

> 본 파일은 taskery 시스템 권장 프로젝트별 CHANGELOG 정책이다.
> 우선순위: **이 파일** (`.project/rules/CHANGELOG_RULE.md`) → 메인 판단.
> 프로젝트별 변형이 필요하면 `.project/rules/CHANGELOG_RULE.local.md` 생성 (npx update 미터치, 구속력은 코어와 동등 — `TASKERY_RULE` §7).

---

## 1. 파일 위치 / 기본 구조

- **경로**: `.project/changelog/CHANGELOG.md` (단일 파일) 또는 `.project/changelog/<YYYY-MM>.md` (월별 분할, 선호)
- **형식**: Markdown. 각 항목 = `## [TASK-NNN] <한 줄 요약>` 시작
- **정렬**: 최신 항목이 *맨 위* (Reverse chronological order)

---

## 2. 항목 형식

**작성 주체 = close CLI 자동.** 각 task close 시 `npx @angar2/taskery close`가 새 항목 1개를 직접 append한다 (헤더=task 문서 H1 제목 / 날짜 / 타입=헤더 유형 / 변경 요약=Dev Plan Phase 명 목록):

```markdown
## [TASK-NNN] <제목 — task 문서 H1>

- **날짜**: YYYY-MM-DD
- **타입**: feature / bug / improvement / refactor / docs / chore
- **변경 요약**:
  - Phase 1 — <Phase 명>
  - Phase 2 — <Phase 명>
```

### 필수 필드 (CLI 자동 작성분)

1. 헤더 `## [TASK-NNN] <제목>` (한 줄)
2. **날짜** (`YYYY-MM-DD`)
3. **타입** (task 헤더 유형 — `feature` / `bug` / `improvement` / `refactor` / `docs` / `chore`)
4. **변경 요약** (Phase 명 목록 — Phase 부재 시 제목 1줄)

### 보강 (선택 — 세션·사용자 자유 편집)

CLI 자동 작성분이 기본이고, 세션·사용자가 항목을 자유롭게 보강할 수 있다 (closed 잠금은 task 문서만 — changelog는 잠금 밖):

- 변경 요약 문장 보강
- 영향 파일 (참고용)
- 사유 (참고용)
- 관련 PR / 이슈 링크 (있을 시)

---

## 3. 삽입 위치 (중요)

- **최신 항목이 맨 위** — 기존 첫 `##` 항목 *바로 위*에 삽입
- 메인 세션이 CHANGELOG.md Edit 시 *파일 전체 구조 확인 후* 정확한 위치에 삽입 의무
- 중간 삽입 / 끝 삽입 금지

---

## 4. task-close 흐름과의 정합

**close CLI가 append한다 — 세션 수기 작성 불요, 보강만.**

1. `npx @angar2/taskery close`(또는 `task_close` 도구)가 §2 형식으로 항목을 자동 append — 파일 없으면 생성(§1 두 형식 중 단일 `CHANGELOG.md` 실재 시 그쪽, 아니면 이번 달 `<YYYY-MM>.md`), 최신 위치(맨 위) 삽입, `[TASK-NNN]` 중복 가드(재호출 시 skip)
2. 세션은 필요 시 append된 항목을 보강(§2 선택 필드)
3. 커밋: 미등록 케이스는 close의 문서 커밋이 자동 수거 / 등록 케이스는 `.project/`가 git 밖이라 커밋 불요

---

## 5. 예시

```markdown
## [TASK-042] 사용자 인증 OAuth 2.0 지원 추가

- **날짜**: 2026-06-15
- **타입**: feature
- **변경 요약**: Google / GitHub OAuth provider 추가. 기존 이메일·비밀번호 흐름 유지.
- **영향 파일**: `src/auth/oauth.ts`, `src/routes/auth.ts`, `migrations/0042_oauth.sql`
- **사유**: 외부 서비스 연동 요구 누적 — 인증 흐름 다변화

## [TASK-041] 로그인 페이지 입력 검증 fix

- **날짜**: 2026-06-12
- **타입**: bug
- **변경 요약**: 이메일 형식 검증 누락으로 빈 입력 통과되던 버그 fix.
- **영향 파일**: `src/components/LoginForm.tsx`
- **사유**: TASK-038 신고 — 빈 이메일로 로그인 시도 시 서버 오류
```

---

## 6. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-30 | 신규 작성 — 위치 / 형식 / 필수 필드 / task-close 정합 (stash FRICTION_LOG #8+9 반영) |
| 2026-08-09 | 작성 주체를 close CLI 자동으로 개정 — §2 항목 형식(변경 요약=Phase 명 목록)·필수/보강 재편, §4 흐름 개정(수기 작성 불요·보강만·중복 가드). recordion FRICTION 2026-08-09(문서 갱신 세션 준수 의존) 반영 |
