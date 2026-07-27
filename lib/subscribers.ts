import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, where } from 'firebase/firestore';

export async function addSubscriber(email: string): Promise<void> {
  const col = collection(db, 'subscribers');
  const existing = await getDocs(query(col, where('email', '==', email)));
  if (!existing.empty) throw new Error('이미 구독 중인 이메일입니다.');
  await addDoc(col, { email, subscribedAt: new Date().toISOString() });
}

export async function getSubscriberCount(): Promise<number> {
  const col = collection(db, 'subscribers');
  const snap = await getDocs(col);
  return snap.size;
}

export async function getRecentSubscribers(n = 10): Promise<{ email: string; subscribedAt: string }[]> {
  const col = collection(db, 'subscribers');
  const q = query(col, orderBy('subscribedAt', 'desc'), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ email: d.data().email, subscribedAt: d.data().subscribedAt }));
}
