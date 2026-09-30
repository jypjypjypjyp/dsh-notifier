"use strict";
// 契约外壳（scripts/build-client.mjs 生成）：external 依赖（React 等）经 factory 注入的 require 解析
window.__ModuleLoader__.load({
  id: "@jypjypjypjyp/dsh-notifier",
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
    "use strict";
    "use strict";
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

    // src/client/index.ts
    var index_exports = {};
    __export(index_exports, {
      apply: () => apply,
      inject: () => inject
    });
    module.exports = __toCommonJS(index_exports);

    // src/client/style.css
    var style_default = '/* dsh-notifier — 客户端样式（独立 .css 文件）。\n *\n * 由 build-client 的 .css text-loader 构建期内联进 client.js（产物仍自包含单文件、\n * 零运行时依赖、无独立网络请求）。injectStyle 注入 <style id=dsh-notifier-style>。\n * 前缀 dn-（防与 shell 冲突）；颜色一律走 --dsw-alias-* 主题变量 + 浅色回退。\n *\n * 两块内容：① 非安全上下文降级横幅；② 设置界面（.dn-set* —— 插件页配置区；\n * .dn-card* —— 旧宿主 ≤0.1.6 的设置卡壳）。\n */\n\n/* 非安全上下文降级横幅（页面可见时） */\n.dn-banner {\n  position: fixed;\n  top: 16px;\n  right: 16px;\n  width: 320px;\n  max-width: min(320px, calc(100vw - 24px));\n  padding: 10px 12px;\n  border-radius: 10px;\n  z-index: 10000;\n  background: var(--dsw-alias-bg-base, #ffffff);\n  border: 1px solid var(--dsw-alias-border-l1, #e2e5ea);\n  border-left: 4px solid var(--dsw-alias-state-success-primary, #0f9d6e);\n  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);\n  cursor: pointer;\n  color: var(--dsw-alias-label-primary, #1f2329);\n  font-size: 13px;\n}\n.dn-banner[data-kind="error"] { border-left-color: var(--dsw-alias-state-error-primary, #d92d20); }\n.dn-banner[data-kind="ask"],\n.dn-banner[data-kind="question"] { border-left-color: var(--dsw-alias-state-warning-primary, #f79009); }\n\n/* ---------- 设置界面：分组 + 行 + 控件 ---------- */\n\n.dn-set {\n  display: flex;\n  flex-direction: column;\n  font-size: 13px;\n  color: var(--dsw-alias-label-primary, #1f2329);\n}\n\n/* 分组（一个主题一块；首块不额外留白，页面自带标题与描述） */\n.dn-group { display: flex; flex-direction: column; margin-top: 14px; }\n.dn-group:first-child { margin-top: 0; }\n.dn-group-title {\n  font-size: 12px;\n  font-weight: 600;\n  line-height: 1.6;\n  letter-spacing: 0.02em;\n  color: var(--dsw-alias-label-secondary, #5f6672);\n}\n\n/* 行：左文字（标签 + 说明）、右控件，行间一条细线 */\n.dn-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  padding: 9px 0;\n  border-bottom: 1px solid var(--dsw-alias-border-l2, #e5e7eb);\n}\n.dn-row:last-child { border-bottom: 0; }\n.dn-row-main { display: flex; flex-direction: column; flex: 1; gap: 1px; min-width: 0; }\n.dn-row-label { font-size: 13px; line-height: 1.5; }\n.dn-row-hint { font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-tertiary, #8a919c); }\n\n/* 开关：自绘（不依赖宿主 UI 包——同名组件/图标在各版本间有增删，取错静默变 undefined 会整卡崩） */\n.dn-switch {\n  appearance: none;\n  -webkit-appearance: none;\n  flex: none;\n  position: relative;\n  width: 36px;\n  height: 20px;\n  margin: 0;\n  border: 0;\n  border-radius: 999px;\n  background: var(--dsw-alias-bg-layer-1, #e6e8ec);\n  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l2, #dcdfe5);\n  cursor: pointer;\n  transition: background 0.16s ease;\n}\n.dn-switch::after {\n  content: "";\n  position: absolute;\n  top: 2px;\n  left: 2px;\n  width: 14px;\n  height: 14px;\n  border-radius: 50%;\n  background: #fff;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);\n  transition: transform 0.16s ease;\n}\n.dn-switch:checked { background: var(--dsw-alias-state-business-primary, #ff9d5c); box-shadow: none; }\n.dn-switch:checked::after { transform: translateX(16px); }\n.dn-switch:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #ff9d5c); outline-offset: 2px; }\n\n/* 数字 / 时间输入 */\n.dn-input {\n  flex: none;\n  width: 96px;\n  box-sizing: border-box;\n  font: inherit;\n  font-size: 13px;\n  padding: 4px 8px;\n  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);\n  border-radius: 6px;\n  background: var(--dsw-alias-bg-layer-1, #f5f6f8);\n  color: var(--dsw-alias-label-primary, #1f2329);\n}\n.dn-input[type="time"] { width: auto; }\n\n/* 行内多控件 / 复选项 */\n.dn-inline { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: none; }\n.dn-choice {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  font-size: 12px;\n  cursor: pointer;\n  color: var(--dsw-alias-label-secondary, #5f6672);\n}\n\n.dn-btn {\n  flex: none;\n  appearance: none;\n  font: inherit;\n  font-size: 12px;\n  cursor: pointer;\n  padding: 4px 10px;\n  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);\n  border-radius: 6px;\n  background: var(--dsw-alias-bg-layer-3, #f5f6f8);\n  color: var(--dsw-alias-label-primary, #1f2329);\n}\n.dn-btn:hover { border-color: var(--dsw-alias-label-tertiary, #8a919c); }\n\n.dn-note { font-size: 11px; line-height: 1.7; color: var(--dsw-alias-label-tertiary, #8a919c); padding-top: 6px; }\n\n/* ---------- 旧宿主（≤0.1.6）的 settings.plugin.item 卡片壳 ---------- */\n\n.dn-card {\n  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);\n  background: var(--dsw-alias-bg-layer-3, #f5f6f8);\n  border-radius: 12px;\n  overflow: hidden;\n}\n.dn-card-head {\n  appearance: none;\n  width: 100%;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 14px 16px;\n  font: inherit;\n  color: inherit;\n  text-align: left;\n  background: transparent;\n  border: 0;\n  cursor: pointer;\n}\n.dn-card-text { display: flex; flex-direction: column; flex: 1; gap: 4px; min-width: 0; }\n.dn-card-name { font-size: 15px; font-weight: 600; line-height: 1.4; color: var(--dsw-alias-label-primary, #1f2329); }\n.dn-card-desc { font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-tertiary, #8a919c); }\n.dn-card-chevron { flex: none; display: inline-flex; color: var(--dsw-alias-label-tertiary, #8a919c); transition: transform 0.16s; }\n.dn-card-chevron[data-open="true"] { transform: rotate(180deg); }\n.dn-card-body { border-top: 1px solid var(--dsw-alias-border-l2, #e5e7eb); margin: 0 16px; padding-bottom: 10px; }\n';

    // src/client/index.ts
    var import_react = __toESM(require("react"), 1);
    var ROUTES = {
      config: "/api/dsh-notifier/config",
      events: "/api/dsh-notifier/events",
      health: "/api/dsh-notifier/health",
      test: "/api/dsh-notifier/test",
      history: "/api/dsh-notifier/history"
    };
    var STYLE_ID = "dsh-notifier-style";
    var NOTIFY_ICON = "data:image/svg+xml;utf8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#0f9d6e"/><path fill="#fff" d="M12 4a1 1 0 0 1 1 1v.55A5.5 5.5 0 0 1 17.5 11v2.3l1.45 1.45a1 1 0 0 1-.7 1.7H5.75a1 1 0 0 1-.7-1.7L6.5 13.3V11A5.5 5.5 0 0 1 11 5.55V5a1 1 0 0 1 1-1zm-2.5 13a2.5 2.5 0 0 0 5 0h-5z"/></svg>'
    );
    function injectStyle() {
      var existing = document.getElementById(STYLE_ID);
      if (existing) existing.remove();
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = style_default;
      document.head.appendChild(style);
    }
    function requestPermission() {
      if (!("Notification" in window)) return;
      try {
        Notification.requestPermission().catch(function() {
        });
      } catch (error) {
      }
    }
    function el(tag, attrs, children = void 0) {
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
    var configCache = null;
    function refreshConfig() {
      fetch(ROUTES.config, { headers: { accept: "application/json" } }).then(function(res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      }).then(function(config) {
        configCache = config;
      }).catch(function() {
      });
    }
    var notified = [];
    var diagStats = { frames: 0, shown: 0 };
    var TAB_ID = Math.random().toString(36).slice(2);
    var MASTER_KEY = "dsh-notifier:master";
    var MASTER_LEASE_MS = 15e3;
    function claimMaster() {
      try {
        var raw = localStorage.getItem(MASTER_KEY);
        var lease = raw ? JSON.parse(raw) : null;
        var now = Date.now();
        if (lease && typeof lease.id === "string" && typeof lease.ts === "number" && now - lease.ts < MASTER_LEASE_MS) {
          if (lease.id === TAB_ID) {
            lease.ts = now;
            localStorage.setItem(MASTER_KEY, JSON.stringify(lease));
            return true;
          }
          return false;
        }
        localStorage.setItem(MASTER_KEY, JSON.stringify({ id: TAB_ID, ts: now }));
        return true;
      } catch (error) {
        return true;
      }
    }
    function isSecureContext() {
      return window.isSecureContext === true;
    }
    function systemNotificationUsable() {
      if (!("Notification" in window)) return false;
      if (!isSecureContext()) return false;
      return Notification.permission === "granted";
    }
    var audioCtx = null;
    function unlockAudio() {
      try {
        if (audioCtx === null) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          audioCtx = new AC();
        }
        if (audioCtx.state === "suspended") audioCtx.resume();
        var buffer = audioCtx.createBuffer(1, 1, 22050);
        var source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(0);
      } catch (error) {
      }
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
          gain.gain.setValueAtTime(1e-4, t + i * 0.18);
          gain.gain.exponentialRampToValueAtTime(0.18, t + i * 0.18 + 0.02);
          gain.gain.exponentialRampToValueAtTime(1e-4, t + i * 0.18 + 0.16);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(t + i * 0.18);
          osc.stop(t + i * 0.18 + 0.17);
        }
      } catch (error) {
      }
    }
    var savedTitle = null;
    function flashTitle(title) {
      if (savedTitle === null) savedTitle = document.title;
      document.title = "🔔 " + String(title).slice(0, 40);
    }
    function restoreTitle() {
      if (savedTitle !== null) {
        document.title = savedTitle;
        savedTitle = null;
      }
    }
    function showBanner(kind, title, message) {
      var existing = document.querySelector('.dn-banner[data-kind="' + kind + '"]');
      if (existing) existing.remove();
      var banners = document.querySelectorAll(".dn-banner");
      while (banners.length >= 3) banners[0].remove();
      var banner = el("div", {
        class: "dn-banner",
        dataset: { kind },
        onClick: function() {
          window.focus();
          banner.remove();
        }
      });
      var head = el("div", { style: "display:flex;align-items:center;gap:6px" });
      head.appendChild(el("span", { text: "🔔" }));
      head.appendChild(el("span", { text: title, style: "font-weight:600" }));
      banner.appendChild(head);
      banner.appendChild(el("div", { text: message, style: "margin-top:4px;font-size:12px;line-height:1.5;white-space:pre-line" }));
      document.body.appendChild(banner);
      setTimeout(function() {
        banner.remove();
      }, 8e3);
    }
    function showNotification(kind, title, message) {
      if (!claimMaster()) return;
      if (systemNotificationUsable()) {
        try {
          var notification = new Notification(title, {
            body: message,
            tag: "dsh-notifier-" + kind + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
            icon: NOTIFY_ICON,
            silent: !!(configCache && configCache.notifySound === false)
          });
          notification.onclick = function() {
            window.focus();
            notification.close();
          };
          notified.push(notification);
          if (notified.length > 5) notified.shift().close();
          diagStats.shown += 1;
          return;
        } catch (error) {
        }
      }
      if (document.visibilityState !== "hidden") {
        showBanner(kind, title, message);
      } else {
        flashTitle(title);
      }
      playChime();
    }
    function handleNotifyFrame(payload) {
      if (document.visibilityState !== "hidden" && !(configCache && configCache.notifyWhenVisible === true)) return;
      showNotification(payload.kind, payload.title, payload.message);
    }
    var eventsHandle = null;
    document.addEventListener("visibilitychange", function() {
      if (document.visibilityState === "visible") {
        restoreTitle();
        if (eventsHandle && eventsHandle.reconnect) eventsHandle.reconnect();
      }
    });
    var WATCHDOG_MS = 6e4;
    function startEvents() {
      var source = null;
      var lastActivity = 0;
      var lastSeq = 0;
      var watchdog = null;
      var lastReconnectAt = 0;
      function armWatchdog() {
        if (watchdog !== null) clearTimeout(watchdog);
        watchdog = setTimeout(function() {
          if (Date.now() - lastActivity > WATCHDOG_MS) {
            forceReconnect();
          } else {
            armWatchdog();
          }
        }, WATCHDOG_MS + 5e3);
      }
      function closeSource() {
        if (source !== null) {
          try {
            source.close();
          } catch (error) {
          }
          source = null;
        }
      }
      function forceReconnect() {
        var now = Date.now();
        if (now - lastReconnectAt < 5e3) return;
        lastReconnectAt = now;
        closeSource();
        connect();
      }
      function connect() {
        closeSource();
        try {
          var url = ROUTES.events + (lastSeq > 0 ? "?since=" + lastSeq : "");
          source = new EventSource(url);
          lastActivity = Date.now();
          source.onmessage = function(event) {
            try {
              var data = JSON.parse(event.data);
              lastActivity = Date.now();
              if (data.type === "ping") return;
              if (data.type === "notify") {
                if (typeof data.seq === "number") {
                  if (lastSeq > 0 && data.seq <= lastSeq) return;
                  lastSeq = data.seq;
                }
                diagStats.frames += 1;
                handleNotifyFrame(data);
              }
            } catch (error) {
            }
          };
          source.onerror = function() {
            forceReconnect();
          };
          armWatchdog();
        } catch (error) {
        }
      }
      connect();
      return {
        close: function() {
          if (watchdog !== null) clearTimeout(watchdog);
          closeSource();
        },
        reconnect: forceReconnect
      };
    }
    var PKG_NAME = "@jypjypjypjyp/dsh-notifier";
    var PAGE_SLOT = "plugins.bundle.config";
    var LEGACY_SLOT = "settings.plugin.item";
    var SUMMARY_TEXT = "审批 / 完成 / 错误事件提醒";
    var EVENT_ROWS = [
      ["notifyAsk", "审批等待", "需要你批准工具调用时提醒"],
      ["notifyQuestion", "向你提问", "模型向你提问题时提醒"],
      ["notifyTaskDone", "任务完成", "主任务收尾时提醒"],
      ["notifySubagentDone", "子任务完成", "派生的子代理收尾时提醒（默认关）"],
      ["notifyTaskError", "任务出错", "回合报错时提醒（窗口内合并）"],
      ["notifyTurnEnd", "轮次完成", "每轮结束都提醒（不等于任务完成）"]
    ];
    var CHANNEL_ROWS = [
      ["systemNotify", "系统通知", "弹系统原生通知（WinRT / osascript / notify-send）"],
      ["browserNotify", "浏览器通知", "页面内弹浏览器 Notification"],
      ["notifyWhenVisible", "页面可见时也弹", "默认只在页面隐藏时提醒"],
      ["notifySound", "通知声音", "系统通知带提示音"]
    ];
    var WINDOW_ROWS = [
      ["errorMergeWindowMs", "错误合并窗口", "毫秒：同类错误在此窗口内合并；0 = 每条都提醒"],
      ["doneMergeWindowMs", "完成聚合窗口", "毫秒：并行收尾防刷屏；0 = 关闭聚合"],
      ["askRemindMin", "审批重提醒", "分钟：审批卡住超时后再提醒一次；0 = 关闭"],
      ["historyMaxAgeDays", "历史保留", "天：通知历史自动清理；0 = 只按行数滚动"]
    ];
    var ALLOW_ROWS = [["ask", "审批"], ["question", "提问"], ["error", "出错"]];
    function ChevronIcon() {
      return import_react.default.createElement(
        "svg",
        { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
        import_react.default.createElement("path", { d: "M4 6.5 8 10.5l4-4", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })
      );
    }
    function runNotifySelfTest(setResult) {
      var text = "";
      if (!("Notification" in window)) text = "✗ 当前浏览器不支持 Notification API";
      else if (!isSecureContext()) text = "✗ 非安全上下文（需 HTTPS 或 127.0.0.1/localhost）";
      else if (Notification.permission === "denied") text = "✗ 权限已被拒绝——到浏览器站点设置→通知→允许";
      else if (Notification.permission === "default") {
        text = "~ 权限尚未请求，正在发起授权…（请留意浏览器弹出的授权询问）";
        try {
          Notification.requestPermission().then(function(p) {
            setResult("授权结果: " + p + (p === "granted" ? "（可再点一次自检）" : ""));
          }).catch(function() {
          });
        } catch (e) {
        }
      } else {
        try {
          var n = new Notification("DSH：浏览器通知自检", { body: "看到即链路正常 ✓", icon: NOTIFY_ICON });
          n.onclick = function() {
            window.focus();
            n.close();
          };
          diagStats.shown += 1;
          text = "✓ 已创建浏览器通知（若屏幕未弹出，是浏览器/系统级通知被禁用）";
        } catch (e) {
          text = "✗ 创建通知异常: " + (e && e.message ? e.message : String(e));
        }
      }
      setResult(text);
    }
    function NotifierSettings(props) {
      var pageMode = !!(props && props.view === "page");
      var pair = import_react.default.useState(function() {
        return { loading: true, cfg: null };
      });
      var st = pair[0];
      var setSt = pair[1];
      var openPair = import_react.default.useState(pageMode);
      var open = openPair[0];
      var setOpen = openPair[1];
      var testPair = import_react.default.useState("");
      var testRes = testPair[0];
      var setTestRes = testPair[1];
      import_react.default.useEffect(function() {
        fetch(ROUTES.config, { headers: { accept: "application/json" } }).then(function(r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        }).then(function(cfg2) {
          setSt({ loading: false, cfg: cfg2 });
        }).catch(function() {
          setSt({ loading: false, cfg: null });
        });
      }, []);
      function toggleRow(key, label, hint, value, onToggle) {
        return import_react.default.createElement(
          "label",
          { className: "dn-row", key },
          import_react.default.createElement(
            "span",
            { className: "dn-row-main" },
            import_react.default.createElement("span", { className: "dn-row-label" }, label),
            hint ? import_react.default.createElement("span", { className: "dn-row-hint" }, hint) : null
          ),
          import_react.default.createElement("input", {
            type: "checkbox",
            className: "dn-switch",
            checked: value === true,
            "aria-label": label,
            onChange: function(e) {
              onToggle(e.target.checked);
            }
          })
        );
      }
      function group(title, rows, name) {
        return import_react.default.createElement(
          "div",
          { className: "dn-group", key: name },
          import_react.default.createElement("div", { className: "dn-group-title" }, title),
          rows
        );
      }
      if (st.loading) return import_react.default.createElement("div", { className: "dn-note" }, "加载配置…");
      if (!st.cfg) return import_react.default.createElement("div", { className: "dn-note" }, "配置不可用（loopback 围栏：请经 127.0.0.1/localhost 访问）。");
      var cfg = st.cfg;
      var commit = function(next) {
        fetch(ROUTES.config, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) }).then(function(r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        }).then(function(saved) {
          setSt({ loading: false, cfg: saved });
          configCache = saved;
        }).catch(function() {
        });
      };
      var set = function(field, v) {
        commit(Object.assign({}, cfg, (function() {
          var o = {};
          o[field] = v;
          return o;
        })()));
      };
      var qh = cfg.quietHours || { enabled: false, start: "22:00", end: "08:00", allowKinds: [] };
      var setQh = function(patch) {
        commit(Object.assign({}, cfg, { quietHours: Object.assign({}, qh, patch) }));
      };
      var groups = [];
      groups.push(group("通知事件", EVENT_ROWS.map(function(row) {
        return toggleRow(row[0], row[1], row[2], cfg[row[0]], function(v) {
          set(row[0], v);
        });
      }), "events"));
      groups.push(group("通知通道", CHANNEL_ROWS.map(function(row) {
        return toggleRow(row[0], row[1], row[2], cfg[row[0]], function(v) {
          set(row[0], v);
        });
      }), "channels"));
      var hasApi = "Notification" in window;
      var diagRows = [
        import_react.default.createElement(
          "div",
          { className: "dn-note", key: "diag" },
          "安全上下文: " + (isSecureContext() ? "✓" : "✗（需 HTTPS 或 127.0.0.1/localhost）") + " ｜ Notification: " + (hasApi ? "✓" : "✗") + " ｜ 权限: " + (hasApi ? Notification.permission : "n/a") + " ｜ 本页收到帧: " + diagStats.frames + " ｜ 已弹: " + diagStats.shown
        ),
        import_react.default.createElement(
          "div",
          { className: "dn-row", key: "selftest" },
          import_react.default.createElement(
            "span",
            { className: "dn-row-main" },
            import_react.default.createElement("span", { className: "dn-row-label" }, "浏览器通知自检")
          ),
          import_react.default.createElement("button", { type: "button", className: "dn-btn", onClick: function() {
            runNotifySelfTest(setTestRes);
          } }, "自检")
        )
      ];
      if (testRes) diagRows.push(import_react.default.createElement("div", { className: "dn-note", key: "testres" }, testRes));
      groups.push(group("浏览器通知诊断", diagRows, "diag"));
      var allows = qh.allowKinds || [];
      groups.push(group("免打扰时段", [
        toggleRow("quietEnabled", "启用", "时段内静音，仅「免打扰仍提醒」的事件放行", qh.enabled, function(v) {
          setQh({ enabled: v });
        }),
        import_react.default.createElement(
          "div",
          { className: "dn-row", key: "qh-time" },
          import_react.default.createElement(
            "span",
            { className: "dn-row-main" },
            import_react.default.createElement("span", { className: "dn-row-label" }, "时段"),
            import_react.default.createElement("span", { className: "dn-row-hint" }, "跨零点（如 22:00 → 08:00）按跨夜处理")
          ),
          import_react.default.createElement(
            "span",
            { className: "dn-inline" },
            import_react.default.createElement("span", { className: "dn-row-hint" }, "从"),
            import_react.default.createElement("input", { type: "time", className: "dn-input", value: qh.start, "aria-label": "免打扰开始时间", onChange: function(e) {
              setQh({ start: e.target.value || "22:00" });
            } }),
            import_react.default.createElement("span", { className: "dn-row-hint" }, "到"),
            import_react.default.createElement("input", { type: "time", className: "dn-input", value: qh.end, "aria-label": "免打扰结束时间", onChange: function(e) {
              setQh({ end: e.target.value || "08:00" });
            } })
          )
        ),
        import_react.default.createElement(
          "div",
          { className: "dn-row", key: "qh-allow" },
          import_react.default.createElement(
            "span",
            { className: "dn-row-main" },
            import_react.default.createElement("span", { className: "dn-row-label" }, "免打扰仍提醒")
          ),
          import_react.default.createElement("span", { className: "dn-inline" }, ALLOW_ROWS.map(function(kv) {
            return import_react.default.createElement(
              "label",
              { className: "dn-choice", key: kv[0] },
              import_react.default.createElement("input", { type: "checkbox", checked: allows.indexOf(kv[0]) !== -1, onChange: function(e) {
                var next = allows.slice();
                if (e.target.checked && next.indexOf(kv[0]) === -1) next.push(kv[0]);
                else if (!e.target.checked && next.indexOf(kv[0]) !== -1) next.splice(next.indexOf(kv[0]), 1);
                setQh({ allowKinds: next });
              } }),
              import_react.default.createElement("span", null, kv[1])
            );
          }))
        )
      ], "quiet"));
      groups.push(group("合并 / 去重 / 保留", WINDOW_ROWS.map(function(row) {
        return import_react.default.createElement(
          "label",
          { className: "dn-row", key: row[0] },
          import_react.default.createElement(
            "span",
            { className: "dn-row-main" },
            import_react.default.createElement("span", { className: "dn-row-label" }, row[1]),
            import_react.default.createElement("span", { className: "dn-row-hint" }, row[2])
          ),
          import_react.default.createElement("input", {
            type: "number",
            min: "0",
            step: "100",
            className: "dn-input",
            "aria-label": row[1],
            value: cfg[row[0]] == null ? 0 : cfg[row[0]],
            onChange: function(e) {
              var v = parseInt(e.target.value, 10);
              set(row[0], Number.isFinite(v) && v >= 0 ? v : 0);
            }
          })
        );
      }), "windows"));
      groups.push(import_react.default.createElement(
        "div",
        { className: "dn-note", key: "footer" },
        "浏览器通知仅在页面隐藏时弹出（可开「页面可见时也弹」）；系统通知由宿主发出。改动即时保存。"
      ));
      if (!pageMode) groups.push(import_react.default.createElement("div", { className: "dn-note", key: "legacy-tip" }, "配置文件：~/.dsh/dsh-notifier.json"));
      if (pageMode) return import_react.default.createElement("div", { className: "dn-set" }, groups);
      return import_react.default.createElement(
        "div",
        { className: "dn-card" },
        import_react.default.createElement(
          "button",
          { type: "button", className: "dn-card-head", onClick: function() {
            setOpen(!open);
          }, "aria-expanded": String(open), "aria-label": (open ? "收起" : "展开") + ": 通知" },
          import_react.default.createElement(
            "div",
            { className: "dn-card-text" },
            import_react.default.createElement("span", { className: "dn-card-name" }, "通知"),
            import_react.default.createElement("span", { className: "dn-card-desc" }, SUMMARY_TEXT)
          ),
          import_react.default.createElement("span", { className: "dn-card-chevron", "data-open": String(open) }, import_react.default.createElement(ChevronIcon))
        ),
        open ? import_react.default.createElement("div", { className: "dn-card-body" }, groups) : null
      );
    }
    function renderSettings(props) {
      if (props && props.view === "summary") return import_react.default.createElement("span", null, SUMMARY_TEXT);
      return import_react.default.createElement(NotifierSettings, props);
    }
    var inject = ["slots"];
    function apply(ctx) {
      var disposeEvents = null;
      function boot() {
        try {
          injectStyle();
          refreshConfig();
          if (disposeEvents === null) {
            disposeEvents = startEvents();
            eventsHandle = disposeEvents;
          }
          document.addEventListener("click", function onFirstClick() {
            unlockAudio();
            if ("Notification" in window && Notification.permission === "default") requestPermission();
            document.removeEventListener("click", onFirstClick);
          }, { capture: true });
          if (ctx && ctx.slots && typeof ctx.slots.inject === "function") {
            ctx.effect(function() {
              return ctx.slots.inject(PAGE_SLOT, function() {
                return ctx.slots.register({ name: PAGE_SLOT, key: PKG_NAME }, renderSettings);
              });
            }, "dsh-notifier: plugin page config");
            ctx.effect(function() {
              return ctx.slots.inject(LEGACY_SLOT, function() {
                return ctx.slots.register({ name: LEGACY_SLOT, key: "notifier" }, renderSettings);
              });
            }, "dsh-notifier: legacy settings card");
          }
          ctx.effect(function() {
            return function() {
              if (disposeEvents !== null) {
                disposeEvents.close();
                disposeEvents = null;
                eventsHandle = null;
              }
              for (var i = 0; i < notified.length; i += 1) {
                try {
                  notified[i].close();
                } catch (error) {
                }
              }
            };
          }, "dsh-notifier");
        } catch (error) {
        }
      }
      if (document.body) boot();
      else document.addEventListener("DOMContentLoaded", boot);
    }

    Object.defineProperty(module.exports, Symbol.toStringTag, { value: 'Module' })
    return module.exports
  }
})
