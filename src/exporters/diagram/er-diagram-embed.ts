import type { DatabaseDoc } from "../../core/model/database-doc";
import type { OutputLabels } from "../shared/output-labels";
import { renderMermaid } from "./mermaid-exporter";

export function getErDiagramMermaid(doc: DatabaseDoc): string {
  return renderMermaid(doc);
}

export function renderErDiagramHtmlPage(
  mermaidSource: string,
  labels: OutputLabels
): string {
  const escaped = mermaidSource
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(labels.erDiagramHeading)}</title>
  <style>
    body { margin: 0; font-family: "Yu Gothic UI", "Meiryo", Arial, sans-serif; background: #f3f4f6; }
    .toolbar {
      background: #4472c4; color: #fff; padding: 10px 16px;
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    }
    .toolbar a { color: #fff; text-decoration: underline; }
    .toolbar .spacer { flex: 1; }
    .toolbar .hint { opacity: 0.9; font-size: 13px; }
    .toolbar button {
      background: #fff; color: #2f5597; border: none; border-radius: 4px;
      padding: 6px 12px; font-size: 13px; cursor: pointer; font-weight: 600;
    }
    .toolbar button:hover { background: #e8eef8; }
    .viewport {
      position: relative; height: calc(100vh - 52px); margin: 12px;
      background: #fff; border: 1px solid #bfc7d4; border-radius: 4px;
      overflow: hidden; cursor: grab; touch-action: none;
    }
    .viewport.dragging { cursor: grabbing; }
    .canvas {
      position: absolute; left: 0; top: 0; transform-origin: 0 0;
      padding: 24px;
    }
    .mermaid { min-width: 320px; }
    .mermaid svg { max-width: none !important; height: auto !important; }
  </style>
</head>
<body>
  <div class="toolbar">
    <strong>${esc(labels.erDiagramHeading)}</strong>
    <a href="index.html">← ${esc(labels.tableListHeading)}</a>
    <span class="spacer"></span>
    <span class="hint">${esc(labels.panZoomHint)}</span>
    <button type="button" id="zoom-out" title="${esc(labels.zoomOut)}">−</button>
    <button type="button" id="zoom-reset" title="${esc(labels.zoomReset)}">${esc(labels.zoomReset)}</button>
    <button type="button" id="zoom-in" title="${esc(labels.zoomIn)}">+</button>
    <button type="button" id="zoom-fit" title="${esc(labels.zoomFit)}">${esc(labels.zoomFit)}</button>
  </div>
  <div class="viewport" id="viewport">
    <div class="canvas" id="canvas">
      <pre class="mermaid">${escaped}</pre>
    </div>
  </div>
  <script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      er: { useMaxWidth: false }
    });

    await mermaid.run({ querySelector: ".mermaid" });
    setupPanZoom(
      document.getElementById("viewport"),
      document.getElementById("canvas")
    );

    function setupPanZoom(viewport, canvas) {
      let scale = 1;
      let tx = 40;
      let ty = 40;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;

      function apply() {
        canvas.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
      }

      function zoomAt(factor, cx, cy) {
        const next = Math.min(4, Math.max(0.15, scale * factor));
        const ratio = next / scale;
        tx = cx - (cx - tx) * ratio;
        ty = cy - (cy - ty) * ratio;
        scale = next;
        apply();
      }

      function fitToView() {
        const svg = canvas.querySelector("svg");
        if (!svg) return;
        const box = svg.getBBox();
        const pad = 32;
        const vw = viewport.clientWidth;
        const vh = viewport.clientHeight;
        scale = Math.min(
          (vw - pad * 2) / Math.max(box.width, 1),
          (vh - pad * 2) / Math.max(box.height, 1),
          1.5
        );
        tx = (vw - box.width * scale) / 2 - box.x * scale;
        ty = (vh - box.height * scale) / 2 - box.y * scale;
        apply();
      }

      viewport.addEventListener("wheel", (e) => {
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        zoomAt(e.deltaY < 0 ? 1.12 : 0.89, cx, cy);
      }, { passive: false });

      viewport.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        viewport.classList.add("dragging");
      });

      window.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        tx += e.clientX - lastX;
        ty += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        apply();
      });

      window.addEventListener("mouseup", () => {
        dragging = false;
        viewport.classList.remove("dragging");
      });

      document.getElementById("zoom-in").addEventListener("click", () => {
        zoomAt(1.2, viewport.clientWidth / 2, viewport.clientHeight / 2);
      });
      document.getElementById("zoom-out").addEventListener("click", () => {
        zoomAt(1 / 1.2, viewport.clientWidth / 2, viewport.clientHeight / 2);
      });
      document.getElementById("zoom-reset").addEventListener("click", () => {
        scale = 1;
        tx = 40;
        ty = 40;
        apply();
      });
      document.getElementById("zoom-fit").addEventListener("click", fitToView);

      fitToView();
    }
  </script>
</body>
</html>`;
}

export function renderErDiagramMarkdown(
  mermaidSource: string,
  labels: OutputLabels
): string {
  return [
    `# ${labels.erDiagramHeading}`,
    "",
    "```mermaid",
    mermaidSource.trimEnd(),
    "```",
    ""
  ].join("\n");
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
