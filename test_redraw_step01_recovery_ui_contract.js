'use strict';

const assert = require('assert');
const fs = require('fs');

const mvp = fs.readFileSync(require.resolve('./mvp.js'), 'utf8');
const server = fs.readFileSync(require.resolve('./server.js'), 'utf8');
const css = fs.readFileSync(require.resolve('./product.css'), 'utf8');
const redrawBody = mvp.indexOf('function renderRedrawStageBody');
const renderStart = mvp.indexOf("if (stageId === '01')", redrawBody);
const renderEnd = mvp.indexOf("if (stageId === '02')", renderStart);
assert(renderStart > 0 && renderEnd > renderStart);
const stage01 = mvp.slice(renderStart, renderEnd);

for (const status of ['infra_failed','blocked_contract','blocked_quality','blocked_authorization']) {
  assert(stage01.includes(status), `missing UI recovery status ${status}`);
  assert(server.includes(status), `missing server recovery status ${status}`);
}
assert(stage01.includes('recoveryEligible'));
assert(stage01.includes('data-start-step01'));
assert(stage01.includes("data-start-step01") && stage01.includes('>开始分析</button>'));
assert(!stage01.includes('继续 Step01 分析'));
assert(!stage01.includes('恢复 Step01'));
assert(stage01.includes('01 / 原片事实证据包'));
assert(server.includes("analysis_scope:'source_evidence_only'"));
assert(!stage01.includes('特殊要求（可选）'));
assert(!stage01.includes('name="visualStyle"'));
const stage02Start = renderEnd;
const stage02End = mvp.indexOf("if (stageId === '03')", stage02Start);
const stage02 = mvp.slice(stage02Start, stage02End);
assert(stage02.includes('特殊要求（可选）'));
assert(stage02.includes('name="visualStyle"'));
for (const value of ['en-US','ja-JP','ko-KR','es-MX','es-ES','pt-BR','faithful_redraw','cinematic_realism','premium_short_drama','stylized_realism','commercial_polish','4:5','480p','720p','1080p']) assert(stage02.includes("'" + value + "'"), `missing post-analysis setting ${value}`);
assert(mvp.includes('visualStyle:String(data.get(\'visualStyle\') || \'\')'));
assert(server.includes("visualStyle:new Set(['faithful_redraw','cinematic_realism','premium_short_drama','stylized_realism','commercial_polish'])"));
assert(server.includes("quality:new Set(['480p','720p','1080p'])"));
assert(server.includes("const redrawAnalysisPolicyVersion = 'source-evidence-v1'"));
assert(!mvp.includes('function step01StatusMessage'));
assert(mvp.includes('function step01ProgressDetails'));
assert(mvp.includes('data-step01-elapsed'));
assert(mvp.includes('const elapsedAttribute = progressDetails.active && progressDetails.startedAt'));
assert(mvp.includes('function refreshActiveRedrawProject'));
assert(mvp.includes('function redrawStudioProjectionFingerprint'));
const activeRefresh = mvp.slice(mvp.indexOf('function step01ProjectionFingerprint'), mvp.indexOf('async function hydrateRedrawSourceFacts'));
assert(!activeRefresh.includes('project.analysis?.updatedAt'));
assert(!activeRefresh.includes('project.runtime?.lastHeartbeat'));
assert(!activeRefresh.includes('project.runtime?.checkpointUpdatedAt'));
assert(!activeRefresh.includes('project.runtime?.worker?.updatedAt'));
const redrawRender = mvp.slice(mvp.indexOf('function renderRedrawStudio'), mvp.indexOf('function preserveCurrentStudioStageFocus'));
assert(redrawRender.includes("const next = document.createElement('template')"));
assert(redrawRender.includes("replacement?.replaceWith(existingVideo)"));
assert(redrawRender.includes('target.replaceChildren(next.content)'));
assert(redrawRender.includes('target.dataset.redrawStudioProjectId'));
const projectRefresh = mvp.slice(mvp.indexOf('async function loadProjects'), mvp.indexOf('function handleDocumentClick'));
assert(projectRefresh.includes('const keepStableStage01'));
assert(projectRefresh.includes('visibleRedrawFingerprint === nextRedrawFingerprint'));
assert(mvp.includes("window.setInterval(() => {\n    if (!state.user || document.hidden) return;\n    refreshStep01ElapsedLabels();\n  }, 1000);"));
assert(!mvp.includes('if (state.user && !document.hidden) loadProjects();'));
assert(stage01.includes("'<section class=\"redraw-source-settings\"><header>"));
assert(stage01.includes("analysisCard + primaryAction + '</section></div>' + factTimeline + '</section>'"));
assert(stage01.includes('redraw-facts-timeline'));
assert(stage01.includes('data-source-facts-shot-id'));
assert(mvp.includes('hydrateRedrawSourceFacts'));
assert(server.includes('step01_customer_evidence_index.json'));
assert(css.includes("grid-template-areas: 'preview settings'"));
assert(css.includes("grid-template-areas: 'settings' 'preview'"));
assert(css.includes('width: 100%'));
assert(css.includes('height: clamp(420px, 54vh, 520px)'));
assert(css.includes('min-height: 44px'));
assert(css.includes('height: 40px'));
assert(css.includes('@media (min-width: 981px)'));
assert(css.includes('grid-template-rows: minmax(0, 1fr)'));
assert(css.includes('height: 100%; min-height: 0;'));
assert(css.includes('object-fit: contain'));
assert(!css.includes('.redraw-reference-context'));
assert(!stage01.includes('const referenceContext'));
assert(!stage01.includes("</div><footer><span>' + escapeHtml(hasSource ? sourceMeta"));
assert(!stage01.includes('<section class="redraw-source-preview"><header>'));
assert(!stage01.includes('参考视频用于理解镜头、叙事、节奏和视觉目标'));
assert(!mvp.includes("</dl><p>' + escapeHtml(sourceStatus) + '</p></section>"));
assert(!stage01.includes('class="redraw-source-summary"'));
assert(!stage01.includes('class="redraw-rights-note"'));
assert(css.includes('.redraw-source-stage { min-height: 0; }'));
assert(!stage01.includes('humanizeProductionGate(runtime.blocker)'));
assert(server.includes("const recoveryEligible=['infra_failed','blocked_contract','blocked_resource','blocked_quality','blocked_authorization','blocked_transport'].includes(priorAnalysisStatus)"));
assert(server.includes("if (recoveryEligible && dispatchLeaseActive(project))"));
assert(server.includes("STEP01_RECOVERY_ALREADY_VERIFIED"));
assert(server.includes('recovered_from_run_id:recoveryEligible'));
assert(server.includes('sourceOnlyStep01Task({project,analysisRun,authorization,rightsEvidence,requestedAt})'));
assert(mvp.includes('已创建原片分析任务 · 正在准备 Mac 执行条件'));
assert(mvp.includes('正在等待 Mac HQ 健康刷新'));
assert(mvp.includes('等待 COS artifact broker 配置'));
assert(mvp.includes('step01Transport'));
assert(mvp.includes('artifact_broker_ready'));
assert(mvp.includes('artifact_transport_state'));
assert(mvp.includes('fixed_app_turn_state'));
assert(mvp.includes('reducer_state'));
assert(server.includes("const step01ArtifactBroker = require('./bridge/niannian_step01_artifact_broker')"));
assert(server.includes('ARTIFACT_BROKER_NOT_CONFIGURED'));
assert(server.includes('step01TransportLayers'));
assert(server.includes('applyStep01ArtifactBrokerBlocked'));
assert(server.includes('不会回退到 Mac 与 Windows 之间的 SCP'));
assert(mvp.includes("status === 'blocked_resource' && project?.runtime?.gateState === 'step01_hq_full_blocked_no_dispatch'"));
assert(mvp.includes('function isFixedAppExecutorWait'));
assert(mvp.includes("'step01_fixed_app_dispatch_prepared', 'step01_fixed_app_dispatch_ready'"));
assert(mvp.includes("'STEP01_FIXED_APP_PHASE_EXECUTOR_NOT_INSTALLED', 'STEP01_FIXED_APP_PHASE_EXECUTOR_READY_FOR_DISPATCH'"));
assert(mvp.includes("'STEP01_FIXED_APP_PHASE_EXECUTOR_READY_FOR_DISPATCH'"));
assert(mvp.includes("'step01_fixed_app_dispatch_ready'"));
assert(stage01.includes('fixedPhaseResumeEligible'));
assert(stage01.includes('data-resume-step01-fixed-phase'));
assert(mvp.includes("'/step01-fixed-phase/resume'"));
assert(server.includes('async function resumeExistingFixedStep01Phase'));
assert(server.includes("result.status === 'fixed_app_dispatch_started'"));
assert(server.includes("step01FixedResumeMatch = pathname.match"));
assert(server.includes('fixedStep01Dispatch.prepareDispatch'));
assert(server.includes('fixedStep01Dispatch.executePrepared(prepared)'));
assert(mvp.includes('已锁定 Employee 01 phase，等待受控 Desktop App phase executor'));
assert(mvp.includes('已锁定 Employee 01 phase，等待受控 Desktop App 派发'));
assert(mvp.includes("elapsedLabel:executorWait ? '实际分析耗时' : '已用时间'"));
assert(mvp.includes("elapsedText:executorWait ? '尚未开始'"));
assert(mvp.includes('showWaitDuration:executorWait'));
assert(mvp.includes('data-step01-wait'));
assert(mvp.includes('等待时长'));
assert(mvp.includes('等待受控执行器安装'));
assert(mvp.includes('等待受控派发'));
assert(server.includes('const matchesCurrentResourceBlock = resourceBlocker'));
assert(server.includes('resourceBlocker.authorization_event_id === project.analysis.authorizationEventId'));
assert(server.includes('const alreadyProjected = project.analysis.status === \'blocked_resource\''));
assert(server.includes('if (alreadyProjected) return false;'));

const startHandler = mvp.slice(mvp.indexOf('const startStep01 = event.target.closest'), mvp.indexOf("if (event.target.closest('[data-open-reference-redraw]'))"));
assert(startHandler.includes("api('/api/projects/' + encodeURIComponent(projectId) + '/step01-analysis', {method:'POST'})"));
assert(startHandler.includes("api('/api/projects/' + encodeURIComponent(projectId) + '/step01-fixed-phase/resume', {method:'POST'})"));
assert(!startHandler.includes('window.confirm'), 'Step01 click is the owner action and must not require a duplicate confirmation');

process.stdout.write(JSON.stringify({ok:true,verified:[
  'Step01 UI exposes one direct start-analysis action for the same exact server allowlist',
  'Step01 click itself is the owner action and has no duplicate browser confirmation',
  'settings remain locked during recovery',
  'recovery reuses the existing data-start-step01 authenticated API path',
  'server rejects active lease and already-verified evidence replay',
  'prepared fixed App phase displays executor wait separately from actual analysis time'
]}) + '\n');
