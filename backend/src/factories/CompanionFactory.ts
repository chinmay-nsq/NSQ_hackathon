import { Prisma } from "@prisma/client";
import { CompanionSpecies } from "@/config/constants";

const SPECIES_STARTING_FLAVOR: Record<CompanionSpecies, string> = {
  barbarian: "fiercely protective, a little dramatic, never backs down from hyping up your wins",
  archer: "witty, endlessly curious, keeps receipts on every streak you've ever had",
  witch: "calm, observant, speaks rarely but always says the thing you needed to hear",
  hog_rider: "reckless, upbeat, charges straight at whatever you've been avoiding",
  balloon: "laid-back, a little mischievous, drifts in at exactly the right moment",
  dragon: "bold, warm-hearted, makes even small wins feel like a big deal",
  lava_hound: "steady, quietly protective, the one who shows up when things get heavy",
};

export const CompanionFactory = {
  build(employeeId: string, species: CompanionSpecies, name: string): Prisma.CompanionCreateInput {
    return {
      employee: { connect: { id: employeeId } },
      species,
      name,
      bondLevel: 1,
      bondXp: 0,
    };
  },

  flavorFor(species: CompanionSpecies): string {
    return SPECIES_STARTING_FLAVOR[species];
  },
};
