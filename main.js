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
  if (/mangaworld\.cx/.test(url)) {
    // MangaWorld: extract images from the main manga container
    const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    try {
      const resp = await fetch(proxiedUrl);
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // Images are inside a container with class 'chapter-content' or similar
      let container = doc.querySelector('.chapter-content, .container-chapter-reader, .reader-area, .chapter-container');
      if (!container) container = doc.body;
      let imgs = Array.from(container.querySelectorAll('img'));
      imgs = imgs.filter(img => {
        const src = img.src || img.getAttribute('src') || '';
        return src && !/logo|banner|ad|thumb/i.test(src);
      });
      return imgs.map(img => img.src || img.getAttribute('src'));
    } catch (e) {
      return [];
    }
  } else if (/comick\.io/.test(url)) {
    // Comick: extract image URLs from JSON in the HTML
    const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    try {
      const resp = await fetch(proxiedUrl);
      const html = await resp.text();
      let imageUrls = [];
      // Try to find <script id="__NEXT_DATA__"> JSON blob
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (nextDataMatch) {
        try {
          const nextData = JSON.parse(nextDataMatch[1]);
          // Traverse the object to find an array of image URLs
          let pages = null;
          // Try to find pages in the JSON structure
          if (nextData.props && nextData.props.pageProps && nextData.props.pageProps.pages) {
            pages = nextData.props.pageProps.pages;
          }
          if (pages && Array.isArray(pages)) {
            imageUrls = pages.map(p => p.url || p.image_url || p.image || p.src).filter(Boolean);
          }
        } catch (e) { console.log('NEXT_DATA parse error', e); }
      }
      // Fallback: try to find window.__NUXT__
      if (imageUrls.length === 0) {
        const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{.*?\});/s);
        if (nuxtMatch) {
          try {
            const nuxtData = JSON.parse(nuxtMatch[1]);
            let pages = null;
            if (nuxtData.data && Array.isArray(nuxtData.data)) {
              for (const d of nuxtData.data) {
                if (d && d.pages && Array.isArray(d.pages)) {
                  pages = d.pages;
                  break;
                }
              }
            }
            if (pages) {
              imageUrls = pages.map(p => p.url || p.image || p.src).filter(Boolean);
            }
          } catch (e) { console.log('NUXT parse error', e); }
        }
      }
      // Fallback: try to find <img> tags
      if (imageUrls.length === 0) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        let imgs = Array.from(doc.querySelectorAll('img'));
        imgs = imgs.filter(img => {
          const src = img.src || img.getAttribute('src') || '';
          return src && !/logo|banner|ad|thumb/i.test(src);
        });
        imageUrls = imgs.map(img => img.src || img.getAttribute('src'));
      }
      if (imageUrls.length === 0) {
        console.log('No images found for Comick', {url, html});
      }
      return imageUrls;
    } catch (e) {
      console.log('Comick fetch/parse error', e);
      return [];
    }
  } else {
    // Not supported
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