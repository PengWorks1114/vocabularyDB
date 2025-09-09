"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Word } from "@/lib/firestore-service";
import { selectWords, StudyStrategy } from "@/lib/study";
import { useStudy } from "./study-provider";

interface MemorizeSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  words: Word[];
}

export function MemorizeSettings({
  open,
  onOpenChange,
  words,
}: MemorizeSettingsProps) {
  const [count, setCount] = useState(10);
  const [strategy, setStrategy] = useState<StudyStrategy>("random");
  const { setWords } = useStudy();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selected = selectWords(words, count, strategy);
    setWords(selected);
    onOpenChange(false);
    router.push("/study");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Study Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="count">Number of Questions</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={words.length}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Selection Strategy</Label>
            <Select
              value={strategy}
              onValueChange={(v) => setStrategy(v as StudyStrategy)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random</SelectItem>
                <SelectItem value="mastery-high">High Mastery</SelectItem>
                <SelectItem value="mastery-low">Low Mastery</SelectItem>
                <SelectItem value="frequency-high">High Frequency</SelectItem>
                <SelectItem value="frequency-low">Low Frequency</SelectItem>
                <SelectItem value="created-newest">Newest</SelectItem>
                <SelectItem value="created-oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">Start</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

