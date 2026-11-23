import type { StuckReason } from '../store/progressStore';

export const STUCK_REASONS: Record<
  StuckReason,
  { emoji: string; label: string; headline: string; advice: string; ifText: string; thenText: string }
> = {
  unclear: {
    emoji: '🤔',
    label: "I'm not sure what to do",
    headline: 'Make the next step obvious',
    advice:
      "Vague tasks are the #1 thing we avoid. GTD's fix: write the very next physical, visible action — start it with a verb (call, open, draft, find).",
    ifText: "I don't know where to start",
    thenText: 'write the next physical action, starting with a verb',
  },
  'too-big': {
    emoji: '🏔️',
    label: 'It feels too big',
    headline: 'Shrink it until it feels easy',
    advice:
      "Your brain is reacting to the whole mountain. What's a version you could do in two minutes? Once you've started, keeping going is far easier.",
    ifText: 'it feels too big',
    thenText: 'do a 2-minute version of it',
  },
  boring: {
    emoji: '😴',
    label: "It's boring",
    headline: 'Make it more fun — or shorter',
    advice:
      "Pair it with something you enjoy that you only allow yourself while doing it (a podcast, playlist, good coffee). Then set a short timer and race it.",
    ifText: 'it feels boring',
    thenText: 'pair it with a treat and race a 10-minute timer',
  },
  fear: {
    emoji: '😬',
    label: "I'm worried I'll do it badly",
    headline: 'Give yourself permission to do it badly',
    advice:
      'Aim for an ugly first draft. You can only improve something that exists. Being kind to yourself here is not soft — self-compassion reduces procrastination.',
    ifText: "I'm worried it won't be good enough",
    thenText: 'do a deliberately rough first version',
  },
  tired: {
    emoji: '🪫',
    label: "I'm low on energy",
    headline: 'Match the task to your energy',
    advice:
      'Either do the smallest, easiest bit of this for 5 minutes, or swap to a low-energy task now and come back when you have more fuel.',
    ifText: "I'm low on energy",
    thenText: 'do 5 minutes of the easiest part',
  },
  distracted: {
    emoji: '📱',
    label: 'I keep getting distracted',
    headline: 'Make distraction harder',
    advice:
      "Put your phone in another room, close every tab you don't need, then start a timer. Park stray thoughts in the Inbox instead of acting on them.",
    ifText: 'I get distracted',
    thenText: 'park the thought in my Inbox and return to the timer',
  },
  'not-worth-it': {
    emoji: '🤷',
    label: "I don't actually care about it",
    headline: "Then decide — don't drift",
    advice:
      "If it doesn't matter, it shouldn't be on your list. Move it to Someday/Maybe, hand it to someone else, or delete it. Deciding frees up your mind.",
    ifText: "it doesn't feel worth doing",
    thenText: 'decide: do, delegate, defer or delete',
  },
};
