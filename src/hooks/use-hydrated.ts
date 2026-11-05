"use client";
import { useEffect, useState } from "react";

/** True after mount. Use to render localStorage-backed state without hydration mismatches. */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
