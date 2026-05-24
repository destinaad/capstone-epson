import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardPage from '../pages/DashboardPage';
import { isManager } from '../utils/roles';

export default function RoleHome() {
  const { user } = useAuth();
  if (isManager(user?.role)) {
    return <Navigate to="/app/performance" replace />;
  }
  return <DashboardPage />;
}
