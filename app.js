const fluidStudy = document.querySelector("[data-fluid-study]");
const motionVideos = document.querySelectorAll(".motion-media-video");
const sectionSignatures = document.querySelectorAll(".section-signature");

motionVideos.forEach((video) => {
  video.addEventListener("error", () => {
    video.hidden = true;
  });
});

if (sectionSignatures.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let signatureFrame = null;

  const updateSignatureParallax = () => {
    const viewportCenter = window.innerHeight * 0.5;

    sectionSignatures.forEach((signature) => {
      const section = signature.parentElement;
      const bounds = section.getBoundingClientRect();
      const strength = Number.parseFloat(getComputedStyle(signature).getPropertyValue("--signature-parallax-strength")) || 0;
      const range = window.innerHeight + bounds.height * 0.5;
      const progress = Math.max(-1, Math.min(1, (bounds.top + bounds.height * 0.5 - viewportCenter) / range));

      signature.style.setProperty("--signature-parallax-shift", `${(-progress * strength).toFixed(2)}px`);
    });

    signatureFrame = null;
  };

  const requestSignatureParallax = () => {
    if (!signatureFrame) signatureFrame = window.requestAnimationFrame(updateSignatureParallax);
  };

  window.addEventListener("scroll", requestSignatureParallax, { passive: true });
  window.addEventListener("resize", requestSignatureParallax, { passive: true });
  requestSignatureParallax();
}

if (fluidStudy && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let lastScrollY = window.scrollY;
  let scrollEnergy = 0;
  let fluidShift = 0;

  const captureScroll = () => {
    const delta = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    scrollEnergy = Math.max(-10, Math.min(10, scrollEnergy + delta * 0.028));
  };

  const animateFluid = () => {
    scrollEnergy *= 0.94;
    fluidShift += (scrollEnergy - fluidShift) * 0.035;
    fluidStudy.style.setProperty("--fluid-scroll-shift", `${fluidShift.toFixed(2)}px`);
    window.requestAnimationFrame(animateFluid);
  };

  window.addEventListener("scroll", captureScroll, { passive: true });
  window.requestAnimationFrame(animateFluid);
}
