"use client";

export type VoiceEvent =
  | "connected"
  | "disconnected"
  | "waste_detected"
  | "sorted_dry"
  | "sorted_wet"
  | "bin_warning"
  | "bin_critical"
  | "temp_warning"
  | "temp_critical"
  | "servo_command"
  | "system_ok";

const voiceMessages: Record<VoiceEvent, string> = {
  connected: "SmartBin connected successfully. System online.",
  disconnected: "Connection lost. Attempting to reconnect.",
  waste_detected: "Object detected. Analyzing waste type.",
  sorted_dry: "Dry waste identified. Routing to dry bin.",
  sorted_wet: "Wet waste identified. Routing to wet bin.",
  bin_warning: "Warning. Bin capacity reaching 70 percent. Consider emptying soon.",
  bin_critical: "Alert. Bin capacity critical at 85 percent. Immediate attention required.",
  temp_warning: "Temperature warning. Ambient temperature is elevated.",
  temp_critical: "Temperature alert. Critical temperature detected. Check system immediately.",
  servo_command: "Manual servo command executed.",
  system_ok: "All systems operating normally.",
};

class VoiceNotificationSystem {
  private enabled: boolean = true;
  private volume: number = 0.8;
  private rate: number = 0.95;
  private pitch: number = 1.0;
  private voice: SpeechSynthesisVoice | null = null;
  private lastSpoken: Map<VoiceEvent, number> = new Map();
  private cooldownMs: number = 10000; // 10 second cooldown per event type
  private queue: string[] = [];
  private isSpeaking: boolean = false;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      // Load voices when available
      window.speechSynthesis.onvoiceschanged = () => {
        this.selectBestVoice();
      };
      // Try immediately in case voices are already loaded
      this.selectBestVoice();
    }
  }

  private selectBestVoice() {
    if (typeof window === "undefined") return;
    
    const voices = window.speechSynthesis.getVoices();
    
    // Prefer natural/premium voices, then English voices
    const preferredVoices = [
      "Google UK English Female",
      "Google US English",
      "Microsoft Zira",
      "Samantha",
      "Karen",
      "Daniel",
      "Moira",
    ];

    for (const preferred of preferredVoices) {
      const found = voices.find((v) => v.name.includes(preferred));
      if (found) {
        this.voice = found;
        return;
      }
    }

    // Fallback to any English voice
    const englishVoice = voices.find(
      (v) => v.lang.startsWith("en") && !v.name.includes("Google")
    );
    if (englishVoice) {
      this.voice = englishVoice;
      return;
    }

    // Last resort: first available voice
    if (voices.length > 0) {
      this.voice = voices[0];
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && typeof window !== "undefined") {
      window.speechSynthesis.cancel();
      this.queue = [];
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(2, rate));
  }

  getSettings() {
    return {
      enabled: this.enabled,
      volume: this.volume,
      rate: this.rate,
    };
  }

  private canSpeak(event: VoiceEvent): boolean {
    const lastTime = this.lastSpoken.get(event);
    if (!lastTime) return true;
    return Date.now() - lastTime >= this.cooldownMs;
  }

  speak(event: VoiceEvent, customMessage?: string) {
    if (!this.enabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!this.canSpeak(event)) return;

    const message = customMessage || voiceMessages[event];
    if (!message) return;

    this.lastSpoken.set(event, Date.now());
    this.queue.push(message);
    this.processQueue();
  }

  speakCustom(message: string) {
    if (!this.enabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    this.queue.push(message);
    this.processQueue();
  }

  private processQueue() {
    if (this.isSpeaking || this.queue.length === 0) return;

    const message = this.queue.shift();
    if (!message) return;

    this.isSpeaking = true;

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.volume = this.volume;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    if (this.voice) {
      utterance.voice = this.voice;
    }

    utterance.onend = () => {
      this.isSpeaking = false;
      // Small delay between messages
      setTimeout(() => this.processQueue(), 300);
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.processQueue();
    };

    window.speechSynthesis.speak(utterance);
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === "undefined") return [];
    return window.speechSynthesis.getVoices();
  }

  setVoice(voiceName: string) {
    const voices = this.getAvailableVoices();
    const voice = voices.find((v) => v.name === voiceName);
    if (voice) {
      this.voice = voice;
    }
  }
}

// Singleton instance
export const voiceSystem = new VoiceNotificationSystem();
