import DepartmentDashboardClient from './DepartmentDashboardClient';

interface PageProps {
  params: {
    department: string;
  };
}

export default function DepartmentDashboardPage({ params }: PageProps) {
  return <DepartmentDashboardClient department={params.department} />;
} 