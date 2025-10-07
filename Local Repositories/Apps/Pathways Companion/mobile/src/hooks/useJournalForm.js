import { useMemo, useState } from 'react';

const PROMPTS = [
  {
    id: 'awareness',
    title: 'Guided prompt',
    prompt: 'What emotion stood out for you today?',
  },
  {
    id: 'practice',
    title: 'Replacement practice',
    prompt: 'Which replacement practice did you use to stay aligned with your values?',
  },
  {
    id: 'reflection',
    title: 'Reflection',
    prompt: 'If you could revisit one moment, what would you do differently?',
  },
];

const EMOTIONS = ['Calm', 'Awareness', 'Hope', 'Guilt', 'Anger'];

export function useJournalForm() {
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [entry, setEntry] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [insights, setInsights] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prompt = PROMPTS[activePromptIndex];

  const emotionOptions = useMemo(() => EMOTIONS, []);

  function toggleEmotion(label) {
    setSelectedEmotions((prev) => {
      if (prev.includes(label)) {
        return prev.filter((value) => value !== label);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, label];
    });
  }

  function selectPrompt(index) {
    setActivePromptIndex(index);
    resetForm();
  }

  function resetForm() {
    setEntry('');
    setInsights('');
    setSelectedEmotions([]);
  }

  return {
    prompt,
    prompts: PROMPTS,
    activePromptIndex,
    selectPrompt,
    entry,
    setEntry,
    selectedEmotions,
    toggleEmotion,
    emotionOptions,
    insights,
    setInsights,
    isSubmitting,
    setIsSubmitting,
    resetForm,
  };
}
