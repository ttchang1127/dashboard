const state = {
    payload: null,
    activeSection: new URLSearchParams(window.location.search).get("tab") || "common"
};

const versionText = document.getElementById("versionText");
const auditDateText = document.getElementById("auditDateText");
const metaText = document.getElementById("metaText");
const summaryGrid = document.getElementById("summaryGrid");
const anchorBar = document.getElementById("anchorBar");
const sectionsRoot = document.getElementById("sections");
const insightsRoot = document.getElementById("insights");
const caseOverviewRoot = document.getElementById("caseOverview");

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

/* ==================================================================
 * 人工確認覆寫（2026-09-15）
 *
 * 稽核 JSON 由 Mac mini 排程產生；來源同步較慢時，已確認的現場事實
 * 不應被舊資料重新顯示為逾期。本層只補正「事件已發生」，原本三道
 * 核可文件缺口仍保留為阻斷事項，不推定文件已核准。
 * ================================================================== */
function applyConfirmedAuditOverrides(payload) {
    const taskName = "觀音中大線監造派駐啟動";
    const completionText = "✅ 已完成：115/09/14 已實際派駐，監造人員均已進場（115/09/15 Tim確認）";
    const complianceTask = "觀音中大派駐核准與留痕補正";
    const complianceStatus = "實際派駐已完成；監造計畫、人員核准及9月出勤配置核可文件仍須追蹤";

    const wasOverdue = (payload.overdueItems || []).some((item) => item.task === taskName);
    const activeEntry = (payload.sections || [])
        .flatMap((section) => section.activeItems || [])
        .find((item) => item.task === taskName);
    const wasActive = Boolean(activeEntry);
    const wasInProgress = activeEntry?.state === "inprogress";

    function visit(value, parentKey = "") {
        if (Array.isArray(value)) {
            if (parentKey === "overdueItems") {
                return value.filter((item) => item?.task !== taskName).map((item) => visit(item));
            }
            if (parentKey === "activeItems") {
                return value.filter((item) => item?.task !== taskName).map((item) => visit(item));
            }
            if (parentKey === "blockedItems") {
                return value.map((item) => {
                    if (item?.task !== taskName) return visit(item);
                    const corrected = {
                        ...item,
                        task: complianceTask,
                        dueLabel: "115/09/14已實際派駐；核准與留痕文件續追",
                        diff: 4,
                        diffLabel: "文件留痕續追",
                        statusLight: "🟠",
                        status: complianceStatus,
                        state: "inprogress",
                        stateLabel: "進行中"
                    };
                    delete corrected.overdue;
                    delete corrected.overdueDays;
                    return visit(corrected);
                });
            }
            return value.map((item) => visit(item));
        }
        if (!value || typeof value !== "object") return value;

        if (value.task === taskName) {
            value.status = completionText;
            value.state = "submitted";
            value.stateLabel = "已完成";
            value.statusLight = "✅";
            value.diff = 4;
            value.diffLabel = "已於115/09/14完成";
            delete value.overdue;
            delete value.overdueDays;
        }
        Object.keys(value).forEach((key) => {
            value[key] = visit(value[key], key);
        });
        return value;
    }

    visit(payload);

    const guanyinCard = (payload.caseOverview || []).find((card) => card.key === "guanyin");
    if (guanyinCard) {
        guanyinCard.overdue = Math.max(0, Number(guanyinCard.overdue || 0) - (wasOverdue ? 1 : 0));
        if (guanyinCard.nextDue?.task === taskName) {
            guanyinCard.nextDue = {
                task: taskName,
                dueLabel: "115/09/14已完成",
                completed: true
            };
        }
    }

    const guanyinSection = (payload.sections || []).find((section) => section.key === "guanyin");
    if (guanyinSection?.counts) {
        guanyinSection.counts.active = Math.max(0, Number(guanyinSection.counts.active || 0) - (wasActive ? 1 : 0));
        guanyinSection.counts.overdue = Math.max(0, Number(guanyinSection.counts.overdue || 0) - (wasOverdue ? 1 : 0));
        guanyinSection.counts.red = Math.max(0, Number(guanyinSection.counts.red || 0) - (wasOverdue ? 1 : 0));
    }
    if (wasInProgress && guanyinSection?.stateCounts) {
        guanyinSection.stateCounts.inprogress = Math.max(0, Number(guanyinSection.stateCounts.inprogress || 0) - 1);
        guanyinSection.stateCounts.submitted = Number(guanyinSection.stateCounts.submitted || 0) + 1;
    }

    if (payload.summary) {
        payload.summary.active = Math.max(0, Number(payload.summary.active || 0) - (wasActive ? 1 : 0));
        payload.summary.overdue = Math.max(0, Number(payload.summary.overdue || 0) - (wasOverdue ? 1 : 0));
        payload.summary.red = Math.max(0, Number(payload.summary.red || 0) - (wasOverdue ? 1 : 0));
    }
    if (wasInProgress && payload.stateCounts) {
        payload.stateCounts.inprogress = Math.max(0, Number(payload.stateCounts.inprogress || 0) - 1);
        payload.stateCounts.submitted = Number(payload.stateCounts.submitted || 0) + 1;
    }
    if (payload.project?.riskCounts) {
        payload.project.riskCounts.red = Math.max(0, Number(payload.project.riskCounts.red || 0) - (wasOverdue ? 1 : 0));
    }
    payload.confirmedOverride = "115/09/15補正：觀音中大案已於115/09/14實際派駐，監造人員均已進場";
    return payload;
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

/* ==================================================================
 * 四案並排總覽（2026-09-13 新增）
 *
 * 分頁一次只看得到一案，但四案是同時進行、進度各不相同；
 * 要判斷「誰最急」必須並排。排序在產生器端完成（分層比較：
 * 逾期 → 距到期天數 → 阻斷數 → 未到位人數 → 暫代人數），
 * 前端只負責照 rank 畫出來。
 * ================================================================== */

const CASE_STATUS_LABEL = {
    active: "列管中",
    recruiting: "招募中",
    paused: "暫不啟動"
};

function caseTone(card) {
    const days = card.nextDue?.daysLeft;
    if (card.overdue > 0 || card.blocked > 0 || (typeof days === "number" && days <= 7)) return "tone-hot";
    if (typeof days === "number") return "tone-warn";
    return "tone-idle";
}

function countdownText(card) {
    if (card.nextDue?.completed) return { big: "已完成", small: escapeHtml(card.nextDue.task || "") };
    const days = card.nextDue?.daysLeft;
    if (typeof days !== "number") return { big: "—", small: "尚未進入列管節點" };
    if (days < 0) return { big: `逾期 ${Math.abs(days)} 天`, small: escapeHtml(card.nextDue.task || "") };
    if (days === 0) return { big: "就是今天", small: escapeHtml(card.nextDue.task || "") };
    return { big: `D-${days}`, small: escapeHtml(card.nextDue.task || "") };
}

/* 人員條分三段。兩段不夠用：龍顯主任「暫代到11月中」是現場有人，
 * 廣豐主任「10/5報到」是現場沒人——併成一個數字會失真。 */
function staffingBlock(staff) {
    if (!staff || !staff.total) {
        return `
            <div>
                <div class="flex justify-between text-xs"><span class="font-bold">人員 —</span><span class="text-stone-500">尚未編組</span></div>
                <div class="staff-bar mt-1"><div style="width:100%" class="bg-stone-200"></div></div>
            </div>`;
    }
    const pct = (n) => (n / staff.total) * 100;
    const notes = [];
    if (staff.provisional) notes.push(`<span class="text-amber-700">暫代 ${staff.provisional}</span>`);
    if (staff.notInPlace) notes.push(`<span class="text-rose-700">未到位 ${staff.notInPlace}</span>`);
    if (!notes.length) notes.push(`<span class="text-emerald-700">全到位</span>`);
    return `
        <div>
            <div class="flex justify-between text-xs">
                <span class="font-bold">人員 ${staff.inPlace}/${staff.total}</span>
                <span>${notes.join("・")}</span>
            </div>
            <div class="staff-bar mt-1">
                ${staff.inPlace ? `<div style="width:${pct(staff.inPlace)}%" class="bg-emerald-500" title="已到位 ${staff.inPlace}"></div>` : ""}
                ${staff.provisional ? `<div style="width:${pct(staff.provisional)}%" class="bg-amber-400" title="暫代 ${staff.provisional}"></div>` : ""}
                ${staff.notInPlace ? `<div style="width:${pct(staff.notInPlace)}%" class="bg-stone-300" title="未到位 ${staff.notInPlace}"></div>` : ""}
            </div>
        </div>`;
}

function renderCaseCard(card) {
    const cd = countdownText(card);
    const selected = card.key === state.activeSection;
    const pills = [
        card.blocked ? `<span class="pill border-rose-300 bg-rose-100 text-rose-800">🔴 阻斷 ${card.blocked}</span>` : "",
        card.overdue ? `<span class="pill border-orange-300 bg-orange-100 text-orange-800">⚠️ 逾期 ${card.overdue}</span>` : "",
        `<span class="pill border-stone-300 bg-stone-100 text-stone-600">待觸發 ${card.pending}</span>`,
        card.major ? `<span class="pill border-rose-200 bg-rose-50 text-rose-700">重大 ${card.major}</span>` : ""
    ].filter(Boolean).join("");
    return `
        <button type="button" class="case-card ${caseTone(card)} ${selected ? "is-active" : ""}" data-case="${escapeHtml(card.key)}"
                aria-label="切換到 ${escapeHtml(card.title)} 分頁">
            <div class="flex items-start justify-between gap-2">
                <div>
                    <h3 class="text-lg font-bold leading-tight">${escapeHtml(card.title)}</h3>
                    <p class="mt-0.5 text-xs text-stone-500">${escapeHtml(card.subtitle || "")}</p>
                </div>
                <span class="pill bg-stone-100 text-stone-600">${escapeHtml(CASE_STATUS_LABEL[card.status] || "列管中")}</span>
            </div>
            <div class="flex items-end gap-2">
                <span class="text-3xl font-extrabold leading-none ${card.overdue || (card.nextDue?.daysLeft ?? 99) <= 7 ? "text-rose-700" : "text-stone-700"}">${cd.big}</span>
                <span class="pb-1 text-xs leading-snug text-stone-500">${escapeHtml(card.nextDue?.dueLabel?.split("（")[0] || "")}<br>${cd.small}</span>
            </div>
            <div class="flex flex-wrap gap-1.5">${pills}</div>
            ${staffingBlock(card.staffing)}
        </button>`;
}

/* 卡片下方那一行由資料算出來，不是寫死的文案——
 * 人員缺口一直躺在 staffing 欄位裡，只是從來沒有人算過。 */
function staffingHeadline(cards) {
    const parts = cards
        .filter((c) => c.staffing?.total && (c.staffing.notInPlace || c.staffing.provisional))
        .map((c) => {
            const bits = [];
            if (c.staffing.notInPlace) bits.push(`<strong>${c.staffing.notInPlace} 個未到位</strong>`);
            if (c.staffing.provisional) bits.push(`${c.staffing.provisional} 個暫代`);
            const due = typeof c.nextDue?.daysLeft === "number" ? `（剩 ${c.nextDue.daysLeft} 天）` : "";
            return `${escapeHtml(c.title)} ${c.staffing.total} 個職務，${bits.join("、")}${due}`;
        });
    if (!parts.length) return "";
    return `<p class="mt-4 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-900"><strong>人員缺口：</strong>${parts.join("；")}。</p>`;
}

function renderCaseOverview() {
    if (!caseOverviewRoot) return;
    const cards = state.payload.caseOverview || [];
    if (!cards.length) { caseOverviewRoot.innerHTML = ""; return; }
    caseOverviewRoot.innerHTML = `
        <section class="panel rounded-[28px] p-5 lg:p-6">
            <div class="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p class="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">Four Cases at a Glance</p>
                    <h2 class="text-2xl font-bold">四案現況　<span class="text-sm font-semibold text-stone-500">依急迫度排序</span></h2>
                </div>
                <p class="text-xs text-stone-500">點任一案 → 切到該案分頁</p>
            </div>
            <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                ${cards.map(renderCaseCard).join("")}
            </div>
            ${staffingHeadline(cards)}
        </section>`;
    caseOverviewRoot.querySelectorAll("[data-case]").forEach((button) => {
        button.addEventListener("click", () => {
            state.activeSection = button.dataset.case;
            render();
            document.getElementById("section-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });
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
        payload.confirmedOverride || "",
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

/* 洞察面板的共用外殼：可收合。
 * 收合時 summary 仍顯示標題與關鍵數字——阻斷若連數字都藏起來，
 * 就違背了它「讓沒人發現的上游卡點被看見」的目的。
 * 展開的是細節（哪幾項、為什麼卡、罰多少），不是結論。 */
function insightPanel({ tone = "", eyebrow, title, titleClass = "", meta = "", body, open = false }) {
    return `
        <details class="panel overflow-hidden rounded-[28px] ${tone}" ${open ? "open" : ""}>
            <summary class="insight-summary flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 p-5 lg:px-6">
                <span class="insight-chev text-stone-400" aria-hidden="true">▸</span>
                <span class="flex flex-col">
                    <span class="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">${escapeHtml(eyebrow)}</span>
                    <span class="text-xl font-bold ${titleClass}">${title}</span>
                </span>
                ${meta ? `<span class="ml-auto text-xs text-stone-500">${meta}</span>` : ""}
            </summary>
            <div class="border-t border-stone-200/70 p-5 lg:p-6">${body}</div>
        </details>
    `;
}


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
    return insightPanel({
        eyebrow: "Paper Trail",
        title: "📮 留痕四態",
        meta: `已送出 <strong class="text-amber-700">${counts.submitted || 0}</strong> 項未核定`,
        body: `
            <p class="text-xs text-stone-500">送出不等於核定。<strong class="text-amber-700">已送出 ${counts.submitted || 0} 項</strong>仍在台電手上，核定前都不算閉環。</p>
            <div class="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-stone-100">${bars}</div>
            <div class="mt-3 flex flex-wrap gap-x-5 gap-y-2">${legend}</div>
        `
    });
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
    return insightPanel({
        tone: "border-l-8 border-l-rose-400",
        eyebrow: "Blocked",
        title: `🔴 被阻斷 ${items.length} 項`,
        titleClass: "text-rose-900",
        meta: "上游未解，日期再遠也要先處理",
        body: `
            <p class="text-xs text-stone-500">這類風險<strong>倒數看板看不出來</strong>——項目日期可能還很遠，或根本沒有日期。</p>
            <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">${cards}</div>
        `
    });
}

/* ⑦ 逾期未回填：期限已過，但狀態仍不是已送出／已核定。 */
function renderOverduePanel() {
    const items = state.payload.overdueItems || [];
    if (!items.length) {
        return insightPanel({
            eyebrow: "Overdue",
            title: `⚠️ 逾期未回填 <span class="text-emerald-700">0 項</span>`,
            meta: "有日期的項目都已送出或核定",
            body: `<p class="text-xs text-stone-500">所有<strong>有明確日期</strong>的項目都已送出或核定。
            但 <strong>0 不等於沒有東西遲到</strong>：110 項待觸發沒有日期，不在本檢查範圍；
            提醒清單以外的內部倒推日（如各交付包的啟動日）亦未納入。</p>`
        });
    }
    const rows = items.map((item) => `
        <tr class="border-t border-stone-200">
            <td class="py-2 pr-3 text-sm font-bold text-rose-800">逾期 ${item.overdueDays} 天</td>
            <td class="py-2 pr-3 text-sm font-semibold">${escapeHtml(item.task)}</td>
            <td class="py-2 pr-3 text-xs text-stone-500">${escapeHtml(item.dueLabel || "")}</td>
            <td class="py-2 text-xs text-stone-500">${escapeHtml(item.fine || "—")}</td>
        </tr>`).join("");
    return insightPanel({
        tone: "border-l-8 border-l-orange-400",
        eyebrow: "Overdue",
        title: `⚠️ 逾期未回填 ${items.length} 項`,
        titleClass: "text-orange-900",
        meta: "期限已過，狀態仍非已送出／已核定",
        body: `
            <div class="overflow-x-auto">
                <table class="w-full min-w-[560px] text-left"><tbody>${rows}</tbody></table>
            </div>
        `
    });
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
    const top = rated[0];
    return insightPanel({
        eyebrow: "Penalty Exposure",
        title: "💰 罰則單價排行",
        meta: top ? `按期最高 <strong class="text-rose-700">${fmtMoney(top.amount)}/${escapeHtml(top.unit)}</strong>` : "",
        body: `
            <p class="text-xs text-stone-500">下列是<strong>單價</strong>不是累計金額——實際曝險 ＝ 單價 × 天數／次數／人數，發生幾次無法從清單得知。</p>
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
        `
    });
}

/* 請假與職務代理規定（共同項目分頁，點選展開）。
 *
 * 這是契約條文整理，不是提醒清單的資料，所以寫死在前端、不走 JSON：
 * 條文不會隨排程變動，放進產生器反而多一個會被覆蓋的地方。
 * 依據與完整說明見 KB：50_職安人員/請假與職務代理規定.md。
 * 條文或台電確認事項變更時，兩處要一起改。 */
function leaveTable(head, rows, minWidth = 640) {
    const th = head.map((h) => `<th class="py-2 pr-3 text-xs font-semibold text-stone-500">${h}</th>`).join("");
    const tr = rows.map((cells) => `<tr class="border-t border-stone-200 align-top">${
        cells.map((c, i) => `<td class="py-2 pr-3 text-sm ${i === 0 ? "font-semibold text-stone-800" : "text-stone-700"}">${c}</td>`).join("")
    }</tr>`).join("");
    return `<div class="overflow-x-auto"><table class="w-full text-left" style="min-width:${minWidth}px"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}

function renderLeavePanel() {
    const h = (t) => `<h4 class="mt-6 text-base font-bold text-stone-900">${t}</h4>`;
    const scenario = leaveTable(["情境", "事前要做什麼", "代理人", "依據"], [
        ["公出、出差", "當日（含）以前向台電報備；差假前先覓妥代理人；填外勤／公出單", "當日出勤人員互為代理", "7.6.2"],
        ["請假 1 天以上", "除情況特殊外，<strong>事先</strong>向台電報備", "同等專長資格人員；或當日計畫出勤人員互為代理（<strong>出勤配置計畫預先核定即可</strong>）", "7.6.4"],
        ["連續 5 天以上長假", "<strong>3 天前以書面</strong>提出", "同上", "7.6.4"],
        ["離職，或連續 3 天以上無法執勤", "指派代理人並<strong>函報台電核定</strong>，不得中斷", "<strong>相同資格</strong>人員", "7.4.2"],
        ["職安人員請假／無法駐守", "<strong>書面通知</strong>台電；代理須<strong>事先報准</strong>；離開工地須填<strong>移交委託書</strong>留工地備查", "見下表", "7.6.3、契約附件6.1、輔導要點二十四"]
    ]);
    const role = leaveTable(["被代理職務", "代理人資格", "限制", "依據"], [
        ["監造主任", "具同資格：土木／建築相關科系、相關工作10年、現場監造8年、甲種職安業務主管＋品管證照。本案由<strong>公司其他符合主任資格之人員</strong>代理", "一人同時限代 1 人；每月暫代不逾 10 日；<strong>不得跨越其他標案</strong>（7.4.1）", "7.6.3、7.4.2、7.4.1、7.3.1.2.14"],
        ["主辦／協辦工程師、協辦工程員、品管", "具同資格（以被代理職務 7.3.1.2 門檻為準；資格高者可向下代理）", "同上", "7.6.3、7.4.2、7.6.4"],
        ["職安人員（路線A）", "<strong>同一契約內所置</strong>、具「營造業甲種職業安全衛生業務主管」以上資格者（或與職安相同資格者），<strong>事先報准</strong>", "每月 ≤ <strong>7 天</strong>；<strong>逾 7 天應主動更換原職安人員</strong>", "7.2、7.6.3、輔導要點十一(七)"],
        ["職安人員（路線B）", "工地負責人＝<strong>監造主任</strong>", "請假連續 3 日內；每月累計 ≤ <strong>5 天</strong>；當天代理", "7.6.3"],
        ["文書管理人員", "同等專長人員", "假日／超時不得為唯一出勤人", "7.6.4、7.3.9"]
    ], 680);
    const fines = leaveTable(["違反情形", "罰則", "依據"], [
        ["請假未依規定指定代理人、職務中斷", "扣當日薪資，另 <strong class='text-rose-700'>5,000元／人日</strong>", "13.6"],
        ["職安離開現場未報備、未指定合格代理人或代理人未到場（含未填移交委託書）", "<strong class='text-rose-700'>5,000元／次</strong>、2.5點", "安衛罰款標準 三、5"],
        ["職安及常駐人員未依規定簽到（含未經同意代理簽到）", "2,000元／人次", "契約附件6.1"],
        ["應簽到未簽到；簽到不實", "5,000元／人日；5,000元／人次", "13.7"],
        ["經同意未指派代理人", "每日扣 1/30 服務費", "11.5.1.1.2"]
    ], 560);
    return insightPanel({
        tone: "border-l-8 border-l-teal-500",
        eyebrow: "Rules · 共通規定",
        title: "📋 請假與職務代理規定",
        titleClass: "text-stone-900",
        meta: "未指定代理人或職務中斷 13.6 · 5,000元／人日",
        body: `
            <ul class="space-y-1 text-sm text-stone-700">
                <li>① <strong>代理人要具被代理職務的資格</strong>（同資格／相同資格／同等專長），不是找現場任何人頂。</li>
                <li>② <strong>職安人員代理最嚴</strong>：甲種職安業務主管以上、同契約內所置、事先報准、每月最多 7 天，逾 7 天要換人。</li>
                <li>③ <strong>互為代理</strong>以每月出勤配置計畫預先核定即可 → <strong>每月計畫須附職務代理對照表</strong>。</li>
            </ul>
            ${h("依請假情境")}${scenario}
            <p class="mt-2 text-xs text-stone-500">互為代理計價：請假人不計服務費，代理人只計原服務費（無加成）。</p>
            ${h("依職務查代理人資格")}${role}
            <p class="mt-2 text-xs text-stone-500">職安代理共同要件：事先以書面報請台電同意，未經同意不得執行代理勤務及簽到（契約附件6.1）。職安人員本身須乙級職安管理員以上（7.3.1.2.5），甲種業務主管代理屬短期例外，故設 7 天上限。</p>
            ${h("互為代理：出勤配置計畫預先核定即可")}
            <p class="text-sm text-stone-700">核可的是<strong>代理名單</strong>，不是豁免資格；名單外的代理仍須個案報准。下列仍須另辦，不因計畫核可而免除：</p>
            <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
                <li>請假 1 天以上之事先報備（報備 ≠ 同意）</li>
                <li>連續 5 天以上長假，3 天前書面提出</li>
                <li>連續 3 天以上無法執勤，函報台電核定</li>
                <li>職安人員代理之事先報准與書面同意</li>
            </ul>
            ${h("不管誰請假都要守")}
            <ul class="list-disc space-y-1 pl-5 text-sm text-stone-700">
                <li>不得同時全部差假，平日至少 <strong>2 人</strong>駐守（7.6.8）</li>
                <li>假日／超時出勤至少 1 名駐地人員（文書除外），須具甲種職安業務主管以上（7.3.9）</li>
                <li>停留點、隱蔽部分、影響結構安全部分須全程監督，不得以未上班推諉（7.6.11）</li>
            </ul>
            ${h("罰則")}${fines}
            <p class="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">職安代理路線A（≤7天）與路線B（≤5天）<strong>可同月合併使用、分開計算</strong>（115/09/22 確認）；惟輔導要點十一(七)「每月累計逾7天應更換原職安人員」未區分路線，合計逾 7 天的月份宜在公文寫明兩路線各用幾天。監造主任請假由<strong>公司其他符合主任資格之人員</strong>代理（115/09/22 確認）：代理人不得跨越其他標案（7.4.1），宜由本契約其他案主任級人員支援（7.3.1.2.14）或未派駐人員擔任，並事先列入出勤配置計畫代理對照表附資格文件；每月不逾 10 日，連續 3 天以上函報核定。</p>
            <p class="mt-2 text-xs text-stone-400">依據：工作說明書 7.2、7.4.2、7.6.2～7.6.4、7.6.8、7.3.9、11.5.1.1.2、13.6、13.7；技術服務契約「工作安全與衛生」附件；承攬商安全衛生輔導要點十一、二十四及罰款標準（114.10.23）。確認事項：工地負責人＝監造主任、互為代理以出勤配置計畫預先核定、職安代理兩路線可同月合併、監造主任由公司其他符合資格人員代理（115/09/22）。</p>
        `
    });
}

/* 四塊洞察只在「共同項目」分頁呈現。
 *
 * 它們統計的是【全案合計】，不屬於任何單一案；掛在四個案別分頁上
 * 每切一次就重複一次，會把該案自己的內容擠下去。共同項目本來就是
 * 跨案的那一頁，放這裡才是它們該在的位置。
 *
 * 因為是全案合計而非共同項目自身的數字，標題列必須標明，
 * 否則「被阻斷 4 項」會被誤讀成共同項目有 4 項（實際共通 3、觀音中大 1）。
 *
 * 案別分頁不重複這四塊，但該案若有阻斷或逾期，仍會在區段計數列
 * 顯示一格提示，避免資訊消失。 */
function renderInsights() {
    if (!insightsRoot) return;
    if (state.activeSection !== "common") {
        insightsRoot.innerHTML = "";
        return;
    }
    insightsRoot.innerHTML = [
        `<p class="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">以下四項為<span class="text-stone-600">全案合計</span>，非僅共同項目</p>`,
        renderBlockedPanel(),
        renderOverduePanel(),
        renderStateBar(),
        renderFinePanel(),
        `<p class="px-2 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">共通規定</p>`,
        renderLeavePanel()
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

/* ==================================================================
 * 觀音中大進駐後週期列管（2026-09-15）
 *
 * 共通清單原本把週期工作放在「待觸發」，但觀音中大已於09/14實際
 * 派駐，這些工作已不能再藏在待觸發群組。此區依瀏覽日自動滾動
 * 本週、每月5日、季報及每3個月節點；完成、送件、核定仍須人工
 * 回填，不因日期滾動而自動視為完成。
 * ================================================================== */
function dayStart(value = new Date()) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value, days) {
    const result = new Date(value);
    result.setDate(result.getDate() + days);
    return result;
}

function rocDate(value) {
    return `${value.getFullYear() - 1911}/${String(value.getMonth() + 1).padStart(2, "0")}/${String(value.getDate()).padStart(2, "0")}`;
}

function rocMonth(value) {
    return `${value.getFullYear() - 1911}年${value.getMonth() + 1}月`;
}

function currentWeekWindow(today) {
    const offsetFromMonday = (today.getDay() + 6) % 7;
    const monday = addDays(today, -offsetFromMonday);
    const sunday = addDays(monday, 6);
    return `${rocDate(monday)}–${rocDate(sunday)}`;
}

function monthlyFifthWindow(today) {
    const due = new Date(today.getFullYear(), today.getMonth() + (today.getDate() > 5 ? 1 : 0), 5);
    const reportMonth = new Date(due.getFullYear(), due.getMonth() - 1, 1);
    return {
        due,
        reportMonth: rocMonth(reportMonth),
        rosterMonth: rocMonth(due)
    };
}

function nextFixedMonthDate(today, months, dayMode) {
    for (let offset = 0; offset <= 12; offset += 1) {
        const cursor = new Date(today.getFullYear(), today.getMonth() + offset, 1);
        if (!months.includes(cursor.getMonth() + 1)) continue;
        const candidate = dayMode === "end"
            ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
            : new Date(cursor.getFullYear(), cursor.getMonth(), dayMode);
        if (candidate >= today) return candidate;
    }
    return today;
}

function nextQuarterWasteDue(today) {
    for (let offset = 0; offset <= 4; offset += 1) {
        const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3 + (offset * 3);
        const quarterEnd = new Date(today.getFullYear(), quarterStartMonth + 3, 0);
        const due = addDays(quarterEnd, 10);
        if (due >= today) return { quarterEnd, due };
    }
    return { quarterEnd: today, due: today };
}

function nextInternalAudit(today) {
    const deployment = new Date(2026, 8, 14);
    let candidate = new Date(deployment);
    candidate.setMonth(candidate.getMonth() + 3);
    while (candidate < today) candidate.setMonth(candidate.getMonth() + 3);
    return candidate;
}

function guanyinPeriodicGroups() {
    const today = dayStart();
    const week = currentWeekWindow(today);
    const monthly = monthlyFifthWindow(today);
    const ecologyG = nextFixedMonthDate(today, [2, 5, 8, 11], "end");
    const ecologySelf = nextFixedMonthDate(today, [3, 6, 9, 12], 15);
    const waste = nextQuarterWasteDue(today);
    const audit = nextInternalAudit(today);
    const halfMonth = today.getDate() <= 15 ? `${rocMonth(today)}上半月` : `${rocMonth(today)}下半月`;
    const common = { owner: "巍耀分派／巍耀覆核" };

    return [
        {
            key: "daily", label: "每日", count: 4, tone: "emerald", open: true,
            window: `今日 ${rocDate(today)}`,
            items: [
                { ...common, status: "active", task: "差勤簽到退", due: "上下班1小時內完成", evidence: "簽到退紀錄、異常說明", fine: "未到場5,000/人日；不實5,000/人次", basis: "工作說明書7.6.1／7.6.12" },
                { ...common, status: "active", task: "監造日報／派駐工作紀錄", due: "逐日依實際派駐工作填報", evidence: "人員、時間、工作內容、照片與異常", fine: "紀錄不實依契約處理", basis: "工作說明書4.2.8／進場後總控" },
                { ...common, status: "trigger", task: "施工日誌審查", due: "施工標開工後，每日或次日審查", evidence: "施工日誌、審查簽章、退補紀錄", fine: "2,000/日", basis: "罰則13.5" },
                { ...common, status: "trigger", task: "CCTV即時影像抽看", due: "施工標開工後，每日至少1次", evidence: "抽看時間、畫面截圖、異常處置", fine: "依安衛罰款標準", basis: "工作說明書9.23.8" }
            ]
        },
        {
            key: "weekly", label: "每週", count: 2, tone: "teal", open: true,
            window: `本週 ${week}`,
            items: [
                { ...common, status: "trigger", task: "監造週報", due: "施工標開工後，每週遞交前一週成果", evidence: "週報、送件或收件紀錄", fine: "2,000/日", basis: "罰則13.5" },
                { ...common, status: "trigger", task: "工安／環境保護抽查", due: "施工標開工後：工安每週至少5次；環保每週至少1次", evidence: "抽查表、照片、缺失改善閉環", fine: "2,000/日", basis: "工作說明書4.2.2" }
            ]
        },
        {
            key: "halfmonth", label: "每半月", count: 2, tone: "sky", open: true,
            window: `${halfMonth}窗口（日期依通知）`,
            items: [
                { ...common, status: "trigger", task: "施工協調會／工進會議", due: "施工標開工後每半個月1次", evidence: "議程、簽到、紀錄、決議追蹤", fine: "2,000/次", basis: "工作說明書4.1.28" },
                { ...common, status: "setup", statusLabel: "10/14前建置", task: "PMIS半月報", due: "PMIS須於進場一個月內建置；其後每半月更新", evidence: "建置／教育訓練紀錄、PMIS匯出、估驗附件", fine: "契約附件義務", basis: "服務建議書／起始會議確認" }
            ]
        },
        {
            key: "monthly", label: "每月", count: 6, tone: "amber", open: true,
            window: `最近共同期限 ${rocDate(monthly.due)}`,
            items: [
                { ...common, status: "active", task: `${monthly.reportMonth}工作月報`, due: `${rocDate(monthly.due)}前`, evidence: "月報、函文與收件證明", fine: "5,000/日", basis: "工作說明書4.2.8／契約9-9" },
                { ...common, status: "active", task: `${monthly.rosterMonth}出勤配置計畫`, due: `${rocDate(monthly.due)}前`, evidence: "排班、人員與車輛配置、台電核可", fine: "2,000/日", basis: "工作說明書7.3.3" },
                { ...common, status: "active", task: `${monthly.reportMonth}差勤統計及簽到表影本`, due: `${rocDate(monthly.due)}前`, evidence: "工時統計、簽到退影本、請假異常", fine: "未到場5,000/人日", basis: "工作說明書7.6.1／7.6.12" },
                { ...common, status: "trigger", task: "施工標案受罰一覽表", due: `施工標開工後，${rocDate(monthly.due)}前；事實發生3日內先開立`, evidence: "受罰表、通知與改善追蹤", fine: "2,000/次", basis: "工作說明書4.1.32" },
                { ...common, status: "trigger", task: "土方運送證明文件彙整", due: "施工標開工後，每月併工作月報", evidence: "運送憑證、流向勾稽、月報附件", fine: "2,000/次", basis: "工作說明書4.1.36" },
                { ...common, status: "trigger", task: "每月估驗請款／估驗計價審核", due: "依廠商提送；審核期限為次日+7工作天", evidence: "估驗明細、審核表、收送件紀錄", fine: "千分之一/日", basis: "工作說明書4.1.19／11.5" }
            ]
        },
        {
            key: "quarterly", label: "每季／每3個月", count: 4, tone: "violet", open: true,
            window: `最近節點 ${rocDate(ecologySelf)}`,
            items: [
                { ...common, status: "confirm", task: "生態檢核自評表（表5）", due: `${rocDate(ecologySelf)}前（3／6／9／12月中旬）；先取得本季適用性判定`, evidence: "台電書面判定、表5、照片、送件紀錄", fine: "2,000/日", basis: "工作說明書4.2.3" },
                { ...common, status: "trigger", task: "生態檢核抽查（表G）", due: `施工標開工後；最近 ${rocDate(ecologyG)}前`, evidence: "表G、現場照片、改善追蹤", fine: "2,000/次", basis: "工作說明書4.2.3" },
                { ...common, status: "trigger", task: "事業廢棄物妥善清理文件督導", due: `施工標開工後；${rocDate(waste.quarterEnd)}季結、${rocDate(waste.due)}前完成`, evidence: "清運聯單、去向證明、季報", fine: "2,000/次", basis: "工作說明書4.2.1" },
                { ...common, status: "confirm", task: "內部稽核", due: `首期暫排 ${rocDate(audit)}；起算基準依核定監造計畫確認`, evidence: "稽核計畫、查核紀錄、矯正閉環", fine: "可暫停估驗款", basis: "工作說明書3.5.17.8" }
            ]
        },
        {
            key: "annual", label: "每年／個人週期", count: 3, tone: "stone", open: false,
            window: "先建名冊與年度排程",
            items: [
                { ...common, status: "schedule", task: "技術專刊", due: "每年1篇；實際日期待排", evidence: "年度題目、撰稿進度、送件紀錄", fine: "2,000/日", basis: "工作說明書4.2.7.2" },
                { ...common, status: "trigger", task: "拌和廠驗廠及年度品質查驗", due: "有供料拌和廠後，每年至少1次", evidence: "驗廠／品質查驗紀錄、改善閉環", fine: "2,000/次", basis: "工作說明書3.5.17.13" },
                { ...common, status: "active", task: "在職訓練、定期健檢及尿液採驗", due: "依人員、職類及證照週期列管", evidence: "人員到期名冊、訓練／健檢／採驗證明", fine: "依職安及採驗規定", basis: "工作說明書7.3.6／9.18及相關規則" }
            ]
        }
    ];
}

const PERIODIC_TONES = {
    emerald: ["border-emerald-200", "bg-emerald-50", "text-emerald-800"],
    teal: ["border-teal-200", "bg-teal-50", "text-teal-800"],
    sky: ["border-sky-200", "bg-sky-50", "text-sky-800"],
    amber: ["border-amber-200", "bg-amber-50", "text-amber-800"],
    violet: ["border-violet-200", "bg-violet-50", "text-violet-800"],
    stone: ["border-stone-200", "bg-stone-50", "text-stone-700"]
};

const PERIODIC_STATUS = {
    active: ["已啟動", "border-emerald-200 bg-emerald-50 text-emerald-800"],
    setup: ["建置中", "border-sky-200 bg-sky-50 text-sky-800"],
    confirm: ["適用性確認", "border-amber-200 bg-amber-50 text-amber-800"],
    schedule: ["排程待定", "border-violet-200 bg-violet-50 text-violet-800"],
    trigger: ["待施工開工／提送", "border-stone-300 bg-stone-100 text-stone-700"]
};

function renderGuanyinPeriodicControl() {
    const groups = guanyinPeriodicGroups();
    const items = groups.flatMap((group) => group.items);
    const total = items.length;
    const activeCount = items.filter((item) => ["active", "setup"].includes(item.status)).length;
    const waitingCount = total - activeCount;
    return `
        <section class="mt-6 overflow-hidden rounded-[24px] border border-teal-200 bg-teal-50/50">
            <div class="border-b border-teal-200 bg-gradient-to-r from-teal-900 to-teal-700 px-5 py-5 text-white">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p class="text-xs font-bold uppercase tracking-[0.16em] text-teal-100">115/09/14進駐後生效</p>
                        <h4 class="mt-1 text-xl font-bold">觀音中大週期工作列管</h4>
                        <p class="mt-2 max-w-3xl text-sm leading-relaxed text-teal-50">共${total}項週期工作。監造派駐不等於施工標開工；已啟動、適用性待確認與待施工觸發分開列示，完成、送件與核定仍須回填證據。</p>
                    </div>
                    <div class="flex flex-wrap gap-2 text-xs font-bold">
                        <span class="rounded-full bg-white/15 px-3 py-1.5">現在啟動／建置 ${activeCount}</span>
                        <span class="rounded-full bg-white/15 px-3 py-1.5">待確認／觸發 ${waitingCount}</span>
                        <span class="rounded-full bg-white/15 px-3 py-1.5">總計 ${total}</span>
                    </div>
                </div>
            </div>
            <div class="space-y-3 p-4 lg:p-5">
                ${groups.map((group) => {
                    const tone = PERIODIC_TONES[group.tone] || PERIODIC_TONES.stone;
                    return `
                        <details class="overflow-hidden rounded-2xl border ${tone[0]} bg-white/90" ${group.open ? "open" : ""}>
                            <summary class="flex cursor-pointer flex-wrap items-center justify-between gap-2 ${tone[1]} px-4 py-3">
                                <span class="font-bold ${tone[2]}">${escapeHtml(group.label)}列管</span>
                                <span class="flex flex-wrap items-center gap-2">
                                    <span class="text-xs font-semibold ${tone[2]}">${escapeHtml(group.window)}</span>
                                    <span class="pill border-white/70 bg-white ${tone[2]}">${group.count}項</span>
                                </span>
                            </summary>
                            <div class="grid grid-cols-1 gap-3 p-4 xl:grid-cols-2">
                                ${group.items.map((item) => {
                                    const status = PERIODIC_STATUS[item.status] || PERIODIC_STATUS.confirm;
                                    return `
                                    <article class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                                        <div class="flex flex-wrap items-start justify-between gap-2">
                                            <h5 class="font-bold leading-snug text-stone-800">${escapeHtml(item.task)}</h5>
                                            <span class="pill ${status[1]}">${escapeHtml(item.statusLabel || status[0])}</span>
                                        </div>
                                        <p class="mt-3 text-sm font-semibold text-teal-800">本期：${escapeHtml(item.due)}</p>
                                        <p class="mt-2 text-sm text-stone-600">負責：${escapeHtml(item.owner)}</p>
                                        <p class="mt-1 text-sm text-stone-600">留痕：${escapeHtml(item.evidence)}</p>
                                        <p class="mt-2 text-xs leading-relaxed text-stone-500">依據：${escapeHtml(item.basis)}｜風險：${escapeHtml(item.fine)}</p>
                                    </article>
                                `;
                                }).join("")}
                            </div>
                        </details>
                    `;
                }).join("")}
            </div>
        </section>
    `;
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
    const periodicControl = section.key === "guanyin" ? renderGuanyinPeriodicControl() : "";
    // 四塊洞察只在共同項目呈現；本案若有阻斷或逾期，仍在此補一格，
    // 讓該案分頁不會因為不重複面板而漏掉自己的風險。
    const blockedCount = section.counts?.blocked || 0;
    const overdueCount = section.counts?.overdue || 0;
    const extraCount = blockedCount || overdueCount
        ? `<div class="rounded-2xl bg-rose-100 p-3 text-center text-rose-900"><p class="text-xs">${overdueCount ? "⚠️ 逾期" : "🔴 阻斷"}</p><p class="text-xl font-bold">${overdueCount || blockedCount}</p></div>`
        : "";
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
                <div class="grid min-w-[260px] ${extraCount ? "grid-cols-4" : "grid-cols-3"} gap-2">
                    <div class="rounded-2xl bg-emerald-50 p-3 text-center text-emerald-800"><p class="text-xs">已啟動</p><p class="text-xl font-bold">${section.counts?.active || 0}</p></div>
                    <div class="rounded-2xl bg-stone-100 p-3 text-center text-stone-700"><p class="text-xs">待觸發</p><p class="text-xl font-bold">${section.counts?.pending || 0}</p></div>
                    <div class="rounded-2xl bg-rose-50 p-3 text-center text-rose-800"><p class="text-xs">重大</p><p class="text-xl font-bold">${section.counts?.major || 0}</p></div>
                    ${extraCount}
                </div>
            </div>
            <div class="mt-4 rounded-2xl border border-stone-200 bg-white/70 px-4 py-3 text-sm font-bold text-stone-700">${renderRiskCounts(section.counts)}</div>
            ${staffing}
            ${periodicControl}

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
    renderAnchors();
    renderSections();      // 會把 state.activeSection 正規化
    renderInsights();      // 故須在其後，才知道目前在哪一頁
    renderCaseOverview();  // 同理：卡片要標示目前選中的案
}

async function init() {
    try {
        const response = await fetch("./taipower_4in1_audit.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`無法讀取資料檔：${response.status}`);
        state.payload = applyConfirmedAuditOverrides(await response.json());
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
