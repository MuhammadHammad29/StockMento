"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Star, PartyPopper } from 'lucide-react';
import ReviewForm from './review-form';

interface CourseCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  onReviewSubmit: (review: { rating: number; comment: string }) => void;
  hasAlreadyReviewed?: boolean;
}

export default function CourseCompletionDialog({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  onReviewSubmit,
  hasAlreadyReviewed = false
}: CourseCompletionDialogProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);

  const handleWriteReview = () => {
    setShowReviewForm(true);
  };

  const handleReviewSubmit = (review: { rating: number; comment: string }) => {
    onReviewSubmit(review);
    setShowReviewForm(false);
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  if (showReviewForm) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <ReviewForm
            courseId={courseId}
            courseTitle={courseTitle}
            onSubmit={handleReviewSubmit}
            onCancel={() => setShowReviewForm(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center py-6">
          {/* Celebration Header */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="bg-gradient-to-r from-emerald-100 to-blue-100 dark:from-emerald-500/20 dark:to-blue-500/20 p-4 rounded-full">
                <Trophy className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              </div>
              <PartyPopper className="absolute -top-1 -right-1 h-6 w-6 text-yellow-500" />
            </div>
          </div>

          {/* Congratulations Message */}
          <DialogHeader className="space-y-3 mb-6">
            <DialogTitle className="text-2xl font-bold text-center">
              🎉 Congratulations!
            </DialogTitle>
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">
                You've completed the course:
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                "{courseTitle}"
              </p>
            </div>
          </DialogHeader>

          {/* Course Completion Stats */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    100%
                  </div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    <Trophy className="h-6 w-6 mx-auto" />
                  </div>
                  <div className="text-xs text-muted-foreground">Achievement</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    ⭐
                  </div>
                  <div className="text-xs text-muted-foreground">Knowledge</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Prompt */}
          {!hasAlreadyReviewed && (
            <div className="mb-6">
              <div className="flex items-center justify-center mb-3">
                <Star className="h-5 w-5 text-yellow-500 fill-current mr-2" />
                <h3 className="font-semibold text-foreground">Share Your Experience</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Help other learners by sharing your thoughts about this course.
                Your review helps us improve and guides future students.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!hasAlreadyReviewed ? (
              <>
                <Button 
                  onClick={handleWriteReview}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  size="lg"
                >
                  <Star className="mr-2 h-4 w-4" />
                  Write a Review
                </Button>
                <Button 
                  onClick={handleSkip}
                  variant="outline"
                  className="w-full"
                >
                  Maybe Later
                </Button>
              </>
            ) : (
              <Button 
                onClick={onClose}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                size="lg"
              >
                Continue Learning
              </Button>
            )}
          </div>

          {hasAlreadyReviewed && (
            <p className="text-sm text-muted-foreground mt-4">
              Thank you for your previous review! 🙏
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}