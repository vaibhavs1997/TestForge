// PopulationProfileRoutes - Route definitions for Population Profiles
import { Router } from 'express';
import { PopulationProfileController } from './PopulationProfileController.js';
import { container } from '../../application/ApplicationContainer.js';

// Reuse shared repository from the ApplicationContainer
const { populationProfileRepository: profileRepository } = container;

// Initialize use cases
import { CreatePopulationProfile } from '../../application/test-data/CreatePopulationProfile.js';
import { UpdatePopulationProfile } from '../../application/test-data/UpdatePopulationProfile.js';
import { DeletePopulationProfile } from '../../application/test-data/DeletePopulationProfile.js';
import { GetPopulationProfile } from '../../application/test-data/GetPopulationProfile.js';
import { ListPopulationProfiles } from '../../application/test-data/ListPopulationProfiles.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

const createProfile = new CreatePopulationProfile(profileRepository);
const updateProfile = new UpdatePopulationProfile(profileRepository);
const deleteProfile = new DeletePopulationProfile(profileRepository);
const getProfile = new GetPopulationProfile(profileRepository);
const listProfiles = new ListPopulationProfiles(profileRepository);

// Initialize controller
const profileController = new PopulationProfileController(
  createProfile,
  updateProfile,
  deleteProfile,
  getProfile,
  listProfiles
);

const router = Router();

// Profile routes
router.get('/projects/:projectId/test-data/profiles', asyncHandler((req, res) => profileController.listProfiles(req, res)));
router.post('/projects/:projectId/test-data/profiles', asyncHandler((req, res) => profileController.createProfile(req, res)));
router.get('/projects/:projectId/test-data/profiles/:profileId', asyncHandler((req, res) => profileController.getProfile(req, res)));
router.patch('/projects/:projectId/test-data/profiles/:profileId', asyncHandler((req, res) => profileController.updateProfile(req, res)));
router.delete('/projects/:projectId/test-data/profiles/:profileId', asyncHandler((req, res) => profileController.deleteProfile(req, res)));

export { router as profileRoutes };
export default router;