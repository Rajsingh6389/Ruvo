import { ROUTES } from './routes';

export interface Service {
  id: string;
  title: string;
  icon: string;
  route: string;
  implemented: boolean;
}

export const SERVICES: Service[] = [
  {
    id: '1',
    title: 'Groceries & Accessories',
    icon: '🛒',
    route: ROUTES.GROCERIES,
    implemented: true,
  },
  {
    id: '2',
    title: 'Local Jobs',
    icon: '💼',
    route: ROUTES.JOBS,
    implemented: true,
  },
];
