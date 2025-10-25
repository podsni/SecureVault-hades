/**
 * Barrel export for all UI components
 * Centralized imports for modals and views
 */

// Export modals from modals.ts (legacy location)
export { PasswordModal, CreateFolderModal, AccessLogModal } from '../modals';
export { SetupMasterPasswordModal } from '../setup-master-password-modal';
export { PasswordChangeModal } from '../password-change-modal';
export { FilePickerModal } from '../file-picker-modal';

// Export new modular components
export { PreviewModal } from './preview-modal';
