"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { createUser } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";

interface ProfileSetupProps {
  phoneNumber: string;
}

export function ProfileSetup({ phoneNumber }: ProfileSetupProps) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    sex: "",
    profilePhotoUrl: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    setIsCreating(true);
    setError("");

    const result = await createUser({
      phoneNumber,
      name: formData.name.trim(),
      age: formData.age ? Number.parseInt(formData.age) : undefined,
      sex: formData.sex || undefined,
      profilePhotoUrl: formData.profilePhotoUrl || undefined,
    });

    if (result.success && result.user) {
      login(result.user);
    } else {
      setError(result.error || "Failed to create profile");
    }

    setIsCreating(false);
  };

  const handlePhotoUpload = () => {
    // For MVP, use placeholder
    setFormData((prev) => ({
      ...prev,
      profilePhotoUrl: "/professional-headshot.png",
    }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Set up your profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Tell us a bit about yourself
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage
                    src={formData.profilePhotoUrl || "/placeholder.svg"}
                  />
                  <AvatarFallback className="bg-muted">
                    {formData.name ? formData.name[0].toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePhotoUpload}
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 p-0"
                >
                  <Camera className="w-4 h-4 text-primary-foreground" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-black">
                Name *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="chat-input text-black"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age" className="text-black">
                  Age
                </Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="25"
                  min="18"
                  max="99"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, age: e.target.value }))
                  }
                  className="chat-input text-black"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sex" className="text-black">
                  Gender
                </Label>
                <Select
                  value={formData.sex}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, sex: value }))
                  }
                >
                  <SelectTrigger className="chat-input text-black">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem className="text-black" value="male">
                      Male
                    </SelectItem>
                    <SelectItem value="female" className="text-black">
                      Female
                    </SelectItem>
                    <SelectItem value="non-binary" className="text-black">
                      Non-binary
                    </SelectItem>
                    <SelectItem
                      value="prefer-not-to-say"
                      className="text-black"
                    >
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={!formData.name.trim() || isCreating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-black"
            >
              {isCreating ? "Creating Profile..." : "Continue"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
