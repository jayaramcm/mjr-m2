// MJR Township: page behaviour (scroll motion, dialogs, lead forms, master plan, shortlist)

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const PHONE_DISPLAY = '+91 90100 55596';
const field = (form, name) => form.elements.namedItem(name);
const wa = (msg) => `https://wa.me/919010055596?text=${encodeURIComponent(msg)}`;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = matchMedia('(min-width: 768px)');
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: nothing to keep */ } },
};

/* ---------- Smooth scroll (Lenis), off for reduced motion ---------- */
const lenis = !reduceMotion && window.Lenis ? new Lenis({ prevent: (node) => !!node.closest?.('dialog') }) : null;
if (lenis) {
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    const target = a && a.getAttribute('href').length > 1 && $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    // A menu link: restart Lenis now, or its later start() would reset (cancel) this scroll
    a.closest('dialog')?.close();
    if (!$('dialog[open]')) lenis.start();
    lenis.scrollTo(target, { offset: a.getAttribute('href') === '#top' ? 0 : -8, duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) });
    history.replaceState(null, '', a.getAttribute('href'));
  });
}

/* ---------- Scroll helper: one loop writes --p (0..1) on every [data-progress] ---------- */
const root = document.documentElement;
const banner = $('#banner');
const progressEls = $$('[data-progress]');
const darkEls = $$('[data-header-theme="dark"]');
const tracks = $$('.hs');

function layoutTracks() {
  tracks.forEach((sec) => {
    const track = $('.hs-track', sec);
    const on = wide.matches && !reduceMotion;
    sec.classList.toggle('is-sticky', on);
    if (!on) { sec.style.height = ''; return; }
    const max = Math.max(0, track.scrollWidth - innerWidth);
    track.style.setProperty('--max', max);
    sec.style.height = `${Math.round(max * 0.5) + innerHeight}px`; // half a screen of scroll per screen of sideways movement
  });
}

function tick() {
  const vh = innerHeight;
  progressEls.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 2) return;
    const p = el.dataset.progress === 'sticky'
      ? -r.top / Math.max(1, r.height - vh)
      : (vh - r.top) / (vh * 0.75);
    el.style.setProperty('--p', reduceMotion ? 1 : clamp01(p).toFixed(4));
  });
  root.style.setProperty('--page-p', clamp01(scrollY / Math.max(1, root.scrollHeight - vh)).toFixed(4));
  const y = 40; // header line
  banner.classList.toggle('is-dark', darkEls.some((el) => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom >= y; }));
}

let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { tick(); ticking = false; });
}, { passive: true });
addEventListener('resize', () => { layoutTracks(); tick(); });
addEventListener('load', () => { layoutTracks(); tick(); });
layoutTracks();
tick();

/* ---------- S02 Hero: video + changing line, one pause button for both ---------- */
const heroVideo = $('#heroVideo');
const heroPause = $('#heroPause');
const heroWords = $$('.hero-word');
let heroIndex = 0;
let heroTimer = null;
let heroOnScreen = true;
// Paused for good when the visitor asks for less motion or less data
let heroWanted = !reduceMotion && !navigator.connection?.saveData;

function rotateHero() {
  const out = heroWords[heroIndex];
  out.classList.replace('is-in', 'is-out');
  setTimeout(() => out.classList.remove('is-out'), 700);
  heroIndex = (heroIndex + 1) % heroWords.length;
  heroWords[heroIndex].classList.add('is-in');
}

function syncHero() {
  const run = heroWanted && heroOnScreen;
  clearInterval(heroTimer);
  heroTimer = run ? setInterval(rotateHero, 3200) : null;
  if (run) {
    heroVideo.preload = 'auto';
    heroVideo.play().catch(() => {}); // blocked autoplay: the poster stays
  } else {
    heroVideo.pause();
  }
  heroPause.setAttribute('aria-pressed', String(!heroWanted));
  heroPause.setAttribute('aria-label', heroWanted ? 'Pause the video and moving text' : 'Play the video and moving text');
}

heroPause.addEventListener('click', () => { heroWanted = !heroWanted; syncHero(); });
new IntersectionObserver(([e]) => { heroOnScreen = e.isIntersecting; syncHero(); }).observe($('#top'));

/* ---------- S04: numbers count up once when they come into view (final values stay in the HTML) ---------- */
if (!reduceMotion) {
  const show = (el, v) => { el.textContent = v.toFixed((el.dataset.count.split('.')[1] || '').length); };
  const countIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const el = e.target;
    const to = Number(el.dataset.count);
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 1800);
      show(el, to * (1 - (1 - k) ** 3)); // ease-out
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach((el) => { show(el, 0); countIO.observe(el); });
}

/* ---------- S04: the developer card turns to its contact side via its button ---------- */
const quoteFlip = $('#quoteFlip');
const quoteFront = $('.quote-front', quoteFlip);
const quoteBack = $('#quoteBack');
const quoteTurn = $('.quote-turn', quoteFront);
function turnQuote(on, moveFocus) {
  quoteFlip.classList.toggle('is-flipped', on);
  quoteBack.inert = !on; // the hidden side is never tabbable or read out
  quoteFront.inert = on;
  quoteTurn.setAttribute('aria-expanded', String(on));
  if (moveFocus) (on ? $('button, a', quoteBack) : quoteTurn).focus();
}
quoteTurn.addEventListener('click', () => turnQuote(true, true));
$('.quote-turn-back', quoteBack).addEventListener('click', () => turnQuote(false, true));

/* ---------- S05 Journey: the rail and chapters follow the chapter in the middle of the screen ---------- */
const chapters = $$('.chapter');
const railItems = $$('.journey-rail li');
const chapterIO = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  const i = chapters.indexOf(e.target);
  chapters.forEach((c, j) => c.classList.toggle('is-active', i === j));
  railItems.forEach((c, j) => c.classList.toggle('is-active', i === j));
}), { rootMargin: '-45% 0px -45% 0px' });
chapters.forEach((c) => chapterIO.observe(c));

/* ---------- S08 Infrastructure: tabs swap the photo (auto-cycles every 2.5s + click/hover/keys) ---------- */
const infraSection = $('#infrastructure');
const infraTabs = $$('.infra-tab');
const infraShots = $$('.infra-shot');
let infraIndex = 0;
let infraTimer = null;
let infraOnScreen = false;
let infraPaused = false;

function showInfra(i, moveFocus) {
  infraIndex = i;
  infraTabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
  infraShots.forEach((img, k) => img.classList.toggle('is-on', k === i));
  $('#infraPanel').setAttribute('aria-labelledby', infraTabs[i].id);
  $('#infraCapName').textContent = infraShots[i].dataset.name;
  $('#infraCapLine').textContent = infraShots[i].dataset.line;
  if (moveFocus) infraTabs[i].focus();
  if (!wide.matches) { const row = infraTabs[i].parentElement; row.scrollTo({ left: infraTabs[i].offsetLeft - (row.clientWidth - infraTabs[i].offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' }); } // centre the chip without moving the page
}

function syncInfraTimer() {
  clearInterval(infraTimer);
  if (!reduceMotion && infraOnScreen && !infraPaused) {
    infraTimer = setInterval(() => {
      showInfra((infraIndex + 1) % infraTabs.length);
    }, 2500);
  }
}

infraTabs.forEach((tab, i) => {
  tab.addEventListener('click', () => { showInfra(i); syncInfraTimer(); });
  if (matchMedia('(hover: hover)').matches) {
    tab.addEventListener('pointerenter', () => { infraPaused = true; showInfra(i); syncInfraTimer(); });
    tab.addEventListener('pointerleave', () => { infraPaused = false; syncInfraTimer(); });
  }
  tab.addEventListener('focusin', () => { infraPaused = true; syncInfraTimer(); });
  tab.addEventListener('focusout', () => { infraPaused = false; syncInfraTimer(); });
  tab.addEventListener('keydown', (e) => {
    const n = infraTabs.length;
    const to = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    showInfra((to + n) % n, true);
  });
});

if (infraSection) {
  new IntersectionObserver(([e]) => {
    infraOnScreen = e.isIntersecting;
    syncInfraTimer();
  }, { threshold: 0.2 }).observe(infraSection);
}

/* ---------- S03: the sticky caption and step index follow the card in view ---------- */
const cardsNo = $('#cardsNo');
const cardsCaption = $('#cardsCaption');
const cardItems = $$('.card-item');
const cardNavItems = $$('.cards-nav li');
const cardIO = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  const idx = cardItems.indexOf(e.target);
  if (cardsNo) cardsNo.textContent = idx + 1;
  if (cardsCaption) cardsCaption.textContent = $('.card-cap .h-s', e.target).textContent;
  cardItems.forEach((c, j) => c.classList.toggle('is-active', j === idx));
  cardNavItems.forEach((c, j) => c.classList.toggle('is-active', j === idx));
}), { rootMargin: '-45% 0px -45% 0px' });
cardItems.forEach((el) => cardIO.observe(el));

/* ---------- Dialogs: menu and enquiry ---------- */
const enquiry = $('#enquiry');
const navLinks = $$('.nav-main a');
const navImgs = $$('.nav-img');

function openDialog(d) {
  if (d.open) return;
  d.showModal();
  lenis?.stop();
}
$$('dialog').forEach((d) => {
  d.addEventListener('close', () => { if (!$('dialog[open]')) lenis?.start(); });
  // Click on the backdrop closes a dialog (keyboard "clicks" have their target inside, so they never match)
  d.addEventListener('click', (e) => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
  });
});

const ENQUIRY = {
  visit: { title: 'Book a site visit', sub: "Leave your number and we'll call to fix a time that suits you.", interest: 'Site visit', cta: 'Book my visit' },
  plot: { title: 'Ask about Plot {n}', sub: "Leave your number and we'll call with this plot's price and availability.", interest: 'Plot enquiry', cta: 'Call me back' },
  price: { title: 'Get the price list', sub: "Leave your number and we'll send the current price list.", interest: 'Price list', cta: 'Send me the price list' },
};

function openEnquiry(kind, plot = '') {
  const k = ENQUIRY[kind] || ENQUIRY.visit;
  const form = $('form', enquiry);
  $('#enquiryTitle').textContent = k.title.replace('{n}', plot);
  $('#enquirySub').textContent = k.sub;
  $('#enquirySubmit').textContent = k.cta;
  field(form, 'interest').value = k.interest;
  field(form, 'plot').value = plot;
  $('.form-status', form).textContent = '';
  // "When suits you?" is for visits only; disabled fields stay out of the submitted data
  const when = $('#enquiryWhen');
  when.hidden = when.disabled = kind !== 'visit';
  openDialog(enquiry);
}

$('#menuOpen').addEventListener('click', () => {
  // the section in view is marked in the menu, and its photo is shown first
  const mid = innerHeight / 2;
  let current = null;
  navLinks.forEach((a) => {
    const sec = $(a.getAttribute('href'));
    const r = sec && sec.getBoundingClientRect();
    const here = !!r && r.top <= mid && r.bottom >= mid;
    if (here) current = a;
    if (here) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
  });
  showNavImage(current || navLinks[0], true);
  openDialog($('#menu'));
});

document.addEventListener('click', (e) => {
  const closer = e.target.closest('[data-close]');
  if (closer) closer.closest('dialog')?.close();
  const opener = e.target.closest('[data-enquiry]');
  if (opener) {
    hidePopup();
    openEnquiry(opener.dataset.enquiry, opener.dataset.plot);
  }
});

// Menu: the photo cross-fades to the hovered or focused link, with its name as a caption
function showNavImage(a, instant) {
  const [on, off] = navImgs[0].classList.contains('is-on') ? navImgs : [navImgs[1], navImgs[0]];
  $('#navCap').textContent = $('.nm-t', a).textContent;
  if (on.getAttribute('src') === a.dataset.image) return;
  if (instant) { on.src = a.dataset.image; return; }
  off.src = a.dataset.image;
  const swap = () => { off.classList.add('is-on'); on.classList.remove('is-on'); };
  if (off.complete) swap(); else off.addEventListener('load', swap, { once: true });
}
navLinks.forEach((a) => ['pointerenter', 'focus'].forEach((ev) => a.addEventListener(ev, () => showNavImage(a))));

/* ---------- Lead forms ---------- */
function normalisePhone(value) {
  // Accept "+91 90100 55596", "09010055596" or "9010055596"
  return value.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
}

function showStatus(el, text, isError, fallbackMsg) {
  el.classList.toggle('is-error', isError);
  el.textContent = text;
  if (fallbackMsg) {
    const a = Object.assign(document.createElement('a'), { href: wa(fallbackMsg), target: '_blank', rel: 'noopener', className: 'link', textContent: 'Send it on WhatsApp instead' });
    el.append(' ', a, '.');
  }
}

$$('.lead-form').forEach((form) => form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('.form-status', form);
  const btn = $('button[type="submit"]', form);
  field(form, 'phone').value = normalisePhone(field(form, 'phone').value);
  field(form, 'name').value = field(form, 'name').value.trim();

  const invalid = $$('input[required]', form).filter((f) => !f.checkValidity());
  $$('input[required]', form).forEach((f) => f.setAttribute('aria-invalid', String(invalid.includes(f))));
  if (invalid.length) {
    showStatus(status, 'Please enter your name and a 10-digit mobile number.', true);
    invalid[0].focus();
    return;
  }

  const lead = Object.fromEntries(new FormData(form));
  if (lead.when) { // the server stores one message line, so the preferred time travels in it
    lead.message = [`Preferred time: ${lead.when}`, lead.message].filter(Boolean).join(' · ');
    delete lead.when;
  }
  const summary = `Hello, I'm ${lead.name} (${lead.phone}). I'd like ${lead.interest || 'a call back'}${lead.plot ? ` for Plot ${lead.plot}` : ''} at MJR Township.${lead.message ? ` ${lead.message}` : ''}`;
  btn.disabled = true;
  try {
    const res = await fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showStatus(status, `Thank you, ${lead.name}. Our team will call ${lead.phone} soon.`, false);
    form.reset();
  } catch {
    showStatus(status, `We couldn't send your details. Please call ${PHONE_DISPLAY}, or`, true, summary);
  } finally {
    btn.disabled = false;
  }
}));

/* ---------- Location map: load Google Maps only on request ---------- */
$('#loadMap')?.addEventListener('click', (e) => {
  const frame = $('#mapFrame');
  if (!frame.hidden) return frame.scrollIntoView({ block: 'center' });
  frame.hidden = false;
  frame.classList.add('is-loaded');
  // shortcut: map searches by name; swap in the site's exact lat/long once sales confirms the pin
  frame.innerHTML = '<iframe title="MJR Township on Google Maps" src="https://www.google.com/maps?q=MJR+Township+Kalwakurthy&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
  e.currentTarget.textContent = 'Map loaded below';
});

/* ---------- S06: copy the site address ---------- */
$('#copyAddress')?.addEventListener('click', async (e) => {
  const label = $('span', e.currentTarget);
  let msg = 'Address copied';
  try { await navigator.clipboard.writeText($('#siteAddress').textContent.trim()); } catch { msg = 'Copy not available, select the address instead'; }
  label.textContent = msg.split(',')[0];
  $('#copyStatus').textContent = msg;
  setTimeout(() => { label.textContent = 'Copy address'; }, 2200);
});

/* ---------- S06: three steps; the route draws during step 02 and a marker travels along it ---------- */
const locPin = $('.loc-pin');
const locSteps = $$('.loc-step');
const locRoute = $('.m-route');
const locCar = $('.m-car');
const locLen = locRoute.getTotalLength();
function locUpdate() {
  const pinned = wide.matches && !reduceMotion;
  const p = pinned ? Number(locPin.style.getPropertyValue('--p')) || 0 : 1;
  const step = Math.min(2, Math.floor(p * 3));
  const r = pinned ? clamp01((p - 0.3) / 0.3) : 1;
  locPin.dataset.step = pinned ? step : 'all';
  locPin.style.setProperty('--route', r.toFixed(4));
  locSteps.forEach((el, i) => el.classList.toggle('is-active', !pinned || i === step));
  const pt = locRoute.getPointAtLength(locLen * r);
  locCar.setAttribute('cx', pt.x.toFixed(1));
  locCar.setAttribute('cy', pt.y.toFixed(1));
}
let locTicking = false;
addEventListener('scroll', () => {
  if (locTicking) return;
  locTicking = true;
  requestAnimationFrame(() => { locUpdate(); locTicking = false; }); // queued after tick(), which writes --p first
}, { passive: true });
addEventListener('resize', locUpdate);
locUpdate();

/* ---------- Shortlist (header heart): plot numbers kept in this browser only ---------- */
let shortlist = store.get('mjr-shortlist', []).filter(Number.isInteger);

function renderShortlist() {
  const n = shortlist.length;
  $('#navShortlist').hidden = !n;
  const list = shortlist.slice().sort((a, b) => a - b).join(', ');
  $('#shortlistText').textContent = n ? `Plot${n === 1 ? '' : 's'} ${list}` : 'Tap the heart on a plot in the master plan to save it here.';
  const link = $('#shortlistWa');
  link.href = wa(`Hello, I'm interested in Plot${n === 1 ? '' : 's'} ${list} at MJR Township. Please share the price and availability.`);
}

function toggleShortlist(n) {
  shortlist = shortlist.includes(n) ? shortlist.filter((x) => x !== n) : [...shortlist, n];
  store.set('mjr-shortlist', shortlist);
  renderShortlist();
}
renderShortlist();

/* ---------- Mobile Logo Option Toggle (Option A: Right Boxed vs Option B: Center Transparent) ---------- */
const logoOptBtn = $('#logoOptBtn');
if (logoOptBtn && banner) {
  logoOptBtn.addEventListener('click', () => {
    const next = banner.dataset.mobileLogo === 'a' ? 'b' : 'a';
    banner.dataset.mobileLogo = next;
    logoOptBtn.textContent = `Logo: Opt ${next.toUpperCase()}`;
  });
}

/* ---------- S07 Master plan ---------- */
(function initPlan() {
  const data = window.MJR_PLOTS;
  if (!data) return;

  const svg = $('#plan');
  const zoom = $('#planZoom');
  const orientGroup = $('#planOrient');
  const layer = $('#planPlots');
  const select = $('#plotSelect');
  const body = $('#inspectorBody');
  const reset = $('#planReset');
  const scroller = $('#planScroll');
  const count = $('#matchCount');
  const cta = $('#planCta');
  const filter = { size: 'all', road: 'all' };
  let selected = null;
  let orient = wide.matches ? 'horizontal' : 'ccw90';

  const STATUS = { available: 'Available', sold: 'Sold', reserved: 'Not for sale' };
  const status = (p) => (p.reserved ? 'reserved' : p.sold ? 'sold' : 'available');
  const approx = (p) => Math.round(p.size / 5) * 5; // indicative until the sales schedule is in
  const roadText = (p) => (p.road === 150 ? '150 ft highway' : `${p.road} ft road`);
  const filtering = () => filter.size !== 'all' || filter.road !== 'all';
  const matches = (p) => {
    if (p.reserved) return false;
    const [lo, hi] = filter.size === 'all' ? [0, Infinity] : filter.size.split('-').map(Number);
    const size = Math.round(p.size);
    return size >= lo && size <= hi && (filter.road === 'all' || p.road === Number(filter.road));
  };

  // Draw every plot as its traced outline, coloured by status
  const NS = 'http://www.w3.org/2000/svg';
  const nodes = {};
  const labels = {};
  data.list.forEach((p) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', `plot is-${status(p)}`);
    const poly = document.createElementNS(NS, 'polygon');
    poly.setAttribute('points', p.shape);
    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', p.x);
    label.setAttribute('y', p.y);
    label.textContent = p.n;
    const title = document.createElementNS(NS, 'title');
    title.textContent = p.reserved ? `Plot ${p.n}: ${p.reserved}` : `Plot ${p.n}: ${STATUS[status(p)]}`;
    g.append(poly, label, title);
    if (!p.reserved) g.addEventListener('click', () => choose(p.n === selected ? null : p.n));
    layer.append(g);
    nodes[p.n] = g;
    labels[p.n] = label;
  });

  function applyOrient(mode) {
    orient = mode;
    const isCCW = mode === 'ccw90';
    svg.setAttribute('viewBox', isCCW ? '0 0 1080 2160' : '190 300 2160 1080');
    svg.classList.toggle('is-ccw90', isCCW);
    if (orientGroup) {
      orientGroup.setAttribute('transform', isCCW ? 'translate(-300, 2350) rotate(-90)' : '');
    }
    data.list.forEach((p) => {
      if (labels[p.n]) {
        labels[p.n].setAttribute('transform', isCCW ? `rotate(90, ${p.x}, ${p.y})` : '');
      }
    });
    $$('[data-plan-orient]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.planOrient === mode));
    });
    choose(selected);
  }

  $$('[data-plan-orient]').forEach((btn) => {
    btn.addEventListener('click', () => applyOrient(btn.dataset.planOrient));
  });

  svg.addEventListener('click', (e) => { if (!e.target.closest('.plot')) choose(null); });
  select.addEventListener('change', () => choose(select.value ? Number(select.value) : null));
  reset.addEventListener('click', () => choose(null));
  body.addEventListener('click', (e) => {
    const heart = e.target.closest('.heart');
    if (!heart) return;
    toggleShortlist(Number(heart.dataset.plot));
    heart.setAttribute('aria-pressed', String(shortlist.includes(Number(heart.dataset.plot))));
  });

  $$('.planner-filters .chip').forEach((chip) => chip.addEventListener('click', () => {
    const key = chip.dataset.size ? 'size' : 'road';
    filter[key] = chip.dataset[key];
    $$(`.planner-filters [data-${key}]`).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    renderFilters();
    render();
  }));

  $('#planNote').textContent = `Availability updated ${data.asOf}. Plot sizes, facing and availability are indicative until our sales team confirms them.`;

  function choose(n) {
    selected = n;
    const p = n && data.byNo[n];
    if (p) {
      const vb = svg.viewBox.baseVal;
      const s = 2.4;
      const cx = vb.x + vb.width / 2;
      const cy = vb.y + vb.height / 2;
      const px = orient === 'ccw90' ? (p.y - 300) : p.x;
      const py = orient === 'ccw90' ? (2350 - p.x) : p.y;
      zoom.style.transform = `translate(${cx - px * s}px, ${cy - py * s}px) scale(${s})`;
      scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
    } else {
      zoom.style.transform = '';
    }
    reset.hidden = !p;
    render();
  }

  function renderFilters() {
    const available = data.list.filter((p) => !p.sold && matches(p)).length;
    // available is a count we computed, so it is safe in innerHTML
    count.innerHTML = !filtering() ? `<b>${available}</b>plots available`
      : available ? `<b>${available}</b>available plot${available === 1 ? '' : 's'} match`
      : 'No plots match. Ask us on WhatsApp about this size.';
    select.innerHTML = '<option value="">Choose a plot</option>' + data.list.filter(matches)
      .map((p) => `<option value="${p.n}">Plot ${p.n}: about ${approx(p)} sq. yd., ${roadText(p)}${p.sold ? ' (sold)' : ''}</option>`)
      .join('');
  }

  function render() {
    data.list.forEach((p) => {
      nodes[p.n].classList.toggle('is-selected', p.n === selected);
      nodes[p.n].classList.toggle('is-out', filtering() && !matches(p));
    });
    select.value = selected ?? '';

    const p = selected && data.byNo[selected];
    if (p) layer.append(nodes[p.n]); // draw last so the outline sits above its neighbours
    const st = p && status(p);
    cta.dataset.enquiry = st === 'available' ? 'plot' : 'price';
    cta.dataset.plot = st === 'available' ? p.n : '';
    cta.textContent = st === 'available' ? `Ask about Plot ${p.n}` : 'Get the price list';

    if (!p) {
      body.innerHTML = `
        <div class="inspector-head"><h3 class="h-s" id="inspectorTitle">Pick a plot</h3></div>
        <p>Tap a plot on the plan, or choose one from the list, to see its size, road and facing.</p>
        <a class="link" href="${wa('Hello, please send me the list of available plots at MJR Township.')}" target="_blank" rel="noopener">Get available plots on WhatsApp</a>`;
      return;
    }

    const saved = shortlist.includes(p.n);
    const actions = st === 'available'
      ? `<a class="pill wa-pill" href="${wa(`Hello, I'm interested in Plot ${p.n} at MJR Township. Please share the price and availability.`)}" target="_blank" rel="noopener"><svg class="icon"><use href="#i-wa"/></svg>Ask on WhatsApp</a>`
      : `<a class="pill wa-pill" href="${wa(`Hello, Plot ${p.n} at MJR Township is sold. Please suggest similar available plots.`)}" target="_blank" rel="noopener"><svg class="icon"><use href="#i-wa"/></svg>Ask for similar plots</a>`;

    body.innerHTML = `
      <div class="inspector-head">
        <h3 class="h-s" id="inspectorTitle">Plot ${p.n}</h3>
        <div>
          <span class="status status-${st}">${STATUS[st]}</span>
          <button type="button" class="heart" data-plot="${p.n}" aria-pressed="${saved}" aria-label="Save Plot ${p.n} to your shortlist"><svg class="icon"><use href="#i-heart"/></svg></button>
        </div>
      </div>
      <dl class="spec">
        <div><dt class="label">Size*</dt><dd>About ${approx(p)} sq. yd.</dd></div>
        <div><dt class="label">Road</dt><dd>${roadText(p)}</dd></div>
        <div><dt class="label">Facing*</dt><dd>${p.facing}</dd></div>
        <div><dt class="label">Block</dt><dd>${p.block}${p.corner ? ', corner' : ''}</dd></div>
      </dl>
      <div class="inspector-actions">${actions}</div>
      <p class="inspector-note">* Indicative. Our sales team confirms the exact size, facing and price.</p>`;
  }

  renderFilters();
  applyOrient(orient);
  wide.addEventListener('change', (e) => applyOrient(e.matches ? 'horizontal' : 'ccw90'));
})();

/* ---------- S12 FAQ: the side image follows the open question ---------- */
const faqImage = $('#faqImage');
$$('.tabs details').forEach((d) => d.addEventListener('toggle', () => {
  if (!d.open) return;
  if (d.dataset.image) faqImage.src = d.dataset.image;
}));

/* ---------- S16 Promo popup: once per visitor, never over the plan, wide screens only ---------- */
const pop = $('#promoPop');
function hidePopup() {
  if (pop.hidden) return;
  pop.hidden = true;
  store.set('mjr-popup-seen', true);
}
$('#popClose').addEventListener('click', hidePopup);
if (!store.get('mjr-popup-seen', false)) {
  setTimeout(() => {
    const plan = $('#plots').getBoundingClientRect();
    const overPlan = plan.top < innerHeight && plan.bottom > 0;
    if (!wide.matches || overPlan || $('dialog[open]')) return;
    pop.hidden = false;
    requestAnimationFrame(() => pop.classList.add('is-in'));
  }, 9000);
}

/* ---------- S15 Phone action bar: step aside while the footer form is on screen ---------- */
const bar = $('#actionBar');
new IntersectionObserver(([entry]) => bar.classList.toggle('is-hidden', entry.isIntersecting), { threshold: 0.15 })
  .observe($('#contact'));
