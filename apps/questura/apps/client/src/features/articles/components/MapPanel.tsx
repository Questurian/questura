"use client";
import dynamic from "next/dynamic";
import { useListicleMapSync } from "./ListicleMapSync";
import type { MapPanelProps } from "./GoogleMapPanel";
export type { MapPanelProps } from "./GoogleMapPanel";

function MapWaiting() { return <div aria-hidden="true" className="h-full w-full bg-paper" />; }
const MapTeaser = dynamic(() => import("./MapTeaser").then((module) => module.MapTeaser), { ssr: false, loading: MapWaiting });
const GoogleMapPanel = dynamic(() => import("./GoogleMapPanel"), { ssr: false, loading: MapWaiting });

/** Neither Google's API nor its rendering code loads before access is known. */
export function MapPanel(props: MapPanelProps = {}) {
  const { access } = useListicleMapSync();
  if (access === "teaser") return <MapTeaser insetBottomPx={props.viewportInsetBottomPx} />;
  if (access === "waiting") return <MapWaiting />;
  return <GoogleMapPanel {...props} />;
}
