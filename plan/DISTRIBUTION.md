# DISTRIBUTION — 배포 메커니즘

> 본 리포 *배포의 단일 진실 소스*. npx 진입점 + bin/ 7 스크립트 + manifest 머지 로직.
> 본문 코드는 `bin/*.js`에 위치 — 본 문서는 *왜 npx + 머지 흐름 정신*.

---

## 1. 배포 시나리오

| 시나리오 | 동작 |
|---------|------|
| **새 프로젝트 시작** | `npx -p @angar2/taskery create-taskery <project-name>` — 새 폴더 생성 + 자산 카피 + manifest 작성 |
| **기존 리포에 도입** | 리포 디렉토리에서 `npx @angar2/taskery init` — 자산 카피 + manifest 작성 |
| **버전 업데이트 (진화)** | `npx @angar2/taskery update` — 최신 버전 fetch + manifest 비교 + 머지 갱신 |
| **특정 버전 고정** | `npx @angar2/taskery@0.1.5 init` — semver 명시 |

**대상 환경**:
- 사용자 본인 (집/회사 PC)
- 동료 진영 (Node.js 환경 — 진입장벽 0)
- 진화/업데이트도 동일 메커니즘

→ [DECISIONS.md §8](DECISIONS.md)

---

## 2. 단일 default = npx

| 명령 | 동작 | bin |
|------|------|-----|
| `npx -p @angar2/taskery create-taskery <name>` | 새 폴더 + 자산 카피 + manifest | `bin/create.js` |
| `npx @angar2/taskery init` | 현재 디렉토리에 자산 카피 + manifest | `bin/init.js` (via `bin/taskery.js`) |
| `npx @angar2/taskery update` | 최신 버전 머지 갱신 | `bin/update.js` (via `bin/taskery.js`) |
| `npx @angar2/taskery status` | 진행중 태스크 + 워크트리 + 머지 락 상태 출력 (멀티세션 0.1.2+) | `bin/status.js` (via `bin/taskery.js`) |
| `npx @angar2/taskery prune` | stale 워크트리 / 브랜치 대화형 정리 (멀티세션 0.1.2+) | `bin/prune.js` (via `bin/taskery.js`) |
| `npx @angar2/taskery help` | 사용법 출력 | `bin/taskery.js` |
| `npx @angar2/taskery@<version> <cmd>` | 특정 버전 고정 | npm semver 사용 |

**대안 미채택**:
- Claude Code plugin (`/plugin`) — 환경 미지원 (VSCode extension) + 이중 유지비. PLAYBOOK §6 미래로 보류
- 직접 git clone + 카피 — 머지 갱신 자동화 X

→ [DECISIONS.md §8](DECISIONS.md)

---

## 3. `bin/` 7 스크립트 역할

| 스크립트 | 역할 | 분량 |
|---------|------|------|
| [bin/lib.js](../bin/lib.js) | 공통 유틸 — 기본 7종(`walkTemplate` / `sha256` / `mkdirp` / `copyFile` / `writeManifest` / `readManifest` / `isLocalOverride`) + 멀티세션 (0.1.2+) 유틸 (`getMainWorktreePath` / `getProjectId` / `getWorktreePath` / `withMergeLock` / `withMetaLock` / `getActiveTasks` / `getNextTaskNumber` / `assertMainWorktreeOnDev` / `assertDevExists` / `parseBranchName` / `generateProjectId` 등) + 백로그 (0.1.2+) 유틸 (`getActiveVersion` / `getBacklogPath` / `appendBacklogItem` / `parseBacklogItem` / `markBacklogChecked` + `BACKLOG_PLACEHOLDER` 상수) | 16,570 B |
| [bin/taskery.js](../bin/taskery.js) | 진입점 dispatcher — `init` / `update` / `status` / `prune` / `help` 서브커맨드 분기 | 1,870 B |
| [bin/init.js](../bin/init.js) | `npx @angar2/taskery init` 본체 — template/ → cwd 카피 + manifest 동적 생성 + .gitignore 인터랙티브 prompt | 5,608 B |
| [bin/create.js](../bin/create.js) | `npx -p @angar2/taskery create-taskery <name>` — mkdir + cd + init 호출 | 1,638 B |
| [bin/update.js](../bin/update.js) | `npx @angar2/taskery update` — 4 분기 머지 로직 + manifest 마이그레이션 (`projectId` / `stale_days` / `lock_timeout_ms` 누락 필드 자동 추가) | 6,749 B |
| [bin/status.js](../bin/status.js) | `npx @angar2/taskery status` — 진행중 태스크 (SSoT) + 워크트리 폴더 상태 + 마지막 커밋 시각 + 머지 락 상태 + stale 의심 (케이스 A/B/C/D) + orphan 워크트리 출력 (멀티세션 0.1.2+) | 5,096 B |
| [bin/prune.js](../bin/prune.js) | `npx @angar2/taskery prune` — `git worktree prune` 자동 + stale 의심 항목 사용자 선택 보존/삭제 (멀티세션 0.1.2+) | 6,181 B |

**의존성**: Node.js 표준 라이브러리(`fs` / `path` / `crypto` / `child_process` / `readline` / `os`) + 외부 1종 [`proper-lockfile`](https://www.npmjs.com/package/proper-lockfile) (0.1.2+ 멀티세션 머지 락 / 메타 파일 쓰기 락 직렬화 — 백로그 동시 쓰기 직렬화도 동일 인프라 재사용).

---

## 4. 카피 대상 / 미대상

`bin/init.js`는 *`template/` 디렉토리 안 모든 파일*을 사용자 cwd로 카피.

**카피 대상 (코어 영역 — npx 갱신)** — 25 파일:
| 카테고리 | 파일 |
|---------|------|
| 메인 instruction | `CLAUDE.md` |
| 스킬 본문 (9) | `.claude/skills/{project-init,plan-init,task-init,task-plan,task-dev,task-test,task-close,add-backlog,log-friction}/SKILL.md` |
| Hook (2) | `.claude/hooks/{git-guard,closed-immutable}.sh` |
| Hook 등록 (1) | `.claude/settings.json` |
| 룰 (4) | `.project/rules/{TASK_DOC_RULE,GIT_RULE,CHANGELOG_RULE,MOCKUP_RULE}.md` |
| 불편 누적 빈 템플릿 | `.project/FRICTION_LOG.md` |
| 사용자 영역 빈 골격 (4) | `.project/{changelog,flows,plans,tasks}/.gitkeep` |
| 멀티리포 골격 (2) | `.project/shared/{sent,received}/completed/.gitkeep` |
| 루트 .gitignore | `.gitignore` |

**카피 미대상 (사용자 영역)** — `template/`에 없으므로 자동으로 미카피:
- `.project/PROJECT.md` — `/project-init` 생성 (사람용 도메인 설명)
- `.project/AGENT-GUIDE.md` — `/project-init` 생성 (메인 진입 가이드)
- `.project/LINKED-REPOS.md` — `/project-init` 생성 (멀티리포 명세)
- `.project/.env` — 사용자 직접 작성 (멀티리포 환경 변수, gitignore)
- `.project/plans/<vX.X>/*` — `/plan-init` 생성 (기획 문서)
- `.project/tasks/<vX.X>/*` — `/task-init` ~ `/task-close` 생성/갱신
- `.project/flows/<module>.md` — `/task-dev` 갱신
- `.project/changelog/<YYYY-MM>.md` — `/task-close` 갱신
- `src/`, `package.json`, `README.md` — 사용자 코드

**원칙** — *코어 vs 사용자 영역 분리*:
- 코어는 npx로 갱신 (사용자가 *.bak 백업 + confirm 받고 갱신)
- 사용자 영역은 npx 미터치 (사용자 자산 보호)

---

## 5. `.taskery-manifest.json` 구조 + 위치

**위치**: 사용자 프로젝트 루트 (cwd) hidden 단일 파일. **`init.js`가 동적 생성**.

> ⚠ 원 plan §5-1 도식에는 `template/.taskery-manifest.json`로 들어 있었지만, 실제 구현은 *사용자별 path / installed_at / hash가 모두 다르므로* `template/`에 포함하지 않고 *init.js 동적 생성*으로 수정.

**구조** (필드 순서는 `bin/init.js` / `bin/update.js`의 `writeManifest` 호출 시 객체 리터럴 순서 그대로):
```json
{
  "version": "0.1.2",
  "installed_at": "2026-05-08T07:55:07.652Z",
  "updated_at": "<update 호출 시 갱신 — init 시점에는 없음>",
  "projectId": "<8자 hex — 멀티세션 워크트리 폴더 충돌 방지, 0.1.2+>",
  "stale_days": 30,
  "lock_timeout_ms": 30000,
  "files": {
    "CLAUDE.md": {
      "hash": "sha256:60e56a651fe3...",
      "core": true,
      "managed": true
    },
    ".claude/skills/task-init/SKILL.md": {
      "hash": "sha256:...",
      "core": true,
      "managed": true
    },
    ".claude/hooks/git-guard.sh": { ... },
    ".project/rules/TASK_DOC_RULE.md": { ... }
    // ... 25 파일 (0.1.2+ — 스킬 9종 + 룰 4종 + hook 2종 + settings.json + CLAUDE.md + FRICTION_LOG.md + 빈 골격 .gitkeep 6 + .gitignore)
  }
}
```

**필드**:
- `version` — taskery 패키지 버전 (init 또는 update 호출 시 갱신)
- `installed_at` — 최초 init 시각 (update에서도 보존)
- `updated_at` — update 호출 시 갱신 (init은 없음)
- `files.<path>.hash` — `sha256:` prefix + 16진수 해시
- `files.<path>.core` — true (모두 코어 — *.local.md는 manifest에 없음)
- `files.<path>.managed` — true (npx 관리 대상)
- `projectId` (0.1.2+) — 8자 hex. 멀티세션 워크트리 폴더 (`~/.taskery/worktrees/<projectId>/...`) 충돌 방지
- `stale_days` (0.1.2+) — 워크트리 stale 의심 판정 일수 (기본 30). `taskery status` / `prune` 참조
- `lock_timeout_ms` (0.1.2+) — proper-lockfile `stale` 옵션값 (기본 30000ms). 머지 락 / 메타 파일 쓰기 락 단일 진실 소스

---

## 6. update 머지 로직 — 4 분기

`npx @angar2/taskery update` 호출 시 각 파일 분기:

| 분기 | 조건 | 동작 |
|------|------|------|
| **a. 동일** | new template hash == manifest hash | 미터치 (manifest 항목 그대로) |
| **b. 신규** | manifest에 없음 (template에만 있음) | 카피 + manifest에 추가 |
| **c. 자동 갱신** | new != manifest **AND** user == manifest | 사용자 customize 없음 → 자동 카피 + manifest 갱신 |
| **d. 사용자 customize 검출** | new != manifest **AND** user != manifest | *.bak 백업 + confirm (y/N) |
| | y → 새 코어로 덮어쓰기 + manifest 갱신 | |
| | N → 사용자 보존 (manifest는 옛 entry 유지) | |

**+ 사라짐 검사**: manifest에 있는데 새 template에 없는 파일 → 사용자에게 경고 (사용자 파일은 보존).

**+ `*.local.md` 보호**: manifest에 없음 → 항상 미터치. 사용자 오버라이드 영역.

**구현 흐름** ([bin/update.js](../bin/update.js)):
```js
// 1. .taskery-manifest.json 읽기 (없으면 'init' 안내 + exit)
// 2. template/ 새 해시 맵 (walkTemplate)
// 3. 각 새 template 파일 분기 (a/b/c/d)
// 4. 사라짐 검사
// 5. 새 manifest 갱신 (updated_at 갱신)
// 6. 결과 요약 출력
```

**검증 완료** (스모크 테스트):
- ✅ no-change 시나리오: 25 unchanged (0.1.2+ 9 스킬 + 4 룰 + 2 hook + settings.json + CLAUDE.md + FRICTION_LOG.md + .gitkeep 6 + .gitignore)
- ✅ 충돌 시나리오 'n' 응답: 사용자 보존
- ✅ 충돌 시나리오 'y' 응답: .bak 생성 + 새 코어 덮어쓰기
- ✅ 0.1.1 → 0.1.2 마이그레이션: manifest에 `projectId` / `stale_days` / `lock_timeout_ms` 자동 추가

---

## 7. `*.local.md` 사용자 오버라이드 룰

**원칙**: `.local.md` suffix는 *사용자 영역* — npx 미터치.

**예시**:
- `.project/rules/GIT_RULE.local.md` — 프로젝트별 git 룰 보강 (코어 GIT_RULE.md는 npx 갱신, .local.md는 미터치)
- `.project/rules/TASK_DOC_RULE.local.md` — 사용자 task 양식 추가 룰

**검사 위치** — [bin/lib.js](../bin/lib.js) `isLocalOverride(relPath)`:
```js
function isLocalOverride(relPath) {
  return relPath.endsWith('.local.md');  // LOCAL_SUFFIX
}
```

**init / update 모두 적용**:
- init.js — template/에 .local.md가 들어가면 안 되지만 방어적으로 스킵
- update.js — manifest에 없는 .local.md → 미터치 (사용자 오버라이드 보호)

---

## 8. npm publish 운영

**현재 상태**: publish-prep 4 항목(README.md / `bin/taskery.js` GitHub URL / `package.json` metadata / LICENSE) 완료. 사용자 명시 요청 시까지 publish X.

**publish 흐름** (사용자 직접):
```bash
npm login                    # npm 계정 인증
npm publish --dry-run        # 패키지 내용 검증 (선택)
npm publish                  # publish
# 또는
npm publish --tag beta       # beta tag로 publish
```

**semver 운영**:
- patch (0.x.y → 0.x.y+1) — 본 골격 안 minor 보강 (hook 추가 / 스킬 boost / bin 개선)
- minor (0.x.0 → 0.(x+1).0) — 큰 변경 (예: PLAYBOOK 부활 항목 도입, 새 스킬)
- major (1.0.0) — 진짜 데이터 검증 충분 (사이드 프로젝트 5+ task 굴린 후)

**`package.json` 메타** ([package.json](../package.json)):
```json
{
  "name": "@angar2/taskery",
  "version": "0.1.2",
  "bin": {
    "taskery": "bin/taskery.js",
    "create-taskery": "bin/create.js"
  },
  "files": ["bin/", "template/", "README.md", "LICENSE"],
  "author": "angar2 <angaridev@gmail.com>",
  "license": "MIT",
  "repository": { "type": "git", "url": "git+https://github.com/angar2/taskery.git" },
  "homepage": "https://github.com/angar2/taskery#readme",
  "bugs": { "url": "https://github.com/angar2/taskery/issues" },
  "publishConfig": { "access": "public" },
  "engines": { "node": ">=18.0.0", "git": ">=2.31.0" },
  "dependencies": { "proper-lockfile": "^4.1.2" }
}
```

**`files` 배열 — npm publish 포함 대상**:
- `bin/` — 7 스크립트 모두 (멀티세션 0.1.2+ status.js / prune.js 포함)
- `template/` — 사용자 카피 대상 25 파일 (백로그 0.1.2+ add-backlog/SKILL.md 포함)
- `README.md` — npm 첫 화면
- `LICENSE` — MIT 라이선스

**`files` 미포함**:
- `.git/`, `.gitignore`, `.temp/` — 개발 환경 자산
- `plan/` 7 문서 — *taskery 시스템 자체 spec*. 사용자 프로젝트는 *template/CLAUDE.md*만 정독하면 됨. README의 `plan/` 링크는 GitHub 절대 URL로 처리되어 npm 페이지에서도 클릭 시 GitHub로 이동.

---

## 9. 자동 빌드 미채택

자동 빌드 시스템(`extract-spec.js` 류 — plan → template 자동 빌드 + IDEMPOTENT 해시 검증)은 **채택하지 않음**.

**WHY**:
- 자동 동기화 = *spec과 빌드 사이 또 다른 source of truth* 생성 → 모순 누적
- IDEMPOTENT 검증 = *practice 영역 강제*의 또 다른 형태 — 동일 형태의 함정 재발

**대신**:
- *plan ↔ template* 동기화 의무는 **사용자 직접**
- 사용자 의무 명시 위치: 사용자 프로젝트 `CLAUDE.md` `## 동기화 룰`

**예시** (사용자 프로젝트 CLAUDE.md):
```markdown
## 동기화 룰

- plan/ ↔ template/ 동기화는 사용자 직접 (자동 빌드 X)
- `## 검증 명령` / `## 테스트 명령` (CLAUDE.md 두 섹션) 변경 시 스킬 instruction이 그대로 따름
- npx update 시 사용자 customize 충돌은 *.bak 백업 + confirm 받음
```

→ [DECISIONS.md §7](DECISIONS.md)

---

## 10. PLAYBOOK 부활 검토 시점

배포 영역에서 부활 가능한 미래 옵션:

| PLAYBOOK § | 항목 | 부활 검토 시점 |
|-----------|------|----------|
| §6 | Claude Code plugin 발행 | `/plugin` 환경 지원 + 동료 사용자 충분 |
| §9 | 머지 로직 엣지 케이스 보강 | npx update 시 사용자 customize 충돌 빈발 |

**부활 흐름**: FRICTION_LOG 누적 → 사용자 직접 정독 → PLAYBOOK 본문 §방법 그대로 적용.

→ [PLAYBOOK.md](PLAYBOOK.md) §6 / §9

---

## 11. 동작 검증

`bin/` 스크립트 모두 동작 검증 완료 (부트스트랩 시 + 멀티세션 0.1.2+ 검증):

| 시나리오 | 결과 |
|---------|------|
| Node syntax check (`node --check`) — 7 스크립트 | 통과 ✅ |
| `node bin/taskery.js help` 출력 | 정상 ✅ |
| `bin/init.js` → smoke test 25 파일 카피 + manifest 생성 (`projectId` / `stale_days` / `lock_timeout_ms` 자동 생성) | 통과 ✅ |
| `bin/update.js` no-change | 25 unchanged ✅ |
| `bin/update.js` 충돌 시나리오 'n' | 사용자 보존 (CLAUDE.md "customized" 라인 그대로) ✅ |
| `bin/update.js` 충돌 시나리오 'y' | .bak 백업 + 새 코어 덮어쓰기 (CLAUDE.md.bak 생성) ✅ |
| `bin/update.js` 0.1.1 → 0.1.2 마이그레이션 | manifest에 `projectId` / `stale_days` / `lock_timeout_ms` 자동 추가 ✅ |
| `bin/status.js` 진행중 태스크 + 워크트리 + 머지 락 출력 (0.1.2+) | 통과 ✅ |
| `bin/prune.js` stale 워크트리 대화형 정리 (0.1.2+) | 통과 ✅ |
| `bin/lib.js` `appendBacklogItem` 동시 두 프로세스 (0.1.2+) | `withMetaLock` 직렬화 통과 ✅ |
| `bin/lib.js` `markBacklogChecked` 중복 방지 + 다회 콤마 (0.1.2+) | 통과 ✅ |

**아직 검증 안 된 것**:
- 실제 npm publish (사용자 직접)
- 진짜 사이드 프로젝트에 적용 후 update 흐름

---

## 12. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-08 | 신규 작성 — npx 시나리오 + bin/ 5 스크립트 + 카피 대상 / 미대상 + manifest 구조 + update 머지 4 분기 + *.local 룰 + npm publish 운영 + 자동 빌드 미채택 사유 |
| 2026-05-08 | §4 카피 대상 18 → 19 갱신 (settings.json hook 등록 행 추가) |
| 2026-05-08 | §4 카피 대상 19 → 23 갱신 (사용자 영역 빈 골격 4 .gitkeep 추가 — changelog/flows/plans/tasks). init 직후 .project/ 비대칭 fix — /project-init 스킬이 채우기 전에 빈 폴더는 미리 작성되어야 사용자 입장에서 *세팅된 느낌* |
| 2026-05-09 | 표현 정제 — 인명 / 경박 표현 / 스킬 용어 / 이전 버전 비교 단락 정리. `package.json` files 필드에서 외부 회고 문서 참조 제거 (현 리포에 부재). plan/ 파일명 SLASH-COMMANDS.md → SKILLS.md 반영. |
| 2026-05-09 | §8 publish-prep 4 항목 완료 반영 — README.md 작성 + `bin/taskery.js` GitHub URL 채움 + `package.json` metadata 보강(author/repository/homepage/bugs) + LICENSE 작성. `files` 배열 슬림(plan/PLAYBOOK.md 제거 + LICENSE 추가). |
| 2026-05-09 | publish 첫 버전이 0.1.0임을 반영 — `0.2.0` → `0.1.0` (manifest 예시 + §8 package.json 메타 예시), `npx taskery@0.2.5` → `0.1.5` (semver 예시). |
| 2026-05-09 | npm 패키지명 `@angar2/taskery`로 변경 (이름 충돌 해소) — npx/npm 명령 표기 모두 갱신. §8 `package.json` 메타 예시도 동기화 (name + publishConfig 추가 + bin `./` prefix 제거 반영). 프로젝트 정체성 호칭은 *taskery* 그대로 유지. |
| 2026-05-10 | 스킬 8종 구조 마이그레이션 반영 — §4 카피 대상 표 스킬 본문 행 + §5 manifest 예시 안 키 경로를 `<name>.md` → `<name>/SKILL.md`로 갱신. (Claude Code 표준 스킬 구조 적용, 카피 대상 23 파일 갯수 자체는 동일. 0.1.1 후보) |
| 2026-05-30 | 정합 검증 후속 정정 (Phase 5) — §4 카피 대상 표 *23 파일* → *24 파일* 갱신: Hook (3) → (2) [pre-commit-verify.sh 삭제] + 룰 (2) → (4) [CHANGELOG_RULE / MOCKUP_RULE 신설]. §7 디렉토리 구조 본문도 동일 갱신. (stash FRICTION_LOG 정합 후속) |
| 2026-05-30 | 정합 검증 후속 정정 (3차) — §9 자동 빌드 미채택 본문 사용자 프로젝트 CLAUDE.md 동기화 룰 예시에서 `검증 명령 (위)` → `## 검증 명령 / ## 테스트 명령 (두 섹션)` 정합 (CLAUDE.md 두 섹션 분리 정합). |
| 2026-05-31 | 0.1.2 멀티세션 + 백로그 정합 누락 일괄 정정 (정합 순회 1차) — §1행 캡션 *bin/ 5 스크립트* → *7 스크립트* / §2 명령 표 `status` / `prune` 행 추가 / §3 헤더 *5 스크립트* → *7 스크립트* + 본문 lib.js 분량 3,089B → 16,570B + 멀티세션/백로그 함수 목록 명시 / taskery.js 1,350B → 1,694B + `status` / `prune` 서브커맨드 명시 / init.js 3,765B → 5,608B + .gitignore prompt 명시 / create.js 1,592B → 1,638B / update.js 5,764B → 6,749B + manifest 마이그레이션 명시 / status.js / prune.js 행 신규 / 의존성 본문 *외부 npm 의존 0* → *proper-lockfile 1종* 갱신 / §4 카피 대상 *24 파일 + 스킬 (8)* → *25 파일 + 스킬 (9, add-backlog 포함)* / §5 manifest 예시 *18 파일* → *25 파일* 주석 + `projectId` / `stale_days` / `lock_timeout_ms` 필드 명시 / §5 필드 본문에 0.1.2+ 3 필드 추가 / §8 files 배열 본문 *5 스크립트 + 24 파일* → *7 스크립트 + 25 파일* / §11 동작 검증 표 갱신 (7 스크립트 + 25 파일 카피 / 25 unchanged + 0.1.1 → 0.1.2 마이그레이션 + status.js / prune.js 동작 + appendBacklogItem 동시 직렬화 + markBacklogChecked 중복 방지). 단순 수치 정합, 행위 변경 X |
| 2026-05-31 | 정합 순회 2차 후속 정정 — §5 manifest 예시 필드 순서를 실제 `bin/init.js:100~107` / `bin/update.js:164~172` 출력 순서(version → installed_at → updated_at → projectId → stale_days → lock_timeout_ms → files)와 일치시킴 (1차 정정 시 `projectId` 등을 `files` 뒤에 박았던 표기 정합 X 정정) + version 예시 0.1.0 → 0.1.2 갱신 / §11 동작 검증 표 *appendBacklogItem 동시 직렬화* / *markBacklogChecked 중복 방지* 행 본 세션 미실행 검증 결과 수치(P2 BL-001 6ms 등) 인용 제거 → 단순 *통과 ✅* 표기로 변경 (이전 세션 보고 수치를 본 세션이 직접 재현하지 않았으므로 수치 명시 부적절) |
| 2026-05-31 | 정합 순회 5차 후속 정정 — §3 표 `bin/taskery.js` 분량 *1,694 B* → *1,870 B* (2차 commit에서 헤더 주석에 `status` / `prune` 서브커맨드 2행 추가했으나 분량 표 갱신 누락분 정합) + §8 `package.json` 메타 예시: `"version": "0.1.0"` → *0.1.2* / `"engines"`에 `"git": ">=2.31.0"` 추가 / `"dependencies": { "proper-lockfile": "^4.1.2" }` 신규 추가 (실제 package.json 0.1.2 본문과 일치). 단순 수치/필드 정합, 행위 변경 X |
