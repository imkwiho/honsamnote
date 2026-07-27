import { db } from './firebase';
import { doc, getDoc, setDoc, increment, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export async function incrementViewCount(slug: string): Promise<number> {
  const ref = doc(db, 'views', slug);
  await setDoc(ref, { count: increment(1), updatedAt: new Date().toISOString() }, { merge: true });
  const snap = await getDoc(ref);
  return snap.data()?.count ?? 1;
}

export async function getViewCount(slug: string): Promise<number> {
  const ref = doc(db, 'views', slug);
  const snap = await getDoc(ref);
  return snap.data()?.count ?? 0;
}

export async function getAllViewCounts(): Promise<{ slug: string; count: number }[]> {
  const col = collection(db, 'views');
  const snap = await getDocs(col);
  return snap.docs.map(d => ({ slug: d.id, count: d.data().count ?? 0 }));
}

export async function getTopPosts(n = 10): Promise<{ slug: string; count: number }[]> {
  const col = collection(db, 'views');
  const q = query(col, orderBy('count', 'desc'), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ slug: d.id, count: d.data().count ?? 0 }));
}
