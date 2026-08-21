// RelationshipController - REST Controller for Dataset Relationships
import { Request, Response } from 'express';
import { RelationshipRepository } from '../../infrastructure/test-data/RelationshipRepository.js';
import { RelationshipEntity } from '../../domain/test-data/RelationshipEntity.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
export class RelationshipController {
    constructor(private readonly relationshipRepository: RelationshipRepository) { }
    async listByProject(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const relationships = await this.relationshipRepository.listByProject(projectId);
        res.status(200).json(createSuccessResponse(relationships));
    }
    async listByDataset(req: Request, res: Response): Promise<void> {
        const { datasetId } = req.params;
        const relationships = await this.relationshipRepository.listByDataset(datasetId);
        res.status(200).json(createSuccessResponse(relationships));
    }
    async create(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const body = req.body;
        // Validate required fields
        if (!body.parentDatasetId || !body.childDatasetId || !body.parentColumn || !body.childColumn) {
            throw new Error('Missing required fields: parentDatasetId, childDatasetId, parentColumn, childColumn');
        }
        // Validate relationship type
        if (!['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'].includes(body.relationshipType)) {
            throw new Error('Invalid relationshipType. Must be: one-to-one, one-to-many, many-to-one, or many-to-many');
        }
        // Validate cardinality
        if (!['1:1', '1:N', 'N:1'].includes(body.cardinality)) {
            throw new Error('Invalid cardinality. Must be: 1:1, 1:N, or N:1');
        }
        // Prevent self-reference
        if (body.parentDatasetId === body.childDatasetId) {
            throw new Error('Self-referencing relationships are not allowed');
        }
        // Check for duplicate
        const existing = await this.relationshipRepository.findRelationship(body.parentDatasetId, body.childDatasetId, body.parentColumn, body.childColumn);
        if (existing) {
            throw new Error('This relationship already exists');
        }
        // Check for circular reference
        const hasCircular = await this.relationshipRepository.checkCircularReference(body.parentDatasetId, body.childDatasetId);
        if (hasCircular) {
            throw new Error('This relationship would create a circular reference');
        }
        // Create relationship
        const relationship = await this.relationshipRepository.create({
            projectId,
            parentDatasetId: body.parentDatasetId,
            childDatasetId: body.childDatasetId,
            relationshipType: body.relationshipType,
            parentColumn: body.parentColumn,
            childColumn: body.childColumn,
            cardinality: body.cardinality,
            enabled: body.enabled ?? true,
        });
        res.status(201).json(createSuccessResponse(relationship));
    }
    async update(req: Request, res: Response): Promise<void> {
        const { relationshipId } = req.params;
        const body = req.body;
        const existing = await this.relationshipRepository.findById(relationshipId);
        if (!existing) {
            throw new Error('Relationship not found');
        }
        // Validate relationship type if provided
        if (body.relationshipType && !['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'].includes(body.relationshipType)) {
            throw new Error('Invalid relationshipType');
        }
        // Validate cardinality if provided
        if (body.cardinality && !['1:1', '1:N', 'N:1'].includes(body.cardinality)) {
            throw new Error('Invalid cardinality');
        }
        const updated = await this.relationshipRepository.update(relationshipId, body);
        res.status(200).json(createSuccessResponse(updated));
    }
    async delete(req: Request, res: Response): Promise<void> {
        const { relationshipId } = req.params;
        await this.relationshipRepository.delete(relationshipId);
        res.status(200).json(createSuccessResponse(null));
    }
}
export default RelationshipController;

