import Chat from '@/components/ChatRoom';
import { checkAuthStatus } from '@/lib/auth';
import { redirect } from 'next/navigation';


export default async function ChatPage() {

  const isAuthenticated = await checkAuthStatus();

  if (!isAuthenticated) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto p-4">
      <Chat />
    </div>
  );
}
