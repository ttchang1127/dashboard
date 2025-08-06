// js/ui_handler.js

// 導入所有需要的計算和繪圖函式
import * as Calcs from './calculations.js';
import * as Drawer from './canvas_drawer.js';

// 模組內的變數，用來儲存 DOM 元素的引用
let domElements = {};

// 模組內的變數，用來儲存靜態資料
let staticData = {};

/**
 * 初始化UI處理器
 * @param {object} elements - 從 main.js 傳入的 DOM 元素引用集合
 * @param {object} data - 從 main.js 傳入的靜態資料 (spanDefaults, etc.)
 */
export function initializeUI(elements, data) {
    domElements = elements;
    staticData = data;
    
    // 初始載入預設值
    updateDefaultsBySpan();
    syncTendonCounts();
    updateTendonProperties();
}

/**
 * 主更新函式，由 main.js 在使用者互動時呼叫
 */
export function updateUI() {
    // 1. 讀取所有輸入框的當前值
    const inputs = {};
    for (const key in domElements.inputs) {
        inputs[key] = domElements.inputs[key].value;
    }

    // 2. 執行核心計算
    const props = Calcs.getSectionProperties(inputs);
    if (!props) {
        // 如果斷面資料無效，可以顯示錯誤訊息並停止後續計算
        console.error("斷面尺寸無效，無法計算。");
        return;
    }
    
    // 執行所有檢核計算
    const lossResults = Calcs.calculatePrestressLosses(inputs, props);
    const stressCheckResults = Calcs.performStressChecks(inputs, props, lossResults);
    const flexureCheckResults = Calcs.performFlexureChecks(inputs, props);
    const deflectionCheckResults = Calcs.performDeflectionChecks(inputs, props);
    const shearCheckResults = Calcs.performShearChecks(inputs);

    // 3. 將計算結果渲染到畫面上
    renderLossResults(lossResults);
    renderStressCheckResults(stressCheckResults);
    renderFlexureCheckResults(flexureCheckResults);
    renderDeflectionCheckResults(deflectionCheckResults);
    renderShearCheckResults(shearCheckResults);
    
    // 更新其他UI元素
    updateTendonCoordinatesTable();

    // 4. 呼叫繪圖模組來更新 Canvas
    Drawer.updateAllCanvases(domElements.canvases, inputs);
    
    // 5. 重新渲染 KaTeX 數學公式
    if (window.renderMathInElement) {
        renderMathInElement(document.getElementById('main-content-wrapper'), {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
            ]
        });
    }
}

// --- UI Helper Functions (Previously in the main script) ---

function updateDefaultsBySpan() {
    const selectedSpan = domElements.inputs['bridge-span'].value;
    const defaults = staticData.spanDefaults[selectedSpan];
    if (!defaults) return;

    for (const key in defaults) {
        if (domElements.inputs[key]) {
            domElements.inputs[key].value = defaults[key];
        }
    }
    
    if (defaults.tendons) {
        domElements.inputs['tendon-mid-count'].value = defaults.tendons;
    }
    if (defaults.vu) {
        domElements.inputs['shear-vu'].value = defaults.vu;
    }

    const momentDefaultsForSpan = staticData.momentDefaults[selectedSpan];
    if (momentDefaultsForSpan) {
        domElements.inputs['moment-sd'].value = momentDefaultsForSpan.msd;
        domElements.inputs['moment-ll'].value = momentDefaultsForSpan.mll;
        domElements.outputs['recommended-msd'].textContent = momentDefaultsForSpan.msd;
        domElements.outputs['recommended-mll'].textContent = momentDefaultsForSpan.mll;
    }
}

function syncTendonCounts() {
    domElements.inputs['tendon-end-count'].value = domElements.inputs['tendon-mid-count'].value;
}

function updateTendonProperties() {
    const selectedType = domElements.inputs['tendon-type'].value;
    const data = staticData.tendonData[selectedType];
    if (!data) return;
    
    domElements.inputs['tendon-initial-force'].value = data.force;
    domElements.outputs['tendon-area-display'].textContent = data.area;

    const val1 = 0.70 * data.fpu;
    const val2 = 0.85 * data.fpy;
    const allowableStress = Math.min(val1, val2);
    const recommendedForce = (allowableStress * data.area) / 1000;
    
    domElements.outputs['recommended-force-summary'].textContent = recommendedForce.toFixed(0);
    domElements.outputs['tendon-force-calculation-details'].innerHTML = `
        <p>1. 0.70 * fpu = 0.70 * ${data.fpu} = ${val1.toFixed(1)} MPa</p>
        <p>2. 0.85 * fpy = 0.85 * ${data.fpy} = ${val2.toFixed(1)} MPa</p>
        <p class="mt-2 border-t pt-2">取較小值: ${allowableStress.toFixed(1)} MPa</p>
        <p>最大預力 = ${allowableStress.toFixed(1)} * ${data.area} / 1000 = ${recommendedForce.toFixed(0)} kN</p>
    `;
}

function updateTendonCoordinatesTable() {
    const coordTableBody = domElements.tables['tendon-coord-table-body'];
    const coordContainer = domElements.containers['tendon-coord-container'];
    coordTableBody.innerHTML = '';

    const activeTendonTab = document.querySelector('#tendon-view .sub-tab-button.active');

    if (!activeTendonTab || activeTendonTab.id === 'tendon-tab-side' || domElements.views.tendon.classList.contains('hidden')) {
        coordContainer.classList.add('hidden');
        return;
    }
    coordContainer.classList.remove('hidden');

    const layoutData = (activeTendonTab.id === 'tendon-tab-mid')
        ? { count: domElements.inputs['tendon-mid-count'].value, layouts: staticData.tendonLayouts.mid }
        : { count: domElements.inputs['tendon-end-count'].value, layouts: staticData.tendonLayouts.end };

    const layout = layoutData.layouts[layoutData.count];
    if (!layout) return;

    layout.sort((a, b) => a.id - b.id).forEach(pos => {
        const row = `
            <tr class="border-b border-slate-200">
                <td class="py-2">${pos.id}</td>
                <td class="py-2 text-right font-mono">${pos.x.toFixed(1)}</td>
                <td class="py-2 text-right font-mono">${pos.y.toFixed(1)}</td>
            </tr>`;
        coordTableBody.innerHTML += row;
    });
}


// --- Result Rendering Functions ---

function renderLossResults(results) {
    if (!results) return;
    
    // Immediate Losses
    const immediateBody = domElements.tables['immediate-loss-table-body'];
    immediateBody.innerHTML = results.immediate.rows.map(row => `
        <tr class="border-b border-slate-200">
            <td class="py-2 text-center font-mono">${row.id}</td>
            <td class="py-2 text-right font-mono">${row.frLoss.toFixed(1)}</td>
            <td class="py-2 text-right font-mono">${row.anLoss.toFixed(1)}</td>
            <td class="py-2 text-right font-mono">${row.esLoss.toFixed(1)}</td>
            <td class="py-2 text-right font-mono">${row.totalLoss.toFixed(1)}</td>
            <td class="py-2 text-right font-mono">${row.lossPercent.toFixed(1)}%</td>
        </tr>
    `).join('');
    immediateBody.innerHTML += `
        <tr class="bg-slate-100 font-semibold text-base">
            <td class="py-3">總計</td>
            <td class="py-3 text-right font-mono">${results.immediate.footer.totalFrictionLoss.toFixed(1)}</td>
            <td class="py-3 text-right font-mono">${results.immediate.footer.totalAnchorageLoss.toFixed(1)}</td>
            <td class="py-3 text-right font-mono">${results.immediate.footer.totalElasticShorteningLoss.toFixed(1)}</td>
            <td class="py-3 text-right font-mono">${results.immediate.footer.totalImmediateLoss.toFixed(1)}</td>
            <td class="py-3 text-right font-mono">${results.immediate.footer.totalImmediatePercent.toFixed(1)}%</td>
        </tr>
    `;

    // Long-term Losses
    const longtermBody = domElements.tables['longterm-loss-table-body'];
    longtermBody.innerHTML = `
        <tr class="border-b border-slate-200">
            <td class="py-2">混凝土潛變損失</td>
            <td class="py-2 text-right font-mono">${results.longterm.creep.loss.toFixed(1)}</td>
            <td class="py-2 text-right font-mono">${results.longterm.creep.percent.toFixed(1)}%</td>
        </tr>
        <tr class="border-b border-slate-200">
            <td class="py-2">混凝土乾縮損失</td>
            <td class="py-2 text-right font-mono">${results.longterm.shrinkage.loss.toFixed(1)}</td>
            <td class="py-2 text-right font-mono">${results.longterm.shrinkage.percent.toFixed(1)}%</td>
        </tr>
        <tr class="border-b border-slate-200">
            <td class="py-2">鋼材鬆弛損失</td>
            <td class="py-2 text-right font-mono">${results.longterm.relaxation.loss.toFixed(1)}</td>
            <td class="py-2 text-right font-mono">${results.longterm.relaxation.percent.toFixed(1)}%</td>
        </tr>
    `;

    // Total Losses
    const totalBody = domElements.tables['total-loss-table-body'];
    totalBody.innerHTML = `
        <tr class="border-b border-slate-200">
            <td class="py-2">總瞬時損失</td>
            <td class="py-2 text-right font-mono">${results.total.immediate.loss.toFixed(1)}</td>
            <td class="py-2 text-right font-mono">${results.total.immediate.percent.toFixed(1)}%</td>
        </tr>
        <tr class="border-b border-slate-200">
            <td class="py-2">總長期損失</td>
            <td class="py-2 text-right font-mono">${results.total.longterm.loss.toFixed(1)}</td>
            <td class="py-2 text-right font-mono">${results.total.longterm.percent.toFixed(1)}%</td>
        </tr>
        <tr class="bg-slate-100 font-semibold text-base">
            <td class="py-3">總預力損失</td>
            <td class="py-3 text-right font-mono">${results.total.final.loss.toFixed(1)}</td>
            <td class="py-3 text-right font-mono">${results.total.final.percent.toFixed(1)}%</td>
        </tr>
    `;
    
    // Steel Stress Check (after anchorage)
    const stressCheckBody = domElements.tables['stress-check-results-table-body'];
    stressCheckBody.innerHTML = results.stressCheck.map(row => `
         <tr class="border-b border-slate-200">
            <td class="py-2 text-center font-mono">${row.id}</td>
            <td class="py-2 text-right font-mono">${row.stress_anchor.toFixed(1)}</td>
            <td class="py-2 text-right font-mono">${row.stress_at_Lset.toFixed(1)}</td>
            <td class="py-2 text-right font-mono">${row.allowableStress.toFixed(1)}</td>
            <td class="py-2 text-right font-mono">${row.stress_ratio.toFixed(2)}</td>
            <td class="py-2 text-center font-semibold ${row.check ? 'text-green-600' : 'text-red-600'}">
                ${row.check ? 'OK' : 'NG'}
            </td>
        </tr>
    `).join('');
}

function renderStressCheckResults(results) {
    if(!results) return;
    // ... Implement rendering for tw-stress-check-results-container etc. ...
}
function renderFlexureCheckResults(results) {
    if(!results) return;
    // ... Implement rendering for tw-flexure-check-results-container ...
}
function renderDeflectionCheckResults(results) {
    if(!results) return;
    // ... Implement rendering for tw-deflection-check-results-container ...
}
function renderShearCheckResults(results) {
    if(!results) return;
    // ... Implement rendering for shear-check-results-container ...
}