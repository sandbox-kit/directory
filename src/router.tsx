import { createBrowserRouter } from "react-router-dom";
import { PageError } from "@/components/page-error";
import { HomePage } from "@/routes/home";
import { homeLoader } from "@/routes/home.loader";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomePage,
    loader: homeLoader,
    errorElement: <PageError />,
  },
]);
