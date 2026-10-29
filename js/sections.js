/* 12-15. About, FAQ, Enquiry, Closing and Footer
   1. [data-rise] elements slide up as they enter the viewport, staggered
      within each group.
   2. About stats count up once.
   3. FAQ: one answer open at a time, with a smooth height animation.
   4. Enquiry form: validation and an on-screen thank-you.
   5. Closing photo drifts slowly behind the line as it scrolls past. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Rise-in reveal
  const risers = [...document.querySelectorAll('[data-rise]')];
  if (!reduceMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-rise');
    // Stagger siblings that share a parent
    const groups = new Map();
    risers.forEach((el) => {
      const list = groups.get(el.parentElement) || [];
      list.push(el);
      groups.set(el.parentElement, list);
    });
    groups.forEach((list) => list.forEach((el, i) => el.style.setProperty('--rd', (i * 0.09).toFixed(2) + 's')));

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    risers.forEach((el) => io.observe(el));
  }

  // 2. Stats count up
  const counters = [...document.querySelectorAll('[data-count]')];
  const format = (n, plain) => (plain ? String(n) : n.toLocaleString('en-IN'));
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const countIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countIo.unobserve(entry.target);
        const el = entry.target;
        const to = Number(el.dataset.count);
        const plain = 'plain' in el.dataset;
        const from = plain ? to - 14 : 0;
        const start = performance.now();
        const DURATION = 1600;
        const tick = (now) => {
          const t = Math.min(1, (now - start) / DURATION);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = format(Math.round(from + (to - from) * eased), plain);
          if (t < 1) requestAnimationFrame(tick);
        };
        el.textContent = format(from, plain);
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => countIo.observe(el));
  }

  // 3. FAQ strips: clicking a strip flips it between its question (Q tile on
  //    the left) and its answer (A tile on the right); opening one closes any
  //    other. The first starts on its answer as a hint that strips can be clicked.
  const qaItems = [...document.querySelectorAll('.qa')];
  qaItems.forEach((item) => {
    item.querySelector('.qa__row').addEventListener('click', () => {
      const opening = !item.classList.contains('is-open');
      qaItems.forEach((other) => {
        const open = other === item && opening;
        other.classList.toggle('is-open', open);
        other.querySelector('.qa__row').setAttribute('aria-expanded', String(open));
      });
    });
  });

  // FAQ stack: the section pins with the strips that fit, plus a sliver of the
  // next as a cue. After a short hold, each scroll plays one whole step: the
  // strips below slide up so the next lands on the stack, leaving the top 5% of
  // the one beneath showing, until the last strip is in view. The title shrinks
  // a little during the first step only.
  const faq = document.querySelector('.faq');
  if (faq && window.gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);
    const title = faq.querySelector('.faq__title');
    const win = faq.querySelector('.faq__window');
    const strips = [...faq.querySelectorAll('.qa')];
    const PEEK = 0.045; // share of the screen the next strip shows
    const EDGE = 0.05;  // share of each stacked strip left showing
    const lead = () => window.innerHeight * 0.4;  // hold before the first step
    const stepLen = () => window.innerHeight * 0.35;
    let pitch = 0, shift = 0, hidden = 0;

    const measure = () => {
      gsap.set(strips, { y: 0 });
      gsap.set(title, { scale: 1 });
      win.style.height = '';
      pitch = strips.length > 1 ? strips[1].offsetTop - strips[0].offsetTop : 0;
      shift = pitch - strips[0].offsetHeight * EDGE;
      const room = window.innerHeight - win.getBoundingClientRect().top + faq.getBoundingClientRect().top;
      const peek = window.innerHeight * PEEK;
      const fit = Math.max(1, Math.floor((room - peek) / pitch));
      const winH = fit * pitch + peek;
      const need = strips.length * pitch - (pitch - strips[0].offsetHeight) - winH;
      hidden = need > 0 ? Math.min(strips.length - 1, Math.ceil(need / shift)) : 0;
      win.style.height = hidden ? winH + 'px' : '';
    };

    const render = (s) => {
      strips.forEach((strip, i) => gsap.set(strip, { y: -shift * Math.min(i, s) }));
      gsap.set(title, { scale: 1 - 0.12 * Math.min(1, s) });
    };

    // Steps play as whole animations rather than following the scrollbar
    const state = { s: 0 };
    let step = 0;
    const goTo = (target) => {
      target = Math.max(0, Math.min(hidden, target));
      if (target === step) return;
      step = target;
      gsap.to(state, { s: step, duration: 0.7, ease: 'power3.out', overwrite: true, onUpdate: () => render(state.s) });
    };
    const stepAt = (self) => (self.scroll() - self.start - lead()) / stepLen();

    measure();
    ScrollTrigger.create({
      trigger: faq,
      start: 'top top',
      end: () => '+=' + (lead() + Math.max(1, hidden) * stepLen()),
      pin: true,
      invalidateOnRefresh: true,
      onRefreshInit: () => { measure(); state.s = step = 0; },
      onRefresh: (self) => { step = Math.max(0, Math.min(hidden, Math.ceil(stepAt(self) - 0.02))); state.s = step; render(step); },
      onUpdate: (self) => {
        const f = stepAt(self);
        goTo(self.direction > 0 ? Math.ceil(f - 0.02) : Math.floor(f + 0.02));
      }
    });
  }

  // 4. Enquiry form
  const form = document.getElementById('leadForm');
  if (form) {
    const name = document.getElementById('ldName');
    const phone = document.getElementById('ldPhone');
    phone.addEventListener('input', () => { phone.value = phone.value.replace(/\D/g, '').slice(0, 10); });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const checks = [
        [name, document.getElementById('ldNameErr'), name.value.trim().length >= 2],
        [phone, document.getElementById('ldPhoneErr'), /^[6-9]\d{9}$/.test(phone.value)],
      ];
      let firstBad = null;
      checks.forEach(([input, err, ok]) => {
        input.setAttribute('aria-invalid', String(!ok));
        err.hidden = ok;
        if (!ok && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); return; }

      const submit = document.getElementById('leadSubmit');
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = 'Sending...';
      // TODO: connect to the MJR sales CRM / lead endpoint. Until then the request is only acknowledged on screen.
      // the form stays in place: the button confirms, then resets
      setTimeout(() => {
        form.reset();
        submit.removeAttribute('aria-busy');
        submit.textContent = 'Thank you, we will call you';
        setTimeout(() => { submit.textContent = 'Get in touch'; }, 4000);
      }, 700);
    });
  }

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
