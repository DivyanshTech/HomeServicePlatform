import { useContext } from 'react';
import ChatNotificationsContext from '../context/chatNotificationsStore';

export default function useChatNotifications() {
  const context = useContext(ChatNotificationsContext);
  if (!context) throw new Error('useChatNotifications must be used within ChatNotificationsProvider');
  return context;
}
