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

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
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

    summaryGrid.innerHTML = [
        renderStat("已啟動項目", `${summary.active || 0} 項`, "text-teal-700"),
        renderStat("待觸發項目", `${summary.pending || 0} 項`, "text-stone-700"),
        renderStat("重大事項", `${summary.major || 0} 項`, "text-rose-700"),
        renderStat("🔴 紅燈", `${summary.red || 0} 項`, "text-rose-700"),
        renderStat("🟠 橘燈", `${summary.orange || 0} 項`, "text-orange-700"),
        renderStat("🟡 黃燈", `${summary.yellow || 0} 項`, "text-amber-700")
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

function renderPendingItem(item) {
    const manager = item.manager ? ` / 副理：${escapeHtml(item.manager)}` : "";
    const major = item.major ? `<span class="pill border-rose-200 bg-rose-50 text-rose-700">重大</span>` : "";
    return `
        <article class="pending-card rounded-2xl p-4">
            <div class="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p class="text-xs font-bold text-stone-500">${escapeHtml(item.heading || "待觸發")}</p>
                    <h4 class="mt-1 text-base font-bold leading-snug">${escapeHtml(item.task)}</h4>
                </div>
                ${major}
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

function renderSection(section) {
    const activeItems = section.activeItems || [];
    const pendingItems = section.pendingItems || [];
    const note = section.note ? `<p class="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">${escapeHtml(section.note)}</p>` : "";
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
                    <h4 class="text-sm font-bold uppercase tracking-[0.14em] text-stone-500">待觸發項目</h4>
                    <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                        ${pendingItems.length ? pendingItems.map(renderPendingItem).join("") : `<div class="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-semibold text-stone-500">目前無待觸發項目</div>`}
                    </div>
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
 * 進場控制列（由 JS 注入）
 *
 * 這排按鈕原本寫在 taipower_4in1_audit.html 裡，但 Mac mini 上的
 * "sync taoyuan weekly dashboard data" 會用舊樣板重新產生該 html，
 * 每次都把這 58 行刪掉（2026-08-31 08:30 與 13:30 各發生一次）。
 *
 * 該同步從未改動本 .js，因此改由此處注入，可存活於 html 重新產生。
 * 根本解仍是把這段加進 Mac mini 的產生器樣板。
 * ------------------------------------------------------------------ */
(function injectEntryControls() {
    const LINKS = [
        { date: "9/1",  label: "觀音中大監造進場總控", href: "./taipower_4in1_guanyin_entry.html",   aria: "開啟觀音中大案9月1日監造進場總控" },
        { date: "D-1",  label: "監造派駐放行看板",     href: "./taipower_4in1_entry_release.html",   aria: "開啟觀音中大案D-1監造派駐放行看板" },
        { date: "表單", label: "監造進場表單中心",     href: "./taipower_4in1_entry_forms.html",     aria: "開啟觀音中大案監造進場表單中心" },
        { date: "請款", label: "勞務請款列管",         href: "./taipower_4in1_billing_tracker.html", aria: "開啟委託監造勞務請款列管" }
    ];

    function addStyles() {
        if (document.getElementById("entryControlStyles")) return;
        const style = document.createElement("style");
        style.id = "entryControlStyles";
        style.textContent = `
        .entry-control-link {
            display: inline-flex;
            align-items: center;
            gap: 0.65rem;
            min-height: 44px;
            border: 1px solid rgba(31, 118, 110, 0.24);
            border-radius: 9999px;
            padding: 0.6rem 0.95rem 0.6rem 0.65rem;
            color: #155e57;
            background: linear-gradient(135deg, rgba(232, 244, 241, 0.98), rgba(255, 255, 255, 0.94));
            box-shadow: 0 8px 20px rgba(31, 118, 110, 0.1);
            font-size: 0.875rem;
            font-weight: 700;
            text-decoration: none;
            transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .entry-control-link:hover {
            transform: translateY(-1px);
            box-shadow: 0 11px 24px rgba(31, 118, 110, 0.15);
        }
        .entry-control-link:focus-visible {
            outline: 3px solid rgba(31, 118, 110, 0.35);
            outline-offset: 3px;
        }
        .entry-control-date {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 2.8rem;
            min-height: 2rem;
            border-radius: 9999px;
            color: white;
            background: #1f766e;
            font-size: 0.75rem;
            letter-spacing: 0.04em;
        }`;
        document.head.appendChild(style);
    }

    function mount() {
        // html 若已自帶按鈕（例如日後樣板修好了）就不重複注入
        if (document.querySelector(".entry-control-link")) return;

        const heading = document.querySelector("header h1");
        if (!heading || !heading.parentElement) return;

        addStyles();

        const bar = document.createElement("div");
        bar.id = "entryControlBar";
        bar.className = "mt-4 flex flex-wrap gap-2";

        LINKS.forEach(({ date, label, href, aria }) => {
            const a = document.createElement("a");
            a.className = "entry-control-link";
            a.href = href;
            a.setAttribute("aria-label", aria);

            const badge = document.createElement("span");
            badge.className = "entry-control-date";
            badge.textContent = date;

            const text = document.createElement("span");
            text.textContent = label;

            const arrow = document.createElement("span");
            arrow.setAttribute("aria-hidden", "true");
            arrow.textContent = "→";

            a.append(badge, text, arrow);
            bar.appendChild(a);
        });

        heading.parentElement.appendChild(bar);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
    } else {
        mount();
    }
})();
