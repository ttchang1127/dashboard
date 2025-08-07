import { initializeTabs, initializeSubTabs, initializeNumberInputs } from './ui_handler.js';
import { drawCrossSectionPlot, drawEndSectionPlot } from './plot_handler.js';

const katexOptions = {
    delimiters: [
        {left: "$", right: "$", display: false},
        {left: "$$", right: "$$", display: true},
    ]
};

function getDimensions() {
    const ids = ['L', 'Ct', 'Ht', 'Hb', 'Dr', 'N', 'Sr', 'Et', 'Dt', 'Db', 'He', 'Nb', 'Nbs'];
    const dimensions = {};

    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            dimensions[id] = parseFloat(element.value) || 0;
        } else {
            dimensions[id] = 0; 
        }
    });

    dimensions.Wb = (dimensions.N - 1) * dimensions.Sr + dimensions.Dr + 2 * dimensions.Et;
    return dimensions;
}

function updateApp() {
    const dims = getDimensions();

    // 更新主要計算結果
    const W = dims.Wb + 2 * dims.Ct;
    const H = dims.Dt + dims.Dr + dims.Db;
    const Eb = dims.Sr - dims.Dr;

    document.getElementById('display-W').textContent = `= ${W.toFixed(1)} cm`;
    document.getElementById('display-H').textContent = `= ${H.toFixed(1)} cm`;
    document.getElementById('display-Eb').textContent = `= ${Eb.toFixed(1)} cm`;
    
    // NEW: 更新端部斷面參數的顯示
    document.getElementById('display-He').textContent = `= ${dims.He.toFixed(1)} cm`;
    document.getElementById('display-Nb').textContent = `= ${dims.Nb}`;
    document.getElementById('display-Nbs').textContent = `= ${dims.Nbs.toFixed(1)} cm`;

    if (window.renderMathInElement) {
        renderMathInElement(document.getElementById('derived-values'), katexOptions);
    }

    drawCrossSectionPlot('cross-section-plot', dims);
    drawEndSectionPlot('end-section-plot', dims);
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
    const endSectionControls = document.getElementById('end-section-controls');
    if(endSectionControls) {
        endSectionControls.addEventListener('input', updateApp);
    }

    if (window.renderMathInElement) {
        renderMathInElement(document.body, katexOptions);
    }

    updateApp();
    console.log("Button functionality fixed. Derived values updated to include end section parameters.");
});
