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

  // La matriz EFE conserva su índice de factores como ayuda opcional. El resto
  // de las diapositivas muestra toda la información sin requerir interacción.
  const focusGroups = [
    { selector: '#slide-5 .efe-factor-list', items: ':scope > li', detail: 'p' }
  ];

  focusGroups.forEach(config => {
    document.querySelectorAll(config.selector).forEach(group => {
      group.classList.add('focus-group');
      const items = [...group.querySelectorAll(config.items)];
      items.forEach((item, index) => {
        const details = [...item.querySelectorAll(config.detail)];
        if (!details.length) return;
        item.classList.add('focus-item');
        details.forEach(detail => detail.classList.add('focus-detail'));
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
        item.setAttribute('aria-expanded', String(index === 0));
        if (index === 0) item.classList.add('is-focused');
        const select = () => {
          items.forEach(candidate => {
            candidate.classList.remove('is-focused');
            candidate.setAttribute('aria-expanded', 'false');
          });
          item.classList.add('is-focused');
          item.setAttribute('aria-expanded', 'true');
          item.dispatchEvent(new CustomEvent('focusitemchange', { bubbles: true }));
        };
        item.addEventListener('click', select);
        item.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            select();
          }
        });
      });
    });
  });

  // Lectura progresiva integrada: los datos secundarios permanecen dentro de
  // la composición y ya no dependen de una bandeja superpuesta.
  document.querySelectorAll('#slide-2 .context-strip-4, #slide-6 .chain-actions').forEach(group => {
    const items = [...group.children];
    group.classList.add('integrated-reveal');
    const select = selected => {
      items.forEach(item => {
        const activeItem = item === selected;
        item.classList.toggle('is-current', activeItem);
        item.setAttribute('aria-pressed', String(activeItem));
      });
    };
    items.forEach((item, index) => {
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-pressed', String(index === 0));
      if (index === 0) item.classList.add('is-current');
      item.addEventListener('click', () => select(item));
      item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select(item);
        }
      });
    });
  });

  // Piloto editorial: las filas EFE funcionan como un índice cartográfico.
  // La zona intermedia traduce el peso de cada factor y enlaza la selección
  // con una nota de sustento, evitando un vacío sin sumar otra diapositiva.
  document.querySelectorAll('#slide-5 .efe-factors-panel').forEach(panel => {
    const list = panel.querySelector('.efe-factor-list');
    const items = [...list.querySelectorAll(':scope > li')];
    if (!items.length) return;

    const factors = items.map((item, index) => {
      const title = item.querySelector('.factor-head b')?.textContent || '';
      const meta = item.querySelector('.factor-head span')?.textContent || '';
      item.dataset.factorIndex = String(index);
      return {
        code: title.split('·')[0].trim(),
        weight: Number(meta.match(/Peso\s+([0-9.]+)/i)?.[1] || 0)
      };
    });
    const maxWeight = Math.max(...factors.map(factor => factor.weight), 0.01);
    const distribution = document.createElement('section');
    distribution.className = 'efe-weight-map';
    distribution.setAttribute('aria-label', 'Distribución relativa del peso de los factores');
    distribution.innerHTML = `
      <div class="efe-weight-head">
        <span>Distribución del peso</span>
        <small>Índice relativo · máximo 0.15</small>
      </div>
      <div class="efe-weight-bars">
        ${factors.map((factor, index) => `
          <button class="efe-weight-row" type="button" data-factor-index="${index}" style="--weight:${(factor.weight / maxWeight) * 100}%" aria-label="Seleccionar ${factor.code}, peso ${factor.weight.toFixed(2)}">
            <b>${factor.code}</b><i aria-hidden="true"><em></em></i><span>${factor.weight.toFixed(2)}</span>
          </button>`).join('')}
      </div>`;

    const note = document.createElement('aside');
    note.className = 'efe-floating-note';
    note.setAttribute('aria-live', 'polite');
    const updateNote = item => {
      const title = item.querySelector('.factor-head b')?.textContent || '';
      const meta = item.querySelector('.factor-head span')?.textContent || '';
      const detail = item.querySelector('p')?.textContent || '';
      distribution.querySelectorAll('.efe-weight-row').forEach(row => {
        row.classList.toggle('is-active', row.dataset.factorIndex === item.dataset.factorIndex);
      });
      note.innerHTML = `<span>Detalle seleccionado</span><strong>${title}</strong><p>${detail}</p><small>${meta}</small>`;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && note.isConnected) {
        note.animate([
          { opacity: 0.25, transform: 'translateY(7px)', clipPath: 'inset(0 0 100% 0)' },
          { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0)' }
        ], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    };
    list.addEventListener('focusitemchange', event => updateNote(event.target));
    distribution.addEventListener('click', event => {
      const row = event.target.closest('.efe-weight-row');
      if (!row) return;
      items[Number(row.dataset.factorIndex)]?.click();
    });
    panel.append(distribution, note);
    updateNote(items[0]);
  });

  /* ========================================================
     CHART.JS SUBSYSTEM: Visualizaciones Estratégicas EPSEL
     ======================================================== */
  const THEME = {
    navy: '#002b5e',
    blue: '#0057b8',
    cyan: '#1fa2ff',
    pale: '#eaf6ff',
    yellow: '#f7b500',
    ink: '#0e2a47',
    muted: '#60758a',
    line: '#cbdde9',
    font: "'Manrope', 'Segoe UI', sans-serif"
  };

  const chartInstances = {};
  let peyeaCurrentMode = 'vector'; // 'vector' | 'radar'

  function getFont(size = 11, weight = 600) {
    return { family: THEME.font, size, weight };
  }

  /* --- 1. Matriz PEYEA (Slide 14) --- */
  const peyeaCartesianPlugin = {
    id: 'peyeaCartesianCustom',
    beforeDraw(chart) {
      if (chart.config.type !== 'scatter' && chart.config.type !== 'line') return;
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.x || !scales.y) return;
      const { left, right, top, bottom } = chartArea;
      const xZero = scales.x.getPixelForValue(0);
      const yZero = scales.y.getPixelForValue(0);

      ctx.save();
      // Cuadrante IV: Competitivo (x > 0, y < 0) - Destacado para EPSEL
      ctx.fillStyle = 'rgba(0, 87, 184, 0.09)';
      ctx.fillRect(xZero, yZero, right - xZero, bottom - yZero);

      // Cuadrantes restantes (tintes muy suaves)
      ctx.fillStyle = 'rgba(31, 162, 255, 0.025)'; // Agresivo (x > 0, y > 0)
      ctx.fillRect(xZero, top, right - xZero, yZero - top);
      ctx.fillStyle = 'rgba(96, 117, 138, 0.025)'; // Conservador (x < 0, y > 0)
      ctx.fillRect(left, top, xZero - left, yZero - top);
      ctx.fillStyle = 'rgba(247, 181, 0, 0.025)'; // Defensivo (x < 0, y < 0)
      ctx.fillRect(left, yZero, xZero - left, bottom - yZero);

      // Rótulos de los Cuadrantes
      ctx.font = '800 11px ' + THEME.font;
      ctx.textBaseline = 'top';

      ctx.textAlign = 'left';
      ctx.fillStyle = '#8199aa';
      ctx.fillText('CONSERVADOR', left + 12, top + 10);

      ctx.textAlign = 'right';
      ctx.fillText('AGRESIVO', right - 12, top + 10);

      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      ctx.fillText('DEFENSIVO', left + 12, bottom - 10);

      ctx.textAlign = 'right';
      ctx.fillStyle = THEME.blue;
      ctx.fillText('COMPETITIVO (EPSEL)', right - 12, bottom - 10);

      // Ejes y Títulos de dimensiones
      ctx.font = '700 9.5px ' + THEME.font;
      ctx.fillStyle = THEME.navy;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('▲ Fortaleza Financiera (+FF)', xZero, top + 22);

      ctx.textBaseline = 'top';
      ctx.fillText('▼ Estabilidad del Entorno (-EE)', xZero, bottom - 22);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('Fortaleza de la Industria (+FI) ►', right - 12, yZero - 12);

      ctx.textAlign = 'left';
      ctx.fillText('◄ Ventaja Competitiva (-VC)', left + 12, yZero - 12);

      ctx.restore();
    },
    afterDatasetsDraw(chart) {
      if (chart.config.type !== 'scatter' && chart.config.type !== 'line') return;
      const { ctx, scales } = chart;
      if (!scales.x || !scales.y) return;
      const x0 = scales.x.getPixelForValue(0);
      const y0 = scales.y.getPixelForValue(0);
      const x1 = scales.x.getPixelForValue(1.16);
      const y1 = scales.y.getPixelForValue(-2.00);

      ctx.save();
      // Sombra vectorial
      ctx.strokeStyle = 'rgba(0, 87, 184, 0.22)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      // Vector direccional principal
      ctx.strokeStyle = THEME.blue;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      // Flecha en extremo (+1.16, -2.00)
      const angle = Math.atan2(y1 - y0, x1 - x0);
      const arrowLen = 13;
      ctx.fillStyle = THEME.blue;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - arrowLen * Math.cos(angle - Math.PI / 6), y1 - arrowLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x1 - arrowLen * Math.cos(angle + Math.PI / 6), y1 - arrowLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      // Halo pulsante en el punto
      ctx.beginPath();
      ctx.arc(x1, y1, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(247, 181, 0, 0.24)';
      ctx.fill();

      // Punto EPSEL
      ctx.beginPath();
      ctx.arc(x1, y1, 7, 0, Math.PI * 2);
      ctx.fillStyle = THEME.yellow;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();

      // Centro del plano cartesiano (0,0)
      ctx.beginPath();
      ctx.arc(x0, y0, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = THEME.navy;
      ctx.fill();

      ctx.restore();
    }
  };

  function initPEYEAVector(canvas) {
    if (chartInstances.peyea) chartInstances.peyea.destroy();
    chartInstances.peyea = new Chart(canvas, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'EPSEL S.A.',
          data: [{ x: 1.16, y: -2.00 }],
          backgroundColor: THEME.yellow,
          borderColor: '#ffffff',
          borderWidth: 2,
          pointRadius: 8,
          pointHoverRadius: 11
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: THEME.navy,
            titleFont: getFont(12, 800),
            bodyFont: getFont(11, 600),
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              title: () => 'EPSEL S.A. · Coordenadas PEYEA',
              label: () => ['Vector (X: +1.16, Y: -2.00)', 'Cuadrante: COMPETITIVO', 'FI +4.83 · EE -4.33 · VC -3.67 · FF +2.33']
            }
          }
        },
        scales: {
          x: {
            min: -6,
            max: 6,
            grid: {
              color: ctx => ctx.tick.value === 0 ? THEME.navy : '#e1ecf3',
              lineWidth: ctx => ctx.tick.value === 0 ? 2 : 1
            },
            ticks: {
              stepSize: 2,
              font: getFont(9, 700),
              color: THEME.muted
            }
          },
          y: {
            min: -6,
            max: 6,
            grid: {
              color: ctx => ctx.tick.value === 0 ? THEME.navy : '#e1ecf3',
              lineWidth: ctx => ctx.tick.value === 0 ? 2 : 1
            },
            ticks: {
              stepSize: 2,
              font: getFont(9, 700),
              color: THEME.muted
            }
          }
        }
      },
      plugins: [peyeaCartesianPlugin]
    });
  }

  function initPEYEARadar(canvas) {
    if (chartInstances.peyea) chartInstances.peyea.destroy();
    chartInstances.peyea = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: [
          'Fortaleza Financiera (FF)',
          'Fortaleza de la Industria (FI)',
          'Ventaja Competitiva (|VC|)',
          'Estabilidad del Entorno (|EE|)'
        ],
        datasets: [{
          label: 'Puntaje EPSEL',
          data: [2.33, 4.83, 3.67, 4.33],
          backgroundColor: 'rgba(0, 87, 184, 0.18)',
          borderColor: THEME.blue,
          borderWidth: 2.5,
          pointBackgroundColor: THEME.yellow,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 750, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: THEME.navy,
            padding: 11,
            cornerRadius: 8,
            titleFont: getFont(12, 800),
            bodyFont: getFont(11, 600),
            callbacks: {
              label: ctx => `Puntaje: ${ctx.raw} / 6.00`
            }
          }
        },
        scales: {
          r: {
            min: 0,
            max: 6,
            ticks: { stepSize: 1.5, font: getFont(9, 600), color: THEME.muted, backdropColor: 'transparent' },
            grid: { color: '#dce8f0' },
            angleLines: { color: '#cbdde9' },
            pointLabels: {
              font: getFont(10.5, 700),
              color: THEME.navy
            }
          }
        }
      }
    });
  }

  // Controles de modo PEYEA (Vector vs Radar)
  const btnVector = document.getElementById('peyeaModeVector');
  const btnRadar = document.getElementById('peyeaModeRadar');
  if (btnVector && btnRadar) {
    btnVector.addEventListener('click', () => {
      if (peyeaCurrentMode === 'vector') return;
      peyeaCurrentMode = 'vector';
      btnVector.classList.add('is-active');
      btnVector.setAttribute('aria-selected', 'true');
      btnRadar.classList.remove('is-active');
      btnRadar.setAttribute('aria-selected', 'false');
      const canvas = document.getElementById('peyeaChart');
      if (canvas) initPEYEAVector(canvas);
    });
    btnRadar.addEventListener('click', () => {
      if (peyeaCurrentMode === 'radar') return;
      peyeaCurrentMode = 'radar';
      btnRadar.classList.add('is-active');
      btnRadar.setAttribute('aria-selected', 'true');
      btnVector.classList.remove('is-active');
      btnVector.setAttribute('aria-selected', 'false');
      const canvas = document.getElementById('peyeaChart');
      if (canvas) initPEYEARadar(canvas);
    });
  }

  /* --- 2. Matriz EFI (Slide 9) --- */
  const centerEFIPlugin = {
    id: 'centerEFIPlugin',
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 24px ' + THEME.font;
      ctx.fillStyle = THEME.navy;
      ctx.fillText('2.82', cx, cy - 8);
      ctx.font = '700 10.5px ' + THEME.font;
      ctx.fillStyle = THEME.blue;
      ctx.fillText('PUNTAJE EFI', cx, cy + 12);
      ctx.font = '600 9px ' + THEME.font;
      ctx.fillStyle = THEME.muted;
      ctx.fillText('Capacidad Interna', cx, cy + 24);
      ctx.restore();
    }
  };

  function initEFIChart(canvas) {
    if (chartInstances.efi) chartInstances.efi.destroy();
    chartInstances.efi = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: [
          'Infraestructura (Tinajones y PTAP)',
          'Cobertura territorial (4 zonas)',
          'Experiencia y alianzas sectoriales',
          'Atención restringida a dos días',
          'Reclamos que superan 90 días',
          'Régimen OTASS y control en proceso'
        ],
        datasets: [{
          data: [0.60, 0.40, 1.25, 0.22, 0.20, 0.15],
          backgroundColor: [
            '#0057b8', // F1
            '#1fa2ff', // F2
            '#002b5e', // F3
            '#f7b500', // D1
            '#ff7043', // D2
            '#8d6e63'  // D3
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: THEME.navy,
            padding: 10,
            cornerRadius: 8,
            titleFont: getFont(11.5, 800),
            bodyFont: getFont(10.5, 600),
            callbacks: {
              label: ctx => `Peso ponderado: ${ctx.raw.toFixed(2)} (${ctx.dataIndex < 3 ? 'Fortaleza' : 'Debilidad'})`
            }
          }
        }
      },
      plugins: [centerEFIPlugin]
    });
  }

  /* --- 3. Síntesis Diagnóstica: ANF & Balance Estratégico (Slide 10) --- */
  const centerANFPlugin = {
    id: 'centerANFPlugin',
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 20px ' + THEME.font;
      ctx.fillStyle = THEME.yellow;
      ctx.fillText('51.10%', cx, cy - 6);
      ctx.font = '700 9px ' + THEME.font;
      ctx.fillStyle = THEME.navy;
      ctx.fillText('PÉRDIDA', cx, cy + 12);
      ctx.restore();
    }
  };

  function initANFChart(canvas) {
    if (chartInstances.anf) chartInstances.anf.destroy();
    chartInstances.anf = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Agua No Facturada (Pérdida)', 'Agua Facturada'],
        datasets: [{
          data: [51.10, 48.90],
          backgroundColor: [THEME.yellow, THEME.blue],
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        animation: { duration: 750, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: THEME.navy,
            padding: 10,
            cornerRadius: 8,
            titleFont: getFont(11.5, 800),
            bodyFont: getFont(10.5, 600),
            callbacks: {
              label: ctx => `Proporción: ${ctx.raw}%`
            }
          }
        }
      },
      plugins: [centerANFPlugin]
    });
  }

  const balanceReferenceLine = {
    id: 'balanceRefLine',
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.y) return;
      const yVal = scales.y.getPixelForValue(2.50);
      ctx.save();
      ctx.strokeStyle = THEME.navy;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(chartArea.left, yVal);
      ctx.lineTo(chartArea.right, yVal);
      ctx.stroke();

      ctx.fillStyle = THEME.navy;
      ctx.font = '700 9px ' + THEME.font;
      ctx.textAlign = 'right';
      ctx.fillText('Media: 2.50', chartArea.right, yVal - 4);
      ctx.restore();
    }
  };

  function initBalanceChart(canvas) {
    if (chartInstances.balance) chartInstances.balance.destroy();
    chartInstances.balance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['EFE (Externa)', 'Referencia', 'EFI (Interna)'],
        datasets: [{
          data: [2.15, 2.50, 2.82],
          backgroundColor: [THEME.yellow, '#cbdde9', THEME.blue],
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 750, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: THEME.navy,
            padding: 10,
            cornerRadius: 8,
            titleFont: getFont(11.5, 800),
            bodyFont: getFont(10.5, 600),
            callbacks: {
              label: ctx => `Puntaje: ${ctx.raw} (${ctx.raw < 2.5 ? 'Por debajo' : ctx.raw === 2.5 ? 'Neutro' : 'Por encima'})`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: getFont(10, 700), color: THEME.navy }
          },
          y: {
            min: 0,
            max: 4.0,
            grid: { color: '#e7f0f6' },
            ticks: { stepSize: 1.0, font: getFont(9, 600), color: THEME.muted }
          }
        }
      },
      plugins: [balanceReferenceLine]
    });
  }

  /* --- 4. Matriz EFE (Slide 5) --- */
  const efeReferenceLine = {
    id: 'efeRefLine',
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.x) return;
      const xVal = scales.x.getPixelForValue(2.50);
      ctx.save();
      ctx.strokeStyle = THEME.blue;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xVal, chartArea.top);
      ctx.lineTo(xVal, chartArea.bottom);
      ctx.stroke();

      ctx.fillStyle = THEME.blue;
      ctx.font = '800 9.5px ' + THEME.font;
      ctx.textAlign = 'center';
      ctx.fillText('▲ Media 2.50', xVal, chartArea.top - 4);
      ctx.restore();
    }
  };

  function initEFEChart(canvas) {
    if (chartInstances.efe) chartInstances.efe.destroy();
    chartInstances.efe = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Puntaje EFE'],
        datasets: [{
          label: 'EFE EPSEL',
          data: [2.15],
          backgroundColor: THEME.yellow,
          borderRadius: 6,
          barThickness: 26
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 750, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: THEME.navy,
            padding: 10,
            cornerRadius: 8,
            titleFont: getFont(11.5, 800),
            bodyFont: getFont(10.5, 600),
            callbacks: {
              label: () => 'EFE: 2.15 · Respuesta débil ante el entorno'
            }
          }
        },
        scales: {
          x: {
            min: 1.0,
            max: 4.0,
            grid: { color: '#e3eef5' },
            ticks: {
              stepSize: 0.5,
              font: getFont(9, 600),
              color: THEME.muted
            }
          },
          y: {
            display: false
          }
        }
      },
      plugins: [efeReferenceLine]
    });
  }

  /* --- Orquestador de Gráficos al cambiar de Diapositiva --- */
  function updateChartsForSlide(slideIndex) {
    if (typeof Chart === 'undefined') return;

    // Slide 5 (index 4): Matriz EFE
    if (slideIndex === 4) {
      const canvas = document.getElementById('efeChart');
      if (canvas) {
        if (!chartInstances.efe) initEFEChart(canvas);
        else { chartInstances.efe.resize(); chartInstances.efe.reset(); chartInstances.efe.update(); }
      }
    }

    // Slide 9 (index 8): Matriz EFI
    if (slideIndex === 8) {
      const canvas = document.getElementById('efiChart');
      if (canvas) {
        if (!chartInstances.efi) initEFIChart(canvas);
        else { chartInstances.efi.resize(); chartInstances.efi.reset(); chartInstances.efi.update(); }
      }
    }

    // Slide 10 (index 9): Síntesis Diagnóstica
    if (slideIndex === 9) {
      const anfCanvas = document.getElementById('anfChart');
      const balanceCanvas = document.getElementById('balanceChart');
      if (anfCanvas) {
        if (!chartInstances.anf) initANFChart(anfCanvas);
        else { chartInstances.anf.resize(); chartInstances.anf.reset(); chartInstances.anf.update(); }
      }
      if (balanceCanvas) {
        if (!chartInstances.balance) initBalanceChart(balanceCanvas);
        else { chartInstances.balance.resize(); chartInstances.balance.reset(); chartInstances.balance.update(); }
      }
    }

    // Slide 14 (index 13): Matriz PEYEA
    if (slideIndex === 13) {
      const canvas = document.getElementById('peyeaChart');
      if (canvas) {
        if (!chartInstances.peyea) {
          if (peyeaCurrentMode === 'vector') initPEYEAVector(canvas);
          else initPEYEARadar(canvas);
        } else {
          chartInstances.peyea.resize();
          chartInstances.peyea.reset();
          chartInstances.peyea.update();
        }
      }
    }
  }

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

    // Activar o animar gráficos Chart.js para la diapositiva actual
    window.requestAnimationFrame(() => updateChartsForSlide(active));
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
    // Redimensionar gráficos al cambiar a pantalla completa
    setTimeout(() => updateChartsForSlide(active), 150);
  });

  window.addEventListener('resize', () => {
    updateChartsForSlide(active);
  });

  window.addEventListener('hashchange', () => {
    const target = Number(location.hash.replace('#slide-', ''));
    if (Number.isInteger(target) && target >= 1 && target <= slides.length) show(target - 1);
  });

  const requested = Number(location.hash.replace('#slide-', ''));
  show(Number.isInteger(requested) && requested >= 1 && requested <= slides.length ? requested - 1 : active);
})();
