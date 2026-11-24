import {AuthProvider} from './context/AuthContext';
import {ChatNotificationsProvider} from './context/ChatNotificationsContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <AuthProvider>
      <ChatNotificationsProvider>
        <AppRoutes />
      </ChatNotificationsProvider>
    </AuthProvider>
  );
}
