export function mergeMessages(
  fallback: Record<string, unknown>,
  messages: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys({ ...fallback, ...messages }).map((key) => {
      const base = fallback[key];
      const translated = messages[key];

      if (
        base &&
        translated &&
        typeof base === "object" &&
        typeof translated === "object"
      ) {
        return [
          key,
          mergeMessages(
            base as Record<string, unknown>,
            translated as Record<string, unknown>,
          ),
        ];
      }

      return [key, translated ?? base];
    }),
  );
}
