import LoginForm from '@/components/LoginForm'
import { checkAuthStatus } from '@/lib/auth';
import { redirect } from 'next/navigation';


export default async function LoginPage() {
  const isAuthenticated = await checkAuthStatus();

  if (isAuthenticated) {
    redirect('/chat'); // or in other scenario we could redirect to home or smth like that 
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <LoginForm />
    </div>
  )
}


