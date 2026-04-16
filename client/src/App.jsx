import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Meetings from "./pages/Meetings";
import MeetingDetails from "./pages/MeetingDetails";
import CreateMom from "./pages/CreateMom";
import ShareView from "./pages/ShareView";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Documents from "./pages/Documents";
import Reports from "./pages/Reports";
import ActionItems from "./pages/ActionItems";
import MinutesEditor from "./pages/MinutesEditor";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/share/:token" element={<ShareView />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/meeting/:id" element={<MeetingDetails />} />
            <Route path="/meeting/:id/create-mom" element={<CreateMom />} />
            <Route path="/meeting/:id/minutes" element={<MinutesEditor />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/action-items" element={<ActionItems />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;