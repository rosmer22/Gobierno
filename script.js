/* EPSEL S.A. - Interactividad de la landing page (script.js) */

(function(){
  /* ---------- Header con sombra al hacer scroll ---------- */
  const header = document.getElementById('siteHeader');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();

  /* ---------- Menú móvil ---------- */
  const nav = document.getElementById('mainNav');
  const navToggle = document.getElementById('navToggle');
  navToggle.addEventListener('click', function(){
    const open = nav.classList.toggle('open');
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', open);
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    navToggle.setAttribute('aria-expanded','false');
  }));

  /* ---------- Animaciones de revelado ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, {threshold:.15, rootMargin:'0px 0px -60px 0px'});
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-in'));
  }

  /* ---------- Contadores animados de indicadores ---------- */
  const nums = document.querySelectorAll('.ind-num[data-target]');
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target; cio.unobserve(el);
        const target = +el.dataset.target; const prefix = el.dataset.prefix || '';
        const dur = 1500; const t0 = performance.now();
        const ease = t => 1 - Math.pow(1 - t, 3);
        (function step(now){
          const p = Math.min((now - t0) / dur, 1);
          const val = Math.round(target * ease(p));
          el.textContent = prefix + val.toLocaleString('es-PE');
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, {threshold:.4});
    nums.forEach(n => cio.observe(n));
  } else {
    nums.forEach(n => n.textContent = (n.dataset.prefix||'') + (+n.dataset.target).toLocaleString('es-PE'));
  }
})();

/* ---------- Carrusel del informe ---------- */
(function(){
  const deck = document.getElementById('reportDeck');
  if (!deck) return;

  const slides = [...deck.querySelectorAll('.deck-slide')];
  const prev = document.getElementById('deckPrev');
  const next = document.getElementById('deckNext');
  const dots = document.getElementById('deckDots');
  const current = document.getElementById('deckCurrent');
  const label = document.getElementById('deckLabel');
  let active = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
  let touchStartX = 0;
  let transitionTimer;

  slides.forEach((slide, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'deck-dot';
    dot.setAttribute('aria-label', `Ir a la diapositiva ${index + 1}: ${slide.dataset.title}`);
    dot.addEventListener('click', () => show(index));
    dots.appendChild(dot);
  });

  const dotButtons = [...dots.children];

  function show(index, focusSlide = false, animate = true){
    const nextIndex = (index + slides.length) % slides.length;
    const previousIndex = active;
    const moving = nextIndex !== previousIndex;
    const forward = previousIndex === slides.length - 1 && nextIndex === 0
      ? true
      : previousIndex === 0 && nextIndex === slides.length - 1
        ? false
        : nextIndex > previousIndex;

    clearTimeout(transitionTimer);
    slides.forEach(slide => slide.classList.remove('slide-from-left','slide-from-right','slide-to-left','slide-to-right'));

    if (animate && moving) {
      slides[nextIndex].classList.add(forward ? 'slide-from-right' : 'slide-from-left');
      void slides[nextIndex].offsetWidth;
      slides[previousIndex].classList.add(forward ? 'slide-to-left' : 'slide-to-right');
    }

    active = nextIndex;
    slides.forEach((slide, i) => {
      const selected = i === active;
      slide.classList.toggle('is-active', selected);
      slide.setAttribute('aria-hidden', String(!selected));
      if (selected) slide.scrollTop = 0;
      slide.querySelectorAll('a,button').forEach(control => {
        if (selected) control.removeAttribute('tabindex');
        else control.setAttribute('tabindex','-1');
      });
      dotButtons[i].setAttribute('aria-current', String(selected));
    });
    current.textContent = String(active + 1).padStart(2,'0');
    label.textContent = slides[active].dataset.title;
    if (focusSlide) deck.focus({preventScroll:true});

    if (moving) {
      transitionTimer = window.setTimeout(() => {
        slides.forEach(slide => slide.classList.remove('slide-from-left','slide-from-right','slide-to-left','slide-to-right'));
      }, 520);
    }
  }

  prev.addEventListener('click', () => show(active - 1));
  next.addEventListener('click', () => show(active + 1));

  if ('IntersectionObserver' in window) {
    const headerObserver = new IntersectionObserver(entries => {
      const entry = entries[0];
      document.body.classList.toggle('deck-focus', entry.isIntersecting && entry.intersectionRatio >= .32);
    }, {threshold:[0,.32,.6]});
    headerObserver.observe(deck);
  }

  deck.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(active - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(active + 1); }
    if (event.key === 'Home') { event.preventDefault(); show(0); }
    if (event.key === 'End') { event.preventDefault(); show(slides.length - 1); }
  });

  deck.addEventListener('touchstart', event => {
    touchStartX = event.changedTouches[0].clientX;
  }, {passive:true});
  deck.addEventListener('touchend', event => {
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) < 50) return;
    show(active + (distance < 0 ? 1 : -1));
  }, {passive:true});

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const id = link.getAttribute('href').slice(1);
      const index = slides.findIndex(slide => slide.id === id);
      if (index < 0) return;
      event.preventDefault();
      show(index);
      deck.scrollIntoView({behavior:'smooth', block:'center'});
      history.replaceState(null,'',`#${id}`);
    });
  });

  const initialHash = window.location.hash.slice(1);
  const initialIndex = slides.findIndex(slide => slide.id === initialHash);
  show(initialIndex >= 0 ? initialIndex : active, false, false);
})();

