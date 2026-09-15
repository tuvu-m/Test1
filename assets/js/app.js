/* ===========================================================
   Suomi–English Flashcards — application logic
   Pure vanilla JS. Loads window.FLASHCARDS (from data/cards.js).
   =========================================================== */
(function () {
  "use strict";

  /* ---------- Data normalisation ---------- */
  var RAW = window.FLASHCARDS || [];
  var CATEGORIES = Array.isArray(RAW) ? RAW : (RAW.categories || []);

  var EMOJI = {
    "Tervehdykset ja kohteliaisuus": "👋", "Perhe ja ihmiset": "👨‍👩‍👧",
    "Numerot ja määrät": "🔢", "Aika, kellonaika ja viikonpäivät": "🕐",
    "Kuukaudet ja vuodenajat": "📅", "Ruoka ja juoma": "🍽️",
    "Keittiö ja ruoanlaitto": "🍳", "Koti ja huonekalut": "🏠",
    "Vaatteet ja asusteet": "👕", "Keho ja terveys": "🩺",
    "Värit ja muodot": "🎨", "Sää ja luonto": "🌦️", "Eläimet": "🐾",
    "Kaupunki ja liikenne": "🚌", "Kauppa ja asiointi": "🛒",
    "Työ ja ammatit": "💼", "Koulu ja opiskelu": "🎓",
    "Harrastukset ja vapaa-aika": "⚽", "Matkustaminen": "✈️",
    "Yhteiskunta ja asuminen": "🏙️", "Yleiset verbit": "🏃",
    "Adjektiivit": "🔠", "Adverbit ja paikat": "📍",
    "Kysymyssanat ja pronominit": "❓", "Yleiset partikkelit ja sidesanat": "🔗"
  };
  var FALLBACK_EMOJI = ["📗", "📘", "📙", "📕", "🗂️", "🧩", "💬", "⭐"];

  CATEGORIES.forEach(function (c, i) {
    if (!c.emoji) c.emoji = EMOJI[c.category] || FALLBACK_EMOJI[i % FALLBACK_EMOJI.length];
    c.id = "cat-" + i;
    (c.cards || []).forEach(function (card) { card._cat = c.category; });
  });

  var ALL_CARDS = CATEGORIES.reduce(function (a, c) { return a.concat(c.cards || []); }, []);

  /* ---------- Persistent state ---------- */
  var LS_LEARNED = "sef_learned_v1";
  var LS_THEME = "sef_theme_v1";
  var LS_DIR = "sef_dir_v1";

  function loadSet(key) {
    try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); }
    catch (e) { return new Set(); }
  }
  function saveSet(key, set) {
    try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch (e) {}
  }
  var learned = loadSet(LS_LEARNED);
  function cardKey(card) { return card._cat + "::" + card.fi; }

  /* ---------- DOM helpers ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m];
    });
  }

  /* ---------- Theme + direction ---------- */
  var direction = "fi-en";
  (function initPrefs() {
    try {
      var t = localStorage.getItem(LS_THEME);
      if (t) document.documentElement.setAttribute("data-theme", t);
      else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
        document.documentElement.setAttribute("data-theme", "dark");
      var d = localStorage.getItem(LS_DIR);
      if (d === "fi-en" || d === "en-fi") direction = d;
    } catch (e) {}
    updateThemeIcon();
    syncDirButtons();
  })();

  function updateThemeIcon() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    $("themeBtn").textContent = dark ? "☀️" : "🌙";
  }
  $("themeBtn").addEventListener("click", function () {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(LS_THEME, next); } catch (e) {}
    updateThemeIcon();
  });

  function syncDirButtons() {
    Array.prototype.forEach.call($("dirToggle").children, function (b) {
      b.classList.toggle("is-active", b.dataset.dir === direction);
    });
  }
  $("dirToggle").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    direction = b.dataset.dir;
    try { localStorage.setItem(LS_DIR, direction); } catch (e2) {}
    syncDirButtons();
    if (!$("studyView").hidden) renderCurrent();
  });

  /* ===========================================================
     HOME VIEW
     =========================================================== */
  function learnedInCategory(cat) {
    var n = 0;
    (cat.cards || []).forEach(function (c) { if (learned.has(cardKey(c))) n++; });
    return n;
  }

  function renderHome(filter) {
    $("statCards").textContent = ALL_CARDS.length;
    $("statCats").textContent = CATEGORIES.length;
    $("statLearned").textContent = learned.size;

    var grid = $("categoryGrid");
    grid.innerHTML = "";
    var q = (filter || "").trim().toLowerCase();

    var shown = CATEGORIES.filter(function (c) {
      if (!q) return true;
      return (c.category + " " + (c.category_en || "")).toLowerCase().indexOf(q) !== -1;
    });

    if (!shown.length) {
      grid.appendChild(el("p", "cat-card__en", "Ei osumia. (No matching topics.)"));
      return;
    }

    shown.forEach(function (cat) {
      var total = (cat.cards || []).length;
      var done = learnedInCategory(cat);
      var pct = total ? Math.round((done / total) * 100) : 0;
      var card = el("button", "cat-card");
      card.innerHTML =
        '<span class="cat-card__emoji">' + esc(cat.emoji) + "</span>" +
        '<span class="cat-card__name">' + esc(cat.category) + "</span>" +
        '<span class="cat-card__en">' + esc(cat.category_en || "") + "</span>" +
        '<span class="cat-card__foot">' +
          '<span class="cat-card__mini"><span style="width:' + pct + '%"></span></span>' +
          '<span class="cat-card__count">' + done + "/" + total + "</span>" +
        "</span>";
      card.addEventListener("click", function () { startStudy(cat.cards, cat.category, cat.emoji); });
      grid.appendChild(card);
    });
  }

  $("catSearch").addEventListener("input", function (e) { renderHome(e.target.value); });
  $("studyAllBtn").addEventListener("click", function () {
    startStudy(ALL_CARDS, "Kaikki aiheet", "📚");
  });
  $("resetProgressBtn").addEventListener("click", function () {
    if (confirm("Nollataanko kaikki edistyminen?\nReset all learning progress?")) {
      learned = new Set(); saveSet(LS_LEARNED, learned); renderHome($("catSearch").value);
    }
  });
  $("homeBtn").addEventListener("click", goHome);
  $("backBtn").addEventListener("click", goHome);
  $("doneHomeBtn").addEventListener("click", goHome);

  function goHome() {
    $("studyView").hidden = true;
    $("homeView").hidden = false;
    renderHome($("catSearch").value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ===========================================================
     STUDY SESSION STATE
     =========================================================== */
  var session = null; // { title, emoji, deck, order, pos, mode, missed:Set, flipped }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function startStudy(deck, title, emoji) {
    if (!deck || !deck.length) return;
    session = {
      title: title, emoji: emoji, deck: deck,
      order: shuffle(deck.map(function (_, i) { return i; })),
      pos: 0, mode: "flash", missed: new Set(), flipped: false
    };
    $("homeView").hidden = true;
    $("studyView").hidden = false;
    $("studyTitle").textContent = emoji + " " + title;
    setMode("flash");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function currentCard() { return session.deck[session.order[session.pos]]; }

  /* ---------- Mode switching ---------- */
  $("modeToggle").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b || !session) return;
    setMode(b.dataset.mode);
  });
  function setMode(mode) {
    session.mode = mode;
    Array.prototype.forEach.call($("modeToggle").children, function (b) {
      b.classList.toggle("is-active", b.dataset.mode === mode);
    });
    $("doneView").hidden = true;
    session.pos = 0;
    session.order = shuffle(session.deck.map(function (_, i) { return i; }));
    if (mode === "flash") {
      $("flashMode").hidden = false; $("quizMode").hidden = true;
      renderCurrent();
    } else {
      $("flashMode").hidden = true; $("quizMode").hidden = false;
      session.quizScore = 0; session.quizAnswered = 0;
      renderQuiz();
    }
  }

  /* ---------- Progress bar ---------- */
  function updateProgress() {
    var total = session.deck.length;
    var pos = Math.min(session.pos, total);
    $("progressCount").textContent = (Math.min(session.pos + 1, total)) + " / " + total;
    $("progressFill").style.width = (total ? (pos / total) * 100 : 0) + "%";
    var known = 0;
    session.deck.forEach(function (c) { if (learned.has(cardKey(c))) known++; });
    $("progressKnown").textContent = "✓ " + known;
  }

  /* ===========================================================
     FLASHCARD MODE
     =========================================================== */
  function frontBack(card) {
    // returns {front, back, frontHint} depending on direction
    if (direction === "fi-en") return { front: card.fi, back: card.en, hint: "Suomi" };
    return { front: card.en, back: card.fi, hint: "English" };
  }

  function renderCurrent() {
    if (!session || session.mode !== "flash") return;
    if (session.pos >= session.deck.length) return showDone();
    var card = currentCard();
    var fb = frontBack(card);
    session.flipped = false;
    var fc = $("flashcard");
    fc.classList.remove("is-flipped");
    $("frontHint").textContent = fb.hint;
    $("frontWord").textContent = fb.front;
    $("backType").textContent = card.type || "";
    $("backWord").textContent = fb.back;
    $("exampleFi").textContent = card.example_fi || "";
    $("exampleEn").textContent = card.example_en || "";
    $("backNote").textContent = card.note || "";
    $("backNote").style.display = card.note ? "" : "none";
    $("answerRow").hidden = true;
    updateProgress();
  }

  function flip() {
    if (!session || session.mode !== "flash") return;
    session.flipped = !session.flipped;
    $("flashcard").classList.toggle("is-flipped", session.flipped);
    $("answerRow").hidden = !session.flipped;
  }

  $("flashcard").addEventListener("click", flip);
  $("flashcard").addEventListener("keydown", function (e) {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
  });
  $("flipBtn").addEventListener("click", flip);

  function advance(markKnown) {
    var card = currentCard();
    var k = cardKey(card);
    if (markKnown === true) { learned.add(k); }
    else if (markKnown === false) { learned.delete(k); session.missed.add(k); }
    saveSet(LS_LEARNED, learned);
    session.pos++;
    if (session.pos >= session.deck.length) showDone();
    else renderCurrent();
  }

  $("knowBtn").addEventListener("click", function () { advance(true); });
  $("dontKnowBtn").addEventListener("click", function () { advance(false); });
  $("nextBtn").addEventListener("click", function () {
    if (session.pos >= session.deck.length - 1) showDone();
    else { session.pos++; renderCurrent(); }
  });
  $("prevBtn").addEventListener("click", function () {
    if (session.pos > 0) { session.pos--; renderCurrent(); }
  });
  $("shuffleBtn").addEventListener("click", function () {
    session.order = shuffle(session.deck.map(function (_, i) { return i; }));
    session.pos = 0; renderCurrent();
  });

  /* ===========================================================
     QUIZ MODE (multiple choice)
     =========================================================== */
  function renderQuiz() {
    if (session.pos >= session.deck.length) return showDone(true);
    var card = currentCard();
    var fb = frontBack(card);
    $("quizPromptLabel").textContent = direction === "fi-en"
      ? "Mikä on englanniksi?" : "Mikä on suomeksi?";
    $("quizWord").textContent = fb.front;
    var correct = fb.back;

    // distractors from same category-ish pool
    var pool = session.deck.length >= 6 ? session.deck : ALL_CARDS;
    var options = [correct];
    var guard = 0;
    while (options.length < 4 && guard < 200) {
      guard++;
      var r = pool[Math.floor(Math.random() * pool.length)];
      var val = direction === "fi-en" ? r.en : r.fi;
      if (options.indexOf(val) === -1) options.push(val);
    }
    options = shuffle(options);

    var box = $("quizOptions");
    box.innerHTML = "";
    $("quizFeedback").textContent = "";
    $("quizFeedback").className = "quiz-feedback";
    options.forEach(function (opt) {
      var b = el("button", "quiz-opt", esc(opt));
      b.addEventListener("click", function () { answerQuiz(b, opt, correct, card); });
      box.appendChild(b);
    });
    updateProgress();
  }

  function answerQuiz(btn, chosen, correct, card) {
    var opts = $("quizOptions").children;
    Array.prototype.forEach.call(opts, function (b) {
      b.disabled = true;
      if (b.textContent === correct) b.classList.add("is-correct");
    });
    var fb = $("quizFeedback");
    session.quizAnswered++;
    if (chosen === correct) {
      btn.classList.add("is-correct");
      fb.textContent = "Oikein! ✓"; fb.className = "quiz-feedback ok";
      session.quizScore++;
      learned.add(cardKey(card)); saveSet(LS_LEARNED, learned);
    } else {
      btn.classList.add("is-wrong");
      fb.textContent = "Väärin — oikea: " + correct; fb.className = "quiz-feedback no";
      session.missed.add(cardKey(card));
    }
    setTimeout(function () {
      session.pos++;
      if (session.pos >= session.deck.length) showDone(true);
      else renderQuiz();
    }, 950);
  }

  /* ===========================================================
     COMPLETION
     =========================================================== */
  function showDone(isQuiz) {
    $("flashMode").hidden = true;
    $("quizMode").hidden = true;
    $("doneView").hidden = false;
    $("progressFill").style.width = "100%";
    var total = session.deck.length;
    if (isQuiz) {
      $("doneTitle").textContent = "Visa valmis!";
      $("doneText").textContent = "Sait " + session.quizScore + " / " + total +
        " oikein (" + Math.round((session.quizScore / total) * 100) + "%).";
    } else {
      var known = session.deck.filter(function (c) { return learned.has(cardKey(c)); }).length;
      $("doneTitle").textContent = "Hyvin tehty!";
      $("doneText").textContent = "Kävit läpi " + total + " korttia. Osaat nyt " + known +
        " sanaa tästä pakasta." + (session.missed.size ? " Kertaa " + session.missed.size + " virhettä." : "");
    }
    $("reviewMissedBtn").style.display = session.missed.size ? "" : "none";
  }

  $("restartBtn").addEventListener("click", function () {
    setMode(session.mode);
  });
  $("reviewMissedBtn").addEventListener("click", function () {
    var missedCards = session.deck.filter(function (c) { return session.missed.has(cardKey(c)); });
    if (!missedCards.length) return;
    startStudy(missedCards, session.title + " — virheet", "🔁");
  });

  /* ---------- Global keyboard shortcuts ---------- */
  document.addEventListener("keydown", function (e) {
    if ($("studyView").hidden || !session) return;
    if (e.target.tagName === "INPUT") return;
    if (session.mode !== "flash") return;
    switch (e.key) {
      case "ArrowRight": $("nextBtn").click(); break;
      case "ArrowLeft": $("prevBtn").click(); break;
      case "1": if (session.flipped) advance(false); break;
      case "2": if (session.flipped) advance(true); break;
    }
  });

  /* ===========================================================
     BOOT
     =========================================================== */
  if (!CATEGORIES.length) {
    $("categoryGrid").innerHTML =
      '<p class="cat-card__en">Korttidataa ei löytynyt. Varmista, että <code>data/cards.js</code> on ladattu.</p>';
  }
  renderHome("");
})();
