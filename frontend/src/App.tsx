import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import CandidateLayout from './layouts/CandidateLayout';
import Login from './components/Login';
import { InterviewSession } from './pages/InterviewSession';
import { useAppStore } from './store/useAppStore';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { isAuthenticated, userRole } = useAppStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole && !allowedRoles.includes(userRole)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'reviewer']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<div>Admin Dashboard</div>} />
          <Route path="candidates" element={<div>Candidates List</div>} />
          <Route path="settings" element={<div>Settings</div>} />
        </Route>

        <Route path="/interview" element={<CandidateLayout />}>
          <Route path=":token" element={<InterviewSession />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
