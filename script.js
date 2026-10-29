const flavors = [
  { id: 'original', name: 'Original', image: 'assets/cup-original.webp', price: 5.80, alt: 'Original iced coffee in a clear cup' },
  { id: 'mocha', name: 'Mocha', image: 'assets/cup-mocha.webp', price: 6.20, alt: 'Iced mocha coffee in a clear cup' },
  { id: 'caramel', name: 'Salted Caramel', image: 'assets/cup-caramel.webp', price: 6.40, alt: 'Salted caramel iced coffee in a clear cup' },
  { id: 'vanilla', name: 'Vanilla Cream', image: 'assets/cup-vanilla.webp', price: 6.20, alt: 'Vanilla cream cold brew in a clear cup' },
  { id: 'hazelnut', name: 'Toasted Hazelnut', image: 'assets/cup-hazelnut.webp', price: 6.50, alt: 'Toasted hazelnut iced latte in a clear cup' },
  { id: 'coconut', name: 'Coconut Cream', image: 'assets/cup-coconut.webp', price: 6.50, alt: 'Coconut cream cold brew in a clear cup' }
];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const cards = [...document.querySelectorAll('.ingredient-card')];
const orbit = document.querySelector('.ingredient-cards');
const scene = document.querySelector('.showcase');
const previousButton = document.querySelector('#previous-flavor');
const nextButton = document.querySelector('#next-flavor');
const cupStage = document.querySelector('.cup-stage');
const flavorName = document.querySelector('#flavor-name');
const price = document.querySelector('#price');
const addButton = document.querySelector('#add-button');
const count = document.querySelector('#selection-count');
const announcement = document.querySelector('#selection-announcement');
const toast = document.querySelector('#toast');
const bagCount = document.querySelector('.bag-count');
const bagItems = document.querySelector('#bag-items');
const bag = new Map();
const motion = window.gsap;
const bagSummary = document.querySelector('#bag-summary');
const bagSubtotal = document.querySelector('#bag-subtotal');
const bagStatus = document.querySelector('#bag-status');
let activeFlavor = flavors[0];
let activeCup = document.querySelector('#cup-image');
let selectionVersion = 0;
let requestedFlavor = activeFlavor.id;
let cupTimeline;
let toastTimer;
activeCup.dataset.cupFlavor = activeFlavor.id;

// Decode before a card crosses center, so an image-loading promise cannot miss
// the centered frame during continuous scrolling.
const cupAssets = new Map(flavors.map(flavor => {
  const image = flavor.id === activeFlavor.id ? activeCup : new Image();
  image.src = flavor.image;
  image.alt = flavor.alt;
  image.width = 640;
  image.height = 960;
  image.classList.add('cup-image');
  image.dataset.cupFlavor = flavor.id;
  const asset = { image, ready: false, loaded: null };
  asset.loaded = image.decode().then(() => { asset.ready = true; return true; }, () => false);
  return [flavor.id, asset];
}));

// The entrance and flavor changes share one animation owner. Interrupting the
// entrance preserves its current pose rather than restarting a CSS animation.
activeCup.classList.remove('cup-image-initial');
if (motion && !reducedMotion.matches) {
  cupStage.classList.add('is-cup-transitioning');
  cupTimeline = motion.timeline({ onComplete: finishCupTransition });
  cupTimeline.fromTo(activeCup, { opacity: 0, y: 24, scale: .985 },
    { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out' });
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

async function selectFlavor(id, announce = true) {
  const next = flavors.find(flavor => flavor.id === id);
  if (!next || next.id === requestedFlavor || !isCentered(flavors.indexOf(next))) return;
  requestedFlavor = next.id;
  const version = ++selectionVersion;
  if (next.id === activeFlavor.id) return;
  const asset = cupAssets.get(next.id);
  if (!asset.ready && !await asset.loaded) {
    if (version === selectionVersion) {
      requestedFlavor = activeFlavor.id;
      showToast('This coffee image could not load. Try another flavor.');
    }
    return;
  }
  if (version !== selectionVersion) return;
  // Image decoding may finish after a new gesture. Never commit off-center.
  if (!isCentered(flavors.indexOf(next))) { requestedFlavor = activeFlavor.id; return; }
  const incoming = asset.image;
  activeFlavor = next;
  flavorName.textContent = next.name;
  price.textContent = `$${next.price.toFixed(2)}`;
  addButton.setAttribute('aria-label', `Add ${next.name} iced coffee to demo bag for $${next.price.toFixed(2)}`);
  count.textContent = `${String(flavors.indexOf(next) + 1).padStart(2, '0')} / ${String(flavors.length).padStart(2, '0')}`;
  if (announce) announcement.textContent = `${next.name} iced coffee selected, $${next.price.toFixed(2)}`;

  // Retarget from the actual visible blend. Do not finish/reset an interrupted
  // transition, discard visible layers, or reorder a cup during a reversal.
  cupTimeline?.kill();
  cupTimeline = null;
  if (incoming.parentElement !== cupStage) {
    if (motion) motion.set(incoming, { opacity: 0, y: 0, scale: 1, rotation: 0 });
    cupStage.append(incoming);
  }
  activeCup = incoming;
  if (reducedMotion.matches || !motion) { finishCupTransition(); return; }
  addButton.disabled = true;
  cupStage.setAttribute('aria-busy', 'true');
  cupStage.classList.add('is-cup-transitioning');
  const layers = [...cupStage.querySelectorAll('.cup-image')];
  const above = layers.slice(layers.indexOf(incoming) + 1);
  cupTimeline = motion.timeline({ onComplete: finishCupTransition });
  // Keep the layers beneath the incoming cup intact until it is opaque. This
  // avoids a transparent dip and doubled, moving rims during the dissolve.
  cupTimeline
    .to(incoming, { opacity: 1, duration: .72, ease: 'sine.inOut' }, 0)
    .to(layers, { y: 0, scale: 1, rotation: 0, duration: .5, ease: 'power3.out' }, 0);
  if (above.length) cupTimeline.to(above, { opacity: 0, duration: .72, ease: 'sine.inOut' }, 0);
}

function finishCupTransition() {
  if (cupTimeline) { cupTimeline.kill(); cupTimeline = null; }
  cupStage.querySelectorAll('.cup-image').forEach(image => { if (image !== activeCup) image.remove(); });
  if (motion) motion.set([activeCup, flavorName, price], { clearProps: 'opacity,transform' });
  addButton.disabled = false;
  cupStage.removeAttribute('aria-busy');
  cupStage.classList.remove('is-cup-transitioning');
}

// One native scroll position drives both the orbit and the selected drink.
// Repeated decorative cards complete the circle, including the left neighbors.
const slotCount = flavors.length * 3;
const angleStep = Math.PI * 2 / slotCount;
for (let slot = cards.length; slot < slotCount; slot++) {
  const clone = cards[slot % flavors.length].cloneNode(true);
  clone.classList.remove('is-active');
  orbit.append(clone);
  cards.push(clone);
}
let scrollStep = 1;
let phase = 0;
const orbitState = { phase: 0 };
let frame = 0;
let geometry;
let selectedIndex = 0;
let snapTimer;
let pointerHeld = false;
let anchorNavigation = false;
let anchorTimer;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function isCentered(index) {
  return Math.abs(renderedPhase - index) < .00001;
}

function commitCenteredFlavor() {
  const index = Math.round(renderedPhase);
  if (isCentered(index)) selectFlavor(flavors[index].id);
}

let previousOrbitPhase = 0;
let renderedPhase = 0;
function drawOrbit() {
  let visualPhase = orbitState.phase;
  // A frame can move from just before center to just after it. Render that
  // crossed center exactly for this frame and commit its drink immediately.
  const crossing = visualPhase > previousOrbitPhase
    ? Math.floor(previousOrbitPhase + .00001) + 1
    : Math.ceil(previousOrbitPhase - .00001) - 1;
  const atStop = Math.abs(visualPhase - Math.round(visualPhase)) < .00001;
  if (!atStop && ((visualPhase > previousOrbitPhase && crossing <= visualPhase) ||
      (visualPhase < previousOrbitPhase && crossing >= visualPhase))) visualPhase = crossing;
  previousOrbitPhase = orbitState.phase;
  renderedPhase = visualPhase;
  const { width, centerY, radius, size } = geometry;
  cards.forEach((card, slot) => {
    // Downward scrolling turns the wheel right; the next card arrives from the left.
    const angle = (visualPhase - slot) * angleStep;
    const x = width / 2 + Math.sin(angle) * radius - size / 2;
    const y = centerY + (1 - Math.cos(angle)) * radius - size / 2;
    card.style.transform = `translate3d(${x}px,${y}px,0) rotate(${angle * 180 / Math.PI}deg)`;
    const distanceFromCenter = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)) / angleStep);
    card.style.opacity = String(clamp(3 - distanceFromCenter, 0, 1));
    card.classList.toggle('is-active', Math.abs(visualPhase - slot) < .00001);
  });
  previousButton.disabled = selectedIndex === 0;
  nextButton.disabled = selectedIndex === flavors.length - 1;
  commitCenteredFlavor();
}

function renderScroll(immediate = false) {
  frame = 0;
  if (!immediate && window.scrollY > scrollStep * (flavors.length - 1) && orbitState.phase === flavors.length - 1) return;
  phase = clamp(window.scrollY / scrollStep, 0, flavors.length - 1);
  selectedIndex = Math.round(phase);
  if (motion) motion.killTweensOf(orbitState);
  if (immediate || reducedMotion.matches || !motion) {
    // Reduced motion replaces continuous rotation with discrete positions.
    orbitState.phase = reducedMotion.matches ? selectedIndex : phase;
    drawOrbit();
    commitCenteredFlavor();
  } else {
    motion.to(orbitState, {
      phase, duration: .42, ease: 'power3.out',
      onUpdate: drawOrbit, onComplete: commitCenteredFlavor
    });
  }
}

function scheduleSnap() {
  clearTimeout(snapTimer);
  if (pointerHeld || anchorNavigation || document.querySelector('dialog[open]')) return;
  snapTimer = setTimeout(() => {
    const rawPhase = window.scrollY / scrollStep;
    if (rawPhase < 0 || rawPhase > flavors.length - 1 + .002) return;
    const index = Math.round(rawPhase);
    if (Math.abs(window.scrollY - index * scrollStep) >= .5) scrollToFlavor(index);
  }, 200);
}

function measureOrbit(preservePosition = false) {
  const oldEnd = scrollStep * (flavors.length - 1);
  const oldPosition = window.scrollY;
  const wasBelowHero = oldPosition > oldEnd + 1;
  const width = scene.clientWidth;
  const height = scene.clientHeight;
  const mobile = width <= 600;
  const cupRect = cupStage.getBoundingClientRect();
  geometry = {
    width, centerY: cupRect.top - scene.getBoundingClientRect().top + cupRect.height / 2,
    radius: width * (mobile ? 1.05 : .65),
    size: mobile ? Math.min(110, width * .25) : Math.min(245, width * .17)
  };
  scrollStep = Math.round(Math.max(320, height * .55));
  document.documentElement.style.setProperty('--scroll-distance', `${scrollStep * (flavors.length - 1)}px`);
  orbit.style.setProperty('--card-size', `${geometry.size}px`);
  document.documentElement.classList.add('scroll-selector-ready');
  if (preservePosition && !anchorNavigation) window.scrollTo({ top: wasBelowHero ? oldPosition + scrollStep * (flavors.length - 1) - oldEnd : phase * scrollStep, behavior: 'instant' });
  renderScroll(true);
  scheduleSnap();
  orbit.classList.add('is-orbit-ready');
}

function scrollToFlavor(index) {
  window.scrollTo({
    top: clamp(index, 0, flavors.length - 1) * scrollStep,
    behavior: reducedMotion.matches ? 'instant' : 'smooth'
  });
}

window.addEventListener('scroll', () => {
  if (!frame) frame = requestAnimationFrame(() => renderScroll());
  if (anchorNavigation) { clearTimeout(anchorTimer); anchorTimer = setTimeout(finishAnchorNavigation, 180); }
  scheduleSnap();
}, { passive: true });
window.addEventListener('pointerdown', () => { pointerHeld = true; clearTimeout(snapTimer); }, { passive: true });
window.addEventListener('pointerup', () => { pointerHeld = false; scheduleSnap(); }, { passive: true });
window.addEventListener('pointercancel', () => { pointerHeld = false; scheduleSnap(); }, { passive: true });
// Observe the rendered scene: mobile viewport units can settle after resize fires.
const layoutObserver = new ResizeObserver(() => measureOrbit(true));
layoutObserver.observe(scene);
layoutObserver.observe(cupStage);
window.addEventListener('pageshow', () => measureOrbit());
reducedMotion.addEventListener('change', () => {
  finishCupTransition();
  activeCup.classList.remove('cup-image-initial');
  renderScroll(true);
  scrollToFlavor(selectedIndex);
});
previousButton.addEventListener('click', () => scrollToFlavor(selectedIndex - 1));
nextButton.addEventListener('click', () => scrollToFlavor(selectedIndex + 1));
scene.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  scrollToFlavor(selectedIndex + (event.key === 'ArrowRight' ? 1 : -1));
});
measureOrbit();

let anchorTarget;
function finishAnchorNavigation() {
  anchorNavigation = false;
  anchorTarget?.focus({ preventScroll: true });
  anchorTarget = null;
}
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = document.querySelector(link.getAttribute('href'));
  if (!target) return;
  event.preventDefault();
  clearTimeout(snapTimer); clearTimeout(anchorTimer);
  anchorNavigation = true;
  anchorTarget = target;
  target.setAttribute('tabindex', '-1');
  history.replaceState(null, '', link.getAttribute('href'));
  const top = target === scene ? 0 : target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  anchorTimer = setTimeout(finishAnchorNavigation, reducedMotion.matches ? 30 : 250);
});

document.querySelectorAll('[data-dialog]').forEach(button => {
  button.addEventListener('click', () => document.getElementById(button.dataset.dialog).showModal());
});
document.querySelectorAll('.info-dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
});
document.querySelectorAll('[data-menu-flavor]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelector('#menu-dialog').close();
    scene.focus({ preventScroll: true });
    scrollToFlavor(flavors.findIndex(flavor => flavor.id === button.dataset.menuFlavor));
  });
});

function renderBag() {
  const entries = [...bag.values()];
  const quantity = entries.reduce((sum, item) => sum + item.quantity, 0);
  bagCount.hidden = !quantity;
  bagCount.textContent = String(quantity);
  document.querySelectorAll('[data-dialog="bag-dialog"]').forEach(button => button.setAttribute('aria-label', `Open demo bag, ${quantity} ${quantity === 1 ? 'item' : 'items'}`));
  document.querySelectorAll('[data-bag-total]').forEach(total => { total.textContent = String(quantity); });
  bagSummary.hidden = !quantity;
  bagSubtotal.textContent = `$${entries.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}`;
  if (!quantity) { bagItems.innerHTML = '<p class="bag-empty">Your demo bag is empty. Pick a flavor to begin.</p>'; return; }
  bagItems.replaceChildren(...entries.map(item => {
    const row = document.createElement('div');
    row.className = 'bag-line';
    row.dataset.item = item.id;
    const name = document.createElement('strong');
    name.className = 'bag-name';
    name.textContent = item.name;
    const amount = document.createElement('span');
    amount.className = 'bag-amount';
    amount.textContent = `$${(item.price * item.quantity).toFixed(2)}`;
    const controls = document.createElement('div');
    controls.className = 'bag-quantity';
    const button = (action, text, label) => {
      const element = document.createElement('button');
      element.type = 'button'; element.dataset.action = action; element.dataset.id = item.id;
      element.textContent = text; element.setAttribute('aria-label', label); return element;
    };
    const value = document.createElement('span');
    value.textContent = item.quantity;
    value.setAttribute('aria-label', `Quantity: ${item.quantity}`);
    controls.append(button('decrease', '−', `Remove one ${item.name}`), value, button('increase', '+', `Add one ${item.name}`));
    const remove = button('remove', 'Remove', `Remove ${item.name} from bag`);
    remove.className = 'bag-remove';
    row.append(name, amount, controls, remove);
    return row;
  }));
}
bagItems.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const item = bag.get(button.dataset.id);
  if (!item) return;
  const rowIndex = [...bag.keys()].indexOf(item.id);
  if (button.dataset.action === 'remove') bag.delete(item.id);
  else {
    item.quantity += button.dataset.action === 'increase' ? 1 : -1;
    if (item.quantity === 0) bag.delete(item.id);
  }
  renderBag();
  bagStatus.textContent = bag.has(item.id) ? `${item.name}: ${item.quantity} in your bag. Subtotal ${bagSubtotal.textContent}.` : `${item.name} removed. ${bag.size ? `Subtotal ${bagSubtotal.textContent}.` : 'Your bag is empty.'}`;
  const sameButton = bagItems.querySelector(`[data-id="${item.id}"][data-action="${button.dataset.action}"]`);
  const rows = bagItems.querySelectorAll('.bag-line');
  const fallback = rows[Math.min(rowIndex, rows.length - 1)]?.querySelector('button');
  (sameButton || fallback || document.querySelector('#bag-dialog .dialog-close')).focus({ preventScroll: true });
});
function addToBag(flavor) {
  const existing = bag.get(flavor.id);
  if (existing) existing.quantity++;
  else bag.set(flavor.id, { ...flavor, quantity: 1 });
  renderBag();
  showToast(`${flavor.name} added to your demo bag`);
}
addButton.addEventListener('click', () => addToBag(activeFlavor));
document.querySelectorAll('[data-add-flavor]').forEach(button => {
  button.addEventListener('click', () => {
    const flavor = flavors.find(item => item.id === button.dataset.addFlavor);
    if (flavor) addToBag(flavor);
  });
});

document.querySelector('#share-button').addEventListener('click', async () => {
  try {
    if (navigator.share) {
      await navigator.share({ title: document.title, url: location.href });
      return;
    }
    await navigator.clipboard.writeText(location.href);
    showToast('Page link copied');
  } catch (error) {
    if (error.name !== 'AbortError') showToast('Sharing is unavailable in this preview');
  }
});
