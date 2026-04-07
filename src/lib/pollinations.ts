export function getPollinationsUrl(title: string, country: string): string {
  const prompt = encodeURIComponent(`A beautiful professional food photo of ${title}, ${country} cuisine, on a rustic plate, warm natural lighting, editorial food photography`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=600&height=400&nologo=true`;
}
