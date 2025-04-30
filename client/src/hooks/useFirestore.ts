import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  QueryConstraint,
  DocumentData,
  Firestore,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import { firestore } from "@/firebase/config";
import { useToast } from "@/hooks/use-toast";

// Custom hook to provide Firestore functions
export function useFirestore() {
  return { ...firestoreService };
}

// General Firestore hooks
export function useCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  dependencies: any[] = []
) {
  const [documents, setDocuments] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const q = query(collection(firestore, collectionName), ...constraints);
        const querySnapshot = await getDocs(q);
        
        const results: T[] = [];
        querySnapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() } as T);
        });
        
        setDocuments(results);
        setError(null);
      } catch (err: any) {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err.message);
        toast({
          title: `Error Fetching Data`,
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, ...dependencies]);

  return { documents, loading, error };
}

export function useDocument<T>(collectionName: string, id: string | null) {
  const [document, setDocument] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) {
        setDocument(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const docRef = doc(firestore, collectionName, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setDocument({ id: docSnap.id, ...docSnap.data() } as T);
        } else {
          setDocument(null);
          setError("Document not found");
        }
      } catch (err: any) {
        console.error(`Error fetching document ${id} from ${collectionName}:`, err);
        setError(err.message);
        toast({
          title: `Error Fetching Document`,
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, id]);

  return { document, loading, error };
}

// CRUD operations
export const firestoreService = {
  getAll: async <T>(collectionName: string, constraints: QueryConstraint[] = []): Promise<T[]> => {
    const q = query(collection(firestore, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const results: T[] = [];
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() } as T);
    });
    
    return results;
  },
  
  getById: async <T>(collectionName: string, id: string): Promise<T | null> => {
    const docRef = doc(firestore, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    } else {
      return null;
    }
  },
  
  add: async <T extends DocumentData>(collectionName: string, data: T): Promise<string> => {
    const dataWithTimestamp = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(firestore, collectionName), dataWithTimestamp);
    return docRef.id;
  },
  
  update: async <T extends DocumentData>(collectionName: string, id: string, data: Partial<T>): Promise<void> => {
    const docRef = doc(firestore, collectionName, id);
    const dataWithTimestamp = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, dataWithTimestamp);
  },
  
  delete: async (collectionName: string, id: string): Promise<void> => {
    const docRef = doc(firestore, collectionName, id);
    await deleteDoc(docRef);
  }
};
