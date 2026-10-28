import Calendar from "@iconify-react/solar/calendar-linear";
import Chart from "@iconify-react/solar/chart-2-linear";
import Document from "@iconify-react/solar/document-text-linear";
import Home from "@iconify-react/solar/home-2-linear";
import Star from "@iconify-react/solar/star-linear";
import Users from "@iconify-react/solar/users-group-rounded-linear";
import UserPlus from "@iconify-react/solar/user-plus-linear";

export type TabId = "today" | "clients" | "content" | "leads" | "reviews" | "results" | "reports";
export const TABS: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "today", label: "Today", icon: Home },
  { id: "clients", label: "Clients", icon: Users },
  { id: "content", label: "Content", icon: Calendar },
  { id: "leads", label: "Leads", icon: UserPlus },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "results", label: "Results", icon: Chart },
  { id: "reports", label: "Reports", icon: Document },
];
