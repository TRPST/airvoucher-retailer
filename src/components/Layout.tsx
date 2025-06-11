'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Store,
  Users,
  CreditCard,
  FileText,
  ShoppingCart,
  History,
  User,
  Percent,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Terminal,
} from 'lucide-react';
// Import Supabase client directly
import supabase from '@/lib/supabaseClient';
import * as Avatar from '@radix-ui/react-avatar';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { fetchMyRetailer } from '@/actions/retailerActions';

import { cn } from '@/utils/cn';
import { ThemeToggle } from '@/components/ui/theme-toggle';

type UserRole = 'admin' | 'retailer' | 'agent';

interface LayoutProps {
  children: React.ReactNode;
  role?: UserRole;
}

export function Layout({ children, role = 'retailer' }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  // State to manage user and session
  const [user, setUser] = React.useState<any>(null);
  const [session, setSession] = React.useState<any>(null);
  const [retailerName, setRetailerName] = React.useState<string | null>(null);

  // Fetch user session and set up auth listener on component mount
  React.useEffect(() => {
    let authListener: any;
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user || null);
    };
    fetchSession();

    authListener = supabase.auth.onAuthStateChange((event: string, currentSession: any) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
    });

    return () => {
      authListener?.data?.subscription?.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (role !== 'retailer') return;
    if (!user || !user.id) {
      console.log('User not ready:', user);
      return;
    }
    const fetchRetailerName = async () => {
      try {
        const { data: retailerProfile } = await fetchMyRetailer(user.id);
        console.log('Retailer profile:', retailerProfile);
        if (retailerProfile && retailerProfile.name) {
          setRetailerName(retailerProfile.name);
        }
      } catch (e) {
        setRetailerName(null);
      }
    };
    fetchRetailerName();
  }, [role, user]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Generate navigation items based on user role
  const getNavItems = () => {
    return [
      {
        name: 'Dashboard',
        href: '/retailer',
        icon: ShoppingCart,
      },
      {
        name: 'Terminals',
        href: '/retailer/terminals',
        icon: Terminal,
      },
      {
        name: 'Account',
        href: '/retailer/account',
        icon: User,
      },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Mobile top nav */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background p-4 md:hidden">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="mr-2 rounded-md p-2 hover:bg-muted"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold">AirVoucher</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Mobile sidebar (drawer) */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-background p-4 animate-in slide-in-from-left md:hidden">
            <div className="flex justify-end">
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-2 hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <Image
                  src="/assets/airvoucher-logo.png"
                  alt="AirVoucher Logo"
                  width={40}
                  height={40}
                  className="mr-2"
                />
                {/* Logout button removed from top of sidebar */}
                <div className="h-5 w-8"></div> {/* Spacer to maintain layout */}
              </div>
              <div className="mt-4 rounded-full bg-primary px-4 py-1 text-center text-sm font-medium text-primary-foreground">
                {role === 'retailer' && retailerName
                  ? retailerName
                  : role.charAt(0).toUpperCase() + role.slice(1) + ' Portal'}
              </div>
            </div>
            <nav className="mt-8 flex flex-col space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-md px-3 py-2 text-sm transition-colors',
                    pathname === item.href
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
            {/* User info placed at bottom of sidebar with drop-up menu */}
            <div className="mb-4 mt-auto">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className="flex w-full items-center rounded-md border-0 p-3 outline-none transition-colors hover:bg-muted focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none"
                    aria-label="User menu"
                    style={{
                      outline: 'none !important',
                      border: 'none !important',
                    }}
                  >
                    <Avatar.Root className="mr-3 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
                      <Avatar.Fallback>
                        {user && user.email ? user.email.charAt(0).toUpperCase() : 'A'}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <div className="flex-1 text-left">
                      <p className="truncate text-sm font-medium">{user?.email || 'Account'}</p>
                      <p className="text-xs text-muted-foreground">Retailer</p>
                    </div>
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    side="top"
                    align="start"
                    sideOffset={8}
                    className="z-50 min-w-[200px] overflow-hidden border-0 bg-background p-1 shadow-none outline-none ring-0 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200 focus:border-0 focus:outline-none focus:ring-0"
                    style={{
                      boxShadow: 'none !important',
                      outline: 'none !important',
                      border: 'none !important',
                      borderRadius: '0.375rem',
                    }}
                  >
                    <DropdownMenu.Item
                      className="group flex cursor-pointer items-center rounded-md border-0 px-3 py-2 text-sm outline-none transition-colors hover:bg-muted focus:border-0 focus:outline-none focus:ring-0 data-[highlighted]:border-0 data-[highlighted]:bg-muted data-[highlighted]:outline-none data-[state=open]:outline-none"
                      onSelect={handleSignOut}
                    >
                      <motion.div
                        className="flex w-full items-center justify-between"
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.1, ease: 'easeOut' }}
                      >
                        <div className="flex items-center">
                          <LogOut className="mr-3 h-5 w-5" />
                          Sign Out
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                      </motion.div>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">© 2025 AirVoucher</div>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop sidebar */}
      <div className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border bg-background p-4 md:block">
        <div className="flex h-full flex-col">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <img src="/assets/airvoucher-logo.png" alt="AirVoucher Logo" className="mr-2 h-8" />
              {/* Logout button removed from top of sidebar */}
              <div className="h-5 w-8"></div> {/* Spacer to maintain layout */}
            </div>
            <div className="mt-4 rounded-full bg-primary px-4 py-1 text-center text-sm font-medium text-primary-foreground">
              {role === 'retailer' && retailerName
                ? retailerName
                : role.charAt(0).toUpperCase() + role.slice(1) + ' Portal'}
            </div>
          </div>
          {/* User info removed from here - moved to bottom */}

          <nav className="flex flex-1 flex-col space-y-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                  pathname === item.href
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'hover:bg-muted'
                )}
              >
                <div className="flex items-center">
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </div>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100',
                    pathname === item.href ? 'opacity-100' : ''
                  )}
                />
              </Link>
            ))}
          </nav>
          {/* Spacer to push user info and footer to bottom */}
          <div className="flex-1"></div>

          {/* User info placed at bottom of sidebar with drop-up menu */}
          <div className="mb-4 mt-auto">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="flex w-full items-center rounded-md border-0 p-3 outline-none transition-colors hover:bg-muted focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none"
                  aria-label="User menu"
                  style={{
                    outline: 'none !important',
                    border: 'none !important',
                  }}
                >
                  <Avatar.Root className="mr-3 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
                    <Avatar.Fallback>
                      {user && user.email ? user.email.charAt(0).toUpperCase() : 'A'}
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <div className="flex-1 text-left">
                    <p className="truncate text-sm font-medium">{user?.email || 'Account'}</p>
                    <p className="text-xs text-muted-foreground">Retailer</p>
                  </div>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  side="top"
                  align="start"
                  sideOffset={8}
                  className="z-50 min-w-[200px] overflow-hidden border-0 bg-background p-1 shadow-none outline-none ring-0 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200 focus:border-0 focus:outline-none focus:ring-0"
                  style={{
                    boxShadow: 'none !important',
                    outline: 'none !important',
                    border: 'none !important',
                    borderRadius: '0.375rem',
                  }}
                >
                  <DropdownMenu.Item
                    className="group flex cursor-pointer items-center rounded-md border-0 px-3 py-2 text-sm outline-none transition-colors hover:bg-muted focus:border-0 focus:outline-none focus:ring-0 data-[highlighted]:border-0 data-[highlighted]:bg-muted data-[highlighted]:outline-none data-[state=open]:outline-none"
                    onSelect={handleSignOut}
                  >
                    <motion.div
                      className="flex w-full items-center justify-between"
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.1, ease: 'easeOut' }}
                    >
                      <div className="flex items-center">
                        <LogOut className="mr-3 h-5 w-5" />
                        Sign Out
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </motion.div>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">© 2025 AirVoucher</div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 md:pl-64">
        <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
