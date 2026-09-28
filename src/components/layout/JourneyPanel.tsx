import { AnimatePresence, motion } from 'framer-motion';
import type { JourneyState } from '@/types';
import { useJourney } from '@/stores/journeyStore';
import { TripPlanner } from '../navigation/TripPlanner';
import { SearchingPanel } from '../navigation/SearchingPanel';
import { RouteOptions } from '../navigation/RouteOptions';
import { NavigationPanel } from '../navigation/NavigationPanel';
import { ArrivalPanel } from '../navigation/ArrivalPanel';
import { TripCompletePanel } from '../navigation/TripCompletePanel';
import { ChargingPanel } from '../charging/ChargingPanel';
import { ChargingCompletePanel } from '../charging/ChargingCompletePanel';
import { ExplorePanel } from '../recommendations/ExplorePanel';
import { WalkingPanel } from '../recommendations/WalkingPanel';

const panelKey = (s: JourneyState, leg: number) => {
  switch (s) {
    case 'NAVIGATING':
    case 'ARRIVING':
    case 'NAVIGATING_TO_DESTINATION':
      return `nav-${leg}`;
    case 'WALKING':
    case 'VISITING':
    case 'RETURNING':
      return 'walk';
    default:
      return s;
  }
};

const PANELS: Record<string, React.FC> = {
  IDLE: TripPlanner,
  SEARCHING: SearchingPanel,
  ROUTE_SELECTED: RouteOptions,
  'nav-0': NavigationPanel,
  'nav-1': NavigationPanel,
  ARRIVED: ArrivalPanel,
  CHARGING: ChargingPanel,
  EXPLORING: ExplorePanel,
  walk: WalkingPanel,
  CHARGING_COMPLETE: ChargingCompletePanel,
  TRIP_COMPLETE: TripCompletePanel,
};

/** Routes the current journey state to its panel, with smooth transitions. */
export function JourneyPanel() {
  const state = useJourney((s) => s.state);
  const leg = useJourney((s) => s.drive?.legIndex ?? 0);
  const key = panelKey(state, leg);
  const Panel = PANELS[key] ?? TripPlanner;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
        transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <Panel />
      </motion.div>
    </AnimatePresence>
  );
}
