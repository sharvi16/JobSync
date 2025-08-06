document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".container");
  const menuToggle = document.querySelector(".menu-toggle");
  const menuOverlay = document.querySelector(".menu-overlay");
  const menuContent = document.querySelector(".menu-content");
  const menuPreviewImg = document.querySelector(".menu-preview-img");
  const menuLinks = document.querySelectorAll(".link a");
  const currentTime = document.querySelector("#currentTime");

  let isOpen = false;
  let isAnimating = false;

  function time() {
    var d = new Date();
    var s = d.getSeconds();
    var m = d.getMinutes();
    var h = d.getHours();
    currentTime.textContent =
      ("0" + h).substr(-2) +
      ":" +
      ("0" + m).substr(-2) +
      ":" +
      ("0" + s).substr(-2);
  }
  setInterval(time, 1000);

  function animateMenuToggle(isOpening) {
    const open = document.querySelector("p#menu-open");
    const close = document.querySelector("p#menu-close");

    gsap.to(isOpening ? open : close, {
      x: isOpening ? -5 : 5,
      y: isOpening ? -10 : 10,
      duration: 0.5,
      rotation: isOpening ? -5 : 5,
      opacity: 0,
      delay: 0.25,
      ease: "power2.out",
    });

    gsap.to(".menu-toggle ion-icon", {
      // rotation : isOpening ? 0 : 180,
      duration: 0.5,
      ease: "power4.out",
    });

    gsap.to(isOpening ? close : open, {
      x: 0,
      y: 0,
      duration: 0.5,
      rotation: 0,
      opacity: 1,
      delay: 0.5,
      ease: "power2.out",
    });
  }

  function openMenu() {
    if (isAnimating || isOpen) return;
    isAnimating = true;
    menuToggle.classList.add("active");
    gsap.to(container, {
      rotation: 10,
      x: 300,
      y: 450,
      scale: 1.5,
      duration: 1.25,
      ease: "power4.inOut",
    });

    animateMenuToggle(true);

    gsap.to(menuContent, {
      rotation: 0,
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      duration: 1.25,
      ease: "power4.inOut",
    });

    gsap.to(menuOverlay, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 175%, 0% 100%)",
      duration: 1.25,
      ease: "power4.inOut",
      onComplete: () => {
        isOpen = true;
        isAnimating = false;
      },
    });

    gsap.to([".link a", ".social a"], {
      rotation: 0,
      y: "0%",
      opacity: 1,
      duration: 1,
      delay: 0.75,
      stagger: 0.1,
      ease: "power3.inOut",
    });
  }

  function closeMenu() {
    if (isAnimating || !isOpen) return;
    isAnimating = true;

    animateMenuToggle(false);
    menuToggle.classList.remove("active");
    gsap.to(container, {
      rotation: 0,
      x: 0,
      y: 0,
      scale: 1,
      duration: 1.25,
      ease: "power4.inOut",
    });

    gsap.to(menuContent, {
      rotation: -15,
      x: -100,
      y: -100,
      scale: 1.5,
      opacity: 0.25,
      duration: 1.25,
      ease: "power4.inOut",
    });

    gsap.to(menuOverlay, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
      duration: 1.25,
      ease: "power4.inOut",
      onComplete: () => {
        isOpen = false;
        isAnimating = false;
        gsap.set([".link a", ".social a"], { y: "120%" });
        resetPreviewImages();
      },
    });
  }

  menuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (isOpen) {
        closeMenu();
      }
    });
  });

  menuToggle.addEventListener("click", () => {
    if (!isOpen) openMenu();
    else closeMenu();
  });

  document.querySelector(".logo img").addEventListener("click", () => {
    if (isOpen) {
      closeMenu();
    }
  });
});
