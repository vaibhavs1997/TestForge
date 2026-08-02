// PopulationProfileController - Controller for Population Profile endpoints
import { Request, Response } from 'express';
import { CreatePopulationProfile } from '../../application/test-data/CreatePopulationProfile';
import { UpdatePopulationProfile } from '../../application/test-data/UpdatePopulationProfile';
import { DeletePopulationProfile } from '../../application/test-data/DeletePopulationProfile';
import { GetPopulationProfile } from '../../application/test-data/GetPopulationProfile';
import { ListPopulationProfiles } from '../../application/test-data/ListPopulationProfiles';

export class PopulationProfileController {
  constructor(
    private readonly createProfileUseCase: CreatePopulationProfile,
    private readonly updateProfileUseCase: UpdatePopulationProfile,
    private readonly deleteProfileUseCase: DeletePopulationProfile,
    private readonly getProfileUseCase: GetPopulationProfile,
    private readonly listProfilesUseCase: ListPopulationProfiles
  ) {}

  async listProfiles(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.query;
      const profiles = await this.listProfilesUseCase.execute({
        datasetId: datasetId as string | undefined,
      });
      res.status(200).json({ success: true, data: profiles });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async createProfile(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId, columnId, strategyType, configuration } = req.body;

      const profile = await this.createProfileUseCase.execute({
        datasetId,
        columnId,
        strategyType,
        configuration,
      });

      res.status(201).json({ success: true, data: profile });
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('already exists')) {
        res.status(409).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const profile = await this.getProfileUseCase.execute(profileId);
      res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      const { strategyType, configuration } = req.body;

      const profile = await this.updateProfileUseCase.execute({
        id: profileId,
        strategyType,
        configuration,
      });

      res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async deleteProfile(req: Request, res: Response): Promise<void> {
    try {
      const { profileId } = req.params;
      await this.deleteProfileUseCase.execute(profileId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }
}

export default PopulationProfileController;