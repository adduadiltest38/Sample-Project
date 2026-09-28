import type { RecommendationRequest } from '../../src/types';
import { bestPick, explainPick, rankActivities } from '../../src/lib/recommendationEngine';

export const RecommendationService = {
  recommend(req: RecommendationRequest) {
    const ranked = rankActivities(req);
    const best = bestPick(req);
    return { best: best ?? null, summary: best ? explainPick(best) : null, results: ranked };
  },
};
