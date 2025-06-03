import { renameMap } from './data/maps/renameMap.js';
import { nameMap } from './data/maps/nameMap.js';
import { findFileInsensitive, splitTerrainBlob, showPNGBrowser } from './features/main/utils.js';
import { showPNGEditor } from './features/main/pngEditor.js';

// --- UI elements ---
const zipInput = document.getElementById('zipInput');
const dropzone = document.getElementById('dropzone');
const convertBtn = document.getElementById('convertBtn');
const progressDiv = document.getElementById('progress');
const errorDiv = document.getElementById('error');
const fileNameDiv = document.getElementById('fileName');
const summaryDiv = document.getElementById('summary');

let loadedFile = null;
let loadedZip = null;
window.loadedZip = null;

let renewedTextures = [];

// --- Drag & drop logic for ZIP input ---
dropzone.addEventListener('click', () => zipInput.click());
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault(); dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault(); dropzone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files.length) {
    zipInput.files = e.dataTransfer.files;
    handleFileInput();
  }
});
zipInput.addEventListener('change', handleFileInput);

// Handles file selection and enables convert button
function handleFileInput() {
  errorDiv.textContent = '';
  summaryDiv.style.display = 'none';
  loadedFile = zipInput.files[0];
  if (!loadedFile) {
    fileNameDiv.textContent = '';
    convertBtn.disabled = true;
    return;
  }
  fileNameDiv.textContent = `Selected: ${loadedFile.name}`;
  convertBtn.disabled = false;
}

// --- Main conversion trigger ---
convertBtn.addEventListener('click', async () => {
  errorDiv.textContent = '';
  summaryDiv.style.display = 'none';
  progressDiv.textContent = 'Loading ZIP...';
  convertBtn.disabled = true;
  try {
    await convertPack();
  } catch (e) {
    errorDiv.textContent = 'Error: ' + (e.message || e);
    progressDiv.textContent = '';
    convertBtn.disabled = false;
  }
});

// --- Main conversion logic ---
async function convertPack() {
  if (!loadedFile) {
    errorDiv.textContent = "Please select a .zip file first.";
    return;
  }
  const JSZipLib = window.JSZip;
  const zip = await JSZipLib.loadAsync(loadedFile);
  loadedZip = zip;
  window.loadedZip = zip;
  let summary = [];
  renewedTextures = [];

  // 1. Update or create pack.mcmeta for 1.21.5
  progressDiv.textContent = 'Updating pack.mcmeta...';
  let mcmetaPath = findFileInsensitive(zip, "pack.mcmeta");
  if (mcmetaPath) {
    const text = await zip.file(mcmetaPath).async("string");
    let json;
    try { json = JSON.parse(text); }
    catch { json = { pack: { description: "Converted Pack", pack_format: 47 } }; }
    json.pack = json.pack || {};
    json.pack.pack_format = 47;
    zip.file(mcmetaPath, JSON.stringify(json, null, 2));
    summary.push('Updated <code>pack.mcmeta</code> (<b>pack_format: 47</b>)');
  } else {
    const newMeta = {
      pack: { pack_format: 47, description: "Converted Pack for Minecraft 1.21.5" }
    };
    zip.file("pack.mcmeta", JSON.stringify(newMeta, null, 2));
    summary.push('Created <code>pack.mcmeta</code> (<b>pack_format: 47</b>)');
  }

  // 2. Rename known moved textures using renameMap
  progressDiv.textContent = 'Renaming known files...';
  let renamed = 0;
  for (let oldPath in renameMap) {
    const actualOld = findFileInsensitive(zip, oldPath);
    if (actualOld) {
      const data = await zip.file(actualOld).async("uint8array");
      const newPath = renameMap[oldPath];
      zip.file(newPath, data);
      zip.remove(actualOld);
      renamed++;
      renewedTextures.push(newPath);
    }
  }
  if (renamed) summary.push(`Renamed <b>${renamed}</b> known files.`);

  // 3. Split terrain.png into 16x16 blocks using nameMap
  progressDiv.textContent = 'Checking for terrain.png...';
  const possibleTerrainPaths = [
    "terrain.png", "textures/terrain.png",
    "assets/minecraft/textures/terrain.png", "textures/blocks/terrain.png"
  ];
  let terrainRelPath = null;
  for (let p of possibleTerrainPaths) {
    const found = findFileInsensitive(zip, p);
    if (found) { terrainRelPath = found; break; }
  }
  let splitCount = 0;
  if (terrainRelPath) {
    progressDiv.textContent = 'Splitting terrain.png...';
    const blob = await zip.file(terrainRelPath).async("blob");
    splitCount = await splitTerrainBlob(blob, zip, nameMap);
    zip.remove(terrainRelPath);
    summary.push(`Split <code>terrain.png</code> into <b>${splitCount}</b> blocks.`);
    // Add all split block paths to renewedTextures
    for (let key in nameMap) {
      renewedTextures.push(`assets/minecraft/textures/block/${nameMap[key]}`);
    }
  }

  // 4. Show PNG browser for preview and editing
  progressDiv.textContent = 'Generating preview...';
  await showPNGBrowser(zip, {
    onEdit: async (pngPath) => {
      // Open PNG editor modal for this file
      const file = zip.file(pngPath);
      if (!file) return;
      const blob = await file.async("blob");
      const editedBlob = await showPNGEditor(blob, pngPath);
      if (editedBlob) {
        zip.file(pngPath, editedBlob);
        await showPNGBrowser(zip, { onEdit: arguments.callee });
      }
    }
  });

  // 5. Generate and offer download of the new zip
  progressDiv.textContent = 'Packing ZIP...';
  const newBlob = await zip.generateAsync({ type: "blob" });
  progressDiv.textContent = '';
  summaryDiv.innerHTML = summary.join('<br>');
  summaryDiv.style.display = '';
  let dlBtn = document.createElement('button');
  dlBtn.textContent = 'Download Converted Pack';
  dlBtn.onclick = () => {
    const url = URL.createObjectURL(newBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted_texture_pack_1.21.5.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  summaryDiv.appendChild(document.createElement('br'));
  summaryDiv.appendChild(dlBtn);
  convertBtn.disabled = false;
}