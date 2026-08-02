// PopulationProfileRoutes - Route definitions for Population Profiles
import { Router } from 'express';
import { PopulationProfileController } from './PopulationProfileController';
import { PopulationProfileRepository } from '../../infrastructure/test-data/PopulationProfileRepository';
import { CreatePopulationProfile } from '../../application/test-data/CreatePopulationProfile';
import { UpdatePopulationProfile } from '../../application/test-data/UpdatePopulationProfile';
import { DeletePopulationProfile } from '../../application/test-data/DeletePopulationProfile';
import { GetPopulationProfile } from '../../application/test-data/GetPopulationProfile';
import { ListPopulationProfiles } from '../../application/test-data/ListPopulationProfiles';

// Initialize repositories
const profileRepository = new PopulationProfileRepository();

// Initialize use cases
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
router.get('/projects/:projectId/test-data/profiles', (req, res) => profileController.listProfiles(req, res));
router.post('/projects/:projectId/test-data/profiles', (req, res) => profileController.createProfile(req, res));
router.get('/projects/:projectId/test-data/profiles/:profileId', (req, res) => profileController.getProfile(req, res));
router.patch('/projects/:projectId/test-data/profiles/:profileId', (req, res) => profileController.updateProfile(req, res));
router.delete('/projects/:projectId/test-data/profiles/:profileId', (req, res) => profileController.deleteProfile(req, res));

export { router as profileRoutes };
export default router;