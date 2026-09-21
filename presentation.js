(() => {
  const deck = document.getElementById('reportDeck');
  if (!deck) return;

  const slides = [...deck.querySelectorAll('.slide')];
  const nav = document.getElementById('slideNav');
  const prev = document.getElementById('deckPrev');
  const next = document.getElementById('deckNext');
  const current = document.getElementById('deckCurrent');
  const label = document.getElementById('deckLabel');
  const progress = document.getElementById('deckProgress');
  const fullscreen = document.getElementById('fullscreenBtn');
  const reportSourceLink = document.getElementById('reportSourceLink');
  const reportSourceLabel = document.getElementById('reportSourceLabel');
  const indexPane = nav.closest('.slide-index');
  let active = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
  let touchStartX = 0;

  const formatNumber = value => String(value + 1).padStart(2, '0');

  slides.forEach((slide, index) => {
    slide.setAttribute('aria-hidden', String(index !== active));
    const source = slide.querySelector('.slide-source');
    if (source) {
      const sourceLabel = source.textContent.trim();
      source.dataset.label = sourceLabel;
      source.innerHTML = `<svg aria-hidden="true"><use href="#i-file"></use></svg><span>${sourceLabel}</span>`;
      source.setAttribute('aria-label', `Abrir ${sourceLabel} en el informe PDF`);
    }
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<span>${formatNumber(index)}</span><span>${slide.dataset.title}</span>`;
    button.setAttribute('aria-label', `Ir a la diapositiva ${index + 1}: ${slide.dataset.title}`);
    button.addEventListener('click', () => show(index, true));
    item.append(button);
    nav.append(item);
  });

  const navButtons = [...nav.querySelectorAll('button')];

  function show(index, updateHash = false) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, position) => {
      slide.classList.toggle('is-active', position === active);
      slide.classList.toggle('is-before', position < active);
      slide.setAttribute('aria-hidden', String(position !== active));
      slide.querySelectorAll('a,button').forEach(control => {
        control.tabIndex = position === active ? 0 : -1;
      });
    });
    navButtons.forEach((button, position) => {
      if (position === active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    current.textContent = formatNumber(active);
    label.textContent = slides[active].dataset.title;
    progress.style.width = `${((active + 1) / slides.length) * 100}%`;
    const slideSource = slides[active].querySelector('.slide-source');
    if (reportSourceLink && reportSourceLabel) {
      if (slideSource) {
        const compactLabel = slideSource.dataset.label
          .replace(/^Informe\s*·\s*/i, '')
          .replace(/^Síntesis del informe$/i, 'p. 56');
        reportSourceLink.href = slideSource.href;
        reportSourceLabel.textContent = `Ver fuente · ${compactLabel}`;
        reportSourceLink.setAttribute('aria-label', `Abrir ${slideSource.dataset.label} en el PDF`);
      } else {
        reportSourceLink.href = 'docs/Informe_Actividad_1_Formulacion_Estrategica.pdf';
        reportSourceLabel.textContent = 'Ver informe';
        reportSourceLink.setAttribute('aria-label', 'Abrir el informe PDF completo');
      }
    }
    slides[active].scrollTop = 0;
    slides[active].scrollLeft = 0;
    const activeButton = navButtons[active];
    if (indexPane) {
      const buttonTop = activeButton.offsetTop;
      const buttonBottom = buttonTop + activeButton.offsetHeight;
      if (buttonTop < indexPane.scrollTop) indexPane.scrollTop = buttonTop;
      else if (buttonBottom > indexPane.scrollTop + indexPane.clientHeight) {
        indexPane.scrollTop = buttonBottom - indexPane.clientHeight;
      }
    }
    if (updateHash) history.replaceState(null, '', `#slide-${active + 1}`);
  }

  prev.addEventListener('click', () => show(active - 1, true));
  next.addEventListener('click', () => show(active + 1, true));
  deck.addEventListener('keydown', event => {
    if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); show(active + 1, true); }
    if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); show(active - 1, true); }
    if (event.key === 'Home') { event.preventDefault(); show(0, true); }
    if (event.key === 'End') { event.preventDefault(); show(slides.length - 1, true); }
  });
  deck.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; }, {passive: true});
  deck.addEventListener('touchend', event => {
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 55) show(active + (delta < 0 ? 1 : -1), true);
  }, {passive: true});

  fullscreen.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {
      document.body.classList.toggle('is-fullscreen');
    }
  });
  document.addEventListener('fullscreenchange', () => {
    document.body.classList.toggle('is-fullscreen', Boolean(document.fullscreenElement));
  });

  window.addEventListener('hashchange', () => {
    const target = Number(location.hash.replace('#slide-', ''));
    if (Number.isInteger(target) && target >= 1 && target <= slides.length) show(target - 1);
  });

  const requested = Number(location.hash.replace('#slide-', ''));
  show(Number.isInteger(requested) && requested >= 1 && requested <= slides.length ? requested - 1 : active);
})();
