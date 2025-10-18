'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/auth/signin' })}
      className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <LogOut className="w-4 h-4" />
      <span>Sign Out</span>
    </button>
  );
}
