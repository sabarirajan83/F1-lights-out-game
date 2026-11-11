// ==========================================================================
// F1 Reflex Test - Starting Lights & Telemetry Logic
// ==========================================================================

const columns = document.querySelectorAll(".column");
const timeEl = document.getElementById("time");
const instructions = document.getElementById("instructions");
const highScoreEl = document.getElementById("highscore");
const telemetryStatus = document.getElementById("telemetryStatus");
const reactionRating = document.getElementById("reactionRating");
const soundToggle = document.getElementById("soundToggle");
const soundIcon = document.getElementById("soundIcon");

let raceState = "ready"; // 'ready' | 'lights' | 'go' | 'finished'
let startTime = 0;
let highScore = null;
let currentRunId = 0;
let animFrameId = null;
let soundEnabled = true;

// Web Audio API Context (Initialized on user gesture)
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Sound Synthesizers (zero external assets needed)
function playTone(freq, type, duration, gainLevel = 0.15) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Ignore audio errors if blocked by browser policy
  }
}

function playBeepSound() {
  playTone(880, "sine", 0.09, 0.18); // Crisp F1 light tone
}

function playLightsOutSound() {
  playTone(440, "triangle", 0.22, 0.25); // Start go tone
}

function playJumpStartBuzzer() {
  playTone(140, "sawtooth", 0.35, 0.3); // Penalty buzzer
}

function playRecordSound() {
  setTimeout(() => playTone(587.33, "triangle", 0.1, 0.15), 0);
  setTimeout(() => playTone(880.0, "triangle", 0.15, 0.18), 100);
  setTimeout(() => playTone(1174.66, "sine", 0.25, 0.2), 220);
}

// --------------------------------------------------------------------------
// High Score Management
// --------------------------------------------------------------------------
function initHighScore() {
  try {
    const stored = localStorage.getItem("f1_reflex_highscore");
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed > 0) {
        highScore = parsed;
        highScoreEl.innerHTML = `BEST RECORD: ${highScore.toFixed(3)}s`;
        return;
      }
    }
  } catch (e) {
    // LocalStorage might be restricted
  }
  highScoreEl.innerHTML = "BEST RECORD: --";
}

// --------------------------------------------------------------------------
// State & UI Helpers
// --------------------------------------------------------------------------
function setGameStateVisual(state) {
  document.body.classList.remove(
    "state-ready",
    "state-lights",
    "state-go",
    "state-jumpstart",
    "state-record"
  );
  document.body.classList.add(`state-${state}`);
}

function getF1Rating(seconds) {
  if (seconds < 0.200) return "🔥 Phenomenal! F1 World Champion Level!";
  if (seconds < 0.240) return "⚡ Superb! Formula 1 Driver Reflexes!";
  if (seconds < 0.290) return "🏁 Great Start! Podium Contender!";
  if (seconds < 0.360) return "⏱️ Solid Reaction! Midfield Pace!";
  return "🐢 Slow Reaction! Practice your launch timing!";
}

// Safe cancellable sleep tied to specific run ID
function safeSleep(ms, runId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(runId === currentRunId);
    }, ms);
  });
}

// --------------------------------------------------------------------------
// Core Game Sequence
// --------------------------------------------------------------------------
async function startLights() {
  currentRunId++;
  const runId = currentRunId;

  raceState = "lights";
  setGameStateVisual("lights");
  timeEl.innerHTML = "0.000";
  telemetryStatus.innerHTML = "LIGHTS ON";
  instructions.innerHTML = "WAIT FOR LIGHTS OUT...";
  reactionRating.innerHTML = "FOCUS ON THE LIGHTS &bull; PREPARE TO LAUNCH";

  // Reset columns
  columns.forEach((col) => col.classList.remove("active"));

  // Sequentially turn on the 5 columns of red lights (1 second interval)
  for (let i = 0; i < columns.length; i++) {
    if (raceState !== "lights" || runId !== currentRunId) return;

    columns[i].classList.add("active");
    playBeepSound();

    const stillValid = await safeSleep(1000, runId);
    if (!stillValid || raceState !== "lights" || runId !== currentRunId) return;
  }

  // Authentic F1 random pause: 1.0s to 3.0s before extinguishing
  const randomDelay = Math.floor(Math.random() * 2000) + 1000;
  const stillValid = await safeSleep(randomDelay, runId);

  if (stillValid && raceState === "lights" && runId === currentRunId) {
    lightsOut();
  }
}

function lightsOut() {
  columns.forEach((col) => col.classList.remove("active"));

  raceState = "go";
  startTime = performance.now();
  setGameStateVisual("go");

  playLightsOutSound();
  instructions.innerHTML = "LIGHTS OUT! GO GO GO!";
  telemetryStatus.innerHTML = "GREEN GREEN GREEN";
  reactionRating.innerHTML = "LAUNCH! CLICK OR PRESS SPACE!";

  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(updateTime);
}

function updateTime() {
  if (raceState !== "go") return;

  const elapsed = (performance.now() - startTime) / 1000;
  timeEl.innerHTML = elapsed.toFixed(3);

  animFrameId = requestAnimationFrame(updateTime);
}

// --------------------------------------------------------------------------
// Interaction Handler (Click, Touch, Spacebar)
// --------------------------------------------------------------------------
function handleInteraction(event) {
  // Ignore clicks on the audio toggle button
  if (event && event.target && event.target.closest("#soundToggle")) {
    return;
  }

  // Wake up Web Audio on first gesture
  getAudioContext();

  // 1. Ready -> Start Countdown
  if (raceState === "ready") {
    startLights();
    return;
  }

  // 2. Clicked while lights are on -> JUMP START (False Start Penalty)
  if (raceState === "lights") {
    raceState = "finished";
    currentRunId++; // Cancel pending timeouts and lightsOut()

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    columns.forEach((col) => col.classList.remove("active"));
    setGameStateVisual("jumpstart");
    playJumpStartBuzzer();

    timeEl.innerHTML = "JUMP START";
    instructions.innerHTML = "FALSE START! +5s PENALTY";
    telemetryStatus.innerHTML = "PENALTY";
    reactionRating.innerHTML = "❌ You jumped the start before lights went out!";
    return;
  }

  // 3. Clicked on Lights Out -> Accurate Reaction Time Measurement
  if (raceState === "go") {
    raceState = "finished";
    const endTime = performance.now();

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    // Precise sub-millisecond calculation directly from high-resolution clock
    const reactionTime = (endTime - startTime) / 1000;
    timeEl.innerHTML = reactionTime.toFixed(3);
    telemetryStatus.innerHTML = "FINISHED";

    const rating = getF1Rating(reactionTime);
    reactionRating.innerHTML = rating;

    // Check if new record
    if (highScore === null || reactionTime < highScore) {
      highScore = reactionTime;
      try {
        localStorage.setItem("f1_reflex_highscore", highScore.toString());
      } catch (e) {}

      highScoreEl.innerHTML = `BEST RECORD: ${highScore.toFixed(3)}s (NEW!)`;
      instructions.innerHTML = "🏆 NEW RECORD! CLICK TO RACE AGAIN";
      setGameStateVisual("record");
      playRecordSound();
    } else {
      highScoreEl.innerHTML = `BEST RECORD: ${highScore.toFixed(3)}s`;
      instructions.innerHTML = "CLICK ANYWHERE TO RACE AGAIN";
    }
    return;
  }

  // 4. Clicked after race finished -> Reset to Ready
  if (raceState === "finished") {
    raceState = "ready";
    currentRunId++;

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    columns.forEach((col) => col.classList.remove("active"));
    setGameStateVisual("ready");

    timeEl.innerHTML = "0.000";
    instructions.innerHTML = "Click anywhere or press Space to race!";
    telemetryStatus.innerHTML = "READY";
    reactionRating.innerHTML = "READY FOR FORMATION LAP";
  }
}

// --------------------------------------------------------------------------
// Event Listeners
// --------------------------------------------------------------------------
// Pointer down provides instant, zero-latency response for reflex test
window.addEventListener("pointerdown", handleInteraction);

// Keyboard Spacebar and Enter support
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault(); // Prevent page scroll
    handleInteraction();
  }
});

// Sound Toggle
soundToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  soundEnabled = !soundEnabled;
  soundIcon.innerHTML = soundEnabled ? "🔊" : "🔇";
  if (soundEnabled) {
    playBeepSound();
  }
});

// Initialize on page load
initHighScore();
