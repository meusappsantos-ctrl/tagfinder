export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export enum AuthState {
  LOADING,
  AUTHENTICATED,
  UNAUTHENTICATED,
}