// Method steps are stored as a flat string array. A step string that starts
// with the marker below is a section heading (e.g. "## For the Rice"), not a
// step. This keeps old recipes working unchanged and makes drag-and-drop easy.

export const SECTION_PREFIX = '## ';

export interface MethodStep {
  text: string;
  /** Position in the flat instructions array. */
  index: number;
}

export interface MethodSection {
  /** null for steps that appear before any section heading. */
  title: string | null;
  steps: MethodStep[];
}

export function isSectionTitle(text: string): boolean {
  return text.trimStart().startsWith(SECTION_PREFIX);
}

export function toSectionTitle(text: string): string {
  return SECTION_PREFIX + text;
}

export function parseMethod(instructions: string[]): MethodSection[] {
  const sections: MethodSection[] = [];
  let current: MethodSection = { title: null, steps: [] };

  instructions.forEach((raw, i) => {
    if (isSectionTitle(raw)) {
      if (current.title !== null || current.steps.length > 0) sections.push(current);
      current = { title: raw.trim().slice(SECTION_PREFIX.length), steps: [] };
    } else {
      current.steps.push({ text: raw, index: i });
    }
  });
  if (current.title !== null || current.steps.length > 0) sections.push(current);
  return sections;
}

/** True when the recipe uses at least one section heading. */
export function hasSections(instructions: string[]): boolean {
  return instructions.some(isSectionTitle);
}
