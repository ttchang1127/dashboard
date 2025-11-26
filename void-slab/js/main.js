import { 
    initializeTabs, 
    initializeSubTabs, 
    initializeNumberInputs, 
    initializeRebarSelector, 
    updateTendonInfo, 
    updateDuctInfo, 
    initializeTendonSelector, 
    TENDON_DATA, 
    updateLossSummaryResults,
    updateDerivedValues,
    updateAllowableStressUI, 
    updateMidspanStressUI,
    updateStressCheckUI,
    updateFlexuralCheckUI,
    updateDeflectionUI,
    initializeShearSelector, // [新增] 剪力筋選單初始化
    updateShearCheckUI       // [新增] 剪力檢核 UI 更新
} from './ui_handler.js';
import { 
    calculateCrossSectionProperties, 
    calculateLoads, 
    calculateTendonLayout, 
    calculateDuctLayout, 
    calculateDefaultJackingForce, 
    calculateAdvancedSectionProperties, 
    calculateLossSummary,
    calculateAllowableStress, 
    calculateMidspanStress,
    calculateStressChecks,
    calculateFlexuralStrength,
    calculateDeflection,
    calculateShearStrength   // [新增] 剪力強度計算
} from './calculations.js';
import { 
    drawCrossSectionPlot, 
    drawEndSectionPlot, 
    drawSideViewPlot 
} from './plot_handler.js';

const katexOptions = {
    delimiters: [ {left: "$", right: "$", display: false}, {left: "$$", right: "$$", display: true} ]
};

// 全域變數
let currentDims = {};
let currentTendonLayout = {};
let currentDuctLayout = {}; 

// 從 DOM 讀取所有尺寸輸入值
function getDimensions() {
    const ids = [
        'L', 'Ct', 'Ht', 'Hb', 'Dr', 'N', 'Sr', 'Et', 'Dt', 'Db', 'He', 'Nb', 'Nbs', 'L1', 'L2',
        'loss_fpj', 
        'loss_friction', 'loss_anchor', 'loss_elastic', 
        'loss_shrinkage', 'loss_creep', 'loss_relaxation'
    ];
    const dimensions = {};
    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
             dimensions[id] = (element.type === 'number') ? parseFloat(element.value) || 0 : element.value;
        }
    });
    dimensions.Wb = (dimensions.N > 0) ? (dimensions.N - 1) * dimensions.Sr + 2 * dimensions.Et + dimensions.Dr : 2 * dimensions.Et + dimensions.Dr; 
    dimensions.W = dimensions.Wb + 2 * dimensions.Ct; 
    return dimensions;
}

function getMaterialInputs() {
    return { gamma_c: 2.4, gamma_ac: 2.3 };
}

function getMaterialProperties() {
    const type = document.getElementById('tendon-type').value;
    const strands = parseInt(document.getElementById('tendon-strands').value) || 0; 
    const tendonProps = TENDON_DATA[type]; 
    const fck = parseFloat(document.getElementById('fck').value) || 0;
    const fci = parseFloat(document.getElementById('fci').value) || 0;
    
    return {
        tendonType: type,
        tendonStrands: strands,
        tendonProperties: tendonProps,
        fck: fck, 
        fci: fci
    };
}

function getLoadInputs() {
    return {
        asphaltThickness: parseFloat(document.getElementById('asphalt-thickness').value) || 0,
        pipelineLoad: parseFloat(document.getElementById('pipeline-load').value) || 0,
        railingLoad: parseFloat(document.getElementById('railing-load').value) || 0,
        numLanes: parseInt(document.getElementById('num-lanes').value) || 0,
        impactFactorUser: parseFloat(document.getElementById('impact-factor-user').value) || 0,
        overloadFactor: parseFloat(document.getElementById('overload-factor').value) || 0,
        laneReductionFactor: parseFloat(document.getElementById('lane-reduction-factor').value) || 0,
    };
}

function updateDynamicDisplays() {
    const activeTendonButton = document.querySelector('#tendon-sub-tabs .sub-tab-button.active');
    let tendonView = 'mid';
    if (activeTendonButton) {
        const target = activeTendonButton.dataset.target;
        if (target === 'tendon-panel-end-section') {
            tendonView = 'end';
        } else if (target === 'tendon-panel-side-view') {
            tendonView = 'side';
        }
    }
    updateTendonInfo('tendon-info-display', currentTendonLayout, tendonView);
}

/**
 * 主更新函式
 */
function updateApp() {
    // 1. 獲取輸入並計算基礎資料
    currentDims = getDimensions();
    const materials = getMaterialInputs();
    const loads = getLoadInputs();
    const materialProps = getMaterialProperties();
    
    const sectionProps = calculateCrossSectionProperties(currentDims);
    const advSectionProps = calculateAdvancedSectionProperties(currentDims); 
    const loadResults = calculateLoads(currentDims, loads, materials, sectionProps);
    currentTendonLayout = calculateTendonLayout(currentDims);
    currentDuctLayout = calculateDuctLayout(currentDims); 

    // 2. 預力相關計算
    const jackingForceData = calculateDefaultJackingForce(materialProps.tendonProperties, materialProps.tendonStrands);
    const lossFpjInput = document.getElementById('loss_fpj');
    const lossFpjDetails = document.getElementById('loss-fpj-details');
    let defaultFpj = 0;
    if (jackingForceData) {
        defaultFpj = jackingForceData.fpj_kgfcm2;
    }
    if (lossFpjInput && !lossFpjInput.dataset.userModified) {
        lossFpjInput.value = defaultFpj.toFixed(0);
        currentDims.loss_fpj = defaultFpj;
    }
    if (lossFpjDetails) {
        lossFpjDetails.innerHTML = `此值將用於計算損失率。預設值由 $0.737 \\times f_{pu}$ 計算而來。`;
    }

    const lossSummary = calculateLossSummary(currentDims); 

    // 3. 應力檢核計算 (Sub-tabs 1, 2, 3)
    const allowableStressResults = calculateAllowableStress(materialProps.fck, materialProps.fci);

    const H_total = currentDims.Dt + currentDims.Dr + currentDims.Db;
    let Ap_cm2_single = 0;
    if (materialProps.tendonProperties && materialProps.tendonStrands > 0) {
         Ap_cm2_single = (materialProps.tendonProperties.area * materialProps.tendonStrands) / 100;
    }
    const numTendons = currentTendonLayout.tendons.length;
    const y_mid = (numTendons > 0) ? currentTendonLayout.tendons[0].y_mid : 0;

    const midspanStressInputs = {
        fpe: lossSummary.fpe_kgfcm2,
        Ap_cm2: Ap_cm2_single,
        numTendons: numTendons,
        Y_cg: advSectionProps.Y_cg,
        y_mid: y_mid,
        H: H_total,
        I_g: advSectionProps.I_g,
        Anet: sectionProps.netAreaCm2,
        M_slab_tfm: (loadResults && loadResults.momentSelfWeight) ? loadResults.momentSelfWeight : 0,
        M_DL_total_tfm: (loadResults && loadResults.momentTotalDeadLoad) ? loadResults.momentTotalDeadLoad : 0,
        M_final_tfm: (loadResults && loadResults.finalMoment) ? loadResults.finalMoment : 0,
        loss_shrinkage: currentDims.loss_shrinkage || 0,
        loss_creep: currentDims.loss_creep || 0,
        loss_relaxation: currentDims.loss_relaxation || 0
    };
    const midspanStressResults = calculateMidspanStress(midspanStressInputs);
    const stressChecks = calculateStressChecks(midspanStressResults, allowableStressResults);

    // 4. 撓曲強度檢核計算 (Tab 7)
    let fpu = 0;
    if (materialProps.tendonProperties) {
        fpu = materialProps.tendonProperties.fpu;
    }
    const Ap_total_cm2 = Ap_cm2_single * numTendons; 
    
    const flexuralInputs = {
        M_DL_total_tfm: (loadResults && loadResults.momentTotalDeadLoad) ? loadResults.momentTotalDeadLoad : 0,
        M_final_tfm: (loadResults && loadResults.finalMoment) ? loadResults.finalMoment : 0,
        fck: materialProps.fck,
        fpu: fpu,
        Ap_cm2: Ap_total_cm2, 
        b_cm: currentDims.W, 
        dp_cm: Math.abs(y_mid),
        fpe_kgfcm2: lossSummary.fpe_kgfcm2
    };
    const flexuralResults = calculateFlexuralStrength(flexuralInputs);

    // 5. 撓度檢核計算 (Tab 8)
    const sidewalkSelect = document.getElementById('has-sidewalk');
    const hasSidewalk = sidewalkSelect ? (sidewalkSelect.value === 'yes') : false;

    const deflectionInputs = {
        M_final_tfm: (loadResults && loadResults.finalMoment) ? loadResults.finalMoment : 0,
        L_cm: currentDims.L || 0,
        I_net_cm4: (advSectionProps && advSectionProps.I_g) ? advSectionProps.I_g : 0, 
        fck_kgfcm2: materialProps.fck || 0,
        hasSidewalk: hasSidewalk
    };
    const deflectionResults = calculateDeflection(deflectionInputs);

    // 6. 剪力檢核計算 (Tab 9)
    const shearRebarSizeInput = document.getElementById('shear-rebar-size');
    const shearLegsInput = document.getElementById('shear-legs');
    const shearSpacingInput = document.getElementById('shear-spacing');
    
    // 讀取剪力筋資料 (從 DOM 或預設)
    const shearAreaEl = document.getElementById('shear-rebar-area-display');
    const shearFyEl = document.getElementById('shear-fy-display');
    const shearArea = shearAreaEl ? parseFloat(shearAreaEl.textContent) : 1.27;
    const shearFy = shearFyEl ? parseFloat(shearFyEl.textContent) : 2800;
    
    const shearLegs = shearLegsInput ? (parseInt(shearLegsInput.value) || 2) : 2;
    const shearSpacing = shearSpacingInput ? (parseFloat(shearSpacingInput.value) || 200) : 200;

    const shearInputs = {
        L_cm: currentDims.L || 0,
        H_cm: H_total || 0,
        W_cm: currentDims.W || 0,
        w_dead_tfm: (loadResults) ? (loadResults.selfWeight + loadResults.additionalDeadLoadWeight) : 0,
        fck_kgfcm2: materialProps.fck || 0,
        shearRebar: {
            area: shearArea,
            fy: shearFy,
            legs: shearLegs,
            spacing_mm: shearSpacing
        },
        loadFactors: {
            impact: (loadResults) ? loadResults.impactFinal : 0,
            overload: loads.overloadFactor || 0,
            reduction: loads.laneReductionFactor || 0,
            lanes: loads.numLanes || 0
        },
        ductCount: currentDims.N || 0
    };
    const shearResults = calculateShearStrength(shearInputs);


    // 7. 更新所有 UI 顯示
    updateDerivedValues(currentDims, sectionProps, advSectionProps);
    updateAllowableStressUI(materialProps.fck, materialProps.fci, allowableStressResults);
    updateMidspanStressUI(midspanStressInputs, midspanStressResults);
    updateStressCheckUI(stressChecks); 
    updateFlexuralCheckUI(flexuralInputs, flexuralResults); 
    updateDeflectionUI(deflectionInputs, deflectionResults); 
    updateShearCheckUI(shearInputs, shearResults); // [新增]
    
    // 更新 Tab 3 (設計載重)
    if (loadResults) {
        document.getElementById('res-self-weight').textContent = `${loadResults.selfWeight.toFixed(3)} tf/m`;
        document.getElementById('calc-self-weight').innerHTML = `
            $W_{total} = [A_{net}(L - L_1 - L_2) + A_{gross}(L_1 + L_2)] \\times \\gamma_c$ <br>
            $= [${(sectionProps.netAreaCm2 / 10000).toFixed(3)} \\times (\\frac{${currentDims.L} - ${currentDims.L1} - ${currentDims.L2}}{100}) + ${(sectionProps.grossAreaCm2 / 10000).toFixed(3)} \\times (\\frac{${currentDims.L1} + ${currentDims.L2}}{100})] \\times ${materials.gamma_c}$ <br>
            $= ${loadResults.totalSelfWeight.toFixed(2)} \\ tf$ <br>
            $W_{slab} = \\frac{W_{total}}{L} = \\frac{${loadResults.totalSelfWeight.toFixed(2)}}{${(currentDims.L / 100).toFixed(2)}} = ${loadResults.selfWeight.toFixed(3)} \\ tf/m$`;
        
        document.getElementById('res-additional-dead-load').textContent = `${loadResults.additionalDeadLoadWeight.toFixed(3)} tf/m`;
        document.getElementById('calc-additional-dead-load').innerHTML = `
            $W_{ADL} = W_{ac} + W_{pipe} + W_{rail}$ <br>
            $W_{ac} = \\frac{${currentDims.W.toFixed(1)}}{100} \\times \\frac{${loads.asphaltThickness}}{100} \\times ${materials.gamma_ac} = ${loadResults.asphaltWeight.toFixed(3)} \\ tf/m$ <br>
            $W_{ADL} = ${loadResults.asphaltWeight.toFixed(3)} + ${loads.pipelineLoad} + ${loads.railingLoad} = ${loadResults.additionalDeadLoadWeight.toFixed(3)} \\ tf/m$`;

        document.getElementById('res-moment-dead-load').textContent = `${loadResults.momentTotalDeadLoad.toFixed(2)} tf-m`;
        document.getElementById('calc-moment-dead-load').innerHTML = `
            $M_{slab} = \\frac{W_{slab} L^2}{8} = \\frac{${loadResults.selfWeight.toFixed(3)} \\times (${(currentDims.L / 100).toFixed(2)})^2}{8} = ${loadResults.momentSelfWeight.toFixed(2)} \\ tf-m$ <br>
            $M_{ADL} = \\frac{W_{ADL} L^2}{8} = \\frac{${loadResults.additionalDeadLoadWeight.toFixed(3)} \\times (${(currentDims.L / 100).toFixed(2)})^2}{8} = ${loadResults.momentAdditionalDeadLoad.toFixed(2)} \\ tf-m$ <br>
            $M_{DL,total} = M_{slab} + M_{ADL} = ${loadResults.momentSelfWeight.toFixed(2)} + ${loadResults.momentAdditionalDeadLoad.toFixed(2)} = ${loadResults.momentTotalDeadLoad.toFixed(2)} \\ tf-m$`;
        
        document.getElementById('res-moment-truck').textContent = `${loadResults.momentTruck.toFixed(2)} tf-m`;
        document.getElementById('calc-moment-truck').innerHTML = `
            $M_{LL,truck} = 8.2125 \\times L - 38.78125$ <br>
            $= 8.2125 \\times \\frac{${currentDims.L}}{100} - 38.78125$ <br>
            $= ${loadResults.momentTruck.toFixed(2)} \\ tf \\cdot m$`;

        document.getElementById('res-moment-lane').textContent = `${loadResults.momentLane.toFixed(2)} tf-m`;
        document.getElementById('calc-moment-lane').innerHTML = `
            $M_{LL,lane} = \\frac{w L^2}{8} + \\frac{P L}{4}$ <br>
            $= \\frac{0.96 \\times (\\frac{${currentDims.L}}{100})^2}{8} + \\frac{8.2 \\times (\\frac{${currentDims.L}}{100})}{4}$ <br>
            $= ${loadResults.momentLane.toFixed(2)} \\ tf \\cdot m$`;

        document.getElementById('res-moment-max').textContent = `${loadResults.momentMax.toFixed(2)} tf-m`;
        document.getElementById('calc-moment-max').innerHTML = `
            $M_{LL,max} = max(M_{LL,truck}, M_{LL,lane})$ <br>
            $= max(${loadResults.momentTruck.toFixed(2)}, ${loadResults.momentLane.toFixed(2)})$ <br>
            $= ${loadResults.momentMax.toFixed(2)} \\ tf \\cdot m$`;

        document.getElementById('res-moment-final').textContent = `${loadResults.finalMoment.toFixed(2)} tf-m`;
        document.getElementById('calc-moment-final').innerHTML = `
            衝擊係數 $i = min(${loads.impactFactorUser}, \\frac{15.24}{L+38.1}) = min(${loads.impactFactorUser}, ${loadResults.impactCalc.toFixed(3)}) = ${loadResults.impactFinal.toFixed(3)}$ <br>
            $M_{final} = M_{LL,max} \\times (1+i) \\times (1+超載) \\times (折減) \\times (車道數)$ <br>
            $= ${loadResults.momentMax.toFixed(2)} \\times (1+${loadResults.impactFinal.toFixed(3)}) \\times (1+${loads.overloadFactor}) \\times ${loads.laneReductionFactor} \\times ${loads.numLanes}$ <br>
            $= ${loadResults.finalMoment.toFixed(2)} \\ tf \\cdot m$`;
    }

    updateDuctInfo('duct-info-display', currentDuctLayout);
    updateLossSummaryResults('loss-summary-results', lossSummary, currentDims.loss_fpj);

    // 8. 繪製圖表
    drawCrossSectionPlot('cross-section-plot', currentDims);
    drawEndSectionPlot('end-section-plot', currentDims);
    drawSideViewPlot('side-view-plot', currentDims);
    drawCrossSectionPlot('tendon-cross-section-plot', currentDims, currentTendonLayout.tendons);
    drawEndSectionPlot('tendon-end-section-plot', currentDims, currentTendonLayout.tendons);
    drawSideViewPlot('tendon-side-view-plot', currentDims, currentTendonLayout.profile);

    updateDynamicDisplays();
    
    // 9. 渲染數學公式 (最後執行)
    if (window.renderMathInElement) {
        renderMathInElement(document.body, katexOptions);
    }
}

// --- 主程式執行入口 ---
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeSubTabs('#sub-tabs'); 
    initializeSubTabs('#tendon-sub-tabs');
    initializeSubTabs('#stress-sub-tabs'); 
    initializeNumberInputs();
    initializeRebarSelector();
    initializeTendonSelector();
    initializeShearSelector(); // [新增]

    const mainContainer = document.querySelector('main');
    mainContainer.addEventListener('input', e => {
        if (e.target.matches('input, select')) {
            if (e.target.id === 'loss_fpj') {
                e.target.dataset.userModified = 'true';
            }
            // 特殊處理: 剪力筋輸入變更時標記 userModified (for 肢數建議)
            if (e.target.id === 'shear-legs') {
                e.target.dataset.userModified = 'true';
            }
            updateApp(); 
        }
    });

    document.querySelector('#tendon-sub-tabs').addEventListener('click', e => {
        if (e.target.closest('.sub-tab-button')) {
            setTimeout(updateDynamicDisplays, 10);
        }
    });

    // 監聽人行道選項變更 (for Deflection Check)
    const sidewalkSelect = document.getElementById('has-sidewalk');
    if (sidewalkSelect) {
        sidewalkSelect.addEventListener('change', updateApp);
    }
    
    // 監聽剪力筋選單變更 (for Shear Check)
    const shearRebarSelect = document.getElementById('shear-rebar-size');
    if (shearRebarSelect) {
        shearRebarSelect.addEventListener('change', updateApp);
    }

    // 首次載入
    updateApp();
});
