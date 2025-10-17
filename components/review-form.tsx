"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { ReviewSubmission } from "@/lib/types";
import { toast } from "sonner";

interface ReviewFormProps {
  courseId: string;
  courseTitle: string;
  onSubmit: (review: ReviewSubmission) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ReviewForm({
  courseId,
  courseTitle,
  onSubmit,
  onCancel,
  isSubmitting = false
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (comment.trim().length < 10) {
      toast.error("Please write at least 10 characters in your review");
      return;
    }

    const reviewData: ReviewSubmission = {
      courseId,
      rating,
      comment: comment.trim()
    };

    onSubmit(reviewData);
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isActive = starValue <= (hoveredRating || rating);
      
      return (
        <button
          key={index}
          type="button"
          className={`transition-colors ${
            isActive ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
          }`}
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
          onClick={() => setRating(starValue)}
        >
          <Star className="h-8 w-8 fill-current" />
        </button>
      );
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a Review</CardTitle>
        <CardDescription>
          Share your experience with "{courseTitle}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating *</Label>
            <div className="flex items-center space-x-1">
              {renderStars()}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  ({rating} star{rating !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Your Review *</Label>
            <Textarea
              id="comment"
              placeholder="Tell others about your experience with this course..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground text-right">
              {comment.length}/500 characters
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Review Guidelines
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Be honest and constructive in your feedback</li>
              <li>• Focus on the course content and learning experience</li>
              <li>• Help other learners make informed decisions</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}