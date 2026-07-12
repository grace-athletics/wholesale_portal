import { LayoutGrid, ShoppingBag, List, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const tabs = [
  { title: "Home", url: "/dashboard", icon: LayoutGrid },
  { title: "Shop", url: "/shop", icon: ShoppingBag },
  { title: "Orders", url: "/orders", icon: List },
  { title: "Account", url: "/account", icon: User },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t bg-card px-1 py-2">
      {tabs.map((tab) =>
        tab.external ? (
          <a
            key={tab.title}
            href={tab.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-muted-foreground transition-colors hover:text-primary"
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{tab.title}</span>
          </a>
        ) : (
          <NavLink
            key={tab.title}
            to={tab.url}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{tab.title}</span>
          </NavLink>
        )
      )}
    </nav>
  );
}
