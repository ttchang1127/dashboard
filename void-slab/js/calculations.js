/**
 * 根據輸入的尺寸計算斷面性質（毛斷面積與淨斷面積）。
 * @param {object} dims - 包含所有橋梁尺寸的物件。
 * @returns {object} - 包含 grossAreaCm2 和 netAreaCm2 的物件。
 */
export function calculateCrossSectionProperties(dims) {
    try {
        const scope = {
            Wb: dims.Wb,
            Ct: dims.Ct,
            Ht: dims.Ht,
            Hb: dims.Hb,
            H_main: dims.Dt + dims.Dr + dims.Db,
            N: dims.N,
            Dr: dims.Dr,
        };
        // 計算總毛面積，使用梯形公式計算懸臂版面積以提高精度
        // 若環境中沒有全域 math，這裡會報錯。但在您的 index.html 中已載入 math.js
        const grossArea = math.evaluate('Wb * H_main + 2 * Ct * ((Ht + (Ht+Hb))/2)', scope);
        // 計算旋楞管造成的面積損失
        const voidArea = math.evaluate('N * pi * (Dr/2)^2', scope);
        const netArea = grossArea - voidArea;

        return {
            grossAreaCm2: grossArea,
            netAreaCm2: netArea,
        };
    } catch (error) {
        console.error("Error calculating cross-section properties:", error);
        return { grossAreaCm2: 0, netAreaCm2: 0 };
    }
}

/**
 * 計算旋楞管的佈局位置。
 */
export function calculateDuctLayout(dims) {
    if (dims.N <= 0) {
        return [];
    }
    const ducts = [];
    const startX = -((dims.N - 1) * dims.Sr) / 2;
    const center_y = -dims.Dt - (dims.Dr / 2);

    for (let i = 0; i < dims.N; i++) {
        ducts.push({
            id: i + 1,
            x_coord: startX + i * dims.Sr,
            y_coord: center_y
        });
    }
    return ducts;
}

/**
 * 計算預力鋼腱的佈局位置與縱向拋物線線形。
 */
export function calculateTendonLayout(dims) {
    if (dims.N <= 0) {
        return { tendons: [], profile: { x: [], y: [] } };
    }

    const H_main = dims.Dt + dims.Dr + dims.Db;
    const tendons = [];
    const numTendons = dims.N + 1;

    // 根據旋楞管位置計算鋼腱 X 座標
    const ductStartX = -((dims.N - 1) * dims.Sr) / 2;

    for (let i = 0; i < numTendons; i++) {
        const id = i + 1;
        let x_coord;

        if (i === 0) {
            // 第一束鋼腱：在第一根旋楞管左側 Sr/2 處
            x_coord = ductStartX - dims.Sr / 2;
        } else if (i === dims.N) {
            // 最後一束鋼腱：在最後一根旋楞管右側 Sr/2 處
            const lastDuctX = ductStartX + (dims.N - 1) * dims.Sr;
            x_coord = lastDuctX + dims.Sr / 2;
        } else {
            // 中間的鋼腱：位於兩根旋楞管之間
            const prevDuctX = ductStartX + (i - 1) * dims.Sr;
            x_coord = prevDuctX + dims.Sr / 2;
        }
        
        const y_mid = -(H_main) + 15;
        const y_end = -dims.Dt - (dims.Dr / 2);
        
        tendons.push({ id, x_coord, y_mid, y_end });
    }

    // 縱向拋物線線形計算
    const L_cm = dims.L;
    const y_mid_profile = -(H_main) + 15;
    const y_end_profile = -dims.Dt - (dims.Dr / 2);
    
    const profile = { x: [], y: [] };
    if (L_cm > 0) {
        const h = L_cm / 2;
        const k = y_mid_profile;
        const a = (y_end_profile - k) / Math.pow(0 - h, 2);

        for (let i = 0; i <= 100; i++) {
            const x_val_cm = (i / 100) * L_cm;
            const y_val = a * Math.pow(x_val_cm - h, 2) + k;
            profile.x.push(x_val_cm / 100);
            profile.y.push(y_val);
        }
    }

    return { tendons, profile };
}

/**
 * Calculates the default jacking force.
 */
export function calculateDefaultJackingForce(tendonProps, numStrands) {
    if (!tendonProps || !numStrands) return null;

    try {
        const { area, fpu, fpy } = tendonProps;
        
        // Convert MPa to kgf/cm^2 (1 MPa ≈ 10.197 kgf/cm^2)
        const fpu_kgf_cm2 = fpu * 10.197;
        const fpy_kgf_cm2 = fpy * 10.197;

        // Total area in cm^2
        const Ap_cm2 = (area * numStrands) / 100;

        // Formula: 0.737 * fpu
        const fpj_kgfcm2 = 0.737 * fpu_kgf_cm2;
        
        // Force in kgf, then convert to tf
        const force_kgf = fpj_kgfcm2 * Ap_cm2;
        const force_tf = force_kgf / 1000;

        const calcHtml = `
            $A_p = ${area} \\, mm^2 \\times ${numStrands} = ${area * numStrands} \\, mm^2 = ${Ap_cm2.toFixed(2)} \\, cm^2$ <br>
            $f_{pu} = ${fpu} \\, MPa = ${fpu_kgf_cm2.toFixed(0)} \\, kgf/cm^2$ <br>
            $P_j = (0.737 \\times f_{pu}) \\times A_p$ <br>
            $= (0.737 \\times ${fpu_kgf_cm2.toFixed(0)}) \\times ${Ap_cm2.toFixed(2)}$ <br>
            $= ${fpj_kgfcm2.toFixed(0)} \\times ${Ap_cm2.toFixed(2)} = ${force_kgf.toFixed(0)} \\, kgf$ <br>
            $\\approx ${force_tf.toFixed(1)} \\, tf$`;

        return {
            force_tf: force_tf,
            calculation: calcHtml,
            fpj_kgfcm2: fpj_kgfcm2 
        };

    } catch (error) {
        console.error("Error calculating default jacking force:", error);
        return { force_tf: 0, calculation: "計算失敗", fpj_kgfcm2: 0 };
    }
}


/**
 * 根據所有輸入參數計算設計載重，包含靜載重彎矩。
 */
export function calculateLoads(dims, loads, materials, sectionProps) {
    if (!dims || !loads || !materials || !sectionProps || dims.L <= 0) return null;
    
    try {
        const scope = {
            L_m: dims.L / 100,
            L1_m: dims.L1 / 100,
            L2_m: dims.L2 / 100,
            W_m: dims.W / 100,
            netArea_m2: sectionProps.netAreaCm2 / 10000,
            grossArea_m2: sectionProps.grossAreaCm2 / 10000,
            asphalt_t_m: loads.asphaltThickness / 100,
            gamma_c: materials.gamma_c,
            gamma_ac: materials.gamma_ac,
            pipeline_load_tf: loads.pipelineLoad,
            railing_load_tf: loads.railingLoad,
            w_lane_tf: 0.960,
            P_lane_tf: 8.2,
            impact_user: loads.impactFactorUser,
            overload_factor: loads.overloadFactor,
            reduction_factor: loads.laneReductionFactor,
            num_lanes: loads.numLanes,
        };

        // --- 靜載重 (DL) ---
        const totalWeight = math.evaluate(
            '(netArea * (L - L1 - L2) + grossArea * (L1 + L2)) * gamma_c',
            {
                netArea: scope.netArea_m2,
                grossArea: scope.grossArea_m2,
                L: scope.L_m,
                L1: scope.L1_m,
                L2: scope.L2_m,
                gamma_c: scope.gamma_c
            }
        );
        const selfWeight = scope.L_m > 0 ? totalWeight / scope.L_m : 0; // W_slab (tf/m)
        const asphaltWeight = math.evaluate('W_m * asphalt_t_m * gamma_ac', scope); // W_ac (tf/m)
        
        // 附加載重重 (W_ADL)
        const additionalDeadLoadWeight = asphaltWeight + scope.pipeline_load_tf + scope.railing_load_tf;
        
        // 靜載重彎矩 (M_DL)
        const momentSelfWeight = math.evaluate('selfWeight * L_m^2 / 8', { selfWeight: selfWeight, L_m: scope.L_m });
        const momentAdditionalDeadLoad = math.evaluate('additionalDeadLoad * L_m^2 / 8', { additionalDeadLoad: additionalDeadLoadWeight, L_m: scope.L_m });
        const momentTotalDeadLoad = momentSelfWeight + momentAdditionalDeadLoad;

        // --- 活載重 (LL) ---
        const momentTruck = math.evaluate('8.2125 * L_m - 38.78125', scope);
        const momentLane = math.evaluate('(w_lane_tf * L_m^2) / 8 + (P_lane_tf * L_m) / 4', scope);
        const momentMax = Math.max(0, momentTruck, momentLane);
        const impactCalc = math.evaluate('15.24 / (L_m + 38.1)', scope);
        const impactFinal = Math.min(scope.impact_user, impactCalc);
        const finalMoment = math.evaluate(
            'momentMax * (1 + impact) * (1 + overload) * reduction * lanes',
            {
                momentMax: momentMax,
                impact: impactFinal,
                overload: scope.overload_factor,
                reduction: scope.reduction_factor,
                lanes: scope.num_lanes,
            }
        );

        return {
            totalSelfWeight: totalWeight,
            selfWeight,
            asphaltWeight, 
            additionalDeadLoadWeight, 
            momentSelfWeight, 
            momentAdditionalDeadLoad, 
            momentTotalDeadLoad, 
            momentTruck,
            momentLane,
            momentMax,
            impactCalc,
            impactFinal,
            finalMoment,
        };

    } catch (error) {
        console.error("Math.js calculation error in calculateLoads:", error);
        return null;
    }
}

/**
 * 計算先進的斷面性質，如形心和慣性矩。
 */
export function calculateAdvancedSectionProperties(dims) {
    try {
        const { Wb, Ct, Ht, Hb, Dr, N, Sr, Et, Dt, Db } = dims;
        const H_main = Dt + Dr + Db;

        const parts = [];

        // 1. 主梁 (矩形)
        const A_main = Wb * H_main;
        const y_main = H_main / 2;
        parts.push({ A: A_main, y: y_main });

        // 2. & 3. 兩個懸臂版
        const A_cant_rect = Ct * Ht;
        const y_cant_rect = Ht / 2;
        parts.push({ A: A_cant_rect, y: y_cant_rect }); // 左
        parts.push({ A: A_cant_rect, y: y_cant_rect }); // 右

        const A_cant_tri = 0.5 * Ct * Hb;
        const y_cant_tri = Ht + Hb / 3; 
        parts.push({ A: A_cant_tri, y: y_cant_tri }); // 左
        parts.push({ A: A_cant_tri, y: y_cant_tri }); // 右
        
        // 4. 旋楞管 (N 個, 負面積)
        const duct_cy = Dt + Dr / 2; 
        const duct_A = Math.PI * (Dr / 2) ** 2; 
        for (let i = 0; i < N; i++) {
             parts.push({ A: -duct_A, y: duct_cy });
        }
        // --- 形心計算 (Y_cg) ---
        let totalArea = 0;
        let momentArea = 0;
        parts.forEach(p => {
            totalArea += p.A;
            momentArea += p.A * p.y;
        });

        const Y_cg = totalArea !== 0 ? momentArea / totalArea : H_main / 2; 

        // --- 慣性矩計算 (I_g) - 繞總形心 Y_cg ---
        let I_g = 0;
        
        const I_main_c = (Wb * H_main**3) / 12;
        I_g += I_main_c + A_main * (Y_cg - y_main)**2;

        const I_cant_rect_c = (Ct * Ht**3) / 12;
        I_g += 2 * (I_cant_rect_c + A_cant_rect * (Y_cg - y_cant_rect)**2);

        const I_cant_tri_c = (Ct * Hb**3) / 36; 
        I_g += 2 * (I_cant_tri_c + A_cant_tri * (Y_cg - y_cant_tri)**2);

        const I_duct_c = (Math.PI * (Dr/2)**4) / 4; 
        for (let i = 0; i < N; i++) {
             I_g -= (I_duct_c + duct_A * (Y_cg - duct_cy)**2);
        }

        const grossArea = calculateCrossSectionProperties(dims).grossAreaCm2;

        return { Y_cg, I_g, grossAreaCm2: grossArea };

    } catch (error) {
        console.error("Error calculating advanced section properties:", error);
        return { Y_cg: 0, I_g: 0, grossAreaCm2: 0 };
    }
}


/**
 * 根據使用者輸入的損失值，計算總損失、損失率與有效預力。
 */
export function calculateLossSummary(lossInputs) {
    const {
        loss_fpj = 0,
        loss_friction = 0,
        loss_anchor = 0,
        loss_elastic = 0,
        loss_shrinkage = 0,
        loss_creep = 0,
        loss_relaxation = 0 
    } = lossInputs;
    
    const totalLoss_kgfcm2 = 
        loss_friction +
        loss_anchor +
        loss_elastic +
        loss_shrinkage +
        loss_creep +
        loss_relaxation; 

    const lossRate_percent = (loss_fpj > 0) ? (totalLoss_kgfcm2 / loss_fpj) * 100 : 0;
    const fpe_kgfcm2 = loss_fpj - totalLoss_kgfcm2;

    return { 
        totalLoss_kgfcm2, 
        lossRate_percent,
        fpe_kgfcm2
    };
}

/**
 * 計算梁中點的上下緣應力。
 */
export function calculateMidspanStress(inputs) {
    const { 
        fpe, Ap_cm2, numTendons, Y_cg, y_mid, H, I_g, Anet,
        M_slab_tfm, M_DL_total_tfm, 
        M_final_tfm,
        loss_shrinkage, loss_creep, loss_relaxation
    } = inputs;

    const zeroResults = {
        F_eff_tf: 0, ep_eff: 0, M_eff_tfm: 0, Ycg_b: 0,
        S_top: 0, S_bot: 0, f_eff_top: 0, f_eff_bot: 0,
        F_eff_kgf: 0, M_eff_kgfcm: 0, stress_axial: 0,
        stress_moment_top: 0, stress_moment_bot: 0,
        f_DL_top: 0, f_DL_bot: 0, f_LL_top: 0, f_LL_bot: 0,
        fs_bf: 0, Fs_bf_tf: 0, Ms_bf_kgfcm: 0,
        fbf_top: 0, fbf_bot: 0,
        M_slab_kgfcm: 0, M_final_kgfcm: 0,
        stress_Ms_bf_top: 0, stress_Ms_bf_bot: 0, Fs_bf_kgf: 0,
        stress_axial_bf: 0,
        a_DL: 0, f_case4_top: 0, f_case4_bot: 0
    };

    if (numTendons === 0 || Anet === 0 || I_g === 0 || Y_cg === 0) {
        return zeroResults;
    }

    try {
        // --- 1. 舊計算 (P_eff, M_eff) ---
        const F_eff_kgf = fpe * Ap_cm2 * numTendons;
        const F_eff_tf = F_eff_kgf / 1000;
        const ep_eff = Math.abs(y_mid) - Y_cg;
        const M_eff_tfm = F_eff_tf * (ep_eff / 100);
        const M_eff_kgfcm = M_eff_tfm * 100000;
        const Ycg_b = H - Y_cg;
        const S_top = I_g / Y_cg;
        const S_bot = (Ycg_b > 0) ? I_g / Ycg_b : 0;

        if (S_top === 0 || S_bot === 0) throw new Error("Section modulus is zero.");

        const stress_axial = F_eff_kgf / Anet;
        const stress_moment_top = M_eff_kgfcm / S_top; 
        const stress_moment_bot = M_eff_kgfcm / S_bot; 
        const f_eff_top = stress_axial - stress_moment_top;
        const f_eff_bot = stress_axial + stress_moment_bot;

        // --- 2. 新計算 (DL, LL) ---
        const M_slab_kgfcm = M_slab_tfm * 100000;
        const M_final_kgfcm = M_final_tfm * 100000;

        const f_DL_top = M_slab_kgfcm / S_top;
        const f_DL_bot = -M_slab_kgfcm / S_bot;
        const f_LL_top = M_final_kgfcm / S_top;
        const f_LL_bot = -M_final_kgfcm / S_bot;

        // --- 3. 新計算 (暫時預力 f_s,bf) ---
        const fs_bf = fpe + loss_shrinkage + loss_creep + loss_relaxation;
        const Fs_bf_kgf = fs_bf * Ap_cm2 * numTendons;
        const Fs_bf_tf = Fs_bf_kgf / 1000;
        const Ms_bf_kgfcm = (Fs_bf_tf * (ep_eff / 100)) * 100000;
        
        const stress_axial_bf = Fs_bf_kgf / Anet;
        const stress_Ms_bf_top = Ms_bf_kgfcm / S_top; 
        const stress_Ms_bf_bot = Ms_bf_kgfcm / S_bot; 

        const fbf_top = stress_axial_bf - stress_Ms_bf_top + f_DL_top;
        const fbf_bot = stress_axial_bf + stress_Ms_bf_bot + f_DL_bot;

        // --- 4. Case 4 計算 (a_DL) ---
        const a_DL = (M_slab_tfm !== 0) ? M_DL_total_tfm / M_slab_tfm : 1;

        const f_case4_top = f_eff_top + (f_DL_top * a_DL) + f_LL_top;
        const f_case4_bot = f_eff_bot + (f_DL_bot * a_DL) + f_LL_bot;

        return {
            F_eff_tf, ep_eff, M_eff_tfm, Ycg_b,
            S_top, S_bot, f_eff_top, f_eff_bot,
            F_eff_kgf, M_eff_kgfcm, stress_axial,
            stress_moment_top, stress_moment_bot,
            f_DL_top, f_DL_bot, f_LL_top, f_LL_bot,
            fs_bf, Fs_bf_tf, Ms_bf_kgfcm,
            fbf_top, fbf_bot,
            M_slab_kgfcm, M_final_kgfcm,
            stress_Ms_bf_top, stress_Ms_bf_bot, Fs_bf_kgf,
            stress_axial_bf,
            a_DL, f_case4_top, f_case4_bot
        };

    } catch (error) {
        console.error("Error calculating midspan stress:", error);
        return zeroResults;
    }
}

/**
 * 根據 fck 和 fci 計算所有容許應力值。
 */
export function calculateAllowableStress(fck, fci) {
    if (fck <= 0 || fci <= 0) {
        return {
            comp_ci: 0, tens_ci: 0, 
            comp_dl: 0, tens_dl: 0, 
            comp_case3: 0, tens_case3: 0,
            comp_100: 0, tens_100: 0,
            comp_125: 0, tens_125: 0, comp_140: 0, tens_140: 0, comp_133: 0, tens_133: 0
        };
    }

    try {
        const sqrt_fci = Math.sqrt(fci);
        const sqrt_fck = Math.sqrt(fck);

        return {
            // Case 1
            comp_ci: 0.6 * fci,
            tens_ci: 0.8 * sqrt_fci,

            // Case 2
            comp_dl: 0.40 * fck, 
            tens_dl: 0.8 * sqrt_fck, 
            
            // Case 3
            comp_case3: 0.40 * fck,
            tens_case3: 0.8 * sqrt_fck,

            // Case 4
            comp_100: 0.6 * fck,
            tens_100: 0.8 * sqrt_fck,

            comp_125: 0.6 * fck * 1.25,
            tens_125: 0.8 * sqrt_fck * 1.25,
            comp_140: 0.6 * fck * 1.40,
            tens_140: 0.8 * sqrt_fck * 1.40,
            comp_133: 0.6 * fck * 1.33,
            tens_133: 0.8 * sqrt_fck * 1.33,
        };
    } catch (error) {
        console.error("Error calculating allowable stress:", error);
        return {
            comp_ci: 0, tens_ci: 0, comp_dl: 0, tens_dl: 0, comp_case3: 0, tens_case3: 0,
            comp_100: 0, tens_100: 0,
            comp_125: 0, tens_125: 0, comp_140: 0, tens_140: 0, comp_133: 0, tens_133: 0
        };
    }
}

/**
 * 執行最終的壓、張應力檢核。
 */
export function calculateStressChecks(midspan, allowable) {
    
    const val_const_top = midspan.fbf_top;
    const val_const_bot = midspan.fbf_bot;
    const lim_tens_ci = -allowable.tens_ci; 
    const lim_comp_ci = allowable.comp_ci;
    const res_const_top = (val_const_top >= lim_tens_ci) && (val_const_top <= lim_comp_ci);
    const res_const_bot = (val_const_bot >= lim_tens_ci) && (val_const_bot <= lim_comp_ci);

    const val_effdl_top = midspan.f_eff_top + midspan.f_DL_top;
    const val_effdl_bot = midspan.f_eff_bot + midspan.f_DL_bot;
    const lim_comp_dl = allowable.comp_dl; 
    const lim_tens_dl = -allowable.tens_dl; 
    const res_effdl_top = (val_effdl_top >= lim_tens_dl) && (val_effdl_top <= lim_comp_dl);
    const res_effdl_bot = (val_effdl_bot >= lim_tens_dl) && (val_effdl_bot <= lim_comp_dl);

    const val_case3_top = (midspan.f_eff_top + midspan.f_DL_top) * 0.5 + midspan.f_LL_top;
    const val_case3_bot = (midspan.f_eff_bot + midspan.f_DL_bot) * 0.5 + midspan.f_LL_bot;
    const lim_comp_case3 = allowable.comp_case3; 
    const lim_tens_case3 = -allowable.tens_case3; 
    const res_case3_top = (val_case3_top >= lim_tens_case3) && (val_case3_top <= lim_comp_case3);
    const res_case3_bot = (val_case3_bot >= lim_tens_case3) && (val_case3_bot <= lim_comp_case3);

    const val_case4_top = midspan.f_case4_top;
    const val_case4_bot = midspan.f_case4_bot;
    const lim_comp_100 = allowable.comp_100;
    const lim_tens_100 = -allowable.tens_100;
    const res_case4_top = (val_case4_top >= lim_tens_100) && (val_case4_top <= lim_comp_100);
    const res_case4_bot = (val_case4_bot >= lim_tens_100) && (val_case4_bot <= lim_comp_100);

    return {
        val_const_top, val_const_bot,
        val_effdl_top, val_effdl_bot,
        val_case3_top, val_case3_bot,
        val_case4_top, val_case4_bot,

        lim_tens_ci, lim_comp_ci,
        lim_comp_dl, lim_tens_dl, 
        lim_comp_case3, lim_tens_case3,
        lim_comp_100, lim_tens_100,

        res_const_top, res_const_bot,
        res_effdl_top, res_effdl_bot,
        res_case3_top, res_case3_bot,
        res_case4_top, res_case4_bot,

        components: {
            f_eff_top: midspan.f_eff_top,
            f_eff_bot: midspan.f_eff_bot,
            f_DL_top: midspan.f_DL_top,
            f_DL_bot: midspan.f_DL_bot,
            f_LL_top: midspan.f_LL_top,
            f_LL_bot: midspan.f_LL_bot,
            a_DL: midspan.a_DL
        }
    };
}

/**
 * 計算撓曲強度檢核 (Mu, Mn, phiMn)
 */
export function calculateFlexuralStrength(inputs) {
    const {
        M_DL_total_tfm,
        M_final_tfm, 
        fck, fpu, Ap_cm2,
        b_cm, 
        dp_cm, 
        fpe_kgfcm2 
    } = inputs;

    const zeroResult = {
        Mu_tfm: 0, Mn_tfm: 0, phiMn_tfm: 0,
        isPass: false,
        details: "資料不足"
    };

    if (!fck || !fpu || !Ap_cm2 || !b_cm || !dp_cm) return zeroResult;

    // 1. 計算所需強度 Mu (Strength I)
    const Mu_tfm = 1.2 * M_DL_total_tfm + 1.6 * M_final_tfm;

    // 2. 計算標稱強度 Mn
    const gamma_p = 0.28; 
    let beta1 = 0.85;
    if (fck > 280) {
        beta1 = 0.85 - 0.05 * (fck - 280) / 70;
        if (beta1 < 0.65) beta1 = 0.65;
    }

    const rho_p = Ap_cm2 / (b_cm * dp_cm);
    const f_ps = fpu * 10.197 * (1 - gamma_p * (beta1 * rho_p * fpu * 10.197 / fck));
    const a_depth = (Ap_cm2 * f_ps) / (0.85 * fck * b_cm);
    const Mn_kgfcm = Ap_cm2 * f_ps * (dp_cm - a_depth / 2);
    const Mn_tfm = Mn_kgfcm / 100000;

    // 3. 設計強度 phi Mn
    const phi = 0.9; 
    const phiMn_tfm = phi * Mn_tfm;

    const isPass = phiMn_tfm >= Mu_tfm;

    const details = `
        1. 參數準備:<br>
        $b = ${b_cm.toFixed(1)} \\ cm, d_p = ${dp_cm.toFixed(1)} \\ cm$<br>
        $A_{ps} = ${Ap_cm2.toFixed(2)} \\ cm^2$<br>
        $f'_c = ${fck.toFixed(0)} \\ kgf/cm^2, f_{pu} = ${(fpu*10.197).toFixed(0)} \\ kgf/cm^2$<br><br>
        
        2. 鋼腱極限應力 $f_{ps}$:<br>
        $\\rho_p = A_{ps} / (b d_p) = ${rho_p.toFixed(5)}$<br>
        $\\beta_1 = ${beta1.toFixed(2)}$<br>
        $f_{ps} = f_{pu} (1 - \\gamma_p \\frac{\\beta_1 \\rho_p f_{pu}}{f'_c})$<br>
        $f_{ps} = ${f_ps.toFixed(0)} \\ kgf/cm^2$<br><br>
        
        3. 中性軸計算:<br>
        等值應力塊深度 $a = \\frac{A_{ps} f_{ps}}{0.85 f'_c b}$<br>
        $a = \\frac{${Ap_cm2.toFixed(2)} \\times ${f_ps.toFixed(0)}}{0.85 \\times ${fck.toFixed(0)} \\times ${b_cm.toFixed(0)}}$<br>
        $a = ${a_depth.toFixed(2)} \\ cm$<br><br>
        
        4. 標稱強度 $M_n$:<br>
        $M_n = A_{ps} f_{ps} (d_p - a/2)$<br>
        $M_n = ${Ap_cm2.toFixed(2)} \\times ${f_ps.toFixed(0)} \\times (${dp_cm.toFixed(1)} - ${a_depth.toFixed(2)}/2)$<br>
        $M_n = ${(Mn_kgfcm/100000).toFixed(2)} \\ tf-m$
    `;

    return {
        Mu_tfm,
        Mn_tfm,
        phiMn_tfm,
        isPass,
        details,
        b_cm, dp_cm, f_ps, a_depth
    };
}

/**
 * 計算活載重撓度並進行檢核
 */
export function calculateDeflection(inputs) {
    const {
        M_final_tfm = 0, 
        L_cm = 0,        
        I_net_cm4 = 0,   
        fck_kgfcm2 = 0,  
        hasSidewalk = false  
    } = inputs;

    let delta_LL = 0;
    let limit = 0;
    let Ec = 0;
    let isPass = false;
    let details = '';
    const limitRatio = hasSidewalk ? 1000 : 800;

    if (L_cm > 0 && I_net_cm4 > 0 && fck_kgfcm2 > 0) {
        Ec = 15000 * Math.sqrt(fck_kgfcm2);
        const M_kgfcm = M_final_tfm * 100000;
        delta_LL = (5 * M_kgfcm * Math.pow(L_cm, 2)) / (48 * Ec * I_net_cm4);
        limit = L_cm / limitRatio;
        isPass = delta_LL <= limit;

        details = `
            1. 參數準備:<br>
            $L = ${L_cm.toFixed(0)} \\ cm$<br>
            $M_{final} = ${M_final_tfm.toFixed(2)} \\ tf\\text{-}m = ${(M_kgfcm).toExponential(2)} \\ kgf\\text{-}cm$<br>
            $I_{net} = ${I_net_cm4.toExponential(2)} \\ cm^4$<br>
            $f'_c = ${fck_kgfcm2.toFixed(0)} \\ kgf/cm^2$<br><br>

            2. 彈性模數 $E_c$:<br>
            $E_c = 15000\\sqrt{f'_c} = 15000\\sqrt{${fck_kgfcm2.toFixed(0)}} = \\mathbf{${Ec.toExponential(2)} \\ kgf/cm^2}$<br><br>

            3. 活載重撓度 $\\Delta_{LL}$:<br>
            $\\Delta_{LL} = \\frac{5 M_{final} L^2}{48 E_c I_{net}}$<br>
            $= \\frac{5 \\times ${M_kgfcm.toExponential(2)} \\times ${L_cm.toFixed(0)}^2}{48 \\times ${Ec.toExponential(2)} \\times ${I_net_cm4.toExponential(2)}}$<br>
            $= \\mathbf{${delta_LL.toFixed(3)} \\ cm}$ (朝下)<br><br>

            4. 檢核標準 (${hasSidewalk ? '有人行道' : '無人行道'}):<br>
            $Limit = L / ${limitRatio} = ${L_cm.toFixed(0)} / ${limitRatio} = \\mathbf{${limit.toFixed(3)} \\ cm}$
        `;
    } else {
        details = "參數不足，無法計算。請檢查尺寸、材料強度與載重設定。";
    }

    return {
        delta_LL,
        limit,
        Ec,
        isPass,
        details,
        limitRatio
    };
}

/**
 * 計算剪力強度檢核
 */
export function calculateShearStrength(inputs) {
    const {
        L_cm, H_cm, W_cm,
        w_dead_tfm, // 自重 + 附加 (tf/m)
        fck_kgfcm2,
        shearRebar, // { area, fy, legs, spacing_mm }
        loadFactors, // { impact, overload, reduction, lanes }
        ductCount // N
    } = inputs;

    const zeroResult = {
        x_shear: 0, V_dead: 0, V_LL_truck: 0, V_LL_lane: 0, V_LL_final: 0,
        Vu: 0, Vs: 0, Vc: 0, Vn: 0, phiVn: 0,
        isPass: false,
        details: {}
    };

    if (!H_cm || !W_cm) return zeroResult;

    const x_shear = H_cm / 2;
    const x_shear_m = x_shear / 100;
    const L_m = (L_cm || 0) / 100;

    if (L_m === 0) {
        zeroResult.x_shear = x_shear;
        return zeroResult;
    }

    const V_dead = w_dead_tfm * (L_m / 2 - x_shear_m);

    const term1 = 14.6 * (L_m - x_shear_m);
    const dist2 = L_m - x_shear_m - 4.25;
    const term2 = dist2 > 0 ? 14.6 * dist2 : 0;
    const dist3 = L_m - x_shear_m - 8.5; 
    const term3 = dist3 > 0 ? 3.65 * dist3 : 0;
    
    const V_LL_truck = (term1 + term2 + term3) / L_m;

    const V_LL_lane = (11.8 * (L_m - x_shear_m) + (0.96 * Math.pow(L_m, 2)) / 2) / L_m;

    const V_LL_max = Math.max(V_LL_truck, V_LL_lane);
    const i = loadFactors.impact;
    const overload = loadFactors.overload;
    const reduction = loadFactors.reduction;
    const lanes = loadFactors.lanes;
    
    const V_LL_final = V_LL_max * (1 + i) * (1 + overload) * reduction * lanes;

    const Vu = 1.3 * V_dead + 1.67 * V_LL_final;

    const d_v = 0.8 * H_cm;
    const s_cm = shearRebar.spacing_mm / 10;
    const Vs_kgf = (shearRebar.area * shearRebar.fy * shearRebar.legs * d_v) / s_cm;
    const Vs = Vs_kgf / 1000;

    const Vc_kgf = 0.45 * Math.sqrt(fck_kgfcm2) * W_cm * d_v;
    const Vc = Vc_kgf / 1000;

    const Vn = Vc + Vs;
    const phi = 0.9; 
    const phiVn = phi * Vn;

    const isPass = phiVn >= Vu;

    return {
        x_shear, V_dead, V_LL_truck, V_LL_lane, V_LL_final,
        Vu, Vs, Vc, Vn, phiVn, isPass,
        w_dead_tfm, L_m, x_shear_m,
        term1, term2, term3,
        V_LL_max, i, overload, reduction, lanes,
        d_v, s_cm, fck: fck_kgfcm2, W_cm
    };
}
