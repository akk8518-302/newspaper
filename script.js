/* ========================================================
   莫蘭迪 3D Q 版兒童互動閱讀學習系統 - 共用功能腳本 script.js
   具備：學生資料記憶、TTS語音朗讀、字體縮放、四層次測驗、CSV匯出、主題小遊戲
   ======================================================== */

// 學生基本資料管理
const StudentManager = {
  getStudentInfo() {
    return {
      seat: localStorage.getItem("reading_student_seat") || "",
      name: localStorage.getItem("reading_student_name") || ""
    };
  },
  saveStudentInfo(seat, name) {
    localStorage.setItem("reading_student_seat", seat.trim());
    localStorage.setItem("reading_student_name", name.trim());
  },
  initInputs() {
    const seatInputs = document.querySelectorAll(".student-seat-input");
    const nameInputs = document.querySelectorAll(".student-name-input");
    const info = this.getStudentInfo();

    seatInputs.forEach(input => {
      input.value = info.seat;
      input.addEventListener("input", (e) => {
        this.saveStudentInfo(e.target.value, localStorage.getItem("reading_student_name") || "");
        seatInputs.forEach(i => i.value = e.target.value);
      });
    });

    nameInputs.forEach(input => {
      input.value = info.name;
      input.addEventListener("input", (e) => {
        this.saveStudentInfo(localStorage.getItem("reading_student_seat") || "", e.target.value);
        nameInputs.forEach(i => i.value = e.target.value);
      });
    });
  }
};

// Web Audio API 音效生成器 (純程式合成，不需外網下載檔案)
const SoundPlayer = {
  ctx: null,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  playTone(freq, type, duration, delay = 0) {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch(e) {}
  },
  correct() {
    this.playTone(523.25, "sine", 0.15, 0);       // C5
    this.playTone(659.25, "sine", 0.25, 0.1);     // E5
    this.playTone(783.99, "sine", 0.35, 0.2);     // G5
  },
  wrong() {
    this.playTone(320, "triangle", 0.2, 0);
    this.playTone(260, "triangle", 0.3, 0.15);
  },
  victory() {
    [523, 659, 784, 1046].forEach((f, idx) => {
      this.playTone(f, "triangle", 0.3, idx * 0.12);
    });
  }
};

// TTS 語音朗讀管理
const SpeechManager = {
  synth: window.speechSynthesis,
  utterance: null,
  isSpeaking: false,
  isPaused: false,
  currentIndex: 0,
  paragraphs: [],

  init() {
    this.paragraphs = Array.from(document.querySelectorAll(".reading-paragraph"));
  },
  speakAll() {
    if (!this.synth) {
      alert("您的瀏覽器不支援語音朗讀功能！");
      return;
    }
    if (this.isSpeaking && !this.isPaused) {
      this.pause();
      return;
    }
    if (this.isPaused) {
      this.resume();
      return;
    }

    this.paragraphs = Array.from(document.querySelectorAll(".reading-paragraph"));
    if (this.paragraphs.length === 0) return;
    this.currentIndex = 0;
    this.speakParagraph(this.currentIndex);
  },
  speakParagraph(index) {
    if (index >= this.paragraphs.length) {
      this.stop();
      return;
    }
    this.paragraphs.forEach(p => p.classList.remove("speaking"));
    const currentP = this.paragraphs[index];
    currentP.classList.add("speaking");
    currentP.scrollIntoView({ behavior: "smooth", block: "center" });

    this.utterance = new SpeechSynthesisUtterance(currentP.innerText);
    this.utterance.lang = "zh-TW";
    this.utterance.rate = 0.95; // 適合四年級學生的語速

    this.utterance.onend = () => {
      this.currentIndex++;
      this.speakParagraph(this.currentIndex);
    };
    this.utterance.onerror = () => {
      this.stop();
    };

    this.synth.cancel();
    this.synth.speak(this.utterance);
    this.isSpeaking = true;
    this.isPaused = false;
    this.updateButtonUI(true);
  },
  pause() {
    if (this.synth && this.isSpeaking) {
      this.synth.pause();
      this.isPaused = true;
      this.updateButtonUI(false, "繼續朗讀 ⏯️");
    }
  },
  resume() {
    if (this.synth && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      this.updateButtonUI(true);
    }
  },
  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentIndex = 0;
    if (this.paragraphs) {
      this.paragraphs.forEach(p => p.classList.remove("speaking"));
    }
    this.updateButtonUI(false, "語音朗讀 🔊");
  },
  updateButtonUI(speaking, label) {
    const btn = document.getElementById("btn-speech-toggle");
    if (!btn) return;
    if (speaking) {
      btn.innerHTML = `<span>暫停朗讀 ⏸️</span>`;
      btn.classList.add("active");
    } else {
      btn.innerHTML = `<span>${label || "語音朗讀 🔊"}</span>`;
      btn.classList.remove("active");
    }
  }
};

// 字體大小調整管理
const FontResizer = {
  sizes: [17, 19, 21, 24],
  labels: ["適中", "大", "特大", "超大"],
  currentIdx: 1, // 預設 19px
  init() {
    const stored = localStorage.getItem("reading_font_size_idx");
    if (stored !== null) {
      this.currentIdx = parseInt(stored, 10);
    }
    this.applySize();
  },
  increase() {
    if (this.currentIdx < this.sizes.length - 1) {
      this.currentIdx++;
      this.applySize();
    }
  },
  decrease() {
    if (this.currentIdx > 0) {
      this.currentIdx--;
      this.applySize();
    }
  },
  applySize() {
    document.documentElement.style.setProperty("--font-content-size", `${this.sizes[this.currentIdx]}px`);
    const labelEl = document.getElementById("font-size-label");
    if (labelEl) {
      labelEl.innerText = this.labels[this.currentIdx];
    }
    localStorage.setItem("reading_font_size_idx", this.currentIdx);
  }
};

// 測驗與題庫引擎
const QuizEngine = {
  questions: [],
  userAnswers: {},
  isSubmitted: false,
  openQuestionAnswer: "",

  init(questionsData, openQuestionData) {
    this.questions = questionsData || [];
    this.openQuestionData = openQuestionData || null;
    this.renderQuestions();
    this.renderOpenQuestion();
  },

  renderQuestions(filterLevel = "all") {
    const container = document.getElementById("quiz-container");
    if (!container) return;
    container.innerHTML = "";

    const levelNames = {
      1: "層次一：提取訊息",
      2: "層次二：推論訊息",
      3: "層次三：詮釋整合",
      4: "層次四：比較評估"
    };

    const filtered = filterLevel === "all" 
      ? this.questions 
      : this.questions.filter(q => q.level === parseInt(filterLevel, 10));

    filtered.forEach((q, idx) => {
      const qCard = document.createElement("div");
      qCard.className = `question-item-card question-level-${q.level}`;
      qCard.id = `q-card-${q.id}`;

      const selectedOpt = this.userAnswers[q.id];

      let optionsHtml = "";
      ["A", "B", "C", "D"].forEach(letter => {
        const optText = q.options[letter];
        const isSelected = selectedOpt === letter ? "selected" : "";
        optionsHtml += `
          <button class="option-btn ${isSelected}" data-qid="${q.id}" data-opt="${letter}" onclick="QuizEngine.selectOption('${q.id}', '${letter}')">
            <span class="option-letter">${letter}</span>
            <span class="option-text">${optText}</span>
          </button>
        `;
      });

      qCard.innerHTML = `
        <div class="question-meta-row">
          <span class="q-number-pill">第 ${q.id} 題</span>
          <span class="q-level-tag q-level-${q.level}">${levelNames[q.level]}</span>
        </div>
        <div class="question-text">${q.question}</div>
        <div class="options-grid" id="opt-group-${q.id}">
          ${optionsHtml}
        </div>
        <div class="answer-explanation-box" id="exp-box-${q.id}">
          <div class="exp-status-title" id="exp-title-${q.id}"></div>
          <div class="exp-text"><strong>🎯 正確答案：${q.answer}</strong><br>${q.explanation}</div>
          <div class="exp-source"><strong>📖 文章依據：</strong>${q.sourceQuote}</div>
        </div>
      `;

      container.appendChild(qCard);
    });

    if (this.isSubmitted) {
      this.displayAllExplanations();
    }
  },

  selectOption(qId, letter) {
    if (this.isSubmitted) return; // 繳交後鎖定
    this.userAnswers[qId] = letter;

    const optGroup = document.getElementById(`opt-group-${qId}`);
    if (optGroup) {
      const btns = optGroup.querySelectorAll(".option-btn");
      btns.forEach(btn => {
        if (btn.dataset.opt === letter) {
          btn.classList.add("selected");
        } else {
          btn.classList.remove("selected");
        }
      });
    }

    this.updateAnswerProgress();
    SoundPlayer.playTone(440, "sine", 0.08); // 輕脆點擊聲
  },

  updateAnswerProgress() {
    const answeredCount = Object.keys(this.userAnswers).length;
    const total = this.questions.length;
    const progressEl = document.getElementById("quiz-progress-text");
    if (progressEl) {
      progressEl.innerText = `已作答：${answeredCount} / ${total} 題`;
    }
  },

  renderOpenQuestion() {
    const container = document.getElementById("open-question-container");
    if (!container || !this.openQuestionData) return;

    container.innerHTML = `
      <div class="open-question-box">
        <div class="open-q-title">
          <span>💡 開放式思考題（深度探究）</span>
        </div>
        <div class="open-q-desc">${this.openQuestionData.prompt}</div>
        <textarea id="open-question-input" class="open-q-textarea" placeholder="寫下你的想法或生活觀察經驗（請至少寫下 20 個字喔！）..."></textarea>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; font-size:0.88rem; color:#8A7A6E;">
          <span id="open-q-char-count">字數：0 字</span>
          <span>💭 思考提示：${this.openQuestionData.hint || "無標準答案，勇敢說出你的觀察！"}</span>
        </div>
      </div>
    `;

    const textarea = document.getElementById("open-question-input");
    const countEl = document.getElementById("open-q-char-count");
    if (textarea) {
      textarea.addEventListener("input", (e) => {
        this.openQuestionAnswer = e.target.value;
        if (countEl) countEl.innerText = `字數：${e.target.value.length} 字`;
      });
    }
  },

  filterLevel(lvl) {
    document.querySelectorAll(".level-filter-pill").forEach(p => {
      p.classList.toggle("active", p.dataset.level === lvl);
    });
    this.renderQuestions(lvl);
  },

  submitQuiz() {
    const answeredCount = Object.keys(this.userAnswers).length;
    const total = this.questions.length;

    if (answeredCount < total) {
      const confirmSubmit = confirm(`你還有 ${total - answeredCount} 道題目未作答，確定要現在交卷並看解析嗎？`);
      if (!confirmSubmit) return;
    }

    this.isSubmitted = true;
    let correctCount = 0;
    const levelStats = {
      1: { total: 0, correct: 0, name: "層次一：提取訊息" },
      2: { total: 0, correct: 0, name: "層次二：推論訊息" },
      3: { total: 0, correct: 0, name: "層次三：詮釋整合" },
      4: { total: 0, correct: 0, name: "層次四：比較評估" }
    };

    this.questions.forEach(q => {
      const lvl = q.level;
      if (levelStats[lvl]) levelStats[lvl].total++;

      if (this.userAnswers[q.id] === q.answer) {
        correctCount++;
        if (levelStats[lvl]) levelStats[lvl].correct++;
      }
    });

    const score = Math.round((correctCount / total) * 100);

    // 播放音效
    if (score >= 80) {
      SoundPlayer.victory();
    } else if (score >= 60) {
      SoundPlayer.correct();
    } else {
      SoundPlayer.wrong();
    }

    this.displayAllExplanations();
    this.renderSummaryModal(score, correctCount, total, levelStats);
  },

  displayAllExplanations() {
    this.questions.forEach(q => {
      const expBox = document.getElementById(`exp-box-${q.id}`);
      const expTitle = document.getElementById(`exp-title-${q.id}`);
      const userAns = this.userAnswers[q.id];

      if (expBox && expTitle) {
        expBox.style.display = "block";
        if (userAns === q.answer) {
          expBox.className = "answer-explanation-box correct";
          expTitle.innerHTML = `<span style="color:#2E7D32;">⭕ 答對了！太厲害了！你的選擇是：${userAns}</span>`;
        } else {
          expBox.className = "answer-explanation-box wrong";
          expTitle.innerHTML = `<span style="color:#C62828;">❌ 答錯囉！你的選擇是：${userAns || "未作答"}（正解是：${q.answer}）</span>`;
        }
      }

      // 將選項上色標示
      const optGroup = document.getElementById(`opt-group-${q.id}`);
      if (optGroup) {
        const btns = optGroup.querySelectorAll(".option-btn");
        btns.forEach(btn => {
          btn.classList.add("disabled");
          if (btn.dataset.opt === q.answer) {
            btn.style.borderColor = "var(--morandi-success)";
            btn.style.background = "#EAF5EA";
          } else if (btn.dataset.opt === userAns) {
            btn.style.borderColor = "var(--morandi-danger)";
            btn.style.background = "#FDF0F0";
          }
        });
      }
    });
  },

  renderSummaryModal(score, correctCount, total, levelStats) {
    const summaryCard = document.getElementById("quiz-summary-card");
    if (!summaryCard) return;

    summaryCard.style.display = "block";
    summaryCard.scrollIntoView({ behavior: "smooth" });

    let levelStatHtml = "";
    Object.keys(levelStats).forEach(lvl => {
      const item = levelStats[lvl];
      const rate = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
      levelStatHtml += `
        <div class="level-stat-card">
          <div class="level-stat-name">${item.name} (${item.correct}/${item.total})</div>
          <div class="level-stat-bar-outer">
            <div class="level-stat-bar-inner" style="width: ${rate}%;"></div>
          </div>
          <div style="font-size: 0.8rem; font-weight:700; color: #647E97; text-align: right;">${rate}%</div>
        </div>
      `;
    });

    summaryCard.innerHTML = `
      <div class="quiz-summary-modal">
        <h2 style="font-size: 1.8rem; font-weight: 900; color: var(--text-primary); margin-bottom: 8px;">🎉 測驗完成！學習診斷成果</h2>
        <p style="color: var(--text-secondary); font-weight: 600;">四年級深層閱讀評量表現報告</p>
        
        <div class="score-circular">${score} <span style="font-size: 1.5rem; color: var(--text-secondary);">分</span></div>
        <p style="font-size: 1.1rem; font-weight: 700; margin-bottom: 20px;">
          答對題數：<span style="color: var(--morandi-sage-dark);">${correctCount}</span> / ${total} 題
        </p>

        <div class="level-stats-grid">
          ${levelStatHtml}
        </div>

        <div class="action-buttons-row">
          <button class="btn-3d btn-3d-sage" onclick="QuizEngine.exportCSV()">
            📥 匯出學習成績單 (CSV)
          </button>
          <button class="btn-3d btn-3d-coral" onclick="TabManager.switchTab('game')">
            🎮 前往挑戰主題小遊戲
          </button>
          <button class="btn-3d btn-3d-blue" onclick="QuizEngine.retry()">
            🔄 重新挑戰一次
          </button>
        </div>
      </div>
    `;
  },

  retry() {
    this.userAnswers = {};
    this.isSubmitted = false;
    const summaryCard = document.getElementById("quiz-summary-card");
    if (summaryCard) summaryCard.style.display = "none";
    this.renderQuestions();
    this.updateAnswerProgress();
    window.scrollTo({ top: document.getElementById("quiz-section").offsetTop - 80, behavior: "smooth" });
  },

  exportCSV() {
    const student = StudentManager.getStudentInfo();
    const articleTitle = document.querySelector(".article-main-title")?.innerText || "閱讀測驗";
    const now = new Date();
    const timeStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}`;

    let correctCount = 0;
    const levelStats = { 1: 0, 2: 0, 3: 0, 4: 0 };
    this.questions.forEach(q => {
      if (this.userAnswers[q.id] === q.answer) {
        correctCount++;
        levelStats[q.level]++;
      }
    });

    const score = Math.round((correctCount / this.questions.length) * 100);

    const headers = [
      "座號", "姓名", "文章標題", "總分", "總題數", "答對題數",
      "提取訊息得分", "推論訊息得分", "詮釋整合得分", "比較評估得分",
      "開放思考題回答", "交卷時間"
    ];

    const safeOpenAnswer = (this.openQuestionAnswer || "").replace(/"/g, '""');

    const row = [
      `"${student.seat || "未填寫"}"`,
      `"${student.name || "未填寫"}"`,
      `"${articleTitle}"`,
      score,
      this.questions.length,
      correctCount,
      `${levelStats[1]}/4`,
      `${levelStats[2]}/4`,
      `${levelStats[3]}/4`,
      `${levelStats[4]}/4`,
      `"${safeOpenAnswer}"`,
      `"${timeStr}"`
    ];

    const csvContent = "\uFEFF" + headers.join(",") + "\n" + row.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${student.seat || "00"}_${student.name || "學生"}_${articleTitle}_閱讀評量.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// 分頁標籤切換管理
const TabManager = {
  switchTab(tabId) {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });
    document.querySelectorAll(".content-section").forEach(sec => {
      sec.style.display = sec.id === `${tabId}-section` ? "block" : "none";
    });
    // 切換時若是暫停或離開閱讀區，停止朗讀
    if (tabId !== "read") {
      SpeechManager.pause();
    }
    window.scrollTo({ top: 120, behavior: "smooth" });
  }
};

// 頁面初始化
document.addEventListener("DOMContentLoaded", () => {
  StudentManager.initInputs();
  FontResizer.init();
  SpeechManager.init();

  if (window.ARTICLE_CONFIG) {
    QuizEngine.init(window.ARTICLE_CONFIG.questions, window.ARTICLE_CONFIG.openQuestion);
    if (window.ARTICLE_CONFIG.initGame && typeof window.ARTICLE_CONFIG.initGame === "function") {
      window.ARTICLE_CONFIG.initGame();
    }
  }
});

