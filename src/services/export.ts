import { AXES, type Locale, type Profile } from "../core/types";
import { archetypes, axisCopy } from "../data/archetypes";
import { rankArchetypes } from "../core/engine";
import { copy } from "../i18n";
export async function downloadPortrait(
  profile: Profile,
  locale: Locale,
): Promise<void> {
  const t = copy[locale],
    ranking = rankArchetypes(profile.vector, archetypes);
  await document.fonts.load('800 76px "Inter Variable"');
  await document.fonts.load('400 25px "Inter Variable"');
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1400;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1200, 1400);
  const palette = ["#e82f17", "#3bc47b", "#2d9ed2", "#f79f08", "#f0400f"];
  palette.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i * 240, 0, 240, 16);
    ctx.fillRect(i * 240, 1360, 240, 40);
  });
  const logo = new Image();
  logo.src = new URL("./dilemme-logo.png", document.baseURI).href;
  await logo.decode();
  ctx.drawImage(
    logo,
    990,
    45,
    140,
    (140 * logo.naturalHeight) / logo.naturalWidth,
  );
  ctx.fillStyle = "#141820";
  ctx.font = '800 42px "Inter Variable", sans-serif';
  ctx.fillText(`${t.brand}.`, 75, 120);
  ctx.fillStyle = "#ba2612";
  ctx.font = '18px "Inter Variable", sans-serif';
  ctx.fillText(t.tagline, 75, 168);
  const name = ranking[0]!.archetype.name[locale];
  ctx.fillStyle = "#141820";
  ctx.font = '800 76px "Inter Variable", sans-serif';
  let fontSize = 76;
  while (ctx.measureText(name).width > 1050) {
    fontSize -= 2;
    ctx.font = `800 ${fontSize}px "Inter Variable", sans-serif`;
  }
  ctx.fillText(name, 75, 290);
  ctx.font = '25px "Inter Variable", sans-serif';
  ctx.fillStyle = "#59616d";
  ctx.fillText(`${t.nuance} ${ranking[1]!.archetype.name[locale]}`, 75, 345);
  const cx = 600,
    cy = 720,
    r = 270;
  const point = (i: number, ratio: number): [number, number] => [
    cx + Math.cos((i * Math.PI) / 3 - Math.PI / 2) * r * ratio,
    cy + Math.sin((i * Math.PI) / 3 - Math.PI / 2) * r * ratio,
  ];
  function polygon(ratios: number[]) {
    ctx!.beginPath();
    ratios.forEach((ratio, i) => {
      const [x, y] = point(i, ratio);
      if (i) ctx!.lineTo(x, y);
      else ctx!.moveTo(x, y);
    });
    ctx!.closePath();
  }
  for (const ratio of [0.25, 0.5, 0.75, 1]) {
    polygon(AXES.map(() => ratio));
    ctx.strokeStyle = ratio === 0.5 ? "#247ea8" : "#abd8ed";
    ctx.lineWidth = 1.5;
    ctx.setLineDash(ratio === 0.5 ? [6, 6] : []);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  AXES.forEach((axis, i) => {
    const [x, y] = point(i, 1),
      [lx, ly] = point(i, 1.22);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#abd8ed";
    ctx.stroke();
    ctx.font = '22px "Inter Variable", sans-serif';
    ctx.fillStyle = "#141820";
    ctx.textAlign = "center";
    ctx.fillText(axisCopy[axis].positive[locale], lx, ly);
  });
  polygon(AXES.map((axis) => (profile.vector[axis] + 100) / 200));
  ctx.fillStyle = "#2d9ed230";
  ctx.fill();
  ctx.strokeStyle = "#1b5f7e";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = "#ba2612";
  ctx.font = '32px "Inter Variable", sans-serif';
  ctx.fillText(
    `${ranking[0]!.fictionalRarity.toLocaleString(locale)} % ${t.rarity}`,
    75,
    1135,
  );
  ctx.fillStyle = "#59616d";
  ctx.font = '18px "Inter Variable", sans-serif';
  const lines =
    locale === "fr"
      ? [
          "Centre : pôle opposé · bord : pôle nommé · médiane : équilibre.",
          "Un portrait ludique, pas une mesure psychologique.",
          "Deux choix. Aucune réponse facile.",
        ]
      : [
          "Centre: opposite pole · edge: named pole · middle: balance.",
          "A playful portrait, not a psychological assessment.",
          "Two choices. No easy answers.",
        ];
  lines.forEach((line, i) => ctx.fillText(line, 75, 1200 + 38 * i));
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("PNG export failed")),
      "image/png",
    ),
  );
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = `${t.brand.toLowerCase()}-${ranking[0]!.archetype.id}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
