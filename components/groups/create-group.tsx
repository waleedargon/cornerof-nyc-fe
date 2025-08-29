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
import { ArrowLeft } from "lucide-react";
import {
  createGroup,
  NEIGHBORHOODS,
  VIBES,
  LOOKING_FOR_OPTIONS,
  type CreateGroupData,
} from "@/lib/groups";
import { useAuth } from "@/hooks/use-auth";

interface CreateGroupProps {
  onGroupCreated: (group: any) => void;
  onBack: () => void;
}

export function CreateGroup({ onGroupCreated, onBack }: CreateGroupProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateGroupData>({
    name: "",
    groupSize: 4,
    neighborhood: "",
    vibe: "",
    lookingFor: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("You must be logged in to create a group");
      return;
    }

    if (
      !formData.name.trim() ||
      !formData.neighborhood ||
      !formData.vibe ||
      !formData.lookingFor
    ) {
      setError("Please fill in all fields");
      return;
    }

    setIsCreating(true);
    setError("");

    const result = await createGroup(user.id, {
      ...formData,
      name: formData.name.trim(),
    });

    if (result.success && result.group) {
      onGroupCreated(result.group);
    } else {
      setError(result.error || "Failed to create group");
    }

    setIsCreating(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">
            Create Group
          </h1>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-black">
                Group Name *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="The Squad"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="chat-input text-black"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="size" className="text-black">
                Group Size *
              </Label>
              <Select
                value={formData.groupSize.toString()}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    groupSize: Number.parseInt(value),
                  }))
                }
              >
                <SelectTrigger className="chat-input text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8].map((size) => (
                    <SelectItem
                      key={size}
                      value={size.toString()}
                      className="text-black"
                    >
                      {size} people
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="neighborhood" className="text-black">
                Neighborhood *
              </Label>
              <Select
                value={formData.neighborhood}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, neighborhood: value }))
                }
              >
                <SelectTrigger className="chat-input text-black">
                  <SelectValue placeholder="Select neighborhood" />
                </SelectTrigger>
                <SelectContent>
                  {NEIGHBORHOODS.map((neighborhood) => (
                    <SelectItem
                      key={neighborhood}
                      value={neighborhood}
                      className="text-black"
                    >
                      {neighborhood}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vibe" className="text-black">
                Vibe *
              </Label>
              <Select
                value={formData.vibe}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, vibe: value }))
                }
              >
                <SelectTrigger className="chat-input text-black">
                  <SelectValue placeholder="Select vibe" />
                </SelectTrigger>
                <SelectContent>
                  {VIBES.map((vibe) => (
                    <SelectItem key={vibe} value={vibe} className="text-black">
                      {vibe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lookingFor" className="text-black">
                Looking For *
              </Label>
              <Select
                value={formData.lookingFor}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, lookingFor: value }))
                }
              >
                <SelectTrigger className="chat-input text-black">
                  <SelectValue placeholder="What are you looking for?" />
                </SelectTrigger>
                <SelectContent>
                  {LOOKING_FOR_OPTIONS.map((option) => (
                    <SelectItem
                      key={option}
                      value={option}
                      className="text-black"
                    >
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isCreating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isCreating ? "Creating Group..." : "Create Group"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
