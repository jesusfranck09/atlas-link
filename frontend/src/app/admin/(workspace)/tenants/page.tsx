import {Suspense} from 'react';
import {Tenants} from '@/components/platform';
import {Loading} from '@/components/ui';
export default function TenantsPage(){return <Suspense fallback={<Loading/>}><Tenants/></Suspense>;}
