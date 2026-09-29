import type { RoomType } from "@prisma/client";
import { ROOM_IMAGE_POOL, imageUrlFor, stablePick } from "@/lib/roomImagePool";
import { AI_PERSONAS, type PersonaKey } from "@/lib/personas";

// Paying to commission a persona buys a few concepts in THAT persona's fixed
// style, not a random generic one -- see lib/personas.ts. Images and product
// picks are deterministic per (persona, room type, slot), not random, so the
// same persona always looks like themselves for a given room: re-running
// this for "Otto Bauhaus" x "KITCHEN" always returns the same 3 looks.
export const COMMISSION_COST = 6;
export const COMMISSION_CONCEPT_COUNT = 3;

export function generateCommissionConcepts(personaKey: PersonaKey, roomType: RoomType) {
  const persona = AI_PERSONAS[personaKey];
  const pool = ROOM_IMAGE_POOL[roomType];

  return Array.from({ length: COMMISSION_CONCEPT_COUNT }, (_, i) => {
    const photoId = stablePick(pool, `${personaKey}:${roomType}:${i}`);
    return {
      imageUrl: imageUrlFor(photoId),
      description: `${persona.style}, look ${i + 1}: ${persona.signature}.`,
      productLink: { label: persona.signatureProduct.label, price: persona.signatureProduct.price },
    };
  });
}
