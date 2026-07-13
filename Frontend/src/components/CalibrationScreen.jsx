import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Wrench } from 'lucide-react';
import { ArrowLeft, ArrowRight, CheckCircle2, Camera, Loader2, RotateCcw, RotateCw } from 'lucide-react';
import SkeletonViewer from './SkeletonViewer';

const STEPS = [
  {
    id: 1,
    title: 'Arms Relaxed',
    emoji: '🧍',
    instruction: 'Stand facing the camera with your arms hanging naturally at your sides.',
    tip: 'Keep your shoulders relaxed and look straight ahead.',
    captureKeys: ['left_elbow_angle', 'right_elbow_angle', 'left_upper_arm_elevation', 'right_upper_arm_elevation'],
  },
  {
    id: 2,
    title: 'Goalpost Pose (90°)',
    emoji: '💪',
    instruction: 'Raise your elbows to shoulder height and bend them to 90 degrees — like a goalpost.',
    tip: 'Stand back so your hands are visible on camera! This captures your bottom press position.',
    captureKeys: ['left_elbow_angle', 'right_elbow_angle', 'left_upper_arm_elevation', 'right_upper_arm_elevation'],
  },
  {
    id: 3,
    title: 'Arms Overhead',
    emoji: '🙌',
    instruction: 'Press your arms fully overhead. Straighten your elbows as much as you can.',
    tip: 'Extend fully — this captures your personal lockout angle.',
    captureKeys: ['left_elbow_angle', 'right_elbow_angle', 'wrist_y_diff', 'left_wrist_drift', 'right_wrist_drift'],
  },
];

const HOLD_DURATION = 3000; // 3 seconds
const STABILITY_TOLERANCE = 15; // degrees — lenient to account for natural sway
const MIN_STABLE_RATIO = 0.5; // at least half the keys must be stable

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const EXERCISE_LABELS = {
  shoulder_press: 'Shoulder Press',
  bicep: 'Bicep Curls',
  squat: 'Squats',
  lunge: 'Lunges',
  hammer: 'Hammer Curls',
  front_raise: 'Front Raises',
  deadlift: 'Deadlift',
};

export default function CalibrationScreen({ exerciseType = 'shoulder_press', onComplete, onBack }) {
  const exerciseLabel = EXERCISE_LABELS[exerciseType] || exerciseType;
  const [currentStep, setCurrentStep] = useState(0);
  const [wsStatus, setWsStatus] = useState('idle');
  const [processedFrame, setProcessedFrame] = useState(null);
  const [poseDetected, setPoseDetected] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [stepResults, setStepResults] = useState([null, null, null]);
  const [saving, setSaving] = useState(false);
  const [liveAngles, setLiveAngles] = useState({});

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const samplesRef = useRef({});
  const stableStartRef = useRef(null);
  const lastAnglesRef = useRef({});
  const holdTimerRef = useRef(null);
  const pendingRef = useRef(false);
  const currentStepRef = useRef(currentStep);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  const cleanup = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const sendFrame = useCallback(() => {
    const ws = wsRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!ws || ws.readyState !== 1 || !video || !canvas || pendingRef.current) return;
    if (video.readyState < 2) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
    try {
      ws.send(base64);
      pendingRef.current = true;
    } catch (err) {
      console.error('WS send error:', err);
    }
  }, []);

  const startSession = useCallback(async () => {
    cleanup();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (err) {
      alert('Camera access denied: ' + err.message);
      return;
    }
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;

    setWsStatus('connecting');
    const ws = new WebSocket('ws://localhost:8000/wscalibrate');
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      samplesRef.current = {};
      stableStartRef.current = null;
      setHoldProgress(0);
      setTimeout(sendFrame, 200);
    };

    ws.onmessage = (event) => {
      pendingRef.current = false;
      try {
        const data = JSON.parse(event.data);
        if (data.frame) setProcessedFrame(`data:image/jpeg;base64,${data.frame}`);
        if (data.angles) {
          const a = data.angles;
          setPoseDetected(a.pose_detected);
          setLiveAngles(a);

          if (!a.pose_detected) {
            stableStartRef.current = null;
            setHoldProgress(0);
            return;
          }

          // Check stability — lenient: require at least half the keys to be detected & stable
          const activeStep = currentStepRef.current;
          const step = STEPS[activeStep];
          const relevantKeys = step.captureKeys;
          let stableCount = 0;
          let detectedCount = 0;

          for (const key of relevantKeys) {
            const val = a[key];
            if (val == null) continue;
            detectedCount++;
            const prev = lastAnglesRef.current[key];
            if (prev == null || Math.abs(val - prev) <= STABILITY_TOLERANCE) {
              stableCount++;
            }
          }
          lastAnglesRef.current = { ...a };

          const minNeeded = Math.max(1, Math.ceil(relevantKeys.length * MIN_STABLE_RATIO));
          const isStable = detectedCount >= minNeeded && stableCount >= minNeeded;

          if (isStable) {
            if (!stableStartRef.current) stableStartRef.current = Date.now();
            const elapsed = Date.now() - stableStartRef.current;
            setHoldProgress(Math.min(elapsed / HOLD_DURATION, 1));

            // Accumulate samples
            for (const key of relevantKeys) {
              if (a[key] != null) {
                if (!samplesRef.current[key]) samplesRef.current[key] = [];
                samplesRef.current[key].push(a[key]);
              }
            }

            // Step complete — require at least 2 keys with samples
            const filledKeys = Object.keys(samplesRef.current).filter(k => (samplesRef.current[k]?.length || 0) >= 3);
            if (elapsed >= HOLD_DURATION && filledKeys.length >= minNeeded) {
              const captured = {};
              for (const key of relevantKeys) {
                captured[key] = median(samplesRef.current[key] || []);
              }
              setStepResults(prev => {
                const next = [...prev];
                next[activeStep] = captured;
                return next;
              });
              stableStartRef.current = null;
              setHoldProgress(1);
            }
          } else {
            stableStartRef.current = null;
            setHoldProgress(0);
          }
        }
      } catch (e) { console.error('Parse error:', e); }
      sendFrame();
    };

    ws.onclose = () => setWsStatus('idle');
    ws.onerror = () => setWsStatus('idle');
  }, [cleanup, sendFrame, currentStep]);

  useEffect(() => {
    startSession();
    return cleanup;
  }, []);

  // Reset samples when step changes
  useEffect(() => {
    samplesRef.current = {};
    stableStartRef.current = null;
    lastAnglesRef.current = {};
    setHoldProgress(0);
  }, [currentStep]);

  const stepDone = stepResults[currentStep] != null;
  const allDone = stepResults.every(r => r != null);

  const computeThresholds = () => {
    const step1 = stepResults[0]; // arms down
    const step2 = stepResults[1]; // arms at 90°
    const step3 = stepResults[2]; // arms overhead

    const angleBottom = median([step2.left_elbow_angle, step2.right_elbow_angle].filter(Boolean)) || 90;
    const angleTop = median([step3.left_elbow_angle, step3.right_elbow_angle].filter(Boolean)) || 140;
    const minElevation = median([step2.left_upper_arm_elevation, step2.right_upper_arm_elevation].filter(Boolean)) || 55;
    const wristDrift = median([step3.left_wrist_drift, step3.right_wrist_drift].filter(Boolean)) || 0.06;
    const symmetryThresh = (step3.wrist_y_diff != null ? step3.wrist_y_diff * 1.5 : 0.10);

    return {
      ANGLE_TOP: Math.round(angleTop),
      ANGLE_BOTTOM: Math.round(angleBottom),
      ANGLE_PARTIAL: Math.round((angleTop + angleBottom) / 2),
      WRIST_DRIFT_THRESH: Math.round(wristDrift * 1000) / 1000 + 0.02,
      SYMMETRY_THRESH: Math.round(symmetryThresh * 1000) / 1000,
      MIN_UPPER_ARM_ELEVATION: Math.round(minElevation * 0.85),
      INACTIVE_THRESH: 15.0,
    };
  };

  const handleSave = async () => {
    if (!allDone) return;
    setSaving(true);
    const thresholds = computeThresholds();
    const userStr = localStorage.getItem('user');
    const email = userStr ? JSON.parse(userStr).email : null;

    if (email) {
      try {
        await fetch('http://localhost:8000/auth/calibration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, exercise: 'shoulder_press', thresholds }),
        });
      } catch (e) { console.error('Save failed:', e); }
    }

    localStorage.setItem('calibration_shoulder_press', JSON.stringify({
      thresholds,
      calibrated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    cleanup();
    setSaving(false);
    onComplete(thresholds);
  };

  const goNext = () => {
    if (currentStep < 2) setCurrentStep(s => s + 1);
  };
  const goPrev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };
  const retryStep = () => {
    setStepResults(prev => { const n = [...prev]; n[currentStep] = null; return n; });
    samplesRef.current = {};
    stableStartRef.current = null;
    setHoldProgress(0);
  };

  const step = STEPS[currentStep];

  // Coming Soon placeholder for exercises without calibration backend
  if (exerciseType !== 'shoulder_press') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-6 pb-28">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="rounded-full">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Body Calibration</h2>
            <p className="text-xs text-muted-foreground">{exerciseLabel} · Personalize your thresholds</p>
          </div>
        </div>
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-10 sm:p-16 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6 ring-1 ring-white/10">
                <Wrench className="w-10 h-10 text-amber-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Coming Soon</h3>
              <p className="text-sm text-neutral-400 max-w-md leading-relaxed mb-8">
                Personalized calibration for <span className="text-white font-semibold">{exerciseLabel}</span> is currently under development. We're training our AI models to capture your unique joint angles and movement patterns for this exercise.
              </p>
              <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8">
                {['Pose Capture', 'Angle Mapping', 'Threshold Tuning'].map((feature, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-amber-400/60 mx-auto mb-2" />
                    <p className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">{feature}</p>
                  </div>
                ))}
              </div>
              <Button onClick={onBack} className="rounded-full bg-white text-neutral-900 hover:bg-neutral-200 px-6">
                <ArrowLeft size={14} className="mr-1.5" /> Back to Exercises
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => { cleanup(); onBack(); }} className="rounded-full">
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Body Calibration</h2>
          <p className="text-xs text-muted-foreground">{exerciseLabel} · Personalize your thresholds</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                stepResults[i] ? 'bg-emerald-500 text-white' :
                i === currentStep ? 'bg-neutral-900 text-white ring-2 ring-neutral-400' :
                'bg-neutral-100 text-neutral-400'
              }`}
              onClick={() => setCurrentStep(i)}
              style={{ cursor: 'pointer' }}
            >
              {stepResults[i] ? <CheckCircle2 size={16} /> : i + 1}
            </div>
            {i < 2 && <div className={`flex-1 h-0.5 rounded ${stepResults[i] ? 'bg-emerald-400' : 'bg-neutral-200'}`} />}
          </div>
        ))}
      </div>

      {/* Instruction + 3D Skeleton side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4 mb-4">
        {/* 3D Skeleton Viewer */}
        <Card className="border-0 shadow-md overflow-hidden bg-[#0f0f1a]">
          <CardContent className="p-0 relative" style={{ minHeight: 240 }}>
            <SkeletonViewer step={currentStep} />
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
              <RotateCw size={10} className="text-neutral-400" />
              <span className="text-[9px] text-neutral-400 font-medium tracking-wider">DRAG TO ROTATE</span>
            </div>
            <div className="absolute top-2 left-2">
              <Badge className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                ● HIGHLIGHTED = MEASURED
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-neutral-50 to-white">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <div className="text-4xl mb-3">{step.emoji}</div>
            <h3 className="font-bold text-lg mb-2">Step {step.id}: {step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.instruction}</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700 font-medium">💡 {step.tip}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Video feed */}
      <div className="relative rounded-2xl overflow-hidden bg-black mb-4 shadow-lg" style={{ aspectRatio: '4/3' }}>
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas ref={canvasRef} className="hidden" />
        {processedFrame ? (
          <img src={processedFrame} alt="Calibration" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-500">
            <Loader2 className="animate-spin mr-2" size={20} /> Connecting camera...
          </div>
        )}

        {/* Status overlay */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className={`text-[10px] font-bold ${wsStatus === 'connected' ? 'bg-emerald-500' : 'bg-neutral-500'} text-white border-0`}>
            {wsStatus === 'connected' ? '● LIVE' : wsStatus === 'connecting' ? '○ CONNECTING' : '○ OFFLINE'}
          </Badge>
          {poseDetected && (
            <Badge className="text-[10px] font-bold bg-blue-500 text-white border-0">POSE DETECTED</Badge>
          )}
        </div>

        {/* Hold progress bar */}
        {!stepDone && holdProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-neutral-800/50">
            <div
              className="h-full bg-emerald-400 transition-all duration-100"
              style={{ width: `${holdProgress * 100}%` }}
            />
          </div>
        )}

        {/* Step complete overlay */}
        {stepDone && (
          <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[2px] flex items-center justify-center">
            <div className="bg-white rounded-2xl p-6 shadow-xl text-center">
              <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={40} />
              <p className="font-bold text-lg">Pose Captured!</p>
              <p className="text-sm text-muted-foreground mt-1">Step {step.id} complete</p>
            </div>
          </div>
        )}
      </div>

      {/* Live angles readout */}
      {poseDetected && !stepDone && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {liveAngles.left_elbow_angle != null && (
            <div className="bg-neutral-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">L Elbow</p>
              <p className="text-2xl font-bold text-neutral-800">{Math.round(liveAngles.left_elbow_angle)}°</p>
            </div>
          )}
          {liveAngles.right_elbow_angle != null && (
            <div className="bg-neutral-50 rounded-lg p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">R Elbow</p>
              <p className="text-2xl font-bold text-neutral-800">{Math.round(liveAngles.right_elbow_angle)}°</p>
            </div>
          )}
        </div>
      )}

      {/* Hold instruction */}
      {!stepDone && wsStatus === 'connected' && (
        <p className="text-center text-sm text-muted-foreground mb-4">
          {!poseDetected ? '🔍 Position yourself in front of the camera...'
            : holdProgress > 0 ? `⏳ Hold still... ${Math.round(holdProgress * 100)}%`
            : '📐 Get into position and hold steady for 3 seconds'}
        </p>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {stepDone && (
          <Button variant="outline" onClick={retryStep} className="rounded-full">
            <RotateCcw size={14} className="mr-1.5" /> Retry
          </Button>
        )}
        <div className="flex-1" />
        {currentStep > 0 && (
          <Button variant="outline" onClick={goPrev} className="rounded-full">
            <ArrowLeft size={14} className="mr-1.5" /> Back
          </Button>
        )}
        {stepDone && currentStep < 2 && (
          <Button onClick={goNext} className="rounded-full bg-neutral-900 text-white hover:bg-neutral-700">
            Next <ArrowRight size={14} className="ml-1.5" />
          </Button>
        )}
        {allDone && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-emerald-600 text-white hover:bg-emerald-500"
          >
            {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <CheckCircle2 size={14} className="mr-1.5" />}
            Save & Apply
          </Button>
        )}
      </div>
    </div>
  );
}
