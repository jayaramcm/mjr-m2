/* 04. Location: Connectivity
   1. Title lines slide up, then the description and tagline follow.
   2. The video stage pins for four chapters. In each, one scroll scrubs that
      video from first to last frame, easing in and out so the middle rushes by,
      then its card rises in. The next chapter swaps to the next video at its
      first frame while the previous card slides out to the left. */
(() => {
  const section = document.getElementById('location');
  if (!section) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stage = section.querySelector('.conn__stage');
  const videos = [...section.querySelectorAll('.conn__video')];
  const cards = [...section.querySelectorAll('.conn__card')];
  const N = videos.length;

  if (!window.gsap || !window.ScrollTrigger || reduceMotion.matches) {
    // Static fallback: first video's last frame with its card
    const v = videos[0];
    const end = () => { if (v.duration) v.currentTime = v.duration; };
    v.addEventListener('loadedmetadata', end, { once: true });
    end();
    cards[0].style.opacity = '1';
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // 1. Header reveal
  const reveal = { trigger: section.querySelector('.conn__header'), start: 'top 75%', toggleActions: 'play none none reverse' };
  gsap.timeline({ scrollTrigger: reveal })
    .from(section.querySelectorAll('.conn__line > span'), { yPercent: 110, duration: 1.1, stagger: 0.15, ease: 'power3.out' })
    .from(section.querySelector('.conn__lead'), { y: 30, opacity: 0, duration: 0.9, ease: 'power2.out' }, '-=0.5')
    .from(section.querySelector('.conn__tagline'), { y: 30, opacity: 0, duration: 0.9, ease: 'power2.out' }, '-=0.6');

  // 2. Scroll-scrubbed videos: slow at both ends, fast through the middle
  const SCREENS = 1.4; // scroll length of one chapter, in screens
  const PLAY = 0.75; // share of a chapter spent on the video; the rest brings in the card
  const ease = gsap.parseEase('power3.inOut');

  // One seeker per video, so a slow seek never blocks the next target
  const seekers = videos.map((video) => {
    const s = { target: 0, busy: false };
    s.go = () => {
      if (!video.duration) return;
      const t = ease(s.target) * (video.duration - 0.05);
      if (s.busy || Math.abs(video.currentTime - t) < 0.01) return;
      s.busy = true;
      video.currentTime = t;
    };
    video.addEventListener('seeked', () => { s.busy = false; s.go(); });
    video.addEventListener('loadedmetadata', s.go);
    return s;
  });

  let active = 0;
  gsap.set(cards, { y: 60 });

  // 3. Outro after the last card: hold, the scene slides left to a strip as the
  //    RERA panel follows in at the same speed, then the folder rolls into view
  const scene = section.querySelector('.conn__scene');
  const rera = section.querySelector('.conn__rera');
  const folder = section.querySelector('.conn__folder');
  const reraCopy = section.querySelector('.conn__rera-copy');
  // Outro timing, in screens of scroll after the last chapter
  const HOLD = 0.6; // last frame and its card stay put
  const SLIDE = 1; // scene slides left as the panel slides in
  const ROLL = 0.9; // folder rolls in, starting just before the slide ends
  const ROLL_AT = HOLD + SLIDE - 0.2;
  const EXIT_AT = ROLL_AT + ROLL + 0.3; // short hold on the finished panel first
  const EXIT = 0.75; // strip and text slide out left, the folder out right, leaving cream
  const OUTRO = EXIT_AT + EXIT;
  const slideEase = gsap.parseEase('power2.inOut');
  const rollEase = gsap.parseEase('power3.out');

  // Scene and panel are set from one shared value every frame, so they always
  // move together and scrolling back simply runs the same maths in reverse
  const renderOutro = (t) => {
    const w = rera.offsetWidth; // the panel's width is exactly how far the scene moves
    const s = slideEase(gsap.utils.clamp(0, 1, (t - HOLD) / SLIDE));
    const out = slideEase(gsap.utils.clamp(0, 1, (t - EXIT_AT) / EXIT)) * window.innerWidth;
    gsap.set(scene, { x: -w * s - out });
    gsap.set(rera, { x: w * (1 - s) });
    gsap.set(reraCopy, { x: -out });
    const r = rollEase(gsap.utils.clamp(0, 1, (t - ROLL_AT) / ROLL));
    gsap.set(folder, { opacity: 1, x: window.innerWidth * 0.45 * (1 - r) + out, rotation: 38 + (-15 - 38) * r });
  };
  renderOutro(0);

  ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: () => '+=' + window.innerHeight * (SCREENS * N + OUTRO),
    pin: true,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const total = SCREENS * N + OUTRO;
      const done = self.progress * total;
      renderOutro(Math.max(0, done - SCREENS * N));
      const pos = Math.min(done / SCREENS, N - 0.0001);
      const i = Math.floor(pos);
      const local = pos - i;

      if (i !== active) {
        videos[active].style.visibility = 'hidden';
        active = i;
      }
      // Earlier videos rest on their last frame, later ones on their first
      seekers.forEach((s, k) => {
        if (k < i) { s.target = 1; s.go(); }
        else if (k > i) { s.target = 0; s.go(); }
      });

      const video = videos[i];
      video.style.visibility = 'visible';
      const p = Math.min(1, local / PLAY);
      seekers[i].target = p;
      seekers[i].go();
      // Current card rises in at the end of its video; the previous card rides
      // out to the left on the same eased curve as the next video's playback
      const c = Math.max(0, (local - PLAY) / (1 - PLAY));
      const out = ease(Math.min(1, p / 0.8)); // same curve as the video, done by 80% of it
      cards.forEach((card, k) => {
        if (k === i) gsap.set(card, { opacity: c, x: 0, y: 60 * (1 - c) });
        else if (k === i - 1) gsap.set(card, { opacity: 1, y: 0, x: -(card.offsetLeft + card.offsetWidth + 40) * out });
        else gsap.set(card, { opacity: 0, x: 0, y: 60 });
      });
    },
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
