/**
 * 繪製橋梁中央斷面圖 (含旋楞管)。
 * @param {string} targetDivId - 目標 div 的 ID。
 * @param {object} dims - 包含所有尺寸的物件。
 */
export function drawCrossSectionPlot(targetDivId, dims) {
    const plotDiv = document.getElementById(targetDivId);
    if (!plotDiv) return;

    const H_main = dims.Dt + dims.Dr + dims.Db;
    const H_haunch = dims.Ht + dims.Hb;
    const W = dims.Wb + 2 * dims.Ct;
    const halfWb = dims.Wb / 2;

    const slabTopY = 0;
    const mainSlabBottomY = -H_main;
    const haunchRootBottomY = -H_haunch;
    const cantileverTipBottomY = -dims.Ht;
    
    const slabX = [ -halfWb, halfWb, halfWb, halfWb + dims.Ct, halfWb + dims.Ct, -halfWb - dims.Ct, -halfWb - dims.Ct, -halfWb, -halfWb ];
    const slabY = [ mainSlabBottomY, mainSlabBottomY, haunchRootBottomY, cantileverTipBottomY, slabTopY, slabTopY, cantileverTipBottomY, haunchRootBottomY, mainSlabBottomY ];

    const cores = [];
    if (dims.N > 0 && dims.Dr > 0) {
        const startX = -((dims.N - 1) * dims.Sr) / 2;
        const coreCenterY = -dims.Dt - (dims.Dr / 2);
        for (let i = 0; i < dims.N; i++) {
            cores.push({ type: 'circle', xref: 'x', yref: 'y', x0: startX + i * dims.Sr - dims.Dr / 2, y0: coreCenterY - dims.Dr / 2, x1: startX + i * dims.Sr + dims.Dr / 2, y1: coreCenterY + dims.Dr / 2, fillcolor: 'rgba(248, 250, 252, 1)', line: { color: 'rgba(71, 85, 105, 1)', width: 2 } });
        }
    }

    const slabTrace = { x: slabX, y: slabY, type: 'scatter', mode: 'lines', fill: 'toself', fillcolor: 'rgba(203, 213, 225, 0.8)', line: { color: 'rgba(71, 85, 105, 1)', width: 2 } };
    const data = [slabTrace];

    // *** 關鍵修正 1：計算一個能包含兩個斷面圖所有特徵的 Y 軸範圍 ***
    const bearingHeight = 20; // 假設的支承高度
    const commonMinY = Math.min(haunchRootBottomY, mainSlabBottomY - bearingHeight) * 1.2;
    const commonMaxY = slabTopY + H_main * 0.2;

    const layout = { 
        title: '橋梁中央斷面示意圖', 
        shapes: cores, 
        xaxis: { 
            title: '寬度 (cm)', 
            scaleanchor: "y", 
            scaleratio: 1, 
            zeroline: false,
            range: [-W/2 * 1.1, W/2 * 1.1]
        }, 
        yaxis: { 
            title: '高度 (cm)', 
            scaleratio: 1, 
            zeroline: false,
            range: [commonMinY, commonMaxY] // 使用統一的 Y 軸範圍
        }, 
        showlegend: false, 
        margin: { l: 60, r: 20, b: 50, t: 80, pad: 4 }, 
        paper_bgcolor: 'rgba(255, 255, 255, 1)', 
        plot_bgcolor: 'rgba(255, 255, 255, 1)', 
        annotations: [] 
    };
    const config = { responsive: true, displaylogo: false };
    Plotly.react(targetDivId, data, layout, config);
}

/**
 * 繪製橋梁端部斷面圖 (實心，含支承與虛線旋楞管)。
 * @param {string} targetDivId - 目標 div 的 ID。
 * @param {object} dims - 包含所有尺寸的物件。
 */
export function drawEndSectionPlot(targetDivId, dims) {
    const plotDiv = document.getElementById(targetDivId);
    if (!plotDiv || !dims.He) return;

    const Wb = dims.Wb;
    const Ct = dims.Ct;
    const H = dims.Dt + dims.Dr + dims.Db;
    const H_haunch = dims.Ht + dims.Hb; // 中央斷面的倒角深度
    const W = Wb + 2 * Ct;
    const He = dims.He;
    const halfWb = Wb / 2;

    const slabTopY = 0;
    const mainSlabBottomY = -H;
    const cantileverBottomY = -He;

    const slabX = [ -halfWb, halfWb, halfWb, halfWb + Ct, halfWb + Ct, -halfWb - Ct, -halfWb - Ct, -halfWb, -halfWb ];
    const slabY = [ mainSlabBottomY, mainSlabBottomY, cantileverBottomY, cantileverBottomY, slabTopY, slabTopY, cantileverBottomY, cantileverBottomY, mainSlabBottomY ];

    const bearings = [];
    const bearingWidth = 50;
    const bearingHeight = 20;
    if (dims.Nb > 0) {
        const startX = -((dims.Nb - 1) * dims.Nbs) / 2;
        for (let i = 0; i < dims.Nb; i++) {
            const centerX = startX + i * dims.Nbs;
            bearings.push({ type: 'rect', xref: 'x', yref: 'y', x0: centerX - bearingWidth / 2, y0: mainSlabBottomY - bearingHeight, x1: centerX + bearingWidth / 2, y1: mainSlabBottomY, fillcolor: 'rgba(100, 116, 139, 1)', line: { color: 'rgba(30, 41, 59, 1)', width: 1 } });
        }
    }

    const cores_dashed = [];
    if (dims.N > 0 && dims.Dr > 0) {
        const startX = -((dims.N - 1) * dims.Sr) / 2;
        const coreCenterY = -dims.Dt - (dims.Dr / 2);
        for (let i = 0; i < dims.N; i++) {
            cores_dashed.push({ type: 'circle', xref: 'x', yref: 'y', x0: startX + i * dims.Sr - dims.Dr / 2, y0: coreCenterY - dims.Dr / 2, x1: startX + i * dims.Sr + dims.Dr / 2, y1: coreCenterY + dims.Dr / 2, fillcolor: 'rgba(0,0,0,0)', line: { color: 'rgba(100, 116, 139, 0.7)', width: 2, dash: 'dash' } });
        }
    }

    const slabTrace = { x: slabX, y: slabY, type: 'scatter', mode: 'lines', fill: 'toself', fillcolor: 'rgba(203, 213, 225, 0.8)', line: { color: 'rgba(71, 85, 105, 1)', width: 2 } };
    const data = [slabTrace];

    // *** 關鍵修正 1：計算一個能包含兩個斷面圖所有特徵的 Y 軸範圍 ***
    const commonMinY = Math.min(-H_haunch, mainSlabBottomY - bearingHeight) * 1.2;
    const commonMaxY = slabTopY + H * 0.2;

    const layout = { 
        title: '橋梁端部斷面示意圖 (含支承)', 
        shapes: [...bearings, ...cores_dashed], 
        xaxis: { 
            title: '寬度 (cm)', 
            scaleanchor: "y", 
            scaleratio: 1, 
            zeroline: false,
            range: [-W/2 * 1.1, W/2 * 1.1]
        }, 
        yaxis: { 
            title: '高度 (cm)', 
            scaleratio: 1, 
            zeroline: false,
            range: [commonMinY, commonMaxY] // 使用統一的 Y 軸範圍
        }, 
        showlegend: false, 
        margin: { l: 60, r: 20, b: 50, t: 80, pad: 4 }, 
        paper_bgcolor: 'rgba(255, 255, 255, 1)', 
        plot_bgcolor: 'rgba(255, 255, 255, 1)', 
        annotations: [] 
    };
    const config = { responsive: true, displaylogo: false };
    Plotly.react(targetDivId, data, layout, config);
}

/**
 * 繪製橋梁側視圖。
 * @param {string} targetDivId - 目標 div 的 ID。
 * @param {object} dims - 包含所有尺寸的物件。
 */
export function drawSideViewPlot(targetDivId, dims) {
    const plotDiv = document.getElementById(targetDivId);
    if (!plotDiv) return;

    const L = dims.L;
    const L1 = dims.L1;
    const L2 = dims.L2;
    const H = dims.Dt + dims.Dr + dims.Db;
    const Dr = dims.Dr;
    const Dt = dims.Dt;
    
    const bridgeLeftEnd_m = -L1 / 100;
    const bridgeRightEnd_m = (L + L1) / 100;
    const leftSupport_m = 0;
    const rightSupport_m = L / 100;
    const ductStart_m = L2 / 100;
    const ductEnd_m = (L - L2) / 100;

    // *** 關鍵修正 2：修正橋梁輪廓 Y 座標，確保圖形閉合 ***
    const bridgeY = [0, 0, H, H, 0]; 
    const bridgeX_m = [bridgeLeftEnd_m, bridgeRightEnd_m, bridgeRightEnd_m, bridgeLeftEnd_m, bridgeLeftEnd_m];

    const shapes = [];
    const supportWidth_cm = 50;
    const supportWidth_m = supportWidth_cm / 100;
    const supportHeight_cm = 15;

    shapes.push({
        type: 'rect', xref: 'x', yref: 'y',
        x0: leftSupport_m - supportWidth_m / 2, y0: -supportHeight_cm,
        x1: leftSupport_m + supportWidth_m / 2, y1: 0,
        fillcolor: 'rgba(100, 116, 139, 1)', line: { color: 'rgba(30, 41, 59, 1)', width: 1 }
    });
    shapes.push({
        type: 'rect', xref: 'x', yref: 'y',
        x0: rightSupport_m - supportWidth_m / 2, y0: -supportHeight_cm,
        x1: rightSupport_m + supportWidth_m / 2, y1: 0,
        fillcolor: 'rgba(100, 116, 139, 1)', line: { color: 'rgba(30, 41, 59, 1)', width: 1 }
    });

    shapes.push({
        type: 'rect', xref: 'x', yref: 'y',
        x0: ductStart_m, y0: H - Dt - Dr,
        x1: ductEnd_m, y1: H - Dt,
        fillcolor: 'rgba(0,0,0,0)', line: { color: 'rgba(71, 85, 105, 1)', width: 2, dash: 'dash' }
    });

    const bridgeTrace = {
        x: bridgeX_m, y: bridgeY, type: 'scatter', mode: 'lines',
        fill: 'toself', fillcolor: 'rgba(203, 213, 225, 0.8)',
        line: { color: 'rgba(71, 85, 105, 1)', width: 2 },
    };
    const data = [bridgeTrace];

    const layout = {
        title: '橋梁側視圖',
        shapes: shapes,
        xaxis: { 
            title: '長度 (m)', 
            zeroline: false,
            range: [bridgeLeftEnd_m - (L/100)*0.05, bridgeRightEnd_m + (L/100)*0.05]
        },
        yaxis: { 
            title: '高度 (cm)', 
            zeroline: false,
            range: [-400, 200] 
        },
        showlegend: false,
        margin: { l: 60, r: 20, b: 50, t: 80, pad: 4 },
        paper_bgcolor: 'rgba(255, 255, 255, 1)',
        plot_bgcolor: 'rgba(255, 255, 255, 1)'
    };

    const config = { responsive: true, displaylogo: false };
    Plotly.react(targetDivId, data, layout, config);
}
