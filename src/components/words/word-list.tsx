"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  getWordsByWordbookId,
  createWord,
  updateWord,
  deleteWord,
  getPartOfSpeechTags,
  createPartOfSpeechTag,
  updatePartOfSpeechTag,
  deletePartOfSpeechTag,
  type Word,
  type PartOfSpeechTag,
} from "@/lib/firestore-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Heart, Star, ChevronUp, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MemorizeSettings } from "@/components/study/MemorizeSettings";

function masteryLevelMin(score: number) {
  if (score >= 90) return 90;
  if (score >= 50) return 50;
  if (score >= 25) return 25;
  return 0;
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const full = value >= i + 1;
        const half = !full && value >= i + 0.5;
        return (
          <button
            key={i}
            type="button"
            className="relative h-5 w-5"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const v = i + (x < rect.width / 2 ? 0.5 : 1);
              onChange(v === value ? 0 : v);
            }}
          >
            <Star className="h-5 w-5 text-gray-300" />
            {(full || half) && (
              <Star
                className="h-5 w-5 text-yellow-400 fill-yellow-400 absolute top-0 left-0"
                style={half ? { clipPath: "inset(0 50% 0 0)" } : {}}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface WordListProps {
  wordbookId: string;
}

const colorOptions = [
  { value: "gray", labelKey: "colors.gray" },
  { value: "brown", labelKey: "colors.brown" },
  { value: "orange", labelKey: "colors.orange" },
  { value: "yellow", labelKey: "colors.yellow" },
  { value: "green", labelKey: "colors.green" },
  { value: "blue", labelKey: "colors.blue" },
  { value: "purple", labelKey: "colors.purple" },
  { value: "pink", labelKey: "colors.pink" },
  { value: "red", labelKey: "colors.red" },
];

const colorClasses: Record<string, string> = {
  gray: "bg-gray-300 text-gray-900",
  brown: "bg-amber-700 text-amber-50",
  orange: "bg-orange-300 text-orange-900",
  yellow: "bg-yellow-300 text-yellow-900",
  green: "bg-green-300 text-green-900",
  blue: "bg-blue-300 text-blue-900",
  purple: "bg-purple-300 text-purple-900",
  pink: "bg-pink-300 text-pink-900",
  red: "bg-red-300 text-red-900",
};

const masteryOptions = [
  { key: "unknown", value: 0, cls: "bg-red-500 text-white" },
  { key: "impression", value: 25, cls: "bg-orange-500 text-white" },
  { key: "familiar", value: 50, cls: "bg-yellow-500 text-black" },
  { key: "memorized", value: 90, cls: "bg-green-600 text-white" },
];

// Word management component: display, create, edit, delete
export function WordList({ wordbookId }: WordListProps) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [posTags, setPosTags] = useState<PartOfSpeechTag[]>([]);
  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("gray");

  const [sortBy, setSortBy] = useState<"createdAt" | "mastery" | "usageFrequency">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showFavorites, setShowFavorites] = useState(false);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [tempTagFilter, setTempTagFilter] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const headerTextClass = `${i18n.language !== "zh-Hant" ? "text-xs" : ""} whitespace-nowrap`;

  const sortWords = (list: Word[]) => {
    return [...list].sort((a, b) => {
      let aVal: number;
      let bVal: number;
      if (sortBy === "createdAt") {
        aVal = a.createdAt?.toMillis() || 0;
        bVal = b.createdAt?.toMillis() || 0;
      } else if (sortBy === "mastery") {
        aVal = a.mastery || 0;
        bVal = b.mastery || 0;
      } else {
        aVal = a.usageFrequency || 0;
        bVal = b.usageFrequency || 0;
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  };

  // Create
  const [creating, setCreating] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newPinyin, setNewPinyin] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newPartOfSpeech, setNewPartOfSpeech] = useState<string[]>([]);
  const [newExampleSentence, setNewExampleSentence] = useState("");
  const [newExampleTranslation, setNewExampleTranslation] = useState("");
  const [newRelatedWords, setNewRelatedWords] = useState("");
  const [newUsageFrequency, setNewUsageFrequency] = useState(0);
  const [newMastery, setNewMastery] = useState(0);
  const [newNote, setNewNote] = useState("");
  const [newFavorite, setNewFavorite] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Edit
  const [editTarget, setEditTarget] = useState<Word | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editPinyin, setEditPinyin] = useState("");
  const [editTranslation, setEditTranslation] = useState("");
  const [editPartOfSpeech, setEditPartOfSpeech] = useState<string[]>([]);
  const [editExampleSentence, setEditExampleSentence] = useState("");
  const [editExampleTranslation, setEditExampleTranslation] = useState("");
  const [editRelatedWords, setEditRelatedWords] = useState("");
  const [editUsageFrequency, setEditUsageFrequency] = useState(0);
  const [editMastery, setEditMastery] = useState(0);
  const [editNote, setEditNote] = useState("");
  const [editFavorite, setEditFavorite] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleNewTag = (id: string) => {
    setNewPartOfSpeech((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleEditTag = (id: string) => {
    setEditPartOfSpeech((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleSort = (
    column: "createdAt" | "mastery" | "usageFrequency"
  ) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  };

  const openFilterDialog = () => {
    setTempTagFilter(tagFilter.length ? tagFilter : posTags.map((t) => t.id));
    setFilterOpen(true);
  };

  const toggleTempTag = (id: string) => {
    setTempTagFilter((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const applyTagFilter = () => {
    if (tempTagFilter.length === posTags.length) {
      setTagFilter([]);
    } else {
      setTagFilter(tempTagFilter);
    }
    setFilterOpen(false);
  };

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[\u30a1-\u30f6]/g, (c) =>
        String.fromCharCode(c.charCodeAt(0) - 0x60)
      );

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getWordsByWordbookId(user.uid, wordbookId);
      setWords(sortWords(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, wordbookId]);

  useEffect(() => {
    if (!user) return;
    getPartOfSpeechTags(user.uid).then(setPosTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    setWords((prev) => sortWords(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortDir]);

  useEffect(() => {
    if (!bulkMode) setSelectedIds([]);
  }, [bulkMode]);

  const resetCreateForm = () => {
    setNewWord("");
    setNewPinyin("");
    setNewTranslation("");
    setNewPartOfSpeech([]);
    setNewExampleSentence("");
    setNewExampleTranslation("");
    setNewRelatedWords("");
    setNewUsageFrequency(0);
    setNewMastery(0);
    setNewNote("");
    setNewFavorite(false);
  };

  const handleCreate = async () => {
    if (!user || !newWord.trim()) return;
    setCreating(true);
    try {
      const created = await createWord(user.uid, wordbookId, {
        word: newWord.trim(),
        pinyin: newPinyin.trim(),
        translation: newTranslation.trim(),
        partOfSpeech: newPartOfSpeech,
        exampleSentence: newExampleSentence.trim(),
        exampleTranslation: newExampleTranslation.trim(),
        relatedWords: newRelatedWords.trim(),
        usageFrequency: newUsageFrequency,
        mastery: Math.min(100, Math.max(0, Number(newMastery) || 0)),
        note: newNote.trim(),
        favorite: newFavorite,
      });
      setWords((prev) => sortWords([created, ...prev]));
      resetCreateForm();
      setCreateOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (w: Word) => {
    setEditTarget(w);
    setEditWord(w.word);
    setEditPinyin(w.pinyin || "");
    setEditTranslation(w.translation);
    setEditPartOfSpeech(w.partOfSpeech || []);
    setEditExampleSentence(w.exampleSentence);
    setEditExampleTranslation(w.exampleTranslation);
    setEditRelatedWords(w.relatedWords || "");
    setEditUsageFrequency(w.usageFrequency || 0);
    setEditMastery(masteryLevelMin(w.mastery || 0));
    setEditNote(w.note);
    setEditFavorite(w.favorite);
  };

  const handleUpdate = async () => {
    if (!user || !editTarget) return;
    setUpdating(true);
    try {
      const updated = {
        word: editWord.trim(),
        pinyin: editPinyin.trim(),
        translation: editTranslation.trim(),
        partOfSpeech: editPartOfSpeech,
        exampleSentence: editExampleSentence.trim(),
        exampleTranslation: editExampleTranslation.trim(),
        relatedWords: editRelatedWords.trim(),
        usageFrequency: editUsageFrequency,
        mastery: Math.min(100, Math.max(0, Number(editMastery) || 0)),
        note: editNote.trim(),
        favorite: editFavorite,
      };
      await updateWord(user.uid, wordbookId, editTarget.id, updated);
      setWords((prev) =>
        sortWords(prev.map((w) => (w.id === editTarget.id ? { ...w, ...updated } : w)))
      );
      setEditTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (wordId: string) => {
    if (!user) return;
    setDeletingId(wordId);
    try {
      await deleteWord(user.uid, wordbookId, wordId);
      setWords((prev) => sortWords(prev.filter((w) => w.id !== wordId)));
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedIds.length === 0) return;
    if (!window.confirm(t("wordList.deleteConfirm1"))) return;
    if (!window.confirm(t("wordList.deleteConfirm2"))) return;
    try {
      await Promise.all(
        selectedIds.map((id) => deleteWord(user.uid, wordbookId, id))
      );
      setWords((prev) =>
        sortWords(prev.filter((w) => !selectedIds.includes(w.id)))
      );
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = async (word: Word) => {
    if (!user) return;
    const newVal = !word.favorite;
    try {
      await updateWord(user.uid, wordbookId, word.id, { favorite: newVal });
      setWords((prev) =>
        sortWords(prev.map((w) => (w.id === word.id ? { ...w, favorite: newVal } : w)))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTag = async () => {
    if (!user || !newTagName.trim()) return;
    try {
      const created = await createPartOfSpeechTag(user.uid, {
        name: newTagName.trim(),
        color: newTagColor,
      });
      setPosTags((prev) => [...prev, created]);
      setNewTagName("");
      setNewTagColor("gray");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!user) return;
    if (!window.confirm(t("wordList.deleteTagConfirm1"))) return;
    if (!window.confirm(t("wordList.deleteTagConfirm2"))) return;
    try {
      await deletePartOfSpeechTag(user.uid, id);
      setPosTags((prev) => prev.filter((t) => t.id !== id));
      setNewPartOfSpeech((p) => p.filter((t) => t !== id));
      setEditPartOfSpeech((p) => p.filter((t) => t !== id));
      setTagFilter((f) => f.filter((t) => t !== id));
      setTempTagFilter((f) => f.filter((t) => t !== id));
      setWords((prev) =>
        sortWords(
          prev.map((w) => ({
            ...w,
            partOfSpeech: w.partOfSpeech.filter((t) => t !== id),
          }))
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const displayWords = words.filter((w) => {
    if (showFavorites && !w.favorite) return false;
    if (tagFilter.length && !tagFilter.every((t) => w.partOfSpeech?.includes(t))) {
      return false;
    }
    if (!search.trim()) return true;
    const term = normalize(search.trim());
    return [
      w.word,
      w.translation,
      w.pinyin || "",
      w.exampleSentence || "",
      w.exampleTranslation || "",
      w.relatedWords || "",
    ].some((f) => normalize(f).includes(term));
  });
  const allSelected =
    displayWords.length > 0 && selectedIds.length === displayWords.length;
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayWords.map((w) => w.id));
    }
  };
  const emptyMessage =
    search.trim() || tagFilter.length
      ? t("wordList.noMatchingWords")
      : showFavorites
      ? t("wordList.noFavoriteWords")
      : t("wordList.noWords");

  const overallMastery =
    words.length > 0
      ? words.reduce((sum, w) => sum + (w.mastery || 0), 0) / words.length
      : 0;
  const masteryColor = `hsl(${(overallMastery / 100) * 120}, 80%, 45%)`;

  if (loading || !mounted) {
    return (
      <div
        className="text-sm text-muted-foreground"
        suppressHydrationWarning
      >
        {mounted ? t("wordList.loading") : ""}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  return (
    <>
      <MemorizeSettings
        open={studyOpen}
        onOpenChange={setStudyOpen}
        words={words}
      />
      <div className="space-y-4">
        <div className="flex items-center gap-2">
        {!bulkMode && (
        <Dialog open={createOpen} onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) resetCreateForm();
        }}>
          <DialogTrigger asChild>
            <Button>{t("wordList.addWord")}</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("wordList.addWord")}</DialogTitle>
          </DialogHeader>
          <Label htmlFor="newWord" className="mb-1">{t("wordList.word")}</Label>
          <Input
            id="newWord"
            autoFocus
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            className="mb-2"
          />
          <Label htmlFor="newPinyin" className="mb-1">{t("wordList.pinyin")}</Label>
          <Input
            id="newPinyin"
            value={newPinyin}
            onChange={(e) => setNewPinyin(e.target.value)}
            className="mb-2"
          />
          <Label htmlFor="newTranslation" className="mb-1">{t("wordList.translation")}</Label>
          <Input
            id="newTranslation"
            value={newTranslation}
            onChange={(e) => setNewTranslation(e.target.value)}
            className="mb-2"
          />
          <Label className="mb-1">{t("wordList.partOfSpeech")}</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {posTags.map((tag) => (
              <label key={tag.id} className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={newPartOfSpeech.includes(tag.id)}
                  onChange={() => toggleNewTag(tag.id)}
                />
                <span
                  className={`px-1 rounded text-xs ${
                    colorClasses[tag.color] || colorClasses.gray
                  }`}
                >
                  {tag.name}
                </span>
              </label>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPosDialogOpen(true)}
            >
              {t("wordList.manageTags")}
            </Button>
          </div>
          <Label htmlFor="newExampleSentence" className="mb-1">{t("wordList.example")}</Label>
          <textarea
            id="newExampleSentence"
            value={newExampleSentence}
            onChange={(e) => setNewExampleSentence(e.target.value)}
            rows={3}
            className="mb-2 w-full rounded border px-2 py-1"
          />
          <Label htmlFor="newExampleTranslation" className="mb-1">{t("wordList.exampleTranslation")}</Label>
          <textarea
            id="newExampleTranslation"
            value={newExampleTranslation}
            onChange={(e) => setNewExampleTranslation(e.target.value)}
            rows={3}
            className="mb-2 w-full rounded border px-2 py-1"
          />
          <Label htmlFor="newRelatedWords" className="mb-1">{t("wordList.relatedWords")}</Label>
          <Input
            id="newRelatedWords"
            value={newRelatedWords}
            onChange={(e) => setNewRelatedWords(e.target.value)}
            className="mb-2"
          />
          <Label className="mb-1">{t("wordList.usageFrequency")}</Label>
          <div className="mb-2 flex items-center gap-2">
            <StarRating value={newUsageFrequency} onChange={setNewUsageFrequency} />
            <span>{newUsageFrequency}⭐</span>
          </div>
          <Label htmlFor="newNote" className="mb-1">{t("wordList.note")}</Label>
          <Input
            id="newNote"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="mb-2"
          />
          <Label className="mb-1">{t("wordList.mastery")}</Label>
          <div className="mb-2 flex flex-wrap gap-2">
            {masteryOptions.map((opt) => (
              <label
                key={opt.key}
                className={`${opt.cls} px-2 py-1 rounded cursor-pointer ${
                  newMastery === opt.value ? "ring-2 ring-offset-2 ring-black" : ""
                }`}
              >
                <input
                  type="radio"
                  name="newMastery"
                  className="sr-only"
                  checked={newMastery === opt.value}
                  onChange={() => setNewMastery(opt.value)}
                />
                {t(`wordList.masteryLevels.${opt.key}`)}
              </label>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="newFavorite"
              type="checkbox"
              className="h-4 w-4"
              checked={newFavorite}
              onChange={(e) => setNewFavorite(e.target.checked)}
            />
            <Label htmlFor="newFavorite">{t("wordList.favorite")}</Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("wordList.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newWord.trim()}>
              {creating ? t("wordList.creating") : t("wordList.create")}
            </Button>
          </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
        {!bulkMode && (
        <Button
          className={
            showFavorites
              ? "bg-black text-white hover:bg-black/90"
              : "bg-yellow-500 text-black hover:bg-yellow-600"
          }
          onClick={() => setShowFavorites((prev) => !prev)}
        >
          {showFavorites
            ? t("wordList.showAll")
            : t("wordList.showFavorites")}
        </Button>
        )}
        {!bulkMode && (
        <Button
          className="bg-orange-500 text-black hover:bg-orange-600"
          onClick={() => setStudyOpen(true)}
        >
          {t("wordList.studyWords")}
        </Button>
        )}
        {bulkMode ? (
          <>
            <Button
              className="bg-red-700 text-white hover:bg-red-800"
              onClick={() => {
                setBulkMode(false);
                setSelectedIds([]);
              }}
            >
              {t("wordList.cancelManage")}
            </Button>
            <Button
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={handleBulkDelete}
              disabled={!selectedIds.length}
            >
              {t("wordList.bulkDelete")}
            </Button>
            <Button>{t("wordList.exportCsv")}</Button>
          </>
        ) : (
          <Button
            className="bg-green-500 text-black hover:bg-green-600"
            onClick={() => setBulkMode(true)}
          >
            {t("wordList.bulkManage")}
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span>{t("wordList.overallMastery")}</span>
            <div className="h-2 w-24 rounded bg-gray-200">
              <div
                className="h-2 rounded"
                style={{ width: `${overallMastery}%`, backgroundColor: masteryColor }}
              />
            </div>
            <span>{overallMastery.toFixed(1)}%</span>
          </div>
          <Input
            placeholder={t("wordList.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      <Dialog open={posDialogOpen} onOpenChange={setPosDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("wordList.manageTags")}</DialogTitle>
          </DialogHeader>
          {posTags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2 mb-2">
              <Input
                className="w-32"
                value={tag.name}
                onChange={(e) =>
                  setPosTags((prev) =>
                    prev.map((t) =>
                      t.id === tag.id ? { ...t, name: e.target.value } : t
                    )
                  )
                }
                onBlur={(e) => {
                  if (!user) return;
                  updatePartOfSpeechTag(user.uid, tag.id, {
                    name: e.target.value,
                  });
                }}
              />
              <select
                className="border rounded p-1 text-sm"
                value={tag.color}
                onChange={(e) => {
                  const color = e.target.value;
                  setPosTags((prev) =>
                    prev.map((t) =>
                      t.id === tag.id ? { ...t, color } : t
                    )
                  );
                  if (user) {
                    updatePartOfSpeechTag(user.uid, tag.id, { color });
                  }
                }}
              >
                {colorOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {t(c.labelKey)}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteTag(tag.id)}
              >
                {t("wordList.delete")}
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-4">
            <Input
              className="w-32"
              placeholder={t("wordList.newTag")}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
            />
            <select
              className="border rounded p-1 text-sm"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
            >
              {colorOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {t(c.labelKey)}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={handleAddTag} disabled={!newTagName.trim()}>
              {t("wordList.add")}
            </Button>
          </div>
      </DialogContent>
      </Dialog>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("wordList.filterTags")}</DialogTitle>
          </DialogHeader>
          {posTags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={tempTagFilter.includes(tag.id)}
                onChange={() => toggleTempTag(tag.id)}
              />
              <span
                className={`px-1 rounded text-xs ${
                  colorClasses[tag.color] || colorClasses.gray
                }`}
              >
                {tag.name}
              </span>
            </label>
          ))}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFilterOpen(false)}>
              {t("wordList.cancel")}
            </Button>
            <Button onClick={applyTagFilter}>{t("wordList.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="w-full">
        <div className="min-w-[1000px] text-sm max-h-[70vh] overflow-y-auto">
          <div className="flex bg-muted sticky top-0 z-10">
            {bulkMode && (
              <div className="w-10 px-2 py-1 border-r border-gray-200 flex items-center justify-center">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
              </div>
            )}
            <div className={`w-12 px-2 py-1 border-r border-gray-200 ${headerTextClass}`}>{t("wordList.favorite")}</div>
            <div className={`flex-1 min-w-0 px-2 py-1 border-r border-gray-200 ${headerTextClass}`}>
              <button
                className={`flex items-center ${headerTextClass}`}
                onClick={() => toggleSort("usageFrequency")}
              >
                {t("wordList.word")}
                {sortBy === "usageFrequency" ? (
                  sortDir === "desc" ? (
                    <ChevronDown className="h-4 w-4 ml-1" />
                  ) : (
                    <ChevronUp className="h-4 w-4 ml-1" />
                  )
                ) : (
                  <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
                )}
              </button>
            </div>
            <div className={`flex-1 min-w-0 px-2 py-1 border-r border-gray-200 ${headerTextClass}`}>{t("wordList.pinyin")}</div>
            <div className={`flex-1 min-w-0 px-2 py-1 border-r border-gray-200 ${headerTextClass}`}>{t("wordList.translation")}</div>
            <div className={`flex-1 min-w-0 px-2 py-1 border-r border-gray-200 ${headerTextClass}`}>
              <button className={`flex items-center ${headerTextClass}`} onClick={openFilterDialog}>
                {t("wordList.partOfSpeech")}
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
            </div>
            <div className={`flex-[3] min-w-0 px-2 py-1 border-r border-gray-200 ${headerTextClass}`}>{t("wordList.example")}</div>
            <div className={`flex-[2] min-w-0 px-2 py-1 border-r border-gray-200 ${headerTextClass}`}>{t("wordList.exampleTranslation")}</div>
            <div className={`flex-1 min-w-0 px-2 py-1 border-r border-gray-200 ${headerTextClass}`}>{t("wordList.relatedWords")}</div>
            <div className={`w-24 px-2 py-1 border-r border-gray-200 ${headerTextClass}`}>
              <button
                className={`flex items-center ${headerTextClass}`}
                onClick={() => toggleSort("mastery")}
              >
                {t("wordList.mastery")}
                {sortBy === "mastery" ? (
                  sortDir === "desc" ? (
                    <ChevronDown className="h-4 w-4 ml-1" />
                  ) : (
                    <ChevronUp className="h-4 w-4 ml-1" />
                  )
                ) : (
                  <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
                )}
              </button>
            </div>
            <div className={`flex-1 min-w-0 px-2 py-1 border-r border-gray-200 ${headerTextClass}`}>{t("wordList.note")}</div>
            <div className={`w-24 px-2 py-1 border-r border-gray-200 ${headerTextClass}`}>
              <button className={`flex items-center ${headerTextClass}`} onClick={() => toggleSort("createdAt")}>
                {t("wordList.createdAt")}
                {sortBy === "createdAt" ? (
                  sortDir === "desc" ? (
                    <ChevronDown className="h-4 w-4 ml-1" />
                  ) : (
                    <ChevronUp className="h-4 w-4 ml-1" />
                  )
                ) : (
                  <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
                )}
              </button>
            </div>
            <div className={`w-28 px-2 py-1 ${headerTextClass}`}>{t("wordList.actions")}</div>
          </div>
          {displayWords.length ? (
            displayWords.map((w) => (
              <div key={w.id} className="flex border-b">
                {bulkMode && (
                  <div className="w-10 px-2 py-2 border-r border-gray-200 flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedIds.includes(w.id)}
                      onChange={() => toggleSelect(w.id)}
                    />
                  </div>
                )}
                <div className="w-12 px-2 py-2 text-center border-r border-gray-200">
                  <button onClick={() => toggleFavorite(w)} className="mx-auto">
                    <Heart
                      className={`h-4 w-4 ${
                        w.favorite
                          ? "fill-red-500 text-red-500"
                          : "text-red-500"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex-1 min-w-0 break-words px-2 py-2 font-medium border-r border-gray-200">
                  <div>{w.word}</div>
                  <div className="text-xs text-muted-foreground">{(w.usageFrequency || 0)}⭐</div>
                </div>
                <div className="flex-1 min-w-0 break-words px-2 py-2 border-r border-gray-200">
                  {w.pinyin || "-"}
                </div>
                <div className="flex-1 min-w-0 break-words px-2 py-2 border-r border-gray-200">
                  {w.translation || "-"}
                </div>
                <div className="flex-1 min-w-0 break-words px-2 py-2 border-r border-gray-200">
                  {w.partOfSpeech.length ? (
                    <div className="flex flex-wrap gap-1">
                      {w.partOfSpeech.map((id) => {
                        const tag = posTags.find((t) => t.id === id);
                        return (
                          <span
                            key={id}
                            className={`px-1 rounded text-xs ${
                              colorClasses[tag?.color || "gray"]
                            }`}
                          >
                            {tag?.name || id}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    "-"
                  )}
                </div>
                <div className="flex-[3] min-w-0 break-words whitespace-pre-line px-2 py-2 border-r border-gray-200">
                  {w.exampleSentence || "-"}
                </div>
                <div className="flex-[2] min-w-0 break-words whitespace-pre-line px-2 py-2 border-r border-gray-200">
                  {w.exampleTranslation || "-"}
                </div>
                <div className="flex-1 min-w-0 break-words px-2 py-2 border-r border-gray-200">
                  {w.relatedWords || "-"}
                </div>
                <div className="w-24 px-2 py-2 flex flex-col items-center border-r border-gray-200">
                  <span>{w.mastery ?? 0}{t("wordList.points")}</span>
                  {(() => {
                    const s = w.mastery || 0;
                    let label = t("wordList.masteryLevels.unknown");
                    let cls = "bg-red-500 text-white";
                    if (s >= 90) {
                      label = t("wordList.masteryLevels.memorized");
                      cls = "bg-green-600 text-white";
                    } else if (s >= 50) {
                      label = t("wordList.masteryLevels.familiar");
                      cls = "bg-yellow-500 text-black";
                    } else if (s >= 25) {
                      label = t("wordList.masteryLevels.impression");
                      cls = "bg-orange-500 text-white";
                    }
                    return (
                      <span className={`mt-1 px-2 py-0.5 rounded text-xs ${cls}`}>{label}</span>
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0 break-words px-2 py-2 border-r border-gray-200">
                  {w.note || "-"}
                </div>
                <div className="w-24 px-2 py-2 border-r border-gray-200">
                  {w.createdAt?.toDate().toLocaleDateString() || "-"}
                </div>
                <div className="w-28 px-2 py-2">
                  <div className="flex gap-2">
                    <Dialog
                      open={editTarget?.id === w.id}
                      onOpenChange={(o) => {
                        if (!o) setEditTarget(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(w)}
                          aria-label={t("wordList.edit")}
                        >
                          ✏️
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{t("wordList.editWord")}</DialogTitle>
                        </DialogHeader>
                        <Label htmlFor="editWord" className="mb-1">{t("wordList.word")}</Label>
                        <Input
                          id="editWord"
                          autoFocus
                          value={editWord}
                          onChange={(e) => setEditWord(e.target.value)}
                          className="mb-2"
                        />
                        <Label htmlFor="editPinyin" className="mb-1">{t("wordList.pinyin")}</Label>
                        <Input
                          id="editPinyin"
                          value={editPinyin}
                          onChange={(e) => setEditPinyin(e.target.value)}
                          className="mb-2"
                        />
                        <Label htmlFor="editTranslation" className="mb-1">{t("wordList.translation")}</Label>
                        <Input
                          id="editTranslation"
                          value={editTranslation}
                          onChange={(e) => setEditTranslation(e.target.value)}
                          className="mb-2"
                        />
                        <Label className="mb-1">{t("wordList.partOfSpeech")}</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {posTags.map((tag) => (
                            <label key={tag.id} className="flex items-center space-x-1">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={editPartOfSpeech.includes(tag.id)}
                                onChange={() => toggleEditTag(tag.id)}
                              />
                              <span
                                className={`px-1 rounded text-xs ${
                                  colorClasses[tag.color] || colorClasses.gray
                                }`}
                              >
                                {tag.name}
                              </span>
                            </label>
                          ))}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPosDialogOpen(true)}
                          >
                            {t("wordList.manageTags")}
                          </Button>
                        </div>
                        <Label htmlFor="editExampleSentence" className="mb-1">{t("wordList.example")}</Label>
                        <textarea
                          id="editExampleSentence"
                          value={editExampleSentence}
                          onChange={(e) => setEditExampleSentence(e.target.value)}
                          rows={3}
                          className="mb-2 w-full rounded border px-2 py-1"
                        />
                        <Label htmlFor="editExampleTranslation" className="mb-1">{t("wordList.exampleTranslation")}</Label>
                        <textarea
                          id="editExampleTranslation"
                          value={editExampleTranslation}
                          onChange={(e) => setEditExampleTranslation(e.target.value)}
                          rows={3}
                          className="mb-2 w-full rounded border px-2 py-1"
                        />
                        <Label htmlFor="editRelatedWords" className="mb-1">{t("wordList.relatedWords")}</Label>
                        <Input
                          id="editRelatedWords"
                          value={editRelatedWords}
                          onChange={(e) => setEditRelatedWords(e.target.value)}
                          className="mb-2"
                        />
                        <Label className="mb-1">{t("wordList.usageFrequency")}</Label>
                        <div className="mb-2 flex items-center gap-2">
                          <StarRating value={editUsageFrequency} onChange={setEditUsageFrequency} />
                          <span>{editUsageFrequency}⭐</span>
                        </div>
                        <Label htmlFor="editNote" className="mb-1">{t("wordList.note")}</Label>
                        <Input
                          id="editNote"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="mb-2"
                        />
          <Label className="mb-1">{t("wordList.mastery")}</Label>
          <div className="mb-2 flex flex-wrap gap-2">
            {masteryOptions.map((opt) => (
              <label
                key={opt.key}
                className={`${opt.cls} px-2 py-1 rounded cursor-pointer ${
                  editMastery === opt.value ? "ring-2 ring-offset-2 ring-black" : ""
                }`}
              >
                <input
                  type="radio"
                  name="editMastery"
                  className="sr-only"
                  checked={editMastery === opt.value}
                  onChange={() => setEditMastery(opt.value)}
                />
                {t(`wordList.masteryLevels.${opt.key}`)}
              </label>
            ))}
          </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <input
                            id="editFavorite"
                            type="checkbox"
                            className="h-4 w-4"
                            checked={editFavorite}
                            onChange={(e) => setEditFavorite(e.target.checked)}
                          />
                          <Label htmlFor="editFavorite">{t("wordList.favorite")}</Label>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setEditTarget(null)}
                          >
                            {t("wordList.cancel")}
                          </Button>
                          <Button
                            onClick={handleUpdate}
                            disabled={updating || !editWord.trim()}
                          >
                            {updating ? t("wordList.saving") : t("wordList.save")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={t("wordList.delete")}
                        >
                          🗑️
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("wordList.confirmDeleteWord", { word: w.word })}
                          </AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeletingId(null)}>
                            {t("wordList.cancel")}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(w.id)}
                            disabled={deletingId === w.id}
                          >
                            {deletingId === w.id
                              ? t("wordList.deleting")
                              : t("wordList.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

