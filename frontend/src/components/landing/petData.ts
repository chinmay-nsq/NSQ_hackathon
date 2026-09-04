export interface PetProfile {
  species: string;
  name: string;
  title: string;
  ability: string;
  abilityDescription: string;
  personality: string;
  specialty: string;
  quote: string;
  color: string;
  image: string;
}

export const PETS: PetProfile[] = [
  {
    species: "michael",
    name: "Michael",
    title: "The World's Best Boss",
    ability: "Big Announcement",
    abilityDescription: "Turns your smallest win into a moment everyone on the team actually sees.",
    personality: "Desperate to be liked, weirdly inspiring, will not let a win go unannounced.",
    specialty: "Best for teams that thrive on momentum and public wins.",
    quote: "You shipped that? Conference room. Five minutes. Everybody.",
    color: "#3f5a9c",
    image: "/michael.png",
  },
  {
    species: "jim",
    name: "Jim",
    title: "The Perfect Timing",
    ability: "Deadpan Drop",
    abilityDescription: "Arrives with exactly the right nudge, exactly when you needed it — never before.",
    personality: "Laid-back, quietly observant, mischievous in the least annoying way possible.",
    specialty: "Best for teams that like a well-timed nudge over constant noise.",
    quote: "Funny you're checking in now — I was just about to.",
    color: "#6aa6e0",
    image: "/jim.png",
  },
  {
    species: "pam",
    name: "Pam",
    title: "The Quiet Wisdom",
    ability: "Front Desk Insight",
    abilityDescription: "Sees everything that passes through, says only the one thing you needed to hear.",
    personality: "Warm, observant, speaks rarely but is right an unsettling amount of the time.",
    specialty: "Best for teams that want fewer, more meaningful check-ins.",
    quote: "You've grown more this month than you think. I notice these things.",
    color: "#d98fae",
    image: "/pam.png",
  },
  {
    species: "dwight",
    name: "Dwight",
    title: "Assistant to the Regional Manager",
    ability: "Relentless Pursuit",
    abilityDescription: "Tracks every streak you've ever had and charges straight at what you're avoiding.",
    personality: "Intense, literal, keeps meticulous records and cites them without being asked.",
    specialty: "Best for teams that want discipline and hard numbers behind the praise.",
    quote: "Fact: your streak is 12 days. Do not break it on my watch.",
    color: "#d8a12a",
    image: "/dwight.png",
  },
  {
    species: "stanley",
    name: "Stanley",
    title: "The Steady Shield",
    ability: "Pretzel Day",
    abilityDescription: "Quietly absorbs the pressure during crunch, so you don't have to carry it alone.",
    personality: "Unbothered, deeply protective, has seen every crisis before and outlasted them all.",
    specialty: "Best for teams that need support during crunch, not just praise after.",
    quote: "I've got the load. Go take your day.",
    color: "#8c5a3c",
    image: "/stanley.png",
  },
];
