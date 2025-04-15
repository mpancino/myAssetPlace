import { ProjectionPeriod, ProjectionResult } from '@shared/schema';
import React from 'react';

declare module '@/components/projections/projection-chart' {
  interface ProjectionChartProps {
    projections: ProjectionResult;
    period: ProjectionPeriod;
  }
  
  const ProjectionChart: React.FC<ProjectionChartProps>;
  export default ProjectionChart;
}

declare module '@/components/projections/asset-class-breakdown' {
  interface AssetClassBreakdownProps {
    projections: ProjectionResult;
  }
  
  const AssetClassBreakdown: React.FC<AssetClassBreakdownProps>;
  export default AssetClassBreakdown;
}

declare module '@/components/projections/cashflow-projection' {
  interface CashflowProjectionProps {
    projections: ProjectionResult;
    period: ProjectionPeriod;
  }
  
  const CashflowProjection: React.FC<CashflowProjectionProps>;
  export default CashflowProjection;
}