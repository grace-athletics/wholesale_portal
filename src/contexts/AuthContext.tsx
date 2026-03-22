import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "client";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  subscription_started_at: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
  isSubscribed: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data as Profile | null);
  };

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .single();
    setRole((data?.role as UserRole) ?? "client");
  };

  const checkSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("check-subscription error:", error);
        return;
      }
      // Re-fetch profile to get synced subscription_status
      if (user?.id) {
        await fetchProfile(user.id);
      }
    } catch (err) {
      console.error("Failed to check subscription:", err);
    }
  }, [user?.id]);

  const refreshProfile = async () => {
    if (user?.id) {
      await Promise.all([fetchProfile(user.id), fetchRole(user.id)]);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([
          fetchProfile(session.user.id),
          fetchRole(session.user.id),
        ]).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([
          fetchProfile(session.user.id),
          fetchRole(session.user.id),
        ]);
      } else {
        setProfile(null);
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check subscription on login & periodically every 60s
  useEffect(() => {
    if (!user || !profile) return;
    // Skip for admins
    if (role === "admin") return;

    checkSubscription();
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [user?.id, role, checkSubscription]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        loading,
        isAdmin: role === "admin",
        isSubscribed: profile?.subscription_status === "active",
        signOut,
        refreshProfile,
        checkSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
