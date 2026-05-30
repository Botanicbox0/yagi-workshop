export type TwinCardTone = "fashion" | "beauty" | "music" | "product";

export type LoginShowcaseCategory = {
  key: "video_campaign" | "lookbook" | "product" | "digital_twin";
  tone: TwinCardTone;
  image: string;
  labelKey: "video_campaign" | "lookbook" | "product" | "digital_twin";
};

const SHOWCASE_BASE = "/showcase";

export const LOGIN_SHOWCASE_CATEGORIES: LoginShowcaseCategory[] = [
  {
    key: "video_campaign",
    tone: "music",
    image: `${SHOWCASE_BASE}/video-campaign.png`,
    labelKey: "video_campaign",
  },
  {
    key: "lookbook",
    tone: "fashion",
    image: `${SHOWCASE_BASE}/lookbook.webp`,
    labelKey: "lookbook",
  },
  {
    key: "product",
    tone: "product",
    image: `${SHOWCASE_BASE}/product.png`,
    labelKey: "product",
  },
  {
    key: "digital_twin",
    tone: "beauty",
    image: `${SHOWCASE_BASE}/digital-twin.png`,
    labelKey: "digital_twin",
  },
];
