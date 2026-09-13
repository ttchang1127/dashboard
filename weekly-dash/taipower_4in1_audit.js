const state = {
    payload: null,
    activeSection: "common"
};

const versionText = document.getElementById("versionText");
const auditDateText = document.getElementById("auditDateText");
const metaText = document.getElementById("metaText");
const summaryGrid = document.getElementById("summaryGrid");
const anchorBar = document.getElementById("anchorBar");
const sectionsRoot = document.getElementById("sections");
const insightsRoot = document.getElementById("insights");

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function safeExternalUrl(value) {
    try {
        const url = new URL(String(value || ""));
        return url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

function riskToneClass(diff) {
    const value = Number(diff);
    if (Number.isFinite(value) && value <= 0) return "border-rose-200 bg-rose-50 text-rose-800";
    if (value === 1) return "border-orange-200 bg-orange-50 text-orange-800";
    if (Number.isFinite(value) && value <= 3) return "border-amber-200 bg-amber-50 text-amber-800";
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function statusLabel(status) {
    const labels = {
        active: "列管中",
        recruiting: "主任招募中",
        paused: "暫不啟動稽核"
    };
    return labels[status] || "列管中";
}

function renderStat(label, value, tone) {
    return `
        <div class="summary-card rounded-2xl p-4">
            <p class="text-xs text-stone-500">${label}</p>
            <p class="mt-2 text-2xl font-bold ${tone}">${value}</p>
        </div>
    `;
}

function renderRiskCounts(counts = {}) {
    return `🔴 ${counts.red || 0}　🟠 ${counts.orange || 0}　🟡 ${counts.yellow || 0}　🟢 ${counts.green || 0}`;
}

function sectionTabLabel(section, index) {
    return `Tab ${index} ${section.title}`;
}

function renderSummary() {
    const payload = state.payload;
    const project = payload.project || {};
    const summary = payload.summary || {};
    versionText.textContent = project.version || "V2";
    auditDateText.textContent = project.auditDate || "未設定";
    metaText.textContent = [
        payload.generatedAt ? `資料更新 ${payload.generatedAt}` : "",
        project.modifiedAt ? `提醒清單更新 ${project.modifiedAt}` : "",
        payload.source ? `來源 ${payload.source}` : ""
    ].filter(Boolean).join("｜");

    // 原本紅／橘／黃三卡長期都是 0，佔掉一半版面卻不帶訊息；
    // 換成真正會出事的三個數字，燈號改用一行摘要呈現。
    const stateCounts = payload.stateCounts || {};
    summaryGrid.innerHTML = [
        renderStat("已啟動項目", `${summary.active || 0} 項`, "text-teal-700"),
        renderStat("待觸發項目", `${summary.pending || 0} 項`, "text-stone-700"),
        renderStat("重大事項", `${summary.major || 0} 項`, "text-rose-700"),
        renderStat("🔴 被阻斷", `${summary.blocked || 0} 項`, "text-rose-700"),
        renderStat("⚠️ 逾期未回填", `${summary.overdue || 0} 項`, "text-orange-700"),
        renderStat("📮 已送出未核定", `${stateCounts.submitted || 0} 項`, "text-amber-700")
    ].join("");
}

/* ==================================================================
 * 跨案洞察區（2026-09-13 新增）
 *
 * 背景：114 項裡只有 4 項有日期，其餘 110 項是沒有日期的「待觸發」，
 * 倒數看板抓不到——於是頁面最大的數字反而最不能行動。
 * 以下四塊補的都是「日期倒數看不出來的風險」。
 * ================================================================== */

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("zh-TW");
}

/* ⑥ 留痕四態：未啟動 → 進行中 → 已送出 → 已核定
 * 原本只有兩態，看不出「已送出但還沒核定」——而那正是最危險的一段，
 * 因為送出去之後很容易就當成沒事了。 */
function renderStateBar() {
    const payload = state.payload;
    const counts = payload.stateCounts || {};
    const labels = payload.stateLabels || {};
    const order = ["notstarted", "inprogress", "submitted", "approved"];
    const tone = {
        notstarted: ["bg-stone-200", "text-stone-600"],
        inprogress: ["bg-sky-300", "text-sky-800"],
        submitted: ["bg-amber-300", "text-amber-800"],
        approved: ["bg-emerald-400", "text-emerald-800"]
    };
    const total = order.reduce((sum, key) => sum + (counts[key] || 0), 0) || 1;
    const bars = order.map((key) => {
        const value = counts[key] || 0;
        const pct = (value / total) * 100;
        if (!value) return "";
        return `<div class="${tone[key][0]} h-full" style="width:${pct}%" title="${escapeHtml(labels[key] || key)} ${value} 項"></div>`;
    }).join("");
    const legend = order.map((key) => `
        <span class="inline-flex items-center gap-1.5 text-xs font-bold ${tone[key][1]}">
            <span class="inline-block h-2.5 w-2.5 rounded-full ${tone[key][0]}"></span>
            ${escapeHtml(labels[key] || key)} ${counts[key] || 0}
        </span>`).join("");
    return `
        <section class="panel rounded-[28px] p-5 lg:p-6">
            <div class="flex flex-col gap-1">
                <p class="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">Paper Trail</p>
                <h2 class="text-xl font-bold">留痕四態</h2>
                <p class="text-xs text-stone-500">送出不等於核定。<strong class="text-amber-700">已送出 ${counts.submitted || 0} 項</strong>仍在台電手上，核定前都不算閉環。</p>
            </div>
            <div class="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-stone-100">${bars}</div>
            <div class="mt-3 flex flex-wrap gap-x-5 gap-y-2">${legend}</div>
        </section>
    `;
}

/* ⑤ 阻斷：日期倒數不會示警的那種風險。
 * 逾期罰款通常不是忘記，而是上游卡住了卻沒人發現。 */
function renderBlockedPanel() {
    const items = state.payload.blockedItems || [];
    if (!items.length) return "";
    const cards = items.map((item) => `
        <article class="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
                <h4 class="text-base font-bold leading-snug text-rose-900">${escapeHtml(item.task)}</h4>
                <span class="pill border-rose-300 bg-white text-rose-700">卡在 ${escapeHtml(item.blockedOwner || "未指定")}</span>
            </div>
            <p class="mt-2 text-sm text-rose-800">${escapeHtml(item.blockedReason || "")}</p>
            ${item.blockedImpact ? `<p class="mt-1 text-xs text-rose-700/80">影響：${escapeHtml(item.blockedImpact)}</p>` : ""}
        </article>
    `).join("");
    return `
        <section class="panel rounded-[28px] border-l-8 border-l-rose-400 p-5 lg:p-6">
            <div class="flex flex-col gap-1">
                <p class="text-sm font-semibold uppercase tracking-[0.16em] text-rose-500">Blocked</p>
                <h2 class="text-xl font-bold text-rose-900">🔴 被阻斷 ${items.length} 項</h2>
                <p class="text-xs text-stone-500">上游未解，日期再遠也要先處理。這類風險<strong>倒數看板看不出來</strong>。</p>
            </div>
            <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">${cards}</div>
        </section>
    `;
}

/* ⑦ 逾期未回填：期限已過，但狀態仍不是已送出／已核定。 */
function renderOverduePanel() {
    const items = state.payload.overdueItems || [];
    if (!items.length) {
        return `
        <section class="panel rounded-[28px] p-5 lg:p-6">
            <p class="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">Overdue</p>
            <h2 class="mt-1 text-xl font-bold">⚠️ 逾期未回填　<span class="text-emerald-700">0 項</span></h2>
            <p class="mt-2 text-xs text-stone-500">所有<strong>有明確日期</strong>的項目都已送出或核定。
            注意：110 項待觸發沒有日期，不在本檢查範圍；提醒清單以外的內部倒推日（如各交付包的啟動日）亦未納入。</p>
        </section>`;
    }
    const rows = items.map((item) => `
        <tr class="border-t border-stone-200">
            <td class="py-2 pr-3 text-sm font-bold text-rose-800">逾期 ${item.overdueDays} 天</td>
            <td class="py-2 pr-3 text-sm font-semibold">${escapeHtml(item.task)}</td>
            <td class="py-2 pr-3 text-xs text-stone-500">${escapeHtml(item.dueLabel || "")}</td>
            <td class="py-2 text-xs text-stone-500">${escapeHtml(item.fine || "—")}</td>
        </tr>`).join("");
    return `
        <section class="panel rounded-[28px] border-l-8 border-l-orange-400 p-5 lg:p-6">
            <p class="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">Overdue</p>
            <h2 class="mt-1 text-xl font-bold text-orange-900">⚠️ 逾期未回填 ${items.length} 項</h2>
            <p class="mt-2 text-xs text-stone-500">期限已過，但狀態仍非「已送出」或「已核定」。</p>
            <div class="mt-4 overflow-x-auto">
                <table class="w-full min-w-[560px] text-left"><tbody>${rows}</tbody></table>
            </div>
        </section>
    `;
}

/* ③ 罰則排行：拆「按期累計」與「單次重罰」兩張。
 * 混在一起排序會誤導——30萬看起來最大，但 2,000/日 拖一年就是 73萬。 */
function renderFinePanel() {
    const payload = state.payload;
    const rated = payload.fineRanking || [];
    const oneoff = payload.fineOneOff || [];
    const nonmon = payload.nonMonetaryFines || [];
    if (!rated.length && !oneoff.length) return "";
    const ratedRows = rated.map((item) => `
        <tr class="border-t border-stone-200">
            <td class="whitespace-nowrap py-2 pr-3 text-sm font-bold text-rose-700">${fmtMoney(item.amount)}<span class="text-xs font-semibold text-stone-500"> /${escapeHtml(item.unit)}</span></td>
            <td class="py-2 pr-3 text-sm">${escapeHtml(item.task)}${item.major ? ` <span class="pill border-rose-200 bg-rose-50 text-rose-700">重大</span>` : ""}</td>
            <td class="py-2 text-xs text-stone-500">${escapeHtml(item.basis || "—")}</td>
        </tr>`).join("");
    const oneoffRows = oneoff.map((item) => `
        <tr class="border-t border-stone-200">
            <td class="whitespace-nowrap py-2 pr-3 text-sm font-bold text-stone-700">${fmtMoney(item.amount)}</td>
            <td class="py-2 pr-3 text-sm">${escapeHtml(item.task)}</td>
            <td class="py-2 text-xs text-stone-500">${escapeHtml(item.fine || "")}</td>
        </tr>`).join("");
    return `
        <section class="panel rounded-[28px] p-5 lg:p-6">
            <p class="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">Penalty Exposure</p>
            <h2 class="mt-1 text-xl font-bold">💰 罰則單價排行</h2>
            <p class="mt-2 text-xs text-stone-500">下列是<strong>單價</strong>不是累計金額——實際曝險 ＝ 單價 × 天數／次數／人數，發生幾次無法從清單得知。</p>
            <div class="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div>
                    <h3 class="text-sm font-bold text-rose-800">按期累計（拖越久越多）</h3>
                    <div class="mt-2 overflow-x-auto"><table class="w-full min-w-[420px] text-left"><tbody>${ratedRows}</tbody></table></div>
                </div>
                <div>
                    <h3 class="text-sm font-bold text-stone-700">單次重罰（一次計罰）</h3>
                    <div class="mt-2 overflow-x-auto"><table class="w-full min-w-[420px] text-left"><tbody>${oneoffRows}</tbody></table></div>
                    ${nonmon.length ? `<p class="mt-3 text-xs text-stone-500">非金錢罰則：${nonmon.map(escapeHtml).join("、")}</p>` : ""}
                </div>
            </div>
        </section>
    `;
}

function renderInsights() {
    if (!insightsRoot) return;
    insightsRoot.innerHTML = [
        renderBlockedPanel(),
        renderOverduePanel(),
        renderStateBar(),
        renderFinePanel()
    ].join("");
}


function renderAnchors() {
    const sections = state.payload.sections || [];
    anchorBar.innerHTML = sections.map((section, index) => {
        const tabIndex = index + 1;
        const label = sectionTabLabel(section, tabIndex);
        const selected = section.key === state.activeSection;
        return `
        <button id="tab-${escapeHtml(section.key)}" class="tab-button ${selected ? "active" : ""}" data-section="${escapeHtml(section.key)}" role="tab" aria-selected="${selected}" aria-controls="section-panel">
            <span class="block text-xs font-bold uppercase tracking-[0.12em] opacity-70">Tab ${tabIndex}</span>
            <span class="mt-1 block text-sm font-bold leading-snug">${escapeHtml(label)}</span>
            <span class="mt-1 block text-xs opacity-80">已啟動 ${section.counts?.active || 0}｜待觸發 ${section.counts?.pending || 0}</span>
            <span class="mt-1 block text-xs font-bold leading-relaxed opacity-90">${renderRiskCounts(section.counts)}</span>
        </button>
    `;
    }).join("");
    anchorBar.querySelectorAll("[data-section]").forEach((button) => {
        button.addEventListener("click", () => {
            state.activeSection = button.dataset.section;
            render();
        });
    });
}

function renderActiveItem(item) {
    const manager = item.manager ? ` / 副理：${escapeHtml(item.manager)}` : "";
    return `
        <article class="item-card rounded-2xl p-4">
            <div class="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p class="text-xs font-bold text-emerald-700">${escapeHtml(item.statusLight || "🟢")} ${escapeHtml(item.diffLabel || "")}</p>
                    <h4 class="mt-1 text-base font-bold leading-snug">${escapeHtml(item.task)}</h4>
                </div>
                <span class="pill ${riskToneClass(item.diff)}">${escapeHtml(item.dueLabel || "未設定")}</span>
            </div>
            <p class="mt-3 text-sm text-stone-600">負責：${escapeHtml(item.owner || "未指定")}${manager}</p>
        </article>
    `;
}

// inGroup=true 時，群組標題已寫明觸發源，卡片改顯示條文出處，避免整欄重複同一行字
function renderPendingItem(item, inGroup) {
    const manager = item.manager ? ` / 副理：${escapeHtml(item.manager)}` : "";
    const major = item.major ? `<span class="pill border-rose-200 bg-rose-50 text-rose-700">重大</span>` : "";
    const blocked = item.blocked ? `<span class="pill border-rose-300 bg-rose-100 text-rose-800">🔴 阻斷</span>` : "";
    return `
        <article class="pending-card rounded-2xl p-4">
            <div class="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p class="text-xs font-bold text-stone-500">${escapeHtml(inGroup ? (item.heading || "") : (item.triggerLabel || item.heading || "待觸發"))}</p>
                    <h4 class="mt-1 text-base font-bold leading-snug">${escapeHtml(item.task)}</h4>
                </div>
                <div class="flex flex-wrap items-start gap-1.5">${blocked}${major}</div>
            </div>
            <p class="mt-3 text-sm text-stone-600">基準：${escapeHtml(item.dueLabel || "待確認")}</p>
            <p class="mt-1 text-sm text-stone-600">負責：${escapeHtml(item.owner || "未指定")}${manager}</p>
            <p class="mt-1 text-xs text-stone-500">依據：${escapeHtml(item.basis || "—")}｜罰款：${escapeHtml(item.fine || "—")}</p>
        </article>
    `;
}

function renderStaffing(section) {
    const staffingPlan = section.staffingPlan || [];
    const staffing = section.staffing || [];
    const planMarkup = staffingPlan.length ? `
            <div class="mt-6">
                <h4 class="text-sm font-bold uppercase tracking-[0.14em] text-stone-500">監造人員派駐計畫</h4>
                <div class="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white/80">
                    <div class="grid grid-cols-[0.58fr,1.42fr] bg-stone-100 px-4 py-2 text-xs font-bold text-stone-500">
                        <div>階段</div>
                        <div>派駐編組</div>
                    </div>
                    <div class="divide-y divide-stone-100">
                        ${staffingPlan.map((item) => `
                            <div class="grid grid-cols-[0.58fr,1.42fr] gap-3 px-4 py-3 text-sm">
                                <div class="font-bold text-teal-700">${escapeHtml(item.phase)}</div>
                                <div class="font-semibold leading-relaxed text-stone-700">${escapeHtml(item.plan)}</div>
                            </div>
                        `).join("")}
                    </div>
                </div>
            </div>
        ` : "";

    const peopleMarkup = staffing.length ? `
        <details class="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white/80">
            <summary class="cursor-pointer bg-stone-100 px-4 py-3 text-sm font-bold text-stone-700">人員表（點擊展開）</summary>
            <div>
                <div class="grid grid-cols-[1.25fr,0.75fr] bg-stone-100 px-4 py-2 text-xs font-bold text-stone-500">
                    <div>職務</div>
                    <div>人員</div>
                </div>
                <div class="divide-y divide-stone-100">
                    ${staffing.map((item) => {
                        const recruiting = item.person === "招募中";
                        return `
                            <div class="grid grid-cols-[1.25fr,0.75fr] gap-3 px-4 py-3 text-sm">
                                <div class="font-semibold text-stone-700">${escapeHtml(item.role)}</div>
                                <div class="font-bold ${recruiting ? "text-rose-700" : "text-teal-700"}">${escapeHtml(item.person)}</div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        </details>
    ` : "";

    return planMarkup || peopleMarkup ? `${planMarkup}${peopleMarkup}` : "";
}

/* ④ 待觸發依「觸發源」分群。
 * 原本的 heading 是「六、分案施工階段待觸發事項」這種條文編號，
 * 對看的人沒有意義；改成回答「這件事在等誰」，才分得出
 * 哪些我能推、哪些只能等。預設只展開第一組，其餘收合。 */
const TRIGGER_TONE = {
    waiting_taipower: ["border-sky-200", "bg-sky-50", "text-sky-800"],
    waiting_notice: ["border-sky-200", "bg-sky-50", "text-sky-800"],
    waiting_contractor: ["border-violet-200", "bg-violet-50", "text-violet-800"],
    periodic_self: ["border-emerald-200", "bg-emerald-50", "text-emerald-800"],
    personnel: ["border-teal-200", "bg-teal-50", "text-teal-800"],
    site_event: ["border-amber-200", "bg-amber-50", "text-amber-800"],
    closeout: ["border-stone-200", "bg-stone-50", "text-stone-700"],
    other: ["border-stone-200", "bg-stone-50", "text-stone-700"]
};

function renderTriggerGroups(section) {
    const groups = section.triggerGroups || [];
    if (!groups.length) {
        return `<div class="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-semibold text-stone-500">目前無待觸發項目</div>`;
    }
    return `<div class="mt-3 space-y-3">` + groups.map((group, index) => {
        const tone = TRIGGER_TONE[group.key] || TRIGGER_TONE.other;
        const blockedCount = group.items.filter((item) => item.blocked).length;
        return `
        <details class="rounded-2xl border ${tone[0]} ${tone[1]}" ${index === 0 ? "open" : ""}>
            <summary class="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span class="text-sm font-bold ${tone[2]}">${escapeHtml(group.label)}</span>
                <span class="flex flex-wrap items-center gap-1.5">
                    ${blockedCount ? `<span class="pill border-rose-300 bg-rose-100 text-rose-800">🔴 ${blockedCount}</span>` : ""}
                    ${group.major ? `<span class="pill border-rose-200 bg-white text-rose-700">重大 ${group.major}</span>` : ""}
                    <span class="pill border-stone-300 bg-white ${tone[2]}">${group.count} 項</span>
                </span>
            </summary>
            <div class="grid grid-cols-1 gap-3 px-4 pb-4 lg:grid-cols-2">
                ${group.items.map((item) => renderPendingItem(item, true)).join("")}
            </div>
        </details>`;
    }).join("") + `</div>`;
}


function renderSection(section) {
    const activeItems = section.activeItems || [];
    const pendingItems = section.pendingItems || [];
    const note = section.note ? `<p class="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">${escapeHtml(section.note)}</p>` : "";
    const officeMapUrl = safeExternalUrl(section.officeMapUrl);
    const officeAddress = section.officeAddress ? `
        <p class="mt-2 text-sm font-semibold text-stone-600">
            工務所地址：${officeMapUrl ? `<a class="text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900" href="${escapeHtml(officeMapUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(section.officeAddress)}</a>` : escapeHtml(section.officeAddress)}
        </p>
    ` : "";
    const staffing = renderStaffing(section);
    return `
        <section id="section-panel" class="panel rounded-[28px] p-5 lg:p-6" role="tabpanel" aria-labelledby="tab-${escapeHtml(section.key)}">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-2xl font-bold">${escapeHtml(section.title)}</h3>
                        <span class="pill bg-stone-100 text-stone-700">${escapeHtml(statusLabel(section.status))}</span>
                    </div>
                    <p class="mt-2 text-sm text-stone-500">${escapeHtml(section.subtitle || "")}</p>
                    ${officeAddress}
                    ${note}
                </div>
                <div class="grid min-w-[260px] grid-cols-3 gap-2">
                    <div class="rounded-2xl bg-emerald-50 p-3 text-center text-emerald-800"><p class="text-xs">已啟動</p><p class="text-xl font-bold">${section.counts?.active || 0}</p></div>
                    <div class="rounded-2xl bg-stone-100 p-3 text-center text-stone-700"><p class="text-xs">待觸發</p><p class="text-xl font-bold">${section.counts?.pending || 0}</p></div>
                    <div class="rounded-2xl bg-rose-50 p-3 text-center text-rose-800"><p class="text-xs">重大</p><p class="text-xl font-bold">${section.counts?.major || 0}</p></div>
                </div>
            </div>
            <div class="mt-4 rounded-2xl border border-stone-200 bg-white/70 px-4 py-3 text-sm font-bold text-stone-700">${renderRiskCounts(section.counts)}</div>
            ${staffing}

            <div class="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr,1.15fr]">
                <div>
                    <h4 class="text-sm font-bold uppercase tracking-[0.14em] text-stone-500">已啟動 D-45 項目</h4>
                    <div class="mt-3 space-y-3">
                        ${activeItems.length ? activeItems.map(renderActiveItem).join("") : `<div class="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-semibold text-stone-500">目前無已啟動項目</div>`}
                    </div>
                </div>
                <div>
                    <h4 class="text-sm font-bold uppercase tracking-[0.14em] text-stone-500">待觸發項目 — 依「在等誰」分群</h4>
                    <p class="mt-1 text-xs text-stone-500">原本依條文章節編號排列，看不出哪些能自己推、哪些在等別人。</p>
                    ${renderTriggerGroups(section)}
                </div>
            </div>
        </section>
    `;
}

function renderSections() {
    const sections = state.payload.sections || [];
    const active = sections.find((section) => section.key === state.activeSection) || sections[0];
    if (!active) {
        sectionsRoot.innerHTML = `<div class="panel rounded-[24px] p-6 text-stone-500">目前沒有分頁資料</div>`;
        return;
    }
    state.activeSection = active.key;
    sectionsRoot.innerHTML = renderSection(active);
}

function render() {
    renderSummary();
    renderInsights();
    renderAnchors();
    renderSections();
}

async function init() {
    try {
        const response = await fetch("./taipower_4in1_audit.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`無法讀取資料檔：${response.status}`);
        state.payload = await response.json();
        render();
    } catch (error) {
        summaryGrid.innerHTML = "";
        sectionsRoot.innerHTML = `<div class="panel rounded-[24px] p-6 text-red-600">資料載入失敗：${escapeHtml(error.message)}</div>`;
    }
}

init();

/* ------------------------------------------------------------------
 * 頁首連結：已全部移除（2026-09-12）
 *
 * 沿革：
 *  1. 原本此處注入四顆按鈕（觀音中大進場總控／D-1放行看板／進場表單
 *     中心／勞務請款列管）。
 *  2. 2026-09-12 先改為單一「監造進場與請款工具」入口，四個連結移至
 *     taipower_4in1_tools.html。
 *  3. 同日依指示再把該入口也移除——本頁專注於四案待辦事項控管，
 *     頁首不放任何外連。
 *
 * 工具專區仍在線上，只是不再從本頁連過去：
 *     ./taipower_4in1_tools.html
 * 需要時請直接開該網址或加入書籤。
 * ------------------------------------------------------------------ */
