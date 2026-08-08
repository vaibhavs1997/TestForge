import React from 'react';
import { Button, type ButtonProps } from './Button';

export type IconButtonProps = Omit<ButtonProps, 'aria-label'> & {
  /** Required accessible name for icon-only controls */
  'aria-label': string;
};

/**
 * Icon-only button — always requires an explicit accessible name.
 */
export const IconButton: React.FC<IconButtonProps> = ({ size = 'icon', ...props }) => (
  <Button size={size} {...props} />
);

export default IconButton;
