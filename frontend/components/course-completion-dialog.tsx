"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, PartyPopper } from "lucide-react";

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
              Congratulations!
            </DialogTitle>
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">
                You&apos;ve completed the course:
              </p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                &quot;{courseTitle}&quot;
              </p>
            </div>
          </DialogHeader>

          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                  100%
                </div>
                <p className="text-sm text-muted-foreground">Complete</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button
              onClick={onClose}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              size="lg"
            >
              Continue Learning
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
