'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container mx-auto p-4">
      <div>
        <Link href="/">
          Home Page
        </Link>
      </div>
      <div>
        <Link href="/register">
          Register
        </Link>
      </div>
      <div>
        <Link href="/login">
          Login
        </Link>
      </div>
      <div>
        <Link href="/chat">
          Chat
        </Link>
      </div>

    </div>
  );
}
