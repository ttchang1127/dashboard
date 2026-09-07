/* 職務別測驗 — 受訓人資料輸入與訓練紀錄表列印
 *
 * 用途：測驗完成後列印一份可簽名的紙本，收集後併入12小時職前訓練的證據卷宗。
 *
 * 設計說明：
 * - 成績直接讀 app.js 寫入 localStorage 的 {answers, score, correct, completedAt}，
 *   不自行計算，避免兩套算法不一致。
 * - 未按「查看成績」前不得列印，否則紀錄表上的成績會是空的。
 * - 標題用「單元測驗紀錄表」而非「完訓證明」：本表只證明該員完成此一單元測驗，
 *   12小時職前訓練仍須併同課程表、簽到表、講師資料等一併留存（工作說明書7.3.6）。
 * - 作答明細採 A4 雙欄排版，並省略「答對題重印正解」，以壓低張數。
 * - 選項顯示字母是 app.js 依 (quizId, 題序) 決定性洗牌後的順序，這裡以相同演算法
 *   還原，確保紙本上的 A/B/C/D 與受訓人當時在螢幕上看到的一致。
 * - 本檔自帶樣式，不修改 quiz.css。
 */
(function () {
  var TRAINEE_KEY = "tpc4in1-training:trainee";
  var PASS = 80;
  var COMPANY = "世合工程技術顧問股份有限公司";
  var PROJECT = "北區施工處『南港P/S改建工程(土建統包)』等4案委託監造技術服務工作";

  var quizId = document.body.dataset.quizId;
  if (!quizId) return;

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c];
    });
  }

  function readSet() {
    var sets = window.QUIZ_SETS || [];
    for (var i = 0; i < sets.length; i++) if (sets[i].id === quizId) return sets[i];
    return null;
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem("tpc4in1-training:v2:" + quizId)) || {}; }
    catch (e) { return {}; }
  }

  function readTrainee() {
    try { return JSON.parse(localStorage.getItem(TRAINEE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function saveTrainee(t) {
    try { localStorage.setItem(TRAINEE_KEY, JSON.stringify(t)); } catch (e) {}
  }

  /* 與 app.js 的 optionOrder 完全相同：同一 quizId、同一題序必得同一顯示順序。
     兩處若不一致，紙本的選項字母就會對不上受訓人看過的畫面。 */
  function optionOrder(id, qi, length) {
    var key = id + ":" + qi;
    var seed = 2166136261;
    for (var k = 0; k < key.length; k++) seed = (seed * 31 + key.charCodeAt(k)) >>> 0;
    var order = [];
    for (var n = 0; n < length; n++) order.push(n);
    for (var i = length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      var j = seed % (i + 1);
      var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    return order;
  }

  /* 中華民國年月日 */
  function rocDate(d) {
    return "中華民國 " + (d.getFullYear() - 1911) + " 年 " +
      String(d.getMonth() + 1).padStart(2, "0") + " 月 " +
      String(d.getDate()).padStart(2, "0") + " 日";
  }
  function stamp(d) {
    return (d.getFullYear() - 1911) + "/" +
      String(d.getMonth() + 1).padStart(2, "0") + "/" +
      String(d.getDate()).padStart(2, "0") + " " +
      String(d.getHours()).padStart(2, "0") + ":" +
      String(d.getMinutes()).padStart(2, "0");
  }

  function addStyles() {
    if (document.getElementById("roleCertStyles")) return;
    var st = document.createElement("style");
    st.id = "roleCertStyles";
    st.textContent = [
      /* ---- 螢幕：受訓人資料面板 ---- */
      ".trainee-box{margin:0 0 1.25rem;padding:1.1rem 1.25rem;border:1px solid rgba(31,118,110,.24);",
      "border-radius:18px;background:linear-gradient(135deg,rgba(232,244,241,.55),rgba(255,255,255,.35));}",
      ".trainee-box h2{margin:0 0 .3rem;font-size:1rem;font-weight:800;}",
      ".trainee-box .hint{margin:0 0 .85rem;font-size:.82rem;opacity:.75;line-height:1.6;}",
      ".trainee-fields{display:flex;flex-wrap:wrap;gap:.75rem;align-items:flex-end;}",
      ".trainee-field{display:flex;flex-direction:column;gap:.3rem;min-width:9.5rem;flex:1 1 9.5rem;}",
      ".trainee-field label{font-size:.78rem;font-weight:700;opacity:.8;}",
      ".trainee-field input{min-height:42px;padding:.45rem .7rem;border:1px solid rgba(120,120,120,.35);",
      "border-radius:10px;font-size:.95rem;font-family:inherit;background:rgba(255,255,255,.9);color:#1c1c1c;}",
      ".trainee-field input:focus-visible{outline:3px solid rgba(31,118,110,.35);outline-offset:1px;}",
      ".trainee-actions{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;}",
      ".trainee-status{font-size:.82rem;font-weight:700;}",
      ".trainee-status.ready{color:#0f766e;}",
      ".trainee-status.wait{color:#b45309;}",
      ".trainee-opt{display:flex;align-items:center;gap:.4rem;font-size:.82rem;font-weight:700;",
      "margin:.7rem 0 0;flex-basis:100%;}",
      ".trainee-opt input{width:18px;height:18px;accent-color:#0f766e;}",
      ".trainee-opt .sub{font-weight:400;opacity:.7;}",
      /* ---- 紀錄表：螢幕上隱藏 ---- */
      "#certSheet{display:none;}",
      /* ---- 列印 ---- */
      "@media print{",
      "  @page{size:A4 portrait;margin:14mm 16mm;}",
      "  body>*{display:none !important;}",
      "  body #certSheet{display:block !important;}",
      "  #certSheet{color:#000;background:#fff;font-family:\"Microsoft JhengHei\",\"PingFang TC\",sans-serif;font-size:11pt;line-height:1.7;}",
      "  #certSheet .c-company{font-size:11pt;letter-spacing:.08em;}",
      "  #certSheet h1{font-size:16pt;text-align:center;margin:.4rem 0 .2rem;letter-spacing:.06em;}",
      "  #certSheet .c-sub{text-align:center;font-size:10pt;margin:0 0 .2rem;}",
      "  #certSheet .c-basis{text-align:center;font-size:9pt;margin:0 0 1rem;}",
      "  #certSheet table{width:100%;border-collapse:collapse;margin-bottom:1rem;}",
      "  #certSheet th,#certSheet td{border:1px solid #000;padding:6pt 8pt;font-size:10.5pt;vertical-align:middle;}",
      "  #certSheet th{width:22%;background:#f0f0f0;text-align:left;font-weight:700;}",
      "  #certSheet .c-score{font-size:14pt;font-weight:800;}",
      "  #certSheet .c-sign td{height:26mm;vertical-align:top;font-size:10pt;}",
      "  #certSheet .c-note{font-size:9pt;line-height:1.65;border:1px solid #000;padding:8pt;}",
      "  #certSheet .c-note b{font-size:9.5pt;}",
      "  #certSheet .c-foot{margin-top:.6rem;font-size:8.5pt;text-align:right;}",
      /* ---- 作答明細（雙欄）---- */
      "  #certSheet .c-detail{break-before:page;page-break-before:always;}",
      "  #certSheet .d-head{font-size:10pt;font-weight:800;border-bottom:1.2pt solid #000;",
      "    padding-bottom:3pt;margin:0 0 3pt;}",
      "  #certSheet .d-meta{font-size:8.5pt;font-weight:400;line-height:1.5;margin:0 0 6pt;}",
      "  #certSheet .d-cols{column-count:2;column-gap:7mm;column-rule:1px solid #999;}",
      "  #certSheet .d-item{break-inside:avoid;page-break-inside:avoid;font-size:8.5pt;line-height:1.45;",
      "    padding:0 0 3pt 0;margin:0 0 4pt;border-bottom:1px dotted #aaa;}",
      "  #certSheet .d-item.d-ng{border-left:2.2pt solid #000;padding-left:2.2mm;}",
      "  #certSheet .d-q{font-weight:700;padding-left:5.2mm;text-indent:-5.2mm;}",
      "  #certSheet .d-no{display:inline-block;min-width:4.6mm;font-weight:800;}",
      "  #certSheet .d-a{padding-left:5.2mm;}",
      "  #certSheet .d-key{font-weight:700;}",
      "  #certSheet .d-ref{padding-left:5.2mm;font-size:7.5pt;}",
      "  #certSheet .d-mark{font-weight:800;font-size:9.5pt;}",
      "  #certSheet .d-foot{margin-top:5pt;font-size:8pt;border-top:1px solid #000;padding-top:4pt;}",
      "}"
    ].join("");
    document.head.appendChild(st);
  }

  function buildPanel(set) {
    if (document.querySelector(".trainee-box")) return;
    var anchor = document.querySelector(".quiz-meta");
    if (!anchor || !anchor.parentElement) return;

    var t = readTrainee();
    var withDetail = t.detail !== false;
    var box = document.createElement("section");
    box.className = "trainee-box";
    box.setAttribute("aria-label", "受訓人資料");
    box.innerHTML =
      '<h2>受訓人資料（列印訓練紀錄表用）</h2>' +
      '<p class="hint">填寫後按「列印訓練紀錄表」，可印出含成績、簽名欄與作答明細的 A4 紙本；受訓人親簽後收回，併入12小時職前訓練證據卷宗。<br>' +
      '資料只存在本機瀏覽器，不會上傳。</p>' +
      '<div class="trainee-fields">' +
      '  <div class="trainee-field"><label for="tEmpNo">工號</label>' +
      '    <input id="tEmpNo" type="text" autocomplete="off" placeholder="例：A1234" value="' + esc(t.empNo) + '"></div>' +
      '  <div class="trainee-field"><label for="tName">姓名</label>' +
      '    <input id="tName" type="text" autocomplete="off" placeholder="請填全名" value="' + esc(t.name) + '"></div>' +
      '  <div class="trainee-field"><label for="tUnit">單位／案別（選填）</label>' +
      '    <input id="tUnit" type="text" autocomplete="off" placeholder="例：觀音中大案" value="' + esc(t.unit) + '"></div>' +
      '  <div class="trainee-actions">' +
      '    <button class="btn primary" id="printCert" type="button">列印訓練紀錄表</button>' +
      '    <span class="trainee-status" id="certStatus"></span>' +
      '  </div>' +
      '  <label class="trainee-opt" for="tDetail">' +
      '    <input id="tDetail" type="checkbox"' + (withDetail ? " checked" : "") + '>' +
      '    附作答明細（題目與本人作答，雙欄排版）' +
      '    <span class="sub">－ 取消勾選則只印首頁的成績與簽名表</span>' +
      '  </label>' +
      '</div>';
    anchor.parentElement.insertBefore(box, anchor);

    function persist() {
      saveTrainee({
        empNo: document.getElementById("tEmpNo").value.trim(),
        name: document.getElementById("tName").value.trim(),
        unit: document.getElementById("tUnit").value.trim(),
        detail: document.getElementById("tDetail").checked
      });
      refreshStatus(set);
    }
    ["tEmpNo", "tName", "tUnit"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", persist);
    });
    document.getElementById("tDetail").addEventListener("change", persist);
    document.getElementById("printCert").addEventListener("click", function () { doPrint(set); });
    refreshStatus(set);
  }

  function refreshStatus(set) {
    var el = document.getElementById("certStatus");
    if (!el) return;
    var s = readState();
    if (!Number.isFinite(s.score)) {
      el.className = "trainee-status wait";
      el.textContent = "尚未有成績——請先作答並按「查看成績」。";
      return;
    }
    el.className = "trainee-status ready";
    el.textContent = "目前成績 " + s.score + " 分（" + (s.score >= PASS ? "達合格標準" : "未達 " + PASS + " 分") + "），可列印。";
  }

  /* 作答明細：一題一格，雙欄流排。
     答對者只印「作答」一行（作答即正解，不重印）；答錯或未作答者才加印正解與依據。 */
  function detailHtml(set, s, info) {
    var answers = Array.isArray(s.answers) ? s.answers : [];
    var blank = 0, wrong = 0;

    var items = set.questions.map(function (q, qi) {
      var order = optionOrder(quizId, qi, q.o.length);
      var letter = function (originalIndex) {
        return String.fromCharCode(65 + order.indexOf(originalIndex));
      };
      var picked = (typeof answers[qi] === "number") ? answers[qi] : null;
      var ok = picked === q.a;
      if (picked === null) blank++; else if (!ok) wrong++;

      var html = '<div class="d-item' + (ok ? "" : " d-ng") + '">' +
        '<div class="d-q"><span class="d-no">' + (qi + 1) + '.</span>' + esc(q.q) + '</div>';

      if (picked === null) {
        html += '<div class="d-a">作答：<b>未作答</b>　<span class="d-mark">✗</span></div>';
      } else {
        html += '<div class="d-a">作答：' + letter(picked) + '. ' + esc(q.o[picked]) +
          '　<span class="d-mark">' + (ok ? "✓" : "✗") + '</span></div>';
      }
      if (!ok) {
        html += '<div class="d-a d-key">正解：' + letter(q.a) + '. ' + esc(q.o[q.a]) + '</div>' +
          '<div class="d-ref">依據：' + esc(q.ref) + '</div>';
      }
      return html + '</div>';
    }).join("");

    return '<section class="c-detail">' +
      '<div class="d-head">作答明細　' + esc(info.name) + '（工號 ' + esc(info.empNo) + '）　' + esc(set.title) + '</div>' +
      '<p class="d-meta">' +
      '共 ' + set.questions.length + ' 題：答對 ' + (set.questions.length - wrong - blank) + ' 題、答錯 ' + wrong + ' 題、未作答 ' + blank + ' 題　|　得分 ' + s.score + ' 分<br>' +
      '標記說明：✓ 答對（作答即正解，不另列）；✗ 答錯或未作答，加列正解與契約依據，左側加粗線標示。' +
      '</p>' +
      '<div class="d-cols">' + items + '</div>' +
      '<p class="d-foot">本明細為前頁紀錄表之附件，應與紀錄表首頁一併裝訂歸檔，不得單獨抽存。' +
      '題目與正解係契約文件重點摘要，正式履約仍以核定契約文件及台電書面指示為準。</p>' +
      '</section>';
  }

  function doPrint(set) {
    var empNo = (document.getElementById("tEmpNo") || {}).value || "";
    var name = (document.getElementById("tName") || {}).value || "";
    var unit = (document.getElementById("tUnit") || {}).value || "";
    var wantDetail = !!(document.getElementById("tDetail") || {}).checked;
    empNo = empNo.trim(); name = name.trim(); unit = unit.trim();

    if (!name || !empNo) {
      alert("請先填寫工號與姓名，紀錄表才能對應到人。");
      (name ? document.getElementById("tEmpNo") : document.getElementById("tName")).focus();
      return;
    }
    var s = readState();
    if (!Number.isFinite(s.score)) {
      alert("尚未有成績。請先完成作答並按「查看成績」，成績才會列入紀錄表。");
      return;
    }

    var total = set.questions.length;
    var now = new Date();
    var done = s.completedAt ? new Date(s.completedAt) : null;
    var pass = s.score >= PASS;

    var sheet = document.getElementById("certSheet");
    if (!sheet) {
      sheet = document.createElement("div");
      sheet.id = "certSheet";
      document.body.appendChild(sheet);
    }
    sheet.innerHTML =
      '<div class="c-company">' + esc(COMPANY) + '</div>' +
      '<h1>' + esc(set.no) + ' 12 小時職前訓練　單元測驗紀錄表</h1>' +
      '<p class="c-sub">' + esc(PROJECT) + '</p>' +
      '<p class="c-basis">依據：工作說明書（四案）7.3.6　監造人員職前訓練 12 小時以上</p>' +
      '<table>' +
      '<tr><th>姓名</th><td>' + esc(name) + '</td><th>工號</th><td>' + esc(empNo) + '</td></tr>' +
      '<tr><th>單位／案別</th><td colspan="3">' + esc(unit || "—") + '</td></tr>' +
      '<tr><th>職務別</th><td>' + esc(set.no) + '</td><th>測驗單元</th><td>' + esc(set.title) + '</td></tr>' +
      '<tr><th>測驗範圍</th><td colspan="3">' + esc(set.short) + '</td></tr>' +
      '<tr><th>研讀時數</th><td>' + esc(set.minutes) + ' 分鐘</td><th>題數</th><td>' + total + ' 題</td></tr>' +
      '<tr><th>答對題數</th><td>' + (Number.isFinite(s.correct) ? s.correct : "—") + ' 題</td>' +
      '    <th>得分</th><td class="c-score">' + s.score + ' 分</td></tr>' +
      '<tr><th>合格標準</th><td>' + PASS + ' 分</td><th>判定</th><td class="c-score">' + (pass ? "合　格" : "未達標準") + '</td></tr>' +
      '<tr><th>測驗完成時間</th><td colspan="3">' + (done ? esc(stamp(done)) : "—") + '</td></tr>' +
      '<tr><th>作答明細</th><td colspan="3">' +
        (wantDetail ? "附於次頁（雙欄排版）；答對題僅列作答，答錯題加列正解與依據。" : "本次未列印") +
      '</td></tr>' +
      '</table>' +
      '<table class="c-sign">' +
      '<tr><th style="width:22%">受訓人簽名</th><td style="width:28%"></td>' +
      '    <th style="width:22%">簽名日期</th><td style="width:28%"></td></tr>' +
      '<tr><th>訓練承辦覆核</th><td></td><th>監造主任覆核</th><td></td></tr>' +
      '</table>' +
      '<div class="c-note">' +
      '<b>附註</b><br>' +
      '一、本表為前述測驗單元之作答紀錄，供 12 小時職前訓練佐證之用；<b>不等同全部訓練之完訓證明</b>，仍應併同課程表、簽到表、授課或講師資料及測驗成績彙整一併留存。<br>' +
      '二、成績由測驗系統於受訓人按下「查看成績」時產生，本表與作答明細均如實轉載，未經人工調整。<br>' +
      '三、題目與解析為契約文件重點摘要；正式履約仍以核定契約文件及台電書面指示為準。<br>' +
      '四、受訓人簽名後，本表連同作答明細由訓練承辦收回歸檔。' +
      '</div>' +
      '<p class="c-foot">列印日期：' + esc(rocDate(now)) + '　（' + esc(stamp(now)) + '）</p>' +
      (wantDetail ? detailHtml(set, s, {name: name, empNo: empNo}) : "");

    window.print();
  }

  function init() {
    var set = readSet();
    if (!set) return;
    addStyles();
    buildPanel(set);
    /* 送出成績後即時更新提示文字 */
    var submitBtn = document.querySelector("#submitQuiz");
    if (submitBtn) submitBtn.addEventListener("click", function () { setTimeout(function () { refreshStatus(set); }, 60); });
    var resetBtn = document.querySelector("#resetQuiz");
    if (resetBtn) resetBtn.addEventListener("click", function () { setTimeout(function () { refreshStatus(set); }, 60); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
