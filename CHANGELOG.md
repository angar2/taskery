# Changelog

이 파일은 taskery의 모든 주요 변경 사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 기반, 버전 운영은 [Semantic Versioning](https://semver.org/) 따른다.

---

## [Unreleased]

### 추가

- `/project-init` 스킬 Step 7.5 — 빈 폴더 케이스 `git init` + root commit + dev 분기 가이드 (smoke test 후속, 첫 task 머지 시점 dev/main ref 누락 회피)

### 수정

- 스킬 8종 구조를 Claude Code 표준으로 변경 — `template/.claude/skills/<name>.md` (단일 파일) → `template/.claude/skills/<name>/SKILL.md` (디렉토리), frontmatter에 `name` 필드 추가. 사용자 프로젝트에서 `npx @angar2/taskery init` 후 Claude Code가 스킬 8종을 인식 못 하던 동작 버그 해결 — 슬래시 직접 호출(`/project-init` 등) + 자연어 발화로 자동 발동 둘 다 가능
- 위 구조 변경에 따라 경로 표기 갱신 — `template/CLAUDE.md`, `plan/SKILLS.md` / `OVERVIEW.md` / `DECISIONS.md` / `DISTRIBUTION.md` / `PLAYBOOK.md`, `bin/lib.js` 주석
- README.md 전면 재작성 — *해결하는 문제* / *워크플로우 예시* 섹션 신설(첫 방문자 동선 보강), 자기위안식 섹션 제목(*한 줄 정신* 등) 제거, plan/ 톤(단정형 / 표 중심 / 비유 X) 정합. README 본문 *수정 이력 섹션* 폐지(변경 이력은 본 CHANGELOG가 단일 진실 소스)

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
