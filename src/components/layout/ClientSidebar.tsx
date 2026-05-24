import {
  LayoutGrid,
  PlusCircle,
  List,
  Clock,
  ExternalLink,
  Image,
  Upload,
  User,
  LogOut,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { OnboardingStep } from "@/components/OnboardingGuide";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutGrid },
  { title: "Place Order", url: "/order/new", icon: PlusCircle },
  { title: "Order Status", url: "/orders", icon: Clock },
];

const toolsNav = [
  {
    title: "Blank Glove Builder",
    url: "https://www.myglovebuilder.com/",
    icon: ExternalLink,
    external: true,
  },
  { title: "Mockup Generator", url: "https://mockups.myglovebrand.com/", icon: Image, external: true },
];

const accountNav = [
  { title: "My Logos", url: "/account/logos", icon: Upload },
  { title: "Account", url: "/account", icon: User },
];

interface ClientSidebarProps {
  onboardingStep?: OnboardingStep;
}

export function ClientSidebar({ onboardingStep }: ClientSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className={onboardingStep ? "!z-[50]" : ""}>
      <SidebarHeader className="px-4 py-5">
        {!collapsed && (
          <div>
            <img src={logo} alt="My Glove Brand" className="h-8 object-contain" />
            <p className="text-xs text-sidebar-muted mt-1.5">
              Wholesale Portal
            </p>
          </div>
        )}
        {collapsed && (
          <span className="text-lg font-bold text-sidebar-primary">M</span>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => {
                const isOrderItem = item.url === "/order/new";
                const highlighted = isOrderItem && onboardingStep === "order";
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      data-onboarding={isOrderItem ? "order" : undefined}
                      className={highlighted ? "ring-2 ring-primary ring-offset-1 ring-offset-sidebar rounded-md animate-pulse" : ""}
                    >
                      <NavLink
                        to={item.url}
                        end
                        className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    {item.external ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </a>
                    ) : (
                      <NavLink
                        to={item.url}
                        className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNav.map((item) => {
                const isLogosItem = item.url === "/account/logos";
                const highlighted = isLogosItem && onboardingStep === "logos";
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      data-onboarding={isLogosItem ? "logos" : undefined}
                      className={highlighted ? "ring-2 ring-primary ring-offset-1 ring-offset-sidebar rounded-md animate-pulse" : ""}
                    >
                      <NavLink
                        to={item.url}
                        className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-4">
        {!collapsed && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {profile?.company_name || "Company"}
              </p>
              <p className="text-xs text-sidebar-muted">Wholesale Client</p>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-xs text-sidebar-muted hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
