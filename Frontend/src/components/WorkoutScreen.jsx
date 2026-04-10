import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Pause, Play, Square, Camera, Volume2, VolumeX,
  Wifi, WifiOff, Maximize2, Minimize2, AlertTriangle, CheckCircle2,
  TrendingUp, XCircle
} from 'lucide-react';

// ── Config per exercise ───────────────────────────────────────────────────────
const EXERCISE_CONFIG = {
  bicep: {
    wsUrl: 'ws://localhost:8000/wsbicep',
    title: 'Bicep Curls',
    hint: 'Stand facing the camera with arms at your sides',
  },
  hammer: {
    wsUrl: 'ws://localhost:8000/wshammer',
    title: 'Hammer Curls',
    hint: 'Stand facing the camera with arms at your sides',
  },
  squat: {
    wsUrl: 'ws://localhost:8000/wssquat',
    title: 'Squats',
    hint: 'Stand sideways to the camera so your full profile is visible',
  },
  shoulder_press: {
    wsUrl: 'ws://localhost:8000/wspress',
    title: 'Shoulder Press',
    hint: 'Sit or stand facing the camera with your arms visible',
  },
  lunge: {
    wsUrl: 'ws://localhost:8000/wslunge',
    title: 'Lunges',
    hint: 'Stand sideways to the camera so your full profile is visible',
  },
  front_raise: {
    wsUrl: 'ws://localhost:8000/wsfrontraise',
    title: 'Front Raises',
    hint: 'Stand facing the camera with arms at your sides',
  },
};

// Feedback severity → CSS class
function classifyFeedback(msg) {
  const u = msg.toUpperCase();
  if (u.includes('NOT A CURL') || u.includes('ARM RAISED') || u.includes('CAMERA NOT ALIGNED')) return 'error';
  if (u.includes('HALF REP') || u.includes('PAST TOES') || u.includes('TOO DEEP')) return 'warning';
  return 'info';
}
const FEEDBACK_STYLES = {
  error: 'bg-red-900/70 border-red-500 text-red-200',
  warning: 'bg-amber-900/70 border-amber-500 text-amber-200',
  info: 'bg-blue-900/70 border-blue-400 text-blue-200',
};

function squatStateLabel(state) {
  return { s1: 'STANDING', s2: 'DESCENDING', s3: 'BOTTOM' }[state] ?? '—';
}

// ── Speech helper (module-level, no React deps) ───────────────────────────────
// Tracks which messages have recently been spoken to avoid per-frame repetition.
const spokenMap = new Map(); // message → timestamp last spoken
const SPEAK_COOLDOWN_MS = 6000; // same message won't repeat for 6 s
let isSpeaking = false; // guard: don't cancel while an utterance is playing
let speechResumeTimer = null; // Chrome watchdog timer

// Chrome bug workaround: speechSynthesis gets "stuck" in a paused state.
// A periodic resume() call keeps it alive.
function startSpeechWatchdog() {
  if (speechResumeTimer) return;
  speechResumeTimer = setInterval(() => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.resume();
    }
  }, 3000);
}
function stopSpeechWatchdog() {
  if (speechResumeTimer) { clearInterval(speechResumeTimer); speechResumeTimer = null; }
}

function speakMessages(messages) {
  if (!window.speechSynthesis || messages.length === 0) return;

  // Don't interrupt an active utterance — let it finish first
  if (isSpeaking) return;

  const now = Date.now();
  const toSpeak = messages.filter(msg => {
    const last = spokenMap.get(msg) ?? 0;
    return now - last > SPEAK_COOLDOWN_MS;
  });

  if (toSpeak.length === 0) return;

  window.speechSynthesis.cancel();
  startSpeechWatchdog();

  toSpeak.forEach((msg, i) => {
    const cleanMsg = msg.replace(/^(left|right):\s*/i, '');
    const utter = new SpeechSynthesisUtterance(cleanMsg.toLowerCase());
    utter.rate = 0.92;
    utter.pitch = 1.05;
    utter.volume = 1;

    utter.onstart = () => { isSpeaking = true; };
    utter.onend = () => { isSpeaking = false; };
    utter.onerror = () => { isSpeaking = false; };

    window.speechSynthesis.speak(utter);
    spokenMap.set(msg, now);
  });
}



// ── Component ─────────────────────────────────────────────────────────────────
export function WorkoutScreen({ exerciseType = 'bicep' }) {
  const config = EXERCISE_CONFIG[exerciseType] ?? EXERCISE_CONFIG.bicep;

  // UI
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);  // voice TTS toggle
  const [wsStatus, setWsStatus] = useState('idle');
  const [processedFrame, setProcessedFrame] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Shared stats
  const [formOk, setFormOk] = useState(true);
  const [feedback, setFeedback] = useState([]);

  // Bicep stats
  const [leftReps, setLeftReps] = useState(0);
  const [rightReps, setRightReps] = useState(0);
  const [leftStage, setLeftStage] = useState('down');
  const [rightStage, setRightStage] = useState('down');

  // Squat stats
  const [squatCount, setSquatCount] = useState(0);
  const [improperSquat, setImproperSquat] = useState(0);
  const [squatState, setSquatState] = useState(null);

  // Press stats
  const [pressCount, setPressCount] = useState(0);
  const [pressStage, setPressStage] = useState('down');

  // Lunge stats
  const [lungeCount, setLungeCount] = useState(0);
  const [improperLunge, setImproperLunge] = useState(0);
  const [lungeStage, setLungeStage] = useState('up');

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const isPausedRef = useRef(false);
  const isActiveRef = useRef(false);
  const pendingFrameRef = useRef(false);
  const voiceEnabledRef = useRef(true);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);

  // Stop any ongoing speech when voice is toggled off
  useEffect(() => {
    if (!voiceEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [voiceEnabled]);

  // Pre-load TTS voices on mount (Chrome loads them lazily)
  useEffect(() => {
    if (window.speechSynthesis) {
      // Trigger async voice loading
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        console.log('[TTS] Voices loaded:', window.speechSynthesis.getVoices().length);
      };
    }
  }, []);

  // Cancel speech + stop watchdog on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      stopSpeechWatchdog();
      isSpeaking = false;
    };
  }, []);

  /* ── Send one frame ── */
  const sendFrame = useCallback(() => {
    const ws = wsRef.current;
    if (
      !ws || ws.readyState !== WebSocket.OPEN ||
      !canvasRef.current || !videoRef.current ||
      isPausedRef.current || !isActiveRef.current ||
      pendingFrameRef.current
    ) return;

    const video = videoRef.current;
    if (video.readyState < 2) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.65).split(',')[1];
    try {
      ws.send(base64);
      pendingFrameRef.current = true;
    } catch (err) {
      console.error('WS send error:', err);
    }
  }, []);

  /* ── Cleanup ── */
  const cleanup = useCallback(() => {
    isActiveRef.current = false;
    pendingFrameRef.current = false;
    window.speechSynthesis?.cancel();
    stopSpeechWatchdog();
    isSpeaking = false;

    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setWsStatus('idle');
    setProcessedFrame(null);
    setFeedback([]);
    setFormOk(true);
  }, []);

  /* ── Start workout ── */
  const startWorkout = useCallback(async () => {
    // Reset stats & rep trackers
    setLeftReps(0); setRightReps(0);
    setLeftStage('down'); setRightStage('down');
    setSquatCount(0); setImproperSquat(0); setSquatState(null);
    setPressCount(0); setPressStage('down');
    setLungeCount(0); setImproperLunge(0); setLungeStage('up');
    setFeedback([]); setFormOk(true);
    pendingFrameRef.current = false;
    spokenMap.clear();

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (err) {
      alert('Could not access camera: ' + err.message);
      return;
    }
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;

    setWsStatus('connecting');
    const ws = new WebSocket(config.wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      setIsActive(true);
      isActiveRef.current = true;
      setTimeout(sendFrame, 200);
    };

    ws.onmessage = (event) => {
      pendingFrameRef.current = false;
      try {
        const data = JSON.parse(event.data);

        if (data.frame) setProcessedFrame(`data:image/jpeg;base64,${data.frame}`);
        if (data.form_ok !== undefined) setFormOk(data.form_ok);
        if (Array.isArray(data.feedback)) setFeedback(data.feedback);

        // ── Bicep fields ──
        if (data.left !== undefined) {
          const newLeft = data.left.reps;
          setLeftReps(newLeft);
          setLeftStage(data.left.stage);
        }
        if (data.right !== undefined) {
          const newRight = data.right.reps;
          setRightReps(newRight);
          setRightStage(data.right.stage);
        }

        // ── Squat fields ──
        if (data.squat_count !== undefined) {
          const newCount = data.squat_count;
          setSquatCount(newCount);
        }
        if (data.improper_squat !== undefined) setImproperSquat(data.improper_squat);
        if (data.curr_state !== undefined) setSquatState(data.curr_state);

        // ── Press fields ──
        if (data.press_counter !== undefined) {
          setPressCount(data.press_counter);
          setPressStage(data.stage);
        }

        // ── Lunge fields ──
        if (data.lunge_count !== undefined) {
          setLungeCount(data.lunge_count);
          setImproperLunge(data.improper_lunge);
          setLungeStage(data.stage);
        }

        // ── Speak corrective feedback ──
        if (voiceEnabledRef.current && Array.isArray(data.feedback) && data.feedback.length > 0) {
          speakMessages(data.feedback);
        }

      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
      sendFrame();
    };

    ws.onerror = () => setWsStatus('error');
    ws.onclose = () => {
      pendingFrameRef.current = false;
      if (wsRef.current === ws) setWsStatus('idle');
    };
  }, [config.wsUrl, sendFrame]);

  /* ── Stop ── */
  const stopWorkout = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    cleanup();
  }, [cleanup]);

  /* ── Pause / resume ── */
  const togglePause = () => {
    setIsPaused(p => {
      const next = !p;
      isPausedRef.current = next;
      if (!next) { pendingFrameRef.current = false; requestAnimationFrame(sendFrame); }
      if (next) window.speechSynthesis?.cancel(); // stop speech when pausing
      return next;
    });
  };

  useEffect(() => cleanup, [cleanup]);

  /* ── Status config ── */
  const STATUS = {
    idle: { label: 'READY', dot: 'bg-gray-500' },
    connecting: { label: 'CONNECTING', dot: 'bg-yellow-500 animate-pulse' },
    connected: { label: 'LIVE', dot: 'bg-red-500 animate-pulse' },
    error: { label: 'ERROR', dot: 'bg-red-700' },
  };
  const { label: statusLabel, dot: statusDot } = STATUS[wsStatus] ?? STATUS.idle;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full lg:w-3/4 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">

      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground mb-1">
          Active Session
        </p>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{config.title}</h2>
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm mt-2">
          {wsStatus === 'connected'
            ? <><Wifi size={14} className="text-[#1D9E75]" /> AI is monitoring your form</>
            : <><WifiOff size={14} className="text-gray-400" /> {config.hint}</>
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 lg:gap-8">

        {/* ── LEFT COLUMN: Video & Controls ── */}
        <div className="flex flex-col gap-5">
          <Card className="overflow-hidden border-border/40 shadow-sm rounded-2xl bg-neutral-950">
            <CardContent className="p-0">

              {/* Toolbar: expand + voice toggle */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 border-b border-neutral-800">
                <button
                  onClick={() => setVoiceEnabled(v => !v)}
                  className={`flex items-center gap-1.5 text-xs font-semibold tracking-wide transition-colors ${voiceEnabled ? 'text-[#1D9E75] hover:text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  title={voiceEnabled ? 'Voice feedback ON — click to mute' : 'Voice feedback OFF — click to enable'}
                >
                  {voiceEnabled
                    ? <><Volume2 size={14} /> Voice On</>
                    : <><VolumeX size={14} /> Voice Off</>
                  }
                </button>

                <button
                  onClick={() => setIsExpanded(e => !e)}
                  className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {isExpanded
                    ? <><Minimize2 size={14} /> Shrink</>
                    : <><Maximize2 size={14} /> Expand</>
                  }
                </button>
              </div>

              {/* Video area */}
              <div
                className={`relative flex items-center justify-center overflow-hidden transition-all duration-300 ${isExpanded ? 'aspect-video' : 'aspect-[4/3]'
                  }`}
              >
                {processedFrame && (
                  <img
                    src={processedFrame}
                    alt="Pose analysis"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                <video
                  ref={videoRef}
                  autoPlay muted playsInline
                  className={`w-full h-full object-cover ${processedFrame ? 'invisible' : isActive ? 'visible' : 'invisible'}`}
                />

                {!isActive && !processedFrame && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <Camera size={48} className="mx-auto mb-3 opacity-30 text-neutral-400" />
                    <p className="text-sm font-medium opacity-60 text-neutral-300">Position yourself in the frame</p>
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />

                {/* Overlays */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${statusDot}`} />
                    <span className="text-white text-[10px] font-bold tracking-widest">{statusLabel}</span>
                  </div>

                  {isActive && (
                    <div className={`absolute top-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest shadow-sm border transition-colors ${voiceEnabled ? 'bg-[#E1F5EE]/90 border-[#1D9E75]/30 text-[#1D9E75]' : 'bg-black/70 border-white/10 text-neutral-400 backdrop-blur-sm'
                      }`}>
                      {voiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                      {voiceEnabled ? 'VOICE' : 'MUTED'}
                    </div>
                  )}

                  {isPaused && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-white text-3xl font-bold tracking-widest">PAUSED</div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {wsStatus === 'error' && (
            <div className="text-center text-xs font-medium text-[#D4183D] bg-[#FAECE7] p-4 rounded-xl border border-[#FAECE7] shadow-sm">
              ⚠️ Could not connect to backend. Make sure the FastAPI server is running on port 8000.
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            {!isActive ? (
              <Button
                onClick={startWorkout}
                className="flex-1 bg-[#030213] hover:bg-neutral-800 text-white rounded-xl py-6 text-[15px] font-bold shadow-sm border-0"
                disabled={wsStatus === 'connecting'}
              >
                <Play size={20} className="mr-2" />
                {wsStatus === 'connecting' ? 'Connecting…' : 'Start Workout'}
              </Button>
            ) : (
              <>
                <Button onClick={togglePause} variant="outline" className="flex-1 rounded-xl py-6 border-border/40 hover:bg-neutral-50 shadow-sm text-neutral-700">
                  {isPaused ? <Play size={20} /> : <Pause size={20} />}
                </Button>
                <Button onClick={stopWorkout} variant="destructive" className="flex-1 rounded-xl py-6 bg-[#D4183D] hover:bg-[#BA2D49] text-white shadow-sm border-0 font-bold">
                  <Square size={20} className="mr-2" />
                  Stop
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Stats & Feedback ── */}
        <div className="flex flex-col gap-6">

          {/* Form feedback panel */}
          {isActive && (
            <Card
              className={`shadow-sm border-0 transition-colors ${formOk ? 'bg-[#E1F5EE]' : 'bg-[#FAECE7]'
                }`}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  {formOk
                    ? <CheckCircle2 size={18} className="text-[#1D9E75] flex-shrink-0" />
                    : <AlertTriangle size={18} className="text-[#D4183D] flex-shrink-0" />
                  }
                  <span className={`text-sm font-bold uppercase tracking-wide ${formOk ? 'text-[#1D9E75]' : 'text-[#D4183D]'}`}>
                    {formOk ? 'Form: GOOD ✓' : 'Form: NEEDS CORRECTION'}
                  </span>
                  {!voiceEnabled && !formOk && (
                    <span className="ml-auto text-[11px] font-medium text-neutral-500 flex items-center gap-1 uppercase tracking-widest">
                      <VolumeX size={12} /> Muted
                    </span>
                  )}
                </div>

                {feedback.length > 0 ? (
                  <div className="flex flex-col gap-2 mt-2">
                    {feedback.map((msg, i) => (
                      <div
                        key={i}
                        className={`rounded-lg px-4 py-3 text-xs sm:text-sm font-medium tracking-wide border-0 shadow-sm ${FEEDBACK_STYLES[classifyFeedback(msg)]}`}
                      >
                        {voiceEnabled && <span className="mr-2 opacity-60">🔊</span>}
                        {msg}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs sm:text-sm font-medium mt-2 p-3 rounded-lg ${formOk ? 'bg-[#1D9E75]/10 text-[#0F6E56]' : 'bg-[#D4183D]/10 text-[#993C1D]'}`}>
                    {formOk ? 'Keep it up — your form looks great!' : 'Adjust your position and continue.'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Exercise-specific stats */}
          {(exerciseType === 'bicep' || exerciseType === 'hammer') ? (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7F77DD]" /> Real-time Metrics
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm bg-[#EEEDFE]">
                  <CardContent className="p-5 text-center">
                    <p className="text-[11px] font-bold text-[#534AB7] uppercase tracking-widest mb-1">Right Arm</p>
                    <p className="text-5xl font-bold text-[#3C3489] my-2">{rightReps}</p>
                    <Badge variant="outline"
                      className={`text-[10px] font-bold tracking-widest uppercase border-0 ${rightStage === 'up' ? 'bg-[#1D9E75]/20 text-[#0F6E56]' : 'bg-[#BA7517]/20 text-[#854F0B]'}`}
                    >
                      {rightStage}
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-[#E1F5EE]">
                  <CardContent className="p-5 text-center">
                    <p className="text-[11px] font-bold text-[#0F6E56] uppercase tracking-widest mb-1">Left Arm</p>
                    <p className="text-5xl font-bold text-[#0A4A3A] my-2">{leftReps}</p>
                    <Badge variant="outline"
                      className={`text-[10px] font-bold tracking-widest uppercase border-0 ${leftStage === 'up' ? 'bg-[#1D9E75]/20 text-[#0F6E56]' : 'bg-[#BA7517]/20 text-[#854F0B]'}`}
                    >
                      {leftStage}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/40 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <span className="font-semibold text-neutral-600">Total Reps This Session</span>
                  <span className="font-bold text-3xl text-neutral-900">{leftReps + rightReps}</span>
                </CardContent>
              </Card>
            </div>
          ) : exerciseType === 'squat' ? (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" /> Squat Metrics
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm bg-[#E1F5EE]">
                  <CardContent className="p-5 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1 text-[#0F6E56]">
                      <TrendingUp size={14} />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Correct</p>
                    </div>
                    <p className="text-5xl font-bold text-[#0A4A3A] mt-2">{squatCount}</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-[#FAECE7]">
                  <CardContent className="p-5 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1 text-[#993C1D]">
                      <XCircle size={14} />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Improper</p>
                    </div>
                    <p className="text-5xl font-bold text-[#6D2812] mt-2">{improperSquat}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/40 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <span className="font-semibold text-neutral-600">Current Phase</span>
                  <Badge
                    variant="outline"
                    className={`border-0 text-xs font-bold tracking-widest uppercase ${squatState === 's3' ? 'bg-[#EEEDFE] text-[#3C3489]' :
                      squatState === 's2' ? 'bg-[#FAEEDA] text-[#854F0B]' :
                        squatState === 's1' ? 'bg-[#E1F5EE] text-[#0A4A3A]' :
                          'bg-neutral-100 text-neutral-500'
                      }`}
                  >
                    {squatStateLabel(squatState)}
                  </Badge>
                </CardContent>
              </Card>

              {!isActive && (
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#BA7517] bg-[#FAEEDA] p-3 border-0 rounded-lg text-center shadow-sm">
                  💡 Stand sideways to the camera for best detection
                </div>
              )}
            </div>
          ) : (exerciseType === 'shoulder_press' || exerciseType === 'front_raise') ? (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" /> Form Metrics
              </p>
              <div className="grid grid-cols-1 gap-4">
                <Card className="border-0 shadow-sm bg-[#E1F5EE]">
                  <CardContent className="p-6 text-center">
                    <p className="text-[11px] font-bold text-[#0F6E56] uppercase tracking-widest mb-1">Total Reps</p>
                    <p className="text-6xl font-bold text-[#0A4A3A] mt-2">{pressCount}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/40 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <span className="font-semibold text-neutral-600">Target Phase</span>
                  <Badge
                    variant="outline"
                    className={`border-0 text-xs font-bold tracking-widest uppercase ${pressStage === 'up' ? 'bg-[#E1F5EE] text-[#0A4A3A]' : 'bg-[#FAEEDA] text-[#854F0B]'}`}
                  >
                    {pressStage}
                  </Badge>
                </CardContent>
              </Card>

              {!isActive && (
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#BA7517] bg-[#FAEEDA] p-3 border-0 rounded-lg text-center shadow-sm">
                  💡 Stand or sit facing the camera directly
                </div>
              )}
            </div>
          ) : exerciseType === 'lunge' ? (
            <div className="flex flex-col gap-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7F77DD]" /> Lunge Logistics
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm bg-[#E1F5EE]">
                  <CardContent className="p-5 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1 text-[#0F6E56]">
                      <TrendingUp size={14} />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Correct</p>
                    </div>
                    <p className="text-5xl font-bold text-[#0A4A3A] mt-2">{lungeCount}</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-[#FAECE7]">
                  <CardContent className="p-5 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1 text-[#993C1D]">
                      <XCircle size={14} />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Improper</p>
                    </div>
                    <p className="text-5xl font-bold text-[#6D2812] mt-2">{improperLunge}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/40 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <span className="font-semibold text-neutral-600">Target Phase</span>
                  <Badge
                    variant="outline"
                    className={`border-0 text-xs font-bold tracking-widest uppercase ${lungeStage === 'up' ? 'bg-[#E1F5EE] text-[#0A4A3A]' : 'bg-[#FAEEDA] text-[#854F0B]'}`}
                  >
                    {lungeStage}
                  </Badge>
                </CardContent>
              </Card>

              {!isActive && (
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#BA7517] bg-[#FAEEDA] p-3 border-0 rounded-lg text-center shadow-sm">
                  💡 Stand sideways to the camera for best detection
                </div>
              )}
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}
