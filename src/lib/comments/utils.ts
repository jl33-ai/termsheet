// Utility helpers for comment filtering and ordering
import type { CommentBase, OutcomeLike, CommentSortKey } from '$lib/types';

export function filterByOutcome<T extends CommentBase>(comments: T[], outcomeId: string | null) {
  if (!outcomeId) return [...comments];
  return comments.filter((c) => c.outcome_id === outcomeId);
}

export function sortBase<T extends CommentBase>(comments: T[], currentUserId: string | null) {
  const uid = currentUserId;
  const arr = [...comments];
  arr.sort((a, b) => {
    const aIsUser = uid && a.user_id === uid ? 1 : 0;
    const bIsUser = uid && b.user_id === uid ? 1 : 0;
    if (aIsUser !== bIsUser) return bIsUser - aIsUser; // user first
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta; // newest first
  });
  return arr;
}

export function sortWithKey<T extends CommentBase>(
  comments: T[],
  currentUserId: string | null,
  key: CommentSortKey
) {
  const uid = currentUserId;
  const arr = [...comments];
  arr.sort((a, b) => {
    const aIsUser = uid && a.user_id === uid ? 1 : 0;
    const bIsUser = uid && b.user_id === uid ? 1 : 0;
    if (aIsUser !== bIsUser) return bIsUser - aIsUser;
    if (key === 'likes') {
      const la = Number(a.likes_count ?? 0);
      const lb = Number(b.likes_count ?? 0);
      if (la !== lb) return lb - la;
    } else {
      const aa = Number(a.amount_credits ?? a.shares ?? 0);
      const ab = Number(b.amount_credits ?? b.shares ?? 0);
      if (aa !== ab) return ab - aa;
    }
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });
  return arr;
}

export function dedupeAppend<T extends CommentBase>(existing: T[], incoming: T[]) {
  const seen = new Set(existing.map((c) => c.id));
  const fresh = incoming.filter((x) => !seen.has(x.id));
  return [...existing, ...fresh];
}

export function findOutcomeName(outcomes: OutcomeLike[] | null | undefined, id: string | null) {
  if (!outcomes || !id) return null;
  const o = outcomes.find((x) => x.id === id);
  return o?.name ?? null;
}
