/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {createBrowserRouter, Navigate} from "react-router-dom";

import Shell from "@/components/layout/Shell.js";
import FleetPage from "@/routes/FleetPage.js";
import GroundStationsPage from "@/routes/GroundStationsPage.js";
import NotFoundPage from "@/routes/NotFoundPage.js";
import ReportsPage from "@/routes/ReportsPage.js";
import SatellitePage from "@/routes/SatellitePage.js";

/* Routes /////////////////////////////////////////////////////////////////////////////////////////////////////////// */

export const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      {index: true, element: <Navigate to="/fleet" replace />},
      {path: "fleet", element: <FleetPage />},
      {path: "fleet/:satelliteId", element: <SatellitePage />},
      {path: "ground-stations", element: <GroundStationsPage />},
      {path: "reports", element: <ReportsPage />},
      {path: "*", element: <NotFoundPage />},
    ],
  },
]);

