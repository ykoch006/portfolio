import { youtube } from "@/lib/site";

// each prop is a physical object in the project corner; add a new kind in ProjectCorner.tsx
export type ProjectProp = "gramophone" | "maquette" | "poster" | "record";

export type ProjectLink = { label: string; href: string; external?: boolean };

export type HideoutProject = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  prop: ProjectProp;
  links: ProjectLink[];
};

export const PROJECTS: HideoutProject[] = [
  {
    id: "demos",
    title: "Demos",
    tagline: "unreleased tracks",
    description: "Song sketches and unfinished ideas, played straight off the hard drive.",
    prop: "gramophone",
    links: [{ label: "Listen to the demos", href: "/demos" }],
  },
  {
    id: "gama-london",
    title: "Gama London",
    tagline: "luxury residential interiors",
    description: "A single-page site for Gama London's luxury residential interiors.",
    prop: "maquette",
    links: [{ label: "Open the site", href: "/gama-london" }],
  },
  {
    id: "gama-cyprus",
    title: "Gama Cyprus",
    tagline: "furniture & advertising",
    description:
      "A multi-page site for Gama Cyprus: bespoke furniture and advertising displays, designed and built in Cyprus.",
    prop: "poster",
    links: [
      { label: "Open the site", href: "/gama-cyprus" },
      { label: "Portfolio page", href: "/gama-cyprus/portfolio.html" },
    ],
  },
  {
    id: "mashup",
    title: youtube.featured.title,
    tagline: "featured mashup",
    description: "The current featured mashup from the channel.",
    prop: "record",
    links: [
      { label: "Watch on YouTube", href: `https://www.youtube.com/watch?v=${youtube.featured.id}`, external: true },
      { label: `More on ${youtube.handle}`, href: youtube.channelUrl, external: true },
    ],
  },
];
