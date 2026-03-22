import {
  LayoutGrid,
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
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
  useSidebar,
} from "@/components/ui/sidebar";

const adminNav = [
  { title: "Dashboard", url: "/admin", icon: LayoutGrid },
  { title: "Orders", url: "/admin/orders", icon: ShoppingBag },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Revenue", url: "/admin/revenue", icon: DollarSign },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="bg-sidebar-admin">
      {/* Gold top accent strip */}
      <div className="h-1 w-full bg-primary" />

      <SidebarHeader className="px-4 py-5">
        {!collapsed && (
          <div>
            <h1 className="text-sm font-bold tracking-widest text-sidebar-primary">
              MY GLOVE BRAND
            </h1>
            <p className="text-xs text-sidebar-muted mt-0.5">
              Admin Portal
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
              {adminNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-4">
        {!collapsed && (
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs text-sidebar-muted hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
