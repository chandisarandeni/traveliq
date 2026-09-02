import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RouteOptimizationService } from './route-optimization.service';
import { MockDataService } from './services/mock-data.service';
import { OptimizePlansDto, OptimizeSinglePlanDto } from './dto/optimize-route.dto';
import type { OptimizedPlanResult } from './interfaces/route-optimization.interface';

@Controller('route-optimization')
export class RouteOptimizationController {
  constructor(
    private readonly routeOptimizationService: RouteOptimizationService,
    private readonly mockDataService: MockDataService,
  ) { }

  @Post('optimize')
  @HttpCode(HttpStatus.OK)
  optimizeRoute(
    @Body() body: OptimizePlansDto | OptimizeSinglePlanDto | OptimizeSinglePlanDto[],
  ): OptimizedPlanResult | OptimizedPlanResult[] {
    // 1. If payload is an object containing a 'plans' array ({ plans: [...] })
    if (body && typeof body === 'object' && 'plans' in body && Array.isArray((body as OptimizePlansDto).plans)) {
      return this.routeOptimizationService.optimizePlans((body as OptimizePlansDto).plans);
    }

    // 2. If payload is directly an array of plans ([ {...}, {...} ])
    if (Array.isArray(body)) {
      return this.routeOptimizationService.optimizePlans(body as OptimizeSinglePlanDto[]);
    }

    // 3. If payload is a single plan object
    return this.routeOptimizationService.optimizeSinglePlan(body as OptimizeSinglePlanDto);
  }

  @Get('mock-data')
  getMockData(): OptimizedPlanResult[] {
    const sampleData = this.mockDataService.getSampleNetworkAnalysisData();
    return this.routeOptimizationService.optimizePlans(sampleData.plans);
  }

  @Post('optimize-best')
  @HttpCode(HttpStatus.OK)
  optimizeBestPlan(
    @Body() body: OptimizePlansDto | OptimizeSinglePlanDto | OptimizeSinglePlanDto[],
  ): OptimizedPlanResult {
    let plans: OptimizeSinglePlanDto[] = [];

    if (body && typeof body === 'object' && 'plans' in body && Array.isArray((body as OptimizePlansDto).plans)) {
      plans = (body as OptimizePlansDto).plans;
    } else if (Array.isArray(body)) {
      plans = body as OptimizeSinglePlanDto[];
    } else if (body && typeof body === 'object') {
      plans = [body as OptimizeSinglePlanDto];
    }

    return this.routeOptimizationService.optimizeBestPlan(plans);
  }
}
