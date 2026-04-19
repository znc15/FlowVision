"use client";
import { jsx as ie } from "react/jsx-runtime";
import { useState as re, useCallback as ne, useId as pt, useLayoutEffect as Be, useEffect as de, useRef as T, createContext as ht, useImperativeHandle as We, useMemo as Ue, useSyncExternalStore as Ke, useContext as mt } from "react";
function gt(e, t) {
  const n = getComputedStyle(e), o = parseFloat(n.fontSize);
  return t * o;
}
function St(e, t) {
  const n = getComputedStyle(e.ownerDocument.body), o = parseFloat(n.fontSize);
  return t * o;
}
function yt(e) {
  return e / 100 * window.innerHeight;
}
function vt(e) {
  return e / 100 * window.innerWidth;
}
function zt(e) {
  switch (typeof e) {
    case "number":
      return [e, "px"];
    case "string": {
      const t = parseFloat(e);
      return e.endsWith("%") ? [t, "%"] : e.endsWith("px") ? [t, "px"] : e.endsWith("rem") ? [t, "rem"] : e.endsWith("em") ? [t, "em"] : e.endsWith("vh") ? [t, "vh"] : e.endsWith("vw") ? [t, "vw"] : [t, "%"];
    }
  }
}
function te({
  groupSize: e,
  panelElement: t,
  styleProp: n
}) {
  let o;
  const [i, s] = zt(n);
  switch (s) {
    case "%": {
      o = i / 100 * e;
      break;
    }
    case "px": {
      o = i;
      break;
    }
    case "rem": {
      o = St(t, i);
      break;
    }
    case "em": {
      o = gt(t, i);
      break;
    }
    case "vh": {
      o = yt(i);
      break;
    }
    case "vw": {
      o = vt(i);
      break;
    }
  }
  return o;
}
function D(e) {
  return parseFloat(e.toFixed(3));
}
function Q({
  group: e
}) {
  const { orientation: t, panels: n } = e;
  return n.reduce((o, i) => (o += t === "horizontal" ? i.element.offsetWidth : i.element.offsetHeight, o), 0);
}
function ge(e) {
  const { panels: t } = e, n = Q({ group: e });
  return n === 0 ? t.map((o) => ({
    groupResizeBehavior: o.panelConstraints.groupResizeBehavior,
    collapsedSize: 0,
    collapsible: o.panelConstraints.collapsible === !0,
    defaultSize: void 0,
    disabled: o.panelConstraints.disabled,
    minSize: 0,
    maxSize: 100,
    panelId: o.id
  })) : t.map((o) => {
    const { element: i, panelConstraints: s } = o;
    let l = 0;
    if (s.collapsedSize !== void 0) {
      const c = te({
        groupSize: n,
        panelElement: i,
        styleProp: s.collapsedSize
      });
      l = D(c / n * 100);
    }
    let r;
    if (s.defaultSize !== void 0) {
      const c = te({
        groupSize: n,
        panelElement: i,
        styleProp: s.defaultSize
      });
      r = D(c / n * 100);
    }
    let a = 0;
    if (s.minSize !== void 0) {
      const c = te({
        groupSize: n,
        panelElement: i,
        styleProp: s.minSize
      });
      a = D(c / n * 100);
    }
    let u = 100;
    if (s.maxSize !== void 0) {
      const c = te({
        groupSize: n,
        panelElement: i,
        styleProp: s.maxSize
      });
      u = D(c / n * 100);
    }
    return {
      groupResizeBehavior: s.groupResizeBehavior,
      collapsedSize: l,
      collapsible: s.collapsible === !0,
      defaultSize: r,
      disabled: s.disabled,
      minSize: a,
      maxSize: u,
      panelId: o.id
    };
  });
}
function L(e, t = "Assertion error") {
  if (!e)
    throw Error(t);
}
function Se(e, t) {
  return Array.from(t).sort(
    e === "horizontal" ? xt : bt
  );
}
function xt(e, t) {
  const n = e.element.offsetLeft - t.element.offsetLeft;
  return n !== 0 ? n : e.element.offsetWidth - t.element.offsetWidth;
}
function bt(e, t) {
  const n = e.element.offsetTop - t.element.offsetTop;
  return n !== 0 ? n : e.element.offsetHeight - t.element.offsetHeight;
}
function Xe(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.ELEMENT_NODE;
}
function qe(e, t) {
  return {
    x: e.x >= t.left && e.x <= t.right ? 0 : Math.min(
      Math.abs(e.x - t.left),
      Math.abs(e.x - t.right)
    ),
    y: e.y >= t.top && e.y <= t.bottom ? 0 : Math.min(
      Math.abs(e.y - t.top),
      Math.abs(e.y - t.bottom)
    )
  };
}
function wt({
  orientation: e,
  rects: t,
  targetRect: n
}) {
  const o = {
    x: n.x + n.width / 2,
    y: n.y + n.height / 2
  };
  let i, s = Number.MAX_VALUE;
  for (const l of t) {
    const { x: r, y: a } = qe(o, l), u = e === "horizontal" ? r : a;
    u < s && (s = u, i = l);
  }
  return L(i, "No rect found"), i;
}
let ue;
function Pt() {
  return ue === void 0 && (typeof matchMedia == "function" ? ue = !!matchMedia("(pointer:coarse)").matches : ue = !1), ue;
}
function Ye(e) {
  const { element: t, orientation: n, panels: o, separators: i } = e, s = Se(
    n,
    Array.from(t.children).filter(Xe).map((b) => ({ element: b }))
  ).map(({ element: b }) => b), l = [];
  let r = !1, a = !1, u = -1, c = -1, m = 0, d, v = [];
  {
    let b = -1;
    for (const f of s)
      f.hasAttribute("data-panel") && (b++, f.hasAttribute("data-disabled") || (m++, u === -1 && (u = b), c = b));
  }
  if (m > 1) {
    let b = -1;
    for (const f of s)
      if (f.hasAttribute("data-panel")) {
        b++;
        const h = o.find(
          (g) => g.element === f
        );
        if (h) {
          if (d) {
            const g = d.element.getBoundingClientRect(), y = f.getBoundingClientRect();
            let z;
            if (a) {
              const S = n === "horizontal" ? new DOMRect(
                g.right,
                g.top,
                0,
                g.height
              ) : new DOMRect(
                g.left,
                g.bottom,
                g.width,
                0
              ), p = n === "horizontal" ? new DOMRect(y.left, y.top, 0, y.height) : new DOMRect(y.left, y.top, y.width, 0);
              switch (v.length) {
                case 0: {
                  z = [
                    S,
                    p
                  ];
                  break;
                }
                case 1: {
                  const P = v[0], M = wt({
                    orientation: n,
                    rects: [g, y],
                    targetRect: P.element.getBoundingClientRect()
                  });
                  z = [
                    P,
                    M === g ? p : S
                  ];
                  break;
                }
                default: {
                  z = v;
                  break;
                }
              }
            } else
              v.length ? z = v : z = [
                n === "horizontal" ? new DOMRect(
                  g.right,
                  y.top,
                  y.left - g.right,
                  y.height
                ) : new DOMRect(
                  y.left,
                  g.bottom,
                  y.width,
                  y.top - g.bottom
                )
              ];
            for (const S of z) {
              let p = "width" in S ? S : S.element.getBoundingClientRect();
              const P = Pt() ? e.resizeTargetMinimumSize.coarse : e.resizeTargetMinimumSize.fine;
              if (p.width < P) {
                const C = P - p.width;
                p = new DOMRect(
                  p.x - C / 2,
                  p.y,
                  p.width + C,
                  p.height
                );
              }
              if (p.height < P) {
                const C = P - p.height;
                p = new DOMRect(
                  p.x,
                  p.y - C / 2,
                  p.width,
                  p.height + C
                );
              }
              const M = b <= u || b > c;
              !r && !M && l.push({
                group: e,
                groupSize: Q({ group: e }),
                panels: [d, h],
                separator: "width" in S ? void 0 : S,
                rect: p
              }), r = !1;
            }
          }
          a = !1, d = h, v = [];
        }
      } else if (f.hasAttribute("data-separator")) {
        f.ariaDisabled !== null && (r = !0);
        const h = i.find(
          (g) => g.element === f
        );
        h ? v.push(h) : (d = void 0, v = []);
      } else
        a = !0;
  }
  return l;
}
class Je {
  #e = {};
  addListener(t, n) {
    const o = this.#e[t];
    return o === void 0 ? this.#e[t] = [n] : o.includes(n) || o.push(n), () => {
      this.removeListener(t, n);
    };
  }
  emit(t, n) {
    const o = this.#e[t];
    if (o !== void 0)
      if (o.length === 1)
        o[0].call(null, n);
      else {
        let i = !1, s = null;
        const l = Array.from(o);
        for (let r = 0; r < l.length; r++) {
          const a = l[r];
          try {
            a.call(null, n);
          } catch (u) {
            s === null && (i = !0, s = u);
          }
        }
        if (i)
          throw s;
      }
  }
  removeAllListeners() {
    this.#e = {};
  }
  removeListener(t, n) {
    const o = this.#e[t];
    if (o !== void 0) {
      const i = o.indexOf(n);
      i >= 0 && o.splice(i, 1);
    }
  }
}
let A = /* @__PURE__ */ new Map();
const Ze = new Je();
function Lt(e) {
  A = new Map(A), A.delete(e);
}
function Me(e, t) {
  for (const [n] of A)
    if (n.id === e)
      return n;
}
function $(e, t) {
  for (const [n, o] of A)
    if (n.id === e)
      return o;
  if (t)
    throw Error(`Could not find data for Group with id ${e}`);
}
function U() {
  return A;
}
function ye(e, t) {
  return Ze.addListener("groupChange", (n) => {
    n.group.id === e && t(n);
  });
}
function _(e, t) {
  const n = A.get(e);
  A = new Map(A), A.set(e, t), Ze.emit("groupChange", {
    group: e,
    prev: n,
    next: t
  });
}
function Ct(e, t, n) {
  let o, i = {
    x: 1 / 0,
    y: 1 / 0
  };
  for (const s of t) {
    const l = qe(n, s.rect);
    switch (e) {
      case "horizontal": {
        l.x <= i.x && (o = s, i = l);
        break;
      }
      case "vertical": {
        l.y <= i.y && (o = s, i = l);
        break;
      }
    }
  }
  return o ? {
    distance: i,
    hitRegion: o
  } : void 0;
}
function Rt(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
function Mt(e, t) {
  if (e === t) throw new Error("Cannot compare node with itself");
  const n = {
    a: ke(e),
    b: ke(t)
  };
  let o;
  for (; n.a.at(-1) === n.b.at(-1); )
    o = n.a.pop(), n.b.pop();
  L(
    o,
    "Stacking order can only be calculated for elements with a common ancestor"
  );
  const i = {
    a: Ie(Ee(n.a)),
    b: Ie(Ee(n.b))
  };
  if (i.a === i.b) {
    const s = o.childNodes, l = {
      a: n.a.at(-1),
      b: n.b.at(-1)
    };
    let r = s.length;
    for (; r--; ) {
      const a = s[r];
      if (a === l.a) return 1;
      if (a === l.b) return -1;
    }
  }
  return Math.sign(i.a - i.b);
}
const Et = /\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/;
function It(e) {
  const t = getComputedStyle(Qe(e) ?? e).display;
  return t === "flex" || t === "inline-flex";
}
function kt(e) {
  const t = getComputedStyle(e);
  return !!(t.position === "fixed" || t.zIndex !== "auto" && (t.position !== "static" || It(e)) || +t.opacity < 1 || "transform" in t && t.transform !== "none" || "webkitTransform" in t && t.webkitTransform !== "none" || "mixBlendMode" in t && t.mixBlendMode !== "normal" || "filter" in t && t.filter !== "none" || "webkitFilter" in t && t.webkitFilter !== "none" || "isolation" in t && t.isolation === "isolate" || Et.test(t.willChange) || t.webkitOverflowScrolling === "touch");
}
function Ee(e) {
  let t = e.length;
  for (; t--; ) {
    const n = e[t];
    if (L(n, "Missing node"), kt(n)) return n;
  }
  return null;
}
function Ie(e) {
  return e && Number(getComputedStyle(e).zIndex) || 0;
}
function ke(e) {
  const t = [];
  for (; e; )
    t.push(e), e = Qe(e);
  return t;
}
function Qe(e) {
  const { parentNode: t } = e;
  return Rt(t) ? t.host : t;
}
function Dt(e, t) {
  return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function Tt({
  groupElement: e,
  hitRegion: t,
  pointerEventTarget: n
}) {
  if (!Xe(n) || n.contains(e) || e.contains(n))
    return !0;
  if (Mt(n, e) > 0) {
    let o = n;
    for (; o; ) {
      if (o.contains(e))
        return !0;
      if (Dt(o.getBoundingClientRect(), t))
        return !1;
      o = o.parentElement;
    }
  }
  return !0;
}
function ve(e, t) {
  const n = [];
  return t.forEach((o, i) => {
    if (i.disabled)
      return;
    const s = Ye(i), l = Ct(i.orientation, s, {
      x: e.clientX,
      y: e.clientY
    });
    l && l.distance.x <= 0 && l.distance.y <= 0 && Tt({
      groupElement: i.element,
      hitRegion: l.hitRegion.rect,
      pointerEventTarget: e.target
    }) && n.push(l.hitRegion);
  }), n;
}
function Ot(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] != t[n])
      return !1;
  return !0;
}
function k(e, t, n = 0) {
  return Math.abs(D(e) - D(t)) <= n;
}
function G(e, t) {
  return k(e, t) ? 0 : e > t ? 1 : -1;
}
function Y({
  overrideDisabledPanels: e,
  panelConstraints: t,
  prevSize: n,
  size: o
}) {
  const {
    collapsedSize: i = 0,
    collapsible: s,
    disabled: l,
    maxSize: r = 100,
    minSize: a = 0
  } = t;
  if (l && !e)
    return n;
  if (G(o, a) < 0)
    if (s) {
      const u = (i + a) / 2;
      G(o, u) < 0 ? o = i : o = a;
    } else
      o = a;
  return o = Math.min(r, o), o = D(o), o;
}
function se({
  delta: e,
  initialLayout: t,
  panelConstraints: n,
  pivotIndices: o,
  prevLayout: i,
  trigger: s
}) {
  if (k(e, 0))
    return t;
  const l = s === "imperative-api", r = Object.values(t), a = Object.values(i), u = [...r], [c, m] = o;
  L(c != null, "Invalid first pivot index"), L(m != null, "Invalid second pivot index");
  let d = 0;
  switch (s) {
    case "keyboard": {
      {
        const f = e < 0 ? m : c, h = n[f];
        L(
          h,
          `Panel constraints not found for index ${f}`
        );
        const {
          collapsedSize: g = 0,
          collapsible: y,
          minSize: z = 0
        } = h;
        if (y) {
          const S = r[f];
          if (L(
            S != null,
            `Previous layout not found for panel index ${f}`
          ), k(S, g)) {
            const p = z - S;
            G(p, Math.abs(e)) > 0 && (e = e < 0 ? 0 - p : p);
          }
        }
      }
      {
        const f = e < 0 ? c : m, h = n[f];
        L(
          h,
          `No panel constraints found for index ${f}`
        );
        const {
          collapsedSize: g = 0,
          collapsible: y,
          minSize: z = 0
        } = h;
        if (y) {
          const S = r[f];
          if (L(
            S != null,
            `Previous layout not found for panel index ${f}`
          ), k(S, z)) {
            const p = S - g;
            G(p, Math.abs(e)) > 0 && (e = e < 0 ? 0 - p : p);
          }
        }
      }
      break;
    }
    default: {
      const f = e < 0 ? m : c, h = n[f];
      L(
        h,
        `Panel constraints not found for index ${f}`
      );
      const g = r[f], { collapsible: y, collapsedSize: z, minSize: S } = h;
      if (y && G(g, S) < 0)
        if (e > 0) {
          const p = S - z, P = p / 2, M = g + e;
          G(M, S) < 0 && (e = G(e, P) <= 0 ? 0 : p);
        } else {
          const p = S - z, P = 100 - p / 2, M = g - e;
          G(M, S) < 0 && (e = G(100 + e, P) > 0 ? 0 : -p);
        }
      break;
    }
  }
  {
    const f = e < 0 ? 1 : -1;
    let h = e < 0 ? m : c, g = 0;
    for (; ; ) {
      const z = r[h];
      L(
        z != null,
        `Previous layout not found for panel index ${h}`
      );
      const p = Y({
        overrideDisabledPanels: l,
        panelConstraints: n[h],
        prevSize: z,
        size: 100
      }) - z;
      if (g += p, h += f, h < 0 || h >= n.length)
        break;
    }
    const y = Math.min(Math.abs(e), Math.abs(g));
    e = e < 0 ? 0 - y : y;
  }
  {
    let h = e < 0 ? c : m;
    for (; h >= 0 && h < n.length; ) {
      const g = Math.abs(e) - Math.abs(d), y = r[h];
      L(
        y != null,
        `Previous layout not found for panel index ${h}`
      );
      const z = y - g, S = Y({
        overrideDisabledPanels: l,
        panelConstraints: n[h],
        prevSize: y,
        size: z
      });
      if (!k(y, S) && (d += y - S, u[h] = S, d.toFixed(3).localeCompare(Math.abs(e).toFixed(3), void 0, {
        numeric: !0
      }) >= 0))
        break;
      e < 0 ? h-- : h++;
    }
  }
  if (Ot(a, u))
    return i;
  {
    const f = e < 0 ? m : c, h = r[f];
    L(
      h != null,
      `Previous layout not found for panel index ${f}`
    );
    const g = h + d, y = Y({
      overrideDisabledPanels: l,
      panelConstraints: n[f],
      prevSize: h,
      size: g
    });
    if (u[f] = y, !k(y, g)) {
      let z = g - y, p = e < 0 ? m : c;
      for (; p >= 0 && p < n.length; ) {
        const P = u[p];
        L(
          P != null,
          `Previous layout not found for panel index ${p}`
        );
        const M = P + z, C = Y({
          overrideDisabledPanels: l,
          panelConstraints: n[p],
          prevSize: P,
          size: M
        });
        if (k(P, C) || (z -= C - P, u[p] = C), k(z, 0))
          break;
        e > 0 ? p-- : p++;
      }
    }
  }
  const v = Object.values(u).reduce(
    (f, h) => h + f,
    0
  );
  if (!k(v, 100, 0.1))
    return i;
  const b = Object.keys(i);
  return u.reduce((f, h, g) => (f[b[g]] = h, f), {});
}
function j(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (t[n] === void 0 || G(e[n], t[n]) !== 0)
      return !1;
  return !0;
}
function B({
  layout: e,
  panelConstraints: t
}) {
  const n = Object.values(e), o = [...n], i = o.reduce(
    (r, a) => r + a,
    0
  );
  if (o.length !== t.length)
    throw Error(
      `Invalid ${t.length} panel layout: ${o.map((r) => `${r}%`).join(", ")}`
    );
  if (!k(i, 100) && o.length > 0)
    for (let r = 0; r < t.length; r++) {
      const a = o[r];
      L(a != null, `No layout data found for index ${r}`);
      const u = 100 / i * a;
      o[r] = u;
    }
  let s = 0;
  for (let r = 0; r < t.length; r++) {
    const a = n[r];
    L(a != null, `No layout data found for index ${r}`);
    const u = o[r];
    L(u != null, `No layout data found for index ${r}`);
    const c = Y({
      overrideDisabledPanels: !0,
      panelConstraints: t[r],
      prevSize: a,
      size: u
    });
    u != c && (s += u - c, o[r] = c);
  }
  if (!k(s, 0))
    for (let r = 0; r < t.length; r++) {
      const a = o[r];
      L(a != null, `No layout data found for index ${r}`);
      const u = a + s, c = Y({
        overrideDisabledPanels: !0,
        panelConstraints: t[r],
        prevSize: a,
        size: u
      });
      if (a !== c && (s -= c - a, o[r] = c, k(s, 0)))
        break;
    }
  const l = Object.keys(e);
  return o.reduce((r, a, u) => (r[l[u]] = a, r), {});
}
function et({
  groupId: e,
  panelId: t
}) {
  const n = () => {
    const r = U();
    for (const [
      a,
      {
        defaultLayoutDeferred: u,
        derivedPanelConstraints: c,
        layout: m,
        groupSize: d,
        separatorToPanels: v
      }
    ] of r)
      if (a.id === e)
        return {
          defaultLayoutDeferred: u,
          derivedPanelConstraints: c,
          group: a,
          groupSize: d,
          layout: m,
          separatorToPanels: v
        };
    throw Error(`Group ${e} not found`);
  }, o = () => {
    const r = n().derivedPanelConstraints.find(
      (a) => a.panelId === t
    );
    if (r !== void 0)
      return r;
    throw Error(`Panel constraints not found for Panel ${t}`);
  }, i = () => {
    const r = n().group.panels.find((a) => a.id === t);
    if (r !== void 0)
      return r;
    throw Error(`Layout not found for Panel ${t}`);
  }, s = () => {
    const r = n().layout[t];
    if (r !== void 0)
      return r;
    throw Error(`Layout not found for Panel ${t}`);
  }, l = (r) => {
    const a = s();
    if (r === a)
      return;
    const {
      defaultLayoutDeferred: u,
      derivedPanelConstraints: c,
      group: m,
      groupSize: d,
      layout: v,
      separatorToPanels: b
    } = n(), f = m.panels.findIndex((z) => z.id === t), h = f === m.panels.length - 1, g = se({
      delta: h ? a - r : r - a,
      initialLayout: v,
      panelConstraints: c,
      pivotIndices: h ? [f - 1, f] : [f, f + 1],
      prevLayout: v,
      trigger: "imperative-api"
    }), y = B({
      layout: g,
      panelConstraints: c
    });
    j(v, y) || _(m, {
      defaultLayoutDeferred: u,
      derivedPanelConstraints: c,
      groupSize: d,
      layout: y,
      separatorToPanels: b
    });
  };
  return {
    collapse: () => {
      const { collapsible: r, collapsedSize: a } = o(), { mutableValues: u } = i(), c = s();
      r && c !== a && (u.expandToSize = c, l(a));
    },
    expand: () => {
      const { collapsible: r, collapsedSize: a, minSize: u } = o(), { mutableValues: c } = i(), m = s();
      if (r && m === a) {
        let d = c.expandToSize ?? u;
        d === 0 && (d = 1), l(d);
      }
    },
    getSize: () => {
      const { group: r } = n(), a = s(), { element: u } = i(), c = r.orientation === "horizontal" ? u.offsetWidth : u.offsetHeight;
      return {
        asPercentage: a,
        inPixels: c
      };
    },
    isCollapsed: () => {
      const { collapsible: r, collapsedSize: a } = o(), u = s();
      return r && k(a, u);
    },
    resize: (r) => {
      const { group: a } = n(), { element: u } = i(), c = Q({ group: a }), m = te({
        groupSize: c,
        panelElement: u,
        styleProp: r
      }), d = D(m / c * 100);
      l(d);
    }
  };
}
function De(e) {
  if (e.defaultPrevented)
    return;
  const t = U();
  ve(e, t).forEach((o) => {
    if (o.separator) {
      const i = o.panels.find(
        (s) => s.panelConstraints.defaultSize !== void 0
      );
      if (i) {
        const s = i.panelConstraints.defaultSize, l = et({
          groupId: o.group.id,
          panelId: i.id
        });
        l && s !== void 0 && (l.resize(s), e.preventDefault());
      }
    }
  });
}
function fe(e) {
  const t = U();
  for (const [n] of t)
    if (n.separators.some(
      (o) => o.element === e
    ))
      return n;
  throw Error("Could not find parent Group for separator element");
}
function tt({
  groupId: e
}) {
  const t = () => {
    const n = U();
    for (const [o, i] of n)
      if (o.id === e)
        return { group: o, ...i };
    throw Error(`Could not find Group with id "${e}"`);
  };
  return {
    getLayout() {
      const { defaultLayoutDeferred: n, layout: o } = t();
      return n ? {} : o;
    },
    setLayout(n) {
      const {
        defaultLayoutDeferred: o,
        derivedPanelConstraints: i,
        group: s,
        groupSize: l,
        layout: r,
        separatorToPanels: a
      } = t(), u = B({
        layout: n,
        panelConstraints: i
      });
      return o ? r : (j(r, u) || _(s, {
        defaultLayoutDeferred: o,
        derivedPanelConstraints: i,
        groupSize: l,
        layout: u,
        separatorToPanels: a
      }), u);
    }
  };
}
function V(e, t) {
  const n = fe(e), o = $(n.id, !0), i = n.separators.find(
    (m) => m.element === e
  );
  L(i, "Matching separator not found");
  const s = o.separatorToPanels.get(i);
  L(s, "Matching panels not found");
  const l = s.map((m) => n.panels.indexOf(m)), a = tt({ groupId: n.id }).getLayout(), u = se({
    delta: t,
    initialLayout: a,
    panelConstraints: o.derivedPanelConstraints,
    pivotIndices: l,
    prevLayout: a,
    trigger: "keyboard"
  }), c = B({
    layout: u,
    panelConstraints: o.derivedPanelConstraints
  });
  j(a, c) || _(n, {
    defaultLayoutDeferred: o.defaultLayoutDeferred,
    derivedPanelConstraints: o.derivedPanelConstraints,
    groupSize: o.groupSize,
    layout: c,
    separatorToPanels: o.separatorToPanels
  });
}
function Te(e) {
  if (e.defaultPrevented)
    return;
  const t = e.currentTarget, n = fe(t);
  if (!n.disabled)
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault(), n.orientation === "vertical" && V(t, 5);
        break;
      }
      case "ArrowLeft": {
        e.preventDefault(), n.orientation === "horizontal" && V(t, -5);
        break;
      }
      case "ArrowRight": {
        e.preventDefault(), n.orientation === "horizontal" && V(t, 5);
        break;
      }
      case "ArrowUp": {
        e.preventDefault(), n.orientation === "vertical" && V(t, -5);
        break;
      }
      case "End": {
        e.preventDefault(), V(t, 100);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const o = fe(t), i = $(o.id, !0), { derivedPanelConstraints: s, layout: l, separatorToPanels: r } = i, a = o.separators.find(
          (d) => d.element === t
        );
        L(a, "Matching separator not found");
        const u = r.get(a);
        L(u, "Matching panels not found");
        const c = u[0], m = s.find(
          (d) => d.panelId === c.id
        );
        if (L(m, "Panel metadata not found"), m.collapsible) {
          const d = l[c.id], v = m.collapsedSize === d ? o.mutableState.expandedPanelSizes[c.id] ?? m.minSize : m.collapsedSize;
          V(t, v - d);
        }
        break;
      }
      case "F6": {
        e.preventDefault();
        const i = fe(t).separators.map(
          (a) => a.element
        ), s = Array.from(i).findIndex(
          (a) => a === e.currentTarget
        );
        L(s !== null, "Index not found");
        const l = e.shiftKey ? s > 0 ? s - 1 : i.length - 1 : s + 1 < i.length ? s + 1 : 0;
        i[l].focus({
          preventScroll: !0
        });
        break;
      }
      case "Home": {
        e.preventDefault(), V(t, -100);
        break;
      }
    }
}
let J = {
  cursorFlags: 0,
  state: "inactive"
};
const ze = new Je();
function W() {
  return J;
}
function Gt(e) {
  return ze.addListener("change", e);
}
function At(e) {
  const t = J, n = { ...J };
  n.cursorFlags = e, J = n, ze.emit("change", {
    prev: t,
    next: n
  });
}
function Z(e) {
  const t = J;
  J = e, ze.emit("change", {
    prev: t,
    next: e
  });
}
function Oe(e) {
  if (e.defaultPrevented)
    return;
  if (e.pointerType === "mouse" && e.button > 0)
    return;
  const t = U(), n = ve(e, t), o = /* @__PURE__ */ new Map();
  let i = !1;
  n.forEach((s) => {
    s.separator && (i || (i = !0, s.separator.element.focus({
      preventScroll: !0
    })));
    const l = t.get(s.group);
    l && o.set(s.group, l.layout);
  }), Z({
    cursorFlags: 0,
    hitRegions: n,
    initialLayoutMap: o,
    pointerDownAtPoint: { x: e.clientX, y: e.clientY },
    state: "active"
  }), n.length && e.preventDefault();
}
const Nt = (e) => e, he = () => {
}, nt = 1, ot = 2, it = 4, rt = 8, Ge = 3, Ae = 12;
let ce;
function Ne() {
  return ce === void 0 && (ce = !1, typeof window < "u" && (window.navigator.userAgent.includes("Chrome") || window.navigator.userAgent.includes("Firefox")) && (ce = !0)), ce;
}
function _t({
  cursorFlags: e,
  groups: t,
  state: n
}) {
  let o = 0, i = 0;
  switch (n) {
    case "active":
    case "hover":
      t.forEach((s) => {
        if (!s.mutableState.disableCursor)
          switch (s.orientation) {
            case "horizontal": {
              o++;
              break;
            }
            case "vertical": {
              i++;
              break;
            }
          }
      });
  }
  if (!(o === 0 && i === 0)) {
    switch (n) {
      case "active": {
        if (e && Ne()) {
          const s = (e & nt) !== 0, l = (e & ot) !== 0, r = (e & it) !== 0, a = (e & rt) !== 0;
          if (s)
            return r ? "se-resize" : a ? "ne-resize" : "e-resize";
          if (l)
            return r ? "sw-resize" : a ? "nw-resize" : "w-resize";
          if (r)
            return "s-resize";
          if (a)
            return "n-resize";
        }
        break;
      }
    }
    return Ne() ? o > 0 && i > 0 ? "move" : o > 0 ? "ew-resize" : "ns-resize" : o > 0 && i > 0 ? "grab" : o > 0 ? "col-resize" : "row-resize";
  }
}
const _e = /* @__PURE__ */ new WeakMap();
function xe(e) {
  if (e.defaultView === null || e.defaultView === void 0)
    return;
  let { prevStyle: t, styleSheet: n } = _e.get(e) ?? {};
  n === void 0 && (n = new e.defaultView.CSSStyleSheet(), e.adoptedStyleSheets && e.adoptedStyleSheets.push(n));
  const o = W();
  switch (o.state) {
    case "active":
    case "hover": {
      const i = _t({
        cursorFlags: o.cursorFlags,
        groups: o.hitRegions.map((l) => l.group),
        state: o.state
      }), s = `*, *:hover {cursor: ${i} !important; }`;
      if (t === s)
        return;
      t = s, i ? n.cssRules.length === 0 ? n.insertRule(s) : n.replaceSync(s) : n.cssRules.length === 1 && n.deleteRule(0);
      break;
    }
    case "inactive": {
      t = void 0, n.cssRules.length === 1 && n.deleteRule(0);
      break;
    }
  }
  _e.set(e, {
    prevStyle: t,
    styleSheet: n
  });
}
function st({
  document: e,
  event: t,
  hitRegions: n,
  initialLayoutMap: o,
  mountedGroups: i,
  pointerDownAtPoint: s,
  prevCursorFlags: l
}) {
  let r = 0;
  n.forEach((u) => {
    const { group: c, groupSize: m } = u, { orientation: d, panels: v } = c, { disableCursor: b } = c.mutableState;
    let f = 0;
    s ? d === "horizontal" ? f = (t.clientX - s.x) / m * 100 : f = (t.clientY - s.y) / m * 100 : d === "horizontal" ? f = t.clientX < 0 ? -100 : 100 : f = t.clientY < 0 ? -100 : 100;
    const h = o.get(c), g = i.get(c);
    if (!h || !g)
      return;
    const {
      defaultLayoutDeferred: y,
      derivedPanelConstraints: z,
      groupSize: S,
      layout: p,
      separatorToPanels: P
    } = g;
    if (z && p && P) {
      const M = se({
        delta: f,
        initialLayout: h,
        panelConstraints: z,
        pivotIndices: u.panels.map((C) => v.indexOf(C)),
        prevLayout: p,
        trigger: "mouse-or-touch"
      });
      if (j(M, p)) {
        if (f !== 0 && !b)
          switch (d) {
            case "horizontal": {
              r |= f < 0 ? nt : ot;
              break;
            }
            case "vertical": {
              r |= f < 0 ? it : rt;
              break;
            }
          }
      } else
        _(u.group, {
          defaultLayoutDeferred: y,
          derivedPanelConstraints: z,
          groupSize: S,
          layout: M,
          separatorToPanels: P
        });
    }
  });
  let a = 0;
  t.movementX === 0 ? a |= l & Ge : a |= r & Ge, t.movementY === 0 ? a |= l & Ae : a |= r & Ae, At(a), xe(e);
}
function Fe(e) {
  const t = U(), n = W();
  switch (n.state) {
    case "active":
      st({
        document: e.currentTarget,
        event: e,
        hitRegions: n.hitRegions,
        initialLayoutMap: n.initialLayoutMap,
        mountedGroups: t,
        prevCursorFlags: n.cursorFlags
      });
  }
}
function $e(e) {
  if (e.defaultPrevented)
    return;
  const t = W(), n = U();
  switch (t.state) {
    case "active": {
      if (
        // Skip this check for "pointerleave" events, else Firefox triggers a false positive (see #514)
        e.buttons === 0
      ) {
        Z({
          cursorFlags: 0,
          state: "inactive"
        }), t.hitRegions.forEach((o) => {
          const i = $(o.group.id, !0);
          _(o.group, i);
        });
        return;
      }
      for (const o of t.hitRegions)
        if (o.separator) {
          const { element: i } = o.separator;
          i.hasPointerCapture?.(e.pointerId) || i.setPointerCapture?.(e.pointerId);
        }
      st({
        document: e.currentTarget,
        event: e,
        hitRegions: t.hitRegions,
        initialLayoutMap: t.initialLayoutMap,
        mountedGroups: n,
        pointerDownAtPoint: t.pointerDownAtPoint,
        prevCursorFlags: t.cursorFlags
      });
      break;
    }
    default: {
      const o = ve(e, n);
      o.length === 0 ? t.state !== "inactive" && Z({
        cursorFlags: 0,
        state: "inactive"
      }) : Z({
        cursorFlags: 0,
        hitRegions: o,
        state: "hover"
      }), xe(e.currentTarget);
      break;
    }
  }
}
function He(e) {
  if (e.relatedTarget instanceof HTMLIFrameElement)
    switch (W().state) {
      case "hover":
        Z({
          cursorFlags: 0,
          state: "inactive"
        });
    }
}
function Ve(e) {
  if (e.defaultPrevented)
    return;
  if (e.pointerType === "mouse" && e.button > 0)
    return;
  const t = W();
  switch (t.state) {
    case "active":
      Z({
        cursorFlags: 0,
        state: "inactive"
      }), t.hitRegions.length > 0 && (xe(e.currentTarget), t.hitRegions.forEach((n) => {
        const o = $(n.group.id, !0);
        _(n.group, o);
      }), e.preventDefault());
  }
}
function je(e) {
  let t = 0, n = 0;
  const o = {};
  for (const s of e)
    if (s.defaultSize !== void 0) {
      t++;
      const l = D(s.defaultSize);
      n += l, o[s.panelId] = l;
    } else
      o[s.panelId] = void 0;
  const i = e.length - t;
  if (i !== 0) {
    const s = D((100 - n) / i);
    for (const l of e)
      l.defaultSize === void 0 && (o[l.panelId] = s);
  }
  return o;
}
function Ft(e, t, n) {
  if (!n[0])
    return;
  const i = e.panels.find((u) => u.element === t);
  if (!i || !i.onResize)
    return;
  const s = Q({ group: e }), l = e.orientation === "horizontal" ? i.element.offsetWidth : i.element.offsetHeight, r = i.mutableValues.prevSize, a = {
    asPercentage: D(l / s * 100),
    inPixels: l
  };
  i.mutableValues.prevSize = a, i.onResize(a, i.id, r);
}
function $t(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const o in e)
    if (e[o] !== t[o])
      return !1;
  return !0;
}
function Ht({
  group: e,
  nextGroupSize: t,
  prevGroupSize: n,
  prevLayout: o
}) {
  if (n <= 0 || t <= 0 || n === t)
    return o;
  let i = 0, s = 0, l = !1;
  const r = /* @__PURE__ */ new Map(), a = [];
  for (const m of e.panels) {
    const d = o[m.id] ?? 0;
    switch (m.panelConstraints.groupResizeBehavior) {
      case "preserve-pixel-size": {
        l = !0;
        const v = d / 100 * n, b = D(
          v / t * 100
        );
        r.set(m.id, b), i += b;
        break;
      }
      case "preserve-relative-size":
      default: {
        a.push(m.id), s += d;
        break;
      }
    }
  }
  if (!l || a.length === 0)
    return o;
  const u = 100 - i, c = { ...o };
  if (r.forEach((m, d) => {
    c[d] = m;
  }), s > 0)
    for (const m of a) {
      const d = o[m] ?? 0;
      c[m] = D(
        d / s * u
      );
    }
  else {
    const m = D(
      u / a.length
    );
    for (const d of a)
      c[d] = m;
  }
  return c;
}
function Vt(e, t) {
  const n = e.map((i) => i.id), o = Object.keys(t);
  if (n.length !== o.length)
    return !1;
  for (const i of n)
    if (!o.includes(i))
      return !1;
  return !0;
}
const q = /* @__PURE__ */ new Map();
function jt(e) {
  let t = !0;
  L(
    e.element.ownerDocument.defaultView,
    "Cannot register an unmounted Group"
  );
  const n = e.element.ownerDocument.defaultView.ResizeObserver, o = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Set(), s = new n((f) => {
    for (const h of f) {
      const { borderBoxSize: g, target: y } = h;
      if (y === e.element) {
        if (t) {
          const z = Q({ group: e });
          if (z === 0)
            return;
          const S = $(e.id);
          if (!S)
            return;
          const p = ge(e), P = S.defaultLayoutDeferred ? je(p) : S.layout, M = Ht({
            group: e,
            nextGroupSize: z,
            prevGroupSize: S.groupSize,
            prevLayout: P
          }), C = B({
            layout: M,
            panelConstraints: p
          });
          if (!S.defaultLayoutDeferred && j(S.layout, C) && $t(
            S.derivedPanelConstraints,
            p
          ) && S.groupSize === z)
            return;
          _(e, {
            defaultLayoutDeferred: !1,
            derivedPanelConstraints: p,
            groupSize: z,
            layout: C,
            separatorToPanels: S.separatorToPanels
          });
        }
      } else
        Ft(e, y, g);
    }
  });
  s.observe(e.element), e.panels.forEach((f) => {
    L(
      !o.has(f.id),
      `Panel ids must be unique; id "${f.id}" was used more than once`
    ), o.add(f.id), f.onResize && s.observe(f.element);
  });
  const l = Q({ group: e }), r = ge(e), a = e.panels.map(({ id: f }) => f).join(",");
  let u = e.mutableState.defaultLayout;
  u && (Vt(e.panels, u) || (u = void 0));
  const c = e.mutableState.layouts[a] ?? u ?? je(r), m = B({
    layout: c,
    panelConstraints: r
  }), d = e.element.ownerDocument;
  q.set(
    d,
    (q.get(d) ?? 0) + 1
  );
  const v = /* @__PURE__ */ new Map();
  return Ye(e).forEach((f) => {
    f.separator && v.set(f.separator, f.panels);
  }), _(e, {
    defaultLayoutDeferred: l === 0,
    derivedPanelConstraints: r,
    groupSize: l,
    layout: m,
    separatorToPanels: v
  }), e.separators.forEach((f) => {
    L(
      !i.has(f.id),
      `Separator ids must be unique; id "${f.id}" was used more than once`
    ), i.add(f.id), f.element.addEventListener("keydown", Te);
  }), q.get(d) === 1 && (d.addEventListener("dblclick", De, !0), d.addEventListener("pointerdown", Oe, !0), d.addEventListener("pointerleave", Fe), d.addEventListener("pointermove", $e), d.addEventListener("pointerout", He), d.addEventListener("pointerup", Ve, !0)), function() {
    t = !1, q.set(
      d,
      Math.max(0, (q.get(d) ?? 0) - 1)
    ), Lt(e), e.separators.forEach((h) => {
      h.element.removeEventListener("keydown", Te);
    }), q.get(d) || (d.removeEventListener(
      "dblclick",
      De,
      !0
    ), d.removeEventListener(
      "pointerdown",
      Oe,
      !0
    ), d.removeEventListener("pointerleave", Fe), d.removeEventListener("pointermove", $e), d.removeEventListener("pointerout", He), d.removeEventListener("pointerup", Ve, !0)), s.disconnect();
  };
}
function Bt() {
  const [e, t] = re({}), n = ne(() => t({}), []);
  return [e, n];
}
function be(e) {
  const t = pt();
  return `${e ?? t}`;
}
const K = typeof window < "u" ? Be : de;
function oe(e) {
  const t = T(e);
  return K(() => {
    t.current = e;
  }, [e]), ne(
    (...n) => t.current?.(...n),
    [t]
  );
}
function we(...e) {
  return oe((t) => {
    e.forEach((n) => {
      if (n)
        switch (typeof n) {
          case "function": {
            n(t);
            break;
          }
          case "object": {
            n.current = t;
            break;
          }
        }
    });
  });
}
function Pe(e) {
  const t = T({ ...e });
  return K(() => {
    for (const n in e)
      t.current[n] = e[n];
  }, [e]), t.current;
}
const at = ht(null);
function Wt(e, t) {
  const n = T({
    getLayout: () => ({}),
    setLayout: Nt
  });
  We(t, () => n.current, []), K(() => {
    Object.assign(
      n.current,
      tt({ groupId: e })
    );
  });
}
function Ut({
  children: e,
  className: t,
  defaultLayout: n,
  disableCursor: o,
  disabled: i,
  elementRef: s,
  groupRef: l,
  id: r,
  onLayoutChange: a,
  onLayoutChanged: u,
  orientation: c = "horizontal",
  resizeTargetMinimumSize: m = {
    coarse: 20,
    fine: 10
  },
  style: d,
  ...v
}) {
  const b = T({
    onLayoutChange: {},
    onLayoutChanged: {}
  }), f = oe((x) => {
    j(b.current.onLayoutChange, x) || (b.current.onLayoutChange = x, a?.(x));
  }), h = oe((x) => {
    j(b.current.onLayoutChanged, x) || (b.current.onLayoutChanged = x, u?.(x));
  }), g = be(r), y = T(null), [z, S] = Bt(), p = T({
    lastExpandedPanelSizes: {},
    layouts: {},
    panels: [],
    resizeTargetMinimumSize: m,
    separators: []
  }), P = we(y, s);
  Wt(g, l);
  const M = oe(
    (x, w) => {
      const E = W(), R = Me(x), I = $(x);
      if (I) {
        let O = !1;
        switch (E.state) {
          case "active": {
            O = E.hitRegions.some(
              (H) => H.group === R
            );
            break;
          }
        }
        return {
          flexGrow: I.layout[w] ?? 1,
          pointerEvents: O ? "none" : void 0
        };
      }
      if (n?.[w])
        return {
          flexGrow: n?.[w]
        };
    }
  ), C = Pe({
    defaultLayout: n,
    disableCursor: o
  }), X = Ue(
    () => ({
      get disableCursor() {
        return !!C.disableCursor;
      },
      getPanelStyles: M,
      id: g,
      orientation: c,
      registerPanel: (x) => {
        const w = p.current;
        return w.panels = Se(c, [
          ...w.panels,
          x
        ]), S(), () => {
          w.panels = w.panels.filter(
            (E) => E !== x
          ), S();
        };
      },
      registerSeparator: (x) => {
        const w = p.current;
        return w.separators = Se(c, [
          ...w.separators,
          x
        ]), S(), () => {
          w.separators = w.separators.filter(
            (E) => E !== x
          ), S();
        };
      },
      togglePanelDisabled: (x, w) => {
        const R = p.current.panels.find(
          (H) => H.id === x
        );
        R && (R.panelConstraints.disabled = w);
        const I = Me(g), O = $(g);
        I && O && _(I, {
          ...O,
          derivedPanelConstraints: ge(I)
        });
      },
      toggleSeparatorDisabled: (x, w) => {
        const R = p.current.separators.find(
          (I) => I.id === x
        );
        R && (R.disabled = w);
      }
    }),
    [M, g, S, c, C]
  ), F = T(null);
  return K(() => {
    const x = y.current;
    if (x === null)
      return;
    const w = p.current;
    let E;
    if (C.defaultLayout !== void 0 && Object.keys(C.defaultLayout).length === w.panels.length) {
      E = {};
      for (const ee of w.panels) {
        const ae = C.defaultLayout[ee.id];
        ae !== void 0 && (E[ee.id] = ae);
      }
    }
    const R = {
      disabled: !!i,
      element: x,
      id: g,
      mutableState: {
        defaultLayout: E,
        disableCursor: !!C.disableCursor,
        expandedPanelSizes: p.current.lastExpandedPanelSizes,
        layouts: p.current.layouts
      },
      orientation: c,
      panels: w.panels,
      resizeTargetMinimumSize: w.resizeTargetMinimumSize,
      separators: w.separators
    };
    F.current = R;
    const I = jt(R), { defaultLayoutDeferred: O, derivedPanelConstraints: H, layout: Ce } = $(R.id, !0);
    !O && H.length > 0 && (f(Ce), h(Ce));
    const lt = ye(g, (ee) => {
      const { defaultLayoutDeferred: ae, derivedPanelConstraints: Re, layout: le } = ee.next;
      if (ae || Re.length === 0)
        return;
      const ut = R.panels.map(({ id: N }) => N).join(",");
      R.mutableState.layouts[ut] = le, Re.forEach((N) => {
        if (N.collapsible) {
          const { layout: pe } = ee.prev ?? {};
          if (pe) {
            const ft = k(
              N.collapsedSize,
              le[N.panelId]
            ), dt = k(
              N.collapsedSize,
              pe[N.panelId]
            );
            ft && !dt && (R.mutableState.expandedPanelSizes[N.panelId] = pe[N.panelId]);
          }
        }
      });
      const ct = W().state !== "active";
      f(le), ct && h(le);
    });
    return () => {
      F.current = null, I(), lt();
    };
  }, [
    i,
    g,
    h,
    f,
    c,
    z,
    C
  ]), de(() => {
    const x = F.current;
    x && (x.mutableState.defaultLayout = n, x.mutableState.disableCursor = !!o);
  }), /* @__PURE__ */ ie(at.Provider, { value: X, children: /* @__PURE__ */ ie(
    "div",
    {
      ...v,
      className: t,
      "data-group": !0,
      "data-testid": g,
      id: g,
      ref: P,
      style: {
        height: "100%",
        width: "100%",
        overflow: "hidden",
        ...d,
        display: "flex",
        flexDirection: c === "horizontal" ? "row" : "column",
        flexWrap: "nowrap",
        // Inform the browser that the library is handling touch events for this element
        // but still allow users to scroll content within panels in the non-resizing direction
        // NOTE This is not an inherited style
        // See github.com/bvaughn/react-resizable-panels/issues/662
        touchAction: c === "horizontal" ? "pan-y" : "pan-x"
      },
      children: e
    }
  ) });
}
Ut.displayName = "Group";
function me(e, t) {
  return `react-resizable-panels:${[e, ...t].join(":")}`;
}
function nn({
  debounceSaveMs: e = 100,
  panelIds: t,
  storage: n = localStorage,
  ...o
}) {
  const i = t !== void 0, s = "id" in o ? o.id : o.groupId, l = me(s, t ?? []), r = Ke(
    Kt,
    () => n.getItem(l),
    () => n.getItem(l)
  ), a = Ue(
    () => r ? JSON.parse(r) : void 0,
    [r]
  ), u = T(null), c = ne(() => {
    const v = u.current;
    v && (u.current = null, clearTimeout(v));
  }, []);
  Be(() => () => {
    c();
  }, [c]);
  const m = ne(
    (v) => {
      c();
      let b;
      i ? b = me(s, Object.keys(v)) : b = me(s, []);
      try {
        n.setItem(b, JSON.stringify(v));
      } catch (f) {
        console.error(f);
      }
    },
    [c, i, s, n]
  ), d = ne(
    (v) => {
      c(), e === 0 ? m(v) : u.current = setTimeout(() => {
        m(v);
      }, e);
    },
    [c, e, m]
  );
  return {
    /**
     * Pass this value to `Group` as the `defaultLayout` prop.
     */
    defaultLayout: a,
    /**
     * Attach this callback on the `Group` as the `onLayoutChange` prop.
     *
     * @deprecated Use the {@link onLayoutChanged} prop instead.
     */
    onLayoutChange: d,
    /**
     * Attach this callback on the `Group` as the `onLayoutChanged` prop.
     */
    onLayoutChanged: m
  };
}
function Kt() {
  return function() {
  };
}
function on() {
  return re(null);
}
function rn() {
  return T(null);
}
function Le() {
  const e = mt(at);
  return L(
    e,
    "Group Context not found; did you render a Panel or Separator outside of a Group?"
  ), e;
}
function Xt(e, t) {
  const { id: n } = Le(), o = T({
    collapse: he,
    expand: he,
    getSize: () => ({
      asPercentage: 0,
      inPixels: 0
    }),
    isCollapsed: () => !1,
    resize: he
  });
  We(t, () => o.current, []), K(() => {
    Object.assign(
      o.current,
      et({ groupId: n, panelId: e })
    );
  });
}
function qt({
  children: e,
  className: t,
  collapsedSize: n = "0%",
  collapsible: o = !1,
  defaultSize: i,
  disabled: s,
  elementRef: l,
  groupResizeBehavior: r = "preserve-relative-size",
  id: a,
  maxSize: u = "100%",
  minSize: c = "0%",
  onResize: m,
  panelRef: d,
  style: v,
  ...b
}) {
  const f = !!a, h = be(a), g = Pe({
    disabled: s
  }), y = T(null), z = we(y, l), {
    getPanelStyles: S,
    id: p,
    orientation: P,
    registerPanel: M,
    togglePanelDisabled: C
  } = Le(), X = m !== null, F = oe(
    (R, I, O) => {
      m?.(R, a, O);
    }
  );
  K(() => {
    const R = y.current;
    if (R !== null) {
      const I = {
        element: R,
        id: h,
        idIsStable: f,
        mutableValues: {
          expandToSize: void 0,
          prevSize: void 0
        },
        onResize: X ? F : void 0,
        panelConstraints: {
          groupResizeBehavior: r,
          collapsedSize: n,
          collapsible: o,
          defaultSize: i,
          disabled: g.disabled,
          maxSize: u,
          minSize: c
        }
      };
      return M(I);
    }
  }, [
    r,
    n,
    o,
    i,
    X,
    h,
    f,
    u,
    c,
    F,
    M,
    g
  ]), de(() => {
    C(h, !!s);
  }, [s, h, C]), Xt(h, d);
  const x = () => {
    const R = S(p, h);
    if (R)
      return JSON.stringify(R);
  }, w = Ke(
    (R) => ye(p, R),
    x,
    x
  );
  let E;
  return w ? E = JSON.parse(w) : i ? E = {
    flexGrow: void 0,
    flexShrink: void 0,
    flexBasis: i
  } : E = { flexGrow: 1 }, /* @__PURE__ */ ie(
    "div",
    {
      ...b,
      "data-disabled": s || void 0,
      "data-panel": !0,
      "data-testid": h,
      id: h,
      ref: z,
      style: {
        ...Yt,
        display: "flex",
        flexBasis: 0,
        flexShrink: 1,
        overflow: "visible",
        ...E
      },
      children: /* @__PURE__ */ ie(
        "div",
        {
          className: t,
          style: {
            maxHeight: "100%",
            maxWidth: "100%",
            flexGrow: 1,
            overflow: "auto",
            ...v,
            // Inform the browser that the library is handling touch events for this element
            // but still allow users to scroll content within panels in the non-resizing direction
            // NOTE This is not an inherited style
            // See github.com/bvaughn/react-resizable-panels/issues/662
            touchAction: P === "horizontal" ? "pan-y" : "pan-x"
          },
          children: e
        }
      )
    }
  );
}
qt.displayName = "Panel";
const Yt = {
  minHeight: 0,
  maxHeight: "100%",
  height: "auto",
  minWidth: 0,
  maxWidth: "100%",
  width: "auto",
  border: "none",
  borderWidth: 0,
  padding: 0,
  margin: 0
};
function sn() {
  return re(null);
}
function an() {
  return T(null);
}
function Jt({
  layout: e,
  panelConstraints: t,
  panelId: n,
  panelIndex: o
}) {
  let i, s;
  const l = e[n], r = t.find(
    (a) => a.panelId === n
  );
  if (r) {
    const a = r.maxSize, u = r.collapsible ? r.collapsedSize : r.minSize, c = [o, o + 1];
    s = B({
      layout: se({
        delta: u - l,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: c,
        prevLayout: e
      }),
      panelConstraints: t
    })[n], i = B({
      layout: se({
        delta: a - l,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: c,
        prevLayout: e
      }),
      panelConstraints: t
    })[n];
  }
  return {
    valueControls: n,
    valueMax: i,
    valueMin: s,
    valueNow: l
  };
}
function Zt({
  children: e,
  className: t,
  disabled: n,
  elementRef: o,
  id: i,
  style: s,
  ...l
}) {
  const r = be(i), a = Pe({
    disabled: n
  }), [u, c] = re({}), [m, d] = re("inactive"), v = T(null), b = we(v, o), {
    disableCursor: f,
    id: h,
    orientation: g,
    registerSeparator: y,
    toggleSeparatorDisabled: z
  } = Le(), S = g === "horizontal" ? "vertical" : "horizontal";
  K(() => {
    const P = v.current;
    if (P !== null) {
      const M = {
        disabled: a.disabled,
        element: P,
        id: r
      }, C = y(M), X = Gt(
        (x) => {
          d(
            x.next.state !== "inactive" && x.next.hitRegions.some(
              (w) => w.separator === M
            ) ? x.next.state : "inactive"
          );
        }
      ), F = ye(
        h,
        (x) => {
          const { derivedPanelConstraints: w, layout: E, separatorToPanels: R } = x.next, I = R.get(M);
          if (I) {
            const O = I[0], H = I.indexOf(O);
            c(
              Jt({
                layout: E,
                panelConstraints: w,
                panelId: O.id,
                panelIndex: H
              })
            );
          }
        }
      );
      return () => {
        X(), F(), C();
      };
    }
  }, [h, r, y, a]), de(() => {
    z(r, !!n);
  }, [n, r, z]);
  let p;
  return n && !f && (p = "not-allowed"), /* @__PURE__ */ ie(
    "div",
    {
      ...l,
      "aria-controls": u.valueControls,
      "aria-disabled": n || void 0,
      "aria-orientation": S,
      "aria-valuemax": u.valueMax,
      "aria-valuemin": u.valueMin,
      "aria-valuenow": u.valueNow,
      children: e,
      className: t,
      "data-separator": n ? "disabled" : m,
      "data-testid": r,
      id: r,
      ref: b,
      role: "separator",
      style: {
        flexBasis: "auto",
        cursor: p,
        ...s,
        flexGrow: 0,
        flexShrink: 0,
        // Inform the browser that the library is handling touch events for this element
        // See github.com/bvaughn/react-resizable-panels/issues/662
        touchAction: "none"
      },
      tabIndex: n ? void 0 : 0
    }
  );
}
Zt.displayName = "Separator";
export {
  Ut as Group,
  qt as Panel,
  Zt as Separator,
  Pt as isCoarsePointer,
  nn as useDefaultLayout,
  on as useGroupCallbackRef,
  rn as useGroupRef,
  sn as usePanelCallbackRef,
  an as usePanelRef
};
//# sourceMappingURL=react-resizable-panels.js.map
