import AccountDetail from '@/components/account-detail';
export default async function AccountPage({params}: {params: Promise<{id: string}>}) {const {id} = await params; return <AccountDetail id={id}/>;}
