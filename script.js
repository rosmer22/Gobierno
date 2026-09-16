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

