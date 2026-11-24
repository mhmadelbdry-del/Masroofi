import { createContext, useContext, useState, type ReactNode } from "react";
const StartupContext = createContext({ complete: false, finish: () => {} });
export function StartupProvider({ children }: { children: ReactNode }) {
  const [complete, setComplete] = useState(false);
  return <StartupContext.Provider value={{ complete, finish: () => setComplete(true) }}>{children}</StartupContext.Provider>;
}
export function useStartupAnimation() { return useContext(StartupContext); }
