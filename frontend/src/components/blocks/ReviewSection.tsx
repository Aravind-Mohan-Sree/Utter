import React, { useCallback,useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import Loader from '~components/ui/Loader';
import { Pagination } from '~components/ui/Pagination';
import {
  addReview,
  checkReviewEligibility,
  deleteReview,
  getTutorReviews,
  Review,
  updateReview,
} from '~services/user/reviewService';
import { RootState } from '~store/rootReducer';
import { errorHandler } from '~utils/errorHandler';
import { utterAlert } from '~utils/utterAlert';
import { utterToast } from '~utils/utterToast';

import ReviewForm from './ReviewForm';
import ReviewItem from './ReviewItem';

interface ReviewSectionProps {
  tutorId: string;
  averageRating?: number;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ tutorId, averageRating }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [eligibility, setEligibility] = useState({ canReview: false, alreadyReviewed: false });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const [reviewsRes, eligibilityRes] = await Promise.all([
        getTutorReviews(tutorId, page, 5),
        checkReviewEligibility(tutorId),
      ]);
      setReviews(reviewsRes.reviews);
      setTotalPages(reviewsRes.totalPages);
      setTotalCount(reviewsRes.totalCount);
      setCurrentPage(reviewsRes.currentPage);
      setEligibility({
        canReview: eligibilityRes.canReview,
        alreadyReviewed: eligibilityRes.alreadyReviewed,
      });
    } catch {
    } finally {
      setLoading(false);
    }
  }, [tutorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddReview = async (rating: number, note: string) => {
    try {
      await addReview(tutorId, rating, note);
      utterToast.success('Review posted successfully');
      await fetchData(1);
    } catch (error) {
      utterToast.error(errorHandler(error));
      throw error;
    }
  };

  const handleUpdateReview = async (id: string, rating: number, note: string) => {
    try {
      await updateReview(id, rating, note);
      utterToast.success('Review updated successfully');
      await fetchData(currentPage);
    } catch (error) {
      utterToast.error(errorHandler(error));
      throw error;
    }
  };

  const handleDeleteReview = async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      utterAlert({
        title: 'Delete Review',
        text: 'Are you sure you want to delete this review?',
        confirmText: 'Delete',
        showCancel: true,
        onConfirm: async () => {
          try {
            await deleteReview(id);
            utterToast.success('Review deleted successfully');
            await fetchData(currentPage);
          } catch (error) {
            utterToast.error(errorHandler(error));
          } finally {
            resolve();
          }
        },
      });
    });
  };

  if (loading) return <div className="flex justify-center p-6"><Loader /></div>;

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between border-b border-rose-100 pb-4">
        <h2 className="text-xl font-bold text-gray-900">Student Reviews</h2>
        <div className="flex items-center gap-2">
          {averageRating !== undefined && averageRating > 0 && (
            <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-sm font-medium border border-amber-100/50">
              <span>{averageRating.toFixed(1)} Rating</span>
            </div>
          )}
          <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-sm font-medium">
            {totalCount} {totalCount === 1 ? 'Review' : 'Reviews'}
          </span>
        </div>
      </div>

      {eligibility.canReview && !eligibility.alreadyReviewed && (
        <div className="bg-gradient-to-r from-rose-50 to-orange-50 p-1 rounded-2xl shadow-sm">
           <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-4">Rate your experience</h3>
              <ReviewForm onSubmit={handleAddReview} />
           </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-white/30 rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-500 italic">No reviews yet. Be the first to share your experience!</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 pr-2 scrollbar-thin scrollbar-thumb-rose-200">
            {reviews.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                isOwner={review.userId === user?.id}
                onUpdate={handleUpdateReview}
                onDelete={handleDeleteReview}
              />
            ))}
          </div>
          
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={fetchData}
          />
        </>
      )}
    </div>
  );
};

export default ReviewSection;
