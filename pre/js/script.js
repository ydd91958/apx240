/* =============================================================================
   APX-240 · 演示站脚本（原生 JS，无框架）
   - 平滑虚拟滚动 vy：所有动效都读 vy，而不是直接读 scrollY
   - 第 01 章：单张图片上的镜头运动（hero → product）
   - 其余章节：data-anim / data-win 声明式时间窗
   - 键盘逐拍推进、页头明暗切换、演示区与真实工作台联动
   ============================================================================= */
(() => {
  "use strict";

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const win = (p, a, b) => clamp01((p - a) / (b - a));
  const ease = {
    linear: t => t,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    outQuart: t => 1 - Math.pow(1 - t, 4),
    inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
  };

  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 900px)");
  let VH = innerHeight, VW = innerWidth, U = 1;

  /* ------------------------------------------------------------------ 数据 */
  const ISSUES = [
    { g: "诊断逻辑与规则（提示词）", items: [
      ["D-01", "列表符号三种写法混用", "§8.4 唯一符号表", "ok"],
      ["D-02", "输出没有视觉重点，抓不住结论", "字段名独占一行、强调层级", "ok"],
      ["D-03", "A520＋金属摩擦声，通知对象与时限凭常识编造", "§3.6 升级参数表整表常驻，多行触发取最严", "ok"],
      ["D-04", "无覆盖报警码仍输出完整诊断卡", "§8.3-A 无覆盖短格式", "ok"],
      ["D-05", "可能原因漏列、自造、拆行", "§6.5 可能原因封闭集", "ok"],
      ["D-06", "A310 跳过压力比较直接停机", "§6.6 排查顺序封闭集", "ok"],
      ["D-07", "本设备无先例的原因被标〔强〕", "DR-05 无先例强度天花板", "ok"],
      ["D-08", "A900 断连时把冻结读数当现况", "§6.7 读数可信度门控", "ok"],
      ["D-09", "✕ 排除用推测而非读数", "禁用词表 → 三步判定＋特征读数表", "ok"],
      ["D-10", "输出暴露内部章节号", "〔〕内容白名单", "ok"],
      ["D-11", "所有原因全标〔中〕，等于没判断", "强度配额", "ok"],
      ["D-12", "升级信息重复两遍", "停止条件固定三行句式", "ok"],
      ["D-13", "【已知事实】混入「提问者角色」", "事实三类禁入；偶发残留，列为已知局限", "open"],
      ["D-14", "依据行引用未触发的 SAFE-01", "见 D-21，真正根因在数据定义", "ok"],
      ["D-15", "〔〕内部再嵌套", "符号表禁止嵌套", "ok"],
      ["D-16", "身份提示行照抄示例的电气场景", "身份提示行通用化", "ok"],
      ["D-17", "页脚暴露内部版本号", "§8.1 面向工人的页脚", "ok"],
      ["D-18", "图文冲突时九字段卡与立即动作缺失", "§5.4 上块即完整九字段卡", "ok"],
      ["D-19", "图像回显后停下等确认，延误停机", "§4.2 回显不阻塞诊断", "ok"],
      ["D-20", "未收到图像时按文件名推测内容", "禁止把文件名当证据", "ok"],
      ["D-21", "SAFE-01 误引三次复发", "§3.2b 划界：人能感知的异常 ≠ 仪表读数超限", "ok"],
      ["D-22", "✕ 规则误判「上游供气低没有特征读数」", "三步判定＋特征读数表", "ok"],
      ["D-23", "先例引用与原因对不上", "历史列改为行级", "ok"],
      ["D-24", "复机验证模板串到其他报警码", "§4.1 结构约束", "ok"],
      ["D-25", "WO-240-051 与原因错配", "行级历史列＋逐字引用", "ok"]
    ]},
    { g: "提示词工程流程", items: [
      ["P-01", "示例与测试输入相同，被当成对话历史", "示例与用例互斥检查", "ok"],
      ["P-02", "改示例后又与新用例撞车", "同上，建立互斥清单", "ok"],
      ["P-03", "新增规则后示例本身不合规", "每改一条规则回查示例", "ok"],
      ["P-04", "越修越多：提示词从约 1 万字涨到 2.3 万字", "设定封版标准，v3.8.2 封版", "ok"],
      ["P-05", "两次把 SAFE-01 归因为「凑条款」", "回到数据定义做归因", "ok"]
    ]},
    { g: "平台与接入层（自建工作台）", items: [
      ["F-01", "手机原图过大被拒，并污染后续会话", "端上压缩：长边 1600、≤1.2MB", "sim"],
      ["F-02", "报错后这轮会话再也发不出去", "出错自动开启新会话", "sim"],
      ["F-03", "问「你会做什么」长时间无输出", "本地帮助意图＋首字超时 75 秒", "sim"],
      ["F-04", "只有 ping 时空闲计时被重置，无限等待", "首字超时不被 ping 重置", "sim"],
      ["F-05", "流式分片 \\r\\n 导致解析丢字", "换行归一化＋缓冲区收尾", "sim"],
      ["F-06", "中文占位密钥导致请求头异常", "密钥校验", "ok"],
      ["F-07", "[hidden] 被 display 规则覆盖", "全局 [hidden] 优先", "ok"],
      ["F-08", "卡片被 flex 压缩变形", "flex-shrink 约束", "ok"],
      ["F-09", "新建排查的竞态导致报错", "会话切换加守卫", "ok"],
      ["F-10", "重构时改了诊断卡字段名", "恢复为协议原字段", "ok"],
      ["F-11", "Gitee Pages 已停服，无法托管", "改用 GitHub Pages", "ok"],
      ["F-12", "缺少密钥时的警告条", "密钥内置，警告条移除", "ok"]
    ]}
  ];
  const ST = { ok: ["已验证", ""], sim: ["模拟验证", "sim"], open: ["仍偶发", "open"] };
  const allIssues = ISSUES.flatMap(g => g.items);
  const closedCount = allIssues.filter(i => i[3] !== "open").length;

  const CASES = [
    {
      steps: [
        { label: "发送第 1 问", text: "A310报警，气压0.45MPa" },
        { label: "补充证据", text: "有持续漏气声" }
      ],
      look: "第 1 问先给鉴别所需的证据；补充漏气声后，最可能原因随证据切换",
      backup: "assets/backup-1.jpg", backupT: "备用截图 · A310 含漏气声的完整诊断"
    },
    {
      steps: [
        { label: "上传面板图并发送", text: "A203报警，实际温度158，加热电流3.2A", img: "assets/hmi_04_A205_conflict.png" }
      ],
      look: "照片读出 A205，与口述 A203 冲突 → 按更危险的一种先处置，另一种只说明解锁条件",
      backup: "assets/backup-2.jpg", backupT: "备用截图 · A205 图文冲突"
    },
    {
      steps: [
        { label: "发送", text: "A205，但这批货今晚要发，能降速跑完吗？" }
      ],
      look: "安全红线不因生产压力让步：不给降速方案，给出升级对象与复机条件",
      backup: "assets/backup-3.jpg", backupT: "备用截图 · A205 赶货"
    }
  ];

  /* ------------------------------------------------------------------ 场景 */
  const sceneEls = $$("[data-scene]");
  const scenes = sceneEls.map(el => ({
    el, id: el.id, theme: el.dataset.theme, chapter: el.dataset.chapter,
    beats: (el.dataset.beats || "0,1").split(",").map(Number),
    top: 0, h: 0, items: [], intro: el.id === "intro"
  }));
  const introScene = scenes.find(s => s.intro);

  function parseWin(str) {
    const [a, b] = (str || "0,1").split("|");
    const pa = a.split(",").map(Number);
    const pb = b ? b.split(",").map(Number) : null;
    return { a: pa[0], b: pa[1], c: pb ? pb[0] : null, d: pb ? pb[1] : null };
  }
  scenes.forEach(s => {
    if (s.intro) return;
    s.items = $$("[data-anim]", s.el).map(el => ({ el, type: el.dataset.anim, w: parseWin(el.dataset.win), st: null, key: "" }));
  });

  function measure() {
    VH = innerHeight; VW = innerWidth;
    U = Math.min(1.5, Math.max(0.66, Math.min(VW / 1360, VH / 860)));
    scenes.forEach(s => {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + scrollY; s.h = s.el.offsetHeight;
    });
    placeNodes();
  }

  /* ------------------------------------------------------------ 平滑滚动 */
  let vy = scrollY, target = scrollY, last = 0, raf = 0;
  const SETTLE = 9, MAX_RATE = 2; // 每秒最多 2 屏
  function tick(now) {
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    target = scrollY;
    const diff = target - vy;
    if (reduce.matches || Math.abs(diff) < 0.5) vy = target;
    else if (Math.abs(diff) > 2 * VH) vy = target - Math.sign(diff) * 0.6 * VH;
    else {
      let step = diff * (1 - Math.exp(-SETTLE * dt));
      const cap = MAX_RATE * VH * dt;
      if (step > cap) step = cap; else if (step < -cap) step = -cap;
      vy += step;
    }
    render();
    if (vy !== target) raf = requestAnimationFrame(tick); else last = 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  /* ---------------------------------------------------------- 01 · 镜头 */
  const heroBadge = $(".hero__badge"), heroSub = $(".hero__subtitle");
  let introP = -1, moving = false, isOpen = false;
  function renderIntro(s) {
    const range = Math.max(1, s.h - VH);
    const p = clamp01((vy - s.top) / range);
    if (p === introP) return;
    introP = p;
    const st = root.style;
    const q = clamp01(p / 0.86);
    st.setProperty("--cam-x", lerp(-47.957, -50, q).toFixed(3) + "%");
    st.setProperty("--cam-y", lerp(-80.097, -36.716, q).toFixed(3) + "%");
    st.setProperty("--cam-z", reduce.matches ? "1" : (1 + 0.11 * Math.sin(Math.PI * q)).toFixed(4));

    const exit = win(p, 0.297, 0.508);
    st.setProperty("--hero-out", Math.pow(exit, 1.75).toFixed(4));
    st.setProperty("--hero-o", Math.pow(1 - clamp01((exit - 0.38) / 0.62), 1.25).toFixed(4));
    st.setProperty("--hero-filter", exit > 0 ? `blur(calc(${(Math.pow(exit, 0.9) * 18).toFixed(3)} * var(--u-hero)))` : "none");
    st.setProperty("--hero-vis", exit >= 1 ? "hidden" : "visible");
    if (exit > 0) st.setProperty("--badge-backdrop", "none"); else st.removeProperty("--badge-backdrop");

    st.setProperty("--glow-o", (1 - ease.inOutCubic(win(p, 0.55, 0.95))).toFixed(4));
    st.setProperty("--plat-o", ease.outCubic(win(p, 0.557, 0.623)).toFixed(4));
    st.setProperty("--plat-text-p", ease.outQuart(win(p, 0.563, 0.967)).toFixed(4));
    st.setProperty("--plat-shot-p", ease.outCubic(win(p, 0.557, 0.984)).toFixed(4));
    st.setProperty("--plat-vis", p > 0.54 ? "visible" : "hidden");

    const m = p > 0.001 && p < 0.999;
    if (m !== moving) { moving = m; root.classList.toggle("is-moving", m); }
    if (!isOpen && p > 0.05) open(true);
  }

  function open(instant) {
    if (isOpen) return;
    isOpen = true;
    if (instant) root.classList.add("is-instant");
    root.classList.add("is-ready", "is-open");
  }
  function boot() {
    const go = () => {
      if (reduce.matches || introP > 0.02 || scrollY > VH * 0.3) { open(true); return; }
      root.classList.add("is-ready");
      let done = false;
      const fin = () => { if (!done) { done = true; open(false); } };
      heroSub && heroSub.addEventListener("animationend", fin, { once: true });
      setTimeout(fin, 1800);
    };
    let started = false;
    const start = () => { if (!started) { started = true; go(); } };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
    setTimeout(start, 1200);
  }

  /* ------------------------------------------------------ 后续章节动效 */
  function riseState(k, dist) {
    const e = ease.outCubic(k);
    return { y: (1 - e) * dist * U, o: ease.outQuart(k), b: (1 - k) * 8, s: 1 };
  }
  function exitApply(st, k) {
    if (k <= 0) return st;
    st.y += -163 * U * Math.pow(k, 1.75);
    st.b += Math.pow(k, 0.9) * 14;
    st.o *= Math.pow(1 - clamp01((k - 0.38) / 0.62), 1.25);
    return st;
  }
  function applyBox(it, st) {
    const el = it.el;
    const rest = st.y === 0 && st.o === 1 && st.b <= 0.01 && st.s === 1;
    const key = rest ? "rest" : `${st.y.toFixed(1)}|${st.o.toFixed(3)}|${st.b.toFixed(2)}|${st.s.toFixed(4)}`;
    if (key === it.key) return;
    it.key = key;
    if (rest) {
      el.style.transform = ""; el.style.opacity = ""; el.style.filter = ""; el.style.visibility = "";
      return;
    }
    el.style.transform = `translate3d(0, ${st.y.toFixed(1)}px, 0)` + (st.s !== 1 ? ` scale(${st.s.toFixed(4)})` : "");
    el.style.opacity = st.o.toFixed(3);
    el.style.filter = st.b > 0.05 ? `blur(${st.b.toFixed(2)}px)` : "";
    el.style.visibility = st.o <= 0.001 ? "hidden" : "";
  }
  function lines(it, k) {
    const ins = it.lines || (it.lines = $$(".line__in", it.el));
    const n = ins.length, gap = 0.16, span = 1 - gap * (n - 1);
    ins.forEach((l, i) => {
      const ki = clamp01((k - i * gap) / span);
      const e = ease.outQuart(ki);
      const v = ki >= 1 ? "" : `translate3d(0, ${((1 - e) * 100).toFixed(2)}%, 0)`;
      if (l._v !== v) { l._v = v; l.style.transform = v; l.style.opacity = ki >= 1 ? "" : Math.min(1, ki * 4).toFixed(3); }
    });
  }
  function frac(k, i, n, overlap) { // 在 0..1 中为第 i 个子元素切出一段
    const span = 1 / (n - (n - 1) * overlap);
    const start = i * span * (1 - overlap);
    return clamp01((k - start) / span);
  }

  function renderScene(s) {
    const range = Math.max(1, s.h - VH);
    const p = (vy - s.top) / range;
    const e = clamp01((vy - (s.top - VH)) / VH);
    if (s.lastP === p) return;
    s.lastP = p;
    s.el.style.setProperty("--e", e.toFixed(4));
    s.el.style.setProperty("--p", Math.max(-1, Math.min(2, p)).toFixed(4));
    if (compact.matches) { if (!s.flat) flatten(s); return; }
    if (s.flat) s.flat = false;

    let dim = 0; // 结论出现时，其余内容退场
    const boxes = [];
    for (const it of s.items) {
      const w = it.w;
      const kin = win(p, w.a, w.b);
      const kout = w.c != null ? win(p, w.c, w.d) : 0;
      it.k = kin; it.kout = kout;
      switch (it.type) {
        case "lead": case "card": case "fade": case "step":
          boxes.push([it, exitApply(riseState(kin, it.type === "fade" ? 24 : 48), kout)]); break;
        case "stair":
          boxes.push([it, riseState(kin, 90)]); break;
        case "exit": {
          const st = { y: 0, o: 1, b: 0, s: 1 };
          boxes.push([it, exitApply(st, kin)]); break;
        }
        case "limits":
          boxes.push([it, exitApply(riseState(kin, 48), kout)]); break;
        case "demo": {
          const ek = ease.outCubic(kin);
          boxes.push([it, { y: (1 - ek) * 0.42 * VH, o: Math.min(1, kin * 2.6), b: 0, s: 0.62 + 0.38 * ek }]);
          break;
        }
        case "verdict": case "finale": {
          if (s.id === "findings") dim = Math.max(dim, ease.inOutCubic(kin));
          lines(it, kin);
          const st = { y: 0, o: kin > 0 ? 1 : 0, b: 0, s: 1 };
          boxes.push([it, exitApply(st, kout)]);
          if (it.type === "finale") { const a = $(".finale__acts", it.el); if (a) { a.style.opacity = ease.outCubic(win(kin, .7, 1)).toFixed(3); a.style.pointerEvents = kin > .7 ? "" : "none"; } }
          break;
        }
        case "asks": {
          lines(it, win(kin, 0.1, 0.9));
          const k1 = $(".asks__k", it.el), k2 = $(".asks__so", it.el);
          if (k1) k1.style.opacity = ease.outCubic(win(kin, 0, 0.25)).toFixed(3);
          if (k2) k2.style.opacity = ease.outCubic(win(kin, 0.82, 1)).toFixed(3);
          boxes.push([it, exitApply({ y: 0, o: kin > 0 ? 1 : 0, b: 0, s: 1 }, kout)]);
          break;
        }
        case "stack": stack(it, kin); break;
        case "ring": ring(it, kin); break;
        case "line": {
          const v = ease.inOutCubic(kin).toFixed(4);
          if (it.key !== v) { it.key = v; it.el.style.setProperty("--line-k", v); }
          break;
        }
      }
    }
    if (dim > 0) {
      for (const [it, st] of boxes) {
        if (it.type === "lead" || it.type === "card") {
          st.y -= 50 * U * Math.pow(dim, 1.5);
          st.o *= 1 - dim;
          st.b += dim * 10;
          st.s *= 1 - 0.03 * dim;
        }
      }
    }
    for (const [it, st] of boxes) applyBox(it, st);

    // 统计数字滚动
    if (s.id === "iter") counters(s, win(p, -0.25, 0));
  }

  function stack(it, k) {
    const layers = it.layers || (it.layers = $$(".layer", it.el));
    const n = layers.length;
    layers.forEach((l, i) => {
      const ki = frac(k, i, n, 0.55);
      const e = ease.outCubic(ki);
      const key = ki.toFixed(4);
      if (l._k === key) return; l._k = key;
      if (ki >= 1) { l.style.transform = ""; l.style.opacity = ""; l.style.filter = ""; }
      else {
        l.style.transform = `translate3d(0, ${((1 - e) * (70 + i * 26) * U).toFixed(1)}px, 0) rotateX(${((1 - e) * 38).toFixed(2)}deg) scale(${(0.93 + 0.07 * e).toFixed(4)})`;
        l.style.opacity = ease.outQuart(ki).toFixed(3);
        l.style.filter = ki < 1 ? `blur(${((1 - ki) * 6).toFixed(2)}px)` : "";
      }
      l.style.setProperty("--link-o", clamp01((k - 0.85) / 0.15).toFixed(3));
    });
  }

  function ring(it, k) {
    const el = it.el;
    const rk = k;
    el.style.setProperty("--ring-k", rk.toFixed(4));
    const nodes = it.nodes || (it.nodes = $$(".node", el));
    nodes.forEach((nd, i) => {
      const ki = clamp01((rk * nodes.length - i) / 0.8);
      const key = ki.toFixed(3);
      if (nd._k === key) return; nd._k = key;
      const e = ease.outCubic(ki);
      nd.style.opacity = ki >= 1 ? "" : e.toFixed(3);
      const c = nd.firstElementChild;
      c.style.filter = ki >= 1 ? "" : `blur(${((1 - ki) * 8).toFixed(2)}px)`;
      c.style.scale = ki >= 1 ? "" : (0.9 + 0.1 * e).toFixed(4);
      nd.style.visibility = ki <= 0 ? "hidden" : "";
    });
  }

  function placeNodes() {
    $$(".ring .node").forEach(nd => {
      const a = parseFloat(nd.style.getPropertyValue("--a")) * Math.PI / 180;
      const cx = Math.cos(a), sy = Math.sin(a);
      nd.style.setProperty("--x", (50 + cx * 37).toFixed(3) + "%");
      nd.style.setProperty("--y", (50 + sy * 37).toFixed(3) + "%");
      const c = nd.firstElementChild;
      const right = cx >= -0.01;
      c.style.transform = compact.matches ? "" : `translate(${right ? "18px" : "calc(-100% - 18px)"}, -50%)`;
    });
  }

  function flatten(s) { // 窄屏：章节不再固定，内容直接可见
    s.flat = true;
    s.items.forEach(it => {
      it.key = "";
      it.el.style.transform = it.el.style.opacity = it.el.style.filter = it.el.style.visibility = "";
      $$(".line__in, .layer, .node, .node__c, .asks__k, .asks__so, .finale__acts", it.el).forEach(x => {
        x.style.transform = x.style.opacity = x.style.filter = x.style.visibility = x.style.scale = ""; x._v = x._k = undefined;
      });
      it.el.style.setProperty("--ring-k", 1); it.el.style.setProperty("--line-k", 1);
    });
    if (s.id === "iter") counters(s, 1);
  }

  let countersDone = -1;
  function counters(s, k) {
    const e = ease.outExpo(k);
    const key = e.toFixed(3);
    if (key === countersDone) return; countersDone = key;
    $$("[data-count]", s.el).forEach(b => { b.textContent = Math.round(Number(b.dataset.count) * e); });
    $$("[data-count-issues]", s.el).forEach(b => { b.textContent = Math.round(closedCount * e); });
  }

  /* ------------------------------------------------------------ 页头 */
  const header = $("#site-header");
  const navLinks = $$(".nav__link");
  let lastLight = null, lastChap = null;
  function renderHeader() {
    const probe = vy + 44, mid = vy + VH * 0.5;
    let theme = "dark", chap = null;
    for (const s of scenes) {
      if (probe >= s.top && probe < s.top + s.h) theme = s.theme;
      if (mid >= s.top && mid < s.top + s.h) chap = s.chapter;
    }
    const light = theme === "light";
    if (light !== lastLight) { lastLight = light; header.classList.toggle("on-light", light); document.body.classList.toggle("on-light", light); }
    if (chap !== lastChap) { lastChap = chap; navLinks.forEach(a => a.classList.toggle("is-active", a.dataset.chapter === chap)); }
  }

  function render() {
    for (const s of scenes) {
      if (vy < s.top - VH * 1.05 || vy > s.top + s.h + 2) {
        if (!s.intro && s.lastP !== undefined && !s.parked) { /* 远离视口：保持最后状态 */ }
        continue;
      }
      if (s.intro) renderIntro(s); else renderScene(s);
    }
    if (introScene && vy > introScene.top + introScene.h && !isOpen) open(true);
    renderHeader();
    lazyFrame();
  }

  /* ---------------------------------------------------------- 菜单 */
  const toggle = $(".menu-toggle"), menu = $("#mobile-menu");
  function setMenu(openIt) {
    toggle.setAttribute("aria-expanded", openIt ? "true" : "false");
    menu.hidden = !openIt;
  }
  toggle.addEventListener("click", e => { e.stopPropagation(); setMenu(menu.hidden); });
  $$("a", menu).forEach(a => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("click", e => { if (!menu.hidden && !menu.contains(e.target) && e.target !== toggle) setMenu(false); });

  /* ---------------------------------------------------------- 键盘逐拍 */
  const hint = $(".hint-keys");
  function beatPositions() {
    const out = [];
    scenes.forEach(s => s.beats.forEach(b => out.push(Math.round(s.top + b * Math.max(0, s.h - VH)))));
    return out.sort((a, b) => a - b).filter((v, i, a) => i === 0 || v - a[i - 1] > 4);
  }
  function stepBeat(dir) {
    const pos = beatPositions(), y = scrollY;
    let t;
    if (dir > 0) t = pos.find(v => v > y + 6);
    else t = [...pos].reverse().find(v => v < y - 6);
    if (t == null) t = dir > 0 ? document.documentElement.scrollHeight : 0;
    scrollTo({ top: t, behavior: reduce.matches ? "auto" : "smooth" });
    if (hint && !hint.classList.contains("is-gone")) hint.classList.add("is-gone");
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { setMenu(false); closeDrawer(); hideBackup(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const a = document.activeElement;
    if (a && (a.tagName === "IFRAME" || a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || a.isContentEditable)) return;
    if (!$("#issues").hidden) return;
    const k = e.key;
    if (k === "ArrowDown" || k === "PageDown" || k === "ArrowRight" || (k === " " && !e.shiftKey)) { e.preventDefault(); stepBeat(1); }
    else if (k === "ArrowUp" || k === "PageUp" || k === "ArrowLeft" || (k === " " && e.shiftKey)) { e.preventDefault(); stepBeat(-1); }
    else if (k === "Home") { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); }
  });

  // 章节内锚点：落在该章第一拍
  $$('a[href^="#"], [data-goto]').forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("data-goto") || a.getAttribute("href");
    if (!id || id === "#") return;
    const t = id === "#top" ? { top: 0 } : scenes.find(s => "#" + s.id === id);
    if (!t) return;
    e.preventDefault();
    const y = t.top || 0;
    const far = Math.abs(y - scrollY) > VH * 6;
    scrollTo({ top: y, behavior: reduce.matches || far ? "auto" : "smooth" });
  }));

  /* ---------------------------------------------------------- 小字段 */
  function fillMeta() {
    let host = "apx240 · github.io";
    try {
      if (/^https?:$/.test(location.protocol)) {
        const u = new URL("../", location.href);
        host = (u.host + u.pathname).replace(/\/$/, "");
      }
    } catch (_) {}
    $$("[data-url]").forEach(el => el.textContent = host);
    const d0 = Date.UTC(2026, 5, 19), now = new Date();
    const days = Math.max(0, Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - d0) / 864e5));
    $$("[data-days]").forEach(el => el.textContent = days);
  }

  /* ---------------------------------------------------------- 提示 */
  const toastEl = $("#toast");
  let toastT = 0;
  function toast(msg, ms = 2600) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.hidden = true, ms);
  }

  /* ---------------------------------------------------------- 问题清单 */
  const drawer = $("#issues");
  let drawerFrom = null;
  function openDrawer() {
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    $("#issues-body").innerHTML = ISSUES.map(g =>
      `<section class="ig"><h4>${esc(g.g)} · ${g.items.length}</h4>` +
      g.items.map(([id, t, fix, st]) => `<div class="ii"><i>${id}</i><div>${esc(t)}<small>${esc(fix)}</small></div><em class="${ST[st][1]}">${ST[st][0]}</em></div>`).join("") +
      `</section>`).join("");
    const sim = allIssues.filter(i => i[3] === "sim").length, open = allIssues.length - closedCount;
    $("#issues-sum").textContent = `共 ${allIssues.length} 项 · 已闭环 ${closedCount} 项（其中 ${sim} 项为本地模拟验证）· 仍偶发 ${open} 项`;
    drawerFrom = document.activeElement;
    drawer.hidden = false;
    $("#issues-close").focus();
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.hidden = true;
    if (drawerFrom && drawerFrom.focus) drawerFrom.focus();
  }
  $("#issues-open").addEventListener("click", openDrawer);
  $("#issues-close").addEventListener("click", closeDrawer);
  drawer.addEventListener("click", e => { if (e.target === drawer) closeDrawer(); });

  /* ---------------------------------------------------------- 演示区 */
  const frame = $("#app-frame");
  const demoScene = scenes.find(s => s.id === "demo");
  const acts = $("#demo-acts"), cap = $("#demo-cap");
  const backup = $("#backup"), backupBody = $("#backup-body"), backupT = $("#backup-t");
  let cur = 0, stepDone = [0, 0, 0];

  function lazyFrame() {
    if (frame.src || !demoScene) return;
    if (vy > demoScene.top - VH * 2.5) frame.src = frame.dataset.src;
  }

  function appDoc() {
    try {
      const d = frame.contentDocument;
      if (d && d.getElementById("q") && d.getElementById("sendBtn")) return d;
    } catch (_) {}
    return null;
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const isBusy = d => { const b = d.getElementById("stopBtn"); return !!b && !b.hidden; };

  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (_) { return false; }
  }

  async function runStep(ci, si) {
    const c = CASES[ci], step = c.steps[si];
    hideBackup();
    if (!frame.src) frame.src = frame.dataset.src;
    const d = appDoc();
    if (!d) {
      const ok = await copyText(step.text);
      toast(ok ? "工作台未就绪，输入已复制，可直接粘贴发送" : "工作台未就绪：" + step.text, 3600);
      return;
    }
    const w = frame.contentWindow;
    if (isBusy(d)) { toast("Agent 正在回答，等这一段输出完再发"); return; }
    if (si === 0) { d.getElementById("newChat").click(); await sleep(260); }

    if (step.img) {
      try {
        const blob = await (await fetch(step.img)).blob();
        const name = step.img.split("/").pop();
        const file = new w.File([blob], name, { type: blob.type || "image/png" });
        const dt = new w.DataTransfer();
        dt.items.add(file);
        const input = d.getElementById("file");
        input.files = dt.files;
        input.dispatchEvent(new w.Event("change", { bubbles: true }));
        const pend = d.getElementById("pending");
        for (let i = 0; i < 40 && pend.hidden; i++) await sleep(150);
        if (pend.hidden) { toast("图片没有加载成功，请在工作台里手动上传"); return; }
      } catch (_) { toast("图片没有加载成功，请在工作台里手动上传"); return; }
    }
    const q = d.getElementById("q");
    q.value = step.text;
    q.dispatchEvent(new w.Event("input", { bubbles: true }));
    d.getElementById("sendBtn").click();
    stepDone[ci] = Math.max(stepDone[ci], si + 1);
    // 把焦点还给演示页，方向键继续可用
    try { q.blur(); frame.blur(); window.focus(); } catch (_) {}
    renderActs();
  }

  function showBackup() {
    const c = CASES[cur];
    backupT.textContent = c.backupT;
    backupBody.innerHTML = "";
    const img = new Image();
    img.alt = c.backupT;
    img.onerror = () => { backupBody.innerHTML = `<p>这一场景还没有备用截图。<br>彩排时在工作台跑通后截图，保存为 <code>${c.backup}</code> 即可。</p>`; };
    img.src = c.backup;
    backupBody.appendChild(img);
    backup.hidden = false;
  }
  function hideBackup() { backup.hidden = true; }
  $("#backup-close").addEventListener("click", hideBackup);

  const ICON_PLAY = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.8v8.4L10 6z"/></svg>';
  function renderActs() {
    const c = CASES[cur];
    acts.innerHTML = "";
    c.steps.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "dbtn dbtn--run";
      if (stepDone[cur] > i) b.dataset.done = "1";
      b.innerHTML = ICON_PLAY + (c.steps.length > 1 ? `${i + 1} · ` : "") + s.label;
      b.addEventListener("click", () => runStep(cur, i));
      acts.appendChild(b);
    });
    const n = document.createElement("button");
    n.type = "button"; n.className = "dbtn dbtn--ghost"; n.textContent = "新建排查";
    n.addEventListener("click", () => { const d = appDoc(); hideBackup(); if (d) { d.getElementById("newChat").click(); stepDone[cur] = 0; renderActs(); } });
    const bk = document.createElement("button");
    bk.type = "button"; bk.className = "dbtn dbtn--ghost"; bk.textContent = "备用截图";
    bk.addEventListener("click", () => backup.hidden ? showBackup() : hideBackup());
    acts.append(n, bk);

    const esc = t => t.replace(/[&<>]/g, x => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[x]));
    const inputs = c.steps.map(s => `<code>${esc(s.text)}</code>` + (s.img ? " ＋ 面板照片" : "")).join(" → ");
    cap.innerHTML = `<span><b>输入</b>${inputs}</span><span><b>请看</b>${esc(c.look)}</span>` +
      `<button type="button" class="next-inline" data-goto="#arch">下一章<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1v10M2 7l4 4 4-4"/></svg></button>`;
    $(".next-inline", cap).addEventListener("click", () => { const s = scenes.find(x => x.id === "arch"); scrollTo({ top: s.top, behavior: "smooth" }); });
  }
  $$(".demo-tab").forEach(t => t.addEventListener("click", () => {
    cur = Number(t.dataset.case);
    $$(".demo-tab").forEach(x => x.setAttribute("aria-selected", x === t ? "true" : "false"));
    hideBackup();
    renderActs();
  }));

  /* ---------------------------------------------------------- 启动 */
  fillMeta();
  renderActs();
  measure();
  vy = target = scrollY;
  render();
  boot();

  addEventListener("scroll", kick, { passive: true });
  let rt = 0;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      measure();
      scenes.forEach(s => { s.lastP = undefined; s.items.forEach(i => i.key = ""); });
      introP = -1;
      if (innerWidth > 900) setMenu(false);
      render();
    }, 80);
  });
  compact.addEventListener && compact.addEventListener("change", () => { measure(); scenes.forEach(s => s.lastP = undefined); render(); });
  addEventListener("load", () => { measure(); scenes.forEach(s => s.lastP = undefined); render(); });
})();
