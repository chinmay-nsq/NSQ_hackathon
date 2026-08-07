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
    image: "/wizard.png",
  },
  {
    species: "witch",
    name: "Raven",
    title: "The Quiet Wisdom",
    personality: "Calm, observant, speaks rarely but always says the thing you needed to hear.",
    specialty: "Best for teams that want fewer, more meaningful check-ins.",
    quote: "You've grown more this month than you think.",
    color: "#4ac4d9",
    image: "/witch.png",
  },
];
