import { history, useIntl } from '@umijs/max';
import { Button, Modal, Space } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useActivate, useUnactivate } from 'react-activation';
import { registerRouteLeaveGuard } from '@/utils/routeLeaveGuard';

/** Guard both cached route switches and browser reloads without discarding a failed save. */
export default function useDraftGuard(
  dirty: boolean,
  save: () => Promise<boolean>,
  discard: () => void,
  path: string,
) {
  const intl = useIntl();
  const [active, setActive] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const pending = useRef<() => void>();
  const resolveLeave = useRef<(value: boolean) => void>();
  const unblock = useRef<() => void>();
  const saveRef = useRef(save);
  saveRef.current = save;
  const cancel = () => {
    setLeaving(false);
    pending.current = undefined;
    resolveLeave.current?.(false);
    resolveLeave.current = undefined;
  };
  useActivate(() => setActive(true));
  useUnactivate(() => setActive(false));
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    const unregister = registerRouteLeaveGuard(
      path,
      () =>
        new Promise<boolean>((resolve) => {
          resolveLeave.current = resolve;
          setLeaving(true);
        }),
    );
    if (active)
      unblock.current = history.block((transition) => {
        pending.current = transition.retry;
        setLeaving(true);
      });
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      unregister();
      unblock.current?.();
    };
  }, [dirty, active, path]);
  const leave = () => {
    unblock.current?.();
    setLeaving(false);
    resolveLeave.current?.(true);
    resolveLeave.current = undefined;
    pending.current?.();
    pending.current = undefined;
  };
  const t = (key: string) => intl.formatMessage({ id: `pages.workflowUX.${key}` });
  return (
    <Modal
      open={leaving}
      title={t('unsavedTitle')}
      closable={!saving}
      maskClosable={!saving}
      keyboard={!saving}
      onCancel={cancel}
      footer={
        <Space wrap>
          <Button disabled={saving} onClick={cancel}>
            {t('stay')}
          </Button>
          <Button
            disabled={saving}
            onClick={() => {
              discard();
              leave();
            }}
          >
            {t('discard')}
          </Button>
          <Button
            type="primary"
            loading={saving}
            onClick={async () => {
              setSaving(true);
              try {
                if (await saveRef.current()) leave();
              } finally {
                setSaving(false);
              }
            }}
          >
            {t('saveLeave')}
          </Button>
        </Space>
      }
    >
      {t('unsavedBody')}
    </Modal>
  );
}
