import Register from "./pages/Register";
import Login from "./pages/Login";
import { LoginForm } from "./components/login-form";
import App from "./App.jsx";
import Dashboard from "./pages/Dashboard";

import ProtectedRoute from "./components/ProtectedRoute";
import CaseView from "./pages/CaseView";

const routes = [
  {
    path: "/",
    element: <App />,
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
    ],
  },
];

export default routes;
