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

// 輕巧簡約灑花引擎 (簡單清新彩色小碎紙片與小花瓣飄落，乾淨不遮擋畫面)
const Confetti = {
  canvas: null,
  ctx: null,
  particles: [],
  animationId: null,
  isActive: false,

  init() {
    if (this.canvas) return;
    this.canvas = document.createElement("canvas");
    this.canvas.id = "celebration-confetti-canvas";
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100vw";
    this.canvas.style.height = "100vh";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "999999";
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  celebrate(duration = 2000, count = 45) {
    this.init();
    this.resize();

    const colors = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF92A9", "#A0C49D", "#F4A261"];

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: -10 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2.8 + 2.2,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5,
        opacity: 1,
        wobble: Math.random() * 10,
        wobbleSpeed: 0.05 + Math.random() * 0.03
      });
    }

    if (!this.isActive) {
      this.isActive = true;
      this.loop();
    }
  },

  loop() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx + Math.sin(p.wobble) * 1.2;
      p.y += p.vy;
      p.wobble += p.wobbleSpeed;
      p.rotation += p.rotationSpeed;

      if (p.y > this.canvas.height * 0.75) {
        p.opacity -= 0.03;
      }

      if (p.opacity <= 0 || p.y > this.canvas.height + 20) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);

      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.loop());
    } else {
      this.isActive = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
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
  hintTimers: {},

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
      const optKeys = q.options ? Object.keys(q.options) : ["A", "B", "C", "D"];
      optKeys.forEach(letter => {
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
          <span class="q-chance-badge" id="chance-badge-${q.id}">最多可作答 2 次</span>
        </div>
        <div class="question-text">${q.question}</div>
        <div class="options-grid" id="opt-group-${q.id}">
          ${optionsHtml}
        </div>
        <!-- 答錯即時小提示容器 (5秒自動關閉) -->
        <div class="quiz-hint-popup" id="hint-box-${q.id}" style="display: none;"></div>
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

    if (!this.attempts) this.attempts = {};
    const count = this.attempts[qId] || 0;

    // 每個題目最多只能更改一次答案，選擇第二次答案後就不能再更改選擇的答案
    if (count >= 2) return;

    // 若點擊的是已經選中的同一個選項，不重複累計
    if (this.userAnswers[qId] === letter) return;

    this.attempts[qId] = count + 1;
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

      const chanceBadge = document.getElementById(`chance-badge-${qId}`);
      if (this.attempts[qId] === 1) {
        if (chanceBadge) {
          chanceBadge.innerHTML = "✏️ 尚可更改 1 次";
          chanceBadge.style.background = "#FFF3E0";
          chanceBadge.style.color = "#E65100";
          chanceBadge.style.borderColor = "#FFB74D";
        }
      } else if (this.attempts[qId] >= 2) {
        // 第二次選擇後鎖定，不能再更改
        btns.forEach(btn => {
          btn.classList.add("locked");
        });
        if (chanceBadge) {
          chanceBadge.innerHTML = "🔒 答案已確認鎖定";
          chanceBadge.style.background = "#ECEFF1";
          chanceBadge.style.color = "#546E7A";
          chanceBadge.style.borderColor = "#CFD8DC";
        }
      }
    }

    this.updateAnswerProgress();

    // 判斷是否答對：答對立刻簡單灑花；答錯立刻給予小提示(5秒後自動消失)
    const q = this.questions.find(item => String(item.id) === String(qId));
    if (q) {
      if (String(letter) === String(q.answer)) {
        this.closeHint(qId); // 若原本有提示則立即收起
        SoundPlayer.correct();
        Confetti.celebrate(); // 簡單輕巧的灑花
      } else {
        SoundPlayer.wrong(); // 輕柔答錯音效
        this.showWrongHint(qId, q); // 立刻跳出小提示(5秒後自動消失)
      }
    }
  },

  showWrongHint(qId, q) {
    const hintBox = document.getElementById(`hint-box-${qId}`);
    if (!hintBox) return;

    // 清除先前的倒數定時器
    if (this.hintTimers[qId]) {
      clearTimeout(this.hintTimers[qId]);
      delete this.hintTimers[qId];
    }

    const clueText = q.sourceQuote || q.hint || q.explanation || "請再仔細回到課文相關段落找找關鍵字喔！";

    hintBox.innerHTML = `
      <div class="hint-header">
        <span class="hint-title">💡 思考小提示（5秒後自動關閉）</span>
        <button class="hint-close-btn" onclick="QuizEngine.closeHint('${qId}')" title="關閉提示">✕</button>
      </div>
      <div class="hint-body">
        先別灰心，再想一想喔！可以參考課文線索：<br>
        <span style="color:#B95C25; font-weight:700;">📖「${clueText}」</span>
      </div>
      <div class="hint-timer-bar"></div>
    `;

    hintBox.style.display = "block";
    hintBox.style.opacity = "1";
    hintBox.style.transform = "translateY(0)";

    // 5 秒後提示自動平滑淡出並消失
    this.hintTimers[qId] = setTimeout(() => {
      this.closeHint(qId);
    }, 5000);
  },

  closeHint(qId) {
    const hintBox = document.getElementById(`hint-box-${qId}`);
    if (hintBox) {
      hintBox.style.transition = "opacity 0.4s ease, transform 0.4s ease";
      hintBox.style.opacity = "0";
      hintBox.style.transform = "translateY(-6px)";
      setTimeout(() => {
        hintBox.style.display = "none";
        hintBox.style.transform = "";
        hintBox.style.transition = "";
      }, 400);
    }
    if (this.hintTimers[qId]) {
      clearTimeout(this.hintTimers[qId]);
      delete this.hintTimers[qId];
    }
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

    // AI 針對小朋友開放式思考題進行深度評分、等第診斷與呼應度分析
    const openEval = this.evaluateOpenAnswer(this.openQuestionAnswer, this.openQuestionData);

    // 播放音效與大慶祝灑花
    if (score >= 80) {
      SoundPlayer.victory();
      Confetti.celebrate(3500, 160);
    } else if (score >= 60) {
      SoundPlayer.correct();
      Confetti.celebrate(2500, 100);
    } else {
      SoundPlayer.wrong();
    }

    this.displayAllExplanations();
    this.renderSummaryModal(score, correctCount, total, levelStats, openEval);
  },

  evaluateOpenAnswer(text, questionData) {
    const trimmed = (text || "").trim();
    const len = trimmed.length;

    if (len === 0) {
      return {
        score: 0,
        grade: "未作答 (D)",
        badgeClass: "tag-clay",
        relevance: "未作答",
        comment: "尚未填寫想法。建議挑戰開放思考題，結合課文內容勇敢表達自己的發現與觀點喔！"
      };
    }

    // 分析是否包含具體思考詞彙與邏輯連接詞
    const thinkingKeywords = ["因為", "所以", "如果", "覺得", "發現", "例如", "像是", "比較", "可以", "認為", "觀察", "影響", "希望", "建議", "應該"];
    let thinkingMatches = 0;
    thinkingKeywords.forEach(kw => {
      if (trimmed.includes(kw)) thinkingMatches++;
    });

    // 分析是否呼應課文關鍵核心概念
    let articleMatches = [];
    const rubricKeywords = questionData && questionData.rubric && Array.isArray(questionData.rubric.keywords) 
      ? questionData.rubric.keywords 
      : [];
    rubricKeywords.forEach(kw => {
      if (trimmed.includes(kw) && !articleMatches.includes(kw)) {
        articleMatches.push(kw);
      }
    });

    // 基礎起評分 (60分)
    let score = 60;
    let relevanceText = "已初步提出想法";

    // 字數評量 (0-25分)
    if (len >= 60) {
      score += 25;
    } else if (len >= 35) {
      score += 18;
    } else if (len >= 20) {
      score += 12;
    } else {
      score += 6;
    }

    // 思考詞彙評量 (0-8分)
    if (thinkingMatches >= 3) {
      score += 8;
    } else if (thinkingMatches >= 1) {
      score += 5;
    }

    // 課文核心呼應度評量 (0-15分)
    if (articleMatches.length >= 3) {
      score += 15;
      relevanceText = `確實深度呼應課文（精準運用：${articleMatches.slice(0, 3).join("、")}等概念）`;
    } else if (articleMatches.length >= 1) {
      score += 10;
      relevanceText = `有效呼應閱讀內容（提及：${articleMatches.join("、")}）`;
    } else if (rubricKeywords.length > 0) {
      score += 2;
      relevanceText = "能表達個人觀點，若多融入課文所學特徵會更深刻";
    } else {
      score += 5;
      relevanceText = "觀點具體，能結合想法說明";
    }

    // 最高 98 分，特優
    score = Math.min(98, score);

    if (score >= 90) {
      return {
        score: score,
        grade: "特優 (A+)",
        badgeClass: "tag-coral",
        relevance: relevanceText,
        comment: `【確實深度呼應】思考深刻且內容豐富！能緊密結合課文的核心概念${articleMatches.length > 0 ? "（如：" + articleMatches.join("、") + "）" : ""}，提出具體且富創意的想法，理由邏輯完整，展現極佳的探究與寫作素養！`
      };
    } else if (score >= 80) {
      return {
        score: score,
        grade: "優等 (A)",
        badgeClass: "tag-sage",
        relevance: relevanceText,
        comment: `【有效呼應課文】回答完整流暢，能切合閱讀內容提出清楚明確的想法與具體理由${articleMatches.length > 0 ? "（成功融入「" + articleMatches.join("、") + "」等要點）" : ""}，論述有條不紊，表現非常優異！`
      };
    } else if (score >= 70) {
      return {
        score: score,
        grade: "良好 (B+)",
        badgeClass: "tag-blue",
        relevance: relevanceText,
        comment: "【基本呼應主題】能清楚表達出自己的觀察與觀點。若能再多引用一兩點課文中的關鍵特徵或生活細節，內容會更充實精彩喔！"
      };
    } else {
      return {
        score: score,
        grade: "尚可 (B)",
        badgeClass: "tag-clay",
        relevance: relevanceText,
        comment: "【嘗試表達想法】有寫出自己的點子很棒！建議字數可再增加，試著多說明「為什麼這樣做能呼應課文內容」，讓想法更完整喔！"
      };
    }
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

  renderSummaryModal(score, correctCount, total, levelStats, openEval) {
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

    const student = StudentManager.getStudentInfo();

    // 開放思考題評估展示 HTML (含學生姓名座號、量化分數、等第與呼應度分析)
    const openQuestionHtml = openEval ? `
      <div style="background: #FAF8F5; border: 2px solid #E8DFD4; border-radius: 16px; padding: 22px; margin: 24px 0; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; border-bottom: 1px dashed #D9CEBF; padding-bottom: 10px;">
          <div>
            <span style="font-size: 1.2rem; font-weight: 800; color: #795738;">💡 開放式思考題・AI 深度評量診斷</span>
            <span style="font-size: 0.9rem; color: #6C8A7D; font-weight: 700; margin-left: 10px;">
              👤 學生：${student.seat ? student.seat + " 號 " : ""}${student.name || "未填寫"}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.15rem; font-weight: 900; color: #C97761;">
              得分：${openEval.score} 分
            </span>
            <span class="tag-badge ${openEval.badgeClass}" style="font-size: 0.95rem; font-weight: 800;">
              等第：${openEval.grade}
            </span>
          </div>
        </div>
        <div style="font-size: 0.95rem; color: #5D6D65; margin-bottom: 12px; background: white; padding: 14px 18px; border-radius: 12px; border: 1.5px dashed #D9CEBF; line-height: 1.6;">
          <strong style="color: #795738;">📝 小朋友作答內容：</strong><br>
          ${this.openQuestionAnswer ? this.openQuestionAnswer : "<span style='color:#A0A0A0;'>（未填寫回答）</span>"}
        </div>
        <div style="font-size: 0.95rem; color: #556B2F; line-height: 1.55; background: #F1F6F2; padding: 12px 16px; border-radius: 10px; border-left: 4px solid var(--morandi-sage);">
          <strong>🤖 AI 導師針對閱讀呼應度之評析：</strong><br>
          <span style="color: #2E7D32; font-weight: 700;">【呼應度評定】：${openEval.relevance}</span><br>
          ${openEval.comment}
        </div>
      </div>
    ` : "";

    summaryCard.innerHTML = `
      <div class="quiz-summary-modal">
        <h2 style="font-size: 1.8rem; font-weight: 900; color: var(--text-primary); margin-bottom: 8px;">🎉 測驗完成！學習診斷成果</h2>
        <p style="color: var(--text-secondary); font-weight: 600;">四年級深層閱讀評量表現報告</p>
        
        <div class="score-circular">${score} <span style="font-size: 1.5rem; color: var(--text-secondary);">分</span></div>
        <p style="font-size: 1.1rem; font-weight: 700; margin-bottom: 20px;">
          選擇題答對：<span style="color: var(--morandi-sage-dark);">${correctCount}</span> / ${total} 題
        </p>

        <div class="level-stats-grid">
          ${levelStatHtml}
        </div>

        ${openQuestionHtml}

        <div class="action-buttons-row">
          <button class="btn-3d btn-3d-sage" onclick="QuizEngine.exportCSV()">
            📥 匯出學習成績單 (CSV)
          </button>
          <button class="btn-3d btn-3d-coral" onclick="QuizEngine.sendEmail()">
            📧 傳送成績到老師信箱
          </button>
          <button class="btn-3d btn-3d-blue" onclick="TabManager.switchTab('game')">
            🎮 前往挑戰主題小遊戲
          </button>
          <button class="btn-3d" style="background:#8B9992; color:white;" onclick="QuizEngine.retry()">
            🔄 重新挑戰一次
          </button>
        </div>
      </div>
    `;
  },

  retry() {
    this.userAnswers = {};
    this.attempts = {};
    this.isSubmitted = false;
    if (this.hintTimers) {
      Object.keys(this.hintTimers).forEach(qId => clearTimeout(this.hintTimers[qId]));
      this.hintTimers = {};
    }
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
    const openEval = this.evaluateOpenAnswer(this.openQuestionAnswer, this.openQuestionData);

    const headers = [
      "座號", "姓名", "文章標題", "選擇題總分", "總題數", "選擇題答對數",
      "思考題得分", "思考題等第", "思考題閱讀呼應度評析",
      "提取訊息得分", "推論訊息得分", "詮釋整合得分", "比較評估得分",
      "開放思考題學生作答", "交卷時間"
    ];

    const safeOpenAnswer = (this.openQuestionAnswer || "未作答").replace(/"/g, '""');
    const safeComment = (`[${openEval.relevance}] ${openEval.comment}`).replace(/"/g, '""');

    const row = [
      `"${student.seat || "未填寫"}"`,
      `"${student.name || "未填寫"}"`,
      `"${articleTitle}"`,
      score,
      this.questions.length,
      correctCount,
      openEval.score,
      `"${openEval.grade}"`,
      `"${safeComment}"`,
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
  },

  sendEmail() {
    const student = StudentManager.getStudentInfo();
    const articleTitle = document.querySelector(".article-main-title")?.innerText || "閱讀測驗";
    const now = new Date();
    const timeStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    let correctCount = 0;
    const levelStats = { 1: 0, 2: 0, 3: 0, 4: 0 };
    this.questions.forEach(q => {
      if (this.userAnswers[q.id] === q.answer) {
        correctCount++;
        levelStats[q.level]++;
      }
    });

    const score = Math.round((correctCount / this.questions.length) * 100);
    const openEval = this.evaluateOpenAnswer(this.openQuestionAnswer, this.openQuestionData);
    const targetEmail = "akk8518@chc.edu.tw";

    const subject = encodeURIComponent(`【四年級閱讀成果】座號:${student.seat || "未填"} 姓名:${student.name || "同學"} - 《${articleTitle}》(選擇題:${score}分/思考題:${openEval.score}分 等第:${openEval.grade})`);

    const bodyContent = 
`==============================================
  國小四年級深層閱讀互動評量學習報告
==============================================
【學生資訊】
座號：${student.seat || "未填寫"} 號
姓名：${student.name || "未填寫"}
評量篇章：《${articleTitle}》
交卷時間：${timeStr}

【測驗成績總覽】
選擇題總分：${score} 分 (答對: ${correctCount} / ${this.questions.length} 題)
開放思考題得分：${openEval.score} 分 (等第: ${openEval.grade})

【四層次閱讀理解表現】
・層次一 (提取訊息)：${levelStats[1]} / 4 題
・層次二 (推論訊息)：${levelStats[2]} / 4 題
・層次三 (詮釋整合)：${levelStats[3]} / 4 題
・層次四 (比較評估)：${levelStats[4]} / 4 題

【開放式思考題・深度探究表現】
學生回答內容：
${this.openQuestionAnswer || "（未填寫回答）"}

AI 針對課文呼應度之評析：
【呼應評定】：${openEval.relevance}
【導師評語】：${openEval.comment}
==============================================`;

    const mailtoUrl = `mailto:${targetEmail}?subject=${subject}&body=${encodeURIComponent(bodyContent)}`;
    
    // 嘗試調用 mailto
    window.location.href = mailtoUrl;

    alert(`📬 成績報告已為您打包！\n\n正準備傳送至老師信箱：${targetEmail}\n請在即將開啟的郵件程式中點選「傳送」即可送出作業！\n（若未自動開啟郵件，亦可匯出 CSV 成績單繳交給老師喔！）`);
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

