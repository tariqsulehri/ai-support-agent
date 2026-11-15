(function () {
    // Prevent duplicate load
    if (window.AIScriptoAgent) return;

    const script = document.currentScript;
    if (!script) {
        console.error("AI Agent: script must be loaded with a regular <script> tag");
        return;
    }

    const tenant = script.getAttribute("data-tenant");
    const token = script.getAttribute("data-token");

    if (!tenant || !token) {
        console.error("AI Agent: Missing tenant or token");
        return;
    }

    // Serve the widget from the same origin as this script so staging/self-hosted
    // deployments work; fall back to the production host.
    const DEFAULT_ORIGIN = "https://ai-support-agent-navy.vercel.app";
    let widgetOrigin = DEFAULT_ORIGIN;
    try {
        if (script.src) widgetOrigin = new URL(script.src, window.location.href).origin;
    } catch {
        // keep default
    }

    window.AIScriptoAgent = true;

    let iframe = null;

    // Detect theme
    function getTheme() {
        const style = getComputedStyle(document.body);

        return {
            bg: style.backgroundColor || "#ffffff",
            fg: style.color || "#000000"
        };
    }

    // Unlock audio synchronously inside the click so the agent's greeting can play
    function primeAudio() {
        try {
            const a = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
            a.volume = 0;
            a.play().then(function () { a.pause(); }).catch(function () {});
        } catch {
            // ignore
        }
    }

    function createUI() {
        // Chat Button
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("aria-label", "Open chat");
        button.setAttribute("aria-expanded", "false");
        button.innerHTML =
            '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" ' +
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: "999999",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            transition: "transform 0.1s ease",
            touchAction: "manipulation"
        });
        button.addEventListener("pointerdown", function () { button.style.transform = "scale(0.94)"; });
        button.addEventListener("pointerup", function () { button.style.transform = ""; });
        button.addEventListener("pointerleave", function () { button.style.transform = ""; });

        // Container — fits narrow (~400px) screens instead of overflowing them
        const container = document.createElement("div");

        Object.assign(container.style, {
            position: "fixed",
            bottom: "90px",
            right: "20px",
            width: "min(420px, calc(100vw - 40px))",
            height: "min(680px, calc(100vh - 110px))",
            display: "none",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            background: "#fff",
            zIndex: "999999"
        });

        document.body.appendChild(container);
        document.body.appendChild(button);

        function setOpen(open) {
            container.style.display = open ? "block" : "none";
            button.setAttribute("aria-expanded", open ? "true" : "false");
            button.setAttribute("aria-label", open ? "Close chat" : "Open chat");
        }

        function loadIframe() {
            const { bg, fg } = getTheme();
            const url = new URL("/voice", widgetOrigin);

            url.searchParams.set("tenant", tenant);
            url.searchParams.set("token", token);
            url.searchParams.set("bg", bg);
            url.searchParams.set("fg", fg);

            iframe = document.createElement("iframe");
            iframe.src = url.toString();
            iframe.title = "Chat with support";

            Object.assign(iframe.style, {
                width: "100%",
                height: "100%",
                border: "0"
            });

            iframe.allow = "microphone *; autoplay *";
            container.appendChild(iframe);
        }

        button.addEventListener("click", function () {
            primeAudio();
            const opening = container.style.display === "none";
            // Show the panel first so the click feels instant; the iframe loads inside it.
            setOpen(opening);
            if (opening && !iframe) loadIframe();
        });

        // The widget's own close button ends the session inside the iframe;
        // hide the panel and drop the iframe so the next open starts fresh.
        window.addEventListener("message", function (e) {
            if (!iframe || e.source !== iframe.contentWindow || e.origin !== widgetOrigin) return;
            if (e.data && e.data.type === "voice-agent:close") {
                setOpen(false);
                iframe.remove();
                iframe = null;
            }
        });
    }

    // Wait for DOM
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createUI);
    } else {
        createUI();
    }
})();
