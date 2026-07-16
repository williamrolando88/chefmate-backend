import { SetMetadata } from '@nestjs/common';

export const IS_NO_ORG_REQUIRED_KEY = 'isNoOrgRequired';
export const NoOrgRequired = () => SetMetadata(IS_NO_ORG_REQUIRED_KEY, true);
