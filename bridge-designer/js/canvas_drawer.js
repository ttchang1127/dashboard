// js/canvas_drawer.js

/**
 * 此模組包含所有與 Canvas 繪圖相關的函式。
 * 函式被設計為接收繪圖所需的上下文(context)和數據，
 * 而不是直接從 DOM 讀取數據，以保持模組的獨立性。
 */

// --- 主繪圖函式 (由 ui_handler.js 呼叫) ---

/**
 * 根據當前啟用的視圖，更新所有可見的 Canvas。
 * @param {object} canvases - 包含所有 canvas context 和 parent 元素的物件
 * @param {object} inputs - 包含所有當前輸入值的物件
 */
export function updateAllCanvases(canvases, inputs) {
    const { sectionView, tendonView } = canvases.views;

    if (!sectionView.classList.contains('hidden')) {
        if (!canvases.section.mid.parent.classList.contains('hidden')) {
            drawGirder(canvases.section.mid.ctx, canvases.section.mid.parent, false, false, inputs);
        }
        if (!canvases.section.end.parent.classList.contains('hidden')) {
            drawGirder(canvases.section.end.ctx, canvases.section.end.parent, true, false, inputs);
        }
    }

    if (!tendonView.classList.contains('hidden')) {
        if (canvases.tendon.mid.parent.classList.contains('flex')) {
            drawGirder(canvases.tendon.mid.ctx, canvases.tendon.mid.parent, false, true, inputs);
            drawMidTendons(canvases.tendon.mid.ctx, inputs);
        }
        if (canvases.tendon.end.parent.classList.contains('flex')) {
            drawGirder(canvases.tendon.end.ctx, canvases.tendon.end.parent, true, true, inputs);
            drawEndTendons(canvases.tendon.end.ctx, inputs);
        }
        if (canvases.tendon.side.parent.classList.contains('flex')) {
            drawSideView(canvases.tendon.side.ctx, canvases.tendon.side.parent, inputs);
        }
    }
}


// --- 內部繪圖輔助函式 ---

/**
 * 繪製 PCI 梁斷面。
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context.
 * @param {HTMLElement} parent - The parent container of the canvas.
 * @param {boolean} isEndSection - 是否為梁端斷面。
 * @param {boolean} skipDimensions - 是否跳過繪製尺寸標註。
 * @param {object} inputs - 包含所有尺寸數值的物件。
 */
function drawGirder(ctx, parent, isEndSection, skipDimensions = false, inputs) {
    const ght = parseFloat(inputs.ght) || 0;
    const h1 = parseFloat(inputs.h1) || 0;
    const tft_net = parseFloat(inputs.tft) || 0;
    const gtf = parseFloat(inputs.gtf) || 0;
    const bft = parseFloat(inputs.bft) || 0;
    const gwb_mid = parseFloat(inputs.gwb) || 0;
    const h3_mid = parseFloat(inputs.h3) || 0;
    const f2_mid = parseFloat(inputs.f2) || 0;

    let gwb, h3, f2;

    if (isEndSection) {
        const gbf_mid = gwb_mid + 2 * f2_mid;
        gwb = gbf_mid;
        h3 = 0;
        f2 = 0;
    } else {
        gwb = gwb_mid;
        h3 = h3_mid;
        f2 = f2_mid;
    }

    const tft_total = h1 + tft_net;
    const gbf = gwb + 2 * f2;

    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;
    ctx.canvas.width = parentWidth;
    ctx.canvas.height = parentHeight;

    const padding = skipDimensions ? 40 : 150;
    const drawableWidth = ctx.canvas.width - 2 * padding;
    const drawableHeight = ctx.canvas.height - 2 * padding;
    
    if (gtf <= 0 || ght <= 0 || drawableWidth <= 0 || drawableHeight <= 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        if (gtf <= 0 || ght <= 0) {
            ctx.font = "16px 'Noto Sans TC'";
            ctx.fillStyle = "#ef4444";
            ctx.textAlign = "center";
            ctx.fillText('請輸入有效的斷面尺寸', ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
        return;
    }
    
    const scale = Math.min(drawableWidth / Math.max(gtf, gbf), drawableHeight / ght);
    const drawGht = ght * scale;
    const drawH1 = h1 * scale;
    const drawH2 = tft_net * scale;
    const drawTft = tft_total * scale;
    const drawGwb = gwb * scale;
    const drawH3 = h3 * scale;
    const drawBft = bft * scale;
    const drawGtf = gtf * scale;
    const drawGbf = gbf * scale;
    
    const centerX = ctx.canvas.width / 2;
    const startY = (ctx.canvas.height - drawGht) / 2;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const p = {
        topLeft: [centerX - drawGtf / 2, startY],
        topRight: [centerX + drawGtf / 2, startY],
        topHaunch1StartRight: [centerX + drawGtf / 2, startY + drawH2],
        webTopRight: [centerX + drawGwb / 2, startY + drawTft],
        webBottomRight: [centerX + drawGwb / 2, startY + drawGht - drawBft - drawH3],
        bottomHaunchStartRight: [centerX + drawGbf / 2, startY + drawGht - drawBft],
        bottomRight: [centerX + drawGbf / 2, startY + drawGht],
        bottomLeft: [centerX - drawGbf / 2, startY + drawGht],
        bottomHaunchStartLeft: [centerX - drawGbf / 2, startY + drawGht - drawBft],
        webBottomLeft: [centerX - drawGwb / 2, startY + drawGht - drawBft - drawH3],
        webTopLeft: [centerX - drawGwb / 2, startY + drawTft],
        topHaunch1StartLeft: [centerX - drawGtf / 2, startY + drawH2],
    };
    
    ctx.beginPath();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(100, 116, 139, 0.1)';
    ctx.moveTo(p.topLeft[0], p.topLeft[1]);
    ctx.lineTo(p.topRight[0], p.topRight[1]);
    ctx.lineTo(p.topHaunch1StartRight[0], p.topHaunch1StartRight[1]);
    ctx.lineTo(p.webTopRight[0], p.webTopRight[1]);
    ctx.lineTo(p.webBottomRight[0], p.webBottomRight[1]);
    ctx.lineTo(p.bottomHaunchStartRight[0], p.bottomHaunchStartRight[1]);
    ctx.lineTo(p.bottomRight[0], p.bottomRight[1]);
    ctx.lineTo(p.bottomLeft[0], p.bottomLeft[1]);
    ctx.lineTo(p.bottomHaunchStartLeft[0], p.bottomHaunchStartLeft[1]);
    ctx.lineTo(p.webBottomLeft[0], p.webBottomLeft[1]);
    ctx.lineTo(p.webTopLeft[0], p.webTopLeft[1]);
    ctx.lineTo(p.topHaunch1StartLeft[0], p.topHaunch1StartLeft[1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (skipDimensions) return;
    
    const dimColor = '#475569';
    const dimLineColor = '#94a3b8';
    const arrowSize = 8;
    const extensionGap = 4;
    const extensionOut = 10;
    const textOffset = 8;

    ctx.strokeStyle = dimLineColor;
    ctx.lineWidth = 1.5;
    ctx.font = '14px Inter';
    ctx.fillStyle = dimColor;

    function drawArrowhead(fromX, fromY, toX, toY) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - arrowSize * Math.cos(angle - Math.PI / 7), toY - arrowSize * Math.sin(angle - Math.PI / 7));
        ctx.lineTo(toX - arrowSize * Math.cos(angle + Math.PI / 7), toY - arrowSize * Math.sin(angle + Math.PI / 7));
        ctx.closePath();
        ctx.fillStyle = dimColor;
        ctx.fill();
    }

    const drawISODim = (x_start, y_start, x_end, y_end, label, side, offset) => {
        ctx.beginPath();
        if (side === 'top' || side === 'bottom') {
            const y_dim = side === 'top' ? y_start - offset : y_start + offset;
            const y_ext_start = side === 'top' ? y_start - extensionGap : y_start + extensionGap;
            const y_ext_end = side === 'top' ? y_dim - extensionOut : y_dim + extensionOut;
            
            ctx.moveTo(x_start, y_ext_start); ctx.lineTo(x_start, y_ext_end);
            ctx.moveTo(x_end, y_ext_start); ctx.lineTo(x_end, y_ext_end);
            
            ctx.moveTo(x_start, y_dim); ctx.lineTo(x_end, y_dim);
            ctx.stroke();

            drawArrowhead(x_end, y_dim, x_start, y_dim);
            drawArrowhead(x_start, y_dim, x_end, y_dim);
            
            ctx.textAlign = 'center';
            ctx.textBaseline = side === 'top' ? 'bottom' : 'top';
            ctx.fillText(label, (x_start + x_end) / 2, side === 'top' ? y_dim - textOffset : y_dim + textOffset);
        } else {
            const x_dim = side === 'left' ? x_start - offset : x_start + offset;
            const x_ext_start = side === 'left' ? x_start - extensionGap : x_start + extensionGap;
            const x_ext_end = side === 'left' ? x_dim - extensionOut : x_dim + extensionOut;

            ctx.moveTo(x_ext_start, y_start); ctx.lineTo(x_ext_end, y_start);
            ctx.moveTo(x_ext_start, y_end); ctx.lineTo(x_ext_end, y_end);
            
            ctx.moveTo(x_dim, y_start); ctx.lineTo(x_dim, y_end);
            ctx.stroke();

            drawArrowhead(x_dim, y_end, x_dim, y_start);
            drawArrowhead(x_dim, y_start, x_dim, y_end);

            ctx.save();
            ctx.translate(side === 'left' ? x_dim - textOffset : x_dim + textOffset, (y_start + y_end) / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(label, 0, 0);
            ctx.restore();
        }
    };
    
    drawISODim(p.topLeft[0], p.topLeft[1], p.bottomLeft[0], p.bottomLeft[1], `GHT (${ght})`, 'left', 60);
    drawISODim(p.topRight[0], p.topRight[1], p.topHaunch1StartRight[0], p.topHaunch1StartRight[1], `TFT (${tft_net.toFixed(0)})`, 'right', 50);
    drawISODim(p.topHaunch1StartRight[0], p.topHaunch1StartRight[1], p.webTopRight[0], p.webTopRight[1], `H1 (${h1})`, 'right', 80);

    if (!isEndSection) {
        drawISODim(p.webBottomLeft[0], p.webBottomLeft[1], p.bottomHaunchStartLeft[0], p.bottomHaunchStartLeft[1], `H3 (${h3})`, 'left', 90);
        drawISODim(p.webBottomRight[0], p.webBottomRight[1], p.bottomHaunchStartRight[0], p.bottomHaunchStartRight[1], `F2 (${f2})`, 'bottom', 90);
        drawISODim(p.bottomRight[0], p.bottomRight[1], p.bottomHaunchStartRight[0], p.bottomHaunchStartRight[1], `BFT (${bft})`, 'right', 90);
    }

    drawISODim(p.topLeft[0], p.topLeft[1], p.topRight[0], p.topRight[1], `GTF (${gtf})`, 'top', 90);
    const commonTopHorizontalOffset = 60;
    drawISODim(p.webTopLeft[0], p.webTopLeft[1], p.webTopRight[0], p.webTopRight[1], `GWB (${gwb.toFixed(0)})`, 'top', commonTopHorizontalOffset);
    drawISODim(p.bottomLeft[0], p.bottomLeft[1], p.bottomRight[0], p.bottomRight[1], `GBF (${gbf.toFixed(0)})`, 'bottom', 60);
}

function drawMidTendons(ctx, inputs) {
    let ght = parseFloat(inputs.ght) || 0;
    let gwb = parseFloat(inputs.gwb) || 0;
    let f2 = parseFloat(inputs.f2) || 0;
    const gbf = gwb + 2 * f2;

    const parentWidth = ctx.canvas.width;
    const parentHeight = ctx.canvas.height;
    const padding = 40;
    const drawableWidth = parentWidth - 2 * padding;
    const drawableHeight = parentHeight - 2 * padding;
    
    if (gbf <= 0 || ght <= 0) return;
    
    const scale = Math.min(drawableWidth / gbf, drawableHeight / ght);
    const drawGht = ght * scale;
    const centerX = parentWidth / 2;
    const startY = (parentHeight - drawGht) / 2;

    const tendonLayouts = {
        '3': [{ id: 1, x: 0, y: 120 }, { id: 2, x: -120, y: 120 }, { id: 3, x: 120, y: 120 }],
        '4': [{ id: 1, x: 0, y: 240 }, { id: 2, x: 0, y: 120 }, { id: 3, x: -120, y: 120 }, { id: 4, x: 120, y: 120 }],
        '5': [{ id: 1, x: 0, y: 360 }, { id: 2, x: 0, y: 240 }, { id: 3, x: 0, y: 120 }, { id: 4, x: -120, y: 120 }, { id: 5, x: 120, y: 120 }],
        '6': [{ id: 1, x: 0, y: 240 }, { id: 2, x: 0, y: 120 }, { id: 3, x: -120, y: 240 }, { id: 4, x: 120, y: 240 }, { id: 5, x: -120, y: 120 }, { id: 6, x: 120, y: 120 }],
        '7': [{ id: 1, x: 0, y: 360 }, { id: 2, x: 0, y: 240 }, { id: 3, x: 0, y: 120 }, { id: 4, x: -120, y: 240 }, { id: 5, x: 120, y: 240 }, { id: 6, x: -120, y: 120 }, { id: 7, x: 120, y: 120 }]
    };
    
    const tendonCount = inputs['tendon-mid-count'];
    const layout = tendonLayouts[tendonCount];
    if (!layout) return;

    const tendonRadius = 8;
    ctx.fillStyle = '#4f46e5';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    layout.forEach(pos => {
        const tendonX = centerX + (pos.x * scale);
        const tendonY = startY + drawGht - (pos.y * scale);
        ctx.beginPath();
        ctx.arc(tendonX, tendonY, tendonRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(pos.id, tendonX, tendonY);
        ctx.fillStyle = '#4f46e5';
    });
}

function drawEndTendons(ctx, inputs) {
    let ght = parseFloat(inputs.ght) || 0;
    let gtf = parseFloat(inputs.gtf) || 0;

    const parentWidth = ctx.canvas.width;
    const parentHeight = ctx.canvas.height;
    const padding = 40;
    const drawableWidth = parentWidth - 2 * padding;
    const drawableHeight = parentHeight - 2 * padding;
    
    if (gtf <= 0 || ght <= 0) return;

    const scale = Math.min(drawableWidth / gtf, drawableHeight / ght);
    const drawGht = ght * scale;
    const centerX = parentWidth / 2;
    const startY = (parentHeight - drawGht) / 2;

    const tendonCount = parseInt(inputs['tendon-end-count'], 10);
    
    const endTendonLayouts = {
        '3': [{ id: 1, x: 0, y: 1050 }, { id: 2, x: 0, y: 750 }, { id: 3, x: 0, y: 450 }],
        '4': [{ id: 1, x: 0, y: 1300 }, { id: 2, x: 0, y: 1000 }, { id: 3, x: 0, y: 700 }, { id: 4, x: 0, y: 400 }],
        '5': [{ id: 1, x: 0, y: 1600 }, { id: 2, x: 0, y: 1300 }, { id: 3, x: 0, y: 1000 }, { id: 4, x: 0, y: 700 }, { id: 5, x: 0, y: 400 }],
        '6': [{ id: 1, x: 0, y: 1850 }, { id: 2, x: 0, y: 1550 }, { id: 3, x: 0, y: 1250 }, { id: 4, x: 0, y: 950 }, { id: 5, x: 0, y: 650 }, { id: 6, x: 0, y: 350 }],
        '7': [{ id: 1, x: 0, y: 2000 }, { id: 2, x: 0, y: 1700 }, { id: 3, x: 0, y: 1400 }, { id: 4, x: 0, y: 1100 }, { id: 5, x: 0, y: 800 }, { id: 6, x: 0, y: 500 }, { id: 7, x: 0, y: 200 }]
    };

    const layout = endTendonLayouts[tendonCount];
    if (!layout) return;

    const tendonRadius = 8;
    ctx.fillStyle = '#1e40af';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    layout.forEach(pos => {
        const tendonX = centerX + (pos.x * scale);
        const tendonY = startY + drawGht - (pos.y * scale);
        
        ctx.beginPath();
        ctx.arc(tendonX, tendonY, tendonRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(pos.id, tendonX, tendonY);
        ctx.fillStyle = '#1e40af';
    });
}

function drawSideView(ctx, parent, inputs) {
    const span = (parseFloat(inputs['bridge-span']) || 0) * 1000;
    const ght = parseFloat(inputs.ght) || 0;
    const tendonCount = inputs['tendon-mid-count'];

    if (span <= 0 || ght <= 0) return;

    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;
    ctx.canvas.width = parentWidth;
    ctx.canvas.height = parentHeight;
    ctx.clearRect(0, 0, parentWidth, parentHeight);

    const padding = { top: 40, right: 40, bottom: 60, left: 80 };
    const drawableWidth = parentWidth - padding.left - padding.right;
    const drawableHeight = parentHeight - padding.top - padding.bottom;

    if (drawableWidth <= 0 || drawableHeight <= 0) return;

    const spanHalfM = span / 2 / 1000;
    const ghtM = ght / 1000;
    
    const scale = Math.min(drawableWidth / spanHalfM, drawableHeight / ghtM);
    const canvasSpanHalf = spanHalfM * scale;
    const canvasGht = ghtM * scale;
    const startZ = padding.left + (drawableWidth - canvasSpanHalf) / 2;
    const startY = padding.top + (drawableHeight - canvasGht) / 2;

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(startZ, startY, canvasSpanHalf, canvasGht);

    ctx.fillStyle = '#475569';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('橋梁端部', startZ, startY - 10);
    ctx.fillText('橋梁中央 (對稱)', startZ + canvasSpanHalf, startY - 10);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('橋梁長度 (Z)', startZ + canvasSpanHalf / 2, startY + canvasGht + 25);

    ctx.save();
    ctx.translate(startZ - 50, startY + canvasGht / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'bottom';
    ctx.fillText('梁身高度 (Y)', 0, 0);
    ctx.restore();
    
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('0 m', startZ, startY + canvasGht + 5);
    ctx.fillText(`${spanHalfM.toFixed(1)} m`, startZ + canvasSpanHalf, startY + canvasGht + 5);
    
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('0 m', startZ - 10, startY + canvasGht);
    ctx.fillText(`${ghtM.toFixed(1)} m`, startZ - 10, startY);

    const midTendonLayouts = {
        '3': [{ id: 1, y: 120 }, { id: 2, y: 120 }, { id: 3, y: 120 }],
        '4': [{ id: 1, y: 240 }, { id: 2, y: 120 }, { id: 3, y: 120 }, { id: 4, y: 120 }],
        '5': [{ id: 1, y: 360 }, { id: 2, y: 240 }, { id: 3, y: 120 }, { id: 4, y: 120 }, { id: 5, y: 120 }],
        '6': [{ id: 1, y: 240 }, { id: 2, y: 120 }, { id: 3, y: 240 }, { id: 4, y: 240 }, { id: 5, y: 120 }, { id: 6, y: 120 }],
        '7': [{ id: 1, y: 360 }, { id: 2, y: 240 }, { id: 3, y: 120 }, { id: 4, y: 240 }, { id: 5, y: 240 }, { id: 6, y: 120 }, { id: 7, y: 120 }]
    };
    const endTendonLayouts = {
        '3': [{ id: 1, y: 1050 }, { id: 2, y: 750 }, { id: 3, y: 450 }],
        '4': [{ id: 1, y: 1300 }, { id: 2, y: 1000 }, { id: 3, y: 700 }, { id: 4, y: 400 }],
        '5': [{ id: 1, y: 1600 }, { id: 2, y: 1300 }, { id: 3, y: 1000 }, { id: 4, y: 700 }, { id: 5, y: 400 }],
        '6': [{ id: 1, y: 1850 }, { id: 2, y: 1550 }, { id: 3, y: 1250 }, { id: 4, y: 950 }, { id: 5, y: 650 }, { id: 6, y: 350 }],
        '7': [{ id: 1, y: 2000 }, { id: 2, y: 1700 }, { id: 3, y: 1400 }, { id: 4, y: 1100 }, { id: 5, y: 800 }, { id: 6, y: 500 }, { id: 7, y: 200 }]
    };

    const endLayout = endTendonLayouts[tendonCount];
    const midLayout = midTendonLayouts[tendonCount];

    if (!endLayout || !midLayout) return;

    endLayout.sort((a, b) => a.id - b.id);
    midLayout.sort((a, b) => a.id - b.id);

    const tendonRadius = 5;
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#f59e0b', '#6366f1'];

    for (let i = 0; i < tendonCount; i++) {
        const y_start_m = (endLayout[i]?.y || 0) / 1000;
        const y_end_m = (midLayout[i]?.y || 0) / 1000;
        const z_start_m = 0;
        const z_end_m = spanHalfM;

        if (z_start_m === z_end_m) continue;

        const a = (y_start_m - y_end_m) / Math.pow(z_start_m - z_end_m, 2);

        ctx.beginPath();
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        const first_z_canvas = startZ + z_start_m * scale;
        const first_y_canvas = startY + canvasGht - (y_start_m * scale);
        ctx.moveTo(first_z_canvas, first_y_canvas);

        for (let pz = 1; pz <= canvasSpanHalf; pz++) {
            const current_z_canvas = startZ + pz;
            const z_m = (current_z_canvas - startZ) / scale;
            const y_m = y_end_m + a * Math.pow(z_m - z_end_m, 2);
            const current_y_canvas = startY + canvasGht - (y_m * scale);
            ctx.lineTo(current_z_canvas, current_y_canvas);
        }
        ctx.stroke();
    }
    ctx.setLineDash([]);

    const endTendonColor = '#1e40af';
    ctx.fillStyle = endTendonColor;
    endLayout.forEach(pos => {
        const z_canvas = startZ;
        const y_canvas = startY + canvasGht - ((pos.y / 1000) * scale);
        ctx.beginPath();
        ctx.arc(z_canvas, y_canvas, tendonRadius, 0, 2 * Math.PI);
        ctx.fill();
    });

    const midTendonColor = '#4f46e5';
    ctx.fillStyle = midTendonColor;
    midLayout.forEach(pos => {
        const z_canvas = startZ + canvasSpanHalf;
        const y_canvas = startY + canvasGht - ((pos.y / 1000) * scale);
        ctx.beginPath();
        ctx.arc(z_canvas, y_canvas, tendonRadius, 0, 2 * Math.PI);
        ctx.fill();
    });
}