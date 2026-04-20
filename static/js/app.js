/* ── CineScout App JS ─────────────────────────────────── */

// ── Ambient Animations ─────────────────────────────────

function initPetals() {
  const container = document.getElementById('petalBg');
  const petals = ['🌸', '🌺', '✿', '❀', '✦', '·'];
  for (let i = 0; i < 18; i++) {
    const el = document.createElement('div');
    el.className = 'petal';
    el.textContent = petals[Math.floor(Math.random() * petals.length)];
    el.style.cssText = `
      left: ${Math.random() * 100}vw;
      font-size: ${10 + Math.random() * 18}px;
      animation-duration: ${8 + Math.random() * 12}s;
      animation-delay: ${-Math.random() * 15}s;
      opacity: ${0.2 + Math.random() * 0.5};
    `;
    container.appendChild(el);
  }
}

function initParticles() {
  const container = document.getElementById('particles');
  const colors = ['#F2AEBC', '#5A86CB', '#6C0820', '#F2DCDB', '#3D5D91'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.style.cssText = `
      left: ${Math.random() * 100}vw;
      top: ${Math.random() * 100}vh;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${1 + Math.random() * 3}px;
      height: ${1 + Math.random() * 3}px;
      animation-duration: ${10 + Math.random() * 20}s;
      animation-delay: ${-Math.random() * 20}s;
      opacity: ${0.1 + Math.random() * 0.4};
    `;
    container.appendChild(el);
  }
}

// Mouse-reactive card glow
function initCardGlow() {
  document.addEventListener('mousemove', (e) => {
    document.querySelectorAll('.movie-card').forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mx', x + '%');
      card.style.setProperty('--my', y + '%');
    });
  });
}

// ── State ──────────────────────────────────────────────

let currentMode = 'movie';
let selectedGenres = [];
let selectedModel = 'rf';
let resultCount = 6;
let lastResults = [];

// ── Mode Tabs ──────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    currentMode = mode;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('mode-' + mode).classList.add('active');
    // scroll to search
    document.getElementById('searchSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

// ── Count Buttons ──────────────────────────────────────

document.querySelectorAll('.cnt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cnt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    resultCount = parseInt(btn.dataset.n);
  });
});

// ── Model Toggle ───────────────────────────────────────

document.querySelectorAll('.model-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.model-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedModel = btn.dataset.model;
  });
});

// ── Vibe Chips ─────────────────────────────────────────

document.querySelectorAll('.vibe-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.getElementById('vibeInput').value = chip.dataset.vibe;
  });
});

// ── Genre Cloud ─────────────────────────────────────────

document.querySelectorAll('.genre-tag').forEach(tag => {
  tag.addEventListener('click', () => {
    const genre = tag.dataset.genre;
    if (selectedGenres.includes(genre)) {
      selectedGenres = selectedGenres.filter(g => g !== genre);
      tag.classList.remove('selected');
    } else {
      selectedGenres.push(genre);
      tag.classList.add('selected');
    }
    renderSelectedGenres();
  });
});

function renderSelectedGenres() {
  const container = document.getElementById('selectedGenres');
  if (selectedGenres.length === 0) {
    container.innerHTML = '<span class="no-sel">No genres selected yet</span>';
    return;
  }
  container.innerHTML = selectedGenres.map(g => `
    <div class="sel-tag">
      ${g}
      <button onclick="removeGenre('${g}')">×</button>
    </div>
  `).join('');
}

window.removeGenre = function(genre) {
  selectedGenres = selectedGenres.filter(g => g !== genre);
  document.querySelector(`.genre-tag[data-genre="${genre}"]`).classList.remove('selected');
  renderSelectedGenres();
};

// ── Autocomplete ────────────────────────────────────────

let acTimeout;
const movieInput = document.getElementById('movieInput');
const autocompleteList = document.getElementById('autocompleteList');

movieInput.addEventListener('input', () => {
  clearTimeout(acTimeout);
  const q = movieInput.value.trim();
  if (q.length < 2) { autocompleteList.innerHTML = ''; return; }
  acTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const items = await res.json();
      autocompleteList.innerHTML = items.map(m => `
        <div class="auto-item" onclick="selectMovie('${m.title.replace(/'/g, "\\'")}')">
          <span>${m.title}</span>
          <div style="display:flex;gap:12px">
            <span class="auto-year">${m.year}</span>
            <span class="auto-score">★ ${m.score}</span>
          </div>
        </div>
      `).join('');
    } catch(e) {}
  }, 300);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.input-wrap')) autocompleteList.innerHTML = '';
});

window.selectMovie = function(title) {
  movieInput.value = title;
  autocompleteList.innerHTML = '';
};

movieInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('movieBtn').click();
});
document.getElementById('vibeInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) document.getElementById('vibeBtn').click();
});

// ── API Calls ───────────────────────────────────────────

const loadingMessages = {
  movie: ['Scanning the archives...', 'Finding kindred spirits...', 'Matching cinematic DNA...'],
  vibe: ['Decoding your mood...', 'Running the ML model...', 'Analysing film corpus...'],
  genre: ['Curating your collection...', 'Filtering 5000 films...', 'Ranking by match...']
};

let loadMsgInterval;

function showLoading(mode) {
  const overlay = document.getElementById('loadingOverlay');
  const text = document.getElementById('loadingText');
  const msgs = loadingMessages[mode] || loadingMessages.movie;
  let i = 0;
  text.textContent = msgs[0];
  overlay.style.display = 'flex';
  loadMsgInterval = setInterval(() => {
    i = (i + 1) % msgs.length;
    text.style.opacity = '0';
    setTimeout(() => { text.textContent = msgs[i]; text.style.opacity = '1'; }, 250);
  }, 1800);
}

function hideLoading() {
  clearInterval(loadMsgInterval);
  document.getElementById('loadingOverlay').style.display = 'none';
}

// Movie recommendation
document.getElementById('movieBtn').addEventListener('click', async () => {
  const title = movieInput.value.trim();
  if (!title) { shakeInput(movieInput); return; }
  showLoading('movie');
  try {
    const res = await fetch('/api/recommend/movie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, n: resultCount })
    });
    const data = await res.json();
    hideLoading();
    if (data.recommendations.length === 0) {
      showError(`No results found for "${title}". Try another title.`);
      return;
    }
    document.getElementById('insightsBar').style.display = 'none';
    document.getElementById('modelBadge').style.display = 'none';
    renderResults(data.recommendations, `Similar to <span>"${title}"</span>`, 'similarity');
  } catch(e) { hideLoading(); showError('Something went wrong. Please try again.'); }
});

// Vibe recommendation
document.getElementById('vibeBtn').addEventListener('click', async () => {
  const desc = document.getElementById('vibeInput').value.trim();
  if (!desc) { shakeInput(document.getElementById('vibeInput')); return; }
  showLoading('vibe');
  try {
    const res = await fetch('/api/recommend/vibe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: desc, model: selectedModel, n: resultCount })
    });
    const data = await res.json();
    hideLoading();
    // Show ML insights
    const insightsBar = document.getElementById('insightsBar');
    insightsBar.style.display = 'flex';
    document.getElementById('insightGenres').innerHTML =
      data.predicted_genres.map(g => `<span class="ig-pill">${g}</span>`).join('');
    document.getElementById('confidenceBars').innerHTML =
      data.predicted_genres.map((g, i) => `
        <div class="conf-bar-wrap">
          <span class="conf-label">${g}</span>
          <div class="conf-track"><div class="conf-fill" data-w="${data.confidence[i]}"></div></div>
          <span class="conf-pct">${data.confidence[i]}%</span>
        </div>
      `).join('');
    setTimeout(() => {
      document.querySelectorAll('.conf-fill').forEach(el => {
        el.style.width = el.dataset.w + '%';
      });
    }, 100);

    const badge = document.getElementById('modelBadge');
    badge.style.display = 'block';
    badge.textContent = `${data.model} · ${data.accuracy}% accuracy`;

    renderResults(data.recommendations, `Vibe Match Results`, 'similarity');
  } catch(e) { hideLoading(); showError('Something went wrong. Please try again.'); }
});

// Genre recommendation
document.getElementById('genreBtn').addEventListener('click', async () => {
  if (selectedGenres.length === 0) {
    const cloud = document.getElementById('genreCloud');
    cloud.style.animation = 'none';
    setTimeout(() => cloud.style.animation = '', 100);
    return;
  }
  showLoading('genre');
  try {
    const res = await fetch('/api/recommend/genre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genres: selectedGenres, model: selectedModel, n: resultCount })
    });
    const data = await res.json();
    hideLoading();
    document.getElementById('insightsBar').style.display = 'none';
    document.getElementById('modelBadge').style.display = 'none';
    renderResults(data.recommendations, `Top <span>${selectedGenres.join(' + ')}</span> films`, 'match');
  } catch(e) { hideLoading(); showError('Something went wrong. Please try again.'); }
});

// ── Render Results ──────────────────────────────────────

let currentView = 'grid';

document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentView = btn.dataset.view;
    const grid = document.getElementById('cardsGrid');
    grid.className = 'cards-grid' + (currentView === 'list' ? ' list-view' : '');
  });
});

function renderResults(results, title, matchKey) {
  lastResults = results;
  const section = document.getElementById('resultsSection');
  const meta = document.getElementById('resultsMeta');
  const grid = document.getElementById('cardsGrid');

  meta.innerHTML = `<span>${results.length}</span> recommendations — ${title}`;
  grid.innerHTML = '';
  grid.className = 'cards-grid' + (currentView === 'list' ? ' list-view' : '');

  results.forEach((movie, i) => {
    const card = buildCard(movie, i, matchKey);
    grid.appendChild(card);
  });

  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  initCardGlow();
}

function buildCard(movie, idx, matchKey) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.style.animationDelay = (idx * 0.06) + 's';

  const matchVal = movie[matchKey] || movie.similarity || movie.match || 0;
  const scoreWidth = (movie.score / 10) * 100;

  card.innerHTML = `
    <div class="card-top">
      <div class="card-score">
        ★ ${movie.score}
        <div class="card-score-bar">
          <div class="card-score-fill" style="width:${scoreWidth}%"></div>
        </div>
      </div>
      <span class="card-similarity">${matchVal}% match</span>
    </div>
    <div class="card-content">
      <div class="card-title">${movie.title}</div>
      <div class="card-meta">
        <span>${movie.year || '—'}</span>
        ${movie.popularity ? `<span>📈 ${movie.popularity}</span>` : ''}
      </div>
      <div class="card-genres">
        ${(movie.genres || []).slice(0, 3).map(g => `<span class="genre-pill">${g}</span>`).join('')}
      </div>
      <div class="card-overview">${movie.overview || 'No overview available.'}</div>
      ${movie.director ? `<div class="card-director">🎬 ${movie.director}</div>` : ''}
    </div>
  `;

  card.addEventListener('click', () => openModal(movie));
  return card;
}

// ── Modal ───────────────────────────────────────────────

function openModal(movie) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  const scoreWidth = (movie.score / 10) * 100;

  content.innerHTML = `
    <div class="modal-title">${movie.title}</div>
    <div class="modal-score-row">
      <div class="modal-score-big">★ ${movie.score}</div>
      <div class="card-score-bar" style="width:80px;height:6px">
        <div class="card-score-fill" style="width:${scoreWidth}%"></div>
      </div>
    </div>
    <div class="modal-genres">
      ${(movie.genres || []).map(g => `<span class="genre-pill">${g}</span>`).join('')}
    </div>
    <div class="modal-overview">${movie.overview || 'No overview available.'}</div>
    <div class="modal-details">
      ${movie.year ? `<div class="modal-detail"><div class="modal-detail-label">Year</div><div class="modal-detail-value">${movie.year}</div></div>` : ''}
      ${movie.director ? `<div class="modal-detail"><div class="modal-detail-label">Director</div><div class="modal-detail-value">${movie.director}</div></div>` : ''}
      ${movie.popularity ? `<div class="modal-detail"><div class="modal-detail-label">Popularity</div><div class="modal-detail-value">${movie.popularity}</div></div>` : ''}
      ${movie.similarity ? `<div class="modal-detail"><div class="modal-detail-label">Match Score</div><div class="modal-detail-value">${movie.similarity}%</div></div>` : ''}
      ${movie.match ? `<div class="modal-detail"><div class="modal-detail-label">Genre Match</div><div class="modal-detail-value">${movie.match}%</div></div>` : ''}
    </div>
  `;

  overlay.style.display = 'flex';
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

// ── Helpers ─────────────────────────────────────────────

function shakeInput(el) {
  el.style.animation = 'none';
  el.style.borderColor = 'rgba(242,174,188,0.6)';
  el.style.boxShadow = '0 0 0 3px rgba(242,174,188,0.15)';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  }, 1000);
}

function showError(msg) {
  const section = document.getElementById('resultsSection');
  const grid = document.getElementById('cardsGrid');
  const meta = document.getElementById('resultsMeta');
  meta.innerHTML = `<span style="color:var(--cherry-deep)">${msg}</span>`;
  grid.innerHTML = '';
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth' });
}

// ── Init ─────────────────────────────────────────────────

initPetals();
initParticles();

// Intersection Observer for card animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.style.opacity = '1';
  });
}, { threshold: 0.1 });

// Nav scroll effect
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.nav');
  if (window.scrollY > 80) nav.style.background = 'rgba(13,5,8,0.9)';
  else nav.style.background = 'rgba(13,5,8,0.6)';
});
