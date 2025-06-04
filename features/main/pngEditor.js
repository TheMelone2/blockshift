// Minimal PNG pixel editor modal for texture packs

export function showPNGEditor(blob, filename) {
  return new Promise((resolve) => {
    // --- Modal/Overlay UI ---
    // Overlay/modal
    let overlay = document.createElement("div");
    overlay.className = "editor-overlay";

    // Modal box (draggable)
    let modal = document.createElement("div");
    modal.className = "editor-modal";

    // Drag bar
    let dragBar = document.createElement("div");
    dragBar.className = "editor-dragbar";
    let dragTitle = document.createElement("span");
    dragTitle.textContent = `Editing: ${filename}`;
    dragTitle.className = "editor-title";
    let closeBtn = document.createElement("button");
    closeBtn.textContent = "✖";
    closeBtn.title = "Cancel (Esc)";
    closeBtn.className = "editor-close-btn";
    dragBar.append(dragTitle, closeBtn);

    // --- Toolbar and controls ---
    // Toolbar
    let toolbar = document.createElement("div");
    toolbar.className = "editor-toolbar";

    // Tool buttons
    let toolBrush = document.createElement("button");
    toolBrush.innerHTML = "🖌️";
    toolBrush.title = "Brush (B)";
    let toolPick = document.createElement("button");
    toolPick.innerHTML = "🎯";
    toolPick.title = "Eyedropper (E)";
    let toolPan = document.createElement("button");
    toolPan.innerHTML = "✋";
    toolPan.title = "Pan/Move (Space)";
    [toolBrush, toolPick, toolPan].forEach(
      (btn) => (btn.className = "editor-tool-btn")
    );

    // Color input
    let colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = "#ffffff";
    colorInput.title = "Brush Color";
    colorInput.className = "editor-color";

    // Brush size
    let sizeInput = document.createElement("input");
    sizeInput.type = "number";
    sizeInput.value = 1;
    sizeInput.min = 1;
    sizeInput.max = 8;
    sizeInput.className = "editor-size";
    sizeInput.title = "Brush Size (1-8)";
    let sizeLabel = document.createElement("span");
    sizeLabel.textContent = "Size";
    sizeLabel.className = "editor-size-label";

    // Zoom controls
    let zoomOutBtn = document.createElement("button");
    zoomOutBtn.textContent = "−";
    zoomOutBtn.title = "Zoom Out (-)";
    let zoomInBtn = document.createElement("button");
    zoomInBtn.textContent = "+";
    zoomInBtn.title = "Zoom In (+)";
    let fitBtn = document.createElement("button");
    fitBtn.textContent = "⤢";
    fitBtn.title = "Fit to Screen";
    [zoomOutBtn, zoomInBtn, fitBtn].forEach(
      (btn) => (btn.className = "editor-zoom-btn")
    );

    // Tool/zoom status
    let status = document.createElement("span");
    status.className = "editor-status";

    // Save/cancel
    let saveBtn = document.createElement("button");
    saveBtn.textContent = "💾 Save (S)";
    saveBtn.className = "editor-save-btn";
    let cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel (Esc)";
    cancelBtn.className = "editor-cancel-btn";

    // Save as new pack (export)
    let savePackBtn = document.createElement("button");
    savePackBtn.textContent = "⬇️ Save As New Pack";
    savePackBtn.className = "editor-savepack-btn";
    savePackBtn.title = "Download the full texture pack with your edits";

    // Help/hint
    let help = document.createElement("div");
    help.className = "editor-help";
    help.innerHTML = `
      <b>Tips:</b> Draw: <b>B</b>, Eyedropper: <b>E</b>, Pan: <b>Space</b>, Zoom: <b>+/-</b>, Save: <b>S</b>, Cancel: <b>Esc</b><br>
      Right-click or use Eyedropper to pick color. Drag with Pan tool or Space.`;

    // Compose toolbar
    toolbar.append(
      toolBrush,
      toolPick,
      toolPan,
      colorInput,
      sizeLabel,
      sizeInput,
      zoomOutBtn,
      zoomInBtn,
      fitBtn,
      status,
      saveBtn,
      cancelBtn,
      savePackBtn
    );

    // --- Canvas and grid overlay ---
    // Canvas container (for pan/zoom)
    let canvasWrap = document.createElement("div");
    canvasWrap.className = "editor-canvas-wrap";
    canvasWrap.style.position = "relative";
    canvasWrap.style.overflow = "auto";
    canvasWrap.style.width = "480px";
    canvasWrap.style.height = "480px";

    // Canvas
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    canvas.className = "editor-canvas";
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvasWrap.appendChild(canvas);

    // Pixel grid overlay
    let gridCanvas = document.createElement("canvas");
    gridCanvas.className = "editor-grid-canvas";
    gridCanvas.style.position = "absolute";
    gridCanvas.style.left = "0";
    gridCanvas.style.top = "0";
    gridCanvas.style.pointerEvents = "none";
    canvasWrap.appendChild(gridCanvas);

    // --- State and tool switching ---
    // State
    let tool = "brush"; // brush, pick, pan
    let zoom = 1;
    let minZoom = 1,
      maxZoom = 32;
    let panX = 0,
      panY = 0;
    let dragging = false,
      dragStart = null;
    let drawing = false;
    let imgW = 0,
      imgH = 0;

    // Tool switching
    function setTool(t) {
      tool = t;
      [toolBrush, toolPick, toolPan].forEach((btn) =>
        btn.classList.remove("active")
      );
      if (t === "brush") toolBrush.classList.add("active");
      if (t === "pick") toolPick.classList.add("active");
      if (t === "pan") toolPan.classList.add("active");
      canvas.style.cursor =
        t === "brush" ? "crosshair" : t === "pick" ? "cell" : "grab";
      updateStatus();
    }
    toolBrush.onclick = () => setTool("brush");
    toolPick.onclick = () => setTool("pick");
    toolPan.onclick = () => setTool("pan");

    // --- Zoom and grid drawing ---
    // Zoom
    function setZoom(z, fit = false) {
      zoom = Math.max(minZoom, Math.min(maxZoom, z));
      canvas.style.transform = `scale(${zoom})`;
      gridCanvas.style.transform = `scale(${zoom})`;
      canvas.style.transformOrigin = "top left";
      gridCanvas.style.transformOrigin = "top left";
      canvasWrap.scrollLeft = panX;
      canvasWrap.scrollTop = panY;
      gridCanvas.width = imgW;
      gridCanvas.height = imgH;
      gridCanvas.style.width = canvas.style.width = imgW + "px";
      gridCanvas.style.height = canvas.style.height = imgH + "px";
      if (fit) {
        let viewW = canvasWrap.clientWidth,
          viewH = canvasWrap.clientHeight;
        let scaledW = imgW * zoom,
          scaledH = imgH * zoom;
        panX = Math.max(0, (scaledW - viewW) / 2);
        panY = Math.max(0, (scaledH - viewH) / 2);
        canvasWrap.scrollLeft = panX;
        canvasWrap.scrollTop = panY;
      }
      drawGrid();
      updateStatus();
    }
    zoomInBtn.onclick = () => setZoom(zoom + 1);
    zoomOutBtn.onclick = () => setZoom(zoom - 1);
    fitBtn.onclick = () => {
      let scale = Math.floor(
        Math.min(
          (canvasWrap.clientWidth - 8) / imgW,
          (canvasWrap.clientHeight - 8) / imgH,
          maxZoom
        )
      );
      setZoom(Math.max(1, scale), true);
    };

    // Draw pixel grid overlay
    function drawGrid() {
      let gctx = gridCanvas.getContext("2d");
      gctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
      if (zoom < 4) return;
      gctx.save();
      gctx.strokeStyle = "#4e5c2e88";
      gctx.lineWidth = 1 / zoom;
      for (let x = 1; x < imgW; ++x) {
        gctx.beginPath();
        gctx.moveTo(x, 0);
        gctx.lineTo(x, imgH);
        gctx.stroke();
      }
      for (let y = 1; y < imgH; ++y) {
        gctx.beginPath();
        gctx.moveTo(0, y);
        gctx.lineTo(imgW, y);
        gctx.stroke();
      }
      gctx.restore();
    }

    // --- Load image and fit to view ---
    // Load image
    let img = new window.Image();
    img.onload = () => {
      imgW = img.width;
      imgH = img.height;
      canvas.width = imgW;
      canvas.height = imgH;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
      setZoom(Math.max(8, Math.floor(320 / imgW)));
      fitBtn.onclick();
    };
    img.src = URL.createObjectURL(blob);

    // --- Drawing and color picking logic ---
    // Drawing logic
    function getPos(e) {
      // Calculate mouse/touch position
      let wrapRect = canvasWrap.getBoundingClientRect();
      let scrollLeft = canvasWrap.scrollLeft;
      let scrollTop = canvasWrap.scrollTop;
      let clientX = e.touches ? e.touches[0].clientX : e.clientX;
      let clientY = e.touches ? e.touches[0].clientY : e.clientY;
      let px = (clientX - wrapRect.left + scrollLeft) / zoom;
      let py = (clientY - wrapRect.top + scrollTop) / zoom;
      let x = Math.floor(px);
      let y = Math.floor(py);
      // Clamp to image bounds
      x = Math.max(0, Math.min(imgW - 1, x));
      y = Math.max(0, Math.min(imgH - 1, y));
      return { x, y };
    }
    function drawAt(e) {
      let { x, y } = getPos(e);
      let sz = parseInt(sizeInput.value) || 1;
      ctx.fillStyle = colorInput.value;
      ctx.fillRect(x - Math.floor(sz / 2), y - Math.floor(sz / 2), sz, sz);
      drawGrid();
    }
    function pickAt(e) {
      let { x, y } = getPos(e);
      let data = ctx.getImageData(x, y, 1, 1).data;
      colorInput.value =
        "#" +
        [0, 1, 2].map((i) => data[i].toString(16).padStart(2, "0")).join("");
      setTool("brush");
    }

    // --- Mouse/touch events for drawing and panning ---
    // Mouse/touch events
    canvas.addEventListener("mousedown", (e) => {
      if (tool === "brush" && e.button === 0) {
        drawing = true;
        drawAt(e);
      } else if (tool === "pick" || (tool === "brush" && e.button === 2)) {
        pickAt(e);
      } else if (tool === "pan" && e.button === 0) {
        dragging = true;
        dragStart = {
          x: e.clientX,
          y: e.clientY,
          sx: canvasWrap.scrollLeft,
          sy: canvasWrap.scrollTop,
        };
        canvas.style.cursor = "grabbing";
      }
    });
    canvas.addEventListener("mousemove", (e) => {
      if (drawing && tool === "brush") drawAt(e);
      if (dragging && tool === "pan") {
        let dx = e.clientX - dragStart.x,
          dy = e.clientY - dragStart.y;
        canvasWrap.scrollLeft = dragStart.sx - dx;
        canvasWrap.scrollTop = dragStart.sy - dy;
      }
    });
    canvas.addEventListener("mouseup", () => {
      drawing = false;
      dragging = false;
      canvas.style.cursor = tool === "pan" ? "grab" : "crosshair";
    });
    canvas.addEventListener("mouseleave", () => {
      drawing = false;
      dragging = false;
    });
    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      pickAt(e);
    });

    // Touch support
    canvas.addEventListener("touchstart", (e) => {
      if (tool === "brush") {
        drawing = true;
        drawAt(e);
      } else if (tool === "pick") {
        pickAt(e);
      } else if (tool === "pan") {
        dragging = true;
        dragStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          sx: canvasWrap.scrollLeft,
          sy: canvasWrap.scrollTop,
        };
      }
      e.preventDefault();
    });
    canvas.addEventListener("touchmove", (e) => {
      if (drawing && tool === "brush") drawAt(e);
      if (dragging && tool === "pan") {
        let dx = e.touches[0].clientX - dragStart.x,
          dy = e.touches[0].clientY - dragStart.y;
        canvasWrap.scrollLeft = dragStart.sx - dx;
        canvasWrap.scrollTop = dragStart.sy - dy;
      }
      e.preventDefault();
    });
    canvas.addEventListener("touchend", () => {
      drawing = false;
      dragging = false;
    });

    // --- Save/cancel/export logic ---
    // Save/cancel
    saveBtn.onclick = () => {
      canvas.toBlob((outBlob) => {
        cleanup();
        resolve(outBlob);
      }, "image/png");
    };
    cancelBtn.onclick = closeBtn.onclick = () => {
      cleanup();
      resolve(null);
    };

    // Save as new pack (export)
    savePackBtn.onclick = async () => {
      // Find the global loadedZip (assumes main.js exposes it)
      let zip = window.loadedZip;
      if (!zip) {
        alert("No texture pack loaded.");
        return;
      }
      // Replace the file in zip
      canvas.toBlob(async (outBlob) => {
        zip.file(filename, outBlob);
        let newBlob = await zip.generateAsync({ type: "blob" });
        let url = URL.createObjectURL(newBlob);
        let a = document.createElement("a");
        a.href = url;
        a.download = `edited_texture_pack.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }, "image/png");
    };

    // --- Keyboard shortcuts ---
    // Keyboard shortcuts
    overlay.tabIndex = 0;
    overlay.onkeydown = (e) => {
      if (e.key === "b" || e.key === "B") setTool("brush");
      else if (e.key === "e" || e.key === "E") setTool("pick");
      else if (e.key === " " || e.key === "Spacebar") setTool("pan");
      else if (e.key === "+" || e.key === "=") setZoom(zoom + 1);
      else if (e.key === "-" || e.key === "_") setZoom(zoom - 1);
      else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        saveBtn.onclick();
      } else if (e.key === "Escape") cancelBtn.onclick();
    };

    // --- Modal drag logic ---
    // Modal drag logic
    let isDraggingModal = false,
      dragOffset = { x: 0, y: 0 };
    dragBar.onmousedown = (e) => {
      isDraggingModal = true;
      dragOffset.x = e.clientX - modal.offsetLeft;
      dragOffset.y = e.clientY - modal.offsetTop;
      modal.style.position = "fixed";
      document.body.style.userSelect = "none";
    };
    document.addEventListener("mousemove", (e) => {
      if (isDraggingModal) {
        modal.style.left = e.clientX - dragOffset.x + "px";
        modal.style.top = e.clientY - dragOffset.y + "px";
      }
    });
    document.addEventListener("mouseup", () => {
      isDraggingModal = false;
      document.body.style.userSelect = "";
    });

    // --- Compose and cleanup ---
    // Compose modal
    modal.append(dragBar, toolbar, canvasWrap, help);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    overlay.focus();

    function cleanup() {
      document.body.removeChild(overlay);
      URL.revokeObjectURL(img.src);
    }
  });
}