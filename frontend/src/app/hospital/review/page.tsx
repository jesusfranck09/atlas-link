import { Suspense } from 'react';
import Accounts from '@/components/accounts';
import { Loading } from '@/components/ui';
export default function ReviewPage() {return <Suspense fallback={<Loading/>}><Accounts review/></Suspense>;}
