# taskery

> Claude Code 메인 세션을 위한 *가벼운 task 시스템*.
> **1 메인 세션 + 스킬 8종 + catastrophic hook 3종 + npx 배포**.

---

## 한 줄 정신

practice 영역(SW 개발)을 process로 강제하지 않는다.

- **Process는 자동화 OK, Practice는 자유롭게 + 사용자 판단 신뢰** — 결정적 영역(린트/타입/빌드)만 강제, 휴리스틱은 강제 X
- **Catastrophic만 hook 차단, 형식 위반은 instruction + 대화** — 합리적 변형 차단 사고 회피
- **Top-down 선제적 작성 금지, bottoms-up** — 진짜 데이터 모이면 그때 추가 (PLAYBOOK 카탈로그 + FRICTION_LOG 패턴 ≥ 3회 트리거)

---

## 빠른 시작

```bash
# 새 프로젝트
npx create-taskery <project-name>

# 기존 프로젝트에 설치
cd <your-project>
npx taskery init

# 최신 버전 동기화
npx taskery update
```

요구 사항: Node.js >=18, Claude Code (CLI / VS Code / JetBrains).

---

## 스킬 8종 — project > plan > task 위계 + 회고

| 스킬 | 레벨 | 역할 |
|------|------|------|
| `/project-init` | project | PROJECT/AGENT-GUIDE/LINKED-REPOS/.env 골격 생성 (1회성) |
| `/plan-init` | plan | `.project/plans/<vX.X>/` 안 기획 문서 작성 |
| `/task-init` | task | task.md 빈 골격 + status=draft |
| `/task-plan` | task | Requirements/Scope/Dev Plan/Test Plan 작성 |
| `/task-dev` | task | Phase 순서 구현 + self-check |
| `/task-test` | task | 격리 세션 검증 (confirmation bias 회피) |
| `/task-close` | task | 검증 명령 게이트 + 커밋 + dev 병합 |
| `/refine` | meta | FRICTION_LOG 정독 + 패턴 감지 + bottoms-up 보강 제안 |

명령어 직접 호출(`/task-init` 등) 또는 메인 세션이 frontmatter description 매칭으로 자동 발동.

---

## Catastrophic Hook 3종

| Hook | 영역 | 잡는 것 |
|------|------|--------|
| `git-guard.sh` | PreToolUse(Bash) | main/dev 직접 커밋 / `--force` / `--no-verify` / `branch -D` / `reset --hard` |
| `pre-commit-verify.sh` | PreToolUse(Bash) | `git commit` 시 검증 명령(린트/타입/빌드/테스트) 모두 PASS 게이트 |
| `closed-immutable.sh` | PreToolUse(Write\|Edit) | `closed` 상태 task.md 본 파일 재수정 차단 |

**잘 지키면 hook 작동 0회 (무해). catastrophic만 차단.**

---

## 디렉토리 구조 (사용자 프로젝트 — `npx taskery init` 후)

```
my-app/
├─ CLAUDE.md                     # 메인 세션 진입점
├─ .taskery-manifest.json        # 자산 manifest (npx 자동 갱신)
├─ .claude/
│   ├─ settings.json             # hook 등록
│   ├─ skills/                   # 8 스킬
│   └─ hooks/                    # 3 catastrophic 안전망
└─ .project/
    ├─ PROJECT.md                # /project-init 생성
    ├─ AGENT-GUIDE.md            # /project-init 생성
    ├─ rules/
    │   ├─ TASK_DOC_RULE.md      # task 양식
    │   └─ GIT_RULE.md           # git 정책
    ├─ plans/                    # /plan-init 생성
    ├─ tasks/                    # /task-init 생성
    ├─ flows/                    # /task-dev 갱신
    ├─ changelog/                # /task-close 갱신
    ├─ shared/                   # 멀티리포 메시지
    └─ FRICTION_LOG.md           # 짜증 누적
```

---

## 상세 문서

> 본 리포 spec 문서는 npm 패키지에 포함되지 않으므로 GitHub에서 정독.

- [plan/OVERVIEW.md](https://github.com/angar2/taskery/blob/main/plan/OVERVIEW.md) — 진입 + 큰 그림 + 단일 진실 소스
- [plan/SKILLS.md](https://github.com/angar2/taskery/blob/main/plan/SKILLS.md) — 스킬 8종 명세 + 흐름
- [plan/TASK-DOC.md](https://github.com/angar2/taskery/blob/main/plan/TASK-DOC.md) — 태스크 양식 + 7 상태
- [plan/HOOKS.md](https://github.com/angar2/taskery/blob/main/plan/HOOKS.md) — 3 catastrophic hook 정책
- [plan/DISTRIBUTION.md](https://github.com/angar2/taskery/blob/main/plan/DISTRIBUTION.md) — npx 배포 + manifest
- [plan/DECISIONS.md](https://github.com/angar2/taskery/blob/main/plan/DECISIONS.md) — 핵심 의사결정
- [plan/PLAYBOOK.md](https://github.com/angar2/taskery/blob/main/plan/PLAYBOOK.md) — 미래 옵션 카탈로그

---

## 라이선스

[MIT](LICENSE)

---

## 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-09 | 신규 작성 — npm 페이지 진입 문서 |
