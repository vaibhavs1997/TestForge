// RelationshipController - REST Controller for Dataset Relationships
import { Request, Response } from 'express';
import { RelationshipRepository } from '../../infrastructure/test-data/RelationshipRepository';
import { RelationshipEntity } from '../../domain/test-data/RelationshipEntity';

export class RelationshipController {
  constructor(private readonly relationshipRepository: RelationshipRepository) {}

  async listByProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const relationships = await this.relationshipRepository.listByProject(projectId);
      
      res.status(200).json({
        success: true,
        data: relationships,
      });
    } catch (error: any) {
      console.error('List relationships error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to list relationships',
      });
    }
  }

  async listByDataset(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      const relationships = await this.relationshipRepository.listByDataset(datasetId);
      
      res.status(200).json({
        success: true,
        data: relationships,
      });
    } catch (error: any) {
      console.error('List dataset relationships error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to list dataset relationships',
      });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const body = req.body;

      // Validate required fields
      if (!body.parentDatasetId || !body.childDatasetId || !body.parentColumn || !body.childColumn) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: parentDatasetId, childDatasetId, parentColumn, childColumn',
        });
        return;
      }

      // Validate relationship type
      if (!['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'].includes(body.relationshipType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid relationshipType. Must be: one-to-one, one-to-many, many-to-one, or many-to-many',
        });
        return;
      }

      // Validate cardinality
      if (!['1:1', '1:N', 'N:1'].includes(body.cardinality)) {
        res.status(400).json({
          success: false,
          message: 'Invalid cardinality. Must be: 1:1, 1:N, or N:1',
        });
        return;
      }

      // Prevent self-reference
      if (body.parentDatasetId === body.childDatasetId) {
        res.status(400).json({
          success: false,
          message: 'Self-referencing relationships are not allowed',
        });
        return;
      }

      // Check for duplicate
      const existing = await this.relationshipRepository.findRelationship(
        body.parentDatasetId,
        body.childDatasetId,
        body.parentColumn,
        body.childColumn
      );

      if (existing) {
        res.status(400).json({
          success: false,
          message: 'This relationship already exists',
          data: existing,
        });
        return;
      }

      // Check for circular reference
      const hasCircular = await this.relationshipRepository.checkCircularReference(
        body.parentDatasetId,
        body.childDatasetId
      );

      if (hasCircular) {
        res.status(400).json({
          success: false,
          message: 'This relationship would create a circular reference',
        });
        return;
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

      res.status(201).json({
        success: true,
        data: relationship,
      });
    } catch (error: any) {
      console.error('Create relationship error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create relationship',
      });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { relationshipId } = req.params;
      const body = req.body;

      const existing = await this.relationshipRepository.findById(relationshipId);
      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Relationship not found',
        });
        return;
      }

      // Validate relationship type if provided
      if (body.relationshipType && !['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'].includes(body.relationshipType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid relationshipType',
        });
        return;
      }

      // Validate cardinality if provided
      if (body.cardinality && !['1:1', '1:N', 'N:1'].includes(body.cardinality)) {
        res.status(400).json({
          success: false,
          message: 'Invalid cardinality',
        });
        return;
      }

      const updated = await this.relationshipRepository.update(relationshipId, body);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('Update relationship error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update relationship',
      });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { relationshipId } = req.params;

      await this.relationshipRepository.delete(relationshipId);

      res.status(200).json({
        success: true,
        message: 'Relationship deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete relationship error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete relationship',
      });
    }
  }
}

export default RelationshipController;