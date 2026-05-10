# Changelog

이 파일은 taskery의 모든 주요 변경 사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 기반, 버전 운영은 [Semantic Versioning](https://semver.org/) 따른다.

---

## [Unreleased]

### 추가

- `/project-init` 스킬 Step 7.5 — 빈 폴더 케이스 `git init` + root commit + dev 분기 가이드 (smoke test 후속, 첫 task 머지 시점 dev/main ref 누락 회피)
- `/log-friction` 스킬 신규 도입 — 사용자가 작업 흐름 중 겪은 불편을 `.project/FRICTION_LOG.md`에 한 행 기록. 호출 트리거 3가지(사용자 명시 호출 / 사용자 불만 발화 캐치 / `/task-close` 직후 마찰 신호 자체 감지). frontmatter description 매칭으로 사용자 발화에서 *불편·짜증·답답함* 신호 감지 시 자동 발동

### 수정

- 스킬 8종 구조를 Claude Code 표준으로 변경 — `template/.claude/skills/<name>.md` (단일 파일) → `template/.claude/skills/<name>/SKILL.md` (디렉토리), frontmatter에 `name` 필드 추가. 사용자 프로젝트에서 `npx @angar2/taskery init` 후 Claude Code가 스킬 8종을 인식 못 하던 동작 버그 해결 — 슬래시 직접 호출(`/project-init` 등) + 자연어 발화로 자동 발동 둘 다 가능
- 위 구조 변경에 따라 경로 표기 갱신 — `template/CLAUDE.md`, `plan/SKILLS.md` / `OVERVIEW.md` / `DECISIONS.md` / `DISTRIBUTION.md` / `PLAYBOOK.md`, `bin/lib.js` 주석
- README.md 전면 재작성 — *해결하는 문제* / *워크플로우 예시* 섹션 신설(첫 방문자 동선 보강), 자기위안식 섹션 제목(*한 줄 정신* 등) 제거, plan/ 톤(단정형 / 표 중심 / 비유 X) 정합. README 본문 *수정 이력 섹션* 폐지(변경 이력은 본 CHANGELOG가 단일 진실 소스)
- `/refine` 스킬 폐기 + `/log-friction`로 전면 재정의 — *5 task마다 자동 호출* 정책 폐기 / 후속 조치(반복 패턴 감지 + PLAYBOOK 부활 검토 + bottoms-up 보강 제안) 폐기. spec 정합 정정 — `plan/SKILLS.md` / `plan/PLAYBOOK.md`(부활 트리거 메커니즘 섹션 제거) / `plan/OVERVIEW.md` / `plan/DECISIONS.md` / `plan/TASK-DOC.md` / `plan/DISTRIBUTION.md` / `plan/HOOKS.md` / `template/CLAUDE.md`(*짜증 데이터* → *불편 데이터*) / `template/.claude/skills/project-init/SKILL.md` / `template/.project/FRICTION_LOG.md`. 구 `template/.claude/skills/refine/` 디렉토리 삭제. PLAYBOOK ↔ 스킬 연동 전면 해제 — PLAYBOOK은 *미래 옵션 카탈로그*로만 운영(사용자 직접 정독 후 부활 결정)
- `/task-close` 결과 보고 직전에 *마찰 신호 자체 감지* Step 신규 추가 — 동일 단계 재호출 ≥ 2회 / 검증 명령 FAIL 반복 / 사용자 부정 반응 발화 누적 검사 후 감지 시 `/log-friction` 등록 제안
- README.md `/log-friction` 동기 정정 — §Skills 표(`/refine` → `/log-friction`) + §워크플로우 예시(*5 task 후 회고* → *불편 발생 시 등록*) + §자동 발동 예시(회고 의도 발화 → 불만 발화 캐치 패턴)

---

## [0.1.0] - 2026-05-09

### 추가

- taskery 빌드 + 첫 init — 1 메인 세션 + 스킬 8종 + catastrophic hook 3종 + npx 배포 골격 완성
- npm publish 자산 작성 — README.md / LICENSE / package.json metadata / bin/taskery.js GitHub URL
- npm 패키지명: `@angar2/taskery` (scoped, public — `taskery` 이름이 npm에 선점되어 본인 namespace로 변경)

---

## 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-09 | 신규 작성 — 0.1.0 첫 기록 |
| 2026-05-09 | npm 패키지명 `@angar2/taskery`로 변경 반영 (이름 충돌 해소) |
| 2026-05-09 | `[Unreleased]` 섹션 도입 — publish 단위로 변경 사항 누적 패턴 (Keep a Changelog 표준) |
| 2026-05-10 | `[Unreleased]` §수정 — 스킬 8종 디렉토리 구조 마이그레이션 + 경로 표기 갱신 (npx 후 스킬 미인식 동작 버그 해결, 0.1.1 후보) |
| 2026-05-10 | `[Unreleased]` §수정 — README.md 전면 재작성 (첫 방문자 동선 보강 + 자기위안식 섹션 제목 제거 + plan/ 톤 정합 + 본문 수정 이력 섹션 폐지) |
| 2026-05-11 | `[Unreleased]` §추가 + §수정 — `/refine` → `/log-friction` 대대적 개편 (호출 정책 *5 task 자동 호출* 폐기 / 분석·제안 후속 조치 전면 폐기 / PLAYBOOK ↔ 스킬 연동 해제 / spec 정합 정정 + 디렉토리 rename + `/task-close` 마찰 신호 자체 감지 Step 신규) |
| 2026-05-11 | `[Unreleased]` §수정 — README.md `/log-friction` 동기 정정 (§Skills 표 + §워크플로우 예시 + §자동 발동 예시) |
