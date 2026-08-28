(function () {
  const sets = window.QUIZ_SETS || [];
  const storageKey = id => `tpc4in1-training:v1:${id}`;
  const load = id => {
    try { return JSON.parse(localStorage.getItem(storageKey(id))) || {}; }
    catch (_) { return {}; }
  };
  const save = (id, value) => localStorage.setItem(storageKey(id), JSON.stringify(value));
  const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const optionOrder = (id, qi, length) => {
    let seed = Array.from(`${id}:${qi}`).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
    const order = Array.from({length}, (_, index) => index);
    for (let i = length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  };

  function renderIndex() {
    const grid = document.querySelector("#courseGrid");
    const totalMinutes = sets.reduce((sum, item) => sum + item.minutes, 0);
    const totalQuestions = sets.reduce((sum, item) => sum + item.questions.length, 0);
    const completed = sets.filter(item => Number.isFinite(load(item.id).score)).length;
    document.querySelector("#docCount").textContent = sets.length;
    document.querySelector("#hourCount").textContent = `${totalMinutes / 60} 小時`;
    document.querySelector("#questionCount").textContent = totalQuestions;
    document.querySelector("#completeCount").textContent = `${completed}/${sets.length}`;
    grid.innerHTML = sets.map(item => {
      const state = load(item.id);
      const hasScore = Number.isFinite(state.score);
      const passed = hasScore && state.score >= 80;
      const status = hasScore ? `最近成績 ${state.score} 分・${passed ? "合格" : "待加強"}` : "尚未完成測驗";
      return `<article class="course-card">
        <div class="card-top"><span class="doc-no">附件 ${item.no}</span><span class="duration">${item.minutes} 分鐘・${item.questions.length} 題</span></div>
        <h2>${esc(item.title)}</h2><p class="short">${esc(item.short)}</p>
        <p class="focus">${esc(item.focus)}</p><p class="source-name">${esc(item.source)}</p>
        <a class="btn primary" href="${encodeURI(item.file)}">開始測驗 <span aria-hidden="true">→</span></a>
        <div class="status ${passed ? "pass" : ""}">${status}</div>
      </article>`;
    }).join("");
  }

  function renderQuiz(id) {
    const item = sets.find(set => set.id === id);
    if (!item) return;
    document.title = `${item.title}｜12小時職前訓練測驗`;
    document.querySelector("#quizNo").textContent = `附件 ${item.no}`;
    document.querySelector("#quizTitle").textContent = item.title;
    document.querySelector("#quizLede").textContent = item.short;
    document.querySelector("#quizFocus").textContent = item.focus;
    document.querySelector("#quizSource").textContent = item.source;
    document.querySelector("#quizDuration").textContent = `${item.minutes} 分鐘`;
    document.querySelector("#quizCount").textContent = `${item.questions.length} 題`;
    const root = document.querySelector("#questions");
    const saved = load(id);
    const answers = Array.isArray(saved.answers) ? saved.answers : [];
    let submitted = Number.isFinite(saved.score);
    let wrongOnly = false;
    let showAnswers = false;

    root.innerHTML = item.questions.map((q, qi) => {
      const order = optionOrder(id, qi, q.o.length);
      const answerLetter = String.fromCharCode(65 + order.indexOf(q.a));
      return `<article class="question" id="q${qi + 1}" data-index="${qi}">
      <div class="q-head"><span class="q-num">${qi + 1}</span><div style="width:100%"><p class="q-text">${esc(q.q)}</p>
      <div class="options">${order.map((originalIndex, displayIndex) => `<label class="option ${originalIndex === q.a ? "answer-key" : ""}">
        <input type="radio" name="q${qi}" value="${originalIndex}" ${answers[qi] === originalIndex ? "checked" : ""}><span>${String.fromCharCode(65 + displayIndex)}. ${esc(q.o[originalIndex])}</span>
      </label>`).join("")}</div>
      <div class="explain"><strong>答案：${answerLetter}. ${esc(q.o[q.a])}</strong><br>${esc(q.e)}<span class="ref">依據：${esc(q.ref)}</span></div>
      </div></div></article>`;
    }).join("");

    const getAnswers = () => item.questions.map((_, qi) => {
      const checked = root.querySelector(`input[name="q${qi}"]:checked`);
      return checked ? Number(checked.value) : null;
    });
    const updateProgress = () => {
      const current = getAnswers();
      const answered = current.filter(v => v !== null).length;
      document.querySelector("#progressBar").style.width = `${answered / item.questions.length * 100}%`;
      document.querySelector("#progressText").textContent = `已作答 ${answered} / ${item.questions.length}`;
      if (!submitted) save(id, {answers: current});
    };
    const applyResults = () => {
      const current = getAnswers();
      item.questions.forEach((q, qi) => {
        const card = root.querySelector(`[data-index="${qi}"]`);
        card.classList.remove("correct", "wrong");
        card.querySelectorAll(".option").forEach(el => el.classList.remove("user-wrong"));
        if (!submitted) return;
        const correct = current[qi] === q.a;
        card.classList.add(correct ? "correct" : "wrong");
        if (current[qi] !== null && !correct) card.querySelector(`input[value="${current[qi]}"]`).closest(".option").classList.add("user-wrong");
      });
      document.body.classList.toggle("submitted", submitted);
      filterWrong();
    };
    const filterWrong = () => {
      let visible = 0;
      root.querySelectorAll(".question").forEach(card => {
        const hide = wrongOnly && (!submitted || !card.classList.contains("wrong"));
        card.classList.toggle("hidden", hide);
        if (!hide) visible++;
      });
      document.querySelector("#emptyState").style.display = visible ? "none" : "block";
    };
    const submit = () => {
      const current = getAnswers();
      const unanswered = current.findIndex(v => v === null);
      if (unanswered !== -1 && !confirm(`尚有 ${current.filter(v => v === null).length} 題未作答，仍要查看成績嗎？`)) {
        document.querySelector(`#q${unanswered + 1}`).scrollIntoView({block:"center"});
        return;
      }
      const correct = current.reduce((sum, value, qi) => sum + (value === item.questions[qi].a ? 1 : 0), 0);
      const score = Math.round(correct / item.questions.length * 100);
      submitted = true;
      save(id, {answers: current, score, correct, completedAt: new Date().toISOString()});
      applyResults();
      document.querySelector("#scoreBig").textContent = `${score} 分`;
      document.querySelector("#scoreText").textContent = `答對 ${correct} 題／共 ${item.questions.length} 題。${score >= 80 ? "達到建議合格標準。" : "建議複習解析後重新作答。"}`;
      document.querySelector("#resultModal").classList.add("open");
      document.querySelector("#closeModal").focus();
    };
    const reset = () => {
      if (!confirm("確定清除本頁答案與成績，重新作答？")) return;
      localStorage.removeItem(storageKey(id));
      location.reload();
    };

    root.addEventListener("change", updateProgress);
    document.querySelector("#submitQuiz").addEventListener("click", submit);
    document.querySelector("#resetQuiz").addEventListener("click", reset);
    document.querySelector("#showAnswers").addEventListener("click", event => {
      showAnswers = !showAnswers;
      document.body.classList.toggle("show-answers", showAnswers);
      event.currentTarget.setAttribute("aria-pressed", String(showAnswers));
      event.currentTarget.textContent = showAnswers ? "隱藏答案" : "顯示答案";
    });
    document.querySelector("#wrongOnly").addEventListener("click", event => {
      wrongOnly = !wrongOnly;
      event.currentTarget.setAttribute("aria-pressed", String(wrongOnly));
      event.currentTarget.textContent = wrongOnly ? "顯示全部" : "只看錯題";
      filterWrong();
    });
    document.querySelector("#closeModal").addEventListener("click", () => document.querySelector("#resultModal").classList.remove("open"));
    document.querySelector("#reviewWrong").addEventListener("click", () => {
      wrongOnly = true;
      document.querySelector("#wrongOnly").setAttribute("aria-pressed", "true");
      document.querySelector("#wrongOnly").textContent = "顯示全部";
      document.querySelector("#resultModal").classList.remove("open");
      filterWrong(); window.scrollTo({top: document.querySelector("#questions").offsetTop - 80});
    });
    document.querySelector("#resultModal").addEventListener("click", event => { if (event.target.id === "resultModal") event.currentTarget.classList.remove("open"); });
    updateProgress();
    applyResults();
  }

  if (document.body.dataset.page === "index") renderIndex();
  if (document.body.dataset.quizId) renderQuiz(document.body.dataset.quizId);
})();
