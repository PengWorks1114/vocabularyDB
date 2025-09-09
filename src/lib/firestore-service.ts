import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Define wordbook type
export interface Wordbook {
  id: string;
  name: string;
  createdAt: Timestamp;
  userId: string;
  trashed?: boolean;
  trashedAt?: Timestamp | null;
}

// Define word type
export interface Word {
  id: string;
  word: string;
  pinyin: string;
  favorite: boolean;
  translation: string;
  partOfSpeech: string[];
  exampleSentence: string;
  exampleTranslation: string;
  relatedWords: string;
  usageFrequency: number;
  mastery: number;
  note: string;
  wordbookId: string;
  createdAt: Timestamp;
}

// Custom part-of-speech tags
export interface PartOfSpeechTag {
  id: string;
  name: string;
  color: string;
  userId: string;
}

// Get all wordbooks for a user
export const getWordbooksByUserId = async (
  userId: string
): Promise<Wordbook[]> => {
  const colRef = collection(db, "users", userId, "wordbooks");
  const querySnapshot = await getDocs(colRef);
  const wordbooks: Wordbook[] = [];
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Wordbook, "id">;
    if (!data.trashed) wordbooks.push({ id: docSnap.id, ...data });
  });
  return wordbooks;
};

// Create a new wordbook
export const createWordbook = async (
  userId: string,
  name: string
): Promise<Wordbook> => {
  const colRef = collection(db, "users", userId, "wordbooks");
  const docRef = await addDoc(colRef, {
    name,
    userId,
    createdAt: Timestamp.now(),
    trashed: false,
    trashedAt: null,
  });
  return {
    id: docRef.id,
    name,
    userId,
    createdAt: Timestamp.now(),
    trashed: false,
    trashedAt: null,
  };
};

// Permanently delete a wordbook
export const deleteWordbook = async (
  userId: string,
  wordbookId: string
): Promise<void> => {
  const docRef = doc(db, "users", userId, "wordbooks", wordbookId);
  const wordsRef = collection(docRef, "words");
  const wordsSnap = await getDocs(wordsRef);
  await Promise.all(wordsSnap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(docRef);
};

// Move a wordbook to trash
export const trashWordbook = async (
  userId: string,
  wordbookId: string
): Promise<void> => {
  const docRef = doc(db, "users", userId, "wordbooks", wordbookId);
  await updateDoc(docRef, { trashed: true, trashedAt: Timestamp.now() });
};

// Get a user's wordbooks in trash
export const getTrashedWordbooksByUserId = async (
  userId: string
): Promise<Wordbook[]> => {
  const colRef = collection(db, "users", userId, "wordbooks");
  const snapshot = await getDocs(colRef);
  const wordbooks: Wordbook[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Wordbook, "id">;
    if (data.trashed) wordbooks.push({ id: docSnap.id, ...data });
  });
  return wordbooks;
};

// Empty trash
export const clearTrashedWordbooks = async (userId: string): Promise<void> => {
  const trashed = await getTrashedWordbooksByUserId(userId);
  await Promise.all(
    trashed.map((wb) => deleteWordbook(userId, wb.id))
  );
};

// Update wordbook name
export const updateWordbookName = async (
  userId: string,
  wordbookId: string,
  newName: string
): Promise<void> => {
  const wordbookRef = doc(db, "users", userId, "wordbooks", wordbookId);
  await updateDoc(wordbookRef, { name: newName });
};

// Get a single wordbook's info
export const getWordbook = async (
  userId: string,
  wordbookId: string
): Promise<Wordbook | null> => {
  const ref = doc(db, "users", userId, "wordbooks", wordbookId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<Wordbook, "id">;
  return { id: snap.id, ...data };
};

// ------------------- Word CRUD -------------------

// Get all words for a wordbook
export const getWordsByWordbookId = async (
  userId: string,
  wordbookId: string
): Promise<Word[]> => {
  const colRef = collection(
    db,
    "users",
    userId,
    "wordbooks",
    wordbookId,
    "words"
  );
  const snapshot = await getDocs(colRef);
  const words: Word[] = [];
  snapshot.forEach((docSnap) => {
    words.push({ id: docSnap.id, ...docSnap.data() } as Word);
  });
  return words;
};

// Create word
export const createWord = async (
  userId: string,
  wordbookId: string,
  wordData: Omit<Word, "id" | "createdAt" | "wordbookId">
): Promise<Word> => {
  const colRef = collection(
    db,
    "users",
    userId,
    "wordbooks",
    wordbookId,
    "words"
  );
  const docRef = await addDoc(colRef, {
    ...wordData,
    wordbookId,
    createdAt: Timestamp.now(),
  });
  return {
    id: docRef.id,
    ...wordData,
    wordbookId,
    createdAt: Timestamp.now(),
  };
};

// Update word
export const updateWord = async (
  userId: string,
  wordbookId: string,
  wordId: string,
  updateData: Partial<Word>
): Promise<void> => {
  const ref = doc(
    db,
    "users",
    userId,
    "wordbooks",
    wordbookId,
    "words",
    wordId
  );
  await updateDoc(ref, updateData);
};

// Delete word
export const deleteWord = async (
  userId: string,
  wordbookId: string,
  wordId: string
): Promise<void> => {
  const ref = doc(
    db,
    "users",
    userId,
    "wordbooks",
    wordbookId,
    "words",
    wordId
  );
  await deleteDoc(ref);
};

// ------------------- Part-of-speech tag CRUD -------------------

// Get all part-of-speech tags for a user
export const getPartOfSpeechTags = async (
  userId: string
): Promise<PartOfSpeechTag[]> => {
  const colRef = collection(db, "users", userId, "posTags");
  const snapshot = await getDocs(colRef);
  const tags: PartOfSpeechTag[] = [];
  snapshot.forEach((docSnap) => {
    tags.push({ id: docSnap.id, ...docSnap.data() } as PartOfSpeechTag);
  });
  return tags;
};

// Create part-of-speech tag
export const createPartOfSpeechTag = async (
  userId: string,
  data: Omit<PartOfSpeechTag, "id" | "userId">
): Promise<PartOfSpeechTag> => {
  const colRef = collection(db, "users", userId, "posTags");
  const docRef = await addDoc(colRef, { ...data, userId });
  return { id: docRef.id, ...data, userId };
};

// Update part-of-speech tag
export const updatePartOfSpeechTag = async (
  userId: string,
  tagId: string,
  data: Partial<PartOfSpeechTag>
): Promise<void> => {
  const ref = doc(db, "users", userId, "posTags", tagId);
  await updateDoc(ref, data);
};

// Delete part-of-speech tag
export const deletePartOfSpeechTag = async (
  userId: string,
  tagId: string
): Promise<void> => {
  const tagRef = doc(db, "users", userId, "posTags", tagId);

  // Remove the tag from any words that reference it
  const wordbooksRef = collection(db, "users", userId, "wordbooks");
  const wordbooksSnap = await getDocs(wordbooksRef);
  await Promise.all(
    wordbooksSnap.docs.map(async (wb) => {
      const wordsRef = collection(
        db,
        "users",
        userId,
        "wordbooks",
        wb.id,
        "words"
      );
      const wordsSnap = await getDocs(
        query(wordsRef, where("partOfSpeech", "array-contains", tagId))
      );
      await Promise.all(
        wordsSnap.docs.map((docSnap) => {
          const data = docSnap.data();
          const updated = (data.partOfSpeech || []).filter(
            (t: string) => t !== tagId
          );
          return updateDoc(docSnap.ref, { partOfSpeech: updated });
        })
      );
    })
  );

  await deleteDoc(tagRef);
};
