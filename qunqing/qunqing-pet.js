(() => {
  const dock = document.querySelector('.jelly-dock');
  const friend = document.getElementById('jelly-friend');
  const canvas = document.getElementById('jelly-sprite');
  const card = document.getElementById('jelly-card');
  const message = document.getElementById('jelly-message');
  if (!dock || !friend || !canvas || !card || !message) return;

  const context = canvas.getContext('2d');
  if (!context) return;
  const sprite = new Image();
  sprite.src = 'assets/pets/guodong.png';
  const cellWidth = 192;
  const cellHeight = 208;
  const idleFrames = 6;
  const idleDurations = [280, 110, 110, 140, 140, 320];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lookDirection = null;
  let drag = null;
  let movedDuringPress = false;
  let suppressClickUntil = 0;
  let roamTimer = 0;
  let roamEndTimer = 0;
  let pose = makePose(0, idleFrames, false, idleDurations);

  function makePose(row, frames, once, durations) {
    return { row, frame: 0, frames, once, durations, updatedAt: performance.now() };
  }

  function paint() {
    if (!sprite.complete || !sprite.naturalWidth) return;
    const isIdle = !pose.once && pose.row === 0 && lookDirection !== null;
    const row = isIdle ? 9 + Math.floor(lookDirection / 8) : pose.row;
    const frame = isIdle ? lookDirection % 8 : pose.frame;
    context.clearRect(0, 0, cellWidth, cellHeight);
    context.drawImage(
      sprite,
      frame * cellWidth, row * cellHeight, cellWidth, cellHeight,
      0, 0, cellWidth, cellHeight
    );
  }

  function idle() {
    pose = makePose(0, idleFrames, false, idleDurations);
    paint();
  }

  function playOnce(row, frames) {
    const durations = Array(frames).fill(140);
    durations[frames - 1] = 280;
    pose = makePose(row, frames, true, durations);
    paint();
    if (motion.matches) {
      pose.frame = frames - 1;
      paint();
      window.setTimeout(idle, 700);
    }
  }

  function run(direction) {
    const row = direction >= 0 ? 1 : 2;
    const durations = Array(8).fill(120);
    durations[7] = 220;
    if (pose.row !== row || pose.once) pose = makePose(row, 8, false, durations);
    paint();
  }

  function animate(now) {
    if (motion.matches) return;
    if (document.visibilityState === 'visible') {
      const duration = pose.durations[pose.frame] ?? 140;
      if (now - pose.updatedAt >= duration) {
        pose.updatedAt = now;
        if (pose.once) {
          if (pose.frame < pose.frames - 1) pose.frame += 1;
          else idle();
        } else pose.frame = (pose.frame + 1) % pose.frames;
        paint();
      }
    }
    requestAnimationFrame(animate);
  }

  function setOpen(open) {
    card.hidden = !open;
    friend.setAttribute('aria-expanded', String(open));
    if (open) {
      const bounds = dock.getBoundingClientRect();
      dock.dataset.cardSide = bounds.top < 180 ? 'below' : 'above';
      dock.dataset.cardAlign = bounds.right > window.innerWidth - 325 ? 'right' : 'left';
    } else {
      delete dock.dataset.cardSide;
      delete dock.dataset.cardAlign;
    }
  }

  function followPointer(x, y) {
    const bounds = canvas.getBoundingClientRect();
    const eyeX = bounds.left + bounds.width * 0.5;
    const eyeY = bounds.top + bounds.height * 0.34;
    const dx = x - eyeX;
    const dy = y - eyeY;
    if (Math.hypot(dx, dy) < 20) lookDirection = null;
    else {
      const degrees = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
      lookDirection = Math.round(degrees / 22.5) % 16;
    }
    if (!pose.once && pose.row === 0) paint();
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  function stopRoaming() {
    window.clearTimeout(roamEndTimer);
    if (dock.classList.contains('is-roaming')) {
      const bounds = dock.getBoundingClientRect();
      dock.style.left = `${bounds.left}px`;
      dock.style.top = `${bounds.top}px`;
      dock.style.right = 'auto';
      dock.style.bottom = 'auto';
    }
    dock.classList.remove('is-roaming');
  }

  function resetHome() {
    window.clearTimeout(roamTimer);
    stopRoaming();
    dock.classList.remove('is-dragging');
    dock.style.left = '';
    dock.style.right = '';
    dock.style.top = '';
    dock.style.bottom = '';
    idle();
    scheduleRoam();
  }

  function scheduleRoam(delay = 22000 + Math.random() * 22000) {
    window.clearTimeout(roamTimer);
    if (motion.matches) return;
    roamTimer = window.setTimeout(() => {
      const blocked = document.visibilityState !== 'visible' || !card.hidden || drag || dock.matches(':hover');
      if (blocked) return scheduleRoam(12000 + Math.random() * 14000);

      const bounds = dock.getBoundingClientRect();
      const minX = 8;
      const keepClearOfMusic = Math.min(220, Math.max(0, window.innerWidth * 0.3));
      const maxX = window.innerWidth - bounds.width - keepClearOfMusic;
      const currentX = bounds.left;
      if (maxX - minX < 65) return scheduleRoam();

      let direction = Math.random() < 0.5 ? -1 : 1;
      if (currentX < minX + 45) direction = 1;
      if (currentX > maxX - 45) direction = -1;
      const distance = 75 + Math.random() * 90;
      const targetX = clamp(currentX + direction * distance, minX, maxX);
      if (Math.abs(targetX - currentX) < 48) return scheduleRoam();

      dock.style.left = `${currentX}px`;
      dock.style.right = 'auto';
      dock.style.top = `${bounds.top}px`;
      dock.style.bottom = 'auto';
      run(targetX > currentX ? 1 : -1);
      dock.classList.add('is-roaming');
      requestAnimationFrame(() => { dock.style.left = `${targetX}px`; });
      roamEndTimer = window.setTimeout(() => {
        stopRoaming();
        idle();
        scheduleRoam();
      }, 1050);
    }, delay);
  }

  sprite.addEventListener('load', () => {
    paint();
    if (!motion.matches) requestAnimationFrame(animate);
    scheduleRoam();
  }, { once: true });
  sprite.addEventListener('error', () => {
    message.textContent = '我今天躲进照片里啦，刷新一下我们再见。';
  }, { once: true });

  friend.addEventListener('click', (event) => {
    if (movedDuringPress || performance.now() < suppressClickUntil) {
      event.preventDefault();
      movedDuringPress = false;
      return;
    }
    const open = card.hidden;
    setOpen(open);
    if (open) {
      message.textContent = '嗨，我是果冻。要不要一起去地图上看看？';
      playOnce(3, 4);
    }
  });

  friend.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    stopRoaming();
    const bounds = dock.getBoundingClientRect();
    dock.style.left = `${bounds.left}px`;
    dock.style.top = `${bounds.top}px`;
    dock.style.right = 'auto';
    dock.style.bottom = 'auto';
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      active: false
    };
    movedDuringPress = false;
    friend.setPointerCapture?.(event.pointerId);
  });

  friend.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    followPointer(event.clientX, event.clientY);
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.active && distance > 7) {
      drag.active = true;
      movedDuringPress = true;
      setOpen(false);
      dock.classList.add('is-dragging');
      run(event.clientX >= drag.startX ? 1 : -1);
    }
    if (!drag.active) return;

    const bounds = dock.getBoundingClientRect();
    const maxLeft = window.innerWidth - bounds.width - 5;
    const maxTop = window.innerHeight - bounds.height - 5;
    dock.style.left = `${clamp(event.clientX - drag.offsetX, 5, maxLeft)}px`;
    dock.style.top = `${clamp(event.clientY - drag.offsetY, 5, maxTop)}px`;
    const dx = event.clientX - drag.lastX;
    if (Math.abs(dx) > 2) run(dx > 0 ? 1 : -1);
    drag.lastX = event.clientX;
  });

  function finishDrag(event) {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    const wasDragging = drag.active;
    drag = null;
    if (wasDragging) {
      dock.classList.remove('is-dragging');
      idle();
      suppressClickUntil = performance.now() + 350;
      window.setTimeout(() => { movedDuringPress = false; }, 500);
    }
    scheduleRoam();
  }
  friend.addEventListener('pointerup', finishDrag);
  friend.addEventListener('pointercancel', finishDrag);

  document.getElementById('jelly-close')?.addEventListener('click', () => {
    setOpen(false);
    friend.focus();
  });
  document.getElementById('jelly-wave')?.addEventListener('click', () => {
    message.textContent = '呼噜呼噜——这段旅程想从哪里开始回忆？';
    playOnce(3, 4);
  });
  document.getElementById('jelly-jump')?.addEventListener('click', () => {
    message.textContent = '出发！点地图上的小脚印，看看我们去过的地方。';
    playOnce(4, 5);
  });
  document.getElementById('jelly-home')?.addEventListener('click', () => {
    resetHome();
    message.textContent = '回到熟悉的小角落啦。你一动鼠标，我就会看过去。';
  });
  document.getElementById('jelly-map')?.addEventListener('click', () => setOpen(false));
  document.addEventListener('pointermove', (event) => {
    if (!drag) followPointer(event.clientX, event.clientY);
  }, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !card.hidden) setOpen(false);
  });
  window.addEventListener('resize', () => {
    if (dock.style.top) {
      const bounds = dock.getBoundingClientRect();
      dock.style.left = `${clamp(bounds.left, 5, window.innerWidth - bounds.width - 5)}px`;
      dock.style.top = `${clamp(bounds.top, 5, window.innerHeight - bounds.height - 5)}px`;
    }
    if (!card.hidden) setOpen(true);
  });

  motion.addEventListener?.('change', () => {
    if (motion.matches) {
      window.clearTimeout(roamTimer);
      stopRoaming();
      idle();
    } else {
      requestAnimationFrame(animate);
      scheduleRoam();
    }
  });
})();
