// Helpers
const qs = (s, sc = document) => sc.querySelector(s);
const qsa = (s, sc = document) => Array.from(sc.querySelectorAll(s));

// Always start at top on page load; disable scroll restoration
try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch(_) {}
window.addEventListener('load', () => {
  window.scrollTo(0, 0);
});

// Mobile nav toggle
const navToggle = qs('.nav-toggle');
const primaryNav = qs('#primary-nav');
if (navToggle && primaryNav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    primaryNav.classList.toggle('open');
  });
  // Close on link click
  primaryNav.addEventListener('click', (e) => {
    const target = e.target;
    if (target instanceof Element && target.matches('a')) {
      // If tapping a parent menu item on mobile to open its submenu, don't close the nav
      const isMobile = window.matchMedia('(max-width: 900px)').matches;
      const isParentMenuLink = !!target.closest('.has-dropdown') && !target.closest('.dropdown');
      if (isMobile && isParentMenuLink) return;
      navToggle.setAttribute('aria-expanded', 'false');
      primaryNav.classList.remove('open');
    }
  });
  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      navToggle.setAttribute('aria-expanded', 'false');
      primaryNav.classList.remove('open');
      qsa('.has-dropdown.open').forEach(li => li.classList.remove('open'));
    }
  });

  // Mobile dropdown toggle
  primaryNav.addEventListener('click', (e) => {
    const target = e.target;
    if (target instanceof Element && target.closest('.has-dropdown > a')) {
      // On small screens, toggle sublist
      if (window.matchMedia('(max-width: 900px)').matches) {
        e.preventDefault();
        const li = target.closest('.has-dropdown');
        if (li) {
          // close siblings
          qsa('.has-dropdown.open', li.parentElement || document).forEach(sib => { if (sib !== li) sib.classList.remove('open'); });
          li.classList.toggle('open');
        }
      }
    }
  });

  // Close any open dropdowns when clicking outside (both desktop and mobile)
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (!t.closest('.has-dropdown.open')) {
      qsa('.has-dropdown.open').forEach(li => li.classList.remove('open'));
    }
  });

  // Close dropdowns on nav close or resize
  function closeAllDropdowns() { qsa('.has-dropdown.open').forEach(li => li.classList.remove('open')); }
  const closeNav = () => { navToggle.setAttribute('aria-expanded', 'false'); primaryNav.classList.remove('open'); closeAllDropdowns(); };
  window.addEventListener('resize', closeAllDropdowns);
  window.addEventListener('scroll', () => {
    // Close dropdowns on scroll to prevent sticking
    closeAllDropdowns();
  }, { passive: true });
  primaryNav.addEventListener('mouseleave', () => { if (window.matchMedia('(hover: hover)').matches) closeAllDropdowns(); });

  // Desktop: ensure only one dropdown open at a time on hover
  function setupDesktopDropdownHover() {
    const isDesktopHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const items = qsa('.has-dropdown', primaryNav);
    items.forEach(li => {
      li.onmouseenter = isDesktopHover ? () => {
        qsa('.has-dropdown.open', primaryNav).forEach(sib => { if (sib !== li) sib.classList.remove('open'); });
        li.classList.add('open');
      } : null;
      li.onmouseleave = isDesktopHover ? () => { li.classList.remove('open'); } : null;
    });
  }
  setupDesktopDropdownHover();
  window.addEventListener('resize', setupDesktopDropdownHover);
}

// Current year
const yearEl = qs('#year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Split text into characters for animation
function splitText() {
  qsa('.split-text').forEach(el => {
    const text = el.textContent || '';
    el.textContent = '';
    const frag = document.createDocumentFragment();
    text.split('').forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'split-char';
      span.style.transitionDelay = `${i * 22}ms`;
      span.textContent = ch;
      frag.appendChild(span);
    });
    el.appendChild(frag);
  });
}
splitText();

// Intersection Observer for reveals
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      io.unobserve(entry.target);
    }
  }
}, { 
  threshold: 0.1, // Reduced threshold for better performance
  rootMargin: '50px' // Add margin to start loading earlier
});

// Use requestIdleCallback for better performance
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    qsa('.fade-up, .float-in, .split-char, .flip-in, .fold-in, .zoom-in').forEach(el => io.observe(el));
  });
} else {
  // Fallback for older browsers
  setTimeout(() => {
    qsa('.fade-up, .float-in, .split-char').forEach(el => io.observe(el));
  }, 100);
}

// Number counters
function animateCount(el) {
  const target = Number(el.getAttribute('data-count') || 0);
  const duration = 1600;
  const startTs = performance.now();
  const startVal = 0;
  function tick(now) {
    const p = Math.min(1, (now - startTs) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = Math.floor(startVal + (target - startVal) * eased);
    el.textContent = String(val);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      animateCount(entry.target);
      statObserver.unobserve(entry.target);
    }
  }
}, { threshold: 0.6 });
qsa('.stat-number').forEach(el => statObserver.observe(el));

// Parallax hero background (mouse + subtle scroll) - Optimized
const parallaxEl = qs('.parallax');
if (parallaxEl) {
  const strength = 15; // Reduced strength for better performance
  let ticking = false;
  
  function updateParallax(e) {
    if (!ticking) {
      requestAnimationFrame(() => {
        const { innerWidth: w, innerHeight: h } = window;
        const rx = (e.clientX / w - 0.5) * 2; // -1..1
        const ry = (e.clientY / h - 0.5) * 2; // -1..1
        parallaxEl.style.transform = `translate3d(${rx * -strength}px, ${ry * -strength}px, 0)`;
        ticking = false;
      });
      ticking = true;
    }
  }
  
  // Throttled mousemove for better performance
  let mouseTimeout;
  window.addEventListener('mousemove', (e) => {
    if (mouseTimeout) return;
    mouseTimeout = setTimeout(() => {
      updateParallax(e);
      mouseTimeout = null;
    }, 16); // ~60fps
  }, { passive: true });
  
  // Optimized scroll with throttling
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
      const sy = (window.scrollY || window.pageYOffset) * 0.1; // Reduced multiplier
      parallaxEl.style.transform = `translate3d(0, ${sy}px, 0)`;
      scrollTimeout = null;
    }, 16); // ~60fps
  }, { passive: true });
}

// Minimal carousel
function initCarousel(root) {
  const track = qs('.carousel-track', root);
  const slides = qsa('.slide', track);
  const prev = qs('.prev', root);
  const next = qs('.next', root);
  let index = 0;
  let autoAdvanceTimer = null;

  function update() {
    track.style.transform = `translateX(${-index * 100}%)`;
  }
  function go(dir) {
    index = (index + dir + slides.length) % slides.length;
    update();
  }
  
  // Reset auto-advance timer
  function resetAutoAdvance() {
    if (autoAdvanceTimer) {
      clearInterval(autoAdvanceTimer);
    }
    autoAdvanceTimer = setInterval(() => go(1), 8000); // Increased to 8 seconds
  }
  
  prev?.addEventListener('click', () => { go(-1); resetAutoAdvance(); });
  next?.addEventListener('click', () => { go(1); resetAutoAdvance(); });
  
  // Start auto-advance only if user is not interacting
  let userInteracting = false;
  root.addEventListener('mouseenter', () => { userInteracting = true; });
  root.addEventListener('mouseleave', () => { userInteracting = false; });
  
  // Auto-advance only when not interacting
  autoAdvanceTimer = setInterval(() => {
    if (!userInteracting) {
      go(1);
    }
  }, 8000);
}

qsa('[data-carousel]').forEach(initCarousel);

// Lightbox for galleries
function initLightbox() {
  const galleryLinks = qsa('[data-gallery] .gallery-item');
  const lb = qs('#lightbox');
  if (!lb || galleryLinks.length === 0) return;
  const img = qs('img', lb);
  const btnClose = qs('.lb-close', lb);
  const btnPrev = qs('.lb-prev', lb);
  const btnNext = qs('.lb-next', lb);
  let index = 0;

  function open(i) {
    index = i;
    img.src = galleryLinks[index].getAttribute('href') || '';
    lb.classList.add('open');
  }
  function close() { lb.classList.remove('open'); }
  function step(dir) {
    index = (index + dir + galleryLinks.length) % galleryLinks.length;
    img.src = galleryLinks[index].getAttribute('href') || '';
  }
  galleryLinks.forEach((a, i) => {
    a.addEventListener('click', (e) => { e.preventDefault(); open(i); });
  });
  btnClose?.addEventListener('click', close);
  btnPrev?.addEventListener('click', () => step(-1));
  btnNext?.addEventListener('click', () => step(1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
}
initLightbox();

// Scrollspy for nav
const sections = qsa('main section[id]');
const navLinks = qsa('.primary-nav a[href^="#"]');
const spyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const id = entry.target.getAttribute('id');
    if (!id) return;
    const link = navLinks.find(a => a.getAttribute('href') === `#${id}`);
    if (!link) return;
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active'));
      link.classList.add('active');
    }
  });
}, { rootMargin: '-50% 0px -40% 0px', threshold: 0.01 });
sections.forEach(s => spyObserver.observe(s));

// Contact form (client-side only)
const contactForm = qs('.contact-form');
if (contactForm) {
  const status = qs('.form-status', contactForm);
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(contactForm);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const message = String(formData.get('message') || '').trim();
    if (!name || !email || !message) {
      status.textContent = 'Please fill out all fields.';
      return;
    }
    status.textContent = 'Thanks! We\'ll get back to you soon.';
    contactForm.reset();
  });
}

// Dynamic: subtle parallax on hero stats and gallery cards
(function(){
  const parallaxTargets = [...qsa('.hero-stats .card'), ...qsa('.gallery-card')];
  if (parallaxTargets.length === 0) return;
  const strength = 6;
  function move(e){
    const { innerWidth:w, innerHeight:h } = window;
    const rx = (e.clientX / w - 0.5);
    const ry = (e.clientY / h - 0.5);
    parallaxTargets.forEach(el => {
      el.style.transform = `translateY(-6px) rotateX(${(-ry*strength/2)}deg) rotateY(${(rx*strength/2)}deg)`;
    });
  }
  window.addEventListener('mousemove', move, { passive:true });
})();

// Dynamic: counters on subpages (reuse stat observer on any [data-count])
qsa('[data-count]').forEach(el => {
  // Already observed in home; ensure subpages pick up as well
  if (!el.classList.contains('count-wired')) {
    el.classList.add('count-wired');
    statObserver.observe(el);
  }
});

// Scroll progress bar
(function(){
  let bar = qs('#scroll-progress');
  if (!bar){
    bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);
  }
  const onScroll = () => {
    const scrolled = (window.scrollY || window.pageYOffset);
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const p = docH > 0 ? (scrolled / docH) * 100 : 0;
    bar.style.transform = `scaleX(${p/100})`;
  };
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();
})();

// CTA idle pulse
(function(){
  const ctas = qsa('.btn.btn-cta');
  let timer;
  function addPulse(){ ctas.forEach(b => b.classList.add('pulse')); }
  function removePulse(){ ctas.forEach(b => b.classList.remove('pulse')); }
  function reset(){ clearTimeout(timer); removePulse(); timer = setTimeout(addPulse, 6000); }
  ['mousemove','scroll','keydown','touchstart'].forEach(evt => window.addEventListener(evt, reset, { passive:true }));
  reset();
})();

// Sitewide parallax tilt on cards using CSS variables
(function(){
  const cards = qsa('.card');
  if (cards.length === 0) return;
  const strength = 6;
  function updateVars(e){
    const { innerWidth:w, innerHeight:h } = window;
    const rx = (e.clientX / w - 0.5);
    const ry = (e.clientY / h - 0.5);
    const tiltX = (-ry * strength / 2).toFixed(2) + 'deg';
    const tiltY = ( rx * strength / 2).toFixed(2) + 'deg';
    cards.forEach(el => {
      el.style.setProperty('--tiltX', tiltX);
      el.style.setProperty('--tiltY', tiltY);
    });
  }
  window.addEventListener('mousemove', updateVars, { passive:true });
})();

// Tweak section logo parallax to avoid blur from scaling
(function(){
  const sel = ['#motivation.section-dark','#programs.section-dark','#what-we-offer.section-dark','section#testimonials.section-dark','#cta-special.section-dark'];
  const targets = sel.map(s => qs(s)).filter(Boolean);
  if (targets.length === 0) return;
  function onMove(e){
    const { innerWidth:w, innerHeight:h } = window;
    const rx = (e.clientX / w - 0.5);
    const ry = (e.clientY / h - 0.5);
    const tx = (Math.max(-1, Math.min(1, rx)) * 8).toFixed(2) + 'px';
    const ty = (Math.max(-1, Math.min(1, ry)) * 8).toFixed(2) + 'px';
    targets.forEach(el => { el.style.setProperty('--bgX', tx); el.style.setProperty('--bgY', ty); });
  }
  function onScroll(){
    const scale = 1.0; // keep at 1 to avoid raster blur
    targets.forEach(el => el.style.setProperty('--bgScale', String(scale)));
  }
  window.addEventListener('mousemove', onMove, { passive:true });
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();
})();


