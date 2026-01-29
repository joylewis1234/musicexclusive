export const safeStringify = (value: unknown) => {
  try {
    if (value instanceof Error) {
      return JSON.stringify(
        { name: value.name, message: value.message, stack: value.stack, ...(value as any) },
        null,
        2,
      );
    }
    return JSON.stringify(value, null, 2);
  } catch {
    try {
      return String(value);
    } catch {
      return "[unstringifiable]";
    }
  }
};
