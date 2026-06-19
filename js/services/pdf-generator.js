import { ISSUER, BANNER_PRICES, getPackageById } from '../data/packages.js';

function getJsPDF() { return window.jspdf?.jsPDF; }

const A4_W = 210, A4_H = 297;
const ML = 15, MR = 15, MT = 10, MB = 12;
const CW = A4_W - ML - MR;
const HEADER_BOTTOM = 48;
const FOOTER_TOP = A4_H - MB - 12;
const CONTENT_TOP = HEADER_BOTTOM + 4;
const CONTENT_BOTTOM = FOOTER_TOP - 4;

const GRAY_FILL = [232, 232, 232];
const FONT = 'courier';
const BODY = 'helvetica';

let _logoImg = null;

async function loadLogo() {
    if (_logoImg) return _logoImg;
    try {
        const res = await fetch('assets/nexus-logo.png');
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => { _logoImg = reader.result; resolve(_logoImg); };
            reader.readAsDataURL(blob);
        });
    } catch { return null; }
}

function fmtEUR(n) {
    if (n == null || isNaN(n)) return '—';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

// ─── Header & Footer (matching original template) ───

function drawHeader(doc, pageNum, totalPages, logo) {
    if (logo) {
        doc.addImage(logo, 'PNG', ML, MT, 65, 33);
    } else {
        doc.setFont(FONT, 'bold');
        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.text('NEXUS LUXEMBOURG 2026', ML, MT + 18);
    }

    const rx = A4_W - MR;

    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text(`${pageNum}/${totalPages}`, rx, MT + 6, { align: 'right' });

    doc.setFont(FONT, 'bold');
    doc.setFontSize(7.5);
    doc.text(ISSUER.name, rx, MT + 14, { align: 'right' });
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7);
    doc.text(ISSUER.address, rx, MT + 18, { align: 'right' });
    doc.text(ISSUER.postalCity, rx, MT + 22, { align: 'right' });

    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(ML, HEADER_BOTTOM, A4_W - MR, HEADER_BOTTOM);
}

function drawFooter(doc) {
    const cx = A4_W / 2;

    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(ML, FOOTER_TOP, A4_W - MR, FOOTER_TOP);

    let y = FOOTER_TOP + 5;

    doc.setFont(FONT, 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(0);

    const line1Parts = [
        { bold: true, text: 'Phone: ' }, { bold: false, text: ISSUER.phone },
        { bold: false, text: '  |  ' },
        { bold: true, text: 'E-mail: ' }, { bold: false, text: ISSUER.email }
    ];
    drawStyledLine(doc, cx, y, line1Parts, 5.5);

    y += 4;
    const line2Parts = [
        { bold: true, text: 'Registration number: ' }, { bold: false, text: ISSUER.registration },
        { bold: false, text: '  |  ' },
        { bold: true, text: 'N°RCS: ' }, { bold: false, text: ISSUER.rcs },
        { bold: false, text: '  |  ' },
        { bold: true, text: 'IBAN: ' }, { bold: false, text: ISSUER.iban },
        { bold: false, text: '  |  ' },
        { bold: true, text: 'BIC: ' }, { bold: false, text: ISSUER.bic },
        { bold: false, text: '  |  ' },
        { bold: true, text: 'VAT: ' }, { bold: false, text: ISSUER.vat }
    ];
    drawStyledLine(doc, cx, y, line2Parts, 5.5);
}

function drawStyledLine(doc, cx, y, parts, fontSize) {
    const totalWidth = parts.reduce((w, p) => {
        doc.setFont(FONT, p.bold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        return w + doc.getTextWidth(p.text);
    }, 0);

    let x = cx - totalWidth / 2;
    for (const p of parts) {
        doc.setFont(FONT, p.bold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        doc.text(p.text, x, y);
        x += doc.getTextWidth(p.text);
    }
}

function newPage(doc) {
    doc.addPage();
    return CONTENT_TOP;
}

// ─── Page 1: Client Info (gray box fields like original) ───

function drawClientPage(doc, bdc, pkg) {
    let y = CONTENT_TOP + 10;
    const c = bdc.client || {};

    const labelX = ML;
    const valX = ML + 50;
    const valW = A4_W - MR - valX;
    const rowH = 11;
    const boxH = 7;

    function field(label, value) {
        doc.setFont(FONT, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text(label + ':', labelX, y + 5);

        doc.setFillColor(...GRAY_FILL);
        doc.rect(valX, y, valW, boxH, 'F');

        if (value) {
            doc.setFont(FONT, 'normal');
            doc.setFontSize(8);
            doc.text(value, valX + 3, y + 5);
        }
        y += rowH;
    }

    function fieldRow(label, fields) {
        doc.setFont(FONT, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text(label + ':', labelX, y + 5);

        const totalW = valW;
        const gap = 3;
        const fCount = fields.length;
        const labelWidths = fields.map(f => doc.getTextWidth(f.label + ': '));
        const availW = totalW - labelWidths.reduce((s, w) => s + w, 0) - gap * (fCount - 1);
        const boxWidth = availW / fCount;

        let fx = valX;
        for (let i = 0; i < fCount; i++) {
            doc.setFont(FONT, 'normal');
            doc.setFontSize(7);
            doc.setTextColor(0);
            doc.text(fields[i].label + ':', fx, y + 5);
            fx += labelWidths[i];

            doc.setFillColor(...GRAY_FILL);
            doc.rect(fx, y, boxWidth, boxH, 'F');

            if (fields[i].value) {
                doc.setFont(FONT, 'normal');
                doc.setFontSize(8);
                doc.text(fields[i].value, fx + 2, y + 5);
            }
            fx += boxWidth + gap;
        }
        y += rowH;
    }

    field('Company Name', c.companyName);
    y += 2;
    field('Represented by', c.representedBy);
    y += 4;

    fieldRow('Address', [
        { label: 'Street name', value: c.streetName },
        { label: 'Number', value: c.number },
        { label: 'Floor, unit', value: c.floor }
    ]);

    fieldRow('', [
        { label: 'Postal code', value: c.postalCode },
        { label: 'City', value: c.city }
    ]);

    fieldRow('', [
        { label: 'State', value: c.state },
        { label: 'Country', value: c.country }
    ]);

    y += 2;
    field('Legal form', c.legalForm);
    y += 2;
    field('Trade register number', c.tradeRegister);
    y += 2;
    field('Intra-Community VAT N°', c.vatNumber);
    y += 2;
    field('Billing contact', c.billingContact);
    y += 2;
    field('Email address', c.email);

    // Package name and order number at bottom
    y += 20;

    doc.setFont(FONT, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(pkg.name, ML, y);
    y += 10;

    doc.setFont(FONT, 'bold');
    doc.setFontSize(11);
    doc.text('Order n°', ML, y);

    const orderLabelW = doc.getTextWidth('Order n° ');
    doc.setFont(FONT, 'normal');
    doc.text(bdc.orderNumber || '2026/', ML + orderLabelW, y);

    doc.setFillColor(...GRAY_FILL);
    const orderFieldX = ML + orderLabelW + doc.getTextWidth((bdc.orderNumber || '2026/') + ' ');
    doc.rect(orderFieldX, y - 5, 60, boxH, 'F');

    return y;
}

// ─── Pages 2+: Package Details ───

function buildDetailRows(pkg) {
    const rows = [];

    rows.push(['Price (VAT excluded)', fmtEUR(pkg.priceHT)]);

    if (pkg.standM2) {
        rows.push(['Stands', `${pkg.standM2} m²`]);
    }

    if (!pkg.sections?.length) {
        if (pkg.furniture?.length) rows.push(['Furniture package', pkg.furniture.map(f => '- ' + f).join('\n')]);
        if (pkg.talks?.length) rows.push(['Talks', pkg.talks.map(t => '- ' + t).join('\n')]);
        if (pkg.tickets?.length) rows.push(['Included Tickets', pkg.tickets.map(t => '- ' + t).join('\n')]);
        if (pkg.visibility?.length) rows.push(['Visibility', pkg.visibility.map(v => '- ' + v).join('\n')]);
        if (pkg.specialLabel) rows.push([pkg.specialLabel, (pkg.specialItems || []).map(s => '- ' + s).join('\n')]);
        if (pkg.leadGeneration?.length) rows.push(['Lead Generation', pkg.leadGeneration.map(l => '- ' + l).join('\n')]);
    }

    if (pkg.dinner) {
        rows.push([pkg.dinnerLabel || 'Closing Seated Dinner', pkg.dinner]);
    }

    if (pkg.bonus) {
        rows.push(['Bonus benefits', pkg.bonus]);
    }

    return rows;
}

function drawSectionTable(doc, y, section) {
    if (!section.items?.length) return y;

    if (y + 20 > CONTENT_BOTTOM) y = newPage(doc);

    doc.setFont(FONT, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(section.name, ML, y + 4);
    y += 7;

    const itemRows = section.items.map(item => {
        if (typeof item === 'object' && item !== null) {
            const label = item.prefix ? `${item.prefix} ${item.label}` : item.label;
            return [String(item.qty || 1), label];
        }
        return ['1', String(item)];
    });

    doc.autoTable({
        startY: y,
        margin: { left: ML + 2, right: MR },
        head: [['Qty', 'Element']],
        body: itemRows,
        theme: 'grid',
        styles: {
            font: BODY,
            fontSize: 8,
            cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
            textColor: [0, 0, 0],
            overflow: 'linebreak',
            valign: 'middle'
        },
        headStyles: {
            font: FONT,
            fillColor: GRAY_FILL,
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 7
        },
        columnStyles: {
            0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: CW - 22 }
        },
        pageBreak: 'auto'
    });

    return doc.lastAutoTable.finalY + 3;
}

function drawPackageDetails(doc, y, pkg) {
    const rows = buildDetailRows(pkg);

    doc.autoTable({
        startY: y,
        margin: { left: ML, right: MR },
        head: [],
        body: rows,
        theme: 'plain',
        styles: {
            font: BODY,
            fontSize: 8.5,
            cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
            textColor: [0, 0, 0],
            lineColor: [200, 200, 200],
            lineWidth: 0.2,
            overflow: 'linebreak',
            valign: 'top'
        },
        columnStyles: {
            0: { font: FONT, fontStyle: 'bold', cellWidth: 50, textColor: [0, 0, 0] },
            1: { cellWidth: CW - 50 }
        },
        didDrawCell: (data) => {
            if (data.column.index === 0) {
                doc.setDrawColor(200);
                doc.setLineWidth(0.2);
                const { x, y: cy, width, height } = data.cell;
                doc.line(x, cy + height, x + width, cy + height);
            }
        },
        pageBreak: 'auto',
        showHead: 'never'
    });

    y = doc.lastAutoTable.finalY + 4;

    if (pkg.sections?.length) {
        for (const sec of pkg.sections) {
            y = drawSectionTable(doc, y, sec);
        }
    }

    return y;
}

function drawTotalsBox(doc, y, subtotal, vatRate, vatAmount, total) {
    const boxW = 70;
    const boxX = A4_W - MR - boxW;
    const rowH = 8;

    if (y + 35 > CONTENT_BOTTOM) {
        y = newPage(doc);
    }

    y += 6;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(boxX, y, boxW, rowH * 3 + 2);

    function totalRow(label, value, yy, bold) {
        doc.setFont(BODY, bold ? 'bold' : 'normal');
        doc.setFontSize(9);
        doc.text(label, boxX + 4, yy + 5.5);
        doc.text(value, boxX + boxW - 4, yy + 5.5, { align: 'right' });
        if (!bold) {
            doc.setDrawColor(200);
            doc.setLineWidth(0.15);
            doc.line(boxX + 1, yy + rowH, boxX + boxW - 1, yy + rowH);
        }
    }

    totalRow('Sous-Total', fmtEUR(subtotal), y + 1, false);
    totalRow(`VAT ${vatRate}%`, fmtEUR(vatAmount), y + 1 + rowH, false);
    totalRow('Total', fmtEUR(total), y + 1 + rowH * 2, true);

    return y + rowH * 3 + 8;
}

// ─── Banners Page ───

function drawBannersPage(doc, y, bdc) {
    if (y + 10 > CONTENT_BOTTOM) y = newPage(doc);

    y += 4;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(12);
    doc.text('Additional services: Banners', ML, y);
    y += 8;

    doc.setFont(BODY, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80);
    const infoText = 'Each stand comes with standard white banners that can be customised. For all exhibitors, the customisation of Banners A and B is mandatory. Banner C remains optional but is highly recommended for full stand customisation and enhanced overall visibility.';
    const lines = doc.splitTextToSize(infoText, CW);
    doc.text(lines, ML, y);
    y += lines.length * 3 + 6;

    doc.setTextColor(0);

    const banners = bdc.banners || {};
    const bA = banners.A || {};
    const bB = banners.B || {};
    const bC = banners.C || {};

    const priceA = bA.price ?? BANNER_PRICES.A.price;
    const priceB = bB.price ?? BANNER_PRICES.B.price;
    const priceC = bC.price ?? BANNER_PRICES.C.price;

    const bannerRows = [
        ['Banner A (mandatory)', BANNER_PRICES.A.dimensions, `${fmtEUR(priceA)}/banner (excl. VAT)`, String(bA.qty || '—')],
        ['Banner B (mandatory)', BANNER_PRICES.B.dimensions, `${fmtEUR(priceB)}/banner (excl. VAT)`, String(bB.qty || '—')],
        ['Banner C (recommended)', BANNER_PRICES.C.dimensions, `${fmtEUR(priceC)}/banner (excl. VAT)`, String(bC.qty || '—')]
    ];

    doc.autoTable({
        startY: y,
        margin: { left: ML, right: MR },
        head: [['', 'Dimensions', 'Personalisation', 'Requested quantity']],
        body: bannerRows,
        theme: 'grid',
        styles: { font: BODY, fontSize: 8, cellPadding: 3, textColor: [0, 0, 0] },
        headStyles: { font: FONT, fillColor: GRAY_FILL, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 45 },
            1: { cellWidth: 35 },
            2: { cellWidth: 55 },
            3: { cellWidth: 35, halign: 'center' }
        }
    });
    y = doc.lastAutoTable.finalY + 4;

    const totalReuse = (bA.reuse || 0) + (bB.reuse || 0) + (bC.reuse || 0);
    if (totalReuse > 0) {
        doc.setFont(FONT, 'italic');
        doc.setFontSize(7.5);
        doc.text(`Banners to reuse from previous edition: ${totalReuse}`, ML, y + 4);
        y += 8;
    }

    const bannersTotal = bdc.bannersTotal || 0;
    if (bannersTotal > 0) {
        const bVat = Math.round(bannersTotal * 0.17 * 100) / 100;
        y = drawSmallTotalsBox(doc, y, 'Banners', bannersTotal, bVat, bannersTotal + bVat);
    }

    return y;
}

function drawSmallTotalsBox(doc, y, label, ht, vat, ttc) {
    const boxW = 60;
    const boxX = A4_W - MR - boxW;
    y += 4;

    doc.setFont(BODY, 'normal');
    doc.setFontSize(8);
    doc.text(label, boxX + 2, y + 4);
    doc.text(fmtEUR(ht), boxX + boxW - 2, y + 4, { align: 'right' });
    doc.setDrawColor(200);
    doc.line(boxX, y + 6, boxX + boxW, y + 6);

    doc.text('VAT 17%', boxX + 2, y + 11);
    doc.text(fmtEUR(vat), boxX + boxW - 2, y + 11, { align: 'right' });
    doc.line(boxX, y + 13, boxX + boxW, y + 13);

    doc.setFont(BODY, 'bold');
    doc.text('Total', boxX + 2, y + 18);
    doc.text(fmtEUR(ttc), boxX + boxW - 2, y + 18, { align: 'right' });

    return y + 24;
}

// ─── Banner Dimensions Diagram ───

function drawBannerDiagram(doc, y) {
    if (y + 100 > CONTENT_BOTTOM) y = newPage(doc);

    y += 4;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(12);
    doc.text('Banners (dimensions)', ML, y);
    y += 10;

    const cx = A4_W / 2;
    const bw = 35;
    const gap = 8;
    const startX = cx - bw - gap;

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.setFillColor(...GRAY_FILL);

    doc.rect(startX, y, bw, 55, 'FD');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(14);
    doc.text('A', startX + bw / 2, y + 28, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont(FONT, 'normal');
    doc.text('238 cm', startX + bw / 2, y - 2, { align: 'center' });
    doc.text('189 cm', startX - 3, y + 28, { align: 'right', angle: 90 });

    const bx = startX + bw + 2;
    doc.rect(bx, y, bw, 12, 'FD');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(14);
    doc.text('B', bx + bw / 2, y + 8, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont(FONT, 'normal');
    doc.text('238 cm', bx + bw / 2, y - 2, { align: 'center' });
    doc.text('38 cm', bx + bw + 3, y + 7);

    doc.rect(bx, y + 14, bw, 55, 'FD');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(14);
    doc.text('C', bx + bw / 2, y + 14 + 28, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont(FONT, 'normal');
    doc.text('189 cm', bx + bw + 3, y + 14 + 28);

    y += 80;

    doc.setFont(BODY, 'normal');
    doc.setFontSize(7);
    const specs = [
        'PDF at 1:1 scale', 'CMYK', '10 mm bleed',
        'Crop marks, Registration marks, Info marks',
        'Fogra 39 profile', '100 dpi resolution',
        'Shapes, logos and text in vector format',
        'Cutting paths in named spot colors with bleed'
    ];
    specs.forEach((s, i) => {
        doc.text('• ' + s, ML, y + i * 4);
    });

    return y + specs.length * 4 + 4;
}

// ─── Special Request Page ───

function drawSpecialRequest(doc, y, bdc) {
    if (y + 40 > CONTENT_BOTTOM) y = newPage(doc);

    y += 6;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(12);
    doc.text('Special request', ML, y);
    y += 8;

    if (bdc.specialRequest) {
        doc.setFont(BODY, 'normal');
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(bdc.specialRequest, CW);
        doc.text(lines, ML, y);
        y += lines.length * 4.5 + 4;
    } else {
        doc.setDrawColor(200);
        doc.setLineWidth(0.15);
        for (let i = 0; i < 5; i++) {
            doc.line(ML, y + i * 8, A4_W - MR, y + i * 8);
        }
        y += 44;
    }

    const srAmount = bdc.specialRequestAmount || 0;
    if (srAmount > 0) {
        const srVat = Math.round(srAmount * 0.17 * 100) / 100;
        y = drawSmallTotalsBox(doc, y, 'Special request', srAmount, srVat, srAmount + srVat);
    }

    return y;
}

// ─── Last Page: Payment & Signature ───

function drawSignaturePage(doc, y, bdc, pkg) {
    if (y + 120 > CONTENT_BOTTOM) y = newPage(doc);

    const vatRate = bdc.tauxTVA || 17;

    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    doc.text('Payment terms', ML, y);
    y += 7;

    doc.setFont(BODY, 'normal');
    doc.setFontSize(9);
    doc.rect(ML, y - 3, 3.5, 3.5);
    doc.text('50% upon signature', ML + 6, y);
    y += 7;
    doc.rect(ML, y - 3, 3.5, 3.5);
    doc.text('50% 10 days before the event', ML + 6, y);
    y += 10;

    doc.setFont(BODY, 'italic');
    doc.setFontSize(8);
    doc.text('I have read and accepted the general terms and conditions', ML, y);
    doc.text('of sale attached to this order.', ML, y + 3.5);
    y += 12;

    const pkgHT = bdc.packagePriceHT || pkg.priceHT;
    const bannersHT = bdc.bannersTotal || 0;
    const specialHT = bdc.specialRequestAmount || 0;
    const totalHT = pkgHT + bannersHT + specialHT;
    const totalVAT = Math.round(totalHT * vatRate / 100 * 100) / 100;
    const totalTTC = totalHT + totalVAT;

    const summaryRows = [
        ['Package', fmtEUR(pkgHT)],
        ['Additional Services (Banners)', fmtEUR(bannersHT)],
        ['Special request', fmtEUR(specialHT)],
        ['', ''],
        ['Total (VAT excluded)', fmtEUR(totalHT)],
        [`VAT ${vatRate}%`, fmtEUR(totalVAT)],
        ['Total (VAT included)', fmtEUR(totalTTC)]
    ];

    doc.autoTable({
        startY: y,
        margin: { left: A4_W - MR - 80, right: MR },
        head: [],
        body: summaryRows,
        theme: 'plain',
        styles: { font: BODY, fontSize: 8, cellPadding: 2, textColor: [0, 0, 0] },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 28, halign: 'right' }
        },
        didParseCell: (data) => {
            if (data.row.index >= 4) {
                data.cell.styles.fontStyle = 'bold';
            }
            if (data.row.index === 3) {
                data.cell.styles.minCellHeight = 2;
            }
            if (data.row.index === 6) {
                data.cell.styles.fontSize = 10;
            }
        },
        showHead: 'never'
    });

    y = doc.lastAutoTable.finalY + 10;

    doc.setFont(BODY, 'normal');
    doc.setFontSize(9);
    doc.text('Date:', ML, y);
    doc.setFillColor(...GRAY_FILL);
    doc.rect(ML + 15, y - 5, 45, 7, 'F');
    if (bdc.date) {
        doc.text(bdc.date, ML + 17, y);
    }
    y += 14;

    const colW = CW / 2 - 5;

    doc.setFont(FONT, 'bold');
    doc.setFontSize(8);
    doc.text('Client stamp', ML, y);
    doc.text('Client signature', ML + colW / 2 + 5, y);
    doc.setDrawColor(180);
    doc.rect(ML, y + 2, colW / 2 - 2, 25);
    doc.rect(ML + colW / 2 + 2, y + 2, colW / 2 - 2, 25);

    const rx = ML + CW / 2 + 5;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8);
    doc.text('For Nexus 2050 GIE', rx, y);
    y += 6;
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.text('Surname', rx, y + 5);
    doc.setFillColor(...GRAY_FILL);
    doc.rect(rx + 22, y + 1, colW - 27, 6, 'F');
    doc.text('First name', rx, y + 14);
    doc.rect(rx + 22, y + 10, colW - 27, 6, 'F');

    return y + 30;
}

// ─── CGV: Conditions Générales de Vente ───

const CGV_SECTIONS = [
    {
        title: '1. Objet',
        text: 'Les présentes Conditions Générales de Vente (ci-après « CGV ») s\'appliquent à toutes les commandes de prestations de services et de mise à disposition d\'espaces d\'exposition passées auprès de Nexus2050 G.I.E. (ci-après « l\'Organisateur ») dans le cadre de l\'événement NEXUS LUXEMBOURG 2026 (ci-après « l\'Événement »). Toute commande implique l\'acceptation sans réserve des présentes CGV par le client (ci-après « l\'Exposant »).'
    },
    {
        title: '2. Commande et confirmation',
        text: 'La commande est formalisée par la signature du Bon de Commande (BDC) par l\'Exposant. La commande devient ferme et définitive dès réception par l\'Organisateur du BDC signé accompagné du premier versement de 50 % du montant total TTC. L\'Organisateur se réserve le droit de refuser toute commande sans avoir à justifier sa décision.'
    },
    {
        title: '3. Prix et modalités de paiement',
        text: 'Les prix indiqués dans le Bon de Commande sont exprimés en euros hors taxes (HT). La TVA applicable est de 17 % conformément à la législation luxembourgeoise en vigueur.\n\nLe paiement s\'effectue en deux versements :\n• 50 % du montant total TTC à la signature du Bon de Commande ;\n• 50 % du montant total TTC au plus tard 10 jours ouvrables avant la date de début de l\'Événement.\n\nTout retard de paiement entraînera de plein droit et sans mise en demeure préalable l\'application d\'intérêts de retard au taux légal en vigueur au Grand-Duché de Luxembourg, majoré de 5 points de pourcentage, ainsi qu\'une indemnité forfaitaire de recouvrement de 40 euros.'
    },
    {
        title: '4. Annulation par l\'Exposant',
        text: 'Toute annulation doit être notifiée par écrit (courrier recommandé ou courriel avec accusé de réception) à l\'Organisateur.\n\n• Annulation plus de 90 jours avant l\'Événement : remboursement de 50 % des sommes versées.\n• Annulation entre 90 et 30 jours avant l\'Événement : aucun remboursement ; le solde reste dû.\n• Annulation moins de 30 jours avant l\'Événement : la totalité du montant est due.\n\nL\'absence de l\'Exposant le jour de l\'Événement sans notification préalable est assimilée à une annulation tardive.'
    },
    {
        title: '5. Annulation ou modification par l\'Organisateur',
        text: 'L\'Organisateur se réserve le droit de modifier les dates, le lieu ou le programme de l\'Événement pour des raisons organisationnelles. En cas de modification substantielle, l\'Exposant pourra demander l\'annulation de sa commande avec remboursement intégral des sommes versées.\n\nEn cas d\'annulation totale de l\'Événement par l\'Organisateur pour cas de force majeure (tels que définis à l\'article 6), les sommes versées seront remboursées après déduction des frais réellement engagés par l\'Organisateur.'
    },
    {
        title: '6. Force majeure',
        text: 'Sont considérés comme cas de force majeure : catastrophes naturelles, pandémies, décisions gouvernementales, grèves générales, incendies, inondations, et tout autre événement imprévisible, irrésistible et extérieur aux parties rendant impossible l\'exécution de leurs obligations. En cas de force majeure, les obligations des parties sont suspendues. Si la situation de force majeure persiste au-delà de 60 jours, chaque partie pourra résilier le contrat sans indemnité.'
    },
    {
        title: '7. Stands et équipements',
        text: 'L\'espace d\'exposition est mis à disposition de l\'Exposant dans l\'état décrit dans le Bon de Commande. L\'Exposant s\'engage à utiliser l\'espace conformément aux règles de sécurité et au règlement intérieur du lieu de l\'Événement. L\'Exposant est responsable de tout dommage causé au stand, aux équipements fournis et aux installations du lieu.\n\nLes aménagements spécifiques demandés par l\'Exposant au-delà du package standard seront facturés en supplément selon les tarifs en vigueur.'
    },
    {
        title: '8. Banners et supports visuels',
        text: 'Les fichiers graphiques pour la personnalisation des banners doivent être fournis au format spécifié (PDF 1:1, CMYK, 10 mm de fond perdu, 100 dpi minimum) au plus tard 30 jours avant l\'Événement. Passé ce délai, l\'Organisateur ne garantit pas la livraison des banners personnalisés.\n\nLes banners réutilisés d\'une édition précédente doivent être en bon état. L\'Organisateur se réserve le droit de refuser la réutilisation de banners endommagés ou non conformes.'
    },
    {
        title: '9. Assurance et responsabilité',
        text: 'L\'Exposant doit souscrire une assurance responsabilité civile couvrant les dommages pouvant survenir pendant la durée de l\'Événement, y compris les phases de montage et de démontage. L\'Organisateur décline toute responsabilité en cas de vol, perte ou détérioration des biens de l\'Exposant.\n\nLa responsabilité de l\'Organisateur est limitée au montant total du Bon de Commande. L\'Organisateur ne pourra en aucun cas être tenu responsable des dommages indirects, pertes de bénéfices ou pertes d\'opportunités commerciales.'
    },
    {
        title: '10. Propriété intellectuelle',
        text: 'L\'Exposant garantit qu\'il dispose de tous les droits nécessaires sur les contenus, marques et créations qu\'il présente lors de l\'Événement. L\'Exposant autorise l\'Organisateur à utiliser son nom, son logo et des photographies de son stand à des fins de communication et de promotion de l\'Événement.'
    },
    {
        title: '11. Protection des données personnelles',
        text: 'Les données personnelles collectées dans le cadre du Bon de Commande sont traitées conformément au Règlement (UE) 2016/679 (RGPD). Elles sont utilisées exclusivement pour la gestion de la participation de l\'Exposant à l\'Événement. L\'Exposant dispose d\'un droit d\'accès, de rectification, d\'effacement et de portabilité de ses données, qu\'il peut exercer par courrier ou courriel adressé à l\'Organisateur.'
    },
    {
        title: '12. Droit applicable et juridiction compétente',
        text: 'Les présentes CGV sont régies par le droit luxembourgeois. Tout litige relatif à l\'interprétation ou à l\'exécution des présentes CGV sera soumis à la compétence exclusive des tribunaux du Grand-Duché de Luxembourg, après tentative de résolution amiable entre les parties.'
    }
];

function drawCGVPages(doc, y) {
    y = newPage(doc);

    doc.setFont(FONT, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Conditions Générales de Vente', ML, y);
    y += 4;
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(ML, y, A4_W - MR, y);
    y += 6;

    for (const section of CGV_SECTIONS) {
        doc.setFont(FONT, 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0);
        const titleLines = doc.splitTextToSize(section.title, CW);
        const titleH = titleLines.length * 3.5;

        doc.setFont(BODY, 'normal');
        doc.setFontSize(7);
        const bodyLines = doc.splitTextToSize(section.text, CW);
        const bodyH = bodyLines.length * 3;

        const totalH = titleH + bodyH + 5;

        if (y + totalH > CONTENT_BOTTOM) {
            y = newPage(doc);
        }

        doc.setFont(FONT, 'bold');
        doc.setFontSize(8);
        doc.text(titleLines, ML, y);
        y += titleH + 2;

        doc.setFont(BODY, 'normal');
        doc.setFontSize(7);
        doc.setTextColor(40);
        doc.text(bodyLines, ML, y);
        y += bodyH + 4;

        doc.setTextColor(0);
    }

    return y;
}

// ─── Main: Generate BDC PDF ───

export async function generateBDC_PDF(bdc) {
    const logo = await loadLogo();
    const pkg = bdc.customPackage || getPackageById(bdc.packageId);
    if (!pkg) throw new Error(`Package not found: ${bdc.packageId}`);

    const JsPDF = getJsPDF();
    if (!JsPDF) throw new Error('jsPDF not loaded');
    const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });

    // === Page 1: Client Info ===
    let y = CONTENT_TOP;
    drawClientPage(doc, bdc, pkg);

    // === Page 2+: Package Details ===
    y = newPage(doc);
    y = drawPackageDetails(doc, y, pkg);

    const pkgVAT = Math.round(pkg.priceHT * (bdc.tauxTVA || 17) / 100 * 100) / 100;
    y = drawTotalsBox(doc, y, pkg.priceHT, bdc.tauxTVA || 17, pkgVAT, pkg.priceHT + pkgVAT);

    // === Banners Page (if applicable) ===
    if (pkg.hasBanners) {
        y = newPage(doc);
        y = drawBannersPage(doc, y, bdc);

        y = newPage(doc);
        y = drawBannerDiagram(doc, y);
    }

    // === Special Request Page ===
    y = newPage(doc);
    y = drawSpecialRequest(doc, y, bdc);

    // === Signature Page ===
    y = newPage(doc);
    y = drawSignaturePage(doc, y, bdc, pkg);

    // === CGV Pages ===
    y = drawCGVPages(doc, y);

    // === Draw headers & footers on all pages ===
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawHeader(doc, i, totalPages, logo);
        drawFooter(doc);
    }

    return doc;
}

export async function downloadBDC(bdc) {
    const doc = await generateBDC_PDF(bdc);
    const client = bdc.client?.companyName || 'client';
    const safe = client.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    doc.save(`BDC_${bdc.orderNumber.replace('/', '-')}_${safe}.pdf`);
    return doc;
}

export async function getBDC_Blob(bdc) {
    const doc = await generateBDC_PDF(bdc);
    return doc.output('blob');
}
