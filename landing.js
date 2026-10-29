(() => {
  const gsap = window.gsap;
  if (!gsap || !('IntersectionObserver' in window)) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const elements = [...document.querySelectorAll('[data-reveal]')];
  const line = document.querySelector('[data-craft-line]');
  const seen = new WeakSet();
  let observer;
  function setup() {
    observer?.disconnect();
    gsap.killTweensOf([...elements, line].filter(Boolean));
    gsap.set(elements, { clearProps: 'transform,opacity,visibility' });
    if (line) gsap.set(line, { clearProps: 'transform' });
    if (preference.matches) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        observer.unobserve(target);
        seen.add(target);
        if (target === line) gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power2.out' });
        else gsap.to(target, { y: 0, opacity: 1, duration: .85, ease: 'power3.out', delay: Number(target.dataset.revealDelay || 0), onComplete: () => gsap.set(target, { clearProps: 'transform,opacity' }) });
      });
    }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
    elements.forEach(element => {
      if (seen.has(element) || element.getBoundingClientRect().bottom < 0) return;
      gsap.set(element, { y: 24, opacity: 0 });
      observer.observe(element);
    });
    if (line && !seen.has(line)) observer.observe(line);
  }
  document.querySelectorAll('.closing-cup').forEach((cup, i) => { cup.dataset.revealDelay = String(i * .1); });
  preference.addEventListener('change', setup);
  setup();
})();
