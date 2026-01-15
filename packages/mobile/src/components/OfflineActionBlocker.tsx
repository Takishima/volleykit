/**
 * Offline Action Blocker component
 *
 * Modal that blocks actions requiring network connectivity when offline.
 */

import { View, Text, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTranslation } from '@volleykit/shared/i18n';
import { useNetwork } from '../providers/NetworkProvider';
import { COLORS } from '../constants';

/**
 * Offline action blocker props.
 */
export interface OfflineActionBlockerProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is dismissed */
  onDismiss: () => void;
  /** Action that was blocked */
  actionName?: string;
}

/**
 * Offline action blocker modal.
 * Shows when user tries to perform an action requiring network while offline.
 */
export function OfflineActionBlocker({
  visible,
  onDismiss,
  actionName,
}: OfflineActionBlockerProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center p-6"
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Close modal"
      >
        <Pressable
          className="bg-white rounded-xl p-6 w-full max-w-sm"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center mb-4">
            <View className="w-16 h-16 rounded-full bg-amber-100 items-center justify-center mb-3">
              <Feather name="wifi-off" size={32} color={COLORS.amber500} />
            </View>
            <Text className="text-lg font-semibold text-gray-900 text-center">
              {t('errorBoundary.connectionProblem')}
            </Text>
          </View>

          <Text className="text-gray-600 text-center mb-6">
            {actionName
              ? `"${actionName}" requires an internet connection. Please check your connection and try again.`
              : t('errorBoundary.networkErrorDescription')}
          </Text>

          <TouchableOpacity
            className="bg-sky-500 rounded-lg py-3 px-4"
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text className="text-white text-center font-semibold">
              {t('common.close')}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Hook to check network before action and show blocker if offline.
 */
export function useOfflineActionGuard(): {
  checkAndBlock: (actionName?: string) => boolean;
  showBlocker: boolean;
  blockedAction: string | undefined;
  dismissBlocker: () => void;
} {
  const { isOnline } = useNetwork();
  const [showBlocker, setShowBlocker] = useState(false);
  const [blockedAction, setBlockedAction] = useState<string | undefined>();

  const checkAndBlock = (actionName?: string): boolean => {
    if (!isOnline) {
      setBlockedAction(actionName);
      setShowBlocker(true);
      return true; // Action blocked
    }
    return false; // Action allowed
  };

  const dismissBlocker = () => {
    setShowBlocker(false);
    setBlockedAction(undefined);
  };

  return {
    checkAndBlock,
    showBlocker,
    blockedAction,
    dismissBlocker,
  };
}

// Import useState for the hook
import { useState } from 'react';

/**
 * Higher-order component for actions requiring network.
 */
export function withNetworkCheck<P extends object>(
  WrappedComponent: React.ComponentType<P & { disabled?: boolean }>,
  actionName?: string
): React.FC<P & { onOfflineAttempt?: () => void }> {
  return function NetworkCheckedComponent(props: P & { onOfflineAttempt?: () => void }) {
    const { isOnline } = useNetwork();
    const { onOfflineAttempt, ...rest } = props;

    if (!isOnline) {
      return (
        <WrappedComponent
          {...(rest as P)}
          disabled
          onPress={() => onOfflineAttempt?.()}
        />
      );
    }

    return <WrappedComponent {...(rest as P)} />;
  };
}
