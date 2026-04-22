(function () {
  const MAX_MINUTES = 15;
  const MAX_SECONDS = MAX_MINUTES * 60;

  const minuteHand = document.getElementById("minuteHand");
  const stopwatchValue = document.getElementById("stopwatchValue");
  const timerValue = document.getElementById("timerValue");
  const statusMessage = document.getElementById("statusMessage");
  const minutesInput = document.getElementById("minutesInput");
  const timerModeToggle = document.getElementById("timerModeToggle");
  const timerModeLabel = document.getElementById("timerModeLabel");
  const toggleButton = document.getElementById("toggleButton");
  const timerButton = document.getElementById("timerButton");
  const resetButton = document.getElementById("resetButton");
  const minuteTrack = document.getElementById("minuteTrack");
  const ticks = document.getElementById("ticks");
  const alertAudio = document.getElementById("alertAudio");

  let stopwatchSeconds = 0;
  let timerSeconds = 0;
  let timerTargetSeconds = 0;
  let running = false;
  let intervalId = null;
  let audioContext = null;
  let fillElement = null;
  let fillCanvas = null;
  let fillContext = null;
  let eraseMode = false;

  function buildDial() {
    for (let minute = 1; minute <= MAX_MINUTES; minute += 1) {
      const rotation = (minute / MAX_MINUTES) * 360;
      const angle = ((rotation - 90) * Math.PI) / 180;
      const tickRadius = 38;
      const labelRadius = 46;

      const tick = document.createElement("div");
      tick.className = "tick";
      tick.style.left = `${50 + Math.cos(angle) * tickRadius}%`;
      tick.style.top = `${50 + Math.sin(angle) * tickRadius}%`;
      tick.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
      ticks.appendChild(tick);

      const label = document.createElement("div");
      label.className = "tick-label";
      label.textContent = String(minute);
      label.style.left = `${50 + Math.cos(angle) * labelRadius}%`;
      label.style.top = `${50 + Math.sin(angle) * labelRadius}%`;
      label.style.transform = "translate(-50%, -50%)";
      ticks.appendChild(label);
    }

    fillElement = document.createElement("div");
    fillElement.className = "timer-fill";
    fillElement.innerHTML = [
      '<canvas id="timerFillCanvas" width="300" height="300" aria-hidden="true"></canvas>'
    ].join("");
    minuteTrack.appendChild(fillElement);
    fillCanvas = fillElement.querySelector("#timerFillCanvas");
    fillContext = fillCanvas.getContext("2d");
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function sanitizeMinutesInput(rawValue) {
    const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 2);
    minutesInput.value = digitsOnly;
    return digitsOnly;
  }

  function setStatus(message, isAlert) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("alert", Boolean(isAlert));
  }

  function updateModeLabel() {
    timerModeLabel.textContent = eraseMode
      ? "Lleno y se va borrando"
      : "Crecer con manecilla";
  }

  function updateTimerFill() {
    if (!fillContext || !fillCanvas) {
      return;
    }

    drawPie(getTimerFillAngle());
  }

  function getTimerFillAngle() {
    if (timerTargetSeconds <= 0 || timerSeconds <= 0) {
      return 0;
    }

    const selectedMinutes = Math.min(timerTargetSeconds / 60, MAX_MINUTES);
    const selectedSpan = (selectedMinutes / MAX_MINUTES) * 360;
    const elapsedFraction = 1 - Math.min(timerSeconds / timerTargetSeconds, 1);
    return selectedSpan * elapsedFraction;
  }

  function drawPie(angleInDegrees) {
    const width = fillCanvas.width;
    const height = fillCanvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2;
    const startAngle = -Math.PI / 2;
    const fullTimerAngle = timerTargetSeconds > 0
      ? (Math.min(timerTargetSeconds / 60, MAX_MINUTES) / MAX_MINUTES) * 360
      : 0;
    const normalizedAngle = Math.max(Math.min(angleInDegrees, fullTimerAngle), 0);
    const endAngle = startAngle + (normalizedAngle * Math.PI) / 180;
    const fullEndAngle = startAngle + (fullTimerAngle * Math.PI) / 180;

    fillContext.clearRect(0, 0, width, height);

    if (fullTimerAngle <= 0) {
      return;
    }

    fillContext.fillStyle = "rgba(216, 25, 25, 0.35)";

    if (eraseMode) {
      fillContext.beginPath();
      fillContext.moveTo(cx, cy);
      fillContext.arc(cx, cy, radius, startAngle, fullEndAngle, false);
      fillContext.closePath();
      fillContext.fill();

      if (normalizedAngle > 0) {
        fillContext.save();
        fillContext.globalCompositeOperation = "destination-out";
        fillContext.beginPath();
        fillContext.moveTo(cx, cy);
        fillContext.arc(cx, cy, radius, startAngle, endAngle, false);
        fillContext.closePath();
        fillContext.fill();
        fillContext.restore();
      }
      return;
    }

    if (normalizedAngle <= 0) {
      return;
    }

    fillContext.beginPath();
    fillContext.moveTo(cx, cy);
    fillContext.arc(cx, cy, radius, startAngle, endAngle, false);
    fillContext.closePath();
    fillContext.fill();
  }

  function updateHands() {
    const timerActive = timerTargetSeconds > 0;
    if (timerActive) {
      minuteHand.style.transform = `rotate(${getTimerFillAngle()}deg)`;
      return;
    }

    const elapsedMinutes = Math.floor(stopwatchSeconds / 60);
    const minuteStepAngle = (elapsedMinutes / MAX_MINUTES) * 360;
    minuteHand.style.transform = `rotate(${minuteStepAngle}deg)`;
  }

  function render() {
    stopwatchValue.textContent = formatTime(stopwatchSeconds);
    timerValue.textContent = formatTime(timerSeconds);
    toggleButton.textContent = running ? "Detener" : "Iniciar";
    updateHands();
    updateTimerFill();
  }

  async function playAlert() {
    try {
      alertAudio.currentTime = 0;
      await alertAudio.play();
      return;
    } catch (error) {
      // Si no hay archivo o el navegador lo bloquea, usamos un beep sintetico.
    }

    try {
      if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          return;
        }
        audioContext = new AudioContextClass();
      }

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.setValueAtTime(660, now + 0.18);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      oscillator.start(now);
      oscillator.stop(now + 0.58);
    } catch (error) {
      console.warn("No fue posible reproducir la alerta.", error);
    }
  }

  function finishTimer() {
    timerSeconds = 0;
    timerTargetSeconds = 0;
    running = false;
    clearInterval(intervalId);
    intervalId = null;
    render();
    setStatus("El timer termino.", true);
    playAlert();
  }

  function tick() {
    stopwatchSeconds = Math.min(stopwatchSeconds + 1, MAX_SECONDS);

    if (timerSeconds > 0) {
      timerSeconds -= 1;
      if (timerSeconds <= 0) {
        finishTimer();
        return;
      }
    }

    if (stopwatchSeconds >= MAX_SECONDS && timerSeconds <= 0) {
      running = false;
      clearInterval(intervalId);
      intervalId = null;
      setStatus("Se alcanzo el maximo de 15 minutos.", true);
    }

    render();
  }

  function ensureRunning() {
    if (intervalId) {
      return;
    }
    intervalId = window.setInterval(tick, 1000);
  }

  function toggleStopwatch() {
    running = !running;

    if (running) {
      ensureRunning();
      setStatus(timerSeconds > 0 ? "Cronometro y timer en curso." : "Cronometro en curso.", false);
    } else {
      clearInterval(intervalId);
      intervalId = null;
      setStatus("Cronometro detenido.", false);
    }

    render();
  }

  function startTimer() {
    const rawValue = sanitizeMinutesInput(minutesInput.value);
    const minutes = Number(rawValue);

    if (!rawValue || Number.isNaN(minutes)) {
      setStatus("Escribe un valor numerico entre 1 y 15.", true);
      return;
    }

    if (minutes < 1 || minutes > MAX_MINUTES) {
      setStatus("El timer permite de 1 a 15 minutos.", true);
      return;
    }

    timerTargetSeconds = minutes * 60;
    timerSeconds = timerTargetSeconds;
    stopwatchSeconds = 0;
    running = true;
    ensureRunning();
    render();
    setStatus(`Timer iniciado por ${minutes} minuto${minutes === 1 ? "" : "s"}.`, false);
  }

  function resetAll() {
    running = false;
    stopwatchSeconds = 0;
    timerSeconds = 0;
    timerTargetSeconds = 0;
    clearInterval(intervalId);
    intervalId = null;
    render();
    setStatus("Cronometro reiniciado.", false);
  }

  minutesInput.addEventListener("input", function (event) {
    sanitizeMinutesInput(event.target.value);
  });
  timerModeToggle.addEventListener("change", function (event) {
    eraseMode = event.target.checked;
    updateModeLabel();
    render();
  });

  toggleButton.addEventListener("click", toggleStopwatch);
  timerButton.addEventListener("click", startTimer);
  resetButton.addEventListener("click", resetAll);

  buildDial();
  updateModeLabel();
  render();
})();
