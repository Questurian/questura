import type { MembershipStatus, UserWithMembership } from '../types';

export function isActiveMember(user: UserWithMembership): boolean {
  // Entitlement is derived server-side (GET /api/me → membership.active); the client only renders it.
  return user.membership?.active ?? false;
}

export function getMembershipStatus(user: UserWithMembership): MembershipStatus {
  const expiration = user.membershipExpiration
    ? typeof user.membershipExpiration === 'string'
      ? new Date(user.membershipExpiration)
      : user.membershipExpiration
    : null;

  const isActive = isActiveMember(user);

  return {
    isPaidMember: isActive,
    membershipExpiration: expiration,
    isActive,
  };
}
