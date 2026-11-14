import ProtectedRoute from './ProtectedRoute';export default function TechnicianRoute({children}){return <ProtectedRoute allowedRoles={['technician']}>{children}</ProtectedRoute>}
