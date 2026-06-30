/**
 * Icon — single thin wrapper around lucide-react.
 *
 * The prototype uses short hand-rolled SVG names (grid, layers, users…).
 * We map them to lucide equivalents in one place so the rest of the app
 * keeps the same vocabulary as design/prototype/ui.jsx.
 */
import {
  type LucideIcon,
  LayoutGrid,
  Layers,
  Users,
  Settings as LucideSettings,
  Sun,
  Moon,
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  MoreHorizontal,
  Lock,
  LockOpen,
  Globe,
  Folder,
  Archive,
  AlertTriangle,
  AlertCircle,
  Check,
  CheckCircle2,
  Pencil,
  Trash2,
  Copy,
  RefreshCw,
  Link as LinkIcon,
  Mail,
  Smartphone,
  KeyRound,
  Shield,
  Monitor,
  Laptop,
  ExternalLink,
  X,
  LogOut,
  Bot,
  User as UserIcon,
  Eye,
  EyeOff,
  Inbox,
  MessageSquare,
} from "lucide-react";

const REGISTRY: Record<string, LucideIcon> = {
  grid: LayoutGrid,
  layers: Layers,
  users: Users,
  settings: LucideSettings,
  sun: Sun,
  moon: Moon,
  search: Search,
  plus: Plus,
  chevRight: ChevronRight,
  chevDown: ChevronDown,
  chevUp: ChevronUp,
  chevSort: ChevronsUpDown,
  more: MoreHorizontal,
  lock: Lock,
  lockOpen: LockOpen,
  globe: Globe,
  folder: Folder,
  archive: Archive,
  warn: AlertTriangle,
  err: AlertCircle,
  check: Check,
  shield: Shield,
  ok: CheckCircle2,
  edit: Pencil,
  trash: Trash2,
  copy: Copy,
  rotate: RefreshCw,
  link: LinkIcon,
  mail: Mail,
  phone: Smartphone,
  key: KeyRound,
  monitor: Monitor,
  laptop: Laptop,
  external: ExternalLink,
  x: X,
  logout: LogOut,
  bot: Bot,
  user: UserIcon,
  eye: Eye,
  eyeOff: EyeOff,
  inbox: Inbox,
  message: MessageSquare,
};

export type IconName = keyof typeof REGISTRY;

export function Icon({
  name,
  className = "ico",
  "aria-hidden": ariaHidden = true,
}: Readonly<{
  name: IconName | string;
  className?: string;
  "aria-hidden"?: boolean;
}>) {
  const Cmp = REGISTRY[name] ?? AlertCircle;
  return <Cmp className={className} strokeWidth={1.75} aria-hidden={ariaHidden} />;
}
