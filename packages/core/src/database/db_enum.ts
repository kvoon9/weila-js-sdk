function dbEnum<T extends number>(value: number | null | undefined): T {
  // SAFETY: these DB enums label the same numeric values the proto payload carries, so restoring the
  // enum type here changes only the label; an absent proto field keeps the record's 0 default.
  return (value ?? 0) as T
}

export { dbEnum }
