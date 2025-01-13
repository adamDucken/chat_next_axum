import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function checkAuthStatus(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken?.value) {
      return false;
    }

    const response = await fetch('http://localhost:3001/check', {
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      return false;
    }

    return response.ok;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token');

  if (!authToken?.value) {
    redirect('/login');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${authToken.value}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    redirect('/login');
  }

  return response;
}
