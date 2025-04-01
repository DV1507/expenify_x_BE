import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Response,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AuthenticatedRequest } from 'src/common/enums/guards/jwt-auth.guard';
import { Response as ExpressResponse } from 'express';
import { sendResponse } from 'src/common/utils/response.utils';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @Request() req: AuthenticatedRequest,
    @Response() res: ExpressResponse,
  ) {
    const { user } = req;
    const response = await this.categoryService.create(
      user.id,
      createCategoryDto,
    );
    sendResponse(res, response, 'Category created successfully', true, 200);
  }

  @Get()
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Response() res: ExpressResponse,
  ) {
    const { user } = req;
    const userCategories = await this.categoryService.findAll(user.id);

    sendResponse(
      res,
      userCategories || [],
      'Categories fetched successfully',
      true,
      200,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Response() res: ExpressResponse,
  ) {
    const { user } = req;

    const category = await this.categoryService.findOne(id, user.id);
    sendResponse(res, category, 'Category fetched successfully', true, 200);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Response() res: ExpressResponse,
  ) {
    const { user } = req;

    const updatedCategory = await this.categoryService.update(
      id,
      user.id,
      updateCategoryDto,
    );
    sendResponse(
      res,
      updatedCategory,
      'Category fetched successfully',
      true,
      200,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Response() res: ExpressResponse,
    @Request() req: AuthenticatedRequest,
  ) {
    const { user } = req;

    const response = await this.categoryService.remove(id, user.id);
    sendResponse(res, response, 'Category deleted successfully', true, 200);
  }
}
