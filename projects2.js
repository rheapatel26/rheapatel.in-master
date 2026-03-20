/**
 * ═══════════════════════════════════════════════════
 *  RHEA'S DESKTOP · projects2.js
 *  Retro 90s OS-style portfolio experience
 *  Vanilla JS — no dependencies
 * ═══════════════════════════════════════════════════
 *
 *  ╔══════════════════════════════════════════╗
 *  ║ TO ADD A NEW PROJECT:                    ║
 *  ║  1. Add an entry to the PROJECTS array   ║
 *  ║  2. Give it name, tag, desc, icon, urls  ║
 *  ║  That's it! A new folder appears.        ║
 *  ╚══════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════
// 1. PROJECT DATA — Edit this array to add projects
// ═══════════════════════════════════════════════════
const PROJECTS = [
  {
    id: 'ppt-builder',
    name: 'PPT Builder',
    tag: 'AI TOOL',
    desc: 'AI-powered presentation builder — upload data, query charts with natural language, drag & drop, and export slides.',
    icon: '📊',
    viewUrl: 'ppt-builder.html',
    githubUrl: '#',
  },
  {
    id: 'data-dashboard',
    name: 'Data Dashboard',
    tag: 'PYTHON · REACT',
    desc: 'Real-time analytics dashboard with live chart generation from natural language queries.',
    icon: '📈',
    viewUrl: '#',
    githubUrl: '#',
  },
  {
    id: 'azure-bot',
    name: 'Azure Chat Bot',
    tag: 'CLOUD · NLP',
    desc: 'Enterprise chatbot built on Microsoft Azure Cognitive Services with intent recognition.',
    icon: '🤖',
    viewUrl: '#',
    githubUrl: '#',
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    tag: 'HTML · CSS · JS',
    desc: 'This portfolio — hand-crafted with pixel art, animations, CRT effects, and retro vibes.',
    icon: '🌐',
    viewUrl: 'index.html',
    githubUrl: '#',
  },
  {
    id: 'chat-app',
    name: 'MERN Chat App',
    tag: 'MERN STACK',
    desc: 'Full-stack real-time messaging app with Socket.io, Express, React, and MongoDB.',
    icon: '💬',
    viewUrl: '#',
    githubUrl: '#',
  },
  {
    id: 'readme',
    name: 'README.txt',
    tag: 'ABOUT',
    desc: 'Hi! I\'m Rhea Patel — an engineering student passionate about AI/ML, full-stack dev, and building creative solutions.',
    icon: '📄',
    viewUrl: 'index.html',
    githubUrl: '#',
    isReadme: true,
  },
];

// ═══════════════════════════════════════════════════
// 2. STATE
// ═══════════════════════════════════════════════════
let openWindows = [];        // { id, el, tabEl, minimized }
let topZIndex = 100;
let selectedIcon = null;
let startMenuOpen = false;

// ═══════════════════════════════════════════════════
// 3. BOOT SEQUENCE
// ═══════════════════════════════════════════════════
function boot() {
  const bar = document.getElementById('bootBar');
  let progress = 0;
  const steps = [15, 32, 48, 62, 78, 90, 100];
  let i = 0;
  const tick = () => {
    if (i < steps.length) {
      progress = steps[i];
      bar.style.width = progress + '%';
      i++;
      setTimeout(tick, 200 + Math.random() * 300);
    } else {
      // Done — fade out boot screen
      setTimeout(() => {
        const bootScreen = document.getElementById('bootScreen');
        bootScreen.classList.add('fade-out');
        setTimeout(() => { bootScreen.style.display = 'none'; }, 500);
      }, 300);
    }
  };
  setTimeout(tick, 400);
}

// ═══════════════════════════════════════════════════
// 4. DESKTOP ICONS
// ═══════════════════════════════════════════════════
function createDesktopIcons() {
  const container = document.getElementById('desktopIcons');
  const cols = 4;       // icons per column (vertically)
  const iconW = 90;
  const iconH = 84;

  PROJECTS.forEach((proj, i) => {
    const col = Math.floor(i / cols);
    const row = i % cols;

    const el = document.createElement('div');
    el.className = 'desktop-icon';
    el.dataset.id = proj.id;
    el.style.left = (12 + col * iconW) + 'px';
    el.style.top  = (8 + row * iconH) + 'px';

    el.innerHTML = `
      <div class="icon-img">${proj.icon}</div>
      <div class="icon-label">${proj.name}</div>
    `;

    // Single click — select
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectIcon(el);
    });

    // Double click — open window
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openWindow(proj);
    });

    container.appendChild(el);
  });
}

function selectIcon(el) {
  // Deselect previous
  document.querySelectorAll('.desktop-icon.selected').forEach(ic =>
    ic.classList.remove('selected')
  );
  el.classList.add('selected');
  selectedIcon = el.dataset.id;
}

// ═══════════════════════════════════════════════════
// 5. WINDOW MANAGER
// ═══════════════════════════════════════════════════
function openWindow(proj) {
  // If already open, focus it
  const existing = openWindows.find(w => w.id === proj.id);
  if (existing) {
    if (existing.minimized) restoreWindow(existing);
    focusWindow(existing);
    return;
  }

  const winEl = document.createElement('div');
  winEl.className = 'retro-window';
  winEl.dataset.id = proj.id;

  // Random-ish position
  const baseX = 120 + openWindows.length * 30;
  const baseY = 60 + openWindows.length * 25;
  winEl.style.left = Math.min(baseX, window.innerWidth - 400) + 'px';
  winEl.style.top  = Math.min(baseY, window.innerHeight - 350) + 'px';

  winEl.innerHTML = `
    <div class="win-titlebar" data-id="${proj.id}">
      <span>${proj.icon}</span>
      <span class="win-title-text">${proj.name}</span>
      <div class="win-btns">
        <button class="win-btn win-minimize" title="Minimize">_</button>
        <button class="win-btn win-close" title="Close">✕</button>
      </div>
    </div>
    <div class="win-body">
      <div class="win-project-icon">${proj.icon}</div>
      <div class="win-project-name">${proj.name}</div>
      <div class="win-project-tag">${proj.tag}</div>
      <div class="win-project-desc">${proj.desc}</div>
      <div class="win-project-btns">
        ${proj.viewUrl && proj.viewUrl !== '#' ?
          `<a href="${proj.viewUrl}" class="win-action-btn primary" target="_blank">View Project</a>` :
          `<span class="win-action-btn primary" style="opacity:0.5;cursor:default">Coming Soon</span>`
        }
        ${proj.githubUrl && proj.githubUrl !== '#' ?
          `<a href="${proj.githubUrl}" class="win-action-btn" target="_blank">GitHub</a>` :
          `<span class="win-action-btn" style="opacity:0.5;cursor:default">GitHub</span>`
        }
      </div>
    </div>
  `;

  // Z-index and focus
  topZIndex++;
  winEl.style.zIndex = topZIndex;

  // Event handlers
  winEl.querySelector('.win-close').addEventListener('click', () => closeWindow(proj.id));
  winEl.querySelector('.win-minimize').addEventListener('click', () => minimizeWindow(proj.id));
  winEl.addEventListener('mousedown', () => {
    const w = openWindows.find(w => w.id === proj.id);
    if (w) focusWindow(w);
  });

  // Make draggable via titlebar
  makeDraggable(winEl, winEl.querySelector('.win-titlebar'));

  document.getElementById('windowsContainer').appendChild(winEl);

  // Create taskbar tab
  const tabEl = document.createElement('div');
  tabEl.className = 'taskbar-tab active';
  tabEl.dataset.id = proj.id;
  tabEl.innerHTML = `<span>${proj.icon}</span> ${proj.name}`;
  tabEl.addEventListener('click', () => {
    const w = openWindows.find(w => w.id === proj.id);
    if (w) {
      if (w.minimized) { restoreWindow(w); }
      else { focusWindow(w); }
    }
  });
  document.getElementById('taskbarWindows').appendChild(tabEl);

  const winObj = { id: proj.id, el: winEl, tabEl, minimized: false };
  openWindows.push(winObj);
  focusWindow(winObj);
}

function closeWindow(id) {
  const idx = openWindows.findIndex(w => w.id === id);
  if (idx === -1) return;
  const w = openWindows[idx];
  w.el.remove();
  w.tabEl.remove();
  openWindows.splice(idx, 1);
}

function minimizeWindow(id) {
  const w = openWindows.find(w => w.id === id);
  if (!w) return;
  w.minimized = true;
  w.el.style.display = 'none';
  w.tabEl.classList.remove('active');
}

function restoreWindow(w) {
  w.minimized = false;
  w.el.style.display = '';
  focusWindow(w);
}

function focusWindow(w) {
  topZIndex++;
  w.el.style.zIndex = topZIndex;

  // Update all titlebars
  openWindows.forEach(ow => {
    const tb = ow.el.querySelector('.win-titlebar');
    if (ow.id === w.id) {
      tb.classList.remove('inactive');
      ow.tabEl.classList.add('active');
    } else {
      tb.classList.add('inactive');
      ow.tabEl.classList.remove('active');
    }
  });
}

// ═══════════════════════════════════════════════════
// 6. DRAGGABLE
// ═══════════════════════════════════════════════════
function makeDraggable(el, handle) {
  let isDragging = false;
  let offsetX, offsetY;

  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('.win-btn')) return; // Don't drag when clicking buttons
    isDragging = true;
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;
    el.style.transition = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;
    // Clamp to screen
    newX = Math.max(0, Math.min(newX, window.innerWidth - 80));
    newY = Math.max(0, Math.min(newY, window.innerHeight - 80));
    el.style.left = newX + 'px';
    el.style.top  = newY + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    el.style.transition = '';
  });
}

// ═══════════════════════════════════════════════════
// 7. CONTEXT MENU
// ═══════════════════════════════════════════════════
function initContextMenu() {
  const menu = document.getElementById('contextMenu');

  document.getElementById('desktop').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    menu.classList.remove('hidden');
    menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
    menu.style.top  = Math.min(e.clientY, window.innerHeight - 150) + 'px';
  });

  document.addEventListener('click', () => {
    menu.classList.add('hidden');
  });

  menu.querySelectorAll('.ctx-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const action = item.dataset.action;
      if (action === 'refresh')  location.reload();
      if (action === 'arrange')  arrangeIcons();
      if (action === 'about')    showAbout();
      if (action === 'home')     window.location.href = 'index.html';
      menu.classList.add('hidden');
    });
  });
}

function arrangeIcons() {
  const icons = document.querySelectorAll('.desktop-icon');
  const cols = 4;
  const iconW = 90, iconH = 84;
  icons.forEach((el, i) => {
    const col = Math.floor(i / cols);
    const row = i % cols;
    el.style.left = (12 + col * iconW) + 'px';
    el.style.top  = (8 + row * iconH) + 'px';
  });
}

function showAbout() {
  document.getElementById('aboutDialog').classList.remove('hidden');
}

function initAboutDialog() {
  const dialog = document.getElementById('aboutDialog');
  dialog.querySelector('.about-close').addEventListener('click', () =>
    dialog.classList.add('hidden')
  );
  dialog.querySelector('.about-ok').addEventListener('click', () =>
    dialog.classList.add('hidden')
  );
}

// ═══════════════════════════════════════════════════
// 8. START MENU
// ═══════════════════════════════════════════════════
function initStartMenu() {
  const startBtn = document.getElementById('startBtn');
  const menu = document.getElementById('startMenu');

  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenuOpen = !startMenuOpen;
    menu.classList.toggle('hidden', !startMenuOpen);
    startBtn.classList.toggle('active', startMenuOpen);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.start-menu') && !e.target.closest('.start-btn')) {
      startMenuOpen = false;
      menu.classList.add('hidden');
      startBtn.classList.remove('active');
    }
  });

  // About from start menu
  document.getElementById('menuAbout').addEventListener('click', () => {
    showAbout();
    startMenuOpen = false;
    menu.classList.add('hidden');
    startBtn.classList.remove('active');
  });
}

// ═══════════════════════════════════════════════════
// 9. CLOCK
// ═══════════════════════════════════════════════════
function initClock() {
  const el = document.getElementById('trayTime');
  const update = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    el.textContent = `${h12}:${m} ${ampm}`;
  };
  update();
  setInterval(update, 30000);
}

// ═══════════════════════════════════════════════════
// 10. DESELECT ON DESKTOP CLICK
// ═══════════════════════════════════════════════════
function initDesktopClick() {
  document.getElementById('desktop').addEventListener('click', (e) => {
    if (e.target.closest('.desktop-icon') || e.target.closest('.retro-window')) return;
    document.querySelectorAll('.desktop-icon.selected').forEach(ic =>
      ic.classList.remove('selected')
    );
    selectedIcon = null;
  });
}

// ═══════════════════════════════════════════════════
// 11. KEYBOARD — Enter to open selected, Esc to close
// ═══════════════════════════════════════════════════
function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Enter → open selected icon
    if (e.key === 'Enter' && selectedIcon) {
      const proj = PROJECTS.find(p => p.id === selectedIcon);
      if (proj) openWindow(proj);
    }
    // Escape → close topmost window
    if (e.key === 'Escape') {
      if (openWindows.length > 0) {
        const topWin = openWindows.reduce((a, b) =>
          parseInt(a.el.style.zIndex) > parseInt(b.el.style.zIndex) ? a : b
        );
        closeWindow(topWin.id);
      }
    }
  });
}

// ═══════════════════════════════════════════════════
// 12. DRAGGABLE ICONS
// ═══════════════════════════════════════════════════
function initDraggableIcons() {
  const icons = document.querySelectorAll('.desktop-icon');
  icons.forEach(icon => {
    let dragging = false;
    let startX, startY, originX, originY;

    icon.addEventListener('mousedown', (e) => {
      // Only start drag with left click
      if (e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      originX = icon.offsetLeft;
      originY = icon.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (startX === undefined) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // Only start dragging after a small threshold
      if (!dragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        dragging = true;
      }
      if (dragging) {
        icon.style.left = (originX + dx) + 'px';
        icon.style.top  = (originY + dy) + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        // Small snap delay
        dragging = false;
      }
      startX = undefined;
    });
  });
}

// ═══════════════════════════════════════════════════
// 13. FALLBACK GRID
// ═══════════════════════════════════════════════════
function buildFallbackGrid() {
  const grid = document.getElementById('fallbackGrid');
  PROJECTS.forEach(p => {
    const card = document.createElement('a');
    card.className = 'fallback-card';
    card.href = p.viewUrl || '#';
    card.target = p.viewUrl !== '#' ? '_blank' : '_self';
    card.innerHTML = `
      <div class="fb-icon">${p.icon}</div>
      <div class="fb-tag">${p.tag}</div>
      <div class="fb-name">${p.name}</div>
      <div class="fb-desc">${p.desc}</div>
    `;
    grid.appendChild(card);
  });
}

// ═══════════════════════════════════════════════════
// 14. INIT
// ═══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  boot();
  createDesktopIcons();
  initContextMenu();
  initAboutDialog();
  initStartMenu();
  initClock();
  initDesktopClick();
  initKeyboard();
  initDraggableIcons();
  buildFallbackGrid();
});
