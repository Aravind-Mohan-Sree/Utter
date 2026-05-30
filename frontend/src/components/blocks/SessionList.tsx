import { useRef, useState } from 'react';
import { LuCalendar, LuChevronLeft, LuChevronRight, LuInfo } from 'react-icons/lu';

import { Card } from '~components/ui/Card';
import { utterToast } from '~utils/utterToast';

export interface Session {
    id: string;
    time: string;
    language: string;
    topic: string;
    booked: boolean;
    date: string;
    status: string;
    scheduledAt: string;
    price: number;
    duration?: number;
}

interface SessionListProps {
    sessions: Session[];
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    userType: 'tutor' | 'user';
    onAction?: (sessionId: string) => void;
    onBook?: (sessionId: string) => void;
    loading?: boolean;
    minDate?: string;
    maxDate?: string;
    showStatus?: boolean;
    showPrice?: boolean;
    cancellingId?: string | null;
    bookingId?: string | null;
}

export default function SessionList({
    sessions,
    selectedDate,
    setSelectedDate,
    userType,
    onAction,
    onBook,
    loading = false,
    minDate,
    maxDate,
    showStatus = false,
    showPrice = true,
    cancellingId,
    bookingId
}: SessionListProps) {
    const dateInputRef = useRef<HTMLInputElement>(null);
    const [showInfoTooltip, setShowInfoTooltip] = useState(false);

    const formatLocalDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const navigateDate = (direction: 'next' | 'prev') => {
        if (!selectedDate) return;

        const curr = new Date(selectedDate);
        if (direction === 'next') {
            curr.setDate(curr.getDate() + 1);
        } else {
            curr.setDate(curr.getDate() - 1);
        }

        const nextDateStr = formatLocalDate(curr.toISOString().split('T')[0]);

        if (minDate && nextDateStr < minDate) {
            utterToast.info('Cannot view past dates.');
            return;
        }

        if (maxDate && nextDateStr > maxDate) {
            utterToast.info('Cannot view beyond date limit.');
            return;
        }

        setSelectedDate(nextDateStr);
    };

    return (
        <div className="flex flex-col items-center w-full animate-fadeIn">
            {/* Loader removed as per request */}

            <div className="flex items-center gap-2 mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                    {userType === 'tutor' ? 'Your Sessions' : 'Available Sessions'}
                </h2>
                {userType !== 'tutor' && (
                    <div
                        className="relative group"
                        onMouseLeave={() => setShowInfoTooltip(false)}
                    >
                        <button
                            type="button"
                            className="text-gray-400 hover:text-rose-500 transition-colors focus:outline-none p-0.5 rounded-full hover:bg-gray-100 cursor-pointer"
                            aria-label="Session Booking Policies"
                            onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                            onBlur={() => setShowInfoTooltip(false)}
                        >
                            <LuInfo size={18} />
                        </button>

                        {/* Premium Tooltip Card */}
                        <div className={`absolute right-[-50px] sm:right-auto sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-72 max-w-[calc(100vw-2.5rem)] bg-white/95 backdrop-blur-md p-4 rounded-xl border border-rose-100 shadow-xl transition-all duration-300 z-50 text-left ${showInfoTooltip
                            ? 'opacity-100 visible pointer-events-auto'
                            : 'opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto'
                            }`}>
                            <div className="space-y-3 text-xs text-gray-600 leading-relaxed font-medium">
                                <div className="flex gap-2 items-start">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                                    <p>
                                        <span className="font-bold text-gray-800">Refunds</span>: Cancel at least <span className="font-bold text-gray-800">1 hour prior</span> to receive a 100% instant refund directly to your wallet.
                                    </p>
                                </div>
                                <div className="flex gap-2 items-start">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                                    <p>
                                        Cancellations made within 1 hour of the start time are non-refundable.
                                    </p>
                                </div>
                                <div className="flex gap-2 items-start">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                                    <p>
                                        If a session is unattended or not completed properly, it will be marked as incomplete.
                                    </p>
                                </div>
                                <div className="flex gap-2 items-start">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                                    <p>
                                        <span className="font-bold text-gray-800">Refunds for Incomplete Sessions</span>:<br />
                                        • <span className="font-semibold text-gray-700">Under 15 mins talk time</span>: 100% refund to wallet.<br />
                                        • <span className="font-semibold text-gray-700">15 to 30 mins talk time</span>: 50% refund to wallet.<br />
                                        • <span className="font-semibold text-gray-700">Above 30 mins talk time</span>: Non-refundable.
                                    </p>
                                </div>
                            </div>
                            <div className="absolute top-0 right-[53px] sm:right-auto sm:left-1/2 sm:-translate-x-1/2 -mt-1.5 w-3 h-3 bg-white border-t border-l border-rose-100 rotate-45" />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 mb-8 bg-white p-2 rounded-xl border border-gray-200 shadow-sm z-20">
                <button onClick={() => navigateDate('prev')} className="cursor-pointer p-2 text-gray-500 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                    <LuChevronLeft size={24} />
                </button>
                <div
                    className="flex items-center gap-2 text-lg font-semibold text-gray-700 min-w-[150px] justify-center cursor-pointer relative"
                    onClick={() => {
                        if (dateInputRef.current) {
                            try {
                                dateInputRef.current.showPicker();
                            } catch (error) {
                                console.error('showPicker not supported', error);
                            }
                        }
                    }}
                >
                    <LuCalendar size={20} className="text-rose-400" />
                    {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    <input
                        ref={dateInputRef}
                        type="date"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 pointer-events-none"
                        value={selectedDate}
                        min={minDate}
                        max={maxDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
                <button onClick={() => navigateDate('next')} className="cursor-pointer p-2 text-gray-500 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                    <LuChevronRight size={24} />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full relative">
                {sessions.map((session, index) => (
                    <Card
                        key={session.id}
                        id={session.id}
                        type="session"
                        title={`Session ${index + 1}`}
                        subtitle={session.topic}
                        date={session.date}
                        time={session.time}
                        language={session.language}
                        status={session.booked ? 'Booked' : 'Available'}
                        price={session.price}
                        onCancel={userType === 'tutor' && !session.booked ? onAction : undefined}
                        onBook={userType === 'user' ? onBook : undefined}
                        disabled={loading}
                        isLoading={cancellingId === session.id || bookingId === session.id}
                        hideStatus={!showStatus}
                        hidePrice={!showPrice}
                        duration={session.duration}
                    />
                ))}
                {sessions.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-white/30 rounded-2xl border border-gray-100 border-dashed">
                        No sessions found for this date.
                    </div>
                )}
            </div>
        </div>
    );
}
