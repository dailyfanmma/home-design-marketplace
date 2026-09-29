import type { RoomType } from "@prisma/client";
import { ROOM_IMAGE_POOL, imageUrlFor } from "@/lib/roomImagePool";

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

const STYLE_NOTES: Record<ConceptStyle, string> = {
  "Bright & Minimal": "clear the counters, go mostly white and light wood, and let one or two objects breathe",
  "Cozy & Warm": "warm wood tones, soft textiles, and layered lighting instead of one overhead fixture",
  "Bold & Colorful": "one saturated accent color, mixed patterns, and a statement light fixture",
  "Modern Industrial": "matte black fixtures, exposed materials, and simple geometric lines",
};

export function generateConcept(roomType: RoomType, style: ConceptStyle) {
  const pool = ROOM_IMAGE_POOL[roomType];
  const photoId = pool[Math.floor(Math.random() * pool.length)];
  return {
    imageUrl: imageUrlFor(photoId),
    description: `Quick AI take, ${style.toLowerCase()}: ${STYLE_NOTES[style]}. Rough starting point -- a real designer's entry will be more specific to your space.`,
  };
}
