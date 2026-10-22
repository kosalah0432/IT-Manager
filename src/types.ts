export type AssetStatus = 'In Stock' | 'In Use' | 'Repairing' | 'Retired';
export type Role = 'Admin' | 'Technician' | 'User';

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  visibleToUser?: boolean;
}

export interface AssetType {
  id: string;
  name: string;
  customFields: CustomField[];
  userVisibleStandardFields?: string[]; // e.g. ['ipAddress', 'serialNumber']
}

export interface Location {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: Role;
  password?: string;
  status: 'Active' | 'Inactive';
  privateNote?: string;
  mobile?: string;
  extension?: string;
}

export interface Asset {
  id: string;
  typeId: string;
  tag?: string;
  serialNumber: string;
  purchaseDate?: string;
  name: string;
  ipAddress: string;
  modelName: string;
  status: AssetStatus;
  userId?: string;
  locationId?: string;
  macAddress?: string;
  specs: Record<string, any>;
  attachments: string[]; // Base64 strings for invoices/warranty cards
  image?: string; // Base64 compressed image
}

export interface AssetHistory {
  id: string;
  assetId: string;
  date: string;
  action: string; // 'Status Change', 'Assignment', 'Repair', etc.
  details: string;
  userId?: string; // Who performed the action
}

export interface TonerLog {
  id: string;
  assetId: string;
  date: string;
  tonerModel: string;
  cost?: number;
  performedBy?: string;
  notes?: string;
}

export type CheckupCategory = 'Backup' | 'Update' | 'System Check' | 'Server Check' | 'Firewall' | 'Virus Guard';

export type Frequency = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';

export interface BackupDefinition {
  id: string;
  name: string;
  frequency: Frequency;
  method: 'Automatic' | 'Manual';
  customFields: CustomField[];
}

export interface UpdateDefinition {
  id: string;
  name: string;
  category: 'Windows' | 'Software' | 'Office' | 'Drivers' | 'Other';
  frequency: Frequency;
  customFields: CustomField[];
}

export interface SystemCheckDefinition {
  id: string;
  name: string;
  type: 'System Health' | 'Issues' | 'Other';
  frequency: Frequency;
  customFields: CustomField[];
}

export interface ServerDefinition {
  id: string;
  name: string;
  os: string;
  ipAddress: string;
  hardwareParts: string[];
  frequency: Frequency;
  customFields: CustomField[];
}

export interface SecurityDefinition {
  id: string;
  name: string;
  type: 'Firewall' | 'Virus Guard';
  frequency: Frequency;
  customFields: CustomField[];
}

export interface Checkup {
  id: string;
  date: string; // YYYY-MM-DD
  categoryId: string; // ID of the definition
  category: CheckupCategory;
  status: string;
  notes?: string;
  details: any; // Specific results like hardware health
}

export interface FieldServiceReport {
  workPerformed: string;
  partsUsed?: string;
  hardwareUsed?: string;
  softwareUsed?: string;
  timeStarted?: string;
  timeFinished?: string;
  totalTimeSpent?: string;
  customerSignature?: string; // Base64 signature image
  technicianSignature?: string; // Base64 signature image
  statusAfterService: 'Fully Operational' | 'Partial Service' | 'Needs Further Action' | 'Down';
  additionalComments?: string;
  createdAt: string;
  isBillable?: boolean;
  price?: number;
  ticketDescription?: string;
  userFeedback?: string;
  serviceProviderName?: string;
  companyName?: string;
}

export interface Issue {
  id: string;
  type: 'User' | 'Device';
  reportedByUserId?: string;
  assignedToUserId?: string;
  resolvedByUserId?: string;
  assetId?: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Pending' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  progress?: number; // 0-100
  resolutionNote?: string;
  resolvedDate?: string;
  date: string;
  cost?: number;
  category?: string;
  image?: string; // Base64 compressed image
  feedback?: {
    rating: number;
    comment?: string;
  };
  fsr?: FieldServiceReport;
}

export interface TaskNote {
  id: string;
  date: string;
  note: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'To Do' | 'In Progress' | 'Done';
  dueDate: string;
  notes?: TaskNote[];
  assignedToUserId?: string;
  userId?: string; // Creator
}

export interface SoftwareWarranty {
  id: string;
  name: string;
  type: 'Software' | 'Warranty';
  assetId?: string;
  purchaseDate: string;
  expireDate: string;
  dismissedAlerts?: string[]; // Array of alert types like '1month', '1week'
}

export interface Holiday {
  id: string;
  date: string;
  reason: string;
}

export interface Log {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  userId?: string;
}

export interface ToDo {
  id: string;
  title: string;
  completed: boolean;
  priority: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  assetId?: string;
  userId?: string;
  createdAt: string;
  completedAt?: string;
  remarks?: string;
  frequency?: 'None' | 'Daily' | 'Weekly' | 'Monthly';
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
}

export interface OfficeHours {
  open: string; // HH:mm
  close: string; // HH:mm
  enabled: boolean;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  isPublic?: boolean;
}

export interface ProcedureStep {
  id: string;
  text: string;
  image?: string;
}

export interface Procedure {
  id: string;
  title: string;
  description?: string;
  steps: ProcedureStep[];
  troubleshooting?: {
    error: string;
    fixes: {
      text: string;
      image?: string;
    }[];
  }[];
  additionalNotes?: string;
  category?: string;
  pdfUrl?: string; // Base64 or URL to PDF
  isPublic?: boolean;
  allowedUserIds?: string[];
  allowedRoles?: Role[];
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface DailyTask {
  id: string;
  date: string;
  department?: string;
  task: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  assignedTo?: string;
  status: 'Done' | 'Pending';
  remarks?: string;
  userId: string;
  createdAt: string;
  assetId?: string;
  targetUserId?: string;
}

export interface Staff {
  id: string;
  name: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  organization?: string;
  role?: string;
  category: string;
  phone?: string;
  email?: string;
  priority: 'Primary' | 'Secondary';
  notes?: string;
  isStaffManual?: boolean;
  isPublic?: boolean;
  extension?: string;
  createdAt: string;
  userId?: string;
}

export interface Permission {
  id: string;
  type: 'role' | 'user';
  targetId: string; // role name or userId
  resource: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

