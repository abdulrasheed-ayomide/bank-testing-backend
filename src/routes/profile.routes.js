import { Router } from 'express';
import * as profileController from '../controllers/profile.controller.js';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import { updateProfileValidator } from '../validators/profile.validator.js';

const router = Router();

router.use(protect);

router.get('/', profileController.getMyProfile);
router.patch('/', updateProfileValidator, validate, profileController.updateMyProfile);

export default router;
