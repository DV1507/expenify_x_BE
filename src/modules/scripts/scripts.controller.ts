import { Controller, Post, Res } from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { sendResponse } from 'src/common/utils/response.utils';
import { Response } from 'express';

@Controller('scripts')
export class ScriptsController {
  constructor(private readonly scriptsService: ScriptsService) {}

  @Post('/seed-default-categories')
  async create(@Res() res: Response) {
    const categories = await this.scriptsService.seedDefaultCategories();
    sendResponse(
      res,
      categories,
      'Default categories seeded successfully',
      true,
      200,
    );
  }
}
