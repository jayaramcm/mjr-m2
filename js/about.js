/* 12. About: the team behind the foundation
   Pinned, scrubbed by scroll:
      - once the stage is in place, the title fades in at the centre, scaling
        from 80% to 100% out of a soft blur
      - the title moves to the top as the first outline sketch slides up into the
        centre and the paper texture fades in under it
      - the first line appears below the sketch as it turns to the second sketch
        (about 6 degrees anticlockwise); the bolder second line follows with the
        third sketch (about 6 degrees more)
      - soft navy ink bleeds open from random spots; everything on the sketch
        screen fades with it, and the marble pillars are revealed through the ink
        itself, so they arrive as part of the navy screen
      - the question rises once the ink has filled the screen; the answer slides
        up with the next scroll
      - they clear while Since 2012 grows into the centre and the pillars
        zoom in and lift, so only their shafts frame the words
      - Since 2012 shrinks and fades, then each fact takes the centre in turn in the
        same style: 12+ years of experience, 9 projects delivered, 1,200+ families served */
(() => {
  const section = document.getElementById('about');
  if (!section) return;

  const stage = section.querySelector('.about__stage');
  const paper = section.querySelector('.about__paper');
  const canvas = section.querySelector('.about__ink');
  const pillars = [...section.querySelectorAll('.about__pillar')];
  const head = section.querySelector('.about__head');
  const title = section.querySelector('.about__title');
  const sketch = section.querySelector('.about__sketch');
  const sketches = [...sketch.querySelectorAll('img')];
  const linesBox = section.querySelector('.about__lines');
  const lines = [...linesBox.querySelectorAll('.about__line')];
  const since = section.querySelector('.about__since');
  const facts = [...section.querySelectorAll('.about__facts li')];
  const factsList = section.querySelector('.about__facts');
  const question = section.querySelector('.about__question');
  const answer = section.querySelector('.about__answer');
  const env = section.querySelector('.letter__env');
  const flap = section.querySelector('.letter__flap');
  const letter = section.querySelector('.letter__paper');

  const NAVY = '#1d2856';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Static fallback: title, final sketch and lines, then the facts, in normal flow
  if (!window.gsap || !window.ScrollTrigger || reduceMotion) {
    stage.style.height = 'auto';
    stage.style.padding = '6rem 1.5rem';
    stage.style.textAlign = 'center';
    [head, sketch, linesBox, question, answer, since, factsList].forEach((el) => {
      el.style.position = 'relative';
      el.style.left = el.style.top = 'auto';
      el.style.margin = '0 auto 2.5rem';
    });
    sketches[2].style.opacity = '1';
    lines.forEach((l) => { l.style.opacity = '1'; });
    [question, answer].forEach((el) => { el.style.opacity = '1'; el.style.color = NAVY; el.style.textAlign = 'center'; });
    since.style.opacity = '1';
    since.style.color = NAVY;
    factsList.style.position = 'relative';
    env.style.display = 'none';
    facts.forEach((li) => { li.style.position = 'static'; li.style.width = 'auto'; li.style.opacity = '1'; li.style.color = NAVY; li.style.marginBottom = '1rem'; });
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // ---- Ink: soft watercolour blots that bleed open from random spots ----
  // The canvas is drawn at a quarter of the screen size and stretched by CSS,
  // which, with a light blur, gives the blots their soft, feathered edges.
  // Each blot has a ragged outline and a pale halo that spreads just ahead of it.
  const ctx = canvas.getContext('2d');
  const INK_SCALE = 0.25;
  const POINTS = 48; // outline points per blot
  let spots = [];
  let inkProgress = 0;

  // Seeded random so the pattern is the same on every visit and resize
  const seeded = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const buildSpots = () => {
    const rand = seeded(20120);
    const w = canvas.width;
    const h = canvas.height;
    const reach = Math.hypot(w, h);
    spots = [];
    for (let k = 0; k < 16; k++) {
      // Smoothed random wobble around the outline, so edges look torn, not round
      const raw = Array.from({ length: POINTS }, () => rand());
      const wobble = raw.map((v, i) => (v + raw[(i + 1) % POINTS] + raw[(i + POINTS - 1) % POINTS]) / 3);
      spots.push({
        x: (0.08 + rand() * 0.84) * w,
        y: (0.08 + rand() * 0.84) * h,
        start: rand() * 0.6, // when this blot begins, as a share of the ink phase
        size: reach * (0.22 + rand() * 0.2),
        wobble,
      });
    }
  };

  const blot = (s, r) => {
    ctx.beginPath();
    for (let i = 0; i <= POINTS; i++) {
      const a = (i / POINTS) * Math.PI * 2;
      const rr = r * (0.82 + s.wobble[i % POINTS] * 0.36);
      const px = s.x + Math.cos(a) * rr;
      const py = s.y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.fill();
  };

  // The pillars belong to the navy screen: they show only where the ink has
  // spread, by using the ink canvas as their mask while it bleeds open
  const pillarLayer = section.querySelector('.about__pillars');
  const setPillarMask = (value) => {
    pillarLayer.style.webkitMaskImage = value;
    pillarLayer.style.maskImage = value;
  };

  const drawInk = () => {
    paintInk();
    // once the ink has mostly covered the screen the nav reads it as navy
    canvas.dataset.nav = inkProgress > 0.6 ? 'navy' : '';
    if (inkProgress <= 0) {
      pillarLayer.style.visibility = 'hidden';
    } else if (inkProgress >= 1) {
      pillarLayer.style.visibility = 'visible';
      setPillarMask('none');
    } else {
      pillarLayer.style.visibility = 'visible';
      setPillarMask('url(' + canvas.toDataURL() + ')');
    }
  };

  const paintInk = () => {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (inkProgress <= 0) return;
    ctx.fillStyle = NAVY;
    if (inkProgress >= 1) {
      ctx.fillRect(0, 0, w, h);
      return;
    }
    ctx.filter = 'blur(' + Math.max(2, w * 0.006) + 'px)';
    spots.forEach((s) => {
      const local = Math.max(0, (inkProgress - s.start) / (1 - s.start));
      if (local <= 0) return;
      const r = s.size * (1 - Math.pow(1 - local, 2.4)); // fast bloom, slow spread
      ctx.globalAlpha = 0.35; // pale wash bleeding ahead of the blot
      blot(s, r * 1.18);
      ctx.globalAlpha = 1;
      blot(s, r);
    });
    ctx.filter = 'none';
    // Final flood so the last gaps close smoothly
    if (inkProgress > 0.82) {
      ctx.globalAlpha = (inkProgress - 0.82) / 0.18;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  };

  const sizeCanvas = () => {
    canvas.width = Math.max(1, Math.round(stage.clientWidth * INK_SCALE));
    canvas.height = Math.max(1, Math.round(stage.clientHeight * INK_SCALE));
    buildSpots();
    drawInk();
  };
  sizeCanvas();
  ScrollTrigger.addEventListener('refreshInit', sizeCanvas);

  const ink = { p: 0 };

  // Title's resting place: a little below the nav bar
  const NAV_CLEAR = 132;
  const titleTopY = () => NAV_CLEAR + head.offsetHeight / 2 - vh() / 2;
  const vh = () => window.innerHeight;

  // ---- Initial states (all centring is done here, not in CSS) ----
  gsap.set(pillars[0], { xPercent: -50 });
  gsap.set(pillars[1], { xPercent: 50 });
  gsap.set(pillars, { opacity: 1 }); // their layer is masked by the ink instead
  gsap.set(head, { xPercent: -50, yPercent: -50 });
  gsap.set(sketch, { xPercent: -50, yPercent: -50, y: () => vh() * 0.75, rotation: 0 });
  gsap.set(sketches[0], { opacity: 1 });
  gsap.set(linesBox, { xPercent: -50 });
  gsap.set(lines, { opacity: 0, y: 24 });
  gsap.set(since, { xPercent: -50, yPercent: -50, y: () => vh() * 0.3, scale: 0.7, opacity: 0 });
  // Facts enter from slightly larger and settle down to size as they fade in
  gsap.set(facts, { xPercent: -50, yPercent: -50, opacity: 0, scale: 1.2 });
  // Envelope waits below the screen with its flap folded shut and the letter inside
  gsap.set(env, { y: () => vh() * 0.4 });
  gsap.set(flap, { rotationX: -180 });
  gsap.set(letter, { yPercent: 101 });

  gsap.set(title, { opacity: 0, scale: 0.8, filter: 'blur(14px)' });
  gsap.set([question, answer], { opacity: 0, y: () => vh() * 0.12 });

  // 2. Pinned sequence
  let built = false;
  // Menu "About MJR" lands on the full title (js/main.js reads this)
  (window.MJR_SPOTS = window.MJR_SPOTS || {}).about = () => tl.scrollTrigger.labelToScroll('titled');

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: stage,
      start: 'top top',
      // the final screen of scroll is the letter leaving, which FAQ slides up over
      end: () => '+=' + (built ? vh() * tl.duration() / (tl.duration() - tl.labels.leave) : vh() * 14.5),
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  })
    // Title fades in at the centre, 80% to 100% out of a blur, once the stage is in place
    .to(title, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power2.out' })
    .addLabel('titled', '-=0.15')
    .to({}, { duration: 0.3 })

    // Title to the top; first sketch slides up into the centre; paper fades in
    .addLabel('sketch')
    .to(head, { y: titleTopY, duration: 1.2 }, 'sketch')
    // The sketch follows a beat later, so it never runs into the title on the way up
    .to(sketch, { y: 0, duration: 1.2, ease: 'power3.out' }, 'sketch+=0.55')
    .to(paper, { opacity: 0.7, duration: 1.2, ease: 'none' }, 'sketch')
    .to({}, { duration: 0.25 })

    // First line; sketch 1 turns into sketch 2
    .addLabel('l1')
    .to(lines[0], { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 'l1')
    .to(sketch, { rotation: -6, duration: 0.9 }, 'l1')
    .to(sketches[0], { opacity: 0, duration: 0.9 }, 'l1')
    .to(sketches[1], { opacity: 1, duration: 0.9 }, 'l1')
    .to({}, { duration: 0.25 })

    // Bolder second line; sketch 2 turns into sketch 3
    .addLabel('l2')
    .to(lines[1], { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 'l2')
    .to(sketch, { rotation: -12, duration: 0.9 }, 'l2')
    .to(sketches[1], { opacity: 0, duration: 0.9 }, 'l2')
    .to(sketches[2], { opacity: 1, duration: 0.9 }, 'l2')
    .to({}, { duration: 0.4 })

    // Ink bleeds open; everything on the sketch screen fades away with it,
    // so the navy screen starts fresh
    .addLabel('ink')
    .to(ink, { p: 1, duration: 1.8, ease: 'power1.in', onUpdate: () => { inkProgress = ink.p; drawInk(); } }, 'ink')
    .to([head, sketch, linesBox, paper], { opacity: 0, duration: 0.9 }, 'ink+=0.4')

    // The question rises as soon as the ink has filled the screen
    .to(question, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
    .to({}, { duration: 0.4 })
    // With the next scroll, the answer slides up
    .to(answer, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
    .to({}, { duration: 0.6 })

    // Question and answer clear; Since 2012 grows into the centre; pillars zoom and lift
    .addLabel('rise')
    .to([question, answer], { opacity: 0, y: () => -vh() * 0.08, duration: 0.7, ease: 'power2.in' }, 'rise')
    .to(since, { y: 0, scale: 1, opacity: 1, duration: 1.4 }, 'rise+=0.3')
    .to(pillars, { scale: 1.5, y: () => -vh() * 0.38, duration: 1.4 }, 'rise+=0.3')
    .to({}, { duration: 0.5 })

    // Since 2012 shrinks and fades, then each fact takes its place in turn:
    // fades and scales in, holds, then shrinks and fades for the next
    .to(since, { scale: 0.85, opacity: 0, duration: 0.7, ease: 'power2.in' });

  facts.forEach((fact, k) => {
    // The pillars lift a step as the previous line fades out, then the fact
    // comes in once that fade is done; they stay put for the letter
    tl.to(pillars, { y: () => -vh() * (0.38 + 0.12 * (k + 1)), duration: 0.9 }, '<')
      .to(fact, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, '<0.7')
      .to({}, { duration: 0.5 })
      .to(fact, { scale: 0.85, opacity: 0, duration: 0.7, ease: 'power2.in' });
  });

  // illoca's 'joe.out' ease: cubic-bezier(0.2, 0, 0.1, 1)
  const joeOut = (p) => {
    let lo = 0, hi = 1, u = p;
    for (let i = 0; i < 24; i++) {
      u = (lo + hi) / 2;
      const x = 3 * (1 - u) * (1 - u) * u * 0.2 + 3 * (1 - u) * u * u * 0.1 + u * u * u;
      if (x < p) lo = u; else hi = u;
    }
    return 3 * (1 - u) * u * u + u * u * u;
  };

  // The envelope rises in, the flap swings open on its hinge, then the letter
  // slides up out of the mouth
  tl.to(env, { y: 0, duration: 0.9, ease: 'power3.out' })
    .addLabel('open')
    .to(flap, {
      rotationX: 0, duration: 1.4, ease: joeOut,
      // in front of the envelope while folded shut, behind the letter once upright
      onUpdate: () => { flap.style.zIndex = gsap.getProperty(flap, 'rotationX') < -90 ? 3 : 0; }
    }, 'open')
    .to(letter, { yPercent: 1, duration: 1.4, ease: joeOut }, 'open+=0.25')
    .to({}, { duration: 0.8 })
    // The letter lifts off the top of the screen at a -10 degree tilt as the envelope drops away
    .addLabel('leave')
    .to(letter, { yPercent: -340, rotation: -10, duration: 1.4, ease: 'power2.in' }, 'leave')
    .to(env, { y: () => vh() * 0.5, duration: 1.4, ease: 'power2.in' }, 'leave+=0.2')
    .to({}, { duration: 0.6 });

  built = true;
  ScrollTrigger.refresh();
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
