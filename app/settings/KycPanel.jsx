"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Clock, XCircle, RefreshCw, X,
  User, MapPin, CreditCard, Camera,
  ChevronRight, ChevronLeft, AlertCircle, Shield,
  Eye, Smile, ArrowLeft, ArrowRight, RotateCcw, Video, VideoOff, ImageIcon,
} from "lucide-react";
import api from "../../utils/api";

/* ── Constants ── */
const STEPS = ["Personal", "Address", "Identity", "Docs", "Liveness", "Review"];

const ID_TYPES = [
  { value: "nin",             label: "National Identity Number (NIN)", numericOnly: true,  maxLen: 11 },
  { value: "drivers_license", label: "Driver's License",               numericOnly: false, maxLen: 20 },
  { value: "voters_card",     label: "Voter's Card",                   numericOnly: false, maxLen: 20 },
  { value: "passport",        label: "International Passport",         numericOnly: false, maxLen: 9  },
  { value: "bvn",             label: "Bank Verification Number (BVN)", numericOnly: true,  maxLen: 11 },
];

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara",
];

const LIVENESS_PROMPTS = [
  { text: "Blink slowly twice",   icon: "eye",   duration: 5 },
  { text: "Smile naturally",      icon: "smile", duration: 5 },
  { text: "Turn your head left",  icon: "left",  duration: 5 },
  { text: "Turn your head right", icon: "right", duration: 5 },
  { text: "Nod your head gently", icon: "nod",   duration: 5 },
];

const MOTION_THRESHOLDS  = { eye: 0.022, smile: 0.018, left: 0.040, right: 0.040, nod: 0.034 };
const SAMPLE_W           = 80;
const SAMPLE_H           = 60;
const EMA_ALPHA          = 0.25;
const BLIND_FRAMES       = 40;
const STILLNESS_THRESHOLD  = 0.004;
const STILL_CONFIRM_FRAMES = 20;

/* ── Dark-themed shared input classes ── */
const inputCls =
  "w-full bg-white/5 border border-white/10 hover:border-white/20 text-white placeholder-white/20 " +
  "rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 " +
  "focus:ring-amber-500/20 transition-all";
const selectCls = inputCls + " appearance-none cursor-pointer";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── Prompt icon ── */
function PromptIcon({ icon, size = 18 }) {
  const cls = "text-amber-500";
  if (icon === "eye")   return <Eye size={size} className={cls} />;
  if (icon === "smile") return <Smile size={size} className={cls} />;
  if (icon === "left")  return <ArrowLeft size={size} className={cls} />;
  if (icon === "right") return <ArrowRight size={size} className={cls} />;
  if (icon === "nod")   return <span className={cls} style={{ fontSize: size * 0.85, lineHeight: 1 }}>↕</span>;
  return null;
}

/* ── Date of Birth ── */
function DobInput({ value, onChange }) {
  const today   = new Date().toISOString().split("T")[0];
  const minDate = "1900-01-01";
  const displayLabel = value
    ? (() => { const [y, m, d] = value.split("-"); return `${d}/${m}/${y}`; })()
    : "";
  return (
    <div className="relative">
      <div className={`flex items-center justify-between rounded-xl border px-4 py-3.5 pointer-events-none select-none ${value ? "text-white border-white/10 bg-white/5" : "text-white/20 border-white/10 bg-white/5"}`}>
        <span className="text-sm">{displayLabel || "DD / MM / YYYY"}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <input type="date" value={value || ""} min={minDate} max={today}
        onChange={e => onChange(e.target.value || "")}
        className="absolute inset-0 w-full h-full opacity-[0.01] cursor-pointer" style={{ fontSize: 16 }} />
    </div>
  );
}

/* ── File Drop Zone ── */
function FileDropZone({ label, sublabel, name, required = false, value, onChange }) {
  const galleryRef = useRef();
  const cameraRef  = useRef();
  const [drag, setDrag] = useState(false);

  const preview = useMemo(() => value ? URL.createObjectURL(value) : null, [value]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) onChange(name, file);
  };
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onChange(name, file);
    e.target.value = "";
  };

  return (
    <div>
      <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {sublabel && <p className="text-white/25 text-xs mb-3 leading-relaxed">{sublabel}</p>}
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-white/10 group">
          <img src={preview} alt="preview" className="w-full object-cover" style={{ height: "clamp(140px, 35vw, 180px)" }} />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => onChange(name, null)} className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2.5 touch-manipulation">
              <X size={14} />
            </button>
          </div>
          <button type="button" onClick={() => onChange(name, null)}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow touch-manipulation sm:hidden">
            <X size={11} />
          </button>
        </div>
      ) : (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => galleryRef.current?.click()}
            className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer select-none transition-all touch-manipulation ${
              drag ? "border-amber-500/60 bg-amber-500/5" : "border-white/15 hover:border-white/25 bg-white/[0.03] hover:bg-white/5"
            }`}
            style={{ height: "clamp(110px, 26vw, 148px)" }}
          >
            <ImageIcon size={18} className="text-white/20 mb-2" />
            <p className="text-white/40 text-sm font-medium">Choose from gallery</p>
            <p className="text-white/20 text-xs mt-1 text-center px-4">JPG or PNG · max 5MB</p>
          </div>
          <button type="button" onClick={() => cameraRef.current?.click()}
            className="mt-2 w-full flex items-center justify-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 font-semibold text-sm rounded-xl py-3 transition-all touch-manipulation">
            <Camera size={13} className="text-amber-500" />
            Take photo with camera
          </button>
        </>
      )}
    </div>
  );
}

/* ── Liveness Check ── */
function LivenessCheck({ onCapture, captured, onRetake, fullHeight = false }) {
  const videoRef       = useRef(null);
  const canvasRef      = useRef(null);
  const sampleRef      = useRef(null);
  const streamRef      = useRef(null);
  const rafRef         = useRef(null);
  const prevDataRef    = useRef(null);
  const emaRef         = useRef(0);
  const detectionOnRef = useRef(false);

  const [phase, setPhase]             = useState("idle");
  const [prompts, setPrompts]         = useState([]);
  const [promptIdx, setPromptIdx]     = useState(0);
  const [motionPct, setMotionPct]     = useState(0);
  const [completedIdxs, setCompleted] = useState([]);
  const [errorMsg, setErrorMsg]       = useState("");
  const [timeLeft, setTimeLeft]       = useState(0);

  const timeLeftRef  = useRef(0);
  const timerRef     = useRef(null);
  const promptsRef   = useRef([]);
  const promptIdxRef = useRef(0);

  useEffect(() => { promptsRef.current = prompts; }, [prompts]);
  useEffect(() => { promptIdxRef.current = promptIdx; }, [promptIdx]);

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    detectionOnRef.current = false;
    prevDataRef.current = null;
    emaRef.current = 0;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const measureMotion = useCallback(() => {
    const video  = videoRef.current;
    const canvas = sampleRef.current;
    if (!video || !canvas || video.readyState < 2) return 0;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
    const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
    const grey = new Uint8Array(SAMPLE_W * SAMPLE_H);
    for (let i = 0; i < grey.length; i++) {
      const p = i * 4;
      grey[i] = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8;
    }
    if (!prevDataRef.current) { prevDataRef.current = grey; return 0; }
    let diff = 0;
    for (let i = 0; i < grey.length; i++) diff += Math.abs(grey[i] - prevDataRef.current[i]);
    prevDataRef.current = grey;
    return diff / (grey.length * 255);
  }, []);

  const captureSelfie = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      stopStream();
      onCapture(new File([blob], "liveness_selfie.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }, [stopStream, onCapture]);

  const advancePromptRef           = useRef(null);
  const startDetectionCountdownRef = useRef(null);

  const startDetectionLoop = useCallback((promptIndex, threshold) => {
    detectionOnRef.current = true;
    prevDataRef.current = null;
    emaRef.current = 0;
    let detectedThisRound = false;
    let motionFrames = 0;
    let frameCount = 0;
    let stillFrames = 0; 

    const loop = () => {
      if (!detectionOnRef.current) return;
      const raw = measureMotion();

      // Detect static replayed video
      if (raw < 0.0002) {
        stillFrames++;
        if (stillFrames > 80) {
          setErrorMsg("Possible replay detected. Please use a live camera.");
          setPhase("error");
          stopStream();
          return;
        }
      } else {
        stillFrames = 0;
      }

      emaRef.current = EMA_ALPHA * raw + (1 - EMA_ALPHA) * emaRef.current;
      frameCount++;

      if (frameCount > BLIND_FRAMES) {
        const pct = Math.min(100, Math.round((emaRef.current / 0.055) * 100));
        setMotionPct(pct);
        if (emaRef.current >= threshold) {
          motionFrames++;
        } else {
          motionFrames = 0;
        }

        if (!detectedThisRound && motionFrames > 6) {
          detectedThisRound = true;
          detectionOnRef.current = false;
          clearInterval(timerRef.current);
          setTimeout(() => advancePromptRef.current?.(promptIndex), 200);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [measureMotion, stopStream]);

  const startDetectionCountdown = useCallback((thresh, idx) => {
    const MAX_SECS = 8;
    timeLeftRef.current = MAX_SECS;
    setTimeLeft(MAX_SECS);
    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        clearInterval(timerRef.current);
        detectionOnRef.current = false;
        cancelAnimationFrame(rafRef.current);
        setTimeout(() => advancePromptRef.current?.(idx), 100);
      }
    }, 1000);
    startDetectionLoop(idx, thresh);
  }, [startDetectionLoop]);

  startDetectionCountdownRef.current = startDetectionCountdown;

  const startStillnessCapture = useCallback(() => {
    setPhase("stillness");
    prevDataRef.current = null;
    emaRef.current = 0;
    detectionOnRef.current = true;
    let stillFrames = 0;
    const loop = () => {
      if (!detectionOnRef.current) return;
      const raw = measureMotion();
      emaRef.current = EMA_ALPHA * raw + (1 - EMA_ALPHA) * emaRef.current;
      if (emaRef.current < STILLNESS_THRESHOLD) {
        stillFrames++;
        if (stillFrames >= STILL_CONFIRM_FRAMES) { detectionOnRef.current = false; captureSelfie(); return; }
      } else { stillFrames = 0; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [measureMotion, captureSelfie]);

  const advancePrompt = useCallback((doneIdx) => {
    setCompleted(prev => [...prev, doneIdx]);
    setMotionPct(0);
    setPhase("success_flash");
    setTimeout(() => {
      const currentPrompts = promptsRef.current;
      if (doneIdx < currentPrompts.length - 1) {
        const nextIdx = doneIdx + 1;
        setPromptIdx(nextIdx);
        setPhase("warmup");
        setTimeout(() => {
          if (!streamRef.current) return;
          const nextThresh = MOTION_THRESHOLDS[currentPrompts[nextIdx]?.icon] ?? 0.034;
          setPhase("detecting");
          startDetectionCountdownRef.current?.(nextThresh, nextIdx);
        }, 1200);
      } else { startStillnessCapture(); }
    }, 900);
  }, [startStillnessCapture]);

  advancePromptRef.current = advancePrompt;

  const lastUsedIconsRef = useRef(new Set());

  const startCamera = useCallback(async () => {
    setPhase("requesting"); setErrorMsg(""); setCompleted([]); setMotionPct(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const excluded  = lastUsedIconsRef.current;
      const preferred = shuffle(LIVENESS_PROMPTS.filter(p => !excluded.has(p.icon)));
      const fallback  = shuffle(LIVENESS_PROMPTS.filter(p =>  excluded.has(p.icon)));
      const chosen    = [...preferred, ...fallback].slice(0, 2);
      lastUsedIconsRef.current = new Set(chosen.map(p => p.icon));
      promptsRef.current = chosen;
      setPrompts(chosen); setPromptIdx(0); promptIdxRef.current = 0;
      setPhase("warmup");
      setTimeout(() => {
        if (!streamRef.current) return;
        setPhase("detecting");
        startDetectionCountdownRef.current?.(MOTION_THRESHOLDS[chosen[0]?.icon] ?? 0.034, 0);
      }, 2500);
    } catch (err) {
      setErrorMsg(err.name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access and try again."
        : "Could not access camera. Please ensure it is connected and try again.");
      setPhase("error");
    }
  }, []);

  const currentPrompt = prompts[promptIdx];
  const threshold     = currentPrompt ? MOTION_THRESHOLDS[currentPrompt.icon] ?? 0.034 : 0.034;
  const thresholdPct  = Math.min(100, (threshold / 0.055) * 100);

  const capturedUrl = useMemo(() => captured ? URL.createObjectURL(captured) : null, [captured]);
  useEffect(() => () => { if (capturedUrl) URL.revokeObjectURL(capturedUrl); }, [capturedUrl]);

  if (captured) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40">
          <img src={capturedUrl} alt="liveness" className="w-full object-cover" style={{ transform: "scaleX(-1)", height: fullHeight ? "clamp(280px, 60vw, 440px)" : "clamp(160px, 40vw, 220px)" }} />
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
            <CheckCircle size={11} /> Liveness verified
          </div>
        </div>
        <button type="button" onClick={onRetake} className="flex items-center gap-2 text-sm text-white/30 hover:text-amber-500 font-semibold transition-colors py-1">
          <RotateCcw size={13} /> Retake
        </button>
      </div>
    );
  }

  const isLive      = ["warmup", "detecting", "success_flash", "stillness"].includes(phase);
  const isDetecting = phase === "detecting";
  const isStillness = phase === "stillness";
  const ovalStroke  = phase === "success_flash" ? "#10b981" : isStillness ? "#818cf8" : isDetecting ? "#f59e0b" : "rgba(255,255,255,0.4)";
  const viewportH   = fullHeight ? "clamp(300px, 65vw, 480px)" : "clamp(220px, 48vw, 340px)";

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/10" style={{ height: viewportH }}>
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)", display: isLive ? "block" : "none" }} />
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={sampleRef} width={SAMPLE_W} height={SAMPLE_H} className="hidden" />

        {isLive && (
          <div className="absolute inset-0 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
              <defs>
                <mask id="liveness-cut">
                  <rect width="400" height="300" fill="white" />
                  <ellipse cx="200" cy="148" rx="98" ry="126" fill="black" />
                </mask>
              </defs>
              <rect width="400" height="300" fill="rgba(0,0,0,0.5)" mask="url(#liveness-cut)" />
              <ellipse cx="200" cy="148" rx="98" ry="126" fill="none" stroke={ovalStroke} strokeWidth="2.5" strokeDasharray={isDetecting ? "10 4" : "0"} />
            </svg>
          </div>
        )}

        {isLive && prompts.length > 0 && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {prompts.map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                completedIdxs.includes(i) ? "bg-emerald-400 border-emerald-200 scale-110"
                  : i === promptIdx ? "bg-amber-400 border-amber-200 scale-125"
                  : "bg-white/20 border-white/40"
              }`} />
            ))}
          </div>
        )}

        {isDetecting && (
          <div className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
              <motion.circle cx="22" cy="22" r="18" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 18}`}
                animate={{ strokeDashoffset: 2 * Math.PI * 18 * (1 - timeLeft / 8) }}
                transition={{ duration: 0.9, ease: "linear" }} />
            </svg>
            <span className="text-white font-bold text-sm z-10 relative tabular-nums">{timeLeft}</span>
          </div>
        )}

        {isDetecting && !isStillness && (
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
            <p className="text-white text-xs font-semibold mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              Motion detected
            </p>
            <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="absolute top-0 bottom-0 w-0.5 bg-white/60 rounded-full z-10" style={{ left: `${thresholdPct}%` }} />
              <motion.div className="h-full rounded-full"
                style={{ background: motionPct >= thresholdPct ? "linear-gradient(to right, #34d399, #10b981)" : "linear-gradient(to right, #fbbf24, #f59e0b)", width: `${Math.min(100, motionPct)}%` }}
                transition={{ duration: 0.08 }} />
            </div>
          </div>
        )}

        {isStillness && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}
              className="w-16 h-16 rounded-full bg-indigo-500/80 flex items-center justify-center shadow-lg">
              <Camera size={26} className="text-white" />
            </motion.div>
            <p className="text-white font-bold text-sm tracking-wide drop-shadow">Hold still… taking photo</p>
          </div>
        )}

        {phase === "success_flash" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
              <CheckCircle size={30} className="text-white" />
            </motion.div>
            <p className="text-white font-bold text-sm">{promptIdx < prompts.length - 1 ? "Got it! Next action…" : "All done!"}</p>
          </motion.div>
        )}

        {phase === "warmup" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
            <p className="text-white text-sm font-medium">Get ready…</p>
          </div>
        )}

        {(phase === "idle" || phase === "requesting") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              {phase === "requesting"
                ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                : <Video size={24} className="text-white/30" />}
            </div>
            <p className="text-white/40 text-sm">{phase === "requesting" ? "Starting camera…" : "Camera ready"}</p>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <VideoOff size={24} className="text-red-400" />
            <p className="text-red-400 text-sm leading-relaxed">{errorMsg}</p>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {(isDetecting || phase === "warmup") && !isStillness && currentPrompt && (
          <motion.div key={`prompt-${promptIdx}`}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-amber-500/20 flex items-center justify-center shrink-0">
              <PromptIcon icon={currentPrompt.icon} size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-500/70 font-bold uppercase tracking-wider mb-0.5">
                Task {promptIdx + 1} of {prompts.length}
              </p>
              <p className="text-white font-semibold text-sm leading-snug">{currentPrompt.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "idle" && (
        <>
          <button type="button" onClick={startCamera}
            className="w-full flex items-center justify-center gap-2 font-bold text-sm px-5 py-4 rounded-xl transition-all active:scale-95 touch-manipulation text-[#0D1F1A]"
            style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}>
            <Camera size={15} /> Start Liveness Check
          </button>
          <p className="text-white/20 text-xs leading-relaxed text-center px-2">
            Movements are analysed locally. No video is recorded — only a single captured frame is submitted.
          </p>
        </>
      )}
      {phase === "error" && (
        <button type="button" onClick={startCamera}
          className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-sm px-5 py-4 rounded-xl transition-all touch-manipulation">
          <RotateCcw size={13} /> Try Again
        </button>
      )}
    </div>
  );
}

/* ── Status Banner ── */
function StatusBanner({ kyc, onResubmit }) {
  const cfg = {
    pending:  { icon: <Clock size={16} />,       title: "Under Review",          body: "Your documents are being reviewed. This typically takes 1–2 business days.", cls: "border-amber-500/20 bg-amber-500/5 text-amber-400", dot: "bg-amber-500"   },
    approved: { icon: <CheckCircle size={16} />, title: "Verified",              body: "Identity verified. You have full access to all platform features.",           cls: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400", dot: "bg-emerald-500" },
    rejected: { icon: <XCircle size={16} />,     title: "Verification Failed",   body: null, cls: "border-red-500/20 bg-red-500/5 text-red-400", dot: "bg-red-500" },
    resubmit: { icon: <RefreshCw size={16} />,   title: "Resubmission Required", body: null, cls: "border-orange-500/20 bg-orange-500/5 text-orange-400", dot: "bg-orange-500" },
  };
  const c = cfg[kyc.status];
  if (!c) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${c.cls} p-4 mb-6`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{c.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${c.dot}`} />
            <p className="font-bold text-xs tracking-wide uppercase">{c.title}</p>
          </div>
          {c.body && <p className="text-white/40 text-sm leading-relaxed">{c.body}</p>}
          {kyc.rejection_reason && <p className="text-white/40 text-sm leading-relaxed"><span className="text-white/25">Reason: </span>{kyc.rejection_reason}</p>}
          {(kyc.status === "rejected" || kyc.status === "resubmit") && (
            <button onClick={onResubmit}
              className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#0D1F1A] px-4 py-2 rounded-lg touch-manipulation"
              style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}>
              <RefreshCw size={12} /> Submit Again
            </button>
          )}
          {kyc.submission_date && (
            <p className="text-white/20 text-xs mt-2">
              Submitted {new Date(kyc.submission_date).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Field wrapper ── */
function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
          <AlertCircle size={11} />{error}
        </p>
      )}
    </div>
  );
}

/* ── Progress rail ── */
function ProgressRail({ current }) {
  return (
    <div className="hidden sm:flex items-center mb-8">
      {STEPS.map((step, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ duration: 0.25 }}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                style={{
                  background: done ? "linear-gradient(135deg, #C8873A, #E8A850)" : active ? "transparent" : "rgba(255,255,255,0.05)",
                  borderColor: done || active ? "#C8873A" : "rgba(255,255,255,0.1)",
                  color: done ? "#0D1F1A" : active ? "#E8A850" : "rgba(255,255,255,0.2)",
                }}>
                {done ? <CheckCircle size={13} /> : i + 1}
              </motion.div>
              <span className={`text-xs mt-1.5 font-semibold whitespace-nowrap ${active ? "text-amber-500" : done ? "text-white/40" : "text-white/15"}`}>
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-2 mb-5 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #C8873A, #E8A850)" }}
                  animate={{ width: done ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Review row ── */
function ReviewRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="py-3 border-b border-white/5 last:border-0">
      <p className="text-white/25 text-xs mb-0.5">{label}</p>
      <p className="text-white/80 text-sm font-semibold break-all">{value}</p>
    </div>
  );
}

const stepAnim = { initial: { opacity: 0, x: 18 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -18 }, transition: { duration: 0.22 } };
const formatDateDisplay = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

function NavButtons({ step, totalSteps, onNext, onSubmit, onBack, submitting }) {
  const isLast = step === totalSteps - 1;
  return (
    <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/10">
      {step > 0
        ? <button type="button" onClick={onBack} disabled={submitting}
            className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-sm font-semibold transition-colors py-2 px-1">
            <ChevronLeft size={15} /> Back
          </button>
        : <div />}
      {!isLast ? (
        <button type="button" onClick={onNext}
          className="flex items-center justify-center gap-2 font-bold text-sm py-3.5 px-6 rounded-xl transition-all active:scale-95 touch-manipulation text-[#0D1F1A]"
          style={{ background: "linear-gradient(135deg, #C8873A 0%, #E8A850 100%)" }}>
          Continue <ChevronRight size={15} />
        </button>
      ) : (
        <button type="button" onClick={onSubmit} disabled={submitting}
          className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-50 text-white font-bold text-sm py-3.5 px-6 rounded-xl transition-all active:scale-95 touch-manipulation">
          {submitting
            ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Submitting…</>
            : <><Shield size={13} />Submit Verification</>}
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════════ */
export default function KycPanel({ kycStatus: kycStatusProp, setKycStatus: setKycStatusProp }) {
  const [kycStatus, _setKycStatus] = useState(null);
  const [loading, setLoading]      = useState(true);
  const [showForm, setShowForm]    = useState(false);
  const [step, setStep]            = useState(0);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors]           = useState({});

  const setKycStatus = useCallback((val) => {
    _setKycStatus(val);
    setKycStatusProp?.(val?.status ?? null);
  }, [setKycStatusProp]);

  const [form, setForm] = useState({
    full_name: "", date_of_birth: "", phone_number: "",
    address: "", city: "", state: "", country: "Nigeria",
    id_type: "", id_number: "",
    id_front: null, id_back: null, selfie: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/kyc/status");
        const kycData = data.data;
        setKycStatus(kycData);
        setShowForm(["not_submitted", "rejected", "resubmit"].includes(kycData.status));
      } catch {
        setKycStatus({ status: "not_submitted" });
        setShowForm(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setFile  = (k, f) => setForm(p => ({ ...p, [k]: f }));
  const handleIdTypeChange = (val) => setForm(p => ({ ...p, id_type: val, id_number: "" }));
  const handleIdNumberChange = (e) => {
    const meta = ID_TYPES.find(t => t.value === form.id_type);
    let val = e.target.value;
    if (meta?.numericOnly) val = val.replace(/\D/g, "");
    if (meta?.maxLen) val = val.slice(0, meta.maxLen);
    setField("id_number", val);
  };

  const selectedIdMeta = ID_TYPES.find(t => t.value === form.id_type);
  const idTypeLabel    = selectedIdMeta?.label || "—";

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.full_name.trim())    e.full_name     = "Full name is required";
      if (!form.date_of_birth)       e.date_of_birth = "Date of birth is required";
      else {
        const age = Math.floor((new Date() - new Date(form.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25));
        if (age < 18)  e.date_of_birth = "You must be at least 18 years old";
        if (age > 120) e.date_of_birth = "Please enter a valid date of birth";
      }
      if (!form.phone_number.trim())  e.phone_number = "Phone number is required";
      else if (form.phone_number.length < 7) e.phone_number = "Please enter a valid phone number";
    }
    if (step === 1) {
      if (!form.address.trim()) e.address = "Address is required";
      if (!form.city.trim())    e.city    = "City is required";
      if (!form.state)          e.state   = "State is required";
    }
    if (step === 2) {
      if (!form.id_type)          e.id_type   = "Please select an ID type";
      if (!form.id_number.trim()) e.id_number = "ID number is required";
      else if (selectedIdMeta?.maxLen && form.id_number.length < selectedIdMeta.maxLen && selectedIdMeta.numericOnly)
        e.id_number = `Must be exactly ${selectedIdMeta.maxLen} digits`;
    }
    if (step === 3 && form.id_type !== "bvn" && !form.id_front) {
      e.id_front = "Front of ID is required";
    }
    if (step === 4 && !form.selfie) e.selfie = "Please complete the liveness check";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    if (step === 2 && form.id_type === "bvn") { setStep(4); return; }
    setStep(s => s + 1);
  };

  const prevStep = () => {
    if (step === 4 && form.id_type === "bvn") {
      setStep(2);
    } else {
      setStep(s => s - 1);
    }
    setErrors({});
  };

  const handleSubmit = async () => {
    setSubmitting(true); setSubmitError("");
    try {
      const fd = new FormData();
      fd.append("full_name",     form.full_name.trim());
      fd.append("date_of_birth", form.date_of_birth);
      fd.append("phone_number",  `+234${form.phone_number}`);
      fd.append("address",       form.address.trim());
      fd.append("city",          form.city.trim());
      fd.append("state",         form.state);
      fd.append("country",       form.country);
      fd.append("id_type",       form.id_type);
      fd.append("id_number",     form.id_number.trim());
      if (form.id_front) fd.append("id_front", form.id_front);
      if (form.id_back)  fd.append("id_back",  form.id_back);
      if (form.selfie)   fd.append("selfie",   form.selfie);
      await api.post("/kyc/submit", fd, { headers: { "Content-Type": "multipart/form-data" } });
      try {
        const { data: statusRes } = await api.get("/kyc/status");
        setKycStatus(statusRes.data);
      } catch {
        setKycStatus({ status: "pending", submission_date: new Date().toISOString() });
      }
      setShowForm(false);
    } catch (err) {
      const resData = err.response?.data;
      setSubmitError(resData?.message
        ? resData.message
        : resData?.errors ? Object.values(resData.errors).flat().join(" ") : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const stepMeta = [
    { icon: <User size={16} />,        title: "Personal Information", subtitle: "Tell us about yourself" },
    { icon: <MapPin size={16} />,      title: "Residential Address",  subtitle: "Where do you live?" },
    { icon: <CreditCard size={16} />,  title: "Identity Document",    subtitle: "Your government-issued ID" },
    { icon: <ImageIcon size={16} />,   title: "Upload Documents",     subtitle: "Photos of your ID" },
    { icon: <Camera size={16} />,      title: "Liveness Check",       subtitle: "Confirm you're physically present" },
    { icon: <CheckCircle size={16} />, title: "Review & Submit",      subtitle: "Confirm your details" },
  ];
  const meta = stepMeta[step];

  const renderStepContent = () => (
    <AnimatePresence mode="wait">

      {step === 0 && (
        <motion.div key="s0" {...stepAnim} className="space-y-5">
          <Field label="Full Legal Name" required error={errors.full_name}>
            <input className={inputCls} placeholder="As appears on your ID" autoComplete="name" autoCapitalize="words"
              value={form.full_name} onChange={e => setField("full_name", e.target.value)} />
          </Field>
          <Field label="Date of Birth" required error={errors.date_of_birth}>
            <DobInput value={form.date_of_birth} onChange={v => setField("date_of_birth", v)} />
          </Field>
          <Field label="Phone Number" required error={errors.phone_number}>
            <div className="flex items-stretch rounded-xl overflow-hidden border border-white/10 focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all bg-white/5">
              <div className="flex items-center gap-2 px-3.5 bg-white/5 border-r border-white/10 shrink-0 select-none pointer-events-none">
                <span className="text-base leading-none">🇳🇬</span>
                <span className="text-white/60 font-bold text-sm">+234</span>
              </div>
              <input className="flex-1 bg-transparent text-white placeholder-white/20 px-3.5 py-3.5 text-sm focus:outline-none min-w-0"
                placeholder="800 000 0000" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={11}
                value={form.phone_number}
                onChange={e => setField("phone_number", e.target.value.replace(/\D/g, "").replace(/^0+/, ""))} />
            </div>
          </Field>
        </motion.div>
      )}

      {step === 1 && (
        <motion.div key="s1" {...stepAnim} className="space-y-5">
          <Field label="Street Address" required error={errors.address}>
            <textarea className={inputCls + " resize-none"} style={{ height: "88px" }}
              placeholder="House number, street name, landmark" autoComplete="street-address"
              value={form.address} onChange={e => setField("address", e.target.value)} />
          </Field>
          <Field label="City" required error={errors.city}>
            <input className={inputCls} placeholder="e.g. Lagos" value={form.city} onChange={e => setField("city", e.target.value)} />
          </Field>
          <Field label="State" required error={errors.state}>
            <select className={selectCls} value={form.state} onChange={e => setField("state", e.target.value)}>
              <option value="" className="bg-[#0D1F1A]">Select state</option>
              {NIGERIAN_STATES.map(s => <option key={s} value={s} className="bg-[#0D1F1A]">{s}</option>)}
            </select>
          </Field>
          <Field label="Country">
            <input className={inputCls + " opacity-40 cursor-not-allowed"} value={form.country} readOnly />
          </Field>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div key="s2" {...stepAnim} className="space-y-5">
          <Field label="Document Type" required error={errors.id_type}>
            <select className={selectCls} value={form.id_type} onChange={e => handleIdTypeChange(e.target.value)}>
              <option value="" className="bg-[#0D1F1A]">Select document type</option>
              {ID_TYPES.map(t => <option key={t.value} value={t.value} className="bg-[#0D1F1A]">{t.label}</option>)}
            </select>
          </Field>
          <Field label="Document Number" required error={errors.id_number}>
            <div className="relative">
              <input className={inputCls}
                placeholder={selectedIdMeta?.numericOnly ? `${selectedIdMeta.maxLen}-digit number` : "Enter your document number"}
                inputMode={selectedIdMeta?.numericOnly ? "numeric" : "text"}
                maxLength={selectedIdMeta?.maxLen}
                value={form.id_number} onChange={handleIdNumberChange}
                style={{ paddingRight: selectedIdMeta?.numericOnly && form.id_number ? "4.5rem" : undefined }}
              />
              {selectedIdMeta?.numericOnly && form.id_number.length > 0 && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-white/25 pointer-events-none tabular-nums">
                  {form.id_number.length}/{selectedIdMeta.maxLen}
                </span>
              )}
            </div>
          </Field>
          {form.id_type && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
              <AlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-amber-400/70 text-xs leading-relaxed">
                Ensure the number matches exactly what is printed on your {idTypeLabel.toLowerCase()}.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {step === 3 && form.id_type !== "bvn" && (
        <motion.div key="s3" {...stepAnim} className="space-y-5">
          <FileDropZone label="ID Front" required sublabel="Clear photo of the front of your document" name="id_front" value={form.id_front} onChange={setFile} />
          {errors.id_front && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={11} />{errors.id_front}</p>}
          <FileDropZone label="ID Back" sublabel="Back of your document (if applicable)" name="id_back" value={form.id_back} onChange={setFile} />
        </motion.div>
      )}

      {step === 4 && (
        <motion.div key="s4" {...stepAnim}>
          <LivenessCheck captured={form.selfie} onCapture={f => setFile("selfie", f)} onRetake={() => setFile("selfie", null)} fullHeight />
          {errors.selfie && <p className="text-red-400 text-xs mt-3 flex items-center gap-1"><AlertCircle size={11} />{errors.selfie}</p>}
        </motion.div>
      )}

      {step === 5 && (
        <motion.div key="s5" {...stepAnim} className="space-y-4">
          {[
            { heading: "Personal",  icon: <User size={12} />,       rows: [["Full Name", form.full_name], ["Date of Birth", formatDateDisplay(form.date_of_birth)], ["Phone", form.phone_number ? `+234 ${form.phone_number}` : ""]] },
            { heading: "Address",   icon: <MapPin size={12} />,     rows: [["Street", form.address], ["City", form.city], ["State", form.state], ["Country", form.country]] },
            { heading: "Identity",  icon: <CreditCard size={12} />, rows: [["Document Type", idTypeLabel], ["Document Number", form.id_number]] },
            { heading: "Documents", icon: <Camera size={12} />,     rows: [["ID Front", form.id_front?.name], ["ID Back", form.id_back?.name || "Not provided"], ["Liveness Photo", form.selfie ? "✓ Captured" : "—"]] },
          ].map(({ heading, icon, rows }) => (
            <div key={heading} className="rounded-xl border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border-b border-white/5">
                <span className="text-amber-500">{icon}</span>
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{heading}</p>
              </div>
              <div className="px-4 divide-y divide-white/[0.03]">
                {rows.map(([l, v]) => <ReviewRow key={l} label={l} value={v} />)}
              </div>
            </div>
          ))}
          {submitError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3.5">
              <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-sm">{submitError}</p>
            </div>
          )}
          <p className="text-white/20 text-xs leading-relaxed">
            By submitting, you confirm all information is accurate and documents belong to you.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="space-y-0">
      {kycStatus && kycStatus.status !== "not_submitted" && (
        <StatusBanner kyc={kycStatus} onResubmit={() => { setShowForm(true); setStep(0); }} />
      )}

      {kycStatus?.status === "approved" && !showForm && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <CheckCircle size={26} className="text-emerald-500" />
          </div>
          <p className="text-xl text-white font-bold mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>You're Verified</p>
          <p className="text-white/30 text-sm">All identity checks passed successfully.</p>
        </motion.div>
      )}

      {showForm && (
        <>
          <ProgressRail current={step} />

          {/* Step header */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/10">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              {React.cloneElement(meta.icon, { size: 15 })}
            </div>
            <div>
              <h2 className="text-lg text-white font-bold leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{meta.title}</h2>
              <p className="text-white/30 text-xs mt-0.5">{meta.subtitle}</p>
            </div>
            <span className="ml-auto text-xs text-white/20 font-medium tabular-nums sm:hidden">{step + 1}/{STEPS.length}</span>
          </div>

          {/* Mobile progress bar */}
          <div className="sm:hidden h-0.5 bg-white/10 rounded-full mb-5 overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #C8873A, #E8A850)" }}
              animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.4 }} />
          </div>

          {renderStepContent()}

          <NavButtons
            step={step}
            totalSteps={STEPS.length}
            onNext={nextStep}
            onSubmit={handleSubmit}
            onBack={prevStep}
            submitting={submitting}
          />
        </>
      )}
    </div>
  );
}