class SpeechTranslatorApp {
  constructor() {
    this.recognition = null;
    this.speechSynthesis = window.speechSynthesis;
    this.isListening = false;
    this.sessionStart = Date.now();
    this.settings = {
      rate: 1,
      pitch: 1,
      continuous: false,
      autoTranslate: true,
      apiEndpoint: "",
      apiKey: ""
    };

    this.el = {};
    this.init();
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.loadSettings();
    this.setupSpeechRecognition();
    this.updateSessionTimer();
    setInterval(() => this.updateSessionTimer(), 1000);
  }

  cacheElements() {
    const ids = [
      "openSettingsBtn","settingsModal","closeSettingsBtn","detectLang","targetLang",
      "startBtn","stopBtn","clearBtn","copyBtn","speakBtn","saveSessionBtn",
      "recognizedText","translatedText","statusText","langStatus","sessionTime",
      "volumeMeter","voiceRate","voicePitch","rateValue","pitchValue",
      "continuousMode","autoTranslate","apiEndpoint","apiKey","showKey",
      "testApiBtn","saveSettingsBtn"
    ];
    ids.forEach(id => this.el[id] = document.getElementById(id));
  }

  bindEvents() {
    this.el.openSettingsBtn.addEventListener("click", () => this.openSettings());
    this.el.closeSettingsBtn.addEventListener("click", () => this.closeSettings());
    this.el.settingsModal.addEventListener("click", (e) => {
      if (e.target === this.el.settingsModal) this.closeSettings();
    });

    this.el.startBtn.addEventListener("click", () => this.startListening());
    this.el.stopBtn.addEventListener("click", () => this.stopListening());
    this.el.clearBtn.addEventListener("click", () => this.clearAll());
    this.el.copyBtn.addEventListener("click", () => this.copyText());
    this.el.speakBtn.addEventListener("click", () => this.speakTranslation());
    this.el.saveSessionBtn.addEventListener("click", () => this.saveSession());

    this.el.voiceRate.addEventListener("input", () => {
      this.settings.rate = parseFloat(this.el.voiceRate.value);
      this.el.rateValue.textContent = this.settings.rate.toFixed(1);
      this.saveSettings();
    });

    this.el.voicePitch.addEventListener("input", () => {
      this.settings.pitch = parseFloat(this.el.voicePitch.value);
      this.el.pitchValue.textContent = this.settings.pitch.toFixed(1);
      this.saveSettings();
    });

    this.el.continuousMode.addEventListener("change", () => {
      this.settings.continuous = this.el.continuousMode.checked;
      this.saveSettings();
    });

    this.el.autoTranslate.addEventListener("change", () => {
      this.settings.autoTranslate = this.el.autoTranslate.checked;
      this.saveSettings();
    });

    this.el.showKey.addEventListener("change", () => {
      this.el.apiKey.type = this.el.showKey.checked ? "text" : "password";
    });

    this.el.testApiBtn.addEventListener("click", () => this.testConnection());
    this.el.saveSettingsBtn.addEventListener("click", () => this.saveSettings(true));

    this.el.detectLang.addEventListener("change", () => {
      this.el.langStatus.textContent = `Speech: ${this.el.detectLang.value}`;
    });
    this.el.targetLang.addEventListener("change", () => {
      this.el.langStatus.textContent = `Target: ${this.el.targetLang.value}`;
    });
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.el.statusText.textContent = "Speech recognition is not supported in this browser.";
      this.el.startBtn.disabled = true;
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = this.el.detectLang.value;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.el.statusText.textContent = "Listening...";
      this.el.startBtn.classList.add("hidden");
      this.el.stopBtn.classList.remove("hidden");
    };

    this.recognition.onresult = async (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + " ";
        }
      }

      if (finalText.trim()) {
        this.el.recognizedText.value += finalText;
        this.el.recognizedText.scrollTop = this.el.recognizedText.scrollHeight;
        if (this.settings.autoTranslate) {
          await this.translateText(finalText.trim());
        }
      }
    };

    this.recognition.onerror = (event) => {
      this.el.statusText.textContent = `Error: ${event.error}`;
      this.stopListening();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.el.statusText.textContent = "Ready";
      this.el.startBtn.classList.remove("hidden");
      this.el.stopBtn.classList.add("hidden");
      if (this.settings.continuous) {
        setTimeout(() => this.startListening(), 400);
      }
    };
  }

  startListening() {
    if (!this.recognition) return;
    this.recognition.lang = this.el.detectLang.value;
    try {
      this.recognition.start();
    } catch (e) {}
  }

  stopListening() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch (e) {}
  }

  async translateText(text) {
    const endpoint = this.settings.apiEndpoint.trim();
    const apiKey = this.settings.apiKey.trim();

    if (!endpoint || !apiKey) {
      this.el.translatedText.value = "Add API endpoint and key in Settings.";
      this.el.langStatus.textContent = "Missing API config";
      return;
    }

    this.el.statusText.textContent = "Translating...";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          text,
          source: this.el.detectLang.value,
          target: this.el.targetLang.value
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      const translated =
        data.translatedText ||
        data.translation ||
        data.result ||
        data.data?.translatedText ||
        data.data?.translations?.[0]?.translatedText ||
        "";

      this.el.translatedText.value = translated || "No translation returned.";
      this.el.langStatus.textContent = "Translated";
      this.el.statusText.textContent = "Done";
    } catch (error) {
      this.el.translatedText.value = `Translation failed: ${error.message}`;
      this.el.statusText.textContent = "Translation failed";
    }
  }

  speakTranslation() {
    const text = this.el.translatedText.value.trim();
    if (!text || text.startsWith("Translation failed") || text === "Add API endpoint and key in Settings.") return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.lang = this.el.targetLang.value;
    this.speechSynthesis.speak(utterance);
  }

  copyText() {
    const text = this.el.translatedText.value || this.el.recognizedText.value;
    if (!text) return;
    navigator.clipboard.writeText(text);
  }

  clearAll() {
    this.el.recognizedText.value = "";
    this.el.translatedText.value = "";
    this.el.statusText.textContent = "Cleared";
  }

  saveSession() {
    const payload = {
      recognized: this.el.recognizedText.value,
      translated: this.el.translatedText.value,
      date: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `speech-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  openSettings() {
    this.el.settingsModal.classList.remove("hidden");
  }

  closeSettings() {
    this.el.settingsModal.classList.add("hidden");
  }

  loadSettings() {
    this.settings.rate = parseFloat(localStorage.getItem("rate") || "1");
    this.settings.pitch = parseFloat(localStorage.getItem("pitch") || "1");
    this.settings.continuous = localStorage.getItem("continuous") === "true";
    this.settings.autoTranslate = localStorage.getItem("autoTranslate") !== "false";
    this.settings.apiEndpoint = localStorage.getItem("apiEndpoint") || "";
    this.settings.apiKey = localStorage.getItem("apiKey") || "";

    this.el.voiceRate.value = this.settings.rate;
    this.el.voicePitch.value = this.settings.pitch;
    this.el.rateValue.textContent = this.settings.rate.toFixed(1);
    this.el.pitchValue.textContent = this.settings.pitch.toFixed(1);
    this.el.continuousMode.checked = this.settings.continuous;
    this.el.autoTranslate.checked = this.settings.autoTranslate;
    this.el.apiEndpoint.value = this.settings.apiEndpoint;
    this.el.apiKey.value = this.settings.apiKey;
    this.el.showKey.checked = false;
    this.el.apiKey.type = "password";
  }

  saveSettings(showMessage = false) {
    this.settings.apiEndpoint = this.el.apiEndpoint.value.trim();
    this.settings.apiKey = this.el.apiKey.value.trim();

    localStorage.setItem("rate", String(this.settings.rate));
    localStorage.setItem("pitch", String(this.settings.pitch));
    localStorage.setItem("continuous", String(this.settings.continuous));
    localStorage.setItem("autoTranslate", String(this.settings.autoTranslate));
    localStorage.setItem("apiEndpoint", this.settings.apiEndpoint);
    localStorage.setItem("apiKey", this.settings.apiKey);

    if (showMessage) {
      this.el.statusText.textContent = "Settings saved";
      this.closeSettings();
    }
  }

  async testConnection() {
    const endpoint = this.el.apiEndpoint.value.trim();
    const apiKey = this.el.apiKey.value.trim();

    if (!endpoint || !apiKey) {
      this.el.statusText.textContent = "Please enter endpoint and key first.";
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          text: "Hello",
          source: "en",
          target: "hi"
        })
      });

      if (res.ok) {
        this.el.statusText.textContent = "Connection successful";
      } else {
        this.el.statusText.textContent = `Connection failed: ${res.status}`;
      }
    } catch (error) {
      this.el.statusText.textContent = `Connection error: ${error.message}`;
    }
  }

  updateSessionTimer() {
    const elapsed = Math.floor((Date.now() - this.sessionStart) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    this.el.sessionTime.textContent = `${mm}:${ss}`;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new SpeechTranslatorApp();
});