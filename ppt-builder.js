/**
 * =============================================
 *  PPT Builder — Slide Studio
 *  Core Application Logic
 * =============================================
 */

// ============ STATE ============
const AppState = {
    excelData: null,       // { headers: [], rows: [], sheetName: '' }
    charts: [],            // [{ id, config, canvas, label }]
    slides: [createEmptySlide()],
    currentSlideIndex: 0,
    selectedElement: null,
    currentTemplate: 'corporate-blue',
    selectedChartType: 'bar',
    geminiApiKey: localStorage.getItem('gemini_api_key') || '',
    elementIdCounter: 0,
};

function createEmptySlide() {
    return { id: Date.now(), elements: [] };
}

// ============ DOM REFS ============
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
    uploadZone: $('#upload-zone'),
    fileInput: $('#file-input'),
    fileInfoContainer: $('#file-info-container'),
    dataPreviewSection: $('#data-preview-section'),
    dataPreviewHead: $('#data-preview-head'),
    dataPreviewBody: $('#data-preview-body'),
    rowCountBadge: $('#row-count-badge'),
    chartGenSection: $('#chart-gen-section'),
    chartQuery: $('#chart-query'),
    generateChartBtn: $('#generate-chart-btn'),
    chartsGallery: $('#charts-gallery'),
    chartCountBadge: $('#chart-count-badge'),
    slideCanvas: $('#slide-canvas'),
    canvasContainer: $('#canvas-container'),
    slidesStrip: $('#slides-strip'),
    slideCounter: $('#slide-counter'),
    templateSelect: $('#template-select'),
    downloadPptBtn: $('#download-ppt-btn'),
    addTextBtn: $('#add-text-btn'),
    clearSlideBtn: $('#clear-slide-btn'),
    addSlideTopbar: $('#add-slide-topbar'),
    llmChatMessages: $('#llm-chat-messages'),
    llmChatInput: $('#llm-chat-input'),
    llmSendBtn: $('#llm-send-btn'),
    apiKeyBtn: $('#api-key-btn'),
    apiKeyModal: $('#api-key-modal'),
    apiKeyInput: $('#api-key-input'),
    apiKeySave: $('#api-key-save'),
    apiKeyCancel: $('#api-key-cancel'),
    toastContainer: $('#toast-container'),
};

// ============ INIT ============
function init() {
    setupUpload();
    setupChartTypeSelector();
    setupTemplateSelector();
    setupSlideToolbar();
    setupPanelTabs();
    setupLLMChat();
    setupApiKeyModal();
    setupElementsPanel();
    setupCanvasClickAway();
    setupDownload();
    renderSlidesStrip();
    renderCurrentSlide();
}

// ============ TOAST ============
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============ FILE UPLOAD ============
function setupUpload() {
    DOM.uploadZone.addEventListener('click', () => DOM.fileInput.click());
    DOM.fileInput.addEventListener('change', handleFileSelect);

    DOM.uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.uploadZone.classList.add('drag-over');
    });
    DOM.uploadZone.addEventListener('dragleave', () => {
        DOM.uploadZone.classList.remove('drag-over');
    });
    DOM.uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.uploadZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    });
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
}

function processFile(file) {
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
    ];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        showToast('Please upload an Excel or CSV file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (json.length < 2) {
                showToast('File appears to be empty', 'error');
                return;
            }

            const headers = json[0].map(h => String(h).trim());
            const rows = json.slice(1).filter(r => r.some(cell => cell !== undefined && cell !== ''));

            AppState.excelData = { headers, rows, sheetName };
            renderFileInfo(file);
            renderDataPreview();
            DOM.chartGenSection.style.display = '';
            showToast(`Loaded ${rows.length} rows from "${sheetName}"`, 'success');
        } catch (err) {
            showToast('Error reading file: ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function renderFileInfo(file) {
    const size = file.size < 1024 ? file.size + ' B' :
        file.size < 1048576 ? (file.size / 1024).toFixed(1) + ' KB' :
            (file.size / 1048576).toFixed(1) + ' MB';

    DOM.fileInfoContainer.innerHTML = `
        <div class="file-info">
            <span class="file-info-icon">📄</span>
            <div class="file-info-text">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">${size} · ${AppState.excelData.headers.length} columns</div>
            </div>
            <button class="file-remove" id="file-remove-btn">✕</button>
        </div>
    `;
    $('#file-remove-btn').addEventListener('click', removeFile);
}

function removeFile() {
    AppState.excelData = null;
    DOM.fileInfoContainer.innerHTML = '';
    DOM.dataPreviewSection.style.display = 'none';
    DOM.chartGenSection.style.display = 'none';
    DOM.fileInput.value = '';
    showToast('File removed', 'info');
}

function renderDataPreview() {
    const { headers, rows } = AppState.excelData;
    DOM.dataPreviewSection.style.display = '';
    DOM.rowCountBadge.textContent = `${rows.length} rows`;

    DOM.dataPreviewHead.innerHTML = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;

    const previewRows = rows.slice(0, 20);
    DOM.dataPreviewBody.innerHTML = previewRows.map(row =>
        `<tr>${headers.map((_, i) => `<td>${escapeHtml(String(row[i] ?? ''))}</td>`).join('')}</tr>`
    ).join('');
}

// ============ CHART GENERATION ============
function setupChartTypeSelector() {
    $$('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.chart-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.selectedChartType = btn.dataset.type;
        });
    });

    DOM.generateChartBtn.addEventListener('click', generateChart);
    DOM.chartQuery.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') generateChart();
    });
}

function generateChart() {
    if (!AppState.excelData) {
        showToast('Upload data first', 'error');
        return;
    }

    const query = DOM.chartQuery.value.trim();
    if (!query) {
        showToast('Enter a chart query', 'error');
        return;
    }

    const { headers, rows } = AppState.excelData;
    const { xCol, yCol } = parseChartQuery(query, headers);

    if (xCol === -1 || yCol === -1) {
        showToast(`Couldn't match columns for "${query}". Try exact column names.`, 'error');
        return;
    }

    const labels = [];
    const values = [];
    const aggregated = {};

    rows.forEach(row => {
        const label = String(row[xCol] ?? 'Unknown');
        const value = parseFloat(row[yCol]) || 0;

        if (aggregated[label] !== undefined) {
            aggregated[label] += value;
        } else {
            aggregated[label] = value;
        }
    });

    Object.keys(aggregated).forEach(key => {
        labels.push(key);
        values.push(aggregated[key]);
    });

    // Limit to top 20 for readability
    if (labels.length > 20) {
        const combined = labels.map((l, i) => ({ l, v: values[i] }));
        combined.sort((a, b) => b.v - a.v);
        const top = combined.slice(0, 20);
        labels.length = 0;
        values.length = 0;
        top.forEach(item => { labels.push(item.l); values.push(item.v); });
    }

    const colors = generateColors(labels.length);
    const chartType = AppState.selectedChartType;

    const chartConfig = {
        type: chartType,
        data: {
            labels,
            datasets: [{
                label: `${headers[yCol]} by ${headers[xCol]}`,
                data: values,
                backgroundColor: chartType === 'line' || chartType === 'scatter' ? colors[0] : colors,
                borderColor: chartType === 'line' ? colors[0] : colors,
                borderWidth: chartType === 'line' ? 2 : 1,
                fill: chartType === 'line' ? false : undefined,
                tension: 0.3,
                pointRadius: chartType === 'scatter' ? 5 : 3,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: `${headers[xCol]} vs ${headers[yCol]}`,
                    color: '#e8e8ed',
                    font: { size: 10, family: 'Inter' }
                }
            },
            scales: chartType === 'pie' || chartType === 'doughnut' ? {} : {
                x: {
                    ticks: { color: '#8b8b9e', font: { size: 8 }, maxRotation: 45 },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    ticks: { color: '#8b8b9e', font: { size: 8 } },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    };

    addChartToGallery(chartConfig, `${headers[xCol]} vs ${headers[yCol]}`);
    DOM.chartQuery.value = '';
    showToast('Chart generated! Drag it to the slide.', 'success');
}

function parseChartQuery(query, headers) {
    const q = query.toLowerCase();
    let xCol = -1, yCol = -1;

    // Try "X vs Y" pattern
    const vsMatch = q.match(/(.+?)\s+(?:vs|versus|against|by|and)\s+(.+)/);
    if (vsMatch) {
        xCol = findColumnIndex(vsMatch[1].trim(), headers);
        yCol = findColumnIndex(vsMatch[2].trim(), headers);
    }

    // If only one matched, try to find the other
    if (xCol !== -1 && yCol === -1) {
        yCol = findNumericColumn(headers, AppState.excelData.rows, xCol);
    }
    if (yCol !== -1 && xCol === -1) {
        xCol = findCategoricalColumn(headers, AppState.excelData.rows, yCol);
    }

    // Fallback: scan all words in query against headers
    if (xCol === -1 && yCol === -1) {
        const words = q.split(/\s+/);
        const matches = [];
        words.forEach(word => {
            headers.forEach((h, i) => {
                if (h.toLowerCase().includes(word) && word.length > 2) {
                    matches.push(i);
                }
            });
        });
        const unique = [...new Set(matches)];
        if (unique.length >= 2) {
            xCol = unique[0];
            yCol = unique[1];
        } else if (unique.length === 1) {
            xCol = unique[0];
            yCol = findNumericColumn(headers, AppState.excelData.rows, xCol);
        }
    }

    // Last resort: first text col for X, first numeric col for Y
    if (xCol === -1 || yCol === -1) {
        xCol = xCol !== -1 ? xCol : findCategoricalColumn(headers, AppState.excelData.rows, -1);
        yCol = yCol !== -1 ? yCol : findNumericColumn(headers, AppState.excelData.rows, xCol);
    }

    return { xCol, yCol };
}

function findColumnIndex(name, headers) {
    const n = name.toLowerCase().trim();
    // Exact match first
    let idx = headers.findIndex(h => h.toLowerCase() === n);
    if (idx !== -1) return idx;
    // Partial match
    idx = headers.findIndex(h => h.toLowerCase().includes(n));
    if (idx !== -1) return idx;
    // Word match
    idx = headers.findIndex(h => n.includes(h.toLowerCase()));
    return idx;
}

function findNumericColumn(headers, rows, excludeIdx) {
    for (let i = 0; i < headers.length; i++) {
        if (i === excludeIdx) continue;
        const numCount = rows.filter(r => typeof r[i] === 'number' || !isNaN(parseFloat(r[i]))).length;
        if (numCount > rows.length * 0.5) return i;
    }
    return -1;
}

function findCategoricalColumn(headers, rows, excludeIdx) {
    for (let i = 0; i < headers.length; i++) {
        if (i === excludeIdx) continue;
        const strCount = rows.filter(r => typeof r[i] === 'string' || isNaN(parseFloat(r[i]))).length;
        if (strCount > rows.length * 0.3) return i;
    }
    return 0;
}

function generateColors(count) {
    const palette = [
        '#6366f1', '#8b5cf6', '#a78bfa', '#3b82f6', '#60a5fa',
        '#22c55e', '#4ade80', '#f59e0b', '#fbbf24', '#ef4444',
        '#f87171', '#ec4899', '#f472b6', '#14b8a6', '#2dd4bf',
        '#06b6d4', '#67e8f9', '#84cc16', '#a3e635', '#e879f9'
    ];
    return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
}

function addChartToGallery(chartConfig, label) {
    const id = 'chart-' + (++AppState.elementIdCounter);

    // Clear empty state
    if (AppState.charts.length === 0) {
        DOM.chartsGallery.innerHTML = '';
    }

    const card = document.createElement('div');
    card.className = 'chart-card';
    card.draggable = true;
    card.dataset.chartId = id;
    card.innerHTML = `
        <canvas id="${id}"></canvas>
        <div class="chart-card-label">${escapeHtml(label)}</div>
        <div class="chart-card-actions">
            <button class="chart-action-btn" data-action="add-to-slide" title="Add to slide">+</button>
            <button class="chart-action-btn" data-action="delete-chart" title="Delete">✕</button>
        </div>
    `;

    DOM.chartsGallery.appendChild(card);

    // Create chart on the small canvas
    const ctx = card.querySelector('canvas').getContext('2d');
    // Clone config for gallery (smaller, no labels)
    const galleryConfig = JSON.parse(JSON.stringify(chartConfig));
    galleryConfig.options.plugins.title.display = false;
    galleryConfig.options.animation = false;
    if (galleryConfig.options.scales?.x) galleryConfig.options.scales.x.display = false;
    if (galleryConfig.options.scales?.y) galleryConfig.options.scales.y.display = false;

    const chartInstance = new Chart(ctx, galleryConfig);

    AppState.charts.push({ id, config: chartConfig, label, instance: chartInstance });
    DOM.chartCountBadge.textContent = AppState.charts.length;

    // Drag to canvas
    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'chart', chartId: id }));
    });

    // Click to add to slide
    card.querySelector('[data-action="add-to-slide"]').addEventListener('click', () => {
        addChartToSlide(id);
    });

    // Delete chart
    card.querySelector('[data-action="delete-chart"]').addEventListener('click', () => {
        const idx = AppState.charts.findIndex(c => c.id === id);
        if (idx !== -1) {
            AppState.charts[idx].instance.destroy();
            AppState.charts.splice(idx, 1);
        }
        card.remove();
        DOM.chartCountBadge.textContent = AppState.charts.length;
        if (AppState.charts.length === 0) {
            DOM.chartsGallery.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">📉</span>
                    <span class="empty-state-text">Upload data & generate charts to see them here</span>
                </div>`;
        }
    });
}

// ============ CANVAS / SLIDE MANAGEMENT ============
function setupTemplateSelector() {
    DOM.templateSelect.addEventListener('change', () => {
        AppState.currentTemplate = DOM.templateSelect.value;
        DOM.slideCanvas.className = `slide-canvas template-${AppState.currentTemplate}`;
    });
}

function setupSlideToolbar() {
    DOM.addTextBtn.addEventListener('click', () => addTextToSlide('Double-click to edit'));
    DOM.clearSlideBtn.addEventListener('click', () => {
        getCurrentSlide().elements = [];
        renderCurrentSlide();
        showToast('Slide cleared', 'info');
    });
    DOM.addSlideTopbar.addEventListener('click', addNewSlide);
}

function getCurrentSlide() {
    return AppState.slides[AppState.currentSlideIndex];
}

function addNewSlide() {
    AppState.slides.push(createEmptySlide());
    AppState.currentSlideIndex = AppState.slides.length - 1;
    renderSlidesStrip();
    renderCurrentSlide();
    showToast(`Slide ${AppState.slides.length} added`, 'success');
}

function switchSlide(index) {
    if (index >= 0 && index < AppState.slides.length) {
        AppState.currentSlideIndex = index;
        renderSlidesStrip();
        renderCurrentSlide();
    }
}

function renderSlidesStrip() {
    DOM.slidesStrip.innerHTML = '';
    AppState.slides.forEach((slide, i) => {
        const thumb = document.createElement('div');
        thumb.className = `slide-thumb ${i === AppState.currentSlideIndex ? 'active' : ''}`;
        thumb.innerHTML = `<span class="slide-thumb-number">${i + 1}</span>`;
        thumb.style.background = getTemplateColor();
        thumb.addEventListener('click', () => switchSlide(i));
        DOM.slidesStrip.appendChild(thumb);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-slide-btn';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', addNewSlide);
    DOM.slidesStrip.appendChild(addBtn);

    DOM.slideCounter.textContent = `Slide ${AppState.currentSlideIndex + 1} / ${AppState.slides.length}`;
}

function getTemplateColor() {
    const colors = {
        'corporate-blue': '#1e3a5f',
        'modern-dark': '#1a1a2e',
        'minimal-white': '#f8f9fa',
        'gradient-warm': '#ff6b6b',
        'tech-neon': '#0a0a0f'
    };
    return colors[AppState.currentTemplate] || '#1e3a5f';
}

function renderCurrentSlide() {
    // Remove existing elements
    DOM.slideCanvas.querySelectorAll('.canvas-element').forEach(el => el.remove());

    const slide = getCurrentSlide();
    slide.elements.forEach(elData => {
        renderElementOnCanvas(elData);
    });
}

function addTextToSlide(text, fontSize = 18, x = 50, y = 50, width = 300, height = 60) {
    const elData = {
        id: 'el-' + (++AppState.elementIdCounter),
        type: 'text',
        text,
        x, y, width, height,
        fontSize,
        color: AppState.currentTemplate === 'minimal-white' ? '#1a1a1a' : '#ffffff',
        fontWeight: fontSize >= 28 ? '700' : '400',
    };
    getCurrentSlide().elements.push(elData);
    renderElementOnCanvas(elData);
    return elData;
}

function addChartToSlide(chartId) {
    const chart = AppState.charts.find(c => c.id === chartId);
    if (!chart) return;

    const elData = {
        id: 'el-' + (++AppState.elementIdCounter),
        type: 'chart',
        chartId,
        chartConfig: JSON.parse(JSON.stringify(chart.config)),
        label: chart.label,
        x: 80,
        y: 60,
        width: 400,
        height: 260,
    };
    getCurrentSlide().elements.push(elData);
    renderElementOnCanvas(elData);
    showToast('Chart added to slide', 'success');
}

function renderElementOnCanvas(elData) {
    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-element';
    wrapper.dataset.elementId = elData.id;
    wrapper.style.left = elData.x + 'px';
    wrapper.style.top = elData.y + 'px';
    wrapper.style.width = elData.width + 'px';
    wrapper.style.height = elData.height + 'px';

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'canvas-element-delete';
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeElement(elData.id);
    });
    wrapper.appendChild(deleteBtn);

    // Resize handles
    ['se', 'sw', 'ne', 'nw'].forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${pos}`;
        wrapper.appendChild(handle);
    });

    if (elData.type === 'text') {
        const textDiv = document.createElement('div');
        textDiv.className = 'canvas-text-element';
        textDiv.textContent = elData.text;
        textDiv.style.fontSize = elData.fontSize + 'px';
        textDiv.style.color = elData.color;
        textDiv.style.fontWeight = elData.fontWeight;

        textDiv.addEventListener('dblclick', () => {
            textDiv.contentEditable = 'true';
            textDiv.focus();
        });
        textDiv.addEventListener('blur', () => {
            textDiv.contentEditable = 'false';
            elData.text = textDiv.textContent;
        });

        wrapper.appendChild(textDiv);
    } else if (elData.type === 'chart') {
        const chartDiv = document.createElement('div');
        chartDiv.className = 'canvas-chart-element';
        chartDiv.style.width = '100%';
        chartDiv.style.height = '100%';

        const canvas = document.createElement('canvas');
        chartDiv.appendChild(canvas);
        wrapper.appendChild(chartDiv);

        // Render chart after DOM is in place
        requestAnimationFrame(() => {
            const slideConfig = JSON.parse(JSON.stringify(elData.chartConfig));
            slideConfig.options.responsive = true;
            slideConfig.options.maintainAspectRatio = false;
            slideConfig.options.plugins.title.color = AppState.currentTemplate === 'minimal-white' ? '#1a1a1a' : '#e8e8ed';
            slideConfig.options.plugins.title.font = { size: 12, family: 'Inter', weight: '600' };
            slideConfig.options.plugins.title.display = true;
            if (slideConfig.options.scales?.x) {
                slideConfig.options.scales.x.ticks.color = AppState.currentTemplate === 'minimal-white' ? '#666' : '#8b8b9e';
                slideConfig.options.scales.x.grid.color = AppState.currentTemplate === 'minimal-white' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
            }
            if (slideConfig.options.scales?.y) {
                slideConfig.options.scales.y.ticks.color = AppState.currentTemplate === 'minimal-white' ? '#666' : '#8b8b9e';
                slideConfig.options.scales.y.grid.color = AppState.currentTemplate === 'minimal-white' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
            }

            new Chart(canvas.getContext('2d'), slideConfig);
        });
    } else if (elData.type === 'shape') {
        const shapeDiv = document.createElement('div');
        shapeDiv.style.width = '100%';
        shapeDiv.style.height = '100%';
        shapeDiv.style.background = elData.color || 'rgba(99, 102, 241, 0.3)';
        shapeDiv.style.borderRadius = '8px';
        shapeDiv.style.border = '1px solid rgba(255,255,255,0.1)';
        wrapper.appendChild(shapeDiv);
    } else if (elData.type === 'divider') {
        const dividerDiv = document.createElement('div');
        dividerDiv.style.width = '100%';
        dividerDiv.style.height = '2px';
        dividerDiv.style.background = elData.color || 'rgba(255,255,255,0.3)';
        dividerDiv.style.marginTop = (elData.height / 2) + 'px';
        wrapper.appendChild(dividerDiv);
    }

    // Selection
    wrapper.addEventListener('mousedown', (e) => {
        if (e.target.closest('.canvas-element-delete') || e.target.closest('.resize-handle')) return;
        selectElement(wrapper, elData);
        e.stopPropagation();
    });

    DOM.slideCanvas.appendChild(wrapper);

    // Setup drag & resize with interact.js
    setupInteract(wrapper, elData);
}

function selectElement(wrapper, elData) {
    $$('.canvas-element.selected').forEach(el => el.classList.remove('selected'));
    wrapper.classList.add('selected');
    AppState.selectedElement = elData;
}

function setupCanvasClickAway() {
    DOM.slideCanvas.addEventListener('mousedown', (e) => {
        if (!e.target.closest('.canvas-element')) {
            $$('.canvas-element.selected').forEach(el => el.classList.remove('selected'));
            AppState.selectedElement = null;
        }
    });

    // Drop charts on canvas
    DOM.canvasContainer.addEventListener('dragover', (e) => e.preventDefault());
    DOM.canvasContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'chart') {
                const rect = DOM.canvasContainer.getBoundingClientRect();
                const x = e.clientX - rect.left - 100;
                const y = e.clientY - rect.top - 60;

                const chart = AppState.charts.find(c => c.id === data.chartId);
                if (chart) {
                    const elData = {
                        id: 'el-' + (++AppState.elementIdCounter),
                        type: 'chart',
                        chartId: data.chartId,
                        chartConfig: JSON.parse(JSON.stringify(chart.config)),
                        label: chart.label,
                        x: Math.max(10, x),
                        y: Math.max(10, y),
                        width: 380,
                        height: 240,
                    };
                    getCurrentSlide().elements.push(elData);
                    renderElementOnCanvas(elData);
                    showToast('Chart dropped on slide', 'success');
                }
            }
        } catch (err) { /* ignore non-chart drops */ }
    });
}

function removeElement(elementId) {
    const slide = getCurrentSlide();
    slide.elements = slide.elements.filter(el => el.id !== elementId);
    const domEl = DOM.slideCanvas.querySelector(`[data-element-id="${elementId}"]`);
    if (domEl) domEl.remove();
    AppState.selectedElement = null;
}

function setupInteract(wrapper, elData) {
    interact(wrapper)
        .draggable({
            inertia: false,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            listeners: {
                move(event) {
                    const x = (parseFloat(wrapper.style.left) || 0) + event.dx;
                    const y = (parseFloat(wrapper.style.top) || 0) + event.dy;
                    wrapper.style.left = x + 'px';
                    wrapper.style.top = y + 'px';
                    elData.x = x;
                    elData.y = y;
                }
            }
        })
        .resizable({
            edges: { left: false, right: true, bottom: true, top: false },
            modifiers: [
                interact.modifiers.restrictSize({
                    min: { width: 60, height: 40 }
                })
            ],
            listeners: {
                move(event) {
                    wrapper.style.width = event.rect.width + 'px';
                    wrapper.style.height = event.rect.height + 'px';
                    elData.width = event.rect.width;
                    elData.height = event.rect.height;

                    // Re-render chart if resized
                    if (elData.type === 'chart') {
                        const canvas = wrapper.querySelector('canvas');
                        const chartInstance = Chart.getChart(canvas);
                        if (chartInstance) chartInstance.resize();
                    }
                }
            }
        });
}

// ============ PANEL TABS ============
function setupPanelTabs() {
    $$('.panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.panel-tab').forEach(t => t.classList.remove('active'));
            $$('.panel-content').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            $(`#${tab.dataset.panel}`).classList.add('active');
        });
    });
}

// ============ ELEMENTS PANEL ============
function setupElementsPanel() {
    $$('.element-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            switch (action) {
                case 'add-title':
                    addTextToSlide('Presentation Title', 32, 60, 40, 500, 50);
                    break;
                case 'add-subtitle':
                    addTextToSlide('Your subtitle here', 20, 60, 100, 400, 40);
                    break;
                case 'add-body':
                    addTextToSlide('Body text content goes here. Double-click to edit.', 14, 60, 160, 400, 80);
                    break;
                case 'add-bullet': {
                    const text = '• Point one\n• Point two\n• Point three';
                    addTextToSlide(text, 14, 60, 160, 380, 100);
                    break;
                }
                case 'add-box': {
                    const elData = {
                        id: 'el-' + (++AppState.elementIdCounter),
                        type: 'shape',
                        x: 100, y: 100, width: 200, height: 120,
                        color: 'rgba(99, 102, 241, 0.2)',
                    };
                    getCurrentSlide().elements.push(elData);
                    renderElementOnCanvas(elData);
                    break;
                }
                case 'add-divider': {
                    const elData = {
                        id: 'el-' + (++AppState.elementIdCounter),
                        type: 'divider',
                        x: 60, y: 200, width: 500, height: 20,
                        color: 'rgba(255,255,255,0.3)',
                    };
                    getCurrentSlide().elements.push(elData);
                    renderElementOnCanvas(elData);
                    break;
                }
            }
            showToast('Element added', 'success');
        });
    });
}

// ============ LLM CHAT ============
function setupLLMChat() {
    DOM.llmSendBtn.addEventListener('click', sendLLMMessage);
    DOM.llmChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendLLMMessage();
        }
    });

    // Auto-resize textarea
    DOM.llmChatInput.addEventListener('input', () => {
        DOM.llmChatInput.style.height = 'auto';
        DOM.llmChatInput.style.height = Math.min(DOM.llmChatInput.scrollHeight, 100) + 'px';
    });
}

async function sendLLMMessage() {
    const message = DOM.llmChatInput.value.trim();
    if (!message) return;

    // Add user message
    appendChatMessage(message, 'user');
    DOM.llmChatInput.value = '';
    DOM.llmChatInput.style.height = 'auto';

    // Check API key
    if (!AppState.geminiApiKey) {
        appendChatMessage('⚠️ Please set your Gemini API key first (click the 🔑 button in the top bar).', 'ai');
        return;
    }

    // Show loading
    const loadingEl = appendChatMessage('', 'ai', true);

    try {
        const dataContext = AppState.excelData
            ? `\n\nUser has uploaded an Excel file with these columns: ${AppState.excelData.headers.join(', ')}.\nSample data (first 5 rows):\n${AppState.excelData.rows.slice(0, 5).map(r => r.join(', ')).join('\n')}\nTotal rows: ${AppState.excelData.rows.length}`
            : '\n\nNo data file has been uploaded yet.';

        const systemPrompt = `You are an AI assistant for a presentation builder tool. Help users create compelling presentation content, analyze data, and suggest insights. Keep responses concise and actionable. Format key points as bullet lists.${dataContext}`;

        const response = await callGeminiAPI(systemPrompt, message);
        loadingEl.remove();
        appendChatMessage(response, 'ai', false, true);
    } catch (err) {
        loadingEl.remove();
        appendChatMessage(`❌ Error: ${err.message}`, 'ai');
    }
}

async function callGeminiAPI(systemPrompt, userMessage) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${AppState.geminiApiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: `${systemPrompt}\n\nUser: ${userMessage}` }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
            }
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error (${response.status})`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
}

function appendChatMessage(text, role, isLoading = false, showAddBtn = false) {
    const msg = document.createElement('div');
    msg.className = `chat-message chat-message-${role}`;

    if (isLoading) {
        msg.innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;
    } else {
        msg.textContent = text;
        if (showAddBtn && role === 'ai') {
            const btn = document.createElement('button');
            btn.className = 'add-to-slide-btn';
            btn.innerHTML = '📋 Add to Slide';
            btn.addEventListener('click', () => {
                addTextToSlide(text, 13, 40, 140, 550, 200);
                showToast('Content added to slide', 'success');
            });
            msg.appendChild(btn);
        }
    }

    DOM.llmChatMessages.appendChild(msg);
    DOM.llmChatMessages.scrollTop = DOM.llmChatMessages.scrollHeight;
    return msg;
}

// ============ API KEY MODAL ============
function setupApiKeyModal() {
    DOM.apiKeyBtn.addEventListener('click', () => {
        DOM.apiKeyModal.classList.add('active');
        DOM.apiKeyInput.value = AppState.geminiApiKey;
    });

    DOM.apiKeyCancel.addEventListener('click', () => {
        DOM.apiKeyModal.classList.remove('active');
    });

    DOM.apiKeySave.addEventListener('click', () => {
        const key = DOM.apiKeyInput.value.trim();
        AppState.geminiApiKey = key;
        localStorage.setItem('gemini_api_key', key);
        DOM.apiKeyModal.classList.remove('active');
        showToast(key ? 'API key saved' : 'API key cleared', 'success');
    });

    DOM.apiKeyModal.addEventListener('click', (e) => {
        if (e.target === DOM.apiKeyModal) DOM.apiKeyModal.classList.remove('active');
    });
}

// ============ PPT DOWNLOAD ============
function setupDownload() {
    DOM.downloadPptBtn.addEventListener('click', downloadPPT);
}

async function downloadPPT() {
    showToast('Generating PPT...', 'info');

    try {
        const pptx = new PptxGenJS();
        pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
        pptx.layout = 'WIDE';

        // Template color mapping for backgrounds
        const templateBgs = {
            'corporate-blue': { fill: { type: 'solid', color: '1e3a5f' } },
            'modern-dark': { fill: { type: 'solid', color: '1a1a2e' } },
            'minimal-white': { fill: { type: 'solid', color: 'FFFFFF' } },
            'gradient-warm': { fill: { type: 'solid', color: 'FF6B6B' } },
            'tech-neon': { fill: { type: 'solid', color: '0A0A0F' } },
        };

        const bgConfig = templateBgs[AppState.currentTemplate] || templateBgs['corporate-blue'];
        const textColor = AppState.currentTemplate === 'minimal-white' ? '1a1a1a' : 'FFFFFF';

        for (const slide of AppState.slides) {
            const pptSlide = pptx.addSlide();
            pptSlide.background = bgConfig;

            // Get canvas dimensions to compute relative positions
            const canvasW = DOM.canvasContainer.offsetWidth || 840;
            const canvasH = DOM.canvasContainer.offsetHeight || 472;

            for (const el of slide.elements) {
                // Convert pixel position to inches (based on 13.33" x 7.5" slide)
                const xInch = (el.x / canvasW) * 13.33;
                const yInch = (el.y / canvasH) * 7.5;
                const wInch = (el.width / canvasW) * 13.33;
                const hInch = (el.height / canvasH) * 7.5;

                if (el.type === 'text') {
                    pptSlide.addText(el.text, {
                        x: xInch,
                        y: yInch,
                        w: wInch,
                        h: hInch,
                        fontSize: el.fontSize * 0.85,
                        fontFace: 'Arial',
                        color: textColor,
                        bold: el.fontWeight === '700',
                        valign: 'top',
                        wrap: true,
                    });
                } else if (el.type === 'chart') {
                    // PptxGenJS chart
                    const config = el.chartConfig;
                    const labels = config.data.labels;
                    const values = config.data.datasets[0].data;
                    const datasetLabel = config.data.datasets[0].label || 'Data';

                    const pptChartType = {
                        bar: pptx.charts.BAR,
                        line: pptx.charts.LINE,
                        pie: pptx.charts.PIE,
                        doughnut: pptx.charts.DOUGHNUT,
                        scatter: pptx.charts.SCATTER,
                    }[config.type] || pptx.charts.BAR;

                    const chartData = [{
                        name: datasetLabel,
                        labels,
                        values,
                    }];

                    pptSlide.addChart(pptChartType, chartData, {
                        x: xInch,
                        y: yInch,
                        w: wInch,
                        h: hInch,
                        showTitle: true,
                        title: config.options.plugins.title.text || '',
                        titleColor: textColor,
                        titleFontSize: 10,
                        catAxisLabelColor: textColor,
                        valAxisLabelColor: textColor,
                        legendColor: textColor,
                        showLegend: false,
                        chartColors: config.data.datasets[0].backgroundColor instanceof Array
                            ? config.data.datasets[0].backgroundColor.map(c => c.replace('#', ''))
                            : ['6366F1'],
                    });
                } else if (el.type === 'shape') {
                    pptSlide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                        x: xInch,
                        y: yInch,
                        w: wInch,
                        h: hInch,
                        fill: { color: '6366F1', transparency: 80 },
                        rectRadius: 0.1,
                    });
                } else if (el.type === 'divider') {
                    pptSlide.addShape(pptx.shapes.LINE, {
                        x: xInch,
                        y: yInch + hInch / 2,
                        w: wInch,
                        h: 0,
                        line: { color: textColor, width: 1, transparency: 50 },
                    });
                }
            }
        }

        await pptx.writeFile({ fileName: 'SlideStudio_Presentation.pptx' });
        showToast('PPT downloaded successfully!', 'success');
    } catch (err) {
        console.error(err);
        showToast('Error generating PPT: ' + err.message, 'error');
    }
}

// ============ UTILS ============
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============ BOOT ============
document.addEventListener('DOMContentLoaded', init);
