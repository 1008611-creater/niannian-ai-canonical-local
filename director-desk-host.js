(function initDirectorDeskHost() {
  const frame = document.getElementById("directorDeskFrame");
  if (!frame) return;
  const hostClose = document.getElementById("directorDeskHostClose");
  const frameSource = frame.getAttribute("src") || "/director-desk/?theme=dark";

  const storageKey = "niannian-director-desk-instance-id";
  let lastHash = "";
  let reloadAttempts = 0;

  function normalizeProjectId(value) {
    return typeof value === "string" && value.trim() ? value.trim() : "";
  }

  function projectIdFromHash(hash) {
    const match = String(hash || "").match(/^#workbench\/project\/([^/]+)/i);
    if (!match) return "";
    try {
      return normalizeProjectId(decodeURIComponent(match[1]));
    } catch {
      return "";
    }
  }

  function readInstanceId() {
    const fromHash = projectIdFromHash(window.location.hash);
    if (fromHash) {
      sessionStorage.setItem(storageKey, fromHash);
      return fromHash;
    }

    return normalizeProjectId(sessionStorage.getItem(storageKey)) || "workspace";
  }

  function postSession() {
    if (!isDirectorDocument()) {
      reloadDirectorFrame();
      return;
    }
    frame.contentWindow?.postMessage(
      {
        type: "storyai:director-desk-session",
        payload: {
          instanceId: readInstanceId(),
          theme: "dark",
        },
      },
      window.location.origin
    );
  }

  function isDirectorDocument() {
    try {
      const documentRoot = frame.contentDocument?.querySelector("#root");
      const title = frame.contentDocument?.title || "";
      return Boolean(documentRoot) && /导演台/.test(title);
    } catch {
      return false;
    }
  }

  function reloadDirectorFrame() {
    if (reloadAttempts >= 2) return;
    reloadAttempts += 1;
    const url = new URL(frameSource, window.location.origin);
    url.searchParams.set("directorHostReload", String(Date.now()));
    frame.src = url.toString();
  }

  function syncDirectorFrame() {
    const hash = window.location.hash.toLowerCase();
    if (hash !== "#director-desk") {
      lastHash = hash;
      return;
    }
    if (lastHash === hash) return;
    lastHash = hash;
    reloadAttempts = 0;
    reloadDirectorFrame();
  }

  function openDirectorDesk() {
    const currentProjectId = projectIdFromHash(window.location.hash);
    if (currentProjectId) sessionStorage.setItem(storageKey, currentProjectId);
    window.location.hash = "director-desk";
  }

  hostClose?.addEventListener("click", () => {
    window.location.hash = "workbench";
  });

  frame.addEventListener("load", () => {
    if (isDirectorDocument()) reloadAttempts = 0;
    postSession();
  });

  window.addEventListener("hashchange", syncDirectorFrame);
  syncDirectorFrame();

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;

    if (event.data?.type === "storyai:director-desk-ready") {
      postSession();
      return;
    }

    if (event.data?.type === "storyai:director-desk-close") {
      window.location.hash = "workbench";
      return;
    }

    if (event.data?.type === "storyai:director-desk-captures-sent") {
      window.dispatchEvent(
        new CustomEvent("niannian:director-desk-captures", {
          detail: event.data.payload || {},
        })
      );
    }
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.('[data-view="director-desk"]');
    if (!trigger) return;
    openDirectorDesk();
  }, true);
})();
