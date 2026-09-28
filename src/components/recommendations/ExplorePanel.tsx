import { ArrowLeft } from 'lucide-react';
import { useJourney } from '@/stores/journeyStore';
import { useRecommendations } from '@/hooks/useRecommendations';
import { companionCategories } from '@/mock/recommendations';
import { ChargingMini } from '../charging/ChargingMini';
import { CategoryChips } from './CategoryChips';
import { PlaceCard } from './PlaceCard';

/** EXPLORING: ranked nearby places that fit (or don't) your charging window. */
export function ExplorePanel() {
  const category = useJourney((s) => s.companionCategory);
  const selectedPlaceId = useJourney((s) => s.selectedPlaceId);
  const openCompanion = useJourney((s) => s.openCompanion);
  const back = useJourney((s) => s.backToCharging);
  const selectPlace = useJourney((s) => s.selectPlace);
  const walkTo = useJourney((s) => s.walkTo);
  const { ranked, best, minutes } = useRecommendations(category);
  const cat = companionCategories.find((c) => c.id === category);
  const fitting = ranked.filter((r) => r.fit.status !== 'no-fit' && r.fit.status !== 'closed').length;

  return (
    <div className="space-y-4">
      <button onClick={back} className="-ml-1 flex items-center gap-1 rounded-xl px-1.5 py-1 text-sm font-semibold text-muted hover:bg-surface-2">
        <ArrowLeft className="size-4" /> Charging
      </button>
      <ChargingMini />
      <div>
        <h2 className="text-[21px] font-bold leading-tight tracking-tight">
          {cat ? `${cat.emoji} ${cat.label}` : '✨ For you'} · <span className="num text-volt-strong">{minutes} min</span>
        </h2>
        <p className="text-sm text-muted">
          {fitting} of {ranked.length} options fit your charging window
        </p>
      </div>
      <CategoryChips withAll value={category} onChange={(c) => openCompanion(c)} />
      <div className="space-y-2.5">
        {ranked.map((r, i) => (
          <PlaceCard
            key={r.id}
            rec={r}
            index={i}
            topPick={r.id === best?.id}
            selected={r.id === selectedPlaceId}
            onSelect={() => selectPlace(r.id === selectedPlaceId ? null : r.id)}
            onWalk={() => walkTo(r.id)}
          />
        ))}
        {ranked.length === 0 && <div className="rounded-2xl bg-surface-2 p-6 text-center text-sm text-muted">Nothing in this category nearby.</div>}
      </div>
    </div>
  );
}
