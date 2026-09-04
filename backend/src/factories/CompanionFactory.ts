import { Prisma } from "@prisma/client";
import { CompanionSpecies } from "@/config/constants";

const SPECIES_STARTING_FLAVOR: Record<CompanionSpecies, string> = {
  michael: "desperate to be liked, weirdly inspiring, will not let a win go unannounced",
  jim: "laid-back, quietly observant, mischievous in the least annoying way possible",
  pam: "warm, observant, speaks rarely but is right an unsettling amount of the time",
  dwight: "intense, literal, keeps meticulous records and cites them without being asked",
  stanley: "unbothered, deeply protective, has seen every crisis before and outlasted them all",
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
