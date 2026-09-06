import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Scheduled from "./pages/Scheduled";
import Sent from "./pages/Sent";
import Compose from "./pages/Compose";
import EmailDetail from "./pages/EmailDetail";
import DashboardLayout from "./layouts/DashboardLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route
          path="/"
          element={<Login />}
        />

        {/* Google OAuth callback */}
        <Route
          path="/auth/callback"
          element={<AuthCallback />}
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={<DashboardLayout />}
        >
          <Route
            index
            element={
              <Navigate
                to="/dashboard/scheduled"
                replace
              />
            }
          />

          <Route
            path="scheduled"
            element={<Scheduled />}
          />

          <Route
            path="sent"
            element={<Sent />}
          />

          <Route
            path="compose"
            element={<Compose />}
          />

          <Route
            path="email/:emailId"
            element={<EmailDetail />}
          />
        </Route>

        {/* Unknown routes */}
        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;