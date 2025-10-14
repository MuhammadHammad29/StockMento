"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, User } from "lucide-react";
import { getAvailableAvatars, getAvatarPath, AVATAR_CONFIG } from "@/lib/mock-data";

interface AvatarPickerProps {
  selectedAvatarId: string;
  onAvatarSelect: (avatarId: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
}

export default function AvatarPicker({ 
  selectedAvatarId, 
  onAvatarSelect, 
  onSave, 
  onCancel,
  showActions = true 
}: AvatarPickerProps) {
  const availableAvatars = getAvailableAvatars();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Your Avatar</CardTitle>
        <CardDescription>
          Select from our collection of {AVATAR_CONFIG.TOTAL_AVATARS} professional avatars
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {availableAvatars.map((avatarId) => (
            <div
              key={avatarId}
              className={`relative cursor-pointer transition-all hover:scale-105 ${
                selectedAvatarId === avatarId 
                  ? 'ring-2 ring-emerald-500 ring-offset-2 rounded-full' 
                  : ''
              }`}
              onClick={() => onAvatarSelect(avatarId)}
            >
              <Avatar className="h-16 w-16 mx-auto">
                <AvatarImage 
                  src={getAvatarPath(avatarId)} 
                  alt={`Avatar ${avatarId.split('-')[1]}`}
                  className="object-cover"
                />
                <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              
              {selectedAvatarId === avatarId && (
                <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              
              <p className="text-xs text-center mt-1 text-muted-foreground truncate">
                Avatar {avatarId.split('-')[1]}
              </p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex justify-end space-x-3 pt-4 border-t">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {onSave && (
              <Button onClick={onSave} className="bg-emerald-600 hover:bg-emerald-700">
                Save Avatar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}