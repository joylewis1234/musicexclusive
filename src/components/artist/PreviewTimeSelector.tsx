import { useState, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Play, Square, Loader2, Clock } from "lucide-react";
import { usePreviewAudition } from "@/hooks/usePreviewAudition";

interface PreviewTimeSelectorProps {
  audioUrl: string | null;
  audioDuration: number; // in seconds
  previewStartSeconds: number;
  onPreviewStartChange: (seconds: number) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const parseTime = (timeStr: string): number | null => {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);
  if (secs >= 60) return null;
  return mins * 60 + secs;
};

export const PreviewTimeSelector = ({
  audioUrl,
  audioDuration,
  previewStartSeconds,
  onPreviewStartChange,
}: PreviewTimeSelectorProps) => {
  const [timeInput, setTimeInput] = useState(formatTime(previewStartSeconds));
  const { isPlaying, isLoading, timeRemaining, startAudition, stopAudition } = usePreviewAudition();

  // Sync input when slider changes
  useEffect(() => {
    setTimeInput(formatTime(previewStartSeconds));
  }, [previewStartSeconds]);

  const handleSliderChange = useCallback((value: number[]) => {
    const newStart = value[0];
    // Ensure preview doesn't extend beyond track duration
    const maxStart = Math.max(0, audioDuration - 25);
    const clampedStart = Math.min(newStart, maxStart);
    onPreviewStartChange(clampedStart);
  }, [audioDuration, onPreviewStartChange]);

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimeInput(value);
    
    const parsed = parseTime(value);
    if (parsed !== null && parsed >= 0) {
      const maxStart = Math.max(0, audioDuration - 25);
      const clampedStart = Math.min(parsed, maxStart);
      onPreviewStartChange(clampedStart);
    }
  };

  const handleTimeInputBlur = () => {
    // Reset to valid value if input is invalid
    const parsed = parseTime(timeInput);
    if (parsed === null) {
      setTimeInput(formatTime(previewStartSeconds));
    }
  };

  const handleAudition = () => {
    if (isPlaying) {
      stopAudition();
    } else if (audioUrl) {
      startAudition(audioUrl, previewStartSeconds);
    }
  };

  const previewEndSeconds = Math.min(previewStartSeconds + 25, audioDuration);
  const maxStart = Math.max(0, audioDuration - 25);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-accent" />
        <Label className="text-sm font-medium">Preview Start Time</Label>
      </div>

      {/* Time Input */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            type="text"
            value={timeInput}
            onChange={handleTimeInputChange}
            onBlur={handleTimeInputBlur}
            placeholder="00:00"
            className="h-11 text-center font-mono text-base"
            disabled={!audioUrl}
          />
        </div>
        <span className="text-muted-foreground text-sm">to</span>
        <div className="flex-1">
          <Input
            type="text"
            value={formatTime(previewEndSeconds)}
            readOnly
            className="h-11 text-center font-mono text-base bg-muted/20"
            disabled
          />
        </div>
      </div>

      {/* Slider */}
      {audioUrl && audioDuration > 0 && (
        <div className="space-y-2">
          <Slider
            value={[previewStartSeconds]}
            onValueChange={handleSliderChange}
            max={maxStart}
            step={1}
            className="w-full"
            disabled={!audioUrl || isPlaying}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>00:00</span>
            <span>{formatTime(audioDuration)}</span>
          </div>
        </div>
      )}

      {/* Audition Button */}
      <Button
        type="button"
        variant={isPlaying ? "destructive" : "outline"}
        size="lg"
        onClick={handleAudition}
        disabled={!audioUrl || isLoading}
        className="w-full h-12"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </>
        ) : isPlaying ? (
          <>
            <Square className="w-4 h-4 mr-2" />
            Stop Preview ({timeRemaining}s)
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Preview 25s
          </>
        )}
      </Button>

      {/* Playing indicator */}
      {isPlaying && (
        <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-accent/10 border border-accent/30">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-sm text-accent">Playing preview (25 seconds)…</span>
        </div>
      )}
    </div>
  );
};
