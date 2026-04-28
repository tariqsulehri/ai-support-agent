import { NextResponse } from "next/server";

export async function GET() {
    const baseUrl = "https://ai-support-agent-navy.vercel.app";

    const js = `
(function () {
  if (window.AIScriptoAgent) return;

  const script = document.currentScript;

  const tenant = script.getAttribute("data-tenant");
  const token = script.getAttribute("data-token");

  if (!tenant || !token) {
    console.error("AI Agent: Missing tenant or token");
    return;
  }

  let isLoaded = false;

  function getTheme() {
    const style = getComputedStyle(document.body);
    return {
      bg: style.backgroundColor || "#ffffff",
      fg: style.color || "#000000"
    };
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
      width: "420px",
      height: "680px",
      display: "none",
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      background: "#fff",
      zIndex: "999999"
    });

    document.body.appendChild(container);
    document.body.appendChild(button);

    button.onclick = function () {
      if (!isLoaded) {
        const { bg, fg } = getTheme();

        const url = new URL("${baseUrl}/voice");

        url.searchParams.set("tenant", tenant);
        url.searchParams.set("token", token);
        url.searchParams.set("bg", bg);
        url.searchParams.set("fg", fg);

        const iframe = document.createElement("iframe");
        iframe.src = url.toString();
        iframe.allow = "microphone; autoplay";

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
            "Content-Type": "application/javascript",
            "Cache-Control": "public, max-age=86400"
        }
    });
}