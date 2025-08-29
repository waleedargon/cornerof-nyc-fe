"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { sendVerificationCode, verifyCode } from "@/lib/auth";

interface PhoneVerificationProps {
  phoneNumber: string;
  onVerified: () => void;
  onBack: () => void;
}

export function PhoneVerification({
  phoneNumber,
  onVerified,
  onBack,
}: PhoneVerificationProps) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (code.length !== 4) return;

    setIsVerifying(true);
    setError("");

    const result = await verifyCode(phoneNumber, code);

    if (result.success) {
      onVerified();
    } else {
      setError(result.error || "Verification failed");
    }

    setIsVerifying(false);
  };

  const handleResend = async () => {
    setIsResending(true);
    await sendVerificationCode(phoneNumber);
    setIsResending(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5 text-black" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">
            Verify Phone
          </h1>
        </div>

        <Card className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              We sent a 4-digit code to
            </p>
            <p className="font-medium text-black">{phoneNumber}</p>
          </div>

          <div className="space-y-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="0000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-widest chat-input"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>

          <Button
            onClick={handleVerify}
            disabled={code.length !== 4 || isVerifying}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-black"
          >
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={isResending}
              className="text-sm text-primary hover:text-primary/80"
            >
              {isResending ? "Sending..." : "Resend code"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
