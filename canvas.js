(() => {
  'use strict';

  const root = document.querySelector('#niannianCanvasRoot');
  if (!root) return;

  const labels = {
    intent:'创作意图', character:'角色', scene:'场景', shot:'分镜', reference:'参考素材',
    image:'图像生成', video:'视频生成', delivery:'交付成片', note:'便签'
  };
  const kinds = {redraw:'视频转绘', script:'小说短剧'};
  const themeStorageKey = 'niannian-canvas-theme-v1';
  const readTheme = () => { try { return localStorage.getItem(themeStorageKey) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } };
  const state = {route:null, projects:[], project:null, doc:null, revision:0, selectedId:null, pendingSource:null, history:[], future:[], saving:false, dirty:false, error:null, saveTimer:null, drag:null, pan:null, ready:false, status:'', projectRefreshTimer:null, theme:readTheme()};

  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const id = prefix => prefix + '-' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : Math.random().toString(36).slice(2, 18));
  const copy = value => JSON.parse(JSON.stringify(value));
  const defaultViewport = () => ({x:80,y:80,zoom:1});
  const isCanvasRoute = () => /^#canvas(?:\/(redraw|script)\/([^/]+))?$/i.exec(location.hash);
  const routeFromHash = () => {
    const match = isCanvasRoute();
    return match && match[1] && match[2] ? {kind:match[1].toLowerCase(),projectId:decodeURIComponent(match[2])} : null;
  };
  const cacheKey = route => 'niannian-canvas-recovery-v1:' + route.kind + ':' + route.projectId;

  async function request(path, options = {}) {
    const response = await fetch(path, {credentials:'same-origin',cache:'no-store',...options,headers:{Accept:'application/json',...(options.headers || {})}});
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || '请求失败');
      error.status = response.status;
      error.code = payload.code;
      throw error;
    }
    return {payload,etag:response.headers.get('etag')};
  }

  function starterDocument(project) {
    const base = project.kind === 'script' ? [
      ['intent','本集意图','提炼这一集的冲突、情绪与视觉目标。',80,180],
      ['character','角色资产','确认主角形象、服装状态与表情。',355,96],
      ['scene','场景资产','确认本集主场景的时间、氛围和道具。',355,290],
      ['shot','分镜组','整理镜头动作、节奏与首尾帧。',640,190],
      ['image','首帧 / 参考图','在现有资产流程里生成并确认画面参考。',930,100],
      ['video','视频组','从已确认的镜头组进入现有视频生产流程。',930,300],
      ['delivery','成片交付','在既有交付面完成审核与导出。',1215,205]
    ] : [
      ['intent','转绘方向','记录目标风格、语言市场和制作重点。',80,180],
      ['reference','源片证据','复用 Step01 的原片事实、关键帧与镜头证据。',360,92],
      ['shot','镜头时间线','在 Step02 完成可审核的本地化镜头方案。',360,290],
      ['image','角色与首帧','在现有资产流程中生成并确认角色、场景和首帧。',650,100],
      ['video','镜头视频','从已确认首帧和镜头任务继续视频生成。',940,204],
      ['delivery','交付','回到原有交付流程审核和获取成片。',1220,204]
    ];
    const nodes = base.map(([type,title,prompt,x,y]) => ({id:id('node'),type,position:{x,y},data:{projectId:project.id,entityType:type,title,prompt,note:'',status:type === 'intent' ? 'ready' : 'draft',assetIds:[],taskId:null,entityId:null,shotId:null}}));
    const edges = nodes.slice(1).map((node,index) => ({id:id('edge'),source:nodes[index].id,target:node.id,kind:index === 0 ? 'reference' : 'depends_on'}));
    return {version:1,nodes,edges,viewport:defaultViewport()};
  }

  async function loadProjects() {
    const [redraw, script] = await Promise.all([
      request('/api/projects').catch(error => ({error})),
      request('/api/script-projects').catch(error => ({error}))
    ]);
    const firstError = redraw.error || script.error;
    if (firstError && firstError.status === 401) throw firstError;
    const makeProject = (project, kind) => ({id:String(project.id),name:String(project.name || '未命名项目'),kind,status:String(project.status || ''),runtime:project.runtime || {},updatedAt:project.updatedAt || project.createdAt || null});
    state.projects = [
      ...((redraw.payload?.projects || []).map(project => makeProject(project, 'redraw'))),
      ...((script.payload?.projects || []).map(project => makeProject(project, 'script')))
    ];
  }

  function projectByRoute(route) { return state.projects.find(project => project.kind === route.kind && project.id === route.projectId) || null; }

  async function loadDocument(route) {
    state.ready = false;
    state.error = null;
    render();
    const {payload,etag} = await request('/api/canvas/documents/' + encodeURIComponent(route.kind) + '/' + encodeURIComponent(route.projectId));
    state.project = {...payload.project,kind:route.kind};
    state.revision = Number(payload.revision || 0);
    state.doc = payload.document?.nodes?.length ? payload.document : starterDocument(state.project);
    state.status = payload.updatedAt ? '已保存' : '待保存';
    const recovery = sessionStorage.getItem(cacheKey(route));
    if (recovery && !payload.updatedAt) {
      try {
        const local = JSON.parse(recovery);
        if (local && local.document?.nodes?.length) state.doc = local.document;
      } catch {}
    }
    state.selectedId = state.doc.nodes[0]?.id || null;
    state.history = [];
    state.future = [];
    state.dirty = !payload.updatedAt;
    state.ready = true;
    render();
    if (state.dirty) scheduleSave();
  }

  function snapshot() { return copy({doc:state.doc,selectedId:state.selectedId}); }
  function remember() { state.history.push(snapshot()); if (state.history.length > 60) state.history.shift(); state.future = []; }
  function restore(snapshotValue) { state.doc = copy(snapshotValue.doc); state.selectedId = snapshotValue.selectedId; state.dirty = true; render(); scheduleSave(); }
  function undo() { const prior = state.history.pop(); if (!prior) return; state.future.push(snapshot()); restore(prior); }
  function redo() { const next = state.future.pop(); if (!next) return; state.history.push(snapshot()); restore(next); }
  function selectedNode() { return state.doc?.nodes.find(node => node.id === state.selectedId) || null; }

  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(themeStorageKey, state.theme); } catch {}
    render();
  }

  function scheduleSave() {
    if (!state.route || !state.doc) return;
    state.dirty = true;
    state.status = '待保存';
    try { sessionStorage.setItem(cacheKey(state.route), JSON.stringify({document:state.doc,updatedAt:new Date().toISOString()})); } catch {}
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => void save(), 700);
    renderStatus();
  }

  async function save({force = false} = {}) {
    if (!state.route || !state.doc || state.saving || (!state.dirty && !force)) return;
    state.saving = true;
    state.status = '保存中';
    renderStatus();
    try {
      const {payload,etag} = await request('/api/canvas/documents/' + encodeURIComponent(state.route.kind) + '/' + encodeURIComponent(state.route.projectId), {
        method:'PUT', headers:{'Content-Type':'application/json','If-Match':etagForRevision(state.revision)}, body:JSON.stringify({document:state.doc})
      });
      state.doc = payload.document;
      state.revision = Number(payload.revision || state.revision + 1);
      state.dirty = false;
      state.status = '已保存';
      try { sessionStorage.removeItem(cacheKey(state.route)); } catch {}
      if (etag && etag !== etagForRevision(state.revision)) state.revision = Number(payload.revision);
    } catch (error) {
      if (error.status === 412) {
        state.status = '有新版本，重新载入后再保存';
      } else state.status = error.message || '保存失败';
    } finally {
      state.saving = false;
      renderStatus();
    }
  }

  function etagForRevision(revision) { return '"canvas-rev-' + Number(revision || 0) + '"'; }

  function addNode(type) {
    if (!state.doc) return;
    remember();
    const surface = root.querySelector('.canvas-surface');
    const width = surface?.clientWidth || 800;
    const height = surface?.clientHeight || 600;
    const viewport = state.doc.viewport || defaultViewport();
    const point = {x:(width / 2 - viewport.x) / viewport.zoom - 100,y:(height / 2 - viewport.y) / viewport.zoom - 60};
    const defaults = {
      intent:['创作意图','说明本次视频要呈现的故事、动作、镜头和情绪。'],character:['角色','角色身份、外观、服装和表演要求。'],scene:['场景','空间、光线、时间与关键道具。'],shot:['分镜','镜头动作、景别、节奏与首尾帧。'],reference:['参考素材','绑定现有项目素材或 Step01 / Step03 结果。'],image:['图像生成','填写图像意图后，进入既有资产生成与审核流程。'],video:['视频生成','填写镜头意图后，在既有视频生产流程提交任务。'],delivery:['交付成片','将已确认的视频结果关联到既有交付面。'],note:['便签','记录讨论、审核意见或下一步。']
    };
    const [title,prompt] = defaults[type] || defaults.note;
    const node = {id:id('node'),type,position:point,data:{projectId:state.project.id,entityType:type,title,prompt,note:'',status:'draft',assetIds:[],taskId:null,entityId:null,shotId:null}};
    state.doc.nodes.push(node);
    state.selectedId = node.id;
    render();
    scheduleSave();
  }

  function deleteSelected() {
    if (!state.selectedId || !state.doc) return;
    remember();
    state.doc.nodes = state.doc.nodes.filter(node => node.id !== state.selectedId);
    state.doc.edges = state.doc.edges.filter(edge => edge.source !== state.selectedId && edge.target !== state.selectedId);
    state.selectedId = state.doc.nodes[0]?.id || null;
    state.pendingSource = null;
    render();
    scheduleSave();
  }

  function connect(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId || !state.doc) return;
    if (state.doc.edges.some(edge => edge.source === sourceId && edge.target === targetId)) return;
    remember();
    state.doc.edges.push({id:id('edge'),source:sourceId,target:targetId,kind:'depends_on'});
    state.pendingSource = null;
    render();
    scheduleSave();
  }

  function addProjectStageNodes() {
    if (!state.project || !state.doc) return;
    const has = new Set(state.doc.nodes.map(node => node.data?.entityType));
    const additions = state.project.kind === 'script' ? [
      ['shot','N04 分镜组','绑定项目当前分镜分组和镜头依赖。'],['image','N05 首帧资产','绑定已确认的人物、场景和首帧资产。'],['video','N06 视频任务','绑定现有视频组任务与执行状态。']
    ] : [
      ['reference','Step01 源片证据','绑定原片事实、镜头和关键帧。'],['shot','Step02 时间线','绑定已确认的本地化镜头方案。'],['image','Step03 视觉资产','绑定角色、场景和首帧任务。']
    ];
    const missing = additions.filter(([type]) => !has.has(type));
    if (!missing.length) { state.status = '当前项目阶段已同步'; renderStatus(); return; }
    remember();
    missing.forEach(([type,title,prompt], index) => state.doc.nodes.push({id:id('node'),type,position:{x:200 + index * 270,y:520},data:{projectId:state.project.id,entityType:type,title,prompt,note:'来自项目流程的可追踪节点。',status:'ready',assetIds:[],taskId:null,entityId:null,shotId:null}}));
    render();
    scheduleSave();
  }

  function resetViewport() { if (!state.doc) return; remember(); state.doc.viewport = defaultViewport(); render(); scheduleSave(); }
  function zoomAt(factor, clientX, clientY) {
    const surface = root.querySelector('.canvas-surface');
    if (!surface || !state.doc) return;
    const rect = surface.getBoundingClientRect(), viewport = state.doc.viewport;
    const x = (clientX - rect.left - viewport.x) / viewport.zoom, y = (clientY - rect.top - viewport.y) / viewport.zoom;
    const zoom = Math.max(.35, Math.min(2.4, viewport.zoom * factor));
    viewport.x = clientX - rect.left - x * zoom; viewport.y = clientY - rect.top - y * zoom; viewport.zoom = zoom;
  }

  function pointFor(node, side) {
    const viewport = state.doc.viewport;
    return {x:viewport.x + (node.position.x + (side === 'out' ? 220 : 0)) * viewport.zoom,y:viewport.y + (node.position.y + 58) * viewport.zoom};
  }

  function edgePath(edge) {
    const source = state.doc.nodes.find(node => node.id === edge.source), target = state.doc.nodes.find(node => node.id === edge.target);
    if (!source || !target) return '';
    const a = pointFor(source,'out'), b = pointFor(target,'in'), spread = Math.max(36, Math.abs(b.x - a.x) * .42);
    return 'M ' + a.x + ' ' + a.y + ' C ' + (a.x + spread) + ' ' + a.y + ', ' + (b.x - spread) + ' ' + b.y + ', ' + b.x + ' ' + b.y;
  }

  function nodeMarkup(node) {
    const data = node.data || {}, selected = node.id === state.selectedId;
    const status = String(data.status || 'draft');
    const task = data.taskId ? '任务已绑定' : (data.assetIds?.length ? data.assetIds.length + ' 个素材' : '未绑定任务');
    return '<article class="canvas-node ' + escapeHtml(node.type) + (selected ? ' is-selected' : '') + '" data-canvas-node="' + escapeHtml(node.id) + '" style="transform:translate(' + Number(node.position.x) + 'px,' + Number(node.position.y) + 'px)"><button class="canvas-port in' + (state.pendingSource ? ' is-pending' : '') + '" type="button" data-canvas-port="in" aria-label="连接输入端"></button><header class="canvas-node-head" data-canvas-drag="' + escapeHtml(node.id) + '"><span class="canvas-node-swatch ' + escapeHtml(node.type) + '"></span><strong>' + escapeHtml(data.title || labels[node.type]) + '</strong><span class="canvas-node-kind">' + escapeHtml(labels[node.type] || node.type) + '</span></header><div class="canvas-node-body"><p>' + escapeHtml(data.prompt || data.note || '填写节点内容') + '</p><div class="canvas-node-meta"><span class="canvas-node-status ' + escapeHtml(status) + '">' + escapeHtml(status === 'succeeded' ? '已完成' : status === 'running' ? '执行中' : status === 'queued' ? '排队中' : status === 'ready' ? '已就绪' : status === 'failed' ? '失败' : '草稿') + '</span><span>' + escapeHtml(task) + '</span></div></div><button class="canvas-port out" type="button" data-canvas-port="out" aria-label="连接输出端"></button></article>';
  }

  function inspectorMarkup() {
    const node = selectedNode();
    if (!node) return '<header><h2>检查器</h2><p>选择一个节点查看详情。</p></header><div class="canvas-empty-inspector">从左侧添加节点，或在画布上选择已有节点。</div>';
    const data = node.data || {};
    return '<header><h2>节点检查器</h2><p>' + escapeHtml(labels[node.type] || node.type) + ' · 所有数据随项目保存</p></header><div class="canvas-inspector-card"><label>标题<input data-canvas-field="title" value="' + escapeHtml(data.title || '') + '" maxlength="120"></label><label>状态<select data-canvas-field="status"><option value="draft"' + (data.status === 'draft' ? ' selected' : '') + '>草稿</option><option value="ready"' + (data.status === 'ready' ? ' selected' : '') + '>已就绪</option><option value="queued"' + (data.status === 'queued' ? ' selected' : '') + '>排队中</option><option value="running"' + (data.status === 'running' ? ' selected' : '') + '>执行中</option><option value="succeeded"' + (data.status === 'succeeded' ? ' selected' : '') + '>已完成</option><option value="failed"' + (data.status === 'failed' ? ' selected' : '') + '>失败</option><option value="review"' + (data.status === 'review' ? ' selected' : '') + '>待审核</option></select></label><label>生成意图<textarea data-canvas-field="prompt" maxlength="4000">' + escapeHtml(data.prompt || '') + '</textarea></label><label>备注<textarea data-canvas-field="note" maxlength="2000">' + escapeHtml(data.note || '') + '</textarea></label><div class="canvas-inspector-info"><div><span>任务 ID</span><strong title="' + escapeHtml(data.taskId || '未绑定') + '">' + escapeHtml(data.taskId || '未绑定') + '</strong></div><div><span>素材 ID</span><strong title="' + escapeHtml((data.assetIds || []).join(', ') || '未绑定') + '">' + escapeHtml((data.assetIds || []).join(', ') || '未绑定') + '</strong></div></div><button class="canvas-danger" type="button" data-canvas-delete>删除此节点</button></div>';
  }

  function renderStatus() { const target = root.querySelector('[data-canvas-save-state]'); if (target) target.textContent = state.status || '已保存'; }

  function renderApp() {
    const projectOptions = state.projects.map(project => '<option value="' + escapeHtml(project.kind + ':' + project.id) + '"' + (state.route && project.kind === state.route.kind && project.id === state.route.projectId ? ' selected' : '') + '>' + escapeHtml(kinds[project.kind] + ' · ' + project.name) + '</option>').join('');
    const nodes = state.doc.nodes.map(nodeMarkup).join('');
    const edges = state.doc.edges.map(edge => '<path class="canvas-edge ' + escapeHtml(edge.kind) + '" d="' + edgePath(edge) + '" />').join('');
    const palette = Object.entries(labels).map(([type,label]) => '<button type="button" data-canvas-add="' + type + '" title="添加' + label + '"><span class="canvas-node-swatch ' + type + '"></span><span>' + label + '</span></button>').join('');
    const nextTheme = state.theme === 'light' ? '暗色' : '亮色';
    const themeIcon = state.theme === 'light' ? '☾' : '☼';
    root.innerHTML = '<section class="canvas-app ' + (state.theme === 'light' ? 'is-light' : 'is-dark') + '"><header class="canvas-topbar"><div class="canvas-topbar-title"><span>念念 AI · 项目工作面</span><strong>' + escapeHtml(state.project.name || '无限画布') + '</strong></div><select class="canvas-project-picker" data-canvas-project aria-label="切换项目"><option value="">选择项目</option>' + projectOptions + '</select><div class="canvas-topbar-spacer"></div><span class="canvas-save-state" data-canvas-save-state>' + escapeHtml(state.status || '已保存') + '</span><button class="canvas-icon-button" type="button" data-canvas-undo title="撤销" aria-label="撤销"' + (!state.history.length ? ' disabled' : '') + '>↶</button><button class="canvas-icon-button" type="button" data-canvas-redo title="重做" aria-label="重做"' + (!state.future.length ? ' disabled' : '') + '>↷</button><button class="canvas-icon-button" type="button" data-canvas-fit title="回到初始视图" aria-label="回到初始视图">⊙</button><button class="canvas-command-button" type="button" data-canvas-save>保存</button></header><div class="canvas-workspace"><aside class="canvas-sidebar"><div class="canvas-library-heading"><h2>节点库</h2><button type="button" data-canvas-add="note" title="添加便签" aria-label="添加便签">+</button></div><div class="canvas-palette">' + palette + '</div><hr class="canvas-sidebar-divider"><div class="canvas-project-actions"><button type="button" data-canvas-sync>同步项目阶段</button><button type="button" data-canvas-open-studio>打开现有制作台</button></div></aside><div class="canvas-surface" data-canvas-surface><span class="canvas-surface-hint">拖动画布 · 滚轮缩放 · 从输出端拖到输入端连线</span><svg class="canvas-edges" data-canvas-edges aria-hidden="true">' + edges + '</svg><div class="canvas-node-layer" data-canvas-layer style="transform:translate(' + Number(state.doc.viewport.x) + 'px,' + Number(state.doc.viewport.y) + 'px) scale(' + Number(state.doc.viewport.zoom) + ')">' + nodes + '</div><button class="canvas-theme-toggle" type="button" data-canvas-theme-toggle title="切换为' + nextTheme + '" aria-label="切换为' + nextTheme + '"><span aria-hidden="true">' + themeIcon + '</span></button></div><aside class="canvas-inspector">' + inspectorMarkup() + '</aside></div></section>';
  }

  function renderOnboarding() {
    const content = state.error?.status === 401
      ? '<h1>登录后打开项目画布</h1><p>画布与现有念念项目、任务、素材权限保持同一套账户边界。</p><button class="canvas-command-button" type="button" data-modal="login">登录</button>'
      : '<h1>选择一个项目开始</h1><p>画布不会新建第二套素材或任务。选择项目后可把创作意图、分镜、参考素材、图像与视频节点放到同一张工作面。</p><div class="canvas-onboarding-list">' + (state.projects.length ? state.projects.map(project => '<button type="button" data-canvas-open="' + escapeHtml(project.kind + ':' + project.id) + '"><strong>' + escapeHtml(project.name) + '</strong><span>' + escapeHtml(kinds[project.kind]) + '</span></button>').join('') : '<div class="canvas-error">当前还没有项目，请先在项目管理中创建项目。</div>') + '</div>';
    root.innerHTML = '<section class="canvas-onboarding"><div class="canvas-onboarding-inner">' + content + '</div></section>';
  }

  function render() { if (state.route && state.ready && state.doc && state.project) renderApp(); else renderOnboarding(); }

  function openProject(value) {
    const [kind,projectId] = String(value || '').split(':');
    if (!['redraw','script'].includes(kind) || !projectId) return;
    location.hash = 'canvas/' + encodeURIComponent(kind) + '/' + encodeURIComponent(projectId);
  }

  function openStudio() {
    if (!state.route) return;
    location.hash = state.route.kind === 'script' ? 'script/' + encodeURIComponent(state.route.projectId) + '/stage/01' : 'redraw/' + encodeURIComponent(state.route.projectId) + '/stage/01';
  }

  function beginNodeDrag(event, nodeId) {
    if (event.button !== 0 || !state.doc) return;
    const node = state.doc.nodes.find(item => item.id === nodeId); if (!node) return;
    const surface = root.querySelector('.canvas-surface'), rect = surface.getBoundingClientRect(), viewport = state.doc.viewport;
    state.selectedId = nodeId;
    state.drag = {nodeId,startClient:{x:event.clientX,y:event.clientY},startPosition:{...node.position},zoom:viewport.zoom};
    surface.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    render();
  }

  function beginPan(event) {
    if (event.button !== 0 || !state.doc || event.target.closest('[data-canvas-node]')) return;
    const surface = root.querySelector('.canvas-surface');
    state.pan = {x:event.clientX,y:event.clientY,viewport:{...state.doc.viewport}};
    surface.classList.add('is-panning'); surface.setPointerCapture?.(event.pointerId); event.preventDefault();
  }

  function pointerMove(event) {
    if (state.drag) {
      const node = state.doc.nodes.find(item => item.id === state.drag.nodeId); if (!node) return;
      node.position.x = Math.round(state.drag.startPosition.x + (event.clientX - state.drag.startClient.x) / state.drag.zoom);
      node.position.y = Math.round(state.drag.startPosition.y + (event.clientY - state.drag.startClient.y) / state.drag.zoom);
      render();
      return;
    }
    if (state.pan) {
      state.doc.viewport.x = state.pan.viewport.x + event.clientX - state.pan.x;
      state.doc.viewport.y = state.pan.viewport.y + event.clientY - state.pan.y;
      render();
    }
  }

  function pointerUp() {
    if (state.drag || state.pan) { const changed = Boolean(state.drag || state.pan); state.drag = null; state.pan = null; root.querySelector('.canvas-surface')?.classList.remove('is-panning'); if (changed) scheduleSave(); }
  }

  root.addEventListener('click', event => {
    const open = event.target.closest('[data-canvas-open]'); if (open) return openProject(open.dataset.canvasOpen);
    const add = event.target.closest('[data-canvas-add]'); if (add) return addNode(add.dataset.canvasAdd);
    const select = event.target.closest('[data-canvas-project]'); if (select) return;
    if (event.target.closest('[data-canvas-undo]')) return undo();
    if (event.target.closest('[data-canvas-redo]')) return redo();
    if (event.target.closest('[data-canvas-fit]')) return resetViewport();
    if (event.target.closest('[data-canvas-theme-toggle]')) return toggleTheme();
    if (event.target.closest('[data-canvas-save]')) return void save({force:true});
    if (event.target.closest('[data-canvas-delete]')) return deleteSelected();
    if (event.target.closest('[data-canvas-sync]')) return addProjectStageNodes();
    if (event.target.closest('[data-canvas-open-studio]')) return openStudio();
    const port = event.target.closest('[data-canvas-port]');
    if (port) {
      const node = port.closest('[data-canvas-node]');
      if (!node) return;
      if (port.dataset.canvasPort === 'out') { state.pendingSource = node.dataset.canvasNode; state.selectedId = node.dataset.canvasNode; render(); return; }
      if (state.pendingSource) return connect(state.pendingSource, node.dataset.canvasNode);
      return;
    }
    const node = event.target.closest('[data-canvas-node]');
    if (node && state.selectedId !== node.dataset.canvasNode) { state.selectedId = node.dataset.canvasNode; render(); }
  });

  root.addEventListener('change', event => {
    const select = event.target.closest('[data-canvas-project]'); if (select) return openProject(select.value);
    const field = event.target.closest('[data-canvas-field]'); if (!field) return;
    const node = selectedNode(); if (!node) return;
    remember(); node.data[field.dataset.canvasField] = field.value; render(); scheduleSave();
  });

  root.addEventListener('pointerdown', event => {
    const head = event.target.closest('[data-canvas-drag]'); if (head) return beginNodeDrag(event, head.dataset.canvasDrag);
    if (event.target.closest('[data-canvas-theme-toggle]')) return;
    if (event.target.closest('[data-canvas-surface]')) beginPan(event);
  });
  root.addEventListener('pointermove', pointerMove);
  root.addEventListener('pointerup', pointerUp);
  root.addEventListener('pointercancel', pointerUp);
  root.addEventListener('wheel', event => {
    if (!event.target.closest('[data-canvas-surface]') || !state.doc) return;
    event.preventDefault(); remember(); zoomAt(event.deltaY < 0 ? 1.1 : .9, event.clientX, event.clientY); render(); scheduleSave();
  }, {passive:false});

  document.addEventListener('keydown', event => {
    if (!state.route || !state.ready) return;
    const editable = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save({force:true}); return; }
    if (editable) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return; }
    if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedId) { event.preventDefault(); deleteSelected(); }
    if (event.key === 'Escape' && state.pendingSource) { state.pendingSource = null; render(); }
  });

  async function activate() {
    const route = routeFromHash();
    if (!isCanvasRoute()) return;
    state.route = route;
    try {
      await loadProjects();
      if (!route) { state.ready = false; state.project = null; state.doc = null; state.error = null; render(); return; }
      await loadDocument(route);
    } catch (error) {
      state.ready = false; state.error = error; state.project = null; state.doc = null; render();
    }
  }

  window.addEventListener('hashchange', () => void activate());
  window.addEventListener('niannian:auth-changed', () => { if (isCanvasRoute()) void activate(); });
  window.addEventListener('beforeunload', () => { if (state.dirty) { try { sessionStorage.setItem(cacheKey(state.route), JSON.stringify({document:state.doc,updatedAt:new Date().toISOString()})); } catch {} } });
  void activate();
})();
