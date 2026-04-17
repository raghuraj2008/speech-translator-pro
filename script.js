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
      translatorKey: "",
      translatorEndpoint: "",
      translatorLocation: "",
      speechKey: "",
      speechEndpoint: "",
      speechRegion: ""
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
      "continuousMode","autoTranslate","translatorKey","translatorEndpoint",
      "translatorLocation","speechKey","speechEndpoint","speechRegion",
      "showKeys","testApiBtn","saveSettingsBtn"
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

    this.el.showKeys.addEventListener("change", () => {
      const type = this.el.showKeys.checked ? "text" : "password";
      this.el.translatorKey.type = type;
      this.el.speechKey.type = type;
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
    const endpoint = this.settings.translatorEndpoint.trim();
    const key = this.settings.translatorKey.trim();
    const location = this.settings.translatorLocation.trim();

    if (!endpoint || !key || !location) {
      this.el.translatedText.value = "Add Translator key, endpoint, and location in Settings.";
      this.el.langStatus.textContent = "Missing Translator config";
      return;
    }

    this.el.statusText.textContent = "Translating...";
    try {
      const source = this.el.detectLang.value === "auto" ? "en" : this.el.detectLang.value.split("-")[0];
      const target = this.el.targetLang.value;

      const url = `${endpoint.replace(/\/$/, "")}/translate?api-version=3.0&from=${encodeURIComponent(source)}&to=${encodeURIComponent(target)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": key,
          "Ocp-Apim-Subscription-Region": location
        },
        body: JSON.stringify([{ Text: text }])
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const translated = data?.[0]?.translations?.[0]?.text || "";
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
    if (!text || text.startsWith("Translation failed") || text === "Add Translator key, endpoint, and location in Settings.") return;

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
    this.settings.translatorKey = localStorage.getItem("translatorKey") || "";
    this.settings.translatorEndpoint = localStorage.getItem("translatorEndpoint") || "";
    this.settings.translatorLocation = localStorage.getItem("translatorLocation") || "";
    this.settings.speechKey = localStorage.getItem("speechKey") || "";
    this.settings.speechEndpoint = localStorage.getItem("speechEndpoint") || "";
    this.settings.speechRegion = localStorage.getItem("speechRegion") || "";

    this.el.voiceRate.value = this.settings.rate;
    this.el.voicePitch.value = this.settings.pitch;
    this.el.rateValue.textContent = this.settings.rate.toFixed(1);
    this.el.pitchValue.textContent = this.settings.pitch.toFixed(1);
    this.el.continuousMode.checked = this.settings.continuous;
    this.el.autoTranslate.checked = this.settings.autoTranslate;

    this.el.translatorKey.value = this.settings.translatorKey;
    this.el.translatorEndpoint.value = this.settings.translatorEndpoint;
    this.el.translatorLocation.value = this.settings.translatorLocation;
    this.el.speechKey.value = this.settings.speechKey;
    this.el.speechEndpoint.value = this.settings.speechEndpoint;
    this.el.speechRegion.value = this.settings.speechRegion;

    this.el.showKeys.checked = false;
    this.el.translatorKey.type = "password";
    this.el.speechKey.type = "password";
  }

  saveSettings(showMessage = false) {
    this.settings.translatorKey = this.el.translatorKey.value.trim();
    this.settings.translatorEndpoint = this.el.translatorEndpoint.value.trim();
    this.settings.translatorLocation = this.el.translatorLocation.value.trim();
    this.settings.speechKey = this.el.speechKey.value.trim();
    this.settings.speechEndpoint = this.el.speechEndpoint.value.trim();
    this.settings.speechRegion = this.el.speechRegion.value.trim();

    localStorage.setItem("rate", String(this.settings.rate));
    localStorage.setItem("pitch", String(this.settings.pitch));
    localStorage.setItem("continuous", String(this.settings.continuous));
    localStorage.setItem("autoTranslate", String(this.settings.autoTranslate));
    localStorage.setItem("translatorKey", this.settings.translatorKey);
    localStorage.setItem("translatorEndpoint", this.settings.translatorEndpoint);
    localStorage.setItem("translatorLocation", this.settings.translatorLocation);
    localStorage.setItem("speechKey", this.settings.speechKey);
    localStorage.setItem("speechEndpoint", this.settings.speechEndpoint);
    localStorage.setItem("speechRegion", this.settings.speechRegion);

    if (showMessage) {
      this.el.statusText.textContent = "Settings saved";
      this.closeSettings();
    }
  }

  async testConnection() {
    const endpoint = this.el.translatorEndpoint.value.trim();
    const key = this.el.translatorKey.value.trim();
    const location = this.el.translatorLocation.value.trim();

    if (!endpoint || !key || !location) {
      this.el.statusText.textContent = "Enter translator endpoint, key, and location.";
      return;
    }

    try {
      const url = `${endpoint.replace(/\/$/, "")}/translate?api-version=3.0&to=hi`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": key,
          "Ocp-Apim-Subscription-Region": location
        },
        body: JSON.stringify([{ Text: "Hello" }])
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