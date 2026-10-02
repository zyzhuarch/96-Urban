(() => {
  const screen = document.getElementById('loadingScreen');
  if (!screen) return;

  const body = document.body;
  const percentLabel = document.getElementById('loadingPercent');
  const caption = document.getElementById('loadingCaption');
  const content = document.getElementById('loadingContent');
  const chineseWordmark = screen.querySelector('.loading-wordmark strong');
  const englishWordmark = screen.querySelector('.loading-wordmark span');
  const headerChineseWordmark = document.querySelector('.brand-wordmark strong');
  const headerEnglishWordmark = document.querySelector('.brand-english');
  const pieces = [...screen.querySelectorAll('.loading-mark-piece')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const startTime = performance.now();
  const minimumDisplay = reducedMotion ? 80 : 1650;
  const fadeDistance = 430;
  let progress = 0;
  let fadeProgress = 0;
  let gateActive = false;
  let gateReady = false;
  let gateFinishing = false;
  let pageHasMoved = false;
  let touchY = null;
  let gateReadyTimer = 0;
  let gateFinishTimer = 0;

  pieces.forEach((piece, index) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 38 + Math.random() * 34;
    const x = Math.round(Math.cos(angle) * distance);
    const y = Math.round(Math.sin(angle) * distance);
    const rotation = Math.round((Math.random() * 2 - 1) * 150);
    piece.style.setProperty('--fly-x', x + 'vw');
    piece.style.setProperty('--fly-y', y + 'vh');
    piece.style.setProperty('--fly-r', rotation + 'deg');
    piece.style.transitionDelay = (index * 150) + 'ms';
  });
  pieces.forEach((piece) => piece.getBoundingClientRect());
  requestAnimationFrame(() => screen.classList.add('is-arriving'));

  function setThemeColor(color) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }

  function textWidth(node) {
    if (!node) return 0;
    const range = document.createRange();
    range.selectNodeContents(node);
    const width = range.getBoundingClientRect().width;
    range.detach?.();
    return width;
  }

  function fitWordmarkPair(chinese, english) {
    if (!chinese || !english) return;
    english.style.removeProperty('font-size');

    const targetWidth = textWidth(chinese);
    const sourceWidth = textWidth(english);
    const naturalFontSize = parseFloat(getComputedStyle(english).fontSize);

    if (targetWidth > 0 && sourceWidth > 0 && Number.isFinite(naturalFontSize)) {
      english.style.fontSize = `${naturalFontSize * targetWidth / sourceWidth}px`;
    }
  }

  function fitEnglishWordmark() {
    fitWordmarkPair(chineseWordmark, englishWordmark);
    fitWordmarkPair(headerChineseWordmark, headerEnglishWordmark);
  }

  function imageReady(image) {
    if (image.complete) return Promise.resolve();
    return new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    });
  }

  const pageReady = Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    ...[...document.images].map(imageReady),
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }))
  ]);

  function paintProgress(value) {
    progress = Math.max(progress, Math.min(100, Math.round(value)));
    percentLabel.textContent = progress + '%';
  }
  paintProgress(0);

  function progressLoop(now) {
    if (progress >= 94) return;
    const elapsed = now - startTime;
    paintProgress(Math.min(94, (elapsed / minimumDisplay) * 94));
    if (progress < 94) requestAnimationFrame(progressLoop);
  }
  requestAnimationFrame(progressLoop);

  function activateGate() {
    window.clearTimeout(gateReadyTimer);
    window.clearTimeout(gateFinishTimer);
    gateActive = true;
    gateReady = false;
    gateFinishing = false;
    fadeProgress = 0;
    body.classList.add('loading-gated');
    screen.style.visibility = 'visible';
    screen.style.setProperty('--loading-opacity', '1');
    content.style.opacity = '1';
    content.style.transform = 'translateY(0) scale(1)';
    setThemeColor('#D8901D');
    fitEnglishWordmark();
    gateReadyTimer = window.setTimeout(() => {
      if (gateActive && !gateFinishing) gateReady = true;
    }, reducedMotion ? 40 : 900);
  }

  function finishGateAfterFade() {
    gateFinishing = true;
    gateReady = false;
    gateFinishTimer = window.setTimeout(() => {
      screen.style.visibility = 'hidden';
      body.classList.remove('loading-gated');
      gateActive = false;
      gateFinishing = false;
      fadeProgress = 0;
      setThemeColor('#E9E8DF');
    }, reducedMotion ? 40 : 900);
  }

  function updateGateFade(delta) {
    if (!gateReady || gateFinishing) return;
    fadeProgress = Math.min(1, Math.max(0, fadeProgress + delta / fadeDistance));
    screen.style.setProperty('--loading-opacity', String(1 - fadeProgress));
    content.style.opacity = String(1 - Math.min(1, fadeProgress * 1.3));
    content.style.transform = 'translateY(' + (-24 * fadeProgress) + 'px) scale(' + (1 - fadeProgress * 0.025) + ')';
    if (fadeProgress >= 1) finishGateAfterFade();
  }

  const minimumWait = new Promise((resolve) => window.setTimeout(resolve, minimumDisplay));
  Promise.all([pageReady, minimumWait]).then(() => {
    paintProgress(100);
    screen.classList.add('is-complete');
    body.classList.add('loading-complete');
    caption.textContent = '向下捲動，進入首頁';
    screen.setAttribute('aria-label', '用九六都市更新網站載入完成，向下捲動進入首頁');
    activateGate();

    window.setTimeout(() => {
      body.classList.remove('is-loading');
      screen.setAttribute('aria-hidden', 'true');
      screen.removeAttribute('role');
      screen.removeAttribute('aria-live');
    }, reducedMotion ? 20 : 900);
  });

  window.addEventListener('resize', fitEnglishWordmark, { passive: true });

  window.addEventListener('wheel', (event) => {
    if (!gateActive || event.ctrlKey) return;
    event.preventDefault();
    if (!gateReady || gateFinishing) return;
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    updateGateFade(event.deltaY * scale);
  }, { passive: false });

  window.addEventListener('touchstart', (event) => {
    touchY = event.touches[0]?.clientY ?? null;
  }, { passive: true });

  window.addEventListener('touchmove', (event) => {
    if (!gateActive) return;
    event.preventDefault();
    const currentY = event.touches[0]?.clientY;
    if (currentY == null) return;
    if (touchY != null) updateGateFade(touchY - currentY);
    touchY = currentY;
  }, { passive: false });

  window.addEventListener('touchend', () => { touchY = null; }, { passive: true });
  window.addEventListener('touchcancel', () => { touchY = null; }, { passive: true });

  window.addEventListener('keydown', (event) => {
    if (!gateActive) return;
    const forward = ['ArrowDown', 'PageDown', 'End'].includes(event.key) || event.code === 'Space' && !event.shiftKey;
    const backward = ['ArrowUp', 'PageUp', 'Home'].includes(event.key) || event.code === 'Space' && event.shiftKey;
    if (!forward && !backward) return;
    event.preventDefault();
    updateGateFade(forward ? 150 : -150);
  });

  window.addEventListener('scroll', () => {
    if (gateActive || !body.classList.contains('loading-complete')) return;
    if (window.scrollY > 8) {
      pageHasMoved = true;
      return;
    }
    if (pageHasMoved && window.scrollY <= 1) {
      pageHasMoved = false;
      activateGate();
    }
  }, { passive: true });
})();
(() => {
  const story = document.querySelector('.story');
  const storySteps = [...document.querySelectorAll('.story-step')];
  const dots = [...document.querySelectorAll('.stage-dots li')];
  const stageCurrent = document.getElementById('stageCurrent');
  const header = document.querySelector('.site-header');
  const navToggle = header.querySelector('.nav-toggle');
  const mainNavigation = header.querySelector('#primaryNavigation');
  if (navToggle && mainNavigation) {
    const mobileNavigation = window.matchMedia('(max-width: 850px)');
    const fitMenuEnglish = () => {
      const chinese = mainNavigation.querySelector('.mobile-menu-brand strong');
      const english = mainNavigation.querySelector('.mobile-menu-brand .h7');
      if (!chinese || !english || !mobileNavigation.matches || !mainNavigation.classList.contains('is-open')) return;
      english.style.removeProperty('font-size');

      const measure = (node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const width = range.getBoundingClientRect().width;
        range.detach?.();
        return width;
      };
      const chineseWidth = measure(chinese);
      const englishWidth = measure(english);
      const naturalFontSize = parseFloat(getComputedStyle(english).fontSize);
      if (chineseWidth > 0 && englishWidth > 0 && Number.isFinite(naturalFontSize)) {
        english.style.fontSize = `${naturalFontSize * chineseWidth / englishWidth}px`;
      }
    };
    const setMenuOpen = (open, restoreFocus = false) => {
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? '關閉導覽選單' : '開啟導覽選單');
      mainNavigation.classList.toggle('is-open', open);
      if (open) fitMenuEnglish();
      if (!open && restoreFocus && mobileNavigation.matches) navToggle.focus({ preventScroll: true });
    };

    window.addEventListener('resize', () => {
      if (mainNavigation.classList.contains('is-open')) fitMenuEnglish();
    }, { passive: true });
    navToggle.addEventListener('click', () => {
      setMenuOpen(navToggle.getAttribute('aria-expanded') !== 'true');
    });
    mainNavigation.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenuOpen(false, true));
    });
    header.querySelector('.brand')?.addEventListener('click', () => setMenuOpen(false));
    document.addEventListener('click', (event) => {
      if (!header.contains(event.target)) setMenuOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false, true);
      }
    });
    mobileNavigation.addEventListener('change', (event) => {
      if (!event.matches) setMenuOpen(false);
    });
  }

  function setStage(stage) {
    story.dataset.activeStage = stage;
    stageCurrent.textContent = String(stage + 1).padStart(2, '0');
    storySteps.forEach((step, index) => step.classList.toggle('is-active', index === stage));
    dots.forEach((dot, index) => dot.classList.toggle('is-active', index === stage));
  }

  const stageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setStage(Number(entry.target.dataset.stage));
    });
  }, { rootMargin: '-37% 0px -37% 0px', threshold: 0.01 });
  storySteps.forEach((step) => stageObserver.observe(step));

  function updateHeader() {
    header.classList.toggle('is-scrolled', window.scrollY > 18);
  }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const projectList = document.getElementById('projectList');
  const projectMapElement = document.getElementById('projectMap');
  const mapContainer = document.querySelector('.footprint-map');
  const mapFallback = document.getElementById('mapFallback');
  const filterButtons = [...document.querySelectorAll('.filter-button')];
  const reducedMapMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compactMap = window.matchMedia('(max-width: 850px)');
  const taipeiBounds = [[121.40, 24.95], [121.69, 25.22]];
  let activeFilter = 'all';
  let selectedProject = null;
  let projectMap = null;
  let mapReady = false;

  const statusLabel = { integrating: '整合中', completed: '已完成' };
  const filteredProjects = () => window.projectData.filter((project) => activeFilter === 'all' || project.status === activeFilter);
  const isProjectVisible = (project) => activeFilter === 'all' || project.status === activeFilter;

  function mapZoomLimits() {
    return compactMap.matches
      ? { zoom: 12.55, minZoom: 12.25, maxZoom: 12.85 }
      : { zoom: 13, minZoom: 12.75, maxZoom: 13.18 };
  }

  function mapProjectData() {
    return {
      type: 'FeatureCollection',
      features: window.projectData.map((project) => ({
        type: 'Feature',
        properties: {
          id: project.id,
          status: project.status,
          visible: isProjectVisible(project),
          selected: project.id === selectedProject
        },
        geometry: { type: 'Point', coordinates: project.coordinates }
      }))
    };
  }

  function showMapFallback(message) {
    mapContainer?.classList.add('is-map-unavailable');
    if (mapFallback) mapFallback.textContent = message;
  }

  function updateMapProjects() {
    const source = projectMap?.getSource('projects');
    if (mapReady && source) source.setData(mapProjectData());
  }

  function focusProject(projectId, immediate = false) {
    const project = window.projectData.find((item) => item.id === projectId);
    if (!project || !projectMap || !mapReady) return;

    const { zoom } = mapZoomLimits();
    projectMap.flyTo({
      center: project.coordinates,
      zoom,
      bearing: 0,
      pitch: 0,
      duration: immediate || reducedMapMotion.matches ? 0 : 1100,
      essential: true
    });
  }

  function selectProject(projectId, options = {}) {
    selectedProject = projectId;
    projectList?.querySelectorAll('[data-project-id]').forEach((item) => {
      item.classList.toggle('is-selected', item.dataset.projectId === projectId);
    });
    updateMapProjects();
    if (options.focus !== false) focusProject(projectId);
  }

  function renderProjects() {
    const projects = filteredProjects();
    if (!projects.some((project) => project.id === selectedProject)) {
      selectedProject = projects[0]?.id ?? null;
    }

    projectList.innerHTML = projects.map((project) => `
      <button class="project-card ${project.id === selectedProject ? 'is-selected' : ''}" type="button" data-project-id="${project.id}" data-status="${project.status}">
        <span class="status" aria-hidden="true"></span>
        <span><strong>${project.name}</strong><small>${project.location} ｜ ${statusLabel[project.status]}</small></span>
        <span class="arrow" aria-hidden="true">↗</span>
        <p class="summary">${project.summary}</p>
      </button>
    `).join('');

    projectList.querySelectorAll('[data-project-id]').forEach((item) => {
      item.addEventListener('click', () => selectProject(item.dataset.projectId));
    });

    updateMapProjects();
  }

  async function loadTaipeiStyle() {
   const response = await fetch('./mapcolor.json');

    if (!response.ok) {
    throw new Error(`無法載入 mapcolor.json：HTTP ${response.status}`);
    }

    const style = await response.json();

    style.sources = {
      ...style.sources,
      openmaptiles: {
       type: 'vector',
       url: 'https://tiles.openfreemap.org/planet'
      }
    };

    style.sprite = 'https://tiles.openfreemap.org/sprites/ofm_f384/ofm';
    style.glyphs = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

    return style;
  }

  async function initializeProjectMap() {
  if (!projectMapElement || !window.maplibregl) {
    showMapFallback('地圖目前無法載入，請從右側查看基地區域。');
    return;
  }

  const firstProject =
    window.projectData.find(isProjectVisible) || window.projectData[0];

  if (!firstProject) {
    showMapFallback('目前沒有可顯示的基地資料。');
    return;
  }

  const limits = mapZoomLimits();

  try {
    // 載入 mapcolor.json
    const mapStyle = await loadTaipeiStyle();

    projectMap = new window.maplibregl.Map({
      container: projectMapElement,

      // ★ 使用 mapcolor.json
      style: mapStyle,

      // ★ 保留你原本的台北地圖定位
      center: firstProject.coordinates,
      zoom: limits.zoom,
      minZoom: limits.minZoom,
      maxZoom: limits.maxZoom,
      maxBounds: taipeiBounds,

      bearing: 0,
      pitch: 0,
      renderWorldCopies: false,

      attributionControl: true,

      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,

      scrollZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false
    });
  } catch (error) {
    console.error('Map style 載入失敗：', error);

    showMapFallback(
      '地圖目前無法載入，請從右側查看基地區域。'
    );

    return;
  }

  projectMap.dragRotate.disable();
  projectMap.touchZoomRotate.disableRotation();

  projectMap.on('load', () => {
    mapReady = true;

    mapContainer?.classList.add('is-map-ready');
    mapFallback?.setAttribute('aria-hidden', 'true');

    projectMap
      .getCanvas()
      .setAttribute(
        'aria-label',
        '台北市基地區域地圖；僅顯示行政區邊界、主要道路、河流與概念基地位置。'
      );

    // ==========================================
    // 你的基地資料
    // ==========================================

    projectMap.addSource('projects', {
      type: 'geojson',
      data: mapProjectData()
    });

    // 選中的基地光暈
    projectMap.addLayer({
      id: 'project-selected-halo',
      type: 'circle',
      source: 'projects',

      filter: [
        'all',
        ['==', ['get', 'visible'], true],
        ['==', ['get', 'selected'], true]
      ],

      paint: {
        'circle-radius': 13,
        'circle-color': '#156082',
        'circle-opacity': 0.17
      }
    });

    // 整合中
    projectMap.addLayer({
      id: 'project-points-integrating',
      type: 'circle',
      source: 'projects',

      filter: [
        'all',
        ['==', ['get', 'visible'], true],
        ['==', ['get', 'status'], 'integrating']
      ],

      paint: {
        'circle-radius': 6,
        'circle-color': '#156082',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fffefa'
      }
    });

    // 已完成
    projectMap.addLayer({
      id: 'project-points-completed',
      type: 'circle',
      source: 'projects',

      filter: [
        'all',
        ['==', ['get', 'visible'], true],
        ['==', ['get', 'status'], 'completed']
      ],

      paint: {
        'circle-radius': 6,
        'circle-color': '#929000',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fffefa'
      }
    });

    // ==========================================
    // 基地點擊
    // ==========================================

    [
      'project-points-integrating',
      'project-points-completed'
    ].forEach((layerId) => {
      projectMap.on('click', layerId, (event) => {
        const id = event.features?.[0]?.properties?.id;

        if (id) {
          selectProject(id);
        }
      });

      projectMap.on('mouseenter', layerId, () => {
        projectMap.getCanvas().style.cursor = 'pointer';
      });

      projectMap.on('mouseleave', layerId, () => {
        projectMap.getCanvas().style.cursor = '';
      });
    });

    updateMapProjects();

    if (selectedProject) {
      focusProject(selectedProject, true);
    }
  });

  projectMap.on('error', (event) => {
    console.error('MapLibre error：', event);

    if (!mapReady) {
      showMapFallback(
        '地圖目前無法載入，請從右側查看基地區域。'
      );
    }
  });
}

  compactMap.addEventListener('change', () => {
    if (!projectMap) return;
    const limits = mapZoomLimits();
    projectMap.setMinZoom(limits.minZoom);
    projectMap.setMaxZoom(limits.maxZoom);
    if (mapReady && selectedProject) focusProject(selectedProject, true);
  });

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      renderProjects();
      if (selectedProject) focusProject(selectedProject);
    });
  });
  renderProjects();
  initializeProjectMap();
  const contactForm = document.getElementById('contactForm');
  const formFeedback = document.getElementById('formFeedback');
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    formFeedback.classList.remove('is-error');
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      formFeedback.textContent = '請先完成必填欄位與個資使用同意。';
      formFeedback.classList.add('is-error');
      return;
    }
    formFeedback.textContent = '概念版已完成送出流程示範。正式串接私有後台後將顯示：「已收到您的訊息。用九六將於合適時間與您聯繫。」';
    contactForm.reset();
  });
})();


