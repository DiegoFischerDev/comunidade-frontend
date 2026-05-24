'use client';

import ChecklistPage from '@/app/(dashboard)/dashboard/checklist/checklist-page';

type Props = {
  /** Margem superior da secção (ex.: `mt-0` na página dedicada `/plano-de-imigracao`). */
  className?: string;
};

/** Plano interativo de imigração — dados guardados localmente no dispositivo. */
export function DashboardImmigrationPlanSection({ className = 'mt-8' }: Props) {
  return (
    <section className={className} aria-labelledby="dashboard-immigration-plan-heading">
      <h2 id="dashboard-immigration-plan-heading" className="sr-only">
        Meu plano de imigração
      </h2>
      <ChecklistPage />
    </section>
  );
}
