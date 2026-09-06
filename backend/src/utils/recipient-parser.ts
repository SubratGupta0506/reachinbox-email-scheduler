export const parseRecipients = (
  content: string
): string[] => {
  const emails = content
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    );

  return [...new Set(emails)];
};