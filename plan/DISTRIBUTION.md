# DISTRIBUTION — taskery v0.2 배포 메커니즘

> 본 리포 *배포의 단일 진실 소스*. npx 진입점 + bin/ 5 스크립트 + manifest 머지 로직.
> 본문 코드는 `bin/*.js`에 박힘 — 본 문서는 *왜 npx + 머지 흐름 정신*.

---

## 1. 배포 시나리오

| 시나리오 | 동작 |
|---------|------|
| **새 프로젝트 시작** (지크 또는 동료) | `npx create-taskery <project-name>` — 새 폴더 생성 + 자산 카피 + manifest 박음 |
| **기존 리포에 도입** | 리포 디렉토리에서 `npx taskery init` — 자산 카피 + manifest 박음 |
| **버전 업데이트 (진화)** | `npx taskery update` — 최신 버전 fetch + manifest 비교 + 머지 갱신 |
| **특정 버전 고정** | `npx taskery@0.2.5 init` — semver 명시 |

**대상 환경**:
- 지크 본인 (집/회사 PC)
- 동료 진영 (Node.js 환경 — 진입장벽 0)
- 진화/업데이트도 동일 메커니즘

→ [DECISIONS.md §8](DECISIONS.md#8-결정-배포--npx-단일-default)

---

## 2. 단일 default = npx

| 명령 | 동작 | bin |
|------|------|-----|
| `npx create-taskery <name>` | 새 폴더 + 자산 카피 + manifest | `bin/create.js` |
| `npx taskery init` | 현재 디렉토리에 자산 카피 + manifest | `bin/init.js` (via `bin/taskery.js`) |
| `npx taskery update` | 최신 버전 머지 갱신 | `bin/update.js` (via `bin/taskery.js`) |
| `npx taskery help` | 사용법 출력 | `bin/taskery.js` |
| `npx taskery@<version> <cmd>` | 특정 버전 고정 | npm semver 사용 |

**대안 미채택**:
- Claude Code plugin (`/plugin`) — 환경 미지원 (지크 VSCode extension) + 이중 유지비. PLAYBOOK §6 미래로 폐기
- 직접 git clone + 카피 — 머지 갱신 자동화 X

→ [DECISIONS.md §8](DECISIONS.md#8-결정-배포--npx-단일-default)

---

## 3. `bin/` 5 스크립트 역할

| 스크립트 | 역할 | 분량 |
|---------|------|------|
| [bin/lib.js](../bin/lib.js) | 공통 유틸 — `walkTemplate()` (해시 맵), `sha256()`, `mkdirp()`, `copyFile()`, `writeManifest()`, `readManifest()`, `isLocalOverride()` | 3,089 B |
| [bin/taskery.js](../bin/taskery.js) | 진입점 dispatcher — `init` / `update` / `help` 서브커맨드 분기 | 1,350 B |
| [bin/init.js](../bin/init.js) | `npx taskery init` 본체 — template/ → cwd 카피 + manifest 동적 생성 | 3,765 B |
| [bin/create.js](../bin/create.js) | `npx create-taskery <name>` — mkdir + cd + init 호출 | 1,592 B |
| [bin/update.js](../bin/update.js) | `npx taskery update` — 4 분기 머지 로직 | 5,764 B |

**의존성**: Node.js 표준 라이브러리만 (`fs` / `path` / `crypto` / `child_process` / `readline`). 외부 npm 의존 0.

---

## 4. 카피 대상 / 미대상

`bin/init.js`는 *`template/` 디렉토리 안 모든 파일*을 사용자 cwd로 카피.

**카피 대상 (코어 영역 — npx 갱신)** — 18 파일:
| 카테고리 | 파일 |
|---------|------|
| 메인 instruction | `CLAUDE.md` |
| 슬래시 본문 (8) | `.claude/skills/{project,plan,task}-*.md`, `.claude/skills/refine.md` |
| Hook (3) | `.claude/hooks/{git-guard,pre-commit-verify,closed-immutable}.sh` |
| 룰 (2) | `.project/rules/{TASK_DOC_RULE,GIT_RULE}.md` |
| 짜증 누적 빈 템플릿 | `.project/FRICTION_LOG.md` |
| 멀티리포 골격 | `.project/shared/{sent,received}/completed/.gitkeep` |
| 루트 .gitignore | `.gitignore` |

**카피 미대상 (사용자 영역)** — `template/`에 없으므로 자동으로 미카피:
- `.project/PROJECT.md` — `/project-init` 생성 (사람용 도메인 설명)
- `.project/AGENT-GUIDE.md` — `/project-init` 생성 (메인 진입 가이드)
- `.project/LINKED-REPOS.md` — `/project-init` 생성 (멀티리포 명세)
- `.project/.env` — 사용자 직접 작성 (멀티리포 환경 변수, gitignore)
- `.project/plans/<vX.X>/*` — `/plan-init` 생성 (9 기획 문서)
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

> ⚠ 원 플랜 §5-1 도식에는 `template/.taskery-manifest.json`로 박혀 있었지만, 실제 구현은 *사용자별 path / installed_at / hash가 모두 다르므로* `template/`에 박지 않고 *init.js 동적 생성*으로 수정. 결정 사유 → 부트스트랩 검증 minor #B.

**구조**:
```json
{
  "version": "0.2.0",
  "installed_at": "2026-05-08T07:55:07.652Z",
  "files": {
    "CLAUDE.md": {
      "hash": "sha256:60e56a651fe3...",
      "core": true,
      "managed": true
    },
    ".claude/skills/task-init.md": {
      "hash": "sha256:...",
      "core": true,
      "managed": true
    },
    ".claude/hooks/git-guard.sh": { ... },
    ".project/rules/TASK_DOC_RULE.md": { ... }
    // ... 18 파일
  },
  "updated_at": "<update 호출 시 박힘>"
}
```

**필드**:
- `version` — taskery 패키지 버전 (init 또는 update 호출 시 갱신)
- `installed_at` — 최초 init 시각 (update에서도 보존)
- `updated_at` — update 호출 시 박힘 (init은 없음)
- `files.<path>.hash` — `sha256:` prefix + 16진수 해시
- `files.<path>.core` — true (모두 코어 — *.local.md는 manifest에 없음)
- `files.<path>.managed` — true (npx 관리 대상)

---

## 6. update 머지 로직 — 4 분기

`npx taskery update` 호출 시 각 파일 분기:

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
// 5. 새 manifest 갱신 (updated_at 박음)
// 6. 결과 요약 출력
```

**검증 완료** (스모크 테스트):
- ✅ no-change 시나리오: 18 unchanged
- ✅ 충돌 시나리오 'n' 응답: 사용자 보존
- ✅ 충돌 시나리오 'y' 응답: .bak 생성 + 새 코어 덮어쓰기

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

**현재 상태**: `package.json` 박혔지만 *publish 전*. 사용자(지크)가 명시 요청 시까지 publish X.

**publish 전 보완 항목** (BUILD_RESULT.md minor #A, #C):
1. **README.md 작성** — 설치 / 슬래시 흐름 / hook 안전망 한 페이지 가이드. publish 시 npm 첫 화면.
2. **`bin/taskery.js` GitHub URL placeholder 교체** — 현재 `https://github.com/<...>/taskery` 그대로. 사용자가 link 클릭 시 깨짐.

**publish 흐름** (사용자 직접):
```bash
npm login                    # npm 계정 인증
npm publish                  # 0.2.0 publish
# 또는
npm publish --tag beta       # beta tag로 publish
```

**semver 운영**:
- v0.2.x — 본 골격 안 minor 보강 (hook 추가 / 슬래시 boost / bin 개선)
- v0.3.0 — 큰 변경 (예: PLAYBOOK 부활 항목 도입, 새 슬래시)
- v1.0.0 — 진짜 데이터 검증 충분 (사이드 프로젝트 5+ task 굴린 후)

**`package.json` 메타** ([package.json](../package.json)):
```json
{
  "name": "taskery",
  "version": "0.2.0",
  "bin": {
    "taskery": "./bin/taskery.js",
    "create-taskery": "./bin/create.js"
  },
  "files": ["bin/", "template/", "plan/PLAYBOOK.md", "RETROSPECTIVE.md", "README.md"],
  "engines": { "node": ">=18.0.0" }
}
```

**`files` 배열 — npm publish 포함 대상**:
- `bin/` — 5 스크립트 모두
- `template/` — 사용자 카피 대상 18 파일
- `plan/PLAYBOOK.md` — 미래 옵션 카탈로그 (사용자가 정독 가능하게)
- `RETROSPECTIVE.md` — 5사이클 회고 (학습 자료)
- `README.md` — npm 첫 화면

**`files` 미포함**:
- `.git/`, `.gitignore`, `.temp/` — 개발 환경 자산
- `plan/{OVERVIEW,SLASH-COMMANDS,TASK-DOC,HOOKS,DISTRIBUTION,DECISIONS}.md` — 본 plan/ 6 문서는 *taskery 시스템 자체 spec*. 사용자 프로젝트는 *template/CLAUDE.md*만 보면 됨. 단 *동료 학습용*으로 publish 대상에 추가할지는 검토 필요 (현재 미포함)

---

## 9. 빌드 시스템 폐기

5사이클의 `extract-spec.js` (plan → template 자동 빌드) + IDEMPOTENT 해시 검증 → **폐기**.

**WHY**:
- 자동 동기화 = *spec과 빌드 사이 또 다른 source of truth* 생성 → 모순 누적
- IDEMPOTENT 검증 = *practice 영역 강제*의 다른 형태 — 5사이클 함정 재발

**대신**:
- *plan ↔ template* 동기화 의무는 **사용자(지크) 직접**
- 사용자 의무 명시 위치: 사용자 프로젝트 `CLAUDE.md` `## 동기화 룰`

**예시** (사용자 프로젝트 CLAUDE.md):
```markdown
## 동기화 룰

- plan/ ↔ template/ 동기화는 사용자 직접 (자동 빌드 X)
- 검증 명령 (위) 변경 시 슬래시 instruction이 그대로 따름
- npx update 시 사용자 customize 충돌은 *.bak 백업 + confirm 받음
```

→ [DECISIONS.md §7](DECISIONS.md#7-결정-extract-specjs-빌드--idempotent-해시--폐기)

---

## 10. PLAYBOOK 부활 트리거

배포 영역에서 부활 가능한 미래 옵션:

| PLAYBOOK § | 항목 | 부활 트리거 |
|-----------|------|----------|
| §6 | Claude Code plugin 발행 | `/plugin` 환경 지원 + 동료 사용자 충분 |
| §9 | 머지 로직 엣지 케이스 보강 | npx update 시 사용자 customize 충돌 빈발 |

**부활 흐름**: FRICTION_LOG 패턴 ≥ 3회 → `/refine` 회고 → 사용자 합의 → PLAYBOOK 본문 §방법 그대로 적용.

→ [PLAYBOOK.md](PLAYBOOK.md) §6 / §9

---

## 11. 동작 검증

`bin/` 스크립트 모두 동작 검증 완료 (taskery v0.2 부트스트랩 시):

| 시나리오 | 결과 |
|---------|------|
| Node syntax check (`node --check`) — 5 스크립트 | 통과 ✅ |
| `node bin/taskery.js help` 출력 | 정상 ✅ |
| `bin/init.js` → /tmp/taskery-smoke 18 파일 카피 + manifest 생성 | 통과 ✅ |
| `bin/update.js` no-change | 18 unchanged ✅ |
| `bin/update.js` 충돌 시나리오 'n' | 사용자 보존 (CLAUDE.md "customized" 라인 그대로) ✅ |
| `bin/update.js` 충돌 시나리오 'y' | .bak 백업 + 새 코어 덮어쓰기 (CLAUDE.md.bak 생성) ✅ |

**아직 검증 안 된 것**:
- 실제 npm publish (사용자 직접)
- 진짜 사이드 프로젝트에 적용 후 update 흐름 (C11 대기)

---

## 12. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-08 | 신규 작성 — npx 시나리오 + bin/ 5 스크립트 + 카피 대상 / 미대상 + manifest 구조 + update 머지 4 분기 + *.local 룰 + npm publish 운영 + 빌드 시스템 폐기 사유 |
