// src/app/(app)/layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X, Settings, Bell, ChevronsLeft, ChevronsRight, LogOut, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth'; 

interface SidebarNavProps {
  isCollapsed: boolean;
  onLinkClick?: () => void;
  pathname: string | null;
}

const SidebarNavigation: React.FC<SidebarNavProps> = ({ isCollapsed, onLinkClick, pathname }) => (
  <nav className={cn("flex flex-col gap-2", isCollapsed ? "px-2" : "px-4")}>
    {NAV_ITEMS.map((item) => (
      <Button
        key={item.title}
        asChild
        variant={pathname === item.href ? 'default' : 'ghost'}
        className={cn(
          "justify-start h-10 w-full",
          isCollapsed && "px-0 justify-center"
        )}
        onClick={onLinkClick}
        title={isCollapsed ? item.title : undefined}
      >
        <Link href={item.href} className={cn("flex items-center gap-3 w-full", isCollapsed && "justify-center")}>
          <item.icon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">{item.title}</span>}
        </Link>
      </Button>
    ))}
  </nav>
);

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isLoading: authIsLoading } = useAuth(); 
  const router = useRouter();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsDesktopSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(isDesktopSidebarCollapsed));
    }
  }, [isDesktopSidebarCollapsed, isMounted]);

  const handleMobileLinkClick = () => {
    setIsMobileSidebarOpen(false);
  };
  
  const handleLogout = async () => {
    await logout();
  };

  if (!isMounted || authIsLoading) { 
    return <div className="flex h-screen w-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-pulse text-primary" /></div>;
  }
  
  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/signup') && !pathname.startsWith('/forgot-password') && !pathname.startsWith('/reset-password')) {
      return <div className="flex h-screen w-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-pulse text-primary" /></div>; 
  }

  const pageTitle = NAV_ITEMS.find(item => pathname.startsWith(item.href))?.title || 
                    (pathname.startsWith('/profile') ? 'My Profile' : 'EOTIS Hub');

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className={cn(
        "hidden md:flex md:flex-col border-r bg-card transition-all duration-300 ease-in-out relative",
        isDesktopSidebarCollapsed ? "md:w-20" : "md:w-64"
      )}>
        <div className={cn(
          "flex h-16 items-center border-b",
          isDesktopSidebarCollapsed ? "px-2 justify-center" : "px-6"
        )}>
          <Link href="/dashboard" className={cn(
              "flex items-center gap-2 font-semibold font-headline text-primary",
              isDesktopSidebarCollapsed && "justify-center w-full"
          )}>
            <Image src="/eotis-hub-logo.png" alt="EOTIS Hub Logo" width={32} height={31} className="flex-shrink-0" priority />
            {!isDesktopSidebarCollapsed && <span className="truncate text-lg">EOTIS Hub</span>}
          </Link>
        </div>
        <ScrollArea className="flex-1 py-4">
          <SidebarNavigation 
            isCollapsed={isDesktopSidebarCollapsed} 
            pathname={pathname} 
          />
        </ScrollArea>
        <div className={cn(
          "mt-auto border-t",
          isDesktopSidebarCollapsed ? "p-2" : "p-4"
        )}>
          <Button
            variant="ghost"
            asChild
            className={cn(
              "w-full justify-start gap-2 h-10",
              isDesktopSidebarCollapsed ? "px-0 justify-center" : "px-3"
            )}
            title={isDesktopSidebarCollapsed ? "Settings" : undefined}
          >
            <Link href="/profile?tab=appearance">
              <Settings className="h-5 w-5 flex-shrink-0" />
              {!isDesktopSidebarCollapsed && <span className="truncate">Settings</span>}
            </Link>
          </Button>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
          className="absolute top-1/2 -right-[18px] transform -translate-y-1/2 z-20 h-9 w-9 rounded-full hidden md:flex items-center justify-center border-2 bg-background hover:bg-muted shadow-md"
          aria-label={isDesktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isDesktopSidebarCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
        </Button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 w-64">
              <div className="flex h-16 items-center border-b px-6">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold font-headline text-primary">
                  <Image src="/eotis-hub-logo.png" alt="EOTIS Hub Logo" width={32} height={31} className="flex-shrink-0" priority />
                  <span className="text-lg">EOTIS Hub</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileSidebarOpen(false)} className="ml-auto">
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <ScrollArea className="flex-1 py-4">
                <SidebarNavigation 
                  isCollapsed={false}
                  onLinkClick={handleMobileLinkClick} 
                  pathname={pathname}
                />
              </ScrollArea>
              <div className="mt-auto p-4 border-t">
                <Button variant="ghost" asChild className="w-full justify-start gap-2 h-10">
                  <Link href="/profile?tab=appearance">
                    <Settings className="h-5 w-5 flex-shrink-0" />
                    <span>Settings</span>
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          
          <div className="hidden md:block font-headline text-lg font-semibold">
            {pageTitle}
          </div>

          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || "User"} />
                    <AvatarFallback>{user?.name ? user.name.substring(0,2).toUpperCase() : (user?.email ? user.email.substring(0,2).toUpperCase() : "U")}</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.name || user?.email || 'My Account'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile?tab=appearance">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutContent>{children}</AppLayoutContent>;
}
