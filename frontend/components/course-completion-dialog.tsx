"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { BookOpenCheck, PartyPopper, Sparkles } from "lucide-react";

interface CourseCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
}

export default function CourseCompletionDialog({
  isOpen,
  onClose,
  courseTitle,
}: CourseCompletionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="py-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <div className="rounded-full bg-gradient-to-r from-emerald-100 to-blue-100 p-4 dark:from-emerald-500/20 dark:to-blue-500/20">
                <Sparkles className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              </div>
              <PartyPopper className="absolute -top-1 -right-1 h-6 w-6 text-yellow-500" />
            </div>
          </div>

          <DialogHeader className="mb-6 space-y-3">
            <DialogTitle className="text-center text-2xl font-bold">
              Course complete
            </DialogTitle>
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">
                You&apos;ve completed every published lesson in:
              </p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                &quot;{courseTitle}&quot;
              </p>
              <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                If new lessons are added later, your course will automatically move back to in progress until you finish the new content.
              </p>
            </div>
          </DialogHeader>

          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                  100%
                </div>
                <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <BookOpenCheck className="h-4 w-4 text-emerald-600" />
                  Current curriculum complete
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              onClick={onClose}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              size="lg"
            >
              Review Course
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/courses">Browse Courses</Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
