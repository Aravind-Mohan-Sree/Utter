'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  LuActivity, 
  LuBookOpen, 
  LuChevronRight,
  LuClock, 
  LuGraduationCap, 
  LuLoaderCircle,
  LuMessageSquare, 
  LuSmile, 
  LuStar, 
  LuWallet
} from 'react-icons/lu';
import { MdPeople as MdPeopleIcon } from 'react-icons/md';
import { useSelector } from 'react-redux';

import { commonLanguages as languagesList } from '~components/form/LanguagesInput';
import { SearchAndFilter } from '~components/form/SearchAndFilter';
import { FeedbackModal } from '~components/modals/FeedbackModal';
import AbstractShapesBackground from '~components/ui/AbstractShapesBackground';
import Button from '~components/ui/Button';
import { Card } from '~components/ui/Card';
import Loader from '~components/ui/Loader';
import { Pagination } from '~components/ui/Pagination';
import { ResultsSummary } from '~components/ui/ResultsSummary';
import { useSocketContext } from '~contexts/SocketContext';
// Feedback Service Imports
import {
  Feedback,
  getUserFeedbackFeed,
  getUserLanguageProgress,
  LanguageProgress,
} from '~services/shared/feedbackService';
// Tutor Dashboard Service Imports
import {
  getTutorDashboardData,
  getTutorOwnReviews,
  TutorDashboardStats,
  TutorLanguageStat,
  TutorRecentBooking,
  TutorRecentReview,
} from '~services/tutor/dashboardService';
import { fetchUsers } from '~services/user/userService';
import { RootState } from '~store/rootReducer';

const commonLanguages = ['All Languages', ...languagesList];

interface User {
  id: string;
  name: string;
  knownLanguages: string[];
  createdAt: string;
}

/**
 * Main Landing / Home / Dashboard view for the application.
 * Dynamically switches between:
 * - A beautiful guest / tutor / new-user landing page with a hero section.
 * - An elite, state-of-the-art Student Learning Dashboard displaying tutor feedback, progress tracking,
 *   and infinite scroll timelines once they attend sessions.
 */
export default function Home() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { onlineUsers } = useSocketContext();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sortBy, setSortBy] = useState('Newest');
  const [selectedLanguage, setSelectedLanguage] = useState('All Languages');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [filteredUsersCount, setFilteredUsersCount] = useState(0);

  // Dashboard state variables
  const [progress, setProgress] = useState<LanguageProgress[]>([]);
  const [feed, setFeed] = useState<Feedback[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const [dashboardSelectedLanguage, setDashboardSelectedLanguage] = useState<string>('');

  // Tutor Dashboard state variables
  const [tutorStats, setTutorStats] = useState<TutorDashboardStats | null>(null);
  const [tutorLanguageStats, setTutorLanguageStats] = useState<TutorLanguageStat[]>([]);
  const [tutorRecentBookings, setTutorRecentBookings] = useState<TutorRecentBooking[]>([]);
  const [tutorReviews, setTutorReviews] = useState<TutorRecentReview[]>([]);
  const [tutorReviewsPage, setTutorReviewsPage] = useState(1);
  const [tutorReviewsHasMore, setTutorReviewsHasMore] = useState(false);
  const [tutorReviewsLoading, setTutorReviewsLoading] = useState(false);

  // Selected feedback item for details modal
  const [selectedFeedbackBookingId, setSelectedFeedbackBookingId] = useState<string | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const role = user?.role as 'user' | 'tutor';
  const router = useRouter();

  const totalPages = Math.ceil(filteredUsersCount / itemsPerPage);
  const from = filteredUsersCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, filteredUsersCount);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch dashboard data based on role
  useEffect(() => {
    if (role === 'user') {
      const loadDashboardData = async () => {
        try {
          const progressRes = await getUserLanguageProgress();
          if (progressRes.success) {
            setProgress(progressRes.progress);

            // Fetch first page of feeds if they have learning progress
            if (progressRes.progress.length > 0) {
              setFeedLoading(true);
              try {
                const feedRes = await getUserFeedbackFeed(1, 5);
                if (feedRes.success) {
                  setFeed(feedRes.data);
                  setFeedHasMore(feedRes.hasMore);
                  setFeedPage(1);
                }
              } catch {
              } finally {
                setFeedLoading(false);
              }
            }
          }
        } catch {
        } finally {
          setDashboardLoaded(true);
        }
      };

      loadDashboardData();
    } else if (role === 'tutor') {
      const loadTutorDashboardData = async () => {
        try {
          const res = await getTutorDashboardData();
          if (res.success) {
            setTutorStats(res.stats);
            setTutorLanguageStats(res.languageStats);
            setTutorRecentBookings(res.recentBookings);

            if (user?.id) {
              setTutorReviewsLoading(true);
              try {
                const reviewsRes = await getTutorOwnReviews(1, 5);
                if (reviewsRes.success) {
                  setTutorReviews(
                    reviewsRes.reviews.map((r) => ({
                      id: r.id,
                      userName: r.userName || 'Anonymous',
                      userAvatar: r.userAvatar || null,
                      rating: r.rating,
                      note: r.note,
                      createdAt: r.createdAt,
                    }))
                  );
                  setTutorReviewsHasMore(reviewsRes.currentPage < reviewsRes.totalPages);
                  setTutorReviewsPage(1);
                }
              } catch {
              } finally {
                setTutorReviewsLoading(false);
              }
            }
          }
        } catch {
        } finally {
          setDashboardLoaded(true);
        }
      };

      loadTutorDashboardData();
    } else {
      setDashboardLoaded(true);
    }
  }, [role, user?.id]);

  // Set default dashboard selected language to the last attended language
  useEffect(() => {
    if (progress.length > 0 && !dashboardSelectedLanguage) {
      let latestLang = progress[0]?.language || '';
      let latestTime = 0;
      for (const lang of progress) {
        if (lang.history) {
          for (const h of lang.history) {
            const t = new Date(h.date).getTime();
            if (t > latestTime) {
              latestTime = t;
              latestLang = lang.language;
            }
          }
        }
      }
      setDashboardSelectedLanguage(latestLang);
    }
  }, [progress, dashboardSelectedLanguage]);

  // Infinite scroll loader for tutor feedback feed
  const loadMoreFeed = async () => {
    if (feedLoading || !feedHasMore) return;
    try {
      setFeedLoading(true);
      const nextPage = feedPage + 1;
      const res = await getUserFeedbackFeed(nextPage, 5);
      if (res.success) {
        setFeed((prev) => [...prev, ...res.data]);
        setFeedHasMore(res.hasMore);
        setFeedPage(nextPage);
      }
    } catch {
    } finally {
      setFeedLoading(false);
    }
  };

  // Scroll event listener for infinite scroll list
  const handleFeedScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const nearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 60;
    if (nearBottom) {
      loadMoreFeed();
    }
  };

  // Infinite scroll loader for tutor reviews
  const loadMoreTutorReviews = async () => {
    if (tutorReviewsLoading || !tutorReviewsHasMore || !user?.id) return;
    try {
      setTutorReviewsLoading(true);
      const nextPage = tutorReviewsPage + 1;
      const res = await getTutorOwnReviews(nextPage, 5);
      if (res.success) {
        const newReviews = res.reviews.map((r) => ({
          id: r.id,
          userName: r.userName || 'Anonymous',
          userAvatar: r.userAvatar || null,
          rating: r.rating,
          note: r.note,
          createdAt: r.createdAt,
        }));
        setTutorReviews((prev) => [...prev, ...newReviews]);
        setTutorReviewsHasMore(res.currentPage < res.totalPages);
        setTutorReviewsPage(nextPage);
      }
    } catch {
    } finally {
      setTutorReviewsLoading(false);
    }
  };

  // Scroll event listener for tutor reviews infinite scroll list
  const handleTutorReviewsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const nearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 60;
    if (nearBottom) {
      loadMoreTutorReviews();
    }
  };

  // Fetch community members
  useEffect(() => {
    if (role === 'user') {
      (async () => {
        try {
          let sortParam = 'newest';
          if (sortBy === 'Oldest') sortParam = 'oldest';
          else if (sortBy === 'A-Z') sortParam = 'a-z';
          else if (sortBy === 'Z-A') sortParam = 'z-a';

          const res = await fetchUsers({
            q: debouncedQuery,
            page: currentPage,
            limit: itemsPerPage,
            sort: sortParam,
            language: selectedLanguage === 'All Languages' ? 'All' : selectedLanguage
          });

          setUsers(res.users);
          setTotalUsersCount(res.totalUsersCount);
          setFilteredUsersCount(res.filteredUsersCount);
        } catch { } finally {
          setLoading(false);
        }
      })();
    }
  }, [role, debouncedQuery, sortBy, selectedLanguage, currentPage, itemsPerPage, user?.id]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const section = document.getElementById('community-section');
    section?.scrollIntoView({ behavior: 'smooth' });
  };

  const content = {
    guest: {
      title: 'Master Any Language, Your Way',
      subtitle:
        'Whether you want to learn from native speakers or share your own expertise with the world, Utter is your gateway to global communication.',
      buttonText: 'Join the Community',
    },
    user: {
      title: 'Connect Through Languages',
      subtitle:
        'Practice with native speakers, learn new languages, and build meaningful connections with people from around the world.',
      buttonText: 'Start Learning',
    },
    tutor: {
      title: 'Share Your Knowledge',
      subtitle:
        'Share your native language expertise with eager learners worldwide. Build your teaching career while helping others achieve their language goals.',
      buttonText: 'Start Teaching',
    },
  };

  const { title, subtitle, buttonText } = (user?.role && content[role]) || content.guest;

  const handleHeroClick = () => {
    const path =
      role === 'user'
        ? '/tutors'
        : role === 'tutor'
          ? '/create-sessions'
          : '/signin';

    router.push(path);
  };

  const handleOpenFeedbackDetails = (bookingId: string) => {
    setSelectedFeedbackBookingId(bookingId);
    setIsFeedbackOpen(true);
  };

  // Determine if we should show the Dashboard rather than the Hero
  const showDashboard = role === 'user' && progress.length > 0;
  const showTutorDashboard = role === 'tutor' && tutorStats && (tutorStats.completedSessionsCount > 0 || tutorStats.totalEarnings > 0);

  return (
    <main className="min-h-screen w-full flex flex-col items-center relative overflow-hidden bg-slate-50">
      {!dashboardLoaded ? (
        <div className="min-h-screen w-full flex items-center justify-center text-rose-500">
          <Loader />
        </div>
      ) : showDashboard ? (
        /* PREMIUM STUDENT LEARNING DASHBOARD */
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          {/* Header Greeting */}
          <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-[2rem] p-8 md:p-12 text-white shadow-xl shadow-rose-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden mb-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />
            <div className="space-y-3 max-w-xl">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                Hey, {user?.name || 'Learner'}! 👋
              </h1>
              <p className="text-white/80 text-sm md:text-base leading-relaxed font-medium">
                Your journey is thriving. Tutors are rating your pronunciation, syntax, and conversational fluency. Let&apos;s conquer new heights today!
              </p>
            </div>
            <div className="shrink-0 flex gap-3">
              <Button
                text="Explore More Tutors"
                variant="outline"
                className="bg-white text-rose-600 hover:bg-rose-50 border-none font-bold shadow-lg shadow-black/10 py-3 px-6 rounded-xl"
                onClick={() => router.push('/tutors')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              {
                value: progress.length,
                icon: <LuGraduationCap className="text-indigo-500" />,
                desc: 'Languages Studied',
                bg: 'from-indigo-50/50 to-blue-50/20 border-indigo-100/50',
              },
              {
                value: progress.reduce((acc, curr) => acc + curr.sessionCount, 0),
                icon: <LuClock className="text-rose-500" />,
                desc: 'Sessions Attended',
                bg: 'from-rose-50/50 to-orange-50/20 border-rose-100/50',
              },
              {
                value: (
                  progress.reduce((acc, curr) => acc + curr.averageRating, 0) /
                  progress.length
                ).toFixed(1),
                icon: <LuStar className="text-amber-500" fill="#f59e0b" />,
                desc: 'Average Overall Rating',
                bg: 'from-amber-50/50 to-orange-50/20 border-amber-100/50',
              },
              {
                value: progress.reduce((acc, curr) => acc + (curr.averageSpeaking >= 4 ? 1 : 0), 0),
                icon: <LuActivity className="text-emerald-500" />,
                desc: 'Highly fluent ratings',
                bg: 'from-emerald-50/50 to-teal-50/20 border-emerald-100/50',
              },
            ].map((stat, i) => (
              <div
                key={i}
                className={`bg-gradient-to-br ${stat.bg} border rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300`}
              >
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-gray-800">{stat.value}</h3>
                  <span className="text-xs text-gray-500 font-semibold">{stat.desc}</span>
                </div>
                <div className="p-3.5 bg-white rounded-xl shadow-sm text-xl shrink-0">
                  {stat.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Grid: Col Span 7 (Progress) and 5 (Insights Feed) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: attended Language Progress List */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/40 p-4 rounded-2xl border border-rose-100/30">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <LuBookOpen size={20} className="text-rose-500" />
                    Language Mastery Progress
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Continuous evaluation based on multiple key conversation vectors
                  </p>
                </div>

                {/* Premium Language Dropdown */}
                {progress.length > 0 && (
                  <div className="relative shrink-0">
                    <select
                      value={dashboardSelectedLanguage}
                      onChange={(e) => setDashboardSelectedLanguage(e.target.value)}
                      className="appearance-none bg-white border border-rose-100 text-gray-700 font-semibold px-4 py-2 pr-10 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all cursor-pointer"
                    >
                      {progress.map((p, idx) => (
                        <option key={idx} value={p.language}>
                          {p.language}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-rose-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {(() => {
                  const selectedProgress = progress.find((p) => p.language === dashboardSelectedLanguage) || progress[0];
                  if (!selectedProgress) return null;
                  return (
                    <div
                      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-rose-100 transition-all duration-300 relative group h-[345px]"
                    >
                      <div className="absolute top-6 right-6 bg-rose-50 text-rose-600 px-3.5 py-1 rounded-full text-xs font-bold tracking-tight">
                        {selectedProgress.sessionCount} {selectedProgress.sessionCount === 1 ? 'Session' : 'Sessions'}
                      </div>

                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-rose-500 text-white font-bold flex items-center justify-center shadow-md shadow-rose-200">
                          {selectedProgress.language.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{selectedProgress.language}</h3>
                          <p className="text-xs text-gray-400">Average Performance metrics</p>
                        </div>
                      </div>

                      {/* Vectors list */}
                      <div className="space-y-4">
                        {[
                          { label: 'Overall Rating', val: selectedProgress.averageRating, color: 'bg-rose-500', track: 'bg-rose-50' },
                          { label: 'Grammar Accuracy', val: selectedProgress.averageGrammar, color: 'bg-indigo-500', track: 'bg-indigo-50' },
                          { label: 'Vocabulary Choice', val: selectedProgress.averageVocabulary, color: 'bg-violet-500', track: 'bg-violet-50' },
                          { label: 'Pronunciation & Phonetics', val: selectedProgress.averagePronunciation, color: 'bg-amber-500', track: 'bg-amber-50' },
                          { label: 'Speaking & Fluency', val: selectedProgress.averageSpeaking, color: 'bg-emerald-500', track: 'bg-emerald-50' },
                        ].map((item, index) => (
                          <div key={index} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-medium text-gray-600">{item.label}</span>
                              <span className="font-bold text-gray-800">{item.val.toFixed(1)} / 5.0</span>
                            </div>
                            <div className={`w-full ${item.track} h-2 rounded-full overflow-hidden`}>
                              <div
                                  className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                                  style={{ width: `${(item.val / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right: Tutor insights notes feed - Infinite Scroll Panel */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/40 p-4 rounded-2xl border border-rose-100/30">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <LuMessageSquare size={20} className="text-rose-500" />
                    Tutor Insights Timeline
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Chronological feed of tutor critiques
                  </p>
                </div>
              </div>

              {/* Feed container */}
              <div
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm h-[345px] overflow-y-auto no-scrollbar scroll-smooth space-y-4"
                onScroll={handleFeedScroll}
              >
                {feed.length > 0 ? (
                  <>
                    {feed.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => item.bookingId && handleOpenFeedbackDetails(item.bookingId)}
                        className="bg-slate-50/50 hover:bg-rose-50/20 rounded-xl p-4 border border-gray-100 hover:border-rose-100 transition-all duration-200 cursor-pointer space-y-3 relative group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2.5 items-center">
                            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-500 font-bold flex items-center justify-center text-xs shrink-0 uppercase">
                              {item.tutorName?.substring(0, 2) || 'TU'}
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-gray-800">
                                {item.tutorName || 'Tutor'}
                              </h4>
                              <p className="text-[10px] text-gray-400">
                                {item.language} • {item.topic}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            <LuStar size={10} fill="#f59e0b" className="border-none" /> {item.rating}
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 italic relative leading-relaxed bg-white p-3 rounded-lg border border-slate-100 group-hover:border-rose-100 transition-colors">
                          <span className="text-3xl text-rose-100 select-none font-serif absolute -top-1 left-1.5">“</span>
                          <p className="pl-3 relative z-10 font-medium">
                            {item.notes.length > 100
                              ? `${item.notes.substring(0, 100)}...`
                              : item.notes}
                          </p>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium pt-1">
                          <span>
                            {new Date(item.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="text-rose-500 flex items-center font-bold gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            View Report <LuChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Infinite Scroll loading indicators */}
                    {feedLoading && (
                      <div className="flex items-center justify-center py-4 gap-2 text-rose-500">
                        <LuLoaderCircle className="animate-spin" size={18} />
                        <span className="text-[11px] font-medium text-gray-400">Fetching observations...</span>
                      </div>
                    )}

                    {!feedHasMore && (
                      <div className="text-center py-4 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                        🎉 You have reached the beginning of your journey!
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                    <LuSmile size={32} className="mb-2 text-gray-300" />
                    <p className="text-xs font-semibold">Tutors haven&apos;t submitted report notes yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Modal integration */}
          {selectedFeedbackBookingId && (
            <FeedbackModal
              isOpen={isFeedbackOpen}
              onClose={() => {
                setIsFeedbackOpen(false);
                setSelectedFeedbackBookingId(null);
              }}
              bookingId={selectedFeedbackBookingId}
              role="user"
              mode="view"
            />
          )}
        </section>
      ) : showTutorDashboard ? (
        /* PREMIUM TUTOR DASHBOARD */
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          {/* Header Greeting */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 rounded-[2rem] p-8 md:p-12 text-white shadow-xl shadow-indigo-100/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden mb-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />
            <div className="space-y-3 max-w-xl">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                Hey, {user?.name || 'Tutor'}! 🎓
              </h1>
              <p className="text-white/80 text-sm md:text-base leading-relaxed font-medium">
                Your expertise is shaping lives. Track your teaching performance, total earnings, student reviews, and keep spreading knowledge!
              </p>
            </div>
            <div className="shrink-0 flex gap-3">
              <Button
                text="Create Sessions"
                variant="outline"
                className="bg-white text-indigo-600 hover:bg-indigo-50 border-none font-bold shadow-lg shadow-black/10 py-3 px-6 rounded-xl"
                onClick={() => router.push('/create-sessions')}
              />
              <Button
                text="View Schedule"
                variant="primary"
                className="bg-indigo-500 text-white hover:bg-indigo-600 border-none font-bold shadow-lg shadow-black/10 py-3 px-6 rounded-xl"
                onClick={() => router.push('/sessions')}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              {
                value: `₹${tutorStats?.totalEarnings.toLocaleString()}`,
                icon: <LuWallet className="text-emerald-500" />,
                desc: 'Total Earnings',
                bg: 'from-emerald-50/50 to-teal-50/20 border-emerald-100/50',
              },
              {
                value: tutorStats?.completedSessionsCount,
                icon: <LuGraduationCap className="text-indigo-500" />,
                desc: 'Sessions Completed',
                bg: 'from-indigo-50/50 to-blue-50/20 border-indigo-100/50',
              },
              {
                value: (() => {
                  if (!tutorStats) return '0m';
                  const hours = Math.floor(tutorStats.totalTeachTime / 3600);
                  const minutes = Math.floor((tutorStats.totalTeachTime % 3600) / 60);
                  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                })(),
                icon: <LuClock className="text-rose-500" />,
                desc: 'Total Teach Time',
                bg: 'from-rose-50/50 to-orange-50/20 border-rose-100/50',
              },
              {
                value: tutorStats && tutorStats.averageRating > 0 ? tutorStats.averageRating.toFixed(1) : 'N/A',
                icon: <LuStar className="text-amber-500" fill={tutorStats && tutorStats.averageRating > 0 ? '#f59e0b' : 'none'} />,
                desc: 'Average Rating',
                bg: 'from-amber-50/50 to-orange-50/20 border-amber-100/50',
              },
            ].map((stat, i) => (
              <div
                key={i}
                className={`bg-gradient-to-br ${stat.bg} border rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300`}
              >
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-gray-800">{stat.value}</h3>
                  <span className="text-xs text-gray-500 font-semibold">{stat.desc}</span>
                </div>
                <div className="p-3.5 bg-white rounded-xl shadow-sm text-xl shrink-0">
                  {stat.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Grid: Col Span 7 (Analytics & Recent Bookings) and Col Span 5 (Student Testimonials) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Languages Taught & Bookings */}
            <div className="lg:col-span-7 space-y-8">
              {/* Languages Taught */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/40 p-4 rounded-2xl border border-indigo-100/30">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <LuBookOpen size={20} className="text-indigo-500" />
                      Languages Taught Distribution
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Session count breakdown by language taught
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-indigo-100 transition-all duration-300">
                  <div className="space-y-4">
                    {tutorLanguageStats.length > 0 ? (
                      (() => {
                        const totalSessions = tutorLanguageStats.reduce((acc, curr) => acc + curr.sessionCount, 0);
                        const colors = ['bg-indigo-500', 'bg-rose-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500'];
                        const tracks = ['bg-indigo-50', 'bg-rose-50', 'bg-violet-50', 'bg-amber-50', 'bg-emerald-50'];

                        return tutorLanguageStats.map((stat, index) => {
                          const percentage = totalSessions > 0 ? (stat.sessionCount / totalSessions) * 100 : 0;
                          const colorClass = colors[index % colors.length];
                          const trackClass = tracks[index % tracks.length];

                          return (
                            <div key={index} className="flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-gray-700">{stat.language}</span>
                                <span className="font-semibold text-gray-500">
                                  {stat.sessionCount} {stat.sessionCount === 1 ? 'session' : 'sessions'} ({percentage.toFixed(0)}%)
                                </span>
                              </div>
                              <div className={`w-full ${trackClass} h-2.5 rounded-full overflow-hidden`}>
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()
                    ) : (
                      <div className="text-center py-6 text-sm text-gray-400">
                        No language statistics available.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Bookings Feed */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/40 p-4 rounded-2xl border border-indigo-100/30">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <LuActivity size={20} className="text-indigo-500" />
                      Recent Sessions
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Overview of your 5 most recent booking events
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {tutorRecentBookings.length > 0 ? (
                    tutorRecentBookings.map((booking) => {
                      const statusLower = (booking.status || '').toLowerCase();
                      const isCompleted = statusLower === 'completed';
                      const isCancelled = statusLower === 'cancelled';
                      const isIncomplete = statusLower === 'incomplete';
                      
                      let statusBadge = (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
                          Upcoming
                        </span>
                      );
                      if (isCompleted) {
                        statusBadge = (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Completed
                          </span>
                        );
                      } else if (isCancelled) {
                        statusBadge = (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
                            Cancelled
                          </span>
                        );
                      } else if (isIncomplete) {
                        statusBadge = (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                            Incomplete
                          </span>
                        );
                      }

                      let earnedAmount = booking.price;
                      if (isCancelled) {
                        earnedAmount = 0;
                      } else if (isIncomplete) {
                        const activeMinutes = (booking.activeSeconds || 0) / 60;
                        if (activeMinutes < 15) {
                          earnedAmount = 0;
                        } else if (activeMinutes <= 30) {
                          earnedAmount = booking.price / 2;
                        } else {
                          earnedAmount = booking.price;
                        }
                      }

                      return (
                        <div
                          key={booking.id}
                          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-indigo-100 hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                        >
                          <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 font-extrabold flex items-center justify-center uppercase shrink-0">
                              {booking.otherPartyName.substring(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-800 text-base">{booking.otherPartyName}</h4>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {booking.language} • {booking.topic}
                              </p>
                              <p className="text-xs text-gray-400 font-medium">
                                {new Date(booking.date).toLocaleDateString(undefined, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-start sm:items-end justify-between w-full sm:w-auto gap-2">
                            {statusBadge}
                            <span className="font-extrabold text-gray-800 text-sm">
                              {isCompleted || isCancelled || isIncomplete ? 'Earned' : 'Earning'} ₹{earnedAmount}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100 shadow-sm">
                      No recent sessions found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Student Reviews Timeline */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/40 p-4 rounded-2xl border border-indigo-100/30">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <LuMessageSquare size={20} className="text-indigo-500" />
                    Student Feedback
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Reviews left by your recent students
                  </p>
                </div>
              </div>

              <div
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 max-h-[600px] overflow-y-auto no-scrollbar scroll-smooth"
                onScroll={handleTutorReviewsScroll}
              >
                {tutorReviews.length > 0 ? (
                  <>
                    {tutorReviews.map((review) => (
                      <div
                        key={review.id}
                        className="bg-slate-50/50 rounded-xl p-4 border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/10 transition-all duration-200 space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2.5 items-center">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-500 font-bold flex items-center justify-center text-xs shrink-0 uppercase">
                              {review.userName.substring(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-gray-800">
                                {review.userName}
                              </h4>
                              <p className="text-[10px] text-gray-400">
                                {new Date(review.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            <LuStar size={10} fill="#f59e0b" className="border-none" /> {review.rating}
                          </div>
                        </div>

                        {review.note && (
                          <div className="text-xs text-gray-500 italic relative leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                            <span className="text-3xl text-indigo-100 select-none font-serif absolute -top-1 left-1.5">“</span>
                            <p className="pl-3 relative z-10 font-medium">
                              {review.note}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Infinite Scroll loading indicators */}
                    {tutorReviewsLoading && (
                      <div className="flex items-center justify-center py-4 gap-2 text-indigo-500">
                        <LuLoaderCircle className="animate-spin" size={18} />
                        <span className="text-[11px] font-medium text-gray-400">Fetching reviews...</span>
                      </div>
                    )}

                    {!tutorReviewsHasMore && (
                      <div className="text-center py-4 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                        🎉 You have reached the beginning of your reviews!
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                    <LuSmile size={32} className="mb-2 text-gray-300" />
                    <p className="text-xs font-semibold">No reviews received yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* ORIGINAL HERO SECTION LANDING PAGE WITH EXTRA SECTIONS */
        <>
          <section className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat z-0"
              style={{ backgroundImage: "url('/hero-bg.webp')" }}
            >
              <div className="absolute inset-0 bg-black/50"></div>
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
              <div className="max-w-3xl w-full text-center bg-white/10 backdrop-blur-md p-8 md:p-16 rounded-[2rem] border border-white/20 shadow-2xl">
                <h1 className="text-4xl md:text-7xl font-bold text-white mb-6 drop-shadow-md">
                  {title}
                </h1>
                <p className="text-lg md:text-2xl text-white/90 mb-10 leading-relaxed max-w-2xl mx-auto">
                  {subtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button text={buttonText} onClick={handleHeroClick} />
                </div>
              </div>
            </div>
          </section>

          {/* Sections below the Hero are for unauthenticated viewing only */}
          {!user && (
            <>
              {/* Section 1: Core Features */}
              <section className="py-12 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                  <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
                    <span className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-full uppercase tracking-wider">
                      Core Features
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-gray-950 tracking-tight">
                      One Conversation At A Time
                    </h2>
                    <p className="text-lg text-gray-500 font-medium">
                      Utter connects you with professional native tutors and fellow language learners to accelerate your fluency.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                      {
                        icon: <LuMessageSquare className="text-indigo-600" size={24} />,
                        title: "1-on-1 Practice",
                        desc: "Engage in immersive practice sessions with native speakers.",
                        bg: "bg-indigo-500/10 text-indigo-600"
                      },
                      {
                        icon: <LuGraduationCap className="text-rose-600" size={24} />,
                        title: "Professional Tutors",
                        desc: "Learn from certified, experienced language tutors at low cost.",
                        bg: "bg-rose-500/10 text-rose-600"
                      },
                      {
                        icon: <LuWallet className="text-emerald-600" size={24} />,
                        title: "Flexible Payments",
                        desc: "Pay only for the time you spend learning. Wallet refunds protect incomplete or cancelled sessions.",
                        bg: "bg-emerald-500/10 text-emerald-600"
                      },
                      {
                        icon: <LuClock className="text-amber-600" size={24} />,
                        title: "On-demand Booking",
                        desc: "Schedule sessions that fit your timetable.",
                        bg: "bg-amber-500/10 text-amber-600"
                      }
                    ].map((feature, idx) => (
                      <div 
                        key={idx} 
                        className="bg-white rounded-3xl p-8 border border-slate-100 hover:border-indigo-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                      >
                        <div className={`p-4 rounded-2xl w-14 h-14 flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 ${feature.bg}`}>
                          {feature.icon}
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed font-medium">{feature.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Section 2: How It Works */}
              <section className="py-12 bg-slate-50 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                  <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
                    <span className="px-3 py-1 text-xs font-bold text-rose-600 bg-rose-50 rounded-full uppercase tracking-wider">
                      How It Works
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-gray-950 tracking-tight">
                      Your Journey To Fluency In 4 Simple Steps
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Students Column */}
                    <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
                      <h3 className="text-2xl font-black text-rose-600 mb-8 flex items-center gap-2">
                        <span className="w-2.5 h-6 bg-rose-500 rounded-full" /> For Students
                      </h3>
                      <div className="space-y-8">
                        {[
                          { step: "01", title: "Create Your Profile", desc: "Sign up and set the languages you wish to practice." },
                          { step: "02", title: "Find the Perfect Tutor", desc: "Filter by language, ratings, and browse certified tutor profiles." },
                          { step: "03", title: "Book a Virtual Session", desc: "Use your wallet or any payment method to book sessions." },
                          { step: "04", title: "Start Speaking", desc: "Join our 1-on-1 platform and talk live." }
                        ].map((item, idx) => (
                          <div key={idx} className="flex gap-6 items-start">
                            <span className="text-3xl font-black text-rose-100 shrink-0">{item.step}</span>
                            <div>
                              <h4 className="font-bold text-lg text-gray-800 mb-1">{item.title}</h4>
                              <p className="text-sm text-gray-500 leading-relaxed font-medium">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tutors Column */}
                    <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
                      <h3 className="text-2xl font-black text-indigo-600 mb-8 flex items-center gap-2">
                        <span className="w-2.5 h-6 bg-indigo-500 rounded-full" /> For Tutors
                      </h3>
                      <div className="space-y-8">
                        {[
                          { step: "01", title: "Apply as a Tutor", desc: "Register your profile and list your teaching languages." },
                          { step: "02", title: "Get Verified", desc: "Our admin team will verify your credentials to maintain quality." },
                          { step: "03", title: "Manage Schedule", desc: "Receive bookings notifications from global students." },
                          { step: "04", title: "Deliver & Earn", desc: "Tutor students, give them feedback, and earn money." }
                        ].map((item, idx) => (
                          <div key={idx} className="flex gap-6 items-start">
                            <span className="text-3xl font-black text-indigo-100 shrink-0">{item.step}</span>
                            <div>
                              <h4 className="font-bold text-lg text-gray-800 mb-1">{item.title}</h4>
                              <p className="text-sm text-gray-500 leading-relaxed font-medium">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3: App Stats / Why Choose Us */}
              <section className="py-12 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                  <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-[2.5rem] p-12 md:p-16 text-white shadow-2xl relative overflow-hidden">
                    {/* Decorative background gradients */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                      <div className="space-y-6">
                        <span className="px-3 py-1 text-xs font-bold text-indigo-200 bg-indigo-800/40 rounded-full uppercase tracking-wider border border-indigo-700/30">
                          Why Utter
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                          Designed to Build Absolute Conversational Confidence
                        </h2>
                        <p className="text-indigo-200/80 leading-relaxed font-medium text-base">
                          Traditional methods focus on grammar. Utter focuses on active talking. Practice real scenarios with real feedback, and build a lasting habit.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-6 md:gap-8">
                        {[
                          { number: "14+", label: "Supported Languages" },
                          { number: "Verified", label: "Tutors Only" },
                          { number: "Secure", label: "Integrated Wallet" },
                          { number: "100%", label: "Refund Protection" }
                        ].map((stat, idx) => (
                          <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center">
                            <div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-rose-300 mb-2">
                              {stat.number}
                            </div>
                            <div className="text-xs md:text-sm font-semibold text-indigo-200">
                              {stat.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4: Final Call to Action */}
              <section className="py-12 bg-white text-center relative overflow-hidden">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
                  <h2 className="text-3xl md:text-6xl font-black text-gray-900 tracking-tight">
                    Ready to achieve real fluency?
                  </h2>
                  <p className="text-lg text-gray-500 font-semibold max-w-xl mx-auto leading-relaxed">
                    Join our community of learners and start practicing today. Your first step is just a conversation away.
                  </p>
                  <div className="flex justify-center">
                    <Button 
                      text="Get Started Today" 
                      onClick={handleHeroClick}
                      className="bg-gradient-to-r from-indigo-600 to-rose-500 hover:from-indigo-700 hover:to-rose-600 text-white font-extrabold px-10 py-5 rounded-full shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all text-lg border-none"
                    />
                  </div>
                </div>
              </section>
            </>
          )}
        </>
      )}

      {/* Community Section (Only for Users) */}
      {role === 'user' && (
        <section id="community-section" className="relative w-full bg-gradient-to-br from-blue-50 via-white to-rose-50 overflow-hidden py-20">
          <AbstractShapesBackground />

          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12 space-y-6">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-gray-900">Community Members</h2>
                <p className="text-gray-500 mt-2">Connect with other language enthusiasts from around the world</p>
              </div>

              <div className="relative z-20 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-gray-100 shadow-sm">
                <SearchAndFilter
                  placeholder="Search members by name or language..."
                  filters={['Newest', 'Oldest', 'A-Z', 'Z-A']}
                  activeFilter={sortBy}
                  onFilterChange={(val) => {
                    setSortBy(val);
                    setCurrentPage(1);
                  }}
                  searchValue={searchQuery}
                  onSearchChange={(val) => {
                    setSearchQuery(val);
                    setCurrentPage(1);
                  }}
                  className="mb-0"
                  languageOptions={commonLanguages}
                  selectedLanguage={selectedLanguage}
                  onLanguageSelect={(val) => {
                    setSelectedLanguage(val);
                    setCurrentPage(1);
                  }}
                  languageOptionsClassName="max-h-60 overflow-y-auto no-scrollbar"
                />
              </div>

              <ResultsSummary
                from={from}
                to={to}
                filteredCount={filteredUsersCount}
                totalCount={totalUsersCount}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(val) => {
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}
                itemsOptions={['6', '12', '18', '24']}
                hideTotal={true}
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><Loader /></div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-dashed border-gray-200">
                <div className="text-gray-300 mb-4">
                  <MdPeopleIcon className="mx-auto w-24 h-24" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No members found</h3>
                <p className="text-sm text-gray-500 text-center max-w-md">Try adjusting your search or filter criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map((u) => (
                  <Card
                    key={u.id}
                    type="user"
                    id={u.id}
                    name={u.name}
                    email=""
                    joinedAt={new Date(u.createdAt)}
                    status="Active"
                    knownLanguages={u.knownLanguages}
                    className="bg-white/60 backdrop-blur-sm hover:border-rose-200 transition-all h-full"
                    isOnline={onlineUsers.has(String(u.id))}
                    hideStatus={true}
                    onClick={() => router.push(`/chats?userId=${u.id}`)}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
