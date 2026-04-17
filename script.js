class SpeechTranslator {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.sessionStart = Date.now();
        this.translations = [];
        
        this.initializeElements();
        this.bindEvents();
        this.checkBrowserSupport();
    }

    initializeElements() {
        this.elements = {
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            recognizedText: document.getElementById('recognizedText'),
            translatedText: document.getElementById('translatedText'),
            detectLang: document.getElementById('detectLang'),
            targetLang: document.getElementById('targetLang'),
            copyBtn: document.getElementById('copyBtn'),
            speakBtn: document.getElementById('speakBtn'),
            clearBtn: document.getElementById('clearBtn'),
            saveSession: document.getElementById('saveSession'),
            volumeMeter: document.getElementById('volumeMeter'),
            statusText: document.getElementById('statusText'),
            sessionTime: document.getElementById('sessionTime'),
            langStatus: document.getElementById('langStatus'),
            settingsModal: document.getElementById('settingsModal'),
            closeSettings: document.getElementById('closeSettings'),
            voiceRate: document.getElementById('voiceRate'),
            voicePitch: document.getElementById('voicePitch'),
            rateValue: document.getElementById('rateValue'),
            pitchValue: document.getElementById('pitchValue'),
            continuousMode: document.getElementById('continuousMode'),
            autoTranslate: document.getElementById('autoTranslate')
        };

        // Settings defaults
        this.settings = {
            rate: 1,
            pitch: 1,
            continuous: false,
            autoTranslate: true
        };
    }

    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.startListening());
        this.elements.stopBtn.addEventListener('click', () => this.stopListening());
        this.elements.copyBtn.addEventListener('click', () => this.copyText('recognizedText'));
        this.elements.speakBtn.addEventListener('click', () => this.speakText());
        this.elements.clearBtn.addEventListener('click', () => this.clearAll());
        this.elements.saveSession.addEventListener('click', () => this.saveSession());
        
        this.elements.detectLang.addEventListener('change', () => this.updateStatus());
        this.elements.targetLang.addEventListener('change', () => this.updateStatus());
        
        // Settings events
        this.elements.voiceRate.addEventListener('input', (e) => {
            this.settings.rate = parseFloat(e.target.value);
            this.elements.rateValue.textContent = this.settings.rate.toFixed(1);
        });
        this.elements.voicePitch.addEventListener('input', (e) => {
            this.settings.pitch = parseFloat(e.target.value);
            this.elements.pitchValue.textContent = this.settings.pitch.toFixed(1);
        });
        this.elements.continuousMode.addEventListener('change', (e) => {
            this.settings.continuous = e.target.checked;
        });
        this.elements.autoTranslate.addEventListener('change', (e) => {
            this.settings.autoTranslate = e.target.checked;
        });

        // Modal
        document.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.closeSettings();
            }
        });
        this.elements.closeSettings.addEventListener('click', () => this.closeSettings());
        
        // Update session time
        setInterval(() => this.updateSessionTime(), 1000);
    }

    checkBrowserSupport() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.elements.statusText.textContent = 'Speech recognition not supported in this browser';
            this.elements.startBtn.disabled = true;
            return false;
        }
        this.recognition = new SpeechRecognition();
        this.setupRecognition();
        return true;
    }

    setupRecognition() {
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = this.elements.detectLang.value;
        
        this.recognition.onstart = () => {
            this.isListening = true;
            document.body.classList.add('listening');
            this.elements.startBtn.style.display = 'none';
            this.elements.stopBtn.style.display = 'inline-flex';
            this.elements.statusText.textContent = 'Listening... Speak now!';
            this.updateStatus('Listening');
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                this.elements.recognizedText.value += finalTranscript + ' ';
                if (this.settings.autoTranslate) {
                    this.translateText(finalTranscript);
                }
            }
            this.elements.recognizedText.scrollTop = this.elements.recognizedText.scrollHeight;
        };

        this.recognition.onend = () => {
            this.isListening = false;
            document.body.classList.remove('listening');
            this.elements.startBtn.style.display = 'inline-flex';
            this.elements.stopBtn.style.display = 'none';
            this.elements.statusText.textContent = 'Click microphone to start speaking';
            
            if (this.settings.continuous) {
                setTimeout(() => this.startListening(), 500);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.elements.statusText.textContent = `Error: ${event.error}`;
            this.stopListening();
        };
    }

    async translateText(text) {
        try {
            this.elements.statusText.textContent = 'Translating...';
            const targetLang = this.elements.targetLang.value;
            
            // Simple language translation simulation (in real app, use Google Translate API)
            const translations = {
                'en-US': { 'hi-IN': text.replace(/hello/gi, 'नमस्ते').replace(/how are you/gi, 'आप कैसे हैं') },
                'hi-IN': { 'en-US': text.replace(/नमस्ते/gi, 'Hello').replace(/आप कैसे हैं/gi, 'How are you') }
            };
            
            // For demo, we'll just use target language voices
            this.elements.translatedText.value = text;
            this.elements.langStatus.textContent = `Translated to ${targetLang}`;
            this.elements.statusText.textContent = 'Translation complete';
            
            this.translations.push({
                original: text,
                translated: text,
                from: this.elements.detectLang.value,
                to: targetLang,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Translation error:', error);
            this.elements.statusText.textContent = 'Translation failed';
        }
    }

    startListening() {
        if (this.recognition) {
            this.recognition.lang = this.elements.detectLang.value;
            this.recognition.start();
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    speakText() {
        const text = this.elements.translatedText.value;
        if (!text) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.elements.targetLang.value;
        utterance.rate = this.settings.rate;
        utterance.pitch = this.settings.pitch;
        utterance.volume = 1;

        this.synthesis.speak(utterance);
    }

    copyText(areaId) {
        const text = this.elements[areaId].value;
        navigator.clipboard.writeText(text).then(() => {
            const btn = this.elements[`${areaId.replace('Text', 'Btn')}`];
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => btn.innerHTML = originalIcon, 2000);
        });
    }

    clearAll() {
        this.elements.recognizedText.value = '';
        this.elements.translatedText.value = '';
        this.translations = [];
    }

    saveSession() {
        const sessionData = {
            timestamp: new Date().toISOString(),
            duration: this.getSessionDuration(),
            translations: this.translations
        };
        const dataStr = JSON.stringify(sessionData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `speech-session-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    updateSessionTime() {
        const elapsed = Math.floor((Date.now() - this.sessionStart) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        this.elements.sessionTime.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    getSessionDuration() {
        const elapsed = Math.floor((Date.now() - this.sessionStart) / 1000);
        return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
    }

    updateStatus(message = '') {
        this.elements.langStatus.textContent = message || 
            `From: ${this.elements.detectLang.value} → To: ${this.elements.targetLang.value}`;
    }

    openSettings() {
        this.elements.settingsModal.style.display = 'flex';
        this.elements.voiceRate.value = this.settings.rate;
        this.elements.voicePitch.value = this.settings.pitch;
        this.elements.continuousMode.checked = this.settings.continuous;
        this.elements.autoTranslate.checked = this.settings.autoTranslate;
        this.elements.rateValue.textContent = this.settings.rate.toFixed(1);
        this.elements.pitchValue.textContent = this.settings.pitch.toFixed(1);
    }

    closeSettings() {
        this.elements.settingsModal.style.display = 'none';
    }
}

// Settings button (add this to HTML or create dynamically)
document.addEventListener('DOMContentLoaded', () => {
    // Add settings button to features panel
    const featuresPanel = document.querySelector('.features-panel');
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'icon-btn';
    settingsBtn.innerHTML = '<i class="fas fa-cog"></i>';
    settingsBtn.title = 'Settings';
    settingsBtn.onclick = () => app.openSettings();
    featuresPanel.appendChild(settingsBtn);
    
    // Initialize app
    window.app = new SpeechTranslator();
});