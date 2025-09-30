'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type { Neighborhood } from '@/lib/types';
import { AddNeighborhoodDialog } from '@/components/admin/add-neighborhood-dialog';
import { EditNeighborhoodDialog } from '@/components/admin/edit-neighborhood-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';

export default function AdminNeighborhoodsPage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNeighborhood, setEditingNeighborhood] = useState<Neighborhood | null>(null);
  const [deletingNeighborhood, setDeletingNeighborhood] = useState<Neighborhood | null>(null);
  const { toast } = useToast();

  const fetchNeighborhoods = async () => {
    try {
      const q = query(collection(db, 'neighborhoods'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const neighborhoodsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Neighborhood[];
      setNeighborhoods(neighborhoodsData);
    } catch (error) {
      console.error('Error fetching neighborhoods:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch neighborhoods.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNeighborhoods();
  }, []);

  const handleNeighborhoodAdded = () => {
    fetchNeighborhoods();
    toast({
      title: 'Success',
      description: 'Neighborhood added successfully.',
    });
  };

  const handleNeighborhoodUpdated = () => {
    fetchNeighborhoods();
    setEditingNeighborhood(null);
    toast({
      title: 'Success',
      description: 'Neighborhood updated successfully.',
    });
  };

  const handleDeleteNeighborhood = async () => {
    if (!deletingNeighborhood) return;

    try {
      await deleteDoc(doc(db, 'neighborhoods', deletingNeighborhood.id));
      fetchNeighborhoods();
      setDeletingNeighborhood(null);
      toast({
        title: 'Success',
        description: 'Neighborhood deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting neighborhood:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete neighborhood.',
        variant: 'destructive',
      });
    }
  };

  const filteredNeighborhoods = neighborhoods.filter(neighborhood =>
    neighborhood.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (neighborhood.description && neighborhood.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading neighborhoods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Neighborhoods</h1>
          <p className="text-muted-foreground">
            Manage neighborhood options for group creation
          </p>
        </div>
        <AddNeighborhoodDialog onNeighborhoodAdded={handleNeighborhoodAdded} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Neighborhoods</CardTitle>
          <CardDescription>
            {neighborhoods.length} neighborhood{neighborhoods.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search neighborhoods..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNeighborhoods.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No neighborhoods match your search.' : 'No neighborhoods found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNeighborhoods.map((neighborhood) => (
                    <TableRow key={neighborhood.id}>
                      <TableCell className="font-medium">
                        {neighborhood.name}
                      </TableCell>
                      <TableCell>
                        {neighborhood.description ? (
                          <span className="text-sm text-muted-foreground">
                            {neighborhood.description}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            No description
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {neighborhood.createdAt instanceof Date 
                            ? neighborhood.createdAt.toLocaleDateString()
                            : new Date(neighborhood.createdAt.seconds * 1000).toLocaleDateString()
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingNeighborhood(neighborhood)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingNeighborhood(neighborhood)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingNeighborhood && (
        <EditNeighborhoodDialog
          neighborhood={editingNeighborhood}
          open={!!editingNeighborhood}
          onOpenChange={(open) => !open && setEditingNeighborhood(null)}
          onNeighborhoodUpdated={handleNeighborhoodUpdated}
        />
      )}

      {deletingNeighborhood && (
        <DeleteConfirmDialog
          open={!!deletingNeighborhood}
          onOpenChange={(open) => !open && setDeletingNeighborhood(null)}
          onConfirm={handleDeleteNeighborhood}
          title="Delete Neighborhood"
          description={`Are you sure you want to delete "${deletingNeighborhood.name}"? This action cannot be undone.`}
        />
      )}
    </div>
  );
}
