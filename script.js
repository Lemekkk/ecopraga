const stage = document.querySelector(".stage");
const buttons = document.querySelectorAll(".menu__btn");
const cards = document.querySelectorAll(".card");

let current = null;

function openCard(name) {
  if (current === name) return closeCard();

  cards.forEach((card) => (card.hidden = card.dataset.card !== name));
  buttons.forEach((btn) =>
    btn.setAttribute("aria-expanded", String(btn.dataset.target === name))
  );
  stage.classList.add("has-card");
  current = name;

  const card = document.querySelector(`[data-card="${name}"]`);
  card.scrollTop = 0;
  card.querySelector(".card__close").focus({ preventScroll: true });
}

function closeCard() {
  const lastBtn = document.querySelector(`[data-target="${current}"]`);
  cards.forEach((card) => (card.hidden = true));
  buttons.forEach((btn) => btn.setAttribute("aria-expanded", "false"));
  stage.classList.remove("has-card");
  current = null;
  lastBtn?.focus({ preventScroll: true });
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
if (document.querySelector(`[data-card="${CSS.escape(fromHash)}"]`)) {
  openCard(fromHash);
}
