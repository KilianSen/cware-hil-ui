import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  LayoutDashboard,
  ListChecks,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { ReactNode } from "react";
import { useHub } from "../hooks/useHub";
import { useSettings } from "../hooks/useSettings";
import type { ThemePref } from "../hooks/useSettings";
import { requestNotificationPermission } from "../lib/alerts";
import { emitUi } from "../lib/bus";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const PALETTE_OPEN_EVENT = "cware:open-palette";

/** Open the command palette from anywhere (e.g. a header button). */
export function openCommandPalette(): void {
  window.dispatchEvent(new Event(PALETTE_OPEN_EVENT));
}

/**
 * ⌘K / Ctrl-K command palette. Centralizes the app's actions — navigation, alert
 * toggles, theme, notification clearing, and (relayed via the bus) Dashboard
 * search/triage — so they're reachable from anywhere by keyboard.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { clearNotifications, notificationHistory } = useHub();
  const { settings, update } = useSettings();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(PALETTE_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PALETTE_OPEN_EVENT, onOpen);
    };
  }, []);

  const run = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };
  const go = (hash: string) => () => {
    window.location.hash = hash;
  };
  const setTheme = (theme: ThemePref) => update({ theme });

  const toggleDesktop = async () => {
    if (!settings.osNotifications) {
      const p = await requestNotificationPermission();
      update({ osNotifications: p === "granted" });
    } else {
      update({ osNotifications: false });
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="max-w-lg">
      <CommandInput placeholder="Type a command…" />
      <CommandList>
        <CommandEmpty>No matching command.</CommandEmpty>

        <CommandGroup heading="Navigate">
          <Item onSelect={run(go("#/"))} icon={<LayoutDashboard />}>
            Go to Dashboard
          </Item>
          <Item onSelect={run(go("#/history"))} icon={<ListChecks />}>
            Go to History
          </Item>
          <Item onSelect={run(go("#/setup"))} icon={<Settings />}>
            Go to Setup
          </Item>
        </CommandGroup>

        <CommandGroup heading="Questions">
          <Item
            onSelect={run(() => {
              window.location.hash = "#/";
              emitUi({ type: "focus-search" });
            })}
            icon={<Search />}
          >
            Search pending questions
          </Item>
          <Item
            onSelect={run(() => {
              window.location.hash = "#/";
              emitUi({ type: "question-next" });
            })}
            icon={<ChevronDown />}
          >
            Next question
          </Item>
          <Item
            onSelect={run(() => {
              window.location.hash = "#/";
              emitUi({ type: "question-prev" });
            })}
            icon={<ChevronUp />}
          >
            Previous question
          </Item>
        </CommandGroup>

        <CommandGroup heading="Alerts">
          <Item
            onSelect={run(() => update({ soundOnQuestion: !settings.soundOnQuestion }))}
            icon={settings.soundOnQuestion ? <VolumeX /> : <Volume2 />}
          >
            {settings.soundOnQuestion ? "Disable" : "Enable"} sound on new question
          </Item>
          <Item
            onSelect={run(() => void toggleDesktop())}
            icon={settings.osNotifications ? <BellOff /> : <Bell />}
          >
            {settings.osNotifications ? "Disable" : "Enable"} desktop notifications
          </Item>
          {notificationHistory.length > 0 && (
            <Item onSelect={run(clearNotifications)} icon={<Trash2 />}>
              Clear all notifications
            </Item>
          )}
        </CommandGroup>

        <CommandGroup heading="Theme">
          <Item onSelect={run(() => setTheme("system"))} icon={<Monitor />}>
            Theme: System {settings.theme === "system" && <Active />}
          </Item>
          <Item onSelect={run(() => setTheme("dark"))} icon={<Moon />}>
            Theme: Dark {settings.theme === "dark" && <Active />}
          </Item>
          <Item onSelect={run(() => setTheme("light"))} icon={<Sun />}>
            Theme: Light {settings.theme === "light" && <Active />}
          </Item>
        </CommandGroup>
      </CommandList>
      <div className="text-muted-foreground flex items-center justify-end gap-2 border-t px-3 py-1.5 text-[11px]">
        <span className="inline-flex items-center gap-1">
          <CornerDownLeft className="size-3" /> select
        </span>
        <span className="inline-flex items-center gap-1">
          <ChevronUp className="size-3" />
          <ChevronDown className="size-3" /> navigate
        </span>
      </div>
    </CommandDialog>
  );
}

function Item({
  children,
  icon,
  onSelect,
}: {
  children: ReactNode;
  icon: ReactNode;
  onSelect: () => void;
}) {
  return (
    <CommandItem onSelect={onSelect} className="cursor-pointer gap-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{children}</span>
    </CommandItem>
  );
}

function Active() {
  return <Check className="text-foreground ml-1 size-3.5" />;
}
