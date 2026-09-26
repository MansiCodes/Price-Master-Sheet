const PROCESS_IMAGES = {
  drawing: "/machine-production/copper-drawing.jpg",
  extrusion: "/machine-production/extrusion-card.jpg",
  insulation: "/machine-production/insulation.jpg",
  twisting: "/machine-production/twisting.jpg",
  laying: "/machine-production/laying.jpg",
  steelTape: "/machine-production/steel-tape.jpg",
  armoured: "/machine-production/armoured.jpg",
  sheathing: "/machine-production/sheathing.jpg",
  braiding: "/machine-production/braiding.jpg",
  coiling: "/machine-production/coiling.jpg",
  annealing: "/machine-production/annealing.jpg",
} as const;

type ProcessImageRule = {
  image: (typeof PROCESS_IMAGES)[keyof typeof PROCESS_IMAGES];
  match: (text: string) => boolean;
};

const PROCESS_IMAGE_RULES: ProcessImageRule[] = [
  {
    image: PROCESS_IMAGES.drawing,
    match: (t) =>
      t.includes("drawing") ||
      t.includes("strip making") ||
      (t.includes("copper") &&
        !t.includes("anneal") &&
        !t.includes("bunch") &&
        !t.includes("tin")),
  },
  {
    image: PROCESS_IMAGES.annealing,
    match: (t) =>
      t.includes("anneal") || t.includes("tinning") || t.includes("tinned"),
  },
  {
    image: PROCESS_IMAGES.extrusion,
    match: (t) =>
      t.includes("extrusion") ||
      t.includes("extruder") ||
      t.includes("extrud") ||
      /(^|[^a-z])ext([\s_-]|$|\d)/.test(t),
  },
  {
    image: PROCESS_IMAGES.insulation,
    match: (t) => t.includes("insulation") || t.includes("insulat"),
  },
  {
    image: PROCESS_IMAGES.twisting,
    match: (t) =>
      t.includes("twisting") ||
      t.includes("twister") ||
      t.includes("twist") ||
      t.includes("quadding") ||
      t.includes("buncher") ||
      t.includes("bunch") ||
      /(^|[^a-z])tw([\s_-]|$|\d)/.test(t),
  },
  {
    image: PROCESS_IMAGES.laying,
    match: (t) => t.includes("laying") || t.includes("jelly"),
  },
  {
    image: PROCESS_IMAGES.steelTape,
    match: (t) =>
      t.includes("steel tape") ||
      t.includes("dst") ||
      t.includes("tapping") ||
      t.includes("strip rewind"),
  },
  {
    image: PROCESS_IMAGES.armoured,
    match: (t) =>
      t.includes("armoured") ||
      t.includes("armored") ||
      t.includes("armour") ||
      t.includes("armor"),
  },
  {
    image: PROCESS_IMAGES.sheathing,
    match: (t) =>
      t.includes("sheathing") ||
      t.includes("sheather") ||
      t.includes("sheath") ||
      /(^|[^a-z])osh([\s_-]|$)/.test(t) ||
      /(^|[^a-z])sh([\s_-]|$|\d)/.test(t),
  },
  {
    image: PROCESS_IMAGES.braiding,
    match: (t) => t.includes("braiding") || t.includes("braid"),
  },
  {
    image: PROCESS_IMAGES.coiling,
    match: (t) =>
      t.includes("coiling") ||
      t.includes("coil") ||
      t.includes("packing") ||
      t.includes("rewinding") ||
      t.includes("loading") ||
      t.includes("stacking"),
  },
];

/** Pick process/machine card art from labels; always returns an image. */
export function resolveProcessImage(
  ...parts: Array<string | null | undefined>
): string {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  if (text) {
    for (const rule of PROCESS_IMAGE_RULES) {
      if (rule.match(text)) return rule.image;
    }
  }
  return PROCESS_IMAGES.extrusion;
}
