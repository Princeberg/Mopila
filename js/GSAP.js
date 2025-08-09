// Animation fade + slide pour le titre
  gsap.from(".section-title", {opacity:0, y:-30, duration: 0.7});

  // Animation pour la colonne texte (h2 + p)
  gsap.from(".about-text > h2, .about-text > p", {
    opacity: 0,
    x: -50,
    duration: 0.7,
    stagger: 0.3,
    delay: 0.4,
  });

  // Animation pour les stats (apparition avec écart)
  gsap.from(".stat-item", {
    opacity: 0,
    y: 30,
    duration: 0.7,
    stagger: 0.25,
    delay: 1.2,
  });

  // Animation pour la galerie (zoom + fade)
  gsap.from(".image-stack img", {
    opacity: 0,
    scale: 0.8,
    duration: 0.7,
    stagger: 0.25,
    delay: 2,
  });

  // Animation image principale
  gsap.from(".about-image img", {
    opacity: 0,
    x: 50,
    duration: 0.7,
    delay: 0.5,
  });