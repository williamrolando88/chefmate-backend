export interface OnboardingSetupData {
  orgTaxId: string;
  orgName: string;
  orgSlug: string;
  branchCode: number;
  branchName: string;
  branchAddress?: string;
}

export interface OnboardingSetupResult {
  orgId: string;
  branchId: string;
}

export abstract class OnboardingRepository {
  abstract setup(
    data: OnboardingSetupData,
    ownerId: string,
  ): Promise<OnboardingSetupResult>;
}
