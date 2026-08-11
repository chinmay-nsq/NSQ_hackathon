import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Pass@123";

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

  const guilds = [];
  for (const guild of guildSeeds) {
    const created = await prisma.guild.upsert({
      where: { name: guild.name },
      update: {},
      create: guild,
    });
    guilds.push(created);
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

  const items = await prisma.marketplaceItem.findMany();
  const byName = (name: string) => items.find((i) => i.name === name)!;

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const [ironForge, wisdom, goldenTreasury, phoenix] = guilds;

  type EmployeeSeed = {
    email: string;
    name: string;
    role: Role;
    guildId: string | null;
    managerOf?: string;
    xp: number;
    level: number;
    coins: number;
    reputation: number;
    title: string;
    jobRole: string;
    seniority: "JUNIOR" | "MID" | "SENIOR" | "LEAD";
    skills: string[];
    companion: { species: string; name: string; bondLevel: number; bondXp: number };
  };

  const employeeSeeds: EmployeeSeed[] = [
    {
      email: "admin@weatherline.dev",
      name: "Priya Sharma",
      role: Role.ADMIN,
      guildId: null,
      xp: 4200,
      level: 12,
      coins: 900,
      reputation: 500,
      title: "Kingdom Overseer",
      jobRole: "Head of Operations",
      seniority: "LEAD",
      skills: ["leadership", "strategy", "operations"],
      companion: { species: "dragon", name: "Ashfang", bondLevel: 8, bondXp: 60 },
    },
    {
      email: "arjun.lead@weatherline.dev",
      name: "Arjun Mehta",
      role: Role.MANAGER,
      guildId: ironForge.id,
      managerOf: ironForge.id,
      xp: 3100,
      level: 9,
      coins: 620,
      reputation: 340,
      title: "Guildmaster",
      jobRole: "Engineering Manager",
      seniority: "LEAD",
      skills: ["backend", "architecture", "mentoring"],
      companion: { species: "lava_hound", name: "Cindercoal", bondLevel: 6, bondXp: 40 },
    },
    {
      email: "sara.lead@weatherline.dev",
      name: "Sara Fernandes",
      role: Role.MANAGER,
      guildId: wisdom.id,
      managerOf: wisdom.id,
      xp: 2800,
      level: 8,
      coins: 540,
      reputation: 300,
      title: "Guildmaster",
      jobRole: "HR Manager",
      seniority: "LEAD",
      skills: ["people-ops", "coaching", "onboarding"],
      companion: { species: "witch", name: "Moonveil", bondLevel: 5, bondXp: 20 },
    },
    {
      email: "devansh@weatherline.dev",
      name: "Devansh Rao",
      role: Role.EMPLOYEE,
      guildId: ironForge.id,
      xp: 1450,
      level: 5,
      coins: 380,
      reputation: 120,
      title: "Journeyman",
      jobRole: "Backend Engineer",
      seniority: "MID",
      skills: ["node", "postgres", "typescript"],
      companion: { species: "barbarian", name: "Brakkon", bondLevel: 4, bondXp: 55 },
    },
    {
      email: "meera@weatherline.dev",
      name: "Meera Iyer",
      role: Role.EMPLOYEE,
      guildId: ironForge.id,
      xp: 980,
      level: 4,
      coins: 260,
      reputation: 90,
      title: "Apprentice",
      jobRole: "Frontend Engineer",
      seniority: "MID",
      skills: ["react", "typescript", "design-systems"],
      companion: { species: "archer", name: "Fletch", bondLevel: 3, bondXp: 10 },
    },
    {
      email: "kabir@weatherline.dev",
      name: "Kabir Singh",
      role: Role.EMPLOYEE,
      guildId: ironForge.id,
      xp: 520,
      level: 3,
      coins: 340,
      reputation: 55,
      title: "Apprentice",
      jobRole: "DevOps Engineer",
      seniority: "JUNIOR",
      skills: ["docker", "ci-cd", "aws"],
      companion: { species: "balloon", name: "Puffshade", bondLevel: 2, bondXp: 5 },
    },
    {
      email: "ananya@weatherline.dev",
      name: "Ananya Gupta",
      role: Role.EMPLOYEE,
      guildId: wisdom.id,
      xp: 1120,
      level: 4,
      coins: 410,
      reputation: 100,
      title: "Apprentice",
      jobRole: "People Ops Associate",
      seniority: "MID",
      skills: ["recruiting", "culture", "events"],
      companion: { species: "witch", name: "Emberlyn", bondLevel: 3, bondXp: 35 },
    },
    {
      email: "rohan@weatherline.dev",
      name: "Rohan Kapoor",
      role: Role.EMPLOYEE,
      guildId: goldenTreasury.id,
      xp: 760,
      level: 3,
      coins: 500,
      reputation: 70,
      title: "Apprentice",
      jobRole: "Financial Analyst",
      seniority: "JUNIOR",
      skills: ["excel", "forecasting", "reporting"],
      companion: { species: "hog_rider", name: "Grumblehoof", bondLevel: 2, bondXp: 15 },
    },
    {
      email: "isha@weatherline.dev",
      name: "Isha Chatterjee",
      role: Role.EMPLOYEE,
      guildId: phoenix.id,
      xp: 640,
      level: 3,
      coins: 290,
      reputation: 60,
      title: "Apprentice",
      jobRole: "Marketing Associate",
      seniority: "JUNIOR",
      skills: ["content", "seo", "social"],
      companion: { species: "dragon", name: "Solvane", bondLevel: 2, bondXp: 25 },
    },
  ];

  const employees: Record<string, { id: string; coins: number }> = {};

  for (const seed of employeeSeeds) {
    const employee = await prisma.employee.upsert({
      where: { email: seed.email },
      update: {},
      create: {
        email: seed.email,
        passwordHash,
        name: seed.name,
        role: seed.role,
        guildId: seed.guildId,
        xp: seed.xp,
        level: seed.level,
        coins: seed.coins,
        reputation: seed.reputation,
        title: seed.title,
        jobRole: seed.jobRole,
        seniority: seed.seniority,
        skills: seed.skills,
        profileCompletedAt: new Date(),
      },
    });
    employees[seed.email] = { id: employee.id, coins: seed.coins };

    if (seed.managerOf) {
      await prisma.guild.update({ where: { id: seed.managerOf }, data: { managerId: employee.id } });
    }

    const existingCompanion = await prisma.companion.findUnique({ where: { employeeId: employee.id } });
    if (!existingCompanion) {
      await prisma.companion.create({
        data: {
          employeeId: employee.id,
          species: seed.companion.species,
          name: seed.companion.name,
          bondLevel: seed.companion.bondLevel,
          bondXp: seed.companion.bondXp,
        },
      });
    }
  }
  console.log(`Seeded ${employeeSeeds.length} employees (password: ${SEED_PASSWORD})`);

  // Purchases — several employees redeem a few items so there's real stock
  // for the Trading Post to draw on.
  const purchaseSeeds: { email: string; itemName: string }[] = [
    { email: "devansh@weatherline.dev", itemName: "Company Merchandise" },
    { email: "devansh@weatherline.dev", itemName: "Coffee Voucher" },
    { email: "meera@weatherline.dev", itemName: "Learning Credit" },
    { email: "kabir@weatherline.dev", itemName: "Event Ticket" },
    { email: "ananya@weatherline.dev", itemName: "Reserved Parking Spot" },
    { email: "rohan@weatherline.dev", itemName: "WFH Pass" },
    { email: "isha@weatherline.dev", itemName: "Sticker Pack" },
    { email: "isha@weatherline.dev", itemName: "Team Game Session" },
  ];

  const purchases: Record<string, string> = {}; // key: `${email}:${itemName}` -> purchaseId
  for (const p of purchaseSeeds) {
    const created = await prisma.purchase.create({
      data: { employeeId: employees[p.email].id, itemId: byName(p.itemName).id },
    });
    purchases[`${p.email}:${p.itemName}`] = created.id;
  }
  console.log(`Seeded ${purchaseSeeds.length} purchases`);

  // Trading Post listings — a mix of ACTIVE (for the Browse view) and one
  // already SOLD (for "Your listings" history), asking at or under cost.
  const listingSeeds = [
    {
      email: "devansh@weatherline.dev",
      itemName: "Company Merchandise",
      askingPrice: byName("Company Merchandise").cost,
      status: "ACTIVE" as const,
    },
    {
      email: "meera@weatherline.dev",
      itemName: "Learning Credit",
      askingPrice: byName("Learning Credit").cost - 30,
      status: "ACTIVE" as const,
    },
    {
      email: "kabir@weatherline.dev",
      itemName: "Event Ticket",
      askingPrice: byName("Event Ticket").cost - 20,
      status: "ACTIVE" as const,
    },
    {
      email: "ananya@weatherline.dev",
      itemName: "Reserved Parking Spot",
      askingPrice: byName("Reserved Parking Spot").cost,
      status: "ACTIVE" as const,
    },
    {
      email: "isha@weatherline.dev",
      itemName: "Sticker Pack",
      askingPrice: byName("Sticker Pack").cost - 10,
      status: "ACTIVE" as const,
    },
  ];

  for (const l of listingSeeds) {
    const purchaseId = purchases[`${l.email}:${l.itemName}`];
    await prisma.listing.create({
      data: {
        purchaseId,
        sellerId: employees[l.email].id,
        askingPrice: l.askingPrice,
        status: l.status,
      },
    });
  }
  console.log(`Seeded ${listingSeeds.length} trading post listings`);

  console.log("\nSeed complete. Log in as any seeded employee with password:", SEED_PASSWORD);
  console.log(employeeSeeds.map((e) => `  ${e.email} (${e.role})`).join("\n"));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
