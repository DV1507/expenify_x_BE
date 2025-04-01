import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}
  async create(userId: string, createCategoryDto: CreateCategoryDto) {
    const { name, description } = createCategoryDto;

    const isSameAsSystemDefault = await this.prisma.categories.count({
      where: {
        name,
        is_system_default: true,
      },
    });

    if (isSameAsSystemDefault) {
      throw new HttpException(
        'System default category already exists with this name',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (userId) {
      const isAlreadyCreatedByUser = await this.prisma.categories.count({
        where: {
          name,
          is_system_default: false,
          created_by_id: userId,
        },
      });
      if (isAlreadyCreatedByUser) {
        throw new HttpException(
          'Category already exists with this name',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const category = await this.prisma.categories.create({
      data: {
        name,
        description,
        created_by_id: userId,
      },
    });

    return category;
  }

  async findAll(userId: string) {
    const redisCategories = await this.redisService.get(`${userId}-categories`);
    if (!redisCategories) {
      const categories = await this.prisma.categories.findMany({
        where: {
          created_by_id: userId,
        },
      });
      await this.redisService.set(
        `${userId}-categories`,
        JSON.stringify(categories),
      ); // Store OTP in Redis(otp);
      return categories;
    }
    return JSON.parse(redisCategories);
  }

  async findOne(id: string, userId: string) {
    const categoryExists = await this.prisma.categories.count({
      where: {
        id,
        is_system_default: false,
        created_by_id: userId,
      },
    });
    if (!categoryExists) {
      throw new HttpException(
        'Category not found for this user',
        HttpStatus.BAD_REQUEST,
      );
    }
    const category = await this.prisma.categories.findFirstOrThrow({
      where: {
        id,
        created_by_id: userId,
      },
    });
    return category;
  }

  async update(
    id: string,
    userId: string,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.prisma.categories.count({
      where: {
        id,
        is_system_default: false,
        created_by_id: userId,
      },
    });
    if (!category) {
      throw new HttpException(
        'Category not found for this user',
        HttpStatus.BAD_REQUEST,
      );
    }
    const updatedCategory = await this.prisma.categories.update({
      data: updateCategoryDto,
      where: {
        id,
        created_by_id: userId,
        is_system_default: false,
      },
    });
    return updatedCategory;
  }

  async remove(id: string, userId: string) {
    const category = await this.prisma.categories.count({
      where: {
        id,
        is_system_default: false,
        created_by_id: userId,
      },
    });
    if (!category) {
      throw new HttpException(
        'Category not found for this user',
        HttpStatus.BAD_REQUEST,
      );
    }
    const deletedCategory = await this.prisma.categories.delete({
      where: {
        id,
        is_system_default: false,
        created_by_id: userId,
      },
    });
    return deletedCategory;
  }
}
