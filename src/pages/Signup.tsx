import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Eye, EyeOff, Check } from "lucide-react";
import logo from "@/assets/logo.png";

const benefits = [
  "Unlimited custom glove orders",
  "Access to Blank Glove Builder & Mockup Generator",
  "Korean & Japanese Kip leather options",
  "Stock pricing at 5+ units per model",
];

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    company_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const [signupComplete, setSignupComplete] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirm_password) {
      toast.error("Passwords don't match");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          company_name: form.company_name,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      setSignupComplete(true);
    }
    setLoading(false);
  };

  if (signupComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md text-center space-y-6"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Verification Email Sent</h2>
          <p className="text-muted-foreground">
            We've sent a verification link to{" "}
            <span className="font-medium text-foreground">{form.email}</span>.
            Please check your inbox and click the link to complete your sign-up.
          </p>
          <p className="text-sm text-muted-foreground">
            Once verified, you'll be redirected to the login page to sign in and activate your subscription.
          </p>
          <Link to="/login">
            <Button variant="outline" className="mt-4">
              Go to Login
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel — white background */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-white relative overflow-hidden border-r border-gray-100">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary blur-[100px]" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-primary blur-[80px]" />
        </div>
        <div className="relative z-10 px-12 max-w-md">
          <img src={logo} alt="My Glove Brand" className="h-12 object-contain" />
          <p className="text-gray-900 text-xl font-light mt-2 mb-4">
            Launch and scale your glove brand with ease.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Design gloves with our 3D builder, place orders, manage production, track orders in real-time, and scale your brand — all in one place.
          </p>
          <ul className="space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-gray-500">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right form panel — dark background */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-sidebar">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="text-center lg:hidden">
            <img src={logo} alt="My Glove Brand" className="h-10 object-contain mx-auto" />
            <p className="mt-1 text-sm text-zinc-400">Create Wholesale Account</p>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-2xl font-semibold text-white">Create account</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Get started with your wholesale portal
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-zinc-300">Full Name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={update("full_name")}
                  placeholder="John Smith"
                  required
                  autoComplete="name"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_name" className="text-zinc-300">Company</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={update("company_name")}
                  placeholder="Ace Baseball"
                  required
                  autoComplete="organization"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={update("password")}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="pr-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password" className="text-zinc-300">Confirm Password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={form.confirm_password}
                onChange={update("confirm_password")}
                required
                autoComplete="new-password"
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-primary"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account & Subscribe — $49/mo"}
            </Button>

            <p className="text-center text-sm text-zinc-400">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
