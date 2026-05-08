# HOOKS — taskery v0.2 catastrophic 차단 3종

> 본 리포 *hook 정신의 단일 진실 소스*. 3 catastrophic hook 정책 + 5사이클과의 영역 차이 + 우회 절차.
> hook 본문은 `template/.claude/hooks/<hook>.sh`에 박힘 — 본 문서는 *왜 이 hook인지* + *영역 분리 정신*.

---

## 1. v0.2 hook 정신 — *catastrophic만 차단*

**원칙**: hook은 *복구 불가능한 사고*만 차단. *합리적 변형 있는 영역*은 instruction + 대화로.

**잘 지키면 hook 작동 0회 (무해). 안 지키면 차단 (catastrophic 막음).**

→ [DECISIONS.md §5](DECISIONS.md#5-결정-3-hook-화이트리스트practice--3-hook-catastrophic-onlyprocess--git--완료-보호)

---

## 2. 5사이클 hook과의 영역 차이

5사이클 회귀의 핵심 결함은 *practice 영역*을 hook으로 강제했다는 것.

| 영역 | 정의 | 예시 | hook 강제 |
|------|------|------|---------|
| **practice** | 합리적 변형 있는 영역 | 검토 본문 형식 / 상태 전이 흐름 / 자기 행 박기 | **X** (5사이클 함정) |
| **process** | 결정적 영역 — exit code 0 또는 != 0 | 린트 / 타입체크 / 빌드 / 단위 테스트 | **OK** (정당) |
| **git catastrophic** | 복구 불가능한 git 명령 | main/dev 직접 커밋 / force push / branch -D | **OK** (사고 차단) |
| **완료 보호** | closed task 재수정 차단 | task.md / spec-diffs/ 수정 | **OK** (이력 보호) |

**5사이클 hook 3종은 모두 practice 영역**:
- `pre-state-save.sh` — 상태 캡처 (화이트리스트 검증용)
- `validate-task-state.sh` — 25행 화이트리스트 검증
- `post-state-sync.sh` — 자기 행 검증 + 검토 결과 검증

→ 합리적 변형 차단 → 5사이클 회귀 5번 발생 → 폐기.

**v0.2 hook 3종은 모두 process / git / 완료 보호 영역** (§3 정책표).

---

## 3. 3 hook 정책표

| Hook | 영역 | 잡는 것 | PreToolUse 대상 |
|------|------|--------|---------------|
| `git-guard.sh` | git catastrophic | main/dev 직접 커밋 / `--force` / `--no-verify` / `branch -D` / `reset --hard` / `clean -fd` | Bash |
| `pre-commit-verify.sh` | process catastrophic | git commit 시 CLAUDE.md `## 검증 명령` 모두 PASS 게이트 | Bash |
| `closed-immutable.sh` | 완료 보호 catastrophic | closed task 문서 / spec-diffs/ 재수정 | Write \| Edit |

**hook 위치** (사용자 프로젝트):
- `.claude/hooks/git-guard.sh`
- `.claude/hooks/pre-commit-verify.sh`
- `.claude/hooks/closed-immutable.sh`

**Claude Code hook 등록** — 사용자 프로젝트 `.claude/settings.json` 또는 `~/.claude/settings.json`에 PreToolUse 매칭 등록 (사용자 환경에 따라).

---

## 4. `git-guard.sh` — git catastrophic 차단

**차단 6 명령**:
| # | 패턴 | 메시지 |
|---|------|------|
| 1 | `git commit` on `main` 또는 `dev` 브랜치 | *작업 브랜치({타입}/{개발자}_TASK-NNN_slug)에서 커밋* |
| 2 | `git push --force` 또는 `-f` | *정상 흐름 사유 없음. 사용자 명시 승인 필요* |
| 3 | `git commit --no-verify` | *pre-commit-verify hook 우회 금지* |
| 4 | `git branch -D` (강제 삭제) | *머지 안 된 브랜치 강제 삭제 사유 없음* |
| 5 | `git reset --hard` | *작업 손실 위험* |
| 6 | `git clean -fd` | *untracked 파일 + 디렉토리 강제 삭제 사유 없음* |

**우회**: 사용자 명시 승인이 있을 때만 hook 비활성화 (또는 hook 자체 임시 disable). 정상 흐름에서 우회 사유 없음.

**구현**: `tool_input.command` 추출 → 정규식 매칭 → exit 2 + GIT_RULE 인용 메시지.

**본문**: [template/.claude/hooks/git-guard.sh](../template/.claude/hooks/git-guard.sh) (2,766 B)

**단일 진실 소스 (룰)**: [.project/rules/GIT_RULE.md](../template/.project/rules/GIT_RULE.md) (프로젝트별) → `~/.claude/rules/GIT_RULE.md` (글로벌 fallback)

---

## 5. `pre-commit-verify.sh` — process 게이트

**동작**:
1. `tool_input.command`에서 `git commit` 명령 감지
2. 프로젝트 루트 `CLAUDE.md`의 `## 검증 명령` 섹션 추출
3. 백틱(`...`) 안 명령 모두 `eval`로 실행
4. 하나라도 fail (exit code != 0) → exit 2 (commit 차단) + 실패 명령 출력

**왜 process catastrophic** — 결정적 영역 (린트/타입/빌드/테스트). 합리적 변형 없음. *exit 0 또는 != 0*만 존재. hook 차단이 정당.

**잘 지키면 작동 0회** — `/task-dev` self-check + `/task-close` 최종 게이트로 이미 PASS 받은 상태에서 commit. 부분 작업 / 환경 변화 / 가정 누설 시 catastrophic 차단 안전망.

**우회**: `git commit --no-verify` (단 git-guard가 차단). 정상 흐름에서 우회 사유 없음.

**검증 명령 단일 진실 소스**:
- 사용자 프로젝트 루트 `CLAUDE.md` `## 검증 명령` 섹션 (백틱 안 명령)
- 한 곳 수정하면 self-check / 격리 게이트 / 최종 게이트 / hook 모두 따름
- → [SLASH-COMMANDS.md §5](SLASH-COMMANDS.md#5-검증-명령--단일-진실-소스)

**본문**: [template/.claude/hooks/pre-commit-verify.sh](../template/.claude/hooks/pre-commit-verify.sh) (2,951 B)

---

## 6. `closed-immutable.sh` — 완료 보호

**차단 범위**:
| # | 패턴 | 잡음 |
|---|------|------|
| 1 | `.project/tasks/v*/<NNN>_<slug>.md` (단일 파일) — 헤더 status=`closed` | task 문서 자체 재수정 |
| 2 | `.project/tasks/v*/TASK-<NNN>_<slug>/(task.md\|spec-diffs/*.md)` (폴더 승격) — 부모 task.md status=`closed` | spec-diffs/ 하위 파일도 차단 |

**차단 안 함** (의도적):
- closed task의 *관련 코드* 영역 — 1차에서 차단 X. 메인이 closed task 코드 영역 재수정하는 흐름은 *다른 task로 처리*가 정상 → 별도 hook 차단 불필요. 진짜 짜증 모이면 PLAYBOOK §4 minimal form hook 보강

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
| `pre-commit-verify.sh` 본문 + 검증 명령 추출 로직 | [template/.claude/hooks/pre-commit-verify.sh](../template/.claude/hooks/pre-commit-verify.sh) |
| `closed-immutable.sh` 본문 + 차단 패턴 | [template/.claude/hooks/closed-immutable.sh](../template/.claude/hooks/closed-immutable.sh) |
| git 룰 (브랜치/커밋/머지) | [template/.project/rules/GIT_RULE.md](../template/.project/rules/GIT_RULE.md) |
| 검증 명령 (사용자 프로젝트) | 사용자 프로젝트 `CLAUDE.md` `## 검증 명령` |

본 문서는 *상위 추상 + 영역 정신 + link*. 본문은 실 구현 파일에서 읽는다.

---

## 8. 폐기된 v0.1.0 hook 3종

| Hook | 폐기 사유 | 보존 위치 |
|------|---------|---------|
| `pre-state-save.sh` | 25행 화이트리스트 검증용 — practice 영역 | `taskery-prototype` 리포 (`.taskestra/hooks/`) |
| `validate-task-state.sh` | 합리적 변형 차단 사고의 핵심 — practice 영역 | `taskery-prototype` 리포 |
| `post-state-sync.sh` | 자기 행 검증 + 검토 결과 검증 — practice 영역 | `taskery-prototype` 리포 |

→ [DECISIONS.md §5](DECISIONS.md#5-결정-3-hook-화이트리스트practice--3-hook-catastrophic-onlyprocess--git--완료-보호) + [DECISIONS.md §11](DECISIONS.md#11-결정-archive-5사이클-자산-본-리포-x--taskery-prototype-보존)

---

## 9. PLAYBOOK 부활 트리거

hook 영역에서 부활 가능한 미래 옵션:

| PLAYBOOK § | 항목 | 부활 트리거 |
|-----------|------|----------|
| §4 | minimal form hook | 태스크 문서 형식 위반 (헤더 누락 / 섹션 빠짐) ≥ 5회 누적 → 진짜 짜증 데이터 |

**부활 시 주의**: *섹션 존재* 검사만, *내용 검증 X*. 5사이클의 25행 화이트리스트 함정 회피.

→ [PLAYBOOK.md](PLAYBOOK.md) §4

---

## 10. 잘 지키면 hook 작동 0회 정신

3 hook 모두 *catastrophic 안전망*. 정상 흐름:

| Hook | 정상 흐름 | hook 작동 |
|------|---------|---------|
| `git-guard.sh` | 작업 브랜치에서 커밋 / `--force` 안 씀 / `branch -d` 사용 | 0회 |
| `pre-commit-verify.sh` | `/task-dev` self-check + `/task-close` 최종 게이트 PASS 받고 commit | 0회 |
| `closed-immutable.sh` | closed task 코드 영역 수정 시 *새 task 생성*. closed task.md 직접 수정 X | 0회 |

**hook이 작동했다 = 사고 직전**. 작동했으면:
1. 메시지에서 어느 hook이 잡았는지 확인
2. 사용자 명시 승인 받지 않은 destructive 명령은 즉시 중단 + 사용자에게 보고
3. 우회 절차 따름 (closed task 재진입 등)

---

## 11. 동작 검증

3 hook 모두 단위 동작 검증 완료 (taskery v0.2 부트스트랩 시):

| Hook | 검증 시나리오 | 결과 |
|------|------------|------|
| `git-guard.sh` | `git status` (안전 명령) | 통과 ✅ |
| | `git push --force` | 차단 ✅ |
| | `git commit --no-verify` (dev 브랜치에서) | dev 직접 커밋 차단 우선 (exit 2) ✅ |
| | `git reset --hard HEAD~1` | 차단 ✅ |
| | `git branch -D foo` | 차단 ✅ |
| `closed-immutable.sh` | closed 상태 task.md Edit | 차단 ✅ |
| | developing 상태 task.md Edit | 통과 ✅ |
| | 코드 파일 (영역 외) Edit | 통과 ✅ |
| `pre-commit-verify.sh` | `bash -n` 문법 검사 | 통과 ✅ (실행 검증은 사이드 프로젝트에서) |

---

## 12. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-08 | 신규 작성 — v0.2 hook 정신 + 영역 차이(practice/process/git/완료 보호) + 3 hook 정책 + 우회 절차 + 폐기 5사이클 hook + 동작 검증 결과 |
