# HOOKS — catastrophic 차단 2종

> 본 리포 *hook 정신의 단일 진실 소스*. 2 catastrophic hook 정책 + 영역 분리 + 우회 절차.
> hook 본문은 `template/.claude/hooks/<hook>.sh`에 위치 — 본 문서는 *왜 이 hook인지* + *영역 분리 정신*.
> v0.2.0에서 `pre-commit-verify.sh` 폐기 — §5 참조.

---

## 1. hook 정신 — *catastrophic만 차단*

**원칙**: hook은 *복구 불가능한 사고*만 차단. *합리적 변형 있는 영역*은 instruction + 대화로.

**잘 지키면 hook 작동 0회 (무해). 안 지키면 차단 (catastrophic 막음).**

→ [DECISIONS.md §5](DECISIONS.md)

---

## 2. 영역 분리 — practice / process / git / 완료 보호

| 영역 | 정의 | 예시 | hook 강제 |
|------|------|------|---------|
| **practice** | 합리적 변형 있는 영역 | 검토 본문 형식 / 상태 전이 흐름 / 자기 행 작성 등 | **X** (instruction + 대화로) |
| **process** | 결정적 영역 — exit code 0 또는 != 0 | 린트 / 타입체크 / 빌드 / 단위 테스트 | **OK** (정당) |
| **git catastrophic** | 복구 불가능한 git 명령 | main/dev 직접 커밋 / force push / branch -D | **OK** (사고 차단) |
| **완료 보호** | closed task.md 재수정 차단 | task.md 본 파일 수정 (spec-diffs/screenshots는 자유 — §6 단순화 결정) | **OK** (이력 보호) |

practice 영역에 hook을 강제하면 *합리적 변형 차단 사고*가 발생한다. 본 hook 2종은 모두 git / 완료 보호 영역에 한정 (§3 정책표). v0.2.0에서 process 영역 hook(`pre-commit-verify`) 폐기 — task-close Step 2 게이트와 redundant.

---

## 3. 2 hook 정책표

| Hook | 영역 | 잡는 것 | PreToolUse 대상 |
|------|------|--------|---------------|
| `git-guard.sh` | git catastrophic | main/dev 직접 커밋 / `--force` / `--no-verify` / `branch -D` / `reset --hard` / `clean -fd` | Bash |
| `closed-immutable.sh` | 완료 보호 catastrophic | closed task.md 본 파일 재수정 차단 (spec-diffs/screenshots는 자유 — §6 참조) | Write \| Edit |

**hook 위치** (사용자 프로젝트):
- `.claude/hooks/git-guard.sh`
- `.claude/hooks/closed-immutable.sh`

**Claude Code hook 등록 — 단일 진실 소스**: [template/.claude/settings.json](../template/.claude/settings.json)

이 파일이 *없으면* hook은 디스크의 .sh 파일일 뿐 — Claude Code가 *fire 안 함*. `npx @angar2/taskery init`이 settings.json도 함께 카피해 PreToolUse 매칭이 자동 등록됨.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/git-guard.sh" }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/closed-immutable.sh" }
        ]
      }
    ]
  }
}
```

> 사용자 환경 글로벌 등록(`~/.claude/settings.json`)도 가능하지만 *프로젝트 단위 settings*가 single source of truth — npx로 갱신되어 사용자 customize 충돌 시 *.bak 백업 + confirm 받음.

---

## 4. `git-guard.sh` — git catastrophic 차단

**차단 6 명령**:
| # | 패턴 | 메시지 |
|---|------|------|
| 1 | `git commit` on `main` 또는 `dev` 브랜치 | *작업 브랜치({타입}/{개발자}_TASK-NNN_slug)에서 커밋* |
| 2 | `git push --force` 또는 `-f` | *정상 흐름 사유 없음. 사용자 명시 승인 필요* |
| 3 | `git commit --no-verify` | *commit hook 우회 금지* |
| 4 | `git branch -D` (강제 삭제) | *머지 안 된 브랜치 강제 삭제 사유 없음* |
| 5 | `git reset --hard` | *작업 손실 위험* |
| 6 | `git clean -fd` | *untracked 파일 + 디렉토리 강제 삭제 사유 없음* |

**우회**: 사용자 명시 승인이 있을 때만 hook 비활성화 (또는 hook 자체 임시 disable). 정상 흐름에서 우회 사유 없음.

**구현**: `tool_input.command` 추출 → 정규식 매칭 → exit 2 + GIT_RULE 인용 메시지.

**본문**: [template/.claude/hooks/git-guard.sh](../template/.claude/hooks/git-guard.sh) (2,766 B)

**단일 진실 소스 (룰)**: [.project/rules/GIT_RULE.md](../template/.project/rules/GIT_RULE.md) (프로젝트별) → `~/.claude/rules/GIT_RULE.md` (글로벌 fallback)

---

## 5. `pre-commit-verify.sh` — v0.2.0 폐기됨

**폐기 사유** (stash FRICTION_LOG #25 반영):

- `task-close` Step 2 게이트가 *동일 검증 명령*을 이미 PASS 받음 (working tree 동결 구간 진입 직전)
- Step 2 PASS 후 hook 재검증은 결정론적 redundant — 동일 명령 / 동일 working tree
- 5 커밋 task 기준 풀 검증 8회 (의도 2 + redundant 6) — 시간 낭비 누적
- 대안 안전망: `git-guard.sh` + `task-close` Step 2 게이트로 catastrophic 사례에서 동일 효과

**대체 흐름**:

- *코드 상태 검증* (빌드 / 린트 / 타입체크): `task-dev` self-check + `task-close` Step 2 게이트 (CLAUDE.md `## 검증 명령` 단일 진실 소스 참조)
- *테스트 실행*: `task-dev` 구현 후 단위 테스트 + `task-test` 격리 세션 (CLAUDE.md `## 테스트 명령` 단일 진실 소스 참조)

**제거 영역**:

- `template/.claude/hooks/pre-commit-verify.sh` 파일 삭제
- `template/.claude/settings.json` PreToolUse 등록 해제
- 본 §3 / §7 / §9 / §10 표에서 행 제거

---

## 6. `closed-immutable.sh` — 완료 보호

**차단 범위 (단순화 — task.md 본 파일만)**:
| # | 패턴 | 잡음 |
|---|------|------|
| 1 | `.project/tasks/v*/<NNN>_<slug>.md` (단일 파일) — 헤더 status=`closed` | task 문서 자체 재수정 |
| 2 | `.project/tasks/v*/TASK-<NNN>_<slug>/task.md` (폴더 승격) — 헤더 status=`closed` | task 문서 자체 재수정 |

**차단 안 함** (의도적):
- `.project/tasks/v*/spec-diffs/*.md` — 역사적 자료, 자유 수정
- `.project/tasks/v*/screenshots/*` — 자유 수정
- 폴더 승격 task의 *추가 자료* (서브 문서, mockup 등) — 자유
- closed task의 *관련 코드* 영역 — 새 task로 처리가 정상 흐름

**왜 단순화**:
- 이전 spec은 *폴더 승격 task의 spec-diffs/만* 보호하고 *vX.X 공통 spec-diffs는 미커버* — 비대칭
- spec-diffs/screenshots 위치는 vX.X 공통으로 통일 (TASK_DOC_RULE §1.5 단일 진실 소스)
- vX.X 공통 spec-diffs를 보호하려면 *NNN prefix로 부모 task.md 추적 로직* 필요 → 정규식 복잡 + 에러 위험
- 단순화: spec-diffs는 *역사적 자료*로 자유 수정. closed task의 spec-diff *재해석*은 자연스럽고 차단 없는 게 정상

**우회 절차** (의도적으로 closed task를 풀어 다시 진행해야 하는 경우):
```bash
# 1. 헤더 status를 closed에서 다른 상태로 직접 변경 (Bash 영역 — Write/Edit hook 우회)
sed -i '' 's/| closed |/| developing |/' .project/tasks/v1.0/001_some-task.md

# 2. 그 후 정상 Edit 가능
# (closed-immutable hook은 status가 closed가 *아닌* 동안 통과)
```

**핵심**: hook 자체 비활성화는 *비권장*. 임시 케이스 외 closed 보호 안전망 유지.

**구현**: `tool_input.file_path` 매칭 → task.md 결정 (단일 vs 폴더) → 헤더 5컬럼 + 7-state whitelist 정규식으로 status 추출 → `closed`이면 exit 2.

**본문**: [template/.claude/hooks/closed-immutable.sh](../template/.claude/hooks/closed-immutable.sh) (2,996 B)

---

## 7. 본문 단일 진실 소스

| 정보 | 단일 진실 소스 |
|------|--------------|
| `git-guard.sh` 본문 + 정규식 | [template/.claude/hooks/git-guard.sh](../template/.claude/hooks/git-guard.sh) |
| `closed-immutable.sh` 본문 + 차단 패턴 | [template/.claude/hooks/closed-immutable.sh](../template/.claude/hooks/closed-immutable.sh) |
| git 룰 (브랜치/커밋/머지) | [template/.project/rules/GIT_RULE.md](../template/.project/rules/GIT_RULE.md) |
| 검증 명령 (사용자 프로젝트) | 사용자 프로젝트 `CLAUDE.md` `## 검증 명령` (코드 상태) / `## 테스트 명령` (테스트 실행) |
| CHANGELOG 룰 | [template/.project/rules/CHANGELOG_RULE.md](../template/.project/rules/CHANGELOG_RULE.md) |

본 문서는 *상위 추상 + 영역 정신 + link*. 본문은 실 구현 파일에서 정독.

---

## 8. PLAYBOOK 부활 검토 시점

hook 영역에서 부활 가능한 미래 옵션:

| PLAYBOOK § | 항목 | 부활 검토 시점 |
|-----------|------|----------|
| §4 | minimal form hook | 태스크 문서 형식 위반 (헤더 누락 / 섹션 빠짐) ≥ 5회 누적 → 진짜 불편 데이터 |

**부활 시 주의**: *섹션 존재* 검사만, *내용 검증 X*. 내용 검증 함정(합리적 변형 차단) 회피.

→ [PLAYBOOK.md](PLAYBOOK.md) §4

---

## 9. 잘 지키면 hook 작동 0회 정신

2 hook 모두 *catastrophic 안전망*. 정상 흐름:

| Hook | 정상 흐름 | hook 작동 |
|------|---------|---------|
| `git-guard.sh` | 작업 브랜치에서 커밋 / `--force` 안 씀 / `branch -d` 사용 | 0회 |
| `closed-immutable.sh` | closed task 코드 영역 수정 시 *새 task 생성*. closed task.md 직접 수정 X | 0회 |

**hook이 작동했다 = 사고 직전**. 작동했으면:
1. 메시지에서 어느 hook이 잡았는지 확인
2. 사용자 명시 승인 받지 않은 destructive 명령은 즉시 중단 + 사용자에게 보고
3. 우회 절차 따름 (closed task 재진입 등)

---

## 10. 동작 검증

2 hook 모두 단위 동작 검증 완료 (부트스트랩 시):

| Hook | 검증 시나리오 | 결과 |
|------|------------|------|
| `git-guard.sh` | `git status` (안전 명령) | 통과 ✅ |
| | `git push --force` | 차단 ✅ |
| | `git commit --no-verify` (dev 브랜치에서) | dev 직접 커밋 차단 우선 (exit 2) ✅ |
| | `git reset --hard HEAD~1` | 차단 ✅ |
| | `git branch -D foo` | 차단 ✅ |
| `closed-immutable.sh` | closed 상태 단일 파일 task.md Edit | 차단 ✅ |
| | closed 상태 폴더 승격 TASK-NNN_<slug>/task.md Edit | 차단 ✅ |
| | developing 상태 task.md Edit | 통과 ✅ |
| | 코드 파일 (영역 외) Edit | 통과 ✅ |
| | spec-diffs/*.md Edit (closed task) | 통과 ✅ (단순화 — 자유 수정) |
| | screenshots/*.png Write (closed task) | 통과 ✅ |

---

## 11. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-08 | 신규 작성 — hook 정신 + 영역 차이(practice/process/git/완료 보호) + 3 hook 정책 + 우회 절차 + 동작 검증 결과 |
| 2026-05-08 | §3에 settings.json 단일 진실 소스 + JSON 본문 + 미등록 시 hook fire 안 함 안내 추가 |
| 2026-05-08 | §6 closed-immutable 차단 범위 단순화 (task.md 본 파일만) — vX.X 공통 spec-diffs 미커버 비대칭 fix. spec-diffs/screenshots는 자유 수정. §10 동작 검증 표 갱신 |
| 2026-05-09 | 표현 정제 — 인명 / 경박 표현 / 스킬 용어 / 이전 버전 비교 단락(§2 영역 차이 / §8 폐기된 hook) 정리. 폐기 hook 비교는 [DECISIONS.md](DECISIONS.md)로 위임. |
| 2026-05-09 | npm 패키지명 `@angar2/taskery`로 변경 반영 — `npx taskery init` → `npx @angar2/taskery init` (settings.json 카피 안내). |
| 2026-05-30 | `pre-commit-verify.sh` hook 폐기 — task-close Step 2 게이트 + git-guard로 충분 (redundant 검증 사이클 제거). §3 / §5 / §7 / §9 / §10 표 정합. CLAUDE.md `## 검증 명령` + `## 테스트 명령` 두 섹션 분리 명시 추가 (stash FRICTION_LOG #25 반영). |
| 2026-05-30 | 정합 검증 후속 정정 (Phase 5) — §2 본문 *hook 3종* 잔존 표기 *2종*으로 갱신 + process 영역 한정 표현 제거 (pre-commit-verify 폐기 정합). §4 git-guard 표 메시지 *pre-commit-verify hook 우회 금지* → *commit hook 우회 금지* 일반화. |
