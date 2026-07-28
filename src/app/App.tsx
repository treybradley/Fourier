import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return (
    <div data-fourier-app>
      <RouterProvider router={router} />
    </div>
  );
}
