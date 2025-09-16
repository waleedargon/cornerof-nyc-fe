'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Flag, User, Calendar, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { getReportsForAdmin } from '@/lib/actions';
import type { Report } from '@/lib/types';

export default function ReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || authLoading) return;

    const fetchReports = async () => {
      setLoading(true);
      try {
        const userReports = await getReportsForAdmin(user.id);
        setReports(userReports);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user, authLoading]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    try {
      // Handle Firestore Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  const getReasonBadgeColor = (reason: string) => {
    switch (reason) {
      case 'spam':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inappropriate':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'harassment':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'spam':
        return 'Spam';
      case 'inappropriate':
        return 'Inappropriate';
      case 'harassment':
        return 'Harassment';
      case 'other':
        return 'Other';
      default:
        return reason;
    }
  };

  if (authLoading || loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/home')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <h1 className="text-lg font-semibold">Message Reports</h1>
            <p className="text-sm text-gray-500">Review flagged messages from your groups</p>
          </div>
          
          <div className="w-8" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {reports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Flag className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports</h3>
              <p className="text-sm text-gray-500 text-center">
                No messages have been reported in your groups yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Flag className="h-4 w-4 text-red-500" />
                      Message Reported
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(report.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Reported by: {(report.reportedBy as any)?.name || 'Unknown'}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getReasonBadgeColor(report.reason)}
                  >
                    {getReasonLabel(report.reason)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Reported User:</h4>
                  <p className="text-sm text-gray-600">
                    {(report.reportedUser as any)?.name || 'Unknown User'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Message Content:
                  </h4>
                  <div className="bg-gray-50 p-3 rounded-md border">
                    <p className="text-sm text-gray-700 italic">
                      "Message content not available"
                    </p>
                  </div>
                </div>

                {report.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Additional Details:</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
                      {report.description}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-gray-500">
                    Report ID: {report.id.slice(0, 8)}...
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {report.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="text-center space-y-1">
            <Skeleton className="h-5 w-32 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
          <div className="w-8" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div>
                <Skeleton className="h-4 w-28 mb-2" />
                <div className="bg-gray-50 p-3 rounded-md border">
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
