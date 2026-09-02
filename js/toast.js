/* toast.js — Ephemeral toast notifications with optional undo */
(function (global) {
  let toastTimeout = null;

  function hide() {
    const toast = document.getElementById('tp-toast');
    if (toast) toast.style.display = 'none';
  }

  function show(message, onUndo) {
    let toast = document.getElementById('tp-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tp-toast';
      document.body.appendChild(toast);
    }
    const hasUndo = typeof onUndo === 'function';
    const safeMessage = window.TPHtml.escapeHtml(message);
    toast.innerHTML = hasUndo
      ? `<span>${safeMessage}</span><button id="tp-toast-undo">Undo</button>`
      : `<span>${safeMessage}</span>`;
    toast.style.display = 'flex';
    toast.classList.remove('tp-toast-anim');
    void toast.offsetWidth;
    toast.classList.add('tp-toast-anim');
    if (hasUndo) {
      document.getElementById('tp-toast-undo').onclick = () => {
        onUndo();
        hide();
      };
    }
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(hide, 6000);
  }

  global.TPToast = { show, hide };
})(typeof window !== 'undefined' ? window : globalThis);