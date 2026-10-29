/* 07. Amenities
   Two scrubbed timelines on a sticky stage:
     1. The logo mark rises over the pinned master plan (the section is
        pulled up over its last 150vh, see .has-why-pin .amen--live), then its three towers
        straighten and widen until they fill the screen as one navy panel.
     2. The question appears and a rule draws down from it.
     3. The column keeps scrolling: question and rule leave the top, the
        heading rises from the bottom, followed by the framed water tank
        photo and caption, and settles below the nav bar.
     4. The photo opens to full bleed.
     5. 4 cards rise as a deck: Amenities cover on top, with Live, Play,
        and Relax stacked behind it. As scroll proceeds, the cover lifts
        up with a slight angle, and the three sub-category stacks deal out
        side by side.
     6. Each category card acts as a sub-cover for an interactive Shuffle Stack.
        Hovering peeks the deck layers behind; clicking moves the front
        card up, sideways, and back into the deck in a smooth loop (Framer Shuffle Stack). */
(() => {
  const section = document.getElementById('amenities');
  if (!section) return;

  const isPhone = () => window.matchMedia('(max-width: 760px)').matches;

  let isDealt = false;

  /* ---------- Shuffle Stack Interaction ---------- */
  function setupShuffleStack(stack) {
    const cards = [...stack.querySelectorAll('.icard')];
    const count = cards.length;
    if (!count) return;

    let isHovered = false;
    let isShuffling = false;

    // order[0] = index of the card currently on top
    let order = cards.map((_, i) => i);

    function getCardTransform(pos, hovered) {
      if (pos === 0 || !hovered) {
        // When not hovered, all cards sit flush directly behind the front card
        // Showing ONLY the cover card cleanly
        return { x: 0, y: 0, rotation: 0, scale: 1 };
      }
      // Only when hovered: display as an interactive stack with staggered peek offsets
      const sign = pos % 2 === 1 ? 1 : -1;
      const xOffset = sign * (12 + (pos - 1) * 8);
      const yOffset = -pos * 10;
      const rot = sign * (2.2 + (pos - 1) * 1.1);
      const sc = 1 - pos * 0.012;
      return {
        x: xOffset,
        y: yOffset,
        rotation: rot,
        scale: sc,
      };
    }

    function applyStack(animate = true) {
      order.forEach((cardIdx, pos) => {
        const card = cards[cardIdx];
        const z = count - pos;
        const t = getCardTransform(pos, isHovered);
        card.setAttribute('data-pos', String(pos));
        card.setAttribute('data-active', pos === 0 ? 'true' : 'false');

        if (!animate || !window.gsap) {
          card.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) rotate(${t.rotation}deg) scale(${t.scale})`;
          card.style.zIndex = String(z);
        } else {
          window.gsap.to(card, {
            x: t.x,
            y: t.y,
            rotation: t.rotation,
            scale: t.scale,
            zIndex: z,
            duration: 0.35,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        }
      });
    }

    // Initialize resting positions
    applyStack(false);

    // Hover peeking - strictly disabled until dealt out
    stack.addEventListener('pointerenter', () => {
      if (!isDealt || isShuffling) return;
      isHovered = true;
      applyStack(true);
    });

    stack.addEventListener('pointerleave', () => {
      if (!isDealt || isShuffling) return;
      isHovered = false;
      applyStack(true);
    });

    // Shuffle top card: lifts straight UP and goes to the back of the stack (NO sideways movement)
    function shuffle() {
      if (!isDealt || isShuffling || count <= 1) return;
      isShuffling = true;

      const topCardIdx = order[0];
      const topCard = cards[topCardIdx];

      // Card lifts straight up without any sideways movement
      const upY = isPhone() ? -95 : -130;

      if (!window.gsap) {
        order.push(order.shift());
        applyStack(false);
        isShuffling = false;
        return;
      }

      // Step 1: Card lifts straight up
      window.gsap.to(topCard, {
        y: upY,
        x: 0,
        rotation: 0,
        scale: 1.02,
        duration: 0.28,
        ease: 'power2.out',
        onComplete: () => {
          // Step 2: Cycle order so previous top card goes to the back
          order.push(order.shift());

          // Set z-index to 1 (behind the stack)
          topCard.style.zIndex = '1';
          topCard.setAttribute('data-active', 'false');

          // Step 3: Promote remaining cards forward
          order.forEach((cIdx, pos) => {
            if (pos === count - 1) return; // skip card going to the back
            const c = cards[cIdx];
            const z = count - pos;
            const t = getCardTransform(pos, isHovered);
            c.setAttribute('data-pos', String(pos));
            c.setAttribute('data-active', pos === 0 ? 'true' : 'false');
            window.gsap.to(c, {
              x: t.x,
              y: t.y,
              rotation: t.rotation,
              scale: t.scale,
              zIndex: z,
              duration: 0.35,
              ease: 'power3.out',
              overwrite: 'auto',
            });
          });

          // Step 4: Card slides straight down into the back of the deck
          const backT = getCardTransform(count - 1, isHovered);
          topCard.setAttribute('data-pos', String(count - 1));
          window.gsap.to(topCard, {
            x: backT.x,
            y: backT.y,
            rotation: backT.rotation,
            scale: backT.scale,
            duration: 0.35,
            ease: 'power3.out',
            overwrite: 'auto',
            onComplete: () => {
              isShuffling = false;
              applyStack(true);
            },
          });
        },
      });
    }

    stack.addEventListener('click', (e) => {
      e.preventDefault();
      shuffle();
    });

    stack.setAttribute('tabindex', '0');
    stack.setAttribute('role', 'button');
    stack.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        shuffle();
      }
    });
  }

  // Set up shuffle for each of the 3 stacks
  const stacks = [...section.querySelectorAll('.amen-stack')];
  stacks.forEach(setupShuffleStack);

  function setDealt(dealt) {
    if (isDealt === dealt) return;
    isDealt = dealt;
    stacks.forEach((s) => {
      s.classList.toggle('is-dealt', dealt);
      if (!dealt) {
        // Force collapse back to resting single-card look
        const cards = [...s.querySelectorAll('.icard')];
        cards.forEach((card, pos) => {
          card.setAttribute('data-pos', String(pos));
          card.setAttribute('data-active', pos === 0 ? 'true' : 'false');
          if (window.gsap) {
            window.gsap.set(card, { x: 0, y: 0, rotation: 0, scale: 1, zIndex: cards.length - pos });
          } else {
            card.style.transform = 'translate3d(0, 0, 0) rotate(0deg) scale(1)';
            card.style.zIndex = String(cards.length - pos);
          }
        });
      }
    });
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!window.gsap || !window.ScrollTrigger || reduceMotion.matches) return;
  gsap.registerPlugin(ScrollTrigger);
  section.classList.add('amen--live');

  const $ = (sel) => section.querySelector(sel);
  const shape = $('.amen__shape');
  const bldgs = section.querySelectorAll('.amen__bldg');
  const navy = $('.amen__navy');
  const q = $('.amen__q');
  const rule = $('.amen__rule');
  const head = $('.amen__head');
  const frame = $('.amen__frame');
  const copy = $('.amen__copy');
  const deck = $('.amen__deck');
  const track = $('.amen__track');
  const cover = section.querySelector('.acard--main-cover');
  const allDeckCards = [...stacks, cover]; // Live(0), Play(1), Relax(2), Cover(3)
  const vh = () => window.innerHeight;

  // Distance between dealt cards: one card width plus a little extra gap
  const step = () => stacks[0].offsetWidth + (isPhone() ? 24 : Math.max(38, Math.min(68, window.innerWidth * 0.035)));

  const NAV_CLEAR = 110; // keep the heading clear of the logo in the nav bar
  // Fit the photo so heading, photo and caption share one screen
  const fitFrame = () => {
    const room = vh() - NAV_CLEAR - head.offsetHeight - copy.offsetHeight - vh() * 0.07 - 40;
    const w = Math.max(200, Math.min(window.innerWidth * (isPhone() ? 0.88 : 0.53), 1018, room * 1018 / 558));
    frame.style.width = w + 'px';
    frame.style.height = w * 558 / 1018 + 'px';
  };
  fitFrame();
  ScrollTrigger.addEventListener('refreshInit', () => {
    gsap.set(frame, { clearProps: 'width,height,padding,y' });
    fitFrame();
  });
  // Column offset that puts the heading just under the nav bar
  const settleY = () => NAV_CLEAR - head.offsetTop;

  gsap.set(shape, { y: () => shape.offsetHeight + 40 });
  gsap.set(navy, { opacity: 0 });
  gsap.set(q, { opacity: 0, y: () => Math.min(vh() * 0.25, 120) });
  gsap.set(rule, { scaleY: 0, transformOrigin: 'top center' });

  // Initial 4-card stack: Cover on top (index 3), Relax (2), Play (1), Live (0)
  // Cards peek up and left behind the cover
  gsap.set(allDeckCards, {
    xPercent: -50,
    yPercent: -50,
    x: (i) => (i - 3) * 14,
    y: (i) => vh() + (i - 3) * 14,
    zIndex: (i) => (i === 3 ? 10 : i + 1),
    rotation: 0,
    opacity: 1,
  });

  const RISE = 1.6; // screens of scroll for step 1, overlapping the plan's pin

  // 1. Rise, then open into a full navy panel
  gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + vh() * RISE,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  })
    .to(shape, { y: () => shape.offsetHeight - vh(), duration: 1.4, ease: 'power3.out' })
    .addLabel('open')
    .to(shape, { left: '0%', width: '100%', height: '100%', y: 0, duration: 1.2 }, 'open')
    .to(bldgs[0], { left: '0%', width: '33.4%', clipPath: 'polygon(0 0%, 100% 0%, 100% 100%, 0 100%)', duration: 1.2 }, 'open')
    .to(bldgs[1], { left: '33.3%', width: '33.4%', clipPath: 'polygon(0 0%, 100% 0%, 100% 100%, 0 100%)', duration: 1.2 }, 'open')
    .to(bldgs[2], { left: '66.6%', width: '33.4%', clipPath: 'polygon(0 0%, 100% 0%, 100% 100%, 0 100%)', duration: 1.2 }, 'open')
    .to(navy, { opacity: 1, duration: 0.5, ease: 'none' }, 'open+=0.8');

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: section,
      start: () => 'top+=' + vh() * RISE + ' top',
      // Location slides up over the last screen, so finish one screen early
      end: () => 'bottom-=' + vh() + ' bottom',
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        // Effect should ONLY work once the 3 stacks have dealt out and taken their places
        const dealThreshold = tl.labels['deal'] ? (tl.labels['deal'] + 0.8) / tl.totalDuration() : 0.85;
        setDealt(self.progress >= dealThreshold);
      },
    },
  });

  // Menu "Amenities" lands once the question and its rule are in place (js/main.js reads this)
  (window.MJR_SPOTS = window.MJR_SPOTS || {}).amen = () => tl.scrollTrigger.labelToScroll('asked');

  // 2. Question slides up into place, then the rule grows down from it
  tl.to(q, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' })
    .to(rule, { scaleY: 1, duration: 1.1, ease: 'power1.inOut' }, '+=0.1')
    .addLabel('asked')

  // 3. One continuous scroll of the column and paper texture up to the heading's resting place; line moves up off the screen
    .to(track, { y: settleY, duration: 3.2, ease: 'none' }, '+=0.2')
    .to(navy, { y: settleY, duration: 3.2, ease: 'none' }, '<')
    .to(rule, { y: () => -(NAV_CLEAR + 120), duration: 1.8, ease: 'power1.in' }, '<+1.2')
    .to(q, { opacity: 0, duration: 0.6, ease: 'none' }, '<+0.4')

  // 4. Photo opens to full bleed
    .addLabel('bleed', '+=0.6')
    .to([head, copy], { opacity: 0, duration: 0.4, ease: 'none' }, 'bleed')
    .to(frame, {
      width: () => window.innerWidth,
      height: vh,
      padding: 0,
      y: () => -(settleY() + frame.offsetTop),
      duration: 1.3,
    }, 'bleed')

  // 5. 4-card deck rises with Amenities cover on top
    .addLabel('deck', '+=0.3')
    .to(allDeckCards, {
      y: (i) => (i - 3) * 14,
      duration: 1.3,
      ease: 'power3.out',
      stagger: 0.06,
    }, 'deck')

  // 6. Cover lifts up with angle/tilt off-screen, NO fading; the 3 category stacks deal out side by side
    .addLabel('deal', '+=0.4')
    .to(cover, {
      y: () => -vh() * 1.5,
      rotation: -9,
      duration: 1.3,
      ease: 'power3.inOut',
    }, 'deal')
    .to(stacks, {
      x: (i) => (i - 1) * step(),
      y: 0,
      rotation: 0,
      duration: 1.3,
      ease: 'power3.inOut',
    }, 'deal');

  if (isPhone()) {
    // Only one card fits: pan the dealt row from Live across to Relax
    tl.to(deck, { x: () => step(), duration: 1.3, ease: 'power3.inOut' }, 'deal')
      .to(deck, { x: () => -step(), duration: 2.4, ease: 'none' }, '+=0.3')
      .to({}, { duration: 0.4 });
  } else {
    tl.to({}, { duration: 1 });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
