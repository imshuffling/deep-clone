import React, { useEffect, useState } from 'react';
import { PlainClientAPI } from 'contentful-management';
import { Button, HelpText } from '@contentful/forma-36-react-components';
import { SidebarExtensionSDK } from '@contentful/app-sdk';
import '@contentful/forma-36-fcss/dist/styles.css';

interface SidebarProps {
  sdk: SidebarExtensionSDK;
  cma: PlainClientAPI;
}

const Sidebar = ({sdk}: SidebarProps) => {
  const [error, setError] = useState<string>();
  const [entryId, setEntryId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setEntryId(sdk.ids.entry);
  }, [sdk.ids.entry]);

  useEffect(() => {
    if (!error) {
      return;
    }
    sdk.notifier.error(error);
  }, [error, sdk.notifier]);

  const deepCopy = async () => {
    const response = await sdk.dialogs.openCurrentApp({
      title: 'Duplicate',
      parameters: { entryId },
    });
    console.log('dialog response env => ', response);
  };

  const onClickHanlder = async () => {
    try {
      setLoading(true);
      deepCopy();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  return  <div>
  <Button buttonType="positive" isFullWidth={true} onClick={onClickHanlder} loading={isLoading}>
    Duplicate
  </Button>
  <div style={{ margin: 4 }} />
  <HelpText>
    Duplicate the entry with all linked entries inside
  </HelpText>
</div>
};

export default Sidebar;
