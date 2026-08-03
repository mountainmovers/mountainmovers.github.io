// Spiritual Gifts Inventory — ported from the Jekyll site's inline script.
// CONTRACT (ADR 0004): localStorage keys, endpoints, request shapes, scoring,
// and the fail-open gate are frozen. Do not "improve" this logic.
(function () {
  var config = JSON.parse(document.getElementById("sgi-config").textContent);
  var GIFTS = config.gifts;
  var TOTAL = config.total;
  var MAX_PER_GIFT = (4 * TOTAL) / GIFTS.length;
  var SUBSCRIBE_URL = config.subscribeUrl;
  var RESULTS_ENDPOINT = config.resultsEndpoint;
  var KEY_SUBSCRIBED = "sgi.subscribed";
  var KEY_ANSWERS = "sgi.answers";
  var KEY_EMAIL = "sgi.email";

  var gate = document.getElementById("sgi-gate");
  var quiz = document.getElementById("sgi-quiz");
  var results = document.getElementById("sgi-results");
  var gateForm = document.getElementById("sgi-gate-form");
  var gateMsg = document.getElementById("sgi-gate-msg");
  var quizForm = document.getElementById("sgi-quiz-form");
  var quizMsg = document.getElementById("sgi-quiz-msg");

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
    document.getElementById("sgi-progress-count").textContent = count;
    document.getElementById("sgi-progress-fill").style.width = (100 * count) / TOTAL + "%";
  }

  function showQuiz() {
    gate.hidden = true;
    results.hidden = true;
    quiz.hidden = false;
  }

  // Email gate — subscribe via Mailchimp JSONP, then unlock the quiz.
  function jsonp(url, onDone, onFail) {
    var cb = "sgiMailchimp" + Date.now();
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
    var email = document.getElementById("sgi-email").value.trim();
    gateMsg.hidden = true;
    gateMsg.className = "sgi-gate-msg";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      gateMsg.textContent = "Please enter a valid email address.";
      gateMsg.hidden = false;
      return;
    }
    function unlock(message) {
      store(KEY_SUBSCRIBED, "1");
      store(KEY_EMAIL, email);
      gateMsg.className = "sgi-gate-msg success";
      gateMsg.textContent = message;
      gateMsg.hidden = false;
      showQuiz();
      window.scrollTo(0, 0);
    }
    jsonp(
      SUBSCRIBE_URL + "&EMAIL=" + encodeURIComponent(email),
      function (data) {
        if (data.result === "success" || /already subscribed/i.test(data.msg || "")) {
          unlock("You're on the list. Enjoy the inventory!");
        } else {
          var div = document.createElement("div");
          div.innerHTML = data.msg || "Something went wrong. Please try again.";
          gateMsg.textContent = div.textContent;
          gateMsg.hidden = false;
        }
      },
      function () {
        // Don't hold the inventory hostage to a signup outage.
        unlock("We couldn't reach the mailing list just now, but you can still take the inventory.");
      },
    );
  });

  // Quiz — persist answers, track progress, score on submit.
  quizForm.addEventListener("change", function (event) {
    if (event.target.type !== "radio") return;
    var labels = event.target.closest(".sgi-options").querySelectorAll("label");
    for (var i = 0; i < labels.length; i++) labels[i].classList.remove("selected");
    event.target.closest("label").classList.add("selected");
    event.target.closest(".sgi-question").classList.remove("unanswered");
    store(KEY_ANSWERS, JSON.stringify(getAnswers()));
    updateProgress();
  });

  quizForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var answers = getAnswers();
    var unanswered = [];
    for (var n = 1; n <= TOTAL; n++) {
      var q = document.getElementById("sgi-q" + n);
      if (answers["q" + n] === undefined) {
        unanswered.push(n);
        q.classList.add("unanswered");
      } else {
        q.classList.remove("unanswered");
      }
    }
    if (unanswered.length > 0) {
      quizMsg.textContent =
        "Please answer every statement — " + unanswered.length + " remaining (highlighted in red).";
      quizMsg.hidden = false;
      document
        .getElementById("sgi-q" + unanswered[0])
        .scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    quizMsg.hidden = true;

    // Question n scores toward gift (n - 1) mod 22.
    var scores = GIFTS.map(function (name, i) {
      var total = 0;
      for (var n = i + 1; n <= TOTAL; n += GIFTS.length) total += answers["q" + n];
      return { name: name, score: total };
    });
    scores.sort(function (a, b) {
      return b.score - a.score;
    });
    sendResults(scores);

    var list = document.getElementById("sgi-results-list");
    list.innerHTML = "";
    scores.forEach(function (gift, rank) {
      var row = document.createElement("div");
      row.className = "sgi-result" + (rank < 3 ? " dominant" : rank < 6 ? " sub-dominant" : "");
      row.innerHTML =
        '<span class="name"></span>' +
        '<div class="bar"><div class="fill" style="width:' +
        (100 * gift.score) / MAX_PER_GIFT +
        '%"></div></div>' +
        '<span class="score">' +
        gift.score +
        " / " +
        MAX_PER_GIFT +
        "</span>";
      row.querySelector(".name").textContent = gift.name;
      list.appendChild(row);
    });

    quiz.hidden = true;
    results.hidden = false;
    window.scrollTo(0, 0);
  });

  // Fire-and-forget copy of the results to MMI; never blocks the taker's results.
  function sendResults(scores) {
    if (!RESULTS_ENDPOINT || !window.fetch) return;
    function names(list) {
      return list
        .map(function (g) {
          return g.name + " (" + g.score + ")";
        })
        .join(", ");
    }
    try {
      fetch(RESULTS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: "Spiritual Gifts Inventory results",
          _template: "table",
          email: fetchStored(KEY_EMAIL) || "(not captured)",
          dominant: names(scores.slice(0, 3)),
          sub_dominant: names(scores.slice(3, 6)),
          all_scores: names(scores),
        }),
      }).catch(function () {});
    } catch (e) {}
  }

  document.getElementById("sgi-retake").addEventListener("click", function () {
    try {
      localStorage.removeItem(KEY_ANSWERS);
    } catch (e) {}
    var checked = quizForm.querySelectorAll("input[type=radio]:checked");
    for (var i = 0; i < checked.length; i++) checked[i].checked = false;
    var selected = quizForm.querySelectorAll("label.selected");
    for (var j = 0; j < selected.length; j++) selected[j].classList.remove("selected");
    updateProgress();
    showQuiz();
    window.scrollTo(0, 0);
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
