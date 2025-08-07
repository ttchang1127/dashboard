/**
 * Draws the main bridge cross-section plot (center).
 * This function remains unchanged.
 */
export function drawCrossSectionPlot(targetDivId, dims) {
    // ... (此函式內容不變，與上一版相同)
    const H_main = dims.Dt + dims.Dr + dims.Db;
    const H_haunch = dims.Ht + dims.Hb;
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

    const layout = { title: '橋梁中央斷面示意圖', shapes: cores, xaxis: { title: '寬度 (cm)', scaleanchor: "y", scaleratio: 1, zeroline: false }, yaxis: { title: '高度 (cm)', scaleratio: 1, zeroline: false }, showlegend: false, margin: { l: 60, r: 20, b: 50, t: 80, pad: 4 }, paper_bgcolor: 'rgba(255, 255, 255, 1)', plot_bgcolor: 'rgba(255, 255, 255, 1)', annotations: [] };
    const config = { responsive: true, displaylogo: false };
    Plotly.react(targetDivId, data, layout, config);
}

/**
 * NEW (RE-FIXED): Draws the end section plot with correct geometry.
 * The main body has depth H, while the cantilevers have a constant thickness of He.
 * @param {string} targetDivId - The ID of the div element for the plot.
 * @param {object} dims - An object containing all bridge dimension values.
 */
export function drawEndSectionPlot(targetDivId, dims) {
    const endSectionPlotDiv = document.getElementById(targetDivId);
    if (!endSectionPlotDiv || !dims.He) {
        return; 
    }

    // --- Calculate dimensions based on user's clarification ---
    const Wb = dims.Wb;
    const Ct = dims.Ct;
    const H = dims.Dt + dims.Dr + dims.Db; // Total depth of the main body
    const He = dims.He;                    // Constant thickness of the cantilever
    const halfWb = Wb / 2;

    // --- Define vertices for the end section shape ---
    const slabTopY = 0;
    const mainSlabBottomY = -H;          // Bottom of the thick central part
    const cantileverBottomY = -He;       // Bottom of the thinner cantilever part

    const slabX = [
        -halfWb,           // P1: Main slab bottom left
        halfWb,            // P2: Main slab bottom right
        halfWb,            // P3: Corner where haunch would start
        halfWb + Ct,       // P4: Cantilever tip right
        halfWb + Ct,       // P5: Cantilever top right
        -halfWb - Ct,      // P6: Cantilever top left
        -halfWb - Ct,      // P7: Cantilever tip left
        -halfWb,           // P8: Corner where haunch would start (left)
        -halfWb,           // P1: Close loop
    ];
    const slabY = [
        mainSlabBottomY,    // P1
        mainSlabBottomY,    // P2
        cantileverBottomY,  // P3 - Step up from main body to cantilever
        cantileverBottomY,  // P4
        slabTopY,           // P5
        slabTopY,           // P6
        cantileverBottomY,  // P7
        cantileverBottomY,  // P8 - Step up from main body to cantilever
        mainSlabBottomY,    // P1
    ];

    // --- Generate shapes for bearings ---
    const bearings = [];
    const bearingWidth = 50;
    const bearingHeight = 20;
    if (dims.Nb > 0) {
        const startX = -((dims.Nb - 1) * dims.Nbs) / 2;
        for (let i = 0; i < dims.Nb; i++) {
            const centerX = startX + i * dims.Nbs;
            bearings.push({
                type: 'rect', xref: 'x', yref: 'y',
                x0: centerX - bearingWidth / 2,
                y0: mainSlabBottomY - bearingHeight, // Place bearings under the thickest part
                x1: centerX + bearingWidth / 2,
                y1: mainSlabBottomY,
                fillcolor: 'rgba(100, 116, 139, 1)',
                line: { color: 'rgba(30, 41, 59, 1)', width: 1 }
            });
        }
    }

    const slabTrace = {
        x: slabX, y: slabY, type: 'scatter', mode: 'lines', fill: 'toself',
        fillcolor: 'rgba(203, 213, 225, 0.8)', line: { color: 'rgba(71, 85, 105, 1)', width: 2 },
    };
    const data = [slabTrace];

    const layout = {
        title: '橋梁端部斷面示意圖 (含支承)',
        shapes: bearings,
        xaxis: { title: '寬度 (cm)', scaleanchor: "y", scaleratio: 1, zeroline: false },
        yaxis: { title: '高度 (cm)', scaleratio: 1, zeroline: false },
        showlegend: false,
        margin: { l: 60, r: 20, b: 50, t: 80, pad: 4 },
        paper_bgcolor: 'rgba(255, 255, 255, 1)',
        plot_bgcolor: 'rgba(255, 255, 255, 1)',
        annotations: [],
    };
    const config = { responsive: true, displaylogo: false };

    Plotly.react(targetDivId, data, layout, config);
}
