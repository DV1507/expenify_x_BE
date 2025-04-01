import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { categories } from '@prisma/client';
@Injectable()
export class ScriptsService {
  constructor(private prisma: PrismaService) {}

  async seedDefaultCategories() {
    const adminUser = await this.prisma.users.findFirstOrThrow({
      where: {
        is_admin: true,
      },
      select: {
        id: true,
      },
    });
    // prisma/seed.ts
    const defaultCategories = [
      {
        name: 'Food & Dining',
        description: 'Restaurants, groceries, snacks',
      },
      { name: 'Transportation', description: 'Fuel, public transport, cabs' },
      {
        name: 'Health & Fitness',
        description: 'Gym, yoga, medical expenses',
      },
      { name: 'Utilities', description: 'Electricity, water, internet' },
      { name: 'Rent', description: 'Monthly house rent' },
      {
        name: 'Entertainment',
        description: 'Movies, streaming, subscriptions',
      },
      {
        name: 'Shopping',
        description: 'Clothes, accessories, online shopping',
      },
      { name: 'Travel', description: 'Flights, hotels, tourism' },
      { name: 'Education', description: 'Courses, books, tuition' },
      { name: 'Others', description: 'Miscellaneous expenses' },
    ]?.map((category) => ({
      ...category,
      created_by_id: adminUser.id,
      is_system_default: true,
    }));

    const finalCreatedCategories: categories[] = [];
    for (const category of defaultCategories) {
      const existingCategory = await this.prisma.categories.findFirst({
        where: {
          is_system_default: true,
          name: category.name,
          created_by_id: adminUser.id,
        },
      });

      if (existingCategory) {
        continue;
      }
      const categories = await this.prisma.categories.create({
        data: category,
      });
      finalCreatedCategories.push(categories);
    }
    return finalCreatedCategories;
  }
}
