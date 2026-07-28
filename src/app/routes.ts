import { createElement, lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { Home } from "./pages/Home";
import {
  StemCollageLoader,
  LooperLoader,
  StemSeparatorLoader,
  GatoLoader,
  GridLoader,
  ArcLoader,
} from "./components/PageLoader";

const StemCollagePage   = lazy(() => import("./pages/StemCollagePage").then(m => ({ default: m.StemCollagePage })));
const LooperPage        = lazy(() => import("./pages/LooperPage").then(m => ({ default: m.LooperPage })));
const StemSeparatorPage = lazy(() => import("./pages/StemSeparatorPage").then(m => ({ default: m.StemSeparatorPage })));
const GatoPage          = lazy(() => import("./pages/GatoPage").then(m => ({ default: m.GatoPage })));
const GridPage          = lazy(() => import("./pages/GridPage").then(m => ({ default: m.GridPage })));
const ArcPage           = lazy(() => import("./pages/ArcPage").then(m => ({ default: m.ArcPage })));

const wrap = (Component: React.ComponentType, Loader: React.ComponentType) => () =>
  createElement(Suspense, { fallback: createElement(Loader) }, createElement(Component));

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true,            Component: Home },
      { path: "stem-collage",   Component: wrap(StemCollagePage,   StemCollageLoader) },
      { path: "loop-station",   Component: wrap(LooperPage,        LooperLoader) },
      { path: "stem-separator", Component: wrap(StemSeparatorPage, StemSeparatorLoader) },
      { path: "gato",           Component: wrap(GatoPage,          GatoLoader) },
      { path: "grid",           Component: wrap(GridPage,          GridLoader) },
      { path: "arc",            Component: wrap(ArcPage,           ArcLoader) },
    ],
  },
]);
