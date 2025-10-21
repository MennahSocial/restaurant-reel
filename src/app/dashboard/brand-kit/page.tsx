import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import BrandKitForm from '@/components/BrandKitForm';
import { Palette, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Define the shape of the data we fetch
interface BrandKitData {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoUrl: string | null;
}

export default async function BrandKitPage() {
  const session = await getServerSession(authOptions as any) as any;

  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  // Fetch the user's existing brand kit or use defaults
  const userBrandKit = await prisma.reelBrandKit.findUnique({
    where: { userId: session.user.id },
    select: {
      primaryColor: true,
      secondaryColor: true,
      fontFamily: true,
      logoUrl: true,
    }
  });

  const defaultKit: BrandKitData = {
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    fontFamily: 'Inter',
    logoUrl: null,
  };

  const brandKit: BrandKitData = {
    ...defaultKit,
    ...(userBrandKit || {}),
  };


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Brand Kit Management</h1>
          <p className="text-gray-600 mt-1">Define your restaurant's colors, font, and logo for consistent reels.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-2xl font-semibold text-gray-800 border-b pb-4">
            <Palette className="w-6 h-6 text-blue-600" />
            <span>Brand Colors & Typography</span>
          </div>
          <p className="text-gray-600">
            These settings will automatically be applied to text overlays and effects in the editor.
          </p>
        </div>
        
        <BrandKitForm initialData={brandKit} />
      </div>
    </div>
  );
}