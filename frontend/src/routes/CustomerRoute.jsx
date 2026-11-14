import ProtectedRoute from './ProtectedRoute';export default function CustomerRoute({children}){return <ProtectedRoute allowedRoles={['customer']}>{children}</ProtectedRoute>}
