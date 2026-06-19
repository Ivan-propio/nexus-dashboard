// Document Storage & Viewer Service
import { put, getById, remove } from './db.js';
import { openModal, closeModal } from '../app.js';
import { t } from '../i18n.js';

export async function saveDocument(parentId, file) {
    const data = await file.arrayBuffer();
    await put('documents', {
        id: parentId,
        fileName: file.name,
        fileType: file.type,
        data
    });
}

export async function getDocument(parentId) {
    return await getById('documents', parentId);
}

export async function removeDocument(parentId) {
    try { await remove('documents', parentId); } catch(e) {}
}

export async function openDocumentViewer(parentId) {
    const doc = await getDocument(parentId);
    if (!doc) return;

    const blob = new Blob([doc.data], { type: doc.fileType });
    const url = URL.createObjectURL(blob);
    const isPDF = doc.fileType === 'application/pdf';

    openModal(`
        <div class="p-0" style="width:min(95vw,1000px);height:90vh;display:flex;flex-direction:column;">
            <!-- Toolbar -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-surface-container bg-surface-container-lowest rounded-t-xl">
                <div class="flex items-center gap-3 min-w-0">
                    <span class="material-symbols-outlined text-primary text-[20px]">description</span>
                    <span class="text-sm font-semibold text-on-surface truncate max-w-[200px]">${doc.fileName}</span>
                    ${isPDF ? `<span id="doc-page-info" class="text-xs text-on-surface-variant ml-2"></span>` : ''}
                </div>
                <div class="flex items-center gap-1.5">
                    ${isPDF ? `
                        <button id="doc-prev-page" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="Previous page">
                            <span class="material-symbols-outlined text-[18px]">navigate_before</span>
                        </button>
                        <button id="doc-next-page" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="Next page">
                            <span class="material-symbols-outlined text-[18px]">navigate_next</span>
                        </button>
                        <div class="w-px h-5 bg-outline-variant mx-1"></div>
                        <button id="doc-zoom-out" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="Zoom out">
                            <span class="material-symbols-outlined text-[18px]">zoom_out</span>
                        </button>
                        <span id="doc-zoom-level" class="text-xs text-on-surface-variant w-10 text-center font-mono">100%</span>
                        <button id="doc-zoom-in" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="Zoom in">
                            <span class="material-symbols-outlined text-[18px]">zoom_in</span>
                        </button>
                        <button id="doc-zoom-fit" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="Fit to width">
                            <span class="material-symbols-outlined text-[18px]">fit_width</span>
                        </button>
                        <div class="w-px h-5 bg-outline-variant mx-1"></div>
                        <button id="doc-view-all" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="View all pages">
                            <span class="material-symbols-outlined text-[18px]">view_agenda</span>
                        </button>
                    ` : `
                        <button id="doc-zoom-out" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="Zoom out">
                            <span class="material-symbols-outlined text-[18px]">zoom_out</span>
                        </button>
                        <span id="doc-zoom-level" class="text-xs text-on-surface-variant w-10 text-center font-mono">100%</span>
                        <button id="doc-zoom-in" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="Zoom in">
                            <span class="material-symbols-outlined text-[18px]">zoom_in</span>
                        </button>
                    `}
                    <div class="w-px h-5 bg-outline-variant mx-1"></div>
                    ${isPDF ? `
                        <button id="doc-print" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="Print">
                            <span class="material-symbols-outlined text-[18px]">print</span>
                        </button>
                    ` : ''}
                    <a href="${url}" download="${doc.fileName}" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="Download">
                        <span class="material-symbols-outlined text-[18px]">download</span>
                    </a>
                    <button id="doc-viewer-close" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" title="Close">
                        <span class="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </div>
            <!-- Content -->
            <div id="doc-viewer-body" class="flex-1 overflow-auto bg-surface-container" style="min-height:0">
                ${isPDF ? '' : `<img src="${url}" id="doc-img" class="mx-auto" style="max-width:100%;transition:transform 0.15s ease" alt="${doc.fileName}">`}
            </div>
        </div>
    `);

    document.getElementById('doc-viewer-close')?.addEventListener('click', () => {
        URL.revokeObjectURL(url);
        closeModal();
    });

    if (isPDF) {
        renderPDFViewer(doc, url);
    } else {
        setupImageViewer(url);
    }
}

/* ── Image viewer with zoom ── */
function setupImageViewer(url) {
    let scale = 1;
    const img = document.getElementById('doc-img');
    const zoomLabel = document.getElementById('doc-zoom-level');

    function updateZoom() {
        if (img) img.style.transform = `scale(${scale})`;
        if (zoomLabel) zoomLabel.textContent = Math.round(scale * 100) + '%';
    }

    document.getElementById('doc-zoom-in')?.addEventListener('click', () => {
        scale = Math.min(scale + 0.25, 5);
        updateZoom();
    });
    document.getElementById('doc-zoom-out')?.addEventListener('click', () => {
        scale = Math.max(scale - 0.25, 0.25);
        updateZoom();
    });
}

/* ── PDF viewer with multi-page, zoom, navigation ── */
async function renderPDFViewer(doc, blobUrl) {
    const container = document.getElementById('doc-viewer-body');
    if (!container) return;

    let pdf;
    try {
        pdf = await pdfjsLib.getDocument({ data: doc.data }).promise;
    } catch (e) {
        container.innerHTML = `<div class="p-8 text-center text-on-surface-variant"><p class="text-sm">Error loading PDF</p><p class="text-xs mt-2">${e.message || ''}</p></div>`;
        return;
    }

    const totalPages = pdf.numPages;
    let currentPage = 1;
    let scale = 1.0;
    let viewMode = 'single'; // 'single' or 'all'
    let fitScale = 1.0;

    const pageInfo = document.getElementById('doc-page-info');
    const zoomLabel = document.getElementById('doc-zoom-level');

    function updateInfo() {
        if (pageInfo) pageInfo.textContent = viewMode === 'single' ? `${currentPage} / ${totalPages}` : `${totalPages} pages`;
        if (zoomLabel) zoomLabel.textContent = Math.round(scale * 100) + '%';
    }

    async function renderPage(pageNum, targetCanvas) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        targetCanvas.width = viewport.width;
        targetCanvas.height = viewport.height;
        targetCanvas.style.width = viewport.width + 'px';
        targetCanvas.style.height = viewport.height + 'px';
        await page.render({ canvasContext: targetCanvas.getContext('2d'), viewport }).promise;
    }

    async function renderSinglePage() {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-start justify-center p-4';
        wrapper.style.minHeight = '100%';
        const canvas = document.createElement('canvas');
        canvas.className = 'shadow-lg rounded-sm';
        canvas.style.background = '#fff';
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);
        await renderPage(currentPage, canvas);
        updateInfo();
    }

    async function renderAllPages() {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'flex flex-col items-center gap-4 p-4';
        container.appendChild(wrapper);

        for (let i = 1; i <= totalPages; i++) {
            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'relative';
            const label = document.createElement('div');
            label.className = 'absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded';
            label.textContent = `${i} / ${totalPages}`;
            const canvas = document.createElement('canvas');
            canvas.className = 'shadow-lg rounded-sm';
            canvas.style.background = '#fff';
            pageWrapper.appendChild(label);
            pageWrapper.appendChild(canvas);
            wrapper.appendChild(pageWrapper);
            await renderPage(i, canvas);
        }
        updateInfo();
    }

    // Calculate fit-to-width scale
    async function calcFitScale() {
        const page = await pdf.getPage(1);
        const vp = page.getViewport({ scale: 1.0 });
        const containerWidth = container.clientWidth - 32; // padding
        fitScale = containerWidth / vp.width;
        return fitScale;
    }

    // Initial render: fit to width
    await calcFitScale();
    scale = Math.max(0.5, Math.min(fitScale, 2.0));
    await renderSinglePage();

    // Navigation
    document.getElementById('doc-prev-page')?.addEventListener('click', async () => {
        if (viewMode !== 'single' || currentPage <= 1) return;
        currentPage--;
        await renderSinglePage();
        container.scrollTop = 0;
    });

    document.getElementById('doc-next-page')?.addEventListener('click', async () => {
        if (viewMode !== 'single' || currentPage >= totalPages) return;
        currentPage++;
        await renderSinglePage();
        container.scrollTop = 0;
    });

    // Zoom
    async function rerender() {
        if (viewMode === 'single') await renderSinglePage();
        else await renderAllPages();
    }

    document.getElementById('doc-zoom-in')?.addEventListener('click', async () => {
        scale = Math.min(scale + 0.25, 5);
        await rerender();
    });

    document.getElementById('doc-zoom-out')?.addEventListener('click', async () => {
        scale = Math.max(scale - 0.25, 0.25);
        await rerender();
    });

    document.getElementById('doc-zoom-fit')?.addEventListener('click', async () => {
        await calcFitScale();
        scale = fitScale;
        await rerender();
    });

    // View all pages toggle
    document.getElementById('doc-view-all')?.addEventListener('click', async () => {
        viewMode = viewMode === 'single' ? 'all' : 'single';
        const btn = document.getElementById('doc-view-all');
        if (btn) {
            btn.querySelector('span').textContent = viewMode === 'all' ? 'view_day' : 'view_agenda';
        }
        await rerender();
    });

    // Print
    document.getElementById('doc-print')?.addEventListener('click', () => {
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
            printWindow.addEventListener('load', () => {
                printWindow.focus();
                printWindow.print();
            });
        }
    });

    // Keyboard navigation
    function onKeyDown(e) {
        if (!document.getElementById('doc-viewer-body')) {
            document.removeEventListener('keydown', onKeyDown);
            return;
        }
        if (viewMode === 'single') {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                if (currentPage > 1) { currentPage--; renderSinglePage(); container.scrollTop = 0; }
                e.preventDefault();
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                if (currentPage < totalPages) { currentPage++; renderSinglePage(); container.scrollTop = 0; }
                e.preventDefault();
            }
        }
        if (e.key === 'Escape') {
            URL.revokeObjectURL(blobUrl);
            closeModal();
        }
        if (e.key === '+' || e.key === '=') { scale = Math.min(scale + 0.25, 5); rerender(); }
        if (e.key === '-') { scale = Math.max(scale - 0.25, 0.25); rerender(); }
    }
    document.addEventListener('keydown', onKeyDown);
}
