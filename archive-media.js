(() => {
  const dialog = document.querySelector("#muon-listening-room");
  if (!dialog) return;

  const openButtons = document.querySelectorAll("[data-open-listening-room]");
  const closeButton = dialog.querySelector("[data-close-listening-room]");
  const audio = dialog.querySelector("#muon-score-audio");
  const playButton = dialog.querySelector("[data-audio-play]");
  const seek = dialog.querySelector("[data-audio-seek]");
  const time = dialog.querySelector(".listening-time");
  const playIcon = playButton?.querySelector("span:first-child");
  const playLabel = dialog.querySelector(".listening-toggle-label");

  const formatTime = seconds => {
    if (!Number.isFinite(seconds)) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  };

  const updateTime = () => {
    if (!audio || !seek || !time) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 827.232;
    const progress = duration > 0 ? (audio.currentTime / duration) * 100 : 0;
    seek.value = String(progress);
    seek.style.setProperty("--progress", `${progress}%`);
    time.textContent = `${formatTime(audio.currentTime)} / ${formatTime(duration)}`;
  };

  const updatePlaybackState = () => {
    if (!audio || !playButton) return;
    const playing = !audio.paused && !audio.ended;
    dialog.classList.toggle("is-playing", playing);
    playButton.setAttribute("aria-pressed", String(playing));
    if (playIcon) playIcon.textContent = playing ? "Ⅱ" : "▶";
    if (playLabel) playLabel.textContent = playing ? "Pause" : "Play";
  };

  const openRoom = () => {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    document.documentElement.classList.add("listening-room-open");
  };

  const closeRoom = () => {
    audio?.pause();
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
    document.documentElement.classList.remove("listening-room-open");
  };

  openButtons.forEach(button => button.addEventListener("click", openRoom));
  closeButton?.addEventListener("click", closeRoom);

  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeRoom();
  });

  dialog.addEventListener("close", () => {
    audio?.pause();
    document.documentElement.classList.remove("listening-room-open");
  });

  playButton?.addEventListener("click", async () => {
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        if (playLabel) playLabel.textContent = "Try again";
      }
    } else {
      audio.pause();
    }
  });

  seek?.addEventListener("input", () => {
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = (Number(seek.value) / 100) * audio.duration;
    updateTime();
  });

  audio?.addEventListener("loadedmetadata", updateTime);
  audio?.addEventListener("durationchange", updateTime);
  audio?.addEventListener("timeupdate", updateTime);
  audio?.addEventListener("play", updatePlaybackState);
  audio?.addEventListener("pause", updatePlaybackState);
  audio?.addEventListener("ended", updatePlaybackState);
  audio?.addEventListener("error", () => {
    if (playLabel) playLabel.textContent = "Unavailable";
  });

  updateTime();
})();
