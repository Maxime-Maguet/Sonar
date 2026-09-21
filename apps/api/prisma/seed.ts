import { PrismaClient, TechCategory } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const technologies: { name: string; category: TechCategory }[] = [
  { name: "TypeScript", category: TechCategory.LANGUAGE },
  { name: "JavaScript", category: TechCategory.LANGUAGE },
  { name: "Python", category: TechCategory.LANGUAGE },
  { name: "Java", category: TechCategory.LANGUAGE },
  { name: "Go", category: TechCategory.LANGUAGE },
  { name: "React", category: TechCategory.FRAMEWORK },
  { name: "Next.js", category: TechCategory.FRAMEWORK },
  { name: "Vue.js", category: TechCategory.FRAMEWORK },
  { name: "Angular", category: TechCategory.FRAMEWORK },
  { name: "Node.js", category: TechCategory.FRAMEWORK },
  { name: "NestJS", category: TechCategory.FRAMEWORK },
  { name: "PostgreSQL", category: TechCategory.DATABASE },
  { name: "MongoDB", category: TechCategory.DATABASE },
  { name: "Docker", category: TechCategory.DEVOPS },
  { name: "Kubernetes", category: TechCategory.DEVOPS },
  { name: "Tailwind CSS", category: TechCategory.TOOL },
];

async function main() {
  for (const tech of technologies) {
    const slug = tech.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await prisma.technology.upsert({
      where: { slug },
      update: {},
      create: { name: tech.name, slug, category: tech.category },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
