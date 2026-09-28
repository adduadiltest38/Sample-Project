import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useSimulationLoop } from '@/hooks/useSimulationLoop';
import { useIsDesktop, useMediaQuery } from '@/hooks/useMediaQuery';
import { useJourney, DRIVING_STATES, AWAY_STATES } from '@/stores/journeyStore';
import { useUi } from '@/stores/uiStore';
import { useChat } from '@/stores/chatStore';
import { CityMap } from '@/components/map/CityMap';
import { MapControls } from '@/components/map/MapControls';
import { TopBar, Logo, ClockChip, ThemeToggle } from '@/components/layout/TopBar';
import { JourneyPanel } from '@/components/layout/JourneyPanel';
import { DemoPanel, DemoToggle } from '@/components/layout/DemoPanel';
import { Toasts } from '@/components/layout/Toasts';
import { NavigationBanner } from '@/components/navigation/NavigationBanner';
import { ChargingPill } from '@/components/charging/ChargingPill';
import { ReturnAlert } from '@/components/charging/ReturnAlert';
import { StationCard } from '@/components/stations/StationCard';
import { AIChatPanel, AIFab } from '@/components/ai/AIAssistant';
import { VehiclePicker } from '@/components/vehicle/VehiclePicker';
import { Sheet } from '@/components/ui/Sheet';

export function App() {
  useSimulationLoop();
  const desktop = useIsDesktop();
  const loadStatus = useChat((s) => s.loadStatus);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-dvh w-full overflow-clip bg-canvas text-ink">
        <CityMap />
        {desktop ? <DesktopShell /> : <MobileShell />}
        <VehiclePicker />
      </div>
    </MotionConfig>
  );
}

// ── Desktop: full-bleed map, floating sidebar and overlays ─────
const SIDEBAR = 416;

function DesktopShell() {
  const driving = useJourney((s) => DRIVING_STATES.includes(s.state));
  const setInsets = useUi((s) => s.setMapInsets);
  const chatOpen = useUi((s) => s.chatOpen);

  useEffect(() => {
    setInsets({ top: driving ? 230 : 92, left: SIDEBAR + 24, right: 76, bottom: 24 });
  }, [driving, setInsets]);

  return (
    <>
      <TopBar />
      <aside className="glass absolute bottom-4 left-4 top-[88px] z-20 flex flex-col overflow-hidden rounded-[28px]" style={{ width: SIDEBAR }}>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-5">
          <JourneyPanel />
        </div>
      </aside>

      <div className="pointer-events-none absolute bottom-4 right-4 top-[88px] z-20" style={{ left: SIDEBAR + 32 }}>
        <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-3">
          <NavigationBanner />
          <ReturnAlert className="pointer-events-auto w-full max-w-[400px]" />
          <ChargingPill />
        </div>
        <Toasts className="absolute right-0 top-0 items-end" />
        <MapControls className="absolute right-0 top-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 flex flex-col items-start gap-2">
          <DemoPanel />
          <DemoToggle />
        </div>
        <div className="absolute bottom-0 right-0 flex flex-col items-end gap-3">
          {!chatOpen && <StationCard className="pointer-events-auto w-[360px]" />}
          <AIChatPanel className="h-[min(580px,calc(100dvh-180px))] w-[390px]" />
          <AIFab />
        </div>
      </div>
    </>
  );
}

// ── Mobile: full-screen map, floating controls, bottom sheet ───
const SHEET_W = 420;

const SNAP_BY_KEY: Record<string, number> = {
  IDLE: 1,
  SEARCHING: 1,
  ROUTE_SELECTED: 1,
  NAVIGATING: 0,
  ARRIVING: 0,
  NAVIGATING_TO_DESTINATION: 0,
  ARRIVED: 1,
  CHARGING: 1,
  EXPLORING: 2,
  WALKING: 0,
  VISITING: 1,
  RETURNING: 0,
  CHARGING_COMPLETE: 1,
  TRIP_COMPLETE: 1,
};

function MobileShell() {
  const state = useJourney((s) => s.state);
  const driving = DRIVING_STATES.includes(state);
  const away = AWAY_STATES.includes(state);
  const stationOpen = useJourney((s) => Boolean(s.selectedStationId));
  const setInsets = useUi((s) => s.setMapInsets);
  const chatOpen = useUi((s) => s.chatOpen);
  const setChatOpen = useUi((s) => s.setChatOpen);
  // Tablets keep the map full-screen with the panel floating on the left.
  const tablet = useMediaQuery('(min-width: 700px)');
  const [vh, setVh] = useState(() => window.innerHeight);
  const [snap, setSnap] = useState(1);
  const [sheetH, setSheetH] = useState(0);

  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const snaps = useMemo(
    () => (tablet ? [Math.round(vh * 0.34), Math.round(vh * 0.62), vh - 104] : [driving || away ? 168 : 150, Math.round(vh * 0.52), Math.round(vh * 0.88)]),
    [vh, driving, away, tablet],
  );

  useEffect(() => {
    setSnap(SNAP_BY_KEY[state] ?? 1);
  }, [state]);

  const onHeight = useCallback((h: number) => setSheetH(h), []);

  useEffect(() => {
    const top = driving ? 210 : 76;
    if (tablet) setInsets({ top, left: SHEET_W + 32, right: 64, bottom: 24 });
    else setInsets({ top, left: 0, right: 0, bottom: stationOpen ? Math.round(vh * 0.55) : sheetH });
  }, [driving, sheetH, stationOpen, vh, tablet, setInsets]);

  // On phones the floating buttons sit just above the sheet, and hide when it's fully open.
  const controlsBottom = tablet ? 16 : sheetH + 12;
  const sheetFull = !tablet && snap === snaps.length - 1;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 p-3 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="glass pointer-events-auto flex h-12 items-center rounded-[18px] pl-1.5 pr-1.5 min-[380px]:pr-3.5">
          <Logo compact />
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <ClockChip />
          <AIFab compact />
          <ThemeToggle />
        </div>
      </div>

      <div
        className="pointer-events-none absolute right-3 top-[76px] z-30 flex flex-col items-center gap-2"
        style={{ left: tablet ? SHEET_W + 32 : 12 }}
      >
        <NavigationBanner />
        <ReturnAlert className="pointer-events-auto w-full max-w-[460px]" />
        <ChargingPill />
        <Toasts />
      </div>

      <div
        className="pointer-events-none absolute right-3 z-20 flex flex-col items-end gap-2 transition-[bottom,opacity] duration-300"
        style={{ bottom: controlsBottom, opacity: sheetFull ? 0 : 1, visibility: sheetFull ? 'hidden' : 'visible' }}
      >
        <MapControls />
      </div>
      <div
        className="pointer-events-none absolute z-20 transition-[bottom,opacity] duration-300"
        style={{ bottom: controlsBottom, left: tablet ? SHEET_W + 32 : 12, opacity: sheetFull ? 0 : 1, visibility: sheetFull ? 'hidden' : 'visible' }}
      >
        <DemoToggle />
      </div>

      <Sheet
        snaps={snaps}
        snapIndex={snap}
        onSnapChange={setSnap}
        onHeightChange={onHeight}
        className={tablet ? 'bottom-4 left-4 right-auto rounded-[28px] pb-0' : undefined}
        width={tablet ? SHEET_W : undefined}
      >
        <JourneyPanel />
      </Sheet>

      <div
        className="pointer-events-none fixed bottom-3 z-40 pb-[env(safe-area-inset-bottom)]"
        style={tablet ? { right: 16, width: 380 } : { left: 12, right: 12 }}
      >
        <StationCard className="pointer-events-auto" />
      </div>
      <div className="pointer-events-none fixed inset-x-3 top-[70px] z-50 flex justify-center">
        <DemoPanel className="max-h-[calc(100dvh-90px)] w-full max-w-[380px] overflow-y-auto" />
      </div>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChatOpen(false)}
          />
        )}
      </AnimatePresence>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-end justify-center px-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        <AIChatPanel solid className="h-full max-h-[760px] w-full max-w-[520px]" />
      </div>
    </>
  );
}
