import { Prisma } from "@prisma/client";
import { CompanionSpecies } from "@/config/constants";

const SPECIES_STARTING_FLAVOR: Record<CompanionSpecies, string> = {
  dragon: "fiercely loyal and protective",
  robot: "precise, witty, and endlessly curious",
  fox: "clever, quick, and a little mischievous",
  owl: "wise, calm, and observant",
  panda: "gentle, patient, and reassuring",
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
