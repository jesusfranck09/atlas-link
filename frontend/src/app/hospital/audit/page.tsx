import Audit from '@/components/audit';
import {RoleGate} from '@/components/auth';
export default function AuditPage(){return <RoleGate roles={['HOSPITAL_ADMIN','DIRECTOR']}><Audit/></RoleGate>;}
