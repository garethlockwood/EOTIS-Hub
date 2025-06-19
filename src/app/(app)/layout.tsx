'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X, Settings, Bell, UserCircle } from 'lucide-react'; // Assuming UserCircle for logo placeholder
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // Or a loading spinner
  }

  const SidebarContentNav = () => (
    <nav className="flex flex-col gap-2 px-4">
      {NAV_ITEMS.map((item) => (
        <Button
          key={item.title}
          asChild
          variant={pathname === item.href ? 'default' : 'ghost'}
          className="justify-start"
          onClick={() => setIsSidebarOpen(false)}
        >
          <Link href={item.href} className="flex items-center gap-3">
            <item.icon className="h-5 w-5" />
            {item.title}
          </Link>
        </Button>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col border-r bg-card transition-all">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold font-headline text-primary">
            <UserCircle className="h-7 w-7" /> {/* Placeholder Logo */}
            <span>EOTIS Hub</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 py-4">
          <SidebarContentNav />
        </ScrollArea>
        <div className="mt-auto p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Mobile Header & Desktop Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
          {/* Mobile Sidebar Trigger */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 w-64">
              <div className="flex h-16 items-center border-b px-6">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold font-headline text-primary">
                  <UserCircle className="h-7 w-7" /> {/* Placeholder Logo */}
                  <span>EOTIS Hub</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="ml-auto">
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <ScrollArea className="flex-1 py-4">
                <SidebarContentNav />
              </ScrollArea>
              <div className="mt-auto p-4 border-t">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Desktop: App name (optional, if not in sidebar) or breadcrumbs */}
          <div className="hidden md:block font-headline text-lg font-semibold">
            {NAV_ITEMS.find(item => pathname.startsWith(item.href))?.title || 'EOTIS Hub'}
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
                    <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="user avatar" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
