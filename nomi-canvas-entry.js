(() => {
  function studioUrl(hash = window.location.hash) {
    const match = String(hash || '').match(/^#canvas\/(?:redraw|script)\/([^/?#]+)/i);
    const projectId = match ? decodeURIComponent(match[1]) : '';
    return projectId
      ? '/studio/?step=generate#/studio?projectId=' + encodeURIComponent(projectId)
      : '/studio/?step=generate#/studio';
  }

  if (/^#canvas(?:\/|$)/i.test(window.location.hash)) {
    window.location.replace(studioUrl());
    return;
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.workbench-launch-card.is-canvas');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign('/studio/?step=generate#/studio');
  }, true);
})();
