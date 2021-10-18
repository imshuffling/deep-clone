import React, { useCallback, useEffect, useState } from 'react';
import { DialogExtensionSDK, EntryFieldInfo } from '@contentful/app-sdk';
import {
  Button,
  FormLabel,
  Heading,
  Icon,
  Spinner,
} from '@contentful/forma-36-react-components';
import { PlainClientAPI } from 'contentful-management';

interface DialogProps {
  sdk: DialogExtensionSDK;
  cma: PlainClientAPI;
}

const hasKey = <K extends PropertyKey, U extends Record<K, U>>(k: K, o: any): o is U => o.hasOwnProperty(k);

type CloneBase = {
  cma: PlainClientAPI;
  tag?: string;
  depth?: number;
}
type RecrusiveCloneProps = {
  entryId: string
} & CloneBase

type GetUpdatedField = {
  field: EntryFieldInfo['values'];
} & CloneBase

type GetUpdatedFields = {
  fields?: EntryFieldInfo['values'];
} & CloneBase


// @ts-expect-error unclear what the type is
async function getUpdatedField({cma, field, tag, depth = 0}: GetUpdatedField)  {
  if (field && Array.isArray(field)) {
    return await Promise.all(field.map(async (f) => {
      return await getUpdatedField({cma, field: f, tag, depth: depth + 1})
    }))
  }
  
  if (field && field.sys && field.sys.type === 'Link' && field.sys.linkType === 'Entry') {
    // ------ Field contains reference, performing clone...
    const clonedEntry = await recursiveClone({cma, entryId: field.sys.id, tag, depth: depth + 1})
    field.sys.id = clonedEntry && clonedEntry.sys.id
  }

  return field
}

async function getUpdatedFields({cma, fields, tag, depth}: GetUpdatedFields) {
  for (let fieldName in fields) {
    const field = fields[fieldName]
    for (let lang in field) {
      fields[fieldName][lang] = await getUpdatedField({cma, field: fields[fieldName][lang], tag, depth})
    }
  }

  return fields
}

const recursiveClone = async ({cma, entryId, tag, depth = 0}: RecrusiveCloneProps) => {
  // clone
  const entry = await cma.entry.get({entryId})
  // read fields
  const newFields = await getUpdatedFields({cma, fields: entry.fields, tag, depth: depth + 1})
  if (newFields && newFields.title && newFields.title['en-US']) {
    newFields.title['en-US'] = newFields.title['en-US'] + ' ' + tag
  }
  const newEntry = newFields && await cma.entry.create({ contentTypeId: entry.sys.contentType.sys.id}, { fields: newFields })
  // done

  return newEntry
}

export {
  recursiveClone
}



const Dialog = ({ sdk, cma }:  DialogProps) => {
  const [entryId, setEntryId] = useState<string | undefined>();
  const [newEntryId, setNewEntryId] = useState<string | undefined>();
  const [isLoading, setLoading] = useState<boolean>(false);
  // const [error, setError] = useState<string | undefined>();

  const invokeCopy = useCallback(async() => {
    if(!entryId) return
    setLoading(true);
    // const tag = (document.querySelector('.clone-tag') as HTMLInputElement).value || ''
    const newId = await recursiveClone({cma, entryId})
    newId && setNewEntryId(newId.sys.id)
    setLoading(false);
  },[cma, entryId])

  useEffect(() => {
    if(sdk.parameters && sdk.parameters.invocation && hasKey('entryId', sdk.parameters.invocation)) {
      setEntryId(sdk.parameters.invocation.entryId as string)
    }
  }, [sdk.parameters, sdk.parameters.invocation, sdk.window]);

  useEffect(() => {
    if (!entryId) {
      return;
    }
    invokeCopy();
  }, [entryId, invokeCopy]);

  const onOpenItem = () => {
    console.log('Opening link ...');
    // TODO: conditionally append test env string
    window.open( 
      `https://app.contentful.com/spaces/${sdk.ids.space}/environments/duplication-feature-test/entries/${newEntryId}`,
      '_blank'
    );
  };

  if (isLoading) {
    return (
      <div style={{ margin: 50 }}>
        <Icon color="primary" size="large" icon="Edit" />{' '}
        <Heading>Duplicating entry, please wait</Heading> <Spinner />
      </div>
    );
  }

  // if (error) {
  //   const err = `Failed to make duplicate copy: ${error}`;
  //   return (
  //     <div style={{ margin: 50 }}>
  //       <ValidationMessage>{err}</ValidationMessage>
  //     </div>
  //   );
  // }

  return (
    <div style={{ margin: 75 }}>
      <FormLabel htmlFor="label">Done!</FormLabel>
      <Button
        buttonType="positive"
        isFullWidth={true}
        disabled={!newEntryId}
        onClick={onOpenItem}
        loading={isLoading}>
        Open new entry
      </Button>
      <div style={{ margin: 75 }} />
    </div>
  );
};

export default Dialog;
