const fluidStudy = document.querySelector("[data-fluid-study]");
const motionVideos = document.querySelectorAll(".motion-media-video");
const sectionSignatures = document.querySelectorAll(".section-signature");
const isWebKit = /AppleWebKit/i.test(navigator.userAgent) && !/(Chrome|Chromium|Edg|OPR|Android)/i.test(navigator.userAgent);

motionVideos.forEach((video) => {
  video.muted = true;
  video.playsInline = true;

  const hevcSource = video.dataset.hevcSrc;
  if (isWebKit && hevcSource) {
    const source = video.querySelector("source");
    source.src = hevcSource;
    source.type = 'video/quicktime; codecs="hvc1"';
    video.load();
  } else if (isWebKit) {
    // WebKit can render VP9 video without its alpha channel. Until a real HEVC-alpha
    // source is supplied, leaving this transparent video absent is safer than a black box.
    video.hidden = true;
  }

  video.addEventListener("error", () => {
    video.hidden = true;
  });
});

const playableMotionVideos = [...motionVideos].filter((video) => !video.hidden);

if (playableMotionVideos.length && "IntersectionObserver" in window) {
  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;

        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    },
    { rootMargin: "320px 0px" },
  );

  playableMotionVideos.forEach((video) => {
    video.pause();
    videoObserver.observe(video);
  });
}

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
  let fluidFrame = null;
  let fluidIsActive = false;

  const captureScroll = () => {
    if (!fluidIsActive) {
      lastScrollY = window.scrollY;
      return;
    }

    const delta = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    scrollEnergy = Math.max(-10, Math.min(10, scrollEnergy + delta * 0.028));
  };

  const animateFluid = () => {
    if (!fluidIsActive) {
      fluidFrame = null;
      return;
    }

    scrollEnergy *= 0.94;
    fluidShift += (scrollEnergy - fluidShift) * 0.035;
    fluidStudy.style.setProperty("--fluid-scroll-shift", `${fluidShift.toFixed(2)}px`);
    fluidFrame = window.requestAnimationFrame(animateFluid);
  };

  window.addEventListener("scroll", captureScroll, { passive: true });

  if ("IntersectionObserver" in window) {
    const fluidObserver = new IntersectionObserver(
      ([entry]) => {
        fluidIsActive = entry.isIntersecting;
        fluidStudy.classList.toggle("is-fluid-active", fluidIsActive);

        if (fluidIsActive && !fluidFrame) {
          lastScrollY = window.scrollY;
          fluidFrame = window.requestAnimationFrame(animateFluid);
        }
      },
      { rootMargin: "260px 0px" },
    );

    fluidObserver.observe(fluidStudy);
  } else {
    fluidIsActive = true;
    fluidStudy.classList.add("is-fluid-active");
    fluidFrame = window.requestAnimationFrame(animateFluid);
  }
}
