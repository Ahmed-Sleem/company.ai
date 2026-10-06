/**
 * The studio plan, the desk positions and the sprite catalogue.
 *
 * GENERATED from design/owner-demo/acme-studio-os.html — do not edit by hand.
 * Rebuild: node scripts/gen-owner-data.mjs        Verify in sync: node scripts/gen-owner-data.mjs --check
 */

/** The plan is drawn at this size, and layout snaps to SNAP while building. */
export const WORLD = { w: 1920, h: 1200, snap: 16, grain: 2 } as const;

/** The nine room themes the owner's demo can paint a room with. */
export const ROOM_THEMES = [
  'executive-suite', 'engineering-lab', 'boardroom-hub', 'design-studio',
  'operations-hub', 'lounge-area',
] as const;
export type RoomTheme = (typeof ROOM_THEMES)[number];

export interface Room {
  id: string; key: string; name: string; sub: string;
  theme: RoomTheme; x: number; y: number; w: number; h: number;
}
export interface Desk {
  id: string; dept: string; deskType: string;
  x: number; y: number; w: number; h: number;
  /** Added by build mode: absent means "as the owner drew it". */
  agentId?: string | null;
}
export interface Prop {
  id: string; type: string; x: number; y: number; w: number; h: number; label: string;
}
export interface Sprite { id: string; l: string; c: 'Decor' | 'Electronics' | 'Furniture' | 'Props'; w: number; h: number }

/** The plan as the owner drew it. */
export const ROOMS: readonly Room[] = [
  {
    'id': 'exec',
    'key': 'exec',
    'name': 'Executive Wing',
    'sub': 'Leadership & Strategy',
    'theme': 'executive-suite',
    'x': 80,
    'y': 80,
    'w': 460,
    'h': 360
  },
  {
    'id': 'eng',
    'key': 'eng',
    'name': 'AI Core & Engineering Lab',
    'sub': 'Models · Systems · Infrastructure',
    'theme': 'engineering-lab',
    'x': 580,
    'y': 80,
    'w': 680,
    'h': 420
  },
  {
    'id': 'board',
    'key': 'board',
    'name': 'Boardroom',
    'sub': '',
    'theme': 'boardroom-hub',
    'x': 580,
    'y': 520,
    'w': 320,
    'h': 440
  },
  {
    'id': 'design',
    'key': 'design',
    'name': 'Design & Product Atelier',
    'sub': 'UI/UX · Assets · Prototypes',
    'theme': 'design-studio',
    'x': 80,
    'y': 480,
    'w': 460,
    'h': 480
  },
  {
    'id': 'ops',
    'key': 'ops',
    'name': 'Operations & Growth',
    'sub': '',
    'theme': 'operations-hub',
    'x': 930,
    'y': 520,
    'w': 330,
    'h': 440
  },
  {
    'id': 'lounge',
    'key': 'lounge',
    'name': 'Breakroom & Lounge',
    'sub': 'Recharge · Arcade · Social',
    'theme': 'lounge-area',
    'x': 1300,
    'y': 80,
    'w': 380,
    'h': 880
  }
] as const;

/** Where people sit. The owner's own positions and sizes. */
export const DESKS: readonly Desk[] = [
  {
    'id': 'd0',
    'dept': 'Executive',
    'x': 260,
    'y': 180,
    'deskType': 'sp-desk-straight',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd1',
    'dept': 'Executive',
    'x': 380,
    'y': 180,
    'deskType': 'sp-desk-straight',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd2',
    'dept': 'Engineering',
    'x': 620,
    'y': 220,
    'deskType': 'sp-desk-modesty-panel',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd3',
    'dept': 'Engineering',
    'x': 780,
    'y': 220,
    'deskType': 'sp-desk-modesty-panel',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd4',
    'dept': 'Engineering',
    'x': 940,
    'y': 220,
    'deskType': 'sp-desk-modesty-panel',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd5',
    'dept': 'Engineering',
    'x': 620,
    'y': 350,
    'deskType': 'sp-desk-modesty-panel',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd6',
    'dept': 'Engineering',
    'x': 780,
    'y': 350,
    'deskType': 'sp-desk-modesty-panel',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd7',
    'dept': 'Engineering',
    'x': 940,
    'y': 350,
    'deskType': 'sp-desk-modesty-panel',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd8',
    'dept': 'Design',
    'x': 240,
    'y': 560,
    'deskType': 'sp-desk-modesty-panel',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd9',
    'dept': 'Design',
    'x': 380,
    'y': 560,
    'deskType': 'sp-desk-modesty-panel',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd10',
    'dept': 'Design',
    'x': 240,
    'y': 690,
    'deskType': 'sp-desk-modesty-panel',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd11',
    'dept': 'Design',
    'x': 380,
    'y': 690,
    'deskType': 'sp-desk-modesty-panel',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd12',
    'dept': 'Operations',
    'x': 970,
    'y': 680,
    'deskType': 'sp-desk-straight',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd13',
    'dept': 'Operations',
    'x': 1110,
    'y': 680,
    'deskType': 'sp-desk-straight',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd14',
    'dept': 'Operations',
    'x': 970,
    'y': 810,
    'deskType': 'sp-desk-straight',
    'w': 84,
    'h': 84
  },
  {
    'id': 'd15',
    'dept': 'Operations',
    'x': 1110,
    'y': 810,
    'deskType': 'sp-desk-straight',
    'w': 84,
    'h': 84
  }
] as const;

/** The twenty-one pieces of furniture the owner placed. */
export const PROPS: readonly Prop[] = [
  {
    'id': 'p-bk-1',
    'type': 'sp-credenza-low',
    'x': 100,
    'y': 140,
    'w': 56,
    'h': 38,
    'label': 'Executive Library'
  },
  {
    'id': 'p-pl-1',
    'type': 'sp-plant-palm',
    'x': 480,
    'y': 140,
    'w': 46,
    'h': 56,
    'label': 'Fiddle Leaf Fig'
  },
  {
    'id': 'p-tb-1',
    'type': 'sp-desk-corner-l',
    'x': 140,
    'y': 280,
    'w': 56,
    'h': 42,
    'label': 'Private Discussion Table'
  },
  {
    'id': 'p-ch-1',
    'type': 'sp-chair-task',
    'x': 160,
    'y': 208,
    'w': 36,
    'h': 56,
    'label': 'Guest Chair'
  },
  {
    'id': 'p-srv-1',
    'type': 'sp-credenza-low',
    'x': 1194,
    'y': 130,
    'w': 56,
    'h': 38,
    'label': 'AI Compute Rack A'
  },
  {
    'id': 'p-srv-2',
    'type': 'sp-credenza-low',
    'x': 1122,
    'y': 130,
    'w': 56,
    'h': 38,
    'label': 'AI Compute Rack B'
  },
  {
    'id': 'p-wb-1',
    'type': 'sp-artwork-abstract',
    'x': 620,
    'y': 136,
    'w': 48,
    'h': 56,
    'label': 'Architecture Board'
  },
  {
    'id': 'p-bt-1',
    'type': 'sp-desk-straight',
    'x': 680,
    'y': 680,
    'w': 56,
    'h': 40,
    'label': 'Main Conference Table'
  },
  {
    'id': 'p-bc-1',
    'type': 'sp-chair-task',
    'x': 700,
    'y': 608,
    'w': 36,
    'h': 56,
    'label': 'Board Chair'
  },
  {
    'id': 'p-bc-2',
    'type': 'sp-chair-task',
    'x': 750,
    'y': 640,
    'w': 36,
    'h': 56,
    'label': 'Board Chair'
  },
  {
    'id': 'p-wb-2',
    'type': 'sp-artwork-abstract',
    'x': 100,
    'y': 536,
    'w': 48,
    'h': 56,
    'label': 'Design Moodboard'
  },
  {
    'id': 'p-cch-1',
    'type': 'sp-counter-reception-curved',
    'x': 100,
    'y': 760,
    'w': 56,
    'h': 40,
    'label': 'Studio Lounge Sofa'
  },
  {
    'id': 'p-ct-1',
    'type': 'sp-pedestal-mobile',
    'x': 180,
    'y': 780,
    'w': 42,
    'h': 56,
    'label': 'Design Sketch Table'
  },
  {
    'id': 'p-fl-1',
    'type': 'sp-cabinet-filing-tall',
    'x': 960,
    'y': 576,
    'w': 32,
    'h': 56,
    'label': 'Filing Storage'
  },
  {
    'id': 'p-wb-3',
    'type': 'sp-artwork-abstract',
    'x': 1060,
    'y': 576,
    'w': 48,
    'h': 56,
    'label': 'Operations Kanban'
  },
  {
    'id': 'p-fr-1',
    'type': 'sp-refrigerator-compact',
    'x': 1330,
    'y': 140,
    'w': 40,
    'h': 56,
    'label': 'Kitchen Fridge'
  },
  {
    'id': 'p-cf-1',
    'type': 'sp-mug',
    'x': 1380,
    'y': 156,
    'w': 56,
    'h': 56,
    'label': 'Espresso Bar'
  },
  {
    'id': 'p-cl-1',
    'type': 'sp-water-bottle',
    'x': 1446,
    'y': 140,
    'w': 30,
    'h': 56,
    'label': 'Water Dispenser'
  },
  {
    'id': 'p-arc-1',
    'type': 'sp-control-panel',
    'x': 1580,
    'y': 140,
    'w': 48,
    'h': 56,
    'label': 'Retro Arcade: Pixel Fighter'
  },
  {
    'id': 'p-cch-2',
    'type': 'sp-counter-reception-curved',
    'x': 1460,
    'y': 440,
    'w': 56,
    'h': 40,
    'label': 'Breakroom Sofa'
  },
  {
    'id': 'p-pl-2',
    'type': 'sp-plant-broadleaf',
    'x': 1600,
    'y': 440,
    'w': 46,
    'h': 56,
    'label': 'Indoor Palm'
  }
] as const;

/** The sprite catalogue: what each piece of art is called, and how big it draws. */
export const SPRITES: readonly Sprite[] = [
  {
    'id': 'sp-artwork-abstract',
    'l': 'Artwork Abstract',
    'c': 'Decor',
    'w': 24,
    'h': 28
  },
  {
    'id': 'sp-bin-recycling',
    'l': 'Bin Recycling',
    'c': 'Decor',
    'w': 21,
    'h': 28
  },
  {
    'id': 'sp-bin-waste',
    'l': 'Bin Waste',
    'c': 'Decor',
    'w': 22,
    'h': 28
  },
  {
    'id': 'sp-partition-fabric',
    'l': 'Partition Fabric',
    'c': 'Decor',
    'w': 24,
    'h': 28
  },
  {
    'id': 'sp-plant-broadleaf',
    'l': 'Plant Broadleaf',
    'c': 'Decor',
    'w': 23,
    'h': 28
  },
  {
    'id': 'sp-plant-palm',
    'l': 'Plant Palm',
    'c': 'Decor',
    'w': 23,
    'h': 28
  },
  {
    'id': 'sp-plant-snake',
    'l': 'Plant Snake',
    'c': 'Decor',
    'w': 18,
    'h': 28
  },
  {
    'id': 'sp-refrigerator-compact',
    'l': 'Refrigerator Compact',
    'c': 'Decor',
    'w': 20,
    'h': 28
  },
  {
    'id': 'sp-stand-umbrella',
    'l': 'Stand Umbrella',
    'c': 'Decor',
    'w': 16,
    'h': 28
  },
  {
    'id': 'sp-tree-indoor',
    'l': 'Tree Indoor',
    'c': 'Decor',
    'w': 22,
    'h': 28
  },
  {
    'id': 'sp-camera-security',
    'l': 'Camera Security',
    'c': 'Electronics',
    'w': 28,
    'h': 24
  },
  {
    'id': 'sp-clock-wall',
    'l': 'Clock Wall',
    'c': 'Electronics',
    'w': 27,
    'h': 28
  },
  {
    'id': 'sp-computer-tower',
    'l': 'Computer Tower',
    'c': 'Electronics',
    'w': 19,
    'h': 28
  },
  {
    'id': 'sp-control-panel',
    'l': 'Control Panel',
    'c': 'Electronics',
    'w': 24,
    'h': 28
  },
  {
    'id': 'sp-copier-multifunction',
    'l': 'Copier Multifunction',
    'c': 'Electronics',
    'w': 21,
    'h': 28
  },
  {
    'id': 'sp-lamp-desk',
    'l': 'Lamp Desk',
    'c': 'Electronics',
    'w': 22,
    'h': 28
  },
  {
    'id': 'sp-lamp-floor',
    'l': 'Lamp Floor',
    'c': 'Electronics',
    'w': 11,
    'h': 28
  },
  {
    'id': 'sp-laptop-closed',
    'l': 'Laptop Closed',
    'c': 'Electronics',
    'w': 28,
    'h': 18
  },
  {
    'id': 'sp-laptop-open-off',
    'l': 'Laptop Open Off',
    'c': 'Electronics',
    'w': 28,
    'h': 27
  },
  {
    'id': 'sp-monitor-single-off',
    'l': 'Monitor Single Off',
    'c': 'Electronics',
    'w': 27,
    'h': 28
  },
  {
    'id': 'sp-printer-small',
    'l': 'Printer Small',
    'c': 'Electronics',
    'w': 28,
    'h': 25
  },
  {
    'id': 'sp-projector',
    'l': 'Projector',
    'c': 'Electronics',
    'w': 28,
    'h': 23
  },
  {
    'id': 'sp-shredder',
    'l': 'Shredder',
    'c': 'Electronics',
    'w': 25,
    'h': 28
  },
  {
    'id': 'sp-ups',
    'l': 'Ups',
    'c': 'Electronics',
    'w': 23,
    'h': 28
  },
  {
    'id': 'sp-cabinet-filing-tall',
    'l': 'Cabinet Filing Tall',
    'c': 'Furniture',
    'w': 16,
    'h': 28
  },
  {
    'id': 'sp-chair-meeting',
    'l': 'Chair Meeting',
    'c': 'Furniture',
    'w': 21,
    'h': 28
  },
  {
    'id': 'sp-chair-task',
    'l': 'Chair Task',
    'c': 'Furniture',
    'w': 18,
    'h': 28
  },
  {
    'id': 'sp-chair-visitor',
    'l': 'Chair Visitor',
    'c': 'Furniture',
    'w': 21,
    'h': 28
  },
  {
    'id': 'sp-counter-reception-curved',
    'l': 'Counter Reception Curved',
    'c': 'Furniture',
    'w': 28,
    'h': 20
  },
  {
    'id': 'sp-credenza-low',
    'l': 'Credenza Low',
    'c': 'Furniture',
    'w': 28,
    'h': 19
  },
  {
    'id': 'sp-desk-corner-l',
    'l': 'Desk Corner L',
    'c': 'Furniture',
    'w': 28,
    'h': 21
  },
  {
    'id': 'sp-desk-modesty-panel',
    'l': 'Desk Modesty Panel',
    'c': 'Furniture',
    'w': 28,
    'h': 21
  },
  {
    'id': 'sp-desk-standing',
    'l': 'Desk Standing',
    'c': 'Furniture',
    'w': 28,
    'h': 23
  },
  {
    'id': 'sp-desk-straight',
    'l': 'Desk Straight',
    'c': 'Furniture',
    'w': 28,
    'h': 20
  },
  {
    'id': 'sp-pedestal-mobile',
    'l': 'Pedestal Mobile',
    'c': 'Furniture',
    'w': 21,
    'h': 28
  },
  {
    'id': 'sp-stool-high',
    'l': 'Stool High',
    'c': 'Furniture',
    'w': 18,
    'h': 28
  },
  {
    'id': 'sp-archive-box',
    'l': 'Archive Box',
    'c': 'Props',
    'w': 28,
    'h': 27
  },
  {
    'id': 'sp-calculator',
    'l': 'Calculator',
    'c': 'Props',
    'w': 28,
    'h': 27
  },
  {
    'id': 'sp-clipboard-blank',
    'l': 'Clipboard Blank',
    'c': 'Props',
    'w': 27,
    'h': 28
  },
  {
    'id': 'sp-folder-closed',
    'l': 'Folder Closed',
    'c': 'Props',
    'w': 28,
    'h': 25
  },
  {
    'id': 'sp-frame-photo-blank',
    'l': 'Frame Photo Blank',
    'c': 'Props',
    'w': 24,
    'h': 28
  },
  {
    'id': 'sp-headphones',
    'l': 'Headphones',
    'c': 'Props',
    'w': 27,
    'h': 28
  },
  {
    'id': 'sp-keys-set',
    'l': 'Keys Set',
    'c': 'Props',
    'w': 24,
    'h': 28
  },
  {
    'id': 'sp-mug',
    'l': 'Mug',
    'c': 'Props',
    'w': 28,
    'h': 28
  },
  {
    'id': 'sp-notebook-closed',
    'l': 'Notebook Closed',
    'c': 'Props',
    'w': 28,
    'h': 25
  },
  {
    'id': 'sp-organizer-desk',
    'l': 'Organizer Desk',
    'c': 'Props',
    'w': 28,
    'h': 25
  },
  {
    'id': 'sp-papers-stack',
    'l': 'Papers Stack',
    'c': 'Props',
    'w': 28,
    'h': 25
  },
  {
    'id': 'sp-pen-cup',
    'l': 'Pen Cup',
    'c': 'Props',
    'w': 19,
    'h': 28
  },
  {
    'id': 'sp-stapler',
    'l': 'Stapler',
    'c': 'Props',
    'w': 28,
    'h': 25
  },
  {
    'id': 'sp-succulent-small',
    'l': 'Succulent Small',
    'c': 'Props',
    'w': 21,
    'h': 28
  },
  {
    'id': 'sp-tape-dispenser',
    'l': 'Tape Dispenser',
    'c': 'Props',
    'w': 28,
    'h': 28
  },
  {
    'id': 'sp-usb-drive',
    'l': 'Usb Drive',
    'c': 'Props',
    'w': 28,
    'h': 25
  },
  {
    'id': 'sp-wastebasket-small',
    'l': 'Wastebasket Small',
    'c': 'Props',
    'w': 24,
    'h': 28
  },
  {
    'id': 'sp-water-bottle',
    'l': 'Water Bottle',
    'c': 'Props',
    'w': 15,
    'h': 28
  }
] as const;

/** The owner's nav, kept for the record: `world` is first there and last here (see contracts/views). */
export const OWNER_NAV: ReadonlyArray<readonly [string, string, string]> = [
  [
    'world',
    'World Map',
    'terminal'
  ],
  [
    'team',
    'Team',
    'team'
  ],
  [
    'tasks',
    'Tasks',
    'task'
  ],
  [
    'inbox',
    'Inbox',
    'inbox'
  ],
  [
    'comms',
    'Conversations',
    'chat'
  ],
  [
    'network',
    'Network',
    'network'
  ],
  [
    'settings',
    'Settings',
    'settings'
  ]
] as const;

const SPRITE_BY_ID = new Map(SPRITES.map((sprite) => [sprite.id, sprite]));
export const sprite = (id: string): Sprite | undefined => SPRITE_BY_ID.get(id);

/** The plan the app starts from — a copy, so build mode can move things without touching the data. */
export function defaultPlan() {
  return {
    rooms: ROOMS.map((room) => ({ ...room })),
    desks: DESKS.map((desk) => ({ ...desk })),
    props: PROPS.map((prop) => ({ ...prop })),
  };
}
export type Plan = ReturnType<typeof defaultPlan>;
