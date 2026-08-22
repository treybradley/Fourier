import { useEffect } from "react";
import { Outlet } from "react-router";
import { applyVisualMode, readVisualMode } from "./utils/visualMode";

export function Root() {
  useEffect(() => {
    applyVisualMode(readVisualMode());
  }, []);

  return <Outlet />;
}
