'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, RefreshCw, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { db } from '@/lib/firebase';
import type { AdminLog } from '@/lib/types';
import { cn } from '@/lib/utils';

const LOGS_PER_PAGE = 50;

const actionColors: Record<string, string> = {
  group_created: 'bg-green-100 text-green-800',
  group_deleted: 'bg-red-100 text-red-800',
  match_created: 'bg-blue-100 text-blue-800',
  match_deleted: 'bg-red-100 text-red-800',
  user_joined_group: 'bg-green-100 text-green-800',
  user_left_group: 'bg-yellow-100 text-yellow-800',
  message_sent: 'bg-gray-100 text-gray-800',
  message_reported: 'bg-orange-100 text-orange-800',
  venue_created: 'bg-purple-100 text-purple-800',
  venue_updated: 'bg-blue-100 text-blue-800',
  venue_deleted: 'bg-red-100 text-red-800',
  neighborhood_created: 'bg-green-100 text-green-800',
  neighborhood_updated: 'bg-blue-100 text-blue-800',
  neighborhood_deleted: 'bg-red-100 text-red-800',
  vibe_created: 'bg-green-100 text-green-800',
  vibe_updated: 'bg-blue-100 text-blue-800',
  vibe_deleted: 'bg-red-100 text-red-800',
};

const actionLabels: Record<string, string> = {
  group_created: 'Group Created',
  group_deleted: 'Group Deleted',
  match_created: 'Match Created',
  match_deleted: 'Match Deleted',
  user_joined_group: 'User Joined',
  user_left_group: 'User Left',
  message_sent: 'Message Sent',
  message_reported: 'Message Reported',
  venue_created: 'Venue Created',
  venue_updated: 'Venue Updated',
  venue_deleted: 'Venue Deleted',
  neighborhood_created: 'Area Created',
  neighborhood_updated: 'Area Updated',
  neighborhood_deleted: 'Area Deleted',
  vibe_created: 'Vibe Created',
  vibe_updated: 'Vibe Updated',
  vibe_deleted: 'Vibe Deleted',
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = async (isRefresh = false, loadMore = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setCurrentPage(1);
        setLastDoc(null);
      } else {
        setLoading(true);
      }

      let q = query(
        collection(db, 'admin_logs'),
        orderBy('timestamp', 'desc'),
        limit(LOGS_PER_PAGE + 1) // Fetch one extra to check if there are more
      );

      if (loadMore && lastDoc) {
        q = query(
          collection(db, 'admin_logs'),
          orderBy('timestamp', 'desc'),
          startAfter(lastDoc),
          limit(LOGS_PER_PAGE + 1)
        );
      }

      const querySnapshot = await getDocs(q);
      const fetchedLogs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AdminLog[];

      // Check if there are more logs
      const hasMoreLogs = fetchedLogs.length > LOGS_PER_PAGE;
      if (hasMoreLogs) {
        fetchedLogs.pop(); // Remove the extra log
      }

      if (loadMore) {
        setLogs(prev => [...prev, ...fetchedLogs]);
        setCurrentPage(prev => prev + 1);
      } else {
        setLogs(fetchedLogs);
      }

      setHasMore(hasMoreLogs);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - (hasMoreLogs ? 2 : 1)] || null);

    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.groupName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const formatTimestamp = (timestamp: any) => {
    const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString();
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchLogs(false, true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
          <p className="text-muted-foreground">
            Monitor system activities and user actions
          </p>
        </div>
        <Button
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search logs by user, group, or details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="group_created">Group Created</SelectItem>
                  <SelectItem value="group_deleted">Group Deleted</SelectItem>
                  <SelectItem value="match_created">Match Created</SelectItem>
                  <SelectItem value="match_deleted">Match Deleted</SelectItem>
                  <SelectItem value="user_joined_group">User Joined</SelectItem>
                  <SelectItem value="user_left_group">User Left</SelectItem>
                  <SelectItem value="message_sent">Message Sent</SelectItem>
                  <SelectItem value="message_reported">Message Reported</SelectItem>
                  <SelectItem value="venue_created">Venue Created</SelectItem>
                  <SelectItem value="venue_updated">Venue Updated</SelectItem>
                  <SelectItem value="venue_deleted">Venue Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">
              Recent activities
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Matching your filters
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && logs.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No logs found matching your criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Badge className={cn("shrink-0", actionColors[log.action] || "bg-gray-100 text-gray-800")}>
                    {actionLabels[log.action] || log.action}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {log.details}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{formatTimestamp(log.timestamp)}</span>
                      {log.userName && <span>by {log.userName}</span>}
                      {log.groupName && <span>in {log.groupName}</span>}
                    </div>
                  </div>
                </div>
              ))}
              
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={loadMore}
                    disabled={loading}
                    variant="outline"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Load More
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
