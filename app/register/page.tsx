import Link from "next/link";
import { Wallet, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/client/components/ui/Card";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Wallet className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Create your PaisaPilot account</CardTitle>
          <CardDescription>
            Join PaisaPilot to understand and master your personal finances
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Rahul Sharma"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <Button className="w-full font-semibold" size="lg">
            Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <div className="pt-2 flex items-center justify-center space-x-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Zero bank passwords or UPI PINs needed</span>
          </div>
        </CardContent>

        <CardFooter className="justify-center border-t border-border pt-4 text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="ml-1 text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

