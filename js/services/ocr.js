// OCR Pipeline: PDF.js text extraction + regex parsing + Tesseract.js fallback

export async function extractFromFile(file) {
    if (file.type === 'application/pdf') {
        return await extractFromPDF(file);
    } else if (file.type.startsWith('image/')) {
        return await extractFromImage(file);
    }
    throw new Error('Unsupported file type. Use PDF or image.');
}

async function extractFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    const parsed = parseInvoiceText(fullText);

    if (parsed.confidence > 25) {
        return { ...parsed, method: 'pdf-text', rawText: fullText };
    }

    // Fallback: render PDF to canvas and run Tesseract
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const ocrResult = await runTesseract(blob);
    const ocrParsed = parseInvoiceText(ocrResult.text);

    return {
        ...ocrParsed,
        method: 'pdf-ocr',
        rawText: ocrResult.text,
        ocrConfidence: ocrResult.confidence
    };
}

async function extractFromImage(file) {
    const ocrResult = await runTesseract(file);
    const parsed = parseInvoiceText(ocrResult.text);
    return {
        ...parsed,
        method: 'image-ocr',
        rawText: ocrResult.text,
        ocrConfidence: ocrResult.confidence
    };
}

async function runTesseract(imageSource) {
    const worker = await Tesseract.createWorker('fra');
    const { data } = await worker.recognize(imageSource);
    await worker.terminate();
    return { text: data.text, confidence: data.confidence };
}

function parseInvoiceText(text) {
    if (!text || text.trim().length < 10) {
        return { confidence: 0, fournisseur: '', tva: '', siren: '', numero: '', date: '', montantHT: '', montantTTC: '', tauxTVA: '', iban: '', bic: '', adresse: '' };
    }

    let confidence = 0;
    const result = {
        fournisseur: '',
        tva: '',
        siren: '',
        numero: '',
        date: '',
        montantHT: '',
        montantTTC: '',
        tauxTVA: '',
        iban: '',
        bic: '',
        adresse: '',
    };

    // Company / Fournisseur
    const companyPatterns = [
        /(?:Fournisseur|Vendeur|Emetteur|Société|Societe|Company|Client)\s*[:\-]?\s*(.+)/i,
        /(?:^|\n)\s*([A-Z][A-Z\s&\-\.]{3,40}(?:S\.?A\.?R?\.?L?\.?|G\.?I\.?E\.?|S\.?A\.?S?\.?|S\.?A\.?|SARL|GIE|SAS|SA|LLC|LTD|GMBH)?)\s*(?:\n|$)/m,
        /(?:^|\n)\s*([A-Z][A-Za-z\s&\-\.]{3,40})\s*(?:\n|$)/m,
    ];
    for (const p of companyPatterns) {
        const m = text.match(p);
        if (m && m[1].trim().length > 2) { result.fournisseur = m[1].trim(); confidence += 15; break; }
    }

    // TVA Intra — Multi-country (FR, LU, BE, DE, etc.)
    const tvaPatterns = [
        /(?:TVA\s*(?:intra(?:communautaire)?)?|N°?\s*TVA|VAT\s*(?:number|no)?|Numéro\s*TVA)\s*[:\-]?\s*([A-Z]{2}\s?\d{2,}[\d\s]*)/i,
        /(FR\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i,
        /(LU\s?\d{8})/i,
        /(BE\s?\d{10})/i,
        /(DE\s?\d{9})/i,
        /([A-Z]{2}\d{8,12})/,
    ];
    for (const p of tvaPatterns) {
        const m = text.match(p);
        if (m) { result.tva = m[1].replace(/\s/g, ''); confidence += 15; break; }
    }

    // SIREN / SIRET / RCS / Trade Register
    const sirenPatterns = [
        /(?:SIRE[TN]|RCS|R\.?C\.?S\.?|Registre|Trade\s*Register)\s*[:\-]?\s*([A-Z]?\s*\d[\d\s\-]{6,20})/i,
        /(\d{3}\s?\d{3}\s?\d{3}(?:\s?\d{5})?)/,
    ];
    for (const p of sirenPatterns) {
        const m = text.match(p);
        if (m) { result.siren = m[1].replace(/\s/g, ''); confidence += 10; break; }
    }

    // Invoice / Order number
    const numPatterns = [
        /(?:Facture|Invoice|N°?\s*(?:de\s*)?facture|Bon\s*de\s*commande|Order|Commande|BDC)\s*[:\-#n°N°]?\s*([A-Z0-9\-\/]{2,30})/i,
        /(?:Réf(?:érence)?|Ref(?:erence)?)\s*[:\-]?\s*([A-Z0-9\-\/]{3,25})/i,
    ];
    for (const p of numPatterns) {
        const m = text.match(p);
        if (m) { result.numero = m[1].trim(); confidence += 15; break; }
    }

    // Date
    const datePatterns = [
        /(?:Date\s*(?:de\s*)?(?:facture|émission|facturation|commande)?)\s*[:\-]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/i,
        /(?:Date)\s*[:\-]?\s*(\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})/i,
        /(\d{1,2}[\/.]\d{1,2}[\/.]\d{4})/,
        /(\d{4}-\d{2}-\d{2})/,
    ];
    for (const p of datePatterns) {
        const m = text.match(p);
        if (m) { result.date = m[1].trim(); confidence += 10; break; }
    }

    // Amounts — more flexible patterns
    const amountRegex = /(\d[\d\s]*[.,]\d{2})\s*(?:€|EUR|euros?)?/gi;
    const amounts = [];
    let amMatch;
    while ((amMatch = amountRegex.exec(text)) !== null) {
        const val = parseFloat(amMatch[1].replace(/\s/g, '').replace(',', '.'));
        if (!isNaN(val) && val > 0) amounts.push(val);
    }

    // TTC pattern
    const ttcPatterns = [
        /(?:Total\s*TTC|Montant\s*TTC|Net\s*[àa]\s*payer|Total\s*à\s*payer|TOTAL\s*TTC)\s*[:\-]?\s*(\d[\d\s]*[.,]\d{2})/i,
        /(?:Total\s*général|Grand\s*Total)\s*[:\-]?\s*(\d[\d\s]*[.,]\d{2})/i,
    ];
    for (const p of ttcPatterns) {
        const m = text.match(p);
        if (m) { result.montantTTC = m[1].replace(/\s/g, '').replace(',', '.'); confidence += 15; break; }
    }

    // HT pattern
    const htPatterns = [
        /(?:Total\s*HT|Montant\s*HT|Sous[\s\-]?total|Total\s*hors\s*taxes?)\s*[:\-]?\s*(\d[\d\s]*[.,]\d{2})/i,
    ];
    for (const p of htPatterns) {
        const m = text.match(p);
        if (m) { result.montantHT = m[1].replace(/\s/g, '').replace(',', '.'); confidence += 10; break; }
    }

    // Fallback: use largest amounts
    if (!result.montantTTC && amounts.length > 0) {
        amounts.sort((a, b) => b - a);
        result.montantTTC = amounts[0].toFixed(2);
        confidence += 5;
    }
    if (!result.montantHT && amounts.length > 1) {
        amounts.sort((a, b) => b - a);
        result.montantHT = amounts[1].toFixed(2);
        confidence += 5;
    }

    // TVA rate — Luxembourg uses 3%, 8%, 14%, 17%
    const tvaRatePatterns = [
        /(?:TVA|taux|VAT|IVA)\s*[:\-]?\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i,
        /(\d{1,2})\s*%\s*(?:TVA|VAT|IVA)/i,
    ];
    for (const p of tvaRatePatterns) {
        const m = text.match(p);
        if (m) { result.tauxTVA = m[1].replace(',', '.'); confidence += 10; break; }
    }

    // Calculate rate from HT/TTC if not found
    if (!result.tauxTVA && result.montantHT && result.montantTTC) {
        const ht = parseFloat(result.montantHT);
        const ttc = parseFloat(result.montantTTC);
        if (ht > 0 && ttc > ht) {
            const rate = ((ttc - ht) / ht * 100).toFixed(1);
            result.tauxTVA = rate;
            confidence += 5;
        }
    }

    // IBAN
    const ibanPatterns = [
        /(?:IBAN)\s*[:\-]?\s*([A-Z]{2}\d{2}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{0,4}[\s]?[\dA-Z]{0,4}[\s]?[\dA-Z]{0,2})/i,
        /\b([A-Z]{2}\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}[\s\d]{0,8})\b/,
        /\b(LU\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4})\b/i,
        /\b(FR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{3})\b/i,
        /\b(BE\d{2}\s?\d{4}\s?\d{4}\s?\d{4})\b/i,
        /\b(DE\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2})\b/i,
    ];
    for (const p of ibanPatterns) {
        const m = text.match(p);
        if (m) { result.iban = m[1].replace(/\s/g, ''); confidence += 10; break; }
    }

    // BIC / SWIFT
    const bicPatterns = [
        /(?:BIC|SWIFT)\s*[:\-]?\s*([A-Z]{4}[A-Z]{2}[A-Z\d]{2}(?:[A-Z\d]{3})?)/i,
        /\b([A-Z]{4}(?:LU|FR|BE|DE)[A-Z\d]{2}(?:[A-Z\d]{3})?)\b/,
    ];
    for (const p of bicPatterns) {
        const m = text.match(p);
        if (m) { result.bic = m[1]; confidence += 5; break; }
    }

    // Address
    const adressePatterns = [
        /(?:Adresse|Address|Si[eè]ge)\s*[:\-]?\s*(.{10,80})/i,
        /(\d{1,4}[\s,]+(?:rue|avenue|boulevard|place|chemin|route|all[ée]e|impasse|street|road|strasse|stra[ßs]e)\s+.{5,60})/i,
        /(L-\d{4}\s+\w[\w\s-]{2,30})/i,
    ];
    for (const p of adressePatterns) {
        const m = text.match(p);
        if (m) { result.adresse = m[1].trim(); confidence += 5; break; }
    }

    result.confidence = Math.min(confidence, 100);
    return result;
}

export async function renderPDFPage(file, canvas, pageNum = 1) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    return pdf.numPages;
}
