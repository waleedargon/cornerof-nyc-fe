import { collection, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/firebase";
import type { Venue } from "@/lib/types";
import { AddVenueDialog } from "@/components/admin/add-venue-dialog";
import { VenueActions } from "@/components/admin/venue-actions";

async function getVenues(): Promise<Venue[]> {
  const venuesCol = collection(db, 'venues');
  const venueSnapshot = await getDocs(venuesCol);
  const venueList = venueSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venue));
  return venueList;
}

export default async function AdminVenuesPage() {
  const venues = await getVenues();

  return (
    <Card>
       <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
            <CardTitle>Venues</CardTitle>
            <CardDescription>Manage venues for AI suggestions.</CardDescription>
        </div>
        <div className="ml-auto">
            <AddVenueDialog />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Neighborhood</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {venues.map((venue) => (
              <TableRow key={venue.id}>
                <TableCell className="font-medium">{venue.name}</TableCell>
                <TableCell>{venue.neighborhood}</TableCell>
                <TableCell>
                  <VenueActions venue={venue} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
