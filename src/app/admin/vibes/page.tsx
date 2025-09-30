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
import type { Vibe } from '@/lib/types';
import { AddVibeDialog } from '@/components/admin/add-vibe-dialog';
import { EditVibeDialog } from '@/components/admin/edit-vibe-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';

export default function AdminVibesPage() {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingVibe, setEditingVibe] = useState<Vibe | null>(null);
  const [deletingVibe, setDeletingVibe] = useState<Vibe | null>(null);
  const { toast } = useToast();

  const fetchVibes = async () => {
    try {
      const q = query(collection(db, 'vibes'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const vibesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Vibe[];
      setVibes(vibesData);
    } catch (error) {
      console.error('Error fetching vibes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch vibes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVibes();
  }, []);

  const handleVibeAdded = () => {
    fetchVibes();
    toast({
      title: 'Success',
      description: 'Vibe added successfully.',
    });
  };

  const handleVibeUpdated = () => {
    fetchVibes();
    setEditingVibe(null);
    toast({
      title: 'Success',
      description: 'Vibe updated successfully.',
    });
  };

  const handleDeleteVibe = async () => {
    if (!deletingVibe) return;

    try {
      await deleteDoc(doc(db, 'vibes', deletingVibe.id));
      fetchVibes();
      setDeletingVibe(null);
      toast({
        title: 'Success',
        description: 'Vibe deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting vibe:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete vibe.',
        variant: 'destructive',
      });
    }
  };

  const filteredVibes = vibes.filter(vibe =>
    vibe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vibe.description && vibe.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading vibes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vibes</h1>
          <p className="text-muted-foreground">
            Manage vibe options for group creation
          </p>
        </div>
        <AddVibeDialog onVibeAdded={handleVibeAdded} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Vibes</CardTitle>
          <CardDescription>
            {vibes.length} vibe{vibes.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vibes..."
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
                {filteredVibes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No vibes match your search.' : 'No vibes found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVibes.map((vibe) => (
                    <TableRow key={vibe.id}>
                      <TableCell className="font-medium">
                        {vibe.name}
                      </TableCell>
                      <TableCell>
                        {vibe.description ? (
                          <span className="text-sm text-muted-foreground">
                            {vibe.description}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            No description
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {vibe.createdAt instanceof Date 
                            ? vibe.createdAt.toLocaleDateString()
                            : new Date(vibe.createdAt.seconds * 1000).toLocaleDateString()
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingVibe(vibe)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingVibe(vibe)}
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

      {editingVibe && (
        <EditVibeDialog
          vibe={editingVibe}
          open={!!editingVibe}
          onOpenChange={(open) => !open && setEditingVibe(null)}
          onVibeUpdated={handleVibeUpdated}
        />
      )}

      {deletingVibe && (
        <DeleteConfirmDialog
          open={!!deletingVibe}
          onOpenChange={(open) => !open && setDeletingVibe(null)}
          onConfirm={handleDeleteVibe}
          title="Delete Vibe"
          description={`Are you sure you want to delete "${deletingVibe.name}"? This action cannot be undone.`}
        />
      )}
    </div>
  );
}
