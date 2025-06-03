import { nameMap } from '../../data/maps/nameMap.js';

// Case-insensitive file search in zip
export function findFileInsensitive(zip, searchPath) {
  const lowerSearch = searchPath.toLowerCase();
  for (let relPath in zip.files) {
    if (relPath.toLowerCase() === lowerSearch) return relPath;
  }
  return null;
}

// Split terrain.png into 16x16 tiles using nameMap, return count
export async function splitTerrainBlob(blob, zip, nameMapArg = nameMap) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = async () => {
      const tileSize = 16;
      const cols = img.width / tileSize | 0;
      const rows = img.height / tileSize | 0;
      const canvas = document.createElement("canvas");
      canvas.width = tileSize;
      canvas.height = tileSize;
      const ctx = canvas.getContext("2d");
      let count = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          ctx.clearRect(0, 0, tileSize, tileSize);
          ctx.drawImage(
            img,
            x * tileSize, y * tileSize, tileSize, tileSize,
            0, 0, tileSize, tileSize
          );
          const key = `${x}_${y}`;
          const filename = nameMapArg[key] || `block_${x}_${y}.png`;
          const filePath = `assets/minecraft/textures/block/${filename}`;
          await new Promise((res) => {
            canvas.toBlob(async (tileBlob) => {
              const arrayBuf = await tileBlob.arrayBuffer();
              zip.file(filePath, new Uint8Array(arrayBuf));
              res();
            }, "image/png");
          });
          count++;
        }
      }
      URL.revokeObjectURL(url);
      resolve(count);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    img.src = url;
  });
}

// --- PNG Browser: All PNGs, grid, search, icons, fullmode ---
export async function showPNGBrowser(zip, opts = {}) {
  // Renders a browser for all PNGs in the zip, with search and tag filter.
  // Allows editing via opts.onEdit(pngPath) if provided.

  const pngBrowser = document.getElementById('pngBrowser');
  pngBrowser.style.display = '';
  pngBrowser.innerHTML = '';

  const allPngPaths = Object.keys(zip.files).filter(p => p.toLowerCase().endsWith('.png')).sort();
  if (!allPngPaths.length) {
    pngBrowser.innerHTML = '';
    return;
  }

  // Title
  const title = document.createElement('div');
  title.className = 'png-title';
  title.textContent = 'All PNGs Browser';
  pngBrowser.appendChild(title);

  // --- Tag Feature ---
  // Collect tags from path segments (e.g. block, item, entity, gui, etc)
  const tagSet = new Set();
  for (const path of allPngPaths) {
    const match = path.match(/\/(block|item|entity|gui|environment|font|painting|particle|armor|effect|misc|mob_effect|colormap|map)\//i);
    if (match) tagSet.add(match[1].toLowerCase());
  }
  // Always add "all"
  tagSet.add('all');
  const tags = Array.from(tagSet).sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));

  // Tagbar UI
  const tagBar = document.createElement('div');
  tagBar.className = 'png-tagbar';
  pngBrowser.appendChild(tagBar);

  let selectedTag = 'all';

  function renderTags() {
    tagBar.innerHTML = '';
    for (const tag of tags) {
      const btn = document.createElement('button');
      btn.textContent = tag === 'all' ? 'All' : tag.charAt(0).toUpperCase() + tag.slice(1);
      btn.className = 'png-tag-btn' + (tag === selectedTag ? ' selected' : '');
      btn.onclick = () => {
        selectedTag = tag;
        renderTags();
        renderGrid(searchBox.value);
      };
      tagBar.appendChild(btn);
    }
  }
  renderTags();

  // Searchbox
  const searchBox = document.createElement('input');
  searchBox.type = 'text';
  searchBox.placeholder = 'Search all PNGs...';
  pngBrowser.appendChild(searchBox);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'png-grid';
  pngBrowser.appendChild(grid);

  // Preview area
  const preview = document.createElement('div');
  preview.className = 'png-preview';
  pngBrowser.appendChild(preview);

  // Fullmode overlay
  let fullOverlay = document.getElementById('pngFullOverlay');
  if (!fullOverlay) {
    fullOverlay = document.createElement('div');
    fullOverlay.id = 'pngFullOverlay';
    document.body.appendChild(fullOverlay);
  }

  function getIcon(path) {
    if (path.includes('/block/')) return '🧱';
    if (path.includes('/item/')) return '🗡️';
    if (path.includes('/entity/')) return '👾';
    if (path.includes('/gui/')) return '🖥️';
    if (path.includes('/environment/')) return '🌳';
    if (path.includes('/font/')) return '🔤';
    if (path.includes('/painting/')) return '🖼️';
    if (path.includes('/particle/')) return '✨';
    if (path.includes('/armor/')) return '🛡️';
    if (path.includes('/effect/')) return '💫';
    if (path.includes('/misc/')) return '🔹';
    if (path.includes('/mob_effect/')) return '🧪';
    if (path.includes('/colormap/')) return '🌈';
    if (path.includes('/map/')) return '🗺️';
    if (path.includes('/')) return '📁';
    return '🖼️';
  }

  async function renderGrid(filter = '') {
    grid.innerHTML = '';
    const filterLower = filter.trim().toLowerCase();
    let filtered = allPngPaths;
    // Tag filter
    if (selectedTag !== 'all') {
      const tagPattern = `/${selectedTag}/`;
      filtered = filtered.filter(path => path.toLowerCase().includes(tagPattern));
    }
    // Search filter
    if (filterLower) {
      filtered = filtered.filter(path => path.toLowerCase().includes(filterLower));
    }
    if (!filtered.length) {
      const none = document.createElement('div');
      none.textContent = 'No PNGs found.';
      none.style = 'color:#aaffaa;padding:12px;';
      grid.appendChild(none);
      return;
    }
    for (const path of filtered) {
      const file = zip.file(path);
      if (!file) continue;
      const container = document.createElement('div');
      container.className = 'png-thumb';
      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = getIcon(path);
      container.appendChild(icon);
      // Image
      const blob = await file.async('blob');
      const url = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = url;
      img.alt = path;
      img.title = path;
      img.onclick = async () => {
        const previewBlob = await file.async('blob');
        const previewUrl = URL.createObjectURL(previewBlob);
        showPngPreview(path, previewUrl);
      };
      img.ondblclick = async () => {
        const fullBlob = await file.async('blob');
        const fullUrl = URL.createObjectURL(fullBlob);
        openFullMode(path, fullUrl);
      };
      container.appendChild(img);
      // Filename
      const fname = document.createElement('div');
      fname.className = 'fname';
      fname.textContent = path.split('/').slice(-1)[0];
      container.appendChild(fname);
      // Add edit button if opts.onEdit
      if (opts.onEdit) {
        let editBtn = document.createElement('button');
        editBtn.textContent = '✎';
        editBtn.className = 'png-edit-btn';
        editBtn.title = 'Edit';
        editBtn.onclick = (e) => {
          e.stopPropagation();
          opts.onEdit(path);
        };
        container.appendChild(editBtn);
      }
      grid.appendChild(container);
    }
  }

  searchBox.addEventListener('input', () => renderGrid(searchBox.value));
  renderGrid();

  function showPngPreview(path, url) {
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = url;
    img.alt = path;
    img.onclick = () => openFullMode(path, url);
    preview.appendChild(img);
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = path;
    preview.appendChild(label);
  }

  function openFullMode(path, url) {
    fullOverlay.innerHTML = '';
    fullOverlay.style.display = 'flex';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '✖';
    closeBtn.onclick = () => {
      fullOverlay.style.display = 'none';
      if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    };
    const img = document.createElement('img');
    img.src = url;
    img.alt = path;
    // Path label
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = path;
    // Overlay content
    fullOverlay.appendChild(closeBtn);
    fullOverlay.appendChild(img);
    fullOverlay.appendChild(label);
    // Click outside to close
    fullOverlay.onclick = (e) => {
      if (e.target === fullOverlay) {
        fullOverlay.style.display = 'none';
        if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
      }
    };
  }
}