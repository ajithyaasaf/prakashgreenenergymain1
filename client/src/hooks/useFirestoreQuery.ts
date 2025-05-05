import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  query, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  QueryConstraint, 
  serverTimestamp,
  DocumentData,
  DocumentReference 
} from 'firebase/firestore';
import { firestore } from '@/firebase/config';

// Hook for fetching a collection with caching
export function useFirestoreCollection<T>(
  collectionName: string,
  queryConstraints: QueryConstraint[] = [],
  options = {}
) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['firestore', collectionName, queryConstraints],
    queryFn: async () => {
      const q = query(collection(firestore, collectionName), ...queryConstraints);
      const querySnapshot = await getDocs(q);
      
      const results: T[] = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as T);
      });
      
      return results;
    },
    ...options
  });
}

// Hook for fetching a single document with caching
export function useFirestoreDocument<T>(
  collectionName: string,
  documentId: string | null,
  options = {}
) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['firestore', collectionName, documentId],
    queryFn: async () => {
      if (!documentId) return null;
      
      const docRef = doc(firestore, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      
      return null;
    },
    enabled: !!documentId,
    ...options
  });
}

// Mutation hook for adding a document
export function useAddDocument<T extends DocumentData>(collectionName: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: T) => {
      const dataWithTimestamp = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(firestore, collectionName), dataWithTimestamp);
      return docRef.id;
    },
    onSuccess: () => {
      // Invalidate the collection query to refetch data
      queryClient.invalidateQueries({ queryKey: ['firestore', collectionName] });
    }
  });
}

// Mutation hook for updating a document
export function useUpdateDocument<T extends DocumentData>(collectionName: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      const docRef = doc(firestore, collectionName, id);
      const dataWithTimestamp = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(docRef, dataWithTimestamp);
      return id;
    },
    onSuccess: (id) => {
      // Invalidate both the collection and the specific document
      queryClient.invalidateQueries({ queryKey: ['firestore', collectionName] });
      queryClient.invalidateQueries({ queryKey: ['firestore', collectionName, id] });
    }
  });
}

// Mutation hook for deleting a document
export function useDeleteDocument(collectionName: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(firestore, collectionName, id);
      await deleteDoc(docRef);
      return id;
    },
    onSuccess: (id) => {
      // Invalidate both the collection and the specific document
      queryClient.invalidateQueries({ queryKey: ['firestore', collectionName] });
      queryClient.invalidateQueries({ queryKey: ['firestore', collectionName, id] });
    }
  });
}

// Prefetch utilities for better performance
export const firestoreQueryUtils = {
  // Prefetch a collection
  prefetchCollection: async <T>(
    queryClient: any,
    collectionName: string,
    queryConstraints: QueryConstraint[] = []
  ) => {
    const q = query(collection(firestore, collectionName), ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    const results: T[] = [];
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() } as T);
    });
    
    queryClient.setQueryData(['firestore', collectionName, queryConstraints], results);
    return results;
  },
  
  // Prefetch a document
  prefetchDocument: async <T>(
    queryClient: any,
    collectionName: string,
    documentId: string
  ) => {
    const docRef = doc(firestore, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = { id: docSnap.id, ...docSnap.data() } as T;
      queryClient.setQueryData(['firestore', collectionName, documentId], data);
      return data;
    }
    
    return null;
  }
};