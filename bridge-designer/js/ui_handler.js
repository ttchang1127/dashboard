// js/ui_handler.js (最終修正版)
import * as Calcs from './calculations.js';
import * as Drawer from './canvas_drawer.js';

let domElements = {};
let staticData = {};

export function initializeUI(elements, data) {
    domElements = elements;
    staticData = data;
    updateDefaultsBySpan();
    syncTendonCounts();
    updateTendonProperties();
}

export function updateUI() {
    const inputs = {};
    for (const key in domElements.inputs) {
        if (domElements.inputs[key]) {
            inputs[key] = domElements.inputs[key].value;
        }
    }

    const props = Calcs.getSectionProperties(inputs);
    if (!props) {
        return;
    }

    const lossResults = Calcs.calculatePrestressLosses(inputs, props);
    const stressCheckResults = Calcs.performStressChecks(inputs, props, lossResults);
    const flexureCheckResults = Calcs.performFlexureChecks(inputs, props, lossResults);
    const deflectionCheckResults = Calcs.performDeflectionChecks(inputs, props);
    const shearCheckResults = Calcs.performShearChecks(inputs, props);

    renderLossResults(lossResults);
    renderStressCheckResults(stressCheckResults, domElements.containers['stress-check-results-container']);
    renderFlexureCheckResults(flexureCheckResults, domElements.containers['flexure-check-results-container']);
    renderDeflectionCheckResults(deflectionCheckResults, domElements.containers['deflection-check-results-container']);
    renderShearCheckResults(shearCheckResults, domElements.containers['shear-check-results-container']);
    
    updateTendonCoordinatesTable();
    Drawer.updateAllCanvases(domElements.canvases, inputs);
    
    if (window.renderMathInElement) {
        renderMathInElement(document.getElementById('main-content-wrapper'), {
            delimiters: [ {left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false} ]
        });
    }
}

export function updateDefaultsBySpan(){ const selectedSpan = domElements.inputs['bridge-span'].value; const defaults = staticData.spanDefaults[selectedSpan]; if (!defaults) return; for (const key in defaults) { if (domElements.inputs[key]) { domElements.inputs[key].value = defaults[key]; } } if (defaults.tendons) domElements.inputs['tendon-mid-count'].value = defaults.tendons; if (defaults.vu) domElements.inputs['shear-vu'].value = defaults.vu; const momentDefaultsForSpan = staticData.momentDefaults[selectedSpan]; if (momentDefaultsForSpan) { domElements.inputs['moment-sd'].value = momentDefaultsForSpan.msd; domElements.inputs['moment-ll'].value = momentDefaultsForSpan.mll; domElements.outputs['recommended-msd'].textContent = momentDefaultsForSpan.msd; domElements.outputs['recommended-mll'].textContent = momentDefaultsForSpan.mll; } }
export function syncTendonCounts(){ if(domElements.inputs['tendon-end-count']) domElements.inputs['tendon-end-count'].value = domElements.inputs['tendon-mid-count'].value; }
export function updateTendonProperties(){ const selectedType = domElements.inputs['tendon-type'].value; const data = staticData.tendonData[selectedType]; if (!data) return; domElements.inputs['tendon-initial-force'].value = data.force; domElements.outputs['tendon-area-display'].textContent = data.area; const val1 = 0.70 * data.fpu; const val2 = 0.85 * data.fpy; const allowableStress = Math.min(val1, val2); const recommendedForce = (allowableStress * data.area) / 1000; domElements.outputs['recommended-force-summary'].textContent = recommendedForce.toFixed(0); domElements.outputs['tendon-force-calculation-details'].innerHTML = ` <p>1. 0.70 * fpu = 0.70 * ${data.fpu} = ${val1.toFixed(1)} MPa</p> <p>2. 0.85 * fpy = 0.85 * ${data.fpy} = ${val2.toFixed(1)} MPa</p> <p class="mt-2 border-t pt-2">取較小值: ${allowableStress.toFixed(1)} MPa</p> <p>最大預力 = ${allowableStress.toFixed(1)} * ${data.area} / 1000 = ${recommendedForce.toFixed(0)} kN</p> `; }
function updateTendonCoordinatesTable(){ const coordTableBody = domElements.tables['tendon-coord-table-body']; if(!coordTableBody) return; const coordContainer = domElements.containers['tendon-coord-container']; coordTableBody.innerHTML = ''; const activeTendonTab = document.querySelector('#tendon-view .sub-tab-button.active'); if (!activeTendonTab || !coordContainer || activeTendonTab.id === 'tendon-tab-side' || domElements.views.tendon.classList.contains('hidden')) { if(coordContainer) coordContainer.classList.add('hidden'); return; } coordContainer.classList.remove('hidden'); const layoutData = (activeTendonTab.id === 'tendon-tab-mid') ? { count: domElements.inputs['tendon-mid-count'].value, layouts: staticData.tendonLayouts.mid } : { count: domElements.inputs['tendon-end-count'].value, layouts: staticData.tendonLayouts.end }; const layout = layoutData.layouts[layoutData.count]; if (!layout) return; layout.sort((a, b) => a.id - b.id).forEach(pos => { coordTableBody.innerHTML += ` <tr class="border-b border-slate-200"> <td class="py-2">${pos.id}</td> <td class="py-2 text-right font-mono">${pos.x.toFixed(1)}</td> <td class="py-2 text-right font-mono">${pos.y.toFixed(1)}</td> </tr>`; }); }
function renderLossResults(results){ if (!results || !domElements.tables['immediate-loss-table-body']) return; const { Pj, totalInitialForce, immediate, longterm, total, stressCheck } = results; const immediateBody = domElements.tables['immediate-loss-table-body']; immediateBody.innerHTML = immediate.rows.map(row => ` <tr class="border-b border-slate-200"> <td class="py-2 text-center font-mono">${row.id}</td> <td class="py-2 text-right font-mono">${row.frLoss.toFixed(1)}</td> <td class="py-2 text-right font-mono">${row.anLoss.toFixed(1)}</td> <td class="py-2 text-right font-mono">${row.esLoss.toFixed(1)}</td> <td class="py-2 text-right font-mono">${row.totalLoss.toFixed(1)}</td> <td class="py-2 text-right font-mono">${Pj > 0 ? (row.totalLoss / Pj * 100).toFixed(1) : 0}%</td> </tr>`).join(''); immediateBody.innerHTML += ` <tr class="bg-slate-100 font-semibold text-base"> <td class="py-3">總計</td> <td class="py-3 text-right font-mono">${immediate.footer.totalFrictionLoss.toFixed(1)}</td> <td class="py-3 text-right font-mono">${immediate.footer.totalAnchorageLoss.toFixed(1)}</td> <td class="py-3 text-right font-mono">${immediate.footer.totalElasticShorteningLoss.toFixed(1)}</td> <td class="py-3 text-right font-mono">${immediate.footer.totalImmediateLoss.toFixed(1)}</td> <td class="py-3 text-right font-mono">${totalInitialForce > 0 ? (immediate.footer.totalImmediateLoss / totalInitialForce * 100).toFixed(1) : 0}%</td> </tr>`; domElements.tables['longterm-loss-table-body'].innerHTML = ` <tr class="border-b border-slate-200"> <td class="py-2">混凝土潛變損失</td> <td class="py-2 text-right font-mono">${longterm.creep.loss.toFixed(1)}</td> <td class="py-2 text-right font-mono">${totalInitialForce > 0 ? (longterm.creep.loss / totalInitialForce * 100).toFixed(1) : 0}%</td> </tr> <tr class="border-b border-slate-200"> <td class="py-2">混凝土乾縮損失</td> <td class="py-2 text-right font-mono">${longterm.shrinkage.loss.toFixed(1)}</td> <td class="py-2 text-right font-mono">${totalInitialForce > 0 ? (longterm.shrinkage.loss / totalInitialForce * 100).toFixed(1) : 0}%</td> </tr> <tr class="border-b border-slate-200"> <td class="py-2">鋼材鬆弛損失</td> <td class="py-2 text-right font-mono">${longterm.relaxation.loss.toFixed(1)}</td> <td class="py-2 text-right font-mono">${totalInitialForce > 0 ? (longterm.relaxation.loss / totalInitialForce * 100).toFixed(1) : 0}%</td> </tr>`; domElements.tables['total-loss-table-body'].innerHTML = ` <tr class="border-b border-slate-200"> <td class="py-2">總瞬時損失</td> <td class="py-2 text-right font-mono">${total.immediate.loss.toFixed(1)}</td> <td class="py-2 text-right font-mono">${totalInitialForce > 0 ? (total.immediate.loss / totalInitialForce * 100).toFixed(1) : 0}%</td> </tr> <tr class="border-b border-slate-200"> <td class="py-2">總長期損失</td> <td class="py-2 text-right font-mono">${total.longterm.loss.toFixed(1)}</td> <td class="py-2 text-right font-mono">${totalInitialForce > 0 ? (total.longterm.loss / totalInitialForce * 100).toFixed(1) : 0}%</td> </tr> <tr class="bg-slate-100 font-semibold text-base"> <td class="py-3">總預力損失</td> <td class="py-3 text-right font-mono">${total.final.loss.toFixed(1)}</td> <td class="py-3 text-right font-mono">${totalInitialForce > 0 ? (total.final.loss / totalInitialForce * 100).toFixed(1) : 0}%</td> </tr>`; domElements.tables['stress-check-results-table-body'].innerHTML = stressCheck.map(row => ` <tr class="border-b border-slate-200"> <td class="py-2 text-center font-mono">${row.id}</td> <td class="py-2 text-right font-mono">${row.stress_anchor.toFixed(1)}</td> <td class="py-2 text-right font-mono">${row.stress_at_Lset.toFixed(1)}</td> <td class="py-2 text-right font-mono">${row.allowableStress.toFixed(1)}</td> <td class="py-2 text-right font-mono">${row.stress_ratio.toFixed(2)}</td> <td class="py-2 text-center font-semibold ${row.check ? 'text-green-600' : 'text-red-600'}">${row.check ? 'OK' : 'NG'}</td> </tr>`).join(''); }

function renderStressCheckResults(results, container){
    if (!container) return;
    if (!results) {
        container.innerHTML = '<h1 class="text-2xl font-bold text-slate-800 p-6">應力檢核結果</h1><p class="px-6 text-red-500">無法計算應力檢核，請檢查輸入參數。</p>';
        return;
    }
    const { limits, construction, service_dl, service_total } = results;
    const check_t = construction.top.stress >= limits.ta_limit1;
    const check_c = construction.bottom.stress <= limits.ca_limit;
    const check_c_s1 = service_dl.bottom.stress <= limits.ca_limit_serv1;
    const check_c_s2 = service_total.bottom.stress <= limits.ca_limit_serv2;
    const check_t_s = service_total.top.stress >= limits.ta_limit_serv;
    container.innerHTML = `
        <h1 class="text-2xl font-bold text-slate-800 mb-4">應力檢核結果</h1>
        <details class="bg-slate-50 p-4 rounded-lg mb-6" open>
            <summary class="font-semibold text-lg text-slate-800 cursor-pointer">應力限制值 (台灣公路橋梁設計規範)</summary>
            <div class="mt-4 text-slate-700 space-y-2 text-sm">
                <p><strong>施工階段 (受壓)：</strong>$\\sigma_c \\le ${limits.ca_limit.toFixed(2)} \\text{ MPa}$</p>
                <p><strong>施工階段 (受拉, 一般)：</strong>$\\sigma_t \\ge ${limits.ta_limit1.toFixed(2)} \\text{ MPa}$</p>
                <p><strong>施工階段 (受拉, 兩端簡支)：</strong>$\\sigma_t \\ge ${limits.ta_limit2.toFixed(2)} \\text{ MPa}$</p>
                <hr class="my-2"><p><strong>完工階段 (受壓, P+DL)：</strong>$\\sigma_c \\le ${limits.ca_limit_serv1.toFixed(2)} \\text{ MPa}$</p>
                <p><strong>完工階段 (受壓, P+DL+LL)：</strong>$\\sigma_c \\le ${limits.ca_limit_serv2.toFixed(2)} \\text{ MPa}$</p>
                <p><strong>完工階段 (受拉)：</strong>$\\sigma_t \\ge ${limits.ta_limit_serv.toFixed(2)} \\text{ MPa}$</p>
            </div>
        </details>
        <div class="mb-8">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">施工階段應力檢核計算 (中央斷面)</h3>
            <table class="w-full text-sm border">
                <thead class="text-left text-slate-500 bg-slate-100"><tr><th class="p-2 border">檢核項目</th><th class="p-2 border">限制值 (MPa)</th><th class="p-2 border">計算值 (MPa)</th><th class="p-2 border">結果</th></tr></thead>
                <tbody>
                    <tr><td class="p-2 border">上緣拉應力</td><td class="p-2 border font-mono">${limits.ta_limit1.toFixed(2)}</td><td class="p-2 border font-mono">${construction.top.stress.toFixed(2)}</td><td class="p-2 border font-semibold ${check_t ? 'text-green-600' : 'text-red-600'}">${check_t ? 'OK' : 'NG'}</td></tr>
                    <tr><td class="p-2 border">下緣壓應力</td><td class="p-2 border font-mono">${limits.ca_limit.toFixed(2)}</td><td class="p-2 border font-mono">${construction.bottom.stress.toFixed(2)}</td><td class="p-2 border font-semibold ${check_c ? 'text-green-600' : 'text-red-600'}">${check_c ? 'OK' : 'NG'}</td></tr>
                </tbody>
            </table>
        </div>
        <div>
            <h3 class="text-lg font-semibold text-slate-800 mb-4">完工階段應力檢核計算 (中央斷面)</h3>
            <table class="w-full text-sm border">
                 <thead class="text-left text-slate-500 bg-slate-100"><tr><th class="p-2 border">檢核項目</th><th class="p-2 border">載重組合</th><th class="p-2 border">限制值 (MPa)</th><th class="p-2 border">計算值 (MPa)</th><th class="p-2 border">結果</th></tr></thead>
                 <tbody>
                     <tr><td class="p-2 border" rowspan="2">下緣壓應力</td><td class="p-2 border">靜載重+有效預力</td><td class="p-2 border font-mono">${limits.ca_limit_serv1.toFixed(2)}</td><td class="p-2 border font-mono">${service_dl.bottom.stress.toFixed(2)}</td><td class="p-2 border font-semibold ${check_c_s1 ? 'text-green-600' : 'text-red-600'}">${check_c_s1 ? 'OK' : 'NG'}</td></tr>
                     <tr><td class="p-2 border">靜載重+有效預力+活載重</td><td class="p-2 border font-mono">${limits.ca_limit_serv2.toFixed(2)}</td><td class="p-2 border font-mono">${service_total.bottom.stress.toFixed(2)}</td><td class="p-2 border font-semibold ${check_c_s2 ? 'text-green-600' : 'text-red-600'}">${check_c_s2 ? 'OK' : 'NG'}</td></tr>
                     <tr><td class="p-2 border">上緣拉應力</td><td class="p-2 border">靜載重+有效預力+活載重</td><td class="p-2 border font-mono">${limits.ta_limit_serv.toFixed(2)}</td><td class="p-2 border font-mono">${service_total.top.stress.toFixed(2)}</td><td class="p-2 border font-semibold ${check_t_s ? 'text-green-600' : 'text-red-600'}">${check_t_s ? 'OK' : 'NG'}</td></tr>
                 </tbody>
            </table>
        </div>`;
}

function renderFlexureCheckResults(results, container){ 
    if (!container) return;
    if (!results) { container.innerHTML = '<p class="text-red-500 p-6">無法計算撓曲強度。</p>'; return; } 
    const check = results.phi_Mn >= results.Mu; 
    container.innerHTML = ` <h1 class="text-2xl font-bold text-slate-800 mb-4">撓曲強度檢核</h1><h3 class="text-lg font-semibold text-slate-800 mb-4">撓曲強度檢核計算 (中央斷面)</h3> <div class="grid grid-cols-1 md:grid-cols-2 gap-6"> <div class="bg-slate-100 p-4 rounded-md"> <h4 class="font-semibold text-slate-700 mb-2">輸入與中間參數</h4> <ul class="text-sm space-y-1 font-mono"> <li>$f'_{c}$ = ${results.params.fc_MPa.toFixed(1)} MPa</li> <li>$\\beta_1$ = ${results.params.beta1.toFixed(3)}</li> <li>$A_{ps}$ = ${results.params.Aps.toFixed(1)} mm²</li> <li>$d_p$ = ${results.params.dp.toFixed(1)} mm</li> <li>$c$ = ${results.params.c.toFixed(1)} mm</li> <li>$f_{ps}$ = ${results.params.fps.toFixed(1)} MPa</li> </ul> </div> <div class="bg-slate-100 p-4 rounded-md"> <h4 class="font-semibold text-slate-700 mb-2">彎矩計算結果</h4> <ul class="text-sm space-y-1 font-mono"> <li>$M_{sw}$ = ${results.moments.M_sw.toFixed(1)} kN-m</li> <li>$M_{sd}$ = ${results.moments.M_sd.toFixed(1)} kN-m</li> <li>$M_{ll}$ = ${results.moments.M_ll.toFixed(1)} kN-m</li> <li class="border-t pt-1 mt-1">$M_u$ = ${results.Mu.toFixed(1)} kN-m</li> <li class="">$\\phi M_n$ = ${results.phi_Mn.toFixed(1)} kN-m</li> <li class="font-semibold border-t pt-2 mt-2"> 檢核: $\\phi M_n \\ge M_u$, <span class="ml-2 font-bold ${check ? 'text-green-600' : 'text-red-600'}">${check ? 'OK' : 'NG'}</span> </li> </ul> </div> </div>`; 
}

function renderDeflectionCheckResults(results, container){ 
    if (!container) return; 
    if (!results) { container.innerHTML = '<p class="text-red-500 p-6">無法計算撓度。</p>'; return; } 
    const check = results.delta_LL <= results.delta_allow; 
    container.innerHTML = ` <h1 class="text-2xl font-bold text-slate-800 mb-4">撓度檢核</h1><h3 class="text-lg font-semibold text-slate-800 mb-4">活載重撓度檢核計算</h3> <div class="grid grid-cols-1 md:grid-cols-2 gap-6"> <div class="bg-slate-100 p-4 rounded-md"> <h4 class="font-semibold text-slate-700 mb-2">計算參數</h4> <ul class="text-sm space-y-1 font-mono"> <li>跨距 ($L$) = ${results.params.L_m.toFixed(1)} m</li> <li>活載重彎矩 ($M_{LL}$) = ${results.params.M_ll_kNm.toFixed(1)} kN-m</li> <li>混凝土彈性模數 ($E_c$) = ${results.params.Ec_GPa.toFixed(1)} GPa</li> <li>斷面慣性矩 ($I_g$) = ${results.params.Ig_m4.toFixed(4)} m⁴</li> </ul> </div> <div class="bg-slate-100 p-4 rounded-md"> <h4 class="font-semibold text-slate-700 mb-2">檢核結果</h4> <ul class="text-sm space-y-1 font-mono"> <li>計算撓度 ($\\Delta_{LL}$) = ${results.delta_LL.toFixed(2)} mm</li> <li class="border-t pt-1 mt-1">容許撓度 ($\\Delta_{allow}$) = ${results.delta_allow.toFixed(2)} mm</li> <li class="font-semibold border-t pt-2 mt-2"> 檢核: $\\Delta_{LL} \\le \\Delta_{allow}$, <span class="ml-2 font-bold ${check ? 'text-green-600' : 'text-red-600'}">${check ? 'OK' : 'NG'}</span> </li> </ul> </div> </div>`; 
}

function renderShearCheckResults(results, container){ 
    if (!container) return;
    if (!results) { container.innerHTML = '<p class="text-red-500 p-4">無法計算剪力。</p>'; return; } 
    const strengthCheck = results.phiVn_kN >= results.Vu_kN; const minReinfCheck = results.min_reinf.Av_mm2 >= results.min_reinf.Av_min_mm2; const spacingCheck = results.max_spacing.s_mm <= results.max_spacing.s_max_mm; container.innerHTML = ` <h1 class="text-2xl font-bold text-slate-800 mb-6">剪力筋檢核結果</h1> <details class="bg-slate-50 p-4 rounded-lg mb-6" open> <summary class="font-semibold text-lg text-slate-800 cursor-pointer">檢核摘要 (台灣公路橋梁設計規範)</summary> <div class="mt-4 text-slate-700 space-y-2 text-sm"> <p>檢核斷面之設計剪力強度 $\\phi V_n$ 是否大於所需剪力強度 $V_u$。其中 $\\phi=0.85$。</p> <p>設計剪力強度由混凝土與剪力筋共同貢獻：$\\phi V_n = \\phi (V_c + V_s)$</p> </div> </details> <div> <table class="w-full text-sm border-collapse"> <thead class="text-left text-slate-500 bg-slate-100"> <tr><th class="p-2 border" colspan="2">計算項目</th><th class="p-2 border text-right">數值</th><th class="p-2 border">單位</th></tr> </thead> <tbody> <tr><td class="p-2 border" colspan="2">有效深度 ($d$)</td><td class="p-2 border text-right font-mono">${results.d_mm.toFixed(1)}</td><td class="p-2 border">mm</td></tr> <tr><td class="p-2 border" rowspan="2">混凝土剪力強度</td><td class="p-2 border">$V_c$</td><td class="p-2 border text-right font-mono">${results.Vc_kN.toFixed(1)}</td><td class="p-2 border">kN</td></tr> <tr><td class="p-2 border">$\\phi V_c$</td><td class="p-2 border text-right font-mono">${(0.85 * results.Vc_kN).toFixed(1)}</td><td class="p-2 border">kN</td></tr> <tr><td class="p-2 border" rowspan="2">剪力筋剪力強度</td><td class="p-2 border">所需 $V_s$</td><td class="p-2 border text-right font-mono">${results.requiredVs_kN.toFixed(1)}</td><td class="p-2 border">kN</td></tr> <tr><td class="p-2 border">提供 $\\phi V_s$</td><td class="p-2 border text-right font-mono">${(0.85 * results.Vs_kN).toFixed(1)}</td><td class="p-2 border">kN</td></tr> <tr class="bg-slate-50"><td class="p-2 border font-semibold" colspan="2">總設計剪力強度 ($\\phi V_n$)</td><td class="p-2 border text-right font-mono font-semibold">${results.phiVn_kN.toFixed(1)}</td><td class="p-2 border">kN</td></tr> </tbody> </table> <table class="w-full text-sm border-collapse mt-4"> <thead class="text-left text-slate-500 bg-slate-200"> <tr> <th class="p-2 border text-left">檢核項目</th> <th class="p-2 border text-center">計算值</th> <th class="p-2 border text-center">限制值</th> <th class="p-2 border text-center">結果</th> </tr> </thead> <tbody> <tr> <td class="p-2 border">1. 強度檢核 ($\\phi V_n \\ge V_u$)</td> <td class="p-2 border text-center font-mono">${results.phiVn_kN.toFixed(1)} kN</td> <td class="p-2 border text-center font-mono">${results.Vu_kN.toFixed(1)} kN</td> <td class="p-2 border text-center font-semibold ${strengthCheck ? 'text-green-600' : 'text-red-600'}">${strengthCheck ? 'OK' : 'NG'}</td> </tr> <tr> <td class="p-2 border">2. 最小筋量檢核 ($A_v \\ge A_{v,min}$)</td> <td class="p-2 border text-center font-mono">${results.min_reinf.Av_mm2.toFixed(1)} mm²</td> <td class="p-2 border text-center font-mono">${results.min_reinf.Av_min_mm2.toFixed(1)} mm²</td> <td class="p-2 border text-center font-semibold ${minReinfCheck ? 'text-green-600' : 'text-red-600'}">${minReinfCheck ? 'OK' : 'NG'}</td> </tr> <tr> <td class="p-2 border">3. 最大間距檢核 ($s \\le s_{max}$)</td> <td class="p-2 border text-center font-mono">${results.max_spacing.s_mm.toFixed(0)} mm</td> <td class="p-2 border text-center font-mono">${results.max_spacing.s_max_mm.toFixed(0)} mm</td> <td class="p-2 border text-center font-semibold ${spacingCheck ? 'text-green-600' : 'text-red-600'}">${spacingCheck ? 'OK' : 'NG'}</td> </tr> </tbody> </table> </div>`;
}
