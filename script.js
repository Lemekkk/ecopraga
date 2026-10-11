const stage = document.querySelector(".stage");
const buttons = document.querySelectorAll(".menu__btn");
const cards = document.querySelectorAll(".card");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const OPEN_MS = 520;
const CLOSE_MS = 380;
const EASE = "cubic-bezier(0.2, 0.9, 0.25, 1)";
const RADIUS = 18;

let current = null;
let animToken = 0;

const cardFor = (name) => document.querySelector(`[data-card="${name}"]`);
const buttonFor = (name) => document.querySelector(`[data-target="${name}"]`);

// Calcula o transform que faz o card ocupar exatamente o lugar do botão
function buttonShape(card, btn) {
  const a = btn.getBoundingClientRect();
  const b = card.getBoundingClientRect();
  const sx = a.width / b.width;
  const sy = a.height / b.height;
  const dx = a.left + a.width / 2 - (b.left + b.width / 2);
  const dy = a.top + a.height / 2 - (b.top + b.height / 2);
  return {
    transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
    // compensa a escala para os cantos continuarem redondos
    borderRadius: `${RADIUS / sx}px / ${RADIUS / sy}px`,
  };
}

function stopAnimations(card) {
  card.getAnimations({ subtree: true }).forEach((a) => a.cancel());
}

function openCard(name) {
  if (current === name) return closeCard();

  const token = ++animToken;
  cards.forEach((card) => {
    stopAnimations(card);
    card.hidden = card.dataset.card !== name;
  });
  buttons.forEach((btn) =>
    btn.setAttribute("aria-expanded", String(btn.dataset.target === name))
  );
  stage.classList.remove("is-closing");
  stage.classList.add("has-card");
  current = name;

  const card = cardFor(name);
  stage.scrollTop = 0;
  card.querySelector(".card__close").focus({ preventScroll: true });

  if (reduceMotion.matches || token !== animToken) return;

  // O card nasce do botão e cresce até o tamanho final
  const from = buttonShape(card, buttonFor(name));
  card.animate(
    [
      { ...from, opacity: 0 },
      { opacity: 1, offset: 0.2 },
      { transform: "none", borderRadius: `${RADIUS}px`, opacity: 1 },
    ],
    { duration: OPEN_MS, easing: EASE }
  );
  // o conteúdo aparece só depois que o card já cresceu um pouco
  [...card.children].forEach((child) =>
    child.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], {
      duration: OPEN_MS,
      easing: "ease-out",
    })
  );
}

function closeCard() {
  if (!current) return;

  const name = current;
  const card = cardFor(name);
  const btn = buttonFor(name);
  const token = ++animToken;

  buttons.forEach((b) => b.setAttribute("aria-expanded", "false"));
  current = null;
  btn.focus({ preventScroll: true });

  const finish = () => {
    if (token !== animToken) return;
    card.hidden = true;
    stage.classList.remove("has-card", "is-closing");
    stopAnimations(card);
  };

  if (reduceMotion.matches) return finish();

  stopAnimations(card);
  stage.classList.add("is-closing");

  // Caminho inverso: o card encolhe de volta para dentro do botão
  const to = buttonShape(card, btn);
  [...card.children].forEach((child) =>
    child.animate([{ opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0 }], {
      duration: CLOSE_MS,
      fill: "forwards",
    })
  );
  card
    .animate(
      [
        { transform: "none", borderRadius: `${RADIUS}px`, opacity: 1 },
        { opacity: 1, offset: 0.75 },
        { ...to, opacity: 0 },
      ],
      { duration: CLOSE_MS, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" }
    )
    .finished.then(finish, () => {});
}

buttons.forEach((btn) =>
  btn.addEventListener("click", () => openCard(btn.dataset.target))
);

document
  .querySelectorAll(".card__close")
  .forEach((btn) => btn.addEventListener("click", closeCard));

// Clicar fora do card (no fundo escuro) fecha
stage.addEventListener("click", (e) => {
  if (e.target === stage && current) closeCard();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && current) closeCard();
});

// Permite abrir direto um projeto pelo link (ex.: index.html#pombo)
const fromHash = location.hash.slice(1);
if (cardFor(CSS.escape(fromHash))) {
  openCard(fromHash);
}
