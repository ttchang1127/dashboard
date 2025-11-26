/**
 * 繪製橋梁中央斷面圖 (含旋楞管編號)。
 * @param {string} targetDivId - 目標 div 的 ID。
 * @param {object} dims - 包含所有尺寸的物件。
 * @param {Array} [tendons=[]] - 預力鋼腱位置資料。
 */
export function drawCrossSectionPlot(targetDivId, dims, tendons = []) {
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

    const slabTrace = { x: slabX, y: slabY, type: 'scatter', mode: 'lines', fill: 'toself', fillcolor: 'rgba(226, 232, 240, 0.8)', line: { color: 'rgba(71, 85, 105, 1)', width: 2 } };
    const data = [slabTrace];

    // 使用 shapes 繪製旋楞管的圓圈輪廓
    const ductShapes = [];
    if (dims.N > 0 && dims.Dr > 0) {
        const startX = -((dims.N - 1) * dims.Sr) / 2;
        const coreCenterY = -dims.Dt - (dims.Dr / 2);
        for (let i = 0; i < dims.N; i++) {
            const ductX = startX + i * dims.Sr;
            ductShapes.push({
                type: 'circle',
                xref: 'x', yref: 'y',
                x0: ductX - dims.Dr / 2, y0: coreCenterY - dims.Dr / 2,
                x1: ductX + dims.Dr / 2, y1: coreCenterY + dims.Dr / 2,
                fillcolor: 'rgba(241, 245, 249, 1)',
                line: {
                    color: 'rgba(148, 163, 184, 1)',
                    width: 1.5
                }
            });
        }
    }

    // 使用 scatter trace 繪製旋楞管的中心十字點和編號
    if (dims.N > 0 && dims.Dr > 0) {
        const ductCoords = { x: [], y: [], text: [] };
        const startX = -((dims.N - 1) * dims.Sr) / 2;
        const coreCenterY = -dims.Dt - (dims.Dr / 2);
        for (let i = 0; i < dims.N; i++) {
            ductCoords.x.push(startX + i * dims.Sr);
            ductCoords.y.push(coreCenterY);
            ductCoords.text.push(`<b>${i + 1}</b>`);
        }
        
        const ductCenterTrace = {
            x: ductCoords.x,
            y: ductCoords.y,
            text: ductCoords.text,
            mode: 'markers+text',
            type: 'scatter',
            marker: {
                color: 'rgba(71, 85, 105, 1)',
                symbol: 'cross-thin',
                size: 8,
                line: { width: 2 }
            },
            textposition: 'top center',
            textfont: {
                color: 'rgba(51, 65, 85, 1)',
                size: 10,
            },
            name: 'Ducts Centers'
        };
        data.push(ductCenterTrace);
    }

    // 繪製鋼腱
    if (tendons.length > 0) {
        const tendonTrace = {
            x: tendons.map(t => t.x_coord),
            y: tendons.map(t => t.y_mid),
            text: tendons.map(t => `<b>${t.id}</b>`),
            mode: 'markers+text',
            type: 'scatter',
            marker: { color: '#ef4444', size: 16 },
            textfont: { color: '#ffffff', size: 9, },
            name: 'Tendons'
        };
        data.push(tendonTrace);
    }
    
    // 計算統一的 Y 軸範圍
    const bearingHeight = 20;
    const commonMinY = Math.min(haunchRootBottomY, mainSlabBottomY - bearingHeight) * 1.2;
    const commonMaxY = slabTopY + H_main * 0.2;

    const layout = { 
        title: '橋梁中央斷面 (Mid-span Section)', 
        xaxis: { title: '寬度 (cm)', scaleanchor: "y", scaleratio: 1, zeroline: false, range: [-W/2 * 1.1, W/2 * 1.1] }, 
        yaxis: { title: '高度 (cm)', scaleratio: 1, zeroline: false, range: [commonMinY, commonMaxY] }, 
        showlegend: false, 
        margin: { l: 60, r: 20, b: 50, t: 80, pad: 4 }, 
        paper_bgcolor: 'rgba(255, 255, 255, 1)', 
        plot_bgcolor: 'rgba(255, 255, 255, 1)',
        shapes: ductShapes, // 將圓圈形狀添加到 layout.shapes
    };
    const config = { responsive: true, displaylogo: false };
    Plotly.react(targetDivId, data, layout, config);
}


/**
 * 繪製橋梁端部斷面圖
 * @param {string} targetDivId - 目標 div 的 ID。
 * @param {object} dims - 包含所有尺寸的物件。
 * @param {Array} [tendons=[]] - 預力鋼腱位置資料。
 */
export function drawEndSectionPlot(targetDivId, dims, tendons = []) {
    const plotDiv = document.getElementById(targetDivId);
    if (!plotDiv || !dims.He) return;

    const Wb = dims.Wb;
    const Ct = dims.Ct;
    const H = dims.Dt + dims.Dr + dims.Db;
    const H_haunch = dims.Ht + dims.Hb;
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

    if (tendons.length > 0) {
        const tendonTrace = {
            x: tendons.map(t => t.x_coord),
            y: tendons.map(t => t.y_end),
            text: tendons.map(t => `<b>${t.id}</b>`),
            mode: 'markers+text',
            type: 'scatter',
            marker: { color: '#be185d', size: 16 },
            textfont: {
                color: '#ffffff',
                size: 9,
            },
            name: 'Tendons'
        };
        data.push(tendonTrace);
    }

    const commonMinY = Math.min(-H_haunch, mainSlabBottomY - bearingHeight) * 1.2;
    const commonMaxY = slabTopY + H * 0.2;

    const layout = { 
        title: '橋梁端部斷面 (End Section)', 
        shapes: [...bearings, ...cores_dashed], 
        xaxis: { title: '寬度 (cm)', scaleanchor: "y", scaleratio: 1, zeroline: false, range: [-W/2 * 1.1, W/2 * 1.1] }, 
        yaxis: { title: '高度 (cm)', scaleratio: 1, zeroline: false, range: [commonMinY, commonMaxY] }, 
        showlegend: false, 
        margin: { l: 60, r: 20, b: 50, t: 80, pad: 4 }, 
        paper_bgcolor: 'rgba(255, 255, 255, 1)', 
        plot_bgcolor: 'rgba(255, 255, 255, 1)',
    };
    const config = { responsive: true, displaylogo: false };
    Plotly.react(targetDivId, data, layout, config);
}

/**
 * 繪製橋梁側視圖，包含支承與旋楞管位置
 * @param {string} targetDivId - 目標 div 的 ID。
 * @param {object} dims - 包含所有尺寸的物件。
 * @param {object} [tendonProfile=null] - 鋼腱縱向線形資料。
 */
export function drawSideViewPlot(targetDivId, dims, tendonProfile = null) {
    const plotDiv = document.getElementById(targetDivId);
    if (!plotDiv) return;

    // --- 變數定義 ---
    const L_cm = dims.L;
    const L1_cm = dims.L1;
    const L2_cm = dims.L2;
    const H_main = dims.Dt + dims.Dr + dims.Db;
    const Dr = dims.Dr;
    const Dt = dims.Dt;
    
    // --- X 軸座標 (m) ---
    const bridgeLeftEnd_m = -L1_cm / 100;
    const bridgeRightEnd_m = (L_cm + L1_cm) / 100;
    const leftSupport_m = 0;
    const rightSupport_m = L_cm / 100;
    const ductStart_m = L2_cm / 100;
    const ductEnd_m = (L_cm - L2_cm) / 100;

    // --- 橋梁輪廓 (Y座標為正，向下為正) ---
    const bridgeY = [0, 0, H_main, H_main, 0];
    const bridgeX_m = [bridgeLeftEnd_m, bridgeRightEnd_m, bridgeRightEnd_m, bridgeLeftEnd_m, bridgeLeftEnd_m];

    const bridgeTrace = {
        x: bridgeX_m, y: bridgeY, type: 'scatter', mode: 'lines',
        fill: 'toself', fillcolor: 'rgba(226, 232, 240, 0.8)',
        line: { color: 'rgba(71, 85, 105, 1)', width: 2 },
    };
    const data = [bridgeTrace];

    // --- Plotly 形狀 (支承、旋楞管虛線) ---
    const shapes = [];
    const supportWidth_m = 50 / 100;
    const supportHeight_cm = 15;

    // 左支承
    shapes.push({
        type: 'rect', xref: 'x', yref: 'y',
        x0: leftSupport_m - supportWidth_m / 2, y0: H_main,
        x1: leftSupport_m + supportWidth_m / 2, y1: H_main + supportHeight_cm,
        fillcolor: 'rgba(100, 116, 139, 1)', line: { color: 'rgba(30, 41, 59, 1)', width: 1 }
    });
    // 右支承
    shapes.push({
        type: 'rect', xref: 'x', yref: 'y',
        x0: rightSupport_m - supportWidth_m / 2, y0: H_main,
        x1: rightSupport_m + supportWidth_m / 2, y1: H_main + supportHeight_cm,
        fillcolor: 'rgba(100, 116, 139, 1)', line: { color: 'rgba(30, 41, 59, 1)', width: 1 }
    });

    // 旋楞管 (虛線)
    shapes.push({
        type: 'rect', xref: 'x', yref: 'y',
        x0: ductStart_m, y0: Dt,
        x1: ductEnd_m, y1: Dt + Dr,
        fillcolor: 'rgba(0,0,0,0)', line: { color: 'rgba(71, 85, 105, 1)', width: 2, dash: 'dash' }
    });

    // --- 鋼腱線形 (Y座標從負轉為正) ---
    if (tendonProfile && tendonProfile.x.length > 0) {
        const profileTrace = {
            x: tendonProfile.x,
            y: tendonProfile.y.map(y => -y), // 將計算出的負座標轉為正值以符合本圖座標系
            mode: 'lines',
            line: { color: '#ea580c', dash: 'dashdot', width: 2.5 },
            name: 'Tendon Profile'
        };
        data.push(profileTrace);
    }
    
    // --- 與斷面圖同步的 Y 軸範圍 ---
    const H_haunch = dims.Ht + dims.Hb;
    const slabTopY_cs = 0;
    const mainSlabBottomY_cs = -H_main;
    const haunchRootBottomY_cs = -H_haunch;
    const bearingHeight_cs = 20;
    const commonMinY_cs = Math.min(haunchRootBottomY_cs, mainSlabBottomY_cs - bearingHeight_cs) * 1.2;
    const commonMaxY_cs = slabTopY_cs + H_main * 0.2;

    // --- Layout 定義 ---
    const layout = {
        title: '橋梁側視圖',
        shapes: shapes,
        xaxis: { 
            title: '長度 (m)', 
            zeroline: false,
            range: [bridgeLeftEnd_m - (L_cm/100)*0.05, bridgeRightEnd_m + (L_cm/100)*0.05]
        },
        yaxis: { 
            title: '深度 (cm)', 
            zeroline: false,
            range: [-commonMaxY_cs, -commonMinY_cs], // 使用同步的範圍大小
            autorange: 'reversed' // 將 y=0 放在圖表頂部
        },
        showlegend: false,
        margin: { l: 60, r: 20, b: 50, t: 80, pad: 4 },
        paper_bgcolor: 'rgba(255, 255, 255, 1)',
        plot_bgcolor: 'rgba(255, 255, 255, 1)'
    };

    const config = { responsive: true, displaylogo: false };
    Plotly.react(targetDivId, data, layout, config);
}
