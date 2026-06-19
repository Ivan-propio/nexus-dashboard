// Rapprochement Bancaire (Bank Reconciliation) Page
import { getAll, put, putAll } from '../services/db.js';
import { formatCurrency, formatDate, esc } from '../store.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderTopbar } from '../components/topbar.js';
import { showToast } from '../app.js';
import { t } from '../i18n.js';

/* ------------------------------------------------------------------ */
/*  CSV PARSER                                                         */
/* ------------------------------------------------------------------ */

function detectDelimiter(firstLine) {
    const counts = { ';': 0, ',': 0, '\t': 0 };
    for (const ch of firstLine) {
        if (ch in counts) counts[ch]++;
    }
    // Pick the delimiter that appears the most
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function cleanAmount(raw) {
    if (raw == null) return NaN;
    let s = String(raw).trim();
    // Remove currency symbols and whitespace
    s = s.replace(/[^0-9,.\-+]/g, '');
    if (s === '') return NaN;
    // Decide decimal separator: if both dot and comma are present,
    // the LAST one is the decimal separator
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
        // European: 1.234,56 -> 1234.56
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        // Anglo: 1,234.56 -> 1234.56
        s = s.replace(/,/g, '');
    } else {
        // Only one type or neither
        s = s.replace(',', '.');
    }
    return parseFloat(s);
}

function parseDate(raw) {
    if (!raw) return null;
    const s = raw.trim();
    // Try DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
    const euMatch = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
    if (euMatch) {
        return `${euMatch[3]}-${euMatch[2].padStart(2, '0')}-${euMatch[1].padStart(2, '0')}`;
    }
    // Try YYYY-MM-DD (ISO) or YYYY/MM/DD
    const isoMatch = s.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }
    // Stripe-style: 2024-01-15 12:34 UTC
    const stripeMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (stripeMatch) return stripeMatch[1];
    // Fallback: try native Date parse
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
    }
    return null;
}

function splitCSVRow(line, delimiter) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === delimiter && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current);
    return fields.map(f => f.trim());
}

function identifyColumns(headers) {
    const lower = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const map = { date: -1, description: -1, amount: -1, debit: -1, credit: -1, net: -1 };

    for (let i = 0; i < lower.length; i++) {
        const h = lower[i];
        if (map.date < 0 && (h === 'date' || h === 'created' || h === 'datevaleur' || h === 'dateoperation' || h === 'datecomptable')) {
            map.date = i;
        }
        if (map.description < 0 && (h === 'description' || h === 'libelle' || h === 'libelleoperation' || h === 'communication' || h === 'details')) {
            map.description = i;
        }
        if (map.amount < 0 && (h === 'montant' || h === 'amount' || h === 'net' || h === 'betrag')) {
            map.amount = i;
        }
        if (h === 'debit') map.debit = i;
        if (h === 'credit') map.credit = i;
        if (h === 'net' && map.net < 0) map.net = i;
    }

    // Stripe: prefer Net column over Amount
    if (map.net >= 0 && lower[map.net] === 'net') {
        map.amount = map.net;
    }

    return map;
}

function parseCSV(text) {
    // Remove BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return [];

    const delimiter = detectDelimiter(lines[0]);
    const headers = splitCSVRow(lines[0], delimiter);
    const colMap = identifyColumns(headers);

    if (colMap.date < 0) {
        // Fallback: first column is date
        colMap.date = 0;
    }
    if (colMap.description < 0) {
        // Fallback: second column or first text-heavy column
        colMap.description = Math.min(1, headers.length - 1);
    }

    const transactions = [];
    const now = Date.now();

    for (let i = 1; i < lines.length; i++) {
        const fields = splitCSVRow(lines[i], delimiter);
        if (fields.length < 2) continue;

        const date = parseDate(fields[colMap.date]);
        if (!date) continue; // Skip rows without valid date

        const description = fields[colMap.description] || '';

        let montant = NaN;
        if (colMap.amount >= 0) {
            montant = cleanAmount(fields[colMap.amount]);
        }
        // If amount column not found or empty, try debit/credit
        if (isNaN(montant) && (colMap.debit >= 0 || colMap.credit >= 0)) {
            const debit = colMap.debit >= 0 ? cleanAmount(fields[colMap.debit]) : NaN;
            const credit = colMap.credit >= 0 ? cleanAmount(fields[colMap.credit]) : NaN;
            if (!isNaN(debit) && debit !== 0) {
                montant = -Math.abs(debit);
            } else if (!isNaN(credit) && credit !== 0) {
                montant = Math.abs(credit);
            }
        }

        if (isNaN(montant)) continue; // Skip rows without valid amount

        // Try to find a reference in remaining columns
        let reference = '';
        for (let j = 0; j < fields.length; j++) {
            if (j !== colMap.date && j !== colMap.description && j !== colMap.amount && j !== colMap.debit && j !== colMap.credit) {
                const v = fields[j].trim();
                if (v.length > 3 && v.length < 40 && /[A-Z0-9]/.test(v)) {
                    reference = v;
                    break;
                }
            }
        }

        transactions.push({
            id: 'txn-' + now + '-' + i,
            date,
            description: description.slice(0, 200),
            montant,
            reference,
            matched: false,
            matchedFacture: null,
            matchScore: 0
        });
    }

    return transactions;
}

/* ------------------------------------------------------------------ */
/*  MATCHING ENGINE                                                    */
/* ------------------------------------------------------------------ */

function computeMatchScore(txn, facture) {
    const absTxn = Math.abs(txn.montant);
    const absFact = Math.abs(facture.montantTTC);
    const diff = Math.abs(absTxn - absFact);
    if (diff > 0.02) return 0;

    let score = 80; // Base score for amount match

    // Boost if fournisseur name appears in description
    if (facture.fournisseur) {
        const descLower = txn.description.toLowerCase();
        const fournWords = facture.fournisseur.toLowerCase().split(/\s+/);
        for (const word of fournWords) {
            if (word.length > 2 && descLower.includes(word)) {
                score += 10;
                break;
            }
        }
    }

    // Boost if reference matches
    if (facture.numero && txn.description.includes(facture.numero)) {
        score += 8;
    }

    return Math.min(score, 99);
}

/* ------------------------------------------------------------------ */
/*  PAGE RENDER                                                        */
/* ------------------------------------------------------------------ */

export async function renderRapprochement() {
    const shell = document.getElementById('app-shell');
    const loginScreen = document.getElementById('login-screen');
    loginScreen.classList.add('hidden');
    shell.classList.remove('hidden');
    renderSidebar();
    renderTopbar();

    let transactions = await getAll('transactions');
    let factures = await getAll('factures');

    /* ---- CSV file handling ---- */

    async function handleCSVFile(file) {
        if (!file || !file.name.toLowerCase().endsWith('.csv')) {
            showToast(t('rap.toast_import_error'), 'error');
            return;
        }
        try {
            const text = await file.text();
            const parsed = parseCSV(text);
            if (parsed.length === 0) {
                showToast(t('rap.toast_import_error'), 'error');
                return;
            }
            await putAll('transactions', parsed);
            transactions = await getAll('transactions');
            showToast(t('rap.toast_imported') + ' - ' + t('rap.parsed_count', { n: parsed.length }), 'success');
            render();
        } catch (e) {
            console.error('[Rapprochement] CSV parse error:', e);
            showToast(t('rap.toast_import_error'), 'error');
        }
    }

    /* ---- Suggestions ---- */

    function getSuggestions() {
        const linkedFactureIds = new Set(
            transactions.filter(tx => tx.matched && tx.matchedFacture).map(tx => tx.matchedFacture)
        );

        return transactions.map(txn => {
            if (txn.matched) return { ...txn, suggestedMatch: null, matchScore: txn.matchScore || 0 };

            let bestMatch = null;
            let bestScore = 0;

            for (const f of factures) {
                if (linkedFactureIds.has(f.id)) continue;
                const score = computeMatchScore(txn, f);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = f;
                }
            }

            return { ...txn, suggestedMatch: bestMatch, matchScore: bestScore };
        });
    }

    /* ---- Auto-match ---- */

    async function runAutoMatch() {
        const enriched = getSuggestions();
        let count = 0;
        const linkedFactureIds = new Set(
            transactions.filter(tx => tx.matched && tx.matchedFacture).map(tx => tx.matchedFacture)
        );

        for (const txn of enriched) {
            if (txn.matched || !txn.suggestedMatch || txn.matchScore < 88) continue;
            if (linkedFactureIds.has(txn.suggestedMatch.id)) continue;

            const original = transactions.find(t2 => t2.id === txn.id);
            if (original) {
                original.matched = true;
                original.matchedFacture = txn.suggestedMatch.id;
                original.matchScore = txn.matchScore;
                linkedFactureIds.add(txn.suggestedMatch.id);
                count++;
            }
        }

        if (count > 0) {
            await putAll('transactions', transactions);
            transactions = await getAll('transactions');
            showToast(t('rap.auto_match') + ': ' + count + ' transaction(s)', 'success');
        } else {
            showToast(t('rap.auto_match') + ': 0', 'info');
        }
        render();
    }

    /* ---- Main render ---- */

    function render() {
        const enriched = getSuggestions();
        const matched = enriched.filter(tx => tx.matched);
        const unmatched = enriched.filter(tx => !tx.matched);
        const pendingFactures = factures.filter(f => f.statut === 'VALIDEE' || f.statut === 'EN_ATTENTE');

        const soldeComptable = factures.reduce((s, f) => s + (f.montantTTC || 0), 0);
        const soldeBancaire = Math.abs(transactions.reduce((s, tx) => s + tx.montant, 0));
        const ecart = Math.abs(soldeComptable - soldeBancaire);

        const linkedFactureIds = new Set(
            transactions.filter(tx => tx.matched && tx.matchedFacture).map(tx => tx.matchedFacture)
        );

        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-6">

                <!-- Header: Balances + Upload -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${t('rap.accounting_balance')}</p>
                                <p class="text-2xl font-headline font-bold text-on-surface mt-1">${formatCurrency(soldeComptable)}</p>
                            </div>
                            <div class="metric-icon bg-primary-container">
                                <span class="material-symbols-outlined text-on-primary-container text-[22px]">account_balance</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">${t('rap.bank_balance')}</p>
                                <p class="text-2xl font-headline font-bold text-on-surface mt-1">${formatCurrency(soldeBancaire)}</p>
                            </div>
                            <div class="metric-icon bg-secondary-container">
                                <span class="material-symbols-outlined text-on-secondary-container text-[22px]">account_balance_wallet</span>
                            </div>
                        </div>
                    </div>
                    <div id="csv-drop-zone" class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-2 border-dashed border-outline-variant hover:border-primary cursor-pointer transition-colors flex flex-col items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-[28px] text-primary">upload_file</span>
                        <p class="text-sm font-semibold text-on-surface">${t('rap.upload_statement')}</p>
                        <p class="text-xs text-on-surface-variant">${t('rap.drop_csv')}</p>
                        <p class="text-[10px] text-on-surface-variant/60">${t('rap.csv_formats')}</p>
                        <input type="file" id="csv-file-input" accept=".csv" class="hidden" />
                    </div>
                </div>

                <!-- Action bar -->
                ${transactions.length > 0 ? `
                <div class="flex items-center gap-3">
                    <button id="btn-auto-match" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-colors">
                        <span class="material-symbols-outlined text-[18px]">auto_fix_high</span>
                        ${t('rap.auto_match')}
                    </button>
                    <span class="text-xs text-on-surface-variant">${transactions.length} transaction(s) | ${matched.length} ${t('rap.matched').toLowerCase()} | ${unmatched.length} ${t('rap.no_match').toLowerCase()}</span>
                </div>
                ` : ''}

                <!-- Split Panel -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    <!-- Left: Bank Transactions -->
                    <div>
                        <h4 class="font-headline font-semibold text-on-surface mb-4 flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-primary">account_balance</span>
                            ${t('rap.bank_transactions')}
                        </h4>
                        <div class="space-y-3" style="max-height: 65vh; overflow-y: auto;">
                            ${enriched.length === 0 ? `
                                <div class="text-center py-12 text-on-surface-variant">
                                    <span class="material-symbols-outlined text-[48px] opacity-30">upload_file</span>
                                    <p class="text-sm mt-2">${t('rap.drop_csv')}</p>
                                </div>
                            ` : enriched.map(txn => `
                                <div class="bg-surface-container-lowest rounded-xl shadow-sm p-4 ${txn.matched ? 'opacity-50' : ''} ${txn.suggestedMatch && !txn.matched ? 'ring-1 ring-primary/30' : ''}">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="min-w-0 flex-1">
                                            <p class="text-sm font-medium text-on-surface truncate">${esc(txn.description)}</p>
                                            <p class="text-xs text-on-surface-variant mt-0.5">${formatDate(txn.date)}${txn.reference ? ' - ' + esc(txn.reference) : ''}</p>
                                        </div>
                                        <p class="text-sm font-bold whitespace-nowrap ${txn.montant < 0 ? 'text-error' : 'text-green-600'}">${formatCurrency(txn.montant)}</p>
                                    </div>
                                    ${txn.suggestedMatch && !txn.matched ? `
                                        <div class="mt-3 pt-3 border-t border-surface-container flex items-center justify-between gap-2">
                                            <div class="flex items-center gap-2 min-w-0">
                                                <span class="badge badge-purple shrink-0">${t('rap.suggested_match')} ${txn.matchScore}%</span>
                                                <span class="text-xs text-on-surface-variant truncate">${esc(txn.suggestedMatch.fournisseur)} - ${esc(txn.suggestedMatch.numero)}</span>
                                            </div>
                                            <button data-link="${esc(txn.id)}" data-facture="${esc(txn.suggestedMatch.id)}" class="shrink-0 text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                                                <span class="material-symbols-outlined text-[16px]">link</span>
                                                ${t('rap.link')}
                                            </button>
                                        </div>
                                    ` : txn.matched ? `
                                        <div class="mt-2 flex items-center gap-1.5">
                                            <span class="material-symbols-outlined text-[16px] text-green-600">check_circle</span>
                                            <span class="text-xs text-green-700 font-medium">${t('rap.matched')}</span>
                                        </div>
                                    ` : `
                                        <div class="mt-2 flex items-center justify-between">
                                            <span class="badge badge-grey">${t('rap.no_match')}</span>
                                            <button data-manual-link="${esc(txn.id)}" class="text-xs font-semibold text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors">
                                                <span class="material-symbols-outlined text-[16px]">add_link</span>
                                                ${t('rap.link')}
                                            </button>
                                        </div>
                                    `}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Right: Pending Invoices -->
                    <div>
                        <h4 class="font-headline font-semibold text-on-surface mb-4 flex items-center gap-2">
                            <span class="material-symbols-outlined text-[20px] text-primary">receipt_long</span>
                            ${t('rap.pending_invoices')}
                        </h4>
                        <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden" style="max-height: 65vh; overflow-y: auto;">
                            <table class="nx-table w-full">
                                <thead>
                                    <tr class="text-left">
                                        <th>${t('rap.reference')}</th>
                                        <th class="text-right">${t('rap.amount')}</th>
                                        <th>${t('rap.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pendingFactures.map(f => {
                                        const isLinked = linkedFactureIds.has(f.id);
                                        return `
                                            <tr class="${isLinked ? 'opacity-50' : ''}" data-facture-row="${esc(f.id)}">
                                                <td>
                                                    <p class="font-medium text-on-surface text-sm">${esc(f.fournisseur)}</p>
                                                    <p class="text-xs text-on-surface-variant font-mono">${esc(f.numero)}</p>
                                                </td>
                                                <td class="text-right font-semibold text-on-surface">${formatCurrency(f.montantTTC)}</td>
                                                <td>
                                                    ${isLinked
                                                        ? `<span class="badge badge-green">${t('rap.matched')}</span>`
                                                        : `<span class="badge ${f.statut === 'VALIDEE' ? 'badge-blue' : 'badge-grey'}">${esc(f.statut.replace('_', ' '))}</span>`
                                                    }
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                    ${pendingFactures.length === 0 ? `<tr><td colspan="3" class="text-center py-6 text-on-surface-variant">${t('rap.no_pending')}</td></tr>` : ''}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Summary Bar -->
                <div class="summary-bar flex flex-wrap items-center justify-between gap-4">
                    <div class="flex items-center gap-8">
                        <div>
                            <p class="text-xs text-white/60 uppercase tracking-wider font-semibold">${t('rap.matched_count')}</p>
                            <p class="text-lg font-headline font-bold">${matched.length} / ${transactions.length}</p>
                        </div>
                        <div>
                            <p class="text-xs text-white/60 uppercase tracking-wider font-semibold">${t('rap.differences')}</p>
                            <p class="text-lg font-headline font-bold ${ecart > 0.01 ? 'text-orange-300' : ''}">${formatCurrency(ecart)}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button id="ignore-ecarts" class="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/80 border border-white/20 hover:bg-white/10 transition-colors">
                            ${t('rap.ignore_diff')}
                        </button>
                        <button id="validate-rapprochement" class="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white text-slate-800 hover:bg-white/90 transition-colors">
                            ${t('rap.validate')}
                        </button>
                    </div>
                </div>
            </div>
        `;

        /* ---- Event bindings ---- */

        // CSV drop zone
        const dropZone = document.getElementById('csv-drop-zone');
        const fileInput = document.getElementById('csv-file-input');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-primary', 'bg-primary/5');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('border-primary', 'bg-primary/5');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-primary', 'bg-primary/5');
                const file = e.dataTransfer.files[0];
                handleCSVFile(file);
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files[0]) handleCSVFile(fileInput.files[0]);
            });
        }

        // Auto-match button
        document.getElementById('btn-auto-match')?.addEventListener('click', runAutoMatch);

        // Suggested match link buttons
        content.querySelectorAll('[data-link]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const txnId = btn.dataset.link;
                const facId = btn.dataset.facture;
                const txn = transactions.find(t2 => t2.id === txnId);
                if (txn) {
                    txn.matched = true;
                    txn.matchedFacture = facId;
                    txn.matchScore = 100;
                    await put('transactions', txn);
                    transactions = await getAll('transactions');
                    showToast(t('rap.toast_linked'), 'success');
                    render();
                }
            });
        });

        // Manual link buttons: user picks a facture from the right panel
        let manualLinkTxnId = null;
        content.querySelectorAll('[data-manual-link]').forEach(btn => {
            btn.addEventListener('click', () => {
                manualLinkTxnId = btn.dataset.manualLink;
                // Highlight pending invoices as clickable
                content.querySelectorAll('[data-facture-row]').forEach(row => {
                    const fId = row.dataset.factureRow;
                    if (!linkedFactureIds.has(fId)) {
                        row.classList.add('cursor-pointer', 'hover:bg-primary/5');
                        row.style.outline = '2px solid var(--md-sys-color-primary, #6750A4)';
                        row.style.outlineOffset = '-2px';
                    }
                });
                showToast(t('rap.pending_invoices') + ' - ' + t('rap.link'), 'info');
            });
        });

        // Facture row click for manual linking
        content.querySelectorAll('[data-facture-row]').forEach(row => {
            row.addEventListener('click', async () => {
                if (!manualLinkTxnId) return;
                const facId = row.dataset.factureRow;
                if (linkedFactureIds.has(facId)) return;

                const txn = transactions.find(t2 => t2.id === manualLinkTxnId);
                if (txn) {
                    txn.matched = true;
                    txn.matchedFacture = facId;
                    txn.matchScore = 100;
                    await put('transactions', txn);
                    transactions = await getAll('transactions');
                    manualLinkTxnId = null;
                    showToast(t('rap.toast_linked'), 'success');
                    render();
                }
            });
        });

        // Ignore differences
        document.getElementById('ignore-ecarts')?.addEventListener('click', () => {
            showToast(t('rap.toast_ignored'), 'info');
        });

        // Validate reconciliation
        document.getElementById('validate-rapprochement')?.addEventListener('click', () => {
            const unmatchedCount = transactions.filter(tx => !tx.matched).length;
            if (unmatchedCount > 0) {
                showToast(t('rap.toast_unmatched', { n: unmatchedCount }), 'error');
            } else {
                showToast(t('rap.toast_validated'), 'success');
            }
        });
    }

    render();
}
