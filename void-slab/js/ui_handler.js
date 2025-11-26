/**
 * Data for standard rebar sizes based on CNS 560.
 */
const REBAR_DATA = {
    'D10': { diameter: 9.53, area: 0.7133 },
    'D13': { diameter: 12.7, area: 1.267 },
    'D16': { diameter: 15.9, area: 1.986 },
    'D19': { diameter: 19.1, area: 2.865 },
    'D22': { diameter: 22.2, area: 3.871 },
    'D25': { diameter: 25.4, area: 5.067 },
    'D29': { diameter: 28.7, area: 6.469 },
    'D32': { diameter: 32.2, area: 8.143 },
    'D36': { diameter: 35.8, area: 10.07 },
};

/**
 * Data for standard tendon types.
 */
export const TENDON_DATA = {
    'SWPR7BL12.7': { area: 98.71, fpu: 1850, fpy: 1580 }, 
    'SWPR7BL15.2': { area: 138.7, fpu: 1880, fpy: 1600 }  
};

// [新增] 剪力筋資料 (用於 Tab 9)
const SHEAR_REBAR_DATA = {
    'D10': { area: 0.7133, fy: 2800 },
    'D13': { area: 1.267, fy: 2800 },
    'D16': { area: 1.986, fy: 4200 },
    'D19': { area: 2.865, fy: 4200 }
};

// --- Tab Handling ---

export function initializeTabs() {
    const tabContainer = document.querySelector('#main-tabs');
    if (!tabContainer) return;

    tabContainer.addEventListener('click', (e) => {
        const clickedTab = e.target.closest('.main-tab-button');
        if (!clickedTab) return;

        tabContainer.querySelectorAll('.main-tab-button').forEach(button => button.classList.remove('active'));
        document.querySelectorAll('#tab-content > .tab-panel').forEach(panel => panel.classList.add('hidden'));

        clickedTab.classList.add('active');
        const targetPanel = document.querySelector(clickedTab.dataset.tabTarget);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
            window.dispatchEvent(new Event('resize'));
        }
    });
}

export function initializeSubTabs(navSelector) {
    const nav = document.querySelector(navSelector);
    if (!nav) return;

    let contentContainer = nav.nextElementSibling;
    if (!contentContainer || !contentContainer.querySelector('.sub-tab-panel')) {
        contentContainer = nav.parentElement.nextElementSibling;
    }

    if (!contentContainer || !contentContainer.querySelector('.sub-tab-panel')) {
        console.error(`Could not find a valid content container for sub-tabs: ${navSelector}`);
        return;
    }

    nav.addEventListener('click', (e) => {
        const button = e.target.closest('.sub-tab-button');
        if (!button) return;

        nav.querySelectorAll('.sub-tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        contentContainer.querySelectorAll('.sub-tab-panel').forEach(panel => panel.classList.add('hidden'));
        
        const targetId = button.dataset.target || button.dataset.subtabTarget;
        if (!targetId) return;

        const selector = targetId.startsWith('#') ? targetId : '#' + targetId;
        const targetPanel = document.querySelector(selector);
        
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 50);
        }
    });
}

// --- Input Handling ---

export function initializeNumberInputs() {
    const mainContainer = document.querySelector('main');
    if (!mainContainer) return;

    mainContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.number-button-plus, .number-button-minus');
        if (!button) return;

        const inputId = button.dataset.target;
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
            const step = parseFloat(inputElement.step) || 1;
            let currentValue = parseFloat(inputElement.value) || 0;
            currentValue += button.classList.contains('number-button-plus') ? step : -step;
            
            const min = parseFloat(inputElement.min);
            if (!isNaN(min) && currentValue < min) {
                currentValue = min;
            }
            
            inputElement.value = currentValue.toFixed(inputElement.step.includes('.') ? 2 : 0);
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
}

export function initializeTendonSelector() {
    const typeSelector = document.getElementById('tendon-type');
    const strandsSelector = document.getElementById('tendon-strands');

    if (!typeSelector || !strandsSelector) return;

    function updateTendonDisplay() {
        const totalAreaEl = document.getElementById('tendon-total-area');
        const fpuEl = document.getElementById('tendon-fpu');
        const fpyEl = document.getElementById('tendon-fpy');

        if (!totalAreaEl || !fpuEl || !fpyEl) return;

        const selectedTypeKey = typeSelector.value;
        const numStrands = parseInt(strandsSelector.value);
        const tendon = TENDON_DATA[selectedTypeKey];

        if (tendon && !isNaN(numStrands)) {
            const totalAreaMm2 = tendon.area * numStrands;
            const totalAreaCm2 = totalAreaMm2 / 100;
            
            totalAreaEl.textContent = `${totalAreaCm2.toFixed(2)} cm²`;
            fpuEl.innerHTML = `$${tendon.fpu} \\ MPa$`;
            fpyEl.innerHTML = `$${tendon.fpy} \\ MPa$`;

            if (window.renderMathInElement) {
                renderMathInElement(fpuEl.parentElement, { delimiters: [{left: "$", right: "$", display: false}] });
                renderMathInElement(fpyEl.parentElement, { delimiters: [{left: "$", right: "$", display: false}] });
            }
        }
    }

    typeSelector.addEventListener('change', updateTendonDisplay);
    strandsSelector.addEventListener('change', updateTendonDisplay);
    updateTendonDisplay();
}

export function initializeRebarSelector() {
    const selector = document.getElementById('rebar-select');
    if (!selector) return;

    function updateRebarDisplay() {
        const diameterEl = document.getElementById('rebar-diameter');
        const areaEl = document.getElementById('rebar-area');
        const fyEl = document.getElementById('rebar-fy');

        if (!diameterEl || !areaEl || !fyEl) return;

        const selectedKey = selector.value;
        const rebar = REBAR_DATA[selectedKey];
        if (rebar) {
            diameterEl.textContent = `${rebar.diameter.toFixed(2)} mm`;
            areaEl.textContent = `${rebar.area.toFixed(4)} cm²`;
            const fy = rebar.diameter <= 15.9 ? 2800 : 4200;
            fyEl.innerHTML = `$${fy} \\ kgf/cm^2$`;

            if (window.renderMathInElement) {
                renderMathInElement(fyEl.parentElement, { delimiters: [{left: "$", right: "$", display: false}] });
            }
        }
    }

    selector.addEventListener('change', updateRebarDisplay);
    updateRebarDisplay();
}

// [新增] 剪力筋選單初始化 (Tab 9)
export function initializeShearSelector() {
    const selector = document.getElementById('shear-rebar-size');
    if (!selector) return;

    const updateDisplay = () => {
        const size = selector.value;
        const data = SHEAR_REBAR_DATA[size];
        const areaDisplay = document.getElementById('shear-rebar-area-display');
        const fyDisplay = document.getElementById('shear-fy-display');
        
        if (areaDisplay) areaDisplay.textContent = data.area.toFixed(2);
        if (fyDisplay) fyDisplay.textContent = data.fy;
    };

    selector.addEventListener('change', updateDisplay);
    // 初始化執行一次
    updateDisplay();
}

// --- Display Update Functions ---

export function updateDuctInfo(targetDivId, ductLayout) {
    const container = document.getElementById(targetDivId);
    if (!container) return;

    container.innerHTML = ''; 

    if (!ductLayout || ductLayout.length === 0) {
        container.innerHTML = `<p class="text-sm text-slate-500">無旋楞管資料。</p>`;
        return;
    }

    const table = document.createElement('table');
    table.className = 'w-full text-sm border-collapse';
    table.innerHTML = `
        <caption class="text-left font-semibold text-slate-700 pb-2">旋楞管中心座標</caption>
        <thead class="bg-slate-100 text-slate-700 font-semibold">
            <tr>
                <th class="p-2 border border-slate-300 text-center">編號</th>
                <th class="p-2 border border-slate-300 text-center">X 座標 (cm)</th>
                <th class="p-2 border border-slate-300 text-center">Y 座標 (cm)</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    ductLayout.forEach(duct => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="p-1 border border-slate-300 text-center font-mono">${duct.id}</td>
            <td class="p-1 border border-slate-300 text-center font-mono">${duct.x_coord.toFixed(1)}</td>
            <td class="p-1 border border-slate-300 text-center font-mono">${duct.y_coord.toFixed(1)}</td>
        `;
        tbody.appendChild(row);
    });

    container.appendChild(table);
}

export function updateTendonInfo(targetDivId, tendonLayout, view) {
    const container = document.getElementById(targetDivId);
    if (!container) return;

    container.innerHTML = ''; 
    
    if (view === 'side') {
        return;
    }

    if (!tendonLayout || !tendonLayout.tendons || tendonLayout.tendons.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500">無鋼腱資料。</p>`;
        return;
    }

    const isMidSpan = view === 'mid';
    const table = document.createElement('table');
    table.className = 'w-full text-sm border-collapse';
    table.innerHTML = `
        <thead class="bg-slate-100 text-slate-700 font-semibold">
            <tr>
                <th class="p-2 border border-slate-300 text-center">#</th>
                <th class="p-2 border border-slate-300 text-center">X</th>
                <th class="p-2 border border-slate-300 text-center">Y ${isMidSpan ? '(跨中)' : '(梁端)'}</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    tendonLayout.tendons.forEach(t => {
        const yCoord = isMidSpan ? t.y_mid : t.y_end;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="p-1 border border-slate-300 text-center font-mono">${t.id}</td>
            <td class="p-1 border border-slate-300 text-center font-mono">${t.x_coord.toFixed(1)}</td>
            <td class="p-1 border border-slate-300 text-center font-mono">${yCoord.toFixed(1)}</td>
        `;
        tbody.appendChild(row);
    });

    container.appendChild(table);
}

export function updateLossSummaryResults(targetId, lossSummary, fpj) {
    const { totalLoss_kgfcm2, lossRate_percent, fpe_kgfcm2 } = lossSummary;
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    const fpe_str = fpe_kgfcm2.toFixed(1);
    const fpj_str = fpj.toFixed(1);
    const totalLoss_str = totalLoss_kgfcm2.toFixed(1);
    const lossRate_str = lossRate_percent.toFixed(2);

    const fpeHtml = `
        <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm">
            <h4 class="text-lg font-semibold text-indigo-800 mb-2">有效預力 (Effective Prestress)</h4>
            <div class="text-base text-slate-700 space-y-2">
                <p>$f_{pe} = f_{pj} - \\Delta f_{p,total}$</p>
                <p>$f_{pe} = ${fpj_str} - ${totalLoss_str} = \\mathbf{${fpe_str}} \\text{ kgf/cm}^2$</p>
            </div>
        </div>
    `;

    const summaryHtml = `
        <div class="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h4 class="text-lg font-semibold text-slate-800 mb-2">損失彙總 (Loss Summary)</h4>
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-slate-600">總預力損失 ($\\Delta f_{p,total}$):</span>
                    <span class="font-semibold text-lg text-red-600">$${totalLoss_str} \\text{ kgf/cm}^2$</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-600">總損失率:</span>
                    <span class="font-semibold text-lg text-red-600">$${lossRate_str} \\%$</span>
                </div>
            </div>
        </div>
    `;

    targetElement.innerHTML = fpeHtml + summaryHtml;
}

export function updateDerivedValues(dims, sectionProps, advSectionProps) {
    const { L, W, Dt, Dr, Db, Sr, He, Nb, Nbs, L1, L2 } = dims;
    const { grossAreaCm2, netAreaCm2 } = sectionProps;
    const { I_g: netInertiaCm4, Y_cg } = advSectionProps;

    const updateText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    updateText('display-L-m', `= ${(L / 100).toFixed(2)} m`);
    updateText('display-W', `= ${W.toFixed(1)} cm`);
    updateText('display-H', `= ${(Dt + Dr + Db).toFixed(1)} cm`);
    updateText('display-Eb', `= ${(Sr - Dr).toFixed(1)} cm`);
    updateText('display-He', `= ${He.toFixed(1)} cm`);
    updateText('display-Nb', `= ${Nb}`);
    updateText('display-Nbs', `= ${Nbs.toFixed(1)} cm`);
    updateText('display-L1', `= ${L1.toFixed(1)} cm`);
    updateText('display-LT', `= ${((L + 2 * L1) / 100).toFixed(2)} m`);
    updateText('display-Lp', `= ${(L - 2 * L2).toFixed(1)} cm`);

    updateText('display-net-area', `= ${netAreaCm2.toFixed(2)} cm²`);
    updateText('display-net-inertia', `= ${netInertiaCm4.toFixed(2)} cm⁴`);
    
    updateText('display-centroid-y', `= ${Y_cg.toFixed(2)} cm`);
}


/**
 * 更新 "梁中點上下緣應力計算" 分頁的表格 和 詳細計算過程。
 */
export function updateMidspanStressUI(inputs, results) {
    
    const updateCell = (id, value, decimals, unit) => {
        const el = document.getElementById(id);
        if (el) {
            if (typeof value !== 'number' || isNaN(value)) {
                el.textContent = '-';
            } else {
                let formattedValue;
                if (Math.abs(value) > 1e6 || (Math.abs(value) < 1e-3 && value !== 0)) { 
                    formattedValue = value.toExponential(decimals);
                } else {
                    formattedValue = value.toFixed(decimals);
                }
                el.textContent = `${formattedValue} ${unit}`;
            }
        }
    };

    const updateCalcStep = (id, htmlContent) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = htmlContent;
        }
    };

    if (results) {
        // 舊項目
        updateCell('stress-F-eff', results.F_eff_tf, 2, 'tf');
        updateCell('stress-ep-eff', results.ep_eff, 2, 'cm');
        updateCell('stress-M-eff', results.M_eff_tfm, 2, 'tf-m');
        updateCell('stress-Ycg-b', results.Ycg_b, 2, 'cm');
        updateCell('stress-S-top', results.S_top, 2, 'cm³');
        updateCell('stress-S-bot', results.S_bot, 2, 'cm³');
        updateCell('stress-f-top', results.f_eff_top, 2, 'kgf/cm²');
        updateCell('stress-f-bot', results.f_eff_bot, 2, 'kgf/cm²');
        
        // 新項目
        updateCell('stress-f-dl-top', results.f_DL_top, 2, 'kgf/cm²');
        updateCell('stress-f-dl-bot', results.f_DL_bot, 2, 'kgf/cm²');
        updateCell('stress-f-ll-top', results.f_LL_top, 2, 'kgf/cm²');
        updateCell('stress-f-ll-bot', results.f_LL_bot, 2, 'kgf/cm²');
        updateCell('stress-fs-bf', results.fs_bf, 2, 'kgf/cm²');
        updateCell('stress-Fs-bf', results.Fs_bf_tf, 2, 'tf');
        updateCell('stress-fbf-top', results.fbf_top, 2, 'kgf/cm²');
        updateCell('stress-fbf-bot', results.fbf_bot, 2, 'kgf/cm²');
    }

    if (inputs && results) {
        try {
            updateCalcStep('calc-F-eff',
                `$F_{eff} = f_{pe} \\times A_p \\times N$<br>
                 $= ${inputs.fpe.toFixed(2)} \\times ${inputs.Ap_cm2.toFixed(2)} \\times ${inputs.numTendons}$<br>
                 $= ${results.F_eff_kgf.toFixed(2)} \\, kgf = \\mathbf{${results.F_eff_tf.toFixed(2)} \\, tf}$`
            );
            updateCalcStep('calc-ep-eff',
                `$e_{p,eff} = |y_{mid}| - Y_{cg}$<br>
                 $= |${inputs.y_mid.toFixed(2)}| - ${inputs.Y_cg.toFixed(2)} = \\mathbf{${results.ep_eff.toFixed(2)} \\, cm}$`
            );
            updateCalcStep('calc-M-eff',
                `$M_{eff} = F_{eff} \\times e_{p,eff}$<br>
                 $= ${results.F_eff_tf.toFixed(2)} \\, tf \\times (${results.ep_eff.toFixed(2)} \\, cm / 100) = \\mathbf{${results.M_eff_tfm.toFixed(2)} \\, tf-m}$`
            );
            updateCalcStep('calc-Ycg-b',
                `$Y_{cg,b} = H - Y_{cg} = ${inputs.H.toFixed(2)} - ${inputs.Y_cg.toFixed(2)} = \\mathbf{${results.Ycg_b.toFixed(2)} \\, cm}$`
            );
            updateCalcStep('calc-S-top',
                `$S_{top} = I_{net} / Y_{cg} = ${inputs.I_g.toExponential(2)} / ${inputs.Y_cg.toFixed(2)} = \\mathbf{${results.S_top.toExponential(2)} \\, cm^3}$`
            );
            updateCalcStep('calc-S-bot',
                `$S_{bot} = I_{net} / Y_{cg,b} = ${inputs.I_g.toExponential(2)} / ${results.Ycg_b.toFixed(2)} = \\mathbf{${results.S_bot.toExponential(2)} \\, cm^3}$`
            );
            updateCalcStep('calc-stress-axial',
                `軸向應力 $f_{axial} = P/A = F_{eff,kgf} / A_{net}$<br>
                 $= ${results.F_eff_kgf.toFixed(2)} / ${inputs.Anet.toFixed(2)} = \\mathbf{${results.stress_axial.toFixed(2)} \\, kgf/cm^2}$ (壓應力 +)`
            );
            updateCalcStep('calc-stress-moment-top',
                `上緣彎矩應力 $f_{m,top} = M_{eff,kgfcm} / S_{top}$<br>
                 $= ${results.M_eff_kgfcm.toExponential(2)} / ${results.S_top.toExponential(2)} = \\mathbf{${results.stress_moment_top.toFixed(2)} \\, kgf/cm^2}$ (拉應力 -)`
            );
            updateCalcStep('calc-stress-moment-bot',
                `下緣彎矩應力 $f_{m,bot} = M_{eff,kgfcm} / S_{bot}$<br>
                 $= ${results.M_eff_kgfcm.toExponential(2)} / ${results.S_bot.toExponential(2)} = \\mathbf{${results.stress_moment_bot.toFixed(2)} \\, kgf/cm^2}$ (壓應力 +)`
            );
            updateCalcStep('calc-f-top',
                `$f_{eff,top} = f_{axial} - f_{m,top}$<br>
                 $= ${results.stress_axial.toFixed(2)} - ${results.stress_moment_top.toFixed(2)} = \\mathbf{${results.f_eff_top.toFixed(2)} \\, kgf/cm^2}$`
            );
            updateCalcStep('calc-f-bot',
                `$f_{eff,bot} = f_{axial} + f_{m,bot}$<br>
                 $= ${results.stress_axial.toFixed(2)} + ${results.stress_moment_bot.toFixed(2)} = \\mathbf{${results.f_eff_bot.toFixed(2)} \\, kgf/cm^2}$`
            );

            // 8-10. (新項目)
            updateCalcStep('calc-f-dl-top',
                `$f_{DL,top} = M_{slab,kgfcm} / S_{top}$ (壓應力 +)<br>
                 $= ${results.M_slab_kgfcm.toExponential(2)} / ${results.S_top.toExponential(2)} = \\mathbf{${results.f_DL_top.toFixed(2)} \\, kgf/cm^2}$`
            );
            updateCalcStep('calc-f-dl-bot',
                `$f_{DL,bot} = -M_{slab,kgfcm} / S_{bot}$ (拉應力 -)<br>
                 $= -${results.M_slab_kgfcm.toExponential(2)} / ${results.S_bot.toExponential(2)} = \\mathbf{${results.f_DL_bot.toFixed(2)} \\, kgf/cm^2}$`
            );
            updateCalcStep('calc-f-ll-top',
                `$f_{LL,top} = M_{final,kgfcm} / S_{top}$ (壓應力 +)<br>
                 $= ${results.M_final_kgfcm.toExponential(2)} / ${results.S_top.toExponential(2)} = \\mathbf{${results.f_LL_top.toFixed(2)} \\, kgf/cm^2}$`
            );
            updateCalcStep('calc-f-ll-bot',
                `$f_{LL,bot} = -M_{final,kgfcm} / S_{bot}$ (拉應力 -)<br>
                 $= -${results.M_final_kgfcm.toExponential(2)} / ${results.S_bot.toExponential(2)} = \\mathbf{${results.f_LL_bot.toFixed(2)} \\, kgf/cm^2}$`
            );
            updateCalcStep('calc-fs-bf',
                `$f_{s,bf} = f_{pe} + \\Delta f_{pSH} + \\Delta f_{pCR} + \\Delta f_{pSR}$<br>
                 $= ${inputs.fpe.toFixed(2)} + ${inputs.loss_shrinkage.toFixed(2)} + ${inputs.loss_creep.toFixed(2)} + ${inputs.loss_relaxation.toFixed(2)}$<br>
                 $= \\mathbf{${results.fs_bf.toFixed(2)} \\, kgf/cm^2}$`
            );
            updateCalcStep('calc-Fs-bf',
                `$F_{s,bf} = f_{s,bf} \\times A_p \\times N$<br>
                 $= ${results.fs_bf.toFixed(2)} \\times ${inputs.Ap_cm2.toFixed(2)} \\times ${inputs.numTendons}$<br>
                 $= ${results.Fs_bf_kgf.toFixed(2)} \\, kgf = \\mathbf{${results.Fs_bf_tf.toFixed(2)} \\, tf}$`
            );
            
            updateCalcStep('calc-M-s-bf',
                `$M_{s,bf,kgfcm} = (F_{s,bf} \\times e_{p,eff}) \\times 1000$<br>
                 $= (${results.Fs_bf_tf.toFixed(2)} \\, tf \\times ${results.ep_eff.toFixed(2)} \\, cm / 100) \\times 100000$<br>
                 $= \\mathbf{${results.Ms_bf_kgfcm.toExponential(2)} \\, kgf-cm}$<br><br>
                 暫時軸向應力 $f_{axial,bf} = F_{s,bf} / A_{net}$<br>
                 $= ${results.Fs_bf_kgf.toFixed(2)} / ${inputs.Anet.toFixed(2)} = \\mathbf{${results.stress_axial_bf.toFixed(2)} \\, kgf/cm^2}$ (壓應力 +)`
            );

            updateCalcStep('calc-fbf-top',
                `$f_{bf,top} = (P_{s,bf}/A_{net}) - (M_{s,bf} / S_{top}) + f_{DL,top}$<br>
                 $= f_{axial,bf} - f_{m,bf,top} + f_{DL,top}$<br>
                 $= ${results.stress_axial_bf.toFixed(2)} - ${results.stress_Ms_bf_top.toFixed(2)} + ${results.f_DL_top.toFixed(2)}$<br>
                 $= \\mathbf{${results.fbf_top.toFixed(2)} \\, kgf/cm^2}$`
            );

            updateCalcStep('calc-fbf-bot',
                `$f_{bf,bot} = (P_{s,bf}/A_{net}) + (M_{s,bf} / S_{bot}) + f_{DL,bot}$<br>
                 $= f_{axial,bf} + f_{m,bf,bot} + f_{DL,bot}$<br>
                 $= ${results.stress_axial_bf.toFixed(2)} + ${results.stress_Ms_bf_bot.toFixed(2)} + (${results.f_DL_bot.toFixed(2)})$<br>
                 $= \\mathbf{${results.fbf_bot.toFixed(2)} \\, kgf/cm^2}$`
            );

        } catch (error) {
            console.error("Error updating midspan stress UI:", error);
            updateCalcStep('calc-f-dl-top', '計算錯誤');
            updateCalcStep('calc-f-ll-top', '計算錯誤');
            updateCalcStep('calc-fs-bf', '計算錯誤');
        }
    }
}

/**
 * 更新 "6. 應力檢核" 分頁中的容許應力表格。
 */
export function updateAllowableStressUI(fck, fci, stressResults) {
    
    const updateStressCell = (id, formula, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `${formula}<br><span class="font-mono font-bold text-indigo-700">${value.toFixed(2)}</span>`;
        }
    };
    
    const updateText = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = (typeof value === 'number') ? value.toFixed(0) : value;
        }
    };

    updateText('display-fck', `${fck.toFixed(0)} kgf/cm²`);
    updateText('display-fci', `${fci.toFixed(0)} kgf/cm²`);

    if (stressResults) {
        updateStressCell('stress-comp-ci', "$0.6 f'_{ci}$", stressResults.comp_ci);
        updateStressCell('stress-tens-ci', "$0.8 \\sqrt{f'_{ci}}$", stressResults.tens_ci);
        
        updateStressCell('stress-comp-dl', "$0.40 f'_{ck}$", stressResults.comp_dl);
        updateStressCell('stress-tens-dl', "$0.8 \\sqrt{f'_{ck}}$", stressResults.tens_dl); 

        updateStressCell('stress-comp-case3', "$0.40 f'_{ck}$", stressResults.comp_case3);
        updateStressCell('stress-tens-case3', "$0.8 \\sqrt{f'_{ck}}$", stressResults.tens_case3);

        updateStressCell('stress-comp-100', "$0.6 f'_{ck}$", stressResults.comp_100);
        updateStressCell('stress-tens-100', "$0.8 \\sqrt{f'_{ck}}$", stressResults.tens_100);
        updateStressCell('stress-comp-125', "$0.6 f'_{ck} \\times 1.25$", stressResults.comp_125);
        updateStressCell('stress-tens-125', "$0.8 \\sqrt{f'_{ck}} \\times 1.25$", stressResults.tens_125);
        updateStressCell('stress-comp-140', "$0.6 f'_{ck} \\times 1.40$", stressResults.comp_140);
        updateStressCell('stress-tens-140', "$0.8 \\sqrt{f'_{ck}} \\times 1.40$", stressResults.tens_140);
        updateStressCell('stress-comp-133', "$0.6 f'_{ck} \\times 1.33$", stressResults.comp_133);
        updateStressCell('stress-tens-133', "$0.8 \\sqrt{f'_{ck}} \\times 1.33$", stressResults.tens_133);
    }
}

/**
 * 更新 "壓, 張應力檢核" 分頁的表格 與 詳細過程。
 */
export function updateStressCheckUI(checks) {
    
    const updateRow = (valId, limId, resId, val, limText, isPass) => {
        const elVal = document.getElementById(valId);
        const elLim = document.getElementById(limId);
        const elRes = document.getElementById(resId);

        if (elVal) elVal.textContent = val.toFixed(2);
        if (elLim) elLim.textContent = limText;
        
        if (elRes) {
            if (isPass) {
                elRes.textContent = 'OK';
                elRes.className = 'px-2 py-3 text-sm text-center font-bold text-green-600 bg-green-50 rounded';
            } else {
                elRes.textContent = 'NG';
                elRes.className = 'px-2 py-3 text-sm text-center font-bold text-red-600 bg-red-50 rounded';
            }
        }
    };

    const updateDetail = (id, formula, calc, isPass) => {
        const el = document.getElementById(id);
        if (el) {
            const resText = isPass ? 
                `<span class="text-green-600 font-bold">合格 (OK)</span>` : 
                `<span class="text-red-600 font-bold">不合格 (NG)</span>`;
            
            el.innerHTML = 
                `<div class="mb-2"><span class="text-slate-500">檢核公式:</span><br>${formula}</div>` +
                `<div class="mb-2"><span class="text-slate-500">數值代入:</span><br>${calc}</div>` +
                `<div><span class="text-slate-500">判定結果:</span> ${resText}</div>`;
        }
    };

    if (checks) {
        const rangeTextCI = `${checks.lim_tens_ci.toFixed(2)} ~ ${checks.lim_comp_ci.toFixed(2)}`;
        updateRow('check-val-const-top', 'check-lim-const-top', 'check-res-const-top', checks.val_const_top, rangeTextCI, checks.res_const_top);
        updateRow('check-val-const-bot', 'check-lim-const-bot', 'check-res-const-bot', checks.val_const_bot, rangeTextCI, checks.res_const_bot);

        const rangeTextDL = `${checks.lim_tens_dl.toFixed(2)} ~ ${checks.lim_comp_dl.toFixed(2)}`;
        updateRow('check-val-effdl-top', 'check-lim-effdl-top', 'check-res-effdl-top', checks.val_effdl_top, rangeTextDL, checks.res_effdl_top);
        updateRow('check-val-effdl-bot', 'check-lim-effdl-bot', 'check-res-effdl-bot', checks.val_effdl_bot, rangeTextDL, checks.res_effdl_bot);

        const rangeTextCase3 = `${checks.lim_tens_case3.toFixed(2)} ~ ${checks.lim_comp_case3.toFixed(2)}`;
        updateRow('check-val-case3-top', 'check-lim-case3-top', 'check-res-case3-top', checks.val_case3_top, rangeTextCase3, checks.res_case3_top);
        updateRow('check-val-case3-bot', 'check-lim-case3-bot', 'check-res-case3-bot', checks.val_case3_bot, rangeTextCase3, checks.res_case3_bot);

        const rangeTextCase4 = `${checks.lim_tens_100.toFixed(2)} ~ ${checks.lim_comp_100.toFixed(2)}`;
        updateRow('check-val-case4-top', 'check-lim-case4-top', 'check-res-case4-top', checks.val_case4_top, rangeTextCase4, checks.res_case4_top);
        updateRow('check-val-case4-bot', 'check-lim-case4-bot', 'check-res-case4-bot', checks.val_case4_bot, rangeTextCase4, checks.res_case4_bot);


        // 詳細過程
        updateDetail('detail-const-top',
            `$-0.8\\sqrt{f'_{ci}} \\le f_{bf,top} \\le 0.6f'_{ci}$`,
            `$${checks.val_const_top.toFixed(2)}$`,
            checks.res_const_top
        );
        updateDetail('detail-const-bot',
            `$-0.8\\sqrt{f'_{ci}} \\le f_{bf,bot} \\le 0.6f'_{ci}$`,
            `$${checks.val_const_bot.toFixed(2)}$`,
            checks.res_const_bot
        );
        
        // Case 2 (完工階段 1)
        if (checks.components) {
            const c = checks.components;
            updateDetail('detail-effdl-top',
                `$f_{eff,top} + f_{DL,top}$`,
                `$${c.f_eff_top.toFixed(2)} + ${c.f_DL_top.toFixed(2)} = ${checks.val_effdl_top.toFixed(2)}$ <br> (範圍: ${rangeTextDL})`,
                checks.res_effdl_top
            );
            updateDetail('detail-effdl-bot',
                `$f_{eff,bot} + f_{DL,bot}$`,
                `$${c.f_eff_bot.toFixed(2)} + ${c.f_DL_bot.toFixed(2)} = ${checks.val_effdl_bot.toFixed(2)}$ <br> (範圍: ${rangeTextDL})`,
                checks.res_effdl_bot
            );

            // Case 3 (完工階段 2)
            updateDetail('detail-case3-top',
                `$\\frac{1}{2}(f_{eff,top} + f_{DL,top}) + f_{LL,top}$`,
                `$0.5 \\times (${c.f_eff_top.toFixed(2)} + ${c.f_DL_top.toFixed(2)}) + ${c.f_LL_top.toFixed(2)} = ${checks.val_case3_top.toFixed(2)}$ <br> (範圍: ${rangeTextCase3})`,
                checks.res_case3_top
            );
            updateDetail('detail-case3-bot',
                `$\\frac{1}{2}(f_{eff,bot} + f_{DL,bot}) + f_{LL,bot}$`,
                `$0.5 \\times (${c.f_eff_bot.toFixed(2)} + ${c.f_DL_bot.toFixed(2)}) + ${c.f_LL_bot.toFixed(2)} = ${checks.val_case3_bot.toFixed(2)}$ <br> (範圍: ${rangeTextCase3})`,
                checks.res_case3_bot
            );

            // [新增] Case 4 (完工階段 3)
            updateDetail('detail-case4-top',
                `$f_{eff,top} + f_{DL,top} \\cdot a_{DL} + f_{LL,top}$`,
                `$a_{DL} = ${c.a_DL.toFixed(2)}$<br>` + 
                `$${c.f_eff_top.toFixed(2)} + (${c.f_DL_top.toFixed(2)} \\times ${c.a_DL.toFixed(2)}) + ${c.f_LL_top.toFixed(2)} = ${checks.val_case4_top.toFixed(2)}$ <br> (範圍: ${rangeTextCase4})`,
                checks.res_case4_top
            );
            updateDetail('detail-case4-bot',
                `$f_{eff,bot} + f_{DL,bot} \\cdot a_{DL} + f_{LL,bot}$`,
                `$a_{DL} = ${c.a_DL.toFixed(2)}$<br>` +
                `$${c.f_eff_bot.toFixed(2)} + (${c.f_DL_bot.toFixed(2)} \\times ${c.a_DL.toFixed(2)}) + ${c.f_LL_bot.toFixed(2)} = ${checks.val_case4_bot.toFixed(2)}$ <br> (範圍: ${rangeTextCase4})`,
                checks.res_case4_bot
            );
        }
    }
}

/**
 * 更新 "7. 撓曲強度檢核" 分頁的內容。
 */
export function updateFlexuralCheckUI(inputs, results) {
    
    // 輔助函式
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    const setHtml = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    // 1. 所需強度 Mu
    setText('flex-M-dl', `${inputs.M_DL_total_tfm.toFixed(2)} tf-m`);
    setText('flex-M-ll', `${inputs.M_final_tfm.toFixed(2)} tf-m`);
    setText('flex-M-u', `${results.Mu_tfm.toFixed(2)} tf-m`);

    // 2. 設計強度 Phi Mn
    // 參數
    setText('flex-b', `${inputs.b_cm.toFixed(1)} cm`);
    setText('flex-dp', `${inputs.dp_cm.toFixed(1)} cm`);
    setText('flex-aps', `${inputs.Ap_cm2.toFixed(2)} cm²`);
    setText('flex-fck', `${inputs.fck.toFixed(0)} kgf/cm²`);
    
    // 詳細過程
    setHtml('flex-Mn-details', results.details);
    
    // 結果
    setText('flex-Mn', `${results.Mn_tfm.toFixed(2)} tf-m`);
    setText('flex-phiMn', `${results.phiMn_tfm.toFixed(2)} tf-m`);

    // 3. 最終判定
    const container = document.getElementById('flex-check-container');
    const resultText = document.getElementById('flex-check-result-text');
    const formulaText = document.getElementById('flex-check-formula');

    if (container && resultText && formulaText) {
        if (results.isPass) {
            container.className = "mb-8 p-6 border-2 border-green-200 rounded-xl text-center flex flex-col items-center justify-center bg-green-50";
            resultText.className = "text-3xl font-bold mb-2 text-green-600";
            resultText.textContent = "檢核合格 (OK)";
        } else {
            container.className = "mb-8 p-6 border-2 border-red-200 rounded-xl text-center flex flex-col items-center justify-center bg-red-50";
            resultText.className = "text-3xl font-bold mb-2 text-red-600";
            resultText.textContent = "檢核不合格 (NG)";
        }
        
        // [修改] 顯示詳細數值與單位
        formulaText.innerHTML = 
            `$\\phi M_n = ${results.phiMn_tfm.toFixed(2)} \\ tf\\text{-}m, \\quad M_u = ${results.Mu_tfm.toFixed(2)} \\ tf\\text{-}m$ <br>` +
            `關係式: $\\phi M_n \\ge M_u$ (${results.isPass ? 'OK' : 'NG'})`;
    }
}

/**
 * 更新 "8. 撓度檢核" 分頁內容
 */
export function updateDeflectionUI(inputs, results) {
    
    // 輔助函式
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    const setHtml = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    // 1. 更新參數列表
    setText('defl-L', `${inputs.L_cm.toFixed(0)} cm`);
    setText('defl-M', `${inputs.M_final_tfm.toFixed(2)} tf-m`);
    setText('defl-Ec', `${results.Ec.toFixed(0)} kgf/cm²`);
    setText('defl-I', `${inputs.I_net_cm4.toFixed(0)} cm⁴`);

    // 2. 詳細計算過程
    setHtml('deflection-calc-details', results.details);

    // 3. 最終判定與結果顯示
    const container = document.getElementById('deflection-check-container');
    const resultText = document.getElementById('deflection-check-result-text');
    const formulaText = document.getElementById('deflection-check-formula');

    if (container && resultText && formulaText) {
        let statusClass = "";
        let statusText = "";
        
        if (results.isPass) {
            container.className = "mb-8 p-6 border-2 border-green-200 rounded-xl text-center flex flex-col items-center justify-center bg-green-50";
            statusClass = "text-green-600 font-bold";
            statusText = "OK";
        } else {
            container.className = "mb-8 p-6 border-2 border-red-200 rounded-xl text-center flex flex-col items-center justify-center bg-red-50";
            statusClass = "text-red-600 font-bold";
            statusText = "NG";
        }
        
        resultText.className = "text-xl font-bold mb-3 text-slate-800"; 
        resultText.innerHTML = `$\\Delta_{LL} = ${results.delta_LL.toFixed(3)} \\ \\text{cm}, \\quad L/${results.limitRatio} = ${results.limit.toFixed(3)} \\ \\text{cm}$`;

        const compareOp = results.isPass ? "\\le" : ">";
        formulaText.className = "text-2xl font-mono mt-1"; 
        formulaText.innerHTML = `$\\Delta_{LL} ${compareOp} L/${results.limitRatio} \\quad \\text{(${statusText})}$`;
        
        if (!results.isPass) {
            formulaText.classList.add("text-red-600");
        } else {
            formulaText.classList.add("text-green-600");
        }
    }
}

// [新增] 更新剪力檢核 UI (Tab 9)
export function updateShearCheckUI(inputs, results) {
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    const setHtml = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    // 1. 建議肢數提示
    const hintEl = document.getElementById('shear-legs-hint');
    if (hintEl) {
        hintEl.textContent = `建議肢數:2*(旋楞管數量+1)`;
    }

    // 2. 右側計算結果
    setText('calc-x-shear', `${results.x_shear.toFixed(1)} cm`);
    setText('res-V-dead', `${results.V_dead.toFixed(2)} tf`);
    setText('res-V-truck', `${results.V_LL_truck.toFixed(2)} tf`);
    setText('res-V-lane', `${results.V_LL_lane.toFixed(2)} tf`);
    setText('res-V-final', `${results.V_LL_final.toFixed(2)} tf`);
    setText('res-V-u', `${results.Vu.toFixed(2)} tf`);
    setText('res-V-s', `${results.Vs.toFixed(2)} tf`);
    setText('res-V-c', `${results.Vc.toFixed(2)} tf`);
    setText('res-V-n', `${results.Vn.toFixed(2)} tf`);

    // 3. 詳細計算過程 (LaTeX)
    if (results.Vn > 0) { 
        setHtml('detail-V-dead', 
            `$V_{dead} = (W_{slab}+W_{ADL}) \\times (L/2 - x)$<br>` +
            `$= ${results.w_dead_tfm.toFixed(2)} \\times (${results.L_m.toFixed(2)}/2 - ${results.x_shear_m.toFixed(2)})$<br>` +
            `$= \\mathbf{${results.V_dead.toFixed(2)} \\ tf}$`
        );

        setHtml('detail-V-truck',
            `$V_{LL,truck} = [14.6(L-x) + 14.6(L-x-4.25) + 3.65(L-x-8.5)] / L$<br>` +
            `$= [${results.term1.toFixed(1)} + ${results.term2.toFixed(1)} + ${results.term3.toFixed(1)}] / ${results.L_m.toFixed(2)}$<br>` +
            `$= \\mathbf{${results.V_LL_truck.toFixed(2)} \\ tf}$`
        );

        setHtml('detail-V-lane',
            `$V_{LL,lane} = [11.8(L-x) + (0.96 L^2)/2] / L$<br>` +
            `$= [11.8(${results.L_m.toFixed(2)}-${results.x_shear_m.toFixed(2)}) + (0.96 \\times ${results.L_m.toFixed(2)}^2)/2] / ${results.L_m.toFixed(2)}$<br>` +
            `$= \\mathbf{${results.V_LL_lane.toFixed(2)} \\ tf}$`
        );

        setHtml('detail-V-final',
            `$V_{LL,final} = V_{LL,max} (1+i) (1+\\text{Ov}) (\\text{Red}) (\\text{Lanes})$<br>` +
            `$= ${results.V_LL_max.toFixed(2)} (1+${results.i.toFixed(2)}) (1+${results.overload}) (${results.reduction}) (${results.lanes})$<br>` +
            `$= \\mathbf{${results.V_LL_final.toFixed(2)} \\ tf}$`
        );

        setHtml('detail-V-u',
            `$V_u = 1.3 V_{dead} + 1.67 V_{LL,final}$<br>` +
            `$= 1.3(${results.V_dead.toFixed(2)}) + 1.67(${results.V_LL_final.toFixed(2)})$<br>` +
            `$= \\mathbf{${results.Vu.toFixed(2)} \\ tf}$`
        );

        setHtml('detail-V-s',
            `$d_v = 0.8H = ${results.d_v.toFixed(1)} \\ cm$<br>` +
            `$V_s = (A_v f_y n d_v) / s$<br>` +
            `$= (${inputs.shearRebar.area.toFixed(2)} \\times ${inputs.shearRebar.fy} \\times ${inputs.shearRebar.legs} \\times ${results.d_v.toFixed(1)}) / ${results.s_cm.toFixed(1)}$<br>` +
            `$= ${(results.Vs*1000).toFixed(0)} \\ kgf = \\mathbf{${results.Vs.toFixed(2)} \\ tf}$`
        );

        setHtml('detail-V-c',
            `$V_c = 0.45 \\sqrt{f'_c} W d_v$<br>` +
            `$= 0.45 \\sqrt{${results.fck.toFixed(0)}} \\times ${results.W_cm.toFixed(1)} \\times ${results.d_v.toFixed(1)}$<br>` +
            `$= ${(results.Vc*1000).toFixed(0)} \\ kgf = \\mathbf{${results.Vc.toFixed(2)} \\ tf}$` +
            `<p class="text-xs text-slate-500 mt-1">本公式係依據台灣橋梁設計規範8-27公式進行簡化，詳細混凝土剪力應依據橋梁設計規範8.20.2節進行分析</p>`
        );
        
        setHtml('detail-V-n',
            `$V_n = V_c + V_s = ${results.Vc.toFixed(2)} + ${results.Vs.toFixed(2)} = \\mathbf{${results.Vn.toFixed(2)} \\ tf}$`
        );

        // 4. 頂部結果
        const container = document.getElementById('shear-check-container');
        const resultText = document.getElementById('shear-check-result-text');
        const formulaText = document.getElementById('shear-check-formula');

        if (container && resultText && formulaText) {
            if (results.isPass) {
                container.className = "mb-8 p-6 border-2 border-green-200 rounded-xl text-center flex flex-col items-center justify-center bg-green-50";
                resultText.className = "text-3xl font-bold mb-2 text-green-600";
                resultText.textContent = "檢核合格 (OK)";
            } else {
                container.className = "mb-8 p-6 border-2 border-red-200 rounded-xl text-center flex flex-col items-center justify-center bg-red-50";
                resultText.className = "text-3xl font-bold mb-2 text-red-600";
                resultText.textContent = "檢核不合格 (NG)";
            }
            formulaText.innerHTML = 
                `$\\phi V_n = ${results.phiVn.toFixed(2)} \\ tf \\ge V_u = ${results.Vu.toFixed(2)} \\ tf$`;
        }
    }
}
