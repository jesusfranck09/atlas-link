import { Suspense } from 'react';
import Accounts from '@/components/accounts';
import { Loading } from '@/components/ui';
export default function AccountsPage() {return <Suspense fallback={<Loading/>}><Accounts/></Suspense>;}
