export function slugGradient(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  const hue1 = hash % 360;
  const hue2 = (hue1 + 45) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 30% 85%), hsl(${hue2} 30% 70%))`;
}
