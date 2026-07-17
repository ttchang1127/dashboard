const DEFAULT_GROUPS = ["鎧峻組", "宋博組", "巍耀組", "孝智組", "囿任組"];
const GROUP_COLORS = {
    "鎧峻組": "bg-orange-50 text-orange-700 border-orange-200",
    "宋博組": "bg-sky-50 text-sky-700 border-sky-200",
    "巍耀組": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "孝智組": "bg-amber-50 text-amber-700 border-amber-200",
    "囿任組": "bg-rose-50 text-rose-700 border-rose-200"
};

const state = {
    groups: [...DEFAULT_GROUPS],
    weeklyRaw: [],
    dataset: [],
    activeTab: "overview",
    meta: null,
    auditSummary: null
};

const weekFilter = document.getElementById("weekFilter");
const groupFilter = document.getElementById("groupFilter");
const searchInput = document.getElementById("searchInput");
const resetBtn = document.getElementById("resetBtn");
const selectAllWeeksBtn = document.getElementById("selectAllWeeksBtn");
const clearWeeksBtn = document.getElementById("clearWeeksBtn");
const topStats = document.getElementById("topStats");
const dataMeta = document.getElementById("dataMeta");
const mainContent = document.getElementById("mainContent");
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const auditSummarySection = document.getElementById("auditSummarySection");
const auditSummaryMeta = document.getElementById("auditSummaryMeta");
const auditSummaryGrid = document.getElementById("auditSummaryGrid");

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function riskToneClass(diff) {
    if (diff <= 0) return "bg-rose-50 text-rose-700 border-rose-200";
    if (diff === 1) return "bg-orange-50 text-orange-700 border-orange-200";
    if (diff <= 3) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function auditItemSortValue(item) {
    const diff = Number(item && item.diff);
    return Number.isFinite(diff) ? diff : 999;
}

function renderAuditItem(item) {
    const manager = item.manager ? ` / 副理：${escapeHtml(item.manager)}` : "";
    const ownerLine = item.owner ? `<p class="mt-1 text-[11px] opacity-75">負責：${escapeHtml(item.owner)}${manager}</p>` : "";
    return `
        <li class="rounded-2xl border ${riskToneClass(item.diff)} px-3 py-3">
            <div class="space-y-1">
                <p class="whitespace-nowrap text-xs font-semibold">${escapeHtml(item.statusLight || "")} ${escapeHtml(item.diffLabel || "")}</p>
                <p class="audit-due-label text-xs leading-snug opacity-80">${escapeHtml(item.dueLabel || "—")}</p>
            </div>
            <p class="mt-1 text-sm font-semibold leading-snug">${escapeHtml(item.task || "未命名項目")}</p>
            ${ownerLine}
        </li>
    `;
}

function normalizeProjectCode(code) {
    return code ? code.toUpperCase().replace(/\s+/g, "") : "";
}

function extractProjectCodes(text) {
    const matches = text.match(/[A-Za-z]{1,4}\d{2,4}(?:-\d{2}[A-Za-z]{0,2})?/g) || [];
    return [...new Set(matches.map(normalizeProjectCode))];
}

function detectDates(text) {
    return [...new Set(text.match(/\d{1,2}\/\d{1,2}/g) || [])];
}

function classifyTask(text) {
    const raw = text.toLowerCase();
    if (/(設計|圖面|預算書圖|簡報|粗估|招標文件|變更設計)/.test(raw)) return "design";
    if (/(監造|查驗|施工|工務會議|駐地|取樣|澆置|鑽井|抽水|鋪築)/.test(raw)) return "supervision";
    if (/(文書|送審|審查|日報|月報|估驗|結算|公文|報告)/.test(raw)) return "docs";
    if (/(會勘|會議|討論|說明會|評選|審查會)/.test(raw)) return "meeting";
    if (/(職安|安衛|金安|督導|稽核|演練|查核|巡檢)/.test(raw)) return "safety";
    return "other";
}

function taskLabel(taskType) {
    const map = {
        design: "設計",
        supervision: "監造",
        docs: "文書審查",
        meeting: "會議會勘",
        safety: "職安查核",
        other: "其他"
    };
    return map[taskType] || "其他";
}

function taskChipClass(taskType) {
    return {
        design: "task-chip-design",
        supervision: "task-chip-supervision",
        docs: "task-chip-docs",
        meeting: "task-chip-meeting",
        safety: "task-chip-safety",
        other: "task-chip-other"
    }[taskType] || "task-chip-other";
}

function parseMemberText(text) {
    if (!text || !text.trim()) return [];
    return text
        .split(/(?=^\d+\.)/m)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => {
            const cleaned = block.replace(/^\d+\./, "").trim();
            const firstLine = cleaned.split("\n")[0].trim();
            let name = firstLine;
            let taskText = cleaned;

            if (firstLine.includes("：")) {
                const parts = firstLine.split(/：(.*)/).filter(Boolean);
                name = (parts[0] || "").trim();
                taskText = `${parts[1] || ""}\n${cleaned.split("\n").slice(1).join("\n")}`.trim();
            } else if (firstLine.includes("-")) {
                const parts = firstLine.split(/-(.*)/).filter(Boolean);
                name = (parts[0] || "").trim();
                taskText = `${parts[1] || ""}\n${cleaned.split("\n").slice(1).join("\n")}`.trim();
            } else {
                taskText = cleaned.split("\n").slice(1).join("\n").trim();
            }

            if (!taskText) taskText = firstLine;

            return {
                name,
                taskText,
                projectCodes: extractProjectCodes(taskText),
                taskType: classifyTask(taskText),
                dates: detectDates(taskText)
            };
        });
}

function buildWeekDataset() {
    return state.weeklyRaw.map((week) => {
        const groups = state.groups.map((groupName) => {
            const members = parseMemberText(week.groups[groupName] || "");
            const projectMap = new Map();

            members.forEach((member) => {
                member.week = week.week;
                member.projectCodes.forEach((code) => {
                    if (!projectMap.has(code)) {
                        projectMap.set(code, {
                            code,
                            groupNames: new Set(),
                            people: new Set(),
                            taskTypes: new Set(),
                            dates: new Set(),
                            snippets: []
                        });
                    }
                    const item = projectMap.get(code);
                    item.groupNames.add(groupName);
                    item.people.add(member.name);
                    item.taskTypes.add(member.taskType);
                    member.dates.forEach((date) => item.dates.add(date));
                    item.snippets.push(member.taskText);
                });
            });

            return {
                groupName,
                members,
                projects: Array.from(projectMap.values()).map((project) => ({
                    code: project.code,
                    groupNames: Array.from(project.groupNames),
                    people: Array.from(project.people),
                    taskTypes: Array.from(project.taskTypes),
                    dates: Array.from(project.dates),
                    summary: project.snippets[0] || ""
                }))
            };
        });

        return { week: week.week, groups };
    });
}

function selectedWeeks() {
    const checked = Array.from(document.querySelectorAll(".week-checkbox:checked")).map((input) => input.value);
    if (checked.length) return checked;
    return state.dataset.length ? [state.dataset[0].week] : [];
}

function selectedGroup() {
    return groupFilter.value;
}

function searchTerm() {
    return searchInput.value.trim().toLowerCase();
}

function dominantTaskType(taskTypes) {
    if (!taskTypes.length) return "other";
    const counter = taskTypes.reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
    return Object.entries(counter).sort((a, b) => b[1] - a[1])[0][0];
}

function aggregateSelectedGroups() {
    const selected = new Set(selectedWeeks());
    return state.groups.map((groupName) => {
        const memberMap = new Map();
        state.dataset
            .filter((item) => selected.has(item.week))
            .flatMap((item) => item.groups)
            .filter((group) => group.groupName === groupName)
            .forEach((group) => {
                group.members.forEach((member) => {
                    const key = `${groupName}::${member.name}`;
                    if (!memberMap.has(key)) {
                        memberMap.set(key, {
                            name: member.name,
                            groupName,
                            weeks: [],
                            taskTexts: [],
                            projectCodes: new Set(),
                            taskTypes: [],
                            dates: new Set()
                        });
                    }
                    const target = memberMap.get(key);
                    target.weeks.push(member.week);
                    target.taskTexts.push(`[${member.week}]\n${member.taskText}`);
                    member.projectCodes.forEach((code) => target.projectCodes.add(code));
                    target.taskTypes.push(member.taskType);
                    member.dates.forEach((date) => target.dates.add(date));
                });
            });

        return {
            groupName,
            members: Array.from(memberMap.values()).map((member) => ({
                name: member.name,
                groupName: member.groupName,
                weeks: member.weeks,
                taskText: member.taskTexts.join("\n\n"),
                projectCodes: Array.from(member.projectCodes),
                taskType: dominantTaskType(member.taskTypes),
                dates: Array.from(member.dates)
            }))
        };
    });
}

function filteredGroups() {
    const groupName = selectedGroup();
    const search = searchTerm();
    return aggregateSelectedGroups()
        .filter((group) => groupName === "全部" || group.groupName === groupName)
        .map((group) => ({
            ...group,
            members: group.members.filter((member) =>
                !search || `${member.name} ${member.taskText} ${member.projectCodes.join(" ")}`.toLowerCase().includes(search)
            )
        }))
        .filter((group) => group.members.length > 0);
}

function filteredPeople() {
    return filteredGroups()
        .flatMap((group) => group.members)
        .sort((a, b) => a.groupName.localeCompare(b.groupName, "zh-Hant") || a.name.localeCompare(b.name, "zh-Hant"));
}

function filteredProjects() {
    const search = searchTerm();
    const projectMap = new Map();
    filteredGroups().forEach((group) => {
        group.members.forEach((member) => {
            member.projectCodes.forEach((code) => {
                if (!projectMap.has(code)) {
                    projectMap.set(code, {
                        code,
                        groupNames: new Set(),
                        people: new Set(),
                        taskTypes: new Set(),
                        dates: new Set(),
                        snippets: []
                    });
                }
                const project = projectMap.get(code);
                project.groupNames.add(group.groupName);
                project.people.add(member.name);
                project.taskTypes.add(member.taskType);
                member.dates.forEach((date) => project.dates.add(date));
                project.snippets.push(member.taskText);
            });
        });
    });

    return Array.from(projectMap.values())
        .map((project) => ({
            code: project.code,
            groupNames: Array.from(project.groupNames),
            people: Array.from(project.people),
            taskTypes: Array.from(project.taskTypes),
            dates: Array.from(project.dates),
            summary: project.snippets[0] || ""
        }))
        .filter((project) =>
            !search || `${project.code} ${project.summary} ${project.people.join(" ")}`.toLowerCase().includes(search)
        )
        .sort((a, b) => b.people.length - a.people.length || a.code.localeCompare(b.code, "zh-Hant"));
}

function renderTopStats() {
    const people = filteredPeople();
    const projects = filteredProjects();
    const datedTasks = people.filter((person) => person.dates.length > 0).length;
    const cards = [
        { label: "已選週次", value: `${selectedWeeks().length} 週`, tone: "text-orange-700" },
        { label: "累積人員", value: `${people.length} 人`, tone: "text-teal-700" },
        { label: "累積案件", value: `${projects.length} 件`, tone: "text-rose-700" },
        { label: "有時程節點", value: `${datedTasks} 筆`, tone: "text-lime-700" }
    ];
    topStats.innerHTML = cards.map((card) => `
        <div class="summary-card rounded-2xl p-4">
            <p class="text-sm text-stone-500">${card.label}</p>
            <p class="mt-2 text-2xl font-bold ${card.tone}">${card.value}</p>
        </div>
    `).join("");
}

function renderAuditSummary() {
    if (!auditSummarySection || !auditSummaryGrid || !auditSummaryMeta) return;
    const payload = state.auditSummary;
    const projects = payload && Array.isArray(payload.projects) ? payload.projects : [];

    if (!projects.length) {
        auditSummarySection.classList.add("hidden");
        auditSummaryGrid.innerHTML = "";
        auditSummaryMeta.textContent = "";
        return;
    }

    auditSummarySection.classList.remove("hidden");
    const metaPieces = [];
    if (payload.generatedAt) metaPieces.push(`稽核資料更新 ${payload.generatedAt}`);
    if (payload.source) metaPieces.push(`來源 ${payload.source}`);
    auditSummaryMeta.textContent = metaPieces.join("｜");

    auditSummaryGrid.innerHTML = projects.map((project) => {
        const counts = project.riskCounts || {};
        const items = Array.isArray(project.items) ? [...project.items].sort((a, b) => auditItemSortValue(a) - auditItemSortValue(b)) : [];
        const note = project.note ? `<p class="mt-2 text-xs text-stone-500">${escapeHtml(project.note)}</p>` : "";
        const itemBlock = items.length
            ? `
                <ul class="mt-3 space-y-2">
                    ${items.map(renderAuditItem).join("")}
                </ul>
            `
            : `
                <div class="mt-3 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3">
                    <p class="text-sm font-semibold text-stone-700">目前無 D-45 項目</p>
                </div>
            `;

        return `
            <article class="summary-card rounded-[22px] p-4">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <h3 class="text-base font-bold leading-snug">${escapeHtml(project.name)}</h3>
                        <p class="mt-1 text-xs text-stone-500">版本 ${escapeHtml(project.version || "—")}｜稽核日 ${escapeHtml(project.auditDate || "—")}</p>
                    </div>
                    <span class="pill bg-stone-100 text-stone-700 border-stone-200">${escapeHtml(project.itemCount || 0)} 項</span>
                </div>
                <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span class="pill bg-rose-50 text-rose-700 border-rose-200">🔴 ${escapeHtml(counts.red || 0)}</span>
                    <span class="pill bg-orange-50 text-orange-700 border-orange-200">🟠 ${escapeHtml(counts.orange || 0)}</span>
                    <span class="pill bg-amber-50 text-amber-700 border-amber-200">🟡 ${escapeHtml(counts.yellow || 0)}</span>
                    <span class="pill bg-emerald-50 text-emerald-700 border-emerald-200">🟢 ${escapeHtml(counts.green || 0)}</span>
                </div>
                ${itemBlock}
                <p class="mt-3 text-xs text-stone-500">提醒清單更新 ${escapeHtml(project.modifiedAt || "—")}</p>
                ${note}
            </article>
        `;
    }).join("");
}

function renderOverview() {
    const groups = filteredGroups();
    const projects = filteredProjects().slice(0, 10);
    const people = filteredPeople();
    const selectedWeekPills = selectedWeeks().map((week) => `<span class="pill bg-stone-100 text-stone-700">${week}</span>`).join("");

    const taskTypeCount = people.reduce((acc, person) => {
        acc[person.taskType] = (acc[person.taskType] || 0) + 1;
        return acc;
    }, {});

    const taskSummary = Object.entries(taskTypeCount)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `<span class="pill ${taskChipClass(type)}">${taskLabel(type)} ${count}</span>`)
        .join("");

    return `
        <section class="space-y-6">
            <div class="panel rounded-[24px] p-5">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 class="text-2xl font-bold">累積週次視角</h2>
                        <p class="mt-1 text-stone-500">可同時勾多週，以下內容會自動累積統計。</p>
                    </div>
                    <div class="flex flex-wrap gap-2">${selectedWeekPills}</div>
                </div>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-[1.4fr,0.9fr] gap-6">
                <div class="space-y-4">
                    ${groups.map((group) => {
                        const projectCount = new Set(group.members.flatMap((member) => member.projectCodes)).size;
                        const datedCount = group.members.filter((member) => member.dates.length > 0).length;
                        const topProjects = Array.from(new Set(group.members.flatMap((member) => member.projectCodes))).slice(0, 6);
                        const dominantTask = group.members[0] ? taskLabel(dominantTaskType(group.members.map((member) => member.taskType))) : "尚無資料";
                        return `
                            <div class="panel rounded-[24px] p-5">
                                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div class="inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${GROUP_COLORS[group.groupName]}">${group.groupName}</div>
                                        <h2 class="mt-3 text-2xl font-bold">${group.groupName} 累積總覽</h2>
                                        <p class="mt-1 text-stone-500">主力工作：${dominantTask}</p>
                                    </div>
                                    <div class="grid grid-cols-3 gap-3 min-w-[260px]">
                                        <div class="rounded-2xl bg-stone-50 p-3 text-center"><p class="text-xs text-stone-500">人員</p><p class="mt-1 text-xl font-bold">${group.members.length}</p></div>
                                        <div class="rounded-2xl bg-stone-50 p-3 text-center"><p class="text-xs text-stone-500">案件</p><p class="mt-1 text-xl font-bold">${projectCount}</p></div>
                                        <div class="rounded-2xl bg-stone-50 p-3 text-center"><p class="text-xs text-stone-500">節點</p><p class="mt-1 text-xl font-bold">${datedCount}</p></div>
                                    </div>
                                </div>
                                <div class="mt-4 flex flex-wrap gap-2">
                                    ${topProjects.length ? topProjects.map((code) => `<span class="pill bg-white text-stone-700">${code}</span>`).join("") : `<span class="text-sm text-stone-400">目前尚無案件代碼</span>`}
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
                <div class="space-y-6">
                    <div class="panel rounded-[24px] p-5">
                        <h2 class="text-2xl font-bold">工作類型分布</h2>
                        <div class="mt-4 flex flex-wrap gap-2">${taskSummary || `<span class="text-sm text-stone-400">尚無資料</span>`}</div>
                    </div>
                    <div class="panel rounded-[24px] p-5">
                        <h2 class="text-2xl font-bold">累積熱門案件</h2>
                        <div class="mt-4 space-y-3">
                            ${projects.length ? projects.map((project) => `
                                <div class="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                                    <div class="flex items-start justify-between gap-3">
                                        <button class="project-link text-left" data-project="${project.code}">${project.code}</button>
                                        <span class="text-xs text-stone-500">${project.people.length} 人參與</span>
                                    </div>
                                    <p class="mt-2 text-sm text-stone-600 line-clamp-3">${project.summary}</p>
                                    <div class="mt-3 flex flex-wrap gap-2">
                                        ${project.groupNames.map((name) => `<span class="pill ${GROUP_COLORS[name] || "bg-stone-100 text-stone-700"}">${name}</span>`).join("")}
                                    </div>
                                </div>
                            `).join("") : `<p class="text-sm text-stone-400">查無案件資料。</p>`}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderGroups() {
    const groups = filteredGroups();
    return `
        <section class="space-y-5">
            ${groups.length ? groups.map((group) => {
                const projects = Array.from(new Set(group.members.flatMap((member) => member.projectCodes)));
                return `
                    <div class="panel rounded-[24px] p-5 lg:p-6">
                        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <div class="inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${GROUP_COLORS[group.groupName]}">${group.groupName}</div>
                                <h2 class="mt-3 text-2xl font-bold">${group.groupName}</h2>
                                <p class="mt-1 text-stone-500">案件 ${projects.length} 件，成員 ${group.members.length} 人</p>
                            </div>
                            <div class="max-w-2xl flex flex-wrap gap-2">
                                ${projects.length ? projects.map((code) => `<button class="pill bg-white text-stone-700 border-stone-300" data-project="${code}">${code}</button>`).join("") : `<span class="text-sm text-stone-400">目前尚無案件</span>`}
                            </div>
                        </div>
                        <div class="mt-6 overflow-x-auto">
                            <table class="min-w-full text-left">
                                <thead>
                                    <tr class="border-b border-stone-200 text-sm text-stone-500">
                                        <th class="pb-3 pr-4 font-semibold">成員</th>
                                        <th class="pb-3 pr-4 font-semibold">案件</th>
                                        <th class="pb-3 pr-4 font-semibold">工作類型</th>
                                        <th class="pb-3 pr-4 font-semibold">重要節點</th>
                                        <th class="pb-3 pr-4 font-semibold">涵蓋週次</th>
                                        <th class="pb-3 font-semibold">累積工作摘要</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-stone-100">
                                    ${group.members.map((member) => `
                                        <tr class="align-top">
                                            <td class="py-4 pr-4 font-semibold">${member.name}</td>
                                            <td class="py-4 pr-4">
                                                <div class="flex flex-wrap gap-2">
                                                    ${member.projectCodes.length ? member.projectCodes.map((code) => `<button class="pill bg-stone-100 text-stone-700" data-project="${code}">${code}</button>`).join("") : `<span class="text-sm text-stone-400">未辨識</span>`}
                                                </div>
                                            </td>
                                            <td class="py-4 pr-4"><span class="pill ${taskChipClass(member.taskType)}">${taskLabel(member.taskType)}</span></td>
                                            <td class="py-4 pr-4 text-sm text-stone-600">${member.dates.join("、") || "無"}</td>
                                            <td class="py-4 pr-4 text-sm text-stone-600">${member.weeks.join("、") || "無"}</td>
                                            <td class="py-4 text-sm leading-6 text-stone-700 whitespace-pre-line">${member.taskText}</td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }).join("") : `<div class="panel rounded-[24px] p-6 text-stone-400">查無符合條件的組別資料。</div>`}
        </section>
    `;
}

function renderPeople() {
    const people = filteredPeople();
    return `
        <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            ${people.length ? people.map((person) => `
                <article class="panel rounded-[24px] p-5">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${GROUP_COLORS[person.groupName]}">${person.groupName}</div>
                            <h2 class="mt-3 text-2xl font-bold">${person.name}</h2>
                        </div>
                        <span class="pill ${taskChipClass(person.taskType)}">${taskLabel(person.taskType)}</span>
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2">
                        ${person.projectCodes.length ? person.projectCodes.map((code) => `<button class="pill bg-white text-stone-700 border-stone-300" data-project="${code}">${code}</button>`).join("") : `<span class="text-sm text-stone-400">未辨識案件</span>`}
                    </div>
                    <div class="mt-4 rounded-2xl bg-stone-50 p-4">
                        <p class="text-xs font-semibold tracking-wide text-stone-500">累積工作摘要</p>
                        <p class="mt-2 text-sm leading-6 whitespace-pre-line text-stone-700">${person.taskText}</p>
                    </div>
                    <div class="mt-4 flex items-center justify-between text-sm text-stone-500">
                        <span>案件數 ${person.projectCodes.length}</span>
                        <span>${person.dates.length ? `節點 ${person.dates.join("、")}` : "無時程節點"}</span>
                    </div>
                </article>
            `).join("") : `<div class="panel rounded-[24px] p-6 text-stone-400">查無符合條件的人員資料。</div>`}
        </section>
    `;
}

function renderProjects() {
    const projects = filteredProjects();
    return `
        <section class="space-y-4">
            ${projects.length ? projects.map((project) => `
                <article class="panel rounded-[24px] p-5 lg:p-6">
                    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h2 class="text-2xl font-bold">${project.code}</h2>
                            <p class="mt-2 text-sm text-stone-600">${project.summary}</p>
                        </div>
                        <div class="grid grid-cols-2 gap-3 min-w-[220px]">
                            <div class="rounded-2xl bg-stone-50 p-3 text-center"><p class="text-xs text-stone-500">參與組別</p><p class="mt-1 text-xl font-bold">${project.groupNames.length}</p></div>
                            <div class="rounded-2xl bg-stone-50 p-3 text-center"><p class="text-xs text-stone-500">參與人員</p><p class="mt-1 text-xl font-bold">${project.people.length}</p></div>
                        </div>
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2">
                        ${project.groupNames.map((name) => `<span class="pill ${GROUP_COLORS[name] || "bg-stone-100 text-stone-700"}">${name}</span>`).join("")}
                        ${project.taskTypes.map((type) => `<span class="pill ${taskChipClass(type)}">${taskLabel(type)}</span>`).join("")}
                    </div>
                    <div class="mt-4 grid grid-cols-1 lg:grid-cols-[1fr,1.2fr] gap-4">
                        <div class="rounded-2xl bg-stone-50 p-4">
                            <p class="text-xs font-semibold tracking-wide text-stone-500">參與人員</p>
                            <div class="mt-3 flex flex-wrap gap-2">
                                ${project.people.map((name) => `<span class="pill bg-white text-stone-700">${name}</span>`).join("")}
                            </div>
                        </div>
                        <div class="rounded-2xl bg-stone-50 p-4">
                            <p class="text-xs font-semibold tracking-wide text-stone-500">時程節點</p>
                            <p class="mt-3 text-sm text-stone-700">${project.dates.length ? project.dates.join("、") : "本週未抓到明確日期"}</p>
                        </div>
                    </div>
                </article>
            `).join("") : `<div class="panel rounded-[24px] p-6 text-stone-400">查無符合條件的案件資料。</div>`}
        </section>
    `;
}

function syncTabs() {
    tabButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tab === state.activeTab);
    });
}

function bindProjectJumpers() {
    document.querySelectorAll("[data-project]").forEach((button) => {
        button.addEventListener("click", () => {
            searchInput.value = button.dataset.project;
            state.activeTab = "projects";
            syncTabs();
            renderMain();
        });
    });
}

function renderMain() {
    renderAuditSummary();
    renderTopStats();
    if (state.activeTab === "overview") {
        mainContent.innerHTML = renderOverview();
    } else if (state.activeTab === "groups") {
        mainContent.innerHTML = renderGroups();
    } else if (state.activeTab === "people") {
        mainContent.innerHTML = renderPeople();
    } else {
        mainContent.innerHTML = renderProjects();
    }
    bindProjectJumpers();
}

function initFilters() {
    weekFilter.innerHTML = state.dataset.map((item, index) => `
        <label class="week-option">
            <input class="week-checkbox sr-only" type="checkbox" value="${item.week}" ${index === 0 ? "checked" : ""}>
            <span class="pill cursor-pointer select-none border-stone-300 bg-stone-100 text-stone-700">${item.week}</span>
        </label>
    `).join("");

    groupFilter.innerHTML = `<option value="全部">全部組別</option>${state.groups.map((group) => `<option value="${group}">${group}</option>`).join("")}`;
}

function bindEvents() {
    weekFilter.addEventListener("change", renderMain);
    groupFilter.addEventListener("change", renderMain);
    searchInput.addEventListener("input", renderMain);
    selectAllWeeksBtn.addEventListener("click", () => {
        document.querySelectorAll(".week-checkbox").forEach((input) => {
            input.checked = true;
        });
        renderMain();
    });
    clearWeeksBtn.addEventListener("click", () => {
        document.querySelectorAll(".week-checkbox").forEach((input, index) => {
            input.checked = index === 0;
        });
        renderMain();
    });
    resetBtn.addEventListener("click", () => {
        document.querySelectorAll(".week-checkbox").forEach((input, index) => {
            input.checked = index === 0;
        });
        groupFilter.value = "全部";
        searchInput.value = "";
        state.activeTab = "overview";
        syncTabs();
        renderMain();
    });
    tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            state.activeTab = btn.dataset.tab;
            syncTabs();
            renderMain();
        });
    });
}

function renderMeta() {
    if (!state.meta) {
        dataMeta.textContent = "";
        return;
    }
    const pieces = [];
    if (state.meta.generatedAt) pieces.push(`資料更新 ${state.meta.generatedAt}`);
    if (state.meta.source && state.meta.source.sheetTitle) pieces.push(`來源 ${state.meta.source.sheetTitle}`);
    dataMeta.textContent = pieces.join("｜");
}

async function loadData() {
    const weeklyResponse = await fetch("./taoyuan_weekly_data.json", { cache: "no-store" });
    if (!weeklyResponse.ok) {
        throw new Error(`無法讀取資料檔：${weeklyResponse.status}`);
    }
    const payload = await weeklyResponse.json();
    state.groups = payload.groups && payload.groups.length ? payload.groups : [...DEFAULT_GROUPS];
    state.weeklyRaw = payload.weeks || [];
    state.dataset = buildWeekDataset();
    state.meta = {
        generatedAt: payload.generatedAt || "",
        source: payload.source || null
    };

    try {
        const auditResponse = await fetch("./project_audit_summary.json", { cache: "no-store" });
        if (auditResponse.ok) {
            state.auditSummary = await auditResponse.json();
        } else {
            state.auditSummary = null;
        }
    } catch (_error) {
        state.auditSummary = null;
    }
}

async function init() {
    try {
        await loadData();
        initFilters();
        bindEvents();
        syncTabs();
        renderMeta();
        renderMain();
    } catch (error) {
        topStats.innerHTML = "";
        dataMeta.textContent = "資料載入失敗";
        mainContent.innerHTML = `<div class="panel rounded-[24px] p-6 text-red-600">資料載入失敗：${error.message}</div>`;
    }
}

init();
