const columns = document.querySelectorAll(".column");
const timeEl = document.getElementById("time");
const instructions = document.getElementById("instructions");
const highScoreEl = document.getElementById("highscore");

let raceState = "ready";
let startTime = 0;
let highScore = null;

instructions.innerHTML = "Click if you are ready to race!";
timeEl.innerHTML = "0.000";
highScoreEl.innerHTML = "High Score: --";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startLights() {
  raceState = "lights";
  timeEl.innerHTML = "0.000";

  for (let i = 0; i < columns.length; i++) {
    if (raceState !== "lights") return;
    columns[i].classList.add("active");
    await sleep(1000);
  }

  const randomDelay = Math.floor(Math.random() * (8000 - 2000 + 1)) + 2000;
  await sleep(randomDelay);

  if (raceState === "lights") {
    lightsOut();
  }
}

function lightsOut() {
  columns.forEach((col) => col.classList.remove("active"));

  raceState = "go";
  startTime = performance.now();
  instructions.innerHTML = "GO!";

  requestAnimationFrame(updateTime);
}

function updateTime() {
  if (raceState !== "go") return;

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
  timeEl.innerHTML = elapsed;

  requestAnimationFrame(updateTime);
}

function handleInteraction() {
  if (raceState === "ready") {
    instructions.innerHTML = "Get Ready...";
    startLights();
    return;
  }

  if (raceState === "lights") {
    raceState = "finished";
    instructions.innerHTML = "JUMP START!";
    document.body.style.backgroundColor = "#ffa5a5ff";
    columns.forEach((col) => col.classList.remove("active"));
    return;
  }

  if (raceState === "go") {
    raceState = "finished";

    const reactionTime = parseFloat(timeEl.innerHTML);

    if (highScore === null || reactionTime < highScore) {
      highScore = reactionTime;
      highScoreEl.innerHTML = `High Score: ${highScore.toFixed(3)}s`;
      instructions.innerHTML = "NEW RECORD!";
    } else {
      instructions.innerHTML = "Reaction Time!";
    }
    document.body.style.backgroundColor = "#a5ffa5ff";

    return;
  }

  if (raceState === "finished") {
    raceState = "ready";
    document.body.style.backgroundColor = "white";
    instructions.innerHTML = "Click if you are ready to race!";
    timeEl.innerHTML = "0.000";
  }
}

document.body.addEventListener("pointerup", handleInteraction);
