import { PrismaClient } from "@prisma/client";
import { ORDER_STEP } from "../lib/ordering";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@tyra.life";

const SECTIONS: {
  title: string;
  emoji?: string;
  description?: string;
  color?: string;
  subcategories: { title: string; tasks: string[] }[];
}[] = [
  {
    title: "Hälsa",
    description: "Kropp, sömn, energi",
    color: "#22c55e",
    subcategories: [
      {
        title: "Träning",
        tasks: ["Gym 3x/vecka", "Löprunda söndagar", "Stretcha 10 min/dag"],
      },
      {
        title: "Sömn",
        tasks: ["Sova 7-8h", "Skärmstop kl 22", "Ingen koffein efter 14"],
      },
      {
        title: "Kost",
        tasks: ["Meal prep söndagar", "2L vatten/dag", "Mer grönt"],
      },
    ],
  },
  {
    title: "Karriär",
    description: "Jobb, kompetens, projekt",
    color: "#6366f1",
    subcategories: [
      {
        title: "Kompetens 2026",
        tasks: ["Rust-kurs", "Läs Designing Data-Intensive Apps", "Konferens i höst"],
      },
      {
        title: "Sidoprojekt",
        tasks: ["MVP av tyra.life", "Open source contribution"],
      },
    ],
  },
  {
    title: "Familj & Relationer",
    description: "Människorna som spelar roll",
    color: "#ec4899",
    subcategories: [
      {
        title: "Familj",
        tasks: ["Ring mamma varje vecka", "Familjemiddag månadsvis"],
      },
      {
        title: "Vänner",
        tasks: ["Träffa gänget från skolan", "Planera helgtripp"],
      },
    ],
  },
  {
    title: "Ekonomi",
    description: "Spara, investera, planera",
    color: "#f59e0b",
    subcategories: [
      {
        title: "Sparmål",
        tasks: ["6 mån buffert", "Pensionsspara 10%"],
      },
      {
        title: "Budget",
        tasks: ["Gå igenom prenumerationer", "Sätt månadsbudget"],
      },
    ],
  },
  {
    title: "Resor & Äventyr",
    description: "Bucket list",
    color: "#0ea5e9",
    subcategories: [
      {
        title: "2026",
        tasks: ["Japan i april", "Vandring i Lappland", "Bokmässan"],
      },
      {
        title: "Bucket list",
        tasks: ["Patagonien", "Köra Route 66", "Se norrsken"],
      },
    ],
  },
  {
    title: "Personlig utveckling",
    description: "Lärande och vanor",
    color: "#a855f7",
    subcategories: [
      {
        title: "Läsning",
        tasks: ["1 bok/månad", "Daglig läsning 20 min"],
      },
      {
        title: "Vanor",
        tasks: ["Journaling varje morgon", "Meditation 10 min/dag"],
      },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding...");

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo User",
    },
  });

  // Rensa befintlig demo-data
  await prisma.board.deleteMany({ where: { userId: user.id } });

  const board = await prisma.board.create({
    data: {
      userId: user.id,
      name: "Mitt liv 2026",
      emoji: "🌱",
      order: ORDER_STEP,
    },
  });

  for (const [sectionIdx, sectionData] of SECTIONS.entries()) {
    const section = await prisma.section.create({
      data: {
        boardId: board.id,
        title: sectionData.title,
        description: sectionData.description,
        color: sectionData.color,
        order: (sectionIdx + 1) * ORDER_STEP,
      },
    });

    for (const [subIdx, subData] of sectionData.subcategories.entries()) {
      const subcategory = await prisma.subcategory.create({
        data: {
          sectionId: section.id,
          title: subData.title,
          order: (subIdx + 1) * ORDER_STEP,
        },
      });

      await prisma.task.createMany({
        data: subData.tasks.map((title, taskIdx) => ({
          subcategoryId: subcategory.id,
          title,
          order: (taskIdx + 1) * ORDER_STEP,
        })),
      });
    }
  }

  const counts = {
    sections: await prisma.section.count({ where: { boardId: board.id } }),
    subcategories: await prisma.subcategory.count({
      where: { section: { boardId: board.id } },
    }),
    tasks: await prisma.task.count({
      where: { subcategory: { section: { boardId: board.id } } },
    }),
  };

  console.log(`✅ Skapade board "${board.name}" för ${user.email}`);
  console.log(`   ${counts.sections} sektioner, ${counts.subcategories} subkategorier, ${counts.tasks} tasks`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
