import { Prisma } from "@prisma/client";
import { CompanionSpecies } from "@/config/constants";

const SPECIES_STARTING_FLAVOR: Record<CompanionSpecies, string> = {
  barbarian: "fiercely protective, a little dramatic, never backs down from hyping up your wins",
  wizard: "witty, endlessly curious, keeps receipts on every streak you've ever had",
  witch: "calm, observant, speaks rarely but always says the thing you needed to hear",
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
