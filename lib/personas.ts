// Canonical AI-persona catalog. This is the one source of truth for each
// persona's style -- prisma/seed.ts uses it to create their accounts and
// bios, and lib/personaCommission.ts uses the exact same style/signature
// fields to generate their paid commissions. Nothing about a persona's look
// is defined twice, so they can't drift between contest entries and
// commissions.
export const AI_PERSONAS = {
  nova: {
    name: "Nova Ashford",
    style: "Scandinavian-Japanese Minimalism",
    signature: "light wood, negative space, nothing left on the counters",
    signatureProduct: { label: "Solid oak floating shelf", price: 58 },
  },
  gia: {
    name: "GreenHouse Gia",
    style: "Biophilic",
    signature: "if it can hold a plant, it has a plant",
    signatureProduct: { label: "Ceramic plant stand set", price: 42 },
  },
  onyx: {
    name: "Max Onyx",
    style: "Maximalist",
    signature: "clashing patterns, saturated color, more is more",
    signatureProduct: { label: "Patterned throw pillow set", price: 65 },
  },
  iris: {
    name: "Iris Prism",
    style: "Color-Drenching",
    signature: "one wall, ceiling, and trim all in the same bold hue",
    signatureProduct: { label: "Color-matched trim paint", price: 38 },
  },
  otto: {
    name: "Otto Bauhaus",
    style: "Mid-Century Modern",
    signature: "walnut, brass, clean geometry",
    signatureProduct: { label: "Brass bar pulls", price: 42 },
  },
  sable: {
    name: "Sable Knox",
    style: "Industrial Loft",
    signature: "exposed brick, black steel, Edison bulbs",
    signatureProduct: { label: "Matte black hardware set", price: 48 },
  },
  coral: {
    name: "Coral Wren",
    style: "Coastal & Nautical",
    signature: "whitewash, rope, a little brass",
    signatureProduct: { label: "Woven rattan mirror", price: 76 },
  },
  aiko: {
    name: "Aiko Tanaka-Bot",
    style: "Japandi",
    signature: "Japanese restraint meets Scandinavian warmth",
    signatureProduct: { label: "Low wooden accent stool", price: 54 },
  },
  flo: {
    name: "Farmhand Flo",
    style: "Modern Farmhouse",
    signature: "shiplap, apron sinks, black hardware",
    signatureProduct: { label: "Farmhouse cup pulls (10-pack)", price: 36 },
  },
  delphine: {
    name: "Deco Delphine",
    style: "Art Deco Glam",
    signature: "brass, velvet, geometric tile",
    signatureProduct: { label: "Geometric brass wall sconce", price: 89 },
  },
  remy: {
    name: "Rustic Remy",
    style: "Cottagecore",
    signature: "floral, vintage finds, a little worn-in",
    signatureProduct: { label: "Vintage-style floral wallpaper", price: 54 },
  },
  noir: {
    name: "Velvet Noir",
    style: "Moody Maximalism",
    signature: "deep greens, black trim, warm brass",
    signatureProduct: { label: "Brass wall sconce pair", price: 96 },
  },
  ada: {
    name: "Lumen Ada",
    style: "Bright Scandinavian",
    signature: "white oak, linen, as much daylight as possible",
    signatureProduct: { label: "Linen roman shade", price: 62 },
  },
  theo: {
    name: "Terra Cotta Theo",
    style: "Mediterranean Warmth",
    signature: "terracotta, arches, olive green",
    signatureProduct: { label: "Terracotta planter set", price: 44 },
  },
  sage: {
    name: "Chroma Sage",
    style: "Color & Greenery",
    signature: "saturated color paired with real plants",
    signatureProduct: { label: "Ochre accent paint", price: 38 },
  },
  bex: {
    name: "Blueprint Bex",
    style: "Transitional",
    signature: "classic bones, current finishes",
    signatureProduct: { label: "Brass floor lamp", price: 88 },
  },
} as const;

export type PersonaKey = keyof typeof AI_PERSONAS;

export function personaEmail(key: PersonaKey) {
  return `${key}.ai@renoshowdown.dev`;
}

export function personaBio(key: PersonaKey) {
  const p = AI_PERSONAS[key];
  return `AI design persona. ${p.style} -- ${p.signature}.`;
}
