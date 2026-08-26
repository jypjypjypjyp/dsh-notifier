/**
 * dsh-notifier — 浏览器端（自包含，无 import）。
 *
 * 纯通知显示模块：自动订阅 /events SSE；页面隐藏时用 Notification API 弹通知；
 * 非安全上下文/无权限时降级为页面内横幅 + 提示音 + 标题提醒。
 * 配置（开关/通道/免打扰/合并窗口）由宿主经 dsh-settings 注册为 DSH
 * 「设置 → 插件配置」的统一风格表单，本模块不渲染任何配置 UI。
 * 路由常量与宿主端 ROUTES 一致（smoke 断言）。
 */
// 浏览器半区干净模块：只导出 apply/inject，契约外壳（IIFE/load/Symbol.toStringTag 装配）
// 由 scripts/build/build-client.mjs 统一生成——源码不写任何 loader 痕迹。
// 样式：独立 style.css（见同目录），build-client 的 .css text-loader 构建期内联为字符串
import STYLE from "./style.css";

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
  /** 启动时预取配置：可见性判断要用 notifyWhenVisible（不再渲染配置面板）。 */
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

  // 多标签主从租约（仅「同 URL 的同浏览器多标签」有效；跨 host/IP、跨浏览器
  // 的 storage 域互不相交，去重自然失效——已按此口径写入 README）：
  // 收到通知帧的标签先 checkMaster：有效租约且属于自己 → 续租并展示；
  // 属于他人 → 静默；无主/已过期 → 抢占（写自己租约）并展示。
  // 租约 15s：主标签关闭/后台休眠后，下一个帧事件在 ≤15s 窗口内由其他标签接管。
  var TAB_ID = Math.random().toString(36).slice(2);
  var MASTER_KEY = "dsh-notifier:master";
  var MASTER_LEASE_MS = 15000;
  function claimMaster() {
    try {
      var raw = localStorage.getItem(MASTER_KEY);
      var lease = raw ? JSON.parse(raw) : null;
      var now = Date.now();
      if (lease && typeof lease.id === "string" && typeof lease.ts === "number" && now - lease.ts < MASTER_LEASE_MS) {
        if (lease.id === TAB_ID) {
          lease.ts = now; // 续租
          localStorage.setItem(MASTER_KEY, JSON.stringify(lease));
          return true;
        }
        return false; // 他标签持有有效租约
      }
      localStorage.setItem(MASTER_KEY, JSON.stringify({ id: TAB_ID, ts: now }));
      return true;
    } catch (error) {
      return true; // localStorage 不可用：退化为每标签单独展示
    }
  }

  /** 页面是否处于安全上下文（HTTPS 或 localhost）——系统级 Notification 的前提。 */
  function isSecureContext() {
    return window.isSecureContext === true;
  }

  /** 系统级浏览器通知是否可用（安全上下文 + 已授权）。 */
  function systemNotificationUsable() {
    if (!("Notification" in window)) return false;
    if (!isSecureContext()) return false;
    return Notification.permission === "granted";
  }

  // ---- 降级提醒（非安全上下文：系统弹窗被浏览器禁止时使用）----

  var audioCtx: any = null;

  /** 解锁音频（必须在用户手势内调用）：后台播放提示音需要已解锁的 AudioContext。 */
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
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start(0);
    } catch (error) {
      // 音频不可用不阻塞通知
    }
  }

  /** 播放双音提示音（880Hz→660Hz，短促）。节流：1.5 秒内通知连发只响一次。 */
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
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t + i * 0.18);
        osc.stop(t + i * 0.18 + 0.17);
      }
    } catch (error) {
      // 播放失败忽略
    }
  }

  var savedTitle: any = null;

  /** 隐藏时改 document.title 提醒（"🔔 任务完成 …"），可见时还原。 */
  function flashTitle(title: any) {
    if (savedTitle === null) savedTitle = document.title;
    document.title = "🔔 " + String(title).slice(0, 40);
  }

  function restoreTitle() {
    if (savedTitle !== null) {
      document.title = savedTitle;
      savedTitle = null;
    }
  }

  /** 页面内横幅（非安全上下文降级通道；点击聚焦，8 秒自动消失，最多叠 3 条）。
   *  同类型（如 test 连发）先替换旧横幅，避免抖动堆叠。 */
  function showBanner(kind: any, title: any, message: any) {
    var existing = document.querySelector('.dn-banner[data-kind="' + kind + '"]');
    if (existing) existing.remove();
    var banners = document.querySelectorAll(".dn-banner");
    while (banners.length >= 3) banners[0].remove();
    var banner = el("div", {
      class: "dn-banner",
      dataset: { kind: kind },
      onClick: function () {
        window.focus();
        banner.remove();
      },
    });
    var head = el("div", { style: "display:flex;align-items:center;gap:6px" });
    head.appendChild(el("span", { text: "🔔" }));
    head.appendChild(el("span", { text: title, style: "font-weight:600" }));
    banner.appendChild(head);
    banner.appendChild(el("div", { text: message, style: "margin-top:4px;font-size:12px;line-height:1.5;white-space:pre-line" }));
    document.body.appendChild(banner);
    setTimeout(function () {
      banner.remove();
    }, 8000);
  }

  /**
   * 通知展示总入口：系统级 Notification 可用 → 弹系统通知；
   * 否则降级（页面内横幅 + 提示音 + 标题提醒）。
   */
  function showNotification(kind: any, title: any, message: any) {
    // 多标签去重：仅主标签执行展示（通知/横幅/提示音/标题），副标签静默
    if (!claimMaster()) return;
    if (systemNotificationUsable()) {
      try {
        // tag 加时间戳+随机后缀：每条通知独立显示，同类连发也互不替换
        var notification = new Notification(title, {
          body: message,
          tag: "dsh-notifier-" + kind + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
          icon: NOTIFY_ICON,
          silent: !!(configCache && configCache.notifySound === false),
        });
        notification.onclick = function () {
          window.focus();
          notification.close();
        };
        notified.push(notification);
        if (notified.length > 5) notified.shift().close();
        return;
      } catch (error) {
        // 浏览器通知失败，降级为页面内提醒
      }
    }
    if (document.visibilityState !== "hidden") {
      showBanner(kind, title, message);
    } else {
      flashTitle(title);
    }
    playChime();
  }

  function handleNotifyFrame(payload: any) {
    // 页面聚焦时不提醒（用户在界面中）；除非配置了「页面可见时也弹」。
    if (document.visibilityState !== "hidden" && !(configCache && configCache.notifyWhenVisible === true)) return;
    showNotification(payload.kind, payload.title, payload.message);
  }

  var eventsHandle: any = null;

  // 页面重新可见时：还原标题 + 强制重建 SSE（iOS 后台挂起后连接可能已失效）
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      restoreTitle();
      if (eventsHandle && eventsHandle.reconnect) eventsHandle.reconnect();
    }
  });

  /** SSE 半开连接看门狗：60s 无任何帧（notify 或心跳 ping）→ 主动重建。 */
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
        if (Date.now() - lastActivity > WATCHDOG_MS) {
          forceReconnect(); // 判定半开连接：心跳 ping 应定期触达，超时说明静默断掉
        } else {
          armWatchdog();
        }
      }, WATCHDOG_MS + 5000);
    }

    function forceReconnect() {
      var now = Date.now();
      if (now - lastReconnectAt < 5000) return; // 重连节流
      lastReconnectAt = now;
      closeSource();
      connect();
    }

    function closeSource() {
      if (source !== null) {
        try {
          source.close();
        } catch (error) {
          // close() 很少抛错，失败留痕便于排查
        }
        source = null;
      }
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
            if (data.type === "ping") return; // 心跳帧：仅更新活动时间戳
            if (data.type === "notify") {
              if (typeof data.seq === "number") {
                if (lastSeq > 0 && data.seq <= lastSeq) return; // seq 去重（重连回放竞态）
                lastSeq = data.seq;
              }
              handleNotifyFrame(data);
            }
          } catch (error) {
            // 帧解析失败
          }
        };
        source.onerror = function () {
          forceReconnect(); // 主动重建（带 since 补拉）
        };
        armWatchdog();
      } catch (error) {
        // EventSource 不可用
      }
    }

    connect();
    return {
      close: function () {
        if (watchdog !== null) clearTimeout(watchdog);
        closeSource();
      },
      reconnect: forceReconnect,
    };
  }

  // ------------------------------------------------------------ 挂载

export function apply(ctx: any) {
  var disposeEvents: any = null;

  function boot() {
    try {
      injectStyle();
      refreshConfig(); // 预取配置：可见性判断不需打开面板
      if (disposeEvents === null) {
        disposeEvents = startEvents();
        eventsHandle = disposeEvents;
      }
      // 首次任意点击解锁音频（浏览器自动播放策略要求手势）+ 请求通知权限
      // （Chrome 只接受手势内的授权请求）。不再有侧边栏「通知」入口，权限在手势内申请。
      document.addEventListener("click", function onFirstClick() {
        unlockAudio();
        if ("Notification" in window && Notification.permission === "default") requestPermission();
        document.removeEventListener("click", onFirstClick);
      }, { capture: true });
      ctx.effect(function () {
        return function () {
          if (disposeEvents !== null) {
            disposeEvents.close();
            disposeEvents = null;
            eventsHandle = null;
          }
          for (var i = 0; i < notified.length; i += 1) {
            try {
              notified[i].close();
            } catch (error) {
              // 忽略
            }
          }
        };
      }, "dsh-notifier");
    } catch (error) {
      // 挂载失败静默
    }
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
}

// ---- 客户端契约：apply/inject 由 build-client 经 factory 装配（干净模块）----
export const inject: string[] = [];
