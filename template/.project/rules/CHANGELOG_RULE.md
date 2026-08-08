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

각 task close 시 새 항목 1개 추가:

```markdown
## [TASK-NNN] <한 줄 요약>

- **날짜**: YYYY-MM-DD
- **타입**: feature / bug / improvement / refactor / docs / chore
- **변경 요약**: <2-3 줄>
- **영향 파일**: <주요 파일 경로 리스트>
- **사유**: <변경 이유 한 줄>
```

### 필수 필드

1. 헤더 `## [TASK-NNN] <한 줄 요약>` (한 줄)
2. **날짜** (`YYYY-MM-DD`)
3. **타입** (커밋 태그와 동일 — `feat` / `fix` / `improve` / `refactor` / `docs` / `chore`)
4. **변경 요약** (2-3 줄)

### 선택 필드

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

`/task-close` Step 4-4 (CHANGELOG 커밋) 단계에서 본 RULE 참조:

1. 본 RULE 정독
2. 신규 항목 형식대로 작성
3. *최신 위치 (맨 위)* 에 삽입
4. 커밋 — 메시지 형식: `docs: [TASK-NNN] CHANGELOG 업데이트`

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
