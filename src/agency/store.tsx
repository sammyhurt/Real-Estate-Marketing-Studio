import { createContext, useContext } from "react";

import type { AgencyData, Client } from "./data";
import type { TabId } from "./tabs";

export interface Store {
  d: AgencyData | null;
  refresh: () => Promise<boolean>;
  goto: (t: TabId, clientKey?: string) => void;
  /** The client picked at the top of the page ("" = all clients). */
  pick: string;
  setPick: (k: string) => void;
  client: Client | null;
}
const Ctx = createContext<Store | null>(null);
export const StoreProvider = Ctx.Provider;
export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
