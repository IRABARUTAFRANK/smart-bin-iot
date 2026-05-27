"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Volume2, VolumeX, Gauge, Mic } from "lucide-react";
import { voiceSystem } from "@/lib/voice";

export function VoiceSettings() {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [rate, setRate] = useState(0.95);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");

  useEffect(() => {
    // Load voices
    const loadVoices = () => {
      const availableVoices = voiceSystem.getAvailableVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoice) {
        // Find a good default voice
        const englishVoice = availableVoices.find((v) =>
          v.lang.startsWith("en")
        );
        setSelectedVoice(englishVoice?.name || availableVoices[0].name);
      }
    };

    loadVoices();

    // Voices may load asynchronously
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoice]);

  const handleEnabledChange = (value: boolean) => {
    setEnabled(value);
    voiceSystem.setEnabled(value);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    voiceSystem.setVolume(value[0]);
  };

  const handleRateChange = (value: number[]) => {
    setRate(value[0]);
    voiceSystem.setRate(value[0]);
  };

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName);
    voiceSystem.setVoice(voiceName);
  };

  const testVoice = () => {
    voiceSystem.speakCustom(
      "SmartBin voice system active. All sensors operational."
    );
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Mic className="h-4 w-4 text-primary" />
          AI Voice Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <Label htmlFor="voice-enabled" className="text-sm text-muted-foreground">
            Voice Notifications
          </Label>
          <Switch
            id="voice-enabled"
            checked={enabled}
            onCheckedChange={handleEnabledChange}
          />
        </div>

        {/* Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Volume</Label>
            <span className="text-xs text-muted-foreground/70">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <VolumeX className="h-3.5 w-3.5 text-muted-foreground/50" />
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              min={0}
              max={1}
              step={0.05}
              disabled={!enabled}
              className="flex-1"
            />
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
        </div>

        {/* Speech Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Speech Rate</Label>
            <span className="text-xs text-muted-foreground/70">
              {rate.toFixed(2)}x
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground/50" />
            <Slider
              value={[rate]}
              onValueChange={handleRateChange}
              min={0.5}
              max={1.5}
              step={0.05}
              disabled={!enabled}
              className="flex-1"
            />
          </div>
        </div>

        {/* Voice Selection */}
        {voices.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Voice</Label>
            <Select
              value={selectedVoice}
              onValueChange={handleVoiceChange}
              disabled={!enabled}
            >
              <SelectTrigger className="w-full bg-background/50 h-9 text-sm">
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                {voices
                  .filter((v) => v.lang.startsWith("en"))
                  .map((voice) => (
                    <SelectItem key={voice.name} value={voice.name}>
                      {voice.name.replace(/Microsoft |Google /, "")}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Test Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={testVoice}
          disabled={!enabled}
          className="w-full"
        >
          <Volume2 className="h-3.5 w-3.5 mr-2" />
          Test Voice
        </Button>
      </CardContent>
    </Card>
  );
}
