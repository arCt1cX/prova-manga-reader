// main.js

// --- App State ---
const state = {
  mangaLibrary: [], // [{title, site, lastChapter, chapterUrl}]
  vocabulary: [], // [{word, reading, meaning, timestamp}]
  currentManga: null,
  currentChapter: null,
  japaneseReaderMode: false,
};

// --- Storage Helpers ---
function loadLibrary() {
  const data = localStorage.getItem('mangaLibrary');
  state.mangaLibrary = data ? JSON.parse(data) : [];
}
function saveLibrary() {
  localStorage.setItem('mangaLibrary', JSON.stringify(state.mangaLibrary));
}
function loadVocabulary() {
  // TODO: Load vocabulary from localStorage
}
function saveVocabulary() {
  // TODO: Save vocabulary to localStorage
}

// --- Manga Library Management ---
function renderLibrary() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <h1>Manga Library</h1>
    <form id="add-manga-form">
      <input type="text" id="manga-title" placeholder="Title" required />
      <input type="text" id="manga-site" placeholder="Source Site" required />
      <input type="text" id="manga-chapter-url" placeholder="Chapter URL" required />
      <button type="submit">Add Manga</button>
    </form>
    <ul id="manga-list">
      ${state.mangaLibrary.length === 0 ? '<li>No manga in your library yet. Add one above!</li>' :
        state.mangaLibrary.map((manga, idx) => `
        <li>
          <strong>${manga.title}</strong> <em>(${manga.site})</em><br>
          Last Chapter: <input type="text" value="${manga.lastChapter || ''}" data-idx="${idx}" class="update-chapter" style="width: 120px;" />
          <button data-idx="${idx}" class="remove-manga">Remove</button>
          <button data-idx="${idx}" class="open-reader">Read</button>
        </li>
      `).join('')}
    </ul>
    <div id="library-error" style="color:red;"></div>
  `;

  // Add manga event
  document.getElementById('add-manga-form').onsubmit = function(e) {
    e.preventDefault();
    const title = document.getElementById('manga-title').value.trim();
    const site = document.getElementById('manga-site').value.trim();
    const chapterUrl = document.getElementById('manga-chapter-url').value.trim();
    const errorDiv = document.getElementById('library-error');
    // Prevent duplicate manga (by title and site)
    if (state.mangaLibrary.some(m => m.title === title && m.site === site)) {
      errorDiv.textContent = 'This manga already exists in your library.';
      return;
    }
    if (title && site && chapterUrl) {
      addManga({ title, site, lastChapter: chapterUrl, chapterUrl });
      this.reset();
      errorDiv.textContent = '';
    }
  };

  // Remove manga event
  document.querySelectorAll('.remove-manga').forEach(btn => {
    btn.onclick = function() {
      const idx = this.getAttribute('data-idx');
      removeManga(Number(idx));
    };
  });

  // Update last chapter event
  document.querySelectorAll('.update-chapter').forEach(input => {
    input.onchange = function() {
      const idx = this.getAttribute('data-idx');
      updateLastChapter(Number(idx), this.value);
    };
  });

  // Open reader event
  document.querySelectorAll('.open-reader').forEach(btn => {
    btn.onclick = function() {
      const idx = this.getAttribute('data-idx');
      openReader(state.mangaLibrary[idx]);
    };
  });
}
function addManga(manga) {
  state.mangaLibrary.push(manga);
  saveLibrary();
  renderLibrary();
}
function removeManga(idx) {
  state.mangaLibrary.splice(idx, 1);
  saveLibrary();
  renderLibrary();
}
function updateLastChapter(idx, chapterUrl) {
  if (state.mangaLibrary[idx]) {
    state.mangaLibrary[idx].lastChapter = chapterUrl;
    state.mangaLibrary[idx].chapterUrl = chapterUrl;
    saveLibrary();
    renderLibrary();
  }
}

// --- Reader Mode ---
function openReader(manga) {
  state.currentManga = manga;
  state.currentChapter = manga.chapterUrl;
  renderReader();
}

async function renderReader() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <button id="back-to-library">← Back to Library</button>
    <h2>${state.currentManga.title} <span style="font-size:0.8em;">(${state.currentManga.site})</span></h2>
    <div id="chapter-controls">
      <button id="prev-chapter">Previous Chapter</button>
      <button id="next-chapter">Next Chapter</button>
    </div>
    <div id="reader-images" style="margin-top:1em;"></div>
    <div id="reader-error" style="color:red;"></div>
  `;

  document.getElementById('back-to-library').onclick = () => {
    state.currentManga = null;
    state.currentChapter = null;
    renderLibrary();
  };
  document.getElementById('prev-chapter').onclick = () => {
    goToPrevChapter();
  };
  document.getElementById('next-chapter').onclick = () => {
    goToNextChapter();
  };

  // Load images from chapter URL
  let images = [];
  let errorMsg = '';
  try {
    images = await extractImagesFromChapter(state.currentChapter, state.currentManga.site);
  } catch (e) {
    errorMsg = 'Failed to load images. (Possible CORS/network error)';
  }
  const imagesDiv = document.getElementById('reader-images');
  const errorDiv = document.getElementById('reader-error');
  if (images.length === 0) {
    imagesDiv.innerHTML = '<p>No images found or site not supported yet.</p>';
    if (errorMsg) errorDiv.textContent = errorMsg;
  } else {
    imagesDiv.innerHTML = images.map(src => `<img src="${src}" loading="lazy" />`).join('');
    errorDiv.textContent = '';
  }
}

async function extractImagesFromChapter(url, site) {
  // Use a public CORS proxy for all requests
  const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  try {
    const resp = await fetch(proxiedUrl);
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Heuristic: get all images inside the main content
    let imgs = Array.from(doc.querySelectorAll('img'));
    // Filter out likely ads/thumbnails by size or class
    imgs = imgs.filter(img => {
      const w = img.width || parseInt(img.getAttribute('width')) || 0;
      const h = img.height || parseInt(img.getAttribute('height')) || 0;
      const src = img.src || img.getAttribute('src') || '';
      return w > 200 && h > 200 && !/ad|banner|thumb|logo/i.test(src);
    });
    return imgs.map(img => img.src || img.getAttribute('src'));
  } catch (e) {
    return [];
  }
}

function goToNextChapter() {
  // TODO: Implement next chapter navigation (requires chapter list or parsing next link)
  alert('Next chapter navigation not implemented yet.');
}
function goToPrevChapter() {
  // TODO: Implement previous chapter navigation (requires chapter list or parsing prev link)
  alert('Previous chapter navigation not implemented yet.');
}

// --- Japanese Reader Mode ---
function toggleJapaneseReaderMode() {
  // TODO: Toggle Japanese reader mode
}
function handleImageClick(event) {
  // TODO: OCR on clicked region, show popup with word/phrase info
}

// --- OCR Integration (Tesseract.js) ---
async function performOCR(imageUrl) {
  // TODO: Use Tesseract.js to extract text and positions from image
}

// --- Kuromoji.js Integration ---
function tokenizeJapanese(text) {
  // TODO: Use Kuromoji.js to segment Japanese text
}

// --- Jisho API Integration ---
async function fetchJishoData(word) {
  // TODO: Fetch word data from Jisho API
}

// --- DeepL API Integration ---
async function translateWithDeepL(text) {
  // TODO: Translate text using DeepL API Free
}

// --- Vocabulary List ---
function renderVocabularyList() {
  // TODO: Render saved vocabulary list
}
function addWordToVocabulary(wordData) {
  // TODO: Add word to vocabulary and save
}
function removeWordFromVocabulary(word) {
  // TODO: Remove word from vocabulary
}

// --- App Initialization ---
function init() {
  loadLibrary();
  renderLibrary();
  // TODO: Load other state, set up event listeners for other features
}

document.addEventListener('DOMContentLoaded', init); 