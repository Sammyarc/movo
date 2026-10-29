(() => {
  const footer = document.querySelector('.footer-section');
  const signature = footer?.querySelector('.footer-signature');
  if (!signature || !window.gsap || !('IntersectionObserver' in window)) return;
  const letters = [...signature.querySelectorAll('.footer-wordmark span')];
  const ring = signature.querySelector('.footer-coffee-ring');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let played = false;
  let timeline;
  const finish = () => {
    timeline?.kill();
    timeline = null;
    window.gsap.set([...letters, ring], { clearProps: 'transform,opacity,visibility' });
  };
  const observer = new IntersectionObserver(entries => {
    if (played || !entries.some(entry => entry.isIntersecting)) return;
    played = true;
    observer.disconnect();
    if (preference.matches) return;
    timeline = window.gsap.timeline({ onComplete: finish });
    timeline.fromTo(ring, { scale: .82, opacity: 0 }, { scale: 1, opacity: .21, duration: 1.45, ease: 'power2.out' }, 0)
      .fromTo(letters, { y: 28, opacity: .1 }, { y: 0, opacity: 1, duration: .85, stagger: .075, ease: 'power3.out' }, .12);
  }, { threshold: .18 });
  observer.observe(signature);
  preference.addEventListener('change', () => {
    if (preference.matches) {
      played = true;
      observer.disconnect();
      finish();
    }
  });
})();
