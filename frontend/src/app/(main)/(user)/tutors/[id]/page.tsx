'use client';

import { Action, ThunkDispatch } from '@reduxjs/toolkit';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import ProfileDetail from '~components/blocks/ProfileDetail';
import ReviewSection from '~components/blocks/ReviewSection';
import SessionList, {
  Session as FrontendSession,
} from '~components/blocks/SessionList';
import AbstractShapesBackground from '~components/ui/AbstractShapesBackground';
import Avatar from '~components/ui/Avatar';
import Loader from '~components/ui/Loader';
import { fetchSessionCount, incrementSessionCount } from '~features/bookingSlice';
import { getWalletTransactions } from '~services/shared/walletService';
import {
  bookWithWallet,
  createBookingOrder,
  getTutorDetails,
  getTutorSessions,
  verifyBookingPayment,
} from '~services/user/tutorService';
import { RootState } from '~store/rootReducer';
import {
  RazorpayError,
  RazorpayOptions,
  RazorpayResponse,
  Session as ApiSession,
  Tutor,
} from '~types/tutor';
import { errorHandler } from '~utils/errorHandler';
import { utterAlert } from '~utils/utterAlert';
import { utterToast } from '~utils/utterToast';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
      on: (
        event: 'payment.failed',
        handler: (response: RazorpayError) => void,
      ) => void;
    };
  }
}

export default function TutorDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const dispatch = useDispatch<ThunkDispatch<RootState, unknown, Action>>();
  const { user } = useSelector((state: RootState) => state.auth);

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getInitialDate = () => {
    const now = new Date();
    const currentHours = now.getHours();
    const endOfDay = 17;
    const baseDate = new Date(now);

    if (currentHours >= endOfDay) {
      baseDate.setDate(baseDate.getDate() + 1);
    }
    if (baseDate.getDay() === 0) {
      baseDate.setDate(baseDate.getDate() + 1);
    }
    return formatLocalDate(baseDate);
  };

  const initialDate = getInitialDate();
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [sessions, setSessions] = useState<FrontendSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const fetchSessions = useCallback(async () => {
    if (!id) return;
    setSessionsLoading(true);
    try {
      const res = await getTutorSessions(id, selectedDate);
      const mappedSessions = res.sessions.map((s: ApiSession) => ({
        id: s.id,
        time: new Date(s.scheduledAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        language: s.language,
        topic: s.topic,
        booked: s.status === 'Booked',
        date: new Date(s.scheduledAt).toISOString().split('T')[0],
        status: s.status,
        scheduledAt: s.scheduledAt,
        price: s.price,
      }));
      setSessions(mappedSessions);
    } catch (error) {
      utterToast.error(errorHandler(error));
    } finally {
      setSessionsLoading(false);
    }
  }, [id, selectedDate]);

  const handleBook = async (sessionId: string, price: number) => {
    try {
      setSessionsLoading(true);
      const wallet = await getWalletTransactions('user');
      const walletBalance = wallet.balance;
      setSessionsLoading(false);

      const inputOptions: Record<string, string> = {
        razorpay: 'Razorpay (Card, UPI, Netbanking)',
      };

      if (walletBalance >= price) {
        inputOptions.wallet = `Wallet Balance (Available: ₹${walletBalance})`;
      } else {
        inputOptions.wallet_disabled = `Wallet Balance (Insufficient: ₹${walletBalance})`;
      }

      utterAlert({
        title: 'Select Payment Method',
        text: `Session Price: ₹${price}`,
        icon: 'question',
        input: 'radio',
        inputOptions,
        inputPlaceholder: 'Select payment method',
        confirmText: 'Pay Now',
        showCancel: true,
        didOpen: (popup) => {
          const confirmButton = popup.querySelector('.custom-confirm-btn') as HTMLButtonElement;
          const radioInputs = popup.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
          
          radioInputs.forEach(input => {
            input.addEventListener('change', (e: Event) => {
              if (confirmButton) {
                const target = e.target as HTMLInputElement;
                const isDisabled = target.value === 'wallet_disabled';
                confirmButton.disabled = isDisabled;
                confirmButton.style.opacity = isDisabled ? '0.5' : '1';
                confirmButton.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
              }
            });
          });
        },
        onConfirm: async (method) => {
          if (!method || method === 'wallet_disabled') {
            return;
          }

          if (method === 'wallet') {
            try {
              setSessionsLoading(true);
              setBookingId(sessionId);
              await bookWithWallet(sessionId, id);
              utterToast.success('Session booked successfully!');
              fetchSessions();
              dispatch(incrementSessionCount());
              dispatch(fetchSessionCount('user'));
            } catch (error) {
              utterToast.error(errorHandler(error));
              fetchSessions();
            } finally {
              setSessionsLoading(false);
              setBookingId(null);
            }
            return;
          }

          // Razorpay flow
          try {
            setSessionsLoading(true);
            const orderData = await createBookingOrder(price, 'INR', sessionId);

            const options: RazorpayOptions = {
              key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
              amount: orderData.order.amount,
              currency: orderData.order.currency,
              name: 'Utter',
              description: 'Tutor Session Booking',
              order_id: orderData.order.id,
              handler: async function (response: RazorpayResponse) {
                try {
                  setBookingId(sessionId);
                  await verifyBookingPayment({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    sessionId,
                    tutorId: tutor?.id,
                    amount: orderData.order.amount / 100,
                    currency: orderData.order.currency,
                  });
                  utterToast.success('Session booked successfully!');
                  fetchSessions();
                  dispatch(incrementSessionCount());
                  dispatch(fetchSessionCount('user'));
                } catch (error) {
                  utterToast.error(errorHandler(error));
                } finally {
                  setBookingId(null);
                }
              },
              prefill: {
                name: user?.name || '',
                email: user?.email || '',
                contact: '6207494646',
              },
              theme: {
                color: '#F43F5E',
              },
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response: RazorpayError) {
              utterToast.error(response.error.description);
            });
            rzp1.open();
          } catch (error) {
            utterToast.error(errorHandler(error));
            fetchSessions();
          } finally {
            setSessionsLoading(false);
          }
        },
      });
    } catch (error) {
      setSessionsLoading(false);
      utterToast.error(errorHandler(error));
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await getTutorDetails(id);
        setTutor(res.tutor);
      } catch (error) {
        utterToast.error(errorHandler(error));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDetails();
    } else {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Tutor not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-rose-50">
      <AbstractShapesBackground />
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">
                <Avatar
                  user={{
                    id: tutor.id,
                    name: tutor.name,
                    role: 'tutor',
                  }}
                  size="lg"
                  editable={false}
                />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {tutor.name}
              </h1>
              <div className="w-full border-t border-gray-100 pt-6 text-left">
                <ProfileDetail
                  bio={tutor.bio}
                  languages={tutor.knownLanguages}
                  experience={tutor.yearsOfExperience}
                  certificationTypes={tutor.certificationType}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[600px]">
            <SessionList
              sessions={sessions}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              userType="user"
              loading={sessionsLoading}
              bookingId={bookingId}
              minDate={initialDate}
              onBook={(sessionId) => {
                const session = sessions.find((s) => s.id === sessionId);
                if (session) handleBook(sessionId, session.price);
              }}
            />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 relative z-10">
        <ReviewSection tutorId={id} averageRating={tutor.averageRating} />
      </div>
    </div>
  );
}
