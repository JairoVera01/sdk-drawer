/* public/drawer.js — SDK loader (vanilla JS, sin build ni dependencias)
 asdas. */
(function () {
  "use strict";

  var CURRENT_SCRIPT = document.currentScript;

  var STYLES = [
    ":host{all:initial}",
    "*{box-sizing:border-box}",
    ".sdk-launcher{position:fixed;bottom:24px;right:24px;z-index:2147483000;",
    "font-family:system-ui,-apple-system,sans-serif;font-size:15px;font-weight:500;",
    "color:#fff;background:#111;border:none;border-radius:999px;padding:12px 20px;",
    "cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25)}",
    ".sdk-launcher.sdk-left{right:auto;left:24px}",
    ".sdk-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.45);",
    "opacity:0;pointer-events:none;transition:opacity .25s ease}",
    ".sdk-panel{position:fixed;top:0;bottom:0;z-index:2147483002;background:#fff;",
    "max-width:100vw;box-shadow:0 0 40px rgba(0,0,0,.3);transition:transform .3s ease;display:flex}",
    ".sdk-panel.sdk-right{right:0;transform:translateX(100%)}",
    ".sdk-panel.sdk-left{left:0;transform:translateX(-100%)}",
    ".sdk-iframe{border:0;width:100%;height:100%}",
    ":host([data-open]) .sdk-overlay{opacity:1;pointer-events:auto}",
    ":host([data-open]) .sdk-panel{transform:translateX(0)}",
    "@media (max-width:640px){.sdk-panel{width:100vw !important}}",
  ].join("");

  function readConfig(scriptEl) {
    var el = scriptEl || document.currentScript;
    var ds = (el && el.dataset) || {};
    var appUrl = ds.appUrl;
    var appOrigin = "";
    if (!appUrl) {
      try {
        var base =
          el && el.src ? new URL(el.src) : new URL(window.location.href);
        appOrigin = base.origin;
        appUrl = base.origin + "/embed";
      } catch (e) {
        appUrl = "/embed";
      }
    } else {
      try {
        appOrigin = new URL(appUrl, window.location.href).origin;
      } catch (e2) {
        /* ignore */
      }
    }
    return {
      appUrl: appUrl,
      appOrigin: appOrigin,
      position: ds.position === "left" ? "left" : "right",
      width: parseInt(ds.width, 10) || 460,
      trigger: ds.trigger === "manual" ? "manual" : "auto",
      buttonText: ds.buttonText || "Reservar",
      openOnLoad: ds.openOnLoad === "true",
      accentColor: ds.accentColor || "",
    };
  }

  function withAccent(appUrl, accentColor) {
    if (!accentColor) return appUrl;
    try {
      var u = new URL(appUrl, window.location.href);
      u.searchParams.set("accent", accentColor);
      return u.toString();
    } catch (e) {
      return appUrl;
    }
  }

  function createDrawer(config) {
    var host = document.createElement("div");
    host.setAttribute("data-sdk-drawer-host", "");
    var root = host.attachShadow({ mode: "open" });

    var style = document.createElement("style");
    style.textContent = STYLES;
    root.appendChild(style);

    var launcher = document.createElement("button");
    launcher.className = "sdk-launcher sdk-" + config.position;
    launcher.type = "button";
    launcher.textContent = config.buttonText;
    launcher.setAttribute("aria-haspopup", "dialog");
    if (config.trigger === "manual") launcher.hidden = true;

    var overlay = document.createElement("div");
    overlay.className = "sdk-overlay";

    var panel = document.createElement("aside");
    panel.className = "sdk-panel sdk-" + config.position;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Reservas");
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("inert", "");
    panel.setAttribute("tabindex", "-1");
    panel.style.width = config.width + "px";

    root.appendChild(launcher);
    root.appendChild(overlay);
    root.appendChild(panel);
    (document.body || document.documentElement).appendChild(host);

    var iframe = null;
    var isOpen = false;
    var lastFocused = null;

    function ensureIframe() {
      if (iframe) return;
      iframe = document.createElement("iframe");
      iframe.className = "sdk-iframe";
      iframe.title = "Reservas";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.src = withAccent(config.appUrl, config.accentColor);
      panel.appendChild(iframe);
    }

    function onKey(e) {
      if (e.key === "Escape") close();
    }

    function onMessage(e) {
      if (!config.appOrigin || e.origin !== config.appOrigin) return;
      var d = e.data;
      if (d && d.type === "sdk-drawer" && d.action === "close") close();
    }

    function open() {
      if (isOpen) return;
      ensureIframe();
      lastFocused = document.activeElement;
      isOpen = true;
      host.setAttribute("data-open", "");
      panel.removeAttribute("inert");
      panel.setAttribute("aria-hidden", "false");
      document.addEventListener("keydown", onKey);
      panel.focus();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      host.removeAttribute("data-open");
      panel.setAttribute("inert", "");
      panel.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onKey);
      if (lastFocused && typeof lastFocused.focus === "function")
        lastFocused.focus();
    }

    function toggle() {
      isOpen ? close() : open();
    }

    function destroy() {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("keydown", onKey);
      host.remove();
    }

    launcher.addEventListener("click", open);
    overlay.addEventListener("click", close);
    window.addEventListener("message", onMessage);

    return {
      open: open,
      close: close,
      toggle: toggle,
      destroy: destroy,
      host: host,
      root: root,
    };
  }

  function init(scriptEl) {
    if (window.__sdkDrawerLoaded) return window.SdkDrawer;
    window.__sdkDrawerLoaded = true;
    var config = readConfig(scriptEl || CURRENT_SCRIPT);
    var api = createDrawer(config);
    window.SdkDrawer = api;
    if (config.openOnLoad) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          api.open();
        });
      });
    }
    return api;
  }

  window.__sdkDrawerInternals = {
    readConfig: readConfig,
    createDrawer: createDrawer,
    init: init,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
    });
  } else {
    init();
  }
})();
