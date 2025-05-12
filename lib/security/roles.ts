import { securityLogger } from './logger';

// Define available roles
export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  RECEPTIONIST = 'receptionist',
  STAFF = 'staff'
}

// Define permissions
export enum Permission {
  // Patient permissions
  VIEW_PATIENTS = 'view_patients',
  EDIT_PATIENTS = 'edit_patients',
  DELETE_PATIENTS = 'delete_patients',
  
  // Appointment permissions
  VIEW_APPOINTMENTS = 'view_appointments',
  CREATE_APPOINTMENTS = 'create_appointments',
  EDIT_APPOINTMENTS = 'edit_appointments',
  DELETE_APPOINTMENTS = 'delete_appointments',
  
  // Staff permissions
  VIEW_STAFF = 'view_staff',
  EDIT_STAFF = 'edit_staff',
  
  // System permissions
  MANAGE_SETTINGS = 'manage_settings',
  VIEW_LOGS = 'view_logs',
  MANAGE_ROLES = 'manage_roles'
}

// Define role-permission mappings
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.DOCTOR]: [
    Permission.VIEW_PATIENTS,
    Permission.EDIT_PATIENTS,
    Permission.VIEW_APPOINTMENTS,
    Permission.CREATE_APPOINTMENTS,
    Permission.EDIT_APPOINTMENTS,
    Permission.VIEW_STAFF
  ],
  [UserRole.NURSE]: [
    Permission.VIEW_PATIENTS,
    Permission.EDIT_PATIENTS,
    Permission.VIEW_APPOINTMENTS,
    Permission.CREATE_APPOINTMENTS,
    Permission.VIEW_STAFF
  ],
  [UserRole.RECEPTIONIST]: [
    Permission.VIEW_PATIENTS,
    Permission.VIEW_APPOINTMENTS,
    Permission.CREATE_APPOINTMENTS,
    Permission.EDIT_APPOINTMENTS
  ],
  [UserRole.STAFF]: [
    Permission.VIEW_PATIENTS,
    Permission.VIEW_APPOINTMENTS
  ]
};

// Role-based access control class
export class RBAC {
  private static instance: RBAC;
  private userRoles: Map<string, UserRole>;

  private constructor() {
    this.userRoles = new Map();
  }

  public static getInstance(): RBAC {
    if (!RBAC.instance) {
      RBAC.instance = new RBAC();
    }
    return RBAC.instance;
  }

  public setUserRole(userId: string, role: UserRole): void {
    this.userRoles.set(userId, role);
    securityLogger.log({
      type: 'auth',
      severity: 'medium',
      message: `User role updated`,
      metadata: { userId, role }
    });
  }

  public getUserRole(userId: string): UserRole | undefined {
    return this.userRoles.get(userId);
  }

  public hasPermission(userId: string, permission: Permission): boolean {
    const role = this.getUserRole(userId);
    if (!role) return false;
    
    return rolePermissions[role].includes(permission);
  }

  public getPermissions(userId: string): Permission[] {
    const role = this.getUserRole(userId);
    if (!role) return [];
    
    return rolePermissions[role];
  }

  public validateAccess(userId: string, requiredPermissions: Permission[]): boolean {
    return requiredPermissions.every(permission => this.hasPermission(userId, permission));
  }
}

// Export singleton instance
export const rbac = RBAC.getInstance(); 