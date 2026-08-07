export interface PetProfile {
  species: string;
  name: string;
  title: string;
  personality: string;
  specialty: string;
  quote: string;
  color: string;
  image: string;
}

export const PETS: PetProfile[] = [
  {
    species: "barbarian",
    name: "Barb",
    title: "The Loyal Flame",
    personality: "Fiercely protective, a little dramatic, never backs down from hyping up your wins.",
    specialty: "Best for teams that thrive on momentum and public wins.",
    quote: "You shipped that? Everyone needs to know.",
    color: "#e0655a",
    image: "/barb.png",
  },
  {
    species: "wizard",
    name: "Volt",
    title: "The Precise Mind",
    personality: "Witty, endlessly curious, keeps receipts on every streak you've ever had.",
    specialty: "Best for data-minded teams who want the numbers behind the praise.",
    quote: "Your streak is 12 days. Statistically, you're unstoppable.",
    color: "#e8a23a",
    image: "/wizard-nobg.png",
  },
  {
    species: "witch",
    name: "Raven",
    title: "The Quiet Wisdom",
    personality: "Calm, observant, speaks rarely but always says the thing you needed to hear.",
    specialty: "Best for teams that want fewer, more meaningful check-ins.",
    quote: "You've grown more this month than you think.",
    color: "#4ac4d9",
    image: "/witch-nobg.png",
  },
  {
    species: "hog_rider",
    name: "Charger",
    title: "The Reckless Push",
    personality: "Reckless, upbeat, charges straight at whatever you've been avoiding.",
    specialty: "Best for teams that need a nudge to just start the hard thing.",
    quote: "Stop planning it. Go do it.",
    color: "#c98b5e",
    image: "/hog-nobg.png",
  },
  {
    species: "balloon",
    name: "Drift",
    title: "The Perfect Timing",
    personality: "Laid-back, a little mischievous, drifts in at exactly the right moment.",
    specialty: "Best for teams that like a well-timed nudge over constant noise.",
    quote: "Funny you're checking in now — I was just about to.",
    color: "#d9503c",
    image: "/baloon-nobg.png",
  },
  {
    species: "dragon",
    name: "Ember",
    title: "The Big Hype",
    personality: "Bold, warm-hearted, makes even small wins feel like a big deal.",
    specialty: "Best for teams that thrive on visible momentum and celebration.",
    quote: "That's a win. We're telling everyone.",
    color: "#9b5de5",
    image: "/dragon.png",
  },
  {
    species: "lava_hound",
    name: "Basalt",
    title: "The Steady Shield",
    personality: "Steady, quietly protective, the one who shows up when things get heavy.",
    specialty: "Best for teams that need support during crunch, not just praise after.",
    quote: "I've got the load. Take the day you need.",
    color: "#e8622c",
    image: "/lava_hound.png",
  },
];
