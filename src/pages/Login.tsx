import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email address first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset link sent — check your email");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel — white background, hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-white relative overflow-hidden border-r border-gray-100">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary blur-[100px]" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-primary blur-[80px]" />
        </div>
        <div className="relative z-10 px-12 max-w-md">
          <img src={logo} alt="My Glove Brand" className="h-12 object-contain" />
          <p className="text-gray-900 text-lg font-light mt-2">
            Wholesale Portal
          </p>
          <div className="mt-8 text-gray-500 text-sm leading-relaxed">
            <p>Design gloves with our 3D builder, place orders, manage production, track orders in real-time, and scale your brand — all in one place.</p>
          </div>
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
          {/* Mobile-only branding */}
          <div className="text-center lg:hidden">
            <img src={logo} alt="My Glove Brand" className="h-10 object-contain mx-auto" />
            <p className="mt-1 text-sm text-zinc-400">Wholesale Portal</p>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-2xl font-semibold text-white">Sign in</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Enter your credentials to access the portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                Forgot password?
              </button>
              <Link
                to="/signup"
                className="text-primary hover:underline font-medium"
              >
                Create account
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
