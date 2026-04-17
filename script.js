/* ═══════════════════════════════════════════
   YojanaBot — Main Script v2
   Features: Voice Typing (Web Speech API),
             Bilingual NLP, Scheme Matching,
             Sidebar, Lang Toggle
   ═══════════════════════════════════════════ */

'use strict';

// ─── State ───────────────────────────────────
const STATE = {
  lang: 'en',
  selectedCategory: 'all',
  selectedState: 'all',
  isTyping: false,
  isListening: false,
  schemes: [],
  categories: [],
  states: []
};

// ─── DOM Refs ─────────────────────────────────
const chatMessages   = document.getElementById('chatMessages');
const chatInput      = document.getElementById('chatInput');
const sendBtn        = document.getElementById('sendBtn');
const langToggle     = document.getElementById('langToggle');
const stateSelect    = document.getElementById('stateSelect');
const categoryList   = document.getElementById('categoryList');
const sidebarToggle  = document.getElementById('sidebarToggle');
const sidebarClose   = document.getElementById('sidebarClose');
const sidebar        = document.querySelector('.sidebar');
const clearChatBtn   = document.getElementById('clearChat');
const hamburger      = document.getElementById('hamburger');
const navbar         = document.getElementById('navbar');
const voiceBtn       = document.getElementById('voiceBtn');
const voiceStatusBar = document.getElementById('voiceStatusBar');
const voiceStatusTxt = document.getElementById('voiceStatusText');
const voiceCancelBtn = document.getElementById('voiceCancelBtn');
const mobileMenu     = document.getElementById('mobileMenu');
const promptChips    = document.querySelectorAll('.prompt-chip');

// ─── Voice Recognition Setup ─────────────────
let recognition = null;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function initVoice() {
  if (!SpeechRecognition) {
    if (voiceBtn) {
      voiceBtn.classList.add('not-supported');
      voiceBtn.title = 'Voice input not supported in this browser. Try Chrome.';
    }
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous      = false;
  recognition.interimResults  = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    STATE.isListening = true;
    voiceBtn.classList.add('listening');
    voiceBtn.querySelector('.mic-icon').classList.add('hidden');
    voiceBtn.querySelector('.stop-icon').classList.remove('hidden');
    voiceStatusBar.classList.remove('hidden');
    const txt = STATE.lang === 'hi' ? 'सुन रहा हूं... बोलें' : 'Listening... Speak now';
    voiceStatusTxt.textContent = txt;
    chatInput.placeholder = STATE.lang === 'hi' ? '🎙️ सुन रहा हूं...' : '🎙️ Listening...';
  };

  recognition.onresult = (event) => {
    let interim = '';
    let final   = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    const display = final || interim;
    chatInput.value = display;
    resizeTextarea();
    if (final) {
      const msg = STATE.lang === 'hi' ? `✅ "${final}" — भेज रहे हैं...` : `✅ "${final}" — Sending...`;
      voiceStatusTxt.textContent = msg;
    } else {
      const msg = STATE.lang === 'hi' ? `🎙️ सुन रहा हूं: "${interim}"` : `🎙️ Hearing: "${interim}"`;
      voiceStatusTxt.textContent = msg;
    }
  };

  recognition.onend = () => {
    STATE.isListening = false;
    voiceBtn.classList.remove('listening');
    voiceBtn.querySelector('.mic-icon').classList.remove('hidden');
    voiceBtn.querySelector('.stop-icon').classList.add('hidden');
    voiceStatusBar.classList.add('hidden');

    // Restore placeholder
    chatInput.placeholder = STATE.lang === 'hi'
      ? chatInput.dataset.placeholderHi
      : chatInput.dataset.placeholderEn;

    // Auto-send if there's text
    const finalText = chatInput.value.trim();
    if (finalText) {
      setTimeout(() => handleSend(), 300);
    }
  };

  recognition.onerror = (event) => {
    STATE.isListening = false;
    voiceBtn.classList.remove('listening');
    voiceBtn.querySelector('.mic-icon').classList.remove('hidden');
    voiceBtn.querySelector('.stop-icon').classList.add('hidden');
    voiceStatusBar.classList.add('hidden');
    chatInput.placeholder = STATE.lang === 'hi'
      ? chatInput.dataset.placeholderHi
      : chatInput.dataset.placeholderEn;

    let errMsg = '';
    if (event.error === 'not-allowed') {
      errMsg = STATE.lang === 'hi'
        ? '🎙️ माइक्रोफोन अनुमति आवश्यक है। ब्राउज़र में अनुमति दें।'
        : '🎙️ Microphone permission required. Please allow access in your browser.';
    } else if (event.error === 'no-speech') {
      errMsg = STATE.lang === 'hi'
        ? '🎙️ कोई आवाज़ नहीं मिली। फिर से कोशिश करें।'
        : '🎙️ No speech detected. Please try again.';
    } else {
      errMsg = STATE.lang === 'hi'
        ? '🎙️ वॉयस इनपुट त्रुटि। फिर से कोशिश करें।'
        : '🎙️ Voice input error. Please try again.';
    }

    if (errMsg) {
      const welcome = document.getElementById('welcomeScreen');
      if (welcome) welcome.remove();
      appendBotMessage(`<span style="color:var(--gold-light)">${errMsg}</span>`, []);
    }
  };
}

function toggleVoice() {
  if (!SpeechRecognition) return;
  if (STATE.isListening) {
    recognition.stop();
  } else {
    // Set language based on toggle
    recognition.lang = STATE.lang === 'hi' ? 'hi-IN' : 'en-IN';
    try {
      recognition.start();
    } catch (e) {
      recognition.stop();
      setTimeout(() => recognition.start(), 200);
    }
  }
}

// ─── Data Loading ─────────────────────────────
async function loadData() {
  try {
    const res = await fetch('schemes.json');
    const data = await res.json();
    STATE.schemes    = data.schemes;
    STATE.categories = data.categories;
    STATE.states     = data.states;
    initUI();
  } catch (err) {
    console.warn('Could not load schemes.json, using fallback:', err);
    loadFallbackData();
  }
}

function loadFallbackData() {
  STATE.schemes = [
    { id:1, name:"PM Kisan Samman Nidhi", nameHi:"पीएम किसान सम्मान निधि", category:"farmer", state:"all",
      benefits:"₹6,000/year direct benefit in 3 installments", benefitsHi:"₹6,000/वर्ष 3 किस्तों में प्रत्यक्ष लाभ",
      eligibility:"Small and marginal farmers with up to 2 hectares land", eligibilityHi:"2 हेक्टेयर तक भूमि वाले किसान",
      icon:"🌾", applyUrl:"https://pmkisan.gov.in", tags:["farmer","kisan","agriculture","income"] },
    { id:2, name:"Ayushman Bharat PM-JAY", nameHi:"आयुष्मान भारत पीएम-जेएवाई", category:"health", state:"all",
      benefits:"Health cover ₹5 lakh/year per family", benefitsHi:"₹5 लाख/वर्ष प्रति परिवार स्वास्थ्य कवर",
      eligibility:"Economically weaker sections per SECC 2011", eligibilityHi:"SECC 2011 के अनुसार आर्थिक रूप से कमजोर वर्ग",
      icon:"🏥", applyUrl:"https://pmjay.gov.in", tags:["health","medical","insurance","ayushman","hospital"] },
    { id:3, name:"PM Scholarship Scheme", nameHi:"पीएम छात्रवृत्ति योजना", category:"student", state:"all",
      benefits:"₹2,500–₹3,000/month scholarship", benefitsHi:"₹2,500–₹3,000/माह छात्रवृत्ति",
      eligibility:"Students with 60%+ in Class 12", eligibilityHi:"कक्षा 12 में 60%+ अंक वाले छात्र",
      icon:"📚", applyUrl:"https://ksb.gov.in", tags:["student","scholarship","education","school","college"] },
    { id:4, name:"PM Mudra Yojana", nameHi:"पीएम मुद्रा योजना", category:"employment", state:"all",
      benefits:"Collateral-free loans up to ₹10 lakh", benefitsHi:"₹10 लाख तक बिना गारंटी ऋण",
      eligibility:"Small/micro enterprises, self-employed individuals", eligibilityHi:"लघु/सूक्ष्म उद्यम, स्वरोजगार",
      icon:"🏦", applyUrl:"https://www.mudra.org.in", tags:["employment","business","loan","mudra","startup","rozgar"] },
    { id:5, name:"Beti Bachao Beti Padhao", nameHi:"बेटी बचाओ बेटी पढ़ाओ", category:"women", state:"all",
      benefits:"Financial aid for girl child education and welfare", benefitsHi:"बालिका शिक्षा और कल्याण के लिए वित्तीय सहायता",
      eligibility:"Girl children in select districts", eligibilityHi:"चयनित जिलों में बालिकाएं",
      icon:"👧", applyUrl:"https://wcd.nic.in/bbbp-schemes", tags:["women","girl","education","beti","welfare","mahila"] },
  ];
  STATE.categories = [
    { id:"student",    label:"Student",       labelHi:"छात्र",        icon:"🎓" },
    { id:"farmer",     label:"Farmer",        labelHi:"किसान",        icon:"🌾" },
    { id:"women",      label:"Women Welfare", labelHi:"महिला कल्याण", icon:"👩" },
    { id:"employment", label:"Employment",    labelHi:"रोजगार",       icon:"💼" },
    { id:"health",     label:"Health",        labelHi:"स्वास्थ्य",    icon:"🏥" }
  ];
  STATE.states = ["All States","Uttar Pradesh","Maharashtra","Delhi","Bihar","Rajasthan","Punjab","Gujarat"];
  initUI();
}

// ─── Init UI ─────────────────────────────────
function initUI() {
  buildStateDropdown();
  buildCategoryList();
  renderWelcome();
  updateAllText();
}

function buildStateDropdown() {
  if (!stateSelect) return;
  stateSelect.innerHTML = '';
  STATE.states.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = i === 0 ? 'all' : s.toLowerCase().replace(/\s+/g,'_');
    opt.textContent = s;
    if (i === 0) opt.selected = true;
    stateSelect.appendChild(opt);
  });
}

function buildCategoryList() {
  if (!categoryList) return;
  categoryList.innerHTML = '';
  const allBtn = makeBtn('all', '🧭',
    STATE.lang === 'hi' ? 'सभी योजनाएं' : 'All Schemes',
    STATE.schemes.length, true);
  allBtn.addEventListener('click', () => handleCategoryClick('all', allBtn));
  categoryList.appendChild(allBtn);

  STATE.categories.forEach(cat => {
    const count = STATE.schemes.filter(s => s.category === cat.id).length;
    const label = STATE.lang === 'hi' ? cat.labelHi : cat.label;
    const btn = makeBtn(cat.id, cat.icon, label, count, false);
    btn.addEventListener('click', () => handleCategoryClick(cat.id, btn));
    categoryList.appendChild(btn);
  });
}

function makeBtn(catId, icon, label, count, active) {
  const btn = document.createElement('button');
  btn.className = 'cat-btn' + (active ? ' active' : '');
  btn.dataset.category = catId;
  btn.innerHTML = `<span class="cat-icon">${icon}</span><span>${label}</span><span class="cat-count">${count}</span>`;
  return btn;
}

function handleCategoryClick(catId, btn) {
  STATE.selectedCategory = catId;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  closeSidebar();

  const filtered = filterSchemes(catId, STATE.selectedState);
  const welcome = document.getElementById('welcomeScreen');
  if (welcome) welcome.remove();

  if (filtered.length === 0) {
    appendBotMessage(t('No schemes found for this category.', 'इस श्रेणी के लिए कोई योजना नहीं मिली।'), []);
  } else {
    const catLabel = catId === 'all'
      ? t('All Schemes', 'सभी योजनाएं')
      : (STATE.categories.find(c => c.id === catId)?.[STATE.lang === 'hi' ? 'labelHi' : 'label'] || catId);
    appendBotMessage(
      t(`Found <strong>${filtered.length}</strong> scheme(s) under <strong>${catLabel}</strong>:`,
        `<strong>${catLabel}</strong> में <strong>${filtered.length}</strong> योजना(एं) मिलीं:`),
      filtered
    );
  }
}

// ─── Filtering ───────────────────────────────
function filterSchemes(category, stateVal) {
  return STATE.schemes.filter(s => {
    const catMatch   = category === 'all' || s.category === category;
    const stateMatch = stateVal === 'all' || s.state === 'all' || s.state === stateVal;
    return catMatch && stateMatch;
  });
}

// ─── NLP Matching ─────────────────────────────
const KEYWORD_MAP = {
  farmer:     ['farmer','kisan','krishak','kheti','agriculture','crop','fasal','gramin','kisaan',
               'किसान','कृषि','खेती','फसल','ग्रामीण','बीज'],
  student:    ['student','scholarship','school','college','university','education','study','padhai',
               'vidyarthi','siksha','छात्र','पढ़ाई','छात्रवृत्ति','शिक्षा','विद्यार्थी','स्कूल','कॉलेज'],
  women:      ['women','woman','girl','mahila','beti','maternity','mother','welfare','ladies','female',
               'महिला','बेटी','माँ','मातृत्व','लड़की','नारी'],
  employment: ['job','employment','business','startup','loan','rozgar','kaam','work','mudra','skill',
               'training','naukri','self employed','entrepreneur',
               'नौकरी','रोजगार','व्यापार','कौशल','ऋण','काम','बेरोजगार'],
  health:     ['health','medical','hospital','insurance','bima','doctor','ayushman','treatment','medicine',
               'स्वास्थ्य','अस्पताल','बीमा','चिकित्सा','दवा','इलाज']
};

function detectCategories(text) {
  const lower = text.toLowerCase();
  const detected = new Set();
  for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) detected.add(cat);
  }
  return [...detected];
}

function searchSchemes(query) {
  const lower = query.toLowerCase();
  const detectedCats = detectCategories(query);

  const scored = STATE.schemes.map(scheme => {
    let score = 0;
    if (detectedCats.includes(scheme.category)) score += 10;

    const haystack = [
      scheme.name, scheme.nameHi,
      scheme.benefits, scheme.benefitsHi,
      scheme.eligibility, scheme.eligibilityHi,
      ...(scheme.tags || [])
    ].join(' ').toLowerCase();

    lower.split(/\s+/).filter(w => w.length > 2).forEach(word => {
      if (haystack.includes(word)) score += 2;
    });

    if (STATE.selectedState !== 'all' && scheme.state !== 'all') {
      const sName = STATE.states.find(s =>
        s.toLowerCase().replace(/\s+/g,'_') === STATE.selectedState);
      if (sName && scheme.state.toLowerCase() !== sName.toLowerCase()) score = 0;
    }
    return { scheme, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ scheme }) => scheme)
    .slice(0, 6);
}

// ─── Translation helper ───────────────────────
function t(en, hi) { return STATE.lang === 'hi' ? hi : en; }

// ─── Chat Responses ──────────────────────────
const GREETINGS = ['hello','hi','hey','namaste','नमस्ते','हाय','हेलो','sat sri akal'];
const THANKS    = ['thank','thanks','shukriya','dhanyawad','धन्यवाद','शुक्रिया'];
const HELPS     = ['help','what can you do','how does this work','मदद','कैसे काम','क्या करते'];

function generateBotResponse(userMsg) {
  const lower = userMsg.toLowerCase().trim();

  if (GREETINGS.some(g => lower.includes(g))) {
    return {
      text: t(
        '🙏 Namaste! I\'m <strong>YojanaBot</strong> — your AI guide to Indian government schemes.<br><br>Tell me about yourself (e.g. <em>"I am a student"</em> or <em>"I am a farmer from UP"</em>) and I\'ll find the best schemes for you! You can also use the 🎙️ mic button to speak.',
        '🙏 नमस्ते! मैं <strong>YojanaBot</strong> हूं — भारतीय सरकारी योजनाओं का आपका AI गाइड।<br><br>मुझे अपने बारे में बताएं (जैसे <em>"मैं एक छात्र हूं"</em> या <em>"मैं UP का किसान हूं"</em>) और मैं आपके लिए सबसे अच्छी योजनाएं ढूंढूंगा! 🎙️ माइक बटन से बोल भी सकते हैं।'
      ),
      schemes: []
    };
  }

  if (THANKS.some(g => lower.includes(g))) {
    return {
      text: t(
        '😊 You\'re welcome! Feel free to ask about any other schemes. You can also browse the <strong>Dashboard</strong> for all schemes.',
        '😊 आपका स्वागत है! किसी अन्य योजना के बारे में पूछें। <strong>डैशबोर्ड</strong> पर सभी योजनाएं देख सकते हैं।'
      ),
      schemes: []
    };
  }

  if (HELPS.some(g => lower.includes(g))) {
    return {
      text: t(
        '🤖 I help you discover Indian government schemes! Just tell me:<br>• Your role: <em>farmer, student, woman, unemployed</em><br>• What you need: <em>loan, scholarship, health insurance</em><br>• Or click 🎙️ to speak instead of typing<br><br>Example: <em>"I am a farmer looking for crop insurance"</em>',
        '🤖 मैं सरकारी योजनाएं खोजने में मदद करता हूं! बताएं:<br>• आपकी भूमिका: <em>किसान, छात्र, महिला, बेरोजगार</em><br>• आपकी ज़रूरत: <em>ऋण, छात्रवृत्ति, स्वास्थ्य बीमा</em><br>• या 🎙️ बटन से बोलें<br><br>उदाहरण: <em>"मैं एक किसान हूं, फसल बीमा चाहिए"</em>'
      ),
      schemes: []
    };
  }

  const results = searchSchemes(userMsg);

  if (results.length === 0) {
    return {
      text: t(
        '🔍 I couldn\'t find specific schemes for your query. Try being more specific:<br>• Role: <em>farmer, student, woman, businessman</em><br>• Need: <em>loan, scholarship, health, housing</em><br><br>Or use the 🎙️ voice button to speak your query!',
        '🔍 आपकी क्वेरी के लिए कोई योजना नहीं मिली। अधिक विशिष्ट प्रयास करें:<br>• भूमिका: <em>किसान, छात्र, महिला, व्यापारी</em><br>• ज़रूरत: <em>ऋण, छात्रवृत्ति, स्वास्थ्य, आवास</em><br><br>या 🎙️ वॉयस बटन से बोलकर पूछें!'
      ),
      schemes: []
    };
  }

  return {
    text: t(
      `✅ Found <strong>${results.length}</strong> scheme(s) matching your profile:`,
      `✅ आपकी प्रोफ़ाइल से मेल खाती <strong>${results.length}</strong> योजना(एं) मिलीं:`
    ),
    schemes: results
  };
}

// ─── DOM — Messages ───────────────────────────
function getTime() {
  return new Date().toLocaleTimeString(STATE.lang === 'hi' ? 'hi-IN' : 'en-IN', {
    hour: '2-digit', minute: '2-digit'
  });
}

function appendUserMessage(text) {
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.innerHTML = `
    <div class="msg-avatar user-av">👤</div>
    <div class="msg-content">
      <div class="msg-bubble user">${escapeHtml(text)}</div>
      <span class="msg-time">${getTime()}</span>
    </div>`;
  chatMessages.appendChild(row);
  scrollToBottom();
}

function appendBotMessage(html, schemes = []) {
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.innerHTML = `
    <div class="msg-avatar bot-av">🤖</div>
    <div class="msg-content">
      <div class="msg-bubble bot">${html}</div>
      ${schemes.length ? renderSchemeCards(schemes) : ''}
      <span class="msg-time">${getTime()}</span>
    </div>`;
  chatMessages.appendChild(row);
  scrollToBottom();
}

function renderSchemeCards(schemes) {
  const isHi = STATE.lang === 'hi';
  const cards = schemes.map((s, i) => `
    <div class="scheme-card" style="animation-delay:${i * 0.07}s">
      <div class="card-top">
        <span class="card-emoji">${s.icon || '📋'}</span>
        <div class="card-title-area">
          <div class="card-name">${isHi && s.nameHi ? s.nameHi : s.name}</div>
          <span class="card-category-badge">${getCatLabel(s.category)}</span>
        </div>
      </div>
      <div class="card-details">
        <div class="card-detail-row">
          <span class="detail-label">${t('Benefits','लाभ')}</span>
          <span class="detail-value benefit-val">${isHi && s.benefitsHi ? s.benefitsHi : s.benefits}</span>
        </div>
        <div class="card-detail-row">
          <span class="detail-label">${t('Eligible','पात्रता')}</span>
          <span class="detail-value">${isHi && s.eligibilityHi ? s.eligibilityHi : s.eligibility}</span>
        </div>
      </div>
      <div class="card-footer">
        <a href="${s.applyUrl}" target="_blank" rel="noopener" class="apply-btn">
          ${t('Apply Now','अभी आवेदन करें')}
          <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </a>
      </div>
    </div>
  `).join('');
  return `<div class="scheme-results">${cards}</div>`;
}

function getCatLabel(catId) {
  const isHi = STATE.lang === 'hi';
  const cat  = STATE.categories.find(c => c.id === catId);
  if (cat) return isHi ? cat.labelHi : cat.label;
  return catId.charAt(0).toUpperCase() + catId.slice(1);
}

function renderWelcome() {
  chatMessages.innerHTML = '';
  const isHi = STATE.lang === 'hi';
  const welcome = document.createElement('div');
  welcome.className = 'welcome-screen';
  welcome.id = 'welcomeScreen';
  welcome.innerHTML = `
    <div class="welcome-icon">🤖</div>
    <div class="welcome-title">${isHi ? 'YojanaBot में आपका स्वागत है' : 'Welcome to YojanaBot'}</div>
    <p class="welcome-sub">${isHi
      ? 'टाइप करें या 🎙️ बटन से बोलें। मुझे बताएं कि आप किसान हैं, छात्र हैं, महिला हैं या बेरोजगार — मैं सही योजनाएं ढूंढूंगा।'
      : 'Type or click 🎙️ to speak. Tell me if you\'re a farmer, student, woman, or job-seeker — I\'ll find the right schemes for you instantly.'}</p>
    <div class="welcome-suggestions">
      <button class="suggestion-pill" onclick="sendSuggestion('I am a student looking for scholarships')">🎓 ${isHi ? 'छात्र छात्रवृत्ति' : 'Student Scholarships'}</button>
      <button class="suggestion-pill" onclick="sendSuggestion('I am a farmer and need financial support')">🌾 ${isHi ? 'किसान सहायता' : 'Farmer Support'}</button>
      <button class="suggestion-pill" onclick="sendSuggestion('Health insurance for my family')">🏥 ${isHi ? 'स्वास्थ्य बीमा' : 'Health Insurance'}</button>
      <button class="suggestion-pill" onclick="sendSuggestion('I want to start a business and need a loan')">💼 ${isHi ? 'स्टार्टअप ऋण' : 'Startup Loan'}</button>
      <button class="suggestion-pill" onclick="sendSuggestion('Welfare schemes for women')">👩 ${isHi ? 'महिला कल्याण' : 'Women Welfare'}</button>
    </div>
  `;
  chatMessages.appendChild(welcome);
}

window.sendSuggestion = function(text) {
  const welcome = document.getElementById('welcomeScreen');
  if (welcome) welcome.remove();
  appendUserMessage(text);
  processMessage(text);
};

window.showAllSchemes = function() {
  scrollToChat();
  setTimeout(() => {
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.remove();
    appendBotMessage(
      t(`📋 Here are all <strong>${STATE.schemes.length}</strong> government schemes:`,
        `📋 सभी <strong>${STATE.schemes.length}</strong> सरकारी योजनाएं:`),
      STATE.schemes
    );
  }, 400);
};

// ─── Message Flow ─────────────────────────────
function processMessage(text) {
  if (STATE.isTyping) return;
  STATE.isTyping = true;
  sendBtn.disabled = true;
  showTyping();
  const delay = 900 + Math.random() * 600;
  setTimeout(() => {
    removeTyping();
    const response = generateBotResponse(text);
    appendBotMessage(response.text, response.schemes);
    STATE.isTyping = false;
    sendBtn.disabled = false;
  }, delay);
}

function handleSend() {
  const text = chatInput.value.trim();
  if (!text || STATE.isTyping) return;
  const welcome = document.getElementById('welcomeScreen');
  if (welcome) welcome.remove();
  appendUserMessage(text);
  chatInput.value = '';
  resizeTextarea();
  processMessage(text);
}

function showTyping() {
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.id = 'typingRow';
  row.innerHTML = `
    <div class="msg-avatar bot-av">🤖</div>
    <div class="msg-content">
      <div class="typing-indicator">
        <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
      </div>
    </div>`;
  chatMessages.appendChild(row);
  scrollToBottom();
}
function removeTyping() { document.getElementById('typingRow')?.remove(); }

function scrollToBottom() {
  requestAnimationFrame(() => { chatMessages.scrollTop = chatMessages.scrollHeight; });
}
function resizeTextarea() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';
}

// ─── Language Toggle ─────────────────────────
function toggleLanguage() {
  STATE.lang = STATE.lang === 'en' ? 'hi' : 'en';
  const enEl = langToggle.querySelector('.lang-en');
  const hiEl = langToggle.querySelector('.lang-hi');
  if (STATE.lang === 'hi') {
    enEl.classList.remove('active'); hiEl.classList.add('active');
  } else {
    hiEl.classList.remove('active'); enEl.classList.add('active');
  }
  chatInput.placeholder = STATE.lang === 'hi'
    ? chatInput.dataset.placeholderHi
    : chatInput.dataset.placeholderEn;
  if (recognition) recognition.lang = STATE.lang === 'hi' ? 'hi-IN' : 'en-IN';
  buildCategoryList();
  updateAllText();
  renderWelcome();
}

function updateAllText() {
  const isHi = STATE.lang === 'hi';
  document.querySelectorAll('[data-en]').forEach(el => {
    const target = isHi ? el.dataset.hi : el.dataset.en;
    if (target !== undefined) el.textContent = target;
  });
  document.querySelectorAll('[data-placeholder-en]').forEach(el => {
    el.placeholder = isHi ? el.dataset.placeholderHi : el.dataset.placeholderEn;
  });
}

// ─── Sidebar ─────────────────────────────────
function openSidebar() { sidebar.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeSidebar() { sidebar.classList.remove('open'); document.body.style.overflow = ''; }

// ─── Scroll ───────────────────────────────────
window.scrollToChat = function() {
  document.getElementById('chatSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ─── Escape HTML ─────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Mobile Menu ─────────────────────────────
window.closeMobileMenu = function() {
  if (mobileMenu) mobileMenu.classList.remove('open');
  if (hamburger)  hamburger.classList.remove('open');
};

// ─── Event Listeners ─────────────────────────
sendBtn?.addEventListener('click', handleSend);

chatInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
});
chatInput?.addEventListener('input', resizeTextarea);

langToggle?.addEventListener('click', toggleLanguage);

stateSelect?.addEventListener('change', e => { STATE.selectedState = e.target.value; });

sidebarToggle?.addEventListener('click', openSidebar);
sidebarClose?.addEventListener('click', closeSidebar);

clearChatBtn?.addEventListener('click', () => { chatMessages.innerHTML = ''; renderWelcome(); });

hamburger?.addEventListener('click', () => {
  mobileMenu?.classList.toggle('open');
  hamburger.classList.toggle('open');
});

promptChips.forEach(chip => {
  chip.addEventListener('click', () => {
    const promptText = chip.dataset.prompt;
    scrollToChat();
    setTimeout(() => {
      const welcome = document.getElementById('welcomeScreen');
      if (welcome) welcome.remove();
      appendUserMessage(promptText);
      processMessage(promptText);
      closeSidebar();
    }, 300);
  });
});

// Close sidebar on outside click
document.addEventListener('click', e => {
  if (sidebar?.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      !sidebarToggle?.contains(e.target) &&
      !hamburger?.contains(e.target)) {
    closeSidebar();
  }
});

// Voice button
voiceBtn?.addEventListener('click', toggleVoice);
voiceCancelBtn?.addEventListener('click', () => { if (recognition && STATE.isListening) recognition.stop(); });

// Navbar scroll
window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ─── Init ─────────────────────────────────────
initVoice();
loadData();
