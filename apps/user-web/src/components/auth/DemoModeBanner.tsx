import { useAuth } from '../../auth';
import { DEMO_COPY } from '../../copy/demo';
import { Banner } from '../ui/Banner';

export function DemoModeBanner() {
  const { authMode } = useAuth();
  if (authMode !== 'demo') return null;
  return <Banner variant="info">{DEMO_COPY.demoModeBanner}</Banner>;
}
