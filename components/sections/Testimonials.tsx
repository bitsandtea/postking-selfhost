import type { ReactNode } from "react";
import type { JsonRecord } from "@/types/landing-page";
import { str } from "./shared";

/**
 * `content.testimonials`/`content.testimonialsSection` — confirmed to be
 * just `{title, buttons: {next, previous}}`, a carousel-nav label wrapper
 * with no testimonial data of its own (the real testimonials live under
 * `hero.testimonials` — see `components/sections/Hero.tsx`). `buttons.*`
 * are ARIA labels for the interactive carousel, never copy.
 */
export function Testimonials({ value }: { value: JsonRecord }): ReactNode {
  const title = str(value.title);
  if (!title) return null;
  return <h2>{title}</h2>;
}
