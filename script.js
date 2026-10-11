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

// ---------- Vidro líquido: as bordas do card distorcem o fundo ----------
// Gera um "mapa de deslocamento" do tamanho do card: perto das bordas e quinas
// o fundo é puxado para dentro, como a refração de uma lente. Só o Chromium
// aceita filtro SVG em backdrop-filter; nos outros fica o desfoque do CSS.

const LENS = { bezel: 32, scale: 110, blur: 1.5, saturate: 1.5 };
const supportsLens =
  /Chrome\/|Chromium\/|Edg\//.test(navigator.userAgent) &&
  !/iPhone|iPad|iPod/.test(navigator.userAgent);

const SVG_NS = "http://www.w3.org/2000/svg";
const lensDefs = document.createElementNS(SVG_NS, "svg");
lensDefs.setAttribute("aria-hidden", "true");
lensDefs.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
document.body.append(lensDefs);

function displacementMap(w, h, r, bezel) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  const px = img.data;
  const hw = w / 2;
  const hh = h / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = x + 0.5 - hw;
      const cy = y + 0.5 - hh;
      const qx = Math.abs(cx) - (hw - r);
      const qy = Math.abs(cy) - (hh - r);

      // distância até a borda arredondada e direção da borda (normal)
      let dist, nx, ny;
      if (qx > 0 && qy > 0) {
        const len = Math.hypot(qx, qy);
        dist = r - len;
        nx = qx / len;
        ny = qy / len;
      } else if (qx > qy) {
        dist = r - qx;
        nx = 1;
        ny = 0;
      } else {
        dist = r - qy;
        nx = 0;
        ny = 1;
      }
      nx *= Math.sign(cx) || 1;
      ny *= Math.sign(cy) || 1;

      const t = Math.min(1, Math.max(0, 1 - dist / bezel));
      const m = t * t;
      const i = (y * w + x) * 4;
      px[i] = 128 - nx * m * 127;
      px[i + 1] = 128 - ny * m * 127;
      px[i + 2] = 128;
      px[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

function applyLens(card) {
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  if (!w || !h) return;

  const id = `lens-${card.dataset.card}-${w}x${h}`;
  if (card.dataset.lens === id) return;
  lensDefs.querySelector(`#${card.dataset.lens}`)?.remove();

  const map = displacementMap(w, h, RADIUS, LENS.bezel);
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.id = id;
  filter.setAttribute("x", "0");
  filter.setAttribute("y", "0");
  filter.setAttribute("width", w);
  filter.setAttribute("height", h);
  filter.setAttribute("filterUnits", "userSpaceOnUse");
  filter.setAttribute("color-interpolation-filters", "sRGB");
  filter.innerHTML = `
    <feGaussianBlur in="SourceGraphic" stdDeviation="${LENS.blur}" edgeMode="duplicate" result="blur"/>
    <feImage href="${map}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>
    <feDisplacementMap in="blur" in2="map" scale="${LENS.scale}" xChannelSelector="R" yChannelSelector="G" result="lens"/>
    <feColorMatrix in="lens" type="saturate" values="${LENS.saturate}"/>`;
  lensDefs.append(filter);

  card.dataset.lens = id;
  card.style.backdropFilter = `url(#${id})`;
  card.style.webkitBackdropFilter = `url(#${id})`;
}

if (supportsLens) {
  // recalcula o mapa sempre que o card aparece ou muda de tamanho
  const lensObserver = new ResizeObserver((entries) =>
    entries.forEach((entry) => applyLens(entry.target))
  );
  cards.forEach((card) => lensObserver.observe(card));
}
