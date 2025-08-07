/**
 * Draws the bridge cross-section plot.
 * LATEST VERSION: Hb reaction is fixed, and all annotations are removed.
 * @param {string} targetDivId - The ID of the div element for the plot.
 * @param {object} dims - An object containing all bridge dimension values.
 */
export function drawCrossSectionPlot(targetDivId, dims) {
    // --- Calculate derived values ---
    const H_main = dims.Dt + dims.Dr + dims.Db;  // 主版厚度
    const H_haunch = dims.Ht + dims.Hb;         // 倒角處總深度
    const W = dims.Wb + 2 * dims.Ct;
    const halfWb = dims.Wb / 2;

    // --- Coordinate system: y=0 is TOP of concrete deck, x=0 is centerline. ---
    const slabTopY = 0;
    const mainSlabBottomY = -H_main;            // 主版底部 Y 座標
    const haunchRootBottomY = -H_haunch;        // 倒角根部 Y 座標 (現在會隨 Hb 改變)
    const cantileverTipBottomY = -dims.Ht;      // 懸臂端點 Y 座標
    
    // 使用新的Y座標來定義斷面形狀
    const slabX = [
        -halfWb,           // P1: 主版右下
        halfWb,            // P2: 主版左下
        halfWb,            // P3: 倒角根部右側
        halfWb + dims.Ct,  // P4: 懸臂端點右側
        halfWb + dims.Ct,  // P5: 懸臂頂部右側
        -halfWb - dims.Ct, // P6: 懸臂頂部左側
        -halfWb - dims.Ct, // P7: 懸臂端點左側
        -halfWb,           // P8: 倒角根部左側
        -halfWb,           // P1: 閉合
    ];
    const slabY = [
        mainSlabBottomY,
        mainSlabBottomY,
        haunchRootBottomY,
        cantileverTipBottomY,
        slabTopY,
        slabTopY,
        cantileverTipBottomY,
        haunchRootBottomY,
        mainSlabBottomY
    ];

    // --- Generate shapes for hollow cores (voids) ---
    const cores = [];
    if (dims.N > 0 && dims.Dr > 0) {
        const totalCoresWidth = (dims.N - 1) * dims.Sr;
        const startX = -totalCoresWidth / 2;
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

    const slabTrace = {
        x: slabX, y: slabY, type: 'scatter', mode: 'lines', fill: 'toself',
        fillcolor: 'rgba(203, 213, 225, 0.8)', line: { color: 'rgba(71, 85, 105, 1)', width: 2 },
    };

    const data = [slabTrace];

    // --- Define Plotly layout (Annotations and shapes removed) ---
    const layout = {
        title: '橋梁中央斷面示意圖',
        shapes: cores, // Only draw cores
        xaxis: { 
            title: '寬度 (cm)', 
            scaleanchor: "y", 
            scaleratio: 1, 
            zeroline: false 
        },
        yaxis: { 
            title: '高度 (cm)', 
            scaleratio: 1, 
            zeroline: false 
        },
        showlegend: false,
        margin: { l: 60, r: 20, b: 50, t: 80, pad: 4 },
        paper_bgcolor: 'rgba(255, 255, 255, 1)',
        plot_bgcolor: 'rgba(255, 255, 255, 1)',
        annotations: [] // No annotations
    };

    const config = { responsive: true, displaylogo: false };

    Plotly.react(targetDivId, data, layout, config);
}
