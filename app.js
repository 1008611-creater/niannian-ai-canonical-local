const fluidCanvas = document.querySelector("#fluidCanvas");
const heroPanel = document.querySelector('.hero[data-view-panel="home"]');
const navigationItems = [...document.querySelectorAll("[data-view]")];
const navigationTabs = [...document.querySelectorAll(".nav-item")];
const viewPanels = [...document.querySelectorAll("[data-view-panel]")];
const modalBackdrop = document.querySelector("#modalBackdrop");
const modalClose = document.querySelector("#modalClose");
const modalTitle = document.querySelector("#modalTitle");
const modalCopy = document.querySelector("#modalCopy");
const modalKicker = document.querySelector("#modalKicker");
const modalInput = document.querySelector("#modalInput");
const modalPasswordField = document.querySelector("#modalPasswordField");
const modalPassword = document.querySelector("#modalPassword");
const modalStatus = document.querySelector("#modalStatus");
const modalSubmit = document.querySelector("#modalSubmit");
const fieldLabel = document.querySelector("#fieldLabel");
const modalForm = document.querySelector("#modalForm");
const heroVerb = document.querySelector("#heroVerb");
const mobileMenuToggle = document.querySelector("#mobileMenuToggle");
const primaryNavigation = document.querySelector("#primaryNavigation");
const connectionStatus = document.querySelector("#connectionStatus");

let currentView = "home";
let showcaseFilmIndex = 0;
const serviceWorkerRelease = "20260802-workbench-launcher-r1";
let fluidRenderer = null;

function updateConnectionStatus() {
  const offline = navigator.onLine === false;
  document.body.classList.toggle("is-offline", offline);
  if (!connectionStatus) return;
  connectionStatus.hidden = !offline;
  connectionStatus.textContent = offline
    ? "网络已中断。本地草稿仍会保留；项目状态将在恢复连接后更新。"
    : "";
}

function registerOfflineShell() {
  if (!("serviceWorker" in navigator)) return;
  const hadServiceWorkerController = Boolean(navigator.serviceWorker.controller);
  let controllerChangeHandled = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (controllerChangeHandled) return;
    controllerChangeHandled = true;
    if (!hadServiceWorkerController) return;
    const reloadKey = "niannian:service-worker-controller:" + serviceWorkerRelease;
    try {
      if (window.sessionStorage.getItem(reloadKey) === "1") return;
      window.sessionStorage.setItem(reloadKey, "1");
    } catch {
      // Browsers that deny session storage still receive the fresh active worker once.
    }
    window.location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js?v=" + serviceWorkerRelease, { scope: "/" }).catch(() => {
      // The site remains fully usable online when a browser declines PWA installation.
    });
  }, { once: true });
}

const modalContent = {
  login: {
    kicker: "WELCOME BACK",
    title: "登录念念 AI",
    copy: "继续你的故事。",
    label: "邮箱",
    placeholder: "name@example.com",
    submit: "登录"
  },
  register: {
    kicker: "CREATE ACCOUNT",
    title: "注册念念 AI",
    copy: "把灵感变成第一支作品。",
    label: "邮箱",
    placeholder: "name@example.com",
    submit: "创建账户"
  },
  demo: {
    kicker: "BOOK A DEMO",
    title: "演示预约",
    copy: "留下联系方式，我们会尽快与你沟通。",
    label: "手机号",
    placeholder: "请输入手机号",
    submit: "提交预约"
  },
  enterprise: {
    kicker: "ENTERPRISE",
    title: "企业方案",
    copy: "为团队定制稳定的 AI 影像生产流程。",
    label: "公司与联系方式",
    placeholder: "公司名称 / 手机号",
    submit: "提交申请"
  },
  "new-project": {
    kicker: "NEW PROJECT",
    title: "创建项目",
    copy: "给你的新故事一个名字。",
    label: "项目名称",
    placeholder: "例如：月光便利店",
    submit: "进入创作空间"
  }
};

function setView(viewName, { syncHash = true, scroll = "preserve" } = {}) {
  if (viewName.startsWith("canvas")) {
    if (viewName === "canvas") {
      window.location.assign("/studio/");
    } else {
      window.location.hash = "workbench";
    }
    return;
  }
  if (["showcase", "guide", "team"].includes(viewName)) {
    window.location.hash = "workbench";
    return;
  }
  const panelName = viewName.startsWith("script/")
    ? "script-studio"
    : ((viewName.startsWith("redraw/") || viewName.startsWith("redraw-ledger/") || viewName.startsWith("redraw-story/") || viewName.startsWith("redraw-source-truth/")) ? "redraw-studio" : (viewName.startsWith("workbench") ? "workbench" : viewName));
  if (!viewPanels.some((panel) => panel.dataset.viewPanel === panelName)) return;

  const previousPanel = currentView.startsWith("script/")
    ? "script-studio"
    : ((currentView.startsWith("redraw/") || currentView.startsWith("redraw-ledger/") || currentView.startsWith("redraw-story/") || currentView.startsWith("redraw-source-truth/")) ? "redraw-studio" : currentView);
  currentView = viewName;
  viewPanels.forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.viewPanel === panelName);
  });
  document.body.classList.toggle("is-showcase-view", panelName === "showcase");
  navigationTabs.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.view === panelName);
  });
  closeMobileNavigation();

  if (syncHash && window.location.hash !== "#" + viewName) window.location.hash = viewName;
  if (scroll === "top" && previousPanel !== panelName) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    animateTopLevelView(panelName);
  }
  syncHeroRenderer();
}

function canPlayTopLevelMotion() {
  return Boolean(window.gsap) && !document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function animateTopLevelView(panelName) {
  if (!canPlayTopLevelMotion()) return;
  const panel = viewPanels.find((item) => item.dataset.viewPanel === panelName);
  if (!panel) return;
  const targets = Array.from(panel.querySelectorAll(".hero-copy, .product-heading, .project-summary, .project-toolbar, .project-grid, .workbench-header, .workbench-deck, .page-heading, .showcase-grid, .guide-header, .guide-layout, .team-shell > *")).slice(0, 5);
  if (!targets.length) return;
  window.gsap.killTweensOf(targets);
  panel.classList.add("view-motion-active");
  window.gsap.set(targets, { autoAlpha: 0, y: 12 });
  window.gsap.timeline({ defaults: { ease: "power2.out" }, onComplete: () => panel.classList.remove("view-motion-active") })
    .to(targets, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.045 });
}

function canPlayHeroMotion() {
  return currentView === "home" && !document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createFluidRenderer(canvas) {
  if (!canvas) return null;

  let frame = null;
  let running = false;
  let frames = 0;
  const pixelRatio = () => Math.min(window.devicePixelRatio || 1, window.innerWidth <= 760 ? 1.2 : 1.6);
  const setState = state => {
    canvas.dataset.rendererState = state;
    canvas.dataset.rendererFrames = String(frames);
  };
  const resizeCanvas = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = pixelRatio();
    const width = Math.max(1, Math.round(bounds.width * ratio));
    const height = Math.max(1, Math.round(bounds.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  };
  const createFallback = () => {
    const context = canvas.getContext("2d");
    if (!context) return null;
    return {
      renderer: "2d",
      resize: resizeCanvas,
      render(milliseconds) {
        const width = canvas.width;
        const height = canvas.height;
        context.fillStyle = "#050716";
        context.fillRect(0, 0, width, height);
        [["#f11975", 0.08, 0.25], ["#193bcc", 0.58, 0.46], ["#fa176f", 0.94, 0.3], ["#7f166f", 0.72, 0.84]].forEach(([color, baseX, baseY], index) => {
          const wave = milliseconds * 0.00018 + index * 1.7;
          const x = width * (baseX + Math.sin(wave) * 0.15);
          const y = height * (baseY + Math.cos(wave * 0.8) * 0.18);
          const gradient = context.createRadialGradient(x, y, 0, x, y, Math.max(width, height) * 0.58);
          gradient.addColorStop(0, color);
          gradient.addColorStop(0.56, `${color}66`);
          gradient.addColorStop(1, `${color}00`);
          context.globalCompositeOperation = "screen";
          context.fillStyle = gradient;
          context.fillRect(0, 0, width, height);
        });
        context.globalCompositeOperation = "source-over";
      }
    };
  };
  const createWebGl = () => {
    const gl = canvas.getContext("webgl", { alpha:false, antialias:false, preserveDrawingBuffer:false });
    if (!gl) return null;
    const vertexSource = "attribute vec2 a_position; void main(){ gl_Position=vec4(a_position,0.0,1.0); }";
    const fragmentSource = `precision highp float;
      uniform vec2 u_resolution; uniform float u_time;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);} 
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);} 
      float f(vec2 p){float v=0.,a=.54;mat2 r=mat2(.82,.57,-.57,.82);for(int i=0;i<5;i++){v+=a*n(p);p=r*p*1.96+.13;a*=.5;}return v;}
      mat2 r(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);} 
      void main(){vec2 uv=gl_FragCoord.xy/u_resolution.xy;uv.y=1.-uv.y;vec2 p=uv-.5;p.x*=u_resolution.x/u_resolution.y;float t=u_time*.055,d=length(p);vec2 s=r(-.62+d*1.15+sin(t*.6)*.04)*p;vec2 q=vec2(f(s*1.18+vec2(-.25,t)),f(s*1.16+vec2(4.8,-t*.82)));vec2 a=vec2(f(s*1.42+3.35*q+vec2(1.7,t*.52)),f(s*1.38+3.18*q+vec2(8.4,-t*.44)));float z=f(s*1.62+3.85*a);float bands=.5+.5*sin((s.x*1.35-s.y*.62+d*4.25+z*4.+a.x*1.65-a.y*.82)*3.14159);float ridge=pow(smoothstep(.66,.97,bands),3.2);float fine=pow(smoothstep(.72,.985,.5+.5*sin((z+a.x-a.y)*17.)),5.);float blue=smoothstep(.96,.13,length(s-vec2(.15,.02+a.y*.1)));float pink=clamp(smoothstep(.72,-.72,p.x+z*.34-a.y*.2)*(.48+ridge*.52)+smoothstep(.38,.92,d+a.x*.18)*(.36+.64*ridge)*.34,0.,1.);vec3 c=mix(vec3(.01,.012,.06),vec3(.035,.045,.18),.48+z*.42);c=mix(c,vec3(.025,.16,.68),blue*(.52+.3*a.y));c=mix(c,vec3(.22,.025,.27),pink*.34);c=mix(c,vec3(.92,.018,.34),pink*ridge*.66);c=mix(c,vec3(1.,.055,.48),pink*fine*.34);c+=fine*blue*vec3(.18,.28,.55);c+=ridge*pink*vec3(.16,.03,.12);c*=.72+smoothstep(.36,.02,abs(bands-.48))*.32;c*=.54+smoothstep(1.04,.3,length(p*vec2(.78,.94)))*.58;gl_FragColor=vec4(pow(c,vec3(.9)),1.);}`;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "Shader compilation failed");
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "Shader link failed");
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    const resolution = gl.getUniformLocation(program, "u_resolution");
    const time = gl.getUniformLocation(program, "u_time");
    gl.useProgram(program);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    return {
      renderer: "webgl",
      resize() { resizeCanvas(); gl.viewport(0, 0, canvas.width, canvas.height); },
      render(milliseconds) {
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.uniform1f(time, milliseconds / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    };
  };
  let engine;
  try { engine = createWebGl() || createFallback(); } catch { engine = createFallback(); }
  if (!engine) { canvas.dataset.renderer = "none"; setState("unavailable"); return null; }
  canvas.dataset.renderer = engine.renderer;
  const draw = milliseconds => {
    if (!running) return;
    engine.render(milliseconds);
    frames += 1;
    setState("running");
    frame = requestAnimationFrame(draw);
  };
  return {
    resize: () => engine.resize(),
    start() {
      if (running) return;
      engine.resize();
      running = true;
      setState("running");
      frame = requestAnimationFrame(draw);
    },
    stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      running = false;
      setState("stopped");
    }
  };
}

function initHeroRenderer() {
  fluidRenderer = createFluidRenderer(fluidCanvas);
  syncHeroRenderer();
}

function syncHeroRenderer() {
  if (!fluidRenderer) return;
  if (canPlayHeroMotion()) fluidRenderer.start();
  else fluidRenderer.stop();
}

function syncVisualMotion() {
  syncHeroRenderer();
}

function initShowcaseFilmMotion() {
  const films = Array.from(document.querySelectorAll(".showcase-film"));
  if (!films.length || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  films.forEach((film) => {
    let frame = null;
    let nextShift = { x: 0, y: 0 };
    const renderShift = () => {
      frame = null;
      film.style.setProperty("--showcase-shift-x", `${nextShift.x.toFixed(2)}px`);
      film.style.setProperty("--showcase-shift-y", `${nextShift.y.toFixed(2)}px`);
    };
    const resetShift = () => {
      nextShift = { x: 0, y: 0 };
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(renderShift);
    };
    film.addEventListener("pointermove", (event) => {
      if (reducedMotion.matches || !document.body.classList.contains("is-showcase-view") || !film.classList.contains("is-active")) return;
      const bounds = film.getBoundingClientRect();
      nextShift = {
        x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 16,
        y: ((event.clientY - bounds.top) / bounds.height - 0.5) * 10
      };
      if (!frame) frame = requestAnimationFrame(renderShift);
    });
    film.addEventListener("pointerleave", resetShift);
    reducedMotion.addEventListener?.("change", resetShift);
  });
}

function setShowcaseFilm(nextIndex) {
  const films = Array.from(document.querySelectorAll("[data-showcase-film]"));
  const controls = Array.from(document.querySelectorAll("[data-showcase-film-index]"));
  if (!films.length) return;
  const normalizedIndex = ((nextIndex % films.length) + films.length) % films.length;
  showcaseFilmIndex = normalizedIndex;
  films.forEach((film, index) => {
    const active = index === normalizedIndex;
    film.classList.toggle("is-active", active);
    film.setAttribute("aria-hidden", String(!active));
    film.querySelectorAll("button").forEach((button) => { button.tabIndex = active ? 0 : -1; });
  });
  controls.forEach((control, index) => {
    const active = index === normalizedIndex;
    control.classList.toggle("is-active", active);
    control.setAttribute("aria-pressed", String(active));
  });
}

function initShowcaseFilmDeck() {
  const deck = document.querySelector("#showcaseFilmDeck");
  if (!deck) return;
  document.querySelectorAll("[data-showcase-film-index]").forEach((control) => {
    control.addEventListener("click", () => setShowcaseFilm(Number(control.dataset.showcaseFilmIndex)));
  });
  deck.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") { event.preventDefault(); setShowcaseFilm(showcaseFilmIndex + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); setShowcaseFilm(showcaseFilmIndex - 1); }
  });
  deck.querySelectorAll("[data-showcase-film]:not(.is-active) button").forEach((button) => { button.tabIndex = -1; });
}

function closeMobileNavigation() {
  if (!mobileMenuToggle || !primaryNavigation) return;
  mobileMenuToggle.setAttribute("aria-expanded", "false");
  mobileMenuToggle.setAttribute("aria-label", "打开导航");
  primaryNavigation.classList.remove("is-open");
}

function toggleMobileNavigation() {
  if (!mobileMenuToggle || !primaryNavigation) return;
  const isOpen = mobileMenuToggle.getAttribute("aria-expanded") === "true";
  mobileMenuToggle.setAttribute("aria-expanded", String(!isOpen));
  mobileMenuToggle.setAttribute("aria-label", isOpen ? "打开导航" : "关闭导航");
  primaryNavigation.classList.toggle("is-open", !isOpen);
}

function openModal(type) {
  const content = modalContent[type] || modalContent["new-project"];
  const isAuth = type === "login" || type === "register";
  modalBackdrop.dataset.modalType = type;
  modalKicker.textContent = content.kicker;
  modalTitle.textContent = content.title;
  modalCopy.textContent = content.copy;
  fieldLabel.textContent = content.label;
  modalInput.placeholder = content.placeholder;
  modalInput.type = isAuth ? "email" : "text";
  modalInput.autocomplete = isAuth ? "email" : "off";
  modalSubmit.textContent = content.submit;
  modalInput.value = "";
  modalPasswordField.hidden = !isAuth;
  modalPassword.value = "";
  modalPassword.autocomplete = type === "register" ? "new-password" : "current-password";
  modalStatus.textContent = "";
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => modalInput.focus());
}

function closeModal() {
  modalBackdrop.hidden = true;
  delete modalBackdrop.dataset.modalType;
  document.body.style.overflow = "";
}

navigationItems.forEach((item) => {
  item.addEventListener("click", () => {
    if (item.dataset.view) setView(item.dataset.view, { scroll: "top" });
  });
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest?.("[data-view]");
  if (!trigger?.dataset.view || navigationItems.includes(trigger)) return;
  setView(trigger.dataset.view, { scroll: "top" });
});

mobileMenuToggle?.addEventListener("click", toggleMobileNavigation);

window.addEventListener("resize", () => {
  if (window.innerWidth > 640) closeMobileNavigation();
  fluidRenderer?.resize();
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest?.("[data-modal]");
  if (trigger?.dataset.modal) openModal(trigger.dataset.modal);
});

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});

modalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (["login", "register"].includes(modalBackdrop.dataset.modalType)) return;
  if (!modalInput.value.trim()) {
    modalInput.focus();
    return;
  }
  modalSubmit.textContent = "已提交";
  modalSubmit.disabled = true;
  window.setTimeout(() => {
    modalSubmit.disabled = false;
    closeModal();
  }, 650);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileMenuToggle?.getAttribute("aria-expanded") === "true") {
    closeMobileNavigation();
    mobileMenuToggle.focus();
    return;
  }
  if (event.key === "Escape" && !modalBackdrop.hidden) closeModal();
});

window.addEventListener("hashchange", () => {
  const viewName = window.location.hash.replace("#", "") || "home";
  if (viewName !== currentView) setView(viewName, { syncHash: false, scroll: "preserve" });
});

window.addEventListener("offline", updateConnectionStatus);
window.addEventListener("online", () => {
  updateConnectionStatus();
  window.dispatchEvent(new CustomEvent("niannian:network-restored"));
});

const heroWords = ["做高燃短剧", "做精品漫剧", "做真人情感剧", "做爆款商品视频", "做电影感品牌片", "做转绘出海短剧"];
let heroWordIndex = 0;
window.setInterval(() => {
  if (!heroVerb || !canPlayHeroMotion()) return;
  heroWordIndex = (heroWordIndex + 1) % heroWords.length;
  heroVerb.animate(
    [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(-8px)", offset: 0.48 },
      { opacity: 0, transform: "translateY(8px)", offset: 0.52 },
      { opacity: 1, transform: "translateY(0)" }
    ],
    { duration: 420, easing: "ease-out" }
  );
  window.setTimeout(() => {
    heroVerb.textContent = heroWords[heroWordIndex];
  }, 205);
}, 3200);

initHeroRenderer();
updateConnectionStatus();
registerOfflineShell();
initShowcaseFilmMotion();
initShowcaseFilmDeck();
window.addEventListener("visibilitychange", syncVisualMotion);
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
reducedMotionQuery.addEventListener?.("change", syncVisualMotion);
setView(window.location.hash.replace("#", "") || "home", { syncHash: false, scroll: "preserve" });

window.addEventListener("beforeunload", () => {
  window.removeEventListener("visibilitychange", syncVisualMotion);
  reducedMotionQuery.removeEventListener?.("change", syncVisualMotion);
  fluidRenderer?.stop();
});
