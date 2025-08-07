import { initializeTabs, initializeSubTabs, initializeNumberInputs } from './ui_handler.js';
import { drawCrossSectionPlot } from './plot_handler.js';

// KaTeX 渲染的設定，明確指定 $ 作為分隔符
const katexOptions = {
    delimiters: [
        {left: "$", right: "$", display: false},
        {left: "$$", right: "$$", display: true},
    ]
};

/**
 * 從表單讀取所有尺寸輸入值，並自動計算 Wb。
 * @returns {object} 包含所有橋梁尺寸的物件。
 */
function getDimensions() {
    const ids = ['L', 'Ct', 'Ht', 'Hb', 'Dr', 'N', 'Sr', 'Et', 'Dt', 'Db'];
    const dimensions = {};

    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            dimensions[id] = parseFloat(element.value) || 0;
        } else {
            console.error(`錯誤：在 HTML 中找不到 ID 為 '${id}' 的元素。`);
            dimensions[id] = 0; 
        }
    });

    dimensions.Wb = (dimensions.N - 1) * dimensions.Sr + dimensions.Dr + 2 * dimensions.Et;
    return dimensions;
}

/**
 * 更新所有計算與圖表。
 */
function updateApp() {
    const dims = getDimensions();

    const W = dims.Wb + 2 * dims.Ct;
    const H = dims.Dt + dims.Dr + dims.Db;
    const Eb = dims.Sr - dims.Dr;

    document.getElementById('display-W').textContent = `= ${W.toFixed(1)} cm`;
    document.getElementById('display-H').textContent = `= ${H.toFixed(1)} cm`;
    document.getElementById('display-Eb').textContent = `= ${Eb.toFixed(1)} cm`;
    
    // *** 關鍵修正 2：只渲染有變化的「計算結果」區域 ***
    if (window.renderMathInElement) {
        renderMathInElement(document.getElementById('derived-values'), katexOptions);
    }

    drawCrossSectionPlot('cross-section-plot', dims);
}

// --- 主程式執行入口 ---
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeSubTabs();
    initializeNumberInputs();

    const dimensionsForm = document.getElementById('dimensions-form');
    if (dimensionsForm) {
        dimensionsForm.addEventListener('input', updateApp);
    }

    // *** 關鍵修正 1：在頁面載入完成後，對整個頁面進行一次完整的 KaTeX 渲染 ***
    // 這將確保所有靜態標籤 (label) 都被正確渲染
    if (window.renderMathInElement) {
        renderMathInElement(document.body, katexOptions);
    }

    // 執行一次初始計算與繪圖
    updateApp();
    
    console.log("Application loaded. KaTeX rendering strategy has been updated.");
});
