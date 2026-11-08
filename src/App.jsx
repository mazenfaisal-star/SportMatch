import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import {
  Activity, ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpLeft, Award, BarChart3, Bell, Download,
  BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, CircleHelp,
  Clock3, Dumbbell, Eye, FileBadge, Flag, GraduationCap, Heart, LayoutDashboard,
  LogOut, Mail, MapPin, Menu, MessageCircle, Plus, Search, Settings, ShieldCheck,
  Sparkles, Star, Target, TrendingUp, Trophy, UserRound, Users, Waves, X,
  Lock, Facebook, Building2, ClipboardList, SlidersHorizontal
} from 'lucide-react';
import { isSupabaseConfigured, supabase, supabaseConfigIssue } from './lib/supabase.js';

const authRedirectUrl = () => Capacitor.isNativePlatform()
  ? 'com.sportmatch.app://auth/callback'
  : window.location.origin;
const passwordRecoveryRedirectUrl = () => Capacitor.isNativePlatform()
  ? 'com.sportmatch.app://auth/callback'
  : `${window.location.origin}/auth/reset-password`;

const SPORTS = [
  { name: 'كرة القدم', icon: '⚽', color: 'green' },
  { name: 'السباحة', icon: '🏊', color: 'blue' },
  { name: 'الملاكمة', icon: '🥊', color: 'orange' },
  { name: 'كرة السلة', icon: '🏀', color: 'orange' },
  { name: 'التنس', icon: '🎾', color: 'green' },
  { name: 'اللياقة البدنية', icon: '🏋️', color: 'purple' },
  { name: 'الكرة الطائرة', icon: '🏐', color: 'blue' },
  { name: 'الجري وألعاب القوى', icon: '🏃', color: 'orange' },
  { name: 'رياضات قتالية', icon: '🥋', color: 'purple' },
  { name: 'ركوب الدراجات', icon: '🚴', color: 'green' },
];

const LEVELS = ['مبتدئ', 'مبتدئ متقدم', 'متوسط', 'متقدم', 'تنافسي'];
const NAV_COMMON = [
  { id: 'home', label: 'الرئيسية', icon: LayoutDashboard },
  { id: 'discover', label: 'اكتشف الرياضات', icon: Dumbbell },
  { id: 'coaches', label: 'المدربون والأكاديميات', icon: Users },
  { id: 'events', label: 'البطولات والفعاليات', icon: Trophy },
];
const APP_VIEW_IDS = new Set(['home', 'discover', 'coaches', 'events', 'progress', 'training', 'players', 'profile', 'settings', 'admin']);
const readViewFromUrl = () => {
  const requested = new URL(window.location.href).searchParams.get('view');
  return APP_VIEW_IDS.has(requested) ? requested : 'home';
};

const demoProfile = {
  id: 'demo-player', full_name: 'أحمد محمد', role: 'player', primary_sport: 'كرة القدم',
  current_level: 'متوسط', target_level: 'متقدم', location: 'الفيوم', is_public: true,
};
const demoPlayerDetails = {
  user_id: 'demo-player', goal_description: 'تطوير التحكم في الكرة ودقة التمرير والاستعداد لتجارب الأكاديميات.',
  short_term_goal: 'تحسين دقة التمرير خلال 6 أسابيع', has_current_coach: true,
  coach_type: 'on_platform', coach_user_id: 'demo-coach',
};
const demoCoachDetails = {
  user_id: 'demo-coach', specialties: ['كرة القدم'], experience_years: 6,
  qualifications: 'دورات تدريبية في إعداد الناشئين وتطوير المهارات الأساسية',
  certificates: 'شهادة تدريب محلية (مثال توضيحي)', workplace: 'ملعب النخبة الرياضي',
  academy_name: 'أكاديمية النخبة', location: 'الفيوم', price: 250,
  training_type: 'فردي وجماعي', bio: 'مدرب يركز على بناء الأساسيات الفنية وخطط التدريب المناسبة لكل لاعب.',
  verification_identity: false, verification_certificate: false, verification_organization: false,
};
const demoLogs = [
  { id: 'log-1', player_id: 'demo-player', coach_id: 'demo-coach', sport: 'كرة القدم', session_date: '2026-10-24', focus: 'التحكم في الكرة والتمرير', notes: 'تحسن في استقبال الكرة بالقدم الأضعف. نحتاج إلى زيادة الدقة أثناء الحركة.', next_steps: 'تدريبات تمرير في مساحات ضيقة.' },
  { id: 'log-2', player_id: 'demo-player', coach_id: 'demo-coach', sport: 'كرة القدم', session_date: '2026-10-21', focus: 'الاستلام والتحرك', notes: 'التزام جيد بالتدريبات وإدراك أفضل للمساحة.', next_steps: 'العمل على سرعة اتخاذ القرار.' },
  { id: 'log-3', player_id: 'demo-player', coach_id: 'demo-coach', sport: 'كرة القدم', session_date: '2026-10-18', focus: 'تمرير قصير', notes: 'جلسة تقييم أولية لتحديد نقاط القوة ومجالات التحسين.', next_steps: 'الاستمرار على أساسيات التمرير.' },
];
const demoAssessments = [
  { id: 'as-1', player_id: 'demo-player', coach_id: 'demo-coach', sport: 'كرة القدم', skill_name: 'التحكم في الكرة', score: 7, scale_max: 10, notes: 'تحسن عن التقييم السابق', assessed_at: '2026-10-24' },
  { id: 'as-2', player_id: 'demo-player', coach_id: 'demo-coach', sport: 'كرة القدم', skill_name: 'دقة التمرير', score: 6, scale_max: 10, notes: 'التركيز على التمرير أثناء الحركة', assessed_at: '2026-10-24' },
  { id: 'as-3', player_id: 'demo-player', coach_id: 'demo-coach', sport: 'كرة القدم', skill_name: 'اتخاذ القرار', score: 6, scale_max: 10, notes: 'بحاجة إلى تدريبات مواقف لعب', assessed_at: '2026-10-20' },
];
const demoCoaches = [
  { id: 'demo-coach', full_name: 'كابتن كريم عبد الله', primary_sport: 'كرة القدم', current_level: 'مدرب', location: 'الفيوم - حي الجامعة', is_public: true, specialty: 'تدريب الناشئين والمهارات الأساسية', price: 250, rating: '4.9', reviews: 36, academy_name: 'أكاديمية النخبة', years: 6 },
  { id: 'demo-coach-2', full_name: 'كابتن يوسف سامح', primary_sport: 'السباحة', current_level: 'مدرب', location: 'الفيوم - وسط البلد', is_public: true, specialty: 'تعليم السباحة وتحسين التكنيك', price: 300, rating: '4.8', reviews: 24, academy_name: 'مركز بلو', years: 5 },
  { id: 'demo-coach-3', full_name: 'كابتن عمر خالد', primary_sport: 'الملاكمة', current_level: 'مدرب', location: 'الجيزة - الدقي', is_public: true, specialty: 'أساسيات الملاكمة واللياقة', price: 200, rating: '4.7', reviews: 18, academy_name: 'نادي القوة', years: 4 },
  { id: 'demo-coach-4', full_name: 'كابتن مريم أحمد', primary_sport: 'كرة السلة', current_level: 'مدرب', location: 'القاهرة - مدينة نصر', is_public: true, specialty: 'مهارات كرة السلة للفئات العمرية المختلفة', price: 275, rating: '4.9', reviews: 31, academy_name: 'أكاديمية ستارت', years: 7 },
];
const demoEvents = [
  { title: 'يوم تجارب كرة القدم للناشئين', sport: 'كرة القدم', place: 'الفيوم', date: '2026-11-08', type: 'تجارب أداء', status: 'مثال توضيحي' },
  { title: 'فعالية سباحة مجتمعية', sport: 'السباحة', place: 'الجيزة', date: '2026-11-15', type: 'فعالية رياضية', status: 'مثال توضيحي' },
  { title: 'بطولة هواة لكرة السلة', sport: 'كرة السلة', place: 'القاهرة', date: '2026-11-22', type: 'بطولة', status: 'مثال توضيحي' },
];

function initials(name = 'SportMatch') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('');
}
function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}
function errorText(error) {
  const message = String(error?.message || '');
  if (/Invalid login credentials/i.test(message)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (/Email not confirmed/i.test(message)) return 'أكد بريدك الإلكتروني من الرسالة المرسلة إليك أولًا.';
  if (/email_address_not_authorized/i.test(message)) return 'Supabase لا يرسل حاليًا إلا لبريد أعضاء فريق المشروع. فعّل SMTP مخصصًا لإرسال الرسائل للعملاء.';
  if (/over_email_send_rate_limit|email rate limit exceeded/i.test(message)) return 'تم بلوغ حد رسائل البريد في Supabase. انتظر قليلًا أو فعّل SMTP مخصصًا.';
  if (/User already registered/i.test(message)) return 'هذا البريد مسجل بالفعل. جرّب تسجيل الدخول.';
  if (/rate.?limit|too many requests|\b429\b/i.test(message)) return 'تم تنفيذ محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.';
  if (/session.*missing|otp_expired|invalid.*(token|grant)|flow state|رابط الاستعادة/i.test(message)) return 'رابط الاستعادة منتهي أو لم يكتمل على نفس الجهاز. اطلب رابطًا جديدًا وافتحه من نفس المتصفح أو التطبيق.';
  if (/weak password|password.*(length|characters)/i.test(message)) return 'كلمة المرور لا تحقق متطلبات الأمان المحددة في إعدادات الحساب.';
  if (/row-level security|permission denied|not allowed/i.test(message)) return 'هذا الإجراء غير مسموح لهذا الحساب. راجع صلاحيات الحساب أو اطلب المساعدة.';
  // Never expose raw Postgres, Auth, or infrastructure errors in the interface.
  return 'حصل خطأ أثناء تنفيذ الطلب. راجع البيانات وحاول مرة أخرى.';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isAllowedSport(value) {
  return SPORTS.some((sport) => sport.name === value);
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [playerDetails, setPlayerDetails] = useState(null);
  const [coachDetails, setCoachDetails] = useState(null);
  const [logs, setLogs] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [coachPlayers, setCoachPlayers] = useState([]);
  const [coachOptions, setCoachOptions] = useState([]);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [isDemo, setIsDemo] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(false);
  const [view, setView] = useState(readViewFromUrl);
  const [authMode, setAuthMode] = useState('login');
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authForm, setAuthForm] = useState({ full_name: '', email: '', password: '' });
  const [onboarding, setOnboarding] = useState({
    role: 'player', full_name: '', primary_sport: 'كرة القدم', current_level: 'مبتدئ', target_level: 'متوسط',
    location: 'الفيوم', is_public: true, goal_description: '', short_term_goal: '',
    has_current_coach: false, coach_type: 'not_on_platform', coach_user_id: '',
    experience_years: 0, qualifications: '', certificates: '', workplace: '', academy_name: '',
    price: '', training_type: 'فردي وجماعي', bio: '', specialties_text: 'كرة القدم',
  });
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [pageError, setPageError] = useState('');
  const [query, setQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('الكل');
  const [locationFilter, setLocationFilter] = useState('الكل');
  const [modal, setModal] = useState('');
  const [logForm, setLogForm] = useState({ session_date: new Date().toISOString().slice(0, 10), sport: 'كرة القدم', focus: '', notes: '', next_steps: '', player_id: '' });
  const [assessmentForm, setAssessmentForm] = useState({ sport: 'كرة القدم', skill_name: '', score: '5', scale_max: '10', notes: '', player_id: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', primary_sport: '', current_level: '', target_level: '', location: '', is_public: true });

  const navigateBack = useCallback(() => {
    if (view === 'home') return;
    if (window.history.state?.sportMatchView) window.history.back();
    else {
      window.history.replaceState({ sportMatchView: 'home' }, '', `${window.location.pathname}${window.location.hash}`);
      setView('home');
    }
  }, [view]);

  useEffect(() => {
    const syncViewFromHistory = () => {
      setView(readViewFromUrl());
      setSidebarOpen(false);
      setPageError('');
    };
    window.addEventListener('popstate', syncViewFromHistory);
    return () => window.removeEventListener('popstate', syncViewFromHistory);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (view === 'home') url.searchParams.delete('view');
    else if (APP_VIEW_IDS.has(view)) url.searchParams.set('view', view);
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
  }, [view]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || (!session && !isDemo)) return undefined;
    const listener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (modal) setModal('');
      else if (sidebarOpen) setSidebarOpen(false);
      else if (view !== 'home') navigateBack();
      else if (canGoBack) window.history.back();
      else CapacitorApp.exitApp();
    });
    return () => { listener.then((handle) => handle.remove()); };
  }, [modal, navigateBack, session, isDemo, sidebarOpen, view]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthMessage(errorText(error));
      setSession(data?.session ?? null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setIsDemo(false);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('update_password');
        setAuthMessage('اكتب كلمة المرور الجديدة ثم احفظها.');
      }
    });
    const recoveryRoute = window.location.pathname === '/auth/reset-password'
      || new URLSearchParams(window.location.search).get('auth') === 'recovery'
      || new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
    if (recoveryRoute) setAuthMode('update_password');
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !supabase) return undefined;
    let active = true;
    const handleAuthUrl = async (url) => {
      try {
        const callback = new URL(url);
        const code = callback.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const accessToken = callback.hash.match(/(?:^|[&#])access_token=([^&]+)/)?.[1];
          const refreshToken = callback.hash.match(/(?:^|[&#])refresh_token=([^&]+)/)?.[1];
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: decodeURIComponent(accessToken),
              refresh_token: decodeURIComponent(refreshToken),
            });
            if (error) throw error;
          }
        }
        if (callback.searchParams.get('type') === 'recovery' || callback.hash.includes('type=recovery')) {
          window.dispatchEvent(new Event('sportmatch:password-recovery'));
        }
        await Browser.close().catch(() => {});
      } catch (error) {
        if (active) setAuthMessage(`تعذر إكمال تسجيل الدخول من الرابط: ${errorText(error)}`);
      }
    };
    const listener = CapacitorApp.addListener('appUrlOpen', ({ url }) => handleAuthUrl(url));
    CapacitorApp.getLaunchUrl().then((launch) => {
      if (active && launch?.url) handleAuthUrl(launch.url);
    });
    const recoveryHandler = () => setAuthMode('update_password');
    window.addEventListener('sportmatch:password-recovery', recoveryHandler);
    return () => {
      active = false;
      listener.then((handle) => handle.remove());
      window.removeEventListener('sportmatch:password-recovery', recoveryHandler);
    };
  }, []);

  // Admin access is resolved by a database function backed by the private
  // platform_admins table. Never trust a browser flag or editable user metadata.
  useEffect(() => {
    if (!session?.user?.id || !supabase || isDemo) {
      setIsPlatformAdmin(false);
      setAdminCheckLoading(false);
      return undefined;
    }
    let cancelled = false;
    setAdminCheckLoading(true);
    supabase.rpc('is_platform_admin')
      .then(({ data, error }) => {
        if (cancelled) return;
        setIsPlatformAdmin(!error && data === true);
        setAdminCheckLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsPlatformAdmin(false);
        setAdminCheckLoading(false);
      });
    return () => { cancelled = true; };
  }, [session?.user?.id, isDemo]);

  useEffect(() => {
    if (isDemo) {
      setProfile(demoProfile);
      setPlayerDetails(demoPlayerDetails);
      setCoachDetails(null);
      setLogs(demoLogs);
      setAssessments(demoAssessments);
      setCoachPlayers([{ ...demoProfile, id: 'demo-player', player_details: demoPlayerDetails }]);
      setView('home');
      setProfileForm({ full_name: demoProfile.full_name, primary_sport: demoProfile.primary_sport, current_level: demoProfile.current_level, target_level: demoProfile.target_level, location: demoProfile.location, is_public: demoProfile.is_public });
      return;
    }
    if (!session?.user || !supabase) {
      setProfile(null);
      setPlayerDetails(null);
      setCoachDetails(null);
      setLogs([]);
      setAssessments([]);
      setCoachPlayers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setAuthLoading(true);
      setPageError('');
      const user = session.user;
      const { data: p, error: pError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (cancelled) return;
      if (pError) {
        setPageError(`تعذر تحميل الملف الشخصي: ${errorText(pError)}`);
        setAuthLoading(false);
        return;
      }
      if (!p) {
        setPlayerDetails(null);
        setCoachDetails(null);
        setLogs([]);
        setAssessments([]);
        setCoachPlayers([]);
        const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '';
        setOnboarding((prev) => ({ ...prev, full_name: name }));
        const { data: coachData } = await supabase.from('profiles').select('id, full_name, primary_sport, location').eq('role', 'coach').eq('is_public', true).order('full_name').limit(100);
        if (!cancelled) setCoachOptions(coachData || []);
        setView('onboarding');
        setProfile(null);
      } else {
        setProfile(p);
        setProfileForm({ full_name: p.full_name || '', primary_sport: p.primary_sport || 'كرة القدم', current_level: p.current_level || 'مبتدئ', target_level: p.target_level || 'متوسط', location: p.location || '', is_public: Boolean(p.is_public) });
        if (p.role === 'player') {
          const { data: details } = await supabase.from('player_profiles').select('*').eq('user_id', user.id).maybeSingle();
          if (!cancelled) setPlayerDetails(details || null);
          setCoachDetails(null);
          const { data: trainingData } = await supabase.from('training_logs').select('*').eq('player_id', user.id).order('session_date', { ascending: false }).limit(50);
          const { data: assessmentData } = await supabase.from('skill_assessments').select('*').eq('player_id', user.id).order('assessed_at', { ascending: false }).limit(100);
          if (!cancelled) {
            setLogs(trainingData || []);
            setAssessments(assessmentData || []);
          }
        } else {
          const { data: details } = await supabase.from('coach_profiles').select('*').eq('user_id', user.id).maybeSingle();
          const { data: linkedRows } = await supabase.from('player_profiles').select('user_id, goal_description, short_term_goal, coach_user_id').eq('coach_user_id', user.id);
          let playerRows = [];
          if (linkedRows?.length) {
            const ids = linkedRows.map((row) => row.user_id);
            const { data: players } = await supabase.from('profiles').select('*').in('id', ids);
            playerRows = (players || []).map((player) => ({ ...player, player_details: linkedRows.find((row) => row.user_id === player.id) }));
          }
          if (!cancelled) {
            setCoachDetails(details || null);
            setCoachPlayers(playerRows);
            setPlayerDetails(null);
            const { data: trainingData } = await supabase.from('training_logs').select('*').eq('coach_id', user.id).order('session_date', { ascending: false }).limit(50);
            const { data: assessmentData } = await supabase.from('skill_assessments').select('*').eq('coach_id', user.id).order('assessed_at', { ascending: false }).limit(100);
            setLogs(trainingData || []);
            setAssessments(assessmentData || []);
          }
        }
        if (!cancelled) setView((old) => old === 'onboarding' ? 'home' : old);
      }
      if (!cancelled) setAuthLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session, isDemo]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3400);
    return () => clearTimeout(timer);
  }, [toast]);

  const role = profile?.role || onboarding.role;
  const displayName = profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || 'لاعب جديد';
  const navItems = useMemo(() => {
    const items = [...NAV_COMMON];
    if (role === 'player') items.splice(3, 0,
      { id: 'progress', label: 'تطوري الرياضي', icon: BarChart3 },
      { id: 'training', label: 'سجل التدريبات', icon: ClipboardList },
    );
    if (role === 'coach') items.splice(3, 0,
      { id: 'players', label: 'اللاعبون المرتبطون بي', icon: Users },
      { id: 'progress', label: 'التقييمات والتقدم', icon: BarChart3 },
      { id: 'training', label: 'سجل الجلسات', icon: ClipboardList },
    );
    items.push({ id: 'profile', label: 'ملفي الشخصي', icon: UserRound });
    items.push({ id: 'settings', label: 'الإعدادات والخصوصية', icon: Settings });
    if (isPlatformAdmin) items.push({ id: 'admin', label: 'لوحة الإدارة', icon: ShieldCheck });
    return items;
  }, [role, isPlatformAdmin]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthMessage('');
    if (!isSupabaseConfigured || !supabase) {
      setAuthMessage(supabaseConfigIssue === 'unsafe-key' ? 'مفتاح Supabase المضاف يبدو سريًا أو غير مخصص للمتصفح. استخدم Publishable Key فقط.' : 'إعدادات Supabase غير مكتملة أو رابط المشروع غير صالح. راجع ملف .env.local.');
      return;
    }
    const email = String(authForm.email || '').trim().toLowerCase();
    const password = String(authForm.password || '');
    if (authMode !== 'update_password' && !isValidEmail(email)) {
      setAuthMessage('اكتب بريدًا إلكترونيًا صحيحًا.');
      return;
    }
    if (password.length > 128) {
      setAuthMessage('كلمة المرور أطول من الحد المسموح.');
      return;
    }
    if (authMode === 'signup' || authMode === 'update_password') {
      if (password.length < 12) {
        setAuthMessage('استخدم كلمة مرور من 12 حرفًا على الأقل.');
        return;
      }
    } else if (authMode === 'login' && !password) {
      setAuthMessage('اكتب كلمة المرور.');
      return;
    }
    setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        const fullName = String(authForm.full_name || '').trim();
        if (!fullName) throw new Error('اكتب اسمك الأول.');
        if (fullName.length > 100) throw new Error('الاسم أطول من الحد المسموح.');
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: authRedirectUrl(), data: { full_name: fullName } },
        });
        if (error) throw error;
        if (!data.session) setAuthMessage('تم إنشاء الطلب. افتح رسالة التأكيد التي وصلت إلى بريدك الإلكتروني، ثم ارجع وسجّل الدخول.');
        else setAuthMessage('تم إنشاء الحساب. كمّل إعداد ملفك الرياضي.');
      } else if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (authMode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: passwordRecoveryRedirectUrl() });
        if (error) throw error;
        setAuthMessage('لو البريد مسجل، هتوصلك رسالة لإعادة تعيين كلمة المرور.');
      } else if (authMode === 'update_password') {
        if (!session) throw new Error('رابط الاستعادة منتهي أو غير صالح. اطلب رابطًا جديدًا وافتحه من نفس المتصفح أو التطبيق.');
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setPageError('');
        setAuthMode('login');
        setAuthMessage('تم تحديث كلمة المرور بنجاح. سجّل الدخول بها الآن.');
        window.history.replaceState({}, document.title, '/');
      }
    } catch (error) {
      setAuthMessage(errorText(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleOAuth(provider) {
    if (!['google', 'facebook'].includes(provider)) {
      setAuthMessage('مزود تسجيل الدخول غير مدعوم.');
      return;
    }
    if (!supabase || !isSupabaseConfigured) {
      setAuthMessage('إعدادات Supabase غير مكتملة.');
      return;
    }
    setAuthBusy(true);
    setAuthMessage('');
    try {
      const native = Capacitor.isNativePlatform();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: authRedirectUrl(), skipBrowserRedirect: native },
      });
      if (error) throw error;
      if (native && data?.url) await Browser.open({ url: data.url });
    } catch (error) {
      setAuthMessage(errorText(error));
      setAuthBusy(false);
    }
  }

  function enterDemo() {
    setIsDemo(true);
    setSession({ user: { id: 'demo-player', email: 'demo@sportmatch.example', user_metadata: { full_name: 'أحمد محمد' } } });
    setProfile(demoProfile);
    setPlayerDetails(demoPlayerDetails);
    setCoachDetails(null);
    setLogs(demoLogs);
    setAssessments(demoAssessments);
    setCoachPlayers([{ ...demoProfile, player_details: demoPlayerDetails }]);
    setView('home');
    setToast('أنت الآن تستكشف نسخة تجريبية ببيانات توضيحية.');
  }

  async function signOut() {
    if (isDemo) {
      setIsDemo(false); setSession(null); setProfile(null); setView('home'); return;
    }
    if (supabase) await supabase.auth.signOut();
    setProfile(null); setSession(null); setPlayerDetails(null); setCoachDetails(null);
    setLogs([]); setAssessments([]); setCoachPlayers([]); setView('home');
  }

  function updateOnboarding(key, value) {
    setOnboarding((prev) => ({ ...prev, [key]: value }));
  }

  async function submitOnboarding(event) {
    event.preventDefault();
    setPageError('');
    const fullName = String(onboarding.full_name || '').trim();
    const location = String(onboarding.location || '').trim();
    if (!fullName) return setPageError('اكتب الاسم الذي سيظهر في ملفك.');
    if (fullName.length > 100) return setPageError('الاسم يجب ألا يزيد عن 100 حرف.');
    if (location.length > 120) return setPageError('الموقع يجب ألا يزيد عن 120 حرفًا.');
    if (!['player', 'coach'].includes(onboarding.role)) return setPageError('نوع الحساب غير صحيح.');
    if (!isAllowedSport(onboarding.primary_sport) || !LEVELS.includes(onboarding.current_level) || !LEVELS.includes(onboarding.target_level)) return setPageError('راجع الرياضة والمستويات المختارة.');
    if (onboarding.role === 'player') {
      if (String(onboarding.goal_description || '').length > 1000 || String(onboarding.short_term_goal || '').length > 500) return setPageError('وصف الأهداف أطول من الحد المسموح.');
      if (onboarding.has_current_coach && onboarding.coach_type === 'on_platform') {
        const selectedCoach = coachOptions.some((coach) => coach.id === onboarding.coach_user_id);
        if (!onboarding.coach_user_id || !selectedCoach) return setPageError('اختار مدربًا موجودًا في القائمة، أو غيّر الاختيار إلى مدرب خارج المنصة.');
      }
    } else {
      const experience = Number(onboarding.experience_years);
      const price = onboarding.price === '' ? null : Number(onboarding.price);
      if (!Number.isInteger(experience) || experience < 0 || experience > 70) return setPageError('سنوات الخبرة يجب أن تكون رقمًا صحيحًا بين 0 و70.');
      if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1000000)) return setPageError('راجع سعر الجلسة.');
      if (String(onboarding.qualifications || '').length > 1500 || String(onboarding.certificates || '').length > 1500 || String(onboarding.bio || '').length > 2000) return setPageError('أحد حقول الخبرة أو النبذة أطول من الحد المسموح.');
      if (String(onboarding.workplace || '').length > 120 || String(onboarding.academy_name || '').length > 120 || String(onboarding.specialties_text || '').length > 800) return setPageError('راجع بيانات مكان التدريب أو التخصصات.');
    }
    setOnboardingBusy(true);
    const cleanProfile = {
      id: isDemo ? (onboarding.role === 'coach' ? 'demo-coach-account' : 'demo-player') : session?.user?.id,
      full_name: fullName, role: onboarding.role,
      primary_sport: onboarding.primary_sport, current_level: onboarding.current_level,
      target_level: onboarding.target_level, location, is_public: Boolean(onboarding.is_public),
    };
    if (isDemo || !supabase) {
      setProfile(cleanProfile);
      if (onboarding.role === 'player') {
        setPlayerDetails({ user_id: cleanProfile.id, goal_description: onboarding.goal_description, short_term_goal: onboarding.short_term_goal, has_current_coach: onboarding.has_current_coach, coach_type: onboarding.coach_type, coach_user_id: onboarding.coach_type === 'on_platform' ? onboarding.coach_user_id || null : null });
        setCoachDetails(null);
      } else {
        setCoachDetails({ user_id: cleanProfile.id, specialties: onboarding.specialties_text.split(/[،,]/).map((s) => s.trim()).filter(Boolean), experience_years: Number(onboarding.experience_years) || 0, qualifications: onboarding.qualifications, certificates: onboarding.certificates, workplace: onboarding.workplace, academy_name: onboarding.academy_name, location: onboarding.location, price: Number(onboarding.price) || null, training_type: onboarding.training_type, bio: onboarding.bio, verification_identity: false, verification_certificate: false, verification_organization: false });
        setPlayerDetails(null);
      }
      setIsDemo(true);
      setProfileForm({ full_name: cleanProfile.full_name, primary_sport: cleanProfile.primary_sport, current_level: cleanProfile.current_level, target_level: cleanProfile.target_level, location: cleanProfile.location, is_public: cleanProfile.is_public });
      setView('home'); setOnboardingBusy(false); setToast('تم تحديث بيانات النسخة التجريبية فقط، ولم يتم حفظها في قاعدة بيانات.'); return;
    }
    try {
      const { error: profileError } = await supabase.from('profiles').insert(cleanProfile);
      if (profileError) throw profileError;
      if (onboarding.role === 'player') {
        const playerRow = {
          user_id: cleanProfile.id, goal_description: onboarding.goal_description.trim(), short_term_goal: onboarding.short_term_goal.trim(),
          has_current_coach: onboarding.has_current_coach,
          coach_type: onboarding.has_current_coach ? onboarding.coach_type : 'none',
          coach_user_id: onboarding.has_current_coach && onboarding.coach_type === 'on_platform' ? (onboarding.coach_user_id || null) : null,
        };
        const { error } = await supabase.from('player_profiles').upsert(playerRow, { onConflict: 'user_id' });
        if (error) throw error;
      } else {
        const coachRow = {
          user_id: cleanProfile.id, specialties: onboarding.specialties_text.split(/[،,]/).map((s) => s.trim()).filter(Boolean),
          experience_years: Math.max(0, Number(onboarding.experience_years) || 0), qualifications: onboarding.qualifications.trim(), certificates: onboarding.certificates.trim(),
          workplace: onboarding.workplace.trim(), academy_name: onboarding.academy_name.trim(), location: onboarding.location.trim(),
          price: onboarding.price === '' ? null : Number(onboarding.price), training_type: onboarding.training_type, bio: onboarding.bio.trim(),
        };
        const { error } = await supabase.from('coach_profiles').upsert(coachRow, { onConflict: 'user_id' });
        if (error) throw error;
      }
      setProfile(cleanProfile);
      setProfileForm({ full_name: cleanProfile.full_name, primary_sport: cleanProfile.primary_sport, current_level: cleanProfile.current_level, target_level: cleanProfile.target_level, location: cleanProfile.location, is_public: cleanProfile.is_public });
      if (onboarding.role === 'player') setPlayerDetails({ user_id: cleanProfile.id, goal_description: onboarding.goal_description, short_term_goal: onboarding.short_term_goal, has_current_coach: onboarding.has_current_coach, coach_type: onboarding.coach_type, coach_user_id: onboarding.coach_user_id || null });
      else setCoachDetails({ user_id: cleanProfile.id, specialties: onboarding.specialties_text.split(/[،,]/).map((s) => s.trim()).filter(Boolean), experience_years: Number(onboarding.experience_years) || 0, qualifications: onboarding.qualifications, certificates: onboarding.certificates, workplace: onboarding.workplace, academy_name: onboarding.academy_name, location: onboarding.location, price: Number(onboarding.price) || null, training_type: onboarding.training_type, bio: onboarding.bio });
      setView('home'); setToast('تم حفظ ملفك بنجاح.');
    } catch (error) {
      setPageError(`مقدرناش نحفظ البيانات: ${errorText(error)} تأكد أنك شغلت ملف SQL الموجود في مجلد supabase.`);
    } finally {
      setOnboardingBusy(false);
    }
  }

  async function openOnboarding() {
    if (isDemo) {
      setCoachOptions(demoCoaches.map((coach) => ({ id: coach.id, full_name: coach.full_name, primary_sport: coach.primary_sport, location: coach.location })));
      setOnboarding((prev) => ({ ...prev, full_name: profile?.full_name || prev.full_name, role: profile?.role || prev.role, primary_sport: profile?.primary_sport || prev.primary_sport, current_level: profile?.current_level || prev.current_level, target_level: profile?.target_level || prev.target_level, location: profile?.location || prev.location, is_public: profile?.is_public ?? prev.is_public, goal_description: playerDetails?.goal_description || prev.goal_description, short_term_goal: playerDetails?.short_term_goal || prev.short_term_goal, has_current_coach: playerDetails?.has_current_coach ?? prev.has_current_coach, coach_type: playerDetails?.coach_type || prev.coach_type, coach_user_id: playerDetails?.coach_user_id || prev.coach_user_id, experience_years: coachDetails?.experience_years ?? prev.experience_years, qualifications: coachDetails?.qualifications || prev.qualifications, certificates: coachDetails?.certificates || prev.certificates, workplace: coachDetails?.workplace || prev.workplace, academy_name: coachDetails?.academy_name || prev.academy_name, price: coachDetails?.price ?? prev.price, training_type: coachDetails?.training_type || prev.training_type, bio: coachDetails?.bio || prev.bio, specialties_text: coachDetails?.specialties?.join('، ') || prev.specialties_text }));
      setView('onboarding');
      return;
    }
    if (supabase && session?.user) {
      const { data } = await supabase.from('profiles').select('id, full_name, primary_sport, location').eq('role', 'coach').eq('is_public', true).order('full_name').limit(100);
      setCoachOptions(data || []);
    }
    setOnboarding((prev) => ({ ...prev, full_name: profile?.full_name || prev.full_name, role: profile?.role || prev.role, primary_sport: profile?.primary_sport || prev.primary_sport, current_level: profile?.current_level || prev.current_level, target_level: profile?.target_level || prev.target_level, location: profile?.location || prev.location, is_public: profile?.is_public ?? prev.is_public, goal_description: playerDetails?.goal_description || prev.goal_description, short_term_goal: playerDetails?.short_term_goal || prev.short_term_goal, has_current_coach: playerDetails?.has_current_coach ?? prev.has_current_coach, coach_type: playerDetails?.coach_type || prev.coach_type, coach_user_id: playerDetails?.coach_user_id || prev.coach_user_id, experience_years: coachDetails?.experience_years ?? prev.experience_years, qualifications: coachDetails?.qualifications || prev.qualifications, certificates: coachDetails?.certificates || prev.certificates, workplace: coachDetails?.workplace || prev.workplace, academy_name: coachDetails?.academy_name || prev.academy_name, price: coachDetails?.price ?? prev.price, training_type: coachDetails?.training_type || prev.training_type, bio: coachDetails?.bio || prev.bio, specialties_text: coachDetails?.specialties?.join('، ') || prev.specialties_text }));
    setView('onboarding');
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true); setPageError('');
    const fullName = String(profileForm.full_name || '').trim();
    const location = String(profileForm.location || '').trim();
    if (!fullName || fullName.length > 100 || location.length > 120 || !isAllowedSport(profileForm.primary_sport) || !LEVELS.includes(profileForm.current_level) || !LEVELS.includes(profileForm.target_level)) {
      setPageError('راجع الاسم والموقع والرياضة والمستويات قبل الحفظ.');
      setSaving(false);
      return;
    }
    const updated = { ...profile, ...profileForm, full_name: fullName, location };
    if (!isDemo && supabase) {
      const { error } = await supabase.from('profiles').update({ full_name: updated.full_name, primary_sport: updated.primary_sport, current_level: updated.current_level, target_level: updated.target_level, location: updated.location, is_public: updated.is_public }).eq('id', profile.id);
      if (error) { setPageError(errorText(error)); setSaving(false); return; }
    }
    setProfile(updated); setProfileEdit(false); setSaving(false); setToast(isDemo ? 'تم التحديث في العرض التجريبي فقط.' : 'تم حفظ التعديلات.');
  }

  async function saveTrainingLog(event) {
    event.preventDefault();
    const focus = String(logForm.focus || '').trim();
    const notes = String(logForm.notes || '').trim();
    const nextSteps = String(logForm.next_steps || '').trim();
    if (!focus) return setPageError('اكتب موضوع الجلسة التدريبية.');
    if (focus.length > 150 || notes.length > 1500 || nextSteps.length > 1000 || !isAllowedSport(logForm.sport)) return setPageError('راجع نصوص الجلسة والرياضة؛ بعض الحقول تجاوزت الحد المسموح.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(logForm.session_date) || Number.isNaN(Date.parse(`${logForm.session_date}T12:00:00`))) return setPageError('تاريخ الجلسة غير صحيح.');
    setSaving(true); setPageError('');
    const row = {
      player_id: profile.role === 'player' ? profile.id : logForm.player_id,
      coach_id: profile.role === 'coach' ? profile.id : null,
      sport: logForm.sport, session_date: logForm.session_date, focus,
      notes, next_steps: nextSteps,
    };
    if (profile.role === 'coach' && !row.player_id) { setPageError('اختار اللاعب المرتبط بيك قبل حفظ الجلسة.'); setSaving(false); return; }
    if (isDemo || !supabase) {
      const localRow = { ...row, id: `demo-log-${Date.now()}` };
      setLogs((prev) => [localRow, ...prev]); setModal(''); setSaving(false); setToast('أُضيفت الجلسة إلى العرض التجريبي فقط.'); return;
    }
    const { data, error } = await supabase.from('training_logs').insert(row).select().single();
    if (error) { setPageError(errorText(error)); setSaving(false); return; }
    setLogs((prev) => [data, ...prev]); setModal(''); setSaving(false); setToast('تم حفظ الجلسة التدريبية.');
  }

  async function saveAssessment(event) {
    event.preventDefault();
    const score = Number(assessmentForm.score); const max = Number(assessmentForm.scale_max);
    const skillName = String(assessmentForm.skill_name || '').trim();
    const assessmentNotes = String(assessmentForm.notes || '').trim();
    if (!skillName) return setPageError('اكتب اسم المهارة.');
    if (skillName.length > 100 || assessmentNotes.length > 1000 || !isAllowedSport(assessmentForm.sport)) return setPageError('راجع اسم المهارة والملاحظات والرياضة.');
    if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0 || max > 1000 || score < 0 || score > max) return setPageError('راجع الدرجة والحد الأقصى للتقييم.');
    setSaving(true); setPageError('');
    const row = {
      player_id: profile.role === 'player' ? profile.id : assessmentForm.player_id,
      coach_id: profile.role === 'coach' ? profile.id : null,
      sport: assessmentForm.sport, skill_name: skillName, score, scale_max: max,
      notes: assessmentNotes, assessed_at: new Date().toISOString().slice(0, 10),
    };
    if (profile.role === 'coach' && !row.player_id) { setPageError('اختار اللاعب قبل حفظ التقييم.'); setSaving(false); return; }
    if (isDemo || !supabase) {
      setAssessments((prev) => [{ ...row, id: `demo-assess-${Date.now()}` }, ...prev]); setModal(''); setSaving(false); setToast('أُضيف التقييم إلى العرض التجريبي فقط.'); return;
    }
    const { data, error } = await supabase.from('skill_assessments').insert(row).select().single();
    if (error) { setPageError(errorText(error)); setSaving(false); return; }
    setAssessments((prev) => [data, ...prev]); setModal(''); setSaving(false); setToast('تم حفظ التقييم، مع الاحتفاظ بالتقييمات السابقة.');
  }

  if (authLoading && !profile && !isDemo && !view.includes('onboarding')) return <div className="loading-screen"><div className="brand-mark"><Activity size={25} /></div><div className="loading-line" /><p>بنجهز مساحتك الرياضية...</p></div>;
  if (authMode === 'update_password' && session && !isDemo) return <AuthScreen authMode={authMode} setAuthMode={(mode) => { setAuthMode(mode); setAuthMessage(''); }} authForm={authForm} setAuthForm={setAuthForm} authMessage={authMessage} authBusy={authBusy} onSubmit={handleAuthSubmit} onOAuth={handleOAuth} onDemo={enterDemo} />;
  if (!session && !isDemo) return <AuthScreen authMode={authMode} setAuthMode={(mode) => { setAuthMode(mode); setAuthMessage(''); }} authForm={authForm} setAuthForm={setAuthForm} authMessage={authMessage} authBusy={authBusy} onSubmit={handleAuthSubmit} onOAuth={handleOAuth} onDemo={enterDemo} />;
  if (view === 'onboarding' || (!profile && session)) return <OnboardingScreen onboarding={onboarding} updateOnboarding={updateOnboarding} coachOptions={coachOptions} onSubmit={submitOnboarding} busy={onboardingBusy} error={pageError} demo={isDemo} lockedRole={Boolean(profile) && !isDemo} />;

  const navigate = (id) => {
    if (APP_VIEW_IDS.has(id) && id !== view) {
      const url = new URL(window.location.href);
      if (id === 'home') url.searchParams.delete('view');
      else url.searchParams.set('view', id);
      window.history.pushState({ sportMatchView: id }, '', url);
    }
    setView(id); setSidebarOpen(false); setPageError('');
  };
  return (
    <div className="app-frame" dir="rtl">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><div className="brand-mark"><Activity size={22} strokeWidth={2.8} /></div><div><b>SportMatch</b><span>رحلتك الرياضية</span></div></div>
        <div className="side-profile"><div className="avatar avatar-main">{initials(displayName)}</div><div className="side-profile-info"><strong>{displayName}</strong><span>{profile.role === 'coach' ? 'حساب مدرب' : 'حساب لاعب'} · {profile.primary_sport || 'رياضة'}</span></div><button className="icon-button side-chevron" aria-label="فتح الملف" onClick={() => navigate('profile')}><ChevronDown size={16} /></button></div>
        <div className="side-label">القائمة الرئيسية</div>
        <nav className="side-nav" aria-label="القائمة الرئيسية">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}><Icon size={18} /><span>{item.label}</span>{item.id === 'progress' && profile.role === 'player' ? <span className="nav-pill">جديد</span> : null}</button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help"><div className="help-icon"><CircleHelp size={18} /></div><div><strong>محتاج مساعدة؟</strong><span>خلينا نساعدك تبدأ</span></div><ArrowLeft size={15} /></div>
          <button className="nav-item" onClick={() => navigate('settings')}><Settings size={18} /><span>الإعدادات</span></button>
          <button className="nav-item logout-item" onClick={signOut}><LogOut size={18} /><span>{isDemo ? 'إنهاء التجربة' : 'تسجيل الخروج'}</span></button>
          <div className="side-footer">SPORTMATCH <span>•</span> نسخة أولية 0.1</div>
        </div>
      </aside>

      {sidebarOpen && <button className="mobile-scrim" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة" />}
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)} aria-label="فتح القائمة"><Menu size={21} /></button>
          <div className="topbar-location">{view !== 'home' && <button className="topbar-back icon-button" onClick={navigateBack} aria-label="رجوع للقسم السابق"><ArrowRight size={18} /></button>}<div className="breadcrumbs"><span>SportMatch</span><span className="crumb-sep">/</span><strong>{navItems.find((n) => n.id === view)?.label || 'الرئيسية'}</strong></div></div>
          <div className="topbar-actions">
            <label className="top-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') navigate('coaches'); }} placeholder="ابحث عن رياضة أو مدرب..." /><kbd>⌕</kbd></label>
            <button className="icon-button notification-button" aria-label="الإشعارات" onClick={() => setToast('لا توجد إشعارات جديدة في النموذج الأولي.')}><Bell size={18} /><i /></button>
            <button className="top-avatar" onClick={() => navigate('profile')} aria-label="الملف الشخصي">{initials(displayName)}</button>
          </div>
        </header>
        {isDemo && <div className="demo-banner"><Sparkles size={15} /><span>أنت في النسخة التجريبية — البيانات الظاهرة توضيحية ولن تُحفظ في قاعدة بيانات.</span><button onClick={openOnboarding}>جرّب تعديل ملفك <ArrowLeft size={14} /></button></div>}
        {pageError && <div className="inline-alert error-alert"><InfoIcon /><span>{pageError}</span><button className="icon-button" onClick={() => setPageError('')} aria-label="إغلاق التنبيه"><X size={16} /></button></div>}
        {view === 'home' && <Dashboard profile={profile} playerDetails={playerDetails} coachDetails={coachDetails} logs={logs} assessments={assessments} coachPlayers={coachPlayers} onNavigate={navigate} onAddLog={() => { setLogForm((p) => ({ ...p, sport: profile.primary_sport || 'كرة القدم', player_id: coachPlayers[0]?.id || '' })); setModal('log'); }} onAddAssessment={() => { setAssessmentForm((p) => ({ ...p, sport: profile.primary_sport || 'كرة القدم', player_id: coachPlayers[0]?.id || '' })); setModal('assessment'); }} />}
        {view === 'discover' && <DiscoverPage query={query} setQuery={setQuery} sportFilter={sportFilter} setSportFilter={setSportFilter} onNavigate={navigate} />}
        {view === 'coaches' && <CoachesPage isDemo={isDemo} query={query} setQuery={setQuery} sportFilter={sportFilter} setSportFilter={setSportFilter} locationFilter={locationFilter} setLocationFilter={setLocationFilter} onToast={setToast} />}
        {view === 'events' && <EventsPage isDemo={isDemo} onToast={setToast} />}
        {view === 'profile' && <ProfilePage profile={profile} playerDetails={playerDetails} coachDetails={coachDetails} logs={logs} edit={profileEdit} setEdit={setProfileEdit} form={profileForm} setForm={setProfileForm} onSave={saveProfile} onEditMore={openOnboarding} saving={saving} error={pageError} />}
        {view === 'progress' && <ProgressPage profile={profile} assessments={assessments} logs={logs} players={coachPlayers} onAdd={() => { setAssessmentForm((p) => ({ ...p, sport: profile.primary_sport || 'كرة القدم', player_id: coachPlayers[0]?.id || '' })); setModal('assessment'); }} />}
        {view === 'training' && <TrainingPage profile={profile} logs={logs} onAdd={() => { setLogForm((p) => ({ ...p, sport: profile.primary_sport || 'كرة القدم', player_id: coachPlayers[0]?.id || '' })); setModal('log'); }} />}
        {view === 'players' && <PlayersPage players={coachPlayers} onAddAssessment={(playerId) => { setAssessmentForm((p) => ({ ...p, sport: profile.primary_sport || 'كرة القدم', player_id: playerId })); setModal('assessment'); }} onAddLog={(playerId) => { setLogForm((p) => ({ ...p, sport: profile.primary_sport || 'كرة القدم', player_id: playerId })); setModal('log'); }} />}
        {view === 'settings' && <SettingsPage profile={profile} onEdit={openOnboarding} onTogglePublic={async (next) => { const prev = profile.is_public; setProfile({ ...profile, is_public: next }); setProfileForm((p) => ({ ...p, is_public: next })); if (!isDemo && supabase) { const { error } = await supabase.from('profiles').update({ is_public: next }).eq('id', profile.id); if (error) { setProfile((p) => ({ ...p, is_public: prev })); setToast(`تعذر تحديث الخصوصية: ${errorText(error)}`); } else setToast('تم تحديث ظهور ملفك.'); } else setToast('تم التغيير في النسخة التجريبية فقط.'); }} />}
        {view === 'admin' && isPlatformAdmin && !isDemo && supabase && <AdminPage client={supabase} onToast={setToast} />}
      </main>
      {modal && <Modal title={modal === 'log' ? (profile.role === 'coach' ? 'إضافة جلسة للاعب' : 'إضافة جلسة تدريب') : 'إضافة تقييم مهارة'} onClose={() => { setModal(''); setPageError(''); }}>
        {modal === 'log' ? <form className="modal-form" onSubmit={saveTrainingLog}>
          {profile.role === 'coach' && <label>اللاعب<select value={logForm.player_id} onChange={(e) => setLogForm({ ...logForm, player_id: e.target.value })} required><option value="">اختار لاعبًا</option>{coachPlayers.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>}
          <div className="form-grid-two"><label>تاريخ التدريب<input type="date" value={logForm.session_date} onChange={(e) => setLogForm({ ...logForm, session_date: e.target.value })} required /></label><label>الرياضة<select value={logForm.sport} onChange={(e) => setLogForm({ ...logForm, sport: e.target.value })}>{SPORTS.map((sport) => <option key={sport.name}>{sport.name}</option>)}</select></label></div>
          <label>محور الجلسة<input maxLength={150} value={logForm.focus} onChange={(e) => setLogForm({ ...logForm, focus: e.target.value })} placeholder="مثال: الاستلام والتحرك" required /></label>
          <label>ملاحظات التدريب<textarea rows="3" maxLength={1500} value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} placeholder="إيه اللي اتعمل في الجلسة؟" /></label>
          <label>الخطوة القادمة<textarea rows="2" maxLength={1000} value={logForm.next_steps} onChange={(e) => setLogForm({ ...logForm, next_steps: e.target.value })} placeholder="إيه اللي نركز عليه في المرة الجاية؟" /></label>
          <div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setModal('')}>إلغاء</button><button className="button button-primary" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ الجلسة'}</button></div>
        </form> : <form className="modal-form" onSubmit={saveAssessment}>
          {profile.role === 'coach' && <label>اللاعب<select value={assessmentForm.player_id} onChange={(e) => setAssessmentForm({ ...assessmentForm, player_id: e.target.value })} required><option value="">اختار لاعبًا</option>{coachPlayers.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>}
          <div className="form-grid-two"><label>الرياضة<select value={assessmentForm.sport} onChange={(e) => setAssessmentForm({ ...assessmentForm, sport: e.target.value })}>{SPORTS.map((sport) => <option key={sport.name}>{sport.name}</option>)}</select></label><label>اسم المهارة<input maxLength={100} value={assessmentForm.skill_name} onChange={(e) => setAssessmentForm({ ...assessmentForm, skill_name: e.target.value })} placeholder="مثال: دقة التمرير" required /></label></div>
          <div className="form-grid-two"><label>الدرجة<input type="number" min="0" step="0.1" value={assessmentForm.score} onChange={(e) => setAssessmentForm({ ...assessmentForm, score: e.target.value })} required /></label><label>الحد الأقصى<input type="number" min="1" max="1000" step="1" value={assessmentForm.scale_max} onChange={(e) => setAssessmentForm({ ...assessmentForm, scale_max: e.target.value })} required /></label></div>
          <label>ملاحظات توضيحية<textarea rows="3" maxLength={1000} value={assessmentForm.notes} onChange={(e) => setAssessmentForm({ ...assessmentForm, notes: e.target.value })} placeholder="اكتب ملاحظات مرتبطة بمعيار واضح" /></label>
          <p className="form-hint"><ShieldCheck size={14} /> سيتم حفظ التقييم كتسجيل جديد ولن يحذف أي تقييم سابق.</p>
          <div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setModal('')}>إلغاء</button><button className="button button-primary" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ التقييم'}</button></div>
        </form>}
      </Modal>}
      {toast && <div className="toast-message"><CheckCircle2 size={17} /><span>{toast}</span><button aria-label="إغلاق" onClick={() => setToast('')}><X size={15} /></button></div>}
    </div>
  );
}

function InfoIcon() { return <CircleHelp size={17} />; }

function AuthScreen({ authMode, setAuthMode, authForm, setAuthForm, authMessage, authBusy, onSubmit, onOAuth, onDemo }) {
  const heading = authMode === 'signup' ? 'ابدأ رحلتك الرياضية' : authMode === 'reset' ? 'استعادة الحساب' : authMode === 'update_password' ? 'تعيين كلمة مرور جديدة' : 'أهلًا بعودتك';
  const subheading = authMode === 'signup' ? 'أنشئ حسابك، وحدد رياضتك، وابدأ في متابعة تقدمك.' : authMode === 'reset' ? 'اكتب بريدك الإلكتروني وسنرسل لك رابط استعادة.' : authMode === 'update_password' ? 'اختار كلمة مرور جديدة لحسابك.' : 'مكان واحد لمدربك، وتدريباتك، وكل خطوة بتقربك لهدفك.';
  return <div className="auth-page" dir="rtl">
    <header className="auth-brand"><div className="auth-brand-lockup"><div className="brand-mark"><Activity size={22} /></div><strong>SportMatch</strong><span>رحلتك الرياضية تبدأ هنا</span></div><a className="button button-primary auth-download" href="/download/SportMatch.apk" download><Download size={16} /> تنزيل Android</a></header>
    <div className="auth-layout">
      <section className="auth-visual">
        <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-grid" />
        <div className="visual-topline"><span className="live-dot" /> <span>مساحتك الرياضية الشخصية</span></div>
        <div className="visual-copy"><span className="eyebrow"><Sparkles size={15} /> أكثر من مجرد تدريب</span><h1>كل تمرينة،<br /><em>خطوة أقرب لهدفك.</em></h1><p>اكتشف مدربين وأكاديميات، تابع تطور مستواك، وخلي رحلتك الرياضية واضحة من أول يوم.</p><div className="visual-stats"><div><b>01</b><span>اكتشف رياضتك</span></div><div><b>02</b><span>تابع تقدمك</span></div><div><b>03</b><span>وصل لهدفك</span></div></div></div>
        <div className="floating-training-card"><div className="floating-icon"><TrendingUp size={20} /></div><div><span>تقدمك مش بيقف</span><strong>كل خطوة محسوبة</strong></div><span className="mini-bars"><i /><i /><i /><i /><i /><i /></span></div>
        <div className="visual-sport-icons"><span>⚽</span><span>🏊</span><span>🥊</span><span>🏀</span><span>🎾</span></div>
      </section>
      <section className="auth-panel-wrap"><div className="auth-panel">
        <div className="auth-panel-head"><div className="auth-avatar"><UserRound size={23} /></div><span className="overline">SPORTMATCH ACCOUNT</span><h2>{heading}</h2><p>{subheading}</p></div>
        <div className="social-buttons"><button className="social-button" onClick={() => onOAuth('google')} disabled={authBusy}><GoogleMark /> المتابعة باستخدام Google</button><button className="social-button social-facebook" onClick={() => onOAuth('facebook')} disabled={authBusy}><Facebook size={18} fill="currentColor" /> المتابعة باستخدام Facebook</button></div>
        <div className="auth-divider"><span>أو باستخدام البريد الإلكتروني</span></div>
        <form className="auth-form" onSubmit={onSubmit}>
          {authMode === 'signup' && <label>الاسم بالكامل<div className="input-with-icon"><UserRound size={17} /><input autoComplete="name" maxLength={100} value={authForm.full_name} onChange={(e) => setAuthForm({ ...authForm, full_name: e.target.value })} placeholder="اكتب اسمك" required /></div></label>}
          {authMode !== 'update_password' && <label>البريد الإلكتروني<div className="input-with-icon"><Mail size={17} /><input type="email" autoComplete="email" maxLength={254} value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="name@example.com" required /></div></label>}
          {authMode !== 'reset' && <label>{authMode === 'update_password' ? 'كلمة المرور الجديدة' : 'كلمة المرور'}<div className="input-with-icon"><Lock size={17} /><input type="password" autoComplete={authMode === 'signup' || authMode === 'update_password' ? 'new-password' : 'current-password'} minLength={authMode === 'signup' || authMode === 'update_password' ? 12 : undefined} maxLength={128} value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder={authMode === 'signup' || authMode === 'update_password' ? '12 حرفًا على الأقل' : 'أدخل كلمة المرور'} required /></div></label>}
          {authMode === 'login' && <button type="button" className="forgot-link" onClick={() => setAuthMode('reset')}>نسيت كلمة المرور؟</button>}
          {authMessage && <div className={`auth-message ${/تم|توصلك|يرجى|افتح/i.test(authMessage) ? 'success-message' : ''}`}>{authMessage}</div>}
          <button className="button button-primary auth-submit" disabled={authBusy}>{authBusy ? <span className="button-spinner" /> : null}{authMode === 'signup' ? 'إنشاء الحساب' : authMode === 'reset' ? 'إرسال رابط الاستعادة' : authMode === 'update_password' ? 'حفظ كلمة المرور' : 'تسجيل الدخول'} <ArrowLeft size={17} /></button>
        </form>
        <div className="auth-mode-switch">{authMode === 'signup' ? <>عندك حساب بالفعل؟ <button onClick={() => setAuthMode('login')}>سجّل دخولك</button></> : authMode === 'reset' || authMode === 'update_password' ? <button onClick={() => setAuthMode('login')}>العودة لتسجيل الدخول</button> : <>لسه معندكش حساب؟ <button onClick={() => setAuthMode('signup')}>أنشئ حساب جديد</button></>}</div>
        <button className="demo-button" onClick={onDemo}><Eye size={16} /> استكشف النسخة التجريبية <ArrowLeft size={15} /></button>
        <div className={`auth-security ${!isSupabaseConfigured ? 'config-warning' : ''}`}><ShieldCheck size={15} /><span>{isSupabaseConfigured ? 'بيانات الحساب تُدار عبر Supabase Auth.' : 'الدخول الحقيقي يحتاج ربط Supabase أولًا؛ تقدر تستكشف الواجهة من الوضع التجريبي.'}</span></div>
      </div><div className="auth-legal">بالاستمرار، أنت توافق على شروط الاستخدام وسياسة الخصوصية عند نشر الخدمة.</div></section>
    </div>
    <section className="public-site-info" aria-label="عن SportMatch">
      <div><span className="page-eyebrow">منصة واحدة على كل أجهزتك</span><h2>استخدم SportMatch من الويب أو Android</h2><p>SportMatch منصة رياضية للاعبين والمدربين. اكتشف المدربين والأكاديميات، تابع التدريبات والتقدم، وسجّل الدخول بنفس الحساب من الموقع أو تطبيق Android لتبقى بيانات حسابك محفوظة في مساحة Supabase نفسها.</p></div>
      <a className="button button-outline" href="/download/SportMatch.apk" download><Download size={16} /> تحميل تطبيق Android</a>
    </section>
    <footer className="public-site-footer"><span>SportMatch</span><span>نسخة الويب تعمل على الهاتف والكمبيوتر. تطبيق Android متاح للتنزيل.</span></footer>
  </div>;
}
function GoogleMark() { return <span className="google-mark" aria-hidden="true">G</span>; }

function OnboardingScreen({ onboarding, updateOnboarding, coachOptions, onSubmit, busy, error, demo, lockedRole = false }) {
  const isPlayer = onboarding.role === 'player';
  return <div className="onboarding-page" dir="rtl">
    <header className="onboarding-header"><div className="brand-lockup"><div className="brand-mark"><Activity size={22} /></div><div><b>SportMatch</b><span>خلينا نجهز ملفك الرياضي</span></div></div><span className="step-indicator"><i className="step-current" /> <i /> <i /> خطوة 1 من 3</span></header>
    <main className="onboarding-wrap"><div className="onboarding-heading"><span className="eyebrow"><Sparkles size={14} /> بداية جديدة</span><h1>خلينا نتعرف عليك</h1><p>هنخصص تجربتك حسب دورك ورياضتك وأهدافك. تقدر تعدّل بياناتك في أي وقت.</p></div>
      {demo && <div className="inline-alert"><InfoIcon /><span>النموذج التجريبي يسمح باستكشاف الخطوات؛ الحفظ هنا محلي داخل الواجهة فقط.</span></div>}
      {error && <div className="inline-alert error-alert"><InfoIcon /><span>{error}</span></div>}
      <form className="onboarding-card" onSubmit={onSubmit}>
        <div className="form-section"><div className="section-number">01</div><div className="form-section-content"><h3>حسابك هيكون إيه؟</h3><p>{lockedRole ? 'نوع الحساب لا يتغير من هذه الشاشة. يمكنك تعديل البيانات الرياضية أدناه.' : 'اختار النوع المناسب لطريقة استخدامك للمنصة.'}</p><div className="role-picker">
          <button type="button" className={`role-option ${onboarding.role === 'player' ? 'chosen' : ''}`} disabled={lockedRole} onClick={() => updateOnboarding('role', 'player')}><span className="role-icon player-role-icon"><Activity size={22} /></span><span><b>لاعب</b><small>أتابع تدريبي وأهدافي</small></span><span className="radio-mark" /></button>
          <button type="button" className={`role-option ${onboarding.role === 'coach' ? 'chosen' : ''}`} disabled={lockedRole} onClick={() => updateOnboarding('role', 'coach')}><span className="role-icon coach-role-icon"><GraduationCap size={22} /></span><span><b>مدرب / كابتن</b><small>أدير اللاعبين والتقييمات</small></span><span className="radio-mark" /></button>
        </div></div></div>
        <div className="form-section"><div className="section-number">02</div><div className="form-section-content"><h3>بياناتك الرياضية</h3><p>اختار رياضتك ومستواك الحالي والهدف اللي بتسعى له.</p>
          <div className="form-grid-two"><label>الاسم الذي سيظهر في الملف<input maxLength={100} autoComplete="name" value={onboarding.full_name} onChange={(e) => updateOnboarding('full_name', e.target.value)} placeholder="الاسم بالكامل" required /></label><label>المحافظة / المنطقة<div className="input-with-icon field-location"><MapPin size={16} /><input maxLength={120} value={onboarding.location} onChange={(e) => updateOnboarding('location', e.target.value)} placeholder="مثال: الفيوم" /></div></label></div>
          <label>الرياضة الأساسية<select value={onboarding.primary_sport} onChange={(e) => { updateOnboarding('primary_sport', e.target.value); if (onboarding.role === 'coach') updateOnboarding('specialties_text', e.target.value); }}>{SPORTS.map((sport) => <option key={sport.name}>{sport.name}</option>)}</select></label>
          <div className="form-grid-two"><label>{isPlayer ? 'مستواك الحالي' : 'مستوى اللاعبين اللي بتدربهم غالبًا'}<select value={onboarding.current_level} onChange={(e) => updateOnboarding('current_level', e.target.value)}>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select></label><label>{isPlayer ? 'المستوى اللي عايز توصله' : 'نوع التدريب الأساسي'}{isPlayer ? <select value={onboarding.target_level} onChange={(e) => updateOnboarding('target_level', e.target.value)}>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select> : <select value={onboarding.training_type} onChange={(e) => updateOnboarding('training_type', e.target.value)}><option>فردي</option><option>جماعي</option><option>فردي وجماعي</option><option>عن بُعد</option></select>}</label></div>
          {isPlayer ? <><label>هدفك الرياضي<textarea rows="2" maxLength={1000} value={onboarding.goal_description} onChange={(e) => updateOnboarding('goal_description', e.target.value)} placeholder="مثال: تطوير مهاراتي والاستعداد لتجارب أكاديمية" /></label><label>هدف قصير المدى<textarea rows="2" maxLength={500} value={onboarding.short_term_goal} onChange={(e) => updateOnboarding('short_term_goal', e.target.value)} placeholder="إيه أهم حاجة عايز تحسنها في الشهر الجاي؟" /></label></> : <>
            <div className="form-grid-two"><label>سنوات الخبرة<input type="number" min="0" max="70" value={onboarding.experience_years} onChange={(e) => updateOnboarding('experience_years', e.target.value)} /></label><label>السعر التقريبي للجلسة (جنيه)<input type="number" min="0" value={onboarding.price} onChange={(e) => updateOnboarding('price', e.target.value)} placeholder="اختياري" /></label></div>
            <label>التخصصات الرياضية (افصل بينها بفاصلة)<input maxLength={800} value={onboarding.specialties_text} onChange={(e) => updateOnboarding('specialties_text', e.target.value)} placeholder="كرة القدم، إعداد بدني" /></label>
            <label>المؤهلات والشهادات المعلنة<textarea rows="2" maxLength={1500} value={onboarding.qualifications} onChange={(e) => updateOnboarding('qualifications', e.target.value)} placeholder="اكتب اسم المؤهلات التي يمكنك إثباتها" /></label>
            <label>الشهادات / الدورات الإضافية<textarea rows="2" maxLength={1500} value={onboarding.certificates} onChange={(e) => updateOnboarding('certificates', e.target.value)} placeholder="أسماء الشهادات أو الدورات وسنوات الحصول عليها" /></label>
            <div className="form-grid-two"><label>مكان التدريب / جهة العمل<input maxLength={120} value={onboarding.workplace} onChange={(e) => updateOnboarding('workplace', e.target.value)} placeholder="اسم المكان أو النادي" /></label><label>الأكاديمية التابع لها (إن وجدت)<input maxLength={120} value={onboarding.academy_name} onChange={(e) => updateOnboarding('academy_name', e.target.value)} placeholder="اسم الأكاديمية" /></label></div>
            <label>نبذة عنك وعن برامجك التدريبية<textarea rows="3" maxLength={2000} value={onboarding.bio} onChange={(e) => updateOnboarding('bio', e.target.value)} placeholder="خبرتك، الفئات التي تعمل معها، وطريقة تدريبك" /></label>
          </>}
        </div></div>
        {isPlayer && <div className="form-section"><div className="section-number">03</div><div className="form-section-content"><h3>هل بتتمرّن مع مدرب حاليًا؟</h3><p>لو مدربك على المنصة، نقدر نربط ملفك به بعد اختيارك.</p><div className="binary-picker"><button type="button" className={onboarding.has_current_coach ? 'chosen' : ''} onClick={() => updateOnboarding('has_current_coach', true)}>أيوه، عندي مدرب</button><button type="button" className={!onboarding.has_current_coach ? 'chosen' : ''} onClick={() => { updateOnboarding('has_current_coach', false); updateOnboarding('coach_user_id', ''); }}>لسه بدور على مدرب</button></div>
          {onboarding.has_current_coach && <><div className="radio-row"><label><input type="radio" checked={onboarding.coach_type === 'on_platform'} onChange={() => updateOnboarding('coach_type', 'on_platform')} /> مدربي موجود على SportMatch</label><label><input type="radio" checked={onboarding.coach_type === 'not_on_platform'} onChange={() => updateOnboarding('coach_type', 'not_on_platform')} /> مدربي مش موجود على المنصة</label></div>{onboarding.coach_type === 'on_platform' && <label>اختار المدرب<select value={onboarding.coach_user_id} onChange={(e) => updateOnboarding('coach_user_id', e.target.value)}><option value="">اختار من المدربين المسجلين</option>{coachOptions.map((coach) => <option key={coach.id} value={coach.id}>{coach.full_name} — {coach.primary_sport || 'رياضة'}{coach.location ? ` · ${coach.location}` : ''}</option>)}</select><small className="field-note">اختيار مدرب من القائمة يربط الملف به في النسخة الأولية. قبل الإطلاق العام، نحتاج طلب ربط يتطلب موافقة الطرفين قبل فتح السجلات الخاصة.</small></label>}</>}</div></div>}
        <div className="form-section"><div className="section-number"><ShieldCheck size={19} /></div><div className="form-section-content"><h3>الخصوصية</h3><p>تقدر تعدّل الإعدادات لاحقًا. معلومات الجلسات والتقييمات ليست جزءًا من الملف العام.</p><label className="check-row"><input type="checkbox" checked={onboarding.is_public} onChange={(e) => updateOnboarding('is_public', e.target.checked)} /><span><b>السماح بظهور الملف الأساسي في البحث</b><small>يشمل الاسم والرياضة والمستوى والموقع فقط، حسب إعدادات المنصة.</small></span></label></div></div>
        <div className="onboarding-footer"><span><ShieldCheck size={15} /> تقدر تعدّل بياناتك بعد إنشاء الملف</span><button className="button button-primary" disabled={busy}>{busy ? 'جارٍ حفظ الملف...' : 'حفظ الملف وفتح لوحة التحكم'} <ArrowLeft size={17} /></button></div>
      </form>
    </main>
  </div>;
}

function PageHeading({ eyebrow = 'مساحتك الرياضية', title, description, action, actionText = 'إجراء جديد', icon: Icon = Plus }) {
  return <div className="page-heading"><div><span className="page-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <button className="button button-primary" onClick={action}><Icon size={17} /> {actionText}</button>}</div>;
}

function Dashboard({ profile, playerDetails, coachDetails, logs, assessments, coachPlayers, onNavigate, onAddLog, onAddAssessment }) {
  const isPlayer = profile.role === 'player';
  const recentAssessments = [...assessments].slice(0, 3);
  const currentScore = recentAssessments.length
    ? Math.round(recentAssessments.reduce((sum, item) => sum + (Number(item.score) / Math.max(1, Number(item.scale_max) || 10)) * 100, 0) / recentAssessments.length)
    : null;
  const chartRows = [...assessments].slice(0, 8).reverse();
  const chartPoints = chartRows.map((item, index) => ({
    x: chartRows.length === 1 ? 280 : (index / (chartRows.length - 1)) * 560,
    y: 160 - Math.max(0, Math.min(1, Number(item.score) / Math.max(1, Number(item.scale_max) || 10))) * 140,
    label: formatDate(item.assessed_at),
  }));
  const chartPath = chartPoints.length > 1
    ? chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
    : '';
  const date = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return <div className="page-content dashboard-page">
    <div className="welcome-strip"><div className="welcome-background-shape" /><div className="welcome-copy"><span className="welcome-date"><span className="live-dot" /> {date}</span><h1>أهلًا {profile.full_name?.split(' ')[0] || 'بيك'}، <em>{isPlayer ? 'جاهز لخطوتك الجاية؟' : 'جاهز تطوّر لاعبينك؟'}</em></h1><p>{isPlayer ? 'كل تمرينة بتضيف حاجة لرحلتك. تابع أهدافك وخلي تقدمك واضح.' : 'نظّم تدريباتك، سجّل ملاحظاتك، وتابع تطور كل لاعب خطوة بخطوة.'}</p><div className="welcome-actions"><button className="button button-light" onClick={() => onNavigate(isPlayer ? 'progress' : 'players')}>{isPlayer ? 'شوف تقدمي' : 'إدارة اللاعبين'} <ArrowLeft size={16} /></button><button className="button button-glass" onClick={() => onNavigate('coaches')}>استكشف المنصة <ArrowUpLeft size={16} /></button></div></div><div className="welcome-art"><div className="art-ring ring-a" /><div className="art-ring ring-b" /><div className="art-ball">{profile.primary_sport === 'السباحة' ? '🏊' : profile.primary_sport === 'الملاكمة' ? '🥊' : profile.primary_sport === 'كرة السلة' ? '🏀' : '⚽'}</div><div className="art-chip chip-top"><Target size={15} /><span>هدفك قدامك</span></div><div className="art-chip chip-bottom"><TrendingUp size={15} /><span>تقدّم مستمر</span></div></div></div>
    <div className="quick-stats">
      <StatCard icon={isPlayer ? Target : Users} label={isPlayer ? 'هدفي الحالي' : 'اللاعبون المرتبطون'} value={isPlayer ? (playerDetails?.short_term_goal ? 'نشط' : 'حدّد هدفك') : String(coachPlayers.length)} note={isPlayer ? (playerDetails?.short_term_goal || 'أضف هدفًا قصير المدى') : 'لاعبون مرتبطون بملفك'} tone="blue" />
      <StatCard icon={CalendarDays} label="جلسات مسجلة" value={String(logs.length)} note="الجلسات المحفوظة في حسابك" tone="green" />
      <StatCard icon={BarChart3} label="تقييمات المهارات" value={String(assessments.length)} note="التقييمات المحفوظة في حسابك" tone="purple" />
      <StatCard icon={ShieldCheck} label="حالة الملف" value={isPlayer ? (profile.is_public ? 'ظاهر للبحث' : 'خاص') : (coachDetails?.qualifications ? 'قيد المراجعة' : 'أكمل بياناتك')} note="إظهار التحقق بوضوح" tone="orange" />
    </div>
    <div className="dashboard-grid">
      <section className="panel progress-panel"><div className="panel-heading"><div><span className="panel-kicker">رحلتك بالأرقام</span><h2>{isPlayer ? 'تطورك الرياضي' : 'متابعة الأداء'}</h2></div><button className="text-link" onClick={() => onNavigate('progress')}>عرض التفاصيل <ArrowLeft size={15} /></button></div>
        <div className="progress-summary"><div><strong>{currentScore === null ? '—' : `${currentScore}%`}</strong><span>متوسط آخر التقييمات الفعلية</span></div><div className="summary-badge"><TrendingUp size={15} /> {assessments.length ? 'بيانات من تقييماتك المسجلة' : 'بانتظار أول تقييم'}</div></div>
        {chartPoints.length ? <div className="chart-area"><div className="chart-y-labels"><span>10</span><span>7.5</span><span>5</span><span>2.5</span><span>0</span></div><div className="line-chart"><div className="chart-grid-lines"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 560 180" preserveAspectRatio="none" role="img" aria-label="رسم مبني على التقييمات المسجلة"><path d={chartPath} stroke="#1fbd8a" strokeWidth="3.5" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />{chartPoints.map((point, index) => <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r="4" fill="#fff" stroke="#1fbd8a" strokeWidth="3" vectorEffect="non-scaling-stroke" />)}</svg><div className="chart-x-labels"><span>{chartPoints[0].label}</span><span>{chartPoints[Math.floor((chartPoints.length - 1) / 2)].label}</span><span>{chartPoints[chartPoints.length - 1].label}</span></div></div></div> : <EmptyState text="لسه مفيش تقييمات محفوظة لحسابك. الرسم هيظهر بعد تسجيل أول تقييم حقيقي." />}
        {chartPoints.length > 0 && <p className="chart-footnote"><InfoIcon /> كل نقطة في الرسم مأخوذة من تقييم محفوظ في حسابك.</p>}
      </section>
      <section className="panel goal-panel"><div className="panel-heading"><div><span className="panel-kicker">التركيز الحالي</span><h2>هدفي القادم</h2></div><div className="goal-icon"><Target size={20} /></div></div><div className="goal-ring-wrap"><div className="goal-ring"><div><strong>{playerDetails?.short_term_goal ? 'نشط' : '—'}</strong><span>حالة الهدف</span></div></div></div><h3>{isPlayer ? (playerDetails?.short_term_goal || 'حدّد هدفك القادم') : 'خلّي هدف كل لاعب واضح'}</h3><p>{isPlayer ? (playerDetails?.goal_description || 'اكتب هدفًا واضحًا عشان تتابع تقدمك في كل مرحلة.') : 'حدّد هدفًا تدريبيًا لكل لاعب وتابع التقييمات المرتبطة به.'}</p><button className="button button-outline full-button" onClick={() => onNavigate(isPlayer ? 'profile' : 'players')}>{isPlayer ? 'تعديل أهدافي' : 'عرض اللاعبين'} <ArrowLeft size={16} /></button></section>
    </div>
    <div className="dashboard-bottom-grid"><section className="panel recent-panel"><div className="panel-heading"><div><span className="panel-kicker">آخر التحديثات</span><h2>سجل التدريبات</h2></div><button className="text-link" onClick={() => onNavigate('training')}>كل الجلسات <ArrowLeft size={15} /></button></div>{logs.length ? <div className="timeline-list">{logs.slice(0, 3).map((log, index) => <div className="timeline-item" key={log.id || `${log.session_date}-${index}`}><div className={`timeline-dot dot-${index % 3}`}><Dumbbell size={15} /></div><div className="timeline-info"><strong>{log.focus || log.sport || 'جلسة تدريب'}</strong><span>{log.sport} {log.notes ? `· ${log.notes}` : ''}</span><small><CalendarDays size={13} /> {formatDate(log.session_date)}</small></div><span className="timeline-tag">{index === 0 ? 'الأحدث' : 'مسجلة'}</span></div>)}</div> : <EmptyState text="لسه مفيش جلسات تدريب محفوظة لحسابك." action="أضف أول جلسة" onClick={onAddLog} />}</section>
    <section className="panel shortcuts-panel"><div className="panel-heading"><div><span className="panel-kicker">ابدأ بسرعة</span><h2>اختصاراتك</h2></div><Sparkles size={19} className="soft-icon" /></div><button className="shortcut-row" onClick={() => onNavigate('coaches')}><span className="shortcut-icon shortcut-blue"><Search size={18} /></span><span><b>اكتشف مدرب أو أكاديمية</b><small>قارن الخيارات المتاحة</small></span><ArrowLeft size={16} /></button><button className="shortcut-row" onClick={onAddLog}><span className="shortcut-icon shortcut-green"><ClipboardList size={18} /></span><span><b>سجّل جلسة تدريب</b><small>احتفظ بتاريخ كل تمرينة</small></span><ArrowLeft size={16} /></button><button className="shortcut-row" onClick={onAddAssessment}><span className="shortcut-icon shortcut-purple"><BarChart3 size={18} /></span><span><b>أضف تقييم مهارة</b><small>قارن التقييمات بمرور الوقت</small></span><ArrowLeft size={16} /></button></section></div>
  </div>;
}
function StatCard({ icon: Icon, label, value, note, tone }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20} /></div><div className="stat-text"><span>{label}</span><strong>{value}</strong><small>{note}</small></div><div className="stat-arrow"><ArrowUpLeft size={16} /></div></div>; }
function EmptyState({ text, action, onClick }) { return <div className="empty-state"><div className="empty-illustration"><ClipboardList size={24} /></div><p>{text}</p>{action && <button className="button button-outline" onClick={onClick}>{action} <Plus size={16} /></button>}</div>; }

function DiscoverPage({ query, setQuery, sportFilter, setSportFilter, onNavigate }) {
  const filtered = SPORTS.filter((sport) => (sportFilter === 'الكل' || sport.name === sportFilter) && (!query || sport.name.includes(query)));
  return <div className="page-content"><PageHeading eyebrow="اكتشف عالم الرياضة" title="رياضتك الجاية أقرب مما تتخيل" description="اختار الرياضة اللي بتحبها، واكتشف فرص التدريب المناسبة ليك." action={() => onNavigate('coaches')} actionText="ابحث عن مدرب" icon={Search} />
    <div className="discover-hero"><div><span className="eyebrow"><Sparkles size={14} /> ابدأ من هنا</span><h2>كل بداية صغيرة،<br /><em>ممكن تعمل فرق كبير.</em></h2><p>سواء أول مرة تتمرن أو بتستعد لهدف جديد، ابدأ باختيار الرياضة وشوف الخطوة اللي بعدها.</p><button className="button button-light" onClick={() => onNavigate('coaches')}>اكتشف المدربين <ArrowLeft size={16} /></button></div><div className="discover-hero-icons"><span>⚽</span><span>🏊</span><span>🥊</span><span>🏀</span><span>🎾</span></div></div>
    <div className="section-title-row"><div><h2>اختار رياضتك</h2><p>تقدر تغيّر اختيارك في أي وقت.</p></div><label className="inline-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن رياضة" /></label></div>
    <div className="sports-grid">{filtered.map((sport) => <button className="sport-card" key={sport.name} onClick={() => { setSportFilter(sport.name); onNavigate('coaches'); }}><div className={`sport-art ${sport.color}`}><span>{sport.icon}</span><i /><i /><i /></div><div className="sport-card-info"><strong>{sport.name}</strong><span>اكتشف المدربين والأماكن <ArrowLeft size={14} /></span></div><ArrowUpLeft className="sport-card-arrow" size={17} /></button>)}</div>
    <div className="tip-banner"><div className="tip-icon"><LightbulbIcon /></div><div><strong>لسه مش عارف تبدأ بإيه؟</strong><p>ابدأ بتحديد هدفك: صحة ولياقة، تعلم مهارة، أو الاستعداد لمنافسة. المدرب المناسب يقدر يساعدك تختار خطة واقعية.</p></div></div>
  </div>;
}
function LightbulbIcon() { return <Sparkles size={20} />; }

function CoachesPage({ isDemo, query, setQuery, sportFilter, setSportFilter, locationFilter, setLocationFilter, onToast }) {
  const [viewMode, setViewMode] = useState('all');
  const [selected, setSelected] = useState(null);
  const [remoteCoaches, setRemoteCoaches] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (isDemo) {
      setRemoteCoaches([]);
      return () => { cancelled = true; };
    }
    if (!supabase) {
      setRemoteCoaches([]);
      return () => { cancelled = true; };
    }
    supabase.from('profiles').select('id, full_name, primary_sport, current_level, location, is_public').eq('role', 'coach').eq('is_public', true).order('full_name').limit(60)
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setRemoteCoaches([]);
          return;
        }
        const rows = data || [];
        const ids = rows.map((row) => row.id);
        let details = [];
        if (ids.length) {
          const result = await supabase.from('coach_profiles').select('user_id, specialties, experience_years, workplace, academy_name, price, training_type, bio').in('user_id', ids);
          details = result.data || [];
        }
        if (!cancelled) setRemoteCoaches(rows.map((row) => ({ ...row, ...(details.find((d) => d.user_id === row.id) || {}), rating: '—', reviews: 0, specialty: (details.find((d) => d.user_id === row.id)?.specialties || [row.primary_sport]).join('، ') })));
      })
      .catch(() => { if (!cancelled) setRemoteCoaches([]); });
    return () => { cancelled = true; };
  }, [isDemo]);
  const source = isDemo ? demoCoaches : (remoteCoaches || []);
  const filtered = source.filter((coach) => {
    const name = `${coach.full_name || ''} ${coach.specialty || ''} ${coach.academy_name || ''}`;
    return (!query || name.includes(query)) && (sportFilter === 'الكل' || coach.primary_sport === sportFilter || (coach.specialties || []).includes(sportFilter)) && (locationFilter === 'الكل' || (coach.location || '').includes(locationFilter));
  });
  return <div className="page-content"><PageHeading eyebrow="دليل التدريب" title="اختار المدرب المناسب ليك" description="قارن بين المدربين والأكاديميات حسب الرياضة والموقع والخدمات والأسعار." action={() => onToast('إضافة ملف مدرب جديد تتم بعد التسجيل كمدرب من شاشة الحساب.')} actionText="أنا مدرب" icon={GraduationCap} />
    <div className="filter-panel"><label className="inline-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="اسم مدرب، أكاديمية، أو تخصص" /></label><label className="filter-select"><Dumbbell size={16} /><select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)}><option value="الكل">كل الرياضات</option>{SPORTS.map((sport) => <option key={sport.name}>{sport.name}</option>)}</select><ChevronDown size={14} /></label><label className="filter-select"><MapPin size={16} /><select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}><option value="الكل">كل المناطق</option><option>الفيوم</option><option>القاهرة</option><option>الجيزة</option><option>الإسكندرية</option></select><ChevronDown size={14} /></label><div className="view-toggle"><button className={viewMode === 'all' ? 'selected' : ''} onClick={() => setViewMode('all')} aria-label="عرض البطاقات"><LayoutDashboard size={16} /></button><button disabled title="الخريطة قيد التطوير حتى تتوفر مواقع دقيقة ومتحقق منها" aria-label="الخريطة قيد التطوير"><MapPin size={16} /></button></div></div>
    <div className="results-caption"><span>{isDemo ? 'بيانات تجريبية للمعاينة' : remoteCoaches === null ? 'جارٍ تحميل المدربين...' : `عرض ${filtered.length} مدرب مسجل على المنصة`}</span><button className="sort-button" onClick={() => onToast('ترتيب النتائج حسب التقييم والسعر هيتفعّل عند اكتمال بيانات حقيقية.')}>الأقرب لاحتياجي <SlidersHorizontal size={15} /></button></div>
    {remoteCoaches === null && !isDemo ? <div className="panel"><EmptyState text="جارٍ تحميل ملفات المدربين المسجلين..." /></div> : filtered.length ? <div className={`coach-grid ${viewMode === 'map' ? 'map-placeholder-mode' : ''}`}>{filtered.map((coach, index) => <CoachCard key={coach.id} coach={coach} index={index} onSelect={() => setSelected(coach)} />)}</div> : <EmptyState text={isDemo ? 'مفيش نتائج مطابقة. جرّب تغيّر الفلاتر أو المنطقة.' : 'لسه مفيش مدربين مسجلين وموافقين على ظهور ملفاتهم. أول ما مدرب ينشئ ملفًا عامًا هيظهر هنا.'} />}
    {isDemo && <div className="demo-data-note"><InfoIcon /> دي أمثلة تجريبية للمعاينة فقط، وليست حسابات أو مدربين حقيقيين.</div>}
    {selected && <Modal title="ملف المدرب" onClose={() => setSelected(null)}><div className="coach-detail"><div className="coach-detail-head"><div className="coach-avatar big">{initials(selected.full_name)}</div><div><h3>{selected.full_name}</h3><p>{selected.primary_sport} · {selected.location || 'الموقع غير محدد'}</p><span className="coach-verification"><ShieldCheck size={14} /> لا توجد شارة تحقق مؤكدة في هذا العرض</span></div></div><div className="coach-detail-grid"><div><span>الأكاديمية / مكان التدريب</span><b>{selected.academy_name || selected.workplace || 'لم تتم الإضافة'}</b></div><div><span>الخبرة</span><b>{selected.years || selected.experience_years || 0} سنوات</b></div><div><span>نوع التدريب</span><b>{selected.training_type || 'يُحدّد من ملف المدرب'}</b></div><div><span>السعر التقريبي</span><b>{selected.price ? `${selected.price} جنيه` : 'غير معلن'}</b></div></div><p className="coach-detail-bio">{selected.specialty || selected.bio || 'لم يضف المدرب نبذة بعد.'}</p><button className="button button-primary full-button" onClick={() => { setSelected(null); onToast('التواصل والحجز سيتفعّلان بعد إضافة آلية موافقة وتواصل آمنة.'); }}>طلب تواصل <MessageCircle size={16} /></button></div></Modal>}
  </div>;
}
function CoachCard({ coach, index, onSelect }) {
  const emojis = ['⚽', '🏊', '🥊', '🏀'];
  return <article className="coach-card"><div className={`coach-card-cover cover-${index % 4}`}><span className="cover-sport-icon">{emojis[index % emojis.length]}</span><button className="favorite-button" onClick={onSelect} aria-label="تفاصيل المدرب"><ArrowUpLeft size={16} /></button><span className="coach-card-type">{coach.academy_name ? 'مدرب / أكاديمية' : 'مدرب مستقل'}</span></div><div className="coach-card-body"><div className="coach-card-title"><div className="coach-avatar">{initials(coach.full_name)}</div><div><h3>{coach.full_name}</h3><span>{coach.primary_sport}</span></div><span className="rating-chip"><Star size={13} fill="currentColor" /> {coach.rating || '—'}</span></div><p className="coach-specialty">{coach.specialty || 'ملف المدرب قيد الاستكمال'}</p><div className="coach-meta"><span><MapPin size={14} /> {coach.location || 'الموقع غير محدد'}</span><span><Building2 size={14} /> {coach.academy_name || coach.workplace || 'مستقل'}</span></div><div className="coach-card-footer"><div><small>سعر الجلسة من</small><strong>{coach.price ? `${coach.price} <small>جنيه</small>` : 'غير معلن'}</strong></div><button className="button button-outline" onClick={onSelect}>عرض الملف <ArrowLeft size={15} /></button></div></div></article>;
}

function EventsPage({ isDemo, onToast }) {
  return <div className="page-content"><PageHeading eyebrow="الفرص القادمة" title="البطولات والفعاليات" description="اكتشف فعاليات رياضية، وتابع مواعيد التسجيل وشروط المشاركة من الجهة المنظمة." />
    <div className="events-intro"><div className="events-intro-icon"><Trophy size={26} /></div><div><strong>فرصك الرياضية في مكان واحد</strong><p>هذا القسم جاهز للتوسع بعد الاتفاق مع منظمي البطولات والتحقق من المعلومات ومواعيد التسجيل.</p></div><span className="coming-soon-pill">قيد التطوير</span></div>
    {isDemo ? <div className="event-list">{demoEvents.map((event, index) => <article className="event-card" key={event.title}><div className={`event-art event-art-${index}`}>{event.sport === 'السباحة' ? '🏊' : event.sport === 'كرة السلة' ? '🏀' : '⚽'}</div><div className="event-info"><div className="event-kickers"><span>{event.type}</span><span className="sample-pill">نموذج توضيحي</span></div><h3>{event.title}</h3><div className="event-meta"><span><MapPin size={14} /> {event.place}</span><span><CalendarDays size={14} /> {formatDate(event.date)}</span><span><Dumbbell size={14} /> {event.sport}</span></div></div><button className="button button-outline" onClick={() => onToast('ده مثال توضيحي فقط. سيتم تفعيل التسجيل بعد الاتفاق مع الجهة المنظمة.')}>التفاصيل <ArrowLeft size={15} /></button></article>)}</div> : <EmptyState text="لا توجد بطولات أو فعاليات مؤكدة مضافة حتى الآن. ستظهر هنا بعد إدراجها والتحقق من بيانات الجهة المنظمة." />}
    <div className="notice-card"><ShieldCheck size={21} /><div><strong>المعلومات الرسمية أولًا</strong><p>لا يتم اعتبار أي بطولة مؤكدة أو فتح التسجيل فيها إلا بعد الحصول على بيانات موثوقة من الجهة المنظمة، وتوضيح شروط المشاركة ومواعيدها.</p></div></div>
  </div>;
}

function ProfilePage({ profile, playerDetails, coachDetails, logs, edit, setEdit, form, setForm, onSave, onEditMore, saving }) {
  return <div className="page-content"><PageHeading eyebrow="هويتك الرياضية" title="ملفي الشخصي" description="حدّث بياناتك الأساسية، وراجع معلومات ملفك الرياضي." action={() => setEdit(!edit)} actionText={edit ? 'إلغاء التعديل' : 'تعديل البيانات'} icon={UserRound} />
    <section className="profile-hero panel"><div className="profile-cover-art"><div className="cover-line line-one" /><div className="cover-line line-two" /><div className="cover-watermark">SPORTMATCH</div></div><div className="profile-main-info"><div className="profile-avatar-large">{initials(profile.full_name)}</div><div className="profile-identity"><h2>{profile.full_name}</h2><p><span className="role-badge">{profile.role === 'coach' ? 'مدرب / كابتن' : 'لاعب'}</span><span>{profile.primary_sport}</span><span><MapPin size={14} /> {profile.location || 'لم يحدد الموقع'}</span></p></div><div className={`profile-privacy-tag ${profile.is_public ? 'public' : 'private'}`}>{profile.is_public ? <Eye size={14} /> : <Lock size={14} />}{profile.is_public ? 'ظاهر في البحث' : 'ملف خاص'}</div></div>
      {edit ? <form className="profile-edit-form" onSubmit={onSave}><div className="form-grid-two"><label>الاسم<input maxLength={100} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label><label>الموقع<input maxLength={120} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label><label>الرياضة الأساسية<select value={form.primary_sport} onChange={(e) => setForm({ ...form, primary_sport: e.target.value })}>{SPORTS.map((s) => <option key={s.name}>{s.name}</option>)}</select></label><label>المستوى الحالي<select value={form.current_level} onChange={(e) => setForm({ ...form, current_level: e.target.value })}>{LEVELS.map((s) => <option key={s}>{s}</option>)}</select></label><label>المستوى المستهدف<select value={form.target_level} onChange={(e) => setForm({ ...form, target_level: e.target.value })}>{LEVELS.map((s) => <option key={s}>{s}</option>)}</select></label></div><label className="check-row"><input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} /><span><b>عرض الملف الأساسي في البحث</b><small>لا يشمل هذا سجل التدريبات أو التقييمات.</small></span></label><div className="form-footer"><button type="button" className="button button-ghost" onClick={() => setEdit(false)}>إلغاء</button><button className="button button-primary" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'} <Check size={16} /></button></div></form> : <div className="profile-detail-sections">
        {profile.role === 'player' ? <><div className="detail-section-head"><h3><Target size={18} /> أهدافي الرياضية</h3><button className="text-link" onClick={onEditMore}>تعديل الأهداف <ArrowLeft size={15} /></button></div><div className="profile-detail-grid"><div><span>المستوى الحالي</span><strong>{profile.current_level}</strong></div><div><span>المستوى المستهدف</span><strong>{profile.target_level}</strong></div><div><span>الهدف قصير المدى</span><strong>{playerDetails?.short_term_goal || 'لم يحدد بعد'}</strong></div></div><div className="profile-long-note"><span>الهدف الرياضي</span><p>{playerDetails?.goal_description || 'أضف وصفًا لهدفك الرياضي من خلال إعداد الملف.'}</p></div><div className="profile-detail-grid"><div><span>المدرب الحالي</span><strong>{playerDetails?.has_current_coach ? (playerDetails.coach_type === 'on_platform' ? 'تم تحديد مدرب على المنصة' : 'مدرب خارج المنصة') : 'لا يوجد مدرب حاليًا'}</strong></div><div><span>عدد الجلسات المسجلة</span><strong>{logs.length} جلسة</strong></div></div></> : <><div className="detail-section-head"><h3><GraduationCap size={18} /> الملف المهني للمدرب</h3><button className="text-link" onClick={onEditMore}>تعديل تفاصيل التدريب <ArrowLeft size={15} /></button></div><div className="profile-detail-grid"><div><span>التخصصات</span><strong>{coachDetails?.specialties?.join('، ') || profile.primary_sport}</strong></div><div><span>سنوات الخبرة</span><strong>{coachDetails?.experience_years ?? 'لم تُضف'}</strong></div><div><span>مكان التدريب</span><strong>{coachDetails?.workplace || 'لم يُضف'}</strong></div><div><span>الأكاديمية</span><strong>{coachDetails?.academy_name || 'غير محددة'}</strong></div><div><span>نوع التدريب</span><strong>{coachDetails?.training_type || 'لم يُحدد'}</strong></div><div><span>سعر الجلسة</span><strong>{coachDetails?.price ? `${coachDetails.price} جنيه` : 'غير معلن'}</strong></div></div><div className="profile-long-note"><span>نبذة مهنية</span><p>{coachDetails?.bio || 'أضف نبذة عن خبرتك والخدمات التي تقدمها.'}</p></div><div className="verification-grid"><VerificationBadge label="الهوية" value={coachDetails?.verification_identity} /><VerificationBadge label="المؤهلات" value={coachDetails?.verification_certificate} /><VerificationBadge label="بيانات المنشأة" value={coachDetails?.verification_organization} /></div></>}
      </div>}
    </section>
    <div className="profile-lower-grid"><section className="panel simple-info-panel"><div className="panel-heading"><h2>معلومات الملف</h2><ShieldCheck size={19} className="soft-icon" /></div><div className="simple-info-row"><span>نوع الحساب</span><b>{profile.role === 'coach' ? 'مدرب' : 'لاعب'}</b></div><div className="simple-info-row"><span>الرياضة الأساسية</span><b>{profile.primary_sport}</b></div><div className="simple-info-row"><span>مكان الإقامة / التدريب</span><b>{profile.location || 'غير محدد'}</b></div><div className="simple-info-row"><span>حالة الظهور</span><b>{profile.is_public ? 'عام في دليل البحث' : 'خاص'}</b></div></section><section className="panel profile-tip"><div className="tip-icon"><ShieldCheck size={22} /></div><h3>ملفك الرياضي تحت سيطرتك</h3><p>سجل التدريبات والتقييمات منفصل عن الملف العام. شارك المعلومات الضرورية فقط مع المدرب أو الأكاديمية المناسبة.</p><button className="text-link" onClick={onEditMore}>مراجعة إعدادات الملف <ArrowLeft size={15} /></button></section></div>
  </div>;
}
function VerificationBadge({ label, value }) { return <div className={`verification-badge ${value ? 'verified' : ''}`}><span className="verification-icon"><ShieldCheck size={17} /></span><span><b>{label}</b><small>{value ? 'تم التحقق' : 'لم يتم التحقق بعد'}</small></span></div>; }

function ProgressPage({ profile, assessments, logs, players, onAdd }) {
  const visibleAssessments = assessments.slice(0, 20);
  return <div className="page-content"><PageHeading eyebrow="قياس التطور" title={profile.role === 'coach' ? 'التقييمات ومتابعة اللاعبين' : 'تطورك الرياضي'} description={profile.role === 'coach' ? 'سجّل تقييمات بمعايير واضحة واحتفظ بتاريخ تطور كل لاعب.' : 'راجع التقييمات السابقة، وشوف المجالات التي تحتاج إلى تركيز في تدريباتك.'} action={onAdd} actionText={profile.role === 'coach' ? 'إضافة تقييم للاعب' : 'إضافة تقييم شخصي'} icon={Plus} />
    <div className="progress-kpi-row"><div className="progress-kpi panel"><span>إجمالي التقييمات</span><strong>{assessments.length}</strong><small>كل تقييم يحتفظ بتاريخه</small><div className="kpi-icon blue"><BarChart3 size={19} /></div></div><div className="progress-kpi panel"><span>جلسات التدريب</span><strong>{logs.length}</strong><small>المسجلة في ملفك</small><div className="kpi-icon green"><ClipboardList size={19} /></div></div><div className="progress-kpi panel"><span>الرياضة الأساسية</span><strong className="kpi-sport">{profile.primary_sport}</strong><small>يمكن تغييرها من ملفك</small><div className="kpi-icon purple"><Dumbbell size={19} /></div></div></div>
    <section className="panel assessment-panel"><div className="panel-heading"><div><span className="panel-kicker">سجل لا يمحو الماضي</span><h2>التقييمات المسجلة</h2></div><span className="history-badge"><Clock3 size={14} /> تاريخ التقييم محفوظ</span></div>
      {visibleAssessments.length ? <div className="assessment-table-wrap"><table className="assessment-table"><thead><tr><th>المهارة</th><th>الرياضة</th><th>النتيجة</th><th>ملاحظات</th><th>تاريخ التقييم</th></tr></thead><tbody>{visibleAssessments.map((item, index) => <tr key={item.id || `${item.skill_name}-${index}`}><td><b>{item.skill_name}</b><small>{item.coach_id ? 'مسجّل بواسطة مدرب' : 'سجل تقييم'}</small></td><td>{item.sport}</td><td><div className="score-cell"><strong>{item.score}<small>/{item.scale_max || 10}</small></strong><span className="score-track"><i style={{ width: `${Math.max(0, Math.min(100, Number(item.score) / Math.max(1, Number(item.scale_max) || 10) * 100))}%` }} /></span></div></td><td className="note-cell">{item.notes || '—'}</td><td>{formatDate(item.assessed_at)}</td></tr>)}</tbody></table></div> : <EmptyState text="لسه مفيش تقييمات. التقييم الأول هيكون نقطة بداية للمقارنة مع التقييمات القادمة." action="إضافة تقييم" onClick={onAdd} />}
    </section>
    <section className="panel progress-guidance"><div className="guidance-icon"><Target size={22} /></div><div><h3>إزاي نخلي التقييم مفيد؟</h3><p>استخدموا معيارًا ثابتًا لكل مهارة، وسجّلوا التاريخ وملاحظات قصيرة. اختلاف طريقة التقييم من مرة للتانية ممكن يضلل المقارنة؛ عشان كده المنصة تحتفظ بكل تسجيل بدل استبداله.</p></div></section>
  </div>;
}

function TrainingPage({ profile, logs, onAdd }) {
  return <div className="page-content"><PageHeading eyebrow="التاريخ التدريبي" title={profile.role === 'coach' ? 'سجل الجلسات التدريبية' : 'سجل تدريباتي'} description="كل جلسة بتضيفها بتفضل جزء من تاريخك الرياضي، مع التاريخ والملاحظات والخطوة القادمة." action={onAdd} actionText="إضافة جلسة" icon={Plus} />
    <div className="training-summary-strip"><div><span className="strip-icon"><CalendarDays size={18} /></span><div><small>عدد الجلسات المعروضة</small><strong>{logs.length}</strong></div></div><div><span className="strip-icon"><Dumbbell size={18} /></span><div><small>الرياضة الأساسية</small><strong>{profile.primary_sport}</strong></div></div><div><span className="strip-icon"><Target size={18} /></span><div><small>هدف السجل</small><strong>تتبع مستمر</strong></div></div></div>
    {logs.length ? <div className="training-records">{logs.map((log, index) => <article className="training-record panel" key={log.id || `${log.session_date}-${index}`}><div className="training-date"><b>{new Intl.DateTimeFormat('ar-EG', { day: '2-digit' }).format(new Date(`${log.session_date}T12:00:00`))}</b><span>{new Intl.DateTimeFormat('ar-EG', { month: 'short' }).format(new Date(`${log.session_date}T12:00:00`))}</span><i /></div><div className="training-record-body"><div className="training-record-head"><div><span className="training-sport-tag">{log.sport || profile.primary_sport}</span><h3>{log.focus || 'جلسة تدريب'}</h3></div><small><CalendarDays size={13} /> {formatDate(log.session_date)}</small></div><p>{log.notes || 'لا توجد ملاحظات مضافة لهذه الجلسة.'}</p>{log.next_steps && <div className="next-step-note"><Target size={14} /><span><b>الخطوة القادمة:</b> {log.next_steps}</span></div>}</div><div className="training-record-status"><CheckCircle2 size={16} /><span>مسجلة</span></div></article>)}</div> : <section className="panel"><EmptyState text="سجّل أول جلسة عشان تبدأ تبني تاريخك التدريبي." action="إضافة جلسة" onClick={onAdd} /></section>}
  </div>;
}

function PlayersPage({ players, onAddAssessment, onAddLog }) {
  return <div className="page-content"><PageHeading eyebrow="إدارة التدريب" title="اللاعبون المرتبطون بيك" description="تابع أهداف اللاعبين المرتبطين بحسابك، وسجّل الجلسات والتقييمات بعد التدريب." />
    <div className="coach-workflow-banner"><div className="coach-workflow-icon"><Users size={23} /></div><div><h3>متابعة واضحة لكل لاعب</h3><p>أضف الجلسة أو تقييم المهارة من نفس الصفحة. التقييمات الجديدة لا تستبدل السجلات السابقة.</p></div></div>
    {players.length ? <div className="players-grid">{players.map((player) => <article className="panel player-management-card" key={player.id}><div className="player-card-top"><div className="coach-avatar">{initials(player.full_name)}</div><span className="connected-pill"><CheckCircle2 size={13} /> مرتبط</span></div><h3>{player.full_name}</h3><p>{player.primary_sport} · {player.current_level || 'المستوى غير محدد'}</p><div className="player-goal-box"><span>الهدف الحالي</span><strong>{player.player_details?.short_term_goal || 'لم يحدد هدف قصير المدى'}</strong></div><div className="player-card-actions"><button className="button button-outline" onClick={() => onAddLog(player.id)}><ClipboardList size={15} /> جلسة</button><button className="button button-primary" onClick={() => onAddAssessment(player.id)}><BarChart3 size={15} /> تقييم</button></div></article>)}</div> : <section className="panel"><EmptyState text="مفيش لاعبين مرتبطين بحسابك لحد دلوقتي. اللاعب يقدر يختارك كمدرب من ملفه؛ في المراحل القادمة هنضيف طلب ربط وموافقة من الطرفين." /></section>}
    <div className="notice-card"><ShieldCheck size={21} /><div><strong>الربط بموافقة واضحة</strong><p>قبل عرض أي سجل خاص للمدرب، لازم تكون العلاقة بين اللاعب والمدرب واضحة وموافق عليها. صلاحيات قاعدة البيانات تظل هي المسؤولة عن السماح أو منع الوصول.</p></div></div>
  </div>;
}

function SettingsPage({ profile, onEdit, onTogglePublic }) {
  return <div className="page-content"><PageHeading eyebrow="التحكم في حسابك" title="الإعدادات والخصوصية" description="اختار البيانات التي تظهر في دليل البحث، وراجع إعدادات حسابك." />
    <div className="settings-grid"><section className="panel settings-panel"><div className="settings-heading"><div className="settings-icon"><Eye size={19} /></div><div><h3>ظهور الملف في البحث</h3><p>التحكم في ظهور المعلومات الأساسية فقط.</p></div></div><div className="setting-control-row"><div><b>{profile.is_public ? 'ملفك ظاهر في دليل البحث' : 'ملفك غير ظاهر في دليل البحث'}</b><small>الاسم والرياضة والمستوى والموقع فقط؛ سجلات التدريب والتقييمات ليست عامة.</small></div><button className={`toggle-switch ${profile.is_public ? 'on' : ''}`} onClick={() => onTogglePublic(!profile.is_public)} aria-label="تغيير ظهور الملف"><i /></button></div></section>
      <section className="panel settings-panel"><div className="settings-heading"><div className="settings-icon purple-bg"><UserRound size={19} /></div><div><h3>بيانات الحساب</h3><p>حدّث بياناتك الرياضية الرئيسية.</p></div></div><div className="setting-control-row"><div><b>{profile.full_name}</b><small>{profile.role === 'coach' ? 'ملف مدرب' : 'ملف لاعب'} · {profile.primary_sport}</small></div><button className="button button-outline" onClick={onEdit}>تعديل <ArrowLeft size={14} /></button></div></section>
      <section className="panel settings-panel settings-wide"><div className="settings-heading"><div className="settings-icon green-bg"><ShieldCheck size={19} /></div><div><h3>خصوصية السجل الرياضي</h3><p>التقييمات والملاحظات وسجل الجلسات مخصصة لصاحب الملف والأطراف المصرح لها فقط.</p></div></div><div className="privacy-points"><span><CheckCircle2 size={15} /> لا تظهر تفاصيل الجلسات في الملف العام</span><span><CheckCircle2 size={15} /> يحتفظ النظام بتاريخ التقييمات</span><span><CheckCircle2 size={15} /> عند ربط مدرب، يجب التحقق من الصلاحيات والموافقة</span></div></section></div>
    <div className="security-footnote"><Lock size={16} /><span>مهم: إعداد الواجهة وحده لا يكفي لتأمين البيانات. بعد تشغيل قاعدة بيانات Supabase، شغّل سياسات Row Level Security المرفقة في ملف SQL قبل استخدام المنصة ببيانات حقيقية.</span></div>
  </div>;
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><div><span className="modal-kicker">SPORTMATCH</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={20} /></button></div>{children}</section></div>;
}


function AdminPage({ client, onToast }) {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [actions, setActions] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [busyUser, setBusyUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      const [summaryResult, usersResult, actionsResult] = await Promise.all([
        client.rpc('admin_get_overview'),
        client.rpc('admin_list_users', { p_search: search.trim(), p_role: roleFilter, p_limit: 100 }),
        client.rpc('admin_get_recent_actions', { p_limit: 8 }),
      ]);
      if (!active) return;
      const firstError = summaryResult.error || usersResult.error || actionsResult.error;
      if (firstError) {
        setError('تعذر تحميل لوحة الإدارة. تأكد من تشغيل ملف supabase/admin_console.sql وترقية حسابك كمسؤول من SQL Editor.');
        setOverview(null);
        setUsers([]);
        setActions([]);
      } else {
        setOverview(summaryResult.data || {});
        setUsers(Array.isArray(usersResult.data) ? usersResult.data : []);
        setActions(Array.isArray(actionsResult.data) ? actionsResult.data : []);
      }
      setLoading(false);
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [client, search, roleFilter, refreshKey]);

  async function changeDirectoryStatus(user, nextStatus) {
    if (busyUser) return;
    const labels = { active: 'نشط في دليل البحث', hidden: 'مخفي من دليل البحث', under_review: 'قيد المراجعة' };
    if (!window.confirm(`تأكيد تغيير حالة ظهور ${user.full_name} إلى: ${labels[nextStatus]}؟\nهذا الإجراء لا يعطّل تسجيل دخول الحساب.`)) return;
    setBusyUser(user.user_id);
    const { error: rpcError } = await client.rpc('admin_set_directory_status', {
      p_target_user_id: user.user_id,
      p_status: nextStatus,
    });
    setBusyUser('');
    if (rpcError) {
      onToast('تعذر تحديث حالة الظهور. راجع صلاحيات المسؤول وإعدادات قاعدة البيانات.');
      return;
    }
    onToast('تم تحديث حالة ظهور الملف وتسجيل الإجراء في سجل الإدارة.');
    setRefreshKey((value) => value + 1);
  }

  async function changeCoachVerification(user, key) {
    if (busyUser) return;
    const next = {
      identity: Boolean(user.verification_identity),
      certificate: Boolean(user.verification_certificate),
      organization: Boolean(user.verification_organization),
    };
    const fieldByKey = { identity: 'identity', certificate: 'certificate', organization: 'organization' };
    next[fieldByKey[key]] = !next[fieldByKey[key]];
    const label = key === 'identity' ? 'الهوية' : key === 'certificate' ? 'الشهادة/المؤهل' : 'بيانات المنشأة';
    const actionLabel = next[key] ? 'اعتماد' : 'إلغاء اعتماد';
    if (!window.confirm(`${actionLabel} ${label} للمدرب ${user.full_name}؟\nلا تعتمد أي علامة إلا بعد مراجعة مستند أو مصدر موثوق خارج التطبيق. الحقول الحالية نصوص معلنة وليست ملفات إثبات.`)) return;
    setBusyUser(user.user_id);
    const { error: rpcError } = await client.rpc('admin_set_coach_verification', {
      p_target_user_id: user.user_id,
      p_identity: next.identity,
      p_certificate: next.certificate,
      p_organization: next.organization,
    });
    setBusyUser('');
    if (rpcError) {
      onToast('تعذر تحديث التحقق. راجع صلاحيات المسؤول وملف SQL.');
      return;
    }
    onToast('تم تحديث حالة التحقق وتسجيل الإجراء في سجل الإدارة.');
    setRefreshKey((value) => value + 1);
  }

  const number = (value) => new Intl.NumberFormat('ar-EG').format(Number(value || 0));
  const statusLabel = (status) => status === 'hidden' ? 'مخفي' : status === 'under_review' ? 'قيد المراجعة' : 'نشط';
  const actionLabel = (action) => action === 'directory_status_changed' ? 'تغيير حالة ظهور ملف' : action === 'coach_verification_changed' ? 'تحديث تحقق مدرب' : action;

  return <div className="page-content admin-page">
    <PageHeading eyebrow="إدارة المنصة" title="لوحة الإدارة" description="متابعة الحسابات، وإدارة ظهور الملفات العامة، ومراجعة علامات تحقق المدربين. كل تغيير إداري يُسجّل في سجل تدقيق." />
    <div className="admin-security-note"><ShieldCheck size={18} /><div><b>صلاحيات إدارية محمية</b><span>هذه الصفحة تظهر للحسابات المضافة يدويًا إلى قائمة مسؤولي المنصة في قاعدة البيانات. كل إجراء حساس يُتحقق منه داخل قاعدة البيانات، وليس من الواجهة فقط.</span></div></div>

    <div className="admin-stat-grid">
      <article className="panel admin-stat"><span>إجمالي الحسابات</span><strong>{loading ? '—' : number(overview?.total_users)}</strong><small>ملفات مكتملة على المنصة</small><i><Users size={19} /></i></article>
      <article className="panel admin-stat"><span>اللاعبون</span><strong>{loading ? '—' : number(overview?.players)}</strong><small>حسابات اللاعبين</small><i><Activity size={19} /></i></article>
      <article className="panel admin-stat"><span>المدربون</span><strong>{loading ? '—' : number(overview?.coaches)}</strong><small>حسابات المدربين</small><i><GraduationCap size={19} /></i></article>
      <article className="panel admin-stat"><span>مدربون بانتظار استكمال التحقق</span><strong>{loading ? '—' : number(overview?.coaches_pending_verification)}</strong><small>علامة تحقق واحدة أو أكثر غير مكتملة</small><i><FileBadge size={19} /></i></article>
    </div>

    <section className="panel admin-users-panel">
      <div className="panel-heading admin-panel-heading"><div><span className="panel-kicker">إدارة الحسابات</span><h2>المستخدمون المسجلون</h2></div><button className="button button-outline" type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}><Activity size={15} /> تحديث</button></div>
      <div className="admin-toolbar">
        <label className="admin-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value.slice(0, 100))} placeholder="ابحث بالاسم أو البريد أو المنطقة" aria-label="البحث عن مستخدم" /></label>
        <label className="admin-role-filter"><span>نوع الحساب</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">كل الحسابات</option><option value="player">لاعب</option><option value="coach">مدرب</option></select></label>
      </div>
      {error && <div className="admin-error" role="alert">{error}</div>}
      {loading ? <div className="admin-empty">جارٍ تحميل بيانات الإدارة...</div> : users.length === 0 ? <div className="admin-empty">لا توجد حسابات تطابق البحث الحالي.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>الحساب</th><th>النوع والرياضة</th><th>المنطقة</th><th>حالة الظهور</th><th>إجراءات الإدارة</th></tr></thead><tbody>{users.map((user) => <tr key={user.user_id}>
        <td><div className="admin-user-cell"><b>{user.full_name || 'بدون اسم'}</b><span>{user.email}</span><small>تاريخ التسجيل: {formatDate(String(user.created_at || '').slice(0, 10))}</small></div></td>
        <td><b>{user.role === 'coach' ? 'مدرب' : 'لاعب'}</b><span className="admin-muted-line">{user.primary_sport} · {user.current_level || '—'}</span></td>
        <td>{user.location || '—'}</td>
        <td><span className={`admin-status-pill status-${user.directory_status || 'active'}`}>{statusLabel(user.directory_status)}</span><small className="admin-public-note">{user.is_public ? 'اختار الظهور العام' : 'ملفه خاص باختياره'}</small></td>
        <td><div className="admin-actions-cell"><select aria-label={`حالة ظهور ${user.full_name}`} value={user.directory_status || 'active'} disabled={busyUser === user.user_id} onChange={(event) => changeDirectoryStatus(user, event.target.value)}><option value="active">نشط</option><option value="hidden">إخفاء من الدليل</option><option value="under_review">قيد المراجعة</option></select>
          {user.role === 'coach' && <div className="admin-verification-actions"><span>التحقق:</span>
            <button type="button" className={user.verification_identity ? 'is-verified' : ''} disabled={busyUser === user.user_id} onClick={() => changeCoachVerification(user, 'identity')} title="اعتماد الهوية بعد مراجعة مستند موثوق">هوية</button>
            <button type="button" className={user.verification_certificate ? 'is-verified' : ''} disabled={busyUser === user.user_id} onClick={() => changeCoachVerification(user, 'certificate')} title="اعتماد الشهادة بعد مراجعة أصلها">شهادة</button>
            <button type="button" className={user.verification_organization ? 'is-verified' : ''} disabled={busyUser === user.user_id} onClick={() => changeCoachVerification(user, 'organization')} title="اعتماد بيانات المنشأة بعد التحقق">منشأة</button>
          </div>}
        </div></td>
      </tr>)}</tbody></table></div>}
      <div className="admin-table-footnote">يتم عرض أول 100 حساب بحد أقصى في هذه النسخة. إخفاء الملف من الدليل لا يعطّل تسجيل الدخول أو يحذف الحساب أو بياناته.</div>
    </section>

    <section className="panel admin-audit-panel">
      <div className="panel-heading"><div><span className="panel-kicker">الشفافية والمراجعة</span><h2>آخر إجراءات الإدارة</h2></div><span className="admin-audit-tag"><Clock3 size={14} /> سجل تدقيق</span></div>
      {loading ? <div className="admin-empty">جارٍ تحميل السجل...</div> : actions.length === 0 ? <div className="admin-empty">لم تُسجل إجراءات إدارية بعد.</div> : <div className="admin-audit-list">{actions.map((item) => <div className="admin-audit-row" key={item.audit_id}><span className="admin-audit-icon"><ShieldCheck size={16} /></span><div><b>{actionLabel(item.action)}</b><small>بواسطة {item.admin_name || 'مسؤول'} · {formatDate(String(item.created_at || '').slice(0, 10))}</small></div><code>{item.target_user_id ? `${item.target_user_id.slice(0, 8)}…` : '—'}</code></div>)}</div>}
    </section>
  </div>;
}
