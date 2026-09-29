import type { RoomType } from "@prisma/client";

// Shared stock-photo pool, reused by every stubbed "generation" feature
// (lib/aiConceptGenerator.ts, lib/contestGenerator.ts, lib/personaCommission.ts)
// instead of each maintaining its own copy. See README "What's stubbed" --
// a real version replaces this with an actual image-to-image API call.
export const ROOM_IMAGE_POOL: Record<RoomType, string[]> = {
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
  HOME_OFFICE: ["photo-1518481852452-9415b262eba4", "photo-1600607687920-4e2a09cf159d"],
  ENTRYWAY: ["photo-1593642532400-2682810df593", "photo-1519710164239-da123dc03ef4"],
  OTHER: ["photo-1493809842364-78817add7ffb", "photo-1554995207-c18c203602cb"],
};

export function imageUrlFor(photoId: string) {
  return `https://images.unsplash.com/${photoId}?w=1200`;
}

/** Deterministic pick from an array based on a string seed -- same seed always picks the same item. */
export function stablePick<T>(arr: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[hash % arr.length];
}
