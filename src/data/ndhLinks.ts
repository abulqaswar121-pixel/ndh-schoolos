import type { NDHEcosystemLink } from "@/types/school";

/**
 * Official Najeeb Digital Hub (ndh.com.ng) Contact & Ecosystem Constants
 */
export const NDH_PARENT_CONTACT = {
  parentName: "Najeeb Digital Hub",
  parentUrl: "https://ndh.com.ng",
  phoneDisplay: "0902 993 2794",
  phoneTel: "+2349029932794",
  phoneHref: "tel:+2349029932794",
  whatsappUrl: "https://wa.me/2349029932794",
  whatsappHref: "https://wa.me/2349029932794",
  email: "support@ndh.com.ng",
  address: "Marmaron Nufawa Western Bye Pass, Sokoto, Nigeria",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Marmaron%20Nufawa%20Western%20Bye%20Pass%20Sokoto%2C%20Nigeria",
} as const;

export const DEFAULT_NDH_ECOSYSTEM_LINKS: NDHEcosystemLink[] = [
  {
    id: "ndh-parent",
    label: "Najeeb Digital Hub",
    url: "https://ndh.com.ng",
    tagline: "The NDH Family of Businesses",
  },
  {
    id: "ndh-agency",
    label: "NDH Agency",
    url: "https://ndh.com.ng/businesses/agency",
    tagline: "Enterprise Digital Delivery",
  },
  {
    id: "ndh-academy",
    label: "NDH Academy",
    url: "https://ndh.com.ng/businesses/academy",
    tagline: "60 Practical Tech & AI Courses",
  },
  {
    id: "ndh-farmfund",
    label: "NDH FarmFund",
    url: "https://ndh.com.ng/businesses/agricapital",
    tagline: "Cooperative Farming & Equity",
  },
  {
    id: "ndh-market",
    label: "NDH Market",
    url: "https://ndh.com.ng/businesses/estore",
    tagline: "Multi-Vendor Commerce",
  },
];
