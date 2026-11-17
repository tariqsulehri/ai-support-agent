import { NextRequest, NextResponse } from "next/server";

const FALLBACK_BASE_URL = "https://ai-support-agent-navy.vercel.app";
// Host header values are attacker-controllable; only accept plain host[:port].
const HOST_PATTERN = /^[a-z0-9.-]+(:\d{1,5})?$|^\[[0-9a-f:.]+\](:\d{1,5})?$/i;

function resolveBaseUrl(req: NextRequest): string {
    const configured = process.env.AGENT_BASE_URL?.trim();
    if (configured) {
        try {
            const url = new URL(configured);
            if (url.protocol === "https:" || url.protocol === "http:") {
                return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
            }
        } catch {
            // fall through to request-derived origin
        }
    }

    // Derive the host the loader was fetched from so the iframe always points at
    // the live deployment.
    const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : "https";
    const host = req.headers.get("host")?.trim();
    if (host && HOST_PATTERN.test(host)) return `${proto}://${host}`;
    return FALLBACK_BASE_URL;
}

export async function GET(req: NextRequest) {
    // Embedded into a JS string literal below: JSON-encode so no character in
    // the value can terminate the string and inject script.
    const baseUrl = JSON.stringify(resolveBaseUrl(req)).slice(1, -1);

    const js = `
(function () {
  if (window.AIScriptoAgent) return;

  const script = document.currentScript;

  const tenant = script.getAttribute("data-tenant");
  const token = script.getAttribute("data-token");
  const clientKey = script.getAttribute("client-api-key") ||
    script.getAttribute("data-client-api-key") ||
    script.getAttribute("data-client-key") ||
    script.getAttribute("data-api-key");
  const width = script.getAttribute("data-width") || "420px";
  const height = script.getAttribute("data-height") || "680px";

  const GENERIC_FONTS = ["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
    "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded", "-apple-system", "blinkmacsystemfont",
    "emoji", "math", "inherit", "initial"];

  // Optional theme overrides; anything not set is detected from the page.
  function attr(name) { const v = script.getAttribute(name); return v ? v.trim() : ""; }
  const themeAttr = attr("data-theme").toLowerCase();
  const overrides = {
    primary: normalizeHex(attr("data-primary-color")),
    font:    safeFont(attr("data-font")),
    radius:  safeRadius(attr("data-radius")),
    mode:    themeAttr === "light" || themeAttr === "dark" ? themeAttr : null
  };

  if (!tenant && !clientKey) {
    console.error("AI Agent: Missing client-api-key or data-tenant attribute on script tag");
    return;
  }

  function safeSize(value, fallback) {
    if (/^\\d{2,4}px$/.test(value)) return value;
    if (/^\\d{2,3}%$/.test(value)) return value;
    if (/^min\\([\\dpxvwvh%,.\\s-]+\\)$/.test(value)) return value;
    if (/^max\\([\\dpxvwvh%,.\\s-]+\\)$/.test(value)) return value;
    if (/^clamp\\([\\dpxvwvh%,.\\s-]+\\)$/.test(value)) return value;
    return fallback;
  }

  let isLoaded = false;
  let sessionPromise = null;

  function getEmbedSession() {
    if (sessionPromise) return sessionPromise;

    sessionPromise = fetch("${baseUrl}/api/embed/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant: tenant,
        clientKey: clientKey,
        parentUrl: window.location.href
      })
    }).then(async function (res) {
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.session) {
        throw new Error(data.error || "Domain is not verified for this tenant");
      }
      return data;
    }).catch(function (err) {
      // Allow a later click to retry instead of caching the failure forever.
      sessionPromise = null;
      throw err;
    });

    return sessionPromise;
  }

  function normalizeHex(v) {
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(v)) return ("#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toLowerCase();
    return null;
  }

  function parseRgb(value) {
    const m = String(value || "").match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : parseFloat(m[4]) };
  }

  function rgbToHex(rgb) {
    const c = parseRgb(rgb);
    if (!c || c.a < 0.5) return null;
    const sum = c.r + c.g + c.b;
    if (sum < 30 || sum > 720) return null; // near-black / near-white is not a brand colour
    return "#" + [c.r, c.g, c.b].map(function (n) { return n.toString(16).padStart(2, "0"); }).join("");
  }

  function luminance(c) {
    const ch = [c.r, c.g, c.b].map(function (v) {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  // White or near-black text, whichever contrasts better with the background.
  function readableOn(hex) {
    const L = luminance({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) });
    const dark = luminance({ r: 17, g: 24, b: 39 });
    return (1.05 / (L + 0.05)) >= ((L + 0.05) / (dark + 0.05)) ? "#ffffff" : "#111827";
  }

  function safeFont(name) {
    let n = String(name || "").trim().replace(/^["']|["']$/g, "");
    const nextFont = n.match(/^__([A-Za-z0-9_]+?)_[0-9a-f]{4,}$/); // next/font hashed names
    if (nextFont) n = nextFont[1].replace(/_/g, " ");
    if (!n || / Fallback$/i.test(n)) return null;
    if (!/^[A-Za-z0-9][A-Za-z0-9 -]{0,47}$/.test(n)) return null;
    if (GENERIC_FONTS.indexOf(n.toLowerCase()) !== -1) return null;
    return n;
  }

  function safeRadius(v) {
    const n = parseFloat(v);
    return isFinite(n) && n >= 0 ? Math.round(Math.min(n, 24)) : null;
  }

  function findPrimaryButton() {
    const BTNS = ['button[class*="primary"]', 'a[class*="primary"]', '.btn-primary', '.button-primary', '[data-brand]'];
    for (const sel of BTNS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function detectPrimaryColor() {
    const CSS_VARS = ["--primary","--primary-color","--brand-color","--color-primary","--theme-primary","--accent-color","--accent","--brand"];
    const root = getComputedStyle(document.documentElement);
    for (const v of CSS_VARS) {
      const hex = normalizeHex(root.getPropertyValue(v).trim());
      if (hex) return hex;
    }
    const btn = findPrimaryButton();
    if (btn) { const c = rgbToHex(getComputedStyle(btn).backgroundColor); if (c) return c; }
    const header = document.querySelector("header") || document.querySelector("nav");
    if (header) { const c = rgbToHex(getComputedStyle(header).backgroundColor); if (c) return c; }
    return null;
  }

  function detectFont() {
    const parts = (getComputedStyle(document.body).fontFamily || "").split(",");
    for (const part of parts) {
      const raw = part.trim().replace(/^["']|["']$/g, "").toLowerCase();
      if (GENERIC_FONTS.indexOf(raw) !== -1) break;
      const f = safeFont(part);
      if (f) return f;
    }
    return null;
  }

  function detectRadius() {
    const btn = findPrimaryButton();
    return btn ? safeRadius(getComputedStyle(btn).borderTopLeftRadius) : null;
  }

  function detectMode() {
    const els = [document.body, document.documentElement];
    for (const el of els) {
      const c = el && parseRgb(getComputedStyle(el).backgroundColor);
      if (c && c.a > 0.5) return luminance(c) < 0.2 ? "dark" : "light";
    }
    return "light";
  }

  // Overrides win; detection never throws into the host page.
  function resolveTheme() {
    function safe(fn) { try { return fn(); } catch (e) { return null; } }
    return {
      primary: overrides.primary || safe(detectPrimaryColor),
      font:    overrides.font || safe(detectFont),
      radius:  overrides.radius !== null ? overrides.radius : safe(detectRadius),
      mode:    overrides.mode || safe(detectMode) || "light"
    };
  }

  function applyLauncherTheme(button, container, theme) {
    const bg = theme.primary || "#007bff";
    button.style.background = bg;
    button.style.color = readableOn(bg);
    container.style.background = theme.mode === "dark" ? "#1b1b1b" : "#fff";
    container.style.borderRadius = (theme.radius !== null ? theme.radius : 12) + "px";
  }

  function createUI() {
    const button = document.createElement("button");
    button.innerHTML = "💬";

    Object.assign(button.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "60px",
      height: "60px",
      borderRadius: "50%",
      background: "#007bff",
      color: "#fff",
      border: "none",
      fontSize: "26px",
      cursor: "pointer",
      zIndex: "999999",
      boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
    });

    const container = document.createElement("div");

    Object.assign(container.style, {
      position: "fixed",
      bottom: "90px",
      right: "20px",
      width: safeSize(width, "420px"),
      height: safeSize(height, "680px"),
      maxWidth: "calc(100vw - 40px)",
      maxHeight: "calc(100dvh - 120px)",
      display: "none",
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      background: "#fff",
      zIndex: "999999"
    });

    document.body.appendChild(container);
    document.body.appendChild(button);
    applyLauncherTheme(button, container, resolveTheme());

    button.onclick = async function () {
      try {
        var a = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
        a.play().then(function () { a.pause(); }).catch(function () {});
      } catch (e) {}

      if (!isLoaded) {
        let session = "";
        let resolvedTenant = tenant;
        try {
          const data = await getEmbedSession();
          session = data.session;
          resolvedTenant = tenant || data.tenantId || "";
        } catch (err) {
          console.error("AI Agent:", err && err.message ? err.message : err);
          return;
        }

        const url = new URL("${baseUrl}/voice");

        if (resolvedTenant) url.searchParams.set("tenant", resolvedTenant);
        url.searchParams.set("session", session);
        url.searchParams.set("v", String(Date.now()));
        if (token) url.searchParams.set("token", token);

        const theme = resolveTheme();
        applyLauncherTheme(button, container, theme);
        if (theme.primary) url.searchParams.set("primaryColor", theme.primary);
        if (theme.font) url.searchParams.set("font", theme.font);
        if (theme.radius !== null) url.searchParams.set("radius", String(theme.radius));
        url.searchParams.set("mode", theme.mode);

        const iframe = document.createElement("iframe");
        iframe.src = url.toString();
        iframe.allow = "microphone *; autoplay *";

        Object.assign(iframe.style, {
          width: "100%",
          height: "100%",
          border: "0"
        });

        container.appendChild(iframe);
        isLoaded = true;
      }

      container.style.display =
        container.style.display === "none" ? "block" : "none";
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createUI);
  } else {
    createUI();
  }

  window.AIScriptoAgent = true;
})();
`;

    return new NextResponse(js, {
        headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, max-age=0, must-revalidate"
        }
    });
}
