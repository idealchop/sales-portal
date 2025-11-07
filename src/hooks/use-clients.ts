
'use client';

import { useMemo, useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import type { Client, Proposal } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

export function useClients(userId?: string) {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user, isUserLoading } = useUser();
  const [clients, setClients] = useState<WithId<Client>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetUserId = userId || user?.uid;

  useEffect(() => {
    const fetchClientsForUser = async () => {
      if (isFirebaseLoading || isUserLoading || !firestore || !targetUserId) {
        if(!targetUserId) setIsLoading(true);
        return;
      }
      setIsLoading(true);

      try {
        // 1. Find all proposals created by the user
        const proposalsQuery = query(
          collection(firestore, 'proposals'),
          where('userId', '==', targetUserId)
        );
        const proposalSnapshots = await getDocs(proposalsQuery);
        
        const clientIds = new Set<string>();
        proposalSnapshots.forEach(doc => {
          const proposal = doc.data() as Proposal;
          clientIds.add(proposal.clientId);
        });

        if (clientIds.size === 0) {
            setClients([]);
            setIsLoading(false);
            return;
        }

        // 2. Fetch the clients associated with those proposals
        const clientsQuery = query(
          collection(firestore, 'clients'),
          where('id', 'in', Array.from(clientIds))
        );
        const clientSnapshots = await getDocs(clientsQuery);
        
        const userClients: WithId<Client>[] = [];
        clientSnapshots.forEach(doc => {
          userClients.push({ id: doc.id, ...doc.data() } as WithId<Client>);
        });

        setClients(userClients);

      } catch (e: any) {
        setError(e);
        console.error("Error fetching clients for user:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    // A simple (and perhaps naive) alternative if collectionGroup queries are preferred but fail
    const fetchAllAndFilter = async () => {
       if (isFirebaseLoading || isUserLoading || !firestore || !targetUserId) {
        if(!targetUserId) setIsLoading(true);
        return;
      }
      setIsLoading(true);
      try {
         const clientsQuery = query(collection(firestore, 'clients'));
         const clientsSnapshot = await getDocs(clientsQuery);
         const allClients: WithId<Client>[] = [];
         clientsSnapshot.forEach(doc => {
            allClients.push({ id: doc.id, ...doc.data() } as WithId<Client>)
         });
         
         const proposalsQuery = query(collection(firestore, 'proposals'), where('userId', '==', targetUserId));
         const proposalsSnapshot = await getDocs(proposalsQuery);
         const clientIds = new Set(proposalsSnapshot.docs.map(doc => (doc.data() as Proposal).clientId));

         const filteredClients = allClients.filter(client => clientIds.has(client.id));
         setClients(filteredClients);
      } catch (e: any) {
        setError(e);
        console.error("Error fetching and filtering clients:", e);
      } finally {
        setIsLoading(false);
      }
    }


    // This logic is flawed because collectionGroup queries can't be combined with `where` on a different field.
    // I am leaving the original logic commented out as a reference to the problem, and implementing a new one.
    // fetchClientsForUser();
    
    // Instead, we will use a collectionGroup query on proposals and then fetch clients individually or in batches.
    // This is more complex but works around Firestore limitations. Let's try a different approach:
    // fetch all clients, and all of the user's proposals, then filter clients locally. This is less efficient on the client
    // but simpler to implement without major backend changes.
     const fetchProposalsAndFilterClients = async () => {
      if (isFirebaseLoading || isUserLoading || !firestore || !targetUserId) {
        if(!targetUserId) setIsLoading(true);
        return;
      }
      setIsLoading(true);
      try {
        const proposalsQuery = query(collection(firestore, "proposals"), where("userId", "==", targetUserId));
        const proposalsSnapshot = await getDocs(proposalsQuery);
        const clientIds = [...new Set(proposalsSnapshot.docs.map(doc => doc.data().clientId))];

        if (clientIds.length === 0) {
          setClients([]);
          setIsLoading(false);
          return;
        }

        // Firestore 'in' query is limited to 30 items. If there are more, we need to batch.
        const clientPromises = [];
        for (let i = 0; i < clientIds.length; i += 30) {
          const batchIds = clientIds.slice(i, i + 30);
          const clientsQuery = query(collection(firestore, "clients"), where('id', 'in', batchIds));
          clientPromises.push(getDocs(clientsQuery));
        }
        
        const clientSnapshots = await Promise.all(clientPromises);
        const fetchedClients: WithId<Client>[] = [];
        clientSnapshots.forEach(snapshot => {
          snapshot.forEach(doc => {
            fetchedClients.push({ id: doc.id, ...doc.data() } as WithId<Client>);
          });
        });
        
        setClients(fetchedClients);
      } catch(e: any) {
         setError(e);
        console.error("Error fetching clients based on user's proposals:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposalsAndFilterClients();


  }, [firestore, targetUserId, isUserLoading, isFirebaseLoading]);


  return { clients, isLoading: isLoading || isFirebaseLoading || isUserLoading, error };
}
