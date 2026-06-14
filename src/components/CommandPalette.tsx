import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  BellOff,
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
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <button
            type="button"
            aria-label="Close command palette"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-canvas/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-edge-strong bg-panel shadow-2xl shadow-black/40"
          >
            <Command
              label="Command palette"
              className="font-sans"
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
            >
              <div className="flex items-center gap-2 border-b border-edge px-3">
                <Search className="h-4 w-4 shrink-0 text-ink-faint" />
                <Command.Input
                  autoFocus
                  placeholder="Type a command…"
                  className="w-full bg-transparent py-3 text-sm text-ink outline-none placeholder:text-ink-faint"
                />
                <kbd>esc</kbd>
              </div>
              <Command.List className="max-h-[50vh] overflow-y-auto p-1.5">
                <Command.Empty className="px-3 py-6 text-center text-sm text-ink-faint">
                  No matching command.
                </Command.Empty>

                <Group heading="Navigate">
                  <Item onSelect={run(go("#/"))} icon={<LayoutDashboard className="h-4 w-4" />}>
                    Go to Dashboard
                  </Item>
                  <Item onSelect={run(go("#/history"))} icon={<ListChecks className="h-4 w-4" />}>
                    Go to History
                  </Item>
                  <Item onSelect={run(go("#/setup"))} icon={<Settings className="h-4 w-4" />}>
                    Go to Setup
                  </Item>
                </Group>

                <Group heading="Questions">
                  <Item
                    onSelect={run(() => {
                      window.location.hash = "#/";
                      emitUi({ type: "focus-search" });
                    })}
                    icon={<Search className="h-4 w-4" />}
                  >
                    Search pending questions
                  </Item>
                  <Item
                    onSelect={run(() => {
                      window.location.hash = "#/";
                      emitUi({ type: "question-next" });
                    })}
                    icon={<ChevronDown className="h-4 w-4" />}
                  >
                    Next question
                  </Item>
                  <Item
                    onSelect={run(() => {
                      window.location.hash = "#/";
                      emitUi({ type: "question-prev" });
                    })}
                    icon={<ChevronUp className="h-4 w-4" />}
                  >
                    Previous question
                  </Item>
                </Group>

                <Group heading="Alerts">
                  <Item
                    onSelect={run(() => update({ soundOnQuestion: !settings.soundOnQuestion }))}
                    icon={settings.soundOnQuestion ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  >
                    {settings.soundOnQuestion ? "Disable" : "Enable"} sound on new question
                  </Item>
                  <Item
                    onSelect={run(() => void toggleDesktop())}
                    icon={settings.osNotifications ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  >
                    {settings.osNotifications ? "Disable" : "Enable"} desktop notifications
                  </Item>
                  {notificationHistory.length > 0 && (
                    <Item onSelect={run(clearNotifications)} icon={<Trash2 className="h-4 w-4" />}>
                      Clear all notifications
                    </Item>
                  )}
                </Group>

                <Group heading="Theme">
                  <Item onSelect={run(() => setTheme("system"))} icon={<Monitor className="h-4 w-4" />}>
                    Theme: System {settings.theme === "system" && <Active />}
                  </Item>
                  <Item onSelect={run(() => setTheme("dark"))} icon={<Moon className="h-4 w-4" />}>
                    Theme: Dark {settings.theme === "dark" && <Active />}
                  </Item>
                  <Item onSelect={run(() => setTheme("light"))} icon={<Sun className="h-4 w-4" />}>
                    Theme: Light {settings.theme === "light" && <Active />}
                  </Item>
                </Group>
              </Command.List>
              <div className="flex items-center justify-end gap-2 border-t border-edge px-3 py-1.5 text-[11px] text-ink-faint">
                <span className="inline-flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3" /> select
                </span>
                <span className="inline-flex items-center gap-1">
                  <ChevronUp className="h-3 w-3" />
                  <ChevronDown className="h-3 w-3" /> navigate
                </span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Group({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="px-1 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1"
    >
      {children}
    </Command.Group>
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
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink-dim transition-colors data-[selected=true]:bg-accent/10 data-[selected=true]:text-ink"
    >
      <span className="text-ink-faint">{icon}</span>
      <span className="flex-1">{children}</span>
    </Command.Item>
  );
}

function Active() {
  return <span className="led ml-1 text-accent" />;
}
