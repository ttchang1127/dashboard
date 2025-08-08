import { initializeTabs, initializeSubTabs, initializeNumberInputs } from './ui_handler.js';
import { drawCrossSectionPlot, drawEndSectionPlot, drawSideViewPlot } from './plot_handler.js';

// KaTeX 渲染的設定，明確指定 $ 作為分隔符
const katexOptions = {
    delimiters: [
        {left: "$", right: "$", display: false},
        {left: "$$", right: "$$", display: true},
    ]
};

/**
 * 從表單讀取所有尺寸輸入值，並自動計算衍生數值。
 * @returns {object} 包含所有橋梁尺寸的物件。
 */
function getDimensions() {
    // 包含所有頁籤輸入項的 ID 列表
    const ids = ['L', 'Ct', 'Ht', 'Hb', 'Dr', 'N', 'Sr', 'Et', 'Dt', 'Db', 'He', 'Nb', 'Nbs', 'L1', 'L2'];
    const dimensions = {};
    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            dimensions[id] = parseFloat(element.value) || 0;
        } else {
            dimensions[id] = 0; 
        }
    });
    // 自動計算 Wb
    dimensions.Wb = (dimensions.N - 1) * dimensions.Sr + dimensions.Dr + 2 * dimensions.Et;
    return dimensions;
}

/**
 * 統一的更新函式：更新所有計算結果的顯示，並重新繪製所有圖表。
 */
function updateApp() {
    const dims = getDimensions();

    // --- 更新計算結果顯示 ---
    const W = dims.Wb + 2 * dims.Ct;
    const H = dims.Dt + dims.Dr + dims.Db;
    const Eb = dims.Sr - dims.Dr;
    const LT = dims.L + 2 * dims.L1;
    const Lp = dims.L - 2 * dims.L2;

    // 將計算值填入對應的 span 元素
    document.getElementById('display-L-m').textContent = `= ${(dims.L / 100).toFixed(2)} m`;
    document.getElementById('display-W').textContent = `= ${W.toFixed(1)} cm`;
    document.getElementById('display-H').textContent = `= ${H.toFixed(1)} cm`;
    document.getElementById('display-Eb').textContent = `= ${Eb.toFixed(1)} cm`;
    document.getElementById('display-He').textContent = `= ${dims.He.toFixed(1)} cm`;
    document.getElementById('display-Nb').textContent = `= ${dims.Nb}`;
    document.getElementById('display-Nbs').textContent = `= ${dims.Nbs.toFixed(1)} cm`;
    document.getElementById('display-L1').textContent = `= ${dims.L1.toFixed(1)} cm`;
    document.getElementById('display-LT').textContent = `= ${(LT / 100).toFixed(2)} m`;
    document.getElementById('display-Lp').textContent = `= ${Lp.toFixed(1)} cm`;
    
    // 強制重新渲染 KaTeX
    if (window.renderMathInElement) {
        renderMathInElement(document.body, katexOptions);
    }

    // --- 重新繪製所有圖表 ---
    drawCrossSectionPlot('cross-section-plot', dims);
    drawEndSectionPlot('end-section-plot', dims);
    drawSideViewPlot('side-view-plot', dims);
}

// --- 主程式執行入口 ---
document.addEventListener('DOMContentLoaded', () => {
    // 初始化所有 UI 互動功能
    initializeTabs();
    initializeSubTabs();
    initializeNumberInputs();

    // 監聽所有輸入區的變化，統一由 updateApp 處理
    document.getElementById('dimensions-form')?.addEventListener('input', updateApp);
    document.getElementById('end-section-controls')?.addEventListener('input', updateApp);
    document.getElementById('side-view-controls')?.addEventListener('input', updateApp);

    // 頁面載入完成後，立即執行一次，確保所有內容都已渲染
    updateApp();
    
    console.log("Application fully initialized and ready.");
});
