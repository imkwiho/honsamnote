export interface SummaryData {
  todayVisitors: number;
  yesterdayVisitors: number;
  monthVisitors: number;
  totalVisitors: number;
  todayPageViews: number;
  yesterdayPageViews: number;
  monthPageViews: number;
  totalPageViews: number;
  activeVisitors: number;
}

export interface ReferrerItem { group: string; label: string; visitors: number; pageViews: number; ratio: number }
export interface DeviceItem { device: string; visitors: number; ratio: number }
export interface UtmSourceItem { source: string; visitors: number }
export interface UtmCampaignItem { campaign: string; pageViews: number }
export interface ReferrersData {
  referrers: ReferrerItem[];
  utm: { sources: UtmSourceItem[]; campaigns: UtmCampaignItem[] };
  devices: DeviceItem[];
}

export interface CategoryItem { category: string; label: string; pageViews: number; visitors: number; ratio: number }
export interface CategoriesData { categories: CategoryItem[] }

export interface PopularPostItem {
  rank: number;
  postSlug: string;
  category: string | null;
  pageTitle: string;
  views: number;
  visitors: number;
  lastViewedAt: string;
}
export type PostsPeriod = 'today' | '7d' | '30d' | 'all';
export interface PostsData { period: PostsPeriod; posts: PopularPostItem[]; dwellTimeSupported: boolean }

export interface RecentVisitItem {
  visitedAt: string;
  visitorIdShort: string;
  pageTitle: string | null;
  category: string | null;
  referrerGroupLabel: string | null;
  deviceType: string | null;
  isNewVisit: boolean;
}
export interface RecentData { visits: RecentVisitItem[] }

export interface TrendItem { date: string; visitors: number; pageViews: number }
export interface TrendData { trend: TrendItem[] }

export const DEVICE_LABELS: Record<string, string> = { mobile: '모바일', tablet: '태블릿', desktop: '데스크톱' };
