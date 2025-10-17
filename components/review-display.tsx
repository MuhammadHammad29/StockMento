"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ThumbsUp, User } from "lucide-react";
import { Review, ReviewSummary } from "@/lib/types";
import { getAvatarPath } from "@/lib/mock-data";
import { formatTimeAgo } from "@/lib/data-utils";

interface ReviewDisplayProps {
  reviews: Review[];
  summary: ReviewSummary;
  onWriteReview?: () => void;
  showWriteButton?: boolean;
}

export default function ReviewDisplay({
  reviews,
  summary,
  onWriteReview,
  showWriteButton = false
}: ReviewDisplayProps) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const renderRatingDistribution = () => {
    const maxCount = Math.max(...Object.values(summary.ratingDistribution));
    
    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary.ratingDistribution[rating as keyof typeof summary.ratingDistribution];
          const percentage = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center space-x-2 text-sm">
              <span className="w-2">{rating}</span>
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-8 text-xs text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (summary.totalReviews === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            <div className="text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No reviews yet</p>
              <p className="text-sm">Be the first to review this course!</p>
            </div>
            {showWriteButton && onWriteReview && (
              <Button onClick={onWriteReview} className="bg-emerald-600 hover:bg-emerald-700">
                Write a Review
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-foreground">
                  {summary.averageRating}
                </div>
                <div className="flex justify-center space-x-1 my-2">
                  {renderStars(Math.round(summary.averageRating))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on {summary.totalReviews} review{summary.totalReviews !== 1 ? 's' : ''}
                </p>
              </div>
              {showWriteButton && onWriteReview && (
                <div className="text-center">
                  <Button onClick={onWriteReview} className="bg-emerald-600 hover:bg-emerald-700">
                    Write a Review
                  </Button>
                </div>
              )}
            </div>

            {/* Rating Distribution */}
            <div className="space-y-4">
              <h4 className="font-medium">Rating Distribution</h4>
              {renderRatingDistribution()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Reviews */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Reviews</h3>
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Review Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={getAvatarPath(review.userAvatarId)} 
                        alt={review.userName} 
                      />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{review.userName}</h4>
                        {review.isVerifiedCompletion && (
                          <Badge variant="secondary" className="text-xs">
                            Verified Completion
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex space-x-1">
                          {renderStars(review.rating)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatTimeAgo(review.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Content */}
                <div className="text-foreground">
                  <p>{review.comment}</p>
                </div>

                {/* Review Actions */}
                {review.helpfulVotes && review.helpfulVotes > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{review.helpfulVotes} people found this helpful</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}