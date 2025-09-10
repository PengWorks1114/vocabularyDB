import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  Timestamp,
  writeBatch,
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
  relatedWords?: {
    same?: string;
    opposite?: string;
  };
  usageFrequency: number;
  mastery: number;
  note: string;
  wordbookId: string;
  createdAt: Timestamp;
  reviewDate?: Timestamp | null;
  studyCount?: number;
}

// Custom part-of-speech tags
export interface PartOfSpeechTag {
  id: string;
  name: string;
  color: string;
  userId: string;
}

// simple in-memory cache to avoid repeated reads for the same wordbook
const wordCache: Record<string, Word[]> = {};
const makeCacheKey = (userId: string, wordbookId: string) => `${userId}_${wordbookId}`;
const posTagCache: Record<string, PartOfSpeechTag[]> = {};

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
  const key = makeCacheKey(userId, wordbookId);
  if (wordCache[key]) return wordCache[key];
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
  wordCache[key] = words;
  return words;
};

// Create word
export const createWord = async (
  userId: string,
  wordbookId: string,
  wordData: Omit<Word, "id" | "createdAt" | "wordbookId" | "reviewDate" | "studyCount">
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
    reviewDate: null,
    studyCount: 0,
  });
  const newWord = {
    id: docRef.id,
    ...wordData,
    wordbookId,
    createdAt: Timestamp.now(),
    reviewDate: null,
    studyCount: 0,
  } as Word;
  const key = makeCacheKey(userId, wordbookId);
  if (wordCache[key]) wordCache[key].push(newWord);
  return newWord;
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
  const key = makeCacheKey(userId, wordbookId);
  if (wordCache[key]) {
    wordCache[key] = wordCache[key].map((w) =>
      w.id === wordId ? { ...w, ...updateData } : w
    );
  }
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
  const key = makeCacheKey(userId, wordbookId);
  if (wordCache[key]) {
    wordCache[key] = wordCache[key].filter((w) => w.id !== wordId);
  }
};

// Bulk import words
export const bulkImportWords = async (
  userId: string,
  wordbookId: string,
  data: Omit<
    Word,
    "id" | "createdAt" | "wordbookId" | "reviewDate" | "studyCount"
  >[]
): Promise<Word[]> => {
  const colRef = collection(
    db,
    "users",
    userId,
    "wordbooks",
    wordbookId,
    "words"
  );
  const batch = writeBatch(db);
  const createdAt = Timestamp.now();
  const newWords: Word[] = [];
  data.forEach((d) => {
    const docRef = doc(colRef);
    const word: Word = {
      id: docRef.id,
      ...d,
      wordbookId,
      createdAt,
      reviewDate: null,
      studyCount: 0,
    };
    batch.set(docRef, word);
    newWords.push(word);
  });
  await batch.commit();
  const key = makeCacheKey(userId, wordbookId);
  if (wordCache[key]) wordCache[key].push(...newWords);
  else wordCache[key] = [...newWords];
  return newWords;
};

// Reset progress for multiple words
export const resetWordsProgress = async (
  userId: string,
  wordbookId: string,
  ids: string[]
): Promise<void> => {
  const batch = writeBatch(db);
  ids.forEach((id) => {
    const ref = doc(
      db,
      "users",
      userId,
      "wordbooks",
      wordbookId,
      "words",
      id
    );
    batch.update(ref, { mastery: 0, studyCount: 0, reviewDate: null });
  });
  await batch.commit();
  const key = makeCacheKey(userId, wordbookId);
  if (wordCache[key]) {
    wordCache[key] = wordCache[key].map((w) =>
      ids.includes(w.id) ? { ...w, mastery: 0, studyCount: 0, reviewDate: null } : w
    );
  }
};

// Bulk delete words
export const bulkDeleteWords = async (
  userId: string,
  wordbookId: string,
  ids: string[]
): Promise<void> => {
  const batch = writeBatch(db);
  ids.forEach((id) => {
    const ref = doc(
      db,
      "users",
      userId,
      "wordbooks",
      wordbookId,
      "words",
      id
    );
    batch.delete(ref);
  });
  await batch.commit();
  const key = makeCacheKey(userId, wordbookId);
  if (wordCache[key]) {
    wordCache[key] = wordCache[key].filter((w) => !ids.includes(w.id));
  }
};

// ------------------- Part-of-speech tag CRUD -------------------

// Get all part-of-speech tags for a user
export const getPartOfSpeechTags = async (
  userId: string
): Promise<PartOfSpeechTag[]> => {
  if (posTagCache[userId]) return posTagCache[userId];
  const colRef = collection(db, "users", userId, "posTags");
  const snapshot = await getDocs(colRef);
  const tags: PartOfSpeechTag[] = [];
  snapshot.forEach((docSnap) => {
    tags.push({ id: docSnap.id, ...docSnap.data() } as PartOfSpeechTag);
  });
  posTagCache[userId] = tags;
  return tags;
};

// Create part-of-speech tag
export const createPartOfSpeechTag = async (
  userId: string,
  data: Omit<PartOfSpeechTag, "id" | "userId">
): Promise<PartOfSpeechTag> => {
  const colRef = collection(db, "users", userId, "posTags");
  const docRef = await addDoc(colRef, { ...data, userId });
  const tag = { id: docRef.id, ...data, userId } as PartOfSpeechTag;
  if (posTagCache[userId]) posTagCache[userId].push(tag);
  return tag;
};

// Update part-of-speech tag
export const updatePartOfSpeechTag = async (
  userId: string,
  tagId: string,
  data: Partial<PartOfSpeechTag>
): Promise<void> => {
  const ref = doc(db, "users", userId, "posTags", tagId);
  await updateDoc(ref, data);
  if (posTagCache[userId]) {
    posTagCache[userId] = posTagCache[userId].map((t) =>
      t.id === tagId ? { ...t, ...data } : t
    );
  }
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
  if (posTagCache[userId]) {
    posTagCache[userId] = posTagCache[userId].filter((t) => t.id !== tagId);
  }
};
