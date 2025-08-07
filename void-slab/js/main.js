import { initializeTabs, initializeSubTabs, initializeNumberInputs } from './ui_handler.js';
import { drawCrossSectionPlot } from './plot_handler.js';

/**
 * 從表單讀取所有尺寸輸入值，並自動計算 Wb。
 * @returns {object} 包含所有橋梁尺寸的物件。
 */
function getDimensions() {
    // 移除了 'Wb'，因為它現在是計算值
    const ids = ['L', 'Ct', 'Ht', 'Hb', 'Dr', 'N', 'Sr', 'Et', 'Dt', 'Db'];
    const dimensions = {};
    ids.forEach(id => {
        const element = document.getElementById(id);
        dimensions[id] = parseFloat(element.value) || 0;
    });

    // 根據公式自動計算 Wb
    // Wb = (N-1)*Sr + Dr + 2*Et
    dimensions.Wb = (dimensions.N - 1) * dimensions.Sr + dimensions.Dr + 2 * dimensions.Et;

    return dimensions;
}

/**
 * 更新左下角的計算結果顯示區，並觸發繪圖更新。
 */
function updateDerivedValuesAndPlot() {
    // 1. 取得所有最新的尺寸數據 (包含自動計算的 Wb)
    const dims = getDimensions();

    // 2. 根據最新數據計算 W, H, Eb
    const W = dims.Wb + 2 * dims.Ct;
    // UPDATED: H 的計算公式已更新
    const H = dims.Dt + dims.Dr + dims.Db; 
    const Eb = dims.Sr - dims.Dr;

    // 3. 更新 HTML 元素以顯示計算結果
    document.getElementById('display-W').textContent = `= ${W.toFixed(1)} cm`;
    document.getElementById('display-H').textContent = `= ${H.toFixed(1)} cm`;
    document.getElementById('display-Eb').textContent = `= ${Eb.toFixed(1)} cm`;
    
    // 4. ***關鍵修正***: 再次呼叫 KaTeX 渲染函式，確保公式能正確顯示
    // 這是解決數學符號顯示問題的核心
    if (window.renderMathInElement) {
        renderMathInElement(document.getElementById('derived-values'), {
             delimiters: [
                {left: "$", right: "$", display: false}
            ]
        });
    }

    // 5. 使用最新的尺寸數據重新繪製斷面圖
    drawCrossSectionPlot('cross-section-plot', dims);
}

// --- 主程式執行入口 ---
document.addEventListener('DOMContentLoaded', () => {
    // 初始化所有 UI 互動功能
    initializeTabs();
    initializeSubTabs();
    initializeNumberInputs();

    // 為整個表單添加一個 'input' 事件監聽器
    const dimensionsForm = document.getElementById('dimensions-form');
    if (dimensionsForm) {
        // 當任何輸入改變時，觸發統一的更新函式
        dimensionsForm.addEventListener('input', updateDerivedValuesAndPlot);
    }

    // 頁面載入後，立即執行一次計算與繪圖，以顯示初始狀態
    updateDerivedValuesAndPlot();

    console.log("Application updated: H calculation fixed, KaTeX rendering forced on update.");
});