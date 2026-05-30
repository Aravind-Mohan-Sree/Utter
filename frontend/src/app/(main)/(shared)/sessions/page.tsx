'use client';

import { Action, ThunkDispatch } from '@reduxjs/toolkit';
import { useRouter,useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiSlash } from 'react-icons/fi';
import { LuInfo } from 'react-icons/lu';
import { VscFeedback } from 'react-icons/vsc';
import { useDispatch, useSelector } from 'react-redux';

import { commonLanguages } from '~components/form/LanguagesInput';
import { SearchAndFilter } from '~components/form/SearchAndFilter';
import { FeedbackModal } from '~components/modals/FeedbackModal';
import AbstractShapesBackground from '~components/ui/AbstractShapesBackground';
import Button from '~components/ui/Button';
import { Card } from '~components/ui/Card';
import Loader from '~components/ui/Loader';
import { Pagination } from '~components/ui/Pagination';
import { ResultsSummary } from '~components/ui/ResultsSummary';
import { useSocketContext } from '~contexts/SocketContext';
import {
  decrementSessionCount,
  fetchSessionCount,
  updateSessionCount,
} from '~features/bookingSlice';
import {
  Booking,
  cancelBooking,
  getBookings,
  GetBookingsParams,
} from '~services/shared/bookingService';
import { getAccountDetails } from '~services/shared/managementService';
import { RootState } from '~store/rootReducer';
import { errorHandler } from '~utils/errorHandler';
import { utterAlert } from '~utils/utterAlert';
import { utterToast } from '~utils/utterToast';

export default function SessionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { socket } = useSocketContext();
  const dispatch = useDispatch<ThunkDispatch<RootState, unknown, Action>>();
  const [upcomingSessions, setUpcomingSessions] = useState<Booking[]>([]);
  const [completedSessions, setCompletedSessions] = useState<Booking[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const fetchVersionRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [itemsOptions] = useState(['5', '10', '15', '20']);
  const [sort, setSort] = useState<'Newest' | 'Oldest'>('Newest');
  const [status, setStatus] = useState<string>('All');
  const [activeFilter, setActiveFilter] = useState<string>('Newest');
  const [language, setLanguage] = useState(() => {
    const langParam = searchParams.get('language');
    if (!langParam || langParam === 'All') return 'All Languages';
    return langParam;
  });
  const [date] = useState(searchParams.get('date') || '');
  const [totalResults, setTotalResults] = useState(0);
  const [joinThreshold, setJoinThreshold] = useState(5);
  const [tutorLanguages, setTutorLanguages] = useState<string[]>([]);

  // Feedback Modal states
  const [feedbackBooking, setFeedbackBooking] = useState<Booking | null>(null);
  const [feedbackMode, setFeedbackMode] = useState<'submit' | 'view'>('view');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [showUpcomingTooltip, setShowUpcomingTooltip] = useState(false);

  const handleOpenFeedback = (booking: Booking, mode: 'submit' | 'view' = 'view') => {
    setFeedbackBooking(booking);
    setFeedbackMode(mode);
    setIsFeedbackOpen(true);
  };

  useEffect(() => {
    const feedbackBookingId = searchParams.get('feedbackBookingId');
    if (feedbackBookingId && user && user.role === 'tutor') {
      setFeedbackBooking({
        id: feedbackBookingId,
        sessionId: '',
        topic: 'Session Evaluation',
        language: '',
        status: 'Completed',
        date: '',
        price: 0,
        otherPartyName: '',
        otherPartyAvatar: '',
        otherPartyId: '',
        otherPartyRole: 'user',
      });
      setFeedbackMode('submit');
      setIsFeedbackOpen(true);

      const params = new URLSearchParams(window.location.search);
      params.delete('feedbackBookingId');
      const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState(null, '', newRelativePathQuery);
    } else if (feedbackBookingId) {
      const params = new URLSearchParams(window.location.search);
      params.delete('feedbackBookingId');
      const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState(null, '', newRelativePathQuery);
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (user?.role === 'tutor' && user?.email) {
      (async () => {
        try {
          const res = await getAccountDetails('tutor', user.email);
          if (res && res.tutor) {
            setTutorLanguages(res.tutor.knownLanguages || []);
          }
        } catch {
          // ignore error
        }
      })();
    }
  }, [user]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  const canJoin = (date: string | Date) => {
    if (joinThreshold === 0) return true;
    const sessionTime = new Date(date).getTime();
    const now = new Date().getTime();
    const diffInMinutes = (sessionTime - now) / (1000 * 60);
    return diffInMinutes <= joinThreshold;
  };

  const handleJoin = (bookingId: string, otherId: string, otherName: string) => {
    const callId = Date.now().toString();
    if (socket) {
      socket.emit('initiate_call', {
        receiverId: otherId,
        callerId: user?.id,
        callerName: user?.name,
        signalData: {
          bookingId: bookingId,
          callId: callId,
          type: 'session',
          otherId: user?.id,
        }
      });
    }
    router.push(`/video-call/${bookingId}?otherId=${otherId}&type=session&callId=${callId}&otherName=${encodeURIComponent(otherName)}`);
  };

  const fetchBookings = useCallback(async () => {
    if (!user?.role) return;
    const currentVersion = ++fetchVersionRef.current;

    try {
      if (isInitialLoadRef.current) {
        setLoading(true);
      }
      const params: GetBookingsParams = {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
        language: (language === 'All' || language === 'All Languages') ? undefined : language,
        date: date || undefined,
        sort: sort,
        status: status === 'All' ? undefined : status,
      };

      const response = await getBookings(params, user.role);

      if (currentVersion !== fetchVersionRef.current) return;

      setUpcomingSessions(response.upcoming);
      dispatch(updateSessionCount(response.upcoming.length));
      setCompletedSessions(response.history.data);
      setTotalPages(response.history.totalPage);
      setTotalResults(response.history.totalCount);
      setJoinThreshold(response.callJoinThresholdMinutes);

      if (
        response.history.currentPage > response.history.totalPage &&
        response.history.totalPage > 0
      ) {
        setCurrentPage(1);
      }
    } catch (error) {
      utterToast.error(errorHandler(error));
    } finally {
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [currentPage, itemsPerPage, debouncedSearch, sort, status, language, date, user?.role, dispatch]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (term: string) => {
    setSearch(term);
    setCurrentPage(1);
  };

  const handleSortChange = (newFilter: string) => {
    setActiveFilter(newFilter);
    if (newFilter === 'Newest' || newFilter === 'Oldest') {
      setSort(newFilter);
      setStatus('All');
    } else {
      setStatus(newFilter);
    }
    setCurrentPage(1);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCurrentPage(1);
  };

  const handleCancel = (bookingId: string) => {
    return utterAlert({
      title: 'Cancel Session',
      text: 'Are you sure you want to cancel this session?',
      icon: 'warning',
      confirmText: 'Yes, Cancel',
      cancelText: 'No, Keep',
      showCancel: true,
      onConfirm: async () => {
        try {
          if (!user?.role) return;
          setCancellingId(bookingId);
          await cancelBooking(bookingId, user.role);
          utterToast.success('Session cancelled successfully');
          dispatch(decrementSessionCount());
          dispatch(fetchSessionCount(user.role));
          await fetchBookings();
        } catch (error) {
          utterToast.error(errorHandler(error));
        } finally {
          setCancellingId(null);
          await fetchBookings();
        }
      },
    });
  };


  const from = totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalResults);

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-blue-50 via-white to-rose-50 overflow-hidden">
      {loading && <Loader />}
      <AbstractShapesBackground />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 !pt-32">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Sessions</h1>
            <p className="mt-2 text-gray-600">
              View and manage your upcoming and past sessions.
            </p>
          </div>

          {/* Upcoming Sessions */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Upcoming Sessions
              </h2>
              <div 
                className="relative group"
                onMouseLeave={() => setShowUpcomingTooltip(false)}
              >
                <button
                  type="button"
                  className="text-gray-400 hover:text-rose-500 transition-colors focus:outline-none p-0.5 rounded-full hover:bg-gray-100 cursor-pointer"
                  aria-label="Session Information"
                  onClick={() => setShowUpcomingTooltip(!showUpcomingTooltip)}
                  onBlur={() => setShowUpcomingTooltip(false)}
                >
                  <LuInfo size={18} />
                </button>
                
                {/* Premium Info Tooltip Card */}
                <div className={`absolute right-[-100px] sm:right-auto sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-72 max-w-[calc(100vw-2.5rem)] bg-white/95 backdrop-blur-md p-4 rounded-xl border border-rose-100 shadow-xl transition-all duration-300 z-50 text-left ${
                  showUpcomingTooltip
                    ? 'opacity-100 visible pointer-events-auto'
                    : 'opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto'
                }`}>
                  <div className="space-y-3 text-xs text-gray-600 leading-relaxed font-medium">
                    <div className="flex gap-2 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                      <p>Sessions auto-end after <span className="font-bold text-gray-800">1 hour</span> of talk time.</p>
                    </div>
                    {user?.role === 'tutor' && (
                      <>
                        <div className="flex gap-2 items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                          <p>
                            If you or a student cancels at least 1 hour before the session, the slot is freed.
                          </p>
                        </div>
                        <div className="flex gap-2 items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                          <p>
                            If a session is unattended or not completed properly, it will be marked as incomplete.
                          </p>
                        </div>
                        <div className="flex gap-2 items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                          <p>
                            <span className="font-bold text-gray-800">Refunds for Incomplete Sessions</span>:<br />
                            • <span className="font-semibold text-gray-700">Under 15 mins talk time</span>: No payout.<br />
                            • <span className="font-semibold text-gray-700">15 to 30 mins talk time</span>: 50% payout credited to wallet.<br />
                            • <span className="font-semibold text-gray-700">Above 30 mins talk time</span>: Full payout.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="absolute top-0 right-[103px] sm:right-auto sm:left-1/2 sm:-translate-x-1/2 -mt-1.5 w-3 h-3 bg-white border-t border-l border-rose-100 rotate-45" />
                </div>
              </div>
            </div>
            {loading && upcomingSessions.length === 0 ? (
              <div className="flex justify-center py-10"></div>
            ) : upcomingSessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingSessions.map((booking) => (
                  <div key={booking.id}>
                    <Card
                      type="tutor"
                      id={booking.id}
                      avatarId={booking.otherPartyId}
                      avatarRole={user?.role === 'tutor' ? 'user' : 'tutor'}
                      name={booking.otherPartyName}
                      email={booking.topic}
                      yearsOfExperience=""
                      knownLanguages={[booking.language]}
                      status={
                        booking.status as
                        | 'Available'
                        | 'Booked'
                        | 'Completed'
                        | 'Cancelled'
                      }
                      hideStatus={true}
                      joinedAt={new Date(booking.date)}
                      dateLabel="Scheduled for"
                      isVerified={true}
                      rejectionReason={null}
                      isLoading={cancellingId === booking.id}
                      disabled={!!cancellingId}
                      showTime={true}
                      price={booking.price}
                      paymentProvider={booking.paymentProvider}
                      customActions={
                        <Button
                          variant="outline"
                          icon={<FiSlash size={22} />}
                          className={`text-gray-400! h-fit rounded-lg p-0.5! transition-colors duration-200! hover:text-red-500! hover:bg-red-50`}
                          onClick={() => handleCancel(booking.id)}
                          title="Cancel Session"
                        />
                      }
                      className="bg-white/50 backdrop-blur-sm hover:border-rose-200"
                      onCancel={undefined}
                      onJoin={canJoin(booking.date) ? () => handleJoin(booking.id, booking.otherPartyId, booking.otherPartyName) : undefined}
                      duration={booking.duration}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-white/50 backdrop-blur-sm rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-500">No upcoming sessions found.</p>
              </div>
            )}
          </section>

          {/* Past Sessions */}
          <section>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Past Sessions
              </h2>
            </div>

            <SearchAndFilter
              searchValue={search}
              onSearchChange={handleSearch}
              activeFilter={activeFilter}
              onFilterChange={handleSortChange}
              selectedLanguage={language}
              onLanguageSelect={handleLanguageChange}
              filters={['Newest', 'Oldest', 'Completed', 'Cancelled', 'Incomplete']}
              languageOptions={
                user?.role === 'tutor'
                  ? ['All Languages', ...tutorLanguages]
                  : ['All Languages', ...commonLanguages]
              }
              placeholder="Search past sessions..."
              className="mb-4"
              languageOptionsClassName="max-h-60 overflow-y-auto w-40 no-scrollbar"
            />

            <ResultsSummary
              from={from}
              to={to}
              filteredCount={to}
              totalCount={to}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
              itemsOptions={itemsOptions}
              hideTotal={true}
            />

            {loading && completedSessions.length === 0 ? (
              <div className="flex justify-center py-10"></div>
            ) : completedSessions.length > 0 ? (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedSessions.map((booking) => (
                    <Card
                      key={booking.id}
                      type="tutor"
                      id={booking.id}
                      avatarId={booking.otherPartyId}
                      avatarRole={user?.role === 'tutor' ? 'user' : 'tutor'}
                      name={booking.otherPartyName}
                      email={booking.topic}
                      yearsOfExperience=""
                      knownLanguages={[booking.language]}
                      status={
                        booking.status as
                        | 'Available'
                        | 'Booked'
                        | 'Completed'
                        | 'Cancelled'
                        | 'Incomplete'
                      }
                      hideStatus={false}
                      joinedAt={new Date(booking.date)}
                      dateLabel="Scheduled"
                      isVerified={true}
                      rejectionReason={null}
                      isLoading={false}
                      showTime={true}
                      price={booking.price}
                      paymentProvider={booking.paymentProvider}
                      activeSeconds={booking.activeSeconds}
                      className="hover:border-rose-200"
                      customActions={
                        (booking.status === 'Completed' ||
                          (booking.status === 'Incomplete' && (booking.activeSeconds || 0) >= 900)) ? (
                          <Button
                            variant="primary"
                            className="bg-rose-500 hover:bg-rose-600 text-white p-2.5 border-none shadow-md shadow-rose-100 rounded-full flex items-center justify-center"
                            onClick={() =>
                              handleOpenFeedback(
                                booking,
                                user?.role === 'tutor' ? 'submit' : 'view'
                              )
                            }
                            icon={<VscFeedback className="text-base" />}
                            title={user?.role === 'tutor' ? 'Feedback Report' : 'View Report'}
                          />
                        ) : undefined
                      }
                      duration={booking.duration}
                    />
                  ))}
                </div>

                <div className="flex justify-center mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-white/50 backdrop-blur-sm rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-500">No past sessions found.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {feedbackBooking && (
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => {
            setIsFeedbackOpen(false);
            setFeedbackBooking(null);
          }}
          bookingId={feedbackBooking.id}
          role={user?.role as 'user' | 'tutor'}
          mode={feedbackMode}
          language={feedbackBooking.language}
          topic={feedbackBooking.topic}
          onSubmitSuccess={fetchBookings}
          studentName={feedbackBooking.otherPartyName}
        />
      )}
    </div>
  );
}
