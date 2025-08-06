// js/calculations.js (偵錯版)

// --- Helper: Default Data ---
const tendonData = {
    '12S12.7A': { force: 1429, area: 1184.4, fpu: 1720, fpy: 1460, Es: 195000 },
    '12S12.7B': { force: 1547, area: 1184.4, fpu: 1850, fpy: 1580, Es: 195000 },
    '12S15.2': { force: 2164, area: 1664.4, fpu: 1850, fpy: 1580, Es: 195000 }
};
const endTendonLayouts = {
    '3': [{ id: 1, y: 1050 }, { id: 2, y: 750 }, { id: 3, y: 450 }],
    '4': [{ id: 1, y: 1300 }, { id: 2, y: 1000 }, { id: 3, y: 700 }, { id: 4, y: 400 }],
    '5': [{ id: 1, y: 1600 }, { id: 2, y: 1300 }, { id: 3, y: 1000 }, { id: 4, y: 700 }, { id: 5, y: 400 }],
    '6': [{ id: 1, y: 1850 }, { id: 2, y: 1550 }, { id: 3, y: 1250 }, { id: 4, y: 950 }, { id: 5, y: 650 }, { id: 6, y: 350 }],
    '7': [{ id: 1, y: 2000 }, { id: 2, y: 1700 }, { id: 3, y: 1400 }, { id: 4, y: 1100 }, { id: 5, y: 800 }, { id: 6, y: 500 }, { id: 7, y: 200 }]
};
const midTendonLayouts = {
    '3': [{ id: 1, y: 120 }, { id: 2, y: 120 }, { id: 3, y: 120 }],
    '4': [{ id: 1, y: 240 }, { id: 2, y: 120 }, { id: 3, y: 120 }, { id: 4, y: 120 }],
    '5': [{ id: 1, y: 360 }, { id: 2, y: 240 }, { id: 3, y: 120 }, { id: 4, y: 120 }, { id: 5, y: 120 }],
    '6': [{ id: 1, y: 240 }, { id: 2, y: 120 }, { id: 3, y: 240 }, { id: 4, y: 240 }, { id: 5, y: 120 }, { id: 6, y: 120 }],
    '7': [{ id: 1, y: 360 }, { id: 2, y: 240 }, { id: 3, y: 120 }, { id: 4, y: 240 }, { id: 5, y: 240 }, { id: 6, y: 120 }, { id: 7, y: 120 }]
};

export function getSectionProperties(inputs) {
    const requiredKeys = ['ght', 'gwb', 'h1', 'tft', 'gtf', 'bft', 'h3', 'f2'];
    const dims_mm = {};
    for (const key of requiredKeys) {
        const val = parseFloat(inputs[key]);
        if (isNaN(val) || val <= 0) {
            console.error(`[getSectionProperties] 偵測到無效尺寸: ${key} = ${inputs[key]}`);
            return null;
        }
        dims_mm[key] = val;
    }
    const d = Object.fromEntries(Object.entries(dims_mm).map(([k, v]) => [k, v / 1000]));
    const parts = [ { name: 'top_flange', w: d.gtf, h: d.tft, y_c: d.ght - d.h1 - d.tft / 2, count: 1 }, { name: 'top_haunch', w: (d.gtf - d.gwb) / 2, h: d.h1, y_c: d.ght - d.tft - d.h1 / 2, count: 2 }, { name: 'web', w: d.gwb, h: (d.ght - d.tft - d.h1 - d.bft - d.h3), y_c: d.bft + d.h3 + (d.ght - d.tft - d.h1 - d.bft - d.h3) / 2, count: 1 }, { name: 'bottom_haunch', w: d.f2, h: d.h3, y_c: d.bft + d.h3 / 2, count: 2 }, { name: 'bottom_flange', w: d.gwb + 2 * d.f2, h: d.bft, y_c: d.bft / 2, count: 1 } ].map(p => ({ ...p, A: (p.w * p.h) * p.count }));
    let totalArea = 0, momentArea = 0;
    parts.forEach(p => { totalArea += p.A; momentArea += p.A * p.y_c; });
    const y_bar = totalArea > 0 ? momentArea / totalArea : 0;
    let momentOfInertia = 0;
    parts.forEach(p => { const d_y = p.y_c - y_bar; const I_part = (p.w * p.h ** 3 / 12); momentOfInertia += (I_part + (p.A / p.count) * d_y ** 2) * p.count; });
    const y_top = d.ght - y_bar;
    const s_top = momentOfInertia > 0 ? momentOfInertia / y_top : 0;
    const s_bottom = momentOfInertia > 0 ? momentOfInertia / y_bar : 0;
    return { totalArea, y_bar, momentOfInertia, s_top, s_bottom, ght_m: d.ght, gwb_m: d.gwb };
}

export function calculatePrestressLosses(inputs, props) {
    console.log("--- 執行 calculatePrestressLosses ---");
    const Pj = parseFloat(inputs['tendon-initial-force']) || 0;
    const N = parseInt(inputs['tendon-mid-count'], 10);
    const span = parseFloat(inputs['bridge-span']) || 0;
    console.log(`  > 主要輸入: Pj=${Pj}, N=${N}, span=${span}`);

    const selectedTendon = tendonData[inputs['tendon-type']];
    if (!selectedTendon || !props) {
        console.error("[calculatePrestressLosses] 錯誤: 找不到鋼腱資料或斷面性質(props)為空，計算中止。");
        return null;
    }

    const endLayout = (endTendonLayouts[N] || []);
    const midLayout = (midTendonLayouts[N] || []);
    if (endLayout.length !== N || midLayout.length !== N) {
        console.error(`[calculatePrestressLosses] 錯誤: 找不到對應鋼腱數量(N=${N})的佈置圖，計算中止。`);
        return null;
    }
    
    // (其餘計算邏輯與前一版相同)
    const mu = parseFloat(inputs['friction-mu']) || 0;
    const K = parseFloat(inputs['friction-k']) || 0;
    const anchorageSlip_mm = parseFloat(inputs['anchorage-slip']) || 0;
    const x_mid = span / 2;
    const fci = parseFloat(inputs['mat-fci']) || 0;
    const gamma_c = parseFloat(inputs['mat-gamma-c']) || 24;
    const creepPhi = parseFloat(inputs['creep-phi']) || 0;
    const shrinkageEps = (parseFloat(inputs['shrinkage-eps']) || 0) / 1000000;
    const relaxationRate = (parseFloat(inputs['relaxation-rate']) || 0) / 100;
    const { area: tendonArea_mm2, fpu, Es } = selectedTendon;
    const { totalArea, y_bar, momentOfInertia } = props;
    const Eci = fci > 0 ? 4270 * Math.sqrt(fci) : 0;
    const modularRatio = Eci > 0 ? Es / Eci : 0;
    endLayout.sort((a, b) => a.id - b.id);
    midLayout.sort((a, b) => a.id - b.id);
    let totalFrictionLoss = 0;
    const individualFrictionLosses = midLayout.map((pos, i) => { const y_start_m = (endLayout[i].y) / 1000; const y_end_m = (pos.y) / 1000; const alpha = span > 0 ? Math.abs(4 * (y_start_m - y_end_m) / span) : 0; const Px = Pj * Math.exp(-(mu * alpha + K * x_mid)); const frictionLoss = Pj - Px; totalFrictionLoss += frictionLoss; return frictionLoss; });
    const selfWeightMoment = (totalArea * gamma_c * span ** 2) / 8;
    const y_tendon_group = (midLayout.reduce((sum, t) => sum + t.y, 0) / N) / 1000;
    const eccentricity = y_bar - y_tendon_group;
    const Pi_total_after_friction = (Pj * N) - totalFrictionLoss;
    const fcgp_for_es = (Pi_total_after_friction / totalArea) + (Pi_total_after_friction * eccentricity ** 2 / momentOfInertia) - (selfWeightMoment * eccentricity / momentOfInertia);
    const elasticShorteningLossStress = N > 1 ? ((N - 1) / (2 * N)) * modularRatio * (fcgp_for_es / 1000) : 0;
    const totalElasticShorteningLoss = (elasticShorteningLossStress * tendonArea_mm2 * N) / 1000;
    const avgElasticShorteningLoss = N > 0 ? totalElasticShorteningLoss / N : 0;
    let totalAnchorageLoss = 0;
    const anchorageSlip_m = anchorageSlip_mm / 1000;
    const tendonArea_m2 = tendonArea_mm2 / 1e6;
    const Es_kPa = Es * 1000;
    const individualAnchorageLosses = individualFrictionLosses.map(frLoss => { const p_force_gradient = x_mid > 0 ? frLoss / x_mid : 0; let anchorageLoss = 0; if (p_force_gradient > 0) { const L_set = Math.sqrt((anchorageSlip_m * tendonArea_m2 * Es_kPa) / p_force_gradient); anchorageLoss = (L_set < x_mid) ? p_force_gradient * L_set : p_force_gradient * x_mid; } totalAnchorageLoss += anchorageLoss; return anchorageLoss; });
    const totalInitialForce = Pj * N;
    const totalImmediateLoss = totalFrictionLoss + totalAnchorageLoss + totalElasticShorteningLoss;
    const Pi_total_after_immediate_loss = totalInitialForce - totalImmediateLoss;
    const fcgp_for_longterm = (Pi_total_after_immediate_loss / totalArea) + (Pi_total_after_immediate_loss * eccentricity ** 2 / momentOfInertia) - (selfWeightMoment * eccentricity / momentOfInertia);
    const creepLossStress_MPa = modularRatio * creepPhi * (fcgp_for_longterm / 1000);
    const totalCreepLoss_kN = (creepLossStress_MPa * tendonArea_mm2 * N) / 1000;
    const shrinkageLossStress_MPa = shrinkageEps * Es;
    const totalShrinkageLoss_kN = (shrinkageLossStress_MPa * tendonArea_mm2 * N) / 1000;
    const initialStress_MPa = (Pj * 1000) / tendonArea_mm2;
    const relaxationLossStress_MPa = initialStress_MPa * relaxationRate;
    const totalRelaxationLoss_kN = (relaxationLossStress_MPa * tendonArea_mm2 * N) / 1000;
    const totalLongtermLoss_kN = totalCreepLoss_kN + totalShrinkageLoss_kN + totalRelaxationLoss_kN;
    const finalTotalLoss_kN = totalImmediateLoss + totalLongtermLoss_kN;
    const finalEffectiveForce = totalInitialForce - finalTotalLoss_kN;
    const stressCheck = individualFrictionLosses.map((frLoss, i) => { const anLoss = individualAnchorageLosses[i]; const p_force_gradient = x_mid > 0 ? frLoss / x_mid : 0; let L_set = 0; if (p_force_gradient > 0) { L_set = Math.sqrt((anchorageSlip_m * tendonArea_m2 * Es_kPa) / p_force_gradient); if (L_set > x_mid) L_set = x_mid; } const y_start_m = (endLayout[i].y) / 1000; const y_end_m = (midLayout[i].y) / 1000; const alpha_Lset = L_set > 0 ? Math.abs(4 * (y_start_m - y_end_m) / span) * (L_set / x_mid) : 0; const P_at_Lset = Pj * Math.exp(-(mu * alpha_Lset + K * L_set)); const stress_at_Lset = (P_at_Lset * 1000) / tendonArea_mm2; const P_anchor = P_at_Lset - anLoss; const stress_anchor = (P_anchor * 1000) / tendonArea_mm2; const max_stress = Math.max(stress_anchor, stress_at_Lset); const allowableStress = 0.7 * fpu; return { id: i + 1, stress_anchor: stress_anchor, stress_at_Lset: stress_at_Lset, allowableStress: allowableStress, stress_ratio: max_stress / fpu, check: max_stress <= allowableStress }; });
    
    const results = { selfWeightMoment, finalEffectiveForce, Pj, totalInitialForce, eccentricity, immediate: { rows: individualFrictionLosses.map((fr, i) => ({ id: i + 1, frLoss: fr, anLoss: individualAnchorageLosses[i], esLoss: avgElasticShorteningLoss, totalLoss: fr + individualAnchorageLosses[i] + avgElasticShorteningLoss })), footer: { totalFrictionLoss, totalAnchorageLoss, totalElasticShorteningLoss, totalImmediateLoss } }, longterm: { creep: { loss: totalCreepLoss_kN }, shrinkage: { loss: totalShrinkageLoss_kN }, relaxation: { loss: totalRelaxationLoss_kN } }, total: { immediate: { loss: totalImmediateLoss }, longterm: { loss: totalLongtermLoss_kN }, final: { loss: finalTotalLoss_kN } }, stressCheck };
    console.log("  > 預力損失計算成功，回傳結果:", results);
    return results;
}

// ... (其他函式與前一版相同)
export function performStressChecks(inputs, props, lossResults) { if (!props || !lossResults) return null; const fci = parseFloat(inputs['mat-fci']); const fc = parseFloat(inputs['mat-fc']); const Msd_kNm = parseFloat(inputs['moment-sd']); const Mll_kNm = parseFloat(inputs['moment-ll']); const { s_top, s_bottom, totalArea } = props; const { selfWeightMoment, finalEffectiveForce, totalInitialForce, eccentricity } = lossResults; const Pe_kN = finalEffectiveForce; const Pi_total_kN = totalInitialForce - lossResults.immediate.footer.totalFrictionLoss; const stress_from_Pi = Pi_total_kN / totalArea; const stress_from_Pi_ecc_top = (Pi_total_kN * eccentricity) / s_top; const stress_from_Pi_ecc_bot = (Pi_total_kN * eccentricity) / s_bottom; const stress_from_Msw_top = selfWeightMoment / s_top; const stress_from_Msw_bot = selfWeightMoment / s_bottom; const stress_const_top = (stress_from_Pi - stress_from_Pi_ecc_top + stress_from_Msw_top) / 1000; const stress_const_bot = (stress_from_Pi + stress_from_Pi_ecc_bot - stress_from_Msw_bot) / 1000; const stress_from_Pe = Pe_kN / totalArea; const stress_from_Pe_ecc_top = (Pe_kN * eccentricity) / s_top; const stress_from_Pe_ecc_bot = (Pe_kN * eccentricity) / s_bottom; const stress_from_Msd_top = Msd_kNm / s_top; const stress_from_Msd_bot = Msd_kNm / s_bottom; const stress_from_Mll_top = Mll_kNm / s_top; const stress_from_Mll_bot = Mll_kNm / s_bottom; const stress_serv_dl_top = (stress_from_Pe - stress_from_Pe_ecc_top + stress_from_Msw_top + stress_from_Msd_top) / 1000; const stress_serv_dl_bot = (stress_from_Pe + stress_from_Pe_ecc_bot - stress_from_Msw_bot - stress_from_Msd_bot) / 1000; const stress_serv_total_top = stress_serv_dl_top + (stress_from_Mll_top / 1000); const stress_serv_total_bot = stress_serv_dl_bot - (stress_from_Mll_bot / 1000); const ca_limit = 0.6 * fci; const ta_limit1 = -0.25 * Math.sqrt(fci); const ta_limit2 = -0.5 * Math.sqrt(fci); const ca_limit_serv1 = 0.45 * fc; const ca_limit_serv2 = 0.60 * fc; const ta_limit_serv = -0.5 * Math.sqrt(fc); return { limits: { ca_limit, ta_limit1, ta_limit2, ca_limit_serv1, ca_limit_serv2, ta_limit_serv }, construction: { top: { stress: stress_const_top }, bottom: { stress: stress_const_bot } }, service_dl: { top: { stress: stress_serv_dl_top }, bottom: { stress: stress_serv_dl_bot } }, service_total: { top: { stress: stress_serv_total_top }, bottom: { stress: stress_serv_total_bot } } }; }
export function performFlexureChecks(inputs, props, lossResults) { if (!props || !lossResults) return null; const fc_MPa = parseFloat(inputs['mat-fc']); const M_sd_kNm = parseFloat(inputs['moment-sd']); const M_ll_kNm = parseFloat(inputs['moment-ll']); const N = parseInt(inputs['tendon-mid-count'], 10); const selectedTendon = tendonData[inputs['tendon-type']]; if (!selectedTendon) return null; const { ght_m } = props; const { selfWeightMoment } = lossResults; const { area: Ap_mm2, fpu: fpu_MPa } = selectedTendon; const Aps = (Ap_mm2 / 1e6) * N; const fpu = fpu_MPa * 1e6; const d = { ght: ght_m, gtf: parseFloat(inputs.gtf) / 1000, gwb: parseFloat(inputs.gwb) / 1000, h1: parseFloat(inputs.h1) / 1000, tft: parseFloat(inputs.tft) / 1000 }; const tft_total = d.h1 + d.tft; const midLayout = (midTendonLayouts[N] || []); if (midLayout.length !== N) return null; const y_tendon_group = (midLayout.reduce((sum, t) => sum + t.y, 0) / N) / 1000; const dp = d.ght - y_tendon_group; let beta1 = (fc_MPa <= 28) ? 0.85 : (fc_MPa < 56) ? 0.85 - 0.05 * ((fc_MPa - 28) / 7) : 0.65; let c = 0.1 * dp; for (let i = 0; i < 100; i++) { const fps = fpu * (1 - 0.28 * (c / dp)); const T = Aps * fps; const a = beta1 * c; let C = (a <= tft_total) ? 0.85 * (fc_MPa * 1e6) * a * d.gtf : 0.85 * (fc_MPa * 1e6) * ((d.gtf - d.gwb) * tft_total + d.gwb * a); if (Math.abs(T - C) / T < 0.001) break; c = c * (T / C); } const a = beta1 * c; const fps = fpu * (1 - 0.28 * (c / dp)); const T = Aps * fps; let Mn = (a <= tft_total) ? T * (dp - a / 2) : (0.85 * (fc_MPa * 1e6) * (d.gtf - d.gwb) * tft_total) * (dp - tft_total / 2) + (0.85 * (fc_MPa * 1e6) * d.gwb * a) * (dp - a / 2); const Mu = (1.2 * (selfWeightMoment + M_sd_kNm) + 1.6 * M_ll_kNm) * 1000; const phiMn = 0.9 * Mn; return { Mu: Mu / 1000, phi_Mn: phiMn / 1000, params: { fc_MPa, beta1, Aps: Aps * 1e6, dp: dp * 1000, c: c * 1000, fps: fps / 1e6 }, moments: { M_sw: selfWeightMoment, M_sd: M_sd_kNm, M_ll: M_ll_kNm } }; }
export function performDeflectionChecks(inputs, props) { if (!props) return null; const span = parseFloat(inputs['bridge-span']); const M_ll_kNm = parseFloat(inputs['moment-ll']); const fc_MPa = parseFloat(inputs['mat-fc']); const { momentOfInertia } = props; const L_m = span; const M_ll_Nm = M_ll_kNm * 1000; const Ig_m4 = momentOfInertia; const Ec_Pa = (4700 * Math.sqrt(fc_MPa)) * 1e6; const delta_LL_m = (5 * M_ll_Nm * L_m ** 2) / (48 * Ec_Pa * Ig_m4); const delta_allow_m = L_m / 800; return { delta_LL: delta_LL_m * 1000, delta_allow: delta_allow_m * 1000, params: { L_m, M_ll_kNm, Ec_GPa: Ec_Pa / 1e9, Ig_m4 } }; }
export function performShearChecks(inputs, props) { if (!props) return null; const fc_MPa = parseFloat(inputs['mat-fc']); const fyt_MPa = parseFloat(inputs['shear-fyt']); const Vu_kN = parseFloat(inputs['shear-vu']); const s_mm = parseFloat(inputs['shear-spacing']); const legs = parseInt(inputs['shear-legs'], 10); const barSize = inputs['shear-bar-size']; const { gwb_m, ght_m } = props; const phi_v = 0.85; const d_m = 0.9 * ght_m; const bw_m = gwb_m; const Vc_kN = (0.53 * Math.sqrt(fc_MPa) * (bw_m * 1000) * (d_m * 1000)) / 1000; const barAreas = { 'D10': 71.33, 'D13': 126.7, 'D16': 198.6, 'D19': 286.5 }; const Av_mm2 = (barAreas[barSize] || 0) * legs; const Vs_kN = (Av_mm2 * fyt_MPa * (d_m * 1000)) / (s_mm * 1000); const Vn_kN = Vc_kN + Vs_kN; const phiVn_kN = phi_v * Vn_kN; const requiredVs_kN = Vu_kN > (phi_v * Vc_kN) ? (Vu_kN / phi_v - Vc_kN) : 0; const s_max_mm = Math.min(0.75 * ght_m * 1000, 600); const Av_min_mm2 = Math.max(0.062 * Math.sqrt(fc_MPa) * (bw_m * 1000) * s_mm / fyt_MPa, 0.35 * (bw_m * 1000) * s_mm / fyt_MPa); return { d_mm: d_m * 1000, Vc_kN, Vs_kN, Vn_kN, Vu_kN, phiVn_kN, requiredVs_kN, min_reinf: { Av_mm2, Av_min_mm2 }, max_spacing: { s_mm, s_max_mm } }; }
