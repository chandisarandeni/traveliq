import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RouteOptimizationService } from './route-optimization.service';
import { MockDataService } from './services/mock-data.service';
import {
  OptimizePlansDto,
  OptimizeSinglePlanDto,
} from './dto/optimize-route.dto';
import type { OptimizedPlanResult } from './interfaces/route-optimization.interface';

@Controller('route-optimization')
export class RouteOptimizationController {
  constructor(
    private readonly routeOptimizationService: RouteOptimizationService,
    private readonly mockDataService: MockDataService,
  ) {}

  @Post('optimize')
  @HttpCode(HttpStatus.OK)
  optimizeRoute(
    @Body()
    body: OptimizePlansDto | OptimizeSinglePlanDto | OptimizeSinglePlanDto[],
  ): OptimizedPlanResult | OptimizedPlanResult[] {
    // 1. If payload contains routeOptimizationPlans or plans array
    if (body && typeof body === 'object') {
      const dto = body as OptimizePlansDto;
      const plans = dto.routeOptimizationPlans ?? dto.plans;
      if (Array.isArray(plans) && plans.length > 0) {
        return this.routeOptimizationService.optimizePlans(
          plans,
          dto.networkId,
        );
      }
    }

    // 2. If payload is directly an array of plans ([ {...}, {...} ])
    if (Array.isArray(body)) {
      return this.routeOptimizationService.optimizePlans(
        body as OptimizeSinglePlanDto[],
      );
    }

    // 3. If payload is a single plan object
    return this.routeOptimizationService.optimizeSinglePlan(
      body as OptimizeSinglePlanDto,
    );
  }

  @Post('optimize-best')
  @HttpCode(HttpStatus.OK)
  optimizeBestPlan(
    @Body()
    body: OptimizePlansDto | OptimizeSinglePlanDto | OptimizeSinglePlanDto[],
  ): OptimizedPlanResult {
    let plans: OptimizeSinglePlanDto[] = [];
    let networkId: string | undefined;

    if (body && typeof body === 'object') {
      const dto = body as OptimizePlansDto;
      networkId = dto.networkId;
      const extractedPlans = dto.routeOptimizationPlans ?? dto.plans;
      if (Array.isArray(extractedPlans) && extractedPlans.length > 0) {
        plans = extractedPlans;
      } else if ('planId' in body) {
        plans = [body as OptimizeSinglePlanDto];
      }
    } else if (Array.isArray(body)) {
      plans = body as OptimizeSinglePlanDto[];
    }

    return this.routeOptimizationService.optimizeBestPlan(plans, networkId);
  }

  @Get('network/:networkId')
  optimizeFromNetworkId(@Param('networkId') networkId: string) {
    return this.routeOptimizationService.optimizeFromNetworkId(networkId);
  }

  @Get('saved')
  findAllSavedResults() {
    return this.routeOptimizationService.findAllSavedResults();
  }

  @Get('saved/:id')
  findSavedResultById(@Param('id') id: string) {
    return this.routeOptimizationService.findSavedResultById(id);
  }

  @Get('mock-data')
  getMockData(): OptimizedPlanResult[] {
    const sampleData = this.mockDataService.getSampleNetworkAnalysisData();
    return this.routeOptimizationService.optimizePlans(sampleData.plans!);
  }
}
