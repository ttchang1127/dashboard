/**
 * Draws the bridge cross-section plot.
 * THIS IS THE LATEST VERSION with fixed JS error, cleaned-up annotations, 
 * and removed non-structural layers.
 * @param {string} targetDivId - The ID of the div element for the plot.
 * @param {object} dims - An object containing all bridge dimension values (including calculated Wb).
 */
export function drawCrossSectionPlot(targetDivId, dims) {
    // --- Calculate derived values ---
    // UPDATED: H is now calculated based on Dt, Dr, Db as per request.
    const H = dims.Dt + dims.Dr + dims.Db;
    const W = dims.Wb + 2 * dims.Ct;
    const halfWb = dims.Wb / 2;

    // --- Coordinate system: y=0 is TOP of concrete deck, x=0 is centerline.
    const slabTopY = 0;
    const slabBottomY = -H;
    const cantileverTopY = 0; // Top is flat
    const cantileverBottomY = -dims.Ht;
    // The haunch connects the main slab bottom to the cantilever bottom
    // We can simplify the main slab shape drawing based on this
    
    const slabX = [
        -halfWb, -halfWb - dims.Ct, -halfWb - dims.Ct, halfWb + dims.Ct, halfWb + dims.Ct, halfWb, -halfWb
    ];
    const slabY = [
        slabBottomY, cantileverBottomY, cantileverTopY, cantileverTopY, cantileverBottomY, slabBottomY, slabBottomY
    ];


    // --- Generate shapes for hollow cores (voids) ---
    const cores = [];
    if (dims.N > 0 && dims.Dr > 0) {
        const totalCoresWidth = (dims.N - 1) * dims.Sr;
        const startX = -totalCoresWidth / 2;
        // Correctly calculate the Y center based on top edge (Dt) and diameter (Dr)
        const coreCenterY = -dims.Dt - (dims.Dr / 2); 
        
        for (let i = 0; i < dims.N; i++) {
            cores.push({
                type: 'circle', xref: 'x', yref: 'y',
                x0: startX + i * dims.Sr - dims.Dr / 2, y0: coreCenterY - dims.Dr / 2,
                x1: startX + i * dims.Sr + dims.Dr / 2, y1: coreCenterY + dims.Dr / 2,
                fillcolor: 'rgba(248, 250, 252, 1)',
                line: { color: 'rgba(71, 85, 105, 1)', width: 2 } 
            });
        }
    }

    // --- Define Plotly traces (Only the concrete slab) ---
    const slabTrace = {
        x: slabX, y: slabY, type: 'scatter', mode: 'lines', fill: 'toself',
        fillcolor: 'rgba(203, 213, 225, 0.8)', line: { color: 'rgba(71, 85, 105, 1)', width: 2 }, name: '混凝土版'
    };

    const data = [slabTrace];

    // --- Define dimension annotations and shapes (lines) ---
    const annotations = [];
    const annotationShapes = [];
    const annoFont = { family: 'Arial, sans-serif', size: 12, color: '#1e293b' };
    const annoLine = { color: '#64748b', width: 1 };
    const extLine = { color: '#cbd5e1', width: 1, dash: 'dot' };

    // Helper function for creating dimension lines
    const addDimLine = (x0, y0, x1, y1, text) => {
        const isHorizontal = y0 === y1;
        const tickSize = 10;
        annotationShapes.push({ type: 'line', layer: 'above', x0, y0, x1, y1, line: annoLine });
        if (isHorizontal) {
            annotationShapes.push({ type: 'line', layer: 'above', x0, y0: y0 - tickSize/2, x1: x0, y1: y0 + tickSize/2, line: annoLine });
            annotationShapes.push({ type: 'line', layer: 'above', x1, y0: y1 - tickSize/2, x1: x1, y1: y1 + tickSize/2, line: annoLine });
            annotations.push({ x: (x0 + x1) / 2, y: y0, text, showarrow: false, font: annoFont, yshift: 8 });
        } else { // Vertical
            annotationShapes.push({ type: 'line', layer: 'above', x0: x0 - tickSize/2, y0, x1: x0 + tickSize/2, y1: y0, line: annoLine });
            annotationShapes.push({ type: 'line', layer: 'above', x0: x1 - tickSize/2, y0: y1, x1: x1 + tickSize/2, y1: line: annoLine });
            // FIXED: Used x0 instead of undefined x
            annotations.push({ x: x0, y: (y0 + y1) / 2, text, showarrow: false, font: annoFont, xshift: -8, textangle: -90 });
        }
    };
    
    // Y positions for horizontal dimension lines
    const yDim1 = H * 0.15 + 10;
    const yDim2 = H * 0.35 + 10;
    const yDim3 = H * 0.55 + 10;

    // X position for vertical dimension lines
    const xDim = -W / 2 - H * 0.1;

    // --- Horizontal Dimensions ---
    annotationShapes.push({type:'line', x0: -W/2, y0: slabTopY, x1: -W/2, y1: yDim2 + 15, line: extLine});
    annotationShapes.push({type:'line', x0: -halfWb, y0: slabBottomY, x1: -halfWb, y1: yDim1 + 15, line: extLine});
    annotationShapes.push({type:'line', x0: halfWb, y0: slabBottomY, x1: halfWb, y1: yDim1 + 15, line: extLine});
    annotationShapes.push({type:'line', x0: W/2, y0: slabTopY, x1: W/2, y1: yDim2 + 15, line: extLine});
    addDimLine(-W/2, yDim2, W/2, `W=${W.toFixed(1)}`);
    addDimLine(-W/2, yDim1, -halfWb, `Ct=${dims.Ct}`);
    addDimLine(-halfWb, yDim1, halfWb, `Wb=${dims.Wb.toFixed(1)}`);
    addDimLine(halfWb, yDim1, W/2, `Ct=${dims.Ct}`);

    // --- Vertical Dimensions ---
    annotationShapes.push({type:'line', x0: xDim - 15, y0: slabTopY, x1: -W/2, y1: slabTopY, line: extLine});
    annotationShapes.push({type:'line', x0: xDim - 15, y0: slabBottomY, x1: -halfWb, y1: slabBottomY, line: extLine});
    addDimLine(xDim, slabTopY, slabBottomY, `H=${H}`);
    
    // --- Core Dimensions ---
    if (dims.N > 1) {
        const startX = -(dims.N - 1) / 2 * dims.Sr;
        annotationShapes.push({type:'line', x0: startX, y0: slabTopY, x1: startX, y1: yDim3 + 15, line: extLine});
        annotationShapes.push({type:'line', x0: startX + dims.Sr, y0: slabTopY, x1: startX + dims.Sr, y1: yDim3 + 15, line: extLine});
        addDimLine(startX, yDim3, startX + dims.Sr, `Sr=${dims.Sr}`);
    }
    
    // --- Define Plotly layout ---
    const layout = {
        title: '橋梁中央斷面示意圖',
        shapes: [...cores, ...annotationShapes],
        xaxis: { title: '寬度 (cm)', scaleanchor: "y", scaleratio: 1, zeroline: false, range: [-W/2 - H*0.4, W/2 + H*0.3] },
        yaxis: { title: '高度 (cm)', scaleratio: 1, zeroline: false, range: [slabBottomY - H*0.4, slabTopY + H*1.0] },
        showlegend: false,
        margin: { l: 60, r: 20, b: 50, t: 80, pad: 4 },
        paper_bgcolor: 'rgba(255, 255, 255, 1)',
        plot_bgcolor: 'rgba(255, 255, 255, 1)',
        annotations: annotations
    };

    const config = { responsive: true, displaylogo: false };

    Plotly.react(targetDivId, data, layout, config);
}