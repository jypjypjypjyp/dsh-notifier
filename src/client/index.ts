/**
 * dsh-notifier — 浏览器端（自包含，仅 React external 由宿主注入）。
 *
 * 两件事：
 * 1. 通知显示：自动订阅 /events SSE；页面隐藏时用 Notification API 弹通知；
 *    非安全上下文/无权限时降级为页面内横幅 + 提示音 + 标题提醒。
 * 2. 设置界面：注册 DSH 插件页的 `plugins.bundle.config` 配置区（dsh 0.1.7+，
 *    key = 包名），并为旧宿主保留 `settings.plugin.item` 折叠卡（≤0.1.6）；
 *    两端都经 /api/dsh-notifier/config GET/PUT 读写——fetch 型，不依赖宿主
 *    settings 文档，样式走 DSH 统一主题 token。
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
/** 浏览器端自检统计：SSE 收到帧数 / 已弹窗数（设置卡「浏览器通知诊断」读取）。 */
var diagStats: any = { frames: 0, shown: 0 };

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
      diagStats.shown += 1;
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
            diagStats.frames += 1;
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

// ------------------------------------------------------------ 设置界面（插件页配置区 / 旧版设置卡）

// 两代宿主各挂一处，互不干扰（未声明的插槽不会被触发）：
// - dsh 0.1.7+ ：设置面板只剩「内置插件」条目列表，插件自己的配置页改挂插件页的
//   `plugins.bundle.config`（key = 包名，见 ui-plugin-manager 的 slot-contract）——
//   登记后插件页在描述下、组件列表上多出一块配置区，形如 dsh-mnemon 的设置页。
// - dsh ≤0.1.6 ：原 `settings.plugin.item`（key `notifier`）折叠卡。
// 配置读写一律走本插件自建路由（GET/PUT /api/dsh-notifier/config → 落盘 JSON），
// 不依赖宿主 settings 文档（dsh-free-search 同款：0.1.7 的 settings 服务已无注册面）。
var PKG_NAME = "@jypjypjypjyp/dsh-notifier";
var PAGE_SLOT = "plugins.bundle.config";
var LEGACY_SLOT = "settings.plugin.item";
var SUMMARY_TEXT = "审批 / 完成 / 错误事件提醒";

/** 通知事件开关（键 / 标签 / 说明）。 */
var EVENT_ROWS: string[][] = [
  ["notifyAsk", "审批等待", "需要你批准工具调用时提醒"],
  ["notifyQuestion", "向你提问", "模型向你提问题时提醒"],
  ["notifyTaskDone", "任务完成", "主任务收尾时提醒"],
  ["notifySubagentDone", "子任务完成", "派生的子代理收尾时提醒（默认关）"],
  ["notifyTaskError", "任务出错", "回合报错时提醒（窗口内合并）"],
  ["notifyTurnEnd", "轮次完成", "每轮结束都提醒（不等于任务完成）"],
];

/** 通知通道开关（键 / 标签 / 说明）。 */
var CHANNEL_ROWS: string[][] = [
  ["systemNotify", "系统通知", "弹系统原生通知（WinRT / osascript / notify-send）"],
  ["browserNotify", "浏览器通知", "页面内弹浏览器 Notification"],
  ["notifyWhenVisible", "页面可见时也弹", "默认只在页面隐藏时提醒"],
  ["notifySound", "通知声音", "系统通知带提示音"],
];

/** 合并/去重与保留（键 / 标签 / 说明）。 */
var WINDOW_ROWS: string[][] = [
  ["errorMergeWindowMs", "错误合并窗口", "毫秒：同类错误在此窗口内合并；0 = 每条都提醒"],
  ["doneMergeWindowMs", "完成聚合窗口", "毫秒：并行收尾防刷屏；0 = 关闭聚合"],
  ["askRemindMin", "审批重提醒", "分钟：审批卡住超时后再提醒一次；0 = 关闭"],
  ["historyMaxAgeDays", "历史保留", "天：通知历史自动清理；0 = 只按行数滚动"],
];

/** 免打扰紧急例外（kind / 标签）。 */
var ALLOW_ROWS: string[][] = [["ask", "审批"], ["question", "提问"], ["error", "出错"]];

/** 折叠卡 chevron（自绘 SVG：宿主 UI 包的图标名各版本有增删，取错会静默 undefined 并崩整卡）。 */
function ChevronIcon() {
  return React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
    React.createElement("path", { d: "M4 6.5 8 10.5l4-4", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })
  );
}

/** 浏览器通知自检（点击触发）：逐项报告能力/权限，授权路径异步回报结果。 */
function runNotifySelfTest(setResult: any) {
  var text = "";
  if (!("Notification" in window)) text = "✗ 当前浏览器不支持 Notification API";
  else if (!isSecureContext()) text = "✗ 非安全上下文（需 HTTPS 或 127.0.0.1/localhost）";
  else if (Notification.permission === "denied") text = "✗ 权限已被拒绝——到浏览器站点设置→通知→允许";
  else if (Notification.permission === "default") {
    text = "~ 权限尚未请求，正在发起授权…（请留意浏览器弹出的授权询问）";
    try {
      Notification.requestPermission().then(function (p: string) {
        setResult("授权结果: " + p + (p === "granted" ? "（可再点一次自检）" : ""));
      }).catch(function () { /* 忽略 */ });
    } catch (e) { /* 忽略 */ }
  } else {
    try {
      var n = new Notification("DSH：浏览器通知自检", { body: "看到即链路正常 ✓", icon: NOTIFY_ICON });
      n.onclick = function () { window.focus(); n.close(); };
      diagStats.shown += 1;
      text = "✓ 已创建浏览器通知（若屏幕未弹出，是浏览器/系统级通知被禁用）";
    } catch (e) { text = "✗ 创建通知异常: " + (e && e.message ? e.message : String(e)); }
  }
  setResult(text);
}

/** 设置表单本体（两种宿主形态共用一套字段与读写）。 */
function NotifierSettings(props: any) {
  var pageMode = !!(props && props.view === "page");
  var pair = React.useState(function () { return { loading: true, cfg: null }; });
  var st = pair[0];
  var setSt = pair[1];
  var openPair = React.useState(pageMode);
  var open = openPair[0];
  var setOpen = openPair[1];
  var testPair = React.useState("");
  var testRes = testPair[0];
  var setTestRes = testPair[1];
  React.useEffect(function () {
    fetch(ROUTES.config, { headers: { accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (cfg) { setSt({ loading: false, cfg: cfg }); })
      .catch(function () { setSt({ loading: false, cfg: null }); });
  }, []);

  /** 一个开关行（label + 说明 + 右侧开关）。 */
  function toggleRow(key: string, label: string, hint: string, value: boolean, onToggle: (v: boolean) => void) {
    return React.createElement("label", { className: "dn-row", key: key },
      React.createElement("span", { className: "dn-row-main" },
        React.createElement("span", { className: "dn-row-label" }, label),
        hint ? React.createElement("span", { className: "dn-row-hint" }, hint) : null
      ),
      React.createElement("input", {
        type: "checkbox", className: "dn-switch", checked: value === true,
        "aria-label": label, onChange: function (e: any) { onToggle(e.target.checked); },
      })
    );
  }

  /** 一个分组（标题 + 行）。 */
  function group(title: string, rows: any[], name: string) {
    return React.createElement("div", { className: "dn-group", key: name },
      React.createElement("div", { className: "dn-group-title" }, title), rows);
  }

  if (st.loading) return React.createElement("div", { className: "dn-note" }, "加载配置…");
  if (!st.cfg) return React.createElement("div", { className: "dn-note" }, "配置不可用（loopback 围栏：请经 127.0.0.1/localhost 访问）。");

  var cfg = st.cfg;
  var commit = function (next: any) {
    fetch(ROUTES.config, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (saved) { setSt({ loading: false, cfg: saved }); configCache = saved; })
      .catch(function () { /* 保留现值 */ });
  };
  var set = function (field: string, v: any) { commit(Object.assign({}, cfg, (function () { var o: any = {}; o[field] = v; return o; })())); };
  var qh = cfg.quietHours || { enabled: false, start: "22:00", end: "08:00", allowKinds: [] };
  var setQh = function (patch: any) { commit(Object.assign({}, cfg, { quietHours: Object.assign({}, qh, patch) })); };

  var groups: any[] = [];

  groups.push(group("通知事件", EVENT_ROWS.map(function (row) {
    return toggleRow(row[0], row[1], row[2], cfg[row[0]], function (v) { set(row[0], v); });
  }), "events"));

  groups.push(group("通知通道", CHANNEL_ROWS.map(function (row) {
    return toggleRow(row[0], row[1], row[2], cfg[row[0]], function (v) { set(row[0], v); });
  }), "channels"));

  // ---- 浏览器通知诊断（权限状态 / 安全上下文 / SSE 接收 / 测试弹窗）----
  var hasApi = "Notification" in window;
  var diagRows: any[] = [
    React.createElement("div", { className: "dn-note", key: "diag" },
      "安全上下文: " + (isSecureContext() ? "✓" : "✗（需 HTTPS 或 127.0.0.1/localhost）") +
      " ｜ Notification: " + (hasApi ? "✓" : "✗") +
      " ｜ 权限: " + (hasApi ? Notification.permission : "n/a") +
      " ｜ 本页收到帧: " + diagStats.frames +
      " ｜ 已弹: " + diagStats.shown),
    React.createElement("div", { className: "dn-row", key: "selftest" },
      React.createElement("span", { className: "dn-row-main" },
        React.createElement("span", { className: "dn-row-label" }, "浏览器通知自检")),
      React.createElement("button", { type: "button", className: "dn-btn", onClick: function () { runNotifySelfTest(setTestRes); } }, "自检")
    ),
  ];
  if (testRes) diagRows.push(React.createElement("div", { className: "dn-note", key: "testres" }, testRes));
  groups.push(group("浏览器通知诊断", diagRows, "diag"));

  // ---- 免打扰时段 ----
  var allows = qh.allowKinds || [];
  groups.push(group("免打扰时段", [
    toggleRow("quietEnabled", "启用", "时段内静音，仅「免打扰仍提醒」的事件放行", qh.enabled, function (v) { setQh({ enabled: v }); }),
    React.createElement("div", { className: "dn-row", key: "qh-time" },
      React.createElement("span", { className: "dn-row-main" },
        React.createElement("span", { className: "dn-row-label" }, "时段"),
        React.createElement("span", { className: "dn-row-hint" }, "跨零点（如 22:00 → 08:00）按跨夜处理")),
      React.createElement("span", { className: "dn-inline" },
        React.createElement("span", { className: "dn-row-hint" }, "从"),
        React.createElement("input", { type: "time", className: "dn-input", value: qh.start, "aria-label": "免打扰开始时间", onChange: function (e: any) { setQh({ start: e.target.value || "22:00" }); } }),
        React.createElement("span", { className: "dn-row-hint" }, "到"),
        React.createElement("input", { type: "time", className: "dn-input", value: qh.end, "aria-label": "免打扰结束时间", onChange: function (e: any) { setQh({ end: e.target.value || "08:00" }); } })
      )
    ),
    React.createElement("div", { className: "dn-row", key: "qh-allow" },
      React.createElement("span", { className: "dn-row-main" },
        React.createElement("span", { className: "dn-row-label" }, "免打扰仍提醒")),
      React.createElement("span", { className: "dn-inline" }, ALLOW_ROWS.map(function (kv) {
        return React.createElement("label", { className: "dn-choice", key: kv[0] },
          React.createElement("input", { type: "checkbox", checked: allows.indexOf(kv[0]) !== -1, onChange: function (e: any) {
            var next = allows.slice();
            if (e.target.checked && next.indexOf(kv[0]) === -1) next.push(kv[0]);
            else if (!e.target.checked && next.indexOf(kv[0]) !== -1) next.splice(next.indexOf(kv[0]), 1);
            setQh({ allowKinds: next });
          } }), React.createElement("span", null, kv[1]));
      }))
    ),
  ], "quiet"));

  // ---- 合并 / 去重 / 保留 ----
  groups.push(group("合并 / 去重 / 保留", WINDOW_ROWS.map(function (row) {
    return React.createElement("label", { className: "dn-row", key: row[0] },
      React.createElement("span", { className: "dn-row-main" },
        React.createElement("span", { className: "dn-row-label" }, row[1]),
        React.createElement("span", { className: "dn-row-hint" }, row[2])),
      React.createElement("input", {
        type: "number", min: "0", step: "100", className: "dn-input", "aria-label": row[1],
        value: cfg[row[0]] == null ? 0 : cfg[row[0]],
        onChange: function (e: any) { var v = parseInt(e.target.value, 10); set(row[0], Number.isFinite(v) && v >= 0 ? v : 0); },
      })
    );
  }), "windows"));

  groups.push(React.createElement("div", { className: "dn-note", key: "footer" },
    "浏览器通知仅在页面隐藏时弹出（可开「页面可见时也弹」）；系统通知由宿主发出。改动即时保存。"));
  if (!pageMode) groups.push(React.createElement("div", { className: "dn-note", key: "legacy-tip" }, "配置文件：~/.dsh/dsh-notifier.json"));

  // 插件页形态：页面已自带标题、版本与描述，这里只出配置区（不套折叠壳）。
  if (pageMode) return React.createElement("div", { className: "dn-set" }, groups);

  // 旧设置卡形态（≤0.1.6）：标题 + 描述 + chevron 的可折叠卡片。
  return React.createElement("div", { className: "dn-card" },
    React.createElement("button", { type: "button", className: "dn-card-head", onClick: function () { setOpen(!open); }, "aria-expanded": String(open), "aria-label": (open ? "收起" : "展开") + ": 通知" },
      React.createElement("div", { className: "dn-card-text" },
        React.createElement("span", { className: "dn-card-name" }, "通知"),
        React.createElement("span", { className: "dn-card-desc" }, SUMMARY_TEXT)
      ),
      React.createElement("span", { className: "dn-card-chevron", "data-open": String(open) }, React.createElement(ChevronIcon))
    ),
    open ? React.createElement("div", { className: "dn-card-body" }, groups) : null
  );
}

/** 插槽入口：summary 形态只出单行说明（页面用法见 ui-plugin-manager 的 slot-contract）。 */
function renderSettings(props: any) {
  if (props && props.view === "summary") return React.createElement("span", null, SUMMARY_TEXT);
  return React.createElement(NotifierSettings, props);
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
      // 设置界面（只依赖 ctx.slots）：插件页配置区（0.1.7+）+ 旧设置卡（≤0.1.6）。
      // 插槽未声明时 inject 的回调不会触发（ui-slots 的 inject 按 declaration 就绪
      // 才执行），两条注册因此可以同时挂着而不会在任一代宿主上重复出界面。
      if (ctx && ctx.slots && typeof ctx.slots.inject === "function") {
        ctx.effect(function () {
          return ctx.slots.inject(PAGE_SLOT, function () {
            return ctx.slots.register({ name: PAGE_SLOT, key: PKG_NAME }, renderSettings);
          });
        }, "dsh-notifier: plugin page config");
        ctx.effect(function () {
          return ctx.slots.inject(LEGACY_SLOT, function () {
            return ctx.slots.register({ name: LEGACY_SLOT, key: "notifier" }, renderSettings);
          });
        }, "dsh-notifier: legacy settings card");
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
