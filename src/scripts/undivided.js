// The Undivided Assessment (ADR 0006) — modelled on the Spiritual Gifts
// Inventory's script (src/scripts/sgi.js, frozen by ADR 0004; not edited).
// Same shape: config via <script type="application/json">, the same
// fail-open Mailchimp JSONP gate, the same fire-and-forget FormSubmit relay.
// Its own state under `ua.*` keys, plus `ua.history` so a reader who takes it
// again (the book asks them to, when they finish) sees before/after per part.
(function () {
  var config = JSON.parse(document.getElementById("ua-config").textContent);
  var PARTS = config.parts;
  var BANDS = config.bands;
  var TOTAL = config.total;
  var MAX_PER_PART = config.maxScore;
  var SUBSCRIBE_URL = config.subscribeUrl;
  var RESULTS_ENDPOINT = config.resultsEndpoint;
  var MESSAGES = config.messages;
  var COPY = config.copy;
  var KEY_SUBSCRIBED = "ua.subscribed";
  var KEY_ANSWERS = "ua.answers";
  var KEY_EMAIL = "ua.email";
  var KEY_HISTORY = "ua.history";
  var HISTORY_LIMIT = 20;

  var gate = document.getElementById("ua-gate");
  var quiz = document.getElementById("ua-quiz");
  var results = document.getElementById("ua-results");
  var gateForm = document.getElementById("ua-gate-form");
  var gateMsg = document.getElementById("ua-gate-msg");
  var quizForm = document.getElementById("ua-quiz-form");
  var quizMsg = document.getElementById("ua-quiz-msg");
  var previousNote = document.getElementById("ua-previous-note");
  var reducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function store(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }
  function fetchStored(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, function (match, name) {
      return values[name] !== undefined ? values[name] : match;
    });
  }

  function formatDate(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  // History: [{ date: ISO string, scores: { Heart: n, Soul: n, ... } }], oldest first.
  function getHistory() {
    try {
      var history = JSON.parse(fetchStored(KEY_HISTORY));
      return Array.isArray(history) ? history : [];
    } catch (e) {
      return [];
    }
  }

  function getAnswers() {
    var answers = {};
    var checked = quizForm.querySelectorAll("input[type=radio]:checked");
    for (var i = 0; i < checked.length; i++) {
      answers[checked[i].name] = parseInt(checked[i].value, 10);
    }
    return answers;
  }

  function updateProgress() {
    var count = Object.keys(getAnswers()).length;
    document.getElementById("ua-progress-count").textContent = count;
    document.getElementById("ua-progress-fill").style.width = (100 * count) / TOTAL + "%";
  }

  function updatePreviousNote() {
    var history = getHistory();
    if (history.length === 0) {
      previousNote.hidden = true;
      return;
    }
    previousNote.textContent = fill(COPY.previousNote, {
      date: formatDate(history[history.length - 1].date),
    });
    previousNote.hidden = false;
  }

  function showQuiz() {
    gate.hidden = true;
    results.hidden = true;
    quiz.hidden = false;
    updatePreviousNote();
  }

  function focusHeading(id) {
    var heading = document.getElementById(id);
    window.scrollTo(0, 0);
    if (heading) heading.focus({ preventScroll: true });
  }

  function setGateMessage(text, success) {
    gateMsg.textContent = text;
    gateMsg.classList.toggle("success", !!success);
    gateMsg.hidden = false;
  }

  // Email gate — subscribe via Mailchimp JSONP, then unlock the questions.
  // Same endpoint, list and fail-open behaviour as the SGI (ADR 0004).
  function jsonp(url, onDone, onFail) {
    var cb = "uaMailchimp" + Date.now();
    var script = document.createElement("script");
    var timer = setTimeout(function () {
      cleanup();
      onFail();
    }, 10000);
    function cleanup() {
      clearTimeout(timer);
      delete window[cb];
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    window[cb] = function (data) {
      cleanup();
      onDone(data);
    };
    script.src = url + "&c=" + cb;
    script.onerror = function () {
      cleanup();
      onFail();
    };
    document.body.appendChild(script);
  }

  gateForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var email = document.getElementById("ua-email").value.trim();
    gateMsg.hidden = true;
    gateMsg.classList.remove("success");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setGateMessage(MESSAGES.invalid_email, false);
      return;
    }
    function unlock(message) {
      store(KEY_SUBSCRIBED, "1");
      store(KEY_EMAIL, email);
      setGateMessage(message, true);
      showQuiz();
      focusHeading("ua-quiz-heading");
    }
    jsonp(
      SUBSCRIBE_URL + "&EMAIL=" + encodeURIComponent(email),
      function (data) {
        if (data.result === "success" || /already subscribed/i.test(data.msg || "")) {
          unlock(MESSAGES.subscribed);
        } else {
          var div = document.createElement("div");
          div.innerHTML = data.msg || MESSAGES.subscribe_error;
          setGateMessage(div.textContent, false);
        }
      },
      function () {
        // Don't hold the assessment hostage to a signup outage.
        unlock(MESSAGES.subscribe_offline);
      },
    );
  });

  // Questions — persist answers, track progress, score on submit.
  quizForm.addEventListener("change", function (event) {
    if (event.target.type !== "radio") return;
    var labels = event.target.closest(".ua-options").querySelectorAll("label");
    for (var i = 0; i < labels.length; i++) labels[i].classList.remove("selected");
    event.target.closest("label").classList.add("selected");
    event.target.closest(".ua-question").classList.remove("unanswered");
    store(KEY_ANSWERS, JSON.stringify(getAnswers()));
    updateProgress();
  });

  // Question n scores toward part (n - 1) mod 5; each part sums questions
  // n, n+5, n+10, n+15, n+20 (0-20). Returned in book order.
  function score(answers) {
    return PARTS.map(function (part, i) {
      var total = 0;
      for (var n = i + 1; n <= TOTAL; n += PARTS.length) total += answers["q" + n];
      return { name: part.name, score: total, index: i };
    });
  }

  function bandFor(value) {
    for (var i = 0; i < BANDS.length; i++) {
      if (value >= BANDS[i].min && value <= BANDS[i].max) return BANDS[i];
    }
    return BANDS[BANDS.length - 1];
  }

  quizForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var answers = getAnswers();
    var unanswered = [];
    for (var n = 1; n <= TOTAL; n++) {
      var q = document.getElementById("ua-q" + n);
      if (answers["q" + n] === undefined) {
        unanswered.push(n);
        q.classList.add("unanswered");
      } else {
        q.classList.remove("unanswered");
      }
    }
    if (unanswered.length > 0) {
      quizMsg.textContent = fill(MESSAGES.unanswered, { count: unanswered.length });
      quizMsg.hidden = false;
      var first = document.getElementById("ua-q" + unanswered[0]);
      first.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      var firstInput = first.querySelector("input");
      if (firstInput) firstInput.focus({ preventScroll: true });
      return;
    }
    quizMsg.hidden = true;

    var scores = score(answers);
    var history = getHistory();
    var previous = history.length > 0 ? history[history.length - 1] : null;
    var current = { date: new Date().toISOString(), scores: {} };
    scores.forEach(function (part) {
      current.scores[part.name] = part.score;
    });
    history.push(current);
    store(KEY_HISTORY, JSON.stringify(history.slice(-HISTORY_LIMIT)));

    var sorted = scores.slice().sort(function (a, b) {
      return b.score - a.score || a.index - b.index;
    });
    sendResults(scores, sorted);
    renderResults(sorted, previous);

    quiz.hidden = true;
    results.hidden = false;
    focusHeading("ua-results-heading");
  });

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function bar(value, extraClass) {
    var track = el("div", "ua-bar" + (extraClass ? " " + extraClass : ""));
    var fillEl = el("div", "ua-fill");
    fillEl.style.width = (100 * value) / MAX_PER_PART + "%";
    track.appendChild(fillEl);
    return track;
  }

  function changeText(now, before) {
    var diff = now - before;
    if (diff > 0) return fill(COPY.changeUp, { n: diff });
    if (diff < 0) return fill(COPY.changeDown, { n: -diff });
    return COPY.changeSame;
  }

  function renderResults(sorted, previous) {
    var list = document.getElementById("ua-results-list");
    list.innerHTML = "";
    sorted.forEach(function (part) {
      var band = bandFor(part.score);
      var info = PARTS[part.index];
      var item = el("li", "ua-result ua-band-" + band.key);
      item.setAttribute("data-part", part.name);

      var head = el("div", "ua-result-head");
      head.appendChild(el("h3", "", part.name));
      var scoreLine = el("p", "ua-score");
      scoreLine.appendChild(el("strong", "", String(part.score)));
      scoreLine.appendChild(document.createTextNode(" / " + MAX_PER_PART));
      scoreLine.appendChild(el("span", "ua-band", band.label));
      head.appendChild(scoreLine);
      item.appendChild(head);

      // Bars are visual only; the score line and the "last time" line say it in words.
      var bars = el("div", "ua-bars");
      bars.setAttribute("aria-hidden", "true");
      bars.appendChild(bar(part.score));
      var before = previous && previous.scores ? previous.scores[part.name] : undefined;
      if (typeof before === "number") bars.appendChild(bar(before, "is-previous"));
      item.appendChild(bars);

      if (typeof before === "number") {
        item.appendChild(
          el(
            "p",
            "ua-prev",
            fill(COPY.previousLabel, { date: formatDate(previous.date), score: before }) +
              " · " +
              changeText(part.score, before),
          ),
        );
      }

      item.appendChild(el("p", "ua-result-text", info.results[band.key]));
      var chapters = el("p", "ua-chapters");
      chapters.appendChild(el("strong", "", COPY.readLabel + ": "));
      chapters.appendChild(document.createTextNode(info.chapters));
      item.appendChild(chapters);
      list.appendChild(item);
    });
  }

  // Fire-and-forget copy of the results to MMI; never blocks the reader's results.
  function sendResults(scores, sorted) {
    if (!RESULTS_ENDPOINT || !window.fetch) return;
    function names(list) {
      return list
        .map(function (p) {
          return p.name + " (" + p.score + ")";
        })
        .join(", ");
    }
    var top = sorted[0].score;
    var bottom = sorted[sorted.length - 1].score;
    try {
      fetch(RESULTS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: "Undivided Assessment results",
          _template: "table",
          email: fetchStored(KEY_EMAIL) || "(not captured)",
          scores: names(scores),
          strongest: names(
            sorted.filter(function (p) {
              return p.score === top;
            }),
          ),
          growing: names(
            sorted.filter(function (p) {
              return p.score === bottom;
            }),
          ),
        }),
      }).catch(function () {});
    } catch (e) {}
  }

  document.getElementById("ua-retake").addEventListener("click", function () {
    try {
      localStorage.removeItem(KEY_ANSWERS);
    } catch (e) {}
    var checked = quizForm.querySelectorAll("input[type=radio]:checked");
    for (var i = 0; i < checked.length; i++) checked[i].checked = false;
    var selected = quizForm.querySelectorAll("label.selected");
    for (var j = 0; j < selected.length; j++) selected[j].classList.remove("selected");
    updateProgress();
    showQuiz();
    focusHeading("ua-quiz-heading");
  });

  // Restore state for returning visitors.
  var saved = {};
  try {
    saved = JSON.parse(fetchStored(KEY_ANSWERS)) || {};
  } catch (e) {}
  Object.keys(saved).forEach(function (name) {
    var input = quizForm.querySelector('input[name="' + name + '"][value="' + saved[name] + '"]');
    if (input) {
      input.checked = true;
      input.closest("label").classList.add("selected");
    }
  });
  updateProgress();
  if (fetchStored(KEY_SUBSCRIBED)) showQuiz();
})();
