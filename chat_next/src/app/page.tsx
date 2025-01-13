'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container mx-auto p-4">
      <h1>Home Page</h1>
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
    </div>
  );
}
