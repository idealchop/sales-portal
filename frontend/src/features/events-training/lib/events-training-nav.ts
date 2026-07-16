import {
  Award,
  BarChart3,
  BookOpen,
  CalendarClock,
  Clapperboard,
  GraduationCap,
  LayoutDashboard,
  MessageSquareWarning,
  PlayCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

export type EventsTrainingNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type EventsTrainingNavGroup = {
  id: "overview" | "attention" | "create" | "settings";
  label: string;
  hint?: string;
  items: EventsTrainingNavItem[];
};

/** In-app IA for Events & Training: overview → attention → create → settings. */
export const EVENTS_TRAINING_NAV_GROUPS: EventsTrainingNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    hint: "Health of Resources content",
    items: [
      {
        href: "/events-training",
        label: "Overview",
        description: "Analytics and what needs attention",
        icon: LayoutDashboard,
      },
      {
        href: "/events-training/analytics",
        label: "Analytics",
        description: "Registrations, views, and revenue",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "attention",
    label: "Needs attention",
    hint: "Clear the queue first",
    items: [
      {
        href: "/events-training/registrations",
        label: "Registrations",
        description: "Accept or decline webinar sign-ups",
        icon: Users,
      },
      {
        href: "/events-training/moderation",
        label: "Moderation",
        description: "Answer questions and review comments",
        icon: MessageSquareWarning,
      },
    ],
  },
  {
    id: "create",
    label: "Create & manage",
    hint: "Publish content and certificates",
    items: [
      {
        href: "/events-training/webinars",
        label: "Webinars",
        description: "Live sessions on Resources",
        icon: Clapperboard,
      },
      {
        href: "/events-training/videos",
        label: "Stories",
        description: "WRS Stories and recordings",
        icon: PlayCircle,
      },
      {
        href: "/events-training/blogs",
        label: "Articles",
        description: "WRS Blog posts",
        icon: BookOpen,
      },
      {
        href: "/events-training/tutorials",
        label: "Tutorials",
        description: "In-app how-to videos",
        icon: GraduationCap,
      },
      {
        href: "/events-training/certifications",
        label: "Certifications",
        description: "Issue or revoke certificates",
        icon: Award,
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    hint: "Reminders and notifications",
    items: [
      {
        href: "/events-training/schedules",
        label: "Schedules",
        description: "Reminder and notification rules",
        icon: CalendarClock,
      },
    ],
  },
];

/** Flat order for dashboard sidebar children (matches shell IA). */
export const EVENTS_TRAINING_SIDEBAR_CHILDREN = [
  { href: "/events-training", label: "Overview" },
  { href: "/events-training/analytics", label: "Analytics" },
  { href: "/events-training/registrations", label: "Registrations" },
  { href: "/events-training/moderation", label: "Moderation" },
  { href: "/events-training/webinars", label: "Webinars" },
  { href: "/events-training/videos", label: "Stories" },
  { href: "/events-training/blogs", label: "Articles" },
  { href: "/events-training/tutorials", label: "Tutorials" },
  { href: "/events-training/certifications", label: "Certifications" },
  { href: "/events-training/schedules", label: "Schedules" },
] as const;

export function isEventsTrainingNavActive(
  pathname: string,
  href: string,
): boolean {
  if (href === "/events-training") {
    return pathname === "/events-training";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
