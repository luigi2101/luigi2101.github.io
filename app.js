const fluidStudy = document.querySelector("[data-fluid-study]");
const motionVideos = document.querySelectorAll(".motion-media-video");
const sectionSignatures = document.querySelectorAll(".section-signature");
const phoneCanvas = document.querySelector(".phone-canvas");
const pageShell = document.querySelector(".page-shell");
const isWebKit = /AppleWebKit/i.test(navigator.userAgent) && !/(Chrome|Chromium|Edg|OPR|Android)/i.test(navigator.userAgent);

// Narrow screens intentionally display the real 1440px desktop document as one
// scaled canvas. Rendering it in a same-origin frame lets desktop media queries,
// typography, and every internal relationship remain exactly unchanged.
const canonicalCanvasWidth = 1440;
const canonicalCanvasViewportHeight = 900;
// Measured from the canonical 1440 × 900 desktop document. It provides an
// immediate, scroll-safe frame while the embedded document confirms its own height.
const canonicalCanvasDocumentHeight = 17758;
const phoneCanvasQuery = window.matchMedia("(max-width: 767px)");
const isDesktopCanvasDocument = new URLSearchParams(window.location.search).has("desktop-canvas");
const isPhoneCanvasHost = !isDesktopCanvasDocument && phoneCanvasQuery.matches;
const isEmbeddedPhoneCanvas = isDesktopCanvasDocument && window.parent !== window;
const canvasHeightMessage = "luigi-portfolio:desktop-canvas-height";
const canvasViewportMessage = "luigi-portfolio:desktop-canvas-viewport";
let phoneDesktopFrame = null;
let phoneCanvasSyncFrame = null;
let phoneCanvasViewportFrame = null;
let phoneCanvasHeight = canonicalCanvasDocumentHeight;

if (isDesktopCanvasDocument) {
  document.documentElement.classList.add("desktop-canvas-document");
}

const getDocumentCanvasHeight = () => Math.ceil(
  Math.max(
    pageShell?.scrollHeight || 0,
    document.documentElement.scrollHeight,
    document.body?.scrollHeight || 0,
  ),
);

const publishDesktopCanvasHeight = () => {
  if (window.parent === window) return;
  window.parent.postMessage(
    { type: canvasHeightMessage, height: getDocumentCanvasHeight() },
    window.location.origin,
  );
};

const requestDesktopCanvasHeight = () => {
  window.requestAnimationFrame(publishDesktopCanvasHeight);
};

const createPhoneCanvasFrame = () => {
  if (!phoneCanvas || phoneDesktopFrame) return phoneDesktopFrame;

  const frameUrl = new URL(window.location.href);
  frameUrl.searchParams.set("desktop-canvas", "1");
  frameUrl.hash = "";

  phoneDesktopFrame = document.createElement("iframe");
  phoneDesktopFrame.className = "phone-desktop-frame";
  phoneDesktopFrame.title = "Luigi Zhou portfolio";
  phoneDesktopFrame.src = frameUrl.toString();
  phoneDesktopFrame.addEventListener("load", () => {
    const frameDocument = phoneDesktopFrame?.contentDocument;
    const embeddedHeight = Math.max(
      frameDocument?.documentElement.scrollHeight || 0,
      frameDocument?.body.scrollHeight || 0,
    );
    if (embeddedHeight && embeddedHeight !== phoneCanvasHeight) {
      phoneCanvasHeight = embeddedHeight;
      requestPhoneCanvasSync();
    }
    requestPhoneCanvasViewport();
  });
  phoneCanvas.append(phoneDesktopFrame);
  document.documentElement.classList.add("phone-canvas-ready");
  return phoneDesktopFrame;
};

const removePhoneCanvasFrame = () => {
  phoneDesktopFrame?.remove();
  phoneDesktopFrame = null;
  phoneCanvasHeight = canonicalCanvasDocumentHeight;
  document.documentElement.classList.remove("phone-canvas-ready");
};

const syncPhoneCanvas = () => {
  if (!phoneCanvas || !pageShell) return;

  if (isDesktopCanvasDocument) {
    publishDesktopCanvasHeight();
    return;
  }

  if (!phoneCanvasQuery.matches) {
    phoneCanvas.style.removeProperty("--phone-canvas-height");
    phoneCanvas.style.removeProperty("--phone-canvas-scale");
    phoneCanvas.style.removeProperty("--phone-canvas-source-height");
    removePhoneCanvasFrame();
    return;
  }

  createPhoneCanvasFrame();
  // clientWidth excludes a classic scrollbar, so the transformed frame fits
  // the actual scrollable page width without clipping its right edge.
  const availableWidth = document.documentElement.clientWidth || window.innerWidth;
  const scale = availableWidth / canonicalCanvasWidth;
  const sourceHeight = phoneCanvasHeight || 1;
  phoneCanvas.style.setProperty("--phone-canvas-scale", scale.toFixed(6));
  phoneCanvas.style.setProperty("--phone-canvas-source-height", `${sourceHeight}px`);
  phoneCanvas.style.setProperty("--phone-canvas-height", `${Math.ceil(sourceHeight * scale)}px`);
};

const requestPhoneCanvasSync = () => {
  if (phoneCanvasSyncFrame) return;
  phoneCanvasSyncFrame = window.requestAnimationFrame(() => {
    phoneCanvasSyncFrame = null;
    syncPhoneCanvas();
  });
};

const publishPhoneCanvasViewport = () => {
  if (!isPhoneCanvasHost || !phoneDesktopFrame) return;

  const scale = (document.documentElement.clientWidth || window.innerWidth) / canonicalCanvasWidth;
  phoneDesktopFrame.contentWindow?.postMessage(
    {
      type: canvasViewportMessage,
      top: window.scrollY / scale,
      bottom: (window.scrollY + window.innerHeight) / scale,
    },
    window.location.origin,
  );
};

const requestPhoneCanvasViewport = () => {
  if (phoneCanvasViewportFrame) return;
  phoneCanvasViewportFrame = window.requestAnimationFrame(() => {
    phoneCanvasViewportFrame = null;
    publishPhoneCanvasViewport();
  });
};

window.addEventListener("message", (event) => {
  if (
    isDesktopCanvasDocument ||
    event.origin !== window.location.origin ||
    event.data?.type !== canvasHeightMessage ||
    !Number.isFinite(event.data.height)
  ) return;

  const nextHeight = Math.ceil(event.data.height);
  if (nextHeight === phoneCanvasHeight) return;
  phoneCanvasHeight = nextHeight;
  requestPhoneCanvasSync();
});

phoneCanvasQuery.addEventListener("change", requestPhoneCanvasSync);
window.addEventListener("resize", requestPhoneCanvasSync, { passive: true });

if (isPhoneCanvasHost) {
  window.addEventListener("scroll", requestPhoneCanvasViewport, { passive: true });
}

if (pageShell && "ResizeObserver" in window) {
  // Only the embedded desktop document reports content-height changes. The phone
  // host never observes the wrapper it resizes, avoiding observer feedback loops.
  if (isDesktopCanvasDocument) new ResizeObserver(requestDesktopCanvasHeight).observe(pageShell);
}

if (document.fonts?.ready) document.fonts.ready.then(isDesktopCanvasDocument ? requestDesktopCanvasHeight : requestPhoneCanvasSync);
window.addEventListener("load", isDesktopCanvasDocument ? requestDesktopCanvasHeight : requestPhoneCanvasSync, { once: true });
if (isDesktopCanvasDocument) requestDesktopCanvasHeight();
else requestPhoneCanvasSync();

const configureMotionVideos = () => motionVideos.forEach((video) => {
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

if (isPhoneCanvasHost) {
  // The host document is hidden behind the rendered frame. Keep its duplicate
  // videos inert so a phone never decodes the same animations twice.
  motionVideos.forEach((video) => {
    video.pause();
    video.preload = "none";
  });
} else {
  configureMotionVideos();
}

const playableMotionVideos = [...motionVideos].filter((video) => !video.hidden);

const updateFrameVideos = (top, bottom) => {
  const padding = 320;
  playableMotionVideos.forEach((video) => {
    const bounds = video.getBoundingClientRect();
    const isVisible = bounds.bottom >= top - padding && bounds.top <= bottom + padding;
    if (isVisible) video.play().catch(() => {});
    else video.pause();
  });
};

if (isEmbeddedPhoneCanvas) {
  // The embedded document has a full-page viewport, so a normal
  // IntersectionObserver would consider both animations visible forever.
  // The phone host forwards its physical viewport instead.
  playableMotionVideos.forEach((video) => video.pause());
  window.addEventListener("message", (event) => {
    if (
      event.origin !== window.location.origin ||
      event.source !== window.parent ||
      event.data?.type !== canvasViewportMessage ||
      !Number.isFinite(event.data.top) ||
      !Number.isFinite(event.data.bottom)
    ) return;

    updateFrameVideos(event.data.top, event.data.bottom);
  });
} else if (!isPhoneCanvasHost && playableMotionVideos.length && "IntersectionObserver" in window) {
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

if (
  !isPhoneCanvasHost &&
  !isEmbeddedPhoneCanvas &&
  sectionSignatures.length &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
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

if (
  !isPhoneCanvasHost &&
  !isEmbeddedPhoneCanvas &&
  fluidStudy &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
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
