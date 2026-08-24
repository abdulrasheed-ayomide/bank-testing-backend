import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as profileService from '../services/profile.service.js';

export const getMyProfile = catchAsync(async (req, res) => {
  const user = await profileService.getProfile(req.user._id);
  return sendSuccess(res, { user });
});

export const updateMyProfile = catchAsync(async (req, res) => {
  const user = await profileService.updateProfile(req.user._id, req.body);
  return sendSuccess(res, { user });
});
