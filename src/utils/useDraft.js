import { useSyncExternalStore } from 'react';
import { getDraft, subscribe } from './draft';

export function useDraft() {
  return useSyncExternalStore(subscribe, getDraft, getDraft);
}
