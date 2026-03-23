import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { RegisterSkillDto } from './dto/register-skill.dto';
import { ResolveSkillsDto } from './dto/resolve-skills.dto';

@ApiTags('skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new skill (developer+)' })
  @ApiResponse({ status: 201, description: 'Skill registered successfully' })
  @ApiResponse({ status: 409, description: 'Skill version already exists' })
  register(@Body() dto: RegisterSkillDto) {
    // TODO: extract orgId from auth token
    const orgId = 'default-org';
    return this.skillsService.registerSkill(dto, orgId);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all skills for org (viewer+)' })
  @ApiQuery({ name: 'platform', required: false, description: 'Filter by platform' })
  @ApiQuery({ name: 'runtime', required: false, description: 'Filter by runtime' })
  list(
    @Query('platform') platform?: string,
    @Query('runtime') runtime?: string,
  ) {
    // TODO: extract orgId from auth token
    const orgId = 'default-org';
    return this.skillsService.listSkills(orgId, { platform, runtime });
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get skill by ID (viewer+)' })
  @ApiParam({ name: 'id', description: 'Skill ID' })
  @ApiQuery({ name: 'version', required: false, description: 'Specific version' })
  getById(
    @Param('id') id: string,
    @Query('version') version?: string,
  ) {
    // TODO: extract orgId from auth token
    const orgId = 'default-org';
    return this.skillsService.getSkill(id, orgId, version);
  }

  @Get(':id/versions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List versions of a skill (viewer+)' })
  @ApiParam({ name: 'id', description: 'Skill ID' })
  getVersions(@Param('id') id: string) {
    // TODO: extract orgId from auth token
    const orgId = 'default-org';
    return this.skillsService.getSkillVersions(id, orgId);
  }

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve skill IDs to manifests (internal, no auth)' })
  @ApiResponse({ status: 200, description: 'Resolved skills' })
  resolve(@Body() dto: ResolveSkillsDto) {
    return this.skillsService.resolveSkills(dto.skill_ids, dto.target_platform);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Uninstall a skill (admin+)' })
  @ApiParam({ name: 'id', description: 'Skill ID' })
  uninstall(@Param('id') id: string) {
    // TODO: extract orgId from auth token
    const orgId = 'default-org';
    this.skillsService.uninstallSkill(id, orgId);
  }
}
