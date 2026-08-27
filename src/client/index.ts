/**
 * dsh-notifier — 浏览器端（自包含，仅 React external 由宿主注入）。
 *
 * 两件事：
 * 1. 通知显示：自动订阅 /events SSE；页面隐藏时用 Notification API 弹通知；
 *    非安全上下文/无权限时降级为页面内横幅 + 提示音 + 标题提醒。
 * 2. 设置卡片：注册 DSH「设置 → 插件配置」的 `settings.plugin.item` 卡片
 *    （key `notifier`），用 `ctx.settingsScope` 渲染配置表单——配置由此进入
 *    DSH 原生设置页（host 已注册 notifier 命名空间）。
 * 路由常量与宿主端 ROUTES 一致（smoke 断言）。
 */
// 浏览器半区干净模块：只导出 apply/inject；React 为 host 注入 external（factory require）。
import STYLE from "./style.css";
import React from "react";

  var ROUTES = {
    config: "/api/dsh-notifier/config",
    events: "/api/dsh-notifier/events",
    health: "/api/dsh-notifier/health",
    test: "/api/dsh-notifier/test",
    history: "/api/dsh-notifier/history",
  };
  var STYLE_ID = "dsh-notifier-style";
  var NOTIFY_ICON =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#0f9d6e"/><path fill="#fff" d="M12 4a1 1 0 0 1 1 1v.55A5.5 5.5 0 0 1 17.5 11v2.3l1.45 1.45a1 1 0 0 1-.7 1.7H5.75a1 1 0 0 1-.7-1.7L6.5 13.3V11A5.5 5.5 0 0 1 11 5.55V5a1 1 0 0 1 1-1zm-2.5 13a2.5 2.5 0 0 0 5 0h-5z"/></svg>'
    );

  function injectStyle() {
    var existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.appendChild(style);
  }

  /** 请求浏览器通知权限（必须在用户手势内调用，Chrome 才接受）。 */
  function requestPermission() {
    if (!("Notification" in window)) return;
    try {
      Notification.requestPermission().catch(function () {});
    } catch (error) {
      // 忽略
    }
  }

  function el(tag: any, attrs: any, children: any = undefined) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var key in attrs) {
        var value = attrs[key];
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else if (key === "dataset") Object.assign(node.dataset, value);
        else if (key === "onClick") node.addEventListener("click", value);
        else if (key === "style") node.style.cssText = value;
        else if (key in node && key !== "list") node[key] = value;
        else node.setAttribute(key, value);
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i += 1) node.appendChild(children[i]);
    }
    return node;
  }

  // ------------------------------------------------------------ 通知显示

  var configCache: any = null;
  /** 启动时预取配置：可见性判断要用 notifyWhenVisible。 */
  function refreshConfig() {
    fetch(ROUTES.config, { headers: { accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (config) {
        configCache = config;
      })
      .catch(function () {
        // 失败静默
      });
  }

  var notified: any = [];

  var TAB_ID = Math.random().toString(36).slice(2);
  var MASTER_KEY = "dsh-notifier:master";
  var MASTER_LEASE_MS = 15000;
  function claimMaster() {
    try {
      var raw = localStorage.getItem(MASTER_KEY);
      var lease = raw ? JSON.parse(raw) : null;
      var now = Date.now();
      if (lease && typeof lease.id === "string" && typeof lease.ts === "number" && now - lease.ts < MASTER_LEASE_MS) {
        if (lease.id === TAB_ID) { lease.ts = now; localStorage.setItem(MASTER_KEY, JSON.stringify(lease)); return true; }
        return false;
      }
      localStorage.setItem(MASTER_KEY, JSON.stringify({ id: TAB_ID, ts: now }));
      return true;
    } catch (error) {
      return true;
    }
  }

  function isSecureContext() { return window.isSecureContext === true; }
  function systemNotificationUsable() {
    if (!("Notification" in window)) return false;
    if (!isSecureContext()) return false;
    return Notification.permission === "granted";
  }

  var audioCtx: any = null;
  function unlockAudio() {
    try {
      if (audioCtx === null) {
        var AC = window.AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      if (audioCtx.state === "suspended") audioCtx.resume();
      var buffer = audioCtx.createBuffer(1, 1, 22050);
      var source = audioCtx.createBufferSource();
      source.buffer = buffer; source.connect(audioCtx.destination); source.start(0);
    } catch (error) { /* 忽略 */ }
  }

  var lastChimeAt = 0;
  function playChime() {
    if (audioCtx === null || audioCtx.state !== "running") return;
    var now = Date.now();
    if (now - lastChimeAt < 1500) return;
    lastChimeAt = now;
    try {
      var t = audioCtx.currentTime;
      for (var i = 0; i < 2; i += 1) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = i === 0 ? 880 : 660;
        gain.gain.setValueAtTime(0.0001, t + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.18, t + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.16);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(t + i * 0.18); osc.stop(t + i * 0.18 + 0.17);
      }
    } catch (error) { /* 忽略 */ }
  }

  var savedTitle: any = null;
  function flashTitle(title: any) {
    if (savedTitle === null) savedTitle = document.title;
    document.title = "🔔 " + String(title).slice(0, 40);
  }
  function restoreTitle() {
    if (savedTitle !== null) { document.title = savedTitle; savedTitle = null; }
  }

  function showBanner(kind: any, title: any, message: any) {
    var existing = document.querySelector('.dn-banner[data-kind="' + kind + '"]');
    if (existing) existing.remove();
    var banners = document.querySelectorAll(".dn-banner");
    while (banners.length >= 3) banners[0].remove();
    var banner = el("div", {
      class: "dn-banner", dataset: { kind: kind },
      onClick: function () { window.focus(); banner.remove(); },
    });
    var head = el("div", { style: "display:flex;align-items:center;gap:6px" });
    head.appendChild(el("span", { text: "🔔" }));
    head.appendChild(el("span", { text: title, style: "font-weight:600" }));
    banner.appendChild(head);
    banner.appendChild(el("div", { text: message, style: "margin-top:4px;font-size:12px;line-height:1.5;white-space:pre-line" }));
    document.body.appendChild(banner);
    setTimeout(function () { banner.remove(); }, 8000);
  }

  function showNotification(kind: any, title: any, message: any) {
    if (!claimMaster()) return;
    if (systemNotificationUsable()) {
      try {
        var notification = new Notification(title, {
          body: message,
          tag: "dsh-notifier-" + kind + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
          icon: NOTIFY_ICON,
          silent: !!(configCache && configCache.notifySound === false),
        });
        notification.onclick = function () { window.focus(); notification.close(); };
        notified.push(notification);
        if (notified.length > 5) notified.shift().close();
        return;
      } catch (error) { /* 降级为页面内提醒 */ }
    }
    if (document.visibilityState !== "hidden") { showBanner(kind, title, message); } else { flashTitle(title); }
    playChime();
  }

  function handleNotifyFrame(payload: any) {
    if (document.visibilityState !== "hidden" && !(configCache && configCache.notifyWhenVisible === true)) return;
    showNotification(payload.kind, payload.title, payload.message);
  }

  var eventsHandle: any = null;
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      restoreTitle();
      if (eventsHandle && eventsHandle.reconnect) eventsHandle.reconnect();
    }
  });

  var WATCHDOG_MS = 60000;
  function startEvents() {
    var source: any = null;
    var lastActivity = 0;
    var lastSeq = 0;
    var watchdog: any = null;
    var lastReconnectAt = 0;
    function armWatchdog() {
      if (watchdog !== null) clearTimeout(watchdog);
      watchdog = setTimeout(function () {
        if (Date.now() - lastActivity > WATCHDOG_MS) { forceReconnect(); } else { armWatchdog(); }
      }, WATCHDOG_MS + 5000);
    }
    function closeSource() {
      if (source !== null) { try { source.close(); } catch (error) { /* 忽略 */ } source = null; }
    }
    function forceReconnect() {
      var now = Date.now();
      if (now - lastReconnectAt < 5000) return;
      lastReconnectAt = now; closeSource(); connect();
    }
    function connect() {
      closeSource();
      try {
        var url = ROUTES.events + (lastSeq > 0 ? "?since=" + lastSeq : "");
        source = new EventSource(url);
        lastActivity = Date.now();
        source.onmessage = function (event: any) {
          try {
            var data = JSON.parse(event.data);
            lastActivity = Date.now();
            if (data.type === "ping") return;
            if (data.type === "notify") {
              if (typeof data.seq === "number") { if (lastSeq > 0 && data.seq <= lastSeq) return; lastSeq = data.seq; }
              handleNotifyFrame(data);
            }
          } catch (error) { /* 忽略 */ }
        };
        source.onerror = function () { forceReconnect(); };
        armWatchdog();
      } catch (error) { /* 忽略 */ }
    }
    connect();
    return {
      close: function () { if (watchdog !== null) clearTimeout(watchdog); closeSource(); },
      reconnect: forceReconnect,
    };
  }

  // ------------------------------------------------------------ 设置卡片（DSH「插件配置」）

  /** settingsScope 绑定（apply 里设置）；React 卡片经闭包读取。 */
  var notifierScope: any = null;

  // DSH 主题 token 内联样式（零硬编码色；root 继承宿主默认 sans）。
  var rowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "8px 0", borderBottom: "1px solid var(--dsw-alias-border-l2,#e5e7eb)" };
  var groupTitleStyle = { fontSize: "12px", fontWeight: "600", color: "var(--dsw-alias-label-secondary,#5f6672)", margin: "10px 0 4px" };
  var labelStyle = { flex: "1", fontSize: "13px", color: "var(--dsw-alias-label-primary,#1f2329)" };
  var inputStyle = { width: "96px", background: "var(--dsw-alias-bg-layer-1,#f5f6f8)", color: "var(--dsw-alias-label-primary,#1f2329)", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: "6px", padding: "4px 8px", boxSizing: "border-box" };
  var timeStyle = { background: "var(--dsw-alias-bg-layer-1,#f5f6f8)", color: "var(--dsw-alias-label-primary,#1f2329)", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: "6px", padding: "4px 8px" };
  var noteStyle = { fontSize: "11px", color: "var(--dsw-alias-label-tertiary,#8a919c)", lineHeight: "1.6", marginTop: "8px" };

  function ToggleRow(props: any) {
    return React.createElement("label", { style: rowStyle },
      React.createElement("span", { style: labelStyle }, props.label),
      React.createElement("input", { type: "checkbox", checked: props.checked === true, onChange: function (e: any) { props.onChange(e.target.checked); } })
    );
  }

  function NotifierSettingsCard(props: any) {
    var pair = React.useState(function () { return notifierScope ? notifierScope.getSnapshot() : {}; });
    var cfg = pair[0];
    var setCfg = pair[1];
    React.useEffect(function () {
      if (!notifierScope) return;
      return notifierScope.subscribe(function () { setCfg(notifierScope.getSnapshot()); });
    }, []);
    if (!cfg || !notifierScope) return React.createElement("div", { style: noteStyle }, "加载配置…");

    var set = notifierScope.set;
    var qh = cfg.quietHours || { enabled: false, start: "22:00", end: "08:00", allowKinds: [] };
    var setQh = function (patch: any) { set("quietHours", Object.assign({}, qh, patch)); };

    var children: any[] = [];
    children.push(React.createElement("div", { style: groupTitleStyle }, "通知事件"));
    [["notifyAsk", "审批等待"], ["notifyQuestion", "向你提问"], ["notifyTaskDone", "任务完成"],
     ["notifySubagentDone", "子任务完成"], ["notifyTaskError", "任务出错"], ["notifyTurnEnd", "轮次完成"]]
      .forEach(function (kv) { children.push(React.createElement(ToggleRow, { label: kv[1], checked: cfg[kv[0]], onChange: function (v: boolean) { set(kv[0], v); } })); });

    children.push(React.createElement("div", { style: groupTitleStyle }, "通知通道"));
    [["systemNotify", "系统通知"], ["browserNotify", "浏览器通知"], ["notifyWhenVisible", "页面可见时也弹"], ["notifySound", "通知声音"]]
      .forEach(function (kv) { children.push(React.createElement(ToggleRow, { label: kv[1], checked: cfg[kv[0]], onChange: function (v: boolean) { set(kv[0], v); } })); });

    children.push(React.createElement("div", { style: groupTitleStyle }, "免打扰时段"));
    children.push(React.createElement(ToggleRow, { label: "启用", checked: qh.enabled, onChange: function (v: boolean) { setQh({ enabled: v }); } }));
    children.push(React.createElement("div", { style: Object.assign({}, rowStyle, { justifyContent: "flex-start", gap: "6px" }) },
      React.createElement("span", { style: { color: "var(--dsw-alias-label-secondary,#5f6672)", fontSize: "13px" } }, "从"),
      React.createElement("input", { type: "time", value: qh.start, style: timeStyle, onChange: function (e: any) { setQh({ start: e.target.value || "22:00" }); } }),
      React.createElement("span", { style: { color: "var(--dsw-alias-label-secondary,#5f6672)", fontSize: "13px" } }, "到"),
      React.createElement("input", { type: "time", value: qh.end, style: timeStyle, onChange: function (e: any) { setQh({ end: e.target.value || "08:00" }); } })
    ));
    var allows = qh.allowKinds || [];
    children.push(React.createElement("div", { style: Object.assign({}, rowStyle, { justifyContent: "flex-start", gap: "14px", flexWrap: "wrap" }) },
      React.createElement("span", { style: noteStyle }, "免打扰仍提醒："),
      [["ask", "审批"], ["question", "提问"], ["error", "出错"]].map(function (kv) {
        return React.createElement("label", { style: { display: "inline-flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "var(--dsw-alias-label-secondary,#5f6672)" } },
          React.createElement("input", { type: "checkbox", checked: allows.indexOf(kv[0]) !== -1, onChange: function (e: any) {
            var next = allows.slice();
            if (e.target.checked && next.indexOf(kv[0]) === -1) next.push(kv[0]);
            else if (!e.target.checked && next.indexOf(kv[0]) !== -1) next.splice(next.indexOf(kv[0]), 1);
            setQh({ allowKinds: next });
          } }), React.createElement("span", null, kv[1]));
      })
    ));

    children.push(React.createElement("div", { style: groupTitleStyle }, "合并/去重（ms，0=关）"));
    [["errorMergeWindowMs", "错误合并窗口"], ["doneMergeWindowMs", "完成聚合窗口"], ["askRemindMin", "审批重提醒(分钟)"], ["historyMaxAgeDays", "历史保留(天)"]]
      .forEach(function (kv) {
        children.push(React.createElement("label", { style: rowStyle },
          React.createElement("span", { style: labelStyle }, kv[1]),
          React.createElement("input", { type: "number", min: "0", step: "100", value: cfg[kv[0]] == null ? 0 : cfg[kv[0]], style: inputStyle, onChange: function (e: any) { var v = parseInt(e.target.value, 10); set(kv[0], Number.isFinite(v) && v >= 0 ? v : 0); } })
        ));
      });

    children.push(React.createElement("div", { style: noteStyle }, "浏览器通知仅在页面隐藏时弹出（可开「页面可见时也弹」）；系统通知由宿主发出。改动立即写入 DSH 设置。"));
    return React.createElement("div", { style: {} }, children);
  }

  // ------------------------------------------------------------ 挂载

  export const inject = ["slots"];

export function apply(ctx: any) {
  var disposeEvents: any = null;

  function boot() {
    try {
      injectStyle();
      refreshConfig();
      if (disposeEvents === null) {
        disposeEvents = startEvents();
        eventsHandle = disposeEvents;
      }
      // 首次任意点击解锁音频 + 请求通知权限（手势内）。
      document.addEventListener("click", function onFirstClick() {
        unlockAudio();
        if ("Notification" in window && Notification.permission === "default") requestPermission();
        document.removeEventListener("click", onFirstClick);
      }, { capture: true });
      // DSH「设置 → 插件配置」卡片（host 已注册 notifier 命名空间）。
      if (ctx && ctx.slots && typeof ctx.slots.inject === "function" && ctx.settingsScope) {
        notifierScope = ctx.settingsScope.bind({ namespace: "notifier" });
        ctx.effect(function () {
          return ctx.slots.inject("settings.plugin.item", function () {
            return ctx.slots.register({ name: "settings.plugin.item", key: "notifier" }, NotifierSettingsCard);
          });
        }, "dsh-notifier: settings card");
      }
      ctx.effect(function () {
        return function () {
          if (disposeEvents !== null) { disposeEvents.close(); disposeEvents = null; eventsHandle = null; }
          for (var i = 0; i < notified.length; i += 1) { try { notified[i].close(); } catch (error) { /* 忽略 */ } }
        };
      }, "dsh-notifier");
    } catch (error) {
      // 挂载失败静默
    }
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
}
