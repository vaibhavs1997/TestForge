// PluginRoutes - Express routes for Plugin Module
import { Router } from 'express';
import { PluginController } from './PluginController.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

export function createPluginRoutes(pluginController: PluginController): Router {
  const router = Router();

router.get('/plugins', asyncHandler(pluginController.listPlugins.bind(pluginController)));
router.get('/plugins/:pluginId', asyncHandler(pluginController.getPlugin.bind(pluginController)));
router.post('/plugins', asyncHandler(pluginController.createPlugin.bind(pluginController)));
router.post('/plugins/:pluginId/enable', asyncHandler(pluginController.enablePlugin.bind(pluginController)));
router.post('/plugins/:pluginId/disable', asyncHandler(pluginController.disablePlugin.bind(pluginController)));
router.patch('/plugins/:pluginId/configuration', asyncHandler(pluginController.updateConfiguration.bind(pluginController)));
router.delete('/plugins/:pluginId', asyncHandler(pluginController.deletePlugin.bind(pluginController)));

  return router;
}

export default createPluginRoutes;
