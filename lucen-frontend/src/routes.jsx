import Register from "./pages/Register";
import Login from "./pages/Login";
import { LoginForm } from "./components/login-form";
import App from "./App.jsx";
import HomePage from "./pages/HomePage";

import Dashboard from "./pages/Dashboard";

import ProtectedRoute from "./components/ProtectedRoute";
import CaseView from "./pages/CaseView";
import ClientIddForm from "./pages/ClientIddForm";
import DraftingStudioPage from "./pages/DraftingStudioPage";

const routes = [
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/reference",
    element: <LoginForm />,
  },
  {
    path: "/idd/:token",
    element: <ClientIddForm />,
  },
  //   {
  //     path: "/dashboard",
  //     element: <Dashboard />,
  //   },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/case/:caseId",
        element: <CaseView />,
      },
      {
        path: "/case/:caseId/draft",
        element: <DraftingStudioPage />,
      },
    ],
  },
];

export default routes;
