"use client";

import * as React from "react";
import Link from "next/link";
import { Wallet, Menu, X, ShieldCheck } from "lucide-react";
import { Button } from "@/client/components/ui/Button";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            Paisa<span className="text-primary">Pilot</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <Link
            href="/features"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="/how-it-works"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="/security"
            className="text-muted-foreground transition-colors hover:text-foreground flex items-center space-x-1"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Security</span>
          </Link>
          <Link
            href="/faq"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </Link>
        </nav>

        {/* Action CTAs */}
        <div className="hidden md:flex items-center space-x-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-4 pt-2 pb-6 space-y-3">
          <nav className="flex flex-col space-y-3 text-base font-medium">
            <Link
              href="/features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Features
            </Link>
            <Link
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              How It Works
            </Link>
            <Link
              href="/security"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center space-x-2"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Security & Privacy</span>
            </Link>
            <Link
              href="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              FAQ
            </Link>
          </nav>
          <div className="pt-4 border-t border-border flex flex-col space-y-2">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" className="w-full">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

