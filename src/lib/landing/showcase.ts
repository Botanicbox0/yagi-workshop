export type TwinCardTone = "fashion" | "beauty" | "music" | "product";

export type LoginShowcaseCategory = {
  key: "ads" | "lookbook" | "product" | "twin";
  tone: TwinCardTone;
  cards: Array<{
    image: string;
    name: string;
    personaType: string;
    labelKey: "ads" | "lookbook" | "product" | "twin";
  }>;
};

const SHOWCASE_BASE = "/showcase";

export const LOGIN_SHOWCASE_CATEGORIES: LoginShowcaseCategory[] = [
  {
    key: "ads",
    tone: "music",
    cards: [
      {
        image: `${SHOWCASE_BASE}/T79aQCM8f7eFe1m1r37uHgP9ao.png`,
        name: "MUSIC VIDEO",
        personaType: "CAMPAIGN",
        labelKey: "ads",
      },
      {
        image: `${SHOWCASE_BASE}/G0pL7Dm9M3mD99j03fcyGEgUjY.png`,
        name: "PERFORMANCE",
        personaType: "VISUAL",
        labelKey: "ads",
      },
      {
        image: `${SHOWCASE_BASE}/tg1ysZFxhPlRKe2Us6iGkzUDpk.png`,
        name: "BRAND FILM",
        personaType: "AI",
        labelKey: "ads",
      },
    ],
  },
  {
    key: "lookbook",
    tone: "fashion",
    cards: [
      {
        image: `${SHOWCASE_BASE}/gsNAPqkCU04uRK1O89t5nxHbS4w.jpg`,
        name: "FASHION",
        personaType: "LOOKBOOK",
        labelKey: "lookbook",
      },
      {
        image: `${SHOWCASE_BASE}/4klThJrMXKHxYTD9Jmv0ThXAzg.png`,
        name: "EDITORIAL",
        personaType: "STYLE",
        labelKey: "lookbook",
      },
      {
        image: `${SHOWCASE_BASE}/mSydJRxXVHE6sRMYBi53WGHhJ0.png`,
        name: "RUNWAY",
        personaType: "CAMPAIGN",
        labelKey: "lookbook",
      },
    ],
  },
  {
    key: "product",
    tone: "product",
    cards: [
      {
        image: `${SHOWCASE_BASE}/P1s69Cx6QN9fmsb3ZQXU0lmRa54.png`,
        name: "PRODUCT",
        personaType: "STILL",
        labelKey: "product",
      },
      {
        image: `${SHOWCASE_BASE}/M2BXk5NFhWuikuOOGQ4ptdWvguA.png`,
        name: "COMMERCE",
        personaType: "VISUAL",
        labelKey: "product",
      },
      {
        image: `${SHOWCASE_BASE}/P1s69Cx6QN9fmsb3ZQXU0lmRa54.png`,
        name: "DETAIL",
        personaType: "SHOT",
        labelKey: "product",
      },
    ],
  },
  {
    key: "twin",
    tone: "beauty",
    cards: [
      {
        image: `${SHOWCASE_BASE}/UySkdEqmpB677IbdpEN6eX1XDr0.jpg`,
        name: "PERSONA",
        personaType: "TWIN",
        labelKey: "twin",
      },
      {
        image: `${SHOWCASE_BASE}/8DCRAn55m52KypKtcCtXZZycqe8.png`,
        name: "IDENTITY",
        personaType: "AI",
        labelKey: "twin",
      },
      {
        image: `${SHOWCASE_BASE}/8kMfTJgJuWi59PuAeWLZsn5SLgw.jpg`,
        name: "AVATAR",
        personaType: "VISUAL",
        labelKey: "twin",
      },
    ],
  },
];
