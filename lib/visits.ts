import { db } from './firebase';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';

const SITE_DOC_REF = doc(db, 'analytics', 'site');

export async function incrementSiteVisit(): Promise<void> {
  await setDoc(SITE_DOC_REF, { count: increment(1), updatedAt: new Date().toISOString() }, { merge: true });
}

export async function getSiteVisitCount(): Promise<number> {
  const snap = await getDoc(SITE_DOC_REF);
  return snap.data()?.count ?? 0;
}
