import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const guildSeeds = [
    {
      name: "Iron Forge Guild",
      department: "Engineering",
      emblem: "hammer",
      guardianSpecies: "dragon",
      guardianName: "Forge Dragon",
    },
    {
      name: "Wisdom Guild",
      department: "HR",
      emblem: "book",
      guardianSpecies: "owl",
      guardianName: "Ancient Owl",
    },
    {
      name: "Golden Treasury",
      department: "Finance",
      emblem: "coin",
      guardianSpecies: "turtle",
      guardianName: "Golden Turtle",
    },
    {
      name: "Phoenix Guild",
      department: "Marketing",
      emblem: "flame",
      guardianSpecies: "phoenix",
      guardianName: "Phoenix",
    },
  ];

  for (const guild of guildSeeds) {
    await prisma.guild.upsert({
      where: { name: guild.name },
      update: {},
      create: guild,
    });
  }
  console.log(`Seeded ${guildSeeds.length} guilds`);

  const kingdom = await prisma.kingdom.findFirst();
  const kingdomRecord = kingdom ?? (await prisma.kingdom.create({ data: { name: "The Kingdom" } }));

  const existingProject = await prisma.kingdomProject.findFirst({
    where: { kingdomId: kingdomRecord.id, name: "Crystal University" },
  });

  if (!existingProject) {
    await prisma.kingdomProject.create({
      data: {
        kingdomId: kingdomRecord.id,
        name: "Crystal University",
        description: "A grand hall of learning, unlocked when all guilds pool their resources.",
        knowledgeNeeded: 200,
        goldNeeded: 100,
        influenceNeeded: 80,
        materialsNeeded: 120,
      },
    });
    console.log("Seeded Crystal University kingdom project");
  }

  const marketplaceItems = [
    // Small, frequent — easy first purchases.
    { name: "Coffee Voucher", description: "One free coffee, on the kingdom.", cost: 50, icon: "coffee" },
    { name: "Sticker Pack", description: "A pack of limited-edition kingdom stickers.", cost: 60, icon: "sparkle" },
    { name: "Mystery Chest", description: "A chest of random rewards.", cost: 100, icon: "gift" },
    { name: "Desk Plant", description: "A little green companion for your desk.", cost: 120, icon: "sprout" },
    { name: "Playlist Takeover", description: "Control the office playlist for a day.", cost: 130, icon: "music" },
    { name: "Pizza Lunch", description: "A team pizza lunch voucher.", cost: 150, icon: "pizza" },

    // Mid-tier — a week or two of quests away.
    { name: "Company Merchandise", description: "Redeem for kingdom-branded swag.", cost: 200, icon: "shirt" },
    { name: "Late Start Pass", description: "Roll in two hours late, guilt-free.", cost: 220, icon: "sunrise" },
    { name: "Learning Credit", description: "Credit toward a course or book.", cost: 250, icon: "book" },
    { name: "Reserved Parking Spot", description: "The best spot in the lot, for one week.", cost: 280, icon: "car" },
    { name: "Event Ticket", description: "A ticket to a company event.", cost: 300, icon: "ticket" },
    { name: "Team Game Session", description: "An hour of paid time for a team game break.", cost: 320, icon: "gamepad" },

    // Big-ticket — aspirational, real progression.
    { name: "WFH Pass", description: "One extra work-from-home day.", cost: 400, icon: "home" },
    { name: "Pick the Team Lunch Spot", description: "You choose where the whole team eats next.", cost: 450, icon: "utensils" },
    { name: "Half-Day Off", description: "Leave at noon, fully paid.", cost: 550, icon: "sun" },
    { name: "Gadget Fund", description: "Credit toward a keyboard, headset, or gear of your choice.", cost: 650, icon: "headphones" },
    { name: "Extra Day Off", description: "One additional paid day off, no questions asked.", cost: 750, icon: "calendar-heart" },
  ];

  for (const item of marketplaceItems) {
    const existing = await prisma.marketplaceItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.marketplaceItem.create({ data: item });
    }
  }
  console.log(`Seeded ${marketplaceItems.length} marketplace items`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
