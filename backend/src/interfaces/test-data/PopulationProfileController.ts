// PopulationProfileController - Controller for Population Profile endpoints
import { Request, Response } from 'express';
import { CreatePopulationProfile } from '../../application/test-data/CreatePopulationProfile.js';
import { UpdatePopulationProfile } from '../../application/test-data/UpdatePopulationProfile.js';
import { DeletePopulationProfile } from '../../application/test-data/DeletePopulationProfile.js';
import { GetPopulationProfile } from '../../application/test-data/GetPopulationProfile.js';
import { ListPopulationProfiles } from '../../application/test-data/ListPopulationProfiles.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
export class PopulationProfileController {
    constructor(private readonly createProfileUseCase: CreatePopulationProfile, private readonly updateProfileUseCase: UpdatePopulationProfile, private readonly deleteProfileUseCase: DeletePopulationProfile, private readonly getProfileUseCase: GetPopulationProfile, private readonly listProfilesUseCase: ListPopulationProfiles) { }
    async listProfiles(req: Request, res: Response): Promise<void> {
        const { datasetId } = req.query;
        const profiles = await this.listProfilesUseCase.execute({
            datasetId: datasetId as string | undefined,
        });
        res.status(200).json(createSuccessResponse(profiles));
    }
    async createProfile(req: Request, res: Response): Promise<void> {
        const { datasetId, columnId, strategyType, configuration } = req.body;
        const profile = await this.createProfileUseCase.execute({
            datasetId,
            columnId,
            strategyType,
            configuration,
        });
        res.status(201).json(createSuccessResponse(profile));
    }
    async getProfile(req: Request, res: Response): Promise<void> {
        const { profileId } = req.params;
        const profile = await this.getProfileUseCase.execute(profileId);
        res.status(200).json(createSuccessResponse(profile));
    }
    async updateProfile(req: Request, res: Response): Promise<void> {
        const { profileId } = req.params;
        const { strategyType, configuration } = req.body;
        const profile = await this.updateProfileUseCase.execute({
            id: profileId,
            strategyType,
            configuration,
        });
        res.status(200).json(createSuccessResponse(profile));
    }
    async deleteProfile(req: Request, res: Response): Promise<void> {
        const { profileId } = req.params;
        await this.deleteProfileUseCase.execute(profileId);
        res.status(204).send();
    }
}
export default PopulationProfileController;

