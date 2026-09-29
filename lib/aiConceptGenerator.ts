import type { RoomType } from "@prisma/client";

// Stubbed generation: no real image model is called yet (see README "What's
// stubbed"). Swap generateConcept's body for a real image-to-image API call
// (e.g. against the homeowner's own photoUrl) without touching callers --
// lib/actions.ts only depends on this function's shape.

export const CONCEPT_STYLES = [
  "Bright & Minimal",
  "Cozy & Warm",
  "Bold & Colorful",
  "Modern Industrial",
] as const;

export type ConceptStyle = (typeof CONCEPT_STYLES)[number];

const IMAGE_POOL: Record<RoomType, string[]> = {
  KITCHEN: [
    "photo-1583847268964-b28dc8f51f92",
    "photo-1567016432779-094069958ea5",
    "photo-1584622650111-993a426fbf0a",
    "photo-1524758631624-e2822e304c36",
    "photo-1543353071-873f17a7a088",
  ],
  BATHROOM: [
    "photo-1616486338812-3dadae4b4ace",
    "photo-1616594039964-ae9021a400a0",
    "photo-1598928506311-c55ded91a20c",
    "photo-1533090161767-e6ffed986c88",
    "photo-1600489000022-c2086d79f9d4",
  ],
  LIVING_ROOM: [
    "photo-1493809842364-78817add7ffb",
    "photo-1554995207-c18c203602cb",
    "photo-1449247709967-d4461a6a6103",
    "photo-1560448204-e02f11c3d0e2",
    "photo-1522708323590-d24dbb6b0267",
  ],
  BEDROOM: [
    "photo-1600566753086-00f18fb6b3ea",
    "photo-1571508601891-ca5e7a713859",
    "photo-1615873968403-89e068629265",
    "photo-1502672260266-1c1ef2d93688",
    "photo-1618221195710-dd6b41faaea6",
  ],
  OUTDOOR: ["photo-1600607687939-ce8a6c25118c", "photo-1533749047139-189de3cf06d3"],
  OTHER: ["photo-1493809842364-78817add7ffb", "photo-1554995207-c18c203602cb"],
};

const STYLE_NOTES: Record<ConceptStyle, string> = {
  "Bright & Minimal": "clear the counters, go mostly white and light wood, and let one or two objects breathe",
  "Cozy & Warm": "warm wood tones, soft textiles, and layered lighting instead of one overhead fixture",
  "Bold & Colorful": "one saturated accent color, mixed patterns, and a statement light fixture",
  "Modern Industrial": "matte black fixtures, exposed materials, and simple geometric lines",
};

export function generateConcept(roomType: RoomType, style: ConceptStyle) {
  const pool = IMAGE_POOL[roomType];
  const photoId = pool[Math.floor(Math.random() * pool.length)];
  return {
    imageUrl: `https://images.unsplash.com/${photoId}?w=1200`,
    description: `Quick AI take, ${style.toLowerCase()}: ${STYLE_NOTES[style]}. Rough starting point -- a real designer's entry will be more specific to your space.`,
  };
}
