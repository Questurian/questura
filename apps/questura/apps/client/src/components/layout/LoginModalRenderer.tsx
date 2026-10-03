"use client";

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { useProtectedRoute } from '@/lib/routing';
import { useLoginModalStore } from '@/lib/stores/loginModalStore';

// The store subscription has to stay mounted -- it is what hears the open --
// but the sign-in form behind it is only worth downloading once someone asks
// for it. A statically imported modal ships with the page even while it is
// returning null.
const LoginModal = dynamic(() => import('@/components/layout/LoginModal'), { ssr: false });

export default function LoginModalRenderer() {
  const { isOpen, options, closeLoginModal, openLoginModal } = useLoginModalStore();
  const router = useRouter();

  // A signed-out reader who opens a members' page (/account, Bookmarks...) is
  // sent to `/?showLogin=true&redirect=...`. This renderer is on every page,
  // so the prompt opens wherever that lands. It used to live on the city page
  // only, which stopped working once `/` became its own page.
  useProtectedRoute({
    onLoginRequired: (redirectPath) => {
      openLoginModal({
        title: 'Sign in required',
        subtitle: 'Please sign in to access your account',
        onSuccess: () => router.push(redirectPath),
      });
    },
  });

  if (!isOpen) return null;

  return (
    <LoginModal
      isOpen
      onClose={closeLoginModal}
      onSuccess={options.onSuccess}
      title={options.title}
      subtitle={options.subtitle}
      errorMessage={options.errorMessage}
      prefillEmail={options.prefillEmail}
    />
  );
}
