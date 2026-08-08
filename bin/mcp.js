#!/usr/bin/env node
// taskery MCP 서버 — lib.js core 함수를 구조화 도구로 노출 (CLI와 동일 단일 홈, 로직 중복 0)
/**
 * bin/mcp.js
 * `npx @angar2/taskery mcp` — stdio MCP 서버. Claude(.mcp.json) / Codex(codex mcp add) 등록.
 *
 * 도구 8종 = CLI 명령과 동일한 lib.js 함수의 다른 입구(네이티브 구조화 인자/반환).
 *   backlog_add / backlog_get / backlog_mark — 활성 plan BACKLOG.md 조작
 *   set_status   — task 헤더 상태 전이 (7×7 유효전이 검증, closed 거부)
 *   plan_init    — plan 생성 (채번+골격+manifest.activePlan 갱신)
 *   task_init    — task 분기 (fork 원자 채번 + §1.3 골격 자동 생성)
 *   task_close   — close 결정적 준비만 (Phase커밋·status=closed·마커). 비가역 머지/정리는 스킬.
 *   status       — 멀티세션 현황 + 활성 plan
 *
 * SDK(@modelcontextprotocol/sdk)는 dual CJS/ESM — require 조건으로 CJS 빌드 해결(검증 완료).
 */

const path = require('path');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const lib = require('./lib');

const VALID_TYPES = ['feature', 'bug', 'improve', 'refactor', 'docs', 'chore'];
const VALID_SIZES = ['micro', 'small', 'medium', 'large'];

// 메인 워크트리 검출 + manifest 확인. 실패 시 throw(핸들러 래퍼가 isError 응답으로 변환).
function resolveMainWt() {
  const mainWt = lib.getMainWorktreePath();
  if (!lib.readManifest(path.join(mainWt, lib.MANIFEST_NAME))) {
    throw new Error(`${lib.MANIFEST_NAME} 없음 — 'npx @angar2/taskery init' 먼저 실행 필요.`);
  }
  return mainWt;
}

// 'TASK-007' | 'TASK-7' | 7 | '7' → 7 (CLI 관용성 미러링)
function parseTaskNum(token) {
  const m = String(token).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : NaN;
}

// 미등록 케이스 문서는 task 워크트리에 있음 — 서버 cwd 고정이라 SSoT로 워크트리 유도.
function resolveTaskDoc(mainWt, taskNum) {
  const active = lib.getActiveTasks(mainWt).find((t) => t.taskNum === taskNum);
  const wtPath = active
    ? lib.getWorktreePath(lib.getProjectId(mainWt), {
        taskNum,
        src: active.src,
        slug: active.slug,
      })
    : mainWt;
  return lib.resolveTaskDocPath(mainWt, wtPath, { taskNum });
}

// 구조화 결과(JSON) + 선택 가이드 → MCP content.
function ok(data, guide) {
  const text = guide ? `${JSON.stringify(data)}\n\n${guide}` : JSON.stringify(data);
  return { content: [{ type: 'text', text }] };
}
function fail(message) {
  return { content: [{ type: 'text', text: `오류: ${message}` }], isError: true };
}

// 핸들러 공통 래퍼 — 예외를 isError 응답으로 변환(서버 크래시 방지).
function handler(fn) {
  return async (args) => {
    try {
      return await fn(args || {});
    } catch (e) {
      return fail(e.message);
    }
  };
}

const server = new McpServer({ name: 'taskery', version: lib.getPackageVersion() });

server.registerTool(
  'backlog_add',
  {
    description:
      '활성 plan BACKLOG.md에 task 후보 1건 추가 (BL-NNN 채번 + withMetaLock 직렬화). 얕은 분석 메타를 인자로 받는다.',
    inputSchema: {
      type: z.enum(VALID_TYPES),
      title: z.string().describe('한 줄 제목(한국어)'),
      slug: z.string().describe('영어 kebab-case 슬러그'),
      summary: z.string().describe('한 줄 개요'),
      target: z.string().describe('한 줄 대상 영역'),
    },
  },
  handler(async (a) => {
    const mainWt = resolveMainWt();
    const blNum = await lib.appendBacklogItem(mainWt, a);
    const blId = `BL-${String(blNum).padStart(3, '0')}`;
    return ok({ blNum, blId }, `${blId} 추가됨. 진행 의향이면 task_init이 이 메타로 워크트리를 분기한다.`);
  }),
);

server.registerTool(
  'backlog_get',
  {
    description:
      '활성 plan BACKLOG.md에서 BL-NNN 항목 메타 조회 → { blId, status, type, title, slug, summary, target, taskNums }.',
    inputSchema: { blId: z.string().regex(/^BL-\d+$/, 'BL-NNN 형식') },
  },
  handler(async (a) => {
    const mainWt = resolveMainWt();
    const item = lib.parseBacklogItem(mainWt, a.blId);
    if (!item) throw new Error(`${a.blId} 항목 없음.`);
    return ok(item);
  }),
);

server.registerTool(
  'backlog_mark',
  {
    description: 'BL-NNN을 [x] 확인 마킹 + TASK-NNN 연결 (withMetaLock). task_init 직후 호출.',
    inputSchema: {
      blId: z.string().regex(/^BL-\d+$/, 'BL-NNN 형식'),
      task: z.union([z.string(), z.number()]).describe('TASK-NNN 또는 번호'),
    },
  },
  handler(async (a) => {
    const taskNum = parseTaskNum(a.task);
    if (!Number.isInteger(taskNum)) throw new Error(`TASK 번호 파싱 실패 (받음: ${a.task}).`);
    const mainWt = resolveMainWt();
    await lib.markBacklogChecked(mainWt, a.blId, taskNum);
    return ok({ blId: a.blId, taskNum });
  }),
);

server.registerTool(
  'set_status',
  {
    description:
      'task 헤더 상태 전이 (TASK_DOC_RULE §1.2 7×7 유효전이 검증). 잘못된 전이 거부. closed 전이는 task_close가 담당하므로 여기선 거부.',
    inputSchema: {
      task: z.union([z.string(), z.number()]).describe('TASK-NNN 또는 번호'),
      state: z.string().describe('전이 목표 상태'),
    },
  },
  handler(async (a) => {
    const taskNum = parseTaskNum(a.task);
    if (!Number.isInteger(taskNum)) throw new Error(`TASK 번호 파싱 실패 (받음: ${a.task}).`);
    if (!Object.prototype.hasOwnProperty.call(lib.TRANSITIONS, a.state)) {
      throw new Error(`알 수 없는 상태: ${a.state} (유효: ${Object.keys(lib.TRANSITIONS).join(', ')})`);
    }
    if (a.state === 'closed') {
      throw new Error(`closed 전이는 set_status가 아니라 task_close(close 파이프라인)가 담당.`);
    }
    const mainWt = resolveMainWt();
    const resolved = resolveTaskDoc(mainWt, taskNum);
    if (!resolved) throw new Error(`TASK-${String(taskNum).padStart(3, '0')} 문서를 찾지 못함.`);
    const result = await lib.setStatus(resolved.file, a.state);
    return ok({ taskNum, ...result });
  }),
);

server.registerTool(
  'plan_init',
  {
    description:
      'plan(기능 그룹) 생성 — 채번 + 폴더 + ROADMAP/PLAN/BACKLOG 골격 + 활성 plan 갱신. 이후 골격 내용은 LLM이 채움. legacy 폴더 잔존 시 gated 반환(force로 재호출).',
    inputSchema: {
      slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, '영어 kebab-case'),
      force: z.boolean().optional().describe('legacy 게이트 무시'),
    },
  },
  handler(async (a) => {
    const mainWt = resolveMainWt();
    const result = lib.initPlan(mainWt, a.slug, { force: !!a.force });
    if (result.gated) {
      return ok(
        { gated: true, legacyDirs: result.legacyDirs },
        `plans/에 NNN 채번 아닌 폴더(${result.legacyDirs.join(', ')}) 잔존 — 사용자 confirm 후 force:true로 재호출.`,
      );
    }
    return ok(
      { plan: result.plan, nnn: result.nnn, planDir: result.planDir, tasksDir: result.tasksDir },
      `골격 생성됨. ROADMAP Stage 내용·PLAN 링크·FEATURES/UX-UI delta는 placeholder를 채운다.`,
    );
  }),
);

server.registerTool(
  'task_init',
  {
    description:
      'task 분기 — 채번+워크트리+브랜치 생성을 init 락으로 원자 실행. size·title 주면 §1.3 골격 task.md도 자동 생성(생성일·status=draft 자동). 통상 /task-init 경유.',
    inputSchema: {
      type: z.enum(VALID_TYPES),
      dev: z.string().describe('개발자 식별자 (claude / angar2 등)'),
      src: z.string().regex(/^(BL-\d+|RM-\d+|ST-\d+|DR)$/, 'BL-NNN | ST-N(로드맵 Stage) | DR (구형 RM-NNN 호환)'),
      slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, '영어 kebab-case'),
      size: z.enum(VALID_SIZES).optional(),
      title: z.string().optional().describe('한국어 제목 (size와 함께 주면 골격 생성)'),
      promote: z.boolean().optional(),
    },
  },
  handler(async (a) => {
    const mainWt = resolveMainWt();
    const result = await lib.forkTask(mainWt, {
      type: a.type,
      dev: a.dev,
      src: a.src,
      slug: a.slug,
    });
    let out = result;
    if (a.size && a.title) {
      try {
        const doc = lib.scaffoldTaskDoc(mainWt, result.wtPath, {
          taskNum: result.taskNum,
          slug: a.slug,
          title: a.title,
          type: a.type,
          size: a.size,
          parent: result.parent,
          promoted: !!a.promote,
        });
        out = { ...result, docPath: doc.file, registered: doc.registered, promoted: doc.promoted };
      } catch (e) {
        out = { ...result, scaffoldError: e.message };
      }
    }
    return ok(out, `워크트리 생성됨. 제목 확인 후 /task-plan으로 진행.`);
  }),
);

server.registerTool(
  'task_close',
  {
    description:
      'close 결정적 준비만 — Phase 커밋·status=closed·문서 커밋·추적마커. 게이트(status=tested)·매핑 모호 시 blocked 반환. 반환 parent = 스킬 머지 대상 부모 브랜치. 비가역(부모 --no-ff 머지·worktree/branch 정리·충돌 해결)은 스킬(task-close)이 후속 수행.',
    inputSchema: { task: z.union([z.string(), z.number()]).describe('TASK-NNN 또는 번호') },
  },
  handler(async (a) => {
    const taskNum = parseTaskNum(a.task);
    if (!Number.isInteger(taskNum)) throw new Error(`TASK 번호 파싱 실패 (받음: ${a.task}).`);
    const mainWt = resolveMainWt();
    const result = await lib.closeTask(mainWt, { taskNum });
    if (result.blocked === 'status') {
      return ok(result, `게이트 차단 — status=${result.current} (tested 아님). /task-test 통과 후 재호출.`);
    }
    if (result.blocked === 'mapping') {
      return ok(
        result,
        `Phase↔파일 매핑 모호 (${result.reason}) — Dev Plan '파일' 필드 확인 후 수동 Phase 커밋 → task_close 재호출.`,
      );
    }
    return ok(result, `prep 완료 (부모=${result.parent}). 비가역(사전 rebase·충돌해결·머지 락·부모 --no-ff 머지·정리)은 task-close 스킬이 후속 수행.`);
  }),
);

server.registerTool(
  'status',
  {
    description: '멀티세션 현황 — 진행중 task + 워크트리 + 활성 plan 버전.',
    inputSchema: {},
  },
  handler(async () => {
    const mainWt = resolveMainWt();
    const activeTasks = lib.getActiveTasks(mainWt);
    let activePlan = null;
    try {
      activePlan = lib.getActiveVersion(mainWt);
    } catch (e) {
      activePlan = null;
    }
    return ok({ activePlan, activeTasks });
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(`taskery mcp 실패: ${e.message}`);
  process.exit(1);
});
