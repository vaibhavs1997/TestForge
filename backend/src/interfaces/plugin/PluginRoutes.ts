// PluginRoutes - Route definitions for Plugin Module
import { Router } from 'express';
import { PluginController } from './PluginController';

export function createPluginRoutes(pluginController: PluginController): Router {
  const router = Router();

  router.get('/plugins', pluginController.listPlugins.bind(pluginController));
  router.get('/plugins/:pluginId', pluginController.getPlugin.bind(pluginController));
  router.post('/plugins', pluginController.createPlugin.bind(pluginController));
  router.post('/plugins/:pluginId/enable', pluginController.enablePlugin.bind(pluginController));
  router.post('/plugins/:pluginId/disable', pluginController.disablePlugin.bind(pluginController));
  router.patch('/plugins/:pluginId/configuration', pluginController.updateConfiguration.bind(pluginController));
  router.delete('/plugins/:pluginId', pluginController.deletePlugin.bind(pluginController));
  router.get('/plugins/:pluginId/health', pluginController.checkHealth.bind(pluginController));
  router.get('/plugins/resolve/:category/:capability', pluginController.resolveByCategoryAndCapability.bind(pluginController));

  return router;
}

export default createPluginRoutes;